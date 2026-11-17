/* Jeu v3 : cartes de collection, sac, personnage, carnet (« Garder »), donjons, dérives, échos.
   Module additif : il s'appuie sur Game / UI / Views de la v2 et ne modifie pas le format des sauvegardes existantes
   (tout son état vit dans Game.S.v3 ; les photos dans une clé locale séparée). */
const V3 = (() => {
  const D = window.ATLAS_V3, { $, esc } = UI;
  const PKEY = 'lostAtlas.photos.v1';
  const RAR = { commune: 'c', rare: 'r', legendaire: 'l' }, RNAME = { commune: 'Commune', rare: 'Rare', legendaire: 'Légendaire' };
  const SLOTS = [['tenue', 'Tenue'], ['coiffe', 'Coiffe'], ['objet', 'Objet']];
  const now = () => Date.now();
  const day = t => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = t => new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dkey = t => { const d = new Date(t); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  let sacTab = 'cartes', tmpKeep = null, fxQueue = [], fxOn = false, base = {};

  /* ---------- État ---------- */
  function st() {
    const S = Game.S;
    if (!S.v3 || !S.v3.hero) {
      S.v3 = Object.assign({ kept: [], cards: {}, adv: {}, echo: {}, derive: 0, seen: null }, S.v3 || {});
      S.v3.hero = Object.assign({ name: '', tenue: 'o-veste', coiffe: 'o-nu', objet: 'o-carnet' }, S.v3.hero || {});
    }
    return S.v3;
  }
  const loadPhotos = () => PhotoStore.cache();   // les photos vivent dans IndexedDB (js/photostore.js)

  /* ---------- Glyphes des cartes ---------- */
  const SV = (inner, vb) => `<svg viewBox="${vb || '0 0 64 64'}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const G = {
    fontaine: '<path d="M12 56V26a20 20 0 0 1 40 0v30"/><path d="M8 56h48"/><path d="M18 46h28v6H18Z"/><path d="M32 22v6"/><path d="M32 28c-5 5-6 9-6 12M32 28c5 5 6 9 6 12M32 28v14" stroke-width="1.6"/><circle cx="32" cy="20" r="2.5"/>',
    minaret: '<path d="M24 58V20h16v38"/><path d="M22 20h20M26 20v-8h12v8M32 12V4"/><circle cx="32" cy="7" r="2"/><path d="M29 30h6v8h-6ZM29 44h6v8h-6Z"/><path d="M14 58h36"/>',
    palais: '<path d="M6 54h52M10 54V22h44v32"/><path d="M16 54V38a6 6 0 0 1 12 0v16M36 54V38a6 6 0 0 1 12 0v16"/><path d="M10 22l22-12 22 12"/>',
    cour: '<rect x="8" y="8" width="48" height="48"/><rect x="20" y="20" width="24" height="24"/><circle cx="32" cy="32" r="5"/><path d="M8 8l12 12M56 8 44 20M8 56l12-12M56 56 44 44"/>',
    arc: '<path d="M14 58V30c0-12 8-20 18-22 10 2 18 10 18 22v28"/><path d="M22 58V32c0-7 4-12 10-14 6 2 10 7 10 14v26"/><path d="M8 58h48"/>',
    etal: '<path d="M8 24h48l-4-12H12Z"/><path d="M12 24v32M52 24v32M8 56h48"/><path d="M18 40h28v16H18Z"/><circle cx="26" cy="36" r="3"/><circle cx="34" cy="35" r="4"/><circle cx="42" cy="36" r="3"/>',
    hammam: '<path d="M10 54V34a22 22 0 0 1 44 0v20Z"/><path d="M6 54h52"/><circle cx="22" cy="34" r="2"/><circle cx="32" cy="26" r="2"/><circle cx="42" cy="34" r="2"/><path d="M26 54V44h12v10"/>',
    jardin: '<rect x="8" y="8" width="48" height="48"/><path d="M32 8v48M8 32h48"/><circle cx="32" cy="32" r="6"/><path d="M18 20c3-4 5 0 4 4M44 18c3-4 5 0 4 4M18 44c3-4 5 0 4 4M44 42c3-4 5 0 4 4"/>',
    echeveau: '<path d="M6 12h52"/><path d="M16 12c-4 14-2 28 2 40 3-12 5-26 2-40M30 12c-4 14-2 28 2 40 3-12 5-26 2-40M44 12c-4 14-2 28 2 40 3-12 5-26 2-40"/>',
    fondouk: '<path d="M6 58V10h52v48"/><path d="M22 58V30a10 10 0 0 1 20 0v28"/><path d="M6 24h52"/><path d="M12 16h6M26 16h12M46 16h6"/><circle cx="38" cy="44" r="1.5" fill="currentColor"/>',
    coupole: '<path d="M12 56V36h40v20"/><path d="M14 36a18 18 0 0 1 36 0"/><path d="M32 18v-8"/><circle cx="32" cy="8" r="2"/><path d="M26 56V46a6 6 0 0 1 12 0v10M8 56h48"/>',
    cuves: '<circle cx="18" cy="20" r="9"/><circle cx="42" cy="20" r="9"/><circle cx="18" cy="44" r="9"/><circle cx="42" cy="44" r="9"/><path d="M13 20c3-3 7 3 10 0M37 44c3-3 7 3 10 0"/>',
    rempart: '<path d="M4 56V22h8v-6h8v6h8v-6h8v6h8v-6h8v6h8v34Z"/><path d="M14 34h2M28 34h2M42 34h2M20 44h2M36 44h2M50 44h2"/>',
    stele: '<path d="M20 56V24a12 12 0 0 1 24 0v32Z"/><path d="M12 56h40"/><path d="M26 30h12M26 38h12"/>',
    flacon: '<path d="M26 8h12v10l8 10v22a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6V28l8-10Z"/><path d="M24 8h16"/><path d="M18 36h28"/>',
    facade: '<path d="M10 58V14h44v44"/><path d="M10 24h44"/><path d="M18 32h8v10h-8ZM38 32h8v10h-8ZM27 58V46h10v12"/><path d="M6 58h52"/>',
    clocher: '<path d="M24 58V24l8-14 8 14v34"/><path d="M32 10V4M29 7h6"/><path d="M29 30h6v8h-6Z"/><path d="M14 58h36"/>',
    place: '<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="12" stroke-dasharray="3 4"/><circle cx="32" cy="32" r="3" fill="currentColor"/><path d="M32 8v6M32 50v6M8 32h6M50 32h6"/>',
    dedale: '<path d="M8 8h48v48H8Z"/><path d="M8 20h30v12H20v12h24V20"/><path d="M56 32H44M32 56V44"/><circle cx="32" cy="38" r="2.5" fill="currentColor"/>',
    echo: '<circle cx="20" cy="32" r="12"/><circle cx="44" cy="32" r="12"/><path d="M26 32h12" stroke-dasharray="2 3"/>'
  };
  const glyph = k => G[k] ? SV(G[k]) : Art.artifact(k);
  const ICON = {
    carnet: SV('<path d="M14 8h34a4 4 0 0 1 4 4v44H18a4 4 0 0 1-4-4Z"/><path d="M14 50a4 4 0 0 1 4-4h34"/><path d="M36 8v20l-5-4-5 4V8"/>'),
    sac: SV('<path d="M12 24h40l4 30a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z"/><path d="M22 24v-6a10 10 0 0 1 20 0v6"/><path d="M24 36h16"/>'),
    aventure: SV('<path d="M10 58V26a22 22 0 0 1 44 0v32"/><path d="M22 58V34a10 10 0 0 1 20 0v24"/><path d="M6 58h52"/><path d="M32 40v6"/>'),
    garder: SV(`<path d="${Art.star8(32, 32, 22)}"/><circle cx="32" cy="32" r="5" fill="currentColor"/>`)
  };

  /* ---------- Personnage ---------- */
  const INK = '#2E241B';
  function avatar(h) {
    h = h || st().hero; const o = id => (D.outfits.find(x => x.id === id) || {}).art;
    const tenue = o(h.tenue), coiffe = o(h.coiffe), objet = o(h.objet);
    let s = '';
    // corps
    if (tenue === 'djellaba') s += `<path d="M38 66c-6 30-10 62-10 94h64c0-32-4-64-10-94-6-6-38-6-44 0Z" fill="#B66D4D" stroke="${INK}" stroke-width="2.5"/><path d="M60 62v98" stroke="${INK}" stroke-width="1.6"/><path d="M52 66l8 12 8-12" stroke="${INK}" stroke-width="2" fill="none"/>`;
    else if (tenue === 'burnous') s += `<path d="M40 68c-4 30-6 60-6 92h52c0-32-2-62-6-92Z" fill="#D9C6A0" stroke="${INK}" stroke-width="2.5"/><path d="M34 64c-16 26-20 60-18 92l22-8 6-84ZM86 64c16 26 20 60 18 92l-22-8-6-84Z" fill="#203B32" stroke="${INK}" stroke-width="2.5"/><path d="M20 150l18-6M100 150l-18-6" stroke="#B49A62" stroke-width="3"/>`;
    else s += `<path d="M44 112h14l-2 48H42ZM62 112h14l2 48H64Z" fill="#44372C" stroke="${INK}" stroke-width="2.5"/><path d="M36 68c-4 14-5 30-4 46h56c1-16 0-32-4-46-6-6-42-6-48 0Z" fill="#8B9B80" stroke="${INK}" stroke-width="2.5"/><path d="M60 64v50M50 68l10 14 10-14" stroke="${INK}" stroke-width="2" fill="none"/><path d="M40 92h12M68 92h12" stroke="${INK}" stroke-width="2"/><path d="M40 160h18M62 160h18" stroke="${INK}" stroke-width="4"/>`;
    // bras
    s += `<path d="M36 72c-8 12-10 26-8 40M84 72c8 12 10 26 8 40" stroke="${INK}" stroke-width="2.5" fill="none"/>`;
    // tête
    s += `<circle cx="60" cy="40" r="17" fill="#E7DABF" stroke="${INK}" stroke-width="2.5"/><path d="M53 41h.1M67 41h.1" stroke="${INK}" stroke-width="3.4"/><path d="M55 49c3 2.5 7 2.5 10 0" stroke="${INK}" stroke-width="2" fill="none"/>`;
    if (coiffe === 'cheche') s += `<path d="M42 36c2-16 34-16 36 0-8-6-28-6-36 0Z" fill="#2F4FA8" stroke="${INK}" stroke-width="2.5"/><path d="M44 30c10-6 22-6 32 0M46 56c8 8 20 8 28 0l-4 12H50Z" fill="#2F4FA8" stroke="${INK}" stroke-width="2.5"/>`;
    else if (coiffe === 'paille') s += `<ellipse cx="60" cy="28" rx="30" ry="7" fill="#D9C6A0" stroke="${INK}" stroke-width="2.5"/><path d="M46 28c0-16 28-16 28 0" fill="#D9C6A0" stroke="${INK}" stroke-width="2.5"/><path d="M46 26h28" stroke="#B66D4D" stroke-width="3"/>`;
    else s += `<path d="M43 36c2-18 32-18 34 0-10-8-24-8-34 0Z" fill="#44372C" stroke="${INK}" stroke-width="2.5"/>`;
    // objet
    if (objet === 'sacoche') s += `<path d="M40 68 84 112" stroke="#8E4B31" stroke-width="3"/><rect x="74" y="106" width="22" height="20" rx="3" fill="#B66D4D" stroke="${INK}" stroke-width="2.5"/><path d="M74 113h22" stroke="${INK}" stroke-width="2"/>`;
    else if (objet === 'lanterne') s += `<path d="M96 104v8" stroke="${INK}" stroke-width="2.5"/><path d="M88 112h16l3 8v14l-3 5H88l-3-5v-14Z" fill="#C9A227" stroke="${INK}" stroke-width="2.5"/><path d="M85 120h22M85 134h22" stroke="${INK}" stroke-width="1.6"/>`;
    else if (objet === 'appareil') s += `<path d="M44 70 90 108" stroke="#44372C" stroke-width="2.5"/><rect x="78" y="104" width="26" height="18" rx="3" fill="#44372C" stroke="${INK}" stroke-width="2.5"/><circle cx="91" cy="113" r="5.5" fill="#B49A62" stroke="${INK}" stroke-width="2"/><path d="M82 104v-3h7v3" stroke="${INK}" stroke-width="2" fill="#44372C"/>`;
    else if (objet === 'longuevue') s += `<path d="M86 104l22-14 4 7-22 14Z" fill="#B49A62" stroke="${INK}" stroke-width="2.5"/><path d="M98 96l4 7" stroke="${INK}" stroke-width="2"/>`;
    else s += `<rect x="84" y="104" width="16" height="22" rx="2" fill="#203B32" stroke="${INK}" stroke-width="2.5"/><path d="M88 104v22" stroke="#B49A62" stroke-width="2"/>`;
    return `<svg class="avatar" viewBox="0 0 120 170" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Ton personnage">${s}</svg>`;
  }

  /* ---------- Conditions, tenues ---------- */
  const advDone = id => !!(st().adv[id] && st().adv[id].done);
  const echoCount = () => Object.values(st().echo).filter(e => e.txt).length;
  function cond(c) {
    if (c.adv) return advDone(c.adv);
    if (c.kept) return st().kept.length >= c.kept;
    if (c.echo) return echoCount() >= c.echo;
    if (c.photos) return Photo.count() >= c.photos;
    return Game.cond(c);
  }
  const hasOutfit = o => cond(o.unlock);

  /* ---------- Quêtes de territoire : trois buts, sans ordre, calculés à partir de ce que le joueur a réellement fait ---------- */
  const TQ_ART = { t1: 'place', t2: 'fontaine', t3: 'cour', t4: 'rempart', t5: 'porte', t6: 'facade' };
  function tq(tid) {
    const cul = Data.places.filter(p => p.ref === p.id && p.kind === 'culture' && p.t === tid), obsAll = cul.filter(p => p.fiche && p.fiche.observe);
    const need = Math.min(5, Math.ceil(cul.length / 2)), no = Math.min(2, obsAll.length);
    const goals = [
      { n: cul.filter(p => Game.disc(p.id)).length, of: need, label: 'Trouver ' + need + ' lieux culturels', hint: 'N\'importe lesquels, parmi les ' + cul.length + ' du territoire.' },
      { n: obsAll.filter(p => Game.chDone(Game.chKey(p.id, 'observe'))).length, of: no, label: 'Regarder avant de lire, dans ' + no + ' lieux', hint: 'Une observation se fait dans la fiche d\'un lieu trouvé.' },
      { n: st().kept.filter(k => k.t === tid).length, of: 1, label: 'Garder une chose vue ici', hint: 'Avec « Garder ». Sans GPS, pose ta note sur la carte depuis le Carnet pour qu\'elle compte.' }
    ];
    return { goals, done: goals.every(g => g.n >= g.of), n: goals.filter(g => g.n >= g.of).length };
  }
  function tqHTML(tid) {
    const t = Data.T[tid], q = tq(tid), c = cardData('c-terr-' + tid);
    return `<div class="t-head" style="--tc:${t.color}"><div class="t-num">${t.num}</div><div><div class="eyebrow">Quête de territoire</div><h2>${esc(t.name)}</h2><div class="sub">${esc(t.sub)}</div></div></div>
      <p class="p-text">Trois buts, dans l'ordre que tu veux, sans délai. Ils se remplissent tout seuls à mesure que tu explores.</p>
      ${q.goals.map(g => `<section class="room${g.n >= g.of ? ' ok' : ''}"><div class="eyebrow">${g.n >= g.of ? 'Accompli' : Math.min(g.n, g.of) + ' / ' + g.of}</div><h3>${esc(g.label)}</h3><p class="src">${esc(g.hint)}</p></section>`).join('')}
      <div class="btn-row"><button class="btn primary" data-act="terr-map" data-id="${tid}">Voir sur la carte</button><button class="btn" data-act="territory" data-id="${tid}">Liste des lieux</button></div>
      ${(() => { const qs = Data.quests.filter(x => x.t === tid && Game.questStatus(x) !== 'locked'), dn = qs.filter(x => Game.questStatus(x) === 'done').length; const adv = D.adventures.filter(a => a.t === tid);
        return (adv.length ? '<h3>Donjon</h3>' + adv.map(a => `<button class="row" data-act="open-adv" data-id="${a.id}"><span class="rt"><b>${esc(a.title)}</b><small>${advDone(a.id) ? 'Cœur atteint' : st().adv[a.id] ? 'En cours' : 'Pas encore entré'}</small></span><span class="chev">›</span></button>`).join('') : '')
          + (qs.length ? `<h3>Quêtes du territoire · ${dn} / ${qs.length}</h3><div class="rows">` + qs.map(x => { const s2 = Game.questStatus(x); return `<button class="row" data-act="open-quest" data-id="${x.id}"><span class="sig ${s2 === 'done' ? 'k-aventure' : s2 === 'active' ? 'k-secret' : ''}"></span><span class="rt"><b>${esc(x.title)}</b><small>${s2 === 'done' ? 'Accomplie' : s2 === 'active' ? 'En cours · ' + Game.questProgress(x) + ' / ' + x.steps.length : x.steps.length + ' étape' + (x.steps.length > 1 ? 's' : '')}</small></span><span class="chev">›</span></button>`; }).join('') + '</div><p class="src">Facultatives : elles ne comptent pas pour le sceau.</p>' : ''); })()}
      <h3>Récompense</h3><div class="tc-wrap">${cardHTML(c, c.owned)}</div><p class="src">${c.owned ? 'Sceau obtenu le ' + new Date(c.at).toLocaleDateString('fr-FR') + '.' : 'Le sceau du territoire, une carte rare.'}</p>`;
  }

  /* ---------- Cartes ---------- */
  const placeCards = () => Data.places.filter(p => p.ref === p.id && p.kind === 'culture');
  const rarity = p => p.pos ? 'commune' : 'rare';
  function cardData(id) {
    const sp = D.specialCards.find(c => c.id === id);
    if (sp) return { id, special: true, name: sp.name, art: sp.art, rarity: sp.rarity, t: sp.t, line: sp.line, how: sp.how, at: st().cards[id] || 0, owned: !!st().cards[id] };
    if (id.startsWith('c-terr-')) { const t = Data.T[id.slice(7)]; return { id, special: true, name: 'Sceau de ' + t.name, art: TQ_ART[t.id] || 'zellige', rarity: 'rare', t: t.id, line: 'Ce territoire n\'est plus une tache sur la carte : tu y as marché, regardé, gardé.', how: 'Accomplir la quête de ce territoire.', at: st().cards[id] || 0, owned: !!st().cards[id] }; }
    const p = Data.P[id]; if (!p) return null;
    const ps = Game.pget(id), f = p.fiche || {};
    return { id, num: p.num, name: p.name, art: D.cardArt[id] || 'zellige', rarity: rarity(p), t: p.t, line: f.teaser || '', at: ps.d || 0, owned: Game.disc(id),
      sealed: !!f.observe && Game.chDone(Game.chKey(id, 'observe')) };
  }
  const ownedCount = () => placeCards().filter(p => Game.disc(p.id)).length + Object.keys(st().cards).length;
  function cardHTML(c, big) {
    const t = c.t ? Data.T[c.t] : null, r = RAR[c.rarity];
    if (!c.owned) return `<button class="tc back" data-act="open-card" data-id="${c.id}" aria-label="Carte non trouvée"><span class="tc-b">${SV(`<path d="${Art.star8(32, 32, 20)}"/>`)}</span></button>`;
    return `<${big ? 'div' : 'button'} class="tc r-${r}${big ? ' big' : ''}" ${big ? '' : `data-act="open-card" data-id="${c.id}"`} style="--tc:${t ? t.color : '#B49A62'}">
      <span class="tc-top"><b>${t ? t.num : '✦'}</b><i>${RNAME[c.rarity]}</i></span>
      <span class="tc-art">${glyph(c.art)}</span>
      <span class="tc-name">${esc(c.name)}</span>
      ${c.num ? `<span class="tc-no">N° ${c.num}</span>` : ''}${c.sealed ? '<span class="tc-seal" title="Observé">✦</span>' : ''}</${big ? 'div' : 'button'}>`;
  }
  function cardSheet(id) {
    const c = cardData(id);
    if (!c.owned) return `<div class="tc-wrap">${cardHTML(c)}</div><div class="eyebrow">Carte non trouvée</div><h2>Une carte dort quelque part</h2><p class="p-text">${c.special ? esc(c.how) : 'Elle appartient à un lieu que tu n\'as pas encore trouvé. Aucune liste ne te dira lequel.'}</p>`;
    return `<div class="tc-wrap">${cardHTML(c, true)}</div><div class="eyebrow">${RNAME[c.rarity]}${c.at ? ' · trouvée le ' + new Date(c.at).toLocaleDateString('fr-FR') : ''}</div><h2>${esc(c.name)}</h2>
      ${c.line ? `<p class="intro">${esc(c.line)}</p>` : ''}
      ${c.special ? '' : `<p class="src">${c.rarity === 'rare' ? 'Rare : ce lieu n\'était pas sur la carte, il fallait le trouver.' : 'Carte de lieu.'}${c.sealed ? ' Sceau : tu y as regardé avant de lire.' : (Data.P[id].fiche && Data.P[id].fiche.observe ? ' Elle gagnera un sceau si tu prends le temps d\'y observer.' : '')}</p>
      <button class="btn primary wide" data-act="push-place" data-id="${id}">Ouvrir le lieu</button>`}`;
  }
  /* Révélation d'une carte : une seule animation, courte, qu'un toucher referme. */
  function fx(id, sub, quiet) { fxQueue.push({ id, sub, quiet }); if (!fxOn) nextFx(); }
  function nextFx() {
    const it = fxQueue.shift(), id = it && it.id; let el = $('#cardfx');
    if (!id) { fxOn = false; if (el) el.classList.remove('on'); return; }
    fxOn = true;
    if (!el) { el = document.createElement('button'); el.id = 'cardfx'; el.dataset.act = 'fx-close'; $('#app').appendChild(el); }
    const c = cardData(id); if (!it.quiet) Sound.play('carte');
    el.innerHTML = `<span class="fx-sub">${esc(it.sub || 'Nouvelle carte')}</span><span class="flip"><span class="flip-in">${cardHTML(Object.assign({}, c, { owned: true }), true)}<span class="tc back big"><span class="tc-b">${SV(`<path d="${Art.star8(32, 32, 20)}"/>`)}</span></span></span></span><span class="fx-hint">Touche pour continuer</span>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
  }

  /* ---------- Synchronisation : ce qui découle de ce que le joueur a fait ---------- */
  function sync(silent) {
    const s = st(), fresh = [];
    const give = id => { if (!s.cards[id]) { s.cards[id] = now(); fresh.push(id); } };
    if (Game.count('charted') >= 1) give('c-arpenteur');
    if (echoCount() >= 1) give('c-echo');
    for (const a of D.adventures) if (advDone(a.id) && a.reward.card) give(a.reward.card);
    for (const q of Data.quests) if (q.reward.card && Game.S.quests[q.id] && Game.S.quests[q.id].done) give(q.reward.card);
    for (const t of Data.territories) if (!s.cards['c-terr-' + t.id] && tq(t.id).done) { give('c-terr-' + t.id); if (!silent) { Sound.play('recompense'); UI.toast('Quête de territoire accomplie : <b>' + esc(t.name) + '</b>', 'open-tq', t.id); } }
    const first = !s.seen; if (first) s.seen = {};
    for (const o of D.outfits) if (!s.seen[o.id] && hasOutfit(o)) { s.seen[o.id] = now(); if (!first && !silent && !o.unlock.start) { Sound.play('tenue'); UI.toast('Nouvelle tenue : <b>' + esc(o.name) + '</b>', 'open-sac', 'tenues'); } }
    if (fresh.length || first) Game.save();
    if (!silent) fresh.forEach(id => fx(id));
  }
  function onEvents(evs) {
    for (const e of evs) if (e.type === 'discover' && Data.P[e.id].kind === 'culture') fx(e.id, 'Nouvelle carte', true);
    sync(false);
  }

  /* ---------- Géométrie ---------- */
  function inPoly(ll, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > ll[1]) !== (b[1] > ll[1]) && ll[0] < (b[0] - a[0]) * (ll[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  const terrOf = ll => { const t = Data.territories.find(x => inPoly(ll, x.polygon)); return t ? t.id : null; };

  function nearPlace(ll) {   // lieu culturel connu à moins de 60 m, s'il y en a un
    let best = null, bd = 60;
    for (const p of Data.places) { if (p.ref !== p.id || p.kind !== 'culture') continue; const po = Game.pos(p.id); if (!po) continue; const d = Game.dist(ll, po.ll); if (d < bd) { bd = d; best = p.id; } }
    return best;
  }
  function storePhoto(id, dataUrl) {
    PhotoStore.persist(); const ok = PhotoStore.put(id, dataUrl);
    PhotoStore.estimate().then(e => { if ((e.quota && e.usage / e.quota > 0.8) || e.bytes > 60 * 1048576) UI.toast('Le stockage des photos se remplit : pense à exporter une sauvegarde complète, puis à retirer des photos.'); });
    return ok;
  }
  /* Sauvegarde complète : la partie ET les photos, dans un seul fichier (peut peser plusieurs Mo). */
  function exportFull() {
    const name = 'lost-atlas-complet-' + new Date().toISOString().slice(0, 10) + '.json', msg = $('#export-msg');
    const blob = new Blob([JSON.stringify({ lostAtlasBackup: 1, at: now(), save: Game.S, photos: PhotoStore.cache() })], { type: 'application/json' });
    const dl = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); if (msg) msg.textContent = 'Fichier « ' + name + ' » créé : cherche-le dans Fichiers → Téléchargements.'; } catch (e) { if (msg) msg.textContent = 'Téléchargement impossible dans cet affichage.'; } };
    try { const f = new File([blob], name, { type: 'application/json' }); if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: 'Sauvegarde Lost Atlas' }).catch(() => {}); return; } } catch (e) { /* partage indisponible */ }
    dl();
  }
  const photoOf = id => (id && loadPhotos()[id]) || null;
  function give(cardId, sub, quiet) { const s = st(); if (s.cards[cardId]) return false; s.cards[cardId] = now(); Game.save(); fx(cardId, sub, quiet); return true; }

  /* ---------- Garder ---------- */
  function keepHTML() {
    const fix = AtlasMap.fix(), ok = fix && !fix.far;
    return `<div class="eyebrow">Carnet</div><h2>Garder</h2><p class="p-text">Une lumière, une porte, un nom de rue, une odeur. Pas besoin de raison : ce que tu gardes n'a pas à servir.</p>
      <textarea id="keep-txt" rows="2" maxlength="240" placeholder="Trois mots suffisent (tu peux dicter)"></textarea>
      <textarea id="keep-note" rows="2" maxlength="600" placeholder="Une note, si tu veux (facultatif)"></textarea>
      <div class="btn-row"><label class="btn filebtn">${tmpKeep && tmpKeep.photo ? 'Reprendre la photo' : 'Prendre une photo'}<input type="file" id="keep-photo" accept="image/*" capture="environment" data-keep-photo="1"></label><label class="btn filebtn">Photothèque<input type="file" id="keep-lib" accept="image/*" data-keep-photo="1"></label></div>
      ${tmpKeep && tmpKeep.photo ? `<img class="keep-prev" src="${tmpKeep.photo}" alt="Aperçu de ta photo">` : ''}
      <p class="src">${ok ? 'Sera situé à ta position (GPS ± ' + fix.acc + ' m).' : 'Sans GPS : la note ne sera pas située. Tu pourras la poser sur la carte ensuite.'} Ne photographie personne sans son accord.</p>
      <button class="btn primary wide big" data-act="keep-go">Garder</button><p class="msg" id="keep-msg"></p>`;
  }
  function shrink(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        try { res(c.toDataURL('image/jpeg', 0.62)); } catch (e) { rej(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
      img.src = url;
    });
  }
  function keep(txt, photo, note) {
    const s = st(), fix = AtlasMap.fix(), k = { id: 'k' + now(), at: now(), txt: (txt || '').trim() };
    if (note && note.trim()) k.note = note.trim();
    if (fix && !fix.far) { k.pos = [+fix.ll[0].toFixed(6), +fix.ll[1].toFixed(6)]; k.t = terrOf(k.pos); const n = nearPlace(k.pos); if (n) k.near = n; }
    if (photo && storePhoto(k.id, photo)) k.ph = 1;
    // un donjon en cours accueille la trouvaille comme une salle libre
    const adv = D.adventures.find(a => s.adv[a.id] && !s.adv[a.id].done && (!k.t || k.t === a.t));
    if (adv) { const fr = adv.rooms.find(r => r.kind === 'free'); if (fr && !s.adv[adv.id].rooms[fr.id]) { s.adv[adv.id].rooms[fr.id] = now(); k.adv = adv.id; } }
    s.kept.push(k); Game.save(); return k;
  }
  function keptHTML(k) {
    const ph = k.ph && loadPhotos()[k.id], t = k.t && Data.T[k.t];
    return `<article class="kept${k.pq ? ' secret' : ''}">${k.pq ? '<div class="eyebrow">Secret révélé</div>' : ''}${ph ? `<img src="${ph}" alt="">` : ''}${k.txt ? `<p class="hand">${esc(k.txt)}</p>` : ''}${k.note ? `<p class="p-text knote">${esc(k.note)}</p>` : ''}
      <footer><time>${hour(k.at)}</time>${k.near && Game.disc(k.near) ? `<span>près de ${esc(Data.P[k.near].name)}</span>` : t ? `<span>${esc(t.name)}</span>` : ''}${k.adv ? '<span>dans un donjon</span>' : ''}${k.pq ? `<button data-act="open-pq" data-id="${k.pq}">Relire</button>` : ''}
      ${k.pos ? `<button data-act="kept-show" data-id="${k.id}">Voir sur la carte</button>` : `<button data-act="kept-place" data-id="${k.id}">Poser sur la carte</button>`}<button data-act="kept-del" data-id="${k.id}">Retirer</button></footer></article>`;
  }
  function drawKept(layer) {
    for (const k of st().kept) if (k.pos) L.marker(k.pos, { zIndexOffset: 350, icon: L.divIcon({ className: '', iconSize: [26, 26], iconAnchor: [13, 13], html: '<div class="kmk">✦</div>' }) })
      .on('click', () => { UI.show('carnet'); }).addTo(layer);
    Photo.draw(layer);
  }

  /* ---------- Échos ---------- */
  function seenAt(x) {   // date à laquelle un côté d'écho a été vu : lieu découvert, ou salle de donjon franchie
    if (x.startsWith('room:')) { const [, a, r] = x.split(':'), s = st().adv[a]; return s && s.rooms[r] || 0; }
    return Game.disc(x) ? (Game.pget(x).d || 1) : 0;
  }
  const sideB = e => [e.b].concat(e.alt || []).find(seenAt);
  function echoReady() {
    const s = st();
    return D.echoes.find(e => !(s.echo[e.id] && (s.echo[e.id].txt || s.echo[e.id].skip)) && seenAt(e.a) && sideB(e));
  }
  function echoHTML(e, open) {
    const s = st().echo[e.id] || {}, b = sideB(e) || e.b;
    const side = id => {
      const at = seenAt(id); let c;
      if (id.startsWith('room:')) { const [, a, r] = id.split(':'), room = advOf(a).rooms.find(x => x.id === r); c = { id, owned: true, name: room.title, art: room.art || 'fondouk', rarity: 'commune', t: advOf(a).t }; }
      else c = cardData(id);
      return `<div class="eco-side">${cardHTML(c, true)}<time>${at > 1 ? new Date(at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</time></div>`;
    };
    let h = `<section class="eco"><div class="eco-pair">${side(e.a)}${side(b)}</div>`;
    if (s.txt) h += `<p class="hand">${esc(s.txt)}</p><div class="reveal-txt ink"><span class="tag k-${e.k}">${D.statuts[e.k]}</span> ${esc(e.t)}</div>`;
    else if (open) h += `<textarea id="eco-${e.id}" rows="2" placeholder="Si tu vois ce qui les relie, écris-le"></textarea><div class="btn-row"><button class="btn primary" data-act="eco-go" data-id="${e.id}">Écrire le lien</button><button class="btn ghost" data-act="eco-skip" data-id="${e.id}">Tourner la page</button></div>`;
    return h + '</section>';
  }

  /* ---------- Aventures ---------- */
  const advOf = id => D.adventures.find(a => a.id === id);
  function roomDone(a, r) {
    const s = st().adv[a.id];
    if (r.kind === 'observe') return Game.chDone(Game.chKey(r.place, 'observe'));
    return !!(s && s.rooms[r.id]);
  }
  const roomsDone = a => a.rooms.filter(r => roomDone(a, r)).length;
  const pips = (n, of, need) => '<span class="pips">' + Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}${i === need - 1 ? ' key' : ''}"></i>`).join('') + '</span>';
  function derive() { return D.derives[st().derive % D.derives.length]; }
  function aventuresView() {
    let h = `<header class="vh"><div class="eyebrow">Rien n'est obligatoire</div><h1>Aventures</h1><p class="lead">Des invitations. Tu peux t'en écarter, y revenir dans une heure ou dans un mois.</p></header>`;
    h += `<section class="derive"><div class="eyebrow">Dérive</div><p class="hand big">${esc(derive())}</p><p class="src">${esc(D.deriveRules)}</p><button class="btn ghost" data-act="derive-next">Une autre</button></section>`;
    for (const a of D.adventures) {
      const s = st().adv[a.id], n = roomsDone(a), t = Data.T[a.t];
      h += `<button class="dj${s && s.done ? ' done' : ''}" data-act="open-adv" data-id="${a.id}" style="--tc:${t.color}"><span class="dj-art">${glyph('dedale')}</span><span class="dj-t"><span class="eyebrow">${a.kind} · territoire ${t.num}</span><b>${esc(a.title)}</b><small>${esc(a.mood)}</small>
        ${s ? pips(n, a.rooms.length, a.need) + `<small>${s.done ? 'Cœur atteint' : n >= a.need ? 'Le cœur est ouvert' : n + ' salle' + (n > 1 ? 's' : '') + ' franchie' + (n > 1 ? 's' : '')}</small>` : '<small>Pas encore entré</small>'}</span><span class="chev">›</span></button>`;
    }
    h += '<h3>Quêtes de territoire</h3><div class="tqs">' + Data.territories.map(t => { const q = tq(t.id);
      return `<button class="tq${q.done ? ' done' : ''}" data-act="open-tq" data-id="${t.id}" style="--tc:${t.color}"><span class="num dia"><b>${t.num}</b></span><span class="rt"><b>${esc(t.name)}</b><small>${q.done ? 'Accomplie' : q.n + ' but' + (q.n > 1 ? 's' : '') + ' sur 3'}</small></span>${pips(q.n, 3, 0)}<span class="chev">›</span></button>`; }).join('') + '</div>';
    return h + '<h3 class="qtitle">Invitations</h3><p class="note">Chacune donne une raison d\'aller quelque part. Aucune ne se remplit comme un formulaire.</p>' + questList();
  }
  function advHTML(id) {
    const a = advOf(id), s = st().adv[id], t = Data.T[a.t], n = roomsDone(a);
    let h = `<div class="t-head" style="--tc:${t.color}"><div class="t-num">${glyph('dedale')}</div><div><div class="eyebrow">${a.kind} · ${esc(t.name)}</div><h2>${esc(a.title)}</h2><div class="sub">${esc(a.mood)}</div></div></div><p class="p-text">${esc(a.intro)}</p>`;
    if (!s) return h + `<button class="btn primary wide big" data-act="adv-start" data-id="${id}">Entrer</button><p class="note">Entrer n'engage à rien : aucun compte à rebours, aucun ordre.</p>`;
    h += `<div class="dj-prog">${pips(n, a.rooms.length, a.need)}<span>${n} / ${a.rooms.length} salles · le cœur s'ouvre à ${a.need}</span></div>`;
    for (const r of a.rooms) {
      const ok = roomDone(a, r), rs = s.r && s.r[r.id] || {};
      h += `<section class="room${ok ? ' ok' : ''}"><div class="eyebrow">${ok ? 'Franchie' : 'Salle'}</div><h3>${esc(r.title)}</h3><p class="p-text">${esc(r.hint)}</p>`;
      if (r.kind === 'observe') h += `<button class="btn${ok ? ' ghost' : ''}" data-act="push-place" data-id="${r.place}">${Game.disc(r.place) ? 'Rouvrir ce lieu' : 'Ouvrir ce lieu'}</button>`;
      else if (r.kind === 'rumeur') {
        if (ok) h += `<div class="reveal-txt ink">${esc(r.reveal)}</div>`;
        else {
          if (rs.h) h += '<ul class="hints">' + r.hints.slice(0, rs.h).map((x, i) => `<li><b>Indice ${i + 1}.</b> ${esc(x)}</li>`).join('') + '</ul>';
          h += `<div class="btn-row"><button class="btn primary" data-act="room-found" data-id="${id}" data-r="${r.id}">Je crois avoir trouvé</button>${(rs.h || 0) < r.hints.length ? `<button class="btn ghost" data-act="room-hint" data-id="${id}" data-r="${r.id}">Un indice</button>` : ''}</div>`;
        }
      } else if (!ok) h += `<button class="btn" data-act="keep">Garder quelque chose</button>`;
      h += '</section>';
    }
    // le cœur
    const H = a.heart, hs = s.heart || {};
    h += `<section class="heart${n >= a.need ? '' : ' shut'}"><div class="eyebrow">${n >= a.need ? 'Ouvert' : 'Scellé'}</div><h3>${esc(H.title)}</h3>`;
    if (n < a.need) return h + `<p class="p-text">Encore ${a.need - n} salle${a.need - n > 1 ? 's' : ''}, au choix.</p></section>`;
    h += `<p class="intro">${esc(H.question)}</p>`;
    if (!hs.h1) return h + `<p class="p-text">${esc(H.ask)}</p><textarea id="heart-1" rows="3" placeholder="Je pense que…"></textarea><button class="btn primary wide" data-act="heart-1" data-id="${id}">C'est mon explication</button><p class="msg" id="heart-msg"></p></section>`;
    h += `<p class="hand${hs.h2 && hs.h2 !== hs.h1 ? ' struck' : ''}">${esc(hs.h1)}</p>`;
    if (hs.h2 && hs.h2 !== hs.h1) h += `<p class="hand">${esc(hs.h2)}</p>`;
    h += '<div class="pistes">' + H.pistes.map(p => `<div class="piste"><p>${esc(p.t)}</p><small><span class="tag k-${p.k}">${D.statuts[p.k]}</span> ${esc(p.s)}</small></div>`).join('') + '</div>';
    if (!hs.h2) return h + `<p class="p-text">${esc(H.doubt)}</p><textarea id="heart-2" rows="3">${esc(hs.h1)}</textarea><button class="btn primary wide" data-act="heart-2" data-id="${id}">Voilà où j'en suis</button></section>`;
    h += H.synth.map(x => `<div class="reveal-txt ink"><b>${esc(x.h)}</b><br><span class="tag k-${x.k}">${D.statuts[x.k]}</span> ${esc(x.t)}</div>`).join('');
    return h + `<p class="mastery ok">Cœur atteint. L'enquête reste ouverte : tu peux réécrire ta phrase quand tu veux.</p><button class="btn ghost" data-act="heart-redo" data-id="${id}">Réécrire ma phrase</button></section>`;
  }

  /* ---------- Quêtes : des invitations, pas des formulaires ---------- */
  const MECH = { decouverte: ['Découvrir', 'Aller voir, simplement'], observation: ['Observer', 'Regarder avant de lire'], comparaison: ['Comparer', 'Deux lieux qui se répondent'], collection: ['Réunir', 'Une famille à retrouver'],
    photographie: ['Photographier', 'Un détail à saisir'], enquete: ['Enquêter', 'Une question qui reste ouverte'], secret: ['Secrets', 'Ce que la carte ne dit pas'] };
  const LVL = ['', 'Découverte immédiate', 'Exploration active', 'Investigation'];
  const CARD8 = ['le nord', 'le nord-est', 'l\'est', 'le sud-est', 'le sud', 'le sud-ouest', 'l\'ouest', 'le nord-ouest'];
  function bearing(a, b) {
    const R = Math.PI / 180, y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R), x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R);
    return CARD8[Math.round(((Math.atan2(y, x) / R + 360) % 360) / 45) % 8];
  }
  const stepPlaces = s => (s.place ? [s.place] : s.places || []);
  function stepText(s) {
    if (s.type === 'visit') return 'Aller voir : ' + Data.P[s.place].name;
    if (s.type === 'place-observe') return 'Regarder : ' + Data.P[s.place].name;
    if (s.type === 'place-enigma') return 'Une énigme t\'attend : ' + Data.P[s.place].name;
    return s.label;
  }
  function compass(q) {            // une direction et une distance, jamais un itinéraire
    const fix = AtlasMap.fix(); let best = null;
    q.steps.forEach((s, i) => { if (Game.stepDone(q, i)) return; for (const pid of stepPlaces(s)) { const po = Game.pos(pid); if (!po || (s.places && Game.disc(pid))) continue; const d = fix && !fix.far ? Game.dist(fix.ll, po.ll) : 0; if (!best || d < best.d) best = { d, ll: po.ll }; } });
    if (!best) return '';
    if (!fix || fix.far) return `<div class="qcompass off"><span>◇</span><p>Touche « Me localiser » sur la carte : ici s'affichera la direction, pas le chemin.</p></div>`;
    return `<div class="qcompass"><span>◆</span><p><b>${UI.fmtDist(best.d)}</b> vers ${bearing(fix.ll, best.ll)}<small>À vol d'oiseau. Le chemin, c'est toi qui le trouves.</small></p></div>`;
  }
  function questSheet(id) {
    const q = Data.Q[id], stt = Game.questStatus(q), t = q.t && Data.T[q.t], qs = Game.S.quests[id] || {}, fol = (st().follow || {})[id];
    let h = `<div class="qhead" style="--tc:${t ? t.color : '#B49A62'}"><span class="qmech">${MECH[q.mech][0]}</span><span class="qlvl">${LVL[q.lvl]}</span><span class="qterr">${t ? t.num + ' · ' + esc(t.name) : 'Toute la ville'}</span></div><h2>${esc(q.title)}</h2><p class="intro">${esc(q.intro)}</p>`;
    if (stt === 'locked') { const c = q.requires; return h + `<p class="mastery">Cette invitation dort encore${c && c.codex ? ' : elle s\'ouvrira quand tu auras révélé le savoir « ' + esc(Data.C[c.codex].title) + ' » (' + esc(Data.C[c.codex].hint) + ')' : ''}.</p>`; }
    if (stt !== 'done') h += compass(q);
    h += '<ul class="traces">';
    q.steps.forEach((s, i) => {
      const ok = Game.stepDone(q, i);
      h += `<li class="${ok ? 'ok' : ''}"><span class="tr-m">${ok ? '◆' : '◇'}</span><div class="tr-b"><b>${esc(stepText(s))}</b>`;
      if (s.type === 'challenge') h += UI.chBlock('q:' + q.id + ':' + i, s.ch, s.ch.skill || 'culture', q.title);
      else if (s.places) h += `${s.n ? `<small>${Math.min(s.places.filter(Game.disc).length, s.n)} sur ${s.n}</small>` : ''}<div class="links">${s.places.map(p => `<button class="lk place${Game.disc(p) ? ' got' : ''}" data-act="push-place" data-id="${p}">${esc(Data.P[p].name)}</button>`).join('')}</div>`;
      else if (s.place) h += `<button class="btn${ok ? ' ghost' : ''}" data-act="push-place" data-id="${s.place}">${ok ? 'Revoir' : 'Ouvrir ce lieu'}</button>`;
      else if (s.type === 'photo') h += `<small>${Math.min(Photo.count(), s.n || 1)} sur ${s.n || 1}</small>`;
      else if (s.type === 'keep') h += `<small>${Math.min(st().kept.length, s.n)} sur ${s.n} · ${new Set(st().kept.map(k => k.t).filter(Boolean)).size} territoire(s)</small>${ok ? '' : '<button class="btn" data-act="keep">Garder quelque chose</button>'}`;
      h += '</div></li>';
    });
    h += '</ul>';
    if (stt !== 'done') h += `<button class="row tog${fol ? ' on' : ''}" data-act="quest-follow" data-id="${id}"><span class="rt"><b>Me prévenir quand j'approche</b><small>En mode exploration, un signal propre aux quêtes</small></span><span class="sw"></span></button>`;
    const nh = qs.hints || 0;
    if (stt !== 'done' || nh) h += `<h3>Indices</h3>${nh ? `<ul class="hints">${q.hints.slice(0, nh).map((x, i) => `<li><b>${i + 1}.</b> ${esc(x)}</li>`).join('')}</ul>` : ''}${nh < 3 && stt !== 'done' ? `<button class="btn ghost" data-act="quest-hint" data-id="${id}">${nh ? 'Un autre indice' : 'Un indice, si tu veux'}</button>` : ''}`;
    if (q.deeper) h += `<div class="deeper-box"><div class="eyebrow">Aller plus loin · facultatif</div><p>${esc(q.deeper)}</p></div>`;
    const a = q.reward.artifact && Data.A[q.reward.artifact];
    if (a) h += `<p class="src">À la clé : l'artefact « ${esc(a.name)} ».</p>`;
    if (q.reward.card) h += `<div class="tc-wrap small">${cardHTML(cardData(q.reward.card))}</div>`;
    if (stt === 'done') h += '<p class="mastery ok">Invitation honorée.</p>';
    return h;
  }
  function questList() {
    let h = '', locked = 0;
    for (const m of Object.keys(MECH)) {
      const qs = Data.quests.filter(q => q.mech === m); if (!qs.length) continue;
      const open = qs.filter(q => { const s = Game.questStatus(q); if (s === 'locked') locked++; return s !== 'locked'; }); if (!open.length) continue;
      h += `<section class="qsec m-${m}"><header><h3>${MECH[m][0]}</h3><small>${MECH[m][1]}</small></header>` + open.map(q => { const s = Game.questStatus(q), t = q.t && Data.T[q.t];
        return `<button class="qt s-${s}" data-act="open-quest" data-id="${q.id}" style="--tc:${t ? t.color : '#B49A62'}"><span class="qt-n">${t ? t.num : '✦'}</span><span class="qt-b"><b>${esc(q.title)}</b><small>${LVL[q.lvl]}${s === 'done' ? ' · honorée' : s === 'active' ? ' · en chemin' : ''}</small></span><span class="qt-l">${'·'.repeat(q.lvl)}</span></button>`; }).join('') + '</section>';
    }
    return h + (locked ? `<p class="note">${locked} invitation${locked > 1 ? 's dorment' : ' dort'} encore : elles s'ouvriront avec tes découvertes.</p>` : '');
  }

  /* ---------- Carnet ---------- */
  function title() { const t = Data.prog.titles.find(x => x.id === Game.S.title); return t ? t.name : 'Voyageur sans carte'; }
  function carnetView() {
    const s = st(), e = echoReady(), done = D.echoes.filter(x => s.echo[x.id] && s.echo[x.id].txt);
    let h = `<header class="cover"><div class="cover-av">${avatar()}</div><div><div class="eyebrow">Carnet de</div><h1>${esc(s.hero.name || 'l\'arpenteur')}</h1><p class="lead">${esc(title())}</p></div></header>
      <div class="btn-row"><button class="btn primary" data-act="keep">Garder quelque chose</button><button class="btn" data-act="tab" data-v="codex">Savoir</button></div>`;
    if (e) h += '<h3>Deux pages se répondent</h3>' + echoHTML(e, true);
    // pages datées : ce qui a été gardé + lieux trouvés ce jour-là
    const days = {};
    for (const k of s.kept) (days[dkey(k.at)] = days[dkey(k.at)] || { t: k.at, kept: [], found: [] }).kept.push(k);
    for (const j of Game.S.journal) if (j.k === 'discover' && Data.P[j.r] && Data.P[j.r].kind === 'culture') (days[dkey(j.t)] = days[dkey(j.t)] || { t: j.t, kept: [], found: [] }).found.push(j.r);
    for (const d of (s.detected || [])) (days[dkey(d.at)] = days[dkey(d.at)] || { t: d.at, kept: [], found: [] }).sig = (days[dkey(d.at)].sig || []).concat(d);
    const keys = Object.keys(days).sort((a, b) => b - a);
    const secrets = Photo.quests(), nf = secrets.filter(q => Photo.found(q.id)).length;
    h += `<p class="src">Secrets révélés par la photographie : ${nf}. Les autres ne figurent sur aucune liste ; un signal t'avertit quand tu passes près de l'un d'eux.</p>`;
    if (!keys.length) h += `<p class="note">Ton carnet est vide. Sors, et garde la première chose qui t'arrête.</p>`;
    for (const d of keys.slice(0, 40)) {
      const p = days[d];
      h += `<section class="daypage"><h3>${day(p.t)}</h3>`;
      if (p.found.length) h += `<div class="found">${[...new Set(p.found)].map(id => cardHTML(cardData(id))).join('')}</div>`;
      h += p.kept.slice().reverse().map(keptHTML).join('');
      if (p.sig) h += `<details class="sigs"><summary>${p.sig.length} signal${p.sig.length > 1 ? 'x' : ''} entendu${p.sig.length > 1 ? 's' : ''} en marchant</summary><div class="rows">${p.sig.slice(-12).reverse().map(Explore.detRow).join('')}</div></details>`;
      h += '</section>';
    }
    if (done.length) h += '<h3>Échos</h3>' + done.map(x => echoHTML(x, false)).join('');
    return h;
  }

  /* ---------- Sac ---------- */
  function sacView() {
    const s = st(), tabs = [['cartes', 'Cartes'], ['objets', 'Objets'], ['tenues', 'Tenues']];
    let h = `<header class="vh"><div class="eyebrow">Ce que tu rapportes</div><h1>Sac</h1></header><div class="seg">${tabs.map(t => `<button class="${sacTab === t[0] ? 'on' : ''}" data-act="sac-tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>`;
    if (sacTab === 'cartes') {
      const all = placeCards(), n = ownedCount();
      h += `<p class="lead">${n} carte${n > 1 ? 's' : ''}. Chacune vient d'un lieu où tu es allé.</p>`;
      const sp = D.specialCards.map(c => cardData(c.id));
      h += `<h3>Hors série</h3><div class="tcs">${sp.map(c => cardHTML(c)).join('')}</div><h3>Sceaux de territoire</h3><div class="tcs">${Data.territories.map(t => cardHTML(cardData('c-terr-' + t.id))).join('')}</div>`;
      for (const t of Data.territories) {
        const cs = all.filter(p => p.t === t.id).map(p => cardData(p.id)), got = cs.filter(c => c.owned);
        h += `<h3>${t.num} · ${esc(t.name)}</h3><div class="tcs">${got.map(c => cardHTML(c)).join('')}${got.length < cs.length ? cardHTML({ id: cs.find(c => !c.owned).id, owned: false }) + `<span class="tc-more">${cs.length - got.length} à trouver</span>` : ''}</div>`;
      }
    } else if (sacTab === 'objets') {
      h += base.collection().replace(/<header[\s\S]*?<\/header>/, '');
    } else {
      h += `<p class="lead">Une tenue ne s'achète pas : elle rappelle ce que tu as fait.</p>`;
      for (const [slot, label] of SLOTS) h += `<h3>${label}</h3><div class="outs">${D.outfits.filter(o => o.slot === slot).map(o => { const ok = hasOutfit(o), on = s.hero[slot] === o.id;
        return `<button class="out${on ? ' on' : ''}${ok ? '' : ' off'}" ${ok ? `data-act="wear" data-id="${o.id}"` : 'disabled'}><span class="out-av">${ok ? avatar(Object.assign({}, s.hero, { [slot]: o.id })) : Art.icon('lock')}</span><b>${esc(o.name)}</b><small>${ok ? (on ? 'Portée' : 'Mettre') : esc(o.how)}</small></button>`; }).join('')}</div>`;
    }
    return h;
  }

  /* ---------- Héros ---------- */
  function herosView() {
    const s = st(), advs = D.adventures.filter(a => advDone(a.id)).length;
    const days = new Set(s.kept.map(k => dkey(k.at))).size;
    let h = `<header class="hero"><div class="hero-av">${avatar()}</div><div class="hero-t"><div class="eyebrow">${esc(title())}</div>
      <input class="hero-name" data-hero-name="1" maxlength="24" value="${esc(s.hero.name)}" placeholder="Ton nom d'arpenteur" aria-label="Ton nom d'arpenteur">
      <button class="btn" data-act="open-sac" data-id="tenues">Changer de tenue</button></div></header>
      <div class="rows"><button class="row" data-act="x-open"><span class="rt"><b>Mode exploration et sons</b><small>GPS, signaux, volume, mode silencieux</small></span><span class="chev">›</span></button><button class="row" data-act="diag-open"><span class="rt"><b>Diagnostic iPhone</b><small>Ce que cet appareil permet réellement</small></span><span class="chev">›</span></button></div>
      <div class="stats">${[['Cartes', ownedCount()], ['Secrets révélés', Photo.count()], ['Lieux trouvés', Game.count('discovered')], ['Donjons', advs + ' / ' + D.adventures.length], ['Choses gardées', s.kept.length], ['Territoires foulés', Game.count('territories') + ' / ' + Data.territories.length]].map(x => `<div><b>${x[1]}</b><small>${x[0]}</small></div>`).join('')}</div>
      <h3>Compagnons</h3><p class="note">Rencontres, guildes et contributions des joueurs ne sont pas dans ce prototype : elles demandent un serveur, qui n'existe pas encore. Rien ici ne fait semblant.</p>`;
    return h + base.profil();
  }

  /* ---------- Actions ---------- */
  const redraw = () => UI.after();
  const actions = {
    keep() { tmpKeep = {}; UI.openSheet(keepHTML); },
    'keep-go'() {
      const txt = $('#keep-txt').value, ph = tmpKeep && tmpKeep.photo;
      if (!txt.trim() && !ph) { $('#keep-msg').textContent = 'Écris trois mots ou ajoute une photo.'; return; }
      if (ph && PhotoStore.dup(ph)) { $('#keep-msg').textContent = 'Cette photo est déjà dans ton carnet.'; return; }
      keep(txt, ph, $('#keep-note') ? $('#keep-note').value : ''); tmpKeep = null; UI.closeSheet(); redraw(); UI.toast('Gardé dans ton carnet.', 'tab-carnet');
    },
    'tab-carnet'() { UI.show('carnet'); },
    'kept-del'(d) { const s = st(); s.kept = s.kept.filter(k => k.id !== d.id); PhotoStore.del(d.id); Game.save(); redraw(); },
    'kept-show'(d) { const k = st().kept.find(x => x.id === d.id); UI.show('atlas'); if (k && k.pos) AtlasMap.flyTo(k.pos, 18); },
    'kept-place'(d) { const k = st().kept.find(x => x.id === d.id); if (!k) return; UI.show('atlas'); AtlasMap.startPick('Place la croix là où tu l\'as vu', (lat, lng) => { k.pos = [+lat.toFixed(6), +lng.toFixed(6)]; k.t = terrOf(k.pos); Game.save(); redraw(); UI.show('carnet'); }); },
    'derive-next'() { st().derive++; Game.save(); Views.render('quetes'); },
    'open-adv'(d) { UI.openSheet(advHTML, d.id); },
    'adv-start'(d) { st().adv[d.id] = { start: now(), rooms: {}, r: {} }; Game.save(); redraw(); },
    'room-hint'(d) { const s = st().adv[d.id]; s.r = s.r || {}; const x = s.r[d.r] || (s.r[d.r] = {}); x.h = (x.h || 0) + 1; Game.save(); UI.draw(false); },
    'room-found'(d) { st().adv[d.id].rooms[d.r] = now(); Game.save(); redraw(); },
    'heart-1'(d) { const v = $('#heart-1').value.trim(); if (v.length < 8) { $('#heart-msg').textContent = 'Une phrase entière, même incertaine.'; return; } const s = st().adv[d.id]; s.heart = { h1: v, t1: now() }; Game.save(); UI.draw(false); },
    'heart-2'(d) { const s = st().adv[d.id], v = $('#heart-2').value.trim() || s.heart.h1; s.heart.h2 = v; s.heart.t2 = now(); if (!s.done) s.done = now(); Game.save(); redraw(); },
    'heart-redo'(d) { const s = st().adv[d.id]; s.heart.h1 = s.heart.h2 || s.heart.h1; delete s.heart.h2; Game.save(); UI.draw(false); },
    'eco-go'(d) { const v = $('#eco-' + d.id).value.trim(); if (v.length < 4) return UI.toast('Écris ce que tu vois, même en quelques mots.'); st().echo[d.id] = { txt: v, at: now() }; Game.save(); redraw(); },
    'eco-skip'(d) { st().echo[d.id] = { skip: now() }; Game.save(); redraw(); },
    'open-card'(d) { UI.openSheet(cardSheet, d.id); },
    'open-quest'(d) { UI.openSheet(questSheet, d.id); },
    'quest-follow'(d) { const s = st(); s.follow = s.follow || {}; if (s.follow[d.id]) delete s.follow[d.id]; else s.follow[d.id] = now(); Game.save(); UI.draw(false); },
    'open-tq'(d) { UI.openSheet(tqHTML, d.id); },
    'fx-close'() { nextFx(); },
    'sac-tab'(d) { sacTab = d.v; Views.render('collection'); $('#v-collection').scrollTop = 0; },
    'open-sac'(d) { sacTab = d.id || 'cartes'; UI.show('collection'); },
    wear(d) { const o = D.outfits.find(x => x.id === d.id); if (!o || !hasOutfit(o)) return; st().hero[o.slot] = o.id; Game.save(); Views.render('collection'); }
  };

  function init() {
    Object.assign(Game.extSteps, {            // étapes de quête propres à la v5
      collect: s => s.places.filter(Game.disc).length >= s.n,
      photo: s => (s.pq ? Photo.found(s.pq) : Photo.count() >= (s.n || 1)),
      keep: s => st().kept.length >= s.n && new Set(st().kept.map(k => k.t).filter(Boolean)).size >= (s.terr || 0),
      echo: s => !!(st().echo[s.id] && st().echo[s.id].txt)
    });
    st(); sync(true); base = Object.assign({}, Views.views);
    Object.assign(Views.views, { quetes: aventuresView, collection: sacView, profil: herosView, carnet: carnetView });
    Object.assign(Views.actions, actions);
    Views.actions['export-full'] = exportFull;
    const baseImport = Views.actions['import-go'];
    Views.actions['import-go'] = () => {            // reconnaît une sauvegarde complète (avec photos), sinon laisse faire l'import habituel
      const file = $('#import-file').files[0], txt = $('#import-txt').value.trim(), msg = $('#import-msg');
      const go = async t => { let o = null; try { o = JSON.parse(t); } catch (e) { o = null; }
        if (!(o && o.lostAtlasBackup && o.save)) return baseImport();
        try { Game.importSave(JSON.stringify(o.save)); await PhotoStore.restore(o.photos || {}); UI.closeSheet(); UI.after(); UI.toast('Sauvegarde complète importée, photos comprises.'); }
        catch (e) { msg.textContent = 'Ce contenu n\'est pas une sauvegarde valide du Lost Atlas.'; } };
      if (file) { const r = new FileReader(); r.onload = () => go(String(r.result)); r.onerror = () => baseImport(); r.readAsText(file); } else if (txt) go(txt); else baseImport();
    };
    const baseReset = Views.actions['reset-go'];
    Views.actions['reset-go'] = () => { PhotoStore.clear(); baseReset(); };
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.keepPhoto && t.files && t.files[0]) {
        const txt = $('#keep-txt') ? $('#keep-txt').value : '', nt = $('#keep-note') ? $('#keep-note').value : '';
        shrink(t.files[0]).then(u => { tmpKeep = tmpKeep || {}; tmpKeep.photo = u; UI.draw(false); const ta = $('#keep-txt'); if (ta) ta.value = txt; const tn = $('#keep-note'); if (tn) tn.value = nt; })
          .catch(() => { const m = $('#keep-msg'); if (m) m.textContent = 'Cette image n\'a pas pu être lue.'; });
      }
      if (t.dataset.heroName) { st().hero.name = t.value.trim(); Game.save(); }
    });
  }
  return { init, onEvents, drawKept, avatar, icon: k => ICON[k] || '', cardData, cardHTML, st, shrink, storePhoto, photoOf, give, sync };
})();
