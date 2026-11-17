/* Règles du jeu : statuts des lieux, épreuves, XP, déblocages, quêtes, chaînes, journal. */
const Game = (() => {
  let S = null; const events = [];
  const now = () => Date.now();
  const X = () => Data.prog.xp;
  const EMPTY = Object.freeze({});
  const ref = id => Data.P[id].ref;
  const pget = id => S.places[ref(id)] || EMPTY;
  const pmut = id => S.places[ref(id)] || (S.places[ref(id)] = {});
  const save = () => Store.save(S);

  function init() { S = Store.load(); evaluate(); save(); events.length = 0; }
  function log(k, r, txt, xp) { S.journal.push({ t: now(), k, r, txt, xp: xp || 0 }); if (S.journal.length > 500) S.journal.splice(0, S.journal.length - 500); }

  /* ---- XP et niveaux ---- */
  const totalXP = () => Object.values(S.xp).reduce((a, b) => a + b, 0);
  const lvlOf = (xp, table) => { let l = 1; for (let i = 1; i < table.length; i++) if (xp >= table[i]) l = i + 1; return l; };
  const level = () => lvlOf(totalXP(), Data.prog.levels);
  function levelInfo(xp, table) {
    const l = lvlOf(xp, table), lo = table[l - 1], hi = table[l] === undefined ? null : table[l];
    return { level: l, lo, hi, pct: hi === null ? 100 : Math.round(100 * (xp - lo) / (hi - lo)) };
  }
  function addXP(skill, n) { if (!n) return; S.xp[skill] = (S.xp[skill] || 0) + n; }

  /* ---- Lieux ---- */
  const chDone = key => !!(S.ch[key] && S.ch[key].done);
  function challengesOf(id) { const f = Data.P[ref(id)].fiche || {}; return ['observe', 'enigma'].filter(k => f[k]); }
  const chKey = (id, k) => 'p:' + ref(id) + ':' + k;
  function isMastered(id) { const cs = challengesOf(id); return cs.length > 0 && cs.every(k => chDone(chKey(id, k))); }
  function status(id) { const p = pget(id); if (!p.d) return p.s ? 'spotted' : 'unknown'; return isMastered(id) ? 'mastered' : 'discovered'; }
  const disc = id => !!(Data.P[id] && pget(id).d);
  function pos(id) {
    const p = Data.P[id]; if (p.pos) return { ll: p.pos, q: p.q, src: p.src };
    const u = pget(id).pos; return u ? { ll: [u[0], u[1]], q: 'u', src: u[2] === 'gps' ? 'placé par toi (GPS)' : 'placé par toi sur la carte' } : null;
  }
  function spot(id, on) { const st = pmut(id); if (st.d) return; if (on === false) delete st.s; else if (!st.s) st.s = now(); save(); }
  function discover(id, how) {
    const pl = Data.P[id], st = pmut(id); if (st.d) return false;
    st.d = now(); st.how = how; if (!st.s) st.s = st.d;
    const xp = pl.kind === 'culture' ? X().discoverCulture : X().discoverOther;
    addXP('exploration', xp);
    log('discover', pl.id, pl.name + (how === 'gps' ? ' — validé par GPS' : ' — validation manuelle'), xp);
    events.push({ type: 'discover', id: pl.id, xp });
    evaluate(); save(); return true;
  }
  function chart(id, lat, lng, mode) {
    const st = pmut(id), first = !st.pos; st.pos = [+lat.toFixed(6), +lng.toFixed(6), mode];
    if (first) { addXP('exploration', X().chart); log('chart', id, 'Lieu cartographié : ' + Data.P[id].name, X().chart); events.push({ type: 'chart', id, xp: X().chart }); }
    evaluate(); save();
  }
  function setNote(id, txt) { const st = pmut(id); if (txt && txt.trim()) st.note = txt; else delete st.note; evaluate(); save(); }

  /* ---- Épreuves ---- */
  const chState = key => S.ch[key] || EMPTY;
  const chMut = (key, k) => S.ch[key] || (S.ch[key] = { k, hints: 0, tries: 0 });
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  function finish(key, skill, xp, label) {
    const c = S.ch[key]; c.done = now(); addXP(skill, xp);
    log(c.k, key, label, xp); events.push({ type: 'challenge', key, xp, skill });
    evaluate(); save();
  }
  function observeDone(key, ch, skill, hyp, self, label) {
    if (chDone(key)) return; const c = chMut(key, 'observe'); c.hyp = (hyp || '').trim(); c.self = self;
    finish(key, skill, X().observe + (c.hyp.length >= 12 ? X().hypothesis : 0), 'Observation : ' + label);
  }
  function enigmaTry(key, ch, skill, input, label) {
    if (chDone(key)) return true; const c = chMut(key, 'enigma'); c.tries++;
    const n = norm(input); if (!n) { save(); return false; }
    const ok = ch.a.some(a => { const na = norm(a); return n === na || (na.length >= 4 && (' ' + n + ' ').includes(' ' + na + ' ')); });
    if (ok) finish(key, skill, Math.round(X().enigma * Math.max(0.4, 1 - c.hints * X().hintPenalty)), 'Énigme résolue : ' + label);
    else save();
    return ok;
  }
  function enigmaHint(key) { const c = chMut(key, 'enigma'); if (c.hints < 3) c.hints++; save(); return c.hints; }
  function enigmaReveal(key, skill, label) { if (chDone(key)) return; const c = chMut(key, 'enigma'); c.revealed = true; finish(key, skill, X().enigmaRevealed, 'Énigme (réponse dévoilée) : ' + label); }
  function classifyCheck(key, ch, skill, picks, label) {
    const c = chMut(key, 'classify'); c.tries++;
    const res = ch.items.map((it, i) => picks[i] === it.k);
    if (res.every(Boolean)) finish(key, skill, Math.max(20, X().classify - 10 * (c.tries - 1)), 'Classement réussi : ' + label); else save();
    return res;
  }
  function confirmDone(key, label) { if (chDone(key)) return; chMut(key, 'confirm'); finish(key, 'exploration', X().confirm, label); }

  /* ---- Conditions de déblocage ---- */
  function count(what, o) {
    o = o || {};
    if (what === 'discovered' || what === 'mastered') {
      const seen = new Set();
      for (const p of Data.places) {
        if (o.territory && p.t !== o.territory) continue;
        if (o.kind && p.kind !== o.kind) continue;
        const st = status(p.id);
        if (what === 'discovered' ? (st === 'discovered' || st === 'mastered') : st === 'mastered') seen.add(p.ref);
      }
      return seen.size;
    }
    const chs = Object.values(S.ch).filter(c => c.done);
    if (what === 'observed') return chs.filter(c => c.k === 'observe').length;
    if (what === 'enigmas') return chs.filter(c => c.k === 'enigma' && !c.revealed).length;
    if (what === 'nohint') return chs.filter(c => c.k === 'enigma' && !c.revealed && !c.hints).length;
    if (what === 'quests') return Object.values(S.quests).filter(q => q.done).length;
    if (what === 'chains') return Object.values(S.chains).filter(c => c.done).length;
    if (what === 'codex') return Object.keys(S.codex).length;
    if (what === 'codexMastered') return Object.values(S.codex).filter(c => c.m).length;
    if (what === 'notes') return Object.values(S.places).filter(p => p.note).length;
    if (what === 'pins') return S.pins.length;
    if (what === 'charted') return Object.values(S.places).filter(p => p.pos).length;
    if (what === 'territories') return Data.territories.filter(t => count('discovered', { territory: t.id }) > 0).length;
    return 0;
  }
  function cond(c) {
    if (!c) return false;
    if (c.start) return true;
    if (c.all) return c.all.every(cond);
    if (c.any) return c.any.some(cond);
    if (c.place) return disc(c.place);
    if (c.mastered) return !!Data.P[c.mastered] && status(c.mastered) === 'mastered';
    if (c.quest) return !!(S.quests[c.quest] && S.quests[c.quest].done);
    if (c.chain) return !!(S.chains[c.chain] && S.chains[c.chain].done);
    if (c.codex) return !!S.codex[c.codex];
    if (c.count) return count(c.count, c) >= c.min;
    return false;
  }

  /* ---- Quêtes ---- */
  function stepDone(q, i) {
    const s = q.steps[i];
    if (s.type === 'visit') return disc(s.place);
    if (s.type === 'anyvisit') return s.places.some(disc);
    if (s.type === 'place-observe') return chDone(chKey(s.place, 'observe'));
    if (s.type === 'place-enigma') return chDone(chKey(s.place, 'enigma'));
    if (extSteps[s.type]) return !!extSteps[s.type](s, q);      // types d'étapes ajoutés par d'autres modules (photo, garder, écho, collection)
    return chDone('q:' + q.id + ':' + i);
  }
  const extSteps = {};
  const questProgress = q => q.steps.filter((s, i) => stepDone(q, i)).length;
  function questStatus(q) {
    if (S.quests[q.id] && S.quests[q.id].done) return 'done';
    if (q.requires && !cond(q.requires)) return 'locked';
    return questProgress(q) > 0 || q.steps.some(s => s.type === 'collect' && s.places.some(disc)) ? 'active' : 'open';   // une collection entamée est une quête en cours
  }
  function questHint(id) { const st = S.quests[id] || (S.quests[id] = {}); st.hints = Math.min(3, (st.hints || 0) + 1); save(); return st.hints; }

  /* ---- Codex et chaînes ---- */
  const codexState = id => { const c = S.codex[id]; return !c ? 'locked' : c.m ? 'mastered' : c.r ? 'read' : 'new'; };
  function readCodex(id) { const c = S.codex[id]; if (c && !c.r) { c.r = now(); evaluate(); save(); } }
  const chainReady = ch => ch.nodes.every(n => S.codex[n]);
  const chainDone = id => !!(S.chains[id] && S.chains[id].done);
  function chainTry(id, order) {
    const ch = Data.CH[id], st = S.chains[id] || (S.chains[id] = { tries: 0 }); st.tries++;
    const good = order.filter((v, i) => v === i).length;
    if (good === ch.order.length && order.length === ch.order.length) {
      st.done = now(); addXP(ch.skill, X().chain);
      log('chain', id, 'Synthèse révélée : ' + ch.title, X().chain); events.push({ type: 'chain', id, xp: X().chain });
      evaluate();
    }
    save(); return good;
  }

  /* ---- Évaluation générale : tout ce qui se débloque par conséquence ---- */
  function evaluate() {
    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      for (const e of Data.entries) {
        const c = S.codex[e.id];
        if (!c) {
          if (cond(e.unlock)) {
            S.codex[e.id] = { u: now() }; const sk = Data.CATS[e.cat].skill; const xp = e.unlock.start ? 0 : X().codex;
            addXP(sk, xp); if (!e.unlock.start) { log('codex', e.id, 'Savoir révélé : ' + e.title, xp); events.push({ type: 'codex', id: e.id, xp }); }
            changed = true;
          }
        } else if (!c.m && c.r && (e.links || []).every(l => S.codex[l])) {
          c.m = now(); addXP(Data.CATS[e.cat].skill, X().codexMaster);
          log('master', e.id, 'Savoir maîtrisé : ' + e.title, X().codexMaster); events.push({ type: 'master', id: e.id, xp: X().codexMaster }); changed = true;
        }
      }
      for (const q of Data.quests) {
        if (questStatus(q) !== 'done' && !(q.requires && !cond(q.requires)) && questProgress(q) === q.steps.length) {
          const st = S.quests[q.id] || (S.quests[q.id] = {}); st.done = now(); let sum = 0;
          for (const k in q.reward.xp) { addXP(k, q.reward.xp[k]); sum += q.reward.xp[k]; }
          log('quest', q.id, 'Quête accomplie : ' + q.title, sum); events.push({ type: 'quest', id: q.id, xp: sum }); changed = true;
        }
      }
      for (const a of Data.artifacts) if (!S.artifacts[a.id] && cond(a.unlock)) { S.artifacts[a.id] = now(); log('artifact', a.id, 'Artefact obtenu : ' + a.name); events.push({ type: 'artifact', id: a.id }); changed = true; }
      for (const b of Data.prog.badges) if (!S.badges[b.id] && cond(b.unlock)) { S.badges[b.id] = now(); log('badge', b.id, 'Insigne : ' + b.name); events.push({ type: 'badge', id: b.id }); changed = true; }
      for (const t of Data.prog.titles) if (!S.titles[t.id] && cond(t.unlock)) { S.titles[t.id] = now(); if (!S.title) S.title = t.id; log('title', t.id, 'Titre obtenu : ' + t.name); events.push({ type: 'title', id: t.id }); changed = true; }
      if (!changed) break;
    }
    const l = level(); if (l > (S.lvl || 1)) { S.lvl = l; log('level', l, 'Niveau ' + l + ' : ' + Data.prog.ranks[l - 1]); events.push({ type: 'level', level: l }); }
  }

  /* ---- Marqueurs personnels ---- */
  function addPin(lat, lng, icon, label) { const p = { id: 'pin' + now(), lat: +lat.toFixed(6), lng: +lng.toFixed(6), icon, label: label || '', at: now() }; S.pins.push(p); evaluate(); save(); return p; }
  function updatePin(id, patch) { const p = S.pins.find(x => x.id === id); if (p) Object.assign(p, patch); save(); }
  function removePin(id) { S.pins = S.pins.filter(x => x.id !== id); save(); }

  /* ---- Proximité GPS ---- */
  const R = 6371000, rad = d => d * Math.PI / 180;
  function dist(a, b) { const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
  const radius = q => q === 'v' ? 45 : 70;
  /* manual = true : être sur place ne découvre rien tout seul ; le lieu est renvoyé dans `here` et c'est le joueur qui le révèle. */
  function proximity(fix, manual) {   // fix : { ll, acc }
    const out = { discovered: [], spotted: [], nearest: null, here: [] };
    for (const p of Data.places) {
      if (p.ref !== p.id || p.kind !== 'culture') continue;
      const po = pos(p.id); if (!po) continue;
      const d = dist(fix.ll, po.ll), st = status(p.id);
      if (st === 'unknown' || st === 'spotted') {
        if (!out.nearest || d < out.nearest.d) out.nearest = { id: p.id, d };
        if (fix.acc <= 60 && d <= radius(po.q)) { if (manual) out.here.push({ id: p.id, d }); else if (discover(p.id, 'gps')) out.discovered.push(p.id); }
        else if (d <= 160 && st === 'unknown') { pmut(p.id).s = now(); out.spotted.push(p.id); events.push({ type: 'spot', id: p.id }); }
      }
    }
    if (out.spotted.length) save();
    return out;
  }

  return {
    init, save, get S() { return S; }, takeEvents: () => events.splice(0),
    totalXP, level, levelInfo, status, disc, pos, spot, discover, chart, setNote, pget, challengesOf, chKey, isMastered,
    extSteps, check() { evaluate(); save(); },
    chState, chDone, observeDone, enigmaTry, enigmaHint, enigmaReveal, classifyCheck, confirmDone,
    cond, count, stepDone, questProgress, questStatus, questHint,
    codexState, readCodex, chainReady, chainDone, chainTry,
    addPin, updatePin, removePin, dist, radius, proximity,
    setTitle(id) { S.title = id; save(); },
    importSave(text) { S = Store.parse(text); evaluate(); save(); events.length = 0; },
    reset() { S = Store.blank(); evaluate(); save(); events.length = 0; }
  };
})();
