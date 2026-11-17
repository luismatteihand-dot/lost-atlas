# Publier, mettre à jour et tester Lost Atlas depuis un iPhone

Tout ce guide se fait dans Safari et l'app Fichiers, sans ordinateur. Je n'ai pas pu exécuter ces étapes sur un iPhone : elles viennent de la documentation des services et sont marquées quand un point reste à confirmer sur ton appareil.

## Ce que tu publies

Le fichier `lost-atlas-publier.zip` contient six fichiers, sans aucun dossier :

| Fichier | Rôle |
| --- | --- |
| `index.html` | Tout le jeu : interface, code, données, carte (environ 1 Mo) |
| `service-worker.js` | Fonctionnement hors ligne |
| `manifest.json` | Installation sur l'écran d'accueil |
| `icon-180.png`, `icon-192.png`, `icon-512.png` | Icônes |

Cette forme « à plat » existe parce que le sélecteur de fichiers de l'iPhone ne sait pas envoyer des dossiers. Les sources restent modulaires dans `lost-atlas-v4.2.zip` ; la version à plat est fabriquée à partir d'elles.

Pour décompresser sur iPhone : app Fichiers → touche le ZIP → un dossier `lost-atlas-publier` apparaît à côté.

## Voie A — GitHub Pages (recommandée : adresse stable, gratuite)

1. Dans Safari, crée un compte sur github.com, puis un dépôt public, par exemple `lost-atlas` (bouton « + » → New repository).
2. Dans le dépôt : **Add file → Upload files → choose your files**. Dans Fichiers, ouvre `lost-atlas-publier`, touche « Sélectionner » et coche les six fichiers. Valide, puis **Commit changes**.
3. **Settings → Pages** : source « Deploy from a branch », branche `main`, dossier `/ (root)`, **Save**.
4. Après une à deux minutes, l'adresse est `https://<ton-compte>.github.io/lost-atlas/`.

À confirmer sur ton iPhone : si un menu n'apparaît pas, touche « aA » dans la barre d'adresse → « Version pour ordinateur ».

**Mettre à jour** : même étape 2 avec les nouveaux fichiers du même nom. L'adresse ne change pas.

**Encore plus simple** : si tu relies ton compte GitHub à Claude (réglages de Claude, connecteurs), je peux déposer moi-même les fichiers dans le dépôt à chaque version. Tu n'aurais plus qu'à ouvrir l'adresse. Ce n'est pas le cas aujourd'hui : aucun dépôt ne m'est accessible.

## Voie B — Vercel Drop (la plus rapide pour un premier essai)

1. Ouvre `vercel.com/drop` dans Safari.
2. Choisis le fichier `lost-atlas-publier.zip` (la page accepte un ZIP et propose de choisir un fichier).
3. Tu obtiens une adresse en `https://`. Sans compte, elle est temporaire : crée un compte gratuit et « Claim Project » pour la garder.

Mise à jour : d'après la documentation, on dépose la nouvelle version sur le projet depuis le tableau de bord, et l'adresse reste la même. À confirmer sur iPhone.

## Voie écartée

Netlify Drop : des utilisateurs rapportent que le dépôt de dossier ou de ZIP ne fonctionne pas depuis un téléphone. Je ne le recommande donc plus (le README de la v4 le citait, à tort pour ton cas).

## Installer sur l'écran d'accueil

1. Ouvre l'adresse dans **Safari**.
2. Partager → **Sur l'écran d'accueil** → Ajouter.
3. Lance toujours le jeu depuis cette icône.

## Tes données lors d'une mise à jour

- La partie et les photos sont enregistrées dans le téléphone, rattachées à **l'adresse** du jeu. Tant que l'adresse ne change pas, une mise à jour ne les touche pas.
- Changer d'adresse (passer de Vercel à GitHub, par exemple) repart de zéro. Avant : Héros → Réglages → Exporter → **Sauvegarde complète (partie et photos)**, puis réimporte-la à la nouvelle adresse.
- À ma connaissance, le jeu installé sur l'écran d'accueil et le même jeu ouvert dans un onglet Safari ont des mémoires séparées. Choisis l'un et tiens-t'y.
- Supprimer l'icône de l'écran d'accueil, ou effacer les données de sites dans Réglages, efface la partie. D'où l'intérêt d'exporter régulièrement.
- Après une mise à jour, ferme complètement le jeu et rouvre-le deux fois : la première ouverture télécharge la nouvelle version, la seconde l'affiche.

## Autorisations iOS

- **Localisation** : Réglages → Confidentialité et sécurité → Service de localisation (activé) → Sites web Safari → « Lorsque l'app est active », Position exacte activée.
- **Appareil photo** : demandé par iOS au moment où tu touches « Prendre une photo ». En cas de refus, « Choisir dans la photothèque » reste possible.
- **Son** : bouton latéral sur sonnerie, volume monté. Le son ne peut démarrer qu'après un toucher : c'est le rôle de « Me localiser » ou « Commencer l'exploration ».

## Liste de tests réels sur iPhone

Ouvre d'abord la pastille GPS de la carte (ou Héros → Mode exploration et sons) → **Diagnostic iPhone** : il mesure ce que ton appareil permet et produit un rapport à copier. Puis, en marchant :

| # | Test | Attendu | Résultat |
| --- | --- | --- | --- |
| 1 | Toucher « Me localiser », accepter | Point bleu à ta position réelle, carte centrée | |
| 2 | Marcher 50 m | Le point suit, la carte aussi | |
| 3 | Déplacer la carte du doigt | Elle ne se recentre plus ; le point continue de bouger | |
| 4 | Toucher « Recentrer » | Retour sur ta position, suivi repris | |
| 5 | Ouvrir la feuille GPS | État, précision en mètres, heure de dernière position | |
| 6 | Refuser la localisation (après l'avoir retirée dans Réglages) | Message expliquant où l'autoriser | |
| 7 | Passer dans une ruelle couverte | « GPS imprécis » ou « Signal perdu », aucun faux point | |
| 8 | Commencer l'exploration, « Écouter » chaque son | Sons audibles et distincts | |
| 9 | Approcher de la fontaine Mouassine en mode poche | Signaux vers 110 m, 75 m, puis lieu trouvé et secret | |
| 10 | Rester 5 minutes au même endroit | Aucun signal répété | |
| 11 | Verrouiller l'iPhone une minute, déverrouiller | Le suivi reprend seul | |
| 12 | Garder : prendre une photo, trois mots | Trace au carnet avec photo, heure, position | |
| 13 | Garder : choisir dans la photothèque | Idem | |
| 14 | Ouvrir un secret, photographier, répondre | Révélation, carte dans le Sac | |
| 15 | Fermer complètement le jeu, rouvrir | Partie et photos toujours là | |
| 16 | Mode avion, rouvrir le jeu | Le jeu s'ouvre, carte comprise | |
| 17 | Une heure d'exploration | Noter la batterie consommée | |

## Ce qui est impossible sans ordinateur ou sans application native

- Recevoir la position ou jouer un son **téléphone verrouillé ou jeu en arrière-plan**. Une application web ne le peut pas ; une application native le pourrait, mais elle se compile sur un Mac. Solution retenue : le mode poche, écran allumé et noir.
- Lancer les tests automatiques (ils tournent de mon côté, à chaque version).
- Régénérer le fond de carte depuis OpenStreetMap ou refabriquer la version à plat : je le fais et te livre le résultat.
- Modifier un contenu toi-même reste possible dans l'éditeur de GitHub (crayon sur un fichier), mais `index.html` pèse 1 Mo : il est plus sûr de me demander la modification et de republier.
