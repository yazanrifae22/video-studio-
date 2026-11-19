/* Karto kit - character pose plates (SVG, drawn in code so every pose shares the same hand-cut head and body).
   karto(pose, open) / skip(pose, open) -> {svg, w, h, ax, ay}  (ax, ay = stick foot = the anchor on the floor). */
import { rand, hashStr } from './core.js';
import { roughEllipse, roughRect, ptsD, STOCK } from './tex.js';

const INK = '#1E1712', OUT = 'stroke="#4A3018" stroke-width="3" stroke-opacity="0.55" stroke-linejoin="round"';
const shift = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy]);
const poly = (pts, fill, extra = '') => `<path d="${ptsD(pts)}" fill="${fill}" ${extra}/>`;
const jitterPoly = (pts, seed, amp = 2) => { const r = rand(seed); return pts.map((p) => [p[0] + r.range(-amp, amp), p[1] + r.range(-amp, amp)]); };

/* sticker eye: white disc with a thickness shadow, marker pupil. o: {r, ry, look:[dx,dy], pr (pupil r), lid 0..1, closed: 'happy'|'squint'} */
function eye(cx, cy, o) {
  const r = o.r, ry = o.ry || r, seed = Math.round(cx * 7 + cy);
  let s = poly(roughEllipse(cx + 3, cy + 5, r, ry, seed, 0.03), '#B9AC92');
  s += poly(roughEllipse(cx, cy, r, ry, seed, 0.03), '#FFFDF6', 'stroke="#3A2A18" stroke-width="2.5" stroke-opacity="0.35"');
  if (o.closed === 'happy') return s + `<path d="M${cx - r * 0.6} ${cy + r * 0.15} Q${cx} ${cy - r * 0.75} ${cx + r * 0.6} ${cy + r * 0.15}" fill="none" stroke="${INK}" stroke-width="${Math.max(8, r * 0.2)}" stroke-linecap="round"/>`;
  if (o.closed === 'squint') return s + `<path d="M${cx - r * 0.6} ${cy - r * 0.2} L${cx + r * 0.5} ${cy + r * 0.05} L${cx - r * 0.5} ${cy + r * 0.35}" fill="none" stroke="${INK}" stroke-width="${Math.max(8, r * 0.2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const [lx, ly] = o.look || [0, 0], pr = o.pr || r * 0.4;
  const px = cx + lx * (r - pr) * 0.95, py = cy + ly * (ry - pr) * 0.95;
  s += `<circle cx="${px}" cy="${py}" r="${pr}" fill="${INK}"/><circle cx="${px - pr * 0.35}" cy="${py - pr * 0.4}" r="${pr * 0.28}" fill="#FFFDF6"/>`;
  if (o.lid) { // half-closed lid in the face colour + lid line
    const ly0 = cy - ry + ry * 2 * o.lid;
    s += `<path d="M${cx - r - 4} ${cy - ry - 8} L${cx + r + 4} ${cy - ry - 8} L${cx + r + 4} ${ly0} L${cx - r - 4} ${ly0} Z" fill="${o.face}"/>`;
    s += `<path d="M${cx - r * 0.98} ${ly0 + 2} L${cx + r * 0.98} ${ly0 - 1}" stroke="${INK}" stroke-width="${Math.max(7, r * 0.16)}" stroke-linecap="round"/>`;
  }
  return s;
}
const brow = (x1, y1, x2, y2, bend, w) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - bend} ${x2} ${y2}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;

/* mouths centred at (mx, my), scale k */
function mouth(kind, open, mx, my, k) {
  const S = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${(mx + x * k).toFixed(1)},${(my + y * k).toFixed(1)}`);
  const dark = '#2A160C', tongue = '#E2574C', sw = (w) => (w * k).toFixed(1);
  const filled = (d, tg) => `<path d="${S(d)}" fill="${dark}" stroke="${INK}" stroke-width="${sw(6)}" stroke-linejoin="round"/>` + (tg ? `<ellipse cx="${mx + tg[0] * k}" cy="${my + tg[1] * k}" rx="${tg[2] * k}" ry="${tg[3] * k}" fill="${tongue}"/>` : '');
  const line = (d, w = 12) => `<path d="${S(d)}" fill="none" stroke="${INK}" stroke-width="${sw(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  switch (kind) {
    case 'smile': return open ? filled('M-66,-12 Q0,0 66,-12 Q52,44 0,46 Q-52,44 -66,-12 Z', [0, 30, 26, 12]) : line('M-68,-8 Q0,34 68,-8');
    case 'grin': return open ? filled('M-74,-16 Q0,-4 74,-16 Q64,58 0,62 Q-64,58 -74,-16 Z', [0, 42, 32, 14]) : filled('M-72,-14 Q0,-2 72,-14 Q60,36 0,40 Q-60,36 -72,-14 Z', [0, 24, 26, 9]);
    case 'O': return open ? filled('M0,-40 C30,-40 38,-10 38,8 C38,34 22,48 0,48 C-22,48 -38,34 -38,8 C-38,-10 -30,-40 0,-40 Z', [0, 30, 18, 10]) : filled('M0,-30 C24,-30 30,-8 30,6 C30,26 16,36 0,36 C-16,36 -30,26 -30,6 C-30,-8 -24,-30 0,-30 Z');
    case 'wavy': return open ? filled('M-34,-6 Q0,-14 34,-6 Q30,22 0,24 Q-30,22 -34,-6 Z', [0, 14, 14, 6]) : line('M-56,4 Q-38,-12 -19,4 T19,4 T56,4', 10);
    case 'flat': return open ? filled('M-54,-8 L54,-8 L50,16 L-50,16 Z') : line('M-58,2 L58,0');
    case 'laugh': return filled(open ? 'M-80,-24 L80,-24 Q76,70 0,74 Q-76,70 -80,-24 Z' : 'M-80,-20 L80,-20 Q74,52 0,56 Q-74,52 -80,-20 Z', [0, open ? 50 : 36, 36, 14]) + `<path d="${S('M-70,-18 L70,-18 L66,-4 L-66,-4 Z')}" fill="#FFFDF6"/>`;
    case 'side': return open ? filled('M40,-16 C58,-16 62,0 62,8 C62,22 52,28 40,28 C28,28 18,22 18,8 C18,0 22,-16 40,-16 Z') : filled('M40,-10 C52,-10 56,0 56,6 C56,16 48,20 40,20 C32,20 24,16 24,6 C24,0 28,-10 40,-10 Z');
    case 'grimace': return open ? filled('M-60,-14 L60,-14 L56,26 L-56,26 Z') + line('M-50,6 L50,6', 5) : line('M-60,4 L-36,-6 L-12,6 L12,-6 L36,6 L60,-4', 10);
    case 'smirk': return open ? filled('M-40,0 Q10,6 58,-20 Q50,24 8,28 Q-30,26 -40,0 Z') : line('M-46,6 Q8,18 58,-14');
    default: return line('M-68,-8 Q0,34 68,-8');
  }
}

/* paper arm: shoulder -> elbow -> hand (cut strip with an outline) + hand + brass fastener */
function arm(a, col, handCol, k = 1) {
  const [sx, sy] = a.sh, [ex, ey] = a.el, [hx, hy] = a.hd, w = 34 * k;
  let s = `<path d="M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}" fill="none" stroke="#4A3018" stroke-opacity="0.75" stroke-width="${w + 6}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M${sx} ${sy} L${ex} ${ey} L${hx} ${hy}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += hand(a, handCol, k);
  s += `<circle cx="${sx}" cy="${sy}" r="${9 * k}" fill="${STOCK.brass}" stroke="#6B5214" stroke-width="2"/><circle cx="${sx - 3 * k}" cy="${sy - 3 * k}" r="${3 * k}" fill="#F3E2A0"/>`;
  return s;
}
function hand(a, col, k) {
  const [hx, hy] = a.hd, r = (a.r || 27) * k, o = `stroke="#4A3018" stroke-opacity="0.8" stroke-width="${4 * k}"`;
  if (a.hand === 'point') {
    const ang = (a.dir || 0) * Math.PI / 180, fx = hx + Math.cos(ang) * r * 1.9, fy = hy + Math.sin(ang) * r * 1.9;
    return `<path d="M${hx} ${hy} L${fx} ${fy}" stroke="#4A3018" stroke-opacity="0.8" stroke-width="${r * 0.82 + 4 * k}" stroke-linecap="round"/><path d="M${hx} ${hy} L${fx} ${fy}" stroke="${col}" stroke-width="${r * 0.82}" stroke-linecap="round"/>` +
      `<circle cx="${hx}" cy="${hy}" r="${r}" fill="${col}" ${o}/>`;
  }
  if (a.hand === 'thumb') { // thumb up/forward (over a phone)
    const ang = (a.dir || -90) * Math.PI / 180, fx = hx + Math.cos(ang) * r * 1.4, fy = hy + Math.sin(ang) * r * 1.4;
    return `<circle cx="${hx}" cy="${hy}" r="${r}" fill="${col}" ${o}/><path d="M${hx} ${hy} L${fx} ${fy}" stroke="#4A3018" stroke-opacity="0.8" stroke-width="${r * 0.75 + 4 * k}" stroke-linecap="round"/><path d="M${hx} ${hy} L${fx} ${fy}" stroke="${col}" stroke-width="${r * 0.75}" stroke-linecap="round"/>`;
  }
  if (a.hand === 'open') { // mitten with three finger bumps
    const ang = (a.dir == null ? -90 : a.dir) * Math.PI / 180; let s = '';
    for (const d of [-0.55, 0, 0.55]) { const fx = hx + Math.cos(ang + d) * r * 1.05, fy = hy + Math.sin(ang + d) * r * 1.05; s += `<circle cx="${fx}" cy="${fy}" r="${r * 0.5}" fill="${col}" ${o}/>`; }
    return s + `<circle cx="${hx}" cy="${hy}" r="${r}" fill="${col}" ${o}/>`;
  }
  return `<circle cx="${hx}" cy="${hy}" r="${r}" fill="${col}" ${o}/>`; // fist
}
const svgWrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const stick = (x, y0, y1, w = 30) => `<path d="M${x - w / 2} ${y0} L${x + w / 2} ${y0} L${x + w / 2} ${y1 - w / 2} Q${x} ${y1 + 4} ${x - w / 2} ${y1 - w / 2} Z" fill="${STOCK.wood}" stroke="#8C6A3C" stroke-width="2"/><path d="M${x - 4} ${y0 + 20} L${x - 4} ${y1 - 30}" stroke="#C49A5E" stroke-width="2" opacity="0.6"/>`;

