/* Chargement des contenus : fichiers JSON de /data (source de vérité), avec repli sur data/bundle.js. */
const Data = (() => {
  const FILES = ['territories', 'places', 'fiches', 'codex', 'quests', 'artifacts', 'progression'];
  const D = {
    CAT: { inc: 'Incontournable', voir: 'À voir', act: 'Activité', loger: 'Se loger', manger: 'Se restaurer', verre: 'Prendre un verre', shop: 'Shopping', extra: 'Repère' },
    async load() {
      let raw = null;
      if (window.ATLAS_FLAT && window.ATLAS_DATA) raw = window.ATLAS_DATA;   // version à publier : tout est dans la page
      else try {
        const res = await Promise.all(FILES.map(f => fetch('data/' + f + '.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(f); return r.json(); })));
        raw = {}; FILES.forEach((f, i) => { raw[f] = res[i]; });
      } catch (e) { raw = window.ATLAS_DATA || null; }
      if (!raw) throw new Error('Contenus introuvables');
      build(raw);
    }
  };
  const index = arr => { const o = {}; arr.forEach(x => { o[x.id] = x; }); return o; };
  function build(raw) {
    D.territories = raw.territories; D.T = index(raw.territories);
    D.places = raw.places; D.P = index(raw.places);
    for (const p of D.places) if (raw.fiches[p.id]) p.fiche = raw.fiches[p.id];
    for (const p of D.places) {
      p.ref = p.same && D.P[p.same] ? p.same : p.id;           // identifiant canonique (même lieu sur deux cartes)
      if (p.ref !== p.id) { const c = D.P[p.ref]; p.fiche = c.fiche; p.pos = c.pos; p.q = c.q; p.src = c.src; }
      p.kind = (p.cat === 'inc' || p.cat === 'voir' || p.cat === 'extra' || p.fiche) ? 'culture' : 'pratique';
    }
    // Numéro d'atlas : unique pour chaque lieu (les lieux culturels d'abord, territoire par territoire, puis les adresses).
    // Le numéro d'origine du guide papier (p.n) est conservé et reste affiché dans la fiche.
    let num = 0; const order = t => D.territories.findIndex(x => x.id === t);
    const canon = D.places.filter(p => p.ref === p.id);
    for (const kind of ['culture', 'pratique']) for (const p of canon.filter(x => x.kind === kind).sort((a, b) => order(a.t) - order(b.t))) p.num = ++num;
    for (const p of D.places) if (p.ref !== p.id) p.num = D.P[p.ref].num;
    D.codex = raw.codex; D.entries = raw.codex.entries; D.C = index(D.entries);
    D.cats = raw.codex.categories; D.CATS = index(D.cats);
    D.chains = raw.codex.chains; D.CH = index(D.chains);
    D.placeCodex = {};
    D.entries.forEach(e => (e.places || []).forEach(pid => { (D.placeCodex[pid] = D.placeCodex[pid] || []).push(e.id); }));
    D.quests = raw.quests; D.Q = index(D.quests);
    D.artifacts = raw.artifacts; D.A = index(D.artifacts);
    D.prog = raw.progression;
  }
  return D;
})();
