// c07 - piece seven: what now (l081-l093). Scene author C. Short s7 = l087-l093 (tall).
// Real media: cb_vault (old photo), pboc, nbp_building, trading_floor, goldman, mine, seven_storey, nugget, bar_stamps, clip pour.
// Every forecast is visibly taped (forecast_tape). Words only through string keys.
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B;
  const ST = (w, t) => (tall ? t : w);
  F.chapterOpen('c07');

  /* ---------- l081: old vault photo + a counter that grows to ~289 t, REPORTED tape ---------- */
  karto.pose('present', { at: K.at('l081', 0.3) });
  F.photo('cb_vault', { slot: ST({ x: 630, y: 50, w: 500, h: 730 }, B(0, 0, 1, 0.6)), caption: 'cap_vault_old', at: K.at('l081', 0.28), out: 'l083', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  const cs = K.at('l081', 0.62), cd = Math.max(1.0, K.at('l081', 0.95) - cs);
  const ctr = F.piece({ slot: ST({ x: 1160, y: 330, w: 340, h: 190 }, B(0.08, 0.64, 0.84, 0.2)), fit: 1, w: 400, h: 190, at: cs, out: 'l083', enter: 'none', exit: 'fly', tilt: 3, layers: [
    { id: 'bg', art: 'priceTag', x: 0, y: 0, w: 400, h: 190, edge: 7, hidden: false },
    { id: 't', key: 'cb_tonnes', x: 70, y: 34, w: 260, h: 120, max: 80, lines: 2, color: '#2B2015' }] });
  ctr.L('bg').to({ sc: [0.2, 1] }, { at: cs, dur: cd, ease: 'outBack' }); ctr.L('t').to({ sc: [0.2, 1] }, { at: cs, dur: cd, ease: 'outBack' });
  K.sfx('riser', cs, { dur: cd, db: -10 }); K.sfx('ding', cs + cd, { db: -8 }); karto.pose('cheer', { at: cs + cd });
  P.label('reported', { slot: ST({ x: 1170, y: 560, w: 320, h: 100 }, B(0.3, 0.86, 0.4, 0.12)), size: 'm', stock: 'white', tape: true, at: cs + cd + 0.1, out: 'l083', tilt: -4, enter: 'slap' });
  cam.to({ x: 20, y: -4, zoom: 1.07 }, { at: K.at('l081', 0.3), dur: 4 });

  /* ---------- l082: "Which central banks?" ---------- */
  cam.reset({ at: 'l082', dur: 0.4 });
  skip.pose('neutral', { at: 'l082', sfx: false }); skip.tilt({ deg: 6, at: 'l082+0.1' }); skip.hop({ at: 'l082:0.6', h: 22 });
  karto.pose('neutral', { at: 'l082', sfx: false });

  /* ---------- l083: China (PBoC building), Poland (NBP building), Uzbekistan (name card, no photo) ---------- */
  skip.tilt({ deg: 0, at: 'l083' }); skip.pose('neutral', { at: 'l083', sfx: false }); karto.pose('present', { at: 'l083' });
  F.photo('pboc', { slot: ST({ x: 640, y: 40, w: 420, h: 620 }, B(0, 0, 0.5, 0.62)), caption: 'cap_pboc', at: K.at('l083', 0.08), out: 'l084', enter: 'drop', exit: 'fly', tilt: -3, push: 1.1 });
  F.photo('nbp_building', { slot: ST({ x: 1080, y: 40, w: 420, h: 620 }, B(0.5, 0, 0.5, 0.62)), caption: 'cap_nbp', at: K.at('l083', 0.4), out: 'l084', enter: 'drop', exit: 'fly', tilt: 3, push: 1.1 });
  P.label('cb_uz', { slot: ST({ x: 790, y: 670, w: 440, h: 130 }, B(0.2, 0.7, 0.6, 0.2)), size: 'xl', stock: 'yellow', tape: true, at: K.at('l083', 0.72), out: 'l084', tilt: -3, enter: 'slam' });
  karto.pose('point', { at: K.at('l083', 0.1) }); karto.pose('cheer', { at: K.at('l083', 0.72) });

  /* ---------- l084: "Forecasts now. I tape every one." - a trading floor, the FORECAST, NOT FACT tape across the top ---------- */
  skip.pose('neutral', { at: 'l084', sfx: false });
  const zr = K.slot(ST(F.Z.big, B(0, 0, 1, 0.9)));
  F.photo('trading_floor', { slot: ST(F.Z.big, B(0, 0, 1, 0.9)), caption: 'cap_tf', at: 'l084+0.05', out: 'l085', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });
  karto.pose('point', { at: s('l084', 1) });
  F.tapeNote({ x: zr.x + zr.w / 2, y: zr.y + zr.h * 0.1 }, 'forecast_tape', s('l084', 1, 0.15), { w: ST(760, 640), tilt: -4, out: 'l085', exit: 'cut', k: ST(1.1, 0.95) });
  cam.to({ x: 15, y: -4, zoom: 1.07 }, { at: 'l084', dur: 4 });

  /* ---------- l085: Goldman building + a forecast card with one step up, taped ---------- */
  cam.reset({ at: 'l085', dur: 0.4 });
  karto.pose('present', { at: 'l085' });
  F.photo('goldman', { slot: ST({ x: 640, y: 60, w: 400, h: 600 }, B(0, 0, 0.52, 0.6)), caption: 'cap_goldman', at: 'l085+0.05', out: 'l087', enter: 'drop', exit: 'fly', tilt: -3, push: 1.1 });
  const gc = F.piece({ slot: ST({ x: 1040, y: 50, w: 440, h: 740 }, B(0.42, 0, 0.58, 1)), fit: 1, w: 470, h: 720, at: s('l085', 0, 0.15), out: 'l087', enter: 'drop', exit: 'fly', tilt: 3, layers: [
    { id: 'bg', svg: [470, 720, '<rect x="6" y="6" width="458" height="708" rx="14" fill="#FFFDF6" stroke="#1E1712" stroke-width="6"/>'], x: 0, y: 0, w: 470, h: 720, edge: 6, paper: true },
    { id: 'c', key: 'gs_card', x: 26, y: 24, w: 418, h: 150, max: 44, lines: 3, color: '#2B2015' },
    { id: 'lo', art: 'stepCol', ao: { w: 170, h: 230, col: '#C99A62' }, x: 40, y: 440, w: 170, h: 230, edge: 5 },
    { id: 'hi', art: 'stepCol', ao: { w: 170, h: 420, col: '#F2B824' }, x: 250, y: 250, w: 170, h: 420, edge: 5, hidden: true, origin: '50% 100%' },
    { id: 'p', key: 'gs_2027', x: 195, y: 190, w: 250, h: 140, max: 48, lines: 3, color: '#C0391B', hidden: true }] });
  const up = s('l085', 0, 0.5);
  gc.L('hi').show(up).to({ sy: [0.5, 1] }, { at: up, dur: 0.7, ease: 'back(1.6)' }); K.sfx('riser', up, { dur: 0.7, db: -12 }); gc.L('p').pop(up + 0.6, { from: 0.3 });
  const gt = F.tapeNote(gc.pt(0.5, 0.6), 'forecast_tape', up + 0.9, { w: 330, tilt: -8, out: 'l087', exit: 'cut', k: ST(1.0, 0.8) });
  cam.to({ x: 20, y: -4, zoom: 1.06 }, { at: 'l085', dur: 4 });

  /* ---------- l085b: "So, up?" - Skip, arms crossed, looks at the card ---------- */
  skip.pose('neutral', { at: 'l085b', sfx: false }); skip.tilt({ deg: -6, at: 'l085b+0.1' }); karto.pose('neutral', { at: 'l085b', sfx: false });

  /* ---------- l087: the BEAR: a big NYSE floor photo, cutout + red arrow down, tags (nothing crosses a label) ---------- */
  cam.reset({ at: 'l087', dur: 0.4 });
  skip.tilt({ deg: 0, at: 'l087' }); skip.pose('neutral', { at: 'l087', sfx: false }); karto.pose('present', { at: 'l087' });
  const PH = ST({ x: 560, y: 20, w: 900, h: 470 }, B(0, 0, 1, 0.5));   // top real-photo zone of l088-l089 (landscape photos)
  F.photo('trading_floor', { slot: ST({ x: 1100, y: 20, w: 420, h: 790 }, B(0, 0, 1, 0.5)), caption: 'cap_tf', at: 'l087+0.1', out: ST('l088', s('l087', 2, 0.2)), enter: 'drop', exit: 'fly', tilt: 2, push: 1.08 });
  const bear = F.bear({ slot: ST({ x: 610, y: 520, w: 210, h: 285 }, B(0, 0.53, 0.5, 0.46)), fit: 1, at: s('l087', 1, 0.5), out: 'l091', enter: 'slide', exit: 'cut', idle: { rot: 1.5, f: 0.5 } });
  bear.to({ y: [-60, 0] }, { at: s('l087', 1, 0.5), dur: 0.5, ease: 'bounce' }); K.sfx('tap', s('l087', 1, 0.75), { db: -10 });
  P.label('bear_a', { slot: ST({ x: 640, y: 280, w: 440, h: 200 }, B(0, 0.33, 0.52, 0.2)), size: 'l', stock: 'white', tape: true, at: s('l087', 2, 0.25), out: ST('l088', 'l090'), tilt: -3, enter: 'slap' });
  if (!tall) P.label('bear_a', { slot: { x: 850, y: 505, w: 400, h: 140 }, size: 'l', stock: 'white', tape: true, at: 'l088+0.1', out: 'l090', tilt: -3, enter: 'slap' });
  P.label('kitco_poll', { slot: ST({ x: 640, y: 90, w: 440, h: 170 }, B(0.48, 0.33, 0.52, 0.2)), size: 'm', stock: 'yellow', tape: true, at: s('l087', 3, 0.1), out: 'l088', tilt: 3, enter: 'slap' });
  const bd = K.slot(B(0, 0, 1, 1)), BP = (fx, fy) => ({ x: bd.x + fx * bd.w, y: bd.y + fy * bd.h });
  const A1 = ST({ x: 836, y: 530 }, BP(0.42, 0.5)), A2 = ST({ x: 836, y: 780 }, BP(0.52, 0.8));
  P.arrow(A1, A2, { at: s('l087', 2, 0.5), out: 'l090', color: '#C0391B', width: 12, bow: 0.04 });
  karto.pose('point', { at: s('l087', 2) });

  /* ---------- l088: the BULL hops in opposite, green arrow up; bull_a; a real bar photo on top ---------- */
  skip.pose('neutral', { at: 'l088', sfx: false }); karto.pose('present', { at: 'l088' });
  if (!tall) F.photo('boe_bars', { slot: PH, caption: 'cap_boe_bars', at: 'l088+0.05', out: 'l089', enter: 'drop', exit: 'fly', tilt: -2, push: 1.08 });
  const bull = F.bull({ slot: ST({ x: 1280, y: 520, w: 230, h: 285 }, B(0.5, 0.53, 0.5, 0.46)), fit: 1, at: 'l088+0.1', out: 'l091', enter: 'slide', exit: 'cut', idle: { rot: 1.5, f: 0.5 } });
  bull.to({ y: [-80, 0] }, { at: 'l088+0.1', dur: 0.55, ease: 'bounce' }); K.sfx('thud', 'l088+0.35', { db: -9 });
  P.label('bull_a', { slot: ST({ x: 850, y: 660, w: 400, h: 140 }, B(0.48, 0.33, 0.52, 0.2)), size: 'l', stock: 'yellow', tape: true, at: K.at('l088', 0.35), out: 'l090', tilt: 3, enter: 'slap' });
  const A3 = ST({ x: 1264, y: 780 }, BP(0.42, 0.8)), A4 = ST({ x: 1264, y: 530 }, BP(0.55, 0.5));
  P.arrow(A3, A4, { at: K.at('l088', 0.5), out: 'l090', color: '#2F8F3A', width: 12, bow: -0.04 });
  cam.to({ x: 0, y: 0, zoom: 1.05 }, { at: 'l088', dur: 3 });

  /* ---------- l089: "So who is right?" - Skip looks left and right; the vault photo ---------- */
  skip.pose('thinking', { at: 'l089' }); skip.tilt({ deg: -8, at: 'l089+0.1' }); skip.tilt({ deg: 8, at: K.at('l089', 0.55) }); karto.pose('neutral', { at: 'l089', sfx: false });
  if (!tall) F.photo('bars_vault', { slot: PH, caption: 'cap_bars_vault', at: 'l089+0.05', out: 'l090', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });

  /* ---------- l090: NOBODY KNOWS big beside the real bar-unpacking clip, NOT ADVICE sign on Karto's neck, a question mark between the pair ---------- */
  skip.tilt({ deg: 0, at: 'l090' }); skip.pose('neutral', { at: 'l090', sfx: false });
  karto.pose('deadpan', { at: 'l090' });
  if (!tall) {
    const bh = F.tv('bars_hands', { slot: { x: 1170, y: 0, w: 320, h: 430 }, at: 'l090+0.05', t0: 'l090', out: 'l091', enter: 'drop', loop: true, credit: false });
    P.label('cr_clip_bars_hands', { slot: { x: bh.g.left - 40, y: bh.g.bottom + 6, w: bh.g.W + 80, h: 54 }, size: 's', stock: 'white', at: 'l090+0.7', out: 'l091', tilt: -2, enter: 'pop', exit: 'cut' });
  }
  const nk = P.label('nobody_knows', { slot: ST({ x: 580, y: 100, w: 540, h: 330 }, B(0.04, 0.02, 0.92, 0.28)), size: 'xl', stock: 'yellow', tape: true, at: s('l090', 0, 0.1), out: 'l091', tilt: -3, enter: 'slam' });
  void nk;
  F.cut('qmark', { slot: ST({ x: 960, y: 330, w: 130, h: 200 }, B(0.36, 0.34, 0.28, 0.3)), fit: 1, plane: 'front', at: s('l090', 0, 0.3), out: 'l091', enter: 'pop', exit: 'cut', idle: { rot: 9, y: 8, f: 1.1 } });
  const na = P.label('not_advice', { slot: ST({ x: 110, y: 610, w: 400, h: 120 }, B(0.14, 0.31, 0.72, 0.13)), size: 'l', stock: 'white', tape: true, plane: 'front', at: s('l090', 2, 0.0), out: 'l091', tilt: 0, enter: 'drop' });
  for (let i = 0; i < 5; i++) na.to({ rot: i % 2 ? 5 : -5 }, { at: s('l090', 2, 0.0) + 0.4 + i * 0.35, dur: 0.35, ease: 'inOutQuad' });
  cam.to({ x: -10, y: 0, zoom: 1.06 }, { at: 'l090', dur: 5 });

  /* ---------- l091: wow fact - the mine photo, then the CUBE as the hero of the board with the seven-storey building, label slams, the real building photo beside ---------- */
  cam.reset({ at: 'l091', dur: 0.4 });
  karto.pose('present', { at: s('l091', 0) }); karto.pose('cheer', { at: s('l091', 1, 0.5) });
  F.photo('mine', { slot: ST({ x: 570, y: 30, w: 760, h: 720 }, B(0, 0, 1, 0.42)), caption: 'cap_mine', at: s('l091', 0, 0.2), out: ST(s('l091', 1, 0.0), 'l092+0.6'), enter: 'drop', exit: 'fly', tilt: -2, push: 1.12 });
  const cb = F.cubeScale({ slot: ST({ x: 660, y: 20, w: 600, h: 570 }, B(0, 0.42, 0.62, 0.58)), fit: 1.1, at: s('l091', 1, 0.0), out: 'l093', enter: 'none', exit: 'fly' });
  cb.L('cube').set({ op: 0 }, 0); cb.L('bld').set({ op: 0 }, 0);
  const cg = s('l091', 1, 0.05); cb.L('cube').pop(cg, { from: 0.1, dur: 0.6 }); cb.L('bld').pop(cg + 0.55, { from: 0.2 });
  P.label('cube_22m', { slot: ST({ x: 660, y: 590, w: 580, h: 220 }, B(0.58, 0.44, 0.42, 0.28)), size: 'xl', stock: 'yellow', tape: true, at: cg + 0.7, out: 'l093', tilt: -2, enter: 'slam' });
  F.crowd({ rows: 1, cols: 1, expr: 'happy', slot: ST({ x: 1100, y: 450, w: 120, h: 130 }, B(0.5, 0.82, 0.14, 0.18)), fit: 1, plane: 'front', at: cg + 0.9, out: 'l093', enter: 'rise', exit: 'cut' });
  F.photo('seven_storey', { slot: ST({ x: 1235, y: 240, w: 285, h: 560 }, B(0.6, 0.72, 0.4, 0.28)), caption: 'cap_seven', at: s('l091', 1, 0.55), out: 'l093', enter: 'drop', exit: 'fly', tilt: 4, push: 1.05 });

  /* ---------- l092: "That is smaller than I thought." - Skip mindblown, nugget photo, a single bar ---------- */
  skip.pose('mindblown', { at: 'l092' }); skip.hop({ at: 'l092+0.15', h: 60 }); karto.pose('neutral', { at: 'l092', sfx: false });
  F.cut('burst', { slot: ST({ x: 1560, y: 420, w: 220, h: 190 }, { x: 590, y: 1040, w: 210, h: 180 }), fit: 1, plane: 'front', at: 'l092+0.2', out: 'l093', enter: 'pop', exit: 'cut', idle: { rot: 4, f: 1.2 } });
  K.sfx('pop', 'l092+0.2', { db: -8 });
  F.photo('nugget', { slot: ST({ x: 600, y: 30, w: 480, h: 520 }, B(0, 0, 1, 0.42)), caption: 'cap_nugget', at: 'l092+0.6', out: 'l093', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });
  F.goldBar({ slot: ST({ x: 1640, y: 740, w: 220, h: 120 }, { x: 600, y: 1090, w: 220, h: 120 }), fit: 1, plane: 'front', at: 'l092+0.3', out: 'l093', enter: 'drop', exit: 'cut', idle: { rot: 8, y: 4, f: 1.1 } });

  /* ---------- l093: the pour on the cardboard TV + bar_kg; stamp 7; then Skip's big question ---------- */
  skip.pose('neutral', { at: 'l093', sfx: false }); karto.pose('present', { at: 'l093' });
  const tv = F.tv('pour', { slot: ST({ x: 660, y: 10, w: 440, h: 820 }, B(0, 0, 0.55, 1)), at: 'l093+0.05', t0: 'l093', out: 'l094', enter: 'drop', loop: true });
  P.label('bar_kg', { slot: ST({ x: tv.g.scrX, y: tv.g.scrY + tv.g.sh * 0.74, w: tv.g.sw, h: 120 }, B(0.02, 0.76, 0.54, 0.14)), size: 'm', stock: 'yellow', tape: true, at: K.at('l093', 0.3), out: 'l094', tilt: -3, enter: 'slap' });
  F.photo('bar_stamps', { slot: ST({ x: 1110, y: 250, w: 390, h: 540 }, B(0.5, 0.04, 0.5, 0.5)), caption: 'cap_bar_stamps', at: K.at('l093', 0.18), out: 'l094', enter: 'drop', exit: 'fly', tilt: 3, push: 1.1 });
  const sa = s('l093', 1, 0.0); F.stamp(7, sa); karto.pose('cheer', { at: T(sa) + 0.6 });
  P.label('stamp_piece', { plane: 'hud', slot: ST({ x: 770, y: 660, w: 600, h: 100 }, { x: 190, y: 800, w: 600, h: 90 }), size: 'm', stock: 'yellow', tape: true, at: T(sa) + 0.8, out: T(sa) + 1.9, tilt: -2, enter: 'slap' });
  const qa = s('l093', 1, 0.62);
  skip.pose('thinking', { at: qa }); skip.tilt({ deg: -5, at: qa + 0.1 });
  F.cut('qmark', { slot: ST({ x: 1600, y: 330, w: 150, h: 210 }, { x: 650, y: 1040, w: 120, h: 170 }), fit: 1, plane: 'front', at: qa, out: 'l094', enter: 'pop', exit: 'cut', idle: { rot: 8, y: 4, f: 1 } });
}