/* ======================= KARTO ======================= */
export const KARTO_POSES = {
  neutral:  { look: [0, 0.1], brows: 'normal', mouth: 'smile', arms: ['down', 'down'], desc: 'calm, friendly, arms at the sides' },
  talk:     { look: [0, 0.1], brows: 'normal', mouth: 'smile', open: true, arms: ['down', 'down'], desc: 'neutral with the mouth open' },
  point:    { look: [0.75, 0], brows: 'up', mouth: 'grin', arms: ['down', 'pointR'], desc: 'points to screen right (mirror for left)' },
  shocked:  { look: [0, 0], pr: 13, brows: 'high', mouth: 'O', arms: ['upL', 'upR'], desc: 'arms up, tiny pupils, round mouth' },
  thinking: { look: [0.6, -0.7], brows: 'quizzical', mouth: 'wavy', arms: ['down', 'chin'], desc: 'hand on chin, looking up' },
  laughing: { closed: 'happy', brows: 'high', mouth: 'laugh', arms: ['outL', 'outR'], desc: 'eyes shut tight, huge open mouth' },
  deadpan:  { look: [0, 0.5], lid: 0.48, brows: 'flat', mouth: 'flat', arms: ['crossL', 'crossR'], desc: 'half lids, flat mouth, arms crossed' },
  whisper:  { look: [0.85, 0.1], brows: 'sly', mouth: 'side', arms: ['mouthL', 'down'], desc: 'hand beside the mouth, eyes sideways' },
  facepalm: { look: [-0.2, 0.6], brows: 'sad', mouth: 'grimace', arms: ['down', 'palm'], desc: 'hand slapped over one eye' },
  present:  { look: [0, 0.2], brows: 'up', mouth: 'grin', arms: ['wideL', 'wideR'], desc: 'both arms open: "look at this"' },
  cheer:    { closed: 'happy', brows: 'high', mouth: 'grin', open: true, arms: ['upL', 'fistR'], desc: 'one fist up, celebrating' },
};
const KA = { // arm presets (Karto art coords; the plate is 760 wide with the art shifted +60, so x -60..700 is usable)
  down:  (s) => ({ sh: [s * 88 + 320, 478], el: [s * 150 + 320, 545], hd: [s * 172 + 320, 612], hand: 'fist' }),
  pointR: () => ({ sh: [408, 478], el: [520, 474], hd: [606, 446], hand: 'point', dir: -8 }),
  upL:   () => ({ sh: [232, 478], el: [110, 452], hd: [44, 350], hand: 'open', dir: -110 }),
  upR:   () => ({ sh: [408, 478], el: [530, 452], hd: [612, 350], hand: 'open', dir: -70 }),
  fistR: () => ({ sh: [408, 478], el: [560, 444], hd: [630, 322], hand: 'fist', r: 32 }),
  chin:  () => ({ sh: [408, 478], el: [500, 548], hd: [372, 474], hand: 'fist' }),
  outL:  () => ({ sh: [232, 478], el: [140, 522], hd: [46, 474], hand: 'open', dir: -150 }),
  outR:  () => ({ sh: [408, 478], el: [500, 522], hd: [594, 474], hand: 'open', dir: -30 }),
  wideL: () => ({ sh: [232, 478], el: [130, 486], hd: [32, 424], hand: 'open', dir: -160 }),
  wideR: () => ({ sh: [408, 478], el: [510, 486], hd: [608, 424], hand: 'open', dir: -20 }),
  crossL: () => ({ sh: [232, 478], el: [250, 560], hd: [372, 540], hand: 'fist' }),
  crossR: () => ({ sh: [408, 478], el: [390, 566], hd: [268, 548], hand: 'fist' }),
  mouthL: () => ({ sh: [232, 478], el: [150, 474], hd: [206, 402], hand: 'open', dir: -60, r: 30 }),
  palm:  () => ({ sh: [408, 478], el: [530, 432], hd: [410, 292], hand: 'open', dir: -95, r: 46 }),
};export function karto(pose = 'neutral', open = false) {
  const P = KARTO_POSES[pose] || KARTO_POSES.neutral, W = 760, H = 700, face = STOCK.kraft;
  const op = open || !!P.open;
  let s = '';
  s += stick(320, 520, 700);
  // body + scarf
  s += poly(jitterPoly([[228, 450], [412, 450], [432, 612], [208, 612]], 41, 2.5), STOCK.kraftDark, OUT);
  s += `<path d="M300 470 L300 600 M340 470 L340 600" stroke="#7F5A30" stroke-width="2" opacity="0.5"/>`;
  const armL = KA[P.arms[0]] ? KA[P.arms[0]](-1) : KA.down(-1), armR = KA[P.arms[1]] ? KA[P.arms[1]](1) : KA.down(1);
  const back = (a) => ['crossL', 'crossR', 'chin', 'mouthL', 'palm'].includes(a);
  const kc = STOCK.kraftLight, hc = '#E2BE86';
  // head: back flap, top, side, front
  s += poly(jitterPoly([[190, 160], [470, 160], [452, 112], [208, 120]], 43, 2), '#9F7340', OUT);
  s += poly(jitterPoly([[96, 178], [134, 150], [584, 150], [548, 178]], 44, 1.5), STOCK.kraftLight, OUT);
  s += poly(jitterPoly([[548, 178], [584, 150], [584, 426], [548, 456]], 45, 1.5), '#A57742', OUT);
  s += `<g opacity="0.45" stroke="#3A2614" stroke-width="3" fill="none"><path d="M558 230 L558 262 M552 240 L558 228 L564 240"/><path d="M572 230 L572 262 M566 240 L572 228 L578 240"/></g>`;
  // left flap (long, tilted out) and right flap (short): asymmetric
  s += poly(jitterPoly([[98, 176], [300, 176], [262, 64], [52, 96]], 46, 2), STOCK.kraftLight, OUT);
  s += `<path d="M110 168 L278 168" stroke="#7F5A30" stroke-width="3" opacity="0.45"/>`;
  s += poly(jitterPoly([[352, 152], [582, 152], [636, 112], [400, 116]], 47, 2), '#D2A56C', OUT);
  s += poly(jitterPoly([[96, 178], [548, 178], [548, 456], [96, 456]], 48, 2.5), face, OUT);
  // tape repair across the top-right corner
  s += `<g transform="rotate(38 532 196)"><path d="M462 180 l8 6 -8 6 8 6 -8 6 8 6 L602 210 l-8 -6 8 -6 -8 -6 8 -6 -8 -6 Z" fill="${STOCK.tape}" stroke="#B9A877" stroke-width="1.5"/>
    <path d="M478 190 L590 190 M478 200 L590 200" stroke="#C9B98C" stroke-width="1" opacity="0.6"/></g>`;
  // eyes, brows, mouth
  const look = P.look || [0, 0];
  s += eye(222, 300, { r: 64, look, pr: P.pr || 25, lid: P.lid, face, closed: P.closed });
  s += eye(410, 294, { r: 58, look, pr: (P.pr || 25) * 0.95, lid: P.lid, face, closed: P.closed });
  const B = {
    normal: [[168, 214, 268, 208, 14], [366, 206, 458, 212, 14]], up: [[166, 200, 268, 190, 22], [364, 188, 458, 196, 22]],
    high: [[164, 184, 266, 168, 26], [362, 166, 460, 178, 26]], quizzical: [[170, 222, 268, 222, 2], [364, 182, 460, 172, 24]],
    flat: [[168, 236, 272, 236, 0], [360, 232, 460, 232, 0]], sly: [[168, 228, 270, 212, 6], [364, 200, 460, 216, 10]],
    sad: [[166, 222, 268, 204, -8], [364, 204, 460, 222, -8]],
  }[P.brows || 'normal'];
  for (const b of B) s += brow(b[0], b[1], b[2], b[3], b[4], 17);
  // scarf on top of the neck line, tail on the right
  s += poly(jitterPoly([[204, 436], [436, 436], [444, 478], [196, 478]], 49, 3), STOCK.vermilion, OUT);
  s += `<path d="M232 446 L262 470 M300 444 L322 472 M368 446 L392 470" stroke="#A82A10" stroke-width="3" opacity="0.6"/>`;
  s += poly(jitterPoly([[380, 466], [420, 470], [446, 584], [434, 590], [426, 578], [418, 592], [406, 582], [398, 594], [392, 584]], 50, 2), '#D93A18', OUT);
  s += mouth(P.mouth, op, 318, 396, 1);
  s += arm(armL, kc, hc) + arm(armR, kc, hc); // arms in front of the head and scarf
  return { svg: svgWrap(W, H, `<g transform="translate(60 0)">${s}</g>`), w: W, h: H, ax: 380, ay: 700, head: [380, 300], mouth: [378, 396] };
}

