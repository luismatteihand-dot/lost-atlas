/* Immersion — faire oublier le navigateur.
   Une page web ne peut pas cacher elle-même les barres de Safari : seule l'icône posée sur l'écran d'accueil
   ouvre le jeu en plein écran (mode « standalone »). Ce module :
   - détecte ce mode et l'annonce au CSS (classe html.standalone), pour gérer encoches et barres ;
   - dans Safari sur iPhone, propose une seule fois, après l'introduction, de poser l'icône (trois gestes illustrés) ;
   - bloque ce qui trahit une page web : rebond, zoom au double toucher, sélection de texte hors des champs, menu d'appui long.
   Rien n'est proposé dans un cadre (aperçu Claude) ni sur un ordinateur. */
const Immersion = (() => {
  const ua = navigator.userAgent || '';
  const iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const standalone = !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || (window.matchMedia && matchMedia('(display-mode: fullscreen)').matches));
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const safari = iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA|Instagram|FBAN|FBAV|Line\//.test(ua);
  const inApp = iOS && /Instagram|FBAN|FBAV|Line\/|GSA/.test(ua);
  const canInstall = () => iOS && !standalone && !framed;
  const st = () => { const s = Game.S.settings; s.install = s.install || {}; return s.install; };

  function sheetHTML() {
    if (standalone) return '<div class="eyebrow">Plein écran</div><h2>Tu joues déjà en plein écran</h2><p class="lead">Le jeu est ouvert depuis son icône : plus de barre d\'adresse, plus de site web.</p>';
    if (inApp) return `<div class="eyebrow">Avant de partir</div><h2>Ouvre le jeu dans Safari</h2>
      <p class="lead">Tu es dans le navigateur d'une autre application : le GPS et le plein écran y sont limités.</p>
      <ol class="inst"><li><b>Touche ⋯ ou le bouton de partage</b> de cette application.</li><li><b>Choisis « Ouvrir dans Safari »</b>.</li><li>Reviens ici : je te montrerai comment poser l'icône.</li></ol>`;
    return `<div class="eyebrow">Une vraie application</div><h2>Joue en plein écran</h2>
      <p class="lead">Pose l'icône de Lost Atlas sur ton écran d'accueil : le jeu s'ouvrira sans barre d'adresse, comme une app. ${safari ? '' : 'Fais-le depuis <b>Safari</b> : les autres navigateurs ne le permettent pas toujours.'}</p>
      <ol class="inst">
        <li><span class="inst-i"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5v10h14V11h-1"/></svg></span><b>Touche Partager</b><small>le carré à flèche, en bas de Safari</small></li>
        <li><span class="inst-i"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg></span><b>« Sur l'écran d'accueil »</b><small>fais défiler la liste si besoin</small></li>
        <li><span class="inst-i inst-app"><img src="assets/icon-180.png" alt=""></span><b>Ouvre Lost Atlas depuis l'icône</b><small>sans barre d'adresse ni rien d'autre que le jeu</small></li>
      </ol>
      <p class="src">Selon la version d'iOS, l'app posée sur l'écran d'accueil peut démarrer avec une partie vierge. Si tu as déjà joué dans Safari : Héros → Exporter ici, puis Importer dans l'app.</p>
      <div class="btn-row"><button class="btn primary wide" data-act="inst-ok">Compris</button></div>`;
  }
  const actions = {
    install() { UI.openSheet(sheetHTML); },
    'inst-ok'() { st().seen = Date.now(); Game.save(); UI.closeSheet(); }
  };
  function maybePrompt() {
    if (!canInstall() || st().seen || !Game.S.settings.intro) return;
    st().seen = Date.now(); Game.save();
    setTimeout(() => UI.openSheet(sheetHTML), 900);
  }
  function guard() {
    document.addEventListener('gesturestart', e => { if (!(e.target.closest && e.target.closest('#map'))) e.preventDefault(); }, { passive: false });
    let last = 0;
    document.addEventListener('touchend', e => {   // double toucher hors carte : pas de zoom de page
      const t = Date.now(); if (t - last < 300 && !(e.target.closest && e.target.closest('#map, input, textarea'))) e.preventDefault(); last = t;
    }, { passive: false });
  }
  function init() {
    const h = document.documentElement;
    h.classList.toggle('standalone', standalone); h.classList.toggle('ios', iOS); h.classList.toggle('framed', framed);
    Object.assign(Views.actions, actions); guard();
    // proposé après l'introduction, une seule fois
    const orig = Views.actions['intro-go'];
    if (orig) Views.actions['intro-go'] = function () { const r = orig.apply(this, arguments); maybePrompt(); return r; };
    else maybePrompt();
  }
  return { init, sheetHTML, canInstall, standalone, iOS, framed, row: () => canInstall() || standalone ? `<button class="row" data-act="install"><span class="rt"><b>${standalone ? 'Plein écran actif' : 'Jouer en plein écran'}</b><small>${standalone ? 'Ouvert depuis l\'icône de l\'écran d\'accueil' : 'Poser l\'icône sur l\'écran d\'accueil'}</small></span><span class="chev">›</span></button>` : '' };
})();
