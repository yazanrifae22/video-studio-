/* c04/c05 chapter-only cardboard drawings. ART-style: name(o) -> [vbW, vbH, svgBody]. No words, no logos. */
export const INK = '#1E1712';
const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const E = (cx, cy, rx, ry, f, s = 6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const sym = (ch, x, y, size, f = INK) => `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${f}">${ch}</text>`;
const GOLD = '#F2B824', PAPER = '#F8F3E6', VERM = '#E5401D', GREEN = '#57A05A', WOOD = '#8B5A35';

export const D = {
  /** empty kraft tray (coins go in) */
  tray: () => [260, 90, P('M10 20 L250 20 L226 78 L34 78 Z', '#C99A62') + L(30, 34, 230, 34, 'rgba(255,255,255,0.35)', 5)],
  /** twinkle star (4 points) */
  sparkle: () => [120, 120, P('M60 4 L74 46 L116 60 L74 74 L60 116 L46 74 L4 60 L46 46 Z', '#FFF3A8', 6)],
  /** big red panic button on a base */
  redBtn: () => [220, 160, E(110, 120, 100, 30, '#8A5A33', 6) + P('M24 112 C24 50 60 22 110 22 C160 22 196 50 196 112 Z', VERM) + L(60, 60, 88, 40, 'rgba(255,255,255,0.55)', 8)],
  /** crumpled tarp, covers a prop */
  tarp: () => [820, 520, P('M10 40 C120 8 240 60 380 24 C540 -8 680 50 810 30 L800 500 C660 520 500 480 360 508 C220 530 100 490 20 510 Z', '#7D8A94') + P('M120 60 C140 200 100 320 130 470', 'none', 4).replace(INK, '#5E6A73') + P('M420 40 C440 180 400 330 440 480', 'none', 4).replace(INK, '#5E6A73') + P('M640 50 C650 190 620 330 650 470', 'none', 4).replace(INK, '#5E6A73')],
  /** scales for the dollar beat: pans tilt via layer rotation of the beam; beam + two pans are separate arts */
  stand: () => [60, 330, L(30, 10, 30, 300, INK, 12) + R(0, 296, 60, 30, WOOD, 6)],
  beam: () => [620, 40, R(6, 10, 608, 20, '#5A3A22', 8, 6)],
  pan: () => [200, 120, L(100, 6, 14, 80, INK, 5) + L(100, 6, 186, 80, INK, 5) + P('M8 80 Q100 128 192 80 Z', '#C9A23A', 6) + C(100, 6, 7, INK, 0)],
  /** big dollar coin and a smaller foreign coin (generic, no real symbol) */
  usdCoin: () => [220, 220, C(110, 110, 100, '#F2C230') + C(110, 110, 76, 'none', 4) + sym('$', 110, 150, 110, '#8A6410')],
  foreignCoin: () => [140, 140, C(70, 70, 62, '#BFC5CB') + C(70, 70, 44, 'none', 4) + P('M70 38 L80 62 L104 64 L86 80 L92 104 L70 90 L48 104 L54 80 L36 64 L60 62 Z', '#E8ECEF', 4)],
  /** a floating price flag */
  flag: () => [300, 120, P('M10 10 L290 10 L270 60 L290 110 L10 110 Z', PAPER)],
  /** red wall phone with ring lines */
  redPhone: () => [200, 220, R(10, 70, 180, 140, VERM, 28) + R(30, 20, 140, 50, '#B8301A', 24) + C(100, 150, 34, '#FFFDF6', 5) + L(100, 130, 100, 170, INK, 5)],
  /** money bag: use as a cardboard sack with a gold coin face */
  bag: () => [150, 150, P('M42 40 C4 80 6 140 40 146 L110 146 C144 140 146 80 108 40 C100 30 50 30 42 40 Z', '#C8A06A') + R(46, 24, 58, 18, '#8A5A33', 6) + C(75, 96, 22, GOLD, 4)],
  /** cash bundle */
  cash: () => [220, 120, R(8, 20, 204, 92, '#7FB77E', 8) + R(78, 10, 64, 112, '#EAD9A6', 6) + C(46, 66, 18, 'none', 4) + C(174, 66, 18, 'none', 4)],
  /** gold ring on a small tray plate */
  ringTray: () => [260, 150, E(130, 110, 120, 32, '#C99A62') + E(130, 96, 104, 24, '#D9B07A', 5) + E(130, 74, 40, 46, 'none', 18).replace('stroke="' + INK + '"', 'stroke="#A8780A"') + E(130, 74, 40, 46, 'none', 9).replace('stroke="' + INK + '"', 'stroke="' + GOLD + '"')],
  /** calendar row of grace-period boxes (3 empty boxes; ticks are separate) */
  box: () => [150, 130, R(8, 8, 134, 114, PAPER, 10)],
  /** plain report cover (no logo) */
  report: () => [380, 480, R(10, 10, 360, 460, '#E9E0CC', 10) + R(10, 10, 60, 460, '#3D7DB8', 8) + L(100, 340, 340, 340, 'rgba(30,23,18,0.25)', 8) + L(100, 380, 300, 380, 'rgba(30,23,18,0.25)', 8) + L(100, 420, 320, 420, 'rgba(30,23,18,0.25)', 8)],
  /** headline card */
  headline: () => [420, 160, R(8, 8, 404, 144, PAPER, 8)],
  /** glow behind jewellery */
  glow: () => [500, 500, `<defs><radialGradient id="gw"><stop offset="0" stop-color="rgba(255,226,122,0.95)"/><stop offset="1" stop-color="rgba(255,226,122,0)"/></radialGradient></defs><circle cx="250" cy="250" r="240" fill="url(#gw)"/>`],
  /** one paper figure (head + body) for the crowd of people who get hurt: tiny person */
  hbar: () => [10, 10, ''],
};