/* ======================= SKIP ======================= */
export const SKIP_POSES = {
  neutral:   { look: [0, 0.1], brows: 'normal', mouth: 'smile', arms: ['down', 'phone'], desc: 'phone in hand, half paying attention' },
  talk:      { look: [0, 0.1], brows: 'normal', mouth: 'smile', open: true, arms: ['down', 'phone'], desc: 'neutral with the mouth open' },
  point:     { look: [0.8, 0], brows: 'up', mouth: 'grin', arms: ['phoneL', 'pointR'], desc: 'points to screen right (mirror for left)' },
  shocked:   { look: [0, 0], pr: 8, brows: 'high', mouth: 'O', arms: ['upL', 'upPhoneR'], desc: 'jumps, phone flung up' },
  thinking:  { look: [-0.6, -0.75], brows: 'quizzical', mouth: 'wavy', arms: ['chinL', 'phone'], desc: 'finger on chin, looking up' },
  laughing:  { closed: 'happy', brows: 'high', mouth: 'laugh', arms: ['outL', 'outPhoneR'], desc: 'cracking up' },
  deadpan:   { look: [0.9, 0.2], lid: 0.5, brows: 'flat', mouth: 'flat', arms: ['down', 'phone'], desc: 'annoyed side-eye' },
  whisper:   { look: [-0.85, 0.1], brows: 'sly', mouth: 'side', arms: ['mouthL', 'phone'], desc: 'hand beside the mouth' },
  skip:      { look: [0.3, 0.8], lid: 0.3, brows: 'sly', mouth: 'smirk', arms: ['holdL', 'thumbR'], phone: 'front', desc: 'phone up, thumb over the skip button' },
  mindblown: { look: [0, 0], pr: 9, brows: 'high', mouth: 'O', open: true, arms: ['headL', 'headR'], burst: true, desc: 'hands on head, burst lines' },
  typing:    { look: [0.2, 0.9], brows: 'up', mouth: 'smirk', arms: ['holdL', 'holdR'], phone: 'type', bubble: true, desc: 'typing a comment' },
};
const SA = { // Skip plate coords 360 x 470
  down:   (s) => ({ sh: [180 + s * 62, 282], el: [180 + s * 80, 320], hd: [180 + s * 86, 362], hand: 'fist', r: 17 }),
  phone:  () => ({ sh: [242, 282], el: [272, 318], hd: [268, 352], hand: 'fist', r: 17 }),
  phoneL: () => ({ sh: [118, 282], el: [90, 318], hd: [94, 352], hand: 'fist', r: 17 }),
  pointR: () => ({ sh: [242, 282], el: [292, 266], hd: [318, 244], hand: 'point', dir: -18, r: 17 }),
  upL:    () => ({ sh: [118, 282], el: [60, 240], hd: [36, 178], hand: 'open', dir: -105, r: 17 }),
  upPhoneR: () => ({ sh: [242, 282], el: [300, 240], hd: [322, 176], hand: 'fist', r: 17 }),
  chinL:  () => ({ sh: [118, 282], el: [96, 300], hd: [150, 248], hand: 'point', dir: -60, r: 15 }),
  outL:   () => ({ sh: [118, 282], el: [70, 296], hd: [40, 268], hand: 'open', dir: -140, r: 17 }),
  outPhoneR: () => ({ sh: [242, 282], el: [290, 296], hd: [318, 270], hand: 'fist', r: 17 }),
  mouthL: () => ({ sh: [118, 282], el: [82, 270], hd: [132, 226], hand: 'open', dir: -60, r: 18 }),
  holdL:  () => ({ sh: [118, 282], el: [110, 330], hd: [158, 322], hand: 'fist', r: 16 }),
  holdR:  () => ({ sh: [242, 282], el: [250, 330], hd: [204, 324], hand: 'fist', r: 16 }),
  thumbR: () => ({ sh: [242, 282], el: [262, 322], hd: [222, 300], hand: 'thumb', dir: -150, r: 16 }),
  headL:  () => ({ sh: [118, 282], el: [48, 230], hd: [70, 150], hand: 'open', dir: -60, r: 18 }),
  headR:  () => ({ sh: [242, 282], el: [312, 230], hd: [290, 150], hand: 'open', dir: -120, r: 18 }),
};
function phoneSvg(x, y, w, h, rot = 0, screen = 'skip') {
  let s = `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w * 0.18}" fill="#2B2B33" stroke="#111" stroke-width="2.5"/>`;
  s += `<rect x="${x - w / 2 + 4}" y="${y - h / 2 + 7}" width="${w - 8}" height="${h - 14}" rx="${w * 0.1}" fill="#58C6F0"/>`;
  if (screen === 'skip') { // double arrow + bar
    const k = w / 44;
    s += `<path d="M${x - 13 * k} ${y - 9 * k} L${x - 1 * k} ${y} L${x - 13 * k} ${y + 9 * k} Z M${x - 1 * k} ${y - 9 * k} L${x + 11 * k} ${y} L${x - 1 * k} ${y + 9 * k} Z" fill="#FFFDF6"/><rect x="${x + 11 * k}" y="${y - 9 * k}" width="${3.5 * k}" height="${18 * k}" fill="#FFFDF6"/>`;
  } else { // typing: comment lines
    for (let i = 0; i < 3; i++) s += `<rect x="${x - w / 2 + 9}" y="${y - h / 2 + 16 + i * 12}" width="${(w - 18) * (i === 2 ? 0.55 : 1)}" height="6" rx="3" fill="#FFFDF6" opacity="0.9"/>`;
  }
  return s + '</g>';
}
export function skip(pose = 'neutral', open = false) {
  const P = SKIP_POSES[pose] || SKIP_POSES.neutral, W = 360, H = 470, yel = STOCK.yellow, yel2 = '#F6C22C', faceCol = STOCK.yellow;
  const op = open || !!P.open;
  let s = stick(180, 330, 470, 22);
  if (P.burst) { // mind-blown burst
    const r = rand(77); let b = '';
    for (let i = 0; i < 11; i++) { const a = -Math.PI * (0.06 + 0.88 * i / 10), r0 = 150, r1 = 172 + r() * 8; b += `<path d="M${180 + Math.cos(a) * r0} ${168 + Math.sin(a) * r0} L${180 + Math.cos(a) * r1} ${168 + Math.sin(a) * r1}" stroke="${i % 2 ? STOCK.vermilion : INK}" stroke-width="9" stroke-linecap="round"/>`; }
    s += b;
  }
  // hoodie body: a sticky note with a curled corner
  s += poly(jitterPoly([[104, 258], [256, 258], [262, 380], [124, 386], [98, 362]], 61, 2), yel2, OUT);
  s += `<path d="M98 362 L124 386 L118 358 Z" fill="#FFF3B8" stroke="#C99A16" stroke-width="2"/>`;
  s += `<path d="M138 330 Q180 352 222 330 L226 366 L134 366 Z" fill="none" stroke="${INK}" stroke-width="5" stroke-linejoin="round" opacity="0.8"/>`;
  const aL = (SA[P.arms[0]] || SA.down)(-1), aR = (SA[P.arms[1]] || SA.down)(1);
  const front = (k) => ['holdL', 'holdR', 'thumbR', 'chinL', 'mouthL'].includes(k);
  // head = a real sticky note: tilted square, darker glue strip on top, peeled bottom-right corner; face drawn on it
  let hd = poly(jitterPoly([[70, 50], [290, 50], [290, 218], [238, 270], [70, 270]], 62, 1.6), yel, OUT);
  hd += `<path d="M71 51 L289 51 L289 82 L71 82 Z" fill="#E9B71E" opacity="0.55"/><path d="M72 83 L288 83" stroke="#D9A31A" stroke-width="2" opacity="0.6"/>`;
  hd += `<path d="M290 218 L238 270 L246 230 Z" fill="#C99A16" opacity="0.45" transform="translate(5 5)"/><path d="M290 218 L238 270 L248 228 Z" fill="#FFF4C4" stroke="#C99A16" stroke-width="2.5" stroke-linejoin="round"/>`;
  s += `<g transform="rotate(-4 180 160)">${hd}`;  const look = P.look || [0, 0];
  s += eye(145, 162, { r: 31, ry: 36, look, pr: P.pr || 13, lid: P.lid, face: faceCol, closed: P.closed });
  s += eye(216, 162, { r: 31, ry: 36, look, pr: P.pr || 13, lid: P.lid, face: faceCol, closed: P.closed });
  const B = {
    normal: [[118, 116, 168, 112, 6], [194, 112, 244, 116, 6]], up: [[116, 106, 168, 100, 10], [194, 100, 246, 106, 10]],
    high: [[114, 96, 166, 86, 12], [196, 86, 248, 96, 12]], quizzical: [[118, 120, 168, 120, 0], [194, 96, 246, 90, 10]],
    flat: [[118, 128, 170, 128, 0], [192, 128, 244, 128, 0]], sly: [[118, 124, 168, 112, 4], [194, 106, 244, 120, 4]],
  }[P.brows || 'normal'];
  for (const b of B) s += brow(b[0], b[1], b[2], b[3], b[4], 9);
  s += mouth(P.mouth, op, 180, 226, 0.5);
  s += '</g>';
  // phone
  if (P.phone === 'front') s += phoneSvg(198, 300, 58, 100, -6, 'skip');
  else if (P.phone === 'type') s += phoneSvg(181, 312, 54, 92, 0, 'type');
  else if (P.arms[0] === 'phoneL') s += phoneSvg(aL.hd[0] - 6, aL.hd[1] - 30, 40, 70, -8);
  else s += phoneSvg(aR.hd[0] + 4, aR.hd[1] - 30, 40, 70, 10);
  s += arm(aL, yel, '#FFE68A', 0.62) + arm(aR, yel, '#FFE68A', 0.62);
  if (P.bubble) s += `<path d="M262 70 h80 a12 12 0 0 1 12 12 v34 a12 12 0 0 1 -12 12 h-50 l-18 16 l2 -16 h-14 a12 12 0 0 1 -12 -12 v-34 a12 12 0 0 1 12 -12 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="4"/><circle cx="282" cy="99" r="6" fill="${INK}"/><circle cx="302" cy="99" r="6" fill="${INK}"/><circle cx="322" cy="99" r="6" fill="${INK}"/>`;
  return { svg: svgWrap(W, H, s), w: W, h: H, ax: 180, ay: 470, head: [180, 165], mouth: [180, 226] };
}

