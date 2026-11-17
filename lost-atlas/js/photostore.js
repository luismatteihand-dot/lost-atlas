/* Stockage des photographies : IndexedDB (adapté aux données volumineuses), avec un cache en mémoire pour l'affichage.
   Au premier lancement, les photos des versions précédentes (clé localStorage « lostAtlas.photos.v1 ») sont migrées puis la clé est supprimée.
   Si IndexedDB est indisponible (navigation privée ancienne, cadre isolé), repli sur localStorage, puis sur la mémoire seule. */
const PhotoStore = (() => {
  const OLD = 'lostAtlas.photos.v1', DBN = 'lostAtlas', ST = 'photos';
  let db = null, cache = {}, backend = 'mémoire', ready = false;
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const store = mode => db.transaction(ST, mode).objectStore(ST);
  function open() {
    return new Promise((res, rej) => {
      let r; try { r = indexedDB.open(DBN, 1); } catch (e) { return rej(e); }
      r.onupgradeneeded = () => { r.result.createObjectStore(ST); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('bloqué'));
      setTimeout(() => rej(new Error('délai')), 4000);
    });
  }
  const lsSave = () => { try { localStorage.setItem(OLD, JSON.stringify(cache)); return true; } catch (e) { return false; } };
  async function init() {
    let old = null; try { old = JSON.parse(localStorage.getItem(OLD) || 'null'); } catch (e) { old = null; }
    try {
      db = await open(); backend = 'indexeddb';
      const keys = await req(store('readonly').getAllKeys()), vals = await req(store('readonly').getAll());
      keys.forEach((k, i) => { cache[k] = vals[i]; });
      if (old) {                                             // migration des anciennes versions
        for (const id in old) if (!cache[id]) { cache[id] = old[id]; await req(store('readwrite').put(old[id], id)); }
        try { localStorage.removeItem(OLD); } catch (e) { /* ignore */ }
      }
    } catch (e) { db = null; cache = old || {}; backend = old !== null || lsSave() ? 'localstorage' : 'mémoire'; }
    ready = true; return backend;
  }
  function fail(id) { delete cache[id]; if (typeof UI !== 'undefined') UI.toast('La photo n\'a pas pu être enregistrée : mémoire pleine ou stockage refusé.'); }
  function put(id, data) {
    cache[id] = data;
    if (db) { req(store('readwrite').put(data, id)).catch(() => fail(id)); return true; }
    if (backend === 'localstorage' && !lsSave()) { fail(id); return false; }
    return true;
  }
  function del(id) { if (!(id in cache)) return; delete cache[id]; if (db) req(store('readwrite').delete(id)).catch(() => {}); else if (backend === 'localstorage') lsSave(); }
  function clear() { cache = {}; if (db) req(store('readwrite').clear()).catch(() => {}); try { localStorage.removeItem(OLD); } catch (e) { /* ignore */ } }
  const dup = data => Object.keys(cache).find(id => cache[id] === data) || null;       // même image déjà gardée
  async function estimate() {
    const o = { count: Object.keys(cache).length, bytes: Object.values(cache).reduce((a, v) => a + v.length, 0), backend, usage: null, quota: null, persisted: null };
    try { if (navigator.storage && navigator.storage.estimate) { const e = await navigator.storage.estimate(); o.usage = e.usage; o.quota = e.quota; } } catch (e) { /* non disponible */ }
    try { if (navigator.storage && navigator.storage.persisted) o.persisted = await navigator.storage.persisted(); } catch (e) { /* non disponible */ }
    return o;
  }
  async function persist() { try { return !!(navigator.storage && navigator.storage.persist && await navigator.storage.persist()); } catch (e) { return false; } }
  async function restore(obj) { for (const id in obj) if (typeof obj[id] === 'string' && obj[id].startsWith('data:image')) { cache[id] = obj[id]; if (db) await req(store('readwrite').put(obj[id], id)); } if (!db && backend === 'localstorage') lsSave(); }
  return { init, put, del, clear, dup, estimate, persist, restore, get: id => cache[id] || null, cache: () => cache, backend: () => backend, isReady: () => ready };
})();
