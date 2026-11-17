/* Sauvegarde locale (localStorage), export / import JSON, réinitialisation. */
const Store = (() => {
  const KEY = 'lostAtlas.save.v1';
  let available = true;
  const blank = () => ({
    v: 1, created: Date.now(),
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
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return merge(JSON.parse(raw)); }
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
    return merge(s);
  }
  return { blank, load, save, parse, isAvailable: () => available, stringify: s => JSON.stringify(s, null, 1) };
})();
