/* Trace — la carte se dessine en marchant.
   - Le tracé : là où tu es vraiment passé, relevé par le GPS (point tous les 20 m, précision ≤ 35 m), dessiné à l'encre.
   - La brume : un territoire où tu n'as jamais posé le pied ni rien trouvé reste « terra incognita » sur la carte.
   - La piste : après une découverte, une direction (jamais une destination) vers la page blanche la plus proche.
   Coût : un point stocké tous les 20 m (≈ 50 octets) ; 6 000 points au plus ; dessin sur canvas, redessiné seulement quand il change.
   Aucune position n'est jamais inventée : sans GPS précis, rien n'est tracé. */
const Trace = (() => {
  const MIN_STEP = 20, MAX_ACC = 35, MAX_PTS = 6000, GAP_MIN = 10, GAP_M = 150;
  const st = () => { const v = V3.st(); v.trail = v.trail || []; v.walked = v.walked || {}; return v; };
  let layer = null, drawn = -1, leadLayer = null, lead = null;

  function inside(ll, poly) {
    const x = ll[1], y = ll[0]; let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][1], yi = poly[i][0], xj = poly[j][1], yj = poly[j][0];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi) c = !c;
    }
    return c;
  }
  const terrAt = ll => { for (const t of Data.territories) if (inside(ll, t.polygon)) return t.id; return null; };

  /* ---------- relevé ---------- */
  function record(fix) {
    if (!fix || fix.far || fix.acc > MAX_ACC) return false;
    const s = st(), last = s.trail[s.trail.length - 1], ll = [+fix.ll[0].toFixed(5), +fix.ll[1].toFixed(5)];
    if (last && Game.dist([last[0], last[1]], ll) < MIN_STEP) return false;
    s.trail.push([ll[0], ll[1], Math.round(Date.now() / 60000)]);
    if (s.trail.length > MAX_PTS) s.trail.splice(0, s.trail.length - MAX_PTS);
    const tid = terrAt(ll);
    if (tid && !s.walked[tid]) {
      s.walked[tid] = Date.now(); const t = Data.T[tid];
      Game.S.journal.push({ t: Date.now(), k: 'terr', r: tid, txt: 'Premier pas en ' + t.name, xp: 0 });
      UI.toast(`Premier pas en <b>${UI.esc(t.name)}</b>. La brume se lève sur le territoire ${t.num}.`, 'territory');
      AtlasMap.refresh();   // pas de son : les sons restent réservés aux signaux de proximité
    }
    Game.save(); draw(); return true;
  }

  /* ---------- dessin ---------- */
  function segments(trail) {
    const out = []; let cur = [];
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], q = trail[i - 1];
      if (q && (p[2] - q[2] > GAP_MIN || Game.dist([q[0], q[1]], [p[0], p[1]]) > GAP_M)) { if (cur.length > 1) out.push(cur); cur = []; }
      cur.push([p[0], p[1]]);
    }
    if (cur.length > 1) out.push(cur);
    return out;
  }
  function draw(force) {
    const map = AtlasMap.leaflet && AtlasMap.leaflet(); if (!map) return;
    const on = Game.S.settings.layers.trail !== false, n = on ? st().trail.length : 0;
    if (!force && n === drawn) return;
    drawn = n;
    if (!layer) layer = L.layerGroup().addTo(map);
    layer.clearLayers(); if (!on) return;
    const r = L.canvas({ padding: 0.3 });
    for (const seg of segments(st().trail)) L.polyline(seg, { renderer: r, color: '#5B3A1E', weight: 3, opacity: .55, lineCap: 'round', lineJoin: 'round', dashArray: '1 7', interactive: false }).addTo(layer);
  }
  function distance(sinceMs) {
    let m = 0; const tr = st().trail, from = sinceMs ? sinceMs / 60000 : 0;
    for (let i = 1; i < tr.length; i++) {
      const a = tr[i - 1], b = tr[i]; if (b[2] < from) continue;
      if (b[2] - a[2] > GAP_MIN) continue; const d = Game.dist([a[0], a[1]], [b[0], b[1]]); if (d <= GAP_M) m += d;
    }
    return m;
  }
  /* un territoire est connu dès qu'on y a marché, découvert un lieu ou visité une adresse */
  function known(tid) {
    if (st().walked[tid]) return true;
    if (Data.places.some(p => p.t === tid && Game.disc(p.id))) return true;
    return typeof Quotidien !== 'undefined' && Quotidien.list().some(p => p.t === tid && Quotidien.found(p.id));
  }

  /* ---------- la piste ---------- */
  const DIRS = ['le nord', 'le nord-est', 'l\'est', 'le sud-est', 'le sud', 'le sud-ouest', 'l\'ouest', 'le nord-ouest'];
  function bearing(a, b) {
    const r = Math.PI / 180, y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r);
    const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function nextLead(fromId) {
    const from = Game.pos(fromId); if (!from) return null;
    let best = null, bd = 1e9;
    for (const p of Data.places) {
      if (p.kind !== 'culture' || p.ref !== p.id || p.id === fromId || Game.disc(p.id)) continue;
      const po = Game.pos(p.id); if (!po) continue; const d = Game.dist(from.ll, po.ll);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best || bd > 1500) return null;
    const b = bearing(from.ll, Game.pos(best.id).ll);
    return { id: best.id, from: from.ll, d: bd, b, dir: DIRS[Math.round(b / 45) % 8], approx: bd < 100 ? 'à moins de 100 m' : 'à environ ' + (Math.round(bd / 50) * 50) + ' m' };
  }
  function leadHTML(fromId) {
    const l = nextLead(fromId); if (!l) return '';
    return `<div class="piste"><span class="lead-a" style="--b:${Math.round(l.b)}deg">➜</span><div><div class="eyebrow">Une piste</div>
      <p>Une autre page blanche de l'atlas, ${l.approx}, vers ${l.dir}.</p><button class="btn" data-act="lead-follow" data-id="${fromId}">Suivre la piste</button></div></div>`;
  }
  function showLead(fromId) {
    const l = nextLead(fromId), map = AtlasMap.leaflet(); if (!l || !map) return;
    lead = l; if (!leadLayer) leadLayer = L.layerGroup().addTo(map); leadLayer.clearLayers();
    // une flèche à l'encre depuis le lieu trouvé, longue d'un tiers du chemin : la direction, pas la destination
    const len = Math.min(140, Math.max(40, l.d / 3)), r = Math.PI / 180, R = 6371000;
    const tip = [l.from[0] + (len * Math.cos(l.b * r)) / R / r, l.from[1] + (len * Math.sin(l.b * r)) / (R * Math.cos(l.from[0] * r)) / r];
    L.polyline([l.from, tip], { color: '#B66D4D', weight: 5, opacity: .95, dashArray: '2 9', lineCap: 'round', interactive: false, className: 'lead-line' }).addTo(leadLayer);
    L.marker(tip, { interactive: false, icon: L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html: `<div class="lead-tip" style="--b:${Math.round(l.b)}deg">➜</div>` }) }).addTo(leadLayer);
    map.setView(l.from, Math.max(map.getZoom(), 17));
    setTimeout(clearLead, 10 * 60000);
  }
  function clearLead() { if (leadLayer) leadLayer.clearLayers(); lead = null; }

  const actions = {
    'lead-follow'(d) { UI.closeSheet(); UI.show('atlas'); setTimeout(() => showLead(d.id), 60); },
    'trail-layer'() { const l = Game.S.settings.layers; l.trail = l.trail === false; Game.save(); draw(true); UI.draw(false); }
  };
  function layersHTML() {
    const on = Game.S.settings.layers.trail !== false, km = distance() / 1000;
    return `<button class="row tog${on ? ' on' : ''}" data-act="trail-layer"><span class="rt"><b>Mon tracé</b><small>${km >= 0.05 ? km.toFixed(1).replace('.', ',') + ' km relevés par le GPS' : 'Là où tu marches, relevé par le GPS'}</small></span><span class="sw"></span></button>`;
  }
  function init() { Object.assign(Views.actions, actions); }
  return { init, record, draw, distance, known, walked: tid => !!st().walked[tid], nextLead, leadHTML, showLead, clearLead, layersHTML, terrAt, lead: () => lead };
})();
