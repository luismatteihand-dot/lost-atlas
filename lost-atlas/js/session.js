/* Session — « Commencer une aventure ».
   Le joueur choisit un temps ; le jeu compose une partie à partir de ce qui existe déjà : quêtes, donjons,
   lieux inconnus, secrets, détails à observer, et des invitations à interagir avec la ville réelle.
   La durée est une intention, jamais un compte à rebours : rien ne se perd quand elle est dépassée.
   Aucune donnée n'est inventée : chaque lieu proposé vient de l'atlas ; les interactions ne citent que des
   commerces et activités du guide, toujours « si c'est ouvert », « si le moment s'y prête ». */
const Session = (() => {
  const D = window.ATLAS_V3, esc = s => UI.esc(s), now = () => Date.now();
  const st = () => { const v = V3.st(); v.sessions = v.sessions || []; v.sessSeed = v.sessSeed || 1; return v; };
  const cur = () => st().sess || null;
  const WALK = 55;                       // mètres par minute en médina, détours compris
  const COST = { donjon: 45, explo: 20, observe: 10, interaction: 12, secret: 15, derive: 8, q1: 15, q2: 25, q3: 40 };
  const KIND = {
    donjon: ['Donjon', 'atlas'], quete: ['Quête', 'quetes'], explo: ['Exploration', 'route'], observe: ['Observation', 'eye'],
    secret: ['Secret', 'star'], interaction: ['Rencontre', 'target'], derive: ['Dérive', 'plume']
  };

  /* ---------- hasard reproductible : une même graine donne la même proposition ---------- */
  function rng(seed) { let s = seed * 2654435761 >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const walk = (a, b) => a && b ? Math.round(Game.dist(a, b) * 1.25 / WALK) : 0;
  const ll = id => { const p = Game.pos(id); return p ? p.ll : null; };
  const fmtMin = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '');

  /* ---------- invitations à interagir : toujours facultatives ---------- */
  const INTER = {
    shop: [
      'Si la boutique est ouverte, entre et regarde une seule pièce de près : de quoi est-elle faite, comment tient-elle ? Tu n\'as rien à acheter.',
      'Si quelqu\'un y travaille et que le moment s\'y prête, demande le nom d\'une matière ou d\'un outil. Sinon, observe simplement le geste.'
    ],
    act: ['Renseigne-toi sur place sur ce qui s\'y fait aujourd\'hui. Participe seulement si l\'envie et le budget y sont.'],
    manger: ['Pause. Si c\'est ouvert, goûte une chose que tu ne connais pas encore et retiens son nom.'],
    verre: ['Pause. Assieds-toi, regarde la rue dix minutes et retiens un détail que tu n\'aurais pas vu en marchant.'],
    libre: [
      'Demande ton chemin vers ta prochaine étape à un commerçant plutôt qu\'à ton téléphone, si quelqu\'un est disponible.',
      'Trouve une plaque de rue et apprends à prononcer son nom. Si quelqu\'un te le dit, retiens-le.',
      'Si tu explores avec quelqu\'un qui joue aussi : comparez vos sacs, et montrez-vous chacun une carte que l\'autre n\'a pas.',
      'Cherche un atelier dont la porte est ouverte sur la rue. Regarde depuis le seuil, sans entrer si personne ne t\'y invite.'
    ]
  };
  const RULE = 'Facultatif. N\'insiste jamais, n\'entre que dans un lieu ouvert au public, ne photographie personne sans son accord.';

  /* ---------- point de départ ---------- */
  function origin(terr) {
    const f = AtlasMap.fix();
    if (!terr && f && !f.far && f.acc < 150) {
      let best = null, bd = 1e9; for (const p of Data.places) { const l = ll(p.id); if (!l) continue; const d = Game.dist(f.ll, l); if (d < bd) { bd = d; best = p; } }
      if (best && bd < 1500) return { ll: f.ll, t: best.t, gps: true };
    }
    const tid = terr || pickTerritory();
    const a = Data.places.find(p => p.t === tid && p.cat === 'inc' && ll(p.id)) || Data.places.find(p => p.t === tid && ll(p.id));
    return { ll: a ? ll(a.id) : null, t: tid, gps: false, from: a && a.id };
  }
  function pickTerritory() {   // le territoire où il reste le plus à vivre
    let best = null, bs = -1;
    for (const t of Data.territories) {
      const left = Data.places.filter(p => p.t === t.id && p.kind === 'culture' && ll(p.id) && !Game.disc(p.id)).length
        + 3 * Data.quests.filter(q => q.t === t.id && Game.questStatus(q) !== 'done').length + (D.adventures.some(a => a.t === t.id && !advDone(a.id)) ? 8 : 0);
      if (left > bs) { bs = left; best = t.id; }
    }
    return best || Data.territories[0].id;
  }
  const advDone = id => !!(st().adv[id] && st().adv[id].done);

  /* ---------- candidats ---------- */
  function questAnchor(q) {
    for (let i = 0; i < q.steps.length; i++) {
      if (Game.stepDone(q, i)) continue; const s = q.steps[i];
      const ids = s.place ? [s.place] : s.places || []; const pl = ids.find(id => !Game.disc(id) && ll(id)) || ids.find(id => ll(id));
      if (pl) return pl;
    }
    return null;
  }
  function candidates(o, dur) {
    const R = Math.min(2200, 450 + dur * 6), near = l => l && o.ll && Game.dist(o.ll, l) <= R;
    const inZone = (id, t) => (t || (Data.P[id] && Data.P[id].t)) === o.t || near(ll(id));
    const c = { donjon: [], quete: [], explo: [], observe: [], secret: [], interaction: [], derive: [] };
    for (const a of D.adventures) {
      if (advDone(a.id)) continue; const r = a.rooms.find(r => r.place && ll(r.place));
      if (r && (a.t === o.t || near(ll(r.place)))) c.donjon.push({ k: 'donjon', ref: a.id, title: a.title, txt: a.mood, mins: COST.donjon, ll: ll(r.place), tt: a.t, anchor: r.place });
    }
    for (const q of Data.quests) {
      if (Game.questStatus(q) === 'done') continue; const pl = questAnchor(q); if (!pl || !inZone(pl, q.t === o.t ? o.t : null)) continue;
      if (q.lvl === 3 && dur < 120) continue;
      const nst = q.steps.filter((s, i) => !Game.stepDone(q, i)).length;
      c.quete.push({ k: 'quete', ref: q.id, title: q.title, txt: q.intro, mins: (COST['q' + (q.lvl || 2)] || 25) + 4 * Math.max(0, nst - 1), ll: ll(pl), active: Game.questStatus(q) === 'active', tt: Data.P[pl].t, anchor: pl });
    }
    const unknown = Data.places.filter(p => p.kind === 'culture' && !Game.disc(p.id) && ll(p.id) && inZone(p.id));
    if (unknown.length) {
      const sorted = unknown.slice().sort((a, b) => Game.dist(o.ll || ll(a.id), ll(a.id)) - Game.dist(o.ll || ll(b.id), ll(b.id)));
      for (let i = 0; i < sorted.length && c.explo.length < 4; i += 3) {
        const grp = sorted.slice(i, i + 3), n = Math.min(grp.length, dur >= 120 ? 3 : 2);
        c.explo.push({ k: 'explo', ref: 'x' + i, refs: grp.map(p => p.id), n, title: 'Trouver ' + n + ' lieu' + (n > 1 ? 'x' : '') + ' inconnu' + (n > 1 ? 's' : ''),
          txt: 'Ils sont sur ta carte, encore muets. Le signal t\'avertira en approchant ; à toi de les révéler.', mins: COST.explo + 5 * (n - 1), ll: ll(grp[0].id) });
      }
    }
    for (const p of Data.places) {
      if (!Game.disc(p.id) || Game.isMastered(p.id) || !Game.challengesOf(p.id).length || !ll(p.id) || !inZone(p.id)) continue;
      c.observe.push({ k: 'observe', ref: p.id, title: 'Regarder vraiment : ' + p.name, txt: 'Tu es déjà passé ici. Une question t\'y attend, qui ne se résout qu\'en regardant.', mins: COST.observe, ll: ll(p.id) });
    }
    for (const q of D.photoQuests) {
      if (Photo.found(q.id) || !ll(q.at) || !inZone(q.at)) continue;
      c.secret.push({ k: 'secret', ref: q.id, title: q.title, txt: q.riddle, mins: COST.secret, ll: ll(q.at) });
    }
    for (const p of Data.places) {
      const pool = INTER[p.cat]; if (!pool || !ll(p.id) || !inZone(p.id)) continue;
      c.interaction.push({ k: 'interaction', ref: 'i:' + p.id, place: p.id, title: p.name, txt: pool[(p.n || 0) % pool.length], mins: COST.interaction, ll: ll(p.id) });
    }
    if (typeof Quotidien !== 'undefined') for (const p of Quotidien.list()) {
      if (!['cafe', 'pain', 'artisan', 'epicerie', 'livre', 'culture', 'vert'].includes(p.f) || Quotidien.found(p.id) || !(p.t === o.t || near(p.ll))) continue;
      c.interaction.push({ k: 'interaction', ref: 'i:' + p.id, qid: p.id, title: p.name, txt: Quotidien.invite(p.f), mins: COST.interaction, ll: p.ll });
    }
    INTER.libre.forEach((t, i) => c.interaction.push({ k: 'interaction', ref: 'i:libre' + i, title: ['Demander son chemin', 'Une plaque de rue', 'Entre joueurs', 'Un seuil d\'atelier'][i], txt: t, mins: COST.interaction, ll: null }));
    D.derives.forEach((t, i) => c.derive.push({ k: 'derive', ref: 'dv' + i, title: 'Dérive', txt: t, mins: COST.derive, ll: null }));
    return c;
  }

  /* ---------- composition ---------- */
  function generate(dur, opt) {
    opt = opt || {}; const seed = opt.seed || st().sessSeed, r = rng(seed), o = origin(opt.t);
    const c = candidates(o, dur), pick = {}; for (const k in c) pick[k] = shuffle(c[k], r);
    // les quêtes déjà commencées passent devant ; parmi les autres, la proximité compte, le hasard aussi
    const jitter = {}; const J = it => jitter[it.k + it.ref] = jitter[it.k + it.ref] || r() * 12;
    pick.quete.sort((a, b) => (b.active - a.active) || (walk(o.ll, a.ll) + J(a)) - (walk(o.ll, b.ll) + J(b)));
    pick.interaction.sort((a, b) => (!!b.ll - !!a.ll) || (walk(o.ll, a.ll) + J(a)) - (walk(o.ll, b.ll) + J(b)));
    // l'objectif : un donjon si le temps le permet, sinon une des trois quêtes les mieux placées
    // l'objectif est toujours dans le territoire annoncé ; avec le GPS, le plus proche de toi
    const home = it => it.tt === o.t;
    pick.donjon.sort((a, b) => (home(b) - home(a)) || walk(o.ll, a.ll) - walk(o.ll, b.ll));
    let main = dur >= 110 && pick.donjon.find(home);
    const qs = pick.quete.filter(home);
    if (!main && qs.length) main = qs[Math.floor(r() * Math.min(3, qs.length))];
    main = main || pick.explo[0] || pick.secret[0] || null;
    if (!o.gps && main && main.ll) { o.ll = main.ll; o.from = main.anchor || (main.refs && main.refs[0]) || o.from; }
    const items = [], used = new Set(), budget = Math.round(dur * 0.9);
    let spent = 0, pos = o.ll;
    const fits = it => spent + it.mins + walk(pos, it.ll) <= budget;
    const take = it => { items.push(it); used.add(it.k + it.ref); spent += it.mins + walk(pos, it.ll); if (it.ll) pos = it.ll; return it; };
    const next = k => pick[k].find(it => !used.has(it.k + it.ref) && fits(it));
    if (main && !fits(main)) main = next('quete') || next('explo') || next('derive');
    if (main) { main = Object.assign({}, main, { main: true }); take(main); }
    const pattern = ['interaction', 'explo', 'quete', 'observe', 'secret', 'derive', 'interaction', 'quete', 'explo', 'observe'];   // au moins une rencontre par partie
    for (let guard = 0; guard < 40; guard++) {
      let added = false;
      for (const k of pattern) { if (spent >= budget) break; const it = next(k); if (it) { take(it); added = true; } }
      if (!added || spent >= budget) break;
    }
    // ordre de marche : du plus proche au suivant ; les étapes sans lieu se glissent entre deux
    const placed = items.filter(i => i.ll), free = items.filter(i => !i.ll), route = []; let at = o.ll;
    while (placed.length) { let bi = 0, bd = 1e9; placed.forEach((it, i) => { const d = at ? Game.dist(at, it.ll) : 0; if (d < bd) { bd = d; bi = i; } }); const it = placed.splice(bi, 1)[0]; route.push(it); at = it.ll; }
    free.forEach((it, i) => route.splice(Math.min(route.length, 1 + i * 2), 0, it));
    const t = Data.T[o.t];
    return { seed, dur, t: o.t, gps: o.gps, from: o.from, start: o.ll, items: route.map(i => Object.assign({}, i)), est: spent,
      title: main ? (main.k === 'donjon' ? main.title : main.k === 'quete' ? '« ' + main.title + ' »' : 'Les lieux muets de ' + t.name) : 'Une ville à lire',
      goal: main ? main.title : '', terr: t.name };
  }

  /* ---------- suivi ---------- */
  function itemDone(it) {
    if (it.done) return true;
    if (it.k === 'quete') return Game.questStatus(Data.Q[it.ref]) === 'done';
    if (it.k === 'donjon') return advDone(it.ref);
    if (it.k === 'explo') { const s = cur(); return it.refs.filter(id => { const p = Game.pget(id); return p.d && (!s || p.d >= s.at); }).length >= it.n; }
    if (it.k === 'observe') return Game.isMastered(it.ref);
    if (it.k === 'secret') return Photo.found(it.ref);
    return false;
  }
  function progressOf(it) {
    if (it.k === 'explo') { const s = cur(); return it.refs.filter(id => { const p = Game.pget(id); return p.d && (!s || p.d >= s.at); }).length + ' / ' + it.n; }
    if (it.k === 'quete') { const q = Data.Q[it.ref]; return Game.questProgress(q) + ' / ' + q.steps.length; }
    return '';
  }
  let timer = null;
  function check(quiet) {
    const s = cur(); if (!s || s.end) return;
    let changed = false;
    for (const it of s.items) if (!it.at && itemDone(it)) { it.at = now(); changed = true; if (!quiet) { UI.toast(`Aventure : <b>${esc(it.title)}</b> accomplie.`, 'sess-open'); Sound.play('recompense'); } }
    for (const e of s.ev) if (e.k === 'temporaire' && !e.res && e.until) {
      const got = Data.places.some(p => { const g = Game.pget(p.id); return g.d && g.d >= e.at && g.d <= e.until; });
      if (got) { e.res = 'ok'; Game.S.xp.exploration = (Game.S.xp.exploration || 0) + 60; changed = true; if (!quiet) { UI.toast('Défi relevé à temps. <b>+60</b> en exploration.', 'sess-open'); Sound.play('recompense'); } }
      else if (now() > e.until) { e.res = 'late'; changed = true; }
    }
    if (changed) { Game.save(); hud(); }
  }

  /* ---------- imprévus : le monde continue sans toi ---------- */
  const EV_GAP = 12 * 60000, EV_FIRST = 8 * 60000;
  function eventPool(s, here) {
    const out = [], inPlan = new Set(s.items.map(i => i.ref)), nearby = (id, m) => { const l = ll(id); return l && here && Game.dist(here, l) <= m; };
    const zone = id => here ? nearby(id, 300) : Data.P[id] && Data.P[id].t === s.t;
    const lieu = Data.places.find(p => p.kind === 'culture' && !Game.disc(p.id) && zone(p.id) && !s.ev.some(e => e.ref === p.id));
    if (lieu) out.push({ k: 'lieu', ref: lieu.id, w: 3, title: 'Un lieu se signale', txt: here ? `${lieu.name} est à ${UI.fmtDist(Game.dist(here, ll(lieu.id)))}. Il n'était pas au programme.` : `${lieu.name}, dans ce territoire, n'était pas au programme.` });
    const sec = D.photoQuests.find(q => !Photo.found(q.id) && !inPlan.has(q.id) && (here ? nearby(q.at, 450) : Data.P[q.at].t === s.t) && !s.ev.some(e => e.ref === q.id));
    if (sec) out.push({ k: 'rare', ref: sec.id, w: 2, title: 'Une découverte rare', txt: 'Un secret dort près d\'ici. Il ne figure sur aucune liste : lève les yeux.' });
    const side = Data.quests.find(q => Game.questStatus(q) !== 'done' && !inPlan.has(q.id) && !s.ev.some(e => e.ref === q.id) && (() => { const a = questAnchor(q); return a && zone(a); })());
    if (side) out.push({ k: 'secondaire', ref: side.id, w: 2, title: 'Une quête secondaire', txt: `« ${side.title} » croise ton chemin. Tu peux l'ajouter, ou la laisser pour un autre jour.` });
    const shop = Data.places.find(p => INTER[p.cat] && (p.cat === 'shop' || p.cat === 'act') && (here ? nearby(p.id, 250) : p.t === s.t) && !inPlan.has('i:' + p.id) && !s.ev.some(e => e.ref === 'i:' + p.id));
    if (shop) out.push({ k: 'opportunite', ref: 'i:' + shop.id, place: shop.id, w: 2, title: 'Une occasion', txt: `${shop.name}, ${here ? 'tout près' : 'dans ce quartier'}. ` + INTER[shop.cat][0] });
    if (!s.ev.some(e => e.k === 'temporaire' && !e.res)) out.push({ k: 'temporaire', ref: 'tmp' + s.ev.length, w: 1.5, title: 'Défi de quinze minutes', txt: 'Dans le quart d\'heure qui vient, révèle un lieu que tu n\'as jamais vu. Réussi, il rapporte un bonus ; manqué, il ne coûte rien.' });
    const dv = D.derives[(s.ev.length * 3 + s.seed) % D.derives.length];
    out.push({ k: 'secret', ref: 'dv' + s.ev.length, w: 1, title: 'Un murmure', txt: dv });
    return out;
  }
  function tick(fix, force) {
    const s = cur(); if (!s || s.end) return null;
    check();
    const t = now(), last = s.ev.length ? s.ev[s.ev.length - 1].at : s.at;
    if (!force && (t - s.at < EV_FIRST || t - last < EV_GAP)) return null;
    const r = rng(s.seed * 31 + s.ev.length + Math.floor(t / 60000));
    if (!force && r() > 0.45) return null;
    const f = fix || AtlasMap.fix(), here = f && !f.far && f.acc < 120 ? f.ll : null;
    let pool = eventPool(s, here); if (typeof force === 'string') pool = pool.filter(e => e.k === force); if (!pool.length) return null;
    const tot = pool.reduce((a, e) => a + e.w, 0); let x = r() * tot, e = pool[0];
    for (const p of pool) { x -= p.w; if (x <= 0) { e = p; break; } }
    e = Object.assign({ at: t }, e); delete e.w; if (e.k === 'temporaire') e.until = t + 15 * 60000;
    s.ev.push(e); Game.save();
    UI.toast(`<b>${esc(e.title)}</b> · ${esc(e.txt.length > 90 ? e.txt.slice(0, 88) + '…' : e.txt)}`, 'sess-open');
    Sound.play(e.k === 'rare' ? 'secret' : e.k === 'secondaire' ? 'quete' : 'proche');
    hud(); return e;
  }

  /* ---------- départ, fin ---------- */
  let draft = null;
  function begin() {
    if (!draft) return; const s = st();
    if (s.sess && !s.sess.end) finish(true);
    const cards0 = Object.keys(s.cards).length;
    s.sess = Object.assign({ id: 's' + now(), at: now(), ev: [], cards0, xp0: Game.totalXP() }, draft);
    s.sessSeed = (s.sessSeed || 1) + 1; draft = null;
    Game.S.journal.push({ t: now(), k: 'session', r: s.sess.id, txt: 'Départ : ' + s.sess.title + ' (' + fmtMin(s.sess.dur) + ')', xp: 0 });
    Game.save(); Sound.play('aventure');
    if (!Explore.isOn()) { try { Explore.start(); } catch (e) { /* sans GPS, l'aventure se joue quand même */ } }
    UI.closeSheet(); UI.show('atlas'); hud(); arm();
    UI.toast('L\'aventure commence. Le premier pas est à toi.', 'sess-open');
  }
  function finish(silent) {
    const s = cur(); if (!s || s.end) return null; check(true);
    const v = st(), t = now(), done = s.items.filter(i => i.at);
    const found = Game.S.journal.filter(j => j.k === 'discover' && j.t >= s.at).length;
    const inter = done.filter(i => i.k === 'interaction').length;
    const xp = 40 * done.length + 20 * inter; Game.S.xp.exploration = (Game.S.xp.exploration || 0) + xp;
    const sum = { id: s.id, at: s.at, end: t, dur: s.dur, title: s.title, terr: s.terr, done: done.length, of: s.items.length, found, inter,
      ev: s.ev.length, xp, cards: Object.entries(v.cards).filter(([, at]) => at >= s.at).map(([id]) => id), items: s.items.map(i => ({ k: i.k, title: i.title, at: i.at || 0 })) };
    s.end = t; v.sessions.push(sum); v.sess = null;
    Game.S.journal.push({ t, k: 'session', r: s.id, txt: 'Retour : ' + s.title + ' — ' + done.length + ' / ' + s.items.length + ' étapes, ' + found + ' lieu' + (found > 1 ? 'x' : '') + ' trouvé' + (found > 1 ? 's' : ''), xp });
    Game.check();
    const n = v.sessions.filter(x => x.done > 0).length, ni = v.sessions.reduce((a, x) => a + (x.inter || 0), 0);
    if (n >= 1) V3.give('c-depart', 'Première aventure', silent);
    if (ni >= 3) V3.give('c-rencontre', 'Trois rencontres', silent);
    if (n >= 5) V3.give('c-voyageur', 'Cinq aventures', silent);
    sum.cards = Object.entries(v.cards).filter(([, at]) => at >= s.at).map(([id]) => id);
    Game.save(); disarm(); hud();
    if (!silent) UI.openSheet(summaryHTML, sum.id);
    return sum;
  }
  function arm() { disarm(); timer = setInterval(() => { try { tick(); } catch (e) { console.error(e); } }, 30000); }
  function disarm() { if (timer) clearInterval(timer); timer = null; }

  /* ---------- écrans ---------- */
  const DURS = [60, 120, 180, 240];
  function chooseHTML() {
    const s = cur();
    let h = `<div class="sess-head"><div class="eyebrow">Une partie, dans la vraie ville</div><h2>Commencer une aventure</h2>
      <p class="lead">Combien de temps veux-tu y consacrer ? C'est une intention, pas un chronomètre : tu t'arrêtes quand tu veux.</p></div>`;
    if (s) h += `<button class="sess-resume" data-act="sess-open"><span class="eyebrow">En cours</span><b>${esc(s.title)}</b><small>${elapsed(s)} sur ${fmtMin(s.dur)} · ${s.items.filter(i => i.at).length} / ${s.items.length} étapes</small></button>`;
    h += `<div class="sess-durs">${DURS.map(d => `<button class="sess-dur" data-act="sess-dur" data-v="${d}"><b>${d / 60}</b><span>heure${d > 60 ? 's' : ''}</span></button>`).join('')}</div>
      <div class="sess-custom"><label for="sess-min">Autre durée : <b id="sess-min-v">1 h 30</b></label><input id="sess-min" type="range" min="30" max="480" step="15" value="90" data-sess-range="1">
      <button class="btn" data-act="sess-dur" data-v="custom">Avec cette durée</button></div>
      <p class="src">L'aventure part de ta position si le GPS te situe dans la médina, sinon du territoire où il te reste le plus à vivre.</p>`;
    return h;
  }
  function itemRow(it, live) {
    const [lab, ico] = KIND[it.k], ok = live && it.at, pr = live && !ok ? progressOf(it) : '';
    const dist = !live && it.ll && draft && draft.start ? '' : '';
    return `<li class="si k-${it.k}${it.main ? ' main' : ''}${ok ? ' ok' : ''}${it.skip ? ' skip' : ''}">
      <span class="si-i">${Art.icon(ico) || '•'}</span>
      <span class="si-b"><small>${it.main ? 'Objectif · ' : ''}${lab} · ${fmtMin(it.mins)}${pr ? ' · ' + pr : ''}${ok ? ' · accompli' : it.skip ? ' · laissé' : ''}</small><b>${esc(it.title)}</b>
      <span class="si-t">${esc(it.txt || '')}</span>${it.k === 'interaction' ? `<span class="si-rule">${RULE}</span>` : ''}
      ${live && !ok && !it.skip ? actionsFor(it) : ''}${dist}</span></li>`;
  }
  function actionsFor(it) {
    const go = { quete: ['open-quest', it.ref], donjon: ['open-adv', it.ref], observe: ['open-place', it.ref], secret: ['sess-secret', it.ref] }[it.k];
    let b = '';
    if (go) b += `<button class="btn" data-act="${go[0]}" data-id="${esc(go[1])}">Ouvrir</button>`;
    if (it.k === 'explo') b += `<button class="btn" data-act="sess-show" data-id="${esc(it.ref)}">Voir sur la carte</button>`;
    if (it.place) b += `<button class="btn" data-act="open-place" data-id="${esc(it.place)}">Sur la carte</button>`;
    if (it.qid) b += `<button class="btn" data-act="quot-open" data-id="${esc(it.qid)}">La fiche</button>`;
    if (it.k === 'interaction' || it.k === 'derive') b += `<button class="btn primary" data-act="sess-did" data-id="${esc(it.ref)}">C'est fait</button>`;
    b += `<button class="btn ghost" data-act="sess-skip" data-id="${esc(it.ref)}">Pas cette fois</button>`;
    return `<span class="si-a">${b}</span>`;
  }
  function proposalHTML() {
    const p = draft; if (!p) return chooseHTML();
    const t = Data.T[p.t];
    let h = `<div class="sess-head" style="--tc:${t.color}"><div class="eyebrow">${fmtMin(p.dur)} · territoire ${t.num} · ${esc(p.terr)}</div><h2>${esc(p.title)}</h2>
      <p class="lead">${p.gps ? 'Départ : là où tu es.' : 'Départ : ' + esc(p.from ? Data.P[p.from].name : p.terr) + '.'} ${p.items.length} étapes, environ ${fmtMin(p.est)} de marche et de jeu. Le reste du temps appartient aux imprévus.</p></div>`;
    if (!p.items.length) h += '<p class="note">Ce territoire n\'a plus rien à proposer pour cette durée. Essaie un autre quartier.</p>';
    h += `<ol class="sess-list">${p.items.map(it => itemRow(it, false)).join('')}</ol>
      <div class="btn-row"><button class="btn primary big wide" data-act="sess-go"${p.items.length ? '' : ' disabled'}>C'est parti</button></div>
      <div class="btn-row"><button class="btn" data-act="sess-reroll">Autre proposition</button><button class="btn" data-act="sess-terr">Autre quartier</button></div>
      <p class="src">Des événements peuvent surgir en route : un lieu qui se signale, une quête qui croise ton chemin, un défi. Les rencontres sont toujours facultatives.</p>`;
    return h;
  }
  function elapsed(s) { return fmtMin(Math.max(0, Math.round((now() - s.at) / 60000))); }
  function liveHTML() {
    const s = cur(); if (!s) return chooseHTML(); check(true);
    const t = Data.T[s.t], done = s.items.filter(i => i.at).length, over = now() - s.at > s.dur * 60000;
    let h = `<div class="sess-head" style="--tc:${t.color}"><div class="eyebrow">Aventure en cours · ${esc(s.terr)}</div><h2>${esc(s.title)}</h2>
      <div class="sess-clock"><b>${elapsed(s)}</b><span>sur ${fmtMin(s.dur)}</span><i style="--p:${Math.min(100, Math.round((now() - s.at) / (s.dur * 600)))}%"></i></div>
      <p class="lead">${done} / ${s.items.length} étapes. ${over ? 'Le temps prévu est passé : continue si l\'envie est là, ou rentre avec ce que tu as.' : 'Dans l\'ordre que tu veux.'}</p></div>`;
    h += `<ol class="sess-list">${s.items.map(it => itemRow(it, true)).join('')}</ol>`;
    if (s.ev.length) {
      h += '<h3>Imprévus</h3><ul class="sess-ev">' + s.ev.slice().reverse().map(e => {
        const acts = e.k === 'lieu' ? `<button class="btn" data-act="open-place" data-id="${esc(e.ref)}">Voir</button>`
          : e.k === 'secondaire' ? (s.items.some(i => i.ref === e.ref) ? '<small>Ajoutée</small>' : `<button class="btn" data-act="sess-add" data-id="${esc(e.ref)}">Ajouter</button>`)
          : e.k === 'rare' ? `<button class="btn" data-act="sess-secret" data-id="${esc(e.ref)}">Le secret</button>`
          : e.k === 'opportunite' ? (s.items.some(i => i.ref === e.ref) ? '<small>Ajoutée</small>' : `<button class="btn" data-act="sess-add" data-id="${esc(e.ref)}">Ajouter</button>`)
          : e.k === 'temporaire' ? `<small>${e.res === 'ok' ? 'Relevé' : e.res === 'late' ? 'Passé' : 'Jusqu\'à ' + new Date(e.until).toTimeString().slice(0, 5)}</small>` : '';
        return `<li class="ev-${e.k}"><small>${new Date(e.at).toTimeString().slice(0, 5)} · ${esc(e.title)}</small><p>${esc(e.txt)}</p>${acts}</li>`;
      }).join('') + '</ul>';
    }
    h += `<div class="btn-row"><button class="btn primary wide" data-act="sess-end">Terminer l'aventure</button></div>`;
    return h;
  }
  function summaryHTML(id) {
    const x = st().sessions.find(s => s.id === id); if (!x) return '';
    const min = Math.round((x.end - x.at) / 60000);
    let h = `<div class="sess-head"><div class="eyebrow">Retour d'aventure · ${esc(x.terr)}</div><h2>${esc(x.title)}</h2></div>
      <div class="sess-stats"><span><b>${fmtMin(min)}</b>dehors</span><span><b>${x.done} / ${x.of}</b>étapes</span><span><b>${x.found}</b>lieux trouvés</span><span><b>${x.inter}</b>rencontres</span><span><b>${x.ev}</b>imprévus</span><span><b>+${x.xp}</b>exploration</span></div>`;
    if (x.cards.length) h += '<h3>Rapporté</h3><div class="tcs">' + x.cards.map(c => V3.cardHTML(V3.cardData(c))).join('') + '</div>';
    h += '<ol class="sess-list recap">' + x.items.map(i => `<li class="${i.at ? 'ok' : 'skip'}"><small>${KIND[i.k][0]}</small><b>${esc(i.title)}</b></li>`).join('') + '</ol>';
    return h + '<p class="src">Ce récit est rangé dans ton carnet.</p>';
  }
  function carnetHTML() {
    const v = st(), list = v.sessions.slice().reverse(); if (!list.length && !v.sess) return '';
    return '<h3>Aventures vécues</h3><div class="sess-past">' + (v.sess ? `<button class="sp live" data-act="sess-open"><small>En cours</small><b>${esc(v.sess.title)}</b></button>` : '')
      + list.slice(0, 12).map(x => `<button class="sp" data-act="sess-sum" data-id="${x.id}"><small>${new Date(x.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} · ${fmtMin(Math.round((x.end - x.at) / 60000))}</small><b>${esc(x.title)}</b><span>${x.done} / ${x.of} étapes · ${x.found} lieux</span></button>`).join('') + '</div>';
  }
  function bannerHTML() {   // en tête de l'onglet Aventures
    const s = cur();
    return `<button class="sess-banner${s ? ' live' : ''}" data-act="${s ? 'sess-open' : 'sess-new'}"><span class="eyebrow">${s ? 'Aventure en cours · ' + elapsed(s) : 'Une sortie ordinaire, transformée'}</span><b>${s ? esc(s.title) : 'Commencer une aventure'}</b><small>${s ? s.items.filter(i => i.at).length + ' / ' + s.items.length + ' étapes' : '1 h, 2 h, une après-midi : le jeu compose ta partie.'}</small></button>`;
  }
  function hud() {
    const b = document.getElementById('sessbtn'); if (!b) return; const s = cur();
    b.classList.toggle('live', !!s);
    b.innerHTML = s ? `<i>${Art.icon('route')}</i><span><small>${elapsed(s)} / ${fmtMin(s.dur)}</small><b>${s.items.filter(i => i.at).length} / ${s.items.length}</b></span>` : `<i>${Art.icon('route')}</i><span><b>Commencer une aventure</b></span>`;
    b.dataset.act = s ? 'sess-open' : 'sess-new';
  }

  /* ---------- actions ---------- */
  const open = () => UI.openSheet(cur() ? liveHTML : chooseHTML);
  const findItem = id => { const s = cur(); return s && s.items.find(i => i.ref === id); };
  const actions = {
    'sess-new'() { draft = null; UI.openSheet(chooseHTML); },
    'sess-open'() { open(); },
    'sess-dur'(d) {
      const v = d.v === 'custom' ? +(document.getElementById('sess-min') || {}).value || 90 : +d.v;
      draft = generate(v); UI.openSheet(proposalHTML);
    },
    'sess-reroll'() {
      if (!draft) return; const sig = d => d.items.map(i => i.ref).join(), old = sig(draft); let g = draft;
      for (let k = 0; k < 8 && sig(g) === old; k++) { st().sessSeed++; g = generate(draft.dur, { seed: st().sessSeed, t: draft.gps ? null : draft.t }); }
      draft = g; UI.draw(false);
    },
    'sess-terr'() {
      if (!draft) return; const ids = Data.territories.map(t => t.id), i = ids.indexOf(draft.t);
      draft = generate(draft.dur, { seed: st().sessSeed, t: ids[(i + 1) % ids.length] }); UI.draw(false);
    },
    'sess-go'() { begin(); },
    'sess-did'(d) { const it = findItem(d.id); if (!it) return; it.done = true; it.at = now(); if (it.qid) Quotidien.discover(it.qid, 'manuel'); Game.save(); Sound.play('recompense'); UI.toast('Gardé dans le récit de ton aventure.'); UI.draw(false); hud(); },
    'sess-skip'(d) { const it = findItem(d.id); if (!it) return; it.skip = !it.skip; Game.save(); UI.draw(false); },
    'sess-add'(d) {
      const s = cur(); if (!s || s.items.some(i => i.ref === d.id)) return; const e = s.ev.find(x => x.ref === d.id);
      if (d.id.startsWith('i:')) { const p = Data.P[d.id.slice(2)]; s.items.push({ k: 'interaction', ref: d.id, place: p.id, title: p.name, txt: INTER[p.cat][0], mins: COST.interaction, ll: ll(p.id) }); }
      else { const q = Data.Q[d.id]; if (!q) return; s.items.push({ k: 'quete', ref: q.id, title: q.title, txt: q.intro, mins: COST['q' + (q.lvl || 2)], ll: ll(questAnchor(q)) }); }
      if (e) e.added = true; Game.save(); UI.draw(false); hud();
    },
    'sess-secret'(d) { Photo.open(d.id); },
    'sess-show'(d) {
      const it = findItem(d.id); if (!it) return; UI.closeSheet(); UI.show('atlas');
      const pts = it.refs.map(ll).filter(Boolean); if (pts.length && AtlasMap.fitTo) AtlasMap.fitTo(pts); else if (pts.length) UI.openPlace(it.refs[0]);
    },
    'sess-end'() { finish(false); },
    'sess-sum'(d) { UI.openSheet(summaryHTML, d.id); }
  };

  function init() {
    Object.assign(Views.actions, actions);
    Explore.register(() => { const s = cur(); if (!s) return []; return s.items.filter(i => !i.at && !i.skip && i.k === 'interaction' && i.place && ll(i.place)).map(i => ({ id: 'p:' + i.place, kind: 'quete', ll: ll(i.place), ref: i.place })); });
    document.addEventListener('input', e => {
      if (!e.target.dataset || !e.target.dataset.sessRange) return; const o = document.getElementById('sess-min-v'); if (o) o.textContent = fmtMin(+e.target.value);
    });
    hud(); if (cur()) { check(true); arm(); }
    setInterval(() => { if (cur()) hud(); }, 60000);
  }
  return { init, generate, begin: () => begin(), finish, tick, check, cur, carnetHTML, bannerHTML, hud, open,
    _draft: v => (v === undefined ? draft : (draft = v)) };
})();
