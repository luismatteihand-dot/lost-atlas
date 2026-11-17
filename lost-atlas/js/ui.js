/* Interface : feuilles (fiches), épreuves, toasts, carte. Les écrans Codex / Quêtes / Collection / Profil sont dans views.js. */
const UI = (() => {
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STATUS = { unknown: 'Non découvert', spotted: 'Repéré', discovered: 'Découvert', mastered: 'Maîtrisé' };
  const KLABEL = { fait: 'Fait', hyp: 'Hypothèse', trad: 'Tradition' };
  const skillName = id => (Data.prog.skills.find(s => s.id === id) || {}).name || id;
  const fmtDist = d => d < 950 ? Math.round(d / 10) * 10 + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km';
  const tmp = {};            // état transitoire des épreuves (non sauvegardé)
  let CH = {};               // épreuves affichées dans la feuille courante
  let stack = [];            // pile de feuilles
  let view = 'atlas', placeMsg = null, lastNear = null, farWarned = false, actx = null;

  /* ---------- Feuilles ---------- */
  function draw(top) {
    const s = stack[stack.length - 1], body = $('#sheet-body');
    if (!s) return closeSheet();
    const y = body.scrollTop; CH = {};
    body.innerHTML = s.fn.apply(null, s.args);
    $('#sheet').hidden = false; $('#scrim').classList.add('on'); $('#sh-back').style.visibility = stack.length > 1 ? 'visible' : 'hidden';
    body.scrollTop = top ? 0 : y;
  }
  function sheet(fn, ...args) { stack.push({ fn, args }); draw(true); }
  function openSheet(fn, ...args) { stack = [{ fn, args }]; draw(true); }
  function closeSheet() { stack = []; $('#sheet').hidden = true; $('#scrim').classList.remove('on'); placeMsg = null; }
  function back() { stack.pop(); placeMsg = null; if (stack.length) draw(true); else closeSheet(); }

  /* ---------- Toasts et bandeau de découverte ---------- */
  function toast(msg, act, id) {
    const t = document.createElement('button'); t.className = 'toast'; t.innerHTML = msg;
    if (act) { t.dataset.act = act; t.dataset.id = id; }
    const box = $('#toasts'); box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4200);
  }
  let rvTimer = null; const rvQueue = [];
  function reveal(title, sub) { rvQueue.push([title, sub]); if (rvQueue.length > 2) rvQueue.splice(0, rvQueue.length - 2); if (!rvTimer) nextReveal(); }
  function nextReveal() {
    const r = rvQueue.shift(), el = $('#reveal');
    if (!r) { rvTimer = null; el.classList.remove('on'); return; }
    $('#rv-title').textContent = r[0]; $('#rv-sub').textContent = r[1]; el.classList.add('on');
    rvTimer = setTimeout(() => { el.classList.remove('on'); rvTimer = setTimeout(nextReveal, 300); }, 2100);
  }
  function chime() {
    if (typeof Sound !== 'undefined') { Sound.play('decouverte'); return; }
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const t = actx.currentTime;
      [659, 880, 1175].forEach((f, i) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.exponentialRampToValueAtTime(0.14, t + i * 0.14 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.14 + 0.6);
        o.connect(g); g.connect(actx.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.65); });
    } catch (e) { /* son indisponible */ }
  }
  function primeAudio() { try { if (Game.S.settings.chime) { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } } catch (e) { /* ignore */ } }

  /* ---------- Événements du jeu ---------- */
  function flush() {
    const evs = Game.takeEvents(); let rang = false;
    for (const e of evs) {
      if (e.type === 'discover') { const p = Data.P[e.id], t = Data.T[p.t]; if (p.kind !== 'culture') reveal(p.name, 'Adresse trouvée · Territoire ' + t.num); if (!rang) { chime(); rang = true; } }
      else if (e.type === 'spot') { if (typeof Explore === 'undefined' || !Explore.isOn()) toast('Repéré à proximité : <b>' + esc(Data.P[e.id].name) + '</b>', 'open-place', e.id); }
      else if (e.type === 'codex') toast('Savoir révélé : <b>' + esc(Data.C[e.id].title) + '</b>', 'open-codex', e.id);
      else if (e.type === 'artifact') { if (typeof Sound !== 'undefined') Sound.play('artefact'); toast('Artefact obtenu : <b>' + esc(Data.A[e.id].name) + '</b>', 'open-artifact', e.id); }
      else if (e.type === 'quest') toast('Quête accomplie : <b>' + esc(Data.Q[e.id].title) + '</b>', 'open-quest', e.id);
      else if (e.type === 'title') toast('Titre obtenu : <b>' + esc(Data.prog.titles.find(b => b.id === e.id).name) + '</b>');
      else if (e.type === 'chain') reveal(Data.CH[e.id].title, 'Synthèse révélée');
      else if (e.type === 'chart') toast('Lieu posé sur la carte.');
    }
    if (typeof V3 !== 'undefined') V3.onEvents(evs);
  }
  function after() { Game.check(); flush(); AtlasMap.refresh(); if (stack.length) draw(false); Views.render(view); chrome(); }

  /* ---------- Épreuves ---------- */
  function chBlock(key, ch, skill, label) {
    CH[key] = { ch, skill, label }; const st = Game.chState(key), t = tmp[key] || (tmp[key] = {});
    const head = k => `<div class="ch-kind">${k}</div>`;
    if (ch.kind === 'observe') {       // regarder d'abord, un seul geste ; la réflexion écrite est facultative et vient après
      if (st.done) return `<div class="ch done obs">${head('Tu as regardé')}<p class="ch-q">${esc(ch.q)}</p><div class="reveal-txt ink">${esc(ch.reveal)}</div>
        ${st.hyp ? `<p class="hand">${esc(st.hyp)}</p>` : `<details class="deeper"><summary>Aller plus loin : noter ce que tu en penses</summary><textarea id="hyp-${key}" rows="2" placeholder="Ton idée, pour ton carnet"></textarea><button class="btn" data-act="obs-note" data-key="${key}">Garder cette note</button></details>`}</div>`;
      return `<div class="ch obs">${head('Regarde d\'abord')}<p class="ch-q big">${esc(ch.q)}</p><button class="btn primary wide" data-act="obs-go" data-key="${key}">J'ai regardé</button><p class="note">Rien à écrire. Prends le temps de lever les yeux, puis touche.</p></div>`;
    }
    if (ch.kind === 'enigma') {        // plus de réponse à taper : on cherche des yeux, on dévoile quand on pense savoir
      const hints = ch.hints.slice(0, st.hints || 0).map((h, i) => `<li><b>Indice ${i + 1}.</b> ${esc(h)}</li>`).join('');
      if (st.done) return `<div class="ch done"><div class="ch-kind">Énigme</div><p class="ch-q">${esc(ch.q)}</p><div class="reveal-txt ink">${esc(ch.explain)}</div></div>`;
      return `<div class="ch">${head('Énigme')}<p class="ch-q big">${esc(ch.q)}</p>${hints ? `<ul class="hints">${hints}</ul>` : ''}
        <div class="btn-row"><button class="btn primary" data-act="en-reveal" data-key="${key}">Je crois savoir</button>${(st.hints || 0) < 3 ? `<button class="btn ghost" data-act="en-hint" data-key="${key}">Un indice</button>` : ''}</div></div>`;
    }
    if (ch.kind === 'classify') {
      if (st.done) return `<div class="ch done">${head('Classement · réussi')}<ul class="cl-done">${ch.items.map(it => `<li><span class="tag k-${it.k}">${KLABEL[it.k]}</span> ${esc(it.t)}</li>`).join('')}</ul><div class="reveal-txt">${esc(ch.explain)}</div></div>`;
      t.picks = t.picks || {};
      return `<div class="ch">${head('Fait, hypothèse ou tradition ?')}<p class="ch-q">${esc(ch.q)}</p>${ch.items.map((it, i) => `<div class="cl-item${t.res && t.res[i] === false ? ' bad' : ''}"><p>${esc(it.t)}</p><div class="btn-row">${Object.keys(KLABEL).map(k => `<button class="btn chipbtn${t.picks[i] === k ? ' on' : ''}" data-act="cl-pick" data-key="${key}" data-i="${i}" data-k="${k}">${KLABEL[k]}</button>`).join('')}</div></div>`).join('')}
        ${t.msg ? `<p class="msg">${esc(t.msg)}</p>` : ''}<button class="btn primary wide" data-act="cl-check" data-key="${key}">Vérifier</button></div>`;
    }
    if (st.done) return `<div class="ch done">${head('Trouvé')}<p class="ch-q">${esc(ch.q)}</p></div>`;
    return `<div class="ch">${head('À trouver sur le terrain')}<p class="ch-q">${esc(ch.q)}</p><button class="btn primary wide" data-act="cf-ok" data-key="${key}">${esc(ch.button || 'C\'est fait')}</button><p class="note">Validation sur l'honneur : personne d'autre que toi ne saura si tu as triché.</p></div>`;
  }

  /* ---------- Fiche de lieu ---------- */
  function qLabel(po) {
    if (!po) return '<span class="chip q-none">Non cartographié</span>';
    return { v: '<span class="chip q-v">Position vérifiée</span>', e: '<span class="chip q-e">Position estimée</span>', a: '<span class="chip q-e">Position estimée</span>', i: '<span class="chip q-i">Position indicative</span>', u: '<span class="chip q-u">Placé par toi</span>' }[po.q];
  }
  function placeHTML(id) {
    const p = Data.P[id], t = Data.T[p.t], f = p.fiche || {}, st = Game.status(id), po = Game.pos(id), ps = Game.pget(id);
    const found = st === 'discovered' || st === 'mastered', fix = AtlasMap.fix();
    const d = po && fix && !fix.far ? Game.dist(fix.ll, po.ll) : null;
    let h = `<div class="p-head"><div class="p-num st-${st}${p.kind === 'culture' ? ' dia' : ''}"><b>${p.num}</b></div><div>
      <div class="eyebrow">N° ${p.num} de l'atlas · Territoire ${t.num} · ${Data.CAT[p.cat]}${p.page ? ' · guide p. ' + p.page + (p.n != null ? ', n° ' + p.n : '') : ''}</div><h2>${esc(p.name)}</h2>
      <div class="chips"><span class="chip st-${st}">${STATUS[st]}</span>${qLabel(po)}${d !== null ? `<span class="chip">à ${fmtDist(d)}</span>` : ''}</div></div></div>`;
    if (p.same) h += `<p class="note">Ce lieu figure aussi sur la carte « ${esc(Data.T[Data.P[p.same].t].name)} » de ton guide : une seule découverte compte pour les deux.</p>`;
    if (!found) {
      h += f.teaser ? `<p class="teaser">${esc(f.teaser)}</p>` : `<p class="teaser">${p.kind === 'culture' ? 'Une page blanche de l\'atlas.' : 'Une adresse relevée dans ton guide.'}</p>`;
      if (placeMsg && placeMsg.id === id) h += `<div class="manual"><p>${esc(placeMsg.txt)}</p><div class="btn-row"><button class="btn primary" data-act="here-manual" data-id="${id}">Oui, j'y suis</button><button class="btn ghost" data-act="here-cancel">Pas encore</button></div></div>`;
      else h += `<button class="btn primary wide big" data-act="here" data-id="${id}">J'y suis</button>`;
      h += `<div class="btn-row"><button class="btn" data-act="spot" data-id="${id}">${st === 'spotted' ? 'Ne plus repérer' : 'Repérer pour plus tard'}</button>${po ? `<button class="btn" data-act="show-on-map" data-id="${id}">Voir sur la carte</button><a class="btn" href="https://maps.apple.com/?daddr=${po.ll[0]},${po.ll[1]}&dirflg=w" target="_blank" rel="noopener">Itinéraire</a>` : ''}</div>`;
      if (p.kind === 'culture') h += `<p class="note">La fiche, l'observation et les savoirs liés se révèlent une fois sur place.</p>`;
    } else {
      if (f.text) h += `<p class="p-text">${esc(f.text)}</p>`;
      if (f.tip) h += `<p class="tip">${esc(f.tip)}</p>`;
      const sk = f.skill || 'culture';
      if (f.observe) h += chBlock(Game.chKey(id, 'observe'), Object.assign({ kind: 'observe' }, f.observe), f.observe.skill || sk, p.name);
      if (f.enigma) h += chBlock(Game.chKey(id, 'enigma'), Object.assign({ kind: 'enigma' }, f.enigma), f.enigma.skill || sk, p.name);
      if (po) h += `<div class="btn-row"><button class="btn" data-act="show-on-map" data-id="${id}">Voir sur la carte</button><a class="btn" href="https://maps.apple.com/?daddr=${po.ll[0]},${po.ll[1]}&dirflg=w" target="_blank" rel="noopener">Itinéraire</a></div>`;
    }
    const linked = Data.placeCodex[p.ref] || [];
    if (linked.length) h += `<h3>Savoirs liés</h3><div class="links">${linked.map(cid => Game.codexState(cid) === 'locked' ? `<span class="lk locked">${Art.icon('lock')} Fragment scellé</span>` : `<button class="lk" data-act="open-codex" data-id="${cid}">${esc(Data.C[cid].title)}</button>`).join('')}</div>`;
    h += `<h3>Position</h3>`;
    if (po) h += `<p class="src">${{ v: 'Vérifiée', e: 'Estimée', a: 'Estimée', i: 'Indicative', u: 'Posée par toi' }[po.q]} : ${esc(po.src || '')}.${p.paper ? ` Relevé papier : p. ${p.paper.page}, n° ${p.paper.n}, pixel (${p.paper.px.join(', ')}) de la photo.` : ''}</p>${!p.pos ? `<div class="btn-row"><button class="btn ghost" data-act="chart-pick" data-id="${id}">Corriger la position</button></div>` : ''}`;
    else h += `<p class="src">Ce lieu vient de la légende de ton guide, mais sa position n'a pas pu être vérifiée : il n'est donc pas affiché sur la carte. Quand tu le trouves, pose-le toi-même : sa carte est rare.</p>
      <div class="btn-row"><button class="btn" data-act="chart-gps" data-id="${id}">Le placer ici (GPS)</button><button class="btn" data-act="chart-pick" data-id="${id}">Le placer sur la carte</button></div>`;
    h += `<h3>Mon carnet</h3><textarea class="notes" rows="3" data-note="${id}" placeholder="Ce que j'ai vu, ce qu'on m'a raconté…">${esc(ps.note || '')}</textarea>`;
    if (found && ps.d) h += `<p class="src">Découvert le ${new Date(ps.d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · ${ps.how === 'gps' ? 'validé par GPS' : 'validation manuelle'}.</p>`;
    return h;
  }

  /* ---------- Fiche de territoire (liste des lieux) ---------- */
  function terrStats(tid) {
    const all = Data.places.filter(p => p.t === tid), cul = all.filter(p => p.kind === 'culture');
    return { all, cul, pra: all.filter(p => p.kind !== 'culture'), done: cul.filter(p => Game.disc(p.id)).length };
  }
  function row(p) {
    const st = Game.status(p.id), po = Game.pos(p.id), fix = AtlasMap.fix(), d = po && fix && !fix.far ? Game.dist(fix.ll, po.ll) : null;
    return `<button class="row" data-act="push-place" data-id="${p.id}" data-name="${p.num} ${esc(p.name.toLowerCase())}"><span class="num st-${st}${p.kind === 'culture' ? ' dia' : ''}"><b>${p.num}</b></span>
      <span class="rt"><b>${esc(p.name)}</b><small>${Data.CAT[p.cat]} · ${STATUS[st]}${d !== null ? ' · ' + fmtDist(d) : ''}${po ? '' : ' · non cartographié'}</small></span><span class="chev">›</span></button>`;
  }
  function territoryHTML(tid, tab) {
    const t = Data.T[tid], s = terrStats(tid); tab = tab || 'culture';
    const list = tab === 'culture' ? s.cul : s.pra;
    return `<div class="t-head" style="--tc:${t.color}"><div class="t-num">${t.num}</div><div><div class="eyebrow">Territoire · guide p. ${t.page}</div><h2>${esc(t.name)}</h2><div class="sub">${esc(t.sub)}</div></div></div>
      <p class="p-text">${esc(t.intro)}</p>
      <div class="bar"><i style="width:${Math.round(100 * s.done / s.cul.length)}%"></i></div><p class="src">${s.done} / ${s.cul.length} lieux culturels découverts</p>
      <div class="btn-row"><button class="btn" data-act="terr-map" data-id="${tid}">Voir sur la carte</button><button class="btn" data-act="open-tq" data-id="${tid}">Quête du territoire</button></div>
      <div class="seg"><button class="${tab === 'culture' ? 'on' : ''}" data-act="terr-tab" data-id="${tid}" data-tab="culture">À explorer (${s.cul.length})</button><button class="${tab === 'pratique' ? 'on' : ''}" data-act="terr-tab" data-id="${tid}" data-tab="pratique">Adresses du guide (${s.pra.length})</button></div>
      <input class="search" type="search" placeholder="Chercher un lieu" data-filter="rows" aria-label="Chercher un lieu">
      <div class="rows">${list.map(row).join('')}</div>
      <p class="note">Numéros d'atlas uniques ; catégories reprises de la légende de ton guide. Thèmes : ${t.themes.map(esc).join(', ')}.</p>`;
  }

  /* ---------- Calques, marqueurs personnels ---------- */
  function layersHTML() {
    const l = Game.S.settings.layers, st = Game.S.settings.mapStyle;
    const tog = (k, lab, sub) => `<button class="row tog${l[k] ? ' on' : ''}" data-act="layer" data-k="${k}"><span class="rt"><b>${lab}</b><small>${sub}</small></span><span class="sw"></span></button>`;
    return `<h2>Calques de la carte</h2>${tog('culture', 'Lieux à explorer', 'Monuments, musées, places, portes')}${tog('pratique', 'Adresses du guide', 'Se loger, se restaurer, prendre un verre, shopping')}${tog('pins', 'Mes marqueurs', 'Les repères que tu poses')}${tog('zones', 'Territoires', 'Zones de jeu indicatives, pas des limites administratives')}
      ${l.pratique ? `<div class="links">${['manger', 'verre', 'shop', 'loger', 'act'].map(c => `<button class="lk${l.cats[c] !== false ? ' on' : ''}" data-act="layer-cat" data-k="${c}">${Data.CAT[c]}</button>`).join('')}</div>` : ''}
      <h3>Fond de carte</h3><div class="seg"><button class="${st !== 'net' ? 'on' : ''}" data-act="map-style" data-v="atlas">Atlas dessiné (hors ligne)</button><button class="${st === 'net' ? 'on' : ''}" data-act="map-style" data-v="net">OpenStreetMap en ligne</button></div>
      <p class="note">L'atlas dessiné est embarqué dans l'application : rues, derbs et noms viennent d'OpenStreetMap et s'affichent sans réseau.</p>
      <h3>Légende</h3><div class="legend"><span><i class="mk mk-c st-unknown q-v"><b>3</b></i>Non découvert</span><span><i class="mk mk-c st-spotted q-v"><b>3</b></i>Repéré</span><span><i class="mk mk-c st-discovered q-v"><b>3</b></i>Découvert</span><span><i class="mk mk-c st-mastered q-v"><b>★</b></i>Maîtrisé</span><span><i class="mk mk-c st-unknown q-e"><b>3</b></i>Position estimée ou indicative</span><span><i class="mk mk-p st-unknown q-a"><b>12</b></i>Adresse du guide</span></div>`;
  }
  const STAMPS = ['★', '◆', '?', '!', '♥', '☕', '✚', '⚑'];
  function pinHTML(pid) {
    const pin = Game.S.pins.find(x => x.id === pid); if (!pin) return '<p>Marqueur supprimé.</p>';
    return `<h2>Mon marqueur</h2><div class="stamps">${STAMPS.map(s => `<button class="stamp${pin.icon === s ? ' on' : ''}" data-act="pin-icon" data-id="${pid}" data-v="${s}">${s}</button>`).join('')}</div>
      <label class="lbl-sm" for="pin-label">Note</label><input id="pin-label" type="text" data-pin="${pid}" value="${esc(pin.label)}" placeholder="Ex. : porte cloutée à revoir de nuit">
      <p class="src">Posé le ${new Date(pin.at).toLocaleDateString('fr-FR')} · ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</p>
      <div class="btn-row"><a class="btn" href="https://maps.apple.com/?daddr=${pin.lat},${pin.lng}&dirflg=w" target="_blank" rel="noopener">Itinéraire</a><button class="btn danger" data-act="pin-del" data-id="${pid}">Supprimer</button></div>`;
  }

  /* ---------- Habillage de la carte ---------- */
  function chrome() {
    $('#chips').innerHTML = Data.territories.map(t => { const s = terrStats(t.id); return `<button class="tchip" style="--tc:${t.color}" data-act="territory" data-id="${t.id}"><b>${t.num}</b><span>${esc(t.name)}</span><i>${s.done}/${s.cul.length}</i></button>`; }).join('');
    radar();
  }
  function radar() {
    const r = $('#radar'), fix = AtlasMap.fix();
    if (!fix || fix.far || !lastNear) { r.hidden = true; return; }
    const p = Data.P[lastNear.id]; r.hidden = false; r.dataset.id = p.id; r.classList.toggle('here', !!lastNear.here);
    r.innerHTML = `<span class="rd-d">${fmtDist(lastNear.d)}</span><span class="rd-t"><b>${lastNear.here ? 'Tu y es : un lieu t\'attend' : Game.status(p.id) === 'unknown' ? 'Lieu inconnu le plus proche' : esc(p.name)}</b><small>${lastNear.here ? 'Touche pour le révéler' : 'GPS ± ' + fix.acc + ' m · touche pour ouvrir'}</small></span>`;
  }

  /* ---------- Actions ---------- */
  const hereCheck = (id, fix) => {
    const po = Game.pos(id), p = Data.P[id];
    if (!po) { placeMsg = { id, txt: 'Ce lieu n\'est pas cartographié : le GPS ne peut pas vérifier. Tu confirmes être sur place ?' }; return; }
    if (fix.far) { placeMsg = { id, txt: 'Ton GPS t\'indique loin de Marrakech. Validation manuelle : tu confirmes être sur place ?' }; return; }
    const d = Game.dist(fix.ll, po.ll), lim = Game.radius(po.q) + Math.min(fix.acc, 60);
    if (d <= lim) { Game.discover(id, 'gps'); placeMsg = null; }
    else placeMsg = { id, txt: `Le GPS te situe à ${fmtDist(d)} de ${p.name} (précision ± ${fix.acc} m${po.q !== 'v' ? ', position du lieu non vérifiée' : ''}). Si tu y es vraiment, valide manuellement.` };
  };
  const A = {
    tab(d) { show(d.v); },
    'sheet-close': closeSheet, 'sheet-back': back,
    territory(d) { const t = Data.T[d.id]; Game.S.settings.territory = d.id; Game.save(); AtlasMap.showTerritory(t); openSheet(territoryHTML, d.id, 'culture'); },
    'terr-tab'(d) { stack[stack.length - 1].args = [d.id, d.tab]; draw(true); },
    'terr-map'(d) { closeSheet(); AtlasMap.showTerritory(Data.T[d.id]); },
    'open-place'(d) { if (d.id) { show('atlas'); openSheet(placeHTML, d.id); } },
    'push-place'(d) { sheet(placeHTML, d.id); },
    'show-on-map'(d) { const po = Game.pos(d.id); closeSheet(); show('atlas'); if (po) AtlasMap.flyTo(po.ll, 18); },
    spot(d) { Game.spot(d.id, Game.status(d.id) !== 'spotted'); after(); },
    here(d) {
      const fix = AtlasMap.fix();
      if (fix) { hereCheck(d.id, fix); return after(); }
      placeMsg = { id: d.id, txt: 'Recherche de ta position…' }; draw(false);
      AtlasMap.locateOnce().then(f => { hereCheck(d.id, f); after(); })
        .catch(() => { placeMsg = { id: d.id, txt: 'GPS indisponible ou non autorisé. Validation manuelle : tu confirmes être sur place ?' }; draw(false); });
    },
    'here-manual'(d) { placeMsg = null; Game.discover(d.id, 'manuel'); after(); },
    'here-cancel'() { placeMsg = null; draw(false); },
    'chart-gps'(d) {
      const done = f => { if (f.far || f.acc > 60) return toast(f.far ? 'Ton GPS t\'indique loin de Marrakech.' : 'GPS trop imprécis (± ' + f.acc + ' m) : réessaie à ciel ouvert, ou place le lieu sur la carte.'); Game.chart(d.id, f.ll[0], f.ll[1], 'gps'); after(); };
      const fix = AtlasMap.fix(); if (fix) return done(fix);
      toast('Recherche de ta position…'); AtlasMap.locateOnce().then(done).catch(() => toast('GPS indisponible : place le lieu sur la carte.'));
    },
    'chart-pick'(d) { const id = d.id; closeSheet(); show('atlas'); AtlasMap.startPick('Place la croix sur : ' + Data.P[id].name, (lat, lng) => { Game.chart(id, lat, lng, 'main'); after(); openSheet(placeHTML, id); }); },
    gps() { primeAudio(); if (!AtlasMap.isFollowing()) AtlasMap.follow(true); else if (!AtlasMap.isAuto()) AtlasMap.recenter(); else Views.actions['x-open'](); },
    'gps-stop'() { AtlasMap.follow(false); if (typeof Explore !== 'undefined' && Explore.isOn()) Explore.stop(); if (stack.length) draw(false); },
    'pin-new'() { closeSheet(); AtlasMap.startPick('Place la croix où poser ton marqueur', (lat, lng) => { const pin = Game.addPin(lat, lng, '★', ''); after(); openSheet(pinHTML, pin.id); }); },
    'pick-ok'() { AtlasMap.endPick(true); }, 'pick-cancel'() { AtlasMap.endPick(false); },
    'pin-icon'(d) { Game.updatePin(d.id, { icon: d.v }); after(); },
    'pin-del'(d) { Game.removePin(d.id); closeSheet(); after(); },
    places() { openSheet(territoryHTML, Game.S.settings.territory || 't1', 'culture'); },
    layers() { openSheet(layersHTML); },
    layer(d) { const l = Game.S.settings.layers; l[d.k] = !l[d.k]; Game.save(); after(); },
    'layer-cat'(d) { const c = Game.S.settings.layers.cats; c[d.k] = c[d.k] === false; Game.save(); after(); },
    'map-style'(d) { Game.S.settings.mapStyle = d.v; Game.save(); AtlasMap.applyStyle(); draw(false); },
    'obs-go'(d) { const c = CH[d.key]; Game.observeDone(d.key, c.ch, c.skill, '', null, c.label); after(); },
    'obs-note'(d) { const ta = $('#hyp-' + CSS.escape(d.key)), v = ta ? ta.value.trim() : ''; if (v && Game.S.ch[d.key]) { Game.S.ch[d.key].hyp = v; Game.save(); } draw(false); },
    'obs-reveal'(d) { const ta = $('#hyp-' + CSS.escape(d.key)); tmp[d.key].hyp = ta ? ta.value.trim() : ''; tmp[d.key].revealed = true; draw(false); },
    'obs-self'(d) { const c = CH[d.key]; Game.observeDone(d.key, c.ch, c.skill, tmp[d.key].hyp, +d.v, c.label); after(); },
    'en-try'(d) {
      const c = CH[d.key], inp = $('#ans-' + CSS.escape(d.key)), v = inp ? inp.value : ''; tmp[d.key].val = v;
      if (!v.trim()) { tmp[d.key].msg = 'Écris une réponse, même incertaine.'; return draw(false); }
      const ok = Game.enigmaTry(d.key, c.ch, c.skill, v, c.label);
      tmp[d.key].msg = ok ? '' : 'Ce n\'est pas ça. Regarde encore, ou demande un indice.'; after();
    },
    'en-hint'(d) { const inp = $('#ans-' + CSS.escape(d.key)); if (inp) tmp[d.key].val = inp.value; Game.enigmaHint(d.key); draw(false); },
    'en-reveal'(d) { const c = CH[d.key]; Game.enigmaReveal(d.key, c.skill, c.label); after(); },
    'cl-pick'(d) { tmp[d.key].picks[d.i] = d.k; tmp[d.key].res = null; tmp[d.key].msg = ''; draw(false); },
    'cl-check'(d) {
      const c = CH[d.key], t = tmp[d.key];
      if (Object.keys(t.picks).length < c.ch.items.length) { t.msg = 'Classe d\'abord chaque affirmation.'; return draw(false); }
      t.res = Game.classifyCheck(d.key, c.ch, c.skill, t.picks, c.label);
      t.msg = t.res.every(Boolean) ? '' : t.res.filter(x => !x).length + ' affirmation(s) à revoir : elles sont entourées.'; after();
    },
    'cf-ok'(d) { const c = CH[d.key]; Game.confirmDone(d.key, c.label); after(); }
  };

  /* ---------- Navigation ---------- */
  function show(v) {
    view = v; closeSheet();
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
    document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    if (v === 'atlas') setTimeout(AtlasMap.resize, 30); else Views.render(v);
    try { if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v); } catch (e) { /* cadre isolé */ }
  }
  function bind() {
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]'); if (!el) return;
      const fn = A[el.dataset.act] || Views.actions[el.dataset.act]; if (fn) { if (el.tagName !== 'A') e.preventDefault(); fn(el.dataset, el); }
    });
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.note) { Game.setNote(t.dataset.note, t.value); flush(); }
      if (t.dataset.pin) Game.updatePin(t.dataset.pin, { label: t.value });
    });
    document.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.filter) { const q = t.value.trim().toLowerCase(); t.parentNode.querySelectorAll('.row[data-name]').forEach(r => { r.hidden = q && !r.dataset.name.includes(q); }); }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id && e.target.id.startsWith('ans-')) { e.preventDefault(); A['en-try']({ key: e.target.id.slice(4) }); }
      if (e.key === 'Escape' && stack.length) closeSheet();
    });
    window.addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== view && $('#v-' + v)) show(v); });
  }

  return {
    $, esc, bind, show, sheet, openSheet, closeSheet, draw, toast, reveal, flush, after, chrome, chBlock, skillName, fmtDist, STATUS,
    get view() { return view; }, sheetIs: fn => stack.length > 0 && stack[stack.length - 1].fn === fn,
    openPlace(id) { openSheet(placeHTML, id); }, openTerritory(id) { A.territory({ id }); }, openPin(id) { openSheet(pinHTML, id); },
    placeHTML, terrStats,
    gpsState(on) { const b = $('#fab-gps'); if (b) b.classList.toggle('on', on); if (!on) { lastNear = null; radar(); } if (typeof Explore !== 'undefined') Explore.gpsChanged(on); },
    onFix(fix) {
      if (typeof Explore !== 'undefined' && fix.far) Explore.onFix(fix);
      if (fix.far) { if (!farWarned) { farWarned = true; toast('Ton GPS te situe loin de Marrakech : la validation par GPS est suspendue, la validation manuelle reste possible.'); } return radar(); }
      const r = Game.proximity(fix, true); r.here.sort((x, y) => x.d - y.d); lastNear = r.here.length ? Object.assign({ here: true }, r.here[0]) : r.nearest;
      if (typeof Explore !== 'undefined') { if (r.discovered.length) Explore.noteDiscovery(); }
      if (r.discovered.length || r.spotted.length) after(); else radar();
      if (typeof Explore !== 'undefined') Explore.onFix(fix);
    },
    onGpsError(err) {
      if (typeof Explore !== 'undefined' && Explore.onGpsError(err)) return;
      const m = { '-1': 'La localisation exige une adresse en https:// : ouvre le jeu depuis son adresse sécurisée.', 1: 'Localisation refusée. Tu peux l\'autoriser dans les réglages du navigateur — ou valider tes découvertes manuellement.', 2: 'Position indisponible pour l\'instant. La validation manuelle reste possible.', 3: 'Le GPS met trop de temps à répondre. Réessaie à ciel ouvert.' };
      toast(m[err && err.code] || 'La localisation n\'est pas disponible ici. La validation manuelle reste possible.');
    }
  };
})();
