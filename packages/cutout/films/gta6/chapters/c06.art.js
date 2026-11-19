/* c06 / c07 / c08 chapter-only art (SVG bodies, no words, no logos, no real faces). Every entry: name(o) -> [vbW, vbH, body].
   c07.js and c08.js import A6 from here too (one author, three chapters). */
import { INK, COL } from '../art.js';

const sw = (w = 6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
export const R = (x, y, w, h, f, rx = 0, s = 6) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const C = (cx, cy, r, f, s = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const E = (cx, cy, rx, ry, f, s = 6) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const P = (d, f, s = 6) => `<path d="${d}" fill="${f}" ${s ? sw(s) : ''}/>`;
export const L = (x1, y1, x2, y2, c = INK, w = 6) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
export const sym = (ch, x, y, size, f = INK, extra = '') => `<text x="${x}" y="${y}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${f}" ${extra}>${ch}</text>`;
export const star = (cx, cy, r1, r2, n = 5) => { let d = ''; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1); } return d + 'Z'; };

export const A6 = {
  /* ---------- c06 ---------- */
  book: () => { let b = ''; for (let i = 5; i >= 1; i--) b += R(10 + i * 2, 14 + i * 14, 470, 300, i % 2 ? '#F1ECDD' : '#E4DCC6', 6, 4); b += R(10, 14, 470, 300, '#FFFDF6', 6, 6); for (let i = 0; i < 9; i++) b += C(10, 34 + i * 32, 9, '#9AA0A6', 4); return [500, 400, b]; },
  rope: () => [900, 120, `<path d="M0 30 Q450 110 900 30" fill="none" stroke="#8B5A35" stroke-width="12" stroke-linecap="round"/><path d="M0 30 Q450 110 900 30" fill="none" stroke="#C9A06A" stroke-width="5" stroke-dasharray="14 10"/>`],
  hangTag: () => [220, 300, L(110, 0, 110, 72, '#8B5A35', 6) + P('M110 40 L194 92 L194 292 L26 292 L26 92 Z', '#FFFDF6', 6) + C(110, 86, 9, '#C99A62', 5)],
  tagBig: () => [300, 170, P('M60 10 L290 10 L290 160 L60 160 L6 85 Z', '#FFFDF6') + C(46, 85, 10, COL.kraftD, 4) + P('M60 10 L290 10 L290 40 L60 40 Z', COL.verm, 0) + L(60, 40, 290, 40, INK, 4)],
  rays: () => { let d = ''; for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, b = ((i + 0.5) / 14) * Math.PI * 2; d += `M300 300 L${300 + Math.cos(a) * 300} ${300 + Math.sin(a) * 300} L${300 + Math.cos(b) * 300} ${300 + Math.sin(b) * 300} Z `; } return [600, 600, `<path d="${d}" fill="rgba(255,226,120,0.55)"/>`]; },
  wallet: () => [300, 200, R(10, 52, 280, 140, '#7A4E2D', 18) + R(24, 54, 252, 58, '#2A1B12', 8, 0) + L(30, 160, 270, 160, '#B07A48', 4) + C(150, 130, 11, COL.kraftD, 4)],
  walletFlap: () => [300, 100, R(10, 6, 280, 84, '#8B5A35', 16) + C(150, 70, 11, '#C9A23A', 4) + L(30, 24, 270, 24, '#B07A48', 4)],
  moth: () => [140, 100, P('M70 54 Q10 0 6 40 Q4 88 70 66 Z', '#D8C7A8') + P('M70 54 Q130 0 134 40 Q136 88 70 66 Z', '#D8C7A8') + C(30, 44, 8, '#8E7A5A', 0) + C(110, 44, 8, '#8E7A5A', 0) + E(70, 58, 9, 28, '#5A4A3A', 5) + L(66, 32, 50, 8, INK, 4) + L(74, 32, 92, 8, INK, 4)],
  spiky: () => [440, 260, P(star(220, 130, 210, 150, 14), COL.yel, 7)],
  sweat: () => [50, 80, P('M25 4 Q48 40 44 56 Q40 76 25 76 Q10 76 6 56 Q2 40 25 4Z', '#8EC5E8', 5)],
  board: (o = {}) => { const w = o.w || 300, hh = o.h || 190; return [w, hh, R(8, 8, w - 16, hh - 16, o.col || '#F3E2BC', 12) + R(22, 22, w - 44, hh - 44, 'none', 6, 3)]; },
  stickPost: () => [40, 220, R(6, 0, 28, 218, '#E3C08A', 8, 5)],
  badge: (o = {}) => [420, 120, R(8, 8, 404, 104, o.col || COL.verm, 22) + R(22, 20, 376, 80, 'none', 12, 3)],
  filmStrip: () => { let b = R(4, 4, 632, 142, '#1E1712', 8, 0); for (let i = 0; i < 16; i++) b += R(14 + i * 39, 10, 22, 14, '#F8F3E6', 3, 0) + R(14 + i * 39, 126, 22, 14, '#F8F3E6', 3, 0); for (let i = 0; i < 5; i++) b += R(14 + i * 122, 32, 108, 86, '#EFE4CC', 4, 0) + R(30 + i * 122 + i * 14, 70, 44, 20, COL.verm, 8, 3) + C(40 + i * 122 + i * 14, 94, 6, INK, 0) + C(66 + i * 122 + i * 14, 94, 6, INK, 0); return [640, 150, b]; },
  cons: (o = {}) => [260, 150, R(8, 8, 244, 134, o.col || '#EDEEF0', 18) + R(8, 8, 52, 134, '#26211B', 18, 0) + R(8, 8, 244, 134, 'none', 18, 6) + C(216, 118, 8, COL.blue, 0) + R(70, 124, 110, 8, '#C4C7CC', 4, 0)],
  consoleFace: () => [260, 150, C(112, 70, 15, '#FFFDF6', 4) + C(170, 70, 15, '#FFFDF6', 4) + C(107, 77, 6, INK, 0) + C(165, 77, 6, INK, 0) + L(90, 50, 128, 40, INK, 6) + L(192, 50, 154, 40, INK, 6) + `<path d="M108 112 Q122 98 136 112 T164 112" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`],
  ribbon: () => [240, 70, P('M34 10 L2 10 L18 35 L2 60 L34 60 Z', '#B92E12', 5) + P('M206 10 L238 10 L222 35 L238 60 L206 60 Z', '#B92E12', 5) + R(30, 8, 180, 54, COL.verm, 4)],
  cross: () => [220, 170, `<path d="M16 18 Q110 70 204 154" fill="none" stroke="#D2361A" stroke-width="22" stroke-linecap="round"/><path d="M204 14 Q110 80 20 152" fill="none" stroke="#D2361A" stroke-width="22" stroke-linecap="round"/>`],
  butter: () => [400, 150, R(10, 56, 330, 86, '#FFE27A', 12) + P('M10 60 L62 12 L392 12 L340 60 Z', '#FFF0A8') + P('M340 60 L392 12 L392 98 L340 142 Z', '#F2C94A') + L(40, 80, 140, 80, 'rgba(255,255,255,0.7)', 8)],
  pcFace: () => [240, 300, C(84, 68, 12, '#FFFDF6', 4) + C(156, 68, 12, '#FFFDF6', 4) + C(84, 76, 5, INK, 0) + C(156, 76, 5, INK, 0) + L(66, 50, 98, 56, INK, 5) + L(174, 50, 142, 56, INK, 5) + `<path d="M92 114 Q120 92 148 114" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` + P('M176 90 Q190 112 184 122 Q176 130 170 122 Q164 112 176 90Z', '#8EC5E8', 3)],
  tick: () => [140, 140, C(70, 70, 60, '#57A05A', 6) + `<path d="M36 74 L62 100 L106 44" fill="none" stroke="#FFFDF6" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`],
  xmark: () => [140, 140, C(70, 70, 60, '#D2361A', 6) + L(42, 42, 98, 98, '#FFFDF6', 16) + L(98, 42, 42, 98, '#FFFDF6', 16)],
  mumBody: () => [260, 460, P('M40 460 Q30 280 130 250 Q230 280 220 460 Z', '#4A3A5A') + E(130, 170, 62, 74, '#4A3A5A') + P('M70 140 Q70 70 130 66 Q196 70 192 150 Q214 220 190 250 Q130 200 70 250 Q46 210 70 140 Z', '#2E2238', 5)],
  mumArm: () => [80, 190, R(22, 76, 38, 112, '#4A3A5A', 18, 5) + R(32, 4, 18, 76, '#4A3A5A', 8, 5) + E(41, 82, 26, 22, '#4A3A5A', 5)],
  mumArmDown: () => [80, 190, R(22, 4, 38, 130, '#4A3A5A', 18, 5) + E(41, 138, 24, 24, '#4A3A5A', 5)],
  bubble: () => [230, 170, P('M20 10 H210 Q222 10 222 22 V112 Q222 124 210 124 H112 L70 162 L80 124 H20 Q8 124 8 112 V22 Q8 10 20 10Z', '#FFFDF6') + sym('!', 115, 104, 100, '#D2361A')],
  rosette: () => [200, 300, P('M70 160 L38 292 L80 270 L102 296 L112 170Z', COL.blue, 5) + P('M130 160 L162 292 L120 270 L98 296 L88 170Z', COL.verm, 5) + P(star(100, 100, 94, 80, 18), COL.yel, 5) + C(100, 100, 64, COL.verm, 5)],
  newsprint: () => { let b = R(0, 0, 940, 720, '#E6DDC4', 0, 0) + R(30, 26, 880, 78, '#2B2620', 6, 0) + R(60, 40, 820, 8, '#E6DDC4', 0, 0) + R(60, 74, 820, 8, '#E6DDC4', 0, 0); for (let c = 0; c < 4; c++) { const x = 30 + c * 224; b += R(x, 130, 208, 150, c % 2 ? '#BDB5A0' : '#CFC7B2', 4, 3); for (let i = 0; i < 12; i++) b += R(x, 300 + i * 34, i % 4 === 3 ? 120 : 208, 12, '#B8B09B', 6, 0); } b += L(30, 128, 910, 128, INK, 3); return [940, 720, b]; },
  fire: () => [140, 180, P('M70 4 Q122 70 128 112 Q132 172 70 176 Q8 172 12 112 Q20 80 50 56 Q54 90 70 100 Q60 50 70 4Z', COL.verm, 5) + P('M70 54 Q104 98 106 128 Q108 166 70 168 Q32 166 34 128 Q38 106 56 90 Q60 110 70 112 Q64 80 70 54Z', '#FF9E2A', 0) + P('M70 112 Q90 134 90 150 Q88 166 70 166 Q52 166 50 150 Q52 134 70 112Z', '#FFE27A', 0)],
  paperBalls: () => [300, 170, C(80, 110, 56, '#F1ECDD', 5) + C(170, 120, 50, '#E8E1CE', 5) + C(236, 112, 44, '#F6F1E2', 5) + C(130, 70, 40, '#EFE8D4', 5) + L(54, 96, 96, 124, '#B8B09B', 4) + L(150, 100, 190, 130, '#B8B09B', 4) + L(220, 98, 250, 126, '#B8B09B', 4)],
  /* ---------- c07 ---------- */
  topCar: (o = {}) => [60, 110, R(8, 6, 44, 98, o.col || COL.verm, 14) + R(15, 26, 30, 22, '#8EC5E8', 4, 3) + R(15, 68, 30, 16, '#8EC5E8', 4, 3) + R(0, 18, 8, 24, INK, 2, 0) + R(52, 18, 8, 24, INK, 2, 0) + R(0, 70, 8, 24, INK, 2, 0) + R(52, 70, 8, 24, INK, 2, 0)],
  streetGrid: (o = {}) => {
    const rows = o.tall ? 4 : 3, HH = rows * 220 - 20; let b = R(0, 0, 900, HH, '#CDBB8E', 0, 0);
    const cols = [[20, 210], [350, 200], [670, 210]], pal = ['#E5401D', '#3D7DB8', '#57A05A', '#FFD23F', '#F4A3B5', '#8EC5E8', '#6B3FA0', '#E5401D', '#C99A62', '#3D7DB8', '#57A05A', '#F4A3B5'];
    for (let r = 0; r < rows; r++) cols.forEach(([x, w], c) => { const y = r * 220 + 20, hh = r === rows - 1 ? 130 : 130; b += R(x, y, w, hh, '#F1ECDD', 8, 5) + R(x + 20, y + 20, w - 40, hh - 40, pal[r * 3 + c], 6, 4); });
    for (let r = 0; r < rows - 1; r++) { const y = r * 220 + 160; b += R(0, y, 900, 100, '#6C7078', 0, 0) + `<path d="M0 ${y + 50} L900 ${y + 50}" stroke="#F8F3E6" stroke-width="6" stroke-dasharray="26 22"/>`; }
    for (const x of [240, 560]) b += R(x, 0, 100, HH, '#6C7078', 0, 0) + `<path d="M${x + 50} 0 L${x + 50} ${HH}" stroke="#F8F3E6" stroke-width="6" stroke-dasharray="26 22"/>`;
    return [900, HH, b];
  },
  studio: () => [260, 220, R(20, 80, 220, 130, '#E9DFC8', 8) + P('M4 90 L130 14 L256 90 Z', '#B5502E', 6) + R(50, 110, 70, 60, '#8EC5E8', 4, 5) + R(150, 120, 54, 90, '#8B5A35', 4, 5) + C(188, 170, 5, COL.yel, 0)],
  suit: () => [260, 470, P('M20 470 L34 196 Q130 156 226 196 L240 470Z', '#2B3550') + P('M96 176 L130 290 L164 176Z', '#FFFDF6', 5) + P('M122 200 L138 200 L144 300 L130 334 L116 300Z', COL.verm, 4) + E(130, 100, 52, 66, '#F0D3B0', 5) + P('M80 86 Q84 30 130 28 Q176 30 180 86 Q160 56 130 56 Q100 56 80 86Z', '#26211B', 4)],
  suitArm: () => [70, 210, R(14, 6, 42, 150, '#2B3550', 18, 5) + E(35, 168, 24, 28, '#F0D3B0', 5)],
  note: () => [90, 70, R(5, 5, 80, 60, '#FFFDF6', 4, 4) + L(16, 26, 70, 26, '#B8B09B', 4) + sym('!', 45, 62, 40, '#D2361A')],
  mouth: () => [130, 80, E(65, 40, 54, 30, INK, 4) + E(65, 56, 26, 12, '#B5260E', 0)],
  reply: () => [260, 140, P('M24 10 H236 Q250 10 250 24 V96 Q250 110 236 110 H100 L60 134 L70 110 H24 Q10 110 10 96 V24 Q10 10 24 10Z', '#FFFDF6') + L(70, 40, 220, 40, '#B8B09B', 8) + L(70, 70, 180, 70, '#B8B09B', 8) + P('M34 28 Q52 52 50 66 Q48 88 34 88 Q20 88 18 66 Q16 52 34 28Z', COL.verm, 3)],
  spikes: () => [320, 260, P(star(160, 130, 150, 70, 12), '#FFFDF6', 6)],
  magnifier: () => [230, 270, C(100, 100, 80, 'rgba(190,225,245,0.55)', 11) + L(158, 158, 214, 250, '#6B4423', 24) + L(60, 70, 90, 50, 'rgba(255,255,255,0.8)', 8)],
  studyPaper: () => [240, 320, R(6, 6, 228, 308, '#FFFDF6', 6) + R(24, 24, 192, 30, '#3D7DB8', 4, 0) + L(24, 80, 150, 80, '#B8B09B', 8) + L(24, 104, 190, 104, '#B8B09B', 8) + R(30, 150, 36, 70, '#8EC5E8', 2, 3) + R(80, 130, 36, 90, '#57A05A', 2, 3) + R(130, 170, 36, 50, '#F4A3B5', 2, 3) + L(24, 250, 200, 250, '#B8B09B', 8) + L(24, 274, 160, 274, '#B8B09B', 8)],
  boxBack: () => [210, 270, R(4, 4, 202, 262, '#D9B07A', 10) + R(78, 4, 54, 262, 'rgba(240,222,170,0.85)', 0, 0) + L(20, 236, 190, 236, '#A97A45', 5)],
  ageBadge: () => [220, 220, R(8, 8, 204, 204, '#FFFDF6', 34, 10) + R(26, 26, 168, 168, 'none', 22, 4)],
  qLoop: () => [60, 60, P('M6 30 L40 30 L40 12 L58 34 L40 56 L40 38 L6 38Z', COL.verm, 3)],
  arrowR: () => [120, 70, P('M6 24 L70 24 L70 6 L114 36 L70 66 L70 48 L6 48Z', COL.verm, 5)],
  ring: () => [600, 440, `<ellipse cx="300" cy="220" rx="270" ry="190" fill="none" stroke="rgba(30,23,18,0.28)" stroke-width="10" stroke-dasharray="26 18"/>`],
  token: () => [70, 70, C(35, 35, 28, COL.yel, 6) + sym('$', 35, 50, 40, '#8A6410')],
  shelf: () => [900, 300, R(20, 130, 860, 26, '#8B5A35', 6) + R(40, 156, 20, 130, '#6B4423', 4, 5) + R(840, 156, 20, 130, '#6B4423', 4, 5) + L(60, 200, 840, 200, 'rgba(60,40,20,0.25)', 3)],
  soonCard: () => [320, 120, R(6, 6, 308, 108, '#FFFDF6', 10, 6) + L(40, 8, 40, 0, INK, 4)],
  newsBg: () => { let b = R(4, 4, 892, 412, '#2A3F66', 14); for (let i = 0; i < 6; i++) b += P(`M${40 + i * 150} 410 L${130 + i * 150} 10 L${170 + i * 150} 10 L${80 + i * 150} 410 Z`, 'rgba(255,255,255,0.06)', 0); b += C(760, 120, 70, 'rgba(142,197,232,0.35)', 4) + C(760, 120, 40, 'none', 3) + L(690, 120, 830, 120, 'rgba(255,255,255,0.35)', 3); return [900, 420, b]; },
  deskNews: () => [860, 160, R(10, 30, 840, 120, '#1F3550', 14) + R(10, 30, 840, 26, '#3D7DB8', 10, 0) + R(40, 82, 780, 60, '#26211B', 8) + R(40, 82, 70, 60, COL.verm, 8)],
  pin: () => [70, 110, L(35, 50, 35, 106, INK, 8) + C(35, 36, 30, COL.verm, 6) + C(26, 28, 8, 'rgba(255,255,255,0.7)', 0)],
  person: () => [80, 130, R(14, 8, 52, 72, '#3D7DB8', 12) + R(20, 80, 16, 40, '#26211B', 6, 5) + R(44, 80, 16, 40, '#26211B', 6, 5) + R(14, 112, 28, 12, INK, 5, 0) + R(40, 112, 28, 12, INK, 5, 0)],
  bgBoard: () => [100, 100, R(4, 4, 92, 92, '#FFFDF6', 12, 5)],
  /* ---------- c08 ---------- */
  commentBox: () => [760, 300, R(6, 6, 748, 288, '#FFFDF6', 22) + C(70, 66, 40, COL.yel, 5) + L(128, 52, 300, 52, '#B8B09B', 12) + L(128, 84, 230, 84, '#D8D2C0', 10) + R(34, 130, 692, 110, '#F1ECDD', 10, 4) + R(590, 242, 132, 42, COL.blue, 12, 4)],
  pointHand: () => [320, 380, R(60, 200, 200, 170, '#FFFDF6', 70) + E(160, 150, 74, 92, '#FFFDF6', 7) + P('M104 100 Q160 40 216 100 Q214 80 160 70 Q106 80 104 100Z', '#F4A3B5', 0) + E(160, 96, 38, 26, '#F8DCE4', 4) + L(86, 262, 86, 330, INK, 5) + L(130, 270, 130, 336, INK, 5) + L(176, 270, 176, 336, INK, 5)],
  sticky: () => [260, 260, P('M12 12 L248 12 L248 190 L190 248 L12 248 Z', COL.yel, 6) + P('M190 248 L190 190 L248 190 Z', '#E6B800', 4) + `<path d="M62 130 L108 176 L196 70" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`],
  scale: () => [400, 340, R(120, 300, 160, 30, '#8B5A35', 8) + R(186, 70, 28, 236, '#B8875A', 6) + C(200, 64, 16, '#C9A23A', 5)],
  beam: () => [360, 80, R(8, 28, 344, 24, INK, 10, 0) + R(10, 30, 340, 20, '#B8875A', 8, 4) + C(180, 40, 14, '#C9A23A', 4)],
  pan: () => [150, 170, L(75, 0, 15, 118, INK, 4) + L(75, 0, 135, 118, INK, 4) + P('M6 116 Q75 166 144 116 Z', '#C9A23A', 6)],
  filmReel: () => [160, 160, C(80, 80, 74, '#9AA0A6', 6) + C(80, 80, 56, '#B9BEC4', 4) + C(80, 80, 14, '#55595F', 4) + [0, 1, 2, 3, 4].map((i) => { const a = i * 1.2566; return C(80 + Math.cos(a) * 36, 80 + Math.sin(a) * 36, 11, '#7E858C', 3); }).join('')],
  cursor: () => [14, 70, R(0, 0, 14, 70, COL.verm, 3, 0)],
  lineBar: () => [600, 22, R(0, 0, 600, 22, '#7C7A86', 11, 0)],
};

