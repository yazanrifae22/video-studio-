/* GOLD film - original cardboard art (SVG bodies). Entry: name(o) -> [vbW, vbH, body]. No words (text goes on Piece text layers from strings).
   Merged into ART by art.js (Object.assign), so F.cut('goldBar') and Piece layers {art:'goldBar'} work. No imports (art.js imports this file). */
const INK = '#1E1712';
const K = { kraft: '#C99A62', kraftL: '#D9B07A', kraftD: '#A97A45', paper: '#F8F3E6', yel: '#FFD23F', verm: '#E5401D', blue: '#3D7DB8', sky: '#8EC5E8', green: '#57A05A', wood: '#8B5A35', gold: '#F2B824', goldL: '#FFE27A', goldD: '#C98E0E', grey: '#9AA0A6', pink: '#F4A3B5' };
const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
const E = (cx, cy, rx, ry, f, s = 6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? sw(s) : ''}/>`;
const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const sym = (ch, x, y, size, f = INK) => `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${f}">${ch}</text>`;

export const GOLD = {
  /** gold foil bar (3D-ish trapezoid) */
  goldBar: () => [260, 150, P('M52 14 L208 14 L250 64 L10 64 Z', K.goldL) + P('M10 64 L250 64 L250 136 L10 136 Z', K.gold) + L(30, 84, 120, 84, 'rgba(255,255,255,0.6)', 7) + L(30, 104, 70, 104, 'rgba(255,255,255,0.45)', 6) + L(60, 38, 150, 38, 'rgba(255,255,255,0.7)', 5)],
  /** cut-cardboard slide shaped like a falling price line: plateau top-left, long ramp to the bottom-right, a lip at the foot */
  priceSlide: () => [500, 640, P('M10 60 L170 60 L490 520 L490 630 L10 630 Z', K.kraftL) + P('M10 60 L170 60 L490 520 L490 548 L156 88 L10 88 Z', K.kraftD, 0) + L(40, 150, 40, 620, 'rgba(60,40,20,0.25)', 9) + L(110, 190, 110, 620, 'rgba(60,40,20,0.2)', 9) + L(180, 260, 180, 620, 'rgba(60,40,20,0.2)', 9) + L(250, 350, 250, 620, 'rgba(60,40,20,0.18)', 9) + L(320, 440, 320, 620, 'rgba(60,40,20,0.18)', 9) + L(390, 520, 390, 620, 'rgba(60,40,20,0.16)', 9) + P('M10 60 L170 60 L490 520 L490 630 L10 630 Z', 'none', 7)],
  /** a price-path column: o.w, o.h, o.col */
  stepCol: (o = {}) => { const w = o.w || 120, h = o.h || 300; return [w, h, R(5, 5, w - 10, h - 10, o.col || K.kraft, 6, 6) + L(14, 24, w - 14, 24, 'rgba(255,255,255,0.35)', 6) + (h > 80 ? L(w * 0.3, 40, w * 0.3, h - 14, 'rgba(60,40,20,0.2)', 6) + L(w * 0.7, 40, w * 0.7, h - 14, 'rgba(60,40,20,0.2)', 6) : '')]; },
  /** solid colour block (bars, loan bar, chart bars): o.w o.h o.col */
  barBlock: (o = {}) => { const w = o.w || 100, h = o.h || 100; return [w, h, R(5, 5, w - 10, h - 10, o.col || K.blue, 8, 6) + L(14, 16, w - 14, 16, 'rgba(255,255,255,0.3)', 5)]; },
  /** seesaw triangle fulcrum */
  seesawTri: () => [220, 200, P('M110 10 L212 190 L8 190 Z', K.kraft) + L(110, 60, 110, 178, 'rgba(60,40,20,0.25)', 8) + C(110, 40, 12, K.yel, 5)],
  /** seesaw plank with a gold lump at the LEFT end and a bond certificate at the RIGHT end (one piece: it tilts as a whole) */
  seesawPlank: () => [760, 260, R(20, 168, 720, 34, K.wood, 8, 6) + L(60, 185, 700, 185, 'rgba(255,255,255,0.25)', 4)
    + P('M70 168 C60 120 90 70 140 62 C190 56 232 84 246 120 C256 144 252 160 246 168 Z', K.gold) + P('M110 106 C124 90 150 88 164 100', 'none', 7).replace(INK, K.goldL) + L(100, 150, 200, 150, K.goldD, 6)
    + R(520, 70, 190, 98, K.paper, 6, 6) + R(532, 82, 166, 74, 'none', 3, 3) + C(615, 119, 18, K.green, 4) + R(520, 70, 190, 18, K.green, 6, 0)],
  /** cube (isometric): three faces of gold */
  cube: () => [420, 420, P('M210 20 L400 110 L210 200 L20 110 Z', K.goldL) + P('M20 110 L210 200 L210 400 L20 310 Z', K.gold) + P('M400 110 L210 200 L210 400 L400 310 Z', K.goldD) + L(60, 150, 160, 196, 'rgba(255,255,255,0.4)', 7)],
  /** seven-storey building for scale: o.floors */
  building: (o = {}) => { const n = o.floors || 7, fh = 46, w = 150, h = n * fh + 40; let b = R(8, 28, w - 16, h - 28, '#C9A98A', 4, 6) + R(2, 14, w - 4, 20, K.wood, 4, 6); for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) b += R(24 + c * 38, 44 + i * fh, 26, 30, i % 3 === 1 ? K.yel : K.sky, 3, 4); b += R(54, h - 44, 42, 44, K.wood, 3, 5); return [w, h, b]; },
  /** bear (grumpy, brown) shoulders + head */
  bear: () => [260, 300, P('M20 300 Q20 190 130 180 Q240 190 240 300 Z', '#8A5A33') + C(52, 54, 30, '#8A5A33') + C(208, 54, 30, '#8A5A33') + C(52, 54, 14, K.pink, 0) + C(208, 54, 14, K.pink, 0) + C(130, 118, 86, '#9C6A3E') + E(130, 150, 42, 32, '#E8CBA0', 5) + E(130, 138, 14, 9, INK, 0) + C(96, 100, 9, INK, 0) + C(164, 100, 9, INK, 0) + L(78, 82, 112, 92, INK, 7) + L(182, 82, 148, 92, INK, 7) + P('M104 166 Q130 148 156 166', 'none', 6)],
  /** bull (red, charging mood) head + horns + nose ring */
  bull: () => [280, 300, P('M16 300 Q20 196 140 186 Q260 196 264 300 Z', '#B24A2C') + P('M40 92 Q0 70 12 22 Q50 40 74 78 Z', K.paper, 6) + P('M240 92 Q280 70 268 22 Q230 40 206 78 Z', K.paper, 6) + E(140, 124, 80, 78, '#C65A36') + E(140, 168, 54, 38, '#E6B58E', 5) + E(118, 172, 9, 11, INK, 0) + E(162, 172, 9, 11, INK, 0) + `<circle cx="140" cy="198" r="15" fill="none" stroke="${K.gold}" stroke-width="7"/>` + C(104, 104, 9, INK, 0) + C(176, 104, 9, INK, 0) + L(84, 84, 120, 96, INK, 7) + L(196, 84, 160, 96, INK, 7)],
  /** price board (dark slate, wooden frame, 3 white strips for text layers) */
  priceBoard: (o = {}) => { const n = o.rows || 3, H = 60 + n * 106 + 40; let b = R(6, 6, 548, H - 12, K.wood, 14, 7) + R(30, 30, 500, H - 60, '#2B3A33', 6, 5); for (let i = 0; i < n; i++) b += R(50, 50 + i * 106, 460, 90, '#EDE6D2', 4, 3); return [560, H, b]; },
  /** pebble + party hat + crack */
  pebble: () => [90, 70, P('M10 50 Q6 22 34 14 Q70 6 82 36 Q86 58 56 64 Q20 68 10 50 Z', '#9A9388') + L(30, 30, 52, 26, 'rgba(255,255,255,0.4)', 5)],
  partyHat: () => [80, 110, P('M40 6 L74 104 L6 104 Z', K.pink) + C(40, 8, 8, K.yel, 4) + L(20, 70, 60, 70, K.yel, 7) + L(26, 44, 54, 44, K.yel, 6)],
  crack: () => [520, 760, `<path d="M300 0 L270 90 L340 150 L250 240 L330 330 L240 420 L320 520 L260 620 L300 760" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/><path d="M300 0 L270 90 L340 150 L250 240 L330 330 L240 420 L320 520 L260 620 L300 760" fill="none" stroke="#F8F3E6" stroke-width="4" stroke-linejoin="round"/><path d="M340 150 L430 190 M330 330 L420 350 M240 420 L150 460" stroke="${INK}" stroke-width="8" fill="none" stroke-linecap="round"/>`],
  /** train: engine + two wagons, drawn left to right */
  train: () => [760, 260, R(10, 180, 740, 18, K.wood, 4, 5) + R(30, 70, 160, 110, K.verm, 10) + R(150, 40, 70, 140, K.verm, 8) + R(30, 40, 90, 34, INK, 4, 4) + R(58, 88, 40, 40, K.sky, 4, 4) + C(70, 200, 26, K.grey) + C(150, 200, 26, K.grey) + R(220, 90, 240, 90, K.yel, 8) + R(240, 108, 60, 40, K.sky, 4, 4) + R(330, 108, 60, 40, K.sky, 4, 4) + C(260, 200, 24, K.grey) + C(420, 200, 24, K.grey) + R(480, 90, 240, 90, K.blue, 8) + R(500, 108, 60, 40, K.paper, 4, 4) + R(590, 108, 60, 40, K.paper, 4, 4) + C(520, 200, 24, K.grey) + C(680, 200, 24, K.grey)],
  gavelStub: () => [10, 10, ''],
};
