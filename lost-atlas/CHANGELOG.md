# Journal des modifications

## v6.0 — 17 novembre 2026 — La carte se dessine

Détail : `docs/RAPPORT-V6.md`. Architecture : `docs/ARCHITECTURE.md`.

### Ajouté
- **Lieux muets :** pas de nom sur la carte pour un lieu jamais trouvé.
- **Brume des territoires :** *terra incognita* jusqu'au premier pas relevé par GPS ou à la première découverte.
- **Tracé GPS à l'encre** (`js/trace.js`) : un point tous les 20 m, précision ±35 m, 6 000 points au plus. Calque « Mon tracé ». Kilomètres à pied dans Héros.
- **La piste :** après une découverte, une direction vers la page blanche la plus proche, et une flèche sur la carte.
- **Journal des erreurs de la session** dans le Diagnostic.
- **Format de sauvegarde v2,** avec migrations numérotées et copie de secours `lostAtlas.save.v1.avant-v2`.

### Modifié
- La carte ne reconstruit ses marqueurs que si l'état a changé : environ 1 ms par geste, contre 12 ms auparavant.
- Un geste qui échoue affiche un message et ne fige plus l'application.
- Le premier pas dans un territoire n'a pas de son. Un signal de proximité reste le message le plus visible.

### Tests
- `tools/test_v6.py` : 22 tests. Toutes les séries précédentes passent. Rien n'a été testé sur un vrai iPhone.


## v5.2 — 17 novembre 2026 — Lieux du quotidien, territoires, plein écran

