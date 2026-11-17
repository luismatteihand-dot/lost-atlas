/* Mode exploration : le GPS compare la position aux contenus géolocalisés et fait entendre un signal quand on approche.
   Fonctionne tant que l'application est ouverte, au premier plan, écran allumé (limite du navigateur, voir README).
   Zones d'entrée et de sortie distinctes (hystérésis), délai minimal entre deux signaux, priorité, regroupement, mémoire. */
const Explore = (() => {
  const { $, esc } = UI, D = window.ATLAS_V3;
  /* Réglages du moteur de proximité. Un contenu géolocalisé n'a rien d'autre à faire que se déclarer (voir `register`). */
  const CFG = {
    minGap: 45000,          // délai minimal entre deux signaux (ms)
    rehear: 3 * 3600e3,     // une même zone n'est pas re-signalée avant ce délai
    group: 60,              // éléments à moins de N m du signal choisi : notés sans son
    lostAfter: 30000,       // sans nouvelle position pendant ce délai : « signal perdu »
    exitK: 1.3, exitM: 15,  // sortie de zone : rayon × 1,3 + 15 m
    /* Par catégorie : rayon d'approche (far), rayon de proximité immédiate (near), précision GPS exigée, priorité, son. 0 = pas de zone. */
    kinds: {
      important: { far: 150, near: 40, acc: 60, prio: 2, sound: 'important' },
      lieu: { far: 75, near: 30, acc: 45, prio: 1, sound: 'lieu' },
      quete: { far: 75, near: 30, acc: 45, prio: 2.5, sound: 'quete' },
      secret: { far: 0, near: 30, acc: 25, prio: 4, sound: 'secret' },
      aventure: { far: 110, near: 0, acc: 60, prio: 3, sound: 'aventure' }
    }
  };
  CFG.tiers = CFG.kinds;   // ancien nom, conservé
  const NAME = { lieu: 'Un lieu est proche', important: 'Un lieu majeur est proche', secret: 'Un secret est proche', aventure: 'Un donjon est proche', quete: 'Une quête passe par ici' };
  let on = false, owns = false, state = 'off', inside = {}, pending = {}, lastSignal = 0, lastFix = null, wake = null, retry = null, last = null, pocket = false, holdT = null;
  const P = () => Sound.prefs();
  const mem = () => { const s = V3.st(); s.heard = s.heard || {}; s.detected = s.detected || []; return s; };

  /* ---------- Registre des contenus géolocalisés ----------
     Un fournisseur renvoie des cibles : { id, kind, ll, ref, far?, near?, prio?, sound?, quest? }.
     Tout ce qui est renvoyé ici bénéficie du même moteur : zones, précision, délai, priorité, mémoire. */
  const providers = [];
  const register = fn => providers.push(fn);
  register(() => {                                  // lieux culturels à trouver
    const out = [], found = P().found;
    for (const pl of Data.places) {
      if (pl.ref !== pl.id || pl.kind !== 'culture') continue;
      const po = Game.pos(pl.id); if (!po || (Game.disc(pl.id) && !found)) continue;
      out.push({ id: 'p:' + pl.id, kind: D.major.includes(pl.id) ? 'important' : 'lieu', ll: po.ll, ref: pl.id });
    }
    return out;
  });
  register(() => D.photoQuests.filter(q => !Photo.found(q.id) && Game.pos(q.at)).map(q => ({ id: 'q:' + q.id, kind: 'secret', ll: Game.pos(q.at).ll, ref: q.id, near: q.signal })));   // secrets à photographier
  register(() => D.adventures.filter(a => !(V3.st().adv[a.id] && V3.st().adv[a.id].done)).map(a => { const room = a.rooms.find(r => r.place && Game.pos(r.place)); return room && { id: 'a:' + a.id, kind: 'aventure', ll: Game.pos(room.place).ll, ref: a.id }; }).filter(Boolean));   // entrées de donjon
  register(() => {                                  // étapes des quêtes commencées ou suivies
    const out = [], fol = V3.st().follow || {};
    for (const q of Data.quests) {
      const st = Game.questStatus(q); if (st === 'done' || st === 'locked' || !(st === 'active' || fol[q.id])) continue;
      q.steps.forEach((s, i) => {
        if (Game.stepDone(q, i)) return;
        for (const pid of (s.place ? [s.place] : s.places || [])) { const po = Game.pos(pid); if (po && !(s.places && Game.disc(pid))) out.push({ id: 'p:' + pid, kind: 'quete', ll: po.ll, ref: pid, quest: q.id, prio: fol[q.id] ? 4.5 : undefined /* une quête suivie passe avant tout */ }); }
      });
    }
    return out;
  });
  function targets() {
    const by = {};
    for (const fn of providers) for (const t of fn() || []) { const k = CFG.kinds[t.kind]; if (!k) continue; t.prio = t.prio || k.prio; if (t.far === undefined) t.far = k.far; if (t.near === undefined) t.near = k.near; t.sound = t.sound || k.sound || t.kind; if (!by[t.id] || t.prio > by[t.id].prio) by[t.id] = t; }   // même lieu déclaré deux fois : la plus haute priorité l'emporte
    return Object.values(by);
  }
  /* Les zones d'une cible : approche (far) puis proximité immédiate (near). La première garde l'identifiant nu, pour la mémoire des versions précédentes. */
  function zones(t) {
    const k = CFG.kinds[t.kind], s = P().sens, far = (t.far !== undefined ? t.far : k.far) * s, near = (t.near !== undefined ? t.near : k.near) * s, z = [];
    if (far > 0) z.push({ zid: t.id, r: far, stage: 'far', t });
    if (near > 0) z.push({ zid: far > 0 ? t.id + '#n' : t.id, r: near, stage: far > 0 ? 'near' : 'only', t });
    return z;
  }

  /* ---------- Cœur : une position arrive ---------- */
  function onFix(fix) {
    lastFix = fix; if (AtlasMap.isFollowing()) setState(fix.far ? 'far' : fix.acc <= 60 ? 'ok' : 'weak'); else pill();     // l'état du GPS est suivi même hors mode exploration
    if (!on || fix.far) return null;
    const now = Date.now(), m = mem(), p = P(), live = {};
    for (const t of targets()) {
      t.d = Game.dist(fix.ll, t.ll);
      for (const z of zones(t)) {
        live[z.zid] = z;
        if (!inside[z.zid]) { if (t.d <= z.r && fix.acc <= Math.max(CFG.kinds[t.kind].acc, Math.min(60, z.r * 0.6))) { inside[z.zid] = now; pending[z.zid] = now; } }   // la précision doit être meilleure que le rayon
        else if (t.d > z.r * CFG.exitK + CFG.exitM) { delete inside[z.zid]; delete pending[z.zid]; }
      }
    }
    for (const id in pending) if (!live[id]) { delete pending[id]; delete inside[id]; }      // cible disparue (découverte entre-temps)
    // candidats : dans une zone, catégorie active, pas entendus récemment
    let cands = Object.keys(pending).map(id => live[id]).filter(z => {
      if (p.cats[z.t.kind] === false) { delete pending[z.zid]; return false; }
      if (m.heard[z.zid] && now - m.heard[z.zid] < CFG.rehear) { delete pending[z.zid]; return false; }
      return true;
    });
    const nearOf = {}; cands.forEach(z => { if (z.stage === 'near') nearOf[z.t.id] = 1; });
    cands = cands.filter(z => { if (z.stage === 'far' && nearOf[z.t.id]) { m.heard[z.zid] = now; delete pending[z.zid]; return false; } return true; });   // arrivé d'un coup tout près : un seul signal, le plus précis
    if (!cands.length || now - lastSignal < CFG.minGap) return null;
    cands.sort((a, b) => b.t.prio - a.t.prio || (b.stage !== 'far') - (a.stage !== 'far') || a.t.d - b.t.d);
    const win = cands[0];
    signal(win, now, false);
    for (const z of cands.slice(1)) if (Game.dist(z.t.ll, win.t.ll) <= CFG.group) signal(z, now, true);   // voisins : mémorisés sans son
    Game.save(); UI.after(); pill();
    return win.t;
  }
  function signal(z, now, grouped) {
    const m = mem(), t = z.t; m.heard[z.zid] = now; delete pending[z.zid];
    m.detected.push({ id: t.id, k: t.kind, at: now, g: grouped ? 1 : 0, n: z.stage === 'near' ? 1 : 0, q: t.quest || undefined }); if (m.detected.length > 200) m.detected.splice(0, m.detected.length - 200);
    if (grouped) return;
    lastSignal = now; last = { t, at: now };
    if (z.stage === 'near') Sound.play('proche', { cat: t.kind }); else Sound.play(t.sound || CFG.kinds[t.kind].sound);
    try { if (navigator.vibrate && !P().silent) navigator.vibrate(t.kind === 'secret' ? [60, 80, 60] : z.stage === 'near' ? [30, 60, 30] : 60); } catch (e) { /* non disponible (iPhone) */ }
    const what = t.kind === 'aventure' ? ' : <b>' + esc(D.adventures.find(a => a.id === t.ref).title) + '</b>' : t.quest ? ' : <b>' + esc(Data.Q[t.quest].title) + '</b>' : '';
    UI.toast((z.stage === 'near' ? 'Tout près. Regarde autour de toi' : esc(NAME[t.kind])) + what, 'open-signal', t.quest ? 'Q:' + t.quest : t.id);
  }
  /* Une découverte par GPS (existant) compte comme un signal : pas de bip de proximité juste après. */
  function noteDiscovery() { if (on) lastSignal = Date.now(); }

  /* ---------- États, démarrage, arrêt ---------- */
  const TXT = { off: 'GPS inactif', search: 'Recherche GPS…', ok: 'GPS', weak: 'GPS imprécis', lost: 'Signal GPS perdu', timeout: 'GPS : délai dépassé', denied: 'GPS refusé', unavail: 'GPS indisponible', insecure: 'HTTPS requis', framed: 'GPS bloqué ici', far: 'Hors de Marrakech' };
  /* Page affichée dans le cadre d'une autre (l'aperçu Claude) : ce cadre interdit la localisation, quoi que fasse le jeu. */
  const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const gpsLink = () => window.ATLAS_GPS_URL ? `<a class="lk" href="${window.ATLAS_GPS_URL}" target="_blank" rel="noopener">${window.ATLAS_GPS_URL.replace(/^https:\/\//, '')}</a>` : 'son adresse https publiée';
  const clock = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  function setState(s) { if (s !== state) { state = s; pill(); if (UI.sheetIs && UI.sheetIs(sheetHTML)) UI.draw(false); } else pill(); }
  function pill() {
    const el = $('#xpill'), live = state === 'ok' || state === 'weak';
    if (el) { el.className = 'st-' + state + (on ? ' on' : '');
      el.innerHTML = `<i></i><span>${on && state === 'ok' ? 'Exploration' : TXT[state]}${live && lastFix ? ' · ± ' + lastFix.acc + ' m' : ''}</span>`; }
    const b = $('#fab-gps');
    if (b) { const f = AtlasMap.isFollowing(), a = AtlasMap.isAuto(); b.classList.toggle('auto', a);
      b.innerHTML = `<i>${Art.icon(f && !a ? 'target' : 'gps')}</i><span>${!f ? 'Me localiser' : a ? 'Suivi actif' : 'Recentrer'}</span>`; b.setAttribute('aria-label', !f ? 'Me localiser' : a ? 'Suivi automatique actif : ouvrir les réglages GPS' : 'Recentrer la carte sur ma position'); }
    const pk = $('#pocket-st'); if (pk) pk.textContent = TXT[state] + (lastFix && live ? ' · ± ' + lastFix.acc + ' m' : '') + (last ? ' · dernier signal ' + new Date(last.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');
  }
  /* La carte signale que le suivi GPS démarre, s'arrête, ou change de mode (suivi automatique / carte libre). */
  function gpsChanged(following) {
    if (following) { if (['off', 'denied', 'unavail', 'insecure', 'timeout', 'lost', 'framed'].includes(state)) setState('search'); else pill(); }
    else { if (!document.hidden && !['denied', 'unavail', 'insecure', 'framed'].includes(state)) { lastFix = null; setState('off'); } else pill(); }
    if (UI.sheetIs && UI.sheetIs(sheetHTML)) UI.draw(false);
  }
  async function lock() {
    try { if ('wakeLock' in navigator && !document.hidden) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; }
  }
  function start() {
    Sound.prime(); on = true; P().on = true; Game.save(); inside = {}; pending = {};
    owns = !AtlasMap.isFollowing(); if (owns) AtlasMap.follow(true); else pill();
    lock();
  }
  function stop() {
    on = false; P().on = false; Game.save(); inside = {}; pending = {};
    if (owns) AtlasMap.follow(false); owns = false; if (wake) { try { wake.release(); } catch (e) { /* ignore */ } wake = null; }
    setPocket(false); pill();
  }
  /* Erreurs du GPS. Renvoie true quand l'état affiché suffit (pas de message supplémentaire). */
  function onGpsError(err) {
    const c = err && err.code;
    if (FRAMED && c !== 2 && c !== 3) { on = false; owns = false; P().on = false; setState('framed'); UI.toast('Claude bloque la localisation dans cet aperçu. Touche ici : l\'adresse du jeu avec GPS.', 'x-open'); return true; }
    if (c === 1) { on = false; owns = false; P().on = false; setState('denied'); return false; }
    if (c === -1) { on = false; owns = false; setState('insecure'); return false; }
    if (c === 3) { setState(lastFix ? 'lost' : 'timeout'); return true; }      // le suivi continue : nouvelle tentative automatique
    if (c === 2) { setState('lost'); return true; }
    on = false; owns = false; setState('unavail'); return false;
  }

  /* ---------- Mode poche : écran noir, tactile verrouillé, écran maintenu allumé si le navigateur le permet ---------- */
  function setPocket(v) { pocket = v; const el = $('#pocket'); if (el) el.hidden = !v; if (v) { pill(); lock(); } }

  /* ---------- Feuille « Mode exploration » ---------- */
  const sw = (act, k, lab, sub, val) => `<button class="row tog${val ? ' on' : ''}" data-act="${act}" data-k="${k}"><span class="rt"><b>${lab}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="sw"></span></button>`;
  function sheetHTML() {
    const p = P(), m = mem(), det = m.detected.slice(-6).reverse();
    const acc = lastFix ? lastFix.acc : '?', f = AtlasMap.isFollowing(), au = AtlasMap.isAuto();
    const gps = { off: 'Inactif. Rien n\'est localisé tant que tu ne le demandes pas.', search: 'Recherche de ta position…', ok: 'Position disponible, précision ± ' + acc + ' m.', weak: 'Position reçue mais imprécise (± ' + acc + ' m) : aucun signal ni découverte automatique tant qu\'elle ne s\'améliore pas.',
      lost: 'Signal perdu : plus de position récente. Le suivi continue et reprendra seul, à ciel ouvert.', timeout: 'Le GPS met trop de temps à répondre. Nouvelle tentative en cours ; essaie à ciel ouvert.',
      denied: 'Autorisation refusée. Sur iPhone : Réglages → Confidentialité et sécurité → Service de localisation (activé) → Sites web Safari → « Lorsque l\'app est active », avec Position exacte. Puis recharge la page et touche à nouveau « Me localiser ». Les intitulés peuvent varier selon la version d\'iOS.',
      unavail: 'La localisation n\'est pas disponible sur cet appareil ou dans cet affichage.', insecure: 'La localisation exige une adresse sécurisée (https://). Ouvre le jeu depuis son adresse en https.', framed: 'Cette page est affichée à l\'intérieur de Claude, qui interdit la localisation aux pages qu\'il héberge. Le jeu marche, mais sans position. Pour le GPS en temps réel, ouvre le jeu à son adresse : ' + gpsLink() + '.', far: 'Ton GPS te situe loin de Marrakech : la position s\'affiche, les signaux sont suspendus.' }[state];
    let h = `<div class="eyebrow">Monde</div><h2>GPS et exploration</h2>
      <div class="xstat st-${state}"><i></i><p><b>GPS.</b> ${gps}${lastFix && f ? ' Dernière position à ' + clock(lastFix.t) + '.' : ''}</p></div>
      <div class="btn-row">${!f ? '<button class="btn primary" data-act="gps">Me localiser</button>' : (au ? '<span class="chip st-mastered">Suivi automatique</span>' : '<button class="btn primary" data-act="gps">Recentrer sur moi</button>') + '<button class="btn" data-act="gps-stop">Arrêter le GPS</button>'}</div>
      ${f ? `<p class="src">${au ? 'La carte te suit. Déplace-la du doigt pour explorer librement : elle cessera de se recentrer.' : 'Carte libre : ta position continue de se mettre à jour, sans recentrage. « Recentrer » relance le suivi.'}</p>` : ''}
      <h3>Mode exploration</h3><p class="p-text">Range le téléphone. Quand tu approches de quelque chose, un signal te le dit ; tu regardes si tu veux.</p>
      <button class="btn ${on ? 'danger' : 'primary'} wide big" data-act="x-toggle">${on ? 'Arrêter l\'exploration' : 'Commencer l\'exploration'}</button>`;
    if (on) h += `<div class="xstat ${wake ? 'st-ok' : 'st-weak'}"><i></i><p><b>Écran.</b> ${wake ? 'Maintenu allumé par l\'application.' : 'Ce navigateur ne permet pas de le maintenir allumé : règle le verrouillage automatique de l\'iPhone sur « Jamais » le temps de la promenade.'}</p></div>
      <button class="btn wide" data-act="x-pocket">Mode poche (écran noir, tactile verrouillé)</button>`;
    h += `<p class="note">Limite réelle : une application web ne reçoit plus la position ni ne joue de son quand le téléphone est verrouillé ou l'application en arrière-plan. Garde-la ouverte ; le mode poche est fait pour cela.</p>
      <h3>Sons</h3><div class="rows">${sw('x-pref', 'sound', 'Signaux sonores', '', p.sound)}${sw('x-pref', 'silent', 'Mode silencieux', 'Coupe tous les sons ; les signaux restent notés dans le carnet', p.silent)}</div>
      <label class="lbl-sm" for="x-vol">Volume</label><input type="range" id="x-vol" min="0" max="100" step="5" value="${Math.round(p.volume * 100)}" data-xvol="1">
      <h3>Ce que tu veux entendre</h3><div class="rows">${[['lieu', 'Lieux culturels', '75 m'], ['important', 'Lieux majeurs', '150 m'], ['secret', 'Secrets à photographier', '30 m et plus'], ['aventure', 'Donjons', '110 m'], ['quete', 'Quêtes commencées ou suivies', '75 m, puis 30 m'], ['jeu', 'Découvertes et récompenses', 'carte, artefact, secret révélé']].map(c =>
        `<div class="xcat">${sw('x-cat', c[0], c[1], c[2], p.cats[c[0]] !== false)}<button class="btn ghost" data-act="x-test" data-k="${c[0]}">Écouter</button></div>`).join('')}</div>
      <h3>Détection</h3><div class="seg">${[[0.7, 'Proche'], [1, 'Normale'], [1.4, 'Large']].map(s => `<button class="${p.sens === s[0] ? 'on' : ''}" data-act="x-sens" data-v="${s[0]}">${s[1]}</button>`).join('')}</div>
      <div class="rows">${sw('x-pref', 'found', 'Signaler aussi les lieux déjà trouvés', '', p.found)}</div>
      <p class="src">Au plus un signal toutes les ${Math.round(CFG.minGap / 1000)} secondes ; le plus intéressant passe d'abord ; un même lieu n'est pas rappelé avant ${Math.round(CFG.rehear / 3600e3)} heures.</p>`;
    h += '<div class="rows"><button class="row" data-act="diag-open"><span class="rt"><b>Diagnostic iPhone</b><small>Vérifier sur cet appareil : GPS, son, écran, appareil photo, stockage</small></span><span class="chev">›</span></button></div>';
    if (det.length) h += '<h3>Derniers signaux</h3><div class="rows">' + det.map(detRow).join('') + '</div>';
    return h;
  }
  function label(d) {
    const [k, ref] = [d.id[0], d.id.slice(2)];
    if (k === 'p') return Game.disc(ref) ? Data.P[ref].name : 'Un lieu, ' + Data.T[Data.P[ref].t].name;
    if (k === 'q') { const q = D.photoQuests.find(x => x.id === ref); return q ? (Photo.found(ref) ? q.title : 'Un secret, ' + Data.T[Data.P[q.at].t].name) : 'Un secret'; }
    const a = D.adventures.find(x => x.id === ref); return a ? a.title : 'Un donjon';
  }
  const detRow = d => `<button class="row" data-act="open-signal" data-id="${d.id}"><span class="sig k-${d.k}"></span><span class="rt"><b>${esc(label(d))}</b><small>${Sound.LABEL[d.k]} · ${new Date(d.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}${d.g ? ' · noté sans son' : ''}</small></span><span class="chev">›</span></button>`;
  function openSignal(id) {
    const k = id[0], ref = id.slice(2);
    if (k === 'Q') return UI.openQuest ? UI.openQuest(ref) : Views.actions['open-quest']({ id: ref });
    if (k === 'p') { UI.show('atlas'); UI.openPlace(ref); }
    else if (k === 'q') Photo.open(ref);
    else Views.actions['open-adv']({ id: ref });
  }

  const actions = {
    'x-open'() { UI.openSheet(sheetHTML); },
    'x-toggle'() { if (on) stop(); else start(); UI.draw(false); },
    'x-pref'(d) { const p = P(); p[d.k] = !p[d.k]; Game.save(); UI.draw(false); },
    'x-cat'(d) { const p = P(); p.cats[d.k] = p.cats[d.k] === false; Game.save(); UI.draw(false); },
    'x-sens'(d) { P().sens = +d.v; Game.save(); UI.draw(false); },
    'x-test'(d) { Sound.play(d.k === 'jeu' ? 'carte' : d.k, { test: true }); },
    'x-pocket'() { UI.closeSheet(); setPocket(true); },
    'open-signal'(d) { openSignal(d.id); }
  };
  function init() {
    Object.assign(Views.actions, actions); P().on = false; pill();
    setInterval(() => { if (AtlasMap.isFollowing() && (state === 'ok' || state === 'weak') && lastFix && Date.now() - lastFix.t > CFG.lostAfter) setState('lost'); }, 5000);
    document.addEventListener('input', e => { if (e.target.dataset.xvol) { P().volume = e.target.value / 100; } });
    document.addEventListener('change', e => { if (e.target.dataset.xvol) { Game.save(); Sound.play('lieu', { test: true }); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && on) lock(); });   // l'écran maintenu allumé se perd en arrière-plan
    const hold = $('#pocket-hold');
    if (hold) {
      const down = e => { e.preventDefault(); hold.classList.add('holding'); holdT = setTimeout(() => { hold.classList.remove('holding'); setPocket(false); }, 1200); };
      const up = () => { clearTimeout(holdT); hold.classList.remove('holding'); };
      hold.addEventListener('pointerdown', down); ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => hold.addEventListener(ev, up));
    }
  }
  return { register, targets, init, onFix, onGpsError, gpsChanged, refresh: pill, noteDiscovery, start, stop, cfg: CFG, sheetHTML, detRow, label,
    isOn: () => on, state: () => state, pocket: () => pocket, hasWake: () => !!wake,
    reset() { inside = {}; pending = {}; lastSignal = 0; last = null; } };
})();
