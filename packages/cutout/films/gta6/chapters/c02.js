// c02 - piece 2: the money (l022-l035, ~92 s). Rising mood. Tall Short s2 = l022-l029: board pieces are built to fill the 872x840 board.
import { A1 } from './c01.art.js';
import { A2 } from './c02.art.js';
import { COL, ART } from '../art.js';

export default function (K, F) {
  const { karto, skip, P, cam, scene, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, hh) => ({ in: 'board', x, y, w, h: hh });
  const mx = (x, w) => (rtl ? 1 - x - w : x);
  const Bm = (x, y, w, hh) => B(mx(x, w), y, w, hh);
  const len = (id) => K.line(id).t1 - K.line(id).t0;
  const clampT = (a, b) => Math.max(a, b);
  const push = (t, o) => { if (!tall) F.push(t, o); };
  F.chapterOpen('c02');

  /* ---- l022: Piece two. The money. Cash register + counter racing to $800,000,000 under DAY 1, coin stacks shoot up ---- */
  const t0 = s('l022', 2, 0.0), cd = clampT(2.0, (T('l022:end') - T(t0)) * 0.85);
  const reg = F.piece({ w: 440, h: 420, enter: 'rise', slot: tall ? B(0, 0.42, 0.62, 0.58) : Bm(0, 0.46, 0.5, 0.54), fit: 1, at: s('l022', 1, 0.5), out: 'l024', exit: 'drop', idle: { rot: 0.8, f: 0.6 }, layers: [
    { id: 'drawer', svg: A2.drawer(), x: 30, y: 292, w: 380, h: 90, edge: 5 },
    { id: 'body', svg: A2.cashReg(), x: 0, y: 0, w: 440, h: 330, edge: 7 },
    ...Array.from({ length: 7 }, (_, i) => ({ id: 'c' + i, art: 'coin', x: 175, y: 150, w: 90, h: 90, edge: 4, hidden: true }))] });
  reg.L('drawer').set({ y: -80 }, 0);
  reg.L('drawer').to({ y: 0 }, { at: t0, dur: 0.3, ease: 'back(2)' }); K.sfx('coin', t0, { db: -6 }); K.sfx('thud', T(t0) + 0.15, { db: -12 });
  reg.wiggle({ at: T(t0) + 0.3 }); K.cam.shake(T(t0) + 0.2, { amp: 6, dur: 0.25 });
  for (let i = 0; i < 7; i++) {
    const a = T(t0) + 0.15 + i * 0.18, dx = (i - 3) * 70 + (i % 2 ? 20 : -10);
    reg.L('c' + i).pop(a, { sfx: i % 2 ? false : 'coin', db: -12, from: 0.4 });
    reg.L('c' + i).to({ x: dx, y: -230 - (i % 3) * 60 }, { at: a, dur: 0.55, ease: 'outQuad' }); reg.L('c' + i).to({ y: 120, op: 0 }, { at: a + 0.55, dur: 0.5, ease: 'inQuad' });
  }
  F.counter(800000000, { money: true, unit: 'day1', from: 0, at: t0, dur: cd, size: 0.97, slot: tall ? B(0.0, 0.0, 1, 0.42) : Bm(0.0, 0.0, 1, 0.5), out: 'l024' });
  [0, 1, 2].forEach((i) => F.coins({ n: 4 + i * 3, slot: tall ? B(0.6 + i * 0.13, 0.4, 0.14, 0.6) : Bm(0.52 + i * 0.16, 0.38, 0.16, 0.62), fit: 1, plane: 'front', at: T(t0) + 0.35 + i * 0.3, out: 'l024', enter: 'grow' }));
  karto.pose('present', { at: 'l022:0.3' }); karto.pose('point', { at: s('l022', 1) }); karto.pose('cheer', { at: t0 }); karto.hop({ at: t0 });
  skip.pose('thinking', { at: s('l022', 1, 0.6) });

  /* ---- l023: In one day? Skip mind-blown; burst + shake ---- */
  skip.pose('mindblown', { at: 'l023' }); skip.hop({ at: 'l023', h: 80 }); karto.pose('neutral', { at: 'l023', sfx: false });
  F.cut('burst', { slot: tall ? B(0.56, 0.4, 0.44, 0.3) : Bm(0.76, 0.3, 0.24, 0.34), fit: 1, plane: 'front', at: 'l023', out: 'l024', exit: 'pop', enter: 'pop', idle: { rot: 6, f: 1.2 } });
  reg.wiggle({ at: 'l023+0.05' }); K.cam.shake(T('l023') + 0.1, { amp: 9, dur: 0.3 }); K.sfx('hit', 'l023', { db: -10 });

  /* ---- l024: race: film reel / music disc / game pad; the game pad breaks the $1,000,000,000 tape under DAY 3 ---- */
  cam.reset({ at: 'l024', dur: 0.4 });
  const RW = 900, RH = tall ? 800 : 700, hd = tall ? 210 : 190, lh = tall ? 190 : 170, rs = tall ? 150 : 140, XS = 250, XF = RW - 150, dirR = rtl ? -1 : 1, MX = (x, w) => (rtl ? RW - x - w : x); // RTL: the whole track is mirrored
  const stickOf = (spec) => { const [vw, vh, body] = spec; return [vw, vh + 80, body + `<rect x="${vw / 2 - 12}" y="${vh - 8}" width="24" height="70" rx="8" fill="#E3C08A" stroke="#1E1712" stroke-width="6"/><rect x="${vw / 2 - 40}" y="${vh + 56}" width="80" height="18" rx="8" fill="#E5401D" stroke="#1E1712" stroke-width="6"/>`]; };
  const runners = [ART.filmCan({}), A2.disc(), A2.pad()].map(stickOf);
  const lanes = [0, 1, 2], laneY = (i) => hd + i * lh;
  const rl = [{ id: 'bg', x: 0, y: hd, w: RW, h: lh * 3, dom: (el, K_, k) => { el.style.background = `repeating-linear-gradient(180deg,#D9B07A 0,#D9B07A ${lh * k}px,#C99A62 ${lh * k}px,#C99A62 ${2 * lh * k}px)`; el.style.borderRadius = 10 * k + 'px'; el.style.boxShadow = `4px 6px 0 rgba(60,35,10,0.35)`; } },
    { id: 'start', x: MX(XS - 30, 10), y: hd, w: 10, h: lh * 3, dom: (el) => { el.style.background = '#FFFDF6'; } },
    { id: 'fin', x: MX(XF, 34), y: hd - 10, w: 34, h: lh * 3 + 20, dom: (el) => { el.style.background = 'repeating-conic-gradient(#1E1712 0 25%, #FFFDF6 0 50%) 0 0 / 34px 34px'; el.style.border = '3px solid #1E1712'; } },
    { id: 'band', x: 20, y: 10, w: RW - 40, h: 100, dom: (el, K_, k) => { el.style.background = COL.yel; el.style.border = `${5 * k}px solid #1E1712`; el.style.borderRadius = 12 * k + 'px'; el.style.boxShadow = '5px 7px 0 rgba(60,35,10,0.4)'; } },
    { id: 'goal', text: F.money(1000000000), x: 40, y: 14, w: RW - 80, h: 92, max: 86, color: '#B5260E' },
    { id: 'd3', key: 'day3', x: MX(RW - 360, 330), y: 112, w: 330, h: hd - 118, max: 74, color: '#FFFDF6', hidden: true, tcss: { textShadow: '3px 4px 0 #1E1712' } }];
  ['c02_film', 'c02_album', 'c02_game'].forEach((k, i) => rl.push({ id: 'lab' + i, key: k, x: MX(14, XS - 56), y: laneY(i) + lh / 2 - 36, w: XS - 56, h: 72, max: 54, color: '#3B2A18' }));
  runners.forEach((sp, i) => { const w = rs, hhh = rs * sp[1] / sp[0]; rl.push({ id: 'r' + i, svg: sp, x: MX(XS, w), y: laneY(i) + lh - hhh + 4, w, h: hhh, edge: 5, idle: { y: 4, rot: 2, f: 2.4, ph: i * 1.3 } }); });
  rl.push({ id: 'tape', x: MX(XF - 10, 50), y: laneY(2) + lh * 0.45, w: 50, h: 14, dom: (el) => { el.style.background = 'repeating-linear-gradient(90deg,#E5401D 0 10px,#FFFDF6 10px 20px)'; el.style.border = '2px solid #1E1712'; } });
  const race = F.piece({ w: RW, h: RH, enter: 'rise', plane: 'front', slot: B(0, 0, 1, 1), fit: 1, at: 'l024', out: 'l025', exit: 'cut', layers: rl });
  const g0 = s('l024', 1, 0.0), g1 = s('l024', 2, 0.0), gd = Math.max(1.8, (T(g1) - T(g0)) * 0.78), trk = XF - XS - rs * 0.8;
  if (rtl) for (const i of [0, 1, 2]) K.tl.set(race.ids['r' + i].v, { sx: -1 }, 0);
  race.L('d3').pop(g0, { sfx: 'stamp', from: 1.8 });
  for (const i of [0, 1]) race.L('r' + i).to({ x: dirR * trk * (i ? 0.46 : 0.38) }, { at: g0, dur: gd, ease: 'inOutQuad' });
  race.L('r2').to({ x: dirR * trk }, { at: g0, dur: gd, ease: 'inCubic' }); K.sfx('whoosh', g0, { db: -8 });
  const fin = T(g0) + gd;
  race.L('tape').hide(fin); K.sfx('rip', fin - 0.05, { db: -8 }); K.sfx('ding', fin + 0.05, { db: -8 }); K.cam.shake(fin, { amp: 8, dur: 0.3 });
  race.L('r2').to({ x: dirR * (trk + 40) }, { at: fin, dur: 0.5, ease: 'outCubic' }); race.L('r2').to({ y: -50 }, { at: fin + 0.1, dur: 0.18, ease: 'outQuad' }).to({ y: 0 }, { at: fin + 0.28, dur: 0.3, ease: 'bounce' });
  race.L('goal').to({ sc: 1.12 }, { at: fin, dur: 0.15, ease: 'outQuad' }).to({ sc: 1 }, { at: fin + 0.15, dur: 0.4, ease: 'back(2.5)' });
  for (const i of [0, 1]) race.L('r' + i).to({ x: dirR * trk * (i ? 0.6 : 0.52) }, { at: g1, dur: Math.max(1.5, T('l024:end') - T(g1)), ease: 'linear' });
  [[0, 0.1], [1, 0.38], [2, 0.66]].forEach(([i, f]) => { const a = s('l024', 2, f); race.L('lab' + i).wiggle(a, { deg: 5 }); K.sfx('tap', a, { db: -10 }); });
  [[0.2, 0.3], [0.8, 0.42], [0.45, 0.78]].forEach(([fx, fy], i) => { const q = race.lpt('fin', 0.5, 0.5); F.cut('burst', { plane: 'front', slot: { x: q.x - 120 + i * 90 - 1, y: q.y - 120 + i * 100 - 1, w: 2, h: 2 }, k: 0.9, at: fin + i * 0.1, out: fin + 0.9, exit: 'pop', enter: 'pop', tilt: i * 12 - 10 }); });
  karto.pose('present', { at: 'l024' }); karto.pose('point', { at: g0 }); karto.pose('cheer', { at: fin }); karto.hop({ at: fin }); skip.pose('thinking', { at: 'l024:0.15' }); skip.pose('deadpan', { at: g1 });

  /* ---- l025: bars growing year after year, never dropping; counter 200,000,000+ COPIES ---- */
  cam.reset({ at: 'l025', cut: true }); karto.pose('neutral', { at: 'l025', sfx: false }); skip.pose('neutral', { at: 'l025', sfx: false });
  const CW = tall ? 800 : 900, CH = tall ? 640 : 430, vals = [34, 54, 85, 120, 150, 190, 215], yrs = [2013, 2015, 2017, 2019, 2021, 2023, 2025];
  const stepX = (CW - 70) / 7, bw = stepX * 0.68, baseY = CH - 78, bmax = baseY - 50, cl = [COL.verm, COL.blue, COL.green, COL.yel, COL.pink, COL.purple, COL.verm];
  const cL = [{ id: 'back', x: 0, y: 0, w: CW, h: CH, dom: (el, K_, k) => { el.style.background = '#EFE4CC'; el.style.borderRadius = 14 * k + 'px'; el.style.border = `${5 * k}px solid #A97A45`; el.style.boxShadow = '5px 8px 0 rgba(60,35,10,0.35)'; } },
    { id: 'base', x: 20, y: baseY, w: CW - 40, h: 16, dom: (el) => { el.style.background = '#8B5A35'; } }];
  vals.forEach((v, i) => { const bh = bmax * v / 215, x = 40 + i * stepX + (stepX - bw) / 2; cL.push({ id: 'b' + i, svg: [bw, bh, `<rect x="4" y="4" width="${bw - 8}" height="${bh - 6}" rx="8" fill="${cl[i]}" stroke="#1E1712" stroke-width="6"/>`], x, y: baseY - bh, w: bw, h: bh, edge: 5, hidden: true, origin: '50% 100%' });
    cL.push({ id: 'y' + i, text: K.digit(String(yrs[i])), x: x - 14, y: baseY + 22, w: bw + 28, h: 44, max: 36, color: '#3B2A18', tcss: { direction: 'ltr' } }); });
  cL.push({ id: 'arr', svg: [CW, CH, `<path d="M70 ${baseY - 90} Q${CW * 0.4} ${baseY - 160} ${CW * 0.6} ${baseY - 250} T${CW - 70} 70" fill="none" stroke="#E5401D" stroke-width="18" stroke-linecap="round"/><path d="M${CW - 150} 60 L${CW - 60} 56 L${CW - 90} 150" fill="none" stroke="#E5401D" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`], x: 0, y: 0, w: CW, h: CH, flat: true, hidden: true });
  const chart = F.piece({ w: CW, h: CH, enter: 'rise', slot: tall ? B(0, 0.36, 1, 0.64) : B(0, 0.44, 1, 0.56), fit: 1, at: 'l025', out: 'l026', exit: 'cut', layers: cL });
  const b0 = T('l025'), ts = [b0 + 0.25, b0 + 0.6, T(s('l025', 1)) + 0.1, T(s('l025', 1)) + 0.5, T(s('l025', 1)) + 0.9, T(s('l025', 1)) + 1.3, T(s('l025', 1)) + 1.7];
  ts.forEach((t, i) => { chart.L('b' + i).show(t); chart.L('b' + i).to({ sy: [0.02, 1] }, { at: t, dur: 0.6, ease: 'back(1.3)' }); K.sfx('pop', t, { db: -12 }); });
  chart.L('arr').fade(T(s('l025', 1)) + 1.5, { dur: 0.5 }); K.sfx('scratch', T(s('l025', 1)) + 1.5, { db: -12 });
  F.counter(200000000, { unit: 'copies', suffix: 'c02_plus', from: 0, at: s('l025', 2, 0.0), dur: Math.max(2, (T('l025:end') - T(s('l025', 2))) * 0.8), size: 0.97, slot: tall ? B(0.0, 0.0, 1, 0.34) : Bm(0.0, 0.0, 1, 0.42), out: 'l026' });
  karto.pose('thinking', { at: 'l025' }); karto.pose('point', { at: s('l025', 1) }); karto.pose('present', { at: s('l025', 2) });

  /* ---- l026: the same '5' box pushed into three consoles of growing size (3, 4, 5); each spits out a coin ---- */
  cam.reset({ at: 'l026', cut: true });
  const KW = tall ? 760 : 900, KH = tall ? 900 : 700;
  const cs = tall ? [{ x: 10, y: 60, w: 300, h: 208 }, { x: 370, y: 330, w: 380, h: 263 }, { x: 10, y: 570, w: 470, h: 326 }] : [{ x: 10, y: 230, w: 250, h: 173 }, { x: 300, y: 330, w: 290, h: 201 }, { x: 540, y: 440, w: 360, h: 249 }];
  const BWd = 140, BHd = 180, kl = [];
  cs.forEach((c, i) => { kl.push({ id: 'con' + i, art: 'console', ao: { col: ['#C4C7CC', '#E4E6E9', '#FFFFFF'][i] }, x: c.x, y: c.y, w: c.w, h: c.h, edge: 6 });
    kl.push({ id: 'cn' + i, text: K.digit(String(3 + i)), x: c.x + c.w * 0.52, y: c.y + c.h * 0.28, w: c.w * 0.38, h: c.h * 0.5, max: c.h * 0.5, color: '#26211B' }); });
  kl.push(...F._boxLayers(K.digit('5'), 0, 0, BWd, BHd, { pal: 'five' }).map((l) => ({ ...l, hidden: true })));
  cs.forEach((c, i) => kl.push({ id: 'k' + i, art: 'coin', x: c.x + c.w / 2 - 65, y: c.y - 30, w: 130, h: 130, edge: 4, hidden: true }));
  const cons = F.piece({ w: KW, h: KH, enter: 'rise', slot: 'board', fit: 1, at: 'l026', out: 'l027', exit: 'cut', layers: kl });
  const hov = (c) => ({ x: c.x + (c.w - BWd) / 2, y: c.y - BHd - 40 }), inn = (c) => ({ x: c.x + (c.w - BWd) / 2, y: c.y - BHd * 0.55 });
  const fr = [[0.04, 0.2], [0.36, 0.52], [0.68, 0.84]];
  cs.forEach((c, i) => {
    const hv = hov(c), ni = inn(c), a = K.at('l026', fr[i][0]), b = K.at('l026', fr[i][1] - 0.04);
    for (const id of ['box', 'six']) { cons.L(id).set({ x: hv.x, y: hv.y, sc: 1, op: 0 }, a - 0.01); cons.L(id).pop(a, { sfx: id === 'box' ? 'pop' : false, from: 0.5 }); cons.L(id).to({ x: ni.x, y: ni.y, sc: 0.5 }, { at: b - 0.1, dur: 0.22, ease: 'inQuad' }); cons.L(id).hide(b + 0.12); }
    cons.L('k' + i).pop(b + 0.1, { sfx: 'coin', from: 0.4 }); cons.L('k' + i).to({ y: -170 }, { at: b + 0.1, dur: 0.5, ease: 'outQuad' }); cons.L('k' + i).to({ op: 0 }, { at: b + 0.55, dur: 0.3 });
    cons.L('con' + i).wiggle(b + 0.12, { deg: 3 }); K.sfx('thud', b + 0.12, { db: -12 });
  });
  karto.pose('present', { at: 'l026' }); karto.pose('point', { at: 'l026:0.35' }); skip.pose('thinking', { at: 'l026:0.5' });

  /* ---- l027: same game, three times; people bought it? one box, then three with x3, then a crowd throwing coins ---- */
  cam.reset({ at: 'l027', cut: true }); skip.pose('deadpan', { at: 'l027' }); karto.pose('neutral', { at: 'l027', sfx: false });
  const w0 = s('l027', 0), w1 = s('l027', 1), w2 = s('l027', 2);
  F.gameBox('5', { slot: tall ? B(0.15, 0, 0.7, 0.9) : B(0.2, 0, 0.6, 1), fit: 0.96, at: w0, out: w1, exit: 'cut', enter: 'drop', idle: { rot: 1.2, f: 0.5 } });
  const bx = (i, at, out) => F.gameBox('5', { slot: tall ? B(0.0 + i * 0.34, 0.0, 0.32, 0.46) : B(0.02 + i * 0.32, 0.0, 0.3, 0.5), fit: 1, at, out, exit: 'cut', enter: 'drop', idle: { rot: 1.5, f: 0.5, ph: i } });
  [0, 1, 2].forEach((i) => bx(i, T(w1) + i * 0.16, 'l028'));
  P.stamp('c02_x3', { slot: tall ? B(0.1, 0.44, 0.8, 0.22) : B(0.1, 0.4, 0.8, 0.24), at: T(w1) + 0.55, out: w2, tilt: -7, big: true });
  F.crowd({ rows: 3, cols: 7, expr: 'happy', seed: 4, slot: tall ? B(0, 0.5, 1, 0.5) : B(0, 0.5, 1, 0.5), fit: 1, at: w2, enter: 'rise', out: s('l028', 1), exit: 'cut' });
  for (let i = 0; i < 5; i++) { const q = F.piece({ w: 100, h: 100, enter: 'pop', plane: 'front', slot: tall ? B(0.08 + i * 0.18, 0.42, 0.15, 0.2) : B(0.06 + i * 0.19, 0.42, 0.14, 0.22), fit: 1, at: T(w2) + 0.3 + i * 0.22, out: s('l028', 1), exit: 'pop', layers: [{ id: 'c', art: 'coin', x: 0, y: 0, w: 100, h: 100, edge: 4 }] });
    K.tl.to(q.v, { y: [0, -90 - (i % 2) * 40] }, { at: T(w2) + 0.3 + i * 0.22, dur: 0.5, ease: 'outQuad' }); K.sfx('coin', T(w2) + 0.3 + i * 0.22, { db: -14 }); }

  /* ---- l028: People bought it / real trick (wand) / online city with pins / real note in the slot -> shark card + fake coins ---- */
  karto.pose('cheer', { at: 'l028' }); karto.hop({ at: 'l028' }); skip.pose('neutral', { at: 'l028:0.2', sfx: false });
  const q0 = s('l028', 1), q1 = s('l028', 2), q2 = s('l028', 3);
  const wand = F.piece({ w: 200, h: 340, enter: 'pop', slot: tall ? B(0.2, 0, 0.6, 0.8) : B(0.25, 0, 0.5, 1), fit: 1, at: q0, out: q1, exit: 'cut', idle: { rot: 5, f: 0.8 }, layers: [{ id: 'w', svg: A2.wand(), x: 0, y: 0, w: 200, h: 340, edge: 6 }] });
  wand.to({ rot: 35 }, { at: T(q0) + 0.4, dur: 0.3, ease: 'back(2)' }); K.sfx('chime', T(q0) + 0.45, { db: -10 });
  karto.pose('whisper', { at: q0 }); karto.tilt({ deg: 6, at: q0 });
  const city = F.piece({ w: 940, h: 420, enter: 'flap', slot: tall ? B(0, 0, 1, 0.42) : B(0, 0, 1, 0.54), fit: 1, at: q1, out: 'l029', exit: 'cut', layers: [{ id: 'city', svg: A2.cityDay(), x: 0, y: 0, w: 940, h: 420, edge: 6, flutes: true },
    ...[[70, 190], [210, 120], [360, 205], [520, 130], [640, 215], [790, 140], [450, 260]].map(([x, y], i) => ({ id: 'p' + i, svg: A2.pin({ col: [COL.verm, COL.blue, COL.green, COL.yel, COL.pink, COL.purple, COL.verm][i] }), x, y, w: 70, h: 110, edge: 4, hidden: true, idle: { y: 5, f: 0.9 + i * 0.07, ph: i } }))] });
  for (let i = 0; i < 7; i++) city.L('p' + i).drop(T(q1) + 0.35 + i * 0.14, { dy: 300, dur: 0.4, sfx: i % 2 ? false : 'tap', db: -14 });
  karto.pose('present', { at: q1 }); karto.tilt({ deg: 0, at: q1 });
  const sm = F.piece({ w: 340, h: 340, enter: 'rise', slot: tall ? B(0.0, 0.42, 0.5, 0.58) : Bm(0.0, 0.42, 0.48, 0.58), fit: 1, plane: 'front', at: T(q2), out: 'l029', exit: 'cut', layers: [
    { id: 'note', svg: A2.noteReal(), x: 80, y: 20, w: 190, h: 102, edge: 3, hidden: true, rot: -8 },
    { id: 'slot', svg: A2.slotBox(), x: 10, y: 60, w: 320, h: 270, edge: 6 }] });
  sm.L('note').pop(T(q2) + 0.3, { sfx: 'pop' }); sm.L('note').to({ y: 110, rot: 0 }, { at: T(q2) + 0.9, dur: 0.5, ease: 'inQuad' }); sm.L('note').hide(T(q2) + 1.45); K.sfx('rustle', T(q2) + 0.95, { db: -8 }); sm.wiggle({ at: T(q2) + 1.45 });
  const sh = F.piece({ w: 300, h: 380, enter: 'none', slot: tall ? B(0.5, 0.42, 0.5, 0.58) : Bm(0.5, 0.42, 0.5, 0.58), fit: 1, plane: 'front', at: T(q2), out: 'l029', exit: 'cut', idle: { rot: 1.5, f: 0.5 }, layers: [
    { id: 'card', svg: A2.sharkCard(), x: 0, y: 0, w: 300, h: 380, edge: 6, hidden: true },
    ...[0, 1, 2].map((i) => ({ id: 'f' + i, svg: A2.starCoin(), x: 38 + i * 78, y: 278, w: 64, h: 64, edge: 3, hidden: true }))] });
  sh.L('card').slideIn(T(q2) + 1.5, { dx: -380, dy: 0, sfx: 'slide' });
  [0, 1, 2].forEach((i) => sh.L('f' + i).pop(T(q2) + 2.0 + i * 0.2, { sfx: 'coin', db: -12, from: 0.4 }));
  push(city.spot(0.5, 0.5), { zoom: 1.05, at: q1, dur: 1 });

  /* ---- l029: real money for fake money? Skip holds a real note and a play note; REAL | FAKE slam together ---- */
  cam.reset({ at: 'l029', cut: true }); skip.pose('thinking', { at: 'l029' }); karto.pose('neutral', { at: 'l029', sfx: false });
  const VW = tall ? 800 : 900, VH = tall ? 760 : 520, vl = [];
  [['L', '#F3E2BC', A2.noteReal(), 'c02_real', -1], ['R', '#CFE5F5', A2.notePlay(), 'c02_fake', 1]].forEach(([n, bg, art, key, d]) => {
    const c = tall ? { x: 10, y: n === 'L' ? 10 : 400, w: 780, h: 350 } : { x: n === 'L' ? 10 : 480, y: 20, w: 410, h: 480 };
    const np = tall ? { x: c.x + 30, y: c.y + 80, w: 380, h: 205 } : { x: c.x + 25, y: 70, w: 360, h: 194 }, lp = tall ? { x: c.x + 430, y: c.y + 80, w: 340, h: 200 } : { x: c.x + 20, y: 300, w: 370, h: 150 };
    vl.push({ id: 'card' + n, ...c, dom: (el, K_, k) => { el.style.background = bg; el.style.border = `${6 * k}px solid #1E1712`; el.style.borderRadius = 16 * k + 'px'; el.style.boxShadow = '6px 9px 0 rgba(60,35,10,0.4)'; } });
    vl.push({ id: 'note' + n, svg: art, ...np, edge: 5, rot: d * 5 });
    vl.push({ id: 'lab' + n, key, ...lp, max: 130, color: n === 'L' ? '#2F5E2F' : '#C2367A', tcss: { textShadow: '3px 4px 0 rgba(30,23,18,0.25)' } });
  });
  vl.push({ id: 'bolt', svg: [200, 200, `<path d="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const r = i % 2 ? 40 : 92, a = i / 10 * Math.PI * 2 - Math.PI / 2; return `${(i ? 'L' : 'M')}${(100 + Math.cos(a) * r).toFixed(1)} ${(100 + Math.sin(a) * r).toFixed(1)}`; }).join('')} Z" fill="#FFD23F" stroke="#1E1712" stroke-width="8" stroke-linejoin="round"/>`], x: VW / 2 - 100, y: VH / 2 - 100, w: 200, h: 200, edge: 4, hidden: true, idle: { rot: 8, f: 0.5 } });
  const vs = F.piece({ w: VW, h: VH, enter: 'none', slot: tall ? B(0, 0.0, 1, 1) : B(0, 0.04, 1, 0.9), fit: 1, at: 'l029', out: 'l029:end', exit: 'cut', layers: vl });
  const va = T('l029') + 0.05;
  for (const n of ['L', 'R']) { const d = n === 'L' ? -1 : 1; for (const id of ['card', 'note', 'lab']) { vs.L(id + n).set({ x: d * 1000 }, 0); vs.L(id + n).slideIn(va + (n === 'R' ? 0.12 : 0), { dx: d * 1000, sfx: id === 'card' ? 'whoosh' : false, ease: 'outCubic', dur: 0.5 }); } }
  vs.L('bolt').slam(va + 0.7, { sfx: 'stamp' });
  const [skx, sky] = skip.center();
  [['noteReal', -190, 40, -14], ['notePlay', -60, 70, 12]].forEach(([n, ox, oy, r], i) => { const nt = F.piece({ w: 260, h: 140, enter: 'pop', plane: 'front', slot: { x: skx + ox - (tall ? 90 : 0) - 1, y: sky + oy + 20 - 1, w: 2, h: 2 }, k: tall ? 0.5 : 0.6, at: T(va) + 0.9 + i * 0.2, out: 'l029:end', exit: 'pop', tilt: r, idle: { rot: 5, y: 4, f: 0.9, ph: i }, layers: [{ id: 'n', svg: A2[n](), x: 0, y: 0, w: 260, h: 140, edge: 4 }] }); });
  karto.pose('deadpan', { at: s('l029', 0, 0.4) });

  /* ---- l030: the '5' box becomes a printing press with a crank; notes fly out each morning (3 quick sunrises); the '6' box waits ---- */
  cam.reset({ at: 'l030', cut: true }); karto.pose('present', { at: 'l030' }); skip.pose('neutral', { at: 'l030', sfx: false });
  const PW = 700, PH = 620, pl = [{ id: 'sun', svg: A1.sunDisc(), x: 40, y: 60, w: 200, h: 200, edge: 5 }, { id: 'hill', svg: A2.hill(), x: 0, y: 330, w: 700, h: 160, edge: 5 },
    { id: 'press', svg: A2.press(), x: 70, y: 200, w: 560, h: 400, edge: 7 }, { id: 'crank', svg: A2.crank(), x: 28, y: 400, w: 150, h: 150, edge: 4 },
    ...F._boxLayers(K.digit('5'), 235, 40, 140, 180, { pal: 'five' }).map((l) => ({ ...l, hidden: true }))];
  for (let i = 0; i < 16; i++) pl.push({ id: 'n' + i, svg: A2.noteReal(), x: 500, y: 405, w: 130, h: 70, edge: 3, hidden: true });
  const press = F.piece({ w: PW, h: PH, enter: 'rise', slot: tall ? B(0, 0.04, 1, 0.9) : B(0.12, 0, 0.88, 1), fit: 1, at: 'l030', out: 'l031', exit: 'drop', layers: pl });
  const p0 = T('l030') + 0.4;
  for (const id of ['box', 'six']) press.L(id).drop(p0, { dy: 500, sfx: id === 'box' ? 'thud' : false });
  press.L('crank').to({ rot: [0, 7200] }, { at: p0 + 0.3, dur: Math.max(6, T('l031') - p0), ease: 'linear' }); K.sfx('rewind', p0 + 0.35, { db: -14 });
  const nA = p0 + 0.5, nB = Math.max(nA + 4, T(s('l030', 1)) + 1.5), nStep = (nB - nA) / 16;
  for (let i = 0; i < 16; i++) { const a = nA + i * nStep; press.L('n' + i).pop(a, { sfx: i % 3 ? false : 'tick', db: -14, from: 0.5 }); press.L('n' + i).to({ x: 150 + (i % 4) * 40, y: -150 - (i % 3) * 60, rot: (i % 2 ? 1 : -1) * 40 }, { at: a, dur: 0.8, ease: 'outQuad' }); press.L('n' + i).to({ y: 220, op: 0 }, { at: a + 0.8, dur: 0.6, ease: 'inQuad' }); }
  const sunDur = (nB - nA) / 3;
  for (let c = 0; c < 3; c++) { const a = nA + c * sunDur; press.L('sun').to({ y: [330, -20] }, { at: a, dur: sunDur * 0.5, ease: 'outCubic' }); press.L('sun').to({ y: 330 }, { at: a + sunDur * 0.5, dur: sunDur * 0.5, ease: 'inCubic' }); K.sfx('chime', a + 0.2, { db: -16 }); }
  const six = F.gameBox('6', { slot: tall ? B(0.0, 0.66, 0.26, 0.34) : Bm(0.0, 0.6, 0.17, 0.4), fit: 1, plane: 'front', at: s('l030', 1), out: 'l031', exit: 'cut', enter: 'rise', idle: { rot: 3, y: 4, f: 0.35 } });
  K.sfx('slide', s('l030', 1), { db: -12 });
  karto.pose('point', { at: s('l030', 1) });

  /* ---- l031: Skip walks away very slowly across the stage, whistling; a snail overtakes him ---- */
  skip.pose('whisper', { at: 'l031' }); skip.tilt({ deg: -4, at: 'l031', dur: 0.5 }); karto.pose('neutral', { at: 'l031', sfx: false });
  K.tl.to(skip.v, { x: [0, tall ? -60 : -150] }, { at: 'l031', dur: len('l031') + 0.5, ease: 'linear' });
  for (let i = 0; i < 3; i++) K.tl.to(skip.v, { lift: [0, 14] }, { at: T('l031') + i * 0.55, dur: 0.25, ease: 'outQuad' }), K.tl.to(skip.v, { lift: 0 }, { at: T('l031') + i * 0.55 + 0.25, dur: 0.25, ease: 'inQuad' });
  const snl = F.piece({ w: 320, h: 220, enter: 'slide', slot: tall ? B(0.05, 0.1, 0.9, 0.6) : B(0.1, 0.12, 0.8, 0.7), fit: 1, plane: 'front', at: 'l031', out: 'l032', exit: 'cut', layers: [{ id: 'sn', svg: A1.snail(), x: 0, y: 0, w: 320, h: 220, edge: 6, idle: { y: 3, rot: 1, f: 0.8 } }] });
  K.tl.to(snl.v, { x: [rtl ? 160 : -160, rtl ? -120 : 120] }, { at: 'l031', dur: len('l031') + 0.3, ease: 'linear' });
  for (let i = 0; i < 3; i++) { const [sx2, sy2] = skip.center(), nn = F.piece({ w: 70, h: 110, enter: 'pop', plane: 'front', slot: { x: sx2 - 60 - i * 40, y: sy2 - 120 - i * 30, w: 2, h: 2 }, k: 0.8, at: T('l031') + 0.3 + i * 0.45, out: 'l032', exit: 'fade', tilt: -10 + i * 8, idle: { y: 8, rot: 6, f: 0.7, ph: i }, layers: [{ id: 'n', svg: A2.note(), x: 0, y: 0, w: 70, h: 110, edge: 3 }] }); }

  /* ---- l032: sack grows into a monster behind the stage; padlock (nobody outside knows); sign $1-2 BILLION? ---- */
  K.tl.to(skip.v, { x: 0 }, { at: 'l032:0.03', dur: 0.5, ease: 'back(1.3)' }); skip.tilt({ deg: 0, at: 'l032' }); skip.pose('neutral', { at: 'l032', sfx: false }); karto.pose('present', { at: 'l032' });
  const m0 = s('l032', 1), m1 = s('l032', 2), m2 = s('l032', 3);
  const mon = F.piece({ w: 320, h: 370, enter: 'rise', slot: tall ? B(0.0, 0.0, 1, 1) : Bm(0.04, 0, 0.62, 1), fit: 1, at: 'l032', out: 'l034', exit: 'drop', idle: { rot: 1.2, y: 5, f: 0.4 }, layers: [
    { id: 'sack', art: 'sack', x: 0, y: 0, w: 320, h: 370, edge: 6 }, { id: 'mon', svg: A2.monsterSack(), x: 0, y: 0, w: 320, h: 370, edge: 7, hidden: true }] });
  K.tl.set(mon.v, { sc: 0.4 }, 0);
  K.tl.to(mon.v, { sc: 1 }, { at: m0, dur: 0.7, ease: 'back(1.8)' }); mon.L('sack').hide(T(m0) + 0.25); mon.L('mon').pop(T(m0) + 0.25, { sfx: 'sting', db: -8, from: 0.9 }); K.cam.shake(T(m0) + 0.5, { amp: 12, dur: 0.5 });
  mon.L('mon').to({ sc: 1.03 }, { at: T(m1) - 0.3, dur: 1.2, ease: 'inOutSine' });
  const lock = F.piece({ w: 160, h: 200, enter: 'slap', plane: 'front', slot: tall ? B(0.3, 0.45, 0.4, 0.3) : Bm(0.15, 0.4, 0.3, 0.32), fit: 1, at: m1, out: 'l034', exit: 'pop', tilt: -8, layers: [{ id: 'l', art: 'padlock', x: 0, y: 0, w: 160, h: 200, edge: 5 }] });
  P.label('c02_unknown', { slot: tall ? B(0.02, 0.0, 0.96, 0.18) : Bm(0.4, 0.0, 0.6, 0.2), size: 'm', stock: 'yellow', tape: true, at: T(m1) + 0.7, out: 'l034', tilt: 3 });
  const sg = F.piece({ w: 560, h: 250, enter: 'drop', plane: 'front', slot: tall ? B(0.0, 0.62, 1, 0.38) : Bm(0.38, 0.6, 0.62, 0.4), fit: 1, at: m2, out: 'l034', exit: 'drop', idle: { rot: 0.8, f: 0.4 }, layers: [
    { id: 'sg', svg: A2.bigSign(), x: 0, y: 0, w: 560, h: 250, edge: 6 }, { id: 't', key: 'c02_cost', x: 34, y: 28, w: 492, h: 130, max: 110, color: '#B5260E' }] });
  karto.pose('whisper', { at: m0 }); karto.tilt({ deg: 6, at: m0 }); karto.tilt({ deg: 0, at: m2 }); karto.pose('point', { at: m2 }); skip.pose('thinking', { at: m1 });

  /* ---- l033: the GUESS tape across the sign; NO OFFICIAL NUMBER; a small clapperboard beside the sack for scale ---- */
  karto.pose('present', { at: 'l033', sfx: false });
  F.tapeNote(sg, 'guess', s('l033', 0, 0.5), { out: 'l034', fy: 0.66, w: 400, k: tall ? 1.0 : 0.9, tilt: -5 });
  P.stamp('c02_nonumber', { slot: tall ? B(0.02, 0.18, 0.96, 0.22) : Bm(0.0, 0.2, 0.5, 0.2), at: s('l033', 1, 0.1), out: 'l034', tilt: -9, big: true, plane: 'front' });
  F.clapper({ slot: tall ? B(0.62, 0.3, 0.38, 0.3) : Bm(0.7, 0.2, 0.3, 0.34), fit: 1, plane: 'front', at: s('l033', 2, 0.05), out: 'l034', enter: 'drop', idle: { rot: 2, f: 0.5 } });
  skip.pose('deadpan', { at: s('l033', 1) }); skip.pose('thinking', { at: s('l033', 2, 0.3) });

  /* ---- l034: STAMP 2; Skip points at the card, then at Karto; a hotel TV pops ---- */
  F.stamp(2, 'l034:0.22');
  skip.pose('neutral', { at: 'l034', sfx: false }); skip.pose('point', { at: s('l034', 1, 0.1) }); skip.pose('pointL', { at: s('l034', 2) }); skip.tilt({ deg: -4, at: s('l034', 2) });
  karto.pose('shocked', { at: s('l034', 2, 0.15) });
  F.cut('tvIcon', { slot: tall ? B(0.25, 0.1, 0.5, 0.4) : B(0.3, 0.1, 0.4, 0.5), fit: 1, plane: 'front', at: s('l034', 2, 0.3), out: 'l035', exit: 'pop', enter: 'pop', idle: { rot: 4, y: 5, f: 0.8 } });

  /* ---- l035: Piece three. Lights drop to night, the hotel sign flickers on ---- */
  scene.backdrop('night', { at: 'l035' }); skip.tilt({ deg: 0, at: 'l035' }); karto.pose('present', { at: 'l035', sfx: false }); skip.pose('neutral', { at: 'l035', sfx: false });
  const hs = F.piece({ w: 260, h: 440, enter: 'none', slot: tall ? B(0.25, 0, 0.5, 0.9) : B(0.3, 0, 0.4, 1), fit: 1, at: 'l035', out: 'c03', exit: 'cut', layers: [
    { id: 'p', svg: A2.hotelPanel(), x: 0, y: 0, w: 260, h: 440, edge: 7 },
    { id: 't', key: 'c02_hotel', x: 30, y: 90, w: 200, h: 160, max: 70, lines: 2, color: '#FF4FA3', hidden: true, tcss: { textShadow: '0 0 12px #FF4FA3, 0 0 28px #FF4FA3' } }] });
  [0.0, 0.12, 0.2, 0.34, 0.42].forEach((d, i) => (i % 2 ? hs.L('t').hide(T('l035') + d) : hs.L('t').show(T('l035') + d)));
  K.sfx('tick-synth', 'l035', { db: -14 }); K.sfx('hit', T('l035') + 0.34, { db: -14 });
}
