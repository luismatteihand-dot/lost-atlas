/* Carte : Leaflet + OpenStreetMap si le réseau est là, carte de repérage sur parchemin sinon. GPS facultatif. */
const AtlasMap = (() => {
  const CENTER = [31.6268, -7.9890], OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  let map, tiles, base, zoneLayer, placeLayer, pinLayer, meDot, meRing;
  let loads = 0, errs = 0, noTiles = false, watchId = null, following = false, auto = false, wantFollow = false, lastFix = null, firstFix = false, pickCb = null;
  const markers = {};
  const el = id => document.getElementById(id);

  function init() {
    map = L.map('map', { zoomControl: false, minZoom: 12, maxZoom: 19, zoomSnap: 0.5, attributionControl: true }).setView(CENTER, 15);
    map.attributionControl.setPrefix(false);
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    tiles = L.tileLayer(OSM, { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' });
    tiles.on('tileload', () => { loads++; if (noTiles) setNoTiles(false); });
    tiles.on('tileerror', () => { errs++; if (!loads && errs >= 3) setNoTiles(true); });
    map.createPane('basemap').style.zIndex = 250;
    if (Basemap.load()) { base = Basemap.layer().addTo(map); map.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'); }
    el('map').classList.toggle('has-base', !!base);
    window.addEventListener('online', () => { errs = 0; tiles.redraw(); });
    window.addEventListener('offline', () => { if (!loads && map.hasLayer(tiles)) setNoTiles(true); });
    zoneLayer = L.layerGroup().addTo(map); placeLayer = L.layerGroup().addTo(map); pinLayer = L.layerGroup().addTo(map);
    map.on('zoomend', labels);
    map.on('dragstart', () => { if (following && auto) { auto = false; UI.gpsState(true); } });   // le joueur reprend la main : plus de recentrage automatique
    document.addEventListener('visibilitychange', () => {       // économie de batterie : pas de GPS écran éteint
      if (document.hidden) { if (following) { stopWatch(); wantFollow = true; } }
      else if (wantFollow) { wantFollow = false; follow(true); }
    });
    applyStyle(); refresh(); labels();
  }
  function setNoTiles(v) { noTiles = v; el('map').classList.toggle('no-tiles', v); el('offline-note').hidden = !(v && map.hasLayer(tiles)); labels(); }
  function applyStyle() {            // « atlas » : carte dessinée embarquée ; « net » : tuiles OpenStreetMap en ligne
    const net = Game.S.settings.mapStyle === 'net' || !base;
    el('map').classList.toggle('style-net', net);
    if (net && !map.hasLayer(tiles)) { loads = 0; errs = 0; tiles.addTo(map); if (navigator.onLine === false) setNoTiles(true); }
    if (!net && map.hasLayer(tiles)) { map.removeLayer(tiles); setNoTiles(false); }
  }
  function labels() { el('map').classList.toggle('show-labels', map.getZoom() >= 17); }

  function icon(p) {
    const st = Game.status(p.id), po = Game.pos(p.id);
    const label = p.num;
    return L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      html: `<div class="mk ${p.kind === 'culture' ? 'mk-c' : 'mk-p'} st-${st} q-${po.q}${p.num > 99 ? ' n3' : ''}"><b>${label}</b></div>` });
  }
  /* La carte n'est reconstruite que si son état a changé : statut des lieux, calques, marqueurs, brume.
     Avant, chaque geste reconstruisait ~190 marqueurs et leurs étiquettes ; sur iPhone, c'était le poste le plus coûteux. */
  let lastSig = '', rebuilds = 0;
  function signature() {
    const lay = Game.S.settings.layers, v = typeof V3 !== 'undefined' ? V3.st() : {};
    let s = JSON.stringify(lay) + '|' + Game.S.pins.map(p => p.id + p.icon + p.label).join(',') + '|' + ((v.kept || []).length) + '|';
    for (const p of Data.places) { const st = Game.status(p.id); s += st[0] + st[1] + (Game.pos(p.id) ? '1' : '0'); }
    if (typeof Trace !== 'undefined') s += '|' + Data.territories.map(t => Trace.known(t.id) ? 1 : 0).join('');
    return s;
  }
  function refresh(force) {
    if (!map) return;
    if (typeof Trace !== 'undefined') Trace.draw();
    const sig = signature(); if (!force && sig === lastSig) return; lastSig = sig; rebuilds++;
    const lay = Game.S.settings.layers;
    zoneLayer.clearLayers(); placeLayer.clearLayers(); pinLayer.clearLayers();
    if (lay.zones) for (const t of Data.territories) {
      const fog = typeof Trace !== 'undefined' && !Trace.known(t.id);   // terra incognita : jamais foulé, rien trouvé
      L.polygon(t.polygon, fog ? { color: t.color, weight: 1.4, dashArray: '2 6', fillColor: '#5F5647', fillOpacity: 0.3, interactive: false, className: 'fog' }
        : { color: t.color, weight: 1.6, dashArray: '3 7', fillColor: t.color, fillOpacity: 0.07, interactive: false }).addTo(zoneLayer);
      L.marker(t.center, { interactive: true, keyboard: false, zIndexOffset: -500,
        icon: L.divIcon({ className: '', iconSize: [140, 34], iconAnchor: [70, 52], html: `<div class="zone-lbl${fog ? ' fog' : ''}" style="color:${t.color}">${t.num} · ${t.name}${fog ? '<small>terra incognita</small>' : ''}</div>` }) })
        .on('click', () => UI.openTerritory(t.id)).addTo(zoneLayer);
    }
    for (const p of Data.places) {
      if (p.ref !== p.id) continue;
      const po = Game.pos(p.id); if (!po) continue;
      if (p.kind === 'culture' ? !lay.culture : (!lay.pratique || (lay.cats && lay.cats[p.cat] === false))) continue;
      if (lay.terr && p.t !== lay.terr) continue;   // filtre par territoire
      const m = L.marker(po.ll, { icon: icon(p), title: p.num + ' · ' + p.name, zIndexOffset: p.kind === 'culture' ? 200 : 0 }).on('click', () => UI.openPlace(p.id));
      // lieu muet : tant qu'il n'est ni repéré ni découvert, la carte ne dit pas son nom
      if (p.kind === 'culture' && Game.status(p.id) !== 'unknown') m.bindTooltip(p.name, { permanent: true, direction: 'bottom', offset: [0, 15], className: 'lbl' });
      m.addTo(placeLayer); markers[p.id] = m;
    }
    if (lay.pins) for (const pin of Game.S.pins) {
      L.marker([pin.lat, pin.lng], { zIndexOffset: 400, icon: L.divIcon({ className: '', iconSize: [34, 40], iconAnchor: [17, 38], html: `<div class="pin"><b>${pin.icon}</b></div>` }) })
        .on('click', () => UI.openPin(pin.id)).addTo(pinLayer);
    }
    if (lay.pins && typeof V3 !== 'undefined') V3.drawKept(pinLayer);
    if (typeof Quotidien !== 'undefined') Quotidien.draw();
  }

  /* ---- GPS ---- */
  const hasGeo = () => 'geolocation' in navigator;
  function drawMe(fix) {
    if (!meDot) {
      meRing = L.circle(fix.ll, { radius: fix.acc, color: '#2F6FDE', weight: 1, fillColor: '#2F6FDE', fillOpacity: 0.13, interactive: false }).addTo(map);
      meDot = L.marker(fix.ll, { interactive: false, zIndexOffset: 900, icon: L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="me"></div>' }) }).addTo(map);
    } else { meDot.setLatLng(fix.ll); meRing.setLatLng(fix.ll).setRadius(fix.acc); }
    const d = meDot.getElement() && meDot.getElement().firstChild; if (d) { d.classList.remove('tick'); void d.offsetWidth; d.classList.add('tick'); }
  }
  /* Position aberrante : un saut plus rapide qu'un véhicule en ville, sur quelques secondes. On l'ignore, trois fois au plus de suite. */
  let rejects = 0, rejected = 0, filterOn = true;
  function aberrant(ll, acc, t) {
    if (!lastFix || lastFix.far) return false;
    const dt = (t - lastFix.t) / 1000, d = Game.dist(ll, lastFix.ll);
    if (dt <= 0 || dt > 20 || d < Math.max(80, acc + lastFix.acc)) return false;
    return d / dt > 15;
  }
  function onFix(pos) {
    { const ll = [pos.coords.latitude, pos.coords.longitude], acc = Math.round(pos.coords.accuracy || 999);
      if (filterOn && !pos.sim && aberrant(ll, acc, Date.now()) && rejects < 3) { rejects++; rejected++; return lastFix; } rejects = 0; }
    lastFix = { ll: [pos.coords.latitude, pos.coords.longitude], acc: Math.round(pos.coords.accuracy || 999), t: Date.now() };
    lastFix.far = Game.dist(lastFix.ll, CENTER) > 40000;
    drawMe(lastFix);
    if (firstFix) { firstFix = false; if (!lastFix.far) map.setView(lastFix.ll, Math.max(map.getZoom(), 17)); }
    else if (auto && !lastFix.far && !pickCb) map.panTo(lastFix.ll, { animate: true, duration: 0.6 });   // suivi automatique
    UI.onFix(lastFix);
    return lastFix;
  }
  function onErr(err) { if (!err || err.code === 1 || err.code === 0 || err.code === -1) stopWatch(); UI.onGpsError(err); }   // délai dépassé ou position indisponible : le suivi continue et réessaie seul
  function clearMe() { if (meDot) { map.removeLayer(meDot); map.removeLayer(meRing); meDot = meRing = null; } }   // jamais de position périmée à l'écran
  function stopWatch() { if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; } following = false; if (!document.hidden) clearMe(); UI.gpsState(false); }
  function follow(on) {
    if (!on) { wantFollow = false; return stopWatch(); }
    if (window.isSecureContext === false) return UI.onGpsError({ code: -1 });
    if (!hasGeo() || !navigator.geolocation) return UI.onGpsError({ code: 0 });
    stopWatch(); firstFix = true; following = true; auto = true; UI.gpsState(true);
    try { watchId = navigator.geolocation.watchPosition(onFix, onErr, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); }
    catch (e) { onErr({ code: 0 }); }
  }
  function locateOnce() {
    return new Promise((res, rej) => {
      if (!hasGeo()) return rej({ code: 0 });
      try { navigator.geolocation.getCurrentPosition(p => res(onFix(p)), rej, { enableHighAccuracy: true, maximumAge: 10000, timeout: 9000 }); }
      catch (e) { rej({ code: 0 }); }
    });
  }

  /* ---- Mode « viser un point » (marqueurs personnels, cartographie d'un lieu) ---- */
  function startPick(label, cb) { pickCb = cb; el('pick-label').textContent = label; el('pick').hidden = false; el('v-atlas').classList.add('picking'); }
  function endPick(ok) { const cb = pickCb; pickCb = null; el('pick').hidden = true; el('v-atlas').classList.remove('picking'); if (ok && cb) { const c = map.getCenter(); cb(c.lat, c.lng); } }

  return {
    init, refresh, applyStyle, follow, locateOnce, startPick, endPick,
    simulate: (lat, lng, acc, raw) => onFix({ sim: !raw, coords: { latitude: lat, longitude: lng, accuracy: acc } }),   // raw : passe aussi par le filtre des positions aberrantes
    rejected: () => rejected, filter: on => { filterOn = !!on; },   // tests et démonstration : injecte une position
    isFollowing: () => following, isAuto: () => following && auto, lastFixAt: () => (lastFix ? lastFix.t : 0),
    recenter() { auto = true; if (lastFix && Date.now() - lastFix.t < 90000 && !lastFix.far) map.setView(lastFix.ll, Math.max(map.getZoom(), 17), { animate: true }); UI.gpsState(true); }, fix: () => (lastFix && Date.now() - lastFix.t < 90000 ? lastFix : null),
    resize: () => map && map.invalidateSize(),
    flyTo(ll, z) { map.setView(ll, z || Math.max(map.getZoom(), 17), { animate: true }); },
    showTerritory(t) { map.fitBounds(L.latLngBounds(t.polygon), { padding: [20, 20] }); },
    leaflet: () => map, rebuilds: () => rebuilds,
    fitTo(pts) { if (pts.length === 1) map.setView(pts[0], 18); else map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 18 }); auto = false; },
    center: () => map.getCenter(), noTiles: () => noTiles, hasBase: () => !!base, zoom: () => map.getZoom(), setZoom: z => map.setZoom(z, { animate: false })
  };
})();
