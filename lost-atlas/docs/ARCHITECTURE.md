# Architecture de Lost Atlas (v6)

Application web statique, sans serveur ni compte : HTML, CSS et JavaScript classiques, chargés dans l'ordre par `index.html`. Pas d'étape de compilation, pour pouvoir publier et modifier depuis un iPhone. `tools/build_flat.py` produit une version à plat (un `index.html` autonome et son service worker) pour les hébergeurs qui ne gèrent pas les dossiers.

## Modules

Chaque fichier expose un seul objet global, et l'ordre de chargement est celui des dépendances.

| Module | Fichier | Rôle |
|---|---|---|
| `Store` | js/storage.js | Lecture et écriture de la sauvegarde (localStorage), versions de format, migrations, import et export |
| `Data` | js/data.js | Contenus : lieux, territoires, quêtes, codex, fiches (`data/bundle.js`) |
| `Game` | js/game.js | Règles : découvertes, épreuves, quêtes, codex, progression ; émet des événements (`takeEvents`) |
| `Basemap`, `AtlasMap` | js/basemap.js, js/map.js | Fond de carte embarqué, marqueurs, GPS (filtre des positions aberrantes), redessin seulement quand l'état change |
| `UI`, `Views` | js/ui.js, js/views.js | Feuilles, onglets, gestes ; un seul gestionnaire de clics, protégé contre les erreurs |
| `V3` | js/v3.js | Couche jeu : héros, cartes à collectionner, sac, carnet, donjons, échos, choses gardées |
| `Sound` | js/sound.js | Motifs sonores synthétisés (aucun fichier audio) |
| `PhotoStore`, `Photo` | js/photostore.js, js/photo.js | Photos dans IndexedDB, secrets photographiques |
| `Explore` | js/explore.js | Moteur de proximité générique : fournisseurs de cibles, deux temps, hystérésis, priorités |
| `Diag` | js/diag.js | Diagnostic de l'appareil et journal des erreurs de la session |
| `Trace` | js/trace.js | Tracé GPS, brume des territoires, piste après découverte |
| `Quotidien` | js/quotidien.js | Lieux du quotidien (OpenStreetMap), carnet d'adresses, rangs de territoire |
| `Immersion` | js/immersion.js | Plein écran iPhone (icône d'écran d'accueil), garde-fous tactiles |
| `Session` | js/session.js | « Commencer une aventure » : génération, suivi, imprévus, récit |

## Communication entre systèmes

- **Gestes :** `data-act` sur un élément, puis `UI` cherche l'action dans `A` (ui.js), sinon dans `Views.actions`. Chaque module ajoute ses actions dans `Views.actions` à son `init()`, sans toucher aux autres.
- **Après un geste :** `UI.after()` enchaîne `Game.check()` (évalue quêtes et déblocages), la carte (redessinée seulement si sa signature change), la feuille ouverte et l'onglet.
- **Position :** `AtlasMap` reçoit un relevé, le filtre, puis `UI.onFix` le transmet dans l'ordre à `Trace.record` (tracé), `Explore.onFix` (signaux) et `Session.tick` (imprévus).
- **Contenus géolocalisés :** un module ajoute ses cibles par `Explore.register(() => [...])`. Le moteur gère seul les rayons, les deux temps, les doublons et les priorités.
- **Collections :** `V3.give(idCarte)` est le seul point d'entrée pour donner une carte : animation, sauvegarde, une seule fois.

## État sauvegardé (`lostAtlas.save.v1`)

Le champ `v` porte la version du format ; la version courante est 2. Le contenu :
- `places`, `ch`, `codex`, `quests`, `chains`, `artifacts`, `badges`, `titles`, `pins`, `journal`, `xp` : le noyau (depuis la v1).
- `settings` : réglages, calques (`layers.quot`, `layers.qf`, `layers.terr`, `layers.trail`), exploration, installation.
- `v3` : `hero`, `cards`, `kept`, `adv`, `echo`, `pq`, `follow`, `detected`, `sess` (aventure en cours), `sessions` (récits), `quot` (adresses visitées), `trail` (tracé `[lat, lng, minute]`), `walked` (premier pas par territoire).

Photos : IndexedDB, base `lostAtlas`, magasin `photos`.

**Migrations** (objet `MIGRATIONS` de js/storage.js) : avant toute migration, la sauvegarde d'origine est copiée une seule fois sous `lostAtlas.save.v1.avant-v<N>`. Une migration ne retire et ne renomme jamais rien. Pour ajouter un format, on ajoute `MIGRATIONS[N]` et on passe `CURRENT` à N.

**Identifiants stables :** lieux de l'atlas `t<N>-…`, lieux du quotidien `o-<empreinte>`, quêtes `q-…`, donjons `d-…`, cartes `c-…`. Ils ne sont jamais réutilisés.

## Ajouter du contenu

- **Un lieu du quotidien :** une ligne dans `tools/quotidien_extra.json` (`[nom, lat, lng, "clé=valeur OSM", 0, "source"]`), puis `python3 tools/build_quotidien.py`.
- **Une quête :** `data/quests.json`, avec ses champs `mech` et `lvl`, puis `python3 tools/build_bundle.py`. Le script vérifie les références.
- **Un type d'étape de quête :** `Game.extSteps.<type> = (step, quest) => bool`.
- **Un type de contenu géolocalisé :** `Explore.register(fn)`.
- **Un territoire :** une entrée dans `data/territories.json` (polygone, couleur, numéro). Brume, rangs, filtres et aventures le prennent en compte sans autre changement.
- **Une autre ville :** les données sont déjà séparées du code (`data/`). Il resterait à paramétrer le centre de la carte (`AtlasMap.CENTER`) et le fond de carte. Ce n'est pas fait, volontairement : rien n'est construit avant d'être nécessaire.

## Performance

- **Carte :** les marqueurs ne sont reconstruits que si la signature de l'état change (statuts, calques, marqueurs, brume). Mesuré dans Chrome : environ 1 ms par geste sans changement, contre 12 ms pour une reconstruction.
- **Lieux du quotidien :** regroupés sur une grille d'écran, et rien n'est dessiné en dessous du zoom 16.
- **Tracé :** un point tous les 20 m, 6 000 points au plus, dessiné sur canvas et redessiné seulement s'il change.
- **GPS :** coupé quand l'écran s'éteint ou que l'app passe en arrière-plan, repris au retour.

## Tests

Les tests sont dans `tools/test_*.py`, avec Playwright et Chrome. Ils simulent la position, ce qui ne prouve rien sur le GPS ou le son d'un vrai iPhone.
