/* Démarrage. */
(async function () {
  const boot = document.getElementById('boot');
  try {
    await Data.load();
    Game.init();
    await PhotoStore.init();
    V3.init(); Explore.init(); Photo.init(); Diag.init();
    document.querySelectorAll('[data-ico]').forEach(el => { el.innerHTML = V3.icon(el.dataset.ico) || Art.icon(el.dataset.ico); });
    [['fab-gps', 'gps'], ['fab-pin', 'pin'], ['fab-list', 'list'], ['fab-layers', 'layers']].forEach(([id, k]) => { document.getElementById(id).innerHTML = Art.icon(k); });
    UI.bind();
    AtlasMap.init();
    UI.chrome(); Explore.refresh();
    const h = location.hash.slice(1);
    if (h && h !== 'atlas' && document.getElementById('v-' + h)) UI.show(h);
    boot.classList.add('gone'); setTimeout(() => boot.remove(), 600);
    if (!Game.S.settings.intro) UI.openSheet(Views.introHTML);
    const t = Data.T[Game.S.settings.territory]; if (t) AtlasMap.showTerritory(t);
  } catch (e) {
    document.getElementById('boot-msg').textContent = 'Impossible de charger les contenus. Ouvre l\'application depuis un serveur web (voir README).';
    console.error(e);
    return;
  }
  // Mode hors ligne : uniquement quand la page est servie en http(s) hors cadre isolé.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('service-worker.js').catch(() => {}); } catch (e) { /* refusé : sans conséquence */ }
  }
})();
