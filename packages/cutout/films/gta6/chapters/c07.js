// c07 - piece 7: the panic (l082-l092, ~83 s). Curious, then calm and fair at l090-l091 (study papers, a scale that does not tip, a plain age badge).
// Short s3 = l082-l088 (tall): every board piece is built to fill the 872x840 board. TV host = generic cutout, publicist = suit with a blank head, no logos, no real lettering.
import { A6, heads, scaleLayers } from './c06.art.js';
import { COL, HEAD_COLS } from '../art.js';
import { clamp } from '../../../web/kit/core.js';

export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, hh) => ({ in: 'board', x, y, w, h: hh });
  const H7 = tall ? 860 : 700;
  const BIG = { slot: B(0, 0, 1, 1), fit: 0.97, w: 900, enter: 'none' };
  F.chapterOpen('c07');

  /* ---- l082: TV news set, generic presenter, ticker GAME = DANGER?, flame reply bubbles pile up ---- */
  const nbg = tall ? 480 : 400, dy0 = tall ? 400 : 290, hostB = tall ? [320, 70, 270, 351] : [330, 28, 240, 312];
  const ns = [{ id: 'bg', svg: A6.newsBg(), x: 0, y: 0, w: 900, h: nbg, edge: 6 },
    { id: 'live', svg: A6.badge({ col: COL.verm }), key: 'c07_live', x: 30, y: 26, w: 200, h: 58, edge: 4, max: 44, color: '#FFFDF6', hidden: true, idle: { sc: 0.04, f: 1.4 } },
    { id: 'host', art: 'presenter', x: hostB[0], y: hostB[1], w: hostB[2], h: hostB[3], edge: 6, hidden: true, idle: { y: 3, f: 0.8 } },
    { id: 'desk', svg: A6.deskNews(), x: 20, y: dy0, w: 860, h: 160, edge: 6 },
    { id: 'tick', key: 'c07_ticker', x: 150, y: dy0 + 84, w: 670, h: 54, max: 44, color: '#FFFDF6', hidden: true }];
  for (let i = 0; i < 6; i++) { const r = Math.floor(i / 3), c = i % 3; ns.push({ id: 'rb' + i, svg: A6.reply(), x: (r ? 40 : 10) + c * 300, y: (tall ? 600 : 470) + r * (tall ? 125 : 90), w: 280, h: 150, edge: 4, hidden: true, rot: ((i * 5) % 9) - 4, idle: { rot: 2, y: 3, f: 0.8 + i * 0.1, ph: i } }); }
  const a2 = s('l082', 2, 0), a3 = s('l082', 3, 0);
  const news = F.piece({ ...BIG, h: H7, at: a2, out: 'l083', exit: 'cut', enter: 'rise', layers: ns });
  news.L('host').slideIn(T(a2) + 0.25, { dy: 320, dur: 0.5 }); news.L('live').pop(T(a2) + 0.45, { from: 0.3 }); news.L('tick').pop(T(a2) + 0.9, { from: 0.4, sfx: 'stamp', db: -12 });
  for (let i = 0; i < 6; i++) news.L('rb' + i).drop(T(a3) + 0.05 + i * 0.22, { dy: 520, dur: 0.45, sfx: i % 2 ? false : 'thud', db: -10 });
  karto.pose('present', { at: 'l082:0.3' }); skip.pose('neutral', { at: 'l082', sfx: false }); skip.pose('thinking', { at: a3 });
  cam.to({ zoom: 1.05 }, { at: a2, dur: 4, ease: 'inOutSine' });

  /* ---- l083: THE SECRET; a lit match + paper pile; the publisher lit it on purpose ---- */
  cam.reset({ at: 'l083', dur: 0.3 });
  const m0 = s('l083', 0, 0.1), m1 = s('l083', 1, 0), m2 = s('l083', 2, 0);
  P.stamp('secret', { slot: tall ? B(0.05, 0.02, 0.9, 0.3) : B(0.04, 0.03, 0.92, 0.34), at: m0, out: m1, tilt: -8, big: true });
  const pl = tall ? [60, 410, 780, 442] : [150, 340, 600, 340], pileTop = pl[1] + pl[3] * 0.47, fw = tall ? 380 : 300, fh = fw * 1.29;
  const fireP = F.piece({ ...BIG, h: H7, at: 'l083', out: 'l085', exit: 'cut', layers: [
    { id: 'pb', svg: A6.paperBalls(), x: pl[0], y: pl[1], w: pl[2], h: pl[3], edge: 4, hidden: true },
    { id: 'fire', svg: A6.fire(), x: pl[0] + pl[2] / 2 - fw / 2, y: pileTop - fh * 0.92, w: fw, h: fh, edge: 5, hidden: true, origin: '50% 100%',
      paint: (t, Lr) => { const g = 0.16 + 0.8 * clamp((t - T(m2) - 0.7) / 3.2, 0, 1), fl = 1 + 0.07 * Math.sin(t * 17) + 0.04 * Math.sin(t * 29 + 1); Lr.el.style.transform = `scale(${(g * (1 - 0.03 * Math.sin(t * 13))).toFixed(3)},${(g * fl).toFixed(3)})`; } },
    { id: 'mt', art: 'match', x: tall ? 600 : 690, y: tall ? 40 : 30, w: tall ? 150 : 120, h: tall ? 600 : 480, edge: 5, hidden: true, rot: 38, origin: '50% 8%', idle: { rot: 2, f: 0.8 } },
    { id: 'qm', art: 'qmark', x: tall ? 90 : 60, y: tall ? 440 : 150, w: tall ? 230 : 180, h: tall ? 329 : 257, edge: 4, hidden: true, idle: { rot: 7, f: 0.9 } }] });
  fireP.L('pb').pop(T(m1) + 0.1, { from: 0.4 });
  fireP.L('mt').slideIn(T(m1) + 0.2, { dx: 500, dur: 0.5 }); K.sfx('whoosh', T(m1) + 0.2, { db: -10 });
  fireP.L('mt').to({ x: tall ? -170 : -250, y: tall ? 330 : 270, rot: 62 }, { at: T(m2) + 0.45, dur: 0.6, ease: 'inOutCubic' }); K.sfx('tick-synth', T(m2) + 0.5, { db: -10 });
  fireP.L('fire').show(T(m2) + 0.85); K.sfx('swell', T(m2) + 0.85, { db: -16 }); K.sfx('pop', T(m2) + 0.85, { db: -8 });
  karto.pose('whisper', { at: m0 }); karto.tilt({ deg: 6, at: m0 }); karto.pose('point', { at: m1 }); karto.tilt({ deg: 3, at: m2 });
  skip.pose('thinking', { at: m1 }); skip.pose('thinking', { at: m2 });
  cam.to({ zoom: 1.14, y: -20 }, { at: m1, dur: 6, ease: 'inOutSine' });

  /* ---- l084: "On purpose?" Skip shocked, a question mark pops next to the little fire ---- */
  cam.reset({ at: 'l084', dur: 0.3 });
  skip.pose('shocked', { at: 'l084' }); skip.hop({ at: 'l084', h: 70 }); karto.tilt({ deg: 0, at: 'l084' }); karto.pose('deadpan', { at: 'l084:0.3' });
  fireP.L('qm').pop('l084:0.08', { from: 0.3, sfx: 'boing' }); cam.shake(T('l084:0.1') + 0.1, { amp: 5 });

  /* ---- l085: 1997 sign + Scotland pin, the small studio, the top-down street with tiny cars, one bored customer ---- */
  cam.reset({ at: 'l085', dur: 0.3 }); skip.tilt({ deg: 0, at: 'l085' });
  const y0 = s('l085', 0, 0), y1 = s('l085', 1, 0), y2 = s('l085', 2, 0), y3 = s('l085', 3, 0), y4 = s('l085', 4, 0);
  F.yearSign(1997, { slot: tall ? B(0.04, 0.0, 0.92, 0.42) : B(0.0, 0.12, 0.52, 0.76), fit: 0.97, at: T(y0) + 0.05, out: y2, enter: 'drop', exit: 'cut' });
  const mp = F.piece({ slot: tall ? B(0.1, 0.42, 0.8, 0.58) : B(0.5, 0, 0.5, 1), fit: 0.97, w: 500, h: 600, at: y1, out: y2, exit: 'cut', enter: 'slide', layers: [
    { id: 'map', art: 'ukMap', x: 50, y: 20, w: 400, h: 520, edge: 6, paper: true },
    { id: 'pin', svg: A6.pin(), x: 232, y: 12, w: 70, h: 110, edge: 3, hidden: true },
    { id: 'lab', svg: A6.board({ w: 240, h: 90, col: '#FFFDF6' }), key: 'c07_scotland', x: 270, y: 150, w: 240, h: 90, edge: 5, hidden: true, max: 44, color: COL.verm, rot: -5 }] });
  mp.L('pin').drop(T(y1) + 0.35, { dy: 380, dur: 0.45, sfx: 'tap', db: -6 }); mp.L('lab').pop(T(y1) + 0.8, { from: 0.3 });
  F.yearSign(1997, { slot: tall ? B(0.0, 0.0, 0.38, 0.2) : B(0.0, 0.0, 0.28, 0.3), fit: 0.95, at: y2, out: 'l086', enter: 'none', exit: 'cut', plane: 'front' });
  const stB = [{ id: 'st', svg: A6.studio(), x: 50, y: 40, w: 600, h: 508, edge: 6, idle: { rot: 0.8, y: 4, f: 0.5 } },
    { id: 'hd', art: 'head', ao: { expr: 'happy', col: '#FFD23F' }, x: 176, y: 292, w: 100, h: 120, paper: true, edge: 3, hidden: true, idle: { y: 4, rot: 3, f: 1.1 } }];
  const stp = F.piece({ slot: tall ? B(0.05, 0.12, 0.9, 0.8) : B(0.2, 0.04, 0.78, 0.92), fit: 0.95, w: 700, h: 600, at: y2, out: y3, exit: 'cut', enter: 'drop', layers: stB });
  stp.L('hd').pop(T(y2) + 0.55, { from: 0.4 });
  // top-down street grid with tiny cars + one bored customer
  const GH = tall ? 860 : 640, roads = tall ? [210, 430, 650] : [210, 430], colsC = [COL.verm, COL.blue, COL.yel, COL.green, COL.pink, COL.purple, COL.sky, COL.kraft];
  const gl = [{ id: 'grid', svg: A6.streetGrid({ tall }), x: 0, y: 0, w: 900, h: GH, edge: 6 }];
  const car = (id, col, cx, cy, vert, dir, sp, off) => gl.push({ id, svg: A6.topCar({ col }), x: vert ? cx - 22 : 0, y: vert ? 0 : cy - 41, w: 45, h: 82, edge: 3,
    paint: (t, Lr, Pc) => { const f = (((t * sp + off) % 1) + 1) % 1, k = Pc.k; if (vert) { const y = (dir > 0 ? f : 1 - f) * (GH + 160) - 80; Lr.el.style.transform = `translate(0px,${(y * k).toFixed(1)}px) rotate(${dir > 0 ? 0 : 180}deg)`; } else { const x = (dir > 0 ? f : 1 - f) * 1060 - 80; Lr.el.style.transform = `translate(${(x * k).toFixed(1)}px,0px) rotate(${dir > 0 ? 90 : 270}deg)`; } } });
  let ci = 0;
  roads.forEach((ry, r) => { car('c' + ci, colsC[ci % 8], 0, ry - 22 + (r % 2 ? 18 : -18), false, r % 2 ? -1 : 1, 0.16 + 0.04 * r, 0.1 * r); ci++; car('c' + ci, colsC[ci % 8], 0, ry + 22 + (r % 2 ? -4 : 6), false, r % 2 ? 1 : -1, 0.2 - 0.02 * r, 0.55 + 0.1 * r); ci++; });
  [290, 610].forEach((vx, i) => { car('c' + ci, colsC[(ci + 3) % 8], vx, 0, true, i ? 1 : -1, 0.14 + 0.03 * i, 0.3 * i); ci++; car('c' + ci, colsC[(ci + 2) % 8], vx + 30, 0, true, i ? -1 : 1, 0.17, 0.6 + 0.2 * i); ci++; });
  gl.push({ id: 'pb', svg: A6.person(), x: 0, y: GH * 0.36 + 100, w: 90, h: 146, edge: 4, paper: true, hidden: true, idle: { y: 5, f: 2.6 } },
    { id: 'ph', art: 'head', ao: { expr: 'calm', col: '#F6C08A' }, x: 0, y: GH * 0.36, w: 84, h: 101, paper: true, edge: 3, hidden: true, idle: { y: 5, f: 2.6, rot: 4 } });
  const grid = F.piece({ ...BIG, h: GH, at: y3, out: 'l086', exit: 'cut', enter: 'drop', layers: gl });
  cam.to({ zoom: 1.07 }, { at: y3, dur: 3.5, ease: 'inOutSine' });
  for (const id of ['pb', 'ph']) grid.L(id).show(y4).to({ x: [-120, 1000] }, { at: y4, dur: Math.max(2.4, K.line('l085').t1 - T(y4)), ease: 'linear' });

  /* ---- l086: the publicist (blank head) tosses notes into newspaper mouths, BAN THIS GAME! headlines pop ---- */
  cam.reset({ at: 'l086', dur: 0.3 });
  const q0 = s('l086', 0, 0), q1 = s('l086', 1, 0), fs = tall ? 1.115 : 0.96, af = tall ? 1.15 : 1;
  const su = tall ? [0, 330] : [10, 208], sh = [su[0] + 226 * fs - 38 * af, su[1] + 196 * fs - 6], hand = [sh[0] + 35 * af, sh[1] + 0.8 * 210 * af];
  const pw = tall ? 270 : 205, ph2 = tall ? 340 : 258, pp = tall ? [[330, 20], [600, 20], [465, 400]] : [[270, 50], [480, 340], [690, 50]];
  const pl2 = [{ id: 'su', svg: A6.suit(), x: su[0], y: su[1], w: 260 * fs, h: 470 * fs, edge: 6, hidden: true, idle: { rot: 0.8, f: 0.5 } },
    { id: 'arm', svg: A6.suitArm(), x: sh[0], y: sh[1], w: 70 * af, h: 210 * af, edge: 4, hidden: true, origin: '50% 6%' }];
  pp.forEach(([x, y], i) => {
    pl2.push({ id: 'np' + i, art: 'newspaper', x, y, w: pw, h: ph2, paper: true, edge: 3, hidden: true, rot: [-4, 3, -2][i], idle: { rot: 1.4, f: 0.6, ph: i } },
      { id: 'hl' + i, key: 'ban_headline', x: x + 10, y: y + 10, w: pw - 20, h: ph2 * 0.3, max: tall ? 44 : 32, lines: 2, color: '#B5260E', hidden: true, rot: [-4, 3, -2][i], idle: { rot: 1.4, f: 0.6, ph: i } },
      { id: 'mo' + i, svg: A6.mouth(), x: x + pw / 2 - 52, y: y + ph2 * 0.58, w: 104, h: 64, edge: 3, hidden: true, rot: [-4, 3, -2][i], idle: { sc: 0.06, f: 1.2, ph: i } });
  });
  pp.forEach((_, i) => pl2.push({ id: 'nt' + i, svg: A6.note(), x: hand[0] - 30, y: hand[1] - 20, w: 70, h: 54, edge: 3, hidden: true }));
  const pub = F.piece({ ...BIG, h: tall ? 860 : 660, at: 'l086', out: 'l087', exit: 'cut', layers: pl2 });
  pub.L('su').slideIn(T(q0) + 0.1, { dx: -500, dur: 0.5 }); pub.L('arm').slideIn(T(q0) + 0.1, { dx: -500, dur: 0.5, sfx: false });
  pp.forEach(([x, y], i) => {
    const a = T(q1) + 0.1 + i * 0.5; pub.L('np' + i).pop(a - 0.05, { from: 0.4, sfx: 'flip' }); pub.L('mo' + i).show(a);
    pub.L('arm').to({ rot: -70 }, { at: a, dur: 0.15, ease: 'outQuad' }).to({ rot: 0 }, { at: a + 0.3, dur: 0.25, ease: 'inOutCubic' });
    const mx = x + pw / 2 - 30 - (hand[0] - 30), my = y + ph2 * 0.62 - (hand[1] - 20), nt = pub.L('nt' + i);
    nt.show(a + 0.1).to({ x: [0, mx], rot: [0, 360] }, { at: a + 0.1, dur: 0.6, ease: 'linear' }).to({ y: [0, my] }, { at: a + 0.1, dur: 0.6, ease: 'inQuad' }).hide(a + 0.7);
    K.sfx('whoosh', a + 0.1, { db: -14 }); pub.L('hl' + i).slam(a + 0.72, { amp: 4, sfx: 'stamp', db: -12 }); pub.L('mo' + i).wiggle(a + 0.7);
  });
  karto.pose('present', { at: q0 }); karto.pose('point', { at: q1 }); karto.tilt({ deg: 5, at: q1 }); skip.pose('deadpan', { at: q0 }); skip.pose('shocked', { at: T(q1) + 1.0 });

  /* ---- l087: parliament with speech spikes + BAN? sign; the shop shelf is still empty (COMING SOON) ---- */
  karto.tilt({ deg: 0, at: 'l087' });
  const r0 = s('l087', 0, 0), r1 = s('l087', 1, 0);
  const pk = tall ? { p: [0, 10, 900, 546], sg: [560, 330, 320, 190], sh: [0, 600, 900, 260], cd: [290, 575, 320, 120] } : { p: [10, 20, 640, 388], sg: [620, 240, 270, 160], sh: [0, 440, 900, 230], cd: [300, 420, 300, 112] };
  const pl3 = [{ id: 'tk', svg: A6.tick(), x: 330, y: tall ? 200 : 150, w: 240, h: 240, edge: 4, hidden: true }];
  [0, 1, 2].forEach((i) => pl3.push({ id: 'n' + i, art: 'newspaper', x: [80, 600, 330][i], y: [60, 40, 380][i], w: 150, h: 189, paper: true, edge: 3, hidden: true, rot: [-10, 8, 3][i], idle: { rot: 3, f: 0.7, ph: i } }));
  pl3.push({ id: 'par', art: 'parliament', x: pk.p[0], y: pk.p[1], w: pk.p[2], h: pk.p[3], edge: 6, hidden: true, idle: { y: 3, f: 0.5 } });
  [[20, 0], [330, -6], [610, 20]].forEach(([x, y], i) => pl3.push({ id: 'sp' + i, svg: A6.spikes(), x: tall ? [0, 330, 650][i] : x, y: tall ? [0, 0, 40][i] : y, w: tall ? 250 : 200, h: tall ? 203 : 162, edge: 4, hidden: true, rot: [-8, 4, 10][i], idle: { sc: 0.07, f: 1.3 + i * 0.2, ph: i } }));
  pl3.push({ id: 'stk', svg: A6.stickPost(), x: pk.sg[0] + pk.sg[2] / 2 - 20, y: pk.sg[1] + pk.sg[3] - 30, w: 40, h: 120, edge: 3, hidden: true },
    { id: 'ban', svg: A6.board({ w: pk.sg[2], h: pk.sg[3], col: '#FFD9CC' }), key: 'c07_ban', x: pk.sg[0], y: pk.sg[1], w: pk.sg[2], h: pk.sg[3], edge: 6, hidden: true, max: 90, color: '#B5260E', origin: '50% 100%', idle: { rot: 1.2, f: 0.6 } },
    { id: 'shf', svg: A6.shelf(), x: pk.sh[0], y: pk.sh[1], w: pk.sh[2], h: pk.sh[3], edge: 5, hidden: true },
    { id: 'soon', svg: A6.soonCard(), key: 'c07_soon', x: pk.cd[0], y: pk.cd[1], w: pk.cd[2], h: pk.cd[3], edge: 4, hidden: true, max: tall ? 40 : 34, lines: 2, color: COL.verm, origin: '50% 0%', idle: { rot: 3, f: 0.5 } });
  const par = F.piece({ ...BIG, h: tall ? 860 : 660, at: 'l087', out: 'l089', exit: 'cut', layers: pl3 });
  par.L('tk').pop(T(r0) + 0.05, { from: 0.3, sfx: 'chime', db: -10 }); par.L('tk').hide(r1);
  [0, 1, 2].forEach((i) => par.L('n' + i).pop(T(r0) + 0.15 + i * 0.2, { from: 0.3 })); [0, 1, 2].forEach((i) => par.L('n' + i).hide(r1));
  par.L('par').drop(r1, { dy: 520, sfx: 'thud', db: -6 }); cam.shake(T(r1) + 0.22, { amp: 7 });
  [0, 1, 2].forEach((i) => par.L('sp' + i).pop(T(r1) + 0.55 + i * 0.15, { from: 0.3, sfx: i ? false : 'hit', db: -10 }));
  par.L('stk').show(T(r1) + 1.0); par.L('ban').pop(T(r1) + 1.0, { from: 0.3, sfx: 'stamp', db: -10 });
  par.L('shf').slideIn(T(r1) + 1.5, { dy: 300, dur: 0.5, sfx: 'slide' }); par.L('soon').drop(T(r1) + 1.9, { dy: 300, dur: 0.5, sfx: 'tap' });
  karto.pose('cheer', { at: r0 }); karto.hop({ at: T(r0) + 0.1 }); karto.pose('point', { at: r1 }); skip.pose('thinking', { at: r0 }); skip.pose('thinking', { at: r1 });

  /* ---- l088: "And then everybody bought it." Skip deadpan; the BAN? sign topples ---- */
  skip.pose('deadpan', { at: 'l088' }); karto.pose('laughing', { at: 'l088:0.2' });
  par.L('ban').to({ rot: 85, y: 150 }, { at: 'l088:0.35', dur: 0.5, ease: 'inQuad' }); par.L('stk').to({ rot: 85, y: 150, x: -20 }, { at: 'l088:0.35', dur: 0.5, ease: 'inQuad' }); K.sfx('thud', T('l088:0.35') + 0.45, { db: -6 });
  for (let i = 0; i < 3; i++) par.L('sp' + i).fade(T('l088:0.3') + i * 0.1, { to: 0, dur: 0.3 });

  /* ---- l089: everybody queues (coins) -> the loop machine TV -> newspapers -> shop queue -> money, years flip ---- */
  const u0 = s('l089', 0, 0), u1 = s('l089', 1, 0), u2 = s('l089', 2, 0), u3 = s('l089', 3, 0), uEnd = K.line('l089').t1;
  karto.pose('present', { at: u0 }); karto.nod({ at: T(u0) + 0.2 }); skip.pose('neutral', { at: u0, sfx: false });
  const qh = [];
  heads(qh, 5, tall ? 20 : 0, tall ? 600 : 400, HEAD_COLS, { id: 'qq', rows: 1, expr: 'happy', look: 1, seed: 2, hidden: true, gap: tall ? 150 : 112, w: tall ? 170 : 135, h: tall ? 204 : 162 });
  const rg = tall ? [300, 100, 580, 474] : [540, 150, 360, 295];
  const ql = [{ id: 'reg', art: 'register', x: rg[0], y: rg[1], w: rg[2], h: rg[3], edge: 6 }, ...qh];
  [0, 1, 2, 3].forEach((i) => ql.push({ id: 'cn' + i, svg: A6.token(), x: rg[0] + rg[2] * 0.3 + i * 40, y: rg[1] - 20, w: 70, h: 70, edge: 3, hidden: true }));
  const que = F.piece({ ...BIG, h: tall ? 860 : 660, at: u0, out: u1, exit: 'cut', layers: ql });
  que.L('reg').slideIn(u0, { dx: 600, dur: 0.45, sfx: 'slide' });
  for (let i = 0; i < 5; i++) que.L('qq' + (2 + i)).slideIn(T(u0) + 0.15 + i * 0.13, { dx: -700, dur: 0.45, sfx: i ? false : 'whoosh' });
  [0, 1, 2, 3].forEach((i) => { const a = T(u0) + 0.6 + i * 0.3; que.L('cn' + i).show(a).to({ y: [0, -140], op: [1, 0] }, { at: a, dur: 0.6, ease: 'outCubic' }); K.sfx('coin', a, { db: -10 }); });
  // the loop machine
  const nd = tall ? { tv: [20, 40, 300, 269], nw: [570, 20, 300, 378], qu: [560, 560, 300, 150], cn: [20, 560, 300, 300], sg: [235, 372, 255, 191] } : { tv: [20, 30, 250, 224], nw: [680, 10, 190, 240], qu: [610, 420, 290, 120], cn: [30, 400, 190, 190], sg: [290, 215, 320, 240] };
  const ctr = (b) => [b[0] + b[2] / 2, b[1] + b[3] / 2], cs4 = [ctr(nd.tv), ctr(nd.nw), [nd.qu[0] + 150, nd.qu[1] + 60], ctr(nd.cn)];
  const ml = [{ id: 'tv', art: 'tvIcon', x: nd.tv[0], y: nd.tv[1], w: nd.tv[2], h: nd.tv[3], edge: 5, hidden: true, idle: { sc: 0.03, f: 1.2 } },
    { id: 'tvl', key: 'c07_n_tv', x: nd.tv[0] - 10, y: nd.tv[1] + nd.tv[3] + 4, w: nd.tv[2] + 20, h: 52, max: 38, color: COL.black, hidden: true },
    { id: 'nw', art: 'newspaper', x: nd.nw[0], y: nd.nw[1], w: nd.nw[2], h: nd.nw[3], paper: true, edge: 3, hidden: true, idle: { rot: 2, f: 0.7 } },
    { id: 'nwl', key: 'c07_n_news', x: nd.nw[0] - 30, y: nd.nw[1] + nd.nw[3] + 4, w: nd.nw[2] + 60, h: 52, max: 38, color: COL.black, hidden: true },
    { id: 'cn', art: 'coin', x: nd.cn[0], y: nd.cn[1], w: nd.cn[2], h: nd.cn[3], edge: 5, hidden: true, idle: { rot: 6, f: 0.8 } },
    { id: 'cnl', key: 'c07_n_coin', x: nd.cn[0] - 10, y: nd.cn[1] + nd.cn[3] + 4, w: nd.cn[2] + 20, h: 52, max: 38, color: COL.black, hidden: true }];
  for (let i = 0; i < 3; i++) ml.push({ id: 'qm' + i, art: 'head', ao: { expr: 'happy', col: HEAD_COLS[(i * 3) % 8] }, x: nd.qu[0] + i * 95, y: nd.qu[1], w: 90, h: 108, paper: true, edge: 3, hidden: true, idle: { y: 4, f: 1 + i * 0.2, ph: i } });
  ml.push({ id: 'qul', key: 'c07_n_shop', x: nd.qu[0] - 10, y: nd.qu[1] + 112, w: 310, h: 52, max: 38, color: COL.black, hidden: true });
  const arP = tall ? [[445, 170, 0], [720, 500, 90], [430, 690, 180], [170, 460, 270]] : [[475, 100, 0], [775, 365, 90], [440, 490, 180], [145, 353, 270]];
  arP.forEach(([ax, ay, ang], i) => ml.push({ id: 'ar' + i, svg: A6.arrowR(), x: ax - 55, y: ay - 32, w: 110, h: 64, edge: 4, hidden: true, rot: ang }));
  const years = [1997, 2001, 2004, 2008, 2013, 2026], yA = T(u1), yB = uEnd;
  ml.push({ id: 'sg', art: 'sign', text: K.digit('1997'), x: nd.sg[0], y: nd.sg[1], w: nd.sg[2], h: nd.sg[3], edge: 6, hidden: true, max: 110, color: '#3B2A18', tcss: { transform: 'translateY(-30%)' }, textAt: (t) => K.digit(String(years[Math.min(5, Math.max(0, Math.floor(((t - yA) / (yB - yA)) * 6)))])), idle: { rot: 1.5, f: 0.5 } });
  ml.push({ id: 'tok', svg: A6.token(), x: cs4[0][0] - 40, y: cs4[0][1] - 40, w: 80, h: 80, edge: 4, hidden: true,
    paint: (t, Lr, Pc) => { const lap = 3.6, f = ((((t - yA) / lap) % 1) + 1) % 1, i = Math.floor(f * 4), u = f * 4 - i, e = u * u * (3 - 2 * u), a = cs4[i], b = cs4[(i + 1) % 4]; Lr.el.style.transform = `translate(${((a[0] + (b[0] - a[0]) * e - cs4[0][0]) * Pc.k).toFixed(1)}px,${((a[1] + (b[1] - a[1]) * e - cs4[0][1]) * Pc.k).toFixed(1)}px) rotate(${(t * 240) % 360}deg)`; } });
  ml.push({ id: 'bst', art: 'burst', x: nd.tv[0] + nd.tv[2] - 30, y: nd.tv[1] - 20, w: 120, h: 107, edge: 4, hidden: true, idle: { rot: 10, f: 1.5 } },
    { id: 'thx', svg: A6.board({ w: tall ? 235 : 350, h: tall ? 150 : 115, col: '#FFFDF6' }), key: 'c07_thanks', x: tall ? 325 : 250, y: tall ? 700 : 540, w: tall ? 235 : 350, h: tall ? 150 : 115, edge: 5, hidden: true, max: tall ? 34 : 40, lines: 2, color: '#1E5E2A', rot: -4 });
  const mach = F.piece({ ...BIG, h: tall ? 860 : 660, at: u1, out: 'l090', exit: 'cut', layers: ml });
  const showAll = (ids, a, gap) => ids.forEach((id, i) => mach.L(id).pop(T(a) + i * gap, { from: 0.4, sfx: i % 2 ? false : 'pop', db: -12 }));
  showAll(['tv', 'tvl'], u1, 0.06); showAll(['nw', 'nwl'], T(u1) + 0.25, 0.06); showAll(['qm0', 'qm1', 'qm2', 'qul'], T(u1) + 0.5, 0.06); showAll(['cn', 'cnl'], T(u1) + 0.75, 0.06);
  ['ar0', 'ar1', 'ar2', 'ar3'].forEach((id, i) => mach.L(id).pop(T(u1) + 1.0 + i * 0.12, { from: 0.4, sfx: false })); mach.L('sg').pop(T(u1) + 1.3, { from: 0.4, sfx: 'chime', db: -12 }); mach.L('tok').show(T(u1) + 1.5);
  mach.L('bst').pop(T(u2) + 0.1, { from: 0.4, sfx: 'hit', db: -8 }); mach.L('tv').wiggle(T(u2) + 0.1); cam.shake(T(u2) + 0.15, { amp: 6 });
  mach.L('bst').hide(u3); mach.L('thx').pop(T(u3) + 0.1, { from: 0.3, sfx: 'boing' }); for (let i = 0; i < 3; i++) mach.L('qm' + i).wiggle(T(u3) + 0.1 + i * 0.05);
  karto.pose('deadpan', { at: u1 }); karto.pose('shocked', { at: u2 }); karto.pose('laughing', { at: u3 }); skip.pose('deadpan', { at: u3 });

  /* ---- l090: calm. A pile of study papers, a magnifying glass; the scale does not tip; NOT ENOUGH EVIDENCE ---- */
  cam.reset({ at: 'l090', dur: 0.4 }); karto.pose('neutral', { at: 'l090', sfx: false }); skip.pose('neutral', { at: 'l090', sfx: false });
  const w0 = s('l090', 0, 0), w1 = s('l090', 1, 0);
  const sp = [];
  if (tall) {
    sp.push({ id: 'yl', svg: A6.board({ w: 300, h: 150, col: '#FFFDF6' }), key: 'c07_years20', x: 10, y: 120, w: 300, h: 150, edge: 5, hidden: true, max: 60, color: COL.blue, lines: 2, rot: -3 });
    for (let i = 0; i < 6; i++) sp.push({ id: 'pa' + i, svg: A6.studyPaper(), x: 340 + (i % 3) * 190, y: 20 + Math.floor(i / 3) * 190, w: 180, h: 240, edge: 3, paper: true, hidden: true, rot: ((i * 7) % 11) - 5 });
    sp.push({ id: 'mg', svg: A6.magnifier(), x: 450, y: 110, w: 200, h: 235, edge: 4, hidden: true, idle: { x: 90, y: 20, rot: 10, f: 0.35 } });
  } else {
    sp.push({ id: 'yl', svg: A6.board({ w: 420, h: 130, col: '#FFFDF6' }), key: 'c07_years20', x: 20, y: 0, w: 420, h: 130, edge: 5, hidden: true, max: 74, color: COL.blue, rot: -3 });
    for (let i = 0; i < 6; i++) sp.push({ id: 'pa' + i, svg: A6.studyPaper(), x: i < 3 ? i * 150 : 60 + (i - 3) * 160, y: i < 3 ? 380 : 170, w: 190, h: 253, edge: 3, paper: true, hidden: true, rot: ((i * 7) % 11) - 5 });
    sp.push({ id: 'mg', svg: A6.magnifier(), x: 130, y: 250, w: 210, h: 247, edge: 4, hidden: true, idle: { x: 70, y: 40, rot: 10, f: 0.35 } });
  }
  const stdy = F.piece({ slot: tall ? B(0, 0, 1, 0.47) : B(0, 0, 0.5, 1), fit: 0.97, w: tall ? 900 : 460, h: tall ? 400 : 660, at: w0, out: 'l091', exit: 'cut', enter: 'none', layers: sp });
  stdy.L('yl').pop(T(w0) + 0.2, { from: 0.4 }); for (let i = 0; i < 6; i++) stdy.L('pa' + i).pop(T(w0) + 0.4 + i * 0.5, { from: 0.4, sfx: 'rustle', db: -12 }); stdy.L('mg').slideIn(T(w0) + 1.2, { dy: -300, dur: 0.7, ease: 'outCubic', sfx: 'slide' });
  const tsc = T(w1) + 0.1, theta = (t) => (t < tsc ? 7 * Math.sin(t * 3) * clamp((t - T(w1) + 0.4) / 0.4, 0, 1) : 5 * Math.exp(-(t - tsc) * 2.2) * Math.sin((t - tsc) * 8));
  const bxs = F._boxLayers(K.digit('6'), -3, 90, 78, 100, { pal: 'six' });
  const scl = scaleLayers(theta, [{ side: -1, ...bxs[0], id: 'ib' }, { side: -1, ...bxs[1], id: 'ibn' }, { side: 1, id: 'iq', art: 'qmark', x: 340, y: 84, w: 66, h: 94, edge: 3 }].map((l) => ({ ...l, hidden: true })));
  const sc7 = F.piece({ slot: tall ? B(0, 0.47, 1, 0.53) : B(0.46, 0.1, 0.54, 0.8), fit: 0.97, w: 500, h: 340, at: w1, out: 'l091', exit: 'cut', enter: 'rise', layers: scl });
  ['ib', 'ibn', 'iq'].forEach((id, i) => sc7.L(id).pop(T(w1) + 0.45 + (i ? 0.2 : 0), { from: 0.3, sfx: i ? false : 'tap', db: -10 }));
  F.tapeNote([sc7, 0.5, 0.62], 'not_enough', T(w1) + 1.6, { out: 'l091', w: tall ? 520 : 420 });
  karto.pose('present', { at: w0 }); karto.pose('point', { at: w1 });

  /* ---- l091: the '6' box turns to show a plain age badge; the mum nods ---- */
  cam.reset({ at: 'l091', dur: 0.3 });
  const v0 = s('l091', 0, 0), v1 = s('l091', 1, 0), v2 = s('l091', 2, 0);
  const bxl = F._boxLayers(K.digit('6'), 40, 20, 290, 374, { pal: 'six' }).map((l, i) => ({ ...l, id: i ? 'bn' : 'bx' }));
  const age = rtl ? '⁦+' + K.digit('18') + '⁩' : K.digit('17+') + ' / ' + K.digit('18+'); // Arabic: one rating (+18), plus sign kept in front with an isolate
  const bl2 = [...bxl, { id: 'bb', svg: A6.boxBack(), x: 40, y: 20, w: 290, h: 374, edge: 8, hidden: true },
    { id: 'bd', svg: A6.ageBadge(), text: age, x: 100, y: 120, w: 190, h: 190, edge: 5, hidden: true, max: 50, lines: 2, color: COL.black, tcss: { direction: 'ltr' } },
    { id: 'lab', svg: A6.board({ w: 380, h: 110, col: '#FFFDF6' }), key: 'c07_onbox', x: 0, y: 440, w: 380, h: 110, edge: 5, hidden: true, max: 56, color: COL.verm, rot: -3 }];
  const bx7 = F.piece({ slot: tall ? B(0, 0.02, 0.62, 0.96) : B(0, 0, 0.56, 1), fit: 0.97, w: 380, h: 580, at: v0, out: 'l093', exit: 'cut', enter: 'drop', layers: bl2 });
  bx7.L('bb').set({ sx: 0.001 }, 0); bx7.L('bd').set({ sx: 0.001 }, 0);
  for (const id of ['bx', 'bn']) bx7.L(id).to({ sx: [1, 0.001] }, { at: v1, dur: 0.25, ease: 'inQuad' });
  for (const id of ['bb', 'bd']) bx7.L(id).show(T(v1) + 0.25).to({ sx: [0.001, 1] }, { at: T(v1) + 0.25, dur: 0.3, ease: 'outBack' });
  K.sfx('flip', v1, { db: -8 }); bx7.L('lab').pop(T(v1) + 0.6, { from: 0.4 });
  const mm = F.piece({ slot: tall ? B(0.45, 0.02, 0.55, 0.96) : B(0.52, 0, 0.48, 1), fit: 0.97, w: 300, h: 600, at: v2, out: 'l093', exit: 'cut', enter: 'none', idle: { rot: 2.2, y: 6, f: 1.3 }, layers: [
    { id: 'body', svg: A6.mumBody(), x: 0, y: 140, w: 260, h: 460, edge: 6, paper: true }, { id: 'arm', svg: A6.mumArmDown(), x: 196, y: 330, w: 80, h: 190, edge: 4, paper: true },
    { id: 'ok', svg: A6.tick(), x: 90, y: 20, w: 130, h: 130, edge: 4, hidden: true }] });
  mm.L('body').slideIn(v2, { dx: 500, dur: 0.5 }); mm.L('arm').slideIn(v2, { dx: 500, dur: 0.5, sfx: false }); mm.L('ok').pop(T(v2) + 0.7, { from: 0.3, sfx: 'chime', db: -10 });
  karto.pose('present', { at: v0 }); karto.pose('point', { at: v1 }); karto.pose('laughing', { at: v2 }); skip.pose('neutral', { at: v0, sfx: false }); skip.pose('thinking', { at: v2 });

  /* ---- l092: Skip whispers; STAMP 7 slams, confetti ---- */
  skip.pose('whisper', { at: 'l092' }); skip.tilt({ deg: -8, at: 'l092' }); karto.pose('cheer', { at: 'l092:0.5' }); karto.hop({ at: 'l092:0.6' });
  F.stamp(7, 'l092:0.3');
  P.confetti({ at: T('l092:0.3') + 0.62, dur: 2.4 });
}
