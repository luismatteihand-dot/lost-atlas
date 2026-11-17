/* Contenus du jeu v3 : cartes de collection, tenues, aventures (donjons), dérives, échos.
   Données séparées du code. Une autre ville = un autre fichier de même forme (voir docs/CONCEPTION-V3.md). */
window.ATLAS_V3 = {
  world: { city: 'marrakech', name: 'Marrakech', version: 4 },

  /* Lieux « majeurs » : signal de présence dès 150 m. Les autres lieux culturels : 75 m. */
  major: ['t1-x-place', 't1-x-koutoubia', 't3-01', 't4-01', 't4-02', 't4-08', 't6-02'],

  /* Découvertes photographiques : un détail réel, visible depuis l'espace public, documenté par les fiches du jeu.
     at = lieu de référence (sa position vérifiée sert d'ancre) ; signal = rayon du signal sonore ; r = rayon de validation. */
  photoQuests: [
    { id: 'pq-linteau', src: 'fiche du jeu, d\'après Salmon, Marrakech : splendeurs saadiennes (2016), cité par Wikipedia', at: 't2-x-mouassine', signal: 30, r: 40, diff: 1, title: 'Le linteau de la fontaine',
      riddle: 'Certaines traces ne se voient qu\'en levant les yeux. Au-dessus de l\'eau, quelqu\'un a travaillé une autre matière que la pierre.',
      options: ['Un linteau de bois sculpté', 'Une horloge', 'Un vitrail coloré', 'Une grille de fer forgé'], answer: 0, k: 'fait',
      reveal: 'La baie réservée aux habitants est surmontée d\'un linteau de bois sculpté : la fontaine était un don, et on l\'a signée comme un monument (Salmon, 2016).', reward: { card: 'c-pq-linteau' } },
    { id: 'pq-auvent', src: 'fiche du jeu (fontaine Chrob ou Chouf)', at: 't5-02', signal: 30, r: 35, diff: 2, title: 'L\'auvent de Chrob ou Chouf',
      riddle: 'Ici, on a abrité le passant autant que l\'eau. Photographie ce qui le protège.',
      options: ['Un auvent de cèdre sculpté d\'alvéoles', 'Un store de toile', 'Une coupole de pierre', 'Une treille de vigne'], answer: 0, k: 'fait',
      reveal: 'Un auvent de cèdre sculpté d\'arabesques et de muqarnas, ces alvéoles en nid d\'abeilles. Le nom de la fontaine dit le reste : bois, et regarde.', reward: { card: 'c-pq-auvent' } },
    { id: 'pq-coquilles', src: 'fiche du jeu (Bab Agnaou)', at: 't4-x-agnaou', signal: 30, r: 45, diff: 2, title: 'Les coquilles de Bab Agnaou',
      riddle: 'Une ville de terre, une porte de pierre. Cherche, dans ses angles, ce que la mer aurait pu y laisser.',
      options: ['Des coquilles sculptées', 'Des lions affrontés', 'Des mains ouvertes', 'Des épées croisées'], answer: 0, k: 'fait',
      reveal: 'Des coquilles sculptées occupent les angles, autour d\'arcs emboîtés et d\'un bandeau d\'inscription. Dans une enceinte de pisé, cette porte de grès n\'est pas la mieux défendue : c\'est la plus soignée.', reward: { card: 'c-pq-coquilles' } },
    { id: 'pq-jamour', src: 'Codex du jeu (la Koutoubia) ; récit traditionnel', at: 't1-x-koutoubia', signal: 60, r: 160, diff: 1, title: 'Le jamour de la Koutoubia',
      riddle: 'Tout en haut, quelque chose brille et ne sert pas à l\'appel. Photographie-le depuis l\'esplanade.',
      options: ['Des boules de métal superposées', 'Une girouette en forme de coq', 'Une cloche', 'Un cadran solaire'], answer: 0, k: 'trad',
      reveal: 'Le jamour : des boules de métal doré enfilées sur une hampe, au sommet du lanternon. La tradition veut qu\'elles aient été fondues avec l\'or des bijoux d\'une épouse du calife ; c\'est un récit, pas un fait établi.', reward: { card: 'c-pq-jamour' } },
    { id: 'pq-piliers', src: 'fiche et Codex du jeu (la Koutoubia)', at: 't1-x-koutoubia', signal: 60, r: 160, diff: 2, title: 'Les piliers de la première Koutoubia',
      riddle: 'Avant celle que tu vois, il y en eut une autre, juste à côté. Le sol de l\'esplanade en garde l\'empreinte.',
      options: ['Des bases de piliers alignées', 'Des tombes', 'Des bornes de marché', 'Des bancs de pierre'], answer: 0, k: 'fait',
      reveal: 'Les bases des piliers de la première Koutoubia, fondée en 1147. Une seconde mosquée lui fut accolée vers 1158 ; seule celle-ci subsiste, avec son minaret achevé vers 1195.', reward: { card: 'c-pq-piliers' } },
    { id: 'pq-boulins', src: 'fiche du jeu (remparts)', at: 't5-01', signal: 40, r: 160, diff: 1, title: 'Les trous de boulin',
      riddle: 'Le mur garde les trous de sa propre naissance. Trouve-les sur le rempart, et photographie leurs rangées.',
      options: ['Des rangées de trous alignés', 'Des meurtrières', 'Des gouttières', 'Des niches à lampes'], answer: 0, k: 'fait',
      reveal: 'Des trous de boulin. Le pisé se monte par couches, entre deux coffrages portés par des traverses qui traversent le mur ; on retire les traverses, les trous restent. Le mur montre sa propre méthode de fabrication.', reward: { card: 'c-pq-boulins' } },
    { id: 'pq-cigognes', src: 'fiches du jeu (palais El-Badi, Dar Bellarj)', at: 't4-01', signal: 60, r: 180, diff: 3, title: 'Les locataires du Badi',
      riddle: 'Elles ont choisi les ruines, et personne ne les en chasse. Lève les yeux vers le haut des murs — si elles sont là aujourd\'hui.',
      options: ['Des nids de cigognes', 'Des ruches', 'Des cages à oiseaux', 'Des antennes'], answer: 0, k: 'trad',
      reveal: 'Des nids de cigognes, sur le faîte des murs du palais. On dit ces oiseaux de bon augure et nul ne les dérange : c\'est une tradition, mais leurs nids, eux, sont bien là.', reward: { card: 'c-pq-cigognes' } }
  ],
  photoRules: 'Reste dans l\'espace public. Ne photographie personne sans son accord. Aucune photo n\'est envoyée où que ce soit : elle reste sur ton téléphone.',

  /* Dessin de chaque carte de lieu (clé de glyphe). Les lieux sans entrée utilisent le glyphe de leur catégorie. */
  cardArt: {
    't1-x-place': 'place', 't1-x-koutoubia': 'minaret', 't1-01': 'palais', 't1-02': 'arc', 't1-03': 'arc', 't1-05': 'tanjia', 't1-17': 'etal', 't1-22': 'etal', 't1-37': 'etal',
    't2-01': 'cour', 't2-03': 'hammam', 't2-05': 'jardin', 't2-07': 'bendir', 't2-08': 'palais', 't2-09': 'etal', 't2-10': 'echeveau', 't2-12': 'fondouk', 't2-13': 'fondouk', 't2-x-mouassine': 'fontaine',
    't3-01': 'cour', 't3-02': 'plume', 't3-03': 'coupole', 't3-04': 'arc', 't3-05': 'palais', 't3-x-debbagh': 'cuves',
    't4-01': 'rempart', 't4-02': 'palais', 't4-03': 'arc', 't4-04': 'stele', 't4-05': 'minaret', 't4-07': 'lanterne', 't4-08': 'coupole', 't4-x-agnaou': 'porte',
    't5-01': 'porte', 't5-02': 'fontaine', 't5-03': 'rempart', 't5-05': 'flacon', 't5-x-mosquee': 'minaret', 't5-x-belabbes': 'coupole',
    't6-01': 'facade', 't6-02': 'jardin', 't6-03': 'facade', 't6-08': 'facade', 't6-21': 'facade', 't6-x-martyrs': 'clocher'
  },

  /* Cartes spéciales : jamais données par un simple passage. */
  specialCards: [
    { id: 'c-dedale', name: 'Le Dédale de Mouassine', art: 'dedale', rarity: 'legendaire', t: 't2', line: 'Tu es entré par une fontaine et ressorti avec une question.', how: 'Atteindre le cœur du donjon de Mouassine.' },
    { id: 'c-cercle', name: 'Le Cercle de Jemaa el-Fna', art: 'place', rarity: 'legendaire', t: 't1', line: 'Une place qui n\'existe que lorsqu\'on s\'y rassemble.', how: 'Atteindre le cœur du donjon de Jemaa el-Fna.' },
    { id: 'c-bout', name: 'Le Bout de la ville', art: 'cuves', rarity: 'legendaire', t: 't3', line: 'Une règle, et l\'exception qui la met en doute.', how: 'Atteindre le cœur du donjon de Ben Youssef.' },
    { id: 'c-pq-piliers', name: 'Les piliers de la première Koutoubia', art: 'minaret', rarity: 'rare', t: 't1', line: 'Ce qui reste d\'une mosquée jumelle.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-echo', name: 'Le premier écho', art: 'echo', rarity: 'rare', t: null, line: 'Deux choses vues à des jours d\'écart, et soudain un fil entre elles.', how: 'Écrire toi-même le lien d\'un écho.' },
    { id: 'c-pq-linteau', name: 'Le linteau de la fontaine', art: 'cedre', rarity: 'rare', t: 't2', line: 'Du bois sculpté au-dessus de l\'eau.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-pq-auvent', name: 'L\'auvent de Chrob ou Chouf', art: 'fontaine', rarity: 'rare', t: 't5', line: 'Bois, et regarde.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-pq-coquilles', name: 'Les coquilles de Bab Agnaou', art: 'porte', rarity: 'rare', t: 't4', line: 'La mer dans les angles d\'une porte de pierre.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-pq-jamour', name: 'Le jamour', art: 'jamour', rarity: 'rare', t: 't1', line: 'Ce qui brille au sommet et ne sert pas à l\'appel.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-pq-boulins', name: 'Les trous de boulin', art: 'rempart', rarity: 'rare', t: 't5', line: 'Le mur montre comment on l\'a fait.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-pq-cigognes', name: 'Les locataires du Badi', art: 'plume', rarity: 'legendaire', t: 't4', line: 'Elles ont choisi les ruines.', how: 'Un secret à photographier, quelque part dans ce territoire.' },
    { id: 'c-q-portes', name: 'Trois façons d\'entrer', art: 'porte', rarity: 'rare', t: null, line: 'Pierre, coude, métier : trois portes, trois idées d\'une ville.', how: 'Une quête qui traverse plusieurs territoires.' },
    { id: 'c-q-saadien', name: 'Un siècle bâtisseur', art: 'coupole', rarity: 'rare', t: null, line: 'La même main, d\'un quartier à l\'autre.', how: 'Une quête qui traverse plusieurs territoires.' },
    { id: 'c-arpenteur', name: 'La page blanche', art: 'atlas', rarity: 'rare', t: null, line: 'Un lieu que la carte ignorait, et que tu as posé de ta main.', how: 'Placer toi-même un lieu non cartographié.' }
  ],

  /* Tenues : déblocages rares, liés à ce que le joueur a réellement fait. */
  outfits: [
    { id: 'o-veste', slot: 'tenue', name: 'Veste d\'arpenteur', art: 'veste', unlock: { start: true }, how: '' },
    { id: 'o-djellaba', slot: 'tenue', name: 'Djellaba couleur de terre', art: 'djellaba', unlock: { count: 'discovered', kind: 'culture', min: 8 }, how: 'Découvrir huit lieux culturels.' },
    { id: 'o-burnous', slot: 'tenue', name: 'Burnous du dédale', art: 'burnous', unlock: { adv: 'd-mouassine' }, how: 'Atteindre le cœur du donjon de Mouassine.' },
    { id: 'o-nu', slot: 'coiffe', name: 'Tête nue', art: 'nu', unlock: { start: true }, how: '' },
    { id: 'o-cheche', slot: 'coiffe', name: 'Chèche indigo', art: 'cheche', unlock: { count: 'discovered', kind: 'culture', min: 3 }, how: 'Découvrir trois lieux culturels.' },
    { id: 'o-paille', slot: 'coiffe', name: 'Chapeau de paille', art: 'paille', unlock: { kept: 3 }, how: 'Garder trois choses dans ton carnet.' },
    { id: 'o-carnet', slot: 'objet', name: 'Carnet relié', art: 'carnet', unlock: { start: true }, how: '' },
    { id: 'o-sacoche', slot: 'objet', name: 'Sacoche de cuir', art: 'sacoche', unlock: { count: 'charted', min: 1 }, how: 'Placer toi-même un lieu sur la carte.' },
    { id: 'o-lanterne', slot: 'objet', name: 'Lanterne de cuivre', art: 'lanterne', unlock: { echo: 1 }, how: 'Écrire le lien d\'un écho.' },
    { id: 'o-appareil', slot: 'objet', name: 'Appareil de voyage', art: 'appareil', unlock: { photos: 3 }, how: 'Révéler trois secrets par la photographie.' },
    { id: 'o-longuevue', slot: 'objet', name: 'Longue-vue', art: 'longuevue', unlock: { count: 'territories', min: 3 }, how: 'Poser le pied dans trois territoires.' }
  ],

  /* Consignes de dérive : ne désignent aucun lieu, ne demandent rien. */
  derives: [
    'À la prochaine fourche, prends la rue la plus étroite qui reste une rue.',
    'Marche jusqu\'à ne plus entendre un seul moteur.',
    'Suis une couleur pendant dix minutes.',
    'Cherche l\'endroit où le ciel est le plus large.',
    'Lève les yeux à chaque carrefour.',
    'Assieds-toi dix minutes au même endroit, téléphone rangé.',
    'Reviens par un chemin que tu n\'as pas pris à l\'aller.'
  ],
  deriveRules: 'Fais demi-tour devant une impasse d\'habitation ou un seuil. Pas de dérive de nuit. Ne suis personne, ne photographie pas les gens.',

  /* Donjons : salles libres, sans ordre ; le cœur s'ouvre quand `need` salles sont franchies. */
  adventures: [
    {
      id: 'd-mouassine', t: 't2', kind: 'Donjon', title: 'Le Dédale de Mouassine', need: 3,
      mood: 'Ombre des ruelles, laine qui sèche, portes plus hautes que les autres.',
      intro: 'Ce donjon n\'a ni murs ni gardien : c\'est un quartier. Ses salles sont des choses à voir, dans l\'ordre que tu veux. Trois suffisent pour atteindre le cœur. Tout se joue depuis la rue : n\'entre nulle part sans y être invité.',
      rooms: [
        { id: 'r-fontaine', kind: 'observe', place: 't2-x-mouassine', title: 'La salle de l\'eau', hint: 'Sur une placette, des baies ouvertes dans un mur. Compte-les avant de lire quoi que ce soit.' },
        { id: 'r-porte', kind: 'rumeur', title: 'La porte des caravanes',
          hint: 'Les caravanes ne viennent plus, mais leurs auberges ont gardé une porte plus haute que les autres. Trouve-en une, depuis la rue.',
          hints: ['Cherche une porte assez haute pour une bête chargée.', 'Derrière, on devine une cour entourée de galeries plutôt qu\'un couloir.', 'Sur la carte, un nom contenant « Fondouk » est un bon signe.'],
          reveal: 'Un fondouk : en bas, écuries et entrepôts ouvrent sur la cour ; à l\'étage, une galerie dessert les chambres des marchands. Une seule porte, haute comme une bête chargée, ferme le tout la nuit. Tu peux regarder depuis le seuil ; n\'entre que si la cour est ouverte au public.' },
        { id: 'r-laine', kind: 'observe', place: 't2-10', title: 'La salle des couleurs', hint: 'Une ruelle où il arrive que des écheveaux sèchent au-dessus du passage. Il en reste peut-être peu : note ce que tu vois vraiment.' },
        { id: 'r-jardin', kind: 'observe', place: 't2-05', title: 'La salle cachée', hint: 'Derrière un long mur sans fenêtre de la rue Mouassine. L\'entrée est payante : cette salle n\'est jamais obligatoire.' },
        { id: 'r-epices', kind: 'observe', place: 't2-09', title: 'La salle des poudres', hint: 'Une place triangulaire au cœur des souks, où l\'on vend racines, gommes et minéraux.' },
        { id: 'r-libre', kind: 'free', title: 'La salle que personne n\'a dessinée', hint: 'Garde une chose qui t\'étonne dans ce quartier — une porte, une lumière, un nom de rue. Elle compte autant que les autres.' }
      ],
      heart: {
        title: 'Le cœur du dédale', question: 'Pourquoi chacun sa rue ? Pourquoi les métiers ne sont-ils pas mélangés ?',
        ask: 'Écris ton explication en une phrase, avant de lire celles des autres.',
        pistes: [
          { t: 'L\'eau. Un métier s\'installe où il trouve l\'eau qu\'il consomme.', k: 'interp', s: 'Soutenu pour les tanneurs de Bab Debbagh, qui utilisaient l\'oued Issil voisin (Reitmaier et al., 2024). Pour les teinturiers de Mouassine et leur fontaine, aucune source trouvée : cela reste une hypothèse.' },
          { t: 'Les nuisances. On éloigne ce qui sent, fume ou salit.', k: 'interp', s: 'L\'emplacement oriental des tanneries est relié aux odeurs, aux rejets et au vent (même étude).' },
          { t: 'La ville a grandi. Ce qui était en bordure est aujourd\'hui au centre.', k: 'hyp', s: 'Un second quartier de tanneurs a existé à Riad Laarous, au cœur de la médina, contre toutes les règles. Les chercheurs supposent une ancienne périphérie ; l\'âge du secteur est inconnu.' },
          { t: 'Le rang. Les métiers estimés près du centre religieux, les autres plus loin.', k: 'averif', s: 'Schéma décrit pour Tunis, affirmé pour Marrakech par des guides. Pas de source savante consultée pour Marrakech.' }
        ],
        doubt: 'Qu\'est-ce qui te ferait changer d\'avis ? Réécris ta phrase — ou garde-la, si elle tient.',
        synth: [
          { h: 'Ce que Mouassine permet de dire', k: 'fait', t: 'La fontaine avait une baie pour les habitants et des abreuvoirs pour les bêtes de somme (Salmon, 2016). Ânes et mulets faisaient donc partie du quartier : c\'est un fait. Qu\'ils y portaient la marchandise jusqu\'aux fondouks est une déduction raisonnable.' },
          { h: 'Ce que les historiens avancent pour la ville', k: 'interp', t: 'Aucun facteur ne suffit seul. L\'eau et les nuisances sont les mieux documentés, pour les tanneurs. Un cas contredit la règle, et on ne l\'explique que par une hypothèse.' },
          { h: 'Ce qu\'on ne sait pas', k: 'averif', t: 'Si la fontaine explique les teinturiers. Ta phrase n\'est ni confirmée ni écartée : la carte des métiers est une carte de contraintes, et elle a peut-être bougé avec la ville. Bab Debbagh et Riad Laarous pourraient en dire plus, un jour, si tu y passes.' }
        ]
      },
      reward: { card: 'c-dedale', outfit: 'o-burnous' }
    },
    {
      id: 'd-jemaa', t: 't1', kind: 'Donjon', title: 'Le Cercle de Jemaa el-Fna', need: 3,
      mood: 'Une place vide le matin, pleine le soir, et un minaret pour boussole.',
      intro: 'Ce donjon est une place et ce qui l\'entoure. Ses salles n\'ont pas de murs : un cercle de spectateurs, une allée, une esplanade. Trois suffisent pour atteindre le cœur. Si tu photographies un artiste, demande-lui et laisse une pièce.',
      rooms: [
        { id: 'r-cercle', kind: 'observe', place: 't1-x-place', title: 'La salle sans murs', hint: 'Au bord de la place, regarde comment le public se dispose autour d\'un musicien ou d\'un bonimenteur.' },
        { id: 'r-nuit', kind: 'observe', place: 't1-17', title: 'La salle qui se monte chaque soir', hint: 'Le centre de la place n\'est pas le même l\'après-midi et à la nuit. Viens deux fois.' },
        { id: 'r-faces', kind: 'observe', place: 't1-x-koutoubia', title: 'La salle des quatre faces', hint: 'Fais le tour du minaret depuis l\'esplanade. La salle de prière est réservée aux musulmans.' },
        { id: 'r-jumelle', kind: 'rumeur', title: 'La mosquée qui n\'est plus là',
          hint: 'Au pied du minaret, quelque chose dépasse du sol de l\'esplanade, en rangées régulières. Trouve-le.',
          hints: ['Reste sur l\'esplanade, du côté nord de la mosquée.', 'Ce ne sont pas des bancs.', 'Imagine un toit au-dessus de ces rangées.'],
          reveal: 'Ce sont les bases des piliers de la première Koutoubia, fondée en 1147. Une seconde mosquée lui fut accolée vers 1158, et seule celle-ci subsiste. Pourquoi deux mosquées ? La tradition dit que la première était mal orientée ; les chercheurs en débattent encore.' },
        { id: 'r-allee', kind: 'observe', place: 't1-37', title: 'Le couloir des marchands', hint: 'L\'allée couverte d\'un treillage qui part de la place vers le nord. Note ce que vendent trois boutiques voisines.' },
        { id: 'r-voix', kind: 'observe', place: 't1-02', title: 'La salle des voix', hint: 'Un musée sur la place même, dans une ancienne banque. L\'entrée est payante : cette salle n\'est jamais obligatoire.' },
        { id: 'r-libre1', kind: 'free', title: 'La salle que personne n\'a dessinée', hint: 'Garde une chose qui t\'arrête sur la place ou autour : un son, une fumée, une lumière sur le minaret.' }
      ],
      heart: {
        title: 'Le cœur du cercle', question: 'Vide, cette place n\'a presque rien à montrer. Pourquoi est-ce elle qu\'on a voulu protéger ?',
        ask: 'Écris ton explication en une phrase, avant de lire celles des autres.',
        pistes: [
          { t: 'Ce qu\'on protège ici, ce sont des pratiques, pas des pierres.', k: 'fait', s: 'En 2001, l\'UNESCO proclame « l\'espace culturel de la place Jemaa el-Fna » chef-d\'œuvre du patrimoine oral et immatériel ; l\'élément rejoint la Liste représentative en 2008.' },
          { t: 'Parce qu\'elle était menacée.', k: 'fait', s: 'Pression immobilière, routière et touristique : des habitants et des intellectuels, dont l\'écrivain Juan Goytisolo, ont plaidé pour sa reconnaissance.' },
          { t: 'Le cercle est une économie : l\'attention y est la seule monnaie.', k: 'interp', s: 'Le récit s\'interrompt au moment le plus tendu, le temps de faire passer la sébile. Les conteurs sont devenus rares, et leur relève inquiète.' },
          { t: 'Son nom garderait la mémoire d\'une mosquée jamais achevée.', k: 'hyp', s: 'Explication retenue par plusieurs historiens, selon le Codex du jeu ; d\'autres lectures du nom existent (« assemblée des trépassés », « mosquée à l\'esplanade »).' }
        ],
        doubt: 'Qu\'est-ce qui te ferait changer d\'avis ? Réécris ta phrase — ou garde-la, si elle tient.',
        synth: [
          { h: 'Ce que la place permet de voir', k: 'fait', t: 'Un marché tenu ici depuis l\'époque almoravide, protégé par la loi depuis 1922, et des cercles qui se forment et se défont chaque jour sans scène ni horaire.' },
          { h: 'Ce que cette place a changé', k: 'interp', t: 'Jemaa el-Fna a servi de cas d\'école à une idée alors neuve : un patrimoine peut être un savoir-faire, un rituel, une parole.' },
          { h: 'Ce qu\'on ne sait pas', k: 'hyp', t: 'D\'où vient exactement son nom. Et si l\'on peut protéger une pratique sans la figer : la question reste ouverte, y compris pour ceux qui l\'ont inscrite.' }
        ]
      },
      reward: { card: 'c-cercle' }
    },
    {
      id: 'd-benyoussef', t: 't3', kind: 'Donjon', title: 'Le Bout de la ville', need: 3,
      mood: 'Un collège au cœur du souk, une coupole enfouie, et l\'odeur du cuir avant la porte.',
      intro: 'Ce donjon va du centre savant de la médina à sa lisière. Plusieurs salles sont des monuments payants : aucune n\'est obligatoire, trois au choix suffisent. Aux tanneries, reste dans la rue ; rien ne t\'oblige à suivre qui te propose une visite.',
      rooms: [
        { id: 'r-matieres', kind: 'observe', place: 't3-01', title: 'La salle des trois matières', hint: 'Dans la cour de la médersa, lève les yeux du sol jusqu\'au toit. Entrée payante.' },
        { id: 'r-enfouie', kind: 'observe', place: 't3-03', title: 'La salle enfouie', hint: 'Un édifice de 1125, en contrebas de la rue. Compare les deux niveaux avant de descendre.' },
        { id: 'r-oiseau', kind: 'rumeur', title: 'La maison de l\'oiseau',
          hint: 'Une demeure du quartier porte le nom d\'un oiseau que personne ne chasse des toits. Trouve sa porte.',
          hints: ['Elle est près de la médersa.', 'C\'est aujourd\'hui un centre culturel.', 'Son nom commence par « Dar ».'],
          reveal: 'Dar Bellarj, « la maison des cigognes ». Selon la fondation qui l\'anime, le lieu était autrefois un refuge où l\'on soignait les oiseaux blessés : c\'est un récit rapporté, pas un fait établi.' },
        { id: 'r-ciel', kind: 'observe', place: 't3-05', title: 'La salle au ciel retiré', hint: 'Un palais du début du XXe siècle dont la grande cour est aujourd\'hui couverte. Entrée payante.' },
        { id: 'r-avant', kind: 'observe', place: 't3-04', title: 'La salle des images', hint: 'Une maison pleine de photographies anciennes. Choisis celle d\'un lieu que tu connais déjà. Entrée payante.' },
        { id: 'r-cuir', kind: 'observe', place: 't3-x-debbagh', title: 'La salle qu\'on sent avant de la voir', hint: 'Marche vers l\'est jusqu\'à la porte des tanneurs. Regarde depuis la rue.' },
        { id: 'r-libre3', kind: 'free', title: 'La salle que personne n\'a dessinée', hint: 'Garde une chose qui t\'arrête entre la médersa et la porte : une couleur, un seuil, un bruit d\'atelier.' }
      ],
      heart: {
        title: 'Le cœur de la lisière', question: 'Pourquoi les tanneurs sont-ils au bout de la ville ?',
        ask: 'Écris ton explication en une phrase, avant de lire celles des autres.',
        pistes: [
          { t: 'L\'eau. Le tannage en consomme beaucoup, et l\'oued Issil coule de ce côté.', k: 'interp', s: 'Les tanneries utilisaient l\'eau de l\'oued voisin et du réseau de la ville (Reitmaier et al., 2024).' },
          { t: 'L\'odeur et les rejets. On les tient loin du centre, du côté où le vent les emporte.', k: 'interp', s: 'La même étude relie l\'emplacement oriental aux odeurs, aux eaux usées et au vent.' },
          { t: 'La place. Il en faut pour étendre les peaux.', k: 'interp', s: 'Raison avancée par le Codex du jeu ; je n\'ai pas de source savante distincte pour celle-ci.' },
          { t: 'Et pourtant : un autre quartier de tanneurs a existé au centre, à Riad Laarous.', k: 'fait', s: 'Des photographies aériennes de 1917 et 1930 y montrent plusieurs cours de tannerie ; la plupart ont disparu avant les années 1960. Les chercheurs jugent cet emplacement contraire aux règles habituelles.' }
        ],
        doubt: 'Le dernier fragment change-t-il ton explication ? Réécris ta phrase — ou garde-la, si elle tient.',
        synth: [
          { h: 'Ce que Bab Debbagh permet de dire', k: 'fait', t: 'Les tanneurs travaillent à l\'extrémité est de la médina, près de la porte qui porte leur nom, du côté de l\'oued. La porte date des débuts de la ville ; les tanneries sont peut-être aussi anciennes, mais leur datation reste largement inconnue.' },
          { h: 'Ce que les chercheurs avancent', k: 'interp', t: 'L\'eau, les nuisances et le vent expliquent bien cet emplacement. Aucun de ces facteurs n\'explique le quartier de tanneurs du centre.' },
          { h: 'Ce qu\'on ne sait pas', k: 'hyp', t: 'Pourquoi Riad Laarous. L\'hypothèse des chercheurs : ce secteur a pu être autrefois une zone de bordure, que la ville a ensuite englobée. Une règle n\'est solide que si elle explique aussi son exception ; celle-ci attend encore.' }
        ]
      },
      reward: { card: 'c-bout' }
    }
  ],

  /* Échos : deux lieux qui s'éclairent l'un l'autre, dans n'importe quel ordre. Le jeu les pose côte à côte sans rien dire. */
  echoes: [
    { id: 'e-betes', a: 't2-x-mouassine', b: 'room:d-mouassine:r-porte', alt: ['t2-12', 't2-13'], k: 'interp',
      t: 'Les abreuvoirs de la fontaine et la haute porte du fondouk parlent des mêmes bêtes : ânes et mulets étaient les véhicules du quartier. Les abreuvoirs sont un fait établi ; le lien est une interprétation.' },
    { id: 'e-eau', a: 't2-05', b: 't2-x-mouassine', k: 'interp',
      t: 'Les rigoles du jardin et la fontaine de rue distribuaient une eau conduite par la pente, sans pompe, depuis des galeries souterraines extérieures à la ville. Le réseau est attesté ; que ces deux points aient partagé la même arrivée d\'eau n\'est pas établi ici.' },
    { id: 'e-commanditaire', a: 't2-x-mouassine', b: 't3-01', k: 'fait',
      t: 'Le même sultan saadien, Abdallah al-Ghalib, a commandé le complexe de Mouassine (1562-1573) et la médersa Ben Youssef (achevée en 1564-65). En dix ans, il a doté la ville d\'un quartier et d\'un collège.' },
    { id: 'e-dynasties', a: 't1-x-koutoubia', b: 't3-03', k: 'interp',
      t: 'La koubba est le seul édifice almoravide conservé à Marrakech ; la Koutoubia est l\'œuvre des Almohades qui leur ont succédé. L\'une montre ce qu\'une dynastie bâtit, l\'autre ce qu\'elle a laissé de la précédente.' },
    { id: 'e-metiers', a: 't2-10', b: 't3-x-debbagh', k: 'hyp',
      t: 'Teinturiers et tanneurs : deux métiers qui consomment beaucoup d\'eau, l\'un au cœur des souks, l\'autre à la lisière. Si l\'eau suffisait à tout expliquer, ils seraient voisins. L\'écart entre les deux est une question, pas une réponse.' },
    { id: 'e-soeurs', a: 't2-x-mouassine', b: 't5-02', k: 'fait',
      t: 'Deux fontaines saadiennes à quelques rues d\'écart : la fontaine de quartier est un type, pas une exception. On reconnaît une famille d\'objets, plus un monument isolé.' }
  ],

  statuts: { fait: 'Fait établi', interp: 'Interprétation', hyp: 'Hypothèse', trad: 'Tradition', averif: 'À vérifier' }
};
