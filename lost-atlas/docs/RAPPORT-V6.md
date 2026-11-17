# Lost Atlas v6 : la carte se dessine

17 novembre 2026. Base : v5.2 (aventures, lieux du quotidien, territoires, plein écran). Rien n'a été retiré. Les sauvegardes v1 à v5.2 sont migrées automatiquement, avec une copie de secours.

Une seule idée dirige cette version : récompenser la curiosité plutôt que l'exécution. La boucle visée tient en quatre temps : le joueur remarque quelque chose, il s'approche, il découvre, puis une piste s'ouvre. Elle ne passe pas forcément par une quête.

## 1. Game design

| Mécanique | Ce qu'elle sert | Ce qui a changé |
|---|---|---|
| **Lieux muets** | La curiosité : un numéro sans nom attire, un nom affiché répond d'avance | Sur la carte, un lieu jamais trouvé n'affiche plus son nom. Il apparaît quand tu le repères ou le découvres. La fiche montrait déjà seulement l'accroche avant découverte. |
| **La brume** | L'envie d'aller là où l'on n'est jamais allé | Un territoire jamais foulé, sans rien de trouvé, est voilé et marqué *terra incognita*. Le premier pas, relevé par GPS, ou une première découverte lève le voile, une seule fois, avec un message. Le rang du territoire passe à Passant. |
| **Le tracé** | Le sentiment d'avoir fait sa propre carte | Là où tu marches vraiment (GPS précis à ±35 m, un point tous les 20 m), une ligne d'encre se dessine. Héros affiche les kilomètres à pied. Pas de points, pas de badge : c'est une trace, pas un score. |
| **La piste** | Relancer la boucle sans dicter le chemin | Après chaque découverte, la fiche donne une direction vers la page blanche la plus proche (« à environ 150 m, vers le nord-est »), jamais son nom ni sa position. « Suivre la piste » dessine une flèche longue d'un tiers du chemin seulement. |
| **Moins de bruit** | Préserver la valeur des signaux | Le premier pas dans un territoire n'a pas de son : les sons restent réservés à la proximité. Un signal de quête n'est plus recouvert par un autre message arrivé au même moment. |

## 2. UX et UI

- **La carte raconte la progression d'un coup d'œil** : voile sur l'inconnu, noms sur le connu, encre sur le parcouru.
- **Moins d'étapes :** une découverte ouvre directement la piste suivante, sans passer par une liste.
- **Un calque « Mon tracé »** à côté des autres, désactivable.
- **Mouvement réduit respecté :** brume et flèche s'arrêtent si l'iPhone le demande.

## 3. Technique

- **Carte :** redessin seulement quand l'état change (signature : statuts, calques, marqueurs, brume). Un geste sans changement coûte environ 1,2 ms, contre 11,8 ms pour une reconstruction, soit dix fois moins dans Chrome de bureau. Avant, chaque geste reconstruisait les ~190 marqueurs.
- **Robustesse :** un geste qui plante ne fige plus le jeu. Un message calme s'affiche, la partie reste sauvegardée, et l'erreur est notée dans le Diagnostic (« Erreurs pendant cette session »), à copier pour le test sur iPhone.
- **Sauvegardes :** la version de format passe à 2. Le moteur de migrations est numéroté, et la copie d'origine est gardée une seule fois sous `lostAtlas.save.v1.avant-v2`. Rien n'est retiré ni renommé.
- **Nouveau module `Trace`** (tracé, brume, piste), branché sur le flux de position existant sans dépendre des autres modules.
- **Documentation :** `docs/ARCHITECTURE.md` (modules, flux, état, migrations, ajout de contenu, performance).

## 4. Tests

Tous dans Chrome de bureau, au format iPhone (390 × 844), avec une position simulée :

| Série | Résultat |
|---|---|
| `test_v6.py` (lieux muets, brume, tracé, piste, performance, erreurs, migration) | 22 / 22 |
| `test_quotidien.py` | 28 / 28 |
| `test_session.py` | 37 / 37 |
| `test_v5.py` | 40 / 40 |
| `test4.py` | 67 / 67 |
| Parcours v2, v3, numéros, version à plat hors ligne | sans erreur |

**Testé sur un iPhone réel : rien.** Une position simulée ne prouve ni le GPS ni le son. La liste de vérification sur le terrain (15 minutes) est dans `docs/GUIDE-IPHONE.md`.

## 5. Limites

- **En arrière-plan :** pas de GPS ni de son écran verrouillé. Le tracé s'interrompt, puis reprend au retour.
- **Précision du tracé :** il dépend de la précision du GPS. Entre les murs de la médina, des points manqueront ; aucun n'est inventé pour combler.
- **La piste vise un lieu de l'atlas,** pas un lieu du quotidien.
- **Plein écran :** il passe par l'icône de l'écran d'accueil. Aucune page web ne peut masquer seule les barres de Safari.
- **Partage :** la sauvegarde reste dans le téléphone. Pas de compte, de serveur ni de multijoueur, et le jeu ne fait pas semblant d'en avoir.
