/* c02 + c03 chapter-only cardboard drawings (scene author A). ART-style entries: name(o) -> [vbW, vbH, svgBody]. No words (text = Piece text layers from strings). */
import { clamp } from '../../../web/kit/core.js';
export const INK = '#1E1712';
const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
const KR = '#C99A62', PAP = '#FFFDF6', RED = '#E5401D', GRN = '#57A05A', YEL = '#F2B824';

export const D = {
  plane: () => [300, 130, P('M20 60 Q120 20 250 52 Q290 62 290 74 Q290 86 250 90 Q120 112 20 84 Z', PAP) + P('M110 62 L170 6 L200 6 L170 66 Z', '#C9D3DC') + P('M110 88 L170 122 L200 122 L170 84 Z', '#C9D3DC') + P('M20 60 L8 22 L40 22 L60 62 Z', RED) + C(210, 70, 6, INK, 0) + C(240, 72, 6, INK, 0) + C(180, 70, 6, INK, 0)],
  shop: () => [440, 420, R(20, 130, 400, 280, '#E8D5AE', 8) + P('M0 130 L40 40 L400 40 L440 130 Z', RED) + P('M80 40 L60 130 M160 40 L150 130 M240 40 L240 130 M320 40 L330 130 M400 40 L420 130', 'none', 5) + R(40, 150, 220, 160, '#8EC5E8', 6, 5) + R(60, 220, 60, 36, '#F2C230', 4, 4) + R(130, 220, 60, 36, '#F2C230', 4, 4) + R(95, 176, 60, 36, '#F2C230', 4, 4) + R(290, 170, 100, 240, '#8B5A35', 6)],
  sellBtn: () => [360, 200, R(10, 90, 340, 100, '#7A4E2D', 24) + R(40, 20, 280, 120, '#B92E12', 60) + R(40, 8, 280, 112, RED, 56) + R(70, 22, 220, 26, 'rgba(255,255,255,0.22)', 13, 0)],
  gauge: (o = {}) => [440, 270, P('M20 250 A200 200 0 0 1 420 250 Z', PAP) + P('M20 250 A200 200 0 0 1 140 76 L190 250 Z', o.l || GRN, 5) + P('M140 76 A200 200 0 0 1 300 76 L250 250 L190 250 Z', YEL, 5) + P('M300 76 A200 200 0 0 1 420 250 L250 250 Z', o.r || RED, 5) + P('M20 250 A200 200 0 0 1 420 250', 'none', 8) + (o.faces === false ? '' : C(78, 188, 20, PAP, 4) + P('M66 184 Q70 178 74 184 M82 184 Q86 178 90 184 M64 194 Q78 210 92 194', 'none', 4) + C(362, 188, 20, PAP, 4) + P('M350 184 Q354 178 358 184 M366 184 Q370 178 374 184 M352 206 Q362 192 372 206', 'none', 4)) + C(220, 250, 20, '#7E858C', 6)],
  needle: () => [40, 230, P('M20 6 L36 214 L4 214 Z', INK, 4) + C(20, 214, 14, '#7E858C', 5)],
  thumb: () => [130, 150, P('M30 70 L30 140 L100 140 Q118 140 118 120 L118 80 Q118 66 104 66 L76 66 Q86 34 70 14 Q54 10 50 34 Q46 56 30 70 Z', '#F6C08A') + R(6, 66, 28, 78, KR, 6)],
  thermo: () => [120, 560, R(36, 14, 48, 440, PAP, 24) + C(60, 494, 52, PAP) + L(84, 80, 100, 80, INK, 5) + L(84, 150, 100, 150, INK, 5) + L(84, 220, 100, 220, INK, 5) + L(84, 290, 100, 290, INK, 5) + L(84, 360, 100, 360, INK, 5)],
  mercTube: () => [28, 420, R(2, 2, 24, 416, '#D2361A', 12, 0)],
  mercBulb: () => [84, 84, C(42, 42, 34, '#D2361A', 0)],
  redline: () => [200, 26, `<path d="M6 13 L194 13" stroke="${RED}" stroke-width="10" stroke-dasharray="26 14" stroke-linecap="round"/>`],
  tarp: () => [440, 520, P('M20 500 Q8 300 90 190 Q120 70 220 40 Q320 70 350 190 Q432 300 420 500 Z', '#8FA3B8') + P('M120 120 Q150 300 100 480 M220 60 Q240 280 230 500 M320 130 Q300 300 350 480', 'none', 3) + L(40, 330, 400, 330, '#6B4F2D', 10) + L(60, 420, 380, 420, '#6B4F2D', 10) + P('M150 500 L160 470 L190 470 L200 500 M250 500 L260 470 L290 470 L300 500', '#7E858C', 5)],
  block: (o = {}) => { const w = o.w || 200, h = o.h || 90; return [w, h, R(6, 6, w - 12, h - 12, o.col || KR, 12)]; },
  bolt: () => [100, 160, P('M60 6 L10 90 L46 90 L30 154 L90 66 L52 66 Z', '#FFD23F', 6)],
};

/** an ink stroke that draws itself on (stroke-dashoffset is a pure function of t). d in the layer's own w x h units. */
export function ink(id, x, y, w, h, d, o = {}) {
  return { id, x, y, w, h, op: 1,
    dom: (el, K, k, Lr) => {
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * k}" height="${h * k}" style="position:absolute;left:0;top:0;overflow:visible"><path d="${d}" pathLength="1" fill="none" stroke="${o.col || '#C0391B'}" stroke-width="${o.sw || 12}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1" stroke-dashoffset="1" style="opacity:0"/></svg>`;
      Lr.__p = el.querySelector('path');
    },
    paint: (t, Lr) => { const p = clamp((t - o.at) / (o.dur || 0.6), 0, 1); if (Lr.__p) { Lr.__p.style.opacity = p > 0 ? 1 : 0; Lr.__p.style.strokeDashoffset = 1 - p; } } };
}
