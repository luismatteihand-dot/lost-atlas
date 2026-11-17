# Marrakech Lost Atlas — conception v3

État au 16 novembre 2026. Ce document distingue partout ce qui est **fait** (dans le prototype v3), ce qui est **prévu** et ce qui **demande un serveur**.

## 1. Audit de la base (résumé)

| Élément | État | Décision |
| --- | --- | --- |
| Carte vectorielle hors ligne (5 863 rues, 1 509 nommées) | Fonctionne | Gardée telle quelle : c'est le monde du jeu |
| 186 lieux, 124 positionnés, statuts de fiabilité | Fonctionne | Gardés. 53 lieux culturels portent le jeu ; 133 adresses pratiques restent une couche masquée |
| Fiches, observations, Codex sourcé, chaînes | Fonctionne | Gardés ; deux fiches corrigées |
| 14 quêtes, énigmes à mot-clé | Fonctionne | Gardées, reléguées sous les donjons |
| XP, niveaux, compétences, insignes | Fonctionne | Masqués (plus d'affichage, plus d'annonce), conservés en sauvegarde |
| 21 artefacts dessinés | Fonctionne | Gardés, rangés dans le Sac |
| Sauvegarde locale, export/import | Fonctionne | Gardée, format étendu sans rupture (`v3`) |
| GPS | Fonctionne écran allumé ; non testé sur iPhone réel | Jamais requis |

## 2. Vision consolidée

Un jeu d'aventure dont le terrain est la ville réelle. Le joueur marche, trouve, garde, entre dans des donjons qui sont des quartiers, et rapporte des cartes, des objets et des tenues qui racontent ce qu'il a fait. La culture est la matière du jeu, pas son but affiché.

Trois règles tiennent ensemble les deux demandes (un vrai jeu, pas une checklist) :
1. **On ne gagne que par un acte réel.** Une carte vient d'un lieu atteint, une tenue d'une chose accomplie. Rien ne s'achète, rien ne tombe à chaque geste.
2. **Rien n'est obligatoire ni ordonné.** Salles de donjon dans n'importe quel ordre, dérives sans but, « Garder » sans raison.
3. **Le téléphone est le carnet.** En marchant : la carte et un bouton. Le reste se lit assis.

## 3. Architecture fonctionnelle

Boucle principale : **marcher → trouver ou garder → rapporter (carte, page de carnet) → relier (écho, cœur de donjon) → repartir avec une question**.

| Système | Rôle | Alimente | État |
| --- | --- | --- | --- |
| Monde (carte) | Terrain, lieux, choses gardées | Tout | Fait |
| Découverte de lieu | « J'y suis » par GPS ou sur parole | Cartes, Codex, donjons | Fait (v2) |
| Garder | Trace libre : mots, photo, position facultative | Carnet, salle libre des donjons, tenues | Fait |
| Cartes de collection | Souvenir d'un lieu atteint ; rareté = difficulté réelle | Sac, pages du carnet, échos | Fait |
| Donjons | Quartier à salles libres + cœur (enquête) | Carte légendaire, tenue | Fait : 1 donjon |
| Dérives | Invitations à marcher autrement | Rien, volontairement | Fait |
| Échos | Deux traces côte à côte, lien écrit par le joueur | Carte hors série, tenue | Fait : 3 paires |
| Personnage et tenues | Identité ; chaque pièce rappelle un acte | Héros, couverture du carnet | Fait : 10 pièces |
| Codex | Savoir sourcé, consulté à la demande | Enquêtes | Fait (v2), fresque reportée |
| Rencontres, guildes, défis | Jeu à plusieurs | — | Demande un serveur |
| Contributions des joueurs et artistes | Carte vivante | — | Demande un serveur et une modération |

Sécurité intégrée : tout se joue depuis l'espace public ; les salles payantes ou fermées ne sont jamais obligatoires ; les consignes de dérive portent leurs règles ; aucune photo n'est requise ; aucune position de joueur n'est transmise (il n'y a pas de serveur).

## 4. Feuille de route

| Étape | Contenu | Dépend de |
| --- | --- | --- |
| **A. Prototype local (v3, fait)** | Ce document | — |
| B. Validation terrain | Test sur iPhone réel en HTTPS, à Marrakech ; corrections | Un hébergement statique (GitHub Pages, Netlify…) |
| C. Contenu local | 2 à 3 donjons de plus (Kasbah, Bab Doukkala), fresque du Codex, regards | Résultats de B |
| D. Comptes et synchronisation | Profil en ligne, sauvegarde multi-appareils | Un backend (voir § 5) |
| E. Contributions | Proposer un lieu, une œuvre ; file de validation ; statuts : proposition, observation personnelle, vérifié, création autorisée, sourcé | D + modération humaine |
| F. Social | Présence consentie par zone large (jamais la position exacte), groupes, défis de connaissance ou d'exploration asynchrones | D + règles de sécurité |
| G. Autres villes | Un dossier de données par ville, même moteur | Voir § 5 |

Les étapes D à G ne sont pas commencées. Rien dans le prototype ne les simule.

## 5. Recommandation technique

- **Garder l'application web installable (PWA) pour B et C.** Elle existe, fonctionne hors ligne, ne demande ni compte développeur ni boutique, et suffit à valider le jeu. La réécrire maintenant coûterait des semaines sans rien apprendre sur le gameplay.
- **Limites connues du web sur iPhone**, à vérifier sur appareil : pas de GPS en arrière-plan, pas de notification sans serveur, stockage local limité, pas de réalité augmentée. Si B montre que le GPS écran éteint ou les notifications sont indispensables, envelopper la même application avec Capacitor (code conservé) plutôt que réécrire en natif.
- **Données par ville.** Le moteur ne contient aucun nom de lieu. Une ville = `territories`, `places`, `fiches`, `codex`, `quests`, `artifacts`, un fond de carte (`basemap.js`, produit par `tools/build_map.py` depuis un extrait OpenStreetMap) et un `v3.js`. Il reste à charger ces fichiers selon la ville choisie : aujourd'hui Marrakech est chargée en dur.
- **Backend, le moment venu (D).** Un service géré avec authentification, base Postgres et stockage de fichiers (type Supabase) suffit pour comptes, synchronisation, contributions et modération ; l'extension PostGIS couvre les requêtes géographiques. Le jeu doit rester jouable sans réseau : le serveur synchronise, il n'arbitre pas l'exploration solo.
- **Modération.** Aucune contribution publiée sans validation ; signalement et retrait ; pas de position précise de joueur stockée. À concevoir avant d'ouvrir E, pas après.

## 6. Tests et limites

- Tests automatiques : `test3.py` (parcours v3) et `test_v2flows.py` (parcours v2). Ce sont des simulations dans Chrome de bureau avec GPS fictif.
- Aucun test réel sur smartphone n'a été fait. Restent à vérifier : installation sur l'écran d'accueil, appareil photo, lisibilité au soleil, précision GPS dans les ruelles, autonomie, taille du stockage avec photos.
- Sans repérage sur place, le donjon de Mouassine repose sur des lieux documentés ; ce qu'on voit réellement aujourd'hui (teinturiers, fondouks ouverts) reste à constater.
