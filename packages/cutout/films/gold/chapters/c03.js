// c03 - piece three: the slow leak (l033-l043, ~72 s). Scene author A. Short s3 = l036-l043 (tall).
// Real media: shelf_prices + oil_rig (l035-l036), fed_building (l037), dollar_bill (l038-l039), the three photos again on the way to the tarp machine (l043).
// Models: shared price path (slow slide, then the -30% add-up), cardboard thermometer, rate dial, dollar-up / gold-down bars, price board.
import { D, ink } from './c02.art.js';
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B;
  const wt = (w, t) => (tall ? t : w);
  const lblBg = (p) => { for (const k of ['lbl_jan', 'lbl_nov']) if (p.ids[k]) p.ids[k].css = { background: '#FFFDF6', borderRadius: '8px' }; return p; };
  F.chapterOpen('c03');
  const mid = (id, f) => K.at(id, f);
  const qmark = (at, out) => F.cut('qmark', { slot: wt({ x: 1530, y: 250, w: 130, h: 170 }, { x: 650, y: 1040, w: 110, h: 150 }), fit: 1, plane: 'front', at, out, enter: 'pop', exit: 'cut', idle: { rot: 6, f: 0.9 } });

  /* ---------- l033: "Piece three. The slow leak. After the big day, gold did not crash again. It slid, a little at a time." ---------- */
  karto.pose('present', { at: mid('l033', 0.25) });
  const pp = lblBg(F.pricePath({ slot: wt({ x: 660, y: 90, w: 850, h: 700 }, B(0, 0.1, 1, 0.8)), fit: 1, at: mid('l033', 0.22), out: 'l035', enter: 'rise', exit: 'fly' }));
  const b0 = mid('l033', 0.26);
  pp.cols(b0, 0.16); pp.label('jan', b0 + 1.4);
  const hop = s('l033', 3, 0.0);
  pp.token(0, 0, b0 + 0.1, 0.1);
  for (let i = 0; i < 7; i++) { pp.token(i, i + 1, hop + i * 0.32, 0.26); K.sfx('tap', hop + i * 0.32 + 0.26, { db: -11 }); }
  pp.label('nov', hop + 7 * 0.32 + 0.1);
  cam.to({ x: 20, y: -6, zoom: 1.06 }, { at: b0, dur: 6 });

  /* ---------- l034: "So a slow, boring slide. Great." ---------- */
  skip.pose('deadpan', { at: 'l034' }); skip.tilt({ deg: -6, at: 'l034+0.3', dur: 0.5 }); skip.tilt({ deg: 3, at: 'l034+1.2', dur: 0.4 }); karto.pose('neutral', { at: 'l034', sfx: false });
  pp.L('tok').wiggle(mid('l034', 0.5));

  /* ---------- l035: inflation: shop price tags + the oil pump + the thermometer shoots past the red line ---------- */
  skip.tilt({ deg: 0, at: 'l035' }); skip.pose('neutral', { at: 'l035', sfx: false }); karto.pose('present', { at: 'l035' }); cam.reset({ at: 'l035', dur: 0.4 });
  const shSlot = wt({ x: 660, y: 30, w: 600, h: 440 }, B(0, 0, 1, 0.46));
  F.photo('shelf_prices', { slot: shSlot, caption: 'cap_shelf', at: 'l035+0.15', out: 'l038', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  const th = F.piece({ slot: wt({ x: 1150, y: 50, w: 340, h: 650 }, B(0.62, 0.42, 0.34, 0.58)), fit: 1, w: 200, h: 560, at: s('l035', 1, 0.0), out: 'l037', enter: 'rise', exit: 'fly', tilt: 2, layers: [
    { id: 'base', art: D.thermo(), x: 40, y: 0, w: 120, h: 560, edge: 6 },
    { id: 'bulb', art: D.mercBulb(), x: 58, y: 452, w: 84, h: 84, flat: true },
    { id: 'merc', art: D.mercTube(), x: 86, y: 30, w: 28, h: 424, flat: true, origin: '50% 100%', sy: 0.25 },
    { id: 'line', art: D.redline(), x: 0, y: 130, w: 200, h: 26, flat: true }] });
  const m0 = s('l035', 1, 0.12);
  th.L('merc').to({ sy: [0.25, 0.95] }, { at: m0, dur: 1.3, ease: 'outBack' }); K.sfx('riser', m0, { dur: 1.2, db: -12 });
  for (let i = 0; i < 6; i++) th.L('line').to({ sc: i % 2 ? 1 : 1.25 }, { at: m0 + 1.0 + i * 0.12, dur: 0.12 });
  P.label('cpi', { slot: wt({ x: 1250, y: 715, w: 300, h: 90 }, B(0.02, 0.905, 0.58, 0.09)), size: 's', stock: 'yellow', tape: true, at: m0 + 0.2, out: 'l037', tilt: -2, enter: 'slap' });
  P.label('nov10', { slot: wt({ x: 700, y: 40, w: 200, h: 70 }, B(0.02, 0.02, 0.3, 0.07)), size: 's', stock: 'yellow', tape: true, at: 'l035+0.45', out: 'l037', tilt: -5, enter: 'slap' });
  const oilT = s('l035', 1, 0.62);
  F.photo('oil_rig', { slot: wt({ x: 680, y: 420, w: 560, h: 390 }, B(0, 0.46, 0.58, 0.4)), caption: 'cap_oil', at: oilT, out: 'l037', enter: 'drop', exit: 'fly', tilt: 2.5, push: 1.1 });

  /* ---------- l036: "Wait. Gold is supposed to like inflation." - a gold bar that should go UP ---------- */
  skip.pose('point', { at: 'l036' }); skip.hop({ at: 'l036+0.4', h: 36 }); karto.pose('neutral', { at: 'l036', sfx: false });
  if (!tall) P.label('infl_gold', { slot: wt({ x: 1560, y: 660, w: 340, h: 130 }, { x: 560, y: 1030, w: 300, h: 110 }), plane: 'front', size: 's', stock: 'yellow', tape: true, at: 'l036+0.2', out: 'l037+0.3', tilt: -3, enter: 'slap' });
  const gb = F.goldBar({ slot: wt({ x: 1330, y: 60, w: 200, h: 120 }, B(0.74, 0.3, 0.26, 0.14)), fit: 1, plane: 'front', at: s('l036', 1, 0.1), out: 'l038', enter: 'drop', exit: 'fly', idle: { rot: 3, f: 0.8 } });
  if (!tall) P.arrow({ x: 1300, y: 560 }, { x: 1330, y: 190 }, { at: s('l036', 1, 0.3), out: 'l037+0.5', color: '#2E7D3E', width: 14, bow: -0.1 });

  /* ---------- l037: Fed building + rate dial: cuts -> hike bets; the thumb flips; the gold bar drops ---------- */
  skip.pose('neutral', { at: 'l037', sfx: false }); karto.pose('present', { at: 'l037' });
  F.photo('fed_building', { slot: wt({ x: 660, y: 60, w: 500, h: 500 }, B(0, 0, 1, 0.5)), caption: 'cap_fed_board', at: 'l037+0.15', out: 'l038', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  const dial = F.piece({ slot: wt({ x: 1150, y: 130, w: 380, h: 380 }, B(0.0, 0.5, 0.62, 0.3)), fit: 1, w: 440, h: 300, at: s('l037', 1, 0.1), out: 'l038', enter: 'rise', exit: 'fly', layers: [
    { id: 'g', art: D.gauge({ faces: false }), x: 0, y: 20, w: 440, h: 270, edge: 7 },
    { id: 'n', art: D.needle(), x: 200, y: 62, w: 40, h: 230, edge: 3, origin: '50% 93%', rot: -58 }] });
  const dl = s('l037', 2, 0.1);
  dial.L('n').to({ rot: 64 }, { at: dl, dur: 0.4, ease: 'back(2.2)' }); K.sfx('thud', dl + 0.25, { db: -9 }); cam.shake(dl + 0.3, { amp: 5, dur: 0.25 });
  P.label('cuts', { slot: wt({ x: 1180, y: 570, w: 240, h: 70 }, B(0.02, 0.8, 0.3, 0.08)), size: 's', stock: 'white', tape: true, at: s('l037', 1, 0.3), out: 'l038', tilt: -3, enter: 'slap' });
  P.label('hike_bets', { slot: wt({ x: 1410, y: 570, w: 260, h: 70 }, B(0.34, 0.8, 0.3, 0.08)), size: 's', stock: 'yellow', tape: true, at: dl + 0.2, out: 'l038', tilt: 3, enter: 'slam' });
  const thumb = F.piece({ slot: wt({ x: 1260, y: 640, w: 160, h: 170 }, { x: 700, y: 0, w: 1, h: 1 }), fit: 1, w: 130, h: 150, at: s('l037', 1, 0.4), out: 'l038', enter: 'pop', exit: 'cut', layers: [{ id: 'th', art: D.thumb(), x: 0, y: 0, w: 130, h: 150, edge: 5, origin: '50% 50%' }] });
  thumb.L('th').to({ rot: 180, sx: -1 }, { at: dl + 0.1, dur: 0.35, ease: 'back(2)' });
  gb.to({ y: wt(520, 400), rot: 40 }, { at: s('l037', 1, 0.6), dur: 0.9, ease: 'inQuad' }); K.sfx('whoosh', s('l037', 1, 0.6), { db: -9 });
  skip.pose('shocked', { at: dl }); karto.pose('deadpan', { at: dl + 0.5 });

  /* ---------- l038: dollar photo; dollar bar UP, gold bar DOWN with -2.7% stamped on it ---------- */
  skip.pose('neutral', { at: 'l038', sfx: false }); karto.pose('present', { at: 'l038' }); cam.reset({ at: 'l038', dur: 0.4 });
  F.photo('dollar_bill', { slot: wt({ x: 560, y: 40, w: 560, h: 480 }, B(0, 0, 1, 0.4)), caption: 'cap_dollar', at: 'l038+0.15', out: 'l040', enter: 'drop', exit: 'fly', tilt: -2.5, push: 1.12 });
  const ch = F.piece({ slot: wt({ x: 1130, y: 40, w: 380, h: 760 }, B(0.1, 0.5, 0.8, 0.5)), fit: 1, w: 420, h: 680, at: s('l038', 1, 0.0), out: 'l040', enter: 'rise', exit: 'fly', layers: [
    { id: 'base', art: 'barBlock', ao: { w: 400, h: 22, col: '#A97A45' }, x: 10, y: 330, w: 400, h: 22, edge: 4 },
    { id: 'bd', art: 'barBlock', ao: { w: 150, h: 240, col: '#57A05A' }, x: 40, y: 90, w: 150, h: 240, edge: 5, origin: '50% 100%', hidden: true },
    { id: 'bg', art: 'barBlock', ao: { w: 150, h: 250, col: '#E5401D' }, x: 230, y: 352, w: 150, h: 250, edge: 5, origin: '50% 0%', hidden: true },
    { id: 'td', key: 'b_dollar', x: 20, y: 20, w: 190, h: 60, max: 48, color: '#1E1712' }, { id: 'tg', key: 'b_gold', x: 210, y: 612, w: 190, h: 60, max: 48, color: '#1E1712' }] });
  const m27 = P.label('minus27', { slot: wt({ x: 650, y: 585, w: 470, h: 215 }, B(0.0, 0.42, 0.62, 0.12)), plane: 'front', size: 'xl', stock: 'black', ink: '#FFD23F', tape: true, at: s('l038', 1, 0.15) + 0.7, out: 'l040', tilt: -4, enter: 'slam' });
  const gl = s('l038', 1, 0.15);
  ch.L('bd').show(s('l038', 0, 0.55)).to({ sy: [0.03, 1] }, { at: s('l038', 0, 0.55), dur: 0.8, ease: 'outCubic' }); K.sfx('riser', s('l038', 0, 0.55), { dur: 0.7, db: -12 });
  ch.L('bg').show(gl).to({ sy: [0.03, 1] }, { at: gl, dur: 0.6, ease: 'outCubic' }); K.sfx('thud', gl + 0.55, { db: -8 });
  cam.shake(gl + 0.75, { amp: 9, dur: 0.3 }); K.sfx('hit', gl + 0.72, { db: -8 }); void m27;
  skip.pose('shocked', { at: gl + 0.7 });

  /* ---------- l039: "So where is gold now?" ---------- */
  skip.pose('neutral', { at: 'l039', sfx: false }); skip.hop({ at: 'l039+0.2', h: 30 }); karto.pose('neutral', { at: 'l039', sfx: false });

  /* ---------- l040: mid-November price board, label "lowest in over a year" ---------- */
  karto.pose('present', { at: 'l040' }); skip.tilt({ deg: 0, at: 'l040' });
  const pb = F.priceBoard(['board_title', 'now_price', 'low_lbl'], { slot: wt({ x: 540, y: 70, w: 780, h: 720 }, B(0, 0.02, 1, 0.9)), fit: 1, hideRows: true, at: 'l040', out: 'l041', enter: 'drop', exit: 'fly', tilt: -1.5 });
  pb.L('r0').pop(mid('l040', 0.08), { sfx: false });
  pb.L('r1').pop(mid('l040', 0.3)); K.sfx('thud', mid('l040', 0.34), { db: -8 }); pb.L('r2').slam(mid('l040', 0.62), { amp: 8 });
  const bear = F.bear({ slot: wt({ x: 1260, y: 330, w: 260, h: 380 }, B(0.72, 0.4, 0.28, 0.5)), fit: 1, at: mid('l040', 0.55), out: 'l041', enter: 'rise', exit: 'cut', tilt: 3 });
  cam.to({ x: -10, y: 0, zoom: 1.07 }, { at: 'l040', dur: 5 });

  /* ---------- l041: add it up: the whole slide, a measuring arrow, -30% (the peak) ---------- */
  karto.pose('point', { at: 'l041' }); skip.pose('neutral', { at: 'l041', sfx: false }); cam.reset({ at: 'l041', dur: 0.4 });
  const p2 = lblBg(F.pricePath({ slot: wt({ x: 660, y: 110, w: 850, h: 680 }, B(0, 0.1, 1, 0.8)), fit: 1, at: 'l041+0.05', out: 'l043', enter: 'rise', exit: 'fly' }));
  const q0 = mid('l041', 0.06);
  p2.cols(q0, 0.07); p2.label('jan', q0 + 0.7); p2.label('nov', q0 + 1.0);
  p2.token(7, 7, q0 + 0.6, 0.1);
  const a0 = s('l041', 1, 0.05);
  P.arrow(p2.lpt('c0', 0.5, 0.0), p2.lpt('c7', 0.5, 0.0), { at: a0, out: 'l043', color: '#C0391B', width: 14, bow: -0.08 });
  K.sfx('whoosh', a0, { db: -8 });
  const pk = s('l041', 1, 0.5);
  P.label('minus30', { slot: wt({ x: 1040, y: 40, w: 460, h: 180 }, B(0.5, 0.0, 0.48, 0.11)), size: 'xl', stock: 'yellow', tape: true, at: pk, out: 'l043', tilt: -4, enter: 'slam', plane: 'front' });
  cam.shake(pk + 0.15, { amp: 12, dur: 0.5 }); K.sfx('hit', pk + 0.1, { db: -6 });
  karto.pose('cheer', { at: pk }); skip.pose('shocked', { at: pk + 0.1 });
  karto.pose('deadpan', { at: s('l041', 2, 0.0) }); karto.pose('present', { at: s('l041', 3, 0.0) });
  cam.to({ x: 0, y: -4, zoom: 1.09 }, { at: s('l041', 2, 0.0), dur: 4 });

  /* ---------- l042: "Fine. Thirty. Still big." ---------- */
  skip.pose('deadpan', { at: 'l042' }); skip.nod({ at: 'l042+0.3' }); skip.nod({ at: 'l042+1.0' }); karto.pose('neutral', { at: 'l042', sfx: false });

  /* ---------- l043: STAMP 3, then the three causes (small photos + labels) fly under the tarp machine; Karto: tape over his mouth ---------- */
  F.stamp(3, 'l043');
  cam.reset({ at: 'l043', dur: 0.4 });
  const tgt = wt({ x: 1310, y: 450 }, { x: 540, y: 600 });
  const tarp = F.piece({ slot: wt({ x: 1120, y: 120, w: 400, h: 680 }, B(0.2, 0.34, 0.6, 0.66)), fit: 1, w: 440, h: 520, at: mid('l043', 0.3), out: 'l044', enter: 'rise', exit: 'cut', layers: [{ id: 't', art: D.tarp(), x: 0, y: 0, w: 440, h: 520, edge: 7 }] });
  const items = [['shelf_prices', 'cpi'], ['fed_building', 'hike_bets'], ['dollar_bill', 'strong_dollar']];
  const fly = s('l043', 1, 0.0);
  items.forEach(([ph, key], i) => {
    const at = mid('l043', 0.3 + i * 0.05), sl = wt({ x: 680, y: 50 + i * 260, w: 440, h: 250 }, B(0.02 + i * 0.31, 0.02, 0.3, 0.26));
    const photo = F.photo(ph, { slot: sl, size: 0.95, at, out: fly + i * 0.18 + 0.55, enter: 'drop', exit: 'cut', tilt: i % 2 ? 2 : -2, push: 1 });
    const lab = P.label(key, { slot: { x: K.slot(sl).x + K.slot(sl).w / 2 - 150, y: K.slot(sl).y + K.slot(sl).h - 46, w: 300, h: 20 }, plane: 'front', size: 's', stock: 'yellow', tape: true, at: at + 0.25, out: fly + i * 0.18 + 0.55, exit: 'cut', tilt: -3, enter: 'slap' });
    const r = K.slot(sl), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    for (const o of [photo, lab]) o.to({ x: tgt.x - cx, y: tgt.y - cy - (o === lab ? -40 : 0), sc: 0.25, rot: 30 }, { at: fly + i * 0.18, dur: 0.5, ease: 'inCubic' });
    K.sfx('whoosh', fly + i * 0.18, { db: -10 }); K.sfx('thud', fly + i * 0.18 + 0.5, { db: -11 });
    tarp.to({ rot: i % 2 ? 2.5 : -2.5 }, { at: fly + i * 0.18 + 0.5, dur: 0.1 }); tarp.to({ rot: 0 }, { at: fly + i * 0.18 + 0.62, dur: 0.12 });
  });
  const wh = mid('l043', 0.82);
  karto.pose('whisper', { at: wh }); karto.tilt({ deg: 6, at: wh });
  F.tapeNote(wt({ x: 300, y: 640 }, { x: 300, y: 1190 }), 'tape_wait', wh + 0.15, { w: 360, out: 'l043:end', plane: 'front' });
}
