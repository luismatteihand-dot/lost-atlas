/* Hors ligne : l'application et ses contenus sont mis en cache ; les tuiles OpenStreetMap déjà vues aussi. */
const VERSION = 'lost-atlas-v6-0';
const SHELL = ['./', 'index.html', 'manifest.json', 'css/style.css', 'css/v3.css', 'css/v5.css', 'vendor/leaflet.css', 'vendor/leaflet.js',
  'js/art.js', 'js/storage.js', 'js/data.js', 'js/game.js', 'js/basemap.js', 'js/map.js', 'js/ui.js', 'js/views.js', 'js/v3.js', 'js/sound.js', 'js/explore.js', 'js/photo.js', 'js/photostore.js', 'js/diag.js', 'js/trace.js', 'js/quotidien.js', 'js/immersion.js', 'js/session.js', 'data/quotidien.js', 'js/app.js',
  'data/bundle.js', 'data/basemap.js', 'data/v3.js', 'data/territories.json', 'data/places.json', 'data/fiches.json', 'data/codex.json', 'data/quests.json', 'data/artifacts.json', 'data/progression.json',
  'assets/icon-180.png', 'assets/icon-192.png', 'assets/icon-512.png'];
const TILES = 'lost-atlas-tiles', MAX_TILES = 800;

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(cache) { const keys = await cache.keys(); if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => cache.delete(k))); }
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.hostname === 'tile.openstreetmap.org') {            // tuiles : cache d'abord
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(e.request); if (hit) return hit;
      const res = await fetch(e.request); if (res.ok || res.type === 'opaque') { c.put(e.request, res.clone()); trim(c); } return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(                                               // application : réseau d'abord, cache en secours
    fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
