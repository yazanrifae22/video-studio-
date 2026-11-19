// c05 - piece 5: the delays (l061-l069, ~45 s). Scene author. Short s7 = l062-l067 (tall).
// Beats: timeline strip + '6' flag -> a wooden hand replants it (DELAYED #1 + the quality quote) -> again (strip stretches, DELAYED #2)
// -> snail + SKIP gag -> STOP paddle, boxes with legs scuttle from the landing flag -> volcano erupts, lemonade stand runs
// -> recap row, shop, happy crowd, sticky note "THE END?" -> STAMP 5, the crowd tears in two.
import { COL } from '../art.js';
import { D, INK } from './c05.art.js';

export default function (K, F) {
  const { karto, skip, P, cam, scene, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, h) => ({ in: 'board', x, y, w, h });
  const dur = (id) => K.line(id).t1 - K.line(id).t0;
  const board = K.slot('board');
  const mir = (x, w, W) => (rtl ? W - x - w : x);
  const shadow = { textShadow: `3px 4px 0 ${INK}` };
  const topH = tall ? 0.46 : 0.34;
  F.chapterOpen('c05', { dur: 1.15 });

  /* ================= the timeline strip (l061 - l066) ================= */
  const W = 900, H = 540, YS = 320, PINS = [90, 520, 820], X = (x) => (rtl ? W - x : x);
  const tagX = (pin) => mir(Math.min(Math.max(pin - 135, 10), 620), 270, W);
  const tags = [['c05_fall25', 0], ['c05_may26', 1], ['c05_nov26', 2]];
  const lay = [
    { id: 'base', svg: D.strip(580, 110, 12), x: mir(20, 580, W), y: YS, w: 580, h: 110, edge: 5 },
    { id: 'ext', svg: D.ext(300, 110, 5), x: mir(590, 300, W), y: YS, w: 300, h: 110, edge: 5, hidden: true, origin: rtl ? '100% 50%' : '0% 50%' },
    { id: 'y25', text: K.digit('2025'), x: mir(40, 230, W), y: YS + 12, w: 230, h: 86, max: 80, color: INK },
    { id: 'y26', text: K.digit('2026'), x: mir(330, 230, W), y: YS + 12, w: 230, h: 86, max: 80, color: INK },
  ];
  tags.forEach(([key, i]) => {
    lay.push({ id: 't' + i, svg: D.tag(270, 92, i === 0 ? COL.yel : i === 1 ? COL.sky : '#B8E986'), x: tagX(PINS[i]), y: YS + 122, w: 270, h: 92, edge: 4, hidden: true });
    lay.push({ id: 'd' + i, key, x: tagX(PINS[i]) + (rtl ? 8 : 28), y: YS + 128, w: 230, h: 80, max: rtl ? 62 : 52, color: INK, hidden: true });
  });
  lay.push({ id: 'x0', svg: D.cross(), x: tagX(PINS[0]), y: YS + 122, w: 270, h: 92, flat: true, hidden: true }, { id: 'x1', svg: D.cross(), x: tagX(PINS[1]), y: YS + 122, w: 270, h: 92, flat: true, hidden: true });
  // boxes with legs (l066): two groups, the first near the May spot, the second near the Nov spot
  const grp = [[PINS[1] - 210, COL.kraftL], [PINS[1] - 90, '#9EC9E8'], [PINS[1] + 150, '#B8E986'], [PINS[2] - 140, COL.pink], [PINS[2] - 30, COL.kraftL]];
  grp.forEach(([x, col], i) => lay.push({ id: 'bx' + i, svg: D.legBox({ col }), x: X(x) - 75, y: YS - 196, w: 150, h: 200, edge: 4, hidden: true, idle: { y: 3, rot: 3, f: 2.4, ph: i } }));
  lay.push({ id: 'fl', svg: D.flag(), x: X(PINS[0]) - 24, y: YS - 260, w: 190, h: 280, edge: 5, origin: '12% 96%', hidden: true },
    { id: 'f6', text: K.digit('6'), x: X(PINS[0]) + 16, y: YS - 226, w: 116, h: 92, max: 96, color: '#FFFDF6', tcss: shadow, origin: '-15% 256%', hidden: true },
    { id: 'hd', svg: D.hand(), x: X(PINS[0]) - 36, y: YS - 400, w: 72, h: 158, edge: 4, hidden: true });
  const strip = F.piece({ slot: 'board', fit: 0.97, w: W, h: H, at: s('l061', 1), out: 'l067', exit: 'cut', enter: 'drop', layers: lay });
  const sK = 0.88, dyLow = board.y + board.h - strip.h * sK / 2 - strip.cy;
  // the flag + '6' + hand always move together
  let cur = 0;
  const offs = (i) => X(PINS[i]) - X(PINS[0]);
  const hop = (at, to, o = {}) => {
    const a = T(at), x0 = offs(cur), x1 = offs(to), d = o.dur || 0.85, hand = !o.noHand, lift = a + (hand ? 0.35 : 0.0), go = lift + 0.2;
    if (hand) { strip.L('hd').show(a); strip.L('hd').to({ y: [-300, 0] }, { at: a, dur: 0.35, ease: 'back(1.3)' }); K.sfx('whoosh', a, { db: -12 }); }
    for (const id of hand ? ['fl', 'f6', 'hd'] : ['fl', 'f6']) {
      const L = strip.L(id);
      L.to({ y: [0, -60] }, { at: lift, dur: 0.2, ease: 'outQuad' });
      L.to({ x: [x0, x1] }, { at: go, dur: d, ease: 'inOutCubic' });
      L.to({ y: [-60, -150] }, { at: go, dur: d / 2, ease: 'outQuad' });
      L.to({ y: [-150, 0] }, { at: go + d / 2, dur: d / 2, ease: 'inQuad' });
    }
    const land = go + d;
    strip.L('fl').to({ rot: [-7, 0] }, { at: land, dur: 0.4, ease: 'back(2.5)' }); strip.L('f6').to({ rot: [-7, 0] }, { at: land, dur: 0.4, ease: 'back(2.5)' }); K.sfx('thud', land, { db: -7 }); K.sfx('tap', land + 0.05, { db: -10 }); cam.shake(land, { amp: 6, dur: 0.25 });
    if (hand) { strip.L('hd').to({ y: [0, -320] }, { at: land + 0.15, dur: 0.4, ease: 'inBack(1.2)' }); strip.L('hd').hide(land + 0.6); }
    cur = to; return land;
  };
  // l061: strip drops in, flag planted on FALL 2025
  const p0 = s('l061', 1, 0.1);
  strip.L('fl').set({ op: 1 }, p0).to({ y: [-380, 0], rot: [10, 0] }, { at: p0 + 0.2, dur: 0.55, ease: 'bounce' }); strip.L('f6').set({ op: 1 }, p0).to({ y: [-380, 0] }, { at: p0 + 0.2, dur: 0.55, ease: 'bounce' });
  K.sfx('thud', T(p0) + 0.5, { db: -8 });
  strip.L('t0').pop(T(p0) + 0.7, { sfx: 'tape' }); strip.L('d0').show(T(p0) + 0.7);
  P.label('p5', { slot: tall ? B(0.04, 0.02, 0.92, 0.2) : B(0.04, 0.0, 0.92, 0.26), size: 'xl', stock: 'black', ink: '#FFD23F', tape: true, at: T(p0) + 0.9, out: 'l062', tilt: -3, enter: 'slap' });
  karto.pose('present', { at: 'l061' }); skip.pose('neutral', { at: 'l061', sfx: false });

  /* ---------- l062: replant on MAY 26 2026, DELAYED #1, the quality quote ---------- */
  const g0 = s('l062', 0), g1 = s('l062', 1), g2 = s('l062', 2), g3 = s('l062', 3);
  strip.to({ y: dyLow, sc: sK }, { at: g0, dur: 0.6, ease: 'inOutCubic' });
  karto.pose('point', { at: g0 });
  const land1 = hop(g1, 1);
  const mk = (n, key, at, out, sx = 0) => F.piece({ slot: tall ? B(0.02, sx ? 0.22 : 0, 0.96, 0.22) : B(sx, 0, 0.42, topH), fit: 0.98, w: 560, h: 260, at, out, exit: 'fly', enter: 'none', layers: [
    { id: 'pp', svg: [560, 240, `<path d="M10 14 L548 8 L552 228 L16 234 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`], x: 0, y: 10, w: 560, h: 240, edge: 5, paper: true, hidden: true },
    { id: 'stp', stamp: 'delayed', x: 20, y: 28, w: 520, h: 200, max: 120, hidden: true },
    { id: 'bd', svg: [120, 120, `<circle cx="60" cy="60" r="52" fill="${COL.verm}" stroke="${INK}" stroke-width="8"/>`], x: mir(440, 120, 560), y: 0, w: 120, h: 120, hidden: true, flat: true },
    { id: 'bn', key, x: mir(450, 100, 560), y: 28, w: 100, h: 64, max: 56, color: '#FFFDF6', hidden: true }] });
  const stA = mk(1, 'c05_n1', T(g2) - 0.001, T('l063') + 0.25);
  stA.L('pp').pop(T(g2) + 0.05, { sfx: false }); stA.L('stp').slam(T(g2) + 0.15); stA.L('bd').pop(T(g2) + 0.5, { sfx: 'pop' }); stA.L('bn').pop(T(g2) + 0.5, { sfx: false });
  strip.L('d1').show(T(g2)); strip.L('t1').pop(T(g2), { from: 0.5, sfx: 'tape' }); strip.L('x0').slam(T(g2) + 0.35, { sfx: 'scratch', shake: false, db: -10 });
  F.piece({ slot: tall ? B(0, 0.22, 1, 0.28) : B(0.42, 0, 0.58, topH), fit: rtl && !tall ? 0.84 : 0.97, w: 700, h: 300, at: g3, enter: 'drop', out: 'l063', exit: 'fly', tilt: -2, layers: [
    { id: 'c', svg: [700, 300, `<path d="M10 14 L690 6 L684 290 L18 296 Z" fill="${COL.paper}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`], x: 0, y: 0, w: 700, h: 300, edge: 5, paper: true },
    { id: 'tp1', svg: [110, 38, `<rect width="110" height="38" rx="4" fill="rgba(236,222,178,0.95)"/>`], x: 20, y: -14, w: 110, h: 38, flat: true },
    { id: 'tp2', svg: [110, 38, `<rect width="110" height="38" rx="4" fill="rgba(236,222,178,0.95)"/>`], x: 570, y: 276, w: 110, h: 38, flat: true },
    { id: 'q', key: 'quality_quote', x: 36, y: 30, w: 628, h: 240, max: rtl ? 58 : 50, lines: 4, color: INK, idle: { rot: 0.6, f: 0.5 } }] });
  skip.pose('thinking', { at: g3 });

  /* ---------- l063: shrug, FINE ---------- */
  skip.pose('neutral', { at: 'l063' }); skip.hop({ at: 'l063:0.1', h: 40 }); skip.tilt({ deg: -5, at: 'l063:0.1' });
  karto.pose('neutral', { at: 'l063', sfx: false });
  const topSlot = tall ? B(0.05, 0, 0.9, 0.5) : B(0.05, 0, 0.9, topH);
  P.label('c05_fine', { slot: topSlot, pos: [0.28, 0.5], size: 'xl', stock: 'yellow', tape: true, at: s('l063', 1), out: 'l064', tilt: -5, enter: 'slap' });
  F.piece({ slot: tall ? B(0.5, 0, 0.5, 0.45) : B(0.55, 0, 0.4, topH), fit: 0.95, w: 180, h: 150, at: s('l063', 2), out: 'l064', exit: 'pop', enter: 'pop', layers: [
    { id: 'ck', svg: [180, 150, `<path d="M20 78 L66 128 L162 20" fill="none" stroke="${INK}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 78 L66 128 L162 20" fill="none" stroke="${COL.green}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`], x: 0, y: 0, w: 180, h: 150, edge: 2, idle: { rot: 4, f: 0.8 } }] });

  /* ---------- l064: NOV 2025 page, strip stretches, jump to NOV 19 2026, DELAYED #2 ---------- */
  const n0 = s('l064', 0), n1 = s('l064', 1), n2 = s('l064', 2);
  skip.tilt({ deg: 0, at: 'l064' }); karto.pose('present', { at: n0 });
  F.calPage({ month: 'month_nov', year: 2025, band: COL.blue, slot: tall ? B(0.04, 0.02, 0.4, 0.46) : B(0.02, 0, 0.3, topH), fit: 0.95, at: n0, out: 'l066', exit: 'fly', enter: 'drop', tilt: -4 });
  strip.L('ext').show(n0).to({ sx: [0.02, 1] }, { at: T(n0) + 0.2, dur: 0.9, ease: 'back(1.3)' }); K.sfx('unfold', T(n0) + 0.2, { db: -8 });
  karto.pose('point', { at: n1 });
  const land2 = hop(n1, 2, { dur: 0.95 });
  strip.L('x1').slam(land2 + 0.1, { sfx: 'scratch', shake: false, db: -10 });
  strip.L('d2').show(land2 + 0.05); strip.L('t2').pop(land2 + 0.05, { from: 0.5, sfx: 'tape' });
  const stB = mk(2, 'c05_n2', T(n2) - 0.001, T('l066') + 0.3, tall ? 1 : 0.32);
  stB.L('pp').pop(Math.max(T(n2) + 0.05, land2 - 0.1), { sfx: false }); stB.L('stp').slam(Math.max(T(n2) + 0.15, land2 - 0.05)); stB.L('bd').pop(Math.max(T(n2), land2) + 0.45, { sfx: 'pop' }); stB.L('bn').pop(Math.max(T(n2), land2) + 0.45, { sfx: false });
  skip.pose('shocked', { at: n2 });
  // the REAL key art with the date on it: taped up over the board for the last part of l064, slow zoom in on "NOVEMBER 19, 2026"
  const kp = T(n2) + 0.45, kz = kp + 0.35, kzEnd = kz + 1.3;
  const kart = P.photo('assets/real/keyart.jpg', { slot: tall ? B(0, 0.1, 1, 0.78) : B(0.0, 0.0, 1, 1), plane: 'front', size: 1, push: 1, credit: 'cr_rockstar', at: kp, out: 'l065', enter: 'drop', exit: 'fly', tilt: -2 });
  let kim = null, klast = '';
  kart.seekers.push((t) => {
    if (!kim) { kim = kart.box && kart.box.querySelector('.print__img'); if (!kim) return; kim.style.transformOrigin = '12% 76%'; }
    const p = Math.min(1, Math.max(0, (t - kz) / (kzEnd - kz))), sc = (1 + 1.1 * p * p * (3 - 2 * p)).toFixed(3);
    if (sc !== klast) { klast = sc; kim.style.transform = `scale(${sc})`; }
  });

  /* ---------- l065: "Twice?" x2, a snail on the strip, the SKIP button creeps in ---------- */
  skip.pose('shocked', { at: 'l065' }); skip.hop({ at: 'l065', h: 50 });
  P.label('c05_x2', { slot: topSlot, pos: [0.82, 0.5], size: 'xl', stock: 'black', ink: '#FFD23F', tape: true, at: 'l065+0.1', out: 'l066', tilt: 6, enter: 'slam' });
  const sn = s('l065', 1);
  const snail = F.piece({ slot: tall ? B(0, 0.4, 1, 0.22) : B(0.0, 0.3, 1, 0.34), fit: 0.95, w: 260, h: 170, at: sn, out: 'l066:0.1', exit: 'cut', enter: 'pop', layers: [
    { id: 'sh', svg: [260, 170, `<ellipse cx="150" cy="150" rx="105" ry="14" fill="rgba(30,23,18,0.18)"/><path d="M40 140 Q20 110 36 100 L36 70 M70 104 L74 70" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><circle cx="36" cy="66" r="9" fill="#FFFDF6" stroke="${INK}" stroke-width="5"/><circle cx="74" cy="66" r="9" fill="#FFFDF6" stroke="${INK}" stroke-width="5"/><path d="M30 148 Q60 110 120 126 L240 146 L240 156 L30 156 Z" fill="#D9B07A" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><circle cx="160" cy="84" r="62" fill="${COL.verm}" stroke="${INK}" stroke-width="8"/><path d="M160 84 m-6 -4 a12 12 0 1 1 8 14 a26 26 0 1 1 -26 -26 a42 42 0 1 1 32 66" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`], x: 0, y: 0, w: 260, h: 170, edge: 5, idle: { y: 3, f: 0.9 } }] });
  snail.to({ x: [-board.w * 0.3, board.w * 0.28] }, { at: sn, dur: Math.max(2, T('l066') - T(sn) + 4), ease: 'linear' });
  P.label('c05_slow', { slot: tall ? B(0.08, 0.34, 0.5, 0.08) : B(0.04, 0.27, 0.4, 0.1), size: 'l', stock: 'white', tape: true, at: T(sn) + 0.25, out: 'l066:0.1', tilt: -4, enter: 'slap' });
  const btn = F.skipAttempt(T(s('l065', 1)) + 0.15, { stopAt: 'l066', out: 'l066:0.45', exit: 'drop' });
  skip.hop({ at: T(sn) + 0.15, h: 40 });
  karto.pose('deadpan', { at: 'l065' });

  /* ---------- l066: STOP paddle blocks the phone; boxes with legs scuttle from the landing '6' flag ---------- */
  karto.pose('point', { at: 'l066' }); karto.tilt({ deg: -4, at: 'l066' }); skip.tilt({ deg: 0, at: 'l066' });
  const ps = s('l066', 1);
  const stop = F.piece({ slot: tall ? B(0.15, 0.15, 0.7, 0.8) : B(0.28, 0.0, 0.46, 1), fit: 0.96, w: 300, h: 440, plane: 'front', at: 'l066', out: ps, exit: 'drop', enter: 'slam', layers: [
    { id: 'p', svg: D.stop(), x: 0, y: 0, w: 300, h: 440, edge: 7, origin: '50% 100%', idle: { rot: 2, f: 1.4 } },
    { id: 't', key: 'c05_stop', x: 30, y: 74, w: 240, h: 150, max: 118, color: '#FFFDF6', tcss: shadow, origin: '50% 300%', idle: { rot: 2, f: 1.4 } }] });
  stop.wiggle({ at: T('l066') + 0.3 }); cam.shake(T('l066') + 0.2, { amp: 7 });
  btn.to({ rot: 24, x: (rtl ? -1 : 1) * 280, y: 40 }, { at: T('l066') + 0.2, dur: 0.35, ease: 'back(2)' }); K.sfx('boing', T('l066') + 0.2, { db: -8 });
  skip.pose('shocked', { at: T('l066') + 0.15 });
  // s1: strip back to the centre, boxes with legs, the flag lands again
  strip.to({ y: tall ? board.h * 0.1 : 0, sc: 1 }, { at: ps, dur: 0.5, ease: 'inOutCubic' });
  // tall: the real skyline fills the empty top band above the strip until the volcano comes in
  if (tall) P.photo('assets/real/shot04.jpg', { slot: B(0.04, 0, 0.92, 0.33), size: 1, push: 1.06, credit: 'cr_rockstar', at: T(ps) + 0.3, out: 'l067', enter: 'drop', exit: 'fly', tilt: 2 });
  karto.pose('present', { at: ps }); karto.tilt({ deg: 0, at: ps }); skip.pose('deadpan', { at: ps });
  for (let i = 0; i < 5; i++) strip.L('bx' + i).pop(T(ps) + 0.1 + i * 0.07, { from: 0.4, sfx: i % 2 ? false : 'pop', db: -14 });
  const lf = s('l066', 1, 0.0), sd = dur('l066') * 0.45;
  const fa = T(lf) + 0.45, fb = T(lf) + 0.45 + sd * 0.5;
  cur = 2;
  const back = hop(fa - 0.1, 0, { noHand: true, dur: 0.5 });   // up and over to the start, then to the May spot
  const l1 = hop(back + 0.15, 1, { noHand: true, dur: 0.6 });
  const l2 = hop(Math.max(l1 + 0.7, fb), 2, { noHand: true, dur: 0.6 });
  const run = (ids, at, dx) => ids.forEach((id, i) => {
    const t = at + i * 0.07, dir = i % 2 ? 1 : -1;
    strip.L(id).to({ x: [0, (dx ?? dir * 700)] , rot: [0, dir * 18] }, { at: t, dur: 1.1, ease: 'inQuad' });
    for (let k = 0; k < 5; k++) strip.L(id).to({ y: [0, -26] }, { at: t + k * 0.2, dur: 0.1, ease: 'outQuad' }).to({ y: [-26, 0] }, { at: t + k * 0.2 + 0.1, dur: 0.1, ease: 'inQuad' });
    strip.L(id).fade(t + 0.9, { to: 0, dur: 0.25 });
  });
  run(['bx0', 'bx1', 'bx2'], l1, null); run(['bx3', 'bx4'], l2, null);
  K.sfx('whoosh', l1 + 0.05, { db: -9 }); K.sfx('whoosh', l2 + 0.05, { db: -9 });

  /* ================= l067: volcano erupts, the lemonade stand packs up and runs ================= */
  scene.backdrop('#4A1F2E', { at: 'l067' });
  const VW = tall ? 760 : 1000, VH = tall ? 840 : 660, vs = tall ? 0.82 : 1;
  const vx = (x, w) => mir(x, w, VW), rum = { x: 2.5, y: 1, f: 7 };
  const gx = (x, w) => vx(10 + x * vs - (tall ? 0 : 10), w * vs), gy = (y) => (tall ? 70 : 0) + y * vs;
  const vl = [
    { id: 'vol', art: 'volcano', x: gx(30, 640), y: gy(110), w: 640 * vs, h: 536 * vs, edge: 8, idle: rum },
    { id: 'lv1', svg: D.flow(1), x: gx(250, 100), y: gy(130), w: 100 * vs, h: 300 * vs, edge: 3, hidden: true, origin: '50% 0%', idle: rum },
    { id: 'lv2', svg: D.flow(-1), x: gx(380, 100), y: gy(140), w: 100 * vs, h: 260 * vs, edge: 3, hidden: true, origin: '50% 0%', idle: rum },
    { id: 'v6', text: K.digit('6'), x: gx(250, 260), y: gy(330), w: 260 * vs, h: 240 * vs, max: 230 * vs, color: '#FFFDF6', idle: rum, tcss: { textShadow: `0 0 14px ${COL.neon}, 0 0 34px ${COL.neon}, 5px 6px 0 #1A1030` } },
    { id: 'burst', art: 'burst', x: gx(260, 200), y: gy(0), w: 200 * vs, h: 180 * vs, edge: 4, hidden: true },
  ];
  for (let i = 0; i < 6; i++) vl.push({ id: 'pf' + i, svg: D.puff(), x: gx(260, 100) + (i - 2.5) * 20, y: gy(150), w: 90 * vs, h: 90 * vs, hidden: true, flat: true });
  const cols = ['#FF6A1F', '#FFD23F', '#E5401D', '#FF8C2A'];
  for (let i = 0; i < 16; i++) vl.push({ id: 'lb' + i, svg: D.blob(cols[i % 4]), x: gx(330, 44), y: gy(120), w: 44, h: 44, hidden: true, edge: 3 });
  const SX = tall ? 440 : 690, SY = tall ? 500 : 316;
  vl.push({ id: 'st', art: 'lemonade', x: vx(SX, 300), y: SY, w: 300, h: 327, edge: 6, hidden: true, origin: '50% 100%' },
    { id: 'stt', key: 'c05_lemon', x: vx(SX + 24, 252), y: SY + 44, w: 252, h: 54, max: rtl ? 44 : 38, color: '#FFFDF6', tcss: shadow, hidden: true, origin: '50% 100%' },
    { id: 'lgL', svg: D.leg(), x: vx(SX + 70, 34), y: SY + 310, w: 34, h: 84, hidden: true, edge: 2 }, { id: 'lgR', svg: D.leg(), x: vx(SX + 196, 34), y: SY + 310, w: 34, h: 84, hidden: true, edge: 2 });
  const vo = F.piece({ slot: 'board', fit: 0.99, w: VW, h: VH, at: 'l067', out: 'l068', exit: 'cut', enter: 'rise', layers: vl });
  const sg = (id) => vo.L(id);
  ['st', 'stt'].forEach((id, i) => sg(id).drop(T('l067') + 0.25 + i * 0.03, { dy: 500, sfx: i ? false : 'thud' }));
  const er = T(K.at('l067', 0.5));
  // eruption: flash, lava streams, 16 paper blobs fly up and rain back, smoke, confetti
  sg('burst').pop(er, { from: 0.4, sfx: 'hit', db: -5 }); sg('burst').hide(er + 0.35);
  K.sfx('sting', er, { db: -9 }); cam.shake(er, { amp: 16, dur: 0.7 });
  P.confetti({ from: 'burst', at: er, dur: 2.2, count: 120 });
  sg('lv1').show(er + 0.1).to({ sy: [0.05, 1] }, { at: er + 0.1, dur: 0.9, ease: 'outCubic' }); sg('lv2').show(er + 0.2).to({ sy: [0.05, 1] }, { at: er + 0.2, dur: 0.8, ease: 'outCubic' });
  for (let i = 0; i < 16; i++) {
    const t = er + 0.04 * (i % 8), dx = (((i * 53) % 21) - 10) * 40 * (i % 2 ? 1 : 0.8) * (rtl ? -1 : 1), up = -330 - ((i * 37) % 5) * 70;
    sg('lb' + i).set({ op: 1 }, t).to({ x: [0, dx], rot: [0, ((i % 5) - 2) * 120] }, { at: t, dur: 1.5, ease: 'linear' });
    sg('lb' + i).to({ y: [0, up] }, { at: t, dur: 0.6, ease: 'outQuad' }).to({ y: [up, 250 + (i % 4) * 30] }, { at: t + 0.6, dur: 0.9, ease: 'inQuad' }); sg('lb' + i).fade(t + 1.3, { to: 0, dur: 0.25 });
  }
  for (let i = 0; i < 6; i++) { sg('pf' + i).pop(er + 0.1 + i * 0.07, { from: 0.3, sfx: false }); sg('pf' + i).to({ y: [0, -90 - i * 12], x: [0, (i - 2.5) * 46], sc: [0.3, 1.6] }, { at: er + 0.1 + i * 0.07, dur: 1.6, ease: 'outQuad' }); sg('pf' + i).fade(er + 1.0 + i * 0.07, { to: 0, dur: 0.7 }); }
  // the stand packs up (awning drops, legs pop out) and runs away in hops
  const pk = er + 0.35, dirx = rtl ? -1 : 1;
  sg('lgL').show(pk).to({ sy: [0.1, 1] }, { at: pk, dur: 0.2, ease: 'back(2)' }); sg('lgR').show(pk).to({ sy: [0.1, 1] }, { at: pk, dur: 0.2, ease: 'back(2)' });
  for (const id of ['st', 'stt', 'lgL', 'lgR']) { const L = sg(id);
    L.to({ sc: [1, 0.86], rot: [0, dirx * -8] }, { at: pk, dur: 0.2, ease: 'outQuad' });
    L.to({ x: [0, dirx * 760], rot: [dirx * -8, dirx * 6] }, { at: pk + 0.25, dur: 1.15, ease: 'inQuad' });
    for (let k = 0; k < 5; k++) { L.to({ y: [0, -40] }, { at: pk + 0.25 + k * 0.22, dur: 0.11, ease: 'outQuad' }).to({ y: [-40, 0] }, { at: pk + 0.36 + k * 0.22, dur: 0.11, ease: 'inQuad' }); }
    L.fade(pk + 1.2, { to: 0, dur: 0.2 }); }
  K.sfx('whoosh', pk + 0.25, { db: -8 });
  karto.pose('present', { at: 'l067' }); karto.pose('shocked', { at: er }); karto.tilt({ deg: 0, at: 'l067' });
  skip.pose('laughing', { at: er + 0.2 });

  /* ================= l068: recap row, the shop opens, happy crowd, "THE END?" sticky note ================= */
  scene.backdrop('#3B3350', { at: 'l068' });
  const S68 = (k, f = 0) => s('l068', rtl ? k : k + 1, f);
  const r0 = S68(0), r1 = S68(1), r2 = S68(2), r3 = S68(3);
  const dd = (T(r1) - T(r0)) / 3;
  F.tower({ from: 2013, to: 2026, slot: tall ? B(0, 0, 0.34, 0.86) : B(0, 0, 0.33, 0.86), fit: 1, at: r0, enter: 'drop', out: r1, exit: 'cut', lean: 4 });
  P.label('c05_r_years', { slot: tall ? B(0, 0.86, 0.34, 0.12) : B(0, 0.86, 0.33, 0.14), size: 'm', stock: 'yellow', tape: true, at: T(r0) + 0.3, out: r1, tilt: -3, enter: 'slap' });
  const sA = F.piece({ slot: tall ? B(0.34, 0, 0.34, 0.44) : B(0.34, 0, 0.33, 0.43), fit: 0.96, w: 560, h: 260, at: T(r0) + dd, out: r1, exit: 'cut', enter: 'slam', tilt: -6, layers: [{ id: 'p', svg: [560, 240, `<path d="M10 14 L548 8 L552 228 L16 234 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`], x: 0, y: 10, w: 560, h: 240, edge: 5, paper: true }, { id: 'a', stamp: 'delayed', x: 20, y: 28, w: 520, h: 200, max: 120 }] });
  F.piece({ slot: tall ? B(0.34, 0.44, 0.34, 0.42) : B(0.34, 0.43, 0.33, 0.43), fit: 0.96, w: 560, h: 260, at: T(r0) + dd + 0.2, out: r1, exit: 'cut', enter: 'slam', tilt: 5, layers: [{ id: 'p', svg: [560, 240, `<path d="M10 14 L548 8 L552 228 L16 234 Z" fill="#FFFDF6" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`], x: 0, y: 10, w: 560, h: 240, edge: 5, paper: true }, { id: 'a', stamp: 'delayed', x: 20, y: 28, w: 520, h: 200, max: 120 }] });
  P.label('c05_r_delays', { slot: tall ? B(0.34, 0.86, 0.34, 0.12) : B(0.34, 0.86, 0.33, 0.14), size: 'm', stock: 'white', tape: true, at: T(r0) + dd + 0.35, out: r1, tilt: 3, enter: 'slap' });
  F.hotelTV({ slot: tall ? B(0.66, 0.05, 0.34, 0.5) : B(0.67, 0.05, 0.33, 0.5), fit: 0.98, at: T(r0) + 2 * dd, enter: 'drop', out: r1, exit: 'cut', on: true, stick: true });
  P.label('c05_r_tv', { slot: tall ? B(0.66, 0.6, 0.34, 0.14) : B(0.67, 0.6, 0.33, 0.16), size: 'm', stock: 'yellow', tape: true, at: T(r0) + 2 * dd + 0.3, out: r1, tilt: -3, enter: 'slap' });
  skip.pose('deadpan', { at: r0 }); karto.pose('present', { at: r0 });
  // the shop from piece 1 opens: OPEN sign, '6' box on the shelf, NOV 19 2026
  const shop = F.shop({ numeral: '6', slot: 'board', fit: 0.99, at: r1, enter: 'flap', out: 'l069:end', exit: 'cut' });
  P.label('c05_open', { slot: tall ? B(0.04, 0.04, 0.46, 0.1) : B(0.04, 0.04, 0.34, 0.14), size: 'l', stock: 'white', tape: true, at: T(r1) + 0.5, out: 'l069:end', tilt: -5, enter: 'slap' });
  P.label('c05_nov26', { slot: tall ? B(0.1, 0.16, 0.8, 0.1) : B(0.3, 0.03, 0.42, 0.17), size: 'l', stock: 'black', ink: '#FFD23F', tape: true, at: T(r1) + 0.9, out: 'l069:end', tilt: 4, enter: 'slap' });
  K.sfx('chime', T(r1) + 0.5, { db: -10 });
  karto.pose('neutral', { at: r1, sfx: false }); skip.pose('neutral', { at: r1, sfx: false });
  const crowd = F.crowd({ rows: 2, cols: 6, expr: 'happy', look: 0, plane: 'front', slot: tall ? B(0, 0.66, 1, 0.34) : B(0, 0.62, 1, 0.38), fit: 0.99, at: r2, enter: 'rise', out: 'l069', exit: 'cut' });
  P.confetti({ at: r2, dur: 2.4, count: 90 });
  skip.pose('laughing', { at: r2 }); karto.pose('cheer', { at: r2 });
  const note = F.piece({ slot: tall ? B(0.18, 0.16, 0.64, 0.5) : B(0.26, 0.1, 0.48, 0.58), fit: 0.95, w: 420, h: 380, plane: 'front', at: r3, enter: 'slap', out: 'l069:0.6', exit: 'cut', tilt: -6, layers: [
    { id: 'n', svg: D.sticky(), x: 0, y: 0, w: 420, h: 380, edge: 4, paper: true, idle: { rot: 1.5, f: 0.5 } },
    { id: 't', key: 'c05_end', x: 30, y: 70, w: 360, h: 240, max: rtl ? 120 : 100, lines: 2, color: INK, font: 'marker', idle: { rot: 1.5, f: 0.5 } }] });
  skip.pose('thinking', { at: r3 }); karto.pose('deadpan', { at: r3 });

  /* ================= l069: Karto flicks the note away, STAMP 5, the crowd tears in two ================= */
  const f1 = s('l069', 1), st = T(f1) - 0.45, hit = st + 0.55;
  note.to({ x: (rtl ? -1 : 1) * board.w * 0.9, y: -board.h * 0.5, rot: (rtl ? -1 : 1) * 520 }, { at: T(s('l069', 0)) + 0.35, dur: 0.6, ease: 'inQuad' }); K.sfx('whoosh', T(s('l069', 0)) + 0.35, { db: -8 });
  karto.pose('point', { at: s('l069', 0) }); karto.nod({ at: T(f1) });
  const half = (lk) => F.crowd({ rows: 2, cols: 3, expr: 'shout', look: lk, plane: 'front', slot: lk > 0 ? B(0.0, tall ? 0.6 : 0.5, 0.48, tall ? 0.4 : 0.5) : B(0.52, tall ? 0.6 : 0.5, 0.48, tall ? 0.4 : 0.5), fit: 0.99, at: hit, enter: 'none', out: 'l069:end', exit: 'cut' });
  const cl = half(rtl ? -1 : 1), cr = half(rtl ? 1 : -1);
  for (const [c, d] of [[cl, -1], [cr, 1]]) { K.tl.to(c.v, { x: [d * -60, d * 0], sc: [1.25, 1] }, { at: hit, dur: 0.3, ease: 'back(2)' }); }
  K.tl.set(crowd.v, { op: 0 }, hit);
  const tear = F.cut('tear', { slot: tall ? B(0.45, 0.3, 0.1, 0.7) : B(0.46, 0.22, 0.08, 0.78), fit: 1, plane: 'front', at: hit, out: 'l069:end', exit: 'cut', enter: 'grow' });
  K.sfx('rip', hit, { db: -6 }); cam.shake(hit + 0.1, { amp: 11, dur: 0.5 });
  skip.pose('shocked', { at: hit + 0.1 }); skip.hop({ at: hit + 0.1, h: 60 }); karto.pose('deadpan', { at: hit + 0.3 });
  // own version of F.stamp(5): the card stops ABOVE the crowd (the shared one flies to the centre and covers it)
  {
    const CEN = tall ? { x: 490, y: 560 } : { x: 1070, y: 440 }, HOM = tall ? { x: 780, y: 1196, k: 0.29 } : { x: 1694, y: 150, k: 0.37 };
    const tg = tall ? { x: 490, y: 462, k: 0.78 } : { x: 1070, y: 205, k: 0.7 }, cd = F.card, v = cd.v, tl = K.tl;
    tl.to(v, { x: tg.x - CEN.x, y: tg.y - CEN.y, sc: tg.k, rot: 0 }, { at: st, dur: 0.45, ease: 'back(1.2)' }); K.sfx('whoosh', st, { db: -10 });
    cd.L('ghost5').hide(st + 0.55); cd.L('st5').set({ y: 0 }, st + 0.5); cd.L('st5').slam(st + 0.55, { amp: 10 }); cd.L('ring5').wiggle(st + 0.6);
    tl.to(v, { sc: tg.k * 1.06 }, { at: st + 0.6, dur: 0.1, ease: 'outQuad' }); tl.to(v, { sc: tg.k }, { at: st + 0.7, dur: 0.3, ease: 'back(2)' }); K.sfx('ding', st + 0.75, { db: -14 });
    tl.to(v, { x: HOM.x - CEN.x, y: HOM.y - CEN.y, sc: HOM.k, rot: 3 }, { at: st + 1.55, dur: 0.5, ease: 'inOutCubic' }); K.sfx('slide', st + 1.55, { db: -12 });
  }
}
