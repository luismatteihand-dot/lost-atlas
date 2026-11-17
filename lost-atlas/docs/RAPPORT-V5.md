# Lost Atlas v5 : ce qui a changé

17 novembre 2026. Version précédente conservée : `lost-atlas-v4.2.zip`. Les sauvegardes v1 à v4.2 se chargent telles quelles.

## 1. GPS et immersion

- **Moteur de proximité unique** (`js/explore.js`). Chaque contenu géolocalisé déclare identifiant, catégorie, position, rayon d'approche, rayon de proximité, son, priorité. Lieux, lieux majeurs, secrets, donjons et étapes de quêtes passent tous par le même moteur. Un nouveau type de contenu se branche par `Explore.register(...)`, sans toucher au moteur.
- **Signal en deux temps.** Approche (150 m pour un lieu majeur, 75 m pour un lieu ou une quête), puis « tout près » à 30 ou 40 m, avec un son différent. Un secret garde un seul signal à 30 m.
- **Rien ne se révèle tout seul.** Sur place, le radar affiche « Tu y es : un lieu t'attend » et c'est toi qui retournes la carte. Avant, le GPS découvrait le lieu à ta place.
- **Positions aberrantes écartées** (`js/map.js`) : un saut plus rapide que 15 m/s est ignoré, trois fois de suite au plus, pour ne jamais bloquer une vraie position.
- **Quêtes signalées.** Une quête commencée ou suivie (« Me prévenir quand j'approche ») émet son propre signal près de ses lieux ; une quête suivie passe avant les autres signaux.
- **Sons** : deux motifs nouveaux (quête proche, tout près), soit onze motifs originaux synthétisés. Toujours aucune musique de fond.
- Déjà en place depuis la v4.2 et conservé : hystérésis, délai minimal de 45 s, mémoire de 3 h, regroupement à 60 m, seuil de précision, états du GPS, mode poche, écran maintenu allumé.

## 2. Quêtes

- **Plus de formulaire.** Une observation est une question posée, puis un seul geste, « J'ai regardé », qui donne la révélation. Écrire son hypothèse reste possible, replié sous « Aller plus loin ». Une énigme propose « Je crois savoir » et « Un indice », sans champ de saisie.
- **Catalogue par mécanique** au lieu d'onglets : découvrir, observer, enquêter, comparer, collectionner, photographier, secret.
- **Trois niveaux d'engagement** affichés sur chaque quête : découverte immédiate (18), exploration active (29), enquête facultative (2).
- **Guidage discret** : la fiche donne une distance et une direction à vol d'oiseau, jamais un itinéraire. Sans GPS actif, elle n'affiche aucune distance.
- **Quatre types d'étapes nouveaux** : collection (n lieux parmi une liste, dans l'ordre que tu veux), photographie, choses gardées, écho.

### Quêtes ajoutées (8)

| Quête | Mécanique | Niveau |
|---|---|---|
| Trois façons d'entrer | collection | 2 |
| Fontaines sœurs | comparaison | 2 |
| Un siècle bâtisseur | collection | 2 |
| Lever les yeux | photographie | 2 |
| Ce que la ville te laisse | collection | 1 |
| Deux places | comparaison | 1 |
| Suivre l'eau | enquête | 3 |
| Dedans, dehors | comparaison | 1 |

Deux d'entre elles donnent une carte hors série. Elles n'affirment aucun fait historique nouveau : elles renvoient aux lieux, dont les fiches gardent leurs statuts et leurs sources.

### Quêtes modifiées (41)

Les 41 quêtes existantes gardent leur identifiant, leur texte, leurs étapes et leur récompense. Chacune a reçu une mécanique et un niveau. Toutes celles qui contiennent une observation ou une énigme changent d'interaction (voir plus haut). Le catalogue compte 49 quêtes ; la cible de 25 à 35 demanderait d'en retirer, ce que je n'ai pas fait sans ton accord.

## 3. Direction artistique

Feuille `css/v5.css`, sans image ni police téléchargée (tout reste hors ligne).

- Titres en Didot italique, légendes en capitales étroites, écriture manuscrite pour ce que tu écris.
- Papier hachuré, boutons en plaques à ombre dure, plus de rectangles arrondis identiques.
- Quêtes en billets décalés, donjons en plaques sombres à coins coupés, barre du bas en règle graduée.
- Cartes de collection : trame par territoire, numéro d'atlas, cadre double pour les rares, or et reflet pour les légendaires, éventail légèrement désordonné.
- Révélation d'une carte : rayons tournants, la carte monte et se retourne, puis reçoit un tampon « Trouvée ». Animation coupée si l'iPhone demande moins de mouvement.

## 4. Tests

Faits, dans Chrome de bureau en format iPhone (390 × 844), position simulée :

- `test_v5.py` : 40 tests (moteur, deux temps, hystérésis, précision, positions aberrantes, quêtes signalées, mécaniques, sauvegarde v4.2 reprise).
- `test4.py` : 67 tests ; parcours v2 et v3 ; numéros et quêtes ; version à publier, y compris rechargement hors ligne.

**Testé sur un iPhone réel : rien.** Je ne peux pas manipuler ton iPhone. À vérifier en premier sur le terrain :

1. autorisation de localisation et point bleu, en HTTPS ;
2. les deux signaux à l'approche d'un lieu, téléphone en poche, écran allumé ;
3. le son avec le bouton silencieux enclenché ;
4. la fluidité de la révélation d'une carte ;
5. le rendu des polices (Didot et Avenir Next Condensed sont fournies par iOS).

## 5. Limites qui restent

- Une application web ne reçoit ni GPS ni son, écran verrouillé ou Safari en arrière-plan. Le mode poche garde l'écran allumé et assombri.
- Le premier son exige un geste sur l'écran ; le bouton silencieux peut couper les signaux.
- La vibration n'est en général pas disponible dans Safari iOS.
- Aucune reconnaissance d'image : une photo de secret se valide par la position ou sur parole.
- Les rayons (150, 75, 40, 30 m) sont des réglages de départ, jamais essayés dans la médina, où le GPS dérive entre les murs. La sensibilité se règle dans « GPS et exploration ».
- Les donjons des territoires IV à VI n'existent pas encore.
- Publication : inchangée, six fichiers à plat (`lost-atlas-publier.zip`), voir `docs/GUIDE-IPHONE.md`.