/* ======================= small prop art (SVG strings) ======================= */
export const ICON = {
  pin: (col = STOCK.vermilion) => `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="56" viewBox="0 0 40 56"><path d="M20 30 L20 54" stroke="#777" stroke-width="3" stroke-linecap="round"/><ellipse cx="20" cy="30" rx="13" ry="5" fill="${col}"/><path d="M12 30 L14 12 L26 12 L28 30 Z" fill="${col}"/><ellipse cx="20" cy="11" rx="12" ry="9" fill="${col}"/><ellipse cx="16" cy="8" rx="4" ry="3" fill="#fff" opacity="0.6"/></svg>`,
  bolt: () => `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240" viewBox="0 0 160 240"><path d="M96 4 L18 132 L74 132 L52 236 L144 92 L86 92 L118 4 Z" fill="${STOCK.yellow}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/></svg>`,
  play: () => `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" fill="${STOCK.vermilion}" stroke="${INK}" stroke-width="7"/><path d="M78 56 L150 100 L78 144 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></svg>`,
  bell: () => `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><path d="M60 14 C36 14 30 36 30 58 L22 84 L98 84 L90 58 C90 36 84 14 60 14 Z" fill="${STOCK.yellow}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/><circle cx="60" cy="94" r="10" fill="${INK}"/></svg>`,
};
export const markerSeed = (s) => hashStr(s) % 100000;
