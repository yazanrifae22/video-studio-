// c08 - the ending (l093-l100, ~52 s + the end-screen tail). Warm. Skip hops to the CENTRE for the first time at l095; Karto points at the viewer at l098.
// Score card: centre-top at l093 (full, 7 stamps) with the five hero props lined up under it, back to its corner at l094, faded out at l100 (the end screen needs that corner).
// End screen = P.endScreen() starting inside l100 (the question and the end text meet); Karto and Skip sit at the sides, props are all gone.
import { A6, scaleLayers } from './c06.art.js';
import { COL } from '../art.js';
import { clamp } from '../../../web/kit/core.js';

export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, hh) => ({ in: 'board', x, y, w, h: hh });
  const Q = rtl ? '؟' : '?';
  F.chapterOpen('c08', { title: false });

  /* ---- l093: the full card centre-top; the five hero props line up under it, one per sentence ---- */
  const g = [0, 1, 2, 3, 4, 5, 6].map((i) => s('l093', i, 0));
  const card = F.card, cy = tall ? -250 : -190;
  if (card) {
    K.tl.to(card.v, { x: 0, y: cy, sc: 0.72, rot: 0 }, { at: T(g[0]), dur: 0.55, ease: 'back(1.2)' }); K.sfx('whoosh', g[0], { db: -10 });
    card.wiggle({ at: T(g[1]) + 0.05 }); K.sfx('ding', T(g[1]) + 0.05, { db: -10 }); cam.shake(T(g[1]) + 0.08, { amp: 5 });
    F.cardHome(T('l093:end') - 0.15, 0.55);
  }
  const rs = tall
    ? [B(0, 0.38, 0.24, 0.62), B(0.24, 0.38, 0.38, 0.32), B(0.62, 0.38, 0.38, 0.32), B(0.24, 0.7, 0.38, 0.3), B(0.66, 0.7, 0.2, 0.3)]
    : [B(0.0, 0.46, 0.26, 0.54), B(0.26, 0.46, 0.18, 0.54), B(0.44, 0.46, 0.2, 0.54), B(0.64, 0.46, 0.2, 0.54), B(0.84, 0.46, 0.16, 0.54)];
  const hero = { at: null, out: 'l094', exit: 'fly' };
  F.tower({ ...hero, from: 2020, to: 2026, slot: rs[0], fit: 0.98, at: T(g[2]) + 0.1, enter: 'drop' });
  const sack = F.sack({ ...hero, slot: rs[1], fit: 0.98, at: T(g[3]) + 0.1 });
  F.tapeNote(sack, 'estimate', T(g[3]) + 0.8, { out: 'l094', fy: 0.42, k: tall ? 0.6 : 0.5 });
  F.hotelTV({ ...hero, slot: rs[2], fit: 0.98, at: T(g[4]) + 0.1, on: true });
  const dl = F.piece({ ...hero, slot: rs[3], fit: 0.98, w: 320, h: 230, at: T(g[5]) + 0.05, enter: 'pop', layers: [
    { id: 'p1', art: 'calPage', ao: { band: COL.blue }, x: 10, y: 40, w: 140, h: 152, paper: true, edge: 3, rot: -7 }, { id: 'p2', art: 'calPage', ao: { band: COL.green }, x: 170, y: 50, w: 140, h: 152, paper: true, edge: 3, rot: 6 },
    { id: 's1', stamp: 'delayed', x: -4, y: 56, w: 160, h: 70, rot: -14, hidden: true, max: 44 }, { id: 's2', stamp: 'delayed', x: 160, y: 76, w: 160, h: 70, rot: -8, hidden: true, max: 44 }] });
  dl.L('s1').slam(T(g[5]) + 0.35, { amp: 4 }); dl.L('s2').slam(T(g[5]) + 0.7, { amp: 4 });
  F.match({ ...hero, slot: rs[4], fit: 0.98, at: T(g[6]) + 0.1, enter: 'rise', idle: { rot: 4, f: 0.9 } });
  karto.pose('present', { at: g[0] }); karto.pose('cheer', { at: g[1] }); karto.hop({ at: g[1] }); karto.pose('present', { at: g[3] }); karto.pose('whisper', { at: g[6] }); karto.tilt({ deg: 5, at: g[6] });
  skip.pose('neutral', { at: 'l093', sfx: false }); skip.pose('thinking', { at: g[4] });

  /* ---- l094: the scale rocks and never settles: trailers (475M views) vs the $79.99 tag ---- */
  karto.tilt({ deg: 0, at: 'l094' }); karto.pose('point', { at: 'l094:0.3' });
  const h0 = s('l094', 0, 0), h1 = s('l094', 1, 0), h2 = s('l094', 2, 0), tL = T(h1) + 0.35, tR = T(h2) + 0.35;
  const sm = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
  const theta = (t) => { const base = -10 * sm(tL, tL + 0.45, t) + 18 * sm(tR, tR + 0.5, t), amp = 3 + 7 * sm(T(h0) + 0.6, tL, t) * 0.5; return base + amp * Math.sin(t * 2.3) * (1 - 0.0 * t) * 0.9; };
  const oy = tall ? 190 : 175, tc = tL + 0.2;
  const cnt = (t) => { const v = Math.round(475 * sm(tc, tc + 1.6, t)); return rtl ? `${K.num(v)} ${K.s('c08_mviews')}` : `${K.num(v)}${K.s('c08_mviews')}`; };
  const sl = scaleLayers(theta, [
    { side: -1, id: 'reel', svg: A6.filmReel(), x: -22, y: 92, w: 100, h: 100, edge: 4, hidden: true },
    { side: 1, id: 'tagi', svg: A6.tagBig(), x: 314, y: 112, w: 116, h: 66, edge: 3, hidden: true }], oy);
  sl.push({ id: 'cl', svg: A6.board({ w: 250, h: 170, col: '#FFFDF6' }), text: cnt(1e9), x: 0, y: 0, w: 250, h: 170, edge: 6, hidden: true, max: 31, color: COL.blue, tcss: { transform: 'translateY(6%)' }, textAt: cnt, idle: { rot: 2, f: 0.5 } },
    { id: 'cll', key: 'c08_trailers', x: 20, y: 8, w: 210, h: 44, max: 34, color: COL.black, hidden: true },
    { id: 'cr', svg: A6.tagBig(), text: rtl ? K.num(79.99, 2) + '$' : F.money(79.99, 2), x: 270, y: 0, w: 235, h: 133, edge: 6, hidden: true, max: rtl ? 50 : 60, color: '#B5260E', tcss: { transform: 'translate(8%,8%)' }, idle: { rot: 2, f: 0.55, ph: 1 } });
  const sc = F.piece({ slot: tall ? B(0, 0.04, 1, 0.92) : B(0.0, 0, 0.84, 1), fit: 0.98, w: 500, h: 340 + oy, at: 'l094', out: 'l095', exit: 'pop', enter: 'rise', layers: sl });
  sc.L('reel').drop(T(h1) + 0.1, { dy: 400, sfx: 'thud', db: -8 }); sc.L('cl').pop(T(h1) + 0.25, { from: 0.3 }); sc.L('cll').show(T(h1) + 0.4);
  sc.L('tagi').drop(T(h2) + 0.1, { dy: 400, sfx: 'thud', db: -8 }); sc.L('cr').pop(T(h2) + 0.25, { from: 0.3 }); cam.shake(T(h2) + 0.3, { amp: 5 });
  K.sfx('riser', tc, { dur: 1.4, db: -14 });
  karto.pose('deadpan', { at: h2 }); skip.pose('deadpan', { at: h2 });

  /* ---- l095: Skip hops to the centre for the first time (phone in his pocket) ---- */
  skip.pose('typing', { at: 'l095' }); skip.moveTo('center', { at: 'l095', dur: 0.8 }); skip.hop({ at: 'l095:0.45', h: 90 });
  karto.pose('neutral', { at: 'l095', sfx: false });
  F.piece({ plane: 'front', slot: tall ? B(0.3, 0, 0.4, 0.34) : B(0.34, 0, 0.32, 0.4), fit: 0.95, w: 200, h: 290, at: s('l095', 0, 0.55), out: 'l097', exit: 'pop', enter: 'pop', idle: { rot: 6, f: 0.9 }, layers: [{ id: 'q', art: 'qmark', x: 0, y: 0, w: 200, h: 286, edge: 5 }] });

  /* ---- l096: Karto shocked, then laughing; the old SKIP button drops in ---- */
  karto.pose('shocked', { at: 'l096' }); karto.pose('laughing', { at: s('l096', 1, 0.2) }); karto.hop({ at: s('l096', 1, 0.2), h: 60 });
  skip.pose('deadpan', { at: s('l096', 1, 0.3) });
  const bt = F.skipButton({ at: s('l096', 1, 0.05), out: 'l097', exit: 'drop', enter: 'drop' }); bt.wiggle({ at: T(s('l096', 1, 0.05)) + 0.6 });

  /* ---- l097: the calendar tower regrows 2026 -> 2039, a '7?' box on top; the recycling bin slides in next to Skip ---- */
  const k0 = s('l097', 0, 0), k1 = s('l097', 1, 0), k2 = s('l097', 2, 0), k3 = s('l097', 3, 0), n = 14;
  const tw = F.tower({ from: 2026, to: 2039, numeral: '7' + Q, pal: 'seven', slot: tall ? B(0.46, 0, 0.54, 1) : B(0.54, -0.08, 0.46, 1.1), fit: 1, at: k0, out: 'l098', exit: 'cut', enter: 'none' });
  for (let i = 0; i < n; i++) { tw.L('b' + i).hide(0); tw.L('y' + i).hide(0); }
  tw.L('box').hide(0); tw.L('six').hide(0);
  tw.L('b0').pop(k0, { from: 0.4, sfx: 'tap', db: -10 }); tw.L('y0').pop(k0, { from: 0.4, sfx: false });
  const g0 = T(k1) + 0.1, gd = Math.max(0.1, (T(k2) - g0 - 0.3) / (n - 1));
  for (let i = 1; i < n; i++) { tw.L('b' + i).pop(g0 + (i - 1) * gd, { from: 0.5, sfx: i % 3 ? false : 'tap', db: -12 }); tw.L('y' + i).pop(g0 + (i - 1) * gd, { from: 0.5, sfx: false }); }
  tw.L('box').drop(g0 + n * gd, { dy: 300, sfx: 'thud', db: -8 }); tw.L('six').drop(g0 + n * gd, { dy: 300, sfx: false }); cam.shake(g0 + n * gd + 0.2, { amp: 6 });
  F.bin({ slot: tall ? B(0.0, 0.5, 0.4, 0.5) : B(0.0, 0.4, 0.3, 0.6), fit: 0.95, at: k3, out: 'l098', exit: 'cut', enter: 'drop', idle: { rot: 2, f: 0.7 } });
  karto.pose('deadpan', { at: k0 }); skip.pose('thinking', { at: k0 }); skip.pose('shocked', { at: k1 }); skip.hop({ at: k1, h: 50 }); skip.pose('deadpan', { at: k2 }); skip.pose('mindblown', { at: k3 }); skip.hop({ at: k3, h: 60 });

  /* ---- l098: Karto points at the viewer (big glove), a comment box opens, two mini signs WORTH IT / NOT WORTH IT ---- */
  const z0 = s('l098', 0, 0), z1 = s('l098', 1, 0), z2 = s('l098', 2, 0), z3 = s('l098', 3, 0);
  karto.pose('neutral', { at: z0, sfx: false }); karto.pose('point', { at: z1 }); karto.tilt({ deg: -4, at: z1 }); karto.pose('present', { at: z3 }); karto.tilt({ deg: 0, at: z3 });
  skip.pose('deadpan', { at: z0 });
  const hand = F.piece({ plane: 'front', slot: tall ? B(0.0, 0.5, 0.5, 0.5) : B(-0.04, 0.1, 0.34, 0.9), fit: 1, w: 320, h: 380, at: z1, out: z2, exit: 'pop', enter: 'none', layers: [
    { id: 'h', svg: A6.pointHand(), x: 0, y: 0, w: 320, h: 380, edge: 6, hidden: true, origin: '50% 70%' },
    { id: 'y', svg: A6.board({ w: 220, h: 90, col: COL.yel }), key: 'c08_you', x: 50, y: 285, w: 220, h: 90, edge: 5, hidden: true, max: 60, color: COL.black, rot: -5 }] });
  hand.L('h').show(z1).to({ sc: [0.3, 1.5] }, { at: z1, dur: 0.45, ease: 'back(2)' }); K.sfx('whoosh', z1, { db: -8 }); K.sfx('stamp', T(z1) + 0.3, { db: -10 });
  hand.L('h').to({ sc: 1.3 }, { at: T(z1) + 0.5, dur: 0.2 }); hand.L('y').pop(T(z1) + 0.55, { from: 0.3 });
  const lineW = (x, w) => ({ svg: A6.lineBar(), x, w, h: 20, edge: 2, hidden: true, flat: true });
  const ty = tall ? 0.6 : 0.62, tst = T(z3) + 0.1;
  const cb = F.piece({ plane: 'front', slot: tall ? B(0.0, 0.02, 1, 0.34) : B(0.08, 0.0, 0.84, 0.36), fit: 0.99, w: 760, h: 300, at: z2, out: 'l100', exit: 'pop', enter: 'none', layers: [
    { id: 'box', svg: A6.commentBox(), x: 0, y: 0, w: 760, h: 300, edge: 7, hidden: true, origin: '50% 100%' },
    { id: 'l0', ...lineW(60, 560), y: 156, paint: (t, Lr) => { Lr.el.style.transform = `scaleX(${clamp((t - tst) / 1.4, 0.001, 1).toFixed(3)})`; Lr.el.style.transformOrigin = '0% 50%'; } },
    { id: 'l1', ...lineW(60, 400), y: 196, paint: (t, Lr) => { Lr.el.style.transform = `scaleX(${clamp((t - tst - 1.4) / 1.0, 0.001, 1).toFixed(3)})`; Lr.el.style.transformOrigin = '0% 50%'; } },
    { id: 'cur', svg: A6.cursor(), x: 56, y: 150, w: 10, h: 40, edge: 1, hidden: true, flat: true, paint: (t, Lr, Pc) => { const f = clamp((t - tst) / 1.4, 0, 1), f2 = clamp((t - tst - 1.4) / 1.0, 0, 1), x = f2 > 0 ? 400 * f2 : 560 * f, y = f2 > 0 ? 40 : 0; Lr.el.style.transform = `translate(${(x * Pc.k).toFixed(1)}px,${(y * Pc.k).toFixed(1)}px)`; Lr.el.style.opacity = Math.floor(t * 3.2) % 2 ? 0 : 1; } }] });
  cb.L('box').show(z2).to({ sy: [0.05, 1], sx: [0.8, 1] }, { at: z2, dur: 0.4, ease: 'back(1.6)' }); K.sfx('unfold', z2, { db: -8 });
  cb.L('l0').show(z2 + 0.0); cb.L('l1').show(z2); cb.L('cur').show(T(z2) + 0.45);
  const sgn = (id, key, side, col, ink) => { const sl2 = tall ? (side ? B(0.52, 0.4, 0.48, 0.2) : B(0.0, 0.4, 0.48, 0.2)) : (side ? B(0.66, 0.38, 0.36, 0.34) : B(-0.02, 0.38, 0.36, 0.34)); return F.piece({ plane: 'front', slot: sl2, fit: 0.98, w: 340, h: 230, at: T(z2) + 0.3 + side * 0.2, out: 'l100', exit: 'pop', enter: 'pop', idle: { rot: 2.5, f: 0.6 + side * 0.1, ph: side }, layers: [
    { id: 'st', svg: A6.stickPost(), x: 150, y: 120, w: 40, h: 110, edge: 3 }, { id: 'b', svg: A6.board({ w: 340, h: 150, col }), key, x: 0, y: 0, w: 340, h: 150, edge: 5, max: 56, lines: 2, color: ink, tcss: { padding: '0 8%' } }] }); };
  sgn('sw', 'worth', 0, '#CFE9C0', '#1E5E2A'); sgn('sn', 'not_worth', 1, '#FFD9CC', '#B5260E');
  void ty;

  /* ---- l099: "I am never wrong. I am yellow." arms crossed, a yellow sticky note with a tick ---- */
  skip.pose('deadpan', { at: 'l099' }); skip.tilt({ deg: -6, at: 'l099:0.1' }); karto.pose('deadpan', { at: 'l099:0.2' });
  F.piece({ plane: 'front', slot: tall ? B(0.52, 0.22, 0.4, 0.3) : B(0.36, 0.26, 0.28, 0.42), fit: 0.95, w: 260, h: 260, at: s('l099', 1, 0.0), out: 'l100', exit: 'pop', enter: 'slam', tilt: 8, idle: { rot: 2, f: 0.6 }, layers: [{ id: 'sn', svg: A6.sticky(), x: 0, y: 0, w: 260, h: 260, edge: 5 }] });

  /* ---- l100: end screen: card gone, props gone, Karto + Skip at the sides with a small idle sway ---- */
  skip.tilt({ deg: 0, at: 'l100' }); skip.moveTo('right', { at: 'l100', dur: 0.6 }); skip.pose('typing', { at: 'l100:0.1' }); karto.pose('present', { at: 'l100' });
  if (card) { K.tl.to(card.v, { op: [1, 0] }, { at: T('l100') - 0.05, dur: 0.3, ease: 'linear' }); }
  P.endScreen({ at: 'l100:0.3' });
  const e0 = T('l100') + 0.9;
  for (let i = 0; e0 + i * 1.5 < K.duration; i++) {
    const a = e0 + i * 1.5; karto.tilt({ deg: i % 2 ? 2.5 : -2.5, at: a, dur: 1.4 }); skip.tilt({ deg: i % 2 ? -3 : 3, at: a + 0.2, dur: 1.4 });
    if (i % 3 === 2) { karto.hop({ at: a + 0.6, h: 30 }); skip.hop({ at: a + 1.0, h: 30 }); }
  }
}
