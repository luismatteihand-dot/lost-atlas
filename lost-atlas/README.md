# Marrakech — The Lost Atlas

RPG d'exploration culturelle de Marrakech. Application web mobile (HTML / CSS / JavaScript), sans compte ni serveur, installable sur l'écran d'accueil.

## Lancer l'application

L'application est un simple dossier de fichiers statiques.

- **En local** : `python3 -m http.server 8000` dans ce dossier, puis ouvrir `http://localhost:8000`.
- **En ligne (nécessaire pour l'iPhone)** : déposer le dossier sur n'importe quel hébergement statique en **HTTPS** — GitHub Pages, Netlify (glisser-déposer du dossier ou du zip sur app.netlify.com/drop), Cloudflare Pages… Le HTTPS est obligatoire pour le GPS et le mode hors ligne.

## Installer sur iPhone

1. Ouvrir l'adresse HTTPS dans **Safari**.
2. Bouton Partager → **Sur l'écran d'accueil**.
3. Lancer « Lost Atlas » depuis l'icône : plein écran, sans barre d'adresse.
4. Au premier appui sur le bouton GPS, autoriser la localisation « lorsque l'app est active ».

Ouvre l'application une première fois avec du réseau : elle se met en cache et fonctionne ensuite hors ligne (les tuiles de carte déjà consultées aussi).

## Architecture

```
index.html            structure de la page
css/style.css         identité visuelle
js/storage.js         sauvegarde locale, export / import
js/data.js            chargement des contenus
js/game.js            règles : statuts, épreuves, XP, déblocages, quêtes, chaînes
js/basemap.js         atlas dessiné embarqué (rues, derbs, noms)
js/map.js             carte Leaflet, GPS, marqueurs
js/ui.js              fiches, épreuves, carte, navigation
js/views.js           Codex, Quêtes, Collection, Profil
js/art.js             icônes et illustrations (SVG)
data/*.json           TOUS les contenus (voir ci-dessous)
data/bundle.js        copie de secours des JSON (générée)
tools/                scripts Python de génération et de vérification
vendor/               Leaflet 1.9.4 (embarqué, pas de CDN)
manifest.json, service-worker.js, assets/   installation et hors ligne
```

Le code ne contient aucun contenu : lieux, fiches, savoirs, quêtes, artefacts et barèmes sont dans `data/`.

## Ajouter des lieux ou un territoire

1. **Lieux d'une carte du guide** : dans `tools/build_places.py`, ajouter les lignes `(numéro, "Nom")` dans `LEGENDS` sous la bonne catégorie (`inc`, `voir`, `act`, `loger`, `manger`, `verre`, `shop`).
2. **Position** : seulement si elle est vérifiée, dans `POS` : `"t2-12": (lat, lng, "v", "source")` (`"v"` = sourcée, `"a"` = approximative). Sans entrée, le lieu apparaît dans les listes mais pas sur la carte, et le joueur peut le placer lui-même.
3. Lancer `python3 tools/build_places.py` (régénère `data/places.json`).
4. **Fiche de jeu** (facultatif) : dans `data/fiches.json`, sous l'identifiant du lieu (`t2-12`) : `teaser`, `text`, `skill`, `observe {q, reveal}`, `enigma {q, a[], hints[3], explain}`.
5. **Nouveau territoire** : ajouter un objet dans `data/territories.json` (identifiant, nom, couleur, centre, polygone indicatif) et une entrée `LEGENDS`.
6. **Savoirs** : `data/codex.json` → `entries` (chaque paragraphe porte sa marque `fait` / `interp` / `hyp` / `trad`, et la fiche ses `sources`). **Quêtes** : `data/quests.json`. **Artefacts** : `data/artifacts.json`.
7. Lancer `python3 tools/build_bundle.py` : il vérifie toutes les références croisées et régénère `data/bundle.js`.
8. Après une mise à jour en ligne, incrémenter `VERSION` dans `service-worker.js`.

Conditions de déblocage (`unlock`) : `{"place": id}`, `{"mastered": id}`, `{"quest": id}`, `{"chain": id}`, `{"codex": id}`, `{"count": "discovered", "territory": "t1", "kind": "culture", "min": 5}`, combinables avec `{"any": [...]}` et `{"all": [...]}`.

## Mettre à jour le fond de carte

`tools/osm_raw.json` est un extrait OpenStreetMap (voies, surfaces, lieux nommés) de la zone 31.605–31.650 N, 8.030–7.970 O. Pour le rafraîchir, remplacer ce fichier par un nouvel extrait au même format puis lancer `python3 tools/build_map.py`. Pour revoir les positions, éditer `tools/osm_matches.json` puis lancer `python3 tools/build_places.py` et `python3 tools/build_bundle.py`.

## Limites connues

- **Positions** : 124 lieux sur 186 sont sur la carte : 108 vérifiés (OpenStreetMap, Wikipedia), 15 estimés depuis la carte du guide p. 75 (écart médian mesuré : 46 m), 1 indicatif ; ces 16 derniers sont en pointillés. Les 61 autres ne sont pas placés : aucune position n'est inventée.
- **Carte hors ligne** : l'atlas dessiné (rues, derbs, noms) est embarqué et fonctionne sans réseau. Le fond « OpenStreetMap en ligne » exige le réseau ; seules ses tuiles déjà vues sont en cache.
- **GPS** : application ouverte et écran allumé uniquement (limite des navigateurs iOS). Dans les souks couverts la précision chute : la validation manuelle est toujours proposée.
- **Sauvegarde** : dans le navigateur de l'appareil. iOS peut purger les données d'un site non utilisé pendant plusieurs semaines : exporter régulièrement (Profil → Exporter).
- **Contenus** : horaires et ouvertures ne sont pas suivis (plusieurs sites ont fermé après le séisme de 2023).

## Crédits

Fond de carte © contributeurs OpenStreetMap (ODbL). Leaflet (BSD-2). Coordonnées et repères historiques : Wikipedia / Wikidata (CC BY-SA), UNESCO, ouvrages cités dans le Codex.


## Version 3 — le jeu

- `data/v3.js` : cartes hors série, dessin de chaque carte, tenues, dérives, donjons, échos. Pour ajouter un donjon, ajoute un objet dans `adventures` (salles `observe` liées à un lieu qui a une observation, `rumeur`, `free`) ; pour une tenue, un objet dans `outfits` avec une condition `unlock`.
- `js/v3.js` : logique et écrans v3. L'état vit dans `Game.S.v3` ; les photos dans la clé locale `lostAtlas.photos.v1`.
- `docs/CONCEPTION-V3.md` : vision, architecture des systèmes, feuille de route, recommandation technique.
- Tests : `python3 test3.py` (parcours v3) et `python3 test_v2flows.py` (parcours hérités), depuis le dossier parent, avec Playwright et Chrome.


## Version 4 — mode exploration, sons, secrets photographiques

> **Depuis un iPhone seul** : suis `docs/GUIDE-IPHONE.md` et publie `lost-atlas-publier.zip` (six fichiers sans dossier). La procédure ci-dessous suppose un ordinateur ; Netlify Drop, en particulier, ne fonctionne pas depuis un téléphone.

### Mettre le jeu en ligne en HTTPS (obligatoire pour le GPS et l'appareil photo sur iPhone)

Le dossier est un site statique : aucun serveur d'application, aucune compilation.

**Le plus rapide, sans compte technique — Netlify Drop**
1. Décompresse `lost-atlas-v4.zip`.
2. Ouvre https://app.netlify.com/drop dans un navigateur d'ordinateur et glisse le dossier `lost-atlas` dans la page.
3. Netlify affiche une adresse en `https://….netlify.app`. C'est celle du jeu.

**Avec GitHub Pages**
1. Crée un dépôt, dépose-y le contenu du dossier `lost-atlas` (le fichier `index.html` à la racine).
2. Réglages du dépôt → Pages → source : branche principale, dossier racine.
3. L'adresse est `https://<ton-compte>.github.io/<dépôt>/`.

### Tester sur iPhone
1. Ouvre l'adresse dans **Safari**, puis Partager → « Sur l'écran d'accueil ». Lance le jeu depuis l'icône.
2. Réglages iPhone → Confidentialité → Service de localisation : activé, et « Position exacte » pour le site quand Safari le demande.
3. Bouton latéral de sonnerie sur **sonnerie** (pas silencieux) et volume monté : sur iPhone, le son d'une page web peut être coupé par le mode silencieux.
4. Touche la pastille « Explorer » → « Commencer l'exploration ». Accepte la localisation. Touche « Écouter » pour vérifier chaque son.
5. Si la ligne « Écran » indique qu'il ne peut pas être maintenu allumé : Réglages → Luminosité et affichage → Verrouillage automatique → Jamais, le temps du test.
6. Touche « Mode poche », range le téléphone, marche vers la fontaine Mouassine. Tu devrais entendre le donjon vers 110 m, le lieu vers 75 m, puis le lieu trouvé et le secret tout près.
7. Ouvre le secret (toast, marqueur « ? » sur la carte, ou Carnet), prends la photo, réponds.

À noter pendant le test : précision GPS affichée dans les ruelles, signaux manqués ou en trop, sons audibles dans le bruit, autonomie sur une heure, accidents de tactile en poche.

### Régler la détection
Tout est dans `js/explore.js`, objet `CFG` : rayons et précision exigée par type, délai entre signaux (`minGap`), mémoire (`rehear`), regroupement (`group`), marge de sortie. Les lieux majeurs sont listés dans `data/v3.js` (`major`).

### Ajouter un secret photographique
Dans `data/v3.js`, tableau `photoQuests` : `at` (identifiant d'un lieu positionné), `signal` et `r` en mètres, `riddle`, `options`, `answer`, `reveal`, statut `k`, et une carte dans `specialCards` nommée par `reward.card`. N'ajoute que des détails visibles depuis l'espace public et documentés.

### Brancher une reconnaissance d'image plus tard
`js/photo.js`, objet `VALIDATORS` : ajouter une fonction `vision(q, photo)` qui renvoie `{ ok }`, et l'appeler dans `pq-pick` avant `succeed`. Elle demandera soit un modèle embarqué (lourd), soit un service en ligne (coût par image, réseau, accord explicite du joueur pour l'envoi de la photo).

### Tests
`python3 tools/test4.py` (46 tests v4), `tools/test3.py` (parcours v3), `tools/test_v2flows.py` (parcours v2), lancés depuis le dossier parent de `lost-atlas`, avec Playwright et Chrome.


## Version 6 — la carte se dessine

Lieux muets, brume des territoires, tracé GPS, piste après chaque découverte. La carte est dix fois plus légère quand rien ne change, les erreurs sont isolées, et les sauvegardes migrent automatiquement. À lire : `docs/RAPPORT-V6.md`, `docs/ARCHITECTURE.md` et `docs/GUIDE-IPHONE.md` (installation et test sur iPhone). Ce qui a été fait depuis la v5 (aventures, lieux du quotidien, territoires, plein écran) est dans `CHANGELOG.md`.

## Version 5 — moteur de proximité, quêtes sans formulaire, nouvelle direction artistique

Signal en deux temps pour tout contenu géolocalisé, révélation par le joueur, positions aberrantes écartées, quêtes signalées et guidées à vol d'oiseau, 8 quêtes nouvelles, feuille de style `css/v5.css`. Détail dans `docs/RAPPORT-V5.md`. Tests : `tools/test_v5.py` (40) en plus des précédents. Rien n'a été testé sur un iPhone.

## Version 4.2 — GPS sur la carte, photos, iPhone seul

- Modules : `js/map.js` (carte et suivi GPS), `js/explore.js` (états GPS, proximité, mode exploration), `js/sound.js`, `js/photostore.js` (IndexedDB), `js/photo.js` (secrets), `js/v3.js` (carnet, cartes, personnage, donjons), `js/diag.js` (diagnostic sur l'appareil).
- Version à publier : `python3 tools/build_flat.py` produit `../lost-atlas-publier/`. Je la refabrique à chaque livraison ; tu n'as pas à lancer cette commande.
- Publication, mise à jour, installation, autorisations et tests réels : `docs/GUIDE-IPHONE.md`.
