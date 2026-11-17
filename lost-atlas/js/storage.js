/* Sauvegarde locale (localStorage), export / import JSON, réinitialisation. */
const Store = (() => {
  const KEY = 'lostAtlas.save.v1';   // la clé ne change jamais : c'est le champ `v` qui porte la version du format
  const CURRENT = 2;
  /* Migrations, dans l'ordre. Chacune reçoit la sauvegarde au format précédent et la met au suivant.
     Avant toute migration, la sauvegarde d'origine est copiée sous lostAtlas.save.v1.avant-v<N> (une seule fois). */
  const MIGRATIONS = {
    2: s => {   // v6 : l'état « v3 » (héros, cartes, tracé…) devient garanti ; rien n'est retiré ni renommé
      s.v3 = s.v3 || {}; s.v3.trail = s.v3.trail || []; s.v3.walked = s.v3.walked || {};
      return s;
    }
  };
  let available = true;
  const blank = () => ({
    v: 2, created: Date.now(),
    xp: { exploration: 0, histoire: 0, architecture: 0, culture: 0 },
    places: {},   // id -> { s: repéré, d: découvert, how, pos:[lat,lng,mode], note }
    ch: {},       // clé d'épreuve -> { k, done, hints, tries, revealed, hyp, self }
    codex: {},    // id -> { u: révélé, r: lu, m: maîtrisé }
    quests: {}, chains: {}, artifacts: {}, badges: {}, titles: {},
    title: null, lvl: 1, pins: [], journal: [],
    settings: { chime: true, mapStyle: 'atlas', intro: false, territory: 't1',
      layers: { culture: true, pratique: false, pins: true, zones: true, cats: { act: true, loger: true, manger: true, verre: true, shop: true } } }
  });
  function merge(s) {
    const b = blank();
    for (const k in b) if (s[k] === undefined) s[k] = b[k];
    s.settings = Object.assign(b.settings, s.settings || {});
    s.settings.layers = Object.assign(blank().settings.layers, s.settings.layers || {});
    s.xp = Object.assign(b.xp, s.xp || {});
    return s;
  }
  function migrate(s, raw) {
    const from = s.v || 1;
    if (from < CURRENT && raw) { try { const bk = KEY + '.avant-v' + CURRENT; if (!localStorage.getItem(bk)) localStorage.setItem(bk, raw); } catch (e) { /* stockage plein : on migre quand même, sans perte */ } }
    for (let n = from + 1; n <= CURRENT; n++) if (MIGRATIONS[n]) s = MIGRATIONS[n](s) || s;
    s.v = Math.max(from, CURRENT); return s;
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return migrate(merge(JSON.parse(raw)), raw); }
    catch (e) { available = false; }
    return blank();
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); available = true; }
    catch (e) { available = false; }
    return available;
  }
  function parse(text) {
    const s = JSON.parse(text);
    if (!s || typeof s !== 'object' || !s.xp || !s.places) throw new Error('format');
    return migrate(merge(s), text);
  }
  return { CURRENT, migrate, blank, load, save, parse, isAvailable: () => available, stringify: s => JSON.stringify(s, null, 1) };
})();
