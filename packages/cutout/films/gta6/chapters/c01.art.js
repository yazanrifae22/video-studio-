/* c01 / c02 chapter-only art (SVG bodies, no words, no logos). Every entry: name(o) -> [vbW, vbH, body]. Helpers exported for c02.art.js. */
import { INK, COL } from '../art.js';

const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const E = (cx, cy, rx, ry, f, s = 6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
export const sym = (ch, x, y, size, f = INK, extra = '') => `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${f}" ${extra}>${ch}</text>`;
export const star = (cx, cy, r1, r2, n = 5) => { let d = ''; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); } return d + 'Z'; };
const face = (cx, cy, mood = 'happy') => C(cx - 15, cy, 5, INK, 0) + C(cx + 15, cy, 5, INK, 0) + (mood === 'happy' ? P(`M${cx - 16} ${cy + 16} Q${cx} ${cy + 32} ${cx + 16} ${cy + 16}`, 'none', 4) : L(cx - 12, cy + 20, cx + 12, cy + 20, INK, 4));

export const A1 = {
  /** old phone: thick bezels, round home button (generic shape) */
  oldPhone: () => [150, 290, R(8, 8, 134, 274, '#B9BEC4', 24) + R(22, 44, 106, 176, '#3D7DB8', 6, 4) + C(75, 250, 15, '#E8EAEC', 5) + R(56, 22, 38, 8, '#55595F', 4, 0) + P('M26 48 L80 48 L40 216 L26 216 Z', 'rgba(255,255,255,0.22)', 0)],
  /** empty app-shaped hole with a ghost music note */
  appHole: () => [380, 380, R(14, 14, 352, 352, '#2A1C12', 70) + R(34, 34, 312, 312, '#150C06', 56, 0) + R(22, 22, 336, 336, 'none', 62, 4).replace('stroke="' + INK + '"', 'stroke="#C99A62"')
    + `<g fill="none" stroke="#8A7A66" stroke-width="12" stroke-dasharray="20 14" stroke-linecap="round"><circle cx="150" cy="268" r="30"/><circle cx="236" cy="246" r="30"/><path d="M180 268 L180 112 L266 92 L266 246"/></g>`],
  /** green app tile with a loop ring (no letters) */
  vineApp: () => [400, 400, R(10, 14, 380, 376, '#2F9E5C', 84) + R(26, 22, 348, 150, 'rgba(255,255,255,0.2)', 70, 0) + R(10, 14, 380, 376, 'none', 84, 7)],
  /** tombstone with a cross */
  grave: () => [260, 340, P('M30 330 L30 130 Q30 20 130 20 Q230 20 230 130 L230 330 Z', '#C9C3B3') + P('M130 70 L130 170 M92 108 L168 108', 'none', 16) + L(60, 240, 200, 240, 'rgba(30,23,18,0.25)', 6) + L(60, 270, 200, 270, 'rgba(30,23,18,0.25)', 6)
    + E(130, 332, 124, 20, '#7A4E2D') + P('M40 330 q8 -26 18 0 M200 330 q8 -30 18 0', 'none', 5) + C(52, 296, 8, COL.pink, 4) + C(212, 292, 8, COL.yel, 4)],
  /** paper kids growing: kid with controller / graduate / office */
  kid: () => [220, 300, E(110, 288, 60, 10, 'rgba(60,40,20,0.3)', 0) + R(76, 214, 24, 70, '#3D7DB8', 6) + R(120, 214, 24, 70, '#3D7DB8', 6) + R(52, 130, 116, 100, '#E5401D', 18) + C(110, 74, 54, '#D9B07A', 6) + P('M62 56 Q70 18 110 20 Q154 18 160 58 Q130 36 110 40 Q86 36 62 56 Z', '#5A3A22', 5) + face(110, 78)
    + R(68, 168, 84, 44, '#26211B', 16) + C(86, 190, 8, COL.yel, 3) + C(134, 184, 6, COL.verm, 3) + C(146, 198, 6, COL.green, 3) + R(36, 150, 36, 22, '#D9B07A', 10) + R(148, 150, 36, 22, '#D9B07A', 10)],
  grad: () => [220, 360, E(110, 348, 60, 10, 'rgba(60,40,20,0.3)', 0) + R(78, 262, 24, 80, '#26211B', 6) + R(120, 262, 24, 80, '#26211B', 6) + P('M44 270 L60 130 L160 130 L176 270 Z', '#26211B') + R(94, 130, 32, 60, '#FFFDF6', 4) + C(110, 90, 46, '#D9B07A', 6) + face(110, 94) + P('M12 56 L110 18 L208 56 L110 92 Z', '#26211B') + R(66, 56, 88, 30, '#26211B', 6, 0) + L(196, 60, 196, 112, COL.yel, 6) + C(196, 116, 8, COL.yel, 3)
    + R(150, 190, 54, 14, '#FFFDF6', 6, 4) + C(160, 197, 8, COL.verm, 3)],
  office: () => [220, 420, E(110, 408, 62, 10, 'rgba(60,40,20,0.3)', 0) + R(78, 310, 24, 90, '#1F2A44', 6) + R(120, 310, 24, 90, '#1F2A44', 6) + R(50, 170, 120, 150, '#3A4A7A', 20) + P('M92 170 L110 200 L128 170 Z', '#FFFDF6', 4) + P('M104 190 L116 190 L122 270 L110 286 L98 270 Z', COL.verm, 4) + C(110, 112, 48, '#D9B07A', 6) + P('M62 98 Q66 52 110 54 Q154 52 158 98 Q130 76 110 78 Q86 76 62 98 Z', '#2E2238', 5) + face(110, 118)
    + R(150, 300, 66, 52, '#8B5A35', 8) + P('M170 300 L170 288 L196 288 L196 300', 'none', 5)],
  /** vertical ruler with ticks */
  vRuler: (o = {}) => { const hh = o.h || 640; let b = R(8, 4, 74, hh - 8, COL.yel, 8); for (let y = 30; y < hh - 20; y += 26) b += L(8, y, y % 130 === 30 ? 56 : 36, y, INK, 3); return [90, hh, b]; },
  /** plain football game box (ball icon only) */
  ballBox: () => [130, 166, R(6, 6, 118, 154, '#FFFDF6', 8) + R(6, 6, 118, 34, '#2E8B57', 8) + C(65, 92, 36, '#FFFDF6', 6) + P('M65 72 L82 84 L76 104 L54 104 L48 84 Z', '#26211B', 3) + L(65, 72, 65, 58, INK, 3) + L(82, 84, 98, 80, INK, 3) + L(76, 104, 86, 118, INK, 3) + L(54, 104, 44, 118, INK, 3) + L(48, 84, 32, 80, INK, 3) + R(6, 128, 118, 32, '#1F6B8C', 6)],
  /** the lone box with a cowboy-hat icon (no lettering) */
  hatBox: () => [210, 270, R(8, 8, 194, 254, '#C9A23A', 8) + R(8, 8, 194, 44, '#7A1D10', 8) + E(105, 150, 70, 14, '#7A4E2D', 6) + P('M62 150 Q64 80 105 78 Q146 80 148 150 Z', '#8B5A35', 6) + P('M62 150 Q105 168 148 150', 'none', 5) + R(8, 212, 194, 50, '#3A2410', 6)],
  /** conveyor belt */
  belt: () => { let b = R(4, 10, 912, 40, '#3A3D44', 14); for (let x = 30; x < 900; x += 44) b += L(x, 20, x - 14, 40, '#55595F', 5); return [920, 60, b + C(40, 30, 14, '#B9BEC4', 4) + C(880, 30, 14, '#B9BEC4', 4)]; },
  snail: () => [320, 220, P('M20 200 Q30 160 100 160 L300 160 Q318 186 296 202 Z', '#C9B27A') + P('M270 164 Q286 120 304 110', 'none', 8) + P('M246 164 Q250 120 262 104', 'none', 8) + C(305, 108, 9, '#FFFDF6', 4) + C(263, 100, 9, '#FFFDF6', 4) + C(307, 108, 3, INK, 0) + C(265, 100, 3, INK, 0)
    + C(130, 110, 86, '#B8875A', 7) + `<path d="M130 110 m0 0 a14 14 0 1 1 14 14 a30 30 0 1 1 -30 -30 a46 46 0 1 1 46 46 a62 62 0 1 1 -62 -62" fill="none" ${sw(5)} stroke-opacity="0.9"/>`],
  bigX: () => [200, 200, L(26, 26, 174, 174, '#D2361A', 32) + L(174, 26, 26, 174, '#D2361A', 32) + L(26, 26, 174, 174, '#F2877A', 12) + L(174, 26, 26, 174, '#F2877A', 12)],
  zzz: () => [120, 150, sym('Z', 30, 150, 80, '#FFFDF6', `stroke="${INK}" stroke-width="6" paint-order="stroke"`) + sym('Z', 70, 92, 58, '#FFFDF6', `stroke="${INK}" stroke-width="5" paint-order="stroke"`) + sym('Z', 98, 44, 40, '#FFFDF6', `stroke="${INK}" stroke-width="4" paint-order="stroke"`)],
  /** big day clock face (hand layer drawn separately) */
  dayFace: () => { let t = ''; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; t += L(150 + Math.sin(a) * 118, 150 - Math.cos(a) * 118, 150 + Math.sin(a) * 136, 150 - Math.cos(a) * 136, INK, 7); } return [300, 300, C(150, 150, 142, '#FFFDF6', 9) + t + C(150, 150, 10, INK, 0)]; },
  hand: () => [30, 130, R(8, 4, 14, 120, INK, 7, 0)],
  hand2: () => [30, 90, R(8, 4, 14, 80, COL.verm, 7, 0)],
  /** wrist watch (big, cardboard) */
  watch: () => [200, 260, R(60, 0, 80, 70, '#3A3D44', 10) + R(60, 190, 80, 70, '#3A3D44', 10) + C(100, 130, 70, '#B9BEC4', 8) + C(100, 130, 54, '#FFFDF6', 5) + L(100, 130, 100, 98, INK, 6) + L(100, 130, 120, 138, COL.verm, 5)],
  /** floating small question mark for pops */
  q: () => [110, 150, sym('?', 55, 136, 150, COL.verm, `stroke="${INK}" stroke-width="7" paint-order="stroke"`)],
  sunDisc: () => { let r = ''; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; r += L(80 + Math.cos(a) * 52, 80 + Math.sin(a) * 52, 80 + Math.cos(a) * 74, 80 + Math.sin(a) * 74, INK, 6); } return [160, 160, r + C(80, 80, 44, COL.yel, 6)]; },
  coinRoll: () => [150, 150, C(75, 75, 68, '#F2C230', 7) + C(75, 75, 48, 'none', 4) + sym('$', 75, 108, 84, '#8A6410')],
};

