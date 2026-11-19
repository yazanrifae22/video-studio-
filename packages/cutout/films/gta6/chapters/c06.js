// c06 - piece 6: the price (l070-l081, ~75 s). Wry, fast. Short s4 = l070-l076 (tall): every board piece is built to fill the 872x840 board.
// Three fights = three clearly different boards: (1) two wooden signs held up by paper crowds, (2) 30 | 60 score signs + a sweating console,
// (3) a row of consoles with boxes, the PC gets an hourglass. Flip books at l076 animate their flip rate for real (paint callbacks, pure functions of t).
import { A6, heads } from './c06.art.js';
import { COL, HEAD_COLS } from '../art.js';
import { clamp } from '../../../web/kit/core.js';

export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, hh) => ({ in: 'board', x, y, w, h: hh });
  const Q = rtl ? '؟' : '?';
  const H6 = tall ? 860 : 660;
  F.chapterOpen('c06');

  /* ---- l070: price tags on a string: $60 drops, then $70 swings in ---- */
  const tw = tall ? 420 : 410, th = tall ? 574 : 560, ty = tall ? 130 : 80, tx0 = tall ? 20 : 30, tx1 = tall ? 460 : 460;
  const tagText = (v) => ({ text: F.money(v), max: 120, lines: 2, color: '#B5260E', tcss: { transform: 'translateY(16%)' } });
  const line = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: s('l070', 1, 0.35), out: 'l071', exit: 'cut', enter: 'rise', layers: [
    { id: 'rope', svg: A6.rope(), x: 0, y: tall ? 60 : 30, w: 900, h: 120, edge: 3 },
    { id: 't60', svg: A6.hangTag(), ...tagText(60), x: tx0, y: ty, w: tw, h: th, origin: '50% 0%', hidden: true, idle: { rot: 3, f: 0.5 } },
    { id: 't70', svg: A6.hangTag(), ...tagText(70), x: tx1, y: ty, w: tw, h: th, origin: '50% 0%', hidden: true, idle: { rot: 3, f: 0.42, ph: 1 } }] });
  line.L('t60').drop(s('l070', 2, 0.05), { dy: 520 });
  const sw70 = s('l070', 3, 0.02);
  line.L('t70').show(sw70).to({ rot: [78, 0] }, { at: sw70, dur: 0.8, ease: 'back(1.7)' }); K.sfx('whoosh', sw70, { db: -8 }); K.sfx('tap', T(sw70) + 0.55, { db: -8 });
  karto.pose('present', { at: 'l070:0.3' }); skip.pose('neutral', { at: 'l070', sfx: false });
  cam.to({ zoom: 1.06 }, { at: s('l070', 2), dur: 3, ease: 'inOutSine' });

  /* ---- l071: the big $79.99 tag drops with a thud on the '6' box ---- */
  cam.reset({ at: 'l071', dur: 0.3 });
  // the REAL cover (official box art, 4:5) as a taped photo; the $79.99 tag lands on its lower strip, below the logo
  const tg = tall ? [60, 600, 620, 255] : [190, 450, 410, 208];
  F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l071', out: 'l072', exit: 'cut', enter: 'none', layers: [
    { id: 'rays', svg: A6.rays(), x: 150, y: tall ? 100 : 0, w: tall ? 600 : 620, h: tall ? 600 : 620, flat: true, op: 0.9, idle: { rot: 6, f: 0.12 } }] });
  P.photo('assets/real/cover_box.jpg', { slot: tall ? B(0.04, 0, 0.92, 0.9) : B(0.14, 0, 0.72, 1), size: 1, push: 1, tape: 4, credit: 'cr_rockstar', at: 'l071', out: 'l072', enter: 'drop', exit: 'cut', tilt: -2 });
  const hit = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l071', out: 'l072', exit: 'cut', enter: 'none', layers: [
    { id: 'tag', svg: A6.tagBig(), text: rtl ? K.num(79.99, 2) + '$' : F.money(79.99, 2), x: tg[0], y: tg[1], w: tg[2], h: tg[3], max: tall ? 170 : rtl ? 100 : 150, color: '#B5260E', hidden: true, rot: -6, tcss: { transform: 'translate(7%,10%)' }, idle: { rot: 1.2, f: 0.8 } }] });
  hit.L('tag').drop('l071:0.32', { dy: 700, dur: 0.45, sfx: 'thud', db: -4 }); cam.shake(T('l071:0.32') + 0.22, { amp: 11, dur: 0.35 });
  karto.pose('point', { at: 'l071' }); skip.pose('neutral', { at: 'l071', sfx: false });

  /* ---- l072: Skip shocked, paper wallet opens, a moth flies out ---- */
  skip.pose('shocked', { at: 'l072' }); skip.hop({ at: 'l072', h: 70 });
  const wl = tall ? [60, 330, 780, 520] : [110, 250, 640, 410], wf = [wl[0], wl[1] + (wl[3] / 200) * 52 - (wl[2] / 300) * 12, wl[2], (wl[2] / 300) * 100];
  const wal = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l072', out: 'l073', exit: 'cut', enter: 'none', layers: [
    { id: 'w', svg: A6.wallet(), x: wl[0], y: wl[1], w: wl[2], h: wl[3], edge: 6 },
    { id: 'moth', svg: A6.moth(), x: wl[0] + wl[2] * 0.3, y: wl[1] + wl[3] * 0.1, w: 190, h: 136, edge: 3, hidden: true, idle: { rot: 16, y: 6, f: 3.1 } },
    { id: 'flap', svg: A6.walletFlap(), x: wf[0], y: wf[1], w: wf[2], h: wf[3], edge: 6, origin: '50% 6%' },
    { id: 'p80', svg: A6.spiky(), text: F.money(80) + Q, x: tall ? 460 : 560, y: tall ? 30 : 10, w: tall ? 430 : 340, h: tall ? 255 : 200, edge: 6, hidden: true, max: tall ? 76 : 64, lines: 2, color: '#B5260E', idle: { rot: 4, sc: 0.04, f: 0.9 } }] });
  wal.L('w').drop('l072', { dy: 480, sfx: 'thud' });
  wal.L('p80').pop('l072:0.12', { from: 0.3, sfx: 'boing' });
  const opn = s('l072', 1, 0.05);
  wal.L('flap').to({ sy: -1 }, { at: opn, dur: 0.35, ease: 'back(2)' }); K.sfx('unfold', opn, { db: -8 });
  wal.L('moth').show(opn + 0.25).to({ x: tall ? -380 : -300, y: tall ? -560 : -420, sc: 1.5 }, { at: opn + 0.25, dur: 1.5, ease: 'outCubic' }).fade(opn + 1.3, { to: 0, dur: 0.3 });
  K.sfx('whoosh', opn + 0.3, { db: -10 }); K.sfx('rustle', opn + 0.3, { db: -12 });

  /* ---- l073: FIGHT 1 - two signs, two crowds ---- */
  const sx = tall ? 440 : 430, sy0 = tall ? 150 : 100, sh = tall ? 282 : 236;
  const f1 = [{ id: 'fb', svg: A6.badge(), key: 'c06_fight1', x: tall ? 230 : 250, y: 0, w: tall ? 440 : 400, h: tall ? 120 : 108, edge: 5, max: 78, color: '#FFFDF6', hidden: true },
    { id: 'stL', svg: A6.stickPost(), x: 205, y: sy0 + sh - 40, w: 40, h: tall ? 330 : 260, edge: 3, hidden: true }, { id: 'stR', svg: A6.stickPost(), x: 655, y: sy0 + sh - 40, w: 40, h: tall ? 330 : 260, edge: 3, hidden: true }];
  const rowsN = tall ? 3 : 2, hy0 = H6 - 195;
  heads(f1, 3, 10, hy0, HEAD_COLS, { id: 'hl', rows: rowsN, expr: 'happy', look: 1, seed: 1, hidden: true, gap: 150, rowGap: 105, w: 150, h: 182 });
  heads(f1, 3, 460, hy0, HEAD_COLS, { id: 'hr', rows: rowsN, expr: 'shout', look: -1, seed: 5, hidden: true, gap: 150, rowGap: 105, w: 150, h: 182 });
  f1.push({ id: 'sL', svg: A6.board({ w: sx, h: sh }), key: 'c06_cheap', x: 10, y: sy0, w: sx, h: sh, edge: 6, hidden: true, max: 62, lines: 3, color: '#3B2A18', idle: { rot: 1.2, f: 0.5 } },
    { id: 'sR', svg: A6.board({ w: sx, h: sh, col: '#FFD9CC' }), key: 'c06_every80', x: 460, y: sy0, w: sx, h: sh, edge: 6, hidden: true, max: 62, lines: 3, color: '#B5260E', idle: { rot: 1.2, f: 0.55, ph: 1 } },
    { id: 'bst', art: 'burst', x: 375, y: hy0 - (tall ? 215 : 125), w: 170, h: 152, edge: 4, hidden: true, idle: { rot: 8, f: 1.3 } });
  const fb1 = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l073', out: 'l074', exit: 'cut', enter: 'none', layers: f1 });
  const a1 = s('l073', 0, 0.05), a2 = s('l073', 1, 0.0), a3 = s('l073', 2, 0.0);
  fb1.L('fb').slam(a1, { amp: 5 });
  for (const sd of ['L', 'R']) {
    const at = sd === 'L' ? a2 : a3, st = 'st' + sd, sg = 's' + sd;
    fb1.L(st).show(at); fb1.L(sg).pop(at + 0.1, { from: 0.2, sfx: 'tap', db: -8 });
    for (let i = 0; i < 3 * rowsN; i++) fb1.L('h' + sd.toLowerCase() + ((sd === 'L' ? 1 : 5) + i)).slideIn(at + 0.04 * i, { dy: 380, dur: 0.4, sfx: i === 0 ? 'whoosh' : false });
  }
  fb1.L('bst').pop(T(a3) + 0.7, { sfx: 'hit', db: -8 }); cam.shake(T(a3) + 0.75, { amp: 6 });
  karto.pose('present', { at: 'l073' }); karto.pose('point', { at: a2 }); karto.pose('whisper', { at: a3 }); karto.tilt({ deg: 5, at: a3 });
  skip.pose('neutral', { at: 'l073', sfx: false }); skip.pose('thinking', { at: a3 });
  cam.to({ x: -30, zoom: 1.06 }, { at: a2, dur: 2.2, ease: 'inOutSine' }); cam.to({ x: 30 }, { at: a3, dur: 2.2, ease: 'inOutSine' });

  /* ---- l074: FIGHT 2 - SMOOTHNESS, 30 | 60 signs, 60 crossed out, CONFIRMED: 30, the sweating PRO console ---- */
  cam.reset({ at: 'l074', dur: 0.4 }); karto.tilt({ deg: 0, at: 'l074' });
  const pw = tall ? 420 : 430, ph = tall ? 430 : 250, py = tall ? 150 : 125, cn = tall ? [220, 560, 460, 265] : [190, 370, 520, 300];
  const f2 = [{ id: 'fb', svg: A6.badge({ col: COL.blue }), key: 'c06_fight2', x: tall ? 230 : 250, y: 0, w: tall ? 440 : 400, h: tall ? 120 : 108, edge: 5, max: 78, color: '#FFFDF6', hidden: true },
    { id: 'smo', svg: A6.board({ w: 780, h: tall ? 380 : 250, col: '#FFE9A8' }), key: 'c06_smooth', x: 60, y: tall ? 190 : 140, w: 780, h: tall ? 380 : 250, edge: 6, hidden: true, max: tall ? 120 : 110, color: COL.black, idle: { rot: 0.8, f: 0.5 } },
    { id: 'p30', svg: A6.board({ w: pw, h: ph, col: '#CFE9C0' }), text: K.digit('30'), x: 15, y: py, w: pw, h: ph, edge: 6, hidden: true, max: tall ? 250 : 190, color: '#1E5E2A', tcss: { transform: 'translateY(-12%)' } },
    { id: 'u30', key: 'c06_fps', x: 15 + pw * 0.25, y: py + ph * 0.7, w: pw * 0.5, h: ph * 0.2, max: 50, color: '#1E5E2A', hidden: true },
    { id: 'p60', svg: A6.board({ w: pw, h: ph, col: '#FFD9CC' }), text: K.digit('60'), x: 455, y: py, w: pw, h: ph, edge: 6, hidden: true, max: tall ? 250 : 190, color: '#B5260E', tcss: { transform: 'translateY(-12%)' } },
    { id: 'u60', key: 'c06_fps', x: 455 + pw * 0.25, y: py + ph * 0.7, w: pw * 0.5, h: ph * 0.2, max: 50, color: '#B5260E', hidden: true },
    { id: 'x60', svg: A6.cross(), x: 455 + pw * 0.04, y: py + ph * 0.02, w: pw * 0.92, h: ph * 0.96, edge: 2, hidden: true },
    { id: 'con', svg: A6.cons(), x: cn[0], y: cn[1], w: cn[2], h: cn[3], edge: 6, hidden: true, idle: { y: 3, f: 0.7 } },
    { id: 'cof', svg: A6.consoleFace(), x: cn[0], y: cn[1], w: cn[2], h: cn[3], flat: true, hidden: true, idle: { y: 3, f: 0.7 } },
    { id: 'rib', svg: A6.ribbon(), key: 'c06_pro', x: cn[0] + cn[2] * 0.58, y: cn[1] + cn[3] * 0.0, w: cn[2] * 0.5, h: cn[2] * 0.15, edge: 4, hidden: true, max: 44, color: '#FFFDF6', rot: 8 },
    { id: 'swt', svg: A6.sweat(), x: cn[0] + cn[2] * 0.8, y: cn[1] + cn[3] * 0.05, w: cn[2] * 0.12, h: cn[2] * 0.19, edge: 3, hidden: true, idle: { y: 10, f: 1.1 } },
    { id: 'stp', stamp: 'confirmed30', x: tall ? 90 : 130, y: tall ? 330 : 250, w: tall ? 720 : 640, h: tall ? 240 : 200, hidden: true, rot: -9, max: 90 }];
  const fb2 = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l074', out: 'l075', exit: 'cut', enter: 'none', layers: f2 });
  const b0 = s('l074', 0, 0.05), b1 = s('l074', 1, 0.0), b2 = s('l074', 2, 0.0), b3 = s('l074', 3, 0.0), b4 = s('l074', 4, 0.0);
  fb2.L('fb').slam(b0, { amp: 5 }); fb2.L('smo').pop(T(b1) + 0.05, { from: 0.3 }); fb2.L('smo').hide(b2);
  fb2.L('p60').pop(T(b2) + 0.05, { from: 0.3 }); fb2.L('u60').show(T(b2) + 0.2);
  fb2.L('p30').pop(T(b3) + 0.05, { from: 0.3 }); fb2.L('u30').show(T(b3) + 0.2);
  fb2.L('x60').show(T(b3) + 0.5).to({ sx: [0.05, 1] }, { at: T(b3) + 0.5, dur: 0.22, ease: 'outQuad' }); K.sfx('scratch', T(b3) + 0.5, { db: -6 });
  fb2.L('stp').slam(T(b3) + 1.0, { amp: 9 });
  for (const id of ['con', 'cof']) fb2.L(id).slideIn(b4, { dy: 460, dur: 0.5, sfx: id === 'con' ? 'slide' : false });
  fb2.L('rib').pop(T(b4) + 0.5, { from: 0.4 }); fb2.L('swt').pop(T(b4) + 0.9, { from: 0.3, sfx: 'boing' });
  fb2.L('stp').hide(T(b4) + 0.05);
  karto.pose('present', { at: 'l074' }); karto.pose('point', { at: b2 }); karto.pose('deadpan', { at: b3 }); skip.pose('thinking', { at: b4 });
  cam.to({ zoom: 1.05 }, { at: b4, dur: 3, ease: 'inOutSine' });

  /* ---- l075: Skip skeptical: film strips + FRAMES? ---- */
  cam.reset({ at: 'l075', dur: 0.3 });
  skip.pose('deadpan', { at: 'l075' }); skip.tilt({ deg: -8, at: 'l075:0.2' }); karto.pose('neutral', { at: 'l075', sfx: false });
  const f3 = [{ id: 's1', svg: A6.filmStrip(), x: 10, y: tall ? 60 : 20, w: 880, h: 206, edge: 5, rot: -3, hidden: true, idle: { x: 8, f: 0.4 } },
    ...(tall ? [{ id: 's2', svg: A6.filmStrip(), x: 10, y: 300, w: 880, h: 206, edge: 5, rot: 3, hidden: true, idle: { x: -8, f: 0.35 } }] : []),
    { id: 'lb', svg: A6.board({ w: 600, h: tall ? 300 : 260, col: '#FFFDF6' }), key: 'c06_frames', x: 40, y: tall ? 540 : 300, w: 600, h: tall ? 300 : 260, edge: 6, hidden: true, max: 110, color: COL.verm, idle: { rot: 1, f: 0.6 } },
    { id: 'q', art: 'qmark', x: 660, y: tall ? 540 : 270, w: tall ? 220 : 200, h: tall ? 314 : 286, edge: 4, hidden: true, idle: { rot: 6, f: 0.9 } }];
  const fm = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: tall ? 860 : 600, at: 'l075', out: 'l076', exit: 'cut', enter: 'none', layers: f3 });
  fm.L('s1').slideIn('l075', { dx: -700, dur: 0.5 }); if (tall) fm.L('s2').slideIn('l075:0.12', { dx: 700, dur: 0.5, sfx: false });
  fm.L('lb').pop('l075:0.3', { from: 0.3 }); fm.L('q').pop('l075:0.55', { from: 0.3, sfx: 'boing' });

  /* ---- l076: two flip books (30 choppy, 60 smooth), butter slides under the smooth one; then the PRO console promises butter ---- */
  const d0 = s('l076', 0, 0), d1 = s('l076', 1, 0), d2 = s('l076', 2, 0), d3 = s('l076', 3, 0), d4 = s('l076', 4, 0);
  const lap = 2.2; // seconds per page-turn cycle; the left book makes 6 jumps per cycle, the right one 12 (the same 1 : 2 as 30 : 60)
  const book = (n, lb, withButter) => {
    const bw = tall ? 540 : 520, bhh = tall ? 400 : 400, lx = tall ? 340 : 0, wTall = tall ? 900 : 520, hTall = tall ? 420 : 700, by0 = tall ? 10 : 150;
    const layers = [
      { id: 'num', text: K.digit(String(lb)), x: tall ? 10 : 0, y: tall ? 0 : 0, w: tall ? 300 : 300, h: tall ? 210 : 150, max: 200, color: lb === 30 ? '#1E5E2A' : '#B5260E', hidden: true },
      { id: 'fps', key: 'c06_fps', x: tall ? 10 : 290, y: tall ? 205 : 20, w: tall ? 300 : 230, h: tall ? 90 : 110, max: 70, color: COL.black, hidden: true },
      { id: 'bk', svg: A6.book(), x: lx, y: by0, w: bw, h: bhh, paper: true, edge: 4 },
      { id: 'rd', svg: A6.lineBar(), x: lx + bw * 0.08, y: by0 + bhh * 0.62, w: bw * 0.84, h: 16, flat: true, op: 0.55 },
      { id: 'pg', svg: [10, 10, `<rect x="0" y="0" width="10" height="10" fill="#FFFDF6" stroke="#1E1712" stroke-width="0.6"/>`], x: lx + bw * 0.02, y: by0 + bhh * 0.035, w: bw * 0.94, h: bhh * 0.75, origin: '0% 50%', flat: true, op: 0.95,
        paint: (t, Lr, Pc) => { const cyc = (t / lap) % 1, ph = (cyc * n) % 1, ang = (Math.PI / 2) * clamp(ph / 0.5, 0, 1); Lr.el.style.transform = `scale(${Math.cos(ang).toFixed(3)},1)`; Lr.el.style.opacity = ph < 0.5 ? 0.95 : 0; } },
      { id: 'car', art: 'car', x: lx + bw * 0.1, y: by0 + bhh * 0.3, w: bw * 0.36, h: bw * 0.2, edge: 3,
        paint: (t, Lr, Pc) => { const cyc = (t / lap) % 1, i = Math.floor(cyc * n), x = (i / (n - 1)) * bw * 0.4 * Pc.k; Lr.el.style.transform = `translate(${x.toFixed(1)}px,0)`; } }];
    if (withButter) layers.push({ id: 'bt', svg: A6.butter(), x: tall ? 20 : 60, y: tall ? 305 : 560, w: tall ? 300 : 400, h: tall ? 112 : 150, edge: 5, hidden: true, idle: { x: tall ? 16 : 24, f: 0.45 } });
    else layers.push({ id: 'tk', svg: A6.tick(), x: tall ? 230 : 200, y: tall ? 215 : 570, w: tall ? 90 : 120, h: tall ? 90 : 120, edge: 3, hidden: true });
    return { wTall, hTall, layers };
  };
  const bl = book(6, 30, false), br = book(12, 60, true);
  const bkL = F.piece({ slot: tall ? B(0, 0, 1, 0.5) : B(0, 0, 0.5, 1), fit: 0.99, w: bl.wTall, h: bl.hTall, at: d1, out: d4, exit: 'cut', enter: 'none', layers: bl.layers });
  const bkR = F.piece({ slot: tall ? B(0, 0.5, 1, 0.5) : B(0.5, 0, 0.5, 1), fit: 0.99, w: br.wTall, h: br.hTall, at: T(d1) + 0.2, out: d4, exit: 'cut', enter: 'none', layers: br.layers });
  bkL.L('bk').slideIn(d1, { dx: -600, dur: 0.5 }); bkR.L('bk').slideIn(T(d1) + 0.2, { dx: 600, dur: 0.5, sfx: false });
  for (const id of ['rd', 'pg', 'car']) { bkL.L(id).slideIn(d1, { dx: -600, dur: 0.5, sfx: false }); bkR.L(id).slideIn(T(d1) + 0.2, { dx: 600, dur: 0.5, sfx: false }); }
  K.sfx('flip', T(d1) + 0.5, { db: -8 });
  bkL.L('num').pop(d2, { from: 0.3 }); bkL.L('fps').show(T(d2) + 0.15); bkL.L('tk').pop(T(d2) + 0.6, { from: 0.3, sfx: 'chime', db: -14 });
  bkR.L('num').pop(d3, { from: 0.3 }); bkR.L('fps').show(T(d3) + 0.15);
  bkR.L('bt').slideIn(T(d3) + 0.45, { dx: tall ? -700 : -520, dur: 0.8, ease: 'outCubic', sfx: 'slide-long' });
  P.label('c06_butter', { slot: tall ? B(0.45, 0.88, 0.5, 0.12) : B(0.55, 0.9, 0.4, 0.1), size: 'm', stock: 'yellow', tape: true, at: T(d3) + 1.0, out: d4 });
  // s5: the console that promises butter
  const cb = [{ id: 'bt', svg: A6.butter(), x: 250, y: tall ? 60 : 20, w: tall ? 440 : 400, h: tall ? 165 : 150, edge: 5, idle: { y: 12, rot: 3, f: 0.6 } },
    { id: 'con', svg: A6.cons(), x: tall ? 160 : 190, y: tall ? 300 : 190, w: tall ? 580 : 520, h: tall ? 335 : 300, edge: 6, idle: { y: 4, f: 0.7 } },
    { id: 'rib', svg: A6.ribbon(), key: 'c06_pro', x: tall ? 520 : 520, y: tall ? 280 : 175, w: 260, h: 76, edge: 4, max: 48, color: '#FFFDF6', rot: 8 },
    { id: 'cn', art: 'coins', ao: { n: 8 }, x: tall ? 40 : 20, y: tall ? 560 : 300, w: tall ? 190 : 170, h: tall ? 364 : 326, edge: 4, hidden: true },
    { id: 'cn2', art: 'coins', ao: { n: 5 }, x: tall ? 700 : 710, y: tall ? 640 : 380, w: tall ? 160 : 150, h: tall ? 306 : 288, edge: 4, hidden: true }];
  const cbp = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: d4, enter: 'none', out: 'l077', exit: 'cut', layers: cb });
  cbp.L('con').slideIn(d4, { dy: 500, dur: 0.5 }); cbp.L('rib').pop(T(d4) + 0.4, { from: 0.4 }); cbp.L('bt').drop(T(d4) + 0.2, { dy: 400, sfx: 'thud' });
  cbp.L('cn').pop(T(d4) + 0.9, { from: 0.3, sfx: 'coin' }); cbp.L('cn2').pop(T(d4) + 1.2, { from: 0.3, sfx: 'coin' });
  karto.pose('neutral', { at: 'l076', sfx: false }); karto.pose('point', { at: d1 }); karto.pose('present', { at: d3 }); karto.pose('laughing', { at: d4 }); karto.hop({ at: d4, h: 50 });
  skip.pose('neutral', { at: 'l076', sfx: false }); skip.tilt({ deg: 0, at: 'l076' }); skip.pose('thinking', { at: d1 }); skip.pose('shocked', { at: T(d3) + 0.3 });

  /* ---- l077: FIGHT 3 - two consoles get a box each, the PC gets an hourglass ---- */
  skip.tilt({ deg: 0, at: 'l077' });
  const e0 = s('l077', 0, 0.05), e1 = s('l077', 1, 0), e2 = s('l077', 2, 0), e3 = s('l077', 3, 0);
  const cs = tall ? [[20, 330, 420, 242], [460, 330, 420, 242]] : [[175, 135, 300, 173], [175, 410, 300, 173]], pcb = tall ? [500, 600, 200, 250] : [510, 215, 330, 412], bwid = tall ? 190 : 140;
  const f3b = [{ id: 'fb', svg: A6.badge({ col: COL.green }), key: 'c06_fight3', x: tall ? 230 : 20, y: 0, w: tall ? 440 : 400, h: tall ? 120 : 108, edge: 5, max: 78, color: '#FFFDF6', hidden: true }];
  cs.forEach(([x, y, w, hh], i) => {
    f3b.push({ id: 'c' + i, svg: A6.cons({ col: i ? '#E6EEF8' : '#EDEEF0' }), x, y, w, h: hh, edge: 6, hidden: true, idle: { y: 3, f: 0.7, ph: i } });
    const bxp = tall ? [x + (w - bwid) / 2, y - bwid * 1.29 + hh * 0.2] : [x - bwid - 6, y - 4];
    f3b.push(...F._boxLayers(K.digit('6'), bxp[0], bxp[1], bwid, bwid * 1.29, { pal: 'six', origin: '50% 100%' }).map((l, k) => ({ ...l, id: (k ? 'sx' : 'bx') + i, hidden: true })));
    f3b.push({ id: 'ok' + i, svg: A6.tick(), x: tall ? x + w / 2 - 45 : x + w - 60, y: tall ? y + hh + 6 : y - 14, w: tall ? 90 : 84, h: tall ? 90 : 84, edge: 3, hidden: true });
  });
  f3b.push({ id: 'pc', art: 'pc', x: pcb[0], y: pcb[1], w: pcb[2], h: pcb[3], edge: 6, hidden: true, idle: { y: 3, f: 0.6 } },
    { id: 'pcf', svg: A6.pcFace(), x: pcb[0], y: pcb[1], w: pcb[2], h: pcb[3], flat: true, hidden: true, idle: { y: 3, f: 0.6 } },
    { id: 'hg', art: 'hourglass', x: tall ? pcb[0] - 150 : 740, y: tall ? pcb[1] + 20 : 40, w: tall ? 130 : 150, h: tall ? 190 : 219, edge: 5, hidden: true, origin: '50% 50%' },
    { id: 'no', svg: A6.xmark(), x: tall ? pcb[0] + pcb[2] / 2 - 35 : pcb[0] - 40, y: tall ? pcb[1] + pcb[3] + 6 : pcb[1] - 30, w: 80, h: 80, edge: 3, hidden: true });
  const fb3 = F.piece({ slot: B(0, 0, 1, 1), fit: 0.97, w: 900, h: H6, at: 'l077', out: 'l078', exit: 'cut', enter: 'none', layers: f3b });
  fb3.L('fb').slam(e0, { amp: 5 });
  cs.forEach((_, i) => { const t = T(e0) + 0.15 + i * 0.12; fb3.L('c' + i).slideIn(t, { dy: 420, dur: 0.45, sfx: i ? false : 'slide' }); });
  cs.forEach((_, i) => { const t = T(e1) + 0.15 + i * 0.35; fb3.L('bx' + i).drop(t, { dy: 460, sfx: 'thud', db: -8 }); fb3.L('sx' + i).drop(t, { dy: 460, sfx: false }); fb3.L('ok' + i).pop(t + 0.5, { from: 0.3, sfx: 'chime', db: -14 }); });
  const t0pc = T(e1) + 1.05;
  for (const id of ['pc', 'pcf']) fb3.L(id).slideIn(t0pc, { dy: 460, dur: 0.5, sfx: id === 'pc' ? 'slide' : false });
  fb3.L('hg').drop(t0pc + 0.5, { dy: 520, sfx: 'thud', db: -8 }); fb3.L('no').slam(t0pc + 1.1, { amp: 5 });
  K.tl.to(fb3.ids.hg.v, { rot: 180 }, { at: T(e2) + 0.1, dur: 0.5, ease: 'inOutCubic' }); K.tl.to(fb3.ids.hg.v, { rot: 360 }, { at: T(e3) + 0.1, dur: 0.5, ease: 'inOutCubic' });
  K.sfx('flip', T(e2) + 0.1, { db: -8 }); K.sfx('flip', T(e3) + 0.1, { db: -8 });
  F.tapeNote([fb3, (pcb[0] + pcb[2] / 2) / 900, (pcb[1] + pcb[3] * 0.62) / H6], 'c06_pcwait', T(e1) + 1.7, { out: 'l078', w: 300 });
  karto.pose('present', { at: 'l077' }); karto.pose('whisper', { at: e1 }); karto.tilt({ deg: 4, at: e1 }); karto.pose('deadpan', { at: e2 }); karto.tilt({ deg: 0, at: e2 }); karto.nod({ at: T(e3) + 0.1 });
  skip.pose('thinking', { at: 'l077' }); skip.pose('deadpan', { at: e2 });

  /* ---- l078: Skip deadpan: 13 YEARS counter + the hourglass + WAIT stamp ---- */
  skip.pose('deadpan', { at: 'l078' }); karto.pose('neutral', { at: 'l078', sfx: false });
  F.counter(13, { unit: 'c06_years', from: 0, at: 'l078', dur: 1.4, slot: tall ? B(0, 0, 1, 0.5) : B(0, 0.04, 0.54, 0.92), out: 'l079', exit: 'cut' });
  const hg2 = F.piece({ slot: tall ? B(0.1, 0.5, 0.8, 0.5) : B(0.54, 0, 0.46, 1), fit: 0.95, w: 300, h: 440, at: 'l078:0.1', out: 'l079', exit: 'cut', enter: 'drop', idle: { rot: 2, f: 0.5 }, layers: [
    { id: 'hg', art: 'hourglass', x: 20, y: 10, w: 260, h: 380, edge: 7, origin: '50% 50%' }] });
  K.tl.to(hg2.ids.hg.v, { rot: [0, 180] }, { at: T('l078:0.55'), dur: 0.6, ease: 'inOutCubic' }); K.sfx('flip', 'l078:0.55', { db: -8 });
  P.stamp('c06_wait', { slot: tall ? B(0.1, 0.42, 0.8, 0.2) : B(0.5, 0.35, 0.5, 0.3), at: 'l078:0.62', out: 'l079', tilt: -10, big: true });

  /* ---- l079: Karto laughing, three fights ticked off, STAMP 6 ---- */
  karto.pose('laughing', { at: 'l079' }); karto.hop({ at: 'l079:0.1' }); skip.pose('neutral', { at: 'l079', sfx: false });
  const tk = [0, 1, 2].map((i) => ({ id: 'k' + i, svg: A6.badge({ col: [COL.verm, COL.blue, COL.green][i] }), key: 'c06_fight' + (i + 1), x: 10 + i * 300, y: 6, w: 280, h: 80, edge: 4, max: 44, color: '#FFFDF6', hidden: true }));
  const tks = F.piece({ slot: tall ? B(0, 0.77, 1, 0.23) : B(0, 0.8, 1, 0.2), fit: 0.99, w: 900, h: 100, at: 'l079', out: 'l080', exit: 'fade', enter: 'none', layers: tk });
  tk.forEach((_, i) => tks.L('k' + i).slam(T('l079') + 0.1 + i * 0.16, { amp: 3 }));
  F.stamp(6, 'l079:0.4');

  /* ---- l080: mum behind Skip, wagging finger.  l081: arm down, '7' rosette pinned, old newspaper rolls in ---- */
  const news = F.piece({ slot: 'board', fit: 1, w: 940, h: 720, at: 'l081', enter: 'none', exit: 'cut', layers: [{ id: 'np', svg: A6.newsprint(), x: 0, y: 0, w: 940, h: 720, edge: 3, paper: true, origin: '100% 50%', op: 0.0 }] });
  news.L('np').show('l081:0.05').to({ sx: [0.02, 1] }, { at: 'l081:0.05', dur: 0.75, ease: 'outCubic' }); K.sfx('slide-long', 'l081:0.05', { db: -8 });
  const mum = F.piece({ slot: tall ? B(0.25, 0, 0.75, 1) : B(0.5, 0, 0.5, 1), fit: 0.97, w: 300, h: 600, at: 'l080', exit: 'fade', enter: 'none', layers: [
    { id: 'body', svg: A6.mumBody(), x: 0, y: 140, w: 260, h: 460, edge: 6, paper: true },
    { id: 'arm', svg: A6.mumArm(), x: 190, y: 235, w: 80, h: 190, edge: 4, paper: true, origin: '50% 92%', idle: { rot: 15, f: 1.7 } },
    { id: 'armD', svg: A6.mumArmDown(), x: 196, y: 330, w: 80, h: 190, edge: 4, paper: true, hidden: true },
    { id: 'bb', svg: A6.bubble(), x: 30, y: 0, w: 230, h: 170, edge: 5, hidden: true, idle: { rot: 2, f: 0.7 } },
    { id: 'ros', svg: A6.rosette(), text: K.digit('7'), x: 70, y: 330, w: 120, h: 180, edge: 4, hidden: true, max: 70, color: '#FFFDF6', tcss: { transform: 'translateY(-26%)' } }] });
  const bad = F.piece({ slot: tall ? B(0, 0.1, 0.4, 0.8) : B(0.0, 0.08, 0.5, 0.84), fit: 0.9, w: 330, h: 440, at: 'l080:0.2', out: 'l081:0.9', exit: 'cut', enter: 'drop', tilt: -6, idle: { rot: 2, f: 0.6 }, layers: F._boxLayers(K.digit('6'), 20, 20, 290, 374, { pal: 'six' }) });
  mum.L('body').slideIn('l080:0.1', { dx: 460, dur: 0.5 }); mum.L('arm').slideIn('l080:0.1', { dx: 460, dur: 0.5, sfx: false });
  mum.L('bb').pop('l080:0.45', { from: 0.3, sfx: 'boing' });
  mum.L('bb').hide('l081'); mum.L('arm').hide('l081:0.02'); mum.L('armD').show('l081:0.02');
  mum.L('ros').slam('l081:0.3', { amp: 6 });
  skip.pose('thinking', { at: 'l080' }); skip.tilt({ deg: -6, at: 'l080' }); karto.pose('neutral', { at: 'l080', sfx: false });
  karto.pose('point', { at: 'l081' }); skip.pose('shocked', { at: 'l081:0.3' }); skip.tilt({ deg: 0, at: 'l081:0.3' });
}