### Ajouté
- **900 lieux du quotidien** (`data/quotidien.js`, produit par `tools/build_quotidien.py`) issus de l'extrait OpenStreetMap déjà embarqué pour le fond de carte (© contributeurs OSM, ODbL). On y trouve des cafés et salons de thé, des restaurants et petites tables, des boulangeries, des épiceries et marchés, des ateliers et boutiques d'artisanat, des librairies, des musées et galeries, des jardins et places, des portes et curiosités, des hammams, ainsi que des lieux de culte et des lieux pratiques (ces deux familles sont masquées par défaut). Chaque lieu a un identifiant stable, un nom, une famille, des coordonnées, un territoire (« en bordure » s'il est hors des polygones), une source et un niveau de fiabilité (`osm` : non vérifié sur place). Aucune description n'est inventée : la fiche dit que la source n'en donne pas.
- **Fusion des doublons** : 65 lieux OSM correspondent à des lieux déjà dans l'atlas. Ils ne sont pas recréés, et l'atlas garde ses identifiants, donc les sauvegardes restent intactes. Règle : mêmes mots distinctifs à moins de 80 m, et un café ne fusionne jamais avec un monument. Pour ajouter des lieux : `tools/quotidien_extra.json`, puis relancer le script.
- **Carte** : rien en vue d'ensemble ; au zoom 16 et 17, des regroupements discrets (pictogramme et nombre) qui zooment au toucher ; dès le zoom 18, une pastille par lieu. Treize pictogrammes. Filtres par famille et par territoire dans Calques. La fiche donne la famille, le territoire, le statut (inconnu ou visité), la position, la source, une invitation facultative, et les quêtes et donjons voisins.
- **Découverte** : « J'y suis » sur la fiche. Avec un GPS précis, il faut être à moins de 45 m ; sans GPS, la visite est validée sur parole. Un lieu ordinaire rapporte +5 en exploration et une ligne au carnet d'adresses (Sac → Adresses). Seules quatre collections donnent une carte : L'habitué (5 cafés, commune), Les mains de la ville (5 ateliers ou épiceries), Le carnet d'adresses (25 lieux) et Le flâneur des six territoires.
- **Territoires** : la vue « Les territoires » (bouton liste de la carte, et Héros) donne pour chacun un rang (Étranger, Passant, Habitué, Connaisseur, Gardien), la progression, les adresses, les quêtes, le donjon et le scellé. La fiche de territoire montre le rang et cinq compteurs (lieux, adresses, quêtes, secrets), le donjon et les quêtes ouvertes, ajoute un onglet Quotidien classé par famille, et un bouton « Seulement ce territoire » qui filtre toute la carte.
- **Aventures** : les cafés, boulangeries, ateliers, épiceries, librairies, galeries et jardins du quotidien peuvent devenir des rencontres. « C'est fait » ajoute le lieu au carnet d'adresses.
- **Plein écran iPhone** (`js/immersion.js`) : dans Safari sur iPhone, une seule fois après l'introduction, le jeu montre en trois gestes comment poser l'icône sur l'écran d'accueil, et l'invitation reste dans Héros. Dans le navigateur d'une autre app (Instagram, Facebook), il conseille d'ouvrir dans Safari. Ouvert depuis l'icône, le jeu le reconnaît et ne propose plus rien. Sont bloqués : le rebond, le zoom au double toucher hors carte, la sélection de texte hors des champs et le menu d'appui long. La page d'accueil GitHub (`tools/github-root/index.html`) redirige sans rien afficher, sur fond vert, et porte l'icône et le manifeste.

### Limite assumée
- Aucune page web ne peut masquer elle-même les barres de Safari. Le vrai plein écran passe par l'icône de l'écran d'accueil.

### Tests
- `tools/test_quotidien.py` : 28 tests. `test_session.py` (37), `test_v5.py` (40), `test4.py` (67), parcours v2, v3 et v4 : tous réussis, dans Chrome de bureau avec un iPhone simulé. Rien n'a été testé sur un vrai iPhone.


## v5.1 — 17 novembre 2026 — Commencer une aventure

### Ajouté
- **« Commencer une aventure »**, sur la carte et en tête de l'onglet Aventures. Le joueur choisit 1, 2, 3 ou 4 heures, ou une durée libre de 30 min à 8 h. Le jeu compose une partie à partir du contenu existant : un objectif (un donjon dès 2 h, sinon une quête), puis de l'exploration (lieux inconnus à révéler), des quêtes, des détails à observer, des secrets, des dérives et au moins une rencontre avec la ville réelle.
- **Génération** (`js/session.js`) : départ à la position GPS si le joueur est dans la médina, sinon dans le territoire où il lui reste le plus à vivre. Le temps de marche est estimé à 55 m/min avec détours, et la proposition tient dans 90 % du temps choisi, le reste allant aux imprévus. « Autre proposition » et « Autre quartier » sont disponibles. L'objectif est toujours dans le territoire annoncé.
- **Rencontres** : invitations facultatives liées aux boutiques, activités, cafés et restaurants du guide (« si c'est ouvert », « si le moment s'y prête »), et quatre invitations sans lieu (demander son chemin, une plaque de rue, entre joueurs, un seuil d'atelier). Chacune porte la règle : n'insister jamais, lieux ouverts au public seulement, aucune photo de personne sans accord.
- **Imprévus** : au plus un toutes les 12 minutes, jamais dans les 8 premières. Un vrai lieu inconnu qui se signale avec sa distance réelle, une découverte rare (secret photo proche), une quête secondaire à ajouter, une occasion (boutique ou activité proche), un défi de quinze minutes avec bonus, un murmure (dérive). Aucun événement réel n'est inventé : le défi est un événement de jeu, présenté comme tel.
- **Suivi** : les étapes se cochent seules quand la quête, le donjon, l'observation, le secret ou les lieux à révéler sont accomplis ; « C'est fait » ou « Pas cette fois » pour les rencontres et les dérives. Un compteur reste visible sur la carte. L'aventure survit à un rechargement.
- **Retour** : récit de fin (temps dehors, étapes, lieux trouvés, rencontres, imprévus, expérience, cartes rapportées), rangé dans le carnet sous « Aventures vécues ».
- **Trois cartes** : Le premier départ (1 aventure), Le seuil franchi (3 rencontres), Le grand voyageur (5 aventures, légendaire).

### Tests
- `tools/test_session.py` : 37 tests. `test_v5.py` (40), `test4.py` (67), parcours v2, v3 et v4 : tous réussis, dans Chrome de bureau avec position simulée. Rien n'a été testé sur iPhone.


## v5.0 — 17 novembre 2026 — moteur de proximité, quêtes sans formulaire, nouvelle direction artistique

Sauvegarde de la v4.2 : `lost-atlas-v4.2.zip` (inchangé). Sauvegardes v1 à v4.2 chargées telles quelles. Détail : `docs/RAPPORT-V5.md`.

### Ajouté
- **Moteur de proximité générique** : toute cible géolocalisée déclare catégorie, rayons, son et priorité ; `Explore.register` pour brancher un nouveau type de contenu.
- **Signal en deux temps** (approche, puis « tout près ») avec deux sons distincts ; sons « quête proche » et « tout près ».
- **Filtre des positions aberrantes** (saut de plus de 15 m/s ignoré, trois fois au plus).
- **Quêtes suivies** : signal propre près de leurs lieux, distance et direction à vol d'oiseau sur la fiche.
- **8 quêtes** traversant plusieurs territoires et 4 types d'étapes (collection, photographie, choses gardées, écho) ; 2 cartes hors série.
- **Feuille de style `css/v5.css`** : typographie, papier, boutons, billets de quête, cartes à rareté visible, numéro d'atlas sur les cartes, nouvelle révélation.

### Modifié
- **Un lieu ne se découvre plus tout seul par GPS** : le radar invite, le joueur révèle.
- **Observations et énigmes sans champ à remplir** ; l'hypothèse écrite devient facultative.
- **Catalogue des quêtes par mécanique**, avec niveau d'engagement, à la place des onglets.
- Une collection entamée compte comme quête en cours.

### Tests
- `test_v5.py` (40), `test4.py` (67), parcours v2 et v3, `test5.py`, `test_flat.py` : tous réussis, dans Chrome de bureau avec position simulée.
- Rien n'a été testé sur un iPhone.


## v4.2 — 16 novembre 2026 — GPS réel sur la carte, photos durables, publication depuis l'iPhone

Sauvegarde de la v4.1 : `lost-atlas-v4.1.zip` (inchangé). Sauvegardes v1 à v4.1 chargées telles quelles. Guide : `docs/GUIDE-IPHONE.md`.

### Ajouté
- **Bouton « Me localiser »** permanent sur la carte : demande l'autorisation, lance `watchPosition` (haute précision, délai 10 s, aucune position en cache), affiche un point bleu avec halo de précision, centre la carte. Le bouton devient « Suivi actif » puis « Recentrer ».
- **Deux modes de carte** : suivi automatique, ou exploration libre dès que tu déplaces la carte (la position continue de se mettre à jour, sans recentrage).
- **Feuille « GPS et exploration »** : état (inactif, recherche, disponible, imprécis, signal perdu, délai dépassé, refusé, indisponible, adresse non sécurisée), précision en mètres, heure de la dernière position, bouton d'arrêt, marche à suivre dans les réglages iOS en cas de refus.
- **Aucune position périmée** : le point bleu disparaît quand le suivi s'arrête.
- **Photos dans IndexedDB** (`js/photostore.js`), avec migration automatique des photos des versions précédentes. Choix dans la photothèque en plus de l'appareil photo, note personnelle, refus des doublons, avertissement quand le stockage se remplit, suppression.
- **Sauvegarde complète** (partie et photos) dans un seul fichier, et import correspondant. L'export léger sans photos reste disponible.
- **Diagnostic iPhone** (dans la feuille « GPS et exploration ») : mesure sur l'appareil ce qui fonctionne (adresse sécurisée, installation, localisation, son, écran allumé, vibration, stockage, hors ligne) et produit un rapport à copier.
- **Son de tenue débloquée** ; vibration utilisée quand le navigateur la propose.
- **Version à publier depuis un iPhone** : six fichiers sans dossier, fabriqués par `tools/build_flat.py` (`lost-atlas-publier.zip`).

### Non fait, et pourquoi
- **Ambiances sonores de fond** : écartées. Elles couvriraient les sons réels de la ville et consommeraient de la batterie ; le jeu ne joue que des signaux courts.
- **GPS téléphone verrouillé** : impossible pour une application web.
- **Reconnaissance d'image** : non développée, non simulée.

### Tests
- 66 tests automatiques (`tools/test4.py`), parcours v3 et v2, numéros et quêtes (`test5.py`), version à plat (`test_flat.py`, y compris rechargement hors ligne) : tous réussis, dans Chrome de bureau avec positions et photos simulées.
- Rien n'a été testé sur un iPhone. La liste de tests réels est dans `docs/GUIDE-IPHONE.md`.


## v4.1 — 16 novembre 2026 — quêtes de territoire et numéros d'atlas

- **Quêtes de territoire** : une par territoire (six), dans Aventures et depuis la fiche de chaque territoire. Trois buts sans ordre, remplis automatiquement : trouver des lieux culturels (la moitié, cinq au plus), regarder avant de lire dans deux lieux, garder une chose vue sur place. Récompense : le sceau du territoire, une carte rare.
- **Numéros d'atlas** : chaque lieu porte désormais un numéro unique sur la carte, dans les listes et dans sa fiche (1 à 53 pour les lieux culturels, territoire par territoire, puis les adresses). Plus aucun numéro en double. Le numéro d'origine du guide papier reste indiqué dans la fiche. La recherche d'une liste accepte le numéro.
- **27 quêtes ajoutées, classées par territoire** (41 au total) : chaque territoire a maintenant les siennes, listées dans sa quête de territoire. Elles s'appuient uniquement sur les fiches existantes et restent facultatives.
- **Deux donjons de plus** : *Le Cercle de Jemaa el-Fna* (territoire I) et *Le Bout de la ville* (territoire III), sur le modèle de Mouassine. Un septième secret photographique (les piliers de la première Koutoubia) et trois échos de plus.
- Les territoires IV, V et VI n'ont pas encore de donjon.
- Sauvegardes inchangées : les numéros sont calculés à l'affichage, aucun identifiant n'est modifié.
- Tests : 46 tests v4 relancés, parcours v3 et v2 relancés, plus `tools/test5.py` (numéros uniques, quête de territoire, sceau donné une seule fois). Simulations, comme avant.


## v4 — 16 novembre 2026 — exploration sonore et secrets photographiques

Sauvegarde de la v3 : `lost-atlas-v3.zip` (inchangé). Les sauvegardes v1, v2 et v3 se chargent telles quelles. Rapport détaillé : `docs/RAPPORT-V4.md`.

### Ajouté
- **Mode exploration** (pastille « Explorer » sur la carte) : le GPS compare ta position aux lieux, secrets et donjons et fait entendre un signal quand tu approches. Rayons par type (150 m lieux majeurs, 75 m lieux culturels, 30 m et plus secrets, 110 m donjons), seuil de précision, zones d'entrée et de sortie distinctes, délai minimal de 45 s entre deux signaux, priorité au plus intéressant, regroupement des éléments voisins, mémoire de 3 h par élément.
- **Identité sonore** : huit motifs originaux synthétisés (lieu proche, lieu majeur, secret, donjon, lieu trouvé, nouvelle carte, artefact, secret révélé). Volume, mode silencieux, catégories réglables séparément, bouton « Écouter ».
- **Mode poche** : écran noir, tactile verrouillé (appui long pour sortir), écran maintenu allumé quand le navigateur le permet.
- **Secrets photographiques** : six détails réels, visibles depuis l'espace public, tirés des fiches du jeu. Validation par la position (ou « sur parole » sans GPS, noté ainsi) puis par la réponse à « qu'as-tu photographié ? ». Récompenses : six cartes de découverte, un artefact au premier secret, une tenue au troisième.
- **Carnet** : secrets révélés avec leur photo, signaux entendus par jour, lieu connu proche d'une chose gardée.
- Un secret n'apparaît sur la carte qu'après son signal.
- `js/sound.js`, `js/explore.js`, `js/photo.js`, `docs/RAPPORT-V4.md`, `tools/test4.py`.

### Modifié
- Le carillon de découverte est remplacé par le motif « lieu trouvé » ; son réglage est dans « Mode exploration et sons » (écran Héros ou pastille de la carte).
- Les toasts « Repéré à proximité » sont remplacés par les signaux quand le mode exploration est actif.
- Service worker : cache `lost-atlas-v4`.

### Non fait, et pourquoi
- **GPS et sons téléphone verrouillé ou application en arrière-plan** : impossible pour une application web. Demande une enveloppe native (Capacitor) avec le mode de localisation en arrière-plan d'iOS.
- **Reconnaissance visuelle des photos** : non développée, non simulée. La photo n'est ni analysée ni envoyée.

### Tests
- 46 tests automatiques v4 réussis (`tools/test4.py`), plus les parcours v3 et v2 relancés sans erreur. Positions et photos simulées.
- Non testé : iPhone réel, HTTPS réel, appareil photo réel, sons dans la rue, autonomie.


## v3 — 16 novembre 2026 — premier prototype « jeu »

Sauvegarde de la v2 : `lost-atlas-v2.zip` (inchangé). Les sauvegardes v1 et v2 se chargent telles quelles.

### Ajouté
- **Cartes de collection** : une carte par lieu culturel trouvé (53 possibles), rare si le lieu n'était pas sur la carte et que tu l'as posé toi-même. Un sceau s'ajoute quand tu y as observé. Trois cartes hors série (donjon, premier écho, page blanche). Les lieux déjà découverts dans une ancienne sauvegarde ont leur carte.
- **Sac** (ancien onglet Collection) : Cartes, Objets (les 21 artefacts), Tenues.
- **Héros** (ancien onglet Profil) : personnage dessiné, nom, 10 éléments de tenue débloqués par ce que tu as fait.
- **Carnet** (nouvel onglet) : bouton « Garder » sur la carte (trois mots et/ou une photo, situés si le GPS est disponible), pages datées, cartes trouvées ce jour-là, échos.
- **Aventures** (ancien onglet Quêtes) : consignes de dérive ; premier donjon, *Le Dédale de Mouassine* (six salles sans ordre, cœur ouvert à trois, enquête par réécriture de sa propre phrase, synthèse avec statut documentaire). Les 14 quêtes de la v2 restent jouables en dessous.
- **Échos** : trois paires de lieux posées côte à côte sans commentaire ; l'explication n'apparaît qu'après que tu as écrit le lien.
- `data/v3.js`, `js/v3.js`, `css/v3.css`, `docs/CONCEPTION-V3.md`.

### Modifié
- Barre d'onglets : Monde, Aventures, Carnet, Sac, Héros. Le Codex reste accessible par le bouton « Savoir » du Carnet et par tous les liens.
- XP, niveaux, compétences et insignes ne sont plus affichés ni annoncés. Ils restent calculés et enregistrés pour la compatibilité des sauvegardes. La pénalité d'indice n'est plus mentionnée.
- Deux fiches corrigées pour la rigueur documentaire : fontaine Mouassine (fait et interprétation séparés) et souk des teinturiers (le lien avec la fontaine est présenté comme une hypothèse non sourcée).
- Service worker : cache `lost-atlas-v3`.

### Non fait, volontairement
- Aucun multijoueur, aucune contribution communautaire, aucun serveur : rien n'est simulé.
- Pas de reconnaissance visuelle, de réalité augmentée ni de notifications.

### Tests
- Automatiques (Chrome sans écran, 390×844, GPS simulé) : parcours v3 complet et parcours v2 conservés, aucune erreur console, aucun débordement horizontal.
- Non testé : iPhone réel, HTTPS réel, appareil photo réel, plein soleil, autonomie.


## v2 — 16 novembre 2026 (lot 1 de la phase 2 : cartographie)

### Ajouté
- **Atlas dessiné embarqué** : 5 863 voies (rues, derbs, ruelles ; 1 509 nommées) et 589 surfaces (places, jardins, cimetières, bâtiments nommés, lieux de culte, remparts) extraites d'OpenStreetMap et dessinées dans le style de l'atlas. Fonctionne sans réseau, y compris dans Claude. Fichiers : `js/basemap.js`, `data/basemap.js`, `tools/build_map.py`, `tools/osm_raw.json`.
- **Positions** : 124 lieux placés sur 186 (60 auparavant), dont 108 vérifiés. Les positions OpenStreetMap viennent d'un rapprochement de noms relu à la main (`tools/osm_matches.json`).
- **Quatre statuts de fiabilité** : vérifiée, estimée (calculée depuis la carte papier), indicative, non positionné. Les relevés papier conservent page, numéro, pixel sur la photo et méthode de conversion (`paper` dans `data/places.json`).
- **Filtres par catégorie** pour les adresses du guide (se restaurer, prendre un verre, shopping, se loger, activités).
- Choix du fond : « Atlas dessiné (hors ligne) » ou « OpenStreetMap en ligne ».

### Corrigé
- Deux positions indicatives étaient fausses d'environ 170 à 190 m (Bab Debbagh, zaouïa de Sidi Bel Abbès) : remplacées par les positions OpenStreetMap.
- Précision du relevé papier de la page 75 : écart médian mesuré de 46 m (annoncé ± 40 m).

### Fichiers modifiés
`index.html`, `css/style.css`, `js/map.js`, `js/ui.js`, `js/views.js`, `js/storage.js`, `service-worker.js`, `tools/build_places.py`, `data/places.json`, `data/bundle.js`, `README.md`.

### Compatibilité
Les sauvegardes de la v1 se chargent telles quelles. La v1 est conservée dans `lost-atlas-v1.zip`.

### Limites restantes
- 61 lieux restent non positionnés (absents d'OpenStreetMap sous ce nom, ou rapprochement trop incertain).
- L'atlas dessiné est un instantané : il ne se met pas à jour seul.
- Toujours non testé sur un vrai iPhone ni en HTTPS réel (installation, GPS, hors ligne).

## v1 — 15 novembre 2026
Première version jouable.