/** marker cobweb drawn on (dom painter for a Piece layer; use F.drawOn(piece, id, at, dur) to trigger) */
export function webDom(el, K, k, L_) {
  const ns = 'http://www.w3.org/2000/svg', w = L_.w * k, hh = L_.h * k, svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', hh); el.appendChild(svg);
  const paths = [];
  const add = (d) => { const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.setAttribute('fill', 'none'); p.style.stroke = '#F6EFDD'; p.style.strokeWidth = Math.max(3, 7 * k); p.style.strokeLinecap = 'round'; p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = '1'; svg.appendChild(p); paths.push(p); };
  const ox = w * 0.02, oy = hh * 0.02; // corner web: spokes from the top-left corner + sagging arcs
  for (const [ex, ey] of [[0.98, 0.04], [0.86, 0.38], [0.58, 0.72], [0.22, 0.97], [0.5, 0.2]]) add(`M${ox} ${oy} L${ex * w} ${ey * hh}`);
  for (const r of [0.3, 0.52, 0.76, 0.98]) add(`M${r * w * 0.98} ${hh * 0.04 * r + oy} Q${r * w * 0.74} ${r * hh * 0.5} ${r * w * 0.86} ${r * hh * 0.38 + oy} Q${r * w * 0.5} ${r * hh * 0.74} ${r * w * 0.58} ${r * hh * 0.72} Q${r * w * 0.34} ${r * hh * 0.9} ${r * w * 0.22} ${r * hh * 0.97}`);
  L_.paint = (t) => { const a = L_.drawAt == null ? -1 : L_.drawAt, d = L_.drawDur || 0.6, p = Math.max(0, Math.min(1, (t - a) / d)), e = p * p * (3 - 2 * p); paths.forEach((pa, i) => { const q = Math.max(0, Math.min(1, e * 1.3 - (i / paths.length) * 0.3)), s = (1 - q).toFixed(3); if (pa.__d !== s) { pa.__d = s; pa.style.strokeDashoffset = s; } }); };
}
