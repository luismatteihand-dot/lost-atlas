/* Diagnostic iPhone : ce que CET appareil sait faire, vérifié sur place. Sert de liste de tests réels (voir GUIDE-IPHONE.md).
   Rien n'est envoyé ; le rapport se copie pour être collé où l'on veut. */
const Diag = (() => {
  const { $, esc } = UI; let rows = null;
  /* Journal des erreurs de la session : sert au test sur iPhone réel. Rien n'est envoyé ; il apparaît dans le rapport à copier. */
  const errors = [];
  function note(err, ctx) {
    errors.push({ at: new Date().toTimeString().slice(0, 8), ctx: ctx || '', msg: String(err && (err.message || err)).slice(0, 160) });
    if (errors.length > 20) errors.shift();
  }
  window.addEventListener('error', e => note(e.error || e.message, 'page'));
  window.addEventListener('unhandledrejection', e => note(e.reason, 'promesse'));
  const mb = n => (n / 1048576).toFixed(n > 10485760 ? 0 : 1).replace('.', ',') + ' Mo';
  async function run() {
    const r = [], add = (k, st, t) => r.push({ k, st, t });
    add('Adresse sécurisée (https)', window.isSecureContext ? 'ok' : 'denied', window.isSecureContext ? location.protocol + '//' + location.host : 'Adresse non sécurisée : la localisation et l\'appareil photo seront refusés.');
    const standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    add('Installée sur l\'écran d\'accueil', standalone ? 'ok' : 'weak', standalone ? 'Oui.' : 'Non : ouverte dans le navigateur. Safari → Partager → « Sur l\'écran d\'accueil ».');
    let perm = 'inconnue (ce navigateur ne la communique pas)';
    try { if (navigator.permissions && navigator.permissions.query) perm = { granted: 'accordée', denied: 'refusée', prompt: 'pas encore demandée' }[(await navigator.permissions.query({ name: 'geolocation' })).state] || perm; } catch (e) { /* Safari */ }
    const gs = Explore.state(), fixAt = AtlasMap.lastFixAt(), fix = AtlasMap.fix();
    add('Géolocalisation', !('geolocation' in navigator) || !navigator.geolocation ? 'denied' : gs === 'ok' ? 'ok' : gs === 'denied' || gs === 'insecure' ? 'denied' : 'weak',
      (!('geolocation' in navigator) || !navigator.geolocation ? 'Absente de ce navigateur.' : 'Autorisation : ' + perm + '. État : ' + gs + (fix ? ', précision ± ' + fix.acc + ' m, à ' + new Date(fixAt).toLocaleTimeString('fr-FR') : ', aucune position récente (touche « Me localiser »)') + '.'));
    add('Son', Sound.state() === 'running' ? 'ok' : 'weak', 'Moteur audio : ' + Sound.state() + '. Touche « Tester le son » : si tu n\'entends rien sur iPhone, vérifie le bouton silencieux et le volume.');
    add('Écran maintenu allumé', 'wakeLock' in navigator ? 'ok' : 'weak', 'wakeLock' in navigator ? 'Disponible : utilisé par le mode exploration et le mode poche.' : 'Non disponible : règle le verrouillage automatique sur « Jamais » pendant la promenade.');
    add('Vibration', 'vibrate' in navigator ? 'ok' : 'weak', 'vibrate' in navigator ? 'Disponible.' : 'Non disponible dans ce navigateur (cas habituel sur iPhone) : seuls les sons signalent.');
    const e = await PhotoStore.estimate();
    add('Stockage des photos', e.backend === 'indexeddb' ? 'ok' : 'weak', 'Moteur : ' + e.backend + '. ' + e.count + ' photo' + (e.count > 1 ? 's' : '') + ', ' + mb(e.bytes) + '.' + (e.quota ? ' Espace utilisé par le jeu : ' + mb(e.usage) + ' sur ' + mb(e.quota) + ' accordés.' : '') + (e.persisted === true ? ' Stockage protégé.' : e.persisted === false ? ' Stockage non protégé : le système peut l\'effacer si l\'appareil manque de place.' : ''));
    add('Sauvegarde de la partie', Store.isAvailable() ? 'ok' : 'denied', Store.isAvailable() ? 'Enregistrée sur cet appareil.' : 'Refusée par ce navigateur : exporte ta sauvegarde.');
    let sw = 'non pris en charge';
    try { if ('serviceWorker' in navigator) { const g = await navigator.serviceWorker.getRegistration(); sw = g ? (navigator.serviceWorker.controller ? 'actif : le jeu s\'ouvre sans réseau' : 'installé, actif au prochain lancement') : 'non installé (normal hors https ou dans un affichage intégré)'; } } catch (e2) { sw = 'indisponible ici'; }
    add('Fonctionnement hors ligne', sw.startsWith('actif') ? 'ok' : 'weak', 'Service worker ' + sw + '. Réseau : ' + (navigator.onLine === false ? 'absent' : 'présent') + '.');
    add('Appareil photo', 'weak', 'Ne peut pas être vérifié automatiquement : ouvre « Garder » et touche « Prendre une photo ».');
    add('Erreurs pendant cette session', errors.length ? 'denied' : 'ok', errors.length ? errors.slice(-3).map(x => x.at + ' ' + (x.ctx ? '[' + x.ctx + '] ' : '') + x.msg).join(' · ') + (errors.length > 3 ? ' (et ' + (errors.length - 3) + ' autres)' : '') : 'Aucune.');
    add('Appareil', 'off', navigator.userAgent.replace(/\s+/g, ' ').slice(0, 140) + ' · écran ' + screen.width + '×' + screen.height);
    rows = r; return r;
  }
  const report = () => 'Lost Atlas — diagnostic du ' + new Date().toLocaleString('fr-FR') + '\n' + (rows || []).map(x => '- ' + x.k + ' : ' + ({ ok: 'OK', weak: 'À VÉRIFIER', denied: 'KO', off: '' }[x.st]) + ' ' + x.t).join('\n');
  function html() {
    if (!rows) return '<h2>Diagnostic iPhone</h2><p class="p-text">Vérification en cours…</p>';
    return `<div class="eyebrow">Sur cet appareil</div><h2>Diagnostic iPhone</h2><p class="p-text">Ce que cet appareil permet réellement, mesuré maintenant. Vert : vérifié. Jaune : à essayer toi-même. Rouge : bloquant.</p>
      <div class="diag">${rows.map(x => `<div class="xstat st-${x.st}"><i></i><p><b>${esc(x.k)}.</b> ${esc(x.t)}</p></div>`).join('')}</div>
      <div class="btn-row"><button class="btn" data-act="diag-run">Relancer</button><button class="btn" data-act="diag-sound">Tester le son</button><button class="btn primary" data-act="diag-copy">Copier le rapport</button></div><p class="msg" id="diag-msg"></p>
      <textarea id="diag-txt" rows="5" readonly>${esc(report())}</textarea>
      <h3>À vérifier en marchant</h3><ul class="sources"><li>« Me localiser » : le point bleu est-il au bon endroit, et suit-il tes pas ?</li><li>Déplace la carte du doigt : elle ne doit plus se recentrer ; « Recentrer » te ramène.</li><li>Mode exploration puis mode poche : entends-tu les signaux, téléphone en poche, écran allumé ?</li><li>Précision affichée dans une ruelle couverte.</li><li>Une photo par « Garder » : la retrouves-tu au Carnet après avoir fermé puis rouvert le jeu ?</li><li>Batterie consommée en une heure.</li></ul>`;
  }
  const actions = {
    'diag-open'() { rows = null; UI.openSheet(html); run().then(() => { if (UI.sheetIs(html)) UI.draw(false); }); },
    'diag-run'() { run().then(() => { if (UI.sheetIs(html)) UI.draw(false); }); },
    'diag-sound'() { Sound.play('important', { test: true }); },
    'diag-copy'() { const ta = $('#diag-txt'), m = $('#diag-msg'); ta.focus(); ta.select(); const done = ok => { m.textContent = ok ? 'Rapport copié.' : 'Copie refusée : le texte est sélectionné, copie-le à la main.'; };
      try { navigator.clipboard.writeText(ta.value).then(() => done(true), () => done(false)); } catch (e) { done(false); } }
  };
  return { init() { Object.assign(Views.actions, actions); }, run, report, html, note, errors: () => errors.slice() };
})();
