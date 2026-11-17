/* Illustrations et icônes (SVG en ligne, aucun fichier image externe). */
const Art = (() => {
  const S = (inner, vb = '0 0 64 64') => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const star8 = (cx, cy, r) => { let d = ''; for (let i = 0; i < 16; i++) { const a = Math.PI * i / 8 - Math.PI / 2, rr = i % 2 ? r * 0.62 : r; d += (i ? 'L' : 'M') + (cx + rr * Math.cos(a)).toFixed(1) + ' ' + (cy + rr * Math.sin(a)).toFixed(1); } return d + 'Z'; };
  const icons = {
    atlas: S('<path d="M32 6 58 32 32 58 6 32Z"/><path d="M32 18l5 14-5 14-5-14Z" fill="currentColor"/><circle cx="32" cy="32" r="2" fill="#F0E6D2" stroke="none"/>'),
    codex: S('<path d="M10 12h18a6 6 0 0 1 6 6v36a5 5 0 0 0-5-5H10Z"/><path d="M54 12H38a4 4 0 0 0-4 4v38a5 5 0 0 1 5-5h15Z"/><path d="M16 22h10M16 30h10M42 22h7M42 30h7"/>'),
    quetes: S('<path d="M14 10h30l8 8v36H14Z"/><path d="M44 10v8h8"/><path d="M22 30l6 6 12-13"/><path d="M22 46h20"/>'),
    collection: S(`<path d="${star8(32, 32, 24)}"/><path d="${star8(32, 32, 11)}" fill="currentColor"/>`),
    profil: S('<circle cx="32" cy="22" r="10"/><path d="M12 56c2-12 10-18 20-18s18 6 20 18"/>'),
    gps: S('<circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="4" fill="currentColor"/><path d="M32 6v10M32 48v10M6 32h10M48 32h10"/>'),
    pin: S('<path d="M32 58S14 38 14 24a18 18 0 0 1 36 0c0 14-18 34-18 34Z"/><circle cx="32" cy="24" r="6"/>'),
    list: S('<path d="M22 16h32M22 32h32M22 48h32"/><path d="M10 13l4 3-4 3ZM10 29l4 3-4 3ZM10 45l4 3-4 3Z" fill="currentColor"/>'),
    layers: S('<path d="M32 8 58 22 32 36 6 22Z"/><path d="M8 32l24 13 24-13M8 42l24 13 24-13"/>'),
    lock: S('<rect x="14" y="28" width="36" height="26" rx="4"/><path d="M22 28v-8a10 10 0 0 1 20 0v8"/>'),
    eye: S('<path d="M4 32s10-16 28-16 28 16 28 16-10 16-28 16S4 32 4 32Z"/><circle cx="32" cy="32" r="8"/>'),
    route: S('<path d="M50 8 14 28l14 6 6 14Z"/>'),
    close: S('<path d="M16 16l32 32M48 16 16 48"/>'),
    check: S('<path d="M12 34l12 12 28-30"/>'),
    star: S(`<path d="${star8(32, 32, 22)}" fill="currentColor"/>`),
    target: S('<circle cx="32" cy="32" r="22"/><path d="M32 4v16M32 44v16M4 32h16M44 32h16"/>')
  };
  const A = {
    plume: '<path d="M46 8C26 12 14 30 12 54c14-4 30-18 34-46Z"/><path d="M12 54 40 18"/><path d="M22 40h10M28 32h9" />',
    coupe: '<path d="M16 20h32c0 14-6 22-16 22S16 34 16 20Z"/><path d="M32 42v8M22 54h20"/><path d="M48 24c6 0 8 4 6 10"/><circle cx="32" cy="29" r="3"/>',
    sceau: `<circle cx="32" cy="32" r="24"/><path d="${star8(32, 32, 15)}"/><circle cx="32" cy="32" r="3" fill="currentColor"/>`,
    bendir: '<ellipse cx="32" cy="24" rx="22" ry="10"/><path d="M10 24v16c0 6 10 10 22 10s22-4 22-10V24"/><path d="M14 28l36-8M14 22l36 6"/>',
    tanjia: '<path d="M24 10h16l-2 8c10 6 12 14 12 22 0 10-8 14-18 14S14 50 14 40c0-8 2-16 12-22Z"/><path d="M22 14h20"/><path d="M16 30c-6 0-6 10 0 12M48 30c6 0 6 10 0 12"/>',
    lanterne: '<path d="M32 4v6"/><path d="M22 14h20l6 12v22l-6 8H22l-6-8V26Z"/><path d="M16 26h32M16 48h32M32 14v42"/><path d="M24 34l3 4-3 4M40 34l-3 4 3 4" />',
    zellige: `<path d="${star8(32, 32, 26)}"/><path d="${star8(32, 32, 12)}" fill="currentColor"/>`,
    cedre: '<rect x="8" y="12" width="48" height="40" rx="2"/><path d="M8 26h48"/><path d="M14 26c0 8 6 8 6 0M24 26c0 8 6 8 6 0M34 26c0 8 6 8 6 0M44 26c0 8 6 8 6 0"/><path d="M12 40c6-6 10 6 16 0s10 6 16 0 6 4 8 2"/>',
    porte: '<path d="M8 58V14h48v44"/><path d="M18 58V34a14 14 0 0 1 28 0v24"/><path d="M24 58V36a8 8 0 0 1 16 0v22"/><path d="M8 22h48"/><path d="M14 14v-4h6v4M29 14v-4h6v4M44 14v-4h6v4"/>',
    pot: '<path d="M22 10h20v6c8 4 10 12 10 20 0 12-8 18-20 18S12 48 12 36c0-8 2-16 10-20Z" fill="#2F4FA8" stroke="#1E3270"/><path d="M22 16h20" stroke="#1E3270"/>',
    jamour: '<path d="M32 4v56"/><circle cx="32" cy="46" r="9"/><circle cx="32" cy="29" r="6.5"/><circle cx="32" cy="16" r="4.5"/><path d="M22 60h20"/>',
    sel: '<path d="M10 22l12-8h32l-10 8Z"/><path d="M10 22v22l34 6V22Z"/><path d="M44 22l10-8v24l-10 12"/><path d="M22 23v24M33 23v26"/>',
    dinar: '<circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="16"/><path d="M24 28h16M22 33h20M25 38h14"/>',
    compas: '<circle cx="32" cy="12" r="4"/><path d="M30 16 16 56M34 16l14 40"/><path d="M22 40h20"/><path d="M10 56h44" stroke-dasharray="3 4"/>',
    caravane: '<path d="M8 52V38c0-6 6-4 8-10 2-8 8-8 10 0 2 6 6 6 8 0 2-8 10-6 10 2v8l6 4"/><path d="M44 32c4-8 8-10 12-8l-4 6"/><path d="M14 52V40M24 52V42M34 52V42M42 52V40"/>',
    khettara: '<ellipse cx="32" cy="18" rx="20" ry="8"/><path d="M12 18v10c0 4 9 8 20 8s20-4 20-8V18"/><path d="M24 34v20M40 34v20"/><path d="M6 58h52" stroke-dasharray="2 5"/><path d="M27 48c3-3 7 3 10 0"/>',
    marbre: '<path d="M18 8h28v8H18ZM16 48h32v8H16Z"/><path d="M22 16v32M42 16v32"/><path d="M28 18c4 8-4 14 2 28M36 20c-2 10 4 16 0 26" stroke-width="1.2"/>',
    manuscrit: '<path d="M14 8h30l8 8v40H14Z"/><path d="M44 8v8h8"/><path d="M42 22H22M42 30H22M42 38H22M34 46H22"/>',
    heurtoir: '<rect x="14" y="6" width="36" height="52" rx="3"/><circle cx="32" cy="22" r="5"/><circle cx="32" cy="38" r="11"/><circle cx="20" cy="12" r="1.5" fill="currentColor"/><circle cx="44" cy="12" r="1.5" fill="currentColor"/><circle cx="20" cy="52" r="1.5" fill="currentColor"/><circle cx="44" cy="52" r="1.5" fill="currentColor"/>',
    carreau: '<rect x="8" y="8" width="48" height="48"/><path d="M8 32h48M32 8v48"/><path d="M8 8l24 24L56 8M8 56l24-24 24 24"/><path d="M20 32l12-12 12 12-12 12Z" fill="currentColor"/>',
    lentille: '<circle cx="28" cy="28" r="18"/><circle cx="28" cy="28" r="12"/><path d="M41 41l15 15"/><path d="M20 24c2-4 6-6 10-6"/>',
    atlas: `<path d="M10 10h44v44H10Z"/><path d="${star8(32, 30, 12)}"/><path d="M16 48h32M16 16h10M38 16h10"/><path d="M32 22l3 8-3 8-3-8Z" fill="currentColor"/>`
  };
  return {
    icon: k => icons[k] || '',
    artifact: k => S(A[k] || A.zellige),
    star8
  };
})();
