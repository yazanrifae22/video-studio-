/* c05 chapter-only cardboard drawings (the delays). ART-style: name(o) -> [vbW, vbH, svgBody]. No words, no logos. */
import { COL } from '../art.js';
import { R, C, E, P, L, INK } from './c04.art.js';
export { INK };

export const D = {
  strip: (w, h, ticks = 12) => { let t = ''; for (let i = 1; i < ticks; i++) t += L(i * (w / ticks), h - 6, i * (w / ticks), i % 3 ? h - 22 : h - 34, 'rgba(30,23,18,0.55)', 4); return [w, h, R(5, 5, w - 10, h - 10, COL.paper, 6, 6) + t]; },
  ext: (w, h, folds = 5) => { let t = ''; for (let i = 1; i < folds; i++) t += L(i * (w / folds), 6, i * (w / folds), h - 6, 'rgba(30,23,18,0.35)', 3); return [w, h, R(5, 5, w - 10, h - 10, COL.cream, 6, 6) + t + R(5, 5, 26, h - 10, 'rgba(30,23,18,0.18)', 0, 0)]; },
  tag: (w, h, col) => [w, h, P(`M16 6 L${w - 6} 6 L${w - 6} ${h - 6} L16 ${h - 6} L4 ${h / 2} Z`, col || COL.yel, 6) + C(22, h / 2, 6, INK, 0)],
  cross: () => [260, 90, L(14, 10, 246, 80, COL.verm, 12) + L(246, 10, 14, 80, COL.verm, 12)],
  flag: () => [150, 220, L(18, 16, 18, 212, INK, 10) + P('M22 16 L142 26 L134 104 L22 98 Z', COL.verm, 7) + C(18, 212, 12, COL.wood, 5)],
  hand: () => [96, 210, R(34, 70, 28, 138, COL.wood, 8, 6) + C(48, 46, 38, '#F6C08A', 6) + C(16, 54, 15, '#F6C08A', 5) + R(24, 72, 48, 14, COL.verm, 4, 4)],
  legBox: (o = {}) => [90, 120, L(26, 78, 20, 112, INK, 7) + L(64, 78, 70, 112, INK, 7) + C(20, 114, 7, INK, 0) + C(70, 114, 7, INK, 0) + R(8, 14, 74, 68, o.col || COL.kraftL, 8, 6) + C(30, 40, 6, INK, 0) + C(60, 40, 6, INK, 0) + P('M32 60 Q45 68 58 60', 'none', 4)],
  stop: () => [300, 440, R(134, 230, 32, 206, COL.wood, 8, 6) + P('M92 8 L208 8 L292 92 L292 208 L208 292 L92 292 L8 208 L8 92 Z', COL.verm, 9) + P('M96 24 L204 24 L276 96 L276 204 L204 276 L96 276 L24 204 L24 96 Z', 'none', 5).replace(INK, '#FFFDF6')],
  flow: (m = 1) => [110, 340, P(`M55 0 C${55 + 40 * m} 60 ${55 - 40 * m} 120 55 200 C${55 + 30 * m} 260 ${55 - 28 * m} 300 ${50 - 10 * m} 340 L${96 - 10 * m} 340 C${100 + 30 * m} 290 ${60 + 40 * m} 250 ${90} 190 C${60 - 10 * m} 120 ${120} 60 75 0 Z`, '#FF8C2A', 5)],
  lava: (w, h) => [w, h, P(`M${w * 0.5} 4 Q${w * 0.2} ${h * 0.4} ${w * 0.1} ${h} L${w * 0.9} ${h} Q${w * 0.8} ${h * 0.4} ${w * 0.5} 4 Z`, '#FF8C2A', 6)],
  blob: (col) => [60, 60, P('M30 4 Q56 8 54 32 Q52 56 28 54 Q4 52 6 28 Q8 4 30 4 Z', col || '#FF6A1F', 5)],
  puff: () => [100, 100, C(50, 50, 42, 'rgba(200,196,190,0.95)', 5)],
  leg: () => [34, 84, L(17, 4, 17, 66, INK, 9) + E(20, 74, 16, 9, INK, 0)],
  sticky: () => [420, 380, P('M10 24 L406 10 L414 360 L28 372 Z', '#FFE066', 7) + P('M300 372 L414 360 L406 300 Z', 'rgba(30,23,18,0.15)', 0)],
  note: (col) => [60, 70, C(20, 56, 15, col || INK, 0) + L(33, 56, 33, 8, col || INK, 8)],
  star: () => [150, 150, P('M75 6 L96 52 L146 58 L108 92 L118 142 L75 116 L32 142 L42 92 L4 58 L54 52 Z', COL.yel, 6)],
};
