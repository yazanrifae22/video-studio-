/* c04 chapter-only cardboard drawings (the trailer). ART-style entries: name(o) -> [vbW, vbH, svgBody]. No words, no logos. */
import { COL } from '../art.js';
export const INK = '#1E1712';
const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const E = (cx, cy, rx, ry, f, s = 6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const BLUE = '#4DA3E8';

export const D = {
  table: () => [900, 260, P('M24 14 L876 14 L900 74 L0 74 Z', '#B98550') + R(0, 74, 900, 66, '#8B5A35', 4) + R(50, 140, 70, 118, '#7A4E2D', 3) + R(780, 140, 70, 118, '#7A4E2D', 3)],
  puddle: () => [340, 80, E(170, 40, 160, 32, BLUE, 5) + E(120, 30, 40, 9, 'rgba(255,255,255,0.5)', 0)],
  drop: () => [60, 90, P('M30 6 Q56 46 56 62 A26 26 0 0 1 4 62 Q4 46 30 6 Z', BLUE, 5) + P('M18 58 Q19 70 30 74', 'none', 4)],
  strip: () => [320, 110, R(8, 12, 304, 88, COL.paper, 6, 5) + R(8, 12, 304, 14, COL.verm, 4, 0)],
  numCard: () => [680, 330, P('M10 24 L670 8 L662 320 L20 312 Z', COL.paper, 7) + R(30, 0, 120, 38, 'rgba(236,222,178,0.95)', 4, 3) + R(530, 292, 120, 38, 'rgba(236,222,178,0.95)', 4, 3)],
  crown: () => [160, 120, P('M10 108 L10 34 L48 66 L82 12 L114 66 L152 34 L152 108 Z', COL.yel, 7) + C(10, 30, 9, COL.verm, 4) + C(82, 10, 10, COL.verm, 4) + C(152, 30, 9, COL.verm, 4) + R(14, 84, 134, 14, COL.verm, 3, 0)],
  post: () => [44, 230, R(16, 24, 12, 190, '#C9A23A', 4) + C(22, 20, 16, COL.verm, 5) + R(0, 206, 44, 20, '#7A4E2D', 6)],
  rope: () => [380, 80, `<path d="M8 14 Q190 100 372 14" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/><path d="M8 14 Q190 100 372 14" stroke="${COL.verm}" stroke-width="11" fill="none" stroke-linecap="round"/>`],
  zone: () => { let h = ''; for (let i = -4; i < 14; i++) h += `<path d="M${i * 46} 330 L${i * 46 + 120} 0" stroke="rgba(30,23,18,0.14)" stroke-width="10"/>`; return [380, 330, R(4, 4, 372, 322, '#E3D3AE', 10, 6) + `<clipPath id="zc"><rect x="4" y="4" width="372" height="322" rx="10"/></clipPath><g clip-path="url(#zc)">${h}</g>`]; },
  mini: (o = {}) => [200, 140, R(4, 4, 192, 132, '#2A2A2E', 14) + R(16, 16, 168, 92, o.col || COL.pink, 6, 4) + R(16, 118, 100, 8, COL.verm, 4, 0)],
  note: (o = {}) => [64, 84, C(20, 64, 17, o.col || INK, 0) + L(35, 64, 35, 10, o.col || INK, 8) + `<path d="M35 10 Q62 16 56 44" fill="none" stroke="${o.col || INK}" stroke-width="8" stroke-linecap="round"/>`],
  podium: () => [620, 330, R(206, 6, 208, 324, COL.yel, 6) + R(6, 106, 200, 224, COL.kraftL, 6) + R(414, 156, 200, 174, COL.kraftD, 6)],
  warn: () => [260, 230, P('M130 10 L250 220 L10 220 Z', COL.yel, 9) + R(119, 78, 22, 82, INK, 4, 0) + C(130, 188, 12, INK, 0)],
  spot: () => [900, 900, `<defs><linearGradient id="sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(255,240,190,0.7)"/><stop offset="1" stop-color="rgba(255,240,190,0.08)"/></linearGradient></defs><path d="M370 0 L530 0 L900 900 L0 900 Z" fill="url(#sp)"/>`],
  clockFace: () => [200, 200, C(100, 100, 92, '#FFFDF6', 8) + [0, 3, 6, 9].map((i) => { const a = (i / 12) * Math.PI * 2; return L(100 + Math.sin(a) * 74, 100 - Math.cos(a) * 74, 100 + Math.sin(a) * 84, 100 - Math.cos(a) * 84, INK, 6); }).join('') + C(100, 100, 9, INK, 0)],
  hand: () => [22, 84, R(4, 2, 14, 80, COL.verm, 6, 4)],
  whiteFlag: () => [140, 150, L(18, 8, 18, 146, INK, 8) + P('M22 12 L128 30 L22 62 Z', '#FFFDF6', 6)],
  bunting: () => { let b = `<path d="M6 12 Q250 70 500 40 Q750 10 994 60" stroke="${INK}" stroke-width="6" fill="none"/>`; const cols = [COL.verm, COL.yel, COL.blue, COL.green, COL.pink]; for (let i = 0; i < 12; i++) { const x = 40 + i * 78, y = 24 + Math.sin(i * 0.55 + 0.4) * 26 + 18; b += P(`M${x} ${y} L${x + 52} ${y + 6} L${x + 24} ${y + 66} Z`, cols[i % 5], 5); } return [1000, 130, b]; },
  sun: () => { let d = ''; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, a2 = a + 0.14; d += `M150 150 L${150 + Math.cos(a) * 146} ${150 + Math.sin(a) * 146} L${150 + Math.cos(a2) * 146} ${150 + Math.sin(a2) * 146} Z `; } return [300, 300, `<path d="${d}" fill="rgba(255,226,120,0.85)"/>`]; },
  capH: () => [260, 30, R(4, 4, 252, 22, COL.wood, 8, 6)],
  glass: () => [260, 340, P('M38 6 L222 6 L150 156 L222 334 L38 334 L110 156 Z', 'rgba(207,233,245,0.9)', 8)],
  sandTop: () => [120, 60, P('M8 52 Q60 6 112 52 Z', '#F2B84B', 0)],
  sandBot: () => [190, 120, P('M4 116 Q95 -6 186 116 Z', '#F2B84B', 5)],
  stream: () => [10, 170, R(0, 0, 10, 170, '#F2B84B', 3, 0)],
  bar: (w, h, col) => [w, h, R(5, 5, w - 10, h - 10, col, 8, 6)],
  flap: (w, h, col) => [w, h, P(`M6 6 L${w - 6} 6 L${w - 6} ${h - 6} L6 ${h - 6} Z`, col, 6)],
};
