# Rapport technique — v4

16 novembre 2026. Tous les tests décrits sont automatiques, dans Chrome de bureau piloté par Playwright, avec des positions et des photos simulées. Aucun test n'a eu lieu sur un iPhone.

## Fichiers

| Fichier | Nature |
| --- | --- |
| `js/sound.js` | Nouveau. Huit motifs synthétisés (Web Audio), préférences, journal des sons |
| `js/explore.js` | Nouveau. Mode exploration : cibles, zones, priorité, délai, mémoire, états GPS, mode poche, réglages |
| `js/photo.js` | Nouveau. Secrets photographiques : validateurs, feuille, récompenses, marqueurs |
| `data/v3.js` | Lieux majeurs, six secrets, six cartes de découverte, une tenue |
| `data/artifacts.json`, `data/bundle.js` | Un artefact ajouté (`a-lentille`), 22 au total |
| `js/v3.js` | Révélation de carte avec libellé et son, photos partagées, lieu connu proche, carnet (signaux, secrets), tenue « appareil » |
| `js/ui.js` | Branchements : positions et erreurs GPS vers le mode exploration, sons de découverte et d'artefact |
| `js/map.js` | Marqueurs de secrets ; `AtlasMap.simulate` pour injecter une position (tests) |
| `js/views.js`, `js/art.js`, `js/app.js`, `index.html`, `css/v3.css`, `service-worker.js` | Intégration |

Sauvegarde : réglages dans `settings.explore`, signaux entendus dans `v3.heard` et `v3.detected`, secrets dans `v3.pq`. Tous créés à la volée s'ils manquent ; aucune clé existante n'est renommée. Les photos restent dans la clé locale `lostAtlas.photos.v1`, hors export.

## Ce qui fonctionne

- Mode exploration démarré d'un geste, arrêt d'un geste, pastille d'état (arrêté, recherche, précision suffisante, imprécis, refusé, indisponible, hors de Marrakech).
- Détection par type avec rayons distincts, seuil de précision, entrée et sortie à marge, un signal au plus toutes les 45 s, priorité secret > donjon > lieu majeur > lieu, regroupement à 60 m, mémoire de 3 h.
- Une découverte par GPS compte comme un signal : pas de bip de proximité dans la foulée.
- Reprise automatique après une erreur passagère du GPS ; arrêt propre en cas de refus.
- Huit sons, volume, mode silencieux, cinq catégories, écoute de chaque son.
- Mode poche.
- Six secrets : position, photo, réponse, révélation, carte, artefact, tenue, trace au carnet, marqueur sur la carte.
- Photographie libre par « Garder », rattachée au lieu connu le plus proche (60 m).

## Tests réussis (46)

GPS : autorisation accordée (vrai `watchPosition` du navigateur, position fournie par l'outil de test) ; refusée ; indisponible ; position imprécise ; entrée en zone ; délai minimal ; priorité ; découverte puis secret ; fluctuation autour d'une limite ; sortie et retour ; mémorisation ; lieu déjà découvert ; deux lieux à 16 m ; catégories coupées ; mode silencieux ; arrière-plan puis retour ; mode poche ; arrêt ; préférences conservées.

Photo : sans GPS (« sur parole ») ; trop loin ; ouverture du champ appareil photo ; annulation ; photo prise ; mauvaise réponse ; bonne réponse ; pas de second octroi ; carnet ; photo libre ; hors réseau ; export sans image ; réinitialisation ; import ; import sans les photos ; sauvegarde v2.

Son : déclenchement des huit motifs ; respect des catégories et du mode silencieux ; pas de répétition.

Régression : parcours v3 et v2 relancés, aucune erreur.

## Ce qui est simulé

- Toutes les positions : fournies par l'outil de test ou injectées par `AtlasMap.simulate`.
- La mise en arrière-plan : événement `visibilitychange` déclenché à la main.
- La photo : un fichier image fourni au champ ; l'appareil photo du téléphone n'a pas été ouvert.
- Le son : le journal `Sound.log` prouve que le motif a été programmé, pas qu'il a été entendu.
- Le refus de l'appareil photo n'est pas testable : sur le web, c'est le système qui gère cette autorisation ; un refus revient à une prise de vue annulée, cas testé.

## Limites non vérifiées, à tester sur iPhone réel

1. Le GPS reste-t-il actif écran allumé en poche pendant une heure ? Avec quelle précision dans les ruelles de la médina ?
2. L'écran reste-t-il allumé (fonction du navigateur absente dans le test de bureau) ? Sinon, réglage manuel du verrouillage automatique.
3. Les sons s'entendent-ils dans la rue, et le bouton silencieux de l'iPhone les coupe-t-il ?
4. Le son repart-il après un passage en arrière-plan sans nouveau toucher ?
5. L'appareil photo s'ouvre-t-il directement depuis l'application installée sur l'écran d'accueil ?
6. Poids réel des photos et limite de stockage.
7. Tactile en poche : le mode poche suffit-il à éviter les gestes accidentels ?
8. Autonomie, écran allumé et GPS précis.
9. Les rayons de 150, 75 et 30 m sont-ils bons sur place ? Les six secrets sont-ils visibles aujourd'hui depuis la rue ?

## Arrière-plan : ce que chaque option permet

| Situation | Application web actuelle | Installée sur l'écran d'accueil (PWA) | Enveloppe native (Capacitor) |
| --- | --- | --- | --- |
| Ouverte, écran allumé | GPS et sons | GPS et sons | GPS et sons |
| Écran verrouillé | Rien | Rien | Possible avec le mode « localisation en arrière-plan » d'iOS et des notifications locales |
| Application en arrière-plan | Rien | Rien | Idem |
| Publication | Une adresse web | Une adresse web | Compte développeur Apple, validation de l'App Store |

Installer le jeu sur l'écran d'accueil ne change donc rien pour l'arrière-plan. Le passage à Capacitor réutiliserait ce code ; il faudrait remplacer l'appel de géolocalisation par un module natif et le son par des notifications locales quand l'écran est éteint. Je ne l'ai ni fait ni testé.

## Reconnaissance d'image

Non développée. Trois voies existent : un modèle embarqué dans la page (plusieurs dizaines de Mo, lent sur téléphone, fiabilité à mesurer) ; un service de vision en ligne (coût par image, réseau obligatoire, envoi de la photo donc accord explicite du joueur) ; une comparaison à une image de référence (il faudrait d'abord des photos de référence de chaque secret, que je n'ai pas). Le point d'entrée est prévu dans `js/photo.js`.
