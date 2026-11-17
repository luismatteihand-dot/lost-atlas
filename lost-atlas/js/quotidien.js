/* Quotidien — les lieux ordinaires de la ville : cafés, petites tables, boulangeries, ateliers, marchés, jardins…
   Données : data/quotidien.js, extrait d'OpenStreetMap (© contributeurs OSM, ODbL). Nom, type et position viennent
   tels quels de la source ; aucune description n'est inventée ; « non vérifié sur place » est dit sur chaque fiche.
   Valeur des découvertes préservée : un lieu ordinaire rapporte peu (un peu d'expérience, une ligne au carnet d'adresses) ;
   seules quelques collections complètes donnent une carte. */
const Quotidien = (() => {
  const Q = window.ATLAS_QUOTIDIEN || { families: [], places: [], dup: [] };
  const esc = s => UI.esc(s), now = () => Date.now();
  const BY = {}; Q.places.forEach(p => { BY[p.id] = p; });
  const FAM = {}; Q.families.forEach(([k, l]) => { FAM[k] = l; });
  /* icônes : petits pictogrammes au trait, lisibles à 14 px */
  const G = {
    cafe: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 11h2a2 2 0 0 1 0 4h-2"/><path d="M9 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4"/>',
    resto: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5"/><path d="M17 3c-2 2-2 6 0 8v10"/>',
    pain: '<path d="M4 14c0-5 4-8 8-8s8 3 8 8c0 2-1 3-3 3H7c-2 0-3-1-3-3z"/><path d="M9 9l1 4M13 8v5M17 9l-1 4"/>',
    epicerie: '<path d="M4 8h16l-2 11H6z"/><path d="M8 8a4 4 0 0 1 8 0"/>',
    artisan: '<path d="M14 4l6 6-3 3-6-6z"/><path d="M11 7L4 19l1 1 12-7"/>',
    boutique: '<path d="M4 9l2-5h12l2 5"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
    livre: '<path d="M4 5c3-1 6-1 8 1v14c-2-2-5-2-8-1z"/><path d="M20 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z"/>',
    culture: '<rect x="4" y="5" width="16" height="13"/><path d="M4 15l5-5 4 4 3-3 4 4"/>',
    vert: '<path d="M12 21v-7"/><path d="M12 14c-5 0-7-3-7-6 3 0 7 1 7 6z"/><path d="M12 12c0-5 3-8 7-8 0 4-2 8-7 8z"/>',
    repere: '<path d="M6 21V10a6 6 0 0 1 12 0v11"/><path d="M4 21h16"/><path d="M10 21v-6a2 2 0 0 1 4 0v6"/>',
    hammam: '<path d="M4 16h16v3H4z"/><path d="M8 4c-1 2 1 3 0 5M12 4c-1 2 1 3 0 5M16 4c-1 2 1 3 0 5"/>',
    culte: '<path d="M12 3v3"/><path d="M7 21V11l5-4 5 4v10"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
    utile: '<path d="M12 5v14M5 12h14"/>'
  };
  const COL = { cafe: '#8B5A2B', resto: '#B66D4D', pain: '#C58B2B', epicerie: '#6E8B3D', artisan: '#7A4E8C', boutique: '#3F6E8C', livre: '#5B4A3A',
    culture: '#26365F', vert: '#4F7A55', repere: '#8C6A3F', hammam: '#4E7F86', culte: '#6B6B6B', utile: '#A33A3A' };
  const OFF_DEFAULT = { utile: true, culte: true };      // masqués par défaut : pratiques, ou à regarder avec respect
  const ico = (f, s) => `<svg viewBox="0 0 24 24" width="${s || 16}" height="${s || 16}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${G[f] || G.repere}</svg>`;

  const S = () => { const v = V3.st(); v.quot = v.quot || {}; return v.quot; };
  const L_ = () => { const l = Game.S.settings.layers; if (l.quot === undefined) l.quot = true; l.qf = l.qf || {}; return l; };
  const famOn = f => { const qf = L_().qf; return qf[f] === undefined ? !OFF_DEFAULT[f] : qf[f]; };
  const found = id => !!S()[id];

  /* ---------- carte : regroupement par grille d'écran, sans bibliothèque ---------- */
  let layer = null, lmap = null;
  function draw() {
    lmap = AtlasMap.leaflet && AtlasMap.leaflet(); if (!lmap) return;
    if (!layer) { layer = L.layerGroup().addTo(lmap); lmap.on('zoomend moveend', draw); }
    layer.clearLayers();
    const l = L_(); if (!l.quot) return;
    const z = lmap.getZoom(); if (z < 16) return;              // vue d'ensemble : la ville et ses lieux numérotés restent lisibles
    const b = lmap.getBounds().pad(0.15), cell = z >= 18 ? 0 : z >= 17 ? 64 : 110, cells = {};
    for (const p of Q.places) {
      if (!famOn(p.f) || (l.terr && p.t !== l.terr) || !b.contains(p.ll)) continue;
      if (!cell) { single(p); continue; }
      const pt = lmap.latLngToLayerPoint(p.ll), k = Math.floor(pt.x / cell) + ':' + Math.floor(pt.y / cell);
      (cells[k] = cells[k] || []).push(p);
    }
    for (const k in cells) { const g = cells[k]; if (g.length === 1) single(g[0]); else cluster(g); }
  }
  function single(p) {
    const f = found(p.id);
    L.marker(p.ll, { zIndexOffset: -100, keyboard: false, title: p.name, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<div class="qm${f ? ' found' : ''}" style="--qc:${COL[p.f]}">${ico(p.f, 14)}</div>` }) }).on('click', () => open(p.id)).addTo(layer);
  }
  function cluster(g) {
    const lat = g.reduce((a, p) => a + p.ll[0], 0) / g.length, lng = g.reduce((a, p) => a + p.ll[1], 0) / g.length;
    const fams = {}; g.forEach(p => { fams[p.f] = (fams[p.f] || 0) + 1; }); const top = Object.keys(fams).sort((a, b) => fams[b] - fams[a])[0];
    L.marker([lat, lng], { zIndexOffset: -120, keyboard: false, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13],
      html: `<div class="qc" style="--qc:${COL[top]}">${ico(top, 11)}<b>${g.length}</b></div>` }) })
      .on('click', () => lmap.fitBounds(L.latLngBounds(g.map(p => p.ll)), { padding: [50, 50], maxZoom: 19 })).addTo(layer);
  }

  /* ---------- fiche ---------- */
  const INVITE = {
    cafe: 'Assieds-toi, commande ce que tu ne connais pas encore, et regarde la rue dix minutes.',
    resto: 'Si c\'est ouvert, goûte un plat que tu n\'as jamais mangé et retiens son nom.',
    pain: 'Regarde ce qui sort du four et demande le nom d\'une pâtisserie, si le moment s\'y prête.',
    epicerie: 'Repère trois produits que tu ne sais pas nommer. Demander n\'engage à rien.',
    artisan: 'Si quelqu\'un travaille et que le moment s\'y prête, demande le nom d\'un outil ou d\'une matière. Sinon, observe le geste.',
    boutique: 'Entre si c\'est ouvert, regarde une seule pièce de près. Tu n\'as rien à acheter.',
    livre: 'Cherche un livre sur la ville, ou un titre en arabe dont tu demanderais le sens.',
    culture: 'Renseigne-toi sur ce qui s\'y montre en ce moment ; entre si l\'envie et le budget y sont.',
    vert: 'Trouve un endroit pour t\'asseoir à l\'ombre, téléphone rangé, cinq minutes.',
    repere: 'Lève les yeux : ce lieu est signalé dans OpenStreetMap, à toi de voir ce qu\'il a de particulier.',
    hammam: 'Lieu de bain public : renseigne-toi à l\'entrée sur les horaires (souvent séparés hommes / femmes).',
    culte: 'Lieu de culte : regarde depuis l\'extérieur. N\'entre que s\'il est explicitement ouvert aux visiteurs.',
    utile: 'Lieu pratique, bon à connaître en cas de besoin.'
  };
  function nearQuests(p) {
    const out = [];
    for (const q of Data.quests) {
      if (Game.questStatus(q) === 'done') continue;
      const ids = [].concat(...q.steps.map(s => s.place ? [s.place] : s.places || []));
      const d = Math.min(...ids.map(id => { const po = Game.pos(id); return po ? Game.dist(po.ll, p.ll) : 1e9; }));
      if (d < 250) out.push([q, d]);
    }
    return out.sort((a, b) => a[1] - b[1]).slice(0, 3);
  }
  function sheetHTML(id) {
    const p = BY[id]; if (!p) return '<p>Lieu introuvable.</p>';
    const t = Data.T[p.t], f = S()[id], fix = AtlasMap.fix(), d = fix && !fix.far ? Game.dist(fix.ll, p.ll) : null;
    const qs = nearQuests(p), adv = (window.ATLAS_V3.adventures || []).filter(a => a.t === p.t && !(V3.st().adv[a.id] && V3.st().adv[a.id].done));
    let h = `<div class="qh" style="--qc:${COL[p.f]};--tc:${t.color}"><span class="qh-i">${ico(p.f, 26)}</span><div><div class="eyebrow">${esc(FAM[p.f])} · lieu du quotidien</div><h2>${esc(p.name)}</h2>
      <div class="chips"><span class="chip">${f ? (f.how === 'gps' ? 'Visité (GPS)' : 'Visité') : 'Inconnu'}</span><span class="chip" style="--tc:${t.color}">${t.num} · ${esc(t.name)}${p.edge ? ' (en bordure)' : ''}</span>${d !== null ? `<span class="chip">à ${UI.fmtDist(d)}</span>` : ''}</div></div></div>
      <p class="p-text">${esc(INVITE[p.f] || '')}</p>
      <p class="src">Description : la source n'en donne pas, le jeu n'en invente pas. Source : ${esc(p.src)} (${esc(p.tag)}), position ${p.ll[0].toFixed(5)}, ${p.ll[1].toFixed(5)}. Existence, position et horaires non vérifiés sur place.</p>`;
    if (!f) h += `<div class="btn-row"><button class="btn primary" data-act="quot-here" data-id="${id}">J'y suis</button><button class="btn" data-act="quot-pin" data-id="${id}">Repère</button></div>`;
    else h += `<p class="note">Dans ton carnet d'adresses depuis le ${new Date(f.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.</p><div class="btn-row"><button class="btn" data-act="quot-pin" data-id="${id}">Repère</button></div>`;
    if (qs.length || adv.length) {
      h += '<h3>Autour</h3><div class="rows">' + qs.map(([q, dd]) => `<button class="row" data-act="open-quest" data-id="${q.id}"><span class="rt"><b>${esc(q.title)}</b><small>Quête · un de ses lieux à ${UI.fmtDist(dd)}</small></span><span class="chev">›</span></button>`).join('')
        + adv.map(a => `<button class="row" data-act="open-adv" data-id="${a.id}"><span class="rt"><b>${esc(a.title)}</b><small>Donjon du même territoire</small></span><span class="chev">›</span></button>`).join('') + '</div>';
    }
    return h;
  }
  function open(id) { UI.openSheet(sheetHTML, id); }

  /* ---------- découverte, collection ---------- */
  const MILESTONES = [
    ['c-habitue', 'L\'habitué', () => count(p => p.f === 'cafe') >= 5],
    ['c-mains', 'Les mains de la ville', () => count(p => p.f === 'artisan' || p.f === 'epicerie') >= 5],
    ['c-adresses', 'Le carnet d\'adresses', () => count() >= 25],
    ['c-six', 'Le flâneur des six territoires', () => Data.territories.every(t => count(p => p.t === t.id) >= 1)]
  ];
  function count(fn) { const s = S(); let n = 0; for (const id in s) { const p = BY[id]; if (p && (!fn || fn(p))) n++; } return n; }
  function discover(id, how) {
    const p = BY[id]; if (!p || found(id)) return false;
    S()[id] = { d: now(), how };
    Game.S.xp.exploration = (Game.S.xp.exploration || 0) + 5;
    Game.S.journal.push({ t: now(), k: 'quotidien', r: id, txt: 'Adresse : ' + p.name + ' (' + FAM[p.f] + ')', xp: 5 });
    Game.check();
    for (const [cid, label, ok] of MILESTONES) if (ok()) V3.give(cid, label);
    Game.save(); draw(); return true;
  }
  function sacHTML() {
    const n = count(), s = S();
    let h = `<p class="lead">${n} adresse${n > 1 ? 's' : ''} sur ${Q.places.length}. Des lieux ordinaires : ils rapportent peu, sauf quand ils forment une habitude.</p>`;
    h += '<div class="qfams">' + Q.families.map(([f, lab]) => { const tot = Q.places.filter(p => p.f === f).length, got = count(p => p.f === f);
      return `<span class="qfam" style="--qc:${COL[f]}"><i>${ico(f, 18)}</i><b>${got}</b><small>${esc(lab)} · ${tot}</small></span>`; }).join('') + '</div>';
    const mine = Object.keys(s).filter(id => BY[id]).sort((a, b) => s[b].d - s[a].d);
    h += mine.length ? '<h3>Visités</h3><div class="rows">' + mine.map(id => { const p = BY[id], t = Data.T[p.t];
      return `<button class="row" data-act="quot-open" data-id="${id}"><span class="qm found" style="--qc:${COL[p.f]}">${ico(p.f, 14)}</span><span class="rt"><b>${esc(p.name)}</b><small>${esc(FAM[p.f])} · ${t.num} ${esc(t.name)}</small></span><span class="chev">›</span></button>`; }).join('') + '</div>'
      : '<p class="note">Ouvre un point du quotidien sur la carte et touche « J\'y suis » quand tu y passes.</p>';
    return h;
  }

  /* ---------- territoires : progression et rangs ---------- */
  const RANKS = [['Étranger', 0], ['Passant', 0.01], ['Habitué', 0.34], ['Connaisseur', 0.67], ['Gardien', 1]];
  function terrStats(tid) {
    const cul = Data.places.filter(p => p.t === tid && p.kind === 'culture' && p.ref === p.id), dc = cul.filter(p => Game.disc(p.id)).length;
    const qd = Q.places.filter(p => p.t === tid), qf = qd.filter(p => found(p.id)).length;
    const quests = Data.quests.filter(q => q.t === tid), qdone = quests.filter(q => Game.questStatus(q) === 'done').length;
    const pq = window.ATLAS_V3.photoQuests.filter(q => Data.P[q.at] && Data.P[q.at].t === tid), pqf = pq.filter(q => Photo.found(q.id)).length;
    const advs = window.ATLAS_V3.adventures.filter(a => a.t === tid), seal = !!V3.st().cards['c-terr-' + tid];
    const share = cul.length ? dc / cul.length : 0;
    let rank = RANKS[0][0]; for (const [r, min] of RANKS) if (share >= min && (r !== 'Gardien' || seal)) rank = r;
    if (rank === 'Étranger' && (qf > 0 || (typeof Trace !== 'undefined' && Trace.walked(tid)))) rank = 'Passant';
    return { cul: cul.length, dc, qd: qd.length, qf, quests, qdone, pq: pq.length, pqf, advs, seal, rank, share };
  }
  function overviewHTML() {
    let h = '<div class="eyebrow">Six zones de jeu</div><h2>Les territoires</h2><p class="lead">Explore-les dans l\'ordre que tu veux. Chacun a ses lieux, ses quêtes, ses secrets, et un rang qui monte avec toi.</p><div class="terrs">';
    for (const t of Data.territories) {
      const s = terrStats(t.id);
      h += `<button class="terr" data-act="territory" data-id="${t.id}" style="--tc:${t.color}"><span class="terr-n">${t.num}</span><span class="terr-b"><small>${esc(s.rank)}</small><b>${esc(t.name)}</b>
        <span class="terr-bar"><i style="width:${Math.round(100 * s.share)}%"></i></span>
        <span class="terr-s">${s.dc}/${s.cul} lieux · ${s.qf} adresses · ${s.qdone}/${s.quests.length} quêtes${s.advs.length ? ' · donjon' : ''}${s.seal ? ' · scellé' : ''}</span></span><span class="chev">›</span></button>`;
    }
    return h + '</div><p class="src">Rangs : Passant dès un premier lieu ; Habitué au tiers des lieux culturels ; Connaisseur aux deux tiers ; Gardien quand tout est découvert et la quête du territoire accomplie.</p>';
  }
  function terrBlock(tid) {   // inséré dans la fiche de territoire
    const s = terrStats(tid), l = L_();
    let h = `<div class="terr-rank"><span><small>Ton rang</small><b>${esc(s.rank)}</b></span><span><small>Lieux</small><b>${s.dc} / ${s.cul}</b></span><span><small>Adresses</small><b>${s.qf} / ${s.qd}</b></span><span><small>Quêtes</small><b>${s.qdone} / ${s.quests.length}</b></span><span><small>Secrets</small><b>${s.pqf} / ${s.pq}</b></span></div>`;
    h += `<div class="btn-row"><button class="btn${l.terr === tid ? ' primary' : ''}" data-act="quot-terr" data-id="${tid}">${l.terr === tid ? 'Toute la carte' : 'Seulement ce territoire'}</button></div>`;
    if (s.advs.length) h += '<h3>Donjon</h3><div class="rows">' + s.advs.map(a => `<button class="row" data-act="open-adv" data-id="${a.id}"><span class="rt"><b>${esc(a.title)}</b><small>${esc(a.mood)}</small></span><span class="chev">›</span></button>`).join('') + '</div>';
    const open = s.quests.filter(q => Game.questStatus(q) !== 'done');
    if (s.quests.length) h += `<h3>Quêtes · ${s.qdone} / ${s.quests.length}</h3><div class="rows">` + open.slice(0, 6).map(q => `<button class="row" data-act="open-quest" data-id="${q.id}"><span class="rt"><b>${esc(q.title)}</b><small>${Game.questStatus(q) === 'active' ? 'En cours' : 'À commencer'}</small></span><span class="chev">›</span></button>`).join('')
      + (open.length > 6 ? `<p class="note">Et ${open.length - 6} autres dans l'onglet Aventures.</p>` : '') + (!open.length ? '<p class="note">Toutes accomplies.</p>' : '') + '</div>';
    if (s.pq) h += `<p class="src">Secrets photographiques de ce territoire : ${s.pqf} révélé${s.pqf > 1 ? 's' : ''} sur ${s.pq}. Ils ne figurent sur aucune liste : un signal t'avertit en passant.</p>`;
    return h;
  }
  function terrQuotHTML(tid) {
    const list = Q.places.filter(p => p.t === tid);
    if (!list.length) return '<p class="note">Aucun lieu du quotidien dans ce territoire.</p>';
    return Q.families.map(([f, lab]) => { const g = list.filter(p => p.f === f); if (!g.length) return '';
      return `<h3>${esc(lab)} · ${g.filter(p => found(p.id)).length} / ${g.length}</h3><div class="rows">` + g.map(p => `<button class="row" data-act="quot-open" data-id="${p.id}"><span class="qm${found(p.id) ? ' found' : ''}" style="--qc:${COL[p.f]}">${ico(p.f, 14)}</span><span class="rt"><b>${esc(p.name)}</b><small>${found(p.id) ? 'Visité' : 'Inconnu'}${p.edge ? ' · en bordure' : ''}</small></span><span class="chev">›</span></button>`).join('') + '</div>'; }).join('');
  }
  function layersHTML() {
    const l = L_();
    return `<h3>Lieux du quotidien</h3><button class="row tog${l.quot ? ' on' : ''}" data-act="quot-layer"><span class="rt"><b>Cafés, tables, ateliers, marchés…</b><small>${Q.places.length} lieux d'OpenStreetMap, regroupés quand ils sont serrés ; visibles en zoomant</small></span><span class="sw"></span></button>
      ${l.quot ? `<div class="links">${Q.families.map(([f, lab]) => `<button class="lk qlk${famOn(f) ? ' on' : ''}" data-act="quot-fam" data-k="${f}" style="--qc:${COL[f]}">${ico(f, 13)} ${esc(lab)}</button>`).join('')}</div>` : ''}
      <h3>Territoire</h3><div class="links"><button class="lk${!l.terr ? ' on' : ''}" data-act="quot-terr" data-id="">Tous</button>${Data.territories.map(t => `<button class="lk${l.terr === t.id ? ' on' : ''}" data-act="quot-terr" data-id="${t.id}">${t.num} · ${esc(t.name)}</button>`).join('')}</div>`;
  }

  const actions = {
    'quot-open'(d) { open(d.id); },
    'quot-here'(d) {
      const p = BY[d.id]; if (!p) return; const fix = AtlasMap.fix();
      if (fix && !fix.far && fix.acc <= 60) {
        const dd = Game.dist(fix.ll, p.ll);
        if (dd > 45) return UI.toast(`Ton GPS te place à ${UI.fmtDist(dd)} de ce lieu. Approche-toi, ou réessaie à ciel ouvert.`);
        discover(p.id, 'gps');
      } else discover(p.id, 'manuel');
      Sound.play('lieu'); UI.toast(`<b>${esc(p.name)}</b> rejoint ton carnet d'adresses.`); UI.draw(false);
    },
    'quot-pin'(d) { const p = BY[d.id]; if (!p) return; Game.addPin(p.ll[0], p.ll[1], '☕', p.name); UI.toast('Repère posé.'); UI.after(); },
    'quot-layer'() { const l = L_(); l.quot = !l.quot; Game.save(); draw(); UI.draw(false); },
    'quot-fam'(d) { const l = L_(); l.qf[d.k] = !famOn(d.k); Game.save(); draw(); UI.draw(false); },
    'quot-terr'(d) {
      const l = L_(); l.terr = d.id && l.terr !== d.id ? d.id : null; Game.save(); AtlasMap.refresh(); draw();
      if (l.terr) AtlasMap.showTerritory(Data.T[l.terr]); UI.draw(false); UI.chrome && UI.chrome();
    },
    'terrs'() { UI.openSheet(overviewHTML); },
    'terr-quot'(d) { UI.openSheet(terrSheet, d.id); }
  };
  function terrSheet(tid) { const t = Data.T[tid]; return `<div class="t-head" style="--tc:${t.color}"><div class="t-num">${t.num}</div><div><div class="eyebrow">Lieux du quotidien</div><h2>${esc(t.name)}</h2></div></div>` + terrQuotHTML(tid); }

  function init() { Object.assign(Views.actions, actions); }
  return { init, draw, open, invite: f => INVITE[f] || '', discover, found, count, sacHTML, overviewHTML, terrBlock, terrQuotHTML, layersHTML, terrStats, list: () => Q.places, get: id => BY[id], families: () => Q.families, ico, COL };
})();
