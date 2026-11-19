// c01 - piece 1: the wait (l012-l021, ~68 s). Calm, wry. Tall Short s6 = l013-l018: every board piece is built to fill the 872x840 board.
import { A1, webDom } from './c01.art.js';
import { COL } from '../art.js';

export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, hh) => ({ in: 'board', x, y, w, h: hh });
  const mx = (x, w) => (rtl ? 1 - x - w : x);
  const Bm = (x, y, w, hh) => B(mx(x, w), y, w, hh);
  const len = (id) => K.line(id).t1 - K.line(id).t0;
  F.chapterOpen('c01');

  /* ---- l012: shop window, SEPT 2013 page, the '5' box on the shelf, a queue of paper people ---- */
  karto.pose('present', { at: 'l012:0.3' });
  const shop = F.shop({ numeral: 5, slot: tall ? B(0, 0.02, 1, 0.66) : B(0, 0, 1, 0.8), fit: 1, at: s('l012', 1, 0.5), out: s('l013', 1), exit: 'cut', enter: 'rise', idle: { rot: 0.35, f: 0.3 } });
  F.calPage({ month: 'month_sep', year: 2013, band: COL.verm, plane: 'front', slot: tall ? Bm(0, 0, 0.32, 0.3) : Bm(0.01, 0, 0.26, 0.46), fit: 1, at: s('l012', 2, 0.05), out: s('l013', 1), exit: 'cut', tilt: -6, idle: { rot: 1.2, f: 0.5 } });
  F.crowd({ rows: tall ? 2 : 1, cols: tall ? 6 : 9, expr: 'happy', look: -1, seed: 3, slot: tall ? B(0, 0.68, 1, 0.32) : B(0, 0.74, 1, 0.26), fit: 1, at: s('l012', 3, 0.02), enter: 'rise', out: s('l013', 1), exit: 'cut' });
  shop.L('box').wiggle(s('l012', 3, 0.1), { deg: 7 }); shop.L('six').wiggle(s('l012', 3, 0.1), { deg: 7 }); K.sfx('pop', s('l012', 3, 0.1), { db: -9 });
  if (!tall) F.push(shop.lspot('box', 0.5, 0.5), { zoom: 1.14, at: s('l012', 3), dur: 0.9 });
  karto.pose('point', { at: s('l012', 2) }); karto.pose('cheer', { at: s('l012', 3, 0.1) }); karto.hop({ at: s('l012', 3, 0.1) });
  skip.pose('thinking', { at: s('l012', 3, 0.4) });

  /* ---- l013: world that day: pull back on the queue; then the old phone behind glass + IN 3 DAYS; an empty app hole with ? ---- */
  cam.to({ zoom: 1.0, x: -30, y: 0 }, { at: 'l013', dur: 1.2, ease: 'inOutSine' });
  karto.pose('neutral', { at: 'l013', sfx: false }); karto.pose('point', { at: 'l013:0.1' }); skip.pose('neutral', { at: 'l013', sfx: false });
  const ps = F.piece({ w: 900, h: 600, enter: 'rise', slot: tall ? B(0, 0, 1, 0.58) : B(0, 0.04, 0.76, 0.82), fit: 1, at: s('l013', 1), out: s('l014', 1), exit: 'cut', idle: { rot: 0.3, f: 0.3 }, layers: [
    { id: 'wall', art: 'window', x: 0, y: 0, w: 900, h: 580, edge: 6, flutes: true },
    { id: 'shelf', x: 70, y: 470, w: 440, h: 26, dom: (el) => { el.style.background = '#8B5A35'; el.style.boxShadow = '0 6px 0 #5A3A22'; } },
    { id: 'phone', svg: A1.oldPhone(), x: 140, y: 118, w: 200, h: 387, edge: 5, hidden: true, idle: { rot: 1.4, y: 3, f: 0.5 } },
    { id: 'tag', art: 'priceTag', x: 430, y: 160, w: 330, h: 188, paper: true, edge: 3, hidden: true, origin: '20% 0%', idle: { rot: 4, f: 0.7 } },
    { id: 'tagT', key: 'in3days', x: 505, y: 190, w: 236, h: 130, max: 64, lines: 2, color: '#B5260E', hidden: true, origin: '-6% -20%', idle: { rot: 4, f: 0.7 } },
    { id: 'glass', art: 'glass', x: 50, y: 130, w: 800, h: 400, flat: true },
    { id: 'frame', art: 'windowFrame', x: 0, y: 0, w: 900, h: 580, edge: 6 }] });
  cam.reset({ at: s('l013', 1), cut: true });
  ps.L('phone').drop(s('l013', 1, 0.12), { dy: 420, sfx: 'thud' });
  ps.L('tag').drop(s('l013', 1, 0.5), { dy: 360 }); ps.L('tagT').drop(s('l013', 1, 0.5), { dy: 360, sfx: false });
  const hole = F.piece({ w: 380, h: 380, enter: 'pop', slot: tall ? B(0.18, 0.55, 0.64, 0.45) : B(0.55, 0.32, 0.45, 0.68), fit: 1, plane: 'front', at: s('l013', 2), out: s('l014', 1), exit: 'cut', tilt: 3, idle: { rot: 1.2, f: 0.45 }, layers: [
    { id: 'hole', svg: A1.appHole(), x: 0, y: 0, w: 380, h: 380, edge: 7 },
    { id: 'q', svg: A1.q(), x: 100, y: 70, w: 180, h: 245, hidden: true, idle: { rot: 7, f: 0.9 } }] });
  hole.L('q').pop(s('l013', 2, 0.45), { sfx: 'boing', from: 0.3 });
  karto.pose('present', { at: s('l013', 1) }); karto.pose('point', { at: s('l013', 2) }); skip.pose('thinking', { at: s('l013', 2, 0.3) });

  /* ---- l014: Skip shocked, hugging his phone; the day clock spins: what did people do all day ---- */
  skip.pose('shocked', { at: 'l014' }); skip.hop({ at: 'l014', h: 70 }); karto.pose('neutral', { at: 'l014', sfx: false });
  hole.to({ sc: 1.12 }, { at: 'l014', dur: 0.4, ease: 'back(2)' });
  const clock = F.piece({ w: 560, h: 420, enter: 'pop', slot: tall ? B(0, 0.02, 1, 0.92) : B(0.04, 0, 0.92, 1), fit: 1, at: s('l014', 1), out: 'l015', exit: 'cut', idle: { rot: 0.8, f: 0.4 }, layers: [
    { id: 'face', svg: A1.dayFace(), x: 130, y: 60, w: 300, h: 300, edge: 6 },
    { id: 'hand', svg: A1.hand(), x: 265, y: 90, w: 30, h: 130, origin: '50% 92%', edge: 2, noShadow: true },
    { id: 'hand2', svg: A1.hand2(), x: 265, y: 132, w: 30, h: 90, origin: '50% 90%', edge: 2, noShadow: true },
    { id: 'q0', svg: A1.q(), x: 10, y: 40, w: 100, h: 136, hidden: true, rot: -14, idle: { rot: 6, f: 0.9 } },
    { id: 'q1', svg: A1.q(), x: 450, y: 20, w: 100, h: 136, hidden: true, rot: 12, idle: { rot: 6, f: 1.1, ph: 1 } },
    { id: 'q2', svg: A1.q(), x: 456, y: 220, w: 90, h: 122, hidden: true, rot: -8, idle: { rot: 6, f: 1.0, ph: 2 } }] });
  const cs = s('l014', 1), cd = Math.max(1.6, T('l015') - T(cs));
  clock.L('hand').to({ rot: [0, 1440] }, { at: cs, dur: cd, ease: 'linear' }); clock.L('hand2').to({ rot: [0, 120] }, { at: cs, dur: cd, ease: 'linear' });
  K.sfx('tick-synth', cs, { db: -14 }); K.sfx('tick-synth', T(cs) + 0.5, { db: -16 });
  clock.L('q0').pop(s('l014', 1, 0.2), { sfx: 'boing', from: 0.3 }); clock.L('q1').pop(s('l014', 1, 0.45), { sfx: false, from: 0.3 }); clock.L('q2').pop(s('l014', 1, 0.7), { sfx: false, from: 0.3 });
  if (!tall) F.push(clock.spot(0.5, 0.5), { zoom: 1.08, at: cs, dur: 1.2 });

  /* ---- l015: Vine tile with a 6s ring and a flipping ball; then a gravestone thuds onto it; the year sign 2013 ---- */
  cam.reset({ at: 'l015', cut: true });
  skip.pose('neutral', { at: 'l015', sfx: false }); karto.pose('present', { at: 'l015' });
  const ringDom = (el, K_, k, L_) => {
    const ns = 'http://www.w3.org/2000/svg', w = L_.w * k, svg = document.createElementNS(ns, 'svg'), c = document.createElementNS(ns, 'circle');
    svg.setAttribute('width', w); svg.setAttribute('height', w); el.appendChild(svg);
    const r = w * 0.43, circ = 2 * Math.PI * r; c.setAttribute('cx', w / 2); c.setAttribute('cy', w / 2); c.setAttribute('r', r); c.setAttribute('fill', 'none'); c.setAttribute('transform', `rotate(-90 ${w / 2} ${w / 2})`);
    c.style.stroke = '#FFFDF6'; c.style.strokeWidth = w * 0.06; c.style.strokeLinecap = 'round'; svg.appendChild(c);
    L_.paint = (t) => { const p = (t % 1.3) / 1.3, d = `${(circ * p).toFixed(1)} ${circ.toFixed(1)}`; if (c.__d !== d) { c.__d = d; c.style.strokeDasharray = d; } };
  };
  const vine = F.piece({ w: 440, h: 440, enter: 'pop', slot: tall ? B(0, 0.0, 0.78, 0.62) : B(0, 0, 0.64, 1), fit: 1, at: 'l015', out: 'l016', exit: 'cut', idle: { rot: 1, y: 4, f: 0.5 }, layers: [
    { id: 'tile', svg: A1.vineApp(), x: 20, y: 20, w: 400, h: 400, edge: 7 },
    { id: 'ring', x: 70, y: 50, w: 300, h: 300, dom: ringDom },
    { id: 't6', key: 'c01_6s', x: 110, y: 120, w: 220, h: 130, max: 150, color: '#FFFDF6', tcss: { textShadow: '4px 5px 0 rgba(10,60,30,0.55)' } },
    { id: 'dot', svg: [90, 90, `<circle cx="45" cy="45" r="38" fill="#FFD23F" stroke="#1E1712" stroke-width="6"/><circle cx="32" cy="38" r="5" fill="#1E1712"/><circle cx="58" cy="38" r="5" fill="#1E1712"/><path d="M28 56 Q45 72 62 56" fill="none" stroke="#1E1712" stroke-width="5" stroke-linecap="round"/>`], x: 175, y: 275, w: 90, h: 90, edge: 3,
      paint: (t, L_) => { const p = (t % 0.9) / 0.9, up = Math.sin(p * Math.PI) * 38 * (1 / 1); L_.el.style.transform = `translate(0px,${(-up * 1).toFixed(1)}px) rotate(${(p * 360).toFixed(0)}deg)`; } },
    { id: 'gray', x: 20, y: 20, w: 400, h: 400, hidden: true, dom: (el, K_, k) => { el.style.background = 'rgba(70,70,70,0.62)'; el.style.borderRadius = 84 * k + 'px'; } }] });
  K.sfx('flip', s('l015', 0, 0.3), { db: -14 }); K.sfx('flip', s('l015', 0, 0.55), { db: -16 });
  const gv = s('l015', 1, 0.12);
  const grave = F.piece({ w: 260, h: 340, enter: 'none', plane: 'front', slot: tall ? B(0.34, 0.3, 0.66, 0.5) : Bm(0.38, 0.3, 0.62, 0.7), fit: 1, at: 'l015', out: 'l016', exit: 'cut', tilt: 5, layers: [{ id: 'g', svg: A1.grave(), x: 0, y: 0, w: 260, h: 340, edge: 7, hidden: true }] });
  grave.L('g').drop(gv, { dy: 760, dur: 0.5 }); K.cam.shake(T(gv) + 0.24, { amp: 10, dur: 0.3 });
  vine.L('gray').show(T(gv) + 0.28); vine.to({ rot: -7, y: 26, sc: 0.93 }, { at: T(gv) + 0.24, dur: 0.25, ease: 'back(2)' });
  F.yearSign(2013, { slot: tall ? B(0.5, 0.64, 0.5, 0.36) : Bm(0.6, 0, 0.4, 0.34), plane: 'front', fit: 1, at: s('l015', 2, 0.05), out: 'l016', exit: 'cut', enter: 'rise' });
  karto.pose('deadpan', { at: s('l015', 1) }); karto.tilt({ deg: 5, at: s('l015', 1, 0.3) }); skip.pose('shocked', { at: gv }); skip.hop({ at: gv, h: 40 });
  karto.tilt({ deg: 0, at: s('l015', 2) }); karto.pose('present', { at: s('l015', 2) });

  /* ---- l016: a paper kid grows along a ruler (controller / graduate / office), the age sign counts 10 -> 23 ---- */
  cam.reset({ at: 'l016', cut: true }); skip.pose('thinking', { at: 'l016:0.4' });
  const kidL = (id, art, y, w, hh, hid) => ({ id, svg: art, x: 112, y, w, h: hh, edge: 4, hidden: hid, origin: '50% 100%', idle: { rot: 1.3, y: 3, f: 0.6 } });
  const grow = F.piece({ w: 330, h: 500, enter: 'rise', slot: tall ? B(0, 0.0, 0.52, 1) : Bm(0, 0, 0.44, 1), fit: 1, at: 'l016', out: 'l017', exit: 'cut', layers: [
    { id: 'ruler', svg: A1.vRuler({ h: 490 }), x: 0, y: 5, w: 90, h: 490, edge: 5 },
    kidL('k0', A1.kid(), 232, 190, 259, false), kidL('k1', A1.grad(), 165, 190, 330, true), kidL('k2', A1.office(), 92, 190, 400, true),
    { id: 'mark', svg: [70, 40, `<path d="M4 20 L60 4 L60 36 Z" fill="#E5401D" stroke="#1E1712" stroke-width="5" stroke-linejoin="round"/>`], x: 80, y: 250, w: 70, h: 40, edge: 2 }] });
  const g1 = s('l016', 1, 0.0), g2 = s('l016', 1, 0.55);
  grow.L('k0').hide(g1); grow.L('k1').pop(g1, { from: 0.8, sfx: 'pop' }); grow.L('k1').hide(g2); grow.L('k2').pop(g2, { from: 0.8, sfx: 'pop' });
  grow.L('mark').to({ y: 190 }, { at: g1, dur: 0.4, ease: 'back(1.6)' }); grow.L('mark').to({ y: 112 }, { at: g2, dur: 0.4, ease: 'back(1.6)' });
  F.counter(23, { unit: 'c01_age', from: 10, at: 'l016+0.1', dur: Math.max(2.2, T(g1) - T('l016') - 0.5), slot: tall ? B(0.5, 0.0, 0.5, 0.5) : Bm(0.44, 0.02, 0.56, 0.62), out: 'l017' });
  P.label('c01_school', { slot: tall ? B(0.46, 0.56, 0.54, 0.16) : Bm(0.48, 0.68, 0.52, 0.14), size: 'l', stock: 'blue', ink: '#FFFDF6', tape: true, at: T(g1) + 0.15, out: 'l017', tilt: -3 });
  P.label('c01_job', { slot: tall ? B(0.46, 0.76, 0.54, 0.16) : Bm(0.48, 0.84, 0.52, 0.14), size: 'l', stock: 'green', ink: '#FFFDF6', tape: true, at: T(g2) + 0.15, out: 'l017', tilt: 3 });
  karto.pose('point', { at: 'l016' }); karto.nod({ at: T(g1) + 0.2 });

  /* ---- l017: Skip deadpan. Back to the 2013 shelf: still the '5' box, a cobweb drawn in marker; the year sign runs 2013 -> 2026 ---- */
  cam.reset({ at: 'l017', cut: true }); skip.pose('deadpan', { at: 'l017' }); karto.pose('neutral', { at: 'l017', sfx: false });
  const shop2 = F.shop({ numeral: 5, slot: tall ? B(0, 0, 1, 0.66) : B(0, 0, 1, 0.82), fit: 1, at: 'l017', out: s('l018', 1), exit: 'cut', enter: 'slide', idle: { rot: 0.3, f: 0.3 } });
  shop2.add({ id: 'web', x: 352, y: 192, w: 215, h: 215, dom: webDom }); shop2.add({ id: 'web2', x: 40, y: 150, w: 170, h: 150, dom: webDom });
  F.drawOn(shop2, 'web', 'l017:0.35', 0.9); F.drawOn(shop2, 'web2', 'l017:0.6', 0.8);
  const yc0 = T('l017') + 0.3, yc1 = T(s('l018', 1)), yrN = (t) => 2013 + Math.floor(Math.max(0, Math.min(1, (t - yc0) / Math.max(1, yc1 - yc0))) * 13);
  F.piece({ w: 320, h: 380, enter: 'rise', plane: 'front', slot: tall ? B(0.28, 0.62, 0.44, 0.38) : Bm(0.7, 0.58, 0.3, 0.42), fit: 1, at: 'l017+0.2', out: s('l018', 1), exit: 'cut', idle: { rot: 1, f: 0.4 }, layers: [
    { id: 'post', svg: [30, 200, `<rect x="4" y="0" width="22" height="196" rx="10" fill="#E3C08A" stroke="#8C6A3C" stroke-width="3"/>`], x: 145, y: 170, w: 30, h: 210, edge: 2 },
    { id: 'sign', art: 'sign', x: 0, y: 0, w: 320, h: 240 },
    { id: 'y', text: K.digit('2013'), x: 30, y: 24, w: 260, h: 104, max: 100, color: '#3B2A18', textAt: (t) => K.digit(String(yrN(t))) }] });
  K.sfx('tick-synth', T('l017') + 0.4, { db: -15 });
  if (!tall) F.push(shop2.lspot('web', 0.5, 0.5), { zoom: 1.12, at: 'l017:0.3', dur: 1.2 });

  /* ---- l018: "Still no new game." -> the football conveyor: identical boxes, one per year 2013..2026, piling up ---- */
  karto.pose('deadpan', { at: 'l018' }); skip.pose('neutral', { at: 'l018', sfx: false });
  const cols = tall ? 4 : 5, bw = tall ? 150 : 132, bhh = Math.round(bw * 1.28), N = 14, rows = Math.ceil(N / cols), gapX = 14, topH = 175;
  const FW = cols * (bw + gapX) + 40, FH = topH + rows * bhh + 70;
  const f0 = s('l018', 1, 0.08), fd = Math.max(3.4, T('l019') - T(f0) - 0.4) * 0.92, step = fd / N, land = (i) => T(f0) + 0.55 + i * step;
  const fl = [{ id: 'sign', svg: [330, 170, `<rect x="6" y="8" width="318" height="140" rx="16" fill="#1F2A44" stroke="#1E1712" stroke-width="6"/><rect x="146" y="148" width="38" height="20" fill="#8C6A3C"/>`], x: FW / 2 - 165, y: 0, w: 330, h: 150, edge: 6 },
    { id: 'yr', text: K.digit('2013'), x: FW / 2 - 150, y: 14, w: 300, h: 112, max: 120, color: COL.yel, tcss: { textShadow: `0 0 14px rgba(255,210,63,0.6)`, direction: 'ltr' }, textAt: (t) => { let n = 0; for (let i = 0; i < N; i++) if (t >= land(i)) n = i; return K.digit(String(2013 + n)); } },
    { id: 'belt', svg: A1.belt(), x: 10, y: FH - 62, w: FW - 20, h: 60, edge: 5 }];
  const pos = (i) => { const r = Math.floor(i / cols), c = i % cols; return { x: 20 + c * (bw + gapX) + (r % 2 ? 10 : 0), y: FH - 62 - (r + 1) * bhh + 6 }; };
  for (let i = 0; i < N; i++) { const q = pos(i);
    fl.push({ id: 'b' + i, svg: A1.ballBox(), x: q.x, y: q.y, w: bw, h: bhh, edge: 4, hidden: true });
    fl.push({ id: 'l' + i, text: K.digit(String(2013 + i)), x: q.x + 8, y: q.y + bhh * 0.77, w: bw - 16, h: bhh * 0.2, max: 34, color: '#FFFDF6', hidden: true, tcss: { direction: 'ltr' } }); }
  const pile = F.piece({ w: FW, h: FH, enter: 'rise', slot: tall ? B(0, 0, 1, 0.97) : B(0.02, 0, 0.96, 1), fit: 1, at: s('l018', 1), out: s('l019', 1), exit: 'fly', layers: fl });
  for (let i = 0; i < N; i++) {
    const q = pos(i), r = Math.floor(i / cols), a = land(i);
    if (r === 0) { pile.L('b' + i).to({ x: [FW + 100, 0] }, { at: a - 0.5, dur: 0.5, ease: 'outCubic' }); pile.L('l' + i).to({ x: [FW + 100, 0] }, { at: a - 0.5, dur: 0.5, ease: 'outCubic' }); pile.L('b' + i).show(a - 0.5); pile.L('l' + i).show(a - 0.5); K.sfx('slide', a - 0.5, { db: -16 }); }
    else { pile.L('b' + i).drop(a - 0.35, { dy: 380, dur: 0.4, sfx: i % 2 ? false : 'thud', db: -18 }); pile.L('l' + i).drop(a - 0.35, { dy: 380, dur: 0.4, sfx: false }); }
  }
  if (!tall) F.push(pile.spot(0.5, 0.5), { zoom: 1.04, at: s('l018', 1), dur: 1.0 });
  karto.pose('point', { at: s('l018', 1) }); skip.pose('deadpan', { at: s('l018', 1, 0.5) });

  /* ---- l019: the football pile slides over, ONE lone cowboy-hat box beside it; then Karto sits on a giant '6' like a hen; big ? ---- */
  cam.reset({ at: 'l019', dur: 0.6 });
  const hb0 = s('l019', 0, 0.38);
  pile.to({ x: (tall ? -110 : -230) * (rtl ? -1 : 1), sc: tall ? 0.8 : 0.76 }, { at: hb0, dur: 0.6, ease: 'inOutCubic' });
  F.piece({ w: 210, h: 270, enter: 'slide', slot: tall ? B(0.54, 0.12, 0.46, 0.5) : Bm(0.64, 0.08, 0.36, 0.76), fit: 1, plane: 'front', at: hb0, out: s('l019', 1), exit: 'fly', idle: { rot: 2, y: 4, f: 0.7 }, layers: [{ id: 'hb', svg: A1.hatBox(), x: 0, y: 0, w: 210, h: 270, edge: 7 }] });
  P.label('c01_justone', { slot: tall ? B(0.5, 0.66, 0.5, 0.14) : Bm(0.6, 0.78, 0.4, 0.14), size: 'l', stock: 'yellow', tape: true, at: T(hb0) + 0.5, out: s('l019', 1), tilt: 4 });
  karto.pose('present', { at: 'l019' }); karto.pose('deadpan', { at: s('l019', 0, 0.55) });
  // Karto on the giant '6' box
  const [kx, ky] = karto.center(), sitAt = s('l019', 1, 0.05);
  const seat = tall ? { x: kx - 215, y: 1500, w: 430, h: 470 } : { x: kx - 215, y: 640, w: 430, h: 440 };
  F.gameBox('6', { plane: 'front', slot: seat, fit: 1, at: sitAt, out: 'l021:0.3', exit: 'drop', enter: 'drop', idle: { rot: 0.8, f: 0.5 } });
  K.tl.to(karto.v, { lift: [0, tall ? 120 : 150] }, { at: T(sitAt) + 0.3, dur: 0.35, ease: 'back(1.6)' }); K.tl.to(karto.v, { lift: 0 }, { at: 'l021:0.3', dur: 0.4, ease: 'inOutCubic' });
  karto.pose('neutral', { at: s('l019', 1, 0.15), sfx: false }); karto.tilt({ deg: -4, at: T(sitAt) + 0.4 });
  const qb = F.piece({ w: 140, h: 200, enter: 'pop', slot: tall ? B(0.04, 0.0, 0.92, 1) : B(0.1, 0, 0.8, 1), fit: 1, at: 'l019:0.78', out: 'l020', exit: 'pop', idle: { rot: 5, f: 0.6 }, layers: [{ id: 'q', art: 'qmark', x: 0, y: 0, w: 140, h: 200, edge: 6 }] });
  F.piece({ w: 150, h: 150, enter: 'pop', slot: tall ? B(0.0, 0.5, 0.3, 0.3) : B(0.04, 0.55, 0.22, 0.38), fit: 1, at: 'l019:0.84', out: 'l020', exit: 'pop', idle: { rot: 8, f: 0.9 }, layers: [{ id: 'q', svg: A1.q(), x: 20, y: 0, w: 110, h: 150, edge: 4 }] });
  K.sfx('boing', T('l019:0.78'), { db: -9 });
  skip.pose('thinking', { at: 'l019:0.6' });

  /* ---- l020: Skip skeptical, tapping an invisible watch. s0 a snail crossed out; s1 question marks around Karto's egg ---- */
  karto.pose('deadpan', { at: 'l020', sfx: false }); skip.pose('deadpan', { at: 'l020' });
  const sn = F.piece({ w: 320, h: 220, enter: 'slide', slot: tall ? B(0.05, 0.1, 0.9, 0.6) : B(0.04, 0.12, 0.92, 0.7), fit: 1, at: 'l020', out: s('l020', 1), exit: 'cut', plane: 'front', layers: [
    { id: 'sn', svg: A1.snail(), x: 0, y: 0, w: 320, h: 220, edge: 6, idle: { y: 3, rot: 1, f: 0.8 } }, { id: 'x', svg: A1.bigX(), x: 60, y: -10, w: 200, h: 200, edge: 4, hidden: true }] });
  K.tl.to(sn.v, { x: [0, 60] }, { at: 'l020', dur: 1.4, ease: 'linear' });
  sn.L('x').slam(s('l020', 0, 0.5), { sfx: 'stamp', amp: 6 });
  const qm = (sl, at, tl, i) => F.piece({ w: 110, h: 150, enter: 'pop', slot: sl, fit: 1, plane: 'front', at, out: 'l021', exit: 'pop', tilt: tl, idle: { rot: 6, y: 5, f: 0.8 + i * 0.15, ph: i }, layers: [{ id: 'q', svg: A1.q(), x: 0, y: 0, w: 110, h: 150, edge: 5 }] });
  qm(tall ? B(0.0, 0.02, 0.34, 0.4) : B(0.02, 0.05, 0.3, 0.5), s('l020', 1, 0.05), -12, 0); qm(tall ? B(0.33, 0.3, 0.38, 0.5) : B(0.34, 0.3, 0.34, 0.66), s('l020', 1, 0.2), 6, 1); qm(tall ? B(0.64, 0.0, 0.34, 0.42) : B(0.68, 0.04, 0.3, 0.5), s('l020', 1, 0.35), 14, 2);
  K.sfx('boing', T(s('l020', 1, 0.05)), { db: -10 });
  const [sx, sy] = skip.center(), wat = F.piece({ w: 200, h: 260, enter: 'pop', plane: 'front', slot: { x: sx - (tall ? 250 : 230), y: sy + (tall ? 60 : 90), w: 2, h: 2 }, k: tall ? 0.8 : 0.95, at: s('l020', 1, 0.1), out: 'l021', exit: 'pop', tilt: -14, layers: [{ id: 'w', svg: A1.watch(), x: 0, y: 0, w: 200, h: 260, edge: 4 }] });
  for (const d of [0.25, 0.7, 1.15]) { wat.L('w').wiggle(T(s('l020', 1, 0.1)) + d, { deg: 9 }); K.sfx('tap', T(s('l020', 1, 0.1)) + d, { db: -8 }); }
  karto.pose('shocked', { at: s('l020', 1, 0.7) }); skip.nod({ at: s('l020', 1, 0.3) });

  /* ---- l021: s0 "no need to hurry": giant slow hourglass + Zs from the egg; s1 STAMP 1; a coin rolls in as the teaser ---- */
  karto.pose('neutral', { at: 'l021', sfx: false }); karto.tilt({ deg: 0, at: 'l021' }); skip.pose('deadpan', { at: 'l021', sfx: false });
  const hg = F.cut('hourglass', { slot: tall ? B(0.1, 0, 0.8, 0.92) : B(0.12, 0, 0.76, 1), fit: 1, at: 'l021', out: 'l021:end', exit: 'fade', enter: 'drop', idle: { rot: 2, f: 0.25 } });
  const z = F.piece({ w: 120, h: 150, enter: 'pop', plane: 'front', slot: { x: kx + (tall ? 90 : 110), y: ky - (tall ? 190 : 170), w: 160, h: 200 }, fit: 1, at: 'l021:0.15', out: 'l021:end', exit: 'fade', idle: { y: 8, rot: 4, f: 0.5 }, layers: [{ id: 'z', svg: A1.zzz(), x: 0, y: 0, w: 120, h: 150, edge: 3 }] });
  F.stamp(1, 'l021:0.55');
  const cn = F.piece({ w: 150, h: 150, enter: 'none', plane: 'front', slot: tall ? B(0.1, 0.62, 0.3, 0.3) : Bm(0.06, 0.66, 0.2, 0.3), fit: 1, at: 'l021:0.85', out: 'l021:end', exit: 'fade', layers: [{ id: 'c', svg: A1.coinRoll(), x: 0, y: 0, w: 150, h: 150, edge: 5 }] });
  K.tl.to(cn.v, { x: [rtl ? -900 : 900, 0], rot: [0, rtl ? 720 : -720] }, { at: 'l021:0.85', dur: 1.3, ease: 'outCubic' }); K.sfx('coin', T('l021:0.85') + 1.2, { db: -8 }); K.sfx('slide', 'l021:0.85', { db: -14 });
}
