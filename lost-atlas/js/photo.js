/* Découvertes photographiques.
   Validation réellement faite, en deux temps, et annoncée comme telle :
     1. géographique  — le GPS situe le joueur dans le rayon du secret (sinon : « sur parole », noté ainsi) ;
     2. par sélection — le joueur dit ce qu'il a photographié parmi plusieurs propositions.
   Ce n'est PAS une reconnaissance d'image : la photo n'est ni analysée ni envoyée. Un validateur « vision » pourra être
   branché plus tard dans VALIDATORS (voir README) ; tant qu'il n'existe pas, rien ne prétend le remplacer. */
const Photo = (() => {
  const { $, esc } = UI, D = window.ATLAS_V3;
  const Q = id => D.photoQuests.find(q => q.id === id);
  let tmp = {};   // état transitoire par secret : { photo, wrong: [], msg }
  const st = () => { const s = V3.st(); s.pq = s.pq || {}; return s.pq; };
  const found = id => !!(st()[id] && st()[id].found);
  const count = () => Object.values(st()).filter(x => x.found).length;

  /* ---------- Validateurs (chaîne extensible) ---------- */
  const VALIDATORS = {
    /* 1. Où est le joueur ? ok:true/false, ou ok:null si le GPS ne peut rien dire. */
    geo(q) {
      const fix = AtlasMap.fix(), po = Game.pos(q.at);
      if (!fix || !po) return { ok: null, how: 'parole', txt: 'Sans GPS : la découverte sera notée « sur parole ».' };
      if (fix.far) return { ok: null, how: 'parole', txt: 'Ton GPS te situe loin de Marrakech : la découverte sera notée « sur parole ».' };
      const d = Game.dist(fix.ll, po.ll), lim = q.r + Math.min(fix.acc, 40);
      if (fix.acc > 80) return { ok: null, how: 'parole', txt: 'GPS trop imprécis (± ' + fix.acc + ' m) pour te situer : la découverte sera notée « sur parole ».' };
      if (d <= lim) return { ok: true, how: 'gps', txt: 'Tu es sur place (GPS ± ' + fix.acc + ' m).' };
      return { ok: false, how: null, txt: 'Le GPS te situe à ' + UI.fmtDist(d) + ' : approche-toi encore.' };
    },
    /* 2. Qu'a-t-il photographié ? */
    choice(q, pick) { return { ok: pick === q.answer }; }
    /* 3. vision(q, photo) : non disponible. Demanderait un modèle embarqué ou un service en ligne (coût, réseau, accord du joueur). */
  };
  function order(q) { const o = q.options.map((_, i) => i); let s = 0; for (const c of q.id) s = (s * 31 + c.charCodeAt(0)) % 997; for (let i = o.length - 1; i > 0; i--) { s = (s * 37 + 11) % 997; const j = s % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; }

  /* ---------- Feuille d'un secret ---------- */
  const diff = n => '<span class="pips">' + [1, 2, 3].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('') + '</span>';
  function html(id) {
    const q = Q(id), s = st()[id] || {}, t = tmp[id] || (tmp[id] = { wrong: [] }), terr = Data.T[Data.P[q.at].t];
    if (s.found) {
      const ph = V3.photoOf(s.kid);
      return `<div class="eyebrow">Secret révélé · ${esc(terr.name)}</div><h2>${esc(q.title)}</h2>
        ${ph ? `<img class="keep-prev" src="${ph}" alt="Ta photo">` : '<p class="note">La photo est restée sur l\'appareil où elle a été prise.</p>'}
        <div class="reveal-txt"><span class="tag k-${q.k}">${D.statuts[q.k]}</span> ${esc(q.reveal)}</div>
        ${q.src ? `<p class="src">Source : ${esc(q.src)}</p>` : ''}<p class="src">Révélé le ${new Date(s.found).toLocaleDateString('fr-FR')} · ${s.how === 'gps' ? 'validé sur place par GPS, puis par ta réponse' : 'validé sur parole, puis par ta réponse'}. La photo n'a pas été analysée.</p>
        <div class="tc-wrap">${V3.cardHTML(V3.cardData(q.reward.card), true)}</div>`;
    }
    const g = VALIDATORS.geo(q);
    let h = `<div class="eyebrow">Secret · ${esc(terr.name)} · difficulté ${diff(q.diff)}</div><h2>Quelque chose attend d'être vu</h2>
      <p class="hand big">${esc(q.riddle)}</p><div class="xstat ${g.ok === true ? 'st-ok' : g.ok === false ? 'st-denied' : 'st-weak'}"><i></i><p>${esc(g.txt)}</p></div>`;
    if (g.ok === false) return h + `<button class="btn wide" data-act="pq-refresh" data-id="${id}">Vérifier ma position</button><p class="src">${esc(D.photoRules)}</p>`;
    h += `<div class="btn-row"><label class="btn ${t.photo ? '' : 'primary'} filebtn">${t.photo ? 'Reprendre la photo' : 'Prendre la photo'}<input type="file" accept="image/*" capture="environment" data-pq-photo="${id}"></label><label class="btn filebtn">Photothèque<input type="file" accept="image/*" data-pq-photo="${id}" data-lib="1"></label></div>`;
    if (t.photo) {
      h += `<img class="keep-prev" src="${t.photo}" alt="Ta photo"><h3>Qu'as-tu photographié ?</h3><div class="pq-opts">${order(q).map(i => `<button class="btn${t.wrong.includes(i) ? ' off' : ''}" ${t.wrong.includes(i) ? 'disabled' : ''} data-act="pq-pick" data-id="${id}" data-i="${i}">${esc(q.options[i])}</button>`).join('')}</div>`;
    }
    if (t.msg) h += `<p class="msg">${esc(t.msg)}</p>`;
    return h + `<p class="src">${esc(D.photoRules)} Ta réponse et ta position valident la découverte ; l'image n'est pas reconnue automatiquement.</p>`;
  }

  /* ---------- Réussite ---------- */
  function succeed(id, how) {
    const q = Q(id), t = tmp[id], fix = AtlasMap.fix(), po = Game.pos(q.at), now = Date.now();
    if (found(id)) return;                                   // jamais deux fois
    const k = { id: 'k' + now, at: now, txt: q.title, pq: id };
    if (fix && !fix.far && how === 'gps') { k.pos = [+fix.ll[0].toFixed(6), +fix.ll[1].toFixed(6)]; } else if (po) k.pos = po.ll.slice();
    k.t = Data.P[q.at].t;
    if (t && t.photo && V3.storePhoto(k.id, t.photo)) k.ph = 1;
    V3.st().kept.push(k);
    st()[id] = Object.assign(st()[id] || {}, { found: now, how, kid: k.id });
    delete tmp[id];
    const first = count() === 1;
    if (first && !Game.S.artifacts['a-lentille']) { Game.S.artifacts['a-lentille'] = now; UI.toast('Artefact obtenu : <b>Lentille d\'arpenteur</b>', 'open-artifact', 'a-lentille'); }
    Game.save();
    Sound.play('recompense');
    V3.give(q.reward.card, 'Secret révélé', true);
    if (first) Sound.play('artefact');
  }

  const actions = {
    'open-pq'(d) { open(d.id); },
    'pq-refresh'(d) { AtlasMap.locateOnce().then(() => UI.draw(false)).catch(() => UI.draw(false)); },
    'pq-pick'(d) {
      const q = Q(d.id), t = tmp[d.id], i = +d.i; if (!t || !t.photo || found(d.id)) return;
      const g = VALIDATORS.geo(q); if (g.ok === false) { t.msg = g.txt; return UI.draw(false); }
      const s = st()[d.id] || (st()[d.id] = {}); s.tries = (s.tries || 0) + 1;
      if (VALIDATORS.choice(q, i).ok) { succeed(d.id, g.how); UI.after(); }
      else { t.wrong.push(i); t.msg = 'Ce n\'est pas ce que cet endroit cache. Regarde encore autour de toi, puis reprends une photo si tu veux.'; Game.save(); UI.draw(false); }
    }
  };
  function open(id) { UI.openSheet(html, id); }
  function init() {
    Object.assign(Views.actions, actions);
    document.addEventListener('change', e => {
      const el = e.target, id = el.dataset.pqPhoto; if (!id) return;
      if (!el.files || !el.files[0]) return;                 // prise de vue annulée : rien ne change
      V3.shrink(el.files[0]).then(u => { (tmp[id] = tmp[id] || { wrong: [] }).photo = u; tmp[id].msg = ''; UI.draw(false); })
        .catch(() => { (tmp[id] = tmp[id] || { wrong: [] }).msg = 'Cette image n\'a pas pu être lue. Réessaie.'; UI.draw(false); });
    });
  }
  /* Marqueurs : un secret n'apparaît sur la carte qu'après son signal, ou une fois révélé. */
  function draw(layer) {
    const heard = V3.st().heard || {}, seen = {};
    for (const q of D.photoQuests) {
      const po = Game.pos(q.at), f = found(q.id); if (!po || (!f && !heard['q:' + q.id])) continue;
      const n = seen[q.at] = (seen[q.at] || 0) + 1;      // deux secrets au même endroit : marqueurs décalés
      L.marker([po.ll[0], po.ll[1] + (n - 1) * 0.00014], { zIndexOffset: 500, icon: L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 34], html: `<div class="smk${f ? ' ok' : ''}">${f ? '✦' : '?'}</div>` }) }).on('click', () => open(q.id)).addTo(layer);
    }
  }
  return { init, open, html, found, count, draw, quests: () => D.photoQuests, validators: VALIDATORS, state: st };
})();
