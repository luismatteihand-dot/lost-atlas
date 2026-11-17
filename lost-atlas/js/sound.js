/* Identité sonore : motifs courts synthétisés (Web Audio), aucun fichier audio, rien d'emprunté.
   Mode de ré « hijaz » (ré, mi bémol, fa dièse, sol, la, si bémol, do) pour une couleur propre au jeu.
   Chaque appel est journalisé (Sound.log) qu'il soit joué ou non : les tests s'appuient dessus. */
const Sound = (() => {
  const DEF = { on: false, sound: true, volume: 0.7, silent: false, found: false, sens: 1, cats: { lieu: true, important: true, secret: true, aventure: true, quete: true, jeu: true } };
  const CAT = { lieu: 'lieu', important: 'important', secret: 'secret', aventure: 'aventure', quete: 'quete', proche: 'lieu', decouverte: 'jeu', carte: 'jeu', artefact: 'jeu', recompense: 'jeu', tenue: 'jeu' };
  const LABEL = { lieu: 'Lieu proche', important: 'Lieu majeur', secret: 'Secret', aventure: 'Donjon', quete: 'Quête', proche: 'Tout près', decouverte: 'Lieu trouvé', carte: 'Nouvelle carte', artefact: 'Artefact', recompense: 'Secret révélé', tenue: 'Nouvelle tenue' };
  const N = { D3: 146.83, A3: 220, D4: 293.66, Eb4: 311.13, Fs4: 369.99, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, Eb5: 622.25, Fs5: 739.99, G5: 783.99, A5: 880, D6: 1174.66 };
  let ctx = null, master = null, busyUntil = 0; const log = [];

  function prefs() {
    const s = Game.S.settings; if (!s.explore) s.explore = {};
    const p = s.explore; for (const k in DEF) if (p[k] === undefined) p[k] = k === 'cats' ? Object.assign({}, DEF.cats) : DEF[k];
    for (const k in DEF.cats) if (p.cats[k] === undefined) p.cats[k] = true;
    return p;
  }
  function ensure() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      if (!ctx) { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    } catch (e) { return false; }
  }
  /* Une note : attaque douce, extinction exponentielle ; vibrato et filtre facultatifs. */
  function tone(t, f, dur, type, gain, o) {
    o = o || {}; const osc = ctx.createOscillator(), g = ctx.createGain(); osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur * 0.8);
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + (o.att || 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (o.lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; g.connect(fl); out = fl; }
    osc.connect(g); out.connect(master); osc.start(t); osc.stop(t + dur + 0.05);
  }
  const thump = t => tone(t, 110, 0.28, 'sine', 0.6, { slide: 48, att: 0.005 });
  const bell = (t, f) => [[1, 0.4, 2.0], [2.76, 0.18, 1.3], [5.4, 0.09, 0.8], [8.9, 0.04, 0.5]].forEach(p => tone(t, f * p[0], p[2], 'sine', p[1], { att: 0.004 }));
  const MOTIFS = {
    lieu(t) { tone(t, N.A4, 0.4, 'sine', 0.32); tone(t + 0.17, N.D5, 0.6, 'sine', 0.32); return 0.8; },
    important(t) { [N.D4, N.A4, N.D5, N.Fs5].forEach((f, i) => tone(t + i * 0.13, f, 0.75, 'triangle', 0.26)); tone(t + 0.55, N.A5, 1.0, 'sine', 0.16); return 1.6; },
    secret(t) { tone(t, N.D3, 1.7, 'sine', 0.2, { att: 0.2 }); tone(t + 0.05, N.Eb5, 0.9, 'sine', 0.24, { vib: 6 }); tone(t + 0.36, N.D5, 1.1, 'sine', 0.24, { vib: 6 }); tone(t + 0.72, N.Fs4, 1.2, 'triangle', 0.2, { vib: 4 }); return 2.0; },
    aventure(t) { thump(t); thump(t + 0.24); tone(t + 0.46, N.D4, 0.5, 'sawtooth', 0.12, { lp: 900, att: 0.05 }); tone(t + 0.7, N.G4, 0.95, 'sawtooth', 0.14, { lp: 1300, att: 0.05 }); return 1.7; },
    quete(t) { tone(t, N.D4, 0.5, 'triangle', 0.24); tone(t + 0.2, N.G4, 0.5, 'triangle', 0.24); tone(t + 0.4, N.Bb4, 0.9, 'sine', 0.26); return 1.2; },
    proche(t) { tone(t, N.D5, 0.16, 'sine', 0.26, { att: 0.005 }); tone(t + 0.14, N.D5, 0.3, 'sine', 0.22, { att: 0.005 }); return 0.5; },
    decouverte(t) { [N.G4, N.Bb4, N.D5, N.G5].forEach((f, i) => tone(t + i * 0.11, f, 0.85, 'sine', 0.26)); return 1.3; },
    carte(t) { [N.D5, N.Fs5, N.A5, N.D6].forEach((f, i) => tone(t + i * 0.06, f, 0.36, 'triangle', 0.2)); return 0.7; },
    artefact(t) { bell(t, N.G4); return 2.0; },
    tenue(t) { [N.A4, N.C5, N.D5].forEach((f, i) => tone(t + i * 0.09, f, 0.5, 'triangle', 0.2)); tone(t + 0.3, N.Fs5, 0.8, 'sine', 0.2); return 1.1; },
    recompense(t) { [N.D4, N.Fs4, N.A4, N.D5].forEach(f => tone(t, f, 1.7, 'sine', 0.15, { att: 0.12 })); tone(t + 0.55, N.A5, 1.2, 'sine', 0.13); tone(t + 0.8, N.D6, 1.0, 'sine', 0.1); return 2.1; }
  };
  /* Joue un motif si les préférences le permettent. Les motifs ne se chevauchent jamais : ils s'enchaînent. */
  function play(name, opt) {
    const p = prefs(), e = { name, at: Date.now(), played: false, why: '' };
    if (!MOTIFS[name]) e.why = 'inconnu';
    else if (!(opt && opt.test) && (!p.sound || p.silent)) e.why = 'muet';
    else if (!(opt && opt.test) && p.cats[(opt && opt.cat) || CAT[name]] === false) e.why = 'categorie';
    else if (!ensure()) e.why = 'audio indisponible';
    else {
      master.gain.value = Math.max(0, Math.min(1, p.volume));
      const t = Math.max(ctx.currentTime + 0.03, busyUntil); busyUntil = t + MOTIFS[name](t) + 0.2; e.played = true;
    }
    log.push(e); if (log.length > 300) log.shift();
    return e;
  }
  return { play, prefs, log, LABEL, CAT, names: Object.keys(MOTIFS), prime: ensure, state: () => (ctx ? ctx.state : 'aucun') };
})();
