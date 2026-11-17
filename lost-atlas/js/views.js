/* Écrans Codex, Quêtes, Collection, Profil et leurs fiches. */
const Views = (() => {
  const { $, esc } = UI;
  const KIND = () => Data.codex.kinds;
  const QCAT = { exploration: 'Exploration', observation: 'Observation', reflexion: 'Réflexion', secret: 'Secrets' };
  const QSTATE = { locked: 'Verrouillée', open: 'Disponible', active: 'En cours', done: 'Accomplie' };
  const CSTATE = { new: 'Nouveau', read: 'Lu', mastered: 'Maîtrisé' };
  let codexTab = 'savoirs', questTab = 'exploration';
  const chainPick = {};
  const date = t => new Date(t).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const pips = (n, of) => '<span class="pips">' + Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('') + '</span>';

  /* ---------- CODEX ---------- */
  function codexView() {
    const n = Game.count('codex'), m = Game.count('codexMastered'), tot = Data.entries.length;
    let h = `<header class="vh"><div class="eyebrow">Bibliothèque</div><h1>Codex</h1><p class="lead">${n} savoirs révélés sur ${tot} · ${m} maîtrisés</p></header>
      <div class="seg"><button class="${codexTab === 'savoirs' ? 'on' : ''}" data-act="codex-tab" data-v="savoirs">Savoirs</button><button class="${codexTab === 'chaines' ? 'on' : ''}" data-act="codex-tab" data-v="chaines">Chaînes et synthèses</button></div>`;
    if (codexTab === 'savoirs') {
      for (const c of Data.cats) {
        const es = Data.entries.filter(e => e.cat === c.id); if (!es.length) continue;
        const open = es.filter(e => Game.codexState(e.id) !== 'locked').length;
        h += `<h3 class="cat">${esc(c.name)} <small>${open}/${es.length}</small></h3><div class="rows">`;
        for (const e of es) {
          const st = Game.codexState(e.id);
          h += st === 'locked'
            ? `<div class="row sealed"><span class="ico">${Art.icon('lock')}</span><span class="rt"><b>Fragment scellé</b><small>${esc(e.hint)}</small></span></div>`
            : `<button class="row" data-act="open-codex" data-id="${e.id}"><span class="ico st-${st}">${Art.icon(st === 'mastered' ? 'star' : 'codex')}</span><span class="rt"><b>${esc(e.title)}</b><small>${esc(e.intro)}</small></span><span class="chip c-${st}">${CSTATE[st]}</span></button>`;
        }
        h += '</div>';
      }
      h += `<p class="note">Un savoir est maîtrisé quand tu l'as lu et que tous les savoirs auxquels il renvoie sont eux-mêmes révélés.</p>`;
    } else {
      h += `<p class="p-text">Une chaîne relie quatre savoirs. Quand ils sont tous révélés, remets ses maillons dans l'ordre des causes : la synthèse apparaît.</p>`;
      for (const ch of Data.chains) {
        const got = ch.nodes.filter(nid => Game.codexState(nid) !== 'locked').length, done = Game.chainDone(ch.id), ready = Game.chainReady(ch);
        h += `<button class="card${done ? ' done' : ready ? ' ready' : ''}" data-act="open-chain" data-id="${ch.id}"><div class="eyebrow">${done ? 'Synthèse révélée' : ready ? 'Prête : tente la synthèse' : got + ' maillons sur ' + ch.nodes.length}</div><h3>${esc(ch.title)}</h3><p>${esc(ch.question)}</p>
          <div class="nodes">${ch.nodes.map(nid => Game.codexState(nid) === 'locked' ? '<span class="node off">?</span>' : `<span class="node">${esc(Data.C[nid].title)}</span>`).join('')}</div></button>`;
      }
    }
    return h;
  }
  function codexHTML(id) {
    const e = Data.C[id], st = Game.codexState(id);
    if (st === 'locked') return `<h2>Fragment scellé</h2><p class="p-text">${esc(e.hint)}</p>`;
    const missing = (e.links || []).filter(l => Game.codexState(l) === 'locked').length;
    let h = `<div class="eyebrow">${esc(Data.CATS[e.cat].name)}</div><h2>${esc(e.title)}</h2><p class="intro">${esc(e.intro)}</p>`;
    h += e.body.map(b => `<div class="para k-${b.k}"><span class="tag k-${b.k}">${esc(KIND()[b.k])}</span><p>${esc(b.t)}</p></div>`).join('');
    if (e.anecdote) h += `<div class="anecdote"><span>À savoir</span>${esc(e.anecdote)}</div>`;
    h += `<p class="mastery ${st === 'mastered' ? 'ok' : ''}">${st === 'mastered' ? 'Savoir maîtrisé : tous ses liens sont révélés.' : missing ? `Pour le maîtriser, révèle encore ${missing} savoir${missing > 1 ? 's' : ''} lié${missing > 1 ? 's' : ''}.` : 'Tous ses liens sont révélés.'}</p>`;
    if ((e.links || []).length) h += `<h3>Liens</h3><div class="links">${e.links.map(l => Game.codexState(l) === 'locked' ? `<span class="lk locked">${Art.icon('lock')} ${esc(Data.C[l].hint)}</span>` : `<button class="lk" data-act="push-codex" data-id="${l}">${esc(Data.C[l].title)}</button>`).join('')}</div>`;
    const pl = (e.places || []).filter(p => Data.P[p]);
    if (pl.length) h += `<h3>Lieux associés</h3><div class="links">${pl.map(p => `<button class="lk place" data-act="push-place" data-id="${p}">${esc(Data.P[p].name)}</button>`).join('')}</div>`;
    if ((e.sources || []).length) h += `<h3>Sources</h3><ul class="sources">${e.sources.map(s => { const o = Data.codex.sources[s]; return o ? `<li>${o.url ? `<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.label)}</a>` : esc(o.label)}</li>` : ''; }).join('')}</ul>`;
    h += `<div class="kinds"><h3>Comment lire les marques</h3>${Object.keys(KIND()).map(k => `<span class="tag k-${k}">${esc(KIND()[k])}</span>`).join('')}</div>`;
    return h;
  }
  function shuffled(ch) {   // mélange stable, jamais dans le bon ordre
    let seed = 0; for (const c of ch.id) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    const idx = ch.order.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    if (idx.every((v, i) => v === i)) idx.push(idx.shift());
    return idx;
  }
  function chainHTML(id) {
    const ch = Data.CH[id], done = Game.chainDone(id), ready = Game.chainReady(ch);
    let h = `<div class="eyebrow">Chaîne · ${esc(UI.skillName(ch.skill))}</div><h2>${esc(ch.title)}</h2><p class="intro">${esc(ch.question)}</p>`;
    if (done) return h + `<ol class="chain-done">${ch.order.map(o => `<li>${esc(o)}</li>`).join('')}</ol><div class="synth"><span>Synthèse</span>${esc(ch.synthesis)}</div>
      <h3>Maillons</h3><div class="links">${ch.nodes.map(n => `<button class="lk" data-act="push-codex" data-id="${n}">${esc(Data.C[n].title)}</button>`).join('')}</div>`;
    if (!ready) return h + `<p class="p-text">Il te manque des maillons. Chacun se révèle sur le terrain :</p><div class="rows">${ch.nodes.map(n => Game.codexState(n) === 'locked'
      ? `<div class="row sealed"><span class="ico">${Art.icon('lock')}</span><span class="rt"><b>Fragment scellé</b><small>${esc(Data.C[n].hint)}</small></span></div>`
      : `<button class="row" data-act="push-codex" data-id="${n}"><span class="ico">${Art.icon('codex')}</span><span class="rt"><b>${esc(Data.C[n].title)}</b><small>Révélé</small></span></button>`).join('')}</div>`;
    const st = chainPick[id] || (chainPick[id] = { sel: [], msg: '' }), pool = shuffled(ch).filter(i => !st.sel.includes(i));
    h += `<p class="p-text">Remets les maillons dans l'ordre : chaque étape doit rendre la suivante possible. Touche-les un à un.</p>
      <ol class="chain-sel">${st.sel.map((i, k) => `<li><button data-act="chain-rm" data-id="${id}" data-k="${k}">${esc(ch.order[i])}<i>retirer</i></button></li>`).join('')}${st.sel.length < ch.order.length ? '<li class="slot">…</li>' : ''}</ol>
      <div class="chain-pool">${pool.map(i => `<button class="btn" data-act="chain-add" data-id="${id}" data-i="${i}">${esc(ch.order[i])}</button>`).join('')}</div>
      ${st.msg ? `<p class="msg">${esc(st.msg)}</p>` : ''}
      <button class="btn primary wide"${st.sel.length < ch.order.length ? ' disabled' : ''} data-act="chain-check" data-id="${id}">Vérifier l'enchaînement</button>`;
    return h;
  }

  /* ---------- QUÊTES ---------- */
  function questsView() {
    const done = Game.count('quests');
    let h = `<header class="vh"><div class="eyebrow">Missions</div><h1>Quêtes</h1><p class="lead">${done} accomplies sur ${Data.quests.length}. Aucune n'est obligatoire, aucun ordre n'est imposé.</p></header><div class="seg four">`;
    for (const k in QCAT) h += `<button class="${questTab === k ? 'on' : ''}" data-act="quest-tab" data-v="${k}">${QCAT[k]}</button>`;
    h += '</div>';
    const intro = { exploration: 'Trouver des monuments, des portes, des lieux.', observation: 'Repérer un détail que les autres ne regardent pas.', reflexion: 'Relier, déduire, distinguer le sûr de l\'incertain.', secret: 'Des indices, pas d\'adresse : à toi de trouver.' };
    h += `<p class="p-text">${intro[questTab]}</p>`;
    for (const q of Data.quests.filter(q => q.cat === questTab)) {
      const st = Game.questStatus(q), t = Data.T[q.t];
      h += `<button class="card q-${st}" data-act="open-quest" data-id="${q.id}"><div class="eyebrow">${t ? 'Territoire ' + t.num + ' · ' + esc(t.name) : 'Toute la ville'} ${pips(q.diff, 3)}</div><h3>${esc(q.title)}</h3><p>${esc(q.intro)}</p>
        <div class="q-foot"><span class="chip qs-${st}">${QSTATE[st]}</span><span>${Game.questProgress(q)} / ${q.steps.length} étapes</span></div></button>`;
    }
    return h;
  }
  function stepLabel(s) {
    if (s.type === 'visit') return 'Découvrir : ' + Data.P[s.place].name;
    if (s.type === 'place-observe') return 'Observer : ' + Data.P[s.place].name;
    if (s.type === 'place-enigma') return 'Résoudre l\'énigme : ' + Data.P[s.place].name;
    return s.label;
  }
  function questHTML(id) {
    const q = Data.Q[id], st = Game.questStatus(q), t = Data.T[q.t], qs = Game.S.quests[id] || {};
    let h = `<div class="eyebrow">${QCAT[q.cat]} · ${t ? 'Territoire ' + t.num : 'Toute la ville'} · difficulté ${pips(q.diff, 3)}</div><h2>${esc(q.title)}</h2><p class="intro">${esc(q.intro)}</p>`;
    if (st === 'locked') { const c = q.requires; return h + `<p class="mastery">Quête verrouillée${c && c.codex ? ' : révèle d\'abord le savoir « ' + esc(Data.C[c.codex].title) + ' » (' + esc(Data.C[c.codex].hint) + ')' : ''}.</p>`; }
    h += '<ol class="steps">'; let prevDone = true;
    q.steps.forEach((s, i) => {
      const ok = Game.stepDone(q, i);
      h += `<li class="${ok ? 'ok' : ''}"><div class="st-h"><span class="tick">${ok ? Art.icon('check') : i + 1}</span><b>${esc(stepLabel(s))}</b></div>`;
      if (s.type === 'challenge') h += prevDone || ok ? UI.chBlock('q:' + q.id + ':' + i, s.ch, s.ch.skill || 'culture', q.title) : '<p class="note">Termine d\'abord l\'étape précédente.</p>';
      else if (s.type === 'anyvisit') h += `<div class="links">${s.places.map(p => `<button class="lk place${Game.disc(p) ? ' got' : ''}" data-act="push-place" data-id="${p}">${esc(Data.P[p].name)}</button>`).join('')}</div>`;
      else h += `<div class="btn-row"><button class="btn${ok ? ' ghost' : ''}" data-act="push-place" data-id="${s.place}">${ok ? 'Revoir la fiche' : 'Ouvrir la fiche du lieu'}</button></div>`;
      h += '</li>'; prevDone = prevDone && ok;
    });
    h += '</ol>';
    const nh = qs.hints || 0;
    h += `<h3>Indices</h3>${nh ? `<ul class="hints">${q.hints.slice(0, nh).map((x, i) => `<li><b>Indice ${i + 1}.</b> ${esc(x)}</li>`).join('')}</ul>` : '<p class="note">Trois indices, du plus vague au plus précis. Essaie d\'abord sans.</p>'}
      ${nh < 3 && st !== 'done' ? `<button class="btn ghost" data-act="quest-hint" data-id="${id}">Révéler l'indice ${nh + 1}/3</button>` : ''}`;
    const a = q.reward.artifact && Data.A[q.reward.artifact];
    if (a) h += `<h3>Récompense</h3><p class="p-text">Artefact : ${esc(a.name)}</p>`;
    if (st === 'done') h += '<p class="mastery ok">Quête accomplie.</p>';
    return h;
  }

  /* ---------- COLLECTION ---------- */
  function collectionView() {
    const got = Data.artifacts.filter(a => Game.S.artifacts[a.id]).length;
    return `<header class="vh"><div class="eyebrow">Cabinet de curiosités</div><h1>Collection</h1><p class="lead">${got} artefacts sur ${Data.artifacts.length}</p></header>
      <div class="grid">${Data.artifacts.map(a => { const ok = !!Game.S.artifacts[a.id]; return `<button class="art${ok ? ' got' : ''} r-${a.rarity === 'commun' ? 'c' : a.rarity === 'rare' ? 'r' : 'l'}" data-act="open-artifact" data-id="${a.id}"><div class="art-img">${ok ? Art.artifact(a.art) : Art.icon('lock')}</div><b>${ok ? esc(a.name) : '???'}</b><small>${esc(a.rarity)}</small></button>`; }).join('')}</div>
      <p class="note">Les artefacts sont des objets symboliques : des illustrations, pas des pièces de musée. Leur histoire, elle, est documentée.</p>`;
  }
  function artifactHTML(id) {
    const a = Data.A[id], ok = Game.S.artifacts[id];
    if (!ok) return `<div class="art-big off">${Art.icon('lock')}</div><div class="eyebrow">Artefact ${esc(a.rarity)}</div><h2>Objet inconnu</h2><p class="mastery">Pour l'obtenir : ${esc(a.hint)}</p>`;
    return `<div class="art-big r-${a.rarity === 'commun' ? 'c' : a.rarity === 'rare' ? 'r' : 'l'}">${Art.artifact(a.art)}</div><div class="eyebrow">Artefact ${esc(a.rarity)} · obtenu le ${new Date(ok).toLocaleDateString('fr-FR')}</div><h2>${esc(a.name)}</h2><p class="intro">${esc(a.desc)}</p><p class="p-text">${esc(a.story)}</p>`;
  }

  /* ---------- PROFIL ---------- */
  function profilView() {
    const S = Game.S, P = Data.prog;
    let h = '';
    h += '<h3>Territoires</h3><div class="rows">' + Data.territories.map(t => { const s = UI.terrStats(t.id); return `<button class="row" data-act="territory-from-profile" data-id="${t.id}"><span class="num dia" style="--tc:${t.color}"><b>${t.num}</b></span><span class="rt"><b>${esc(t.name)}</b><span class="bar thin"><i style="width:${Math.round(100 * s.done / s.cul.length)}%"></i></span><small>${s.done} / ${s.cul.length} lieux culturels</small></span><span class="chev">›</span></button>`; }).join('') + '</div>';
    h += '<h3>Titres</h3><div class="links">' + P.titles.map(t => S.titles[t.id] ? `<button class="lk${S.title === t.id ? ' on' : ''}" data-act="set-title" data-id="${t.id}">${esc(t.name)}</button>` : `<span class="lk locked">${Art.icon('lock')} ${esc(t.hint)}</span>`).join('') + '</div>';
    const j = S.journal.slice(-60).reverse();
    h += '<h3>Journal de découvertes</h3>' + (j.length ? '<ul class="journal">' + j.map(e => `<li><time>${date(e.t)}</time><span>${esc(e.txt)}</span></li>`).join('') + '</ul>' : '<p class="note">Ton journal est vide. Sors, et touche « J\'y suis » au premier lieu que tu reconnais.</p>');
    h += `<h3>Réglages</h3><div class="rows">
      <button class="row" data-act="open-export"><span class="rt"><b>Exporter ma sauvegarde</b><small>Fichier JSON à garder ou à transférer</small></span><span class="chev">›</span></button>
      <button class="row" data-act="open-import"><span class="rt"><b>Importer une sauvegarde</b><small>Remplace la progression de cet appareil</small></span><span class="chev">›</span></button>
      <button class="row" data-act="open-reset"><span class="rt"><b>Réinitialiser la partie</b><small>Efface toute la progression</small></span><span class="chev">›</span></button>
      <button class="row" data-act="open-about"><span class="rt"><b>À propos, sources et limites</b><small>D'où viennent les contenus, ce que l'application ne sait pas faire</small></span><span class="chev">›</span></button></div>
      <p class="note">${Store.isAvailable() ? 'Progression enregistrée sur cet appareil, sans compte.' : 'Attention : ce navigateur refuse l\'enregistrement local. Exporte ta sauvegarde avant de fermer.'}</p>`;
    return h;
  }
  function exportHTML() {
    return `<h2>Exporter ma sauvegarde</h2><p class="p-text">Copie ce texte ou télécharge-le en fichier. Il contient toute ta progression, tes notes et tes marqueurs.</p>
      <textarea id="export-txt" rows="8" readonly>${esc(Store.stringify(Game.S))}</textarea>
      <div class="btn-row"><button class="btn primary" data-act="export-copy">Copier</button><button class="btn" data-act="export-file">Télécharger le fichier</button></div><button class="btn wide" data-act="export-full">Sauvegarde complète, photos comprises</button><p class="src">Le texte ci-dessus ne contient pas les photos. La sauvegarde complète les inclut dans un fichier plus lourd, à garder dans Fichiers ou iCloud.</p><p class="msg" id="export-msg"></p>`;
  }
  function importHTML() {
    return `<h2>Importer une sauvegarde</h2><p class="p-text">Choisis un fichier exporté, ou colle son contenu. La progression actuelle de cet appareil sera remplacée.</p>
      <input type="file" id="import-file" accept=".json,application/json,text/plain"><textarea id="import-txt" rows="6" placeholder="Ou colle ici le texte de la sauvegarde"></textarea>
      <button class="btn primary wide" data-act="import-go">Importer</button><p class="msg" id="import-msg"></p>`;
  }
  function resetHTML(step) {
    return `<h2>Réinitialiser la partie</h2><p class="p-text">Lieux découverts, épreuves, savoirs, notes et marqueurs seront effacés de cet appareil. Pense à exporter ta sauvegarde avant.</p>
      ${step ? '<button class="btn danger wide" data-act="reset-go">Oui, tout effacer</button>' : '<button class="btn danger wide" data-act="reset-ask">Effacer ma progression</button>'}<button class="btn ghost wide" data-act="sheet-close">Annuler</button>`;
  }
  function aboutHTML() {
    const all = Data.places.filter(p => p.ref === p.id), placed = all.filter(p => p.pos), v = placed.filter(p => p.q === 'v').length;
    return `<h2>À propos</h2><p class="p-text">Marrakech — The Lost Atlas est un jeu d'exploration culturelle. Le cadre (un atlas aux pages effacées) est une fiction ; tout le reste est documenté.</p>
      <h3>Lieux et positions</h3><p class="p-text">${Data.places.length} lieux repris des légendes de ton guide papier. Chacun porte un numéro d'atlas unique sur la carte ; son numéro et sa catégorie d'origine dans le guide restent indiqués dans sa fiche. ${placed.length} sont placés sur la carte : ${v} avec une position vérifiée (OpenStreetMap, Wikipedia), ${placed.length - v} avec une position estimée depuis la carte du guide ou indicative, affichée en pointillés. Les ${all.length - placed.length} autres ne sont pas affichés : aucune position n'est inventée. Tu peux les placer toi-même.</p>
      <h3>Contenus historiques</h3><p class="p-text">Chaque paragraphe du Codex dit sa nature : fait documenté, interprétation d'historiens, hypothèse, tradition. Les sources sont citées au bas de chaque fiche. Si tu repères une erreur, note-la dans ton carnet : c'est aussi cela, explorer.</p>
      <h3>Limites</h3><ul class="sources"><li>L'atlas dessiné (rues, derbs, noms) est embarqué et fonctionne sans réseau ; il date de l'extrait OpenStreetMap du 16 novembre 2026 et ne se met pas à jour seul. Le fond « OpenStreetMap en ligne » a besoin du réseau.</li><li>Le GPS ne fonctionne que si tu l'autorises, application ouverte et écran allumé. Dans les ruelles couvertes, sa précision tombe : la validation manuelle existe pour cela.</li><li>Le mode exploration ne fonctionne qu'application ouverte et écran allumé : un site web ne reçoit pas la position téléphone verrouillé.</li><li>Les secrets photographiques sont validés par ta position et par ta réponse ; la photo n'est pas analysée.</li><li>Les photos du carnet sont réduites (720 px) et gardées sur cet appareil. Une mise à jour du jeu ne les efface pas ; effacer les données du site, ou changer d'adresse, si. La « sauvegarde complète » les met à l'abri.</li><li>Aucune fonction multijoueur n'existe dans cette version : elle demanderait un serveur.</li><li>La progression vit dans ce navigateur. Changer d'appareil ou vider les données du site l'efface : exporte ta sauvegarde.</li><li>Horaires, tarifs et ouvertures changent (plusieurs monuments ont fermé après le séisme de 2023) : vérifie sur place.</li></ul>
      <h3>Crédits</h3><p class="p-text">Fond de carte © contributeurs OpenStreetMap. Cartographie : Leaflet. Coordonnées et repères historiques : Wikipedia et Wikidata (CC BY-SA), UNESCO, ouvrages cités dans le Codex.</p>`;
  }
  function introHTML() {
    return `<div class="intro-sheet"><div class="art-big r-l">${Art.artifact('atlas')}</div><div class="eyebrow">Marrakech</div><h1>The Lost Atlas</h1>
      <p class="intro">La ville est le monde du jeu. Ton téléphone n'est que le carnet.</p>
      <ol class="how"><li><b>Marche.</b> La carte est réelle. Va où tu veux.</li><li><b>Trouve.</b> Chaque lieu culturel que tu atteins te laisse une carte de collection.</li><li><b>Garde.</b> Une lumière, une porte, un nom de rue : ton carnet les conserve, sans raison à donner.</li><li><b>Entre.</b> Les donjons sont des quartiers ; leurs salles se franchissent dans l'ordre que tu veux.</li></ol>
      <p class="note">Rien n'est obligatoire. Reste dans l'espace public, n'entre nulle part sans y être invité, ne photographie personne sans son accord. Les contenus historiques sont sourcés et disent leur degré de certitude.</p>
      <button class="btn primary wide big" data-act="intro-go">Ouvrir l'atlas</button></div>`;
  }

  /* ---------- Rendu et actions ---------- */
  const views = { codex: codexView, quetes: questsView, collection: collectionView, profil: profilView };
  function render(v) {
    const el = $('#v-' + v); if (!el || v === 'atlas') return;
    const y = el.scrollTop;
    el.innerHTML = '<div class="page">' + views[v]() + '</div>';
    el.scrollTop = y;
  }
  const actions = {
    'codex-tab'(d) { codexTab = d.v; render('codex'); $('#v-codex').scrollTop = 0; },
    'quest-tab'(d) { questTab = d.v; render('quetes'); },
    'open-codex'(d) { Game.readCodex(d.id); UI.openSheet(codexHTML, d.id); UI.after(); },
    'push-codex'(d) { Game.readCodex(d.id); UI.sheet(codexHTML, d.id); UI.after(); },
    'open-chain'(d) { UI.openSheet(chainHTML, d.id); },
    'chain-add'(d) { const st = chainPick[d.id]; st.sel.push(+d.i); st.msg = ''; UI.draw(false); },
    'chain-rm'(d) { const st = chainPick[d.id]; st.sel.splice(+d.k, 1); st.msg = ''; UI.draw(false); },
    'chain-check'(d) {
      const st = chainPick[d.id], ch = Data.CH[d.id], good = Game.chainTry(d.id, st.sel);
      if (good < ch.order.length) st.msg = good + ' maillon' + (good > 1 ? 's sont' : ' est') + ' à ' + (good > 1 ? 'leur' : 'sa') + ' place sur ' + ch.order.length + '. Demande-toi ce que chaque étape rend possible.';
      UI.after();
    },
    'open-quest'(d) { questTab = Data.Q[d.id].cat; UI.openSheet(questHTML, d.id); },
    'quest-hint'(d) { Game.questHint(d.id); UI.draw(false); },
    'open-artifact'(d) { UI.openSheet(artifactHTML, d.id); },
    'territory-from-profile'(d) { UI.show('atlas'); UI.openTerritory(d.id); },
    'set-title'(d) { Game.setTitle(d.id); render('profil'); },
    'toggle-chime'() { Game.S.settings.chime = !Game.S.settings.chime; Game.save(); render('profil'); },
    'open-export'() { UI.openSheet(exportHTML); }, 'open-import'() { UI.openSheet(importHTML); },
    'open-reset'() { UI.openSheet(resetHTML, false); }, 'reset-ask'() { UI.openSheet(resetHTML, true); },
    'reset-go'() { Game.reset(); UI.closeSheet(); UI.after(); UI.toast('Partie réinitialisée.'); UI.openSheet(introHTML); },
    'open-about'() { UI.openSheet(aboutHTML); },
    'export-copy'() {
      const ta = $('#export-txt'), msg = $('#export-msg'); ta.focus(); ta.select();
      const done = ok => { msg.textContent = ok ? 'Copié dans le presse-papiers.' : 'Copie automatique refusée : le texte est sélectionné, copie-le à la main.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => done(true), () => done(false)); } catch (e) { done(false); }
    },
    'export-file'() {
      try {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Store.stringify(Game.S)], { type: 'application/json' }));
        a.download = 'lost-atlas-sauvegarde-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
        $('#export-msg').textContent = 'Si rien ne se télécharge (certains affichages l\'interdisent), utilise « Copier ».';
      } catch (e) { $('#export-msg').textContent = 'Téléchargement impossible ici : utilise « Copier ».'; }
    },
    'import-go'() {
      const file = $('#import-file').files[0], msg = $('#import-msg');
      const go = txt => { try { Game.importSave(txt); UI.closeSheet(); UI.after(); UI.toast('Sauvegarde importée.'); } catch (e) { msg.textContent = 'Ce contenu n\'est pas une sauvegarde valide du Lost Atlas.'; } };
      if (file) { const r = new FileReader(); r.onload = () => go(String(r.result)); r.onerror = () => { msg.textContent = 'Lecture du fichier impossible.'; }; r.readAsText(file); }
      else if ($('#import-txt').value.trim()) go($('#import-txt').value);
      else msg.textContent = 'Choisis un fichier ou colle le texte de la sauvegarde.';
    },
    'intro-go'() { Game.S.settings.intro = true; Game.save(); UI.closeSheet(); }
  };
  return { render, actions, introHTML, views };
})();
