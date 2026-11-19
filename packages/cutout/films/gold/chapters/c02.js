// c02 - piece two: the day it broke (l020-l032, ~84 s). Scene author A. Short s2 = l027-l032 (tall).
// Real media: souk_windows (l020), fed_building + warsh (l021-l022), trading_floor (l023), shared price path cliff (l024), loan bars 9 vs 30 (l025-l026), dubai_skyline (l026),
// souk_clip TV (l027-l028), souk_gate + quote (l029-l030), cardboard distress/panic cards (l031), gold_scale + mood dial + calendar flip (l032).
import { D, ink } from './c02.art.js';
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B, Z = F.Z;
  const wt = (w, t) => (tall ? t : w);
  const lblBg = (p) => { for (const k of ['lbl_jan', 'lbl_nov']) if (p.ids[k]) p.ids[k].css = { background: '#FFFDF6', borderRadius: '8px' }; return p; };
  F.chapterOpen('c02');
  const mid = (id, f) => K.at(id, f);
  const qmark = (at, out) => F.cut('qmark', { slot: wt({ x: 1530, y: 250, w: 130, h: 170 }, { x: 650, y: 1040, w: 110, h: 150 }), fit: 1, plane: 'front', at, out, enter: 'pop', exit: 'cut', idle: { rot: 6, f: 0.9 } });

  /* ---------- l020: "Piece two. The day it broke. Friday, the thirtieth of January. Right after the record." - calendar with the date, then the record on the price path ---------- */
  karto.pose('present', { at: mid('l020', 0.1) }); skip.pose('neutral', { at: 'l020', sfx: false });
  const calT = mid('l020', 0.55);
  const cal = F.piece({ slot: wt({ x: 590, y: 50, w: 560, h: 740 }, F.B(0.02, 0.0, 0.7, 0.9)), fit: 1, w: 230, h: 250, at: 'l020+0.1', out: calT, enter: 'drop', exit: 'cut', tilt: 3, layers: [
    { id: 'pg', art: 'calPage', x: 0, y: 0, w: 230, h: 250, edge: 6 },
    { id: 'm', key: 'm_jan', x: 18, y: 16, w: 194, h: 50, max: 40, color: '#FFFDF6' },
    ink('ring', 128, 160, 50, 44, 'M26 4 C6 4 2 26 12 38 C24 46 44 40 46 22 C46 6 30 2 14 8', { col: '#C0391B', sw: 5, at: mid('l020', 0.3), dur: 0.5 })] });
  K.sfx('scratch', mid('l020', 0.3), { db: -10 });
  const jl = P.label('jan30', { slot: wt({ x: 1160, y: 260, w: 340, h: 230 }, F.B(0.46, 0.2, 0.52, 0.2)), size: wt('l', 'm'), stock: 'yellow', tape: true, at: mid('l020', 0.22), out: calT, tilt: -2, enter: 'slap' });
  void jl;
  const rec = F.pricePath({ slot: wt({ x: 560, y: 90, w: 940, h: 700 }, F.B(0, 0.1, 1, 0.8)), fit: 1, at: calT, out: 'l021', enter: 'rise', exit: 'fly' });
  for (const k of ['lbl_jan', 'lbl_nov']) rec.ids[k].css = { background: '#FFFDF6', borderRadius: '8px' };
  rec.cols(calT + 0.05, 0.12, 1); rec.label('jan', calT + 0.4); rec.token(0, 1, calT + 0.5, 0.4);
  P.label('peak_price', { slot: wt({ x: 1040, y: 180, w: 380, h: 150 }, F.B(0.45, 0.06, 0.5, 0.14)), plane: 'front', size: 'xl', stock: 'yellow', tape: true, at: calT + 0.7, out: 'l021', tilt: -4, enter: 'slam' });
  cam.to({ x: 10, y: -4, zoom: 1.06 }, { at: 'l020', dur: 4 });

  /* ---------- l021: the news: Fed building, then Warsh big, arrow + name tag ---------- */
  karto.pose('point', { at: 'l021' }); skip.pose('neutral', { at: 'l021', sfx: false });
  const fed = F.photo('fed_building', { slot: wt({ x: 660, y: 30, w: 700, h: 560 }, F.B(0, 0, 1, 0.56)), caption: 'cap_fed_board', at: 'l021+0.15', out: s('l023', 1), enter: 'drop', exit: 'fly', tilt: -2.5, push: 1.1 });
  const w0 = s('l021', 1, 0.55);
  fed.to({ x: wt(-40, 0), y: wt(-10, -40), rot: -5 }, { at: w0, dur: 0.4 });
  const war = F.photo('warsh', { slot: wt({ x: 780, y: 300, w: 740, h: 500 }, F.B(0, 0.42, 1, 0.58)), at: w0, out: s('l023', 1), enter: 'drop', exit: 'fly', tilt: 2.5, push: 1.08 });
  const wr = K.slot(wt({ x: 780, y: 300, w: 740, h: 500 }, F.B(0, 0.42, 1, 0.58)));
  P.label('nomination', { slot: wt({ x: 1090, y: 330, w: 460, h: 100 }, { x: 440, y: 600, w: 420, h: 100 }), size: 'm', stock: 'yellow', tape: true, at: w0 + 0.55, out: s('l023', 1), tilt: -3, enter: 'slam' });
  const fr = K.slot(wt({ x: 660, y: 30, w: 700, h: 560 }, F.B(0, 0, 1, 0.56)));
  P.arrow({ x: wr.x + wr.w * 0.04, y: wr.y + wr.h * 0.3 }, { x: fr.x + fr.w * wt(0.3, 0.4), y: fr.y + fr.h * 0.7 }, { at: w0 + 0.9, out: s('l023', 1), color: '#C0391B', width: 10, bow: 0.15 });
  cam.to({ x: 10, y: -6, zoom: 1.08 }, { at: 'l021', dur: 6 });

  /* ---------- l022: "Who? And why does gold care?" ---------- */
  skip.pose('thinking', { at: 'l022' }); skip.tilt({ deg: -5, at: 'l022+0.1' }); qmark('l022+0.3', 'l023'); karto.pose('neutral', { at: 'l022', sfx: false });
  war.to({ rot: 0, sc: 1.04 }, { at: 'l022', dur: 1.5 });

  /* ---------- l023: "... nobody knew what the new chair would do. Unsure traders often sell." ---------- */
  skip.tilt({ deg: 0, at: 'l023' }); skip.pose('neutral', { at: 'l023', sfx: false }); karto.pose('present', { at: 'l023' }); cam.reset({ at: 'l023', dur: 0.5 });
  const nobody = F.cut('qmark', { slot: wt({ x: 1230, y: 20, w: 260, h: 320 }, { x: 560, y: 200, w: 300, h: 380 }), fit: 1, plane: 'front', at: 'l023+0.3', out: s('l023', 1), enter: 'pop', exit: 'pop', idle: { rot: 8, f: 0.8 } });
  const tf = F.photo('trading_floor', { slot: wt({ x: 700, y: 10, w: 560, h: 800 }, F.B(0, 0, 0.66, 1)), caption: 'cap_trading_floor', at: s('l023', 1), out: 'l024', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  karto.pose('point', { at: s('l023', 1) });
  const sb = F.piece({ slot: wt({ x: 1230, y: 300, w: 300, h: 230 }, F.B(0.6, 0.15, 0.4, 0.34)), fit: 1, w: 360, h: 200, at: s('l023', 1, 0.35), out: 'l024', enter: 'none', exit: 'cut', layers: [
    { id: 'b', art: D.sellBtn(), x: 0, y: 0, w: 360, h: 200, edge: 8 }, { id: 't', key: 'sell', x: 50, y: 28, w: 260, h: 96, max: 90, color: '#FFFDF6', tcss: { textShadow: '3px 4px 0 rgba(60,10,0,0.55)' } }] });
  sb.L('b').slam(s('l023', 1, 0.35)); sb.L('t').slam(s('l023', 1, 0.35), { sfx: false, shake: false });
  const sellers = F.crowd({ rows: 1, cols: 4, expr: 'shout', look: -1, slot: wt({ x: 1180, y: 580, w: 340, h: 200 }, F.B(0.4, 0.62, 0.6, 0.3)), fit: 1, plane: 'front', at: s('l023', 1, 0.6), out: 'l024', enter: 'rise', exit: 'cut' });
  sellers.to({ x: wt(-60, 0) }, { at: s('l023', 1, 0.8), dur: 2.2, ease: 'linear' });

  /* ---------- l024: the shared price path: the record, then ONE day: the cliff ---------- */
  karto.pose('shocked', { at: mid('l024', 0.3) }); karto.pose('neutral', { at: mid('l024', 0.8), sfx: false });
  const pp = lblBg(F.pricePath({ slot: wt({ x: 660, y: 70, w: 850, h: 720 }, F.B(0, 0.1, 1, 0.8)), fit: 1, at: 'l024', out: 'l025', enter: 'rise', exit: 'fly' }));
  pp.cols('l024+0.1', 0.1, 1); pp.label('jan', 'l024+0.5');
  pp.token(0, 1, 'l024+0.5', 0.35);
  const fall = mid('l024', 0.35);
  pp.L('c2').pop(fall, { from: 0.1, sfx: false, dur: 0.2 });
  pp.L('tok').to({ x: 10 + 2 * 104 + 20 - 60, y: 100 }, { at: fall, dur: 0.35, ease: 'inQuad' }); K.sfx('thud', fall + 0.35, { db: -8 });
  pp.cliff(fall + 0.3); cam.shake(fall + 0.35, { amp: 10, dur: 0.4 });
  skip.pose('shocked', { at: fall + 0.3 }); skip.hop({ at: fall + 0.3, h: 40 });

  /* ---------- l025: "Nine percent. That is not thirty." - 9 vs 30 bars, Skip crosses out his 30 ---------- */
  skip.pose('deadpan', { at: 'l025' }); karto.pose('neutral', { at: 'l025', sfx: false });
  const bars = F.loanBar([{ key: 'one_day_nine', pct: 0.3, col: '#E5401D' }, { key: 'minus30', pct: 1, col: '#3D7DB8' }], { W: 460, H: 700, bw: 170, gap: 60, x0: 50, slot: wt({ x: 700, y: 60, w: 560, h: 740 }, F.B(0.1, 0.02, 0.8, 0.96)), fit: 1, at: 'l025', out: s('l026', 2), enter: 'rise', exit: 'fly' });
  bars.grow(0, 'l025+0.1', 0.5); bars.grow(1, 'l025+0.5', 0.7);
  const sgn = F.piece({ slot: wt({ x: 1540, y: 330, w: 300, h: 160 }, { x: 590, y: 1040, w: 260, h: 140 }), fit: 1, plane: 'front', w: 300, h: 160, at: 'l025+0.2', out: 'l026', enter: 'drop', exit: 'cut', layers: [
    { id: 'c', art: D.block({ col: '#FFFDF6', w: 300, h: 160 }), x: 0, y: 0, w: 300, h: 160, edge: 5 }, { id: 't', key: 'minus30', x: 20, y: 20, w: 260, h: 110, max: 80, color: '#1E1712' },
    ink('x', 10, 0, 280, 160, 'M20 20 L270 140 M270 20 L20 140', { col: '#C0391B', sw: 16, at: mid('l025', 0.55), dur: 0.35 })] });
  K.sfx('scratch', mid('l025', 0.55), { db: -8 });

  /* ---------- l026: "Right. That is the honest part: ... Now, Dubai." - tick on the 9 bar, then plane -> skyline ---------- */
  skip.pose('neutral', { at: 'l026', sfx: false }); karto.pose('present', { at: 'l026' });
  const tk = F.tick({ slot: wt({ x: 1190, y: 520, w: 150, h: 150 }, F.B(0.62, 0.6, 0.2, 0.3)), fit: 1, plane: 'front', at: s('l026', 1, 0.3), out: s('l026', 2), enter: 'pop', exit: 'pop' });
  bars.L('b0').to({ sc: 1.08 }, { at: s('l026', 1, 0.3), dur: 0.15 }); bars.L('b0').to({ sc: 1 }, { at: s('l026', 1, 0.3) + 0.15, dur: 0.3, ease: 'back(2)' });
  const d0 = s('l026', 2);
  const pl = F.piece({ slot: wt({ x: 520, y: 40, w: 300, h: 150 }, F.B(0, 0, 0.4, 0.2)), fit: 1, w: 300, h: 130, plane: 'front', at: d0 - 0.1, out: d0 + 2.6, enter: 'none', exit: 'cut', layers: [{ id: 'a', art: D.plane(), x: 0, y: 0, w: 300, h: 130, edge: 6 }] });
  K.tl.set(pl.v, { op: 1 }, d0 - 0.1);
  pl.to({ x: [-500, 480], y: [60, 40], rot: [-8, 6] }, { at: d0 - 0.1, dur: 1.6, ease: 'outQuad' }); K.sfx('whoosh', d0 - 0.1, { db: -8 });
  pl.to({ x: 900, y: 120, rot: 14 }, { at: d0 + 1.6, dur: 0.9, ease: 'inQuad' });
  const sky = F.photo('dubai_skyline', { slot: wt({ x: 660, y: 100, w: 850, h: 700 }, F.B(0, 0.1, 1, 0.74)), caption: 'cap_dubai_sky', at: d0 + 0.3, out: 'l027', enter: 'drop', exit: 'fly', tilt: 1.5, push: 1.12 });
  cam.to({ x: -10, y: -4, zoom: 1.07 }, { at: d0, dur: 3.4 });

  /* ---------- l027: souk clip on the TV, a cardboard queue of paper heads at a cardboard shop ---------- */
  skip.pose('neutral', { at: 'l027', sfx: false }); karto.pose('point', { at: 'l027' }); cam.reset({ at: 'l027', dur: 0.4 });
  const tvSlot = wt({ x: 660, y: 10, w: 470, h: 820 }, F.B(0, 0, 0.46, 1));
  const tv = F.tv('souk_clip', { slot: tvSlot, at: 'l027+0.05', t0: 'l027', out: 'l029', enter: 'drop', loop: true });
  P.label('dubai', { slot: wt({ x: 800, y: 60, w: 520, h: 90 }, { x: 250, y: 20, w: 440, h: 90 }), size: 'm', stock: 'yellow', tape: true, at: 'l027+0.35', out: 'l029', tilt: -2, enter: 'slap' });
  const shopSlot = wt({ x: 1150, y: 230, w: 370, h: 400 }, F.B(0.46, 0.28, 0.54, 0.6));
  const shop = F.piece({ slot: shopSlot, fit: 1, w: 440, h: 420, at: 'l027+0.15', out: 'l029', enter: 'rise', exit: 'cut', layers: [{ id: 's', art: D.shop(), x: 0, y: 0, w: 440, h: 420, edge: 7 }] });
  const sr = K.slot(shopSlot);
  for (let i = 0; i < 4; i++) {
    const hd = F.crowd({ rows: 1, cols: 1, expr: i % 2 ? 'calm' : 'shout', look: 1, seed: i + 2, slot: wt({ x: 1130 + i * 100, y: 590, w: 120, h: 150 }, { x: 420 + i * 80, y: 790, w: 80, h: 100 }), from: 'left', fit: 1, plane: 'front', at: mid('l027', 0.3 + i * 0.1), out: 'l029', enter: 'slide', exit: 'cut' });
  }
  P.label('queue_sellers', { slot: wt({ x: 1160, y: 158, w: 345, h: 105 }, { x: 640, y: 190, w: 420, h: 100 }), size: 'm', stock: 'white', tape: true, at: mid('l027', 0.55), out: 'l029', tilt: 3, enter: 'slap' });

  /* ---------- l028: "Wait. Are those not the shops where people buy gold?" ---------- */
  skip.pose('thinking', { at: 'l028' }); skip.tilt({ deg: -5, at: 'l028+0.1' }); qmark('l028+0.3', 'l029'); karto.pose('neutral', { at: 'l028', sfx: false });
  shop.to({ rot: 3 }, { at: 'l028+0.3', dur: 0.2 }); shop.to({ rot: 0 }, { at: 'l028+0.5', dur: 0.4, ease: 'back(2)' });
  F.goldBar({ slot: wt({ x: 1180, y: 450, w: 160, h: 90 }, { x: 560, y: 450, w: 150, h: 80 }), fit: 1, plane: 'front', at: 'l028+0.8', out: 'l029', enter: 'drop', exit: 'cut', idle: { rot: 6, f: 1 } });

  /* ---------- l029: Gold Souk gate photo + the jeweller's quote and its source ---------- */
  skip.tilt({ deg: 0, at: 'l029' }); skip.pose('neutral', { at: 'l029', sfx: false }); karto.pose('present', { at: 'l029' });
  F.photo('souk_gate', { slot: wt({ x: 680, y: 10, w: 560, h: 800 }, F.B(0, 0, 0.5, 1)), caption: 'cap_souk_gate', at: 'l029+0.1', out: 'l031', enter: 'drop', exit: 'fly', tilt: -2.5, push: 1.1 });
  P.speech('souk_quote', 'karto', { at: s('l029', 1, 0.15), out: 'l031' });
  P.label('souk_credit', { slot: wt({ x: 1260, y: 590, w: 460, h: 100 }, { x: 640, y: 640, w: 400, h: 90 }), size: 's', stock: 'white', tape: true, at: s('l029', 1, 0.6), out: 'l031', tilt: 2, enter: 'slap' });
  K.sfx('tape', s('l029', 1, 0.6), { db: -10 });

  /* ---------- l030: "What is the difference?" ---------- */
  skip.pose('thinking', { at: 'l030' }); skip.tilt({ deg: -5, at: 'l030+0.1' }); qmark('l030+0.2', 'l031'); karto.pose('neutral', { at: 'l030', sfx: false });

  /* ---------- l031: distress vs panic: two cards slam, the panic crowd runs off ---------- */
  skip.tilt({ deg: 0, at: 'l031' }); skip.pose('neutral', { at: 'l031', sfx: false }); karto.pose('present', { at: 'l031' });
  const cardL = F.piece({ slot: wt({ x: 640, y: 50, w: 420, h: 740 }, F.B(0, 0, 0.5, 0.96)), fit: 1, w: 460, h: 640, at: 'l031', out: 'l032', enter: 'none', exit: 'cut', tilt: -2, layers: [
    { id: 'c', art: D.block({ col: '#FFF1B8', w: 460, h: 640 }), x: 0, y: 0, w: 460, h: 640, edge: 8, flutes: true },
    { id: 't', key: 'distress', x: 30, y: 28, w: 400, h: 130, max: 64, lines: 2, color: '#1E1712' },
    { id: 'sk', art: 'sack', x: 130, y: 320, w: 230, h: 266, edge: 6 },
    { id: 'h', art: 'head', ao: { expr: 'calm', col: '#F4A3B5', look: 0 }, x: 170, y: 190, w: 130, h: 156, paper: true, edge: 4, idle: { y: 2, f: 0.5 } }] });
  const a1 = s('l031', 0, 0.05), a2 = s('l031', 1, 0.0);
  K.tl.set(cardL.v, { op: 1 }, a1); K.tl.to(cardL.v, { x: [-900, 0], rot: [-12, -2] }, { at: a1, dur: 0.5, ease: 'back(1.3)' }); K.sfx('whoosh', a1, { db: -8 }); K.sfx('thud', a1 + 0.45, { db: -8 });
  const heads = [];
  const layersR = [{ id: 'c', art: D.block({ col: '#FFFDF6', w: 460, h: 640 }), x: 0, y: 0, w: 460, h: 640, edge: 8, flutes: true }, { id: 't', key: 'panic', x: 30, y: 28, w: 400, h: 130, max: 64, lines: 2, color: '#C0391B' }];
  for (let i = 0; i < 5; i++) { layersR.push({ id: 'r' + i, art: 'head', ao: { expr: 'shout', col: ['#FFD23F', '#8EC5E8', '#F4A3B5', '#B8E986', '#F6C08A'][i], look: 1 }, x: 20 + (i % 3) * 120, y: 200 + Math.floor(i / 3) * 190, w: 110, h: 132, paper: true, edge: 4, idle: { y: 5, rot: 5, f: 1.4 + i * 0.2, ph: i } }); heads.push('r' + i); }
  const cardR = F.piece({ slot: wt({ x: 1090, y: 50, w: 420, h: 740 }, F.B(0.5, 0, 0.5, 0.96)), fit: 1, w: 460, h: 640, at: a2, out: 'l032', enter: 'none', exit: 'cut', tilt: 2, layers: layersR });
  K.tl.set(cardR.v, { op: 1 }, a2); K.tl.to(cardR.v, { x: [900, 0], rot: [12, 2] }, { at: a2, dur: 0.5, ease: 'back(1.3)' }); K.sfx('whoosh', a2, { db: -8 }); K.sfx('stamp', a2 + 0.45, { db: -8 }); cam.shake(a2 + 0.45, { amp: 8, dur: 0.3 });
  const run = s('l031', 1, 0.55);
  heads.forEach((id, i) => { cardR.L(id).to({ x: 700 + i * 60, rot: 18 }, { at: run + i * 0.12, dur: 1.2 + i * 0.1, ease: 'inQuad' }); });
  K.sfx('whoosh', run, { db: -9 });
  const bolt = F.piece({ slot: wt({ x: 1010, y: 270, w: 120, h: 200 }, F.B(0.4, 0.3, 0.2, 0.3)), fit: 1, w: 100, h: 160, plane: 'front', at: a2 + 0.4, out: s('l031', 1, 0.5), enter: 'pop', exit: 'pop', layers: [{ id: 'b', art: D.bolt(), x: 0, y: 0, w: 100, h: 160, edge: 5 }] });
  karto.pose('point', { at: a2 });

  /* ---------- l032: mood dial + old gold scale, stamp 2, calendar flips January -> November ---------- */
  skip.pose('neutral', { at: 'l032', sfx: false }); karto.pose('present', { at: 'l032' });
  const sc = F.photo('gold_scale', { slot: wt({ x: 660, y: 20, w: 600, h: 440 }, F.B(0, 0, 1, 0.5)), caption: 'cap_gold_scale', at: 'l032+0.1', out: s('l032', 2, 0.1), enter: 'drop', exit: 'fly', tilt: -2.5, push: 1.12 });
  const gSlot = wt({ x: 1000, y: 480, w: 500, h: 330 }, F.B(0, 0.5, 1, 0.5));
  const g = F.piece({ slot: gSlot, fit: 1, w: 440, h: 330, at: 'l032+0.3', out: s('l032', 2, 0.1), enter: 'rise', exit: 'fly', layers: [
    { id: 'g', art: D.gauge(), x: 0, y: 40, w: 440, h: 270, edge: 7 },
    { id: 'n', art: D.needle(), x: 200, y: 82, w: 40, h: 230, edge: 3, origin: '50% 93%', rot: -62 },
    { id: 't', key: 'mood', x: 20, y: 0, w: 400, h: 52, max: 36, color: '#1E1712', tcss: { background: '#FFFDF6', borderRadius: '8px' } }] });
  g.L('n').to({ rot: [-62, -52] }, { at: s('l032', 1, 0), dur: 0.01 });
  const snap = s('l032', 1, 0.3);
  g.L('n').to({ rot: 62 }, { at: snap, dur: 0.35, ease: 'back(2.2)' }); K.sfx('thud', snap + 0.2, { db: -9 }); cam.shake(snap + 0.25, { amp: 6, dur: 0.3 });
  skip.pose('shocked', { at: snap }); karto.pose('deadpan', { at: s('l032', 1, 0.5) });
  F.stamp(2, s('l032', 2, 0.05));
  const fl = s('l032', 2, 0.6);
  const cal2 = F.piece({ slot: wt({ x: 780, y: 100, w: 540, h: 620 }, F.B(0.2, 0.08, 0.6, 0.6)), fit: 1, w: 230, h: 250, at: fl - 0.3, out: 'l033', enter: 'pop', exit: 'cut', layers: [
    { id: 'a', art: 'calPage', x: 0, y: 0, w: 230, h: 250, edge: 6 }, { id: 'nov', key: 'm_nov', x: 18, y: 16, w: 194, h: 50, max: 40, color: '#FFFDF6' },
    { id: 'p2', art: 'calPage', x: 0, y: 0, w: 230, h: 250, edge: 6, origin: '50% 0%' }, { id: 'p1', art: 'calPage', x: 0, y: 0, w: 230, h: 250, edge: 6, origin: '50% 0%' },
    { id: 'jan', key: 'm_jan', x: 18, y: 16, w: 194, h: 50, max: 40, color: '#FFFDF6' }] });
  cal2.L('p1').to({ rot: 40, y: 400, op: 0 }, { at: fl + 0.3, dur: 0.5, ease: 'inQuad' }); cal2.L('jan').to({ rot: 40, y: 400, op: 0 }, { at: fl + 0.3, dur: 0.5, ease: 'inQuad' });
  cal2.L('p2').to({ rot: -40, y: 400, op: 0 }, { at: fl + 0.55, dur: 0.5, ease: 'inQuad' });
  K.sfx('flap', fl + 0.3, { db: -9 }); K.sfx('flap', fl + 0.55, { db: -9 });
  karto.pose('point', { at: fl });
}
