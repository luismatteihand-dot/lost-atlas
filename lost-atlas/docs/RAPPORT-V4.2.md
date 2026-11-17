# Rapport de mission — Lost Atlas v4.2

17 novembre 2026. Ce rapport suit les cinq phases demandées. Aucun test n'a été fait sur un iPhone : tout ce qui est noté « réussi » l'a été dans Chrome de bureau piloté automatiquement, avec des positions et des photos simulées.

## Phase 1 — Diagnostic

| Sujet | Constat |
| --- | --- |
| Moteur de carte | Leaflet 1.9.4, embarqué. Fond de carte vectoriel dessiné hors ligne (5 863 rues), tuiles OpenStreetMap en option |
| Données | 186 lieux, 33 savoirs, 41 quêtes, 22 artefacts, 3 donjons, 7 secrets photographiques, 6 échos ; fichiers séparés du code dans `data/` |
| Sauvegarde | `localStorage`, clé `lostAtlas.save.v1`, format étendu version après version sans renommer de clé |
| Dépendances | Leaflet seul. Aucun service en ligne, aucun compte |
| Déjà opérationnel avant la 4.2 | Carte, lieux, quêtes, donjons, cartes de collection, personnage, carnet, échos, mode exploration, sons, secrets photographiques |
| Incomplet avant la 4.2 | Pas de bouton « Me localiser » lisible, pas de carte libre sans recentrage, états GPS sommaires, photos dans `localStorage`, publication supposant un ordinateur |
| Risques de régression | Suivi GPS partagé entre la carte et le mode exploration ; migration des photos |
| Safari iOS | Pas de position ni de son en arrière-plan ; son seulement après un toucher ; sélecteur de fichiers sans dossiers ; vibration en général absente |

## Phase 2 — Architecture

| Module | Fichier | Rôle |
| --- | --- | --- |
| Carte et GPS | `js/map.js` | Affichage, `watchPosition`, point bleu, suivi automatique ou carte libre |
| Proximité et états | `js/explore.js` | États GPS, zones d'entrée et de sortie, délai, priorité, mode exploration, mode poche |
| Son | `js/sound.js` | Neuf motifs synthétisés, préférences |
| Photos | `js/photostore.js` | IndexedDB, migration, repli |
| Secrets | `js/photo.js` | Fiches, validation, récompenses |
| Carnet, collections, personnage, donjons | `js/v3.js` | |
| Progression et règles | `js/game.js` | Inchangé |
| Diagnostic | `js/diag.js` | Mesures sur l'appareil |
| Contenus | `data/` | Lieux, fiches, savoirs, quêtes, donjons, secrets |

La version à publier (`lost-atlas-publier`) est fabriquée à partir de ces modules ; les sources ne sont pas fusionnées.

## Phase 3 — Ce qui a été développé

Voir `CHANGELOG.md`, entrée v4.2. Deux écarts par rapport à la demande :

- **Ambiances sonores** : non faites. Elles couvriraient les sons de la ville et useraient la batterie.
- **Enregistrement du trajet dans le journal** : non fait. Le carnet garde les signaux entendus et les choses gardées, pas la trace du parcours.

Validation des photographies : niveau 1 (trace) par « Garder » ; niveau 2 (cohérence géographique, plus une réponse du joueur) pour les secrets ; niveau 3 (reconnaissance d'image) non développé, point d'entrée prévu dans `js/photo.js`.

## Phase 4 — Tests

| Famille | Automatisés, réussis | À faire sur l'iPhone |
| --- | --- | --- |
| GPS | Activation, refus, indisponible, délai dépassé, signal perdu, adresse non sécurisée, précision, arrêt, recentrage, suivi automatique, carte libre | Position réelle, précision en ruelle, autorisations iOS |
| Proximité | Entrée, sortie, marge, délai, priorité, lieux voisins, lieu déjà trouvé, GPS imprécis | Justesse des rayons sur place |
| Son | Déclenchement des motifs, catégories, mode silencieux, absence de répétition | Sons audibles, bouton silencieux, reprise après verrouillage |
| Photo | Champ appareil photo, photothèque, annulation, compression, stockage, doublon, suppression, persistance, migration, sauvegarde complète | Ouverture réelle de l'appareil photo, poids des images |
| Régression | Parcours v2 et v3, numéros, quêtes de territoire, import et export | — |
| Publication | Version à plat : chargement, GPS, rechargement hors ligne | Mise en ligne depuis Safari, installation sur l'écran d'accueil |

66 tests dans `tools/test4.py`, plus `test3.py`, `test_v2flows.py`, `test5.py`, `test_flat.py`. La liste des 17 tests réels est dans `GUIDE-IPHONE.md`.

## Critères de réussite

| Critère | État |
| --- | --- |
| « Me localiser », point bleu, suivi, carte libre, recentrage | Développé, testé en simulation ; à confirmer sur iPhone |
| Mode exploration, détection, signaux sans répétition | Développé, testé en simulation ; à confirmer sur iPhone |
| Photo libre au carnet, secrets, récompenses dans la collection | Développé, testé en simulation ; appareil photo à confirmer |
| Données précédentes préservées, fonctions historiques | Vérifié par les tests de régression |
| Publiable sans ordinateur | Version à plat prête ; procédure tirée de la documentation, non exécutée sur iPhone |

## Limites connues

1. Aucune position ni aucun son téléphone verrouillé ou jeu en arrière-plan. Une application native le permettrait, mais elle se compile sur un Mac. Réponse retenue : le mode poche.
2. La photo d'un secret n'est pas analysée.
3. Partie et photos sont liées à l'adresse du jeu ; changer d'hébergeur demande d'exporter puis d'importer la sauvegarde complète.
4. Les sources en dossiers ne se publient pas facilement depuis un iPhone ; la version à plat doit être refabriquée à chaque modification.
5. Les textes des donjons de Jemaa el-Fna et de Ben Youssef n'ont pas été relus un à un contre le Codex.
6. Sans repérage, la présence actuelle des détails à photographier depuis la rue reste à constater.
