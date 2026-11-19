// c08 - the ending (l094-l099, ~41 s) + kit end screen. Scene author D (finisher). No Short touches this chapter.
// Real media: l096 = price path, PBoC photo, trading floor + paper crowd; l098 = real bars photo behind NOT ADVICE; l099 = Dubai Gold Souk clip on the TV (captioned as the souk, not as a queue).
// Pieces: full score card (cardCenter) + the seven hero props (l094-l095), recap in three beats (l096), NOT ADVICE (l098), the question + queue of sellers (l099), end screen with your_score.
import { D } from './c02.art.js';
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, B = F.B;
  const wt = (w, t) => (tall ? t : w);
  const mid = (id, f) => K.at(id, f);
  F.chapterOpen('c08', { title: false });
  const INK = '#1E1712';

  /* ---------- l094: "That is all seven pieces. The score card is full. Skip, did you survive?" ---------- */
  F.cardCenter('l094', 0.7);
  karto.pose('present', { at: 'l094' }); skip.pose('neutral', { at: 'l094', sfx: false });
  const heroes = ['goldBar', 'seesawTri', 'tv', 'priceTag', 'coins', 'calPage', 'cube'];
  heroes.forEach((n, i) => {
    const at = mid('l094', 0.18 + i * 0.07);
    const sl = wt({ x: 556 + i * 142, y: 650, w: 140, h: 150 }, { x: 70 + i * 124, y: 770, w: 110, h: 128 });
    F.cut(n, { slot: sl, fit: 1, at, out: 'l096', enter: 'drop', exit: 'fly', edge: 5, tilt: (i % 2 ? 3 : -3), idle: { rot: 3, y: 4, f: 0.8 + i * 0.07, ph: i } });
  });
  P.confetti({ at: mid('l094', 0.78) });
  karto.pose('cheer', { at: mid('l094', 0.5) });
  skip.pose('shocked', { at: s3('l094') }); // "Skip, did you survive?"
  function s3(id) { return F.s(id, 2, 0.0); }
  cam.to({ x: 0, y: -6, zoom: 1.06 }, { at: 'l094', dur: 5 });

  /* ---------- l095: "Seven stamps. One almost-skip. You were not boring, Karto." - Skip laughing, holding the stamp ---------- */
  skip.pose('laughing', { at: 'l095' }); skip.hop({ at: 'l095+0.2', h: 70 }); skip.hop({ at: mid('l095', 0.55), h: 50 });
  karto.pose('neutral', { at: 'l095', sfx: false }); karto.pose('cheer', { at: mid('l095', 0.75) });
  const stampSvg = [220, 300, `<rect x="82" y="8" width="56" height="130" rx="22" fill="#8B5A35" stroke="${INK}" stroke-width="7"/><rect x="40" y="130" width="140" height="40" rx="8" fill="#D2361A" stroke="${INK}" stroke-width="7"/><rect x="26" y="170" width="168" height="36" rx="8" fill="#E8D5AE" stroke="${INK}" stroke-width="7"/>`];
  const st = F.piece({ plane: 'front', slot: wt({ x: 1560, y: 650, w: 170, h: 210 }, { x: 640, y: 1040, w: 130, h: 170 }), fit: 1, w: 220, h: 210, at: 'l095+0.1', out: 'l096', enter: 'drop', exit: 'cut', idle: { y: 8, rot: 6, f: 1.2 }, tilt: -10, layers: [{ id: 's', svg: stampSvg, x: 0, y: 0, w: 220, h: 210, edge: 6 }] });
  void st;
  P.confetti({ at: 'l095+0.1' });
  F.card.pulse({ at: mid('l095', 0.35) }); F.card.pulse({ at: mid('l095', 0.8) });
  cam.to({ x: 0, y: -4, zoom: 1.08 }, { at: 'l095', dur: 5 });

  /* ---------- l096: recap, three fast beats on real media ---------- */
  F.cardHome('l096', 0.6);
  cam.reset({ at: 'l096', dur: 0.5 });
  skip.pose('neutral', { at: 'l096', sfx: false }); skip.tilt({ deg: 0, at: 'l096' });
  karto.pose('present', { at: 'l096' });
  // beat A (-30% + the price path): "Gold is about thirty percent below its record. Not in a day."
  const pp = F.pricePath({ slot: wt({ x: 650, y: 70, w: 840, h: 720 }, B(0, 0.12, 1, 0.76)), fit: 1, at: 'l096+0.1', out: mid('l096', 0.4), enter: 'rise', exit: 'fly' });
  for (const k of ['lbl_jan', 'lbl_nov']) pp.ids[k].css = { background: '#FFFDF6', borderRadius: '8px' };
  pp.cols(mid('l096', 0.06), 0.09); pp.label('jan', mid('l096', 0.1));
  pp.token(0, 0, mid('l096', 0.1), 0.1);
  for (let i = 0; i < 7; i++) pp.token(i, i + 1, mid('l096', 0.17 + i * 0.03), 0.3);
  pp.label('nov', mid('l096', 0.36));
  const m30 = P.label('minus30', { slot: wt({ x: 900, y: 130, w: 560, h: 240 }, B(0.3, 0.14, 0.66, 0.24)), plane: 'front', size: 'xl', stock: 'yellow', tape: true, at: mid('l096', 0.22), out: mid('l096', 0.4), tilt: -5, enter: 'slam' });
  void m30;
  karto.pose('point', { at: mid('l096', 0.2) });
  // beat B (central banks kept buying): PBoC building + sign + tick
  const bT = mid('l096', 0.4);
  karto.pose('present', { at: bT });
  F.photo('pboc', { slot: wt({ x: 590, y: 40, w: 540, h: 740 }, B(0, 0, 0.62, 1)), caption: 'cap_pboc', at: bT, out: mid('l096', 0.575), enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  const cbs = wt({ x: 1090, y: 300, w: 410, h: 250 }, B(0.5, 0.3, 0.48, 0.3));
  P.label('cb_buying', { slot: cbs, size: 'xl', stock: 'yellow', tape: true, at: mid('l096', 0.44), out: mid('l096', 0.575), tilt: 3, enter: 'slap' });
  const cr = K.slot(cbs);
  const tk = F.tick({ slot: { x: cr.x + cr.w * 0.5, y: cr.y + cr.h + 6, w: 150, h: 150 }, fit: 1, plane: 'front', at: mid('l096', 0.5), out: mid('l096', 0.575), enter: 'none', tilt: -6 });
  tk.L('tk').set({ sy: 0.05 }, 0).to({ sy: [0.05, 1], sx: [0.2, 1] }, { at: mid('l096', 0.5), dur: 0.35, ease: 'outCubic' }); K.sfx('scratch', mid('l096', 0.5), { db: -10 });
  // beat C (the crowd near the top + rates and dollar)
  const cT = mid('l096', 0.575);
  karto.pose('point', { at: cT });
  F.photo('trading_floor', { slot: wt({ x: 540, y: 30, w: 720, h: 590 }, B(0, 0, 1, 0.62)), caption: 'cap_tf', at: cT, out: 'l098', enter: 'drop', exit: 'fly', tilt: 2, push: 1.08 });
  P.label('peak_price', { slot: wt({ x: 980, y: 50, w: 300, h: 130 }, B(0.55, 0.04, 0.42, 0.14)), plane: 'front', size: 'xl', stock: 'yellow', tape: true, at: mid('l096', 0.6), out: 'l098', tilt: -4, enter: 'slam' });
  const crowd = F.crowd({ rows: 2, cols: 8, expr: 'shout', look: 1, slot: wt({ x: 540, y: 610, w: 760, h: 200 }, B(0, 0.62, 1, 0.3)), fit: 1, plane: 'front', at: mid('l096', 0.64), out: 'l098', enter: 'rise', exit: 'cut' });
  crowd.to({ x: 30 }, { at: mid('l096', 0.7), dur: 3, ease: 'linear' });
  P.label('r_rates', { slot: wt({ x: 1270, y: 280, w: 240, h: 130 }, B(0.5, 0.64, 0.48, 0.12)), size: 'm', stock: 'white', tape: true, at: mid('l096', 0.82), out: 'l098', tilt: -3, enter: 'slap' });
  P.label('r_dollar', { slot: wt({ x: 1270, y: 440, w: 240, h: 130 }, B(0.5, 0.78, 0.48, 0.12)), size: 'm', stock: 'yellow', tape: true, at: mid('l096', 0.9), out: 'l098', tilt: 3, enter: 'slap' });
  cam.to({ x: 10, y: -4, zoom: 1.06 }, { at: cT, dur: 5 });

  /* ---------- l098: "And I will not tell you what to do with gold." ---------- */
  cam.reset({ at: 'l098', dur: 0.4 });
  karto.pose('deadpan', { at: 'l098' }); skip.pose('neutral', { at: 'l098', sfx: false });
  F.photo('boe_bars', { slot: wt({ x: 700, y: 30, w: 560, h: 440 }, B(0.04, 0, 0.92, 0.42)), caption: 'cap_boe_bars', at: 'l098+0.05', out: 'l099', enter: 'drop', exit: 'fly', tilt: -2, push: 1.08 });
  const bear = F.bear({ slot: wt({ x: 610, y: 460, w: 200, h: 330 }, B(0, 0.44, 0.3, 0.5)), fit: 1, at: 'l098+0.2', out: 'l099', enter: 'slide', exit: 'cut', tilt: 6, idle: { rot: 2, f: 0.7 } });
  const bull = F.bull({ slot: wt({ x: 1280, y: 440, w: 230, h: 350 }, B(0.7, 0.44, 0.3, 0.5)), fit: 1, at: 'l098+0.2', out: 'l099', enter: 'slide', exit: 'cut', tilt: -6, idle: { rot: 2, f: 0.7, ph: 1 } });
  bear.to({ x: 30, rot: 10 }, { at: mid('l098', 0.55), dur: 0.2 }); bear.to({ x: 0, rot: 6 }, { at: mid('l098', 0.7), dur: 0.3, ease: 'back(2)' });
  bull.to({ x: -30, rot: -10 }, { at: mid('l098', 0.6), dur: 0.2 }); bull.to({ x: 0, rot: -6 }, { at: mid('l098', 0.75), dur: 0.3, ease: 'back(2)' });
  const na = P.label('not_advice', { slot: wt({ x: 830, y: 530, w: 430, h: 250 }, B(0.2, 0.46, 0.6, 0.3)), plane: 'front', size: 'xl', stock: 'white', ink: '#C0391B', tape: true, at: 'l098+0.1', out: 'l099', tilt: 0, enter: 'slam' });
  for (let i = 0; i < 4; i++) na.to({ rot: i % 2 ? 4 : -4 }, { at: mid('l098', 0.3 + i * 0.16), dur: 0.2, ease: 'inOutQuad' });

  /* ---------- l099: Skip's question: the Dubai souk clip, a cardboard queue at a cardboard shop, PANIC OR SMART big ---------- */
  skip.pose('typing', { at: 'l099' }); skip.hop({ at: 'l099+0.8', h: 80 });
  karto.pose('present', { at: 'l099' });
  const tv = F.tv('souk_clip', { slot: wt({ x: 640, y: 250, w: 340, h: 560 }, B(0, 0.2, 0.44, 0.8)), at: 'l099+0.1', t0: 'l099', out: 'l099:end', enter: 'drop', loop: true, credit: false });
  P.label('cr_clip_souk_clip', { slot: { x: tv.g.left + tv.g.W * 0.02, y: tv.g.bottom - tv.g.chinH * 0.95, w: tv.g.W * 0.96, h: tv.g.chinH * 0.85 }, size: 's', stock: 'white', at: 'l099+0.8', out: 'l099:end', tilt: -2, enter: 'pop', exit: 'cut' });
  P.label('dubai', { slot: { x: tv.g.left + tv.g.W * 0.04, y: tv.g.scrY + 10, w: tv.g.W * 0.92, h: 80 }, size: 's', stock: 'yellow', tape: true, at: mid('l099', 0.12), out: 'l099:end', tilt: -2, enter: 'slap' });
  const shopSlot = wt({ x: 1140, y: 250, w: 370, h: 370 }, B(0.5, 0.26, 0.48, 0.5));
  F.piece({ slot: shopSlot, fit: 1, w: 440, h: 420, at: mid('l099', 0.3), out: 'l099:end', enter: 'rise', exit: 'cut', layers: [{ id: 's', art: D.shop(), x: 0, y: 0, w: 440, h: 420, edge: 7 }] });
  for (let i = 0; i < 4; i++) F.crowd({ rows: 1, cols: 1, expr: i % 2 ? 'calm' : 'shout', look: 1, seed: i + 2, slot: wt({ x: 1130 + i * 88, y: 600, w: 150, h: 180 }, { x: 440 + i * 90, y: 640, w: 100, h: 130 }), fit: 1, plane: 'front', at: mid('l099', 0.36 + i * 0.05), out: 'l099:end', enter: 'slide', exit: 'cut' });
  P.label('queue_sellers', { slot: wt({ x: 1130, y: 735, w: 380, h: 80 }, B(0.5, 0.78, 0.48, 0.12)), size: 's', stock: 'white', tape: true, at: mid('l099', 0.42), out: 'l099:end', tilt: 3, enter: 'slap' });
  const pas = P.label('panic_or_smart', { slot: wt({ x: 540, y: 48, w: 940, h: 215 }, B(0, 0.02, 1, 0.2)), plane: 'front', size: 'xl', stock: 'yellow', tape: true, at: mid('l099', 0.2), out: 'l099:end', tilt: -2, enter: 'drop' });
  pas.pulse({ at: mid('l099', 0.55) }); pas.pulse({ at: mid('l099', 0.8) });
  if (!tall) {
    P.arrow({ x: 880, y: 250 }, { x: 820, y: 330 }, { at: mid('l099', 0.55), out: 'l099:end', color: '#C0391B', width: 12, bow: 0.12 });
    P.arrow({ x: 1150, y: 250 }, { x: 1260, y: 320 }, { at: mid('l099', 0.6), out: 'l099:end', color: '#2F8F3A', width: 12, bow: -0.12 });
  }

  /* ---------- end screen: card and props gone, the score question sits beside the subscribe ring ---------- */
  const e0 = T('l099:end');
  K.tl.to(F.card.v, { op: [1, 0] }, { at: e0 - 0.05, dur: 0.3, ease: 'linear' });
  karto.pose('present', { at: e0 }); skip.pose('typing', { at: e0 + 0.1 });
  P.endScreen({ at: e0 });
}
