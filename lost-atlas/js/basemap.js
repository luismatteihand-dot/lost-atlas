/* Fond de carte embarqué : rues, derbs, places, jardins et remparts d'OpenStreetMap (data/basemap.js),
   dessinés sur un canevas dans le style de l'atlas. Fonctionne sans réseau. */
const Basemap = (() => {
  const D = Math.PI / 180;
  const mx = lon => (lon + 180) / 360;
  const my = lat => { const s = Math.sin(lat * D); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); };
  let roads = [], areas = [], ready = false;
  const tw = {};
  function decode(f) {
    const n = f[2].length / 2, xs = new Float64Array(n), ys = new Float64Array(n); let la = 0, lo = 0, x0 = 2, y0 = 2, x1 = -1, y1 = -1;
    for (let i = 0; i < n; i++) { la += f[2][2 * i]; lo += f[2][2 * i + 1]; const x = mx(lo / 1e5), y = my(la / 1e5); xs[i] = x; ys[i] = y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { c: f[0] & 3, cov: !!(f[0] & 4), k: f[0], name: f[1] || '', xs, ys, x0, y0, x1, y1, n };
  }
  function load() {
    const B = window.ATLAS_BASEMAP; if (!B || ready) return ready;
    roads = B.roads.map(decode); areas = B.areas.map(decode); ready = true; return true;
  }
  const INK = '#44372C', PAPER = '#FBF5E6';
  const AREA = [ ['rgba(139,155,128,.5)', 'rgba(32,59,50,.35)'], ['#A9BFC2', 'rgba(32,59,50,.4)'], ['rgba(139,155,128,.2)', 'rgba(68,55,44,.35)'],
    ['#F9F2E1', 'rgba(68,55,44,.3)'], ['#DCC9A3', 'rgba(68,55,44,.55)'], ['rgba(182,109,77,.38)', '#8E4B31'] ];
  function widths(z) {
    return [ z < 14 ? 1.6 : z < 16 ? 3 : z < 17.5 ? 5.5 : 9,
      z < 13.5 ? 0 : z < 15.5 ? 1 : z < 17 ? 2.4 : z < 18 ? 4.2 : 6.5,
      z < 15.5 ? 0 : z < 17 ? 0.9 : z < 18 ? 1.9 : 3.4 ];
  }
  function draw(ctx, map, b) {
    if (!ready) return;
    const z = map.getZoom(), S = 256 * Math.pow(2, z), o = map.getPixelOrigin();
    const vx0 = (b.min.x + o.x) / S, vx1 = (b.max.x + o.x) / S, vy0 = (b.min.y + o.y) / S, vy1 = (b.max.y + o.y) / S;
    const vis = f => f.x1 >= vx0 && f.x0 <= vx1 && f.y1 >= vy0 && f.y0 <= vy1;
    const path = f => { ctx.moveTo(f.xs[0] * S - o.x, f.ys[0] * S - o.y); for (let i = 1; i < f.n; i++) ctx.lineTo(f.xs[i] * S - o.x, f.ys[i] * S - o.y); };
    ctx.clearRect(b.min.x, b.min.y, b.max.x - b.min.x, b.max.y - b.min.y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const va = areas.filter(vis), vr = roads.filter(vis);
    for (let code = 0; code < 6; code++) {                          // surfaces
      if (code >= 4 && z < 15) continue;
      ctx.beginPath(); let any = false;
      for (const f of va) if (f.k === code) { path(f); ctx.closePath(); any = true; }
      if (!any) continue;
      ctx.fillStyle = AREA[code][0]; ctx.fill('evenodd');
      if (z >= 15) { ctx.strokeStyle = AREA[code][1]; ctx.lineWidth = code === 2 ? 0.8 : 1; ctx.setLineDash(code === 2 ? [2, 3] : []); ctx.stroke(); ctx.setLineDash([]); }
    }
    const W = widths(z);
    for (let c = 2; c >= 0; c--) {                                   // voies : ruelles, rues, axes
      const w = W[c]; if (!w) continue;
      for (const cov of [false, true]) {
        ctx.beginPath(); let any = false;
        for (const f of vr) if (f.c === c && f.cov === cov) { path(f); any = true; }
        if (!any) continue;
        if (w < 1.7) { ctx.strokeStyle = 'rgba(68,55,44,' + (c === 2 ? .5 : .7) + ')'; ctx.lineWidth = w; ctx.setLineDash(cov ? [3, 3] : []); ctx.stroke(); }
        else {
          ctx.strokeStyle = c === 0 ? INK : 'rgba(68,55,44,.75)'; ctx.lineWidth = w + (c === 0 ? 1.8 : 1.3); ctx.setLineDash([]); ctx.stroke();
          ctx.strokeStyle = cov ? '#E6D8B8' : PAPER; ctx.lineWidth = w; ctx.setLineDash(cov ? [w * 1.6, w * 1.2] : []); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
    ctx.beginPath(); let anyW = false;                               // remparts
    for (const f of va) if (f.k === 6) { path(f); anyW = true; }
    if (anyW) { ctx.strokeStyle = '#8E4B31'; ctx.lineWidth = z < 15 ? 2 : z < 17 ? 3.2 : 5; ctx.stroke(); ctx.strokeStyle = '#D9A98C'; ctx.lineWidth = z < 15 ? 0.6 : 1.2; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]); }
    if (z < 16) return;
    /* ---- noms ---- */
    const used = new Set(), byName = {};
    const free = (x, y, w) => { const ks = []; for (let gx = Math.floor((x - w / 2) / 46); gx <= Math.floor((x + w / 2) / 46); gx++) for (let gy = Math.floor((y - 9) / 26); gy <= Math.floor((y + 9) / 26); gy++) ks.push(gx + ':' + gy);
      if (ks.some(k => used.has(k))) return false; ks.forEach(k => used.add(k)); return true; };
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (z >= 16.5) {
      ctx.font = '700 10px "Avenir Next", Avenir, "Segoe UI", sans-serif';
      for (const f of va) {
        if (!f.name || f.k === 6) continue;
        const cx = (f.x0 + f.x1) / 2 * S - o.x, cy = (f.y0 + f.y1) / 2 * S - o.y, t = f.name.toUpperCase(), w = ctx.measureText(t).width + 8;
        if ((f.x1 - f.x0) * S < 26 && z < 18) continue;
        if (!free(cx, cy, w)) continue;
        ctx.strokeStyle = 'rgba(240,230,210,.9)'; ctx.lineWidth = 3; ctx.strokeText(t, cx, cy); ctx.fillStyle = f.k === 5 ? '#8E4B31' : f.k <= 2 ? '#203B32' : INK; ctx.fillText(t, cx, cy);
      }
    }
    const minZ = [16, 16.5, 17.5];
    for (const f of vr) {
      if (!f.name || z < minZ[f.c]) continue;
      const fs = f.c === 0 ? 12.5 : 11.5; ctx.font = 'italic ' + fs + 'px "Iowan Old Style", Palatino, Georgia, serif';
      const key = fs + f.name, w = tw[key] || (tw[key] = ctx.measureText(f.name).width);
      let len = 0; const seg = new Float64Array(f.n);
      for (let i = 1; i < f.n; i++) { len += Math.hypot((f.xs[i] - f.xs[i - 1]) * S, (f.ys[i] - f.ys[i - 1]) * S); seg[i] = len; }
      if (len < w + 12) continue;
      const at = d => { let i = 1; while (i < f.n - 1 && seg[i] < d) i++; const t = (d - seg[i - 1]) / ((seg[i] - seg[i - 1]) || 1); return [(f.xs[i - 1] + (f.xs[i] - f.xs[i - 1]) * t) * S - o.x, (f.ys[i - 1] + (f.ys[i] - f.ys[i - 1]) * t) * S - o.y]; };
      const m = at(len / 2), p0 = at(len / 2 - w / 2), p1 = at(len / 2 + w / 2);
      if (m[0] < b.min.x || m[0] > b.max.x || m[1] < b.min.y || m[1] > b.max.y) continue;
      if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < w * 0.86) continue;          // trop courbe pour porter son nom
      const prev = byName[f.name]; if (prev && prev.some(q => Math.hypot(q[0] - m[0], q[1] - m[1]) < 260)) continue;
      if (!free(m[0], m[1], w)) continue;
      (byName[f.name] = prev || []).push(m);
      let a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      ctx.save(); ctx.translate(m[0], m[1]); ctx.rotate(a);
      ctx.strokeStyle = 'rgba(240,230,210,.92)'; ctx.lineWidth = 3.2; ctx.strokeText(f.name, 0, 0); ctx.fillStyle = INK; ctx.fillText(f.name, 0, 0); ctx.restore();
    }
  }
  const Layer = L.Renderer.extend({
    options: { padding: 0.3, pane: 'basemap' },
    _initContainer() { const c = this._container = document.createElement('canvas'); c.className = 'basemap-canvas'; this._ctx = c.getContext('2d'); },
    _destroyContainer() { L.DomUtil.remove(this._container); delete this._ctx; delete this._container; },
    _updatePaths() {},
    _update() {
      if (this._map._animatingZoom && this._bounds) return;
      L.Renderer.prototype._update.call(this);
      const b = this._bounds, c = this._container, size = b.getSize(), m = Math.min(window.devicePixelRatio || 1, 2);
      L.DomUtil.setPosition(c, b.min);
      c.width = m * size.x; c.height = m * size.y; c.style.width = size.x + 'px'; c.style.height = size.y + 'px';
      this._ctx.setTransform(m, 0, 0, m, -b.min.x * m, -b.min.y * m);
      draw(this._ctx, this._map, b);
    }
  });
  return { load, isReady: () => ready, layer: () => new Layer(), stats: () => ({ roads: roads.length, named: roads.filter(r => r.name).length, areas: areas.length }) };
})();