export function heads(layers, n, x0, y0, cols, o = {}) {
  const w = o.w || 120, hh = o.h || 146, gap = o.gap || 112;
  for (let r = 0; r < (o.rows || 2); r++) for (let c = 0; c < n; c++) {
    const i = (o.seed || 0) + r * n + c;
    layers.push({ id: (o.id || 'h') + i, art: 'head', ao: { expr: o.expr || 'wow', col: cols[(i * 5 + (o.seed || 0)) % cols.length], look: o.look || 0 }, x: x0 + c * gap + (r % 2) * 40, y: y0 - r * (o.rowGap || 86), w, h: hh, paper: true, edge: 3, hidden: !!o.hidden, idle: { y: 4, rot: 3, f: 0.9 + (i % 4) * 0.13, ph: i * 1.7 } });
  }
}

/** layers of a 500 x 340 balance scale (drawing 400 wide + 50 each side for the pans). theta(t) = beam angle in degrees (+ = right pan down); items = [{side:-1|1, ...layer}] sit on the pans and follow them.
 *  Pan/post geometry: pivot (200,70), arm 170; pans hang from the beam ends. */
export function scaleLayers(theta, items = [], oy = 0) {
  const Lm = 170, off = (sg, t) => { const th = (theta(t) * Math.PI) / 180; return [sg * Lm * (Math.cos(th) - 1), sg * Lm * Math.sin(th)]; };
  const follow = (sg) => (t, Lr, Pc) => { const [dx, dy] = off(sg, t); Lr.el.style.transform = `translate(${(dx * Pc.k).toFixed(1)}px,${(dy * Pc.k).toFixed(1)}px)`; };
  const ox = 50; // the pans overhang the 400-wide drawing: the piece box is 500 wide, x of every layer is shifted by ox
  return [
    { id: 'post', svg: A6.scale(), x: ox, y: oy, w: 400, h: 340, edge: 6 },
    { id: 'beam', svg: A6.beam(), x: ox + 20, y: oy + 30, w: 360, h: 80, edge: 4, paint: (t, Lr) => { Lr.el.style.transform = `rotate(${theta(t).toFixed(2)}deg)`; } },
    { id: 'panL', svg: A6.pan(), x: ox + 28 - 75, y: oy + 70, w: 150, h: 170, edge: 4, paint: follow(-1) },
    { id: 'panR', svg: A6.pan(), x: ox + 372 - 75, y: oy + 70, w: 150, h: 170, edge: 4, paint: follow(1) },
    ...items.map((it) => ({ ...it, x: it.x + ox, y: it.y + oy, paint: it.paint || follow(it.side) })),
  ];
}
