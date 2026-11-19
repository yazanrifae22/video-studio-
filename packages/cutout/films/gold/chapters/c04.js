// c04 - piece four "The cardboard machine" (l044-l056). Scene author B. Short s4 = l046-l055 (tall).
// Line order in this chapter: l044 l045 l046 l047 l048 l050 l051 l049 l052 l053 l054 l055 l056.
// Real media: nugget (l046), bond (l047-l048), the BoE bar in a hand (l051), dollar bill (l052-l053), US Treasury building (l054-l055).
import { D } from './c04.art.js';
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B;
  F.chapterOpen('c04');
  const art1 = (svg, o = {}) => F.piece({ w: svg[0], h: svg[1], fit: 1, enter: 'pop', ...o, layers: [{ id: 'a', svg, x: 0, y: 0, w: svg[0], h: svg[1], edge: o.edge == null ? 5 : o.edge, ...(o.layer || {}) }] });
  const rect = (sl) => K.slot(sl);

  // zones
  const LP = tall ? B(0, 0, 1, 0.55) : { x: 600, y: 225, w: 380, h: 370 };   // left photo (gold end)
  const RP = tall ? B(0, 0, 1, 0.55) : { x: 1070, y: 225, w: 380, h: 370 };  // right photo (bond end)
  const SSL = tall ? B(0, 0.5, 1, 0.5) : { x: 540, y: 330, w: 960, h: 480 }; // seesaw slot
  const lr = rect(LP), rr = rect(RP), sr = rect(SSL);
  const kk = Math.min(sr.w / 760, sr.h / 520);                              // seesaw scale -> stage px
  const sx0 = sr.x + (sr.w - 760 * kk) / 2, sy0 = sr.y + (sr.h - 520 * kk) / 2;
  const sp = (x, y) => ({ x: sx0 + x * kk, y: sy0 + y * kk });             // seesaw design point -> stage px

  /* ---------- l044: "Piece four. The machine. I built this last night." - tarp pulled off the seesaw ---------- */
  karto.pose('present', { at: s('l044', 0, 0.4) });
  const ss = F.seesaw({ slot: SSL, fit: 1, at: 'l044', enter: 'none', exit: 'fly' });
  const tarp = art1(D.tarp(), { slot: SSL, fit: 1.05, at: 'l044', enter: 'drop', exit: 'cut', plane: 'front', out: 'l046', layer: { edge: 6 } });
  tarp.pulse({ at: 'l044+0.9' });
  tarp.to({ y: -1500, rot: -14 }, { at: s('l044', 1, 0.0), dur: 0.7, ease: 'inQuad' }); K.sfx('whoosh', s('l044', 1, 0.0), { db: -8 });
  ss.tilt(-6, s('l044', 2, 0.0)); ss.tilt(5, s('l044', 2, 0.5)); ss.tilt(0, s('l044', 2, 1.0));
  // both real pictures are taped on top of the two ends as they are revealed (they get their own beat at l046 / l047)
  cam.to({ x: 0, y: -10, zoom: 1.07 }, { at: 'l044', dur: 4 });

  /* ---------- l045: "Of course you did." ---------- */
  skip.pose('deadpan', { at: 'l045' }); skip.tilt({ deg: -5, at: 'l045+0.1' }); karto.pose('neutral', { at: 'l045', sfx: false });
  cam.reset({ at: 'l045', dur: 0.5 });

  /* ---------- l046: gold lump, real nugget on the left end, PAYS NO INTEREST, empty tray ---------- */
  skip.tilt({ deg: 0, at: 'l046' }); skip.pose('neutral', { at: 'l046', sfx: false });
  karto.pose('point', { at: 'l046' }); karto.pose('present', { at: s('l046', 1, 0.2) });
  const nug = F.photo('nugget', { slot: LP, caption: 'cap_nugget', at: 'l046+0.05', out: tall ? 'l047+0.1' : 'l050', enter: 'drop', exit: tall ? 'fly' : 'cut', tilt: -2, push: 1.1 });
  const tl_ = sp(150, 330);
  P.label('pays_nothing', { slot: tall ? { x: tl_.x - 150 * kk, y: tl_.y + 56, w: 250 * kk, h: 60 } : { x: 610, y: 90, w: 380, h: 120 }, size: tall ? 's' : 'm', stock: 'yellow', tape: true, at: s('l046', 1, 0.15), out: 'l050', tilt: -4, enter: 'slam' });
  const tray0 = art1(D.tray(), { slot: { x: tl_.x - 105 * kk, y: tl_.y + 30, w: 210 * kk, h: 80 * kk }, fit: 1, at: s('l046', 1, 0.5), out: 'l050', enter: 'drop', exit: 'cut', edge: 4 });
  tray0.wiggle({ at: s('l046', 1, 0.9) }); tray0.wiggle({ at: s('l046', 1, 1.5) });
  cam.to({ x: tall ? 0 : 30, y: -6, zoom: 1.08 }, { at: 'l046', dur: 3 });

  /* ---------- l047: bond on the right end, interest coins drop one by one, the right end sinks a little ---------- */
  cam.reset({ at: 'l047', dur: 0.4 });
  const bond = F.photo('bond', { slot: RP, caption: 'cap_bond', at: 'l047+0.05', out: tall ? 'l050' : 'l050', enter: 'drop', exit: 'cut', tilt: 2, push: 1.1 });
  const br = sp(610, 330);
  art1(D.tray(), { slot: { x: br.x - 105 * kk, y: br.y + 30, w: 210 * kk, h: 80 * kk }, fit: 1, at: 'l047+0.2', out: 'l050', enter: 'drop', exit: 'cut', edge: 4 });
  for (let i = 0; i < 5; i++) ss.coin(i, s('l047', 1, 0.05 + i * 0.16));
  ss.tilt(8, s('l047', 1, 0.5));
  P.label('interest', { slot: tall ? { x: rr.x + rr.w * 0.1, y: rr.y + rr.h * 0.52, w: rr.w * 0.5, h: 80 } : { x: 1090, y: 100, w: 340, h: 100 }, size: 'm', stock: 'white', tape: true, at: s('l047', 1, 0.3), out: 'l050', tilt: 3, enter: 'slap' });
  karto.pose('present', { at: 'l047' }); skip.pose('thinking', { at: s('l047', 1) });
  cam.to({ x: tall ? 0 : -30, y: -6, zoom: 1.08 }, { at: 'l047+0.3', dur: 3 });

  /* ---------- l048: "So? I like shiny." - sparkle on Skip's phone, both pictures stay ---------- */
  cam.reset({ at: 'l048', dur: 0.4 });
  skip.pose('neutral', { at: 'l048', sfx: false }); skip.tilt({ deg: 4, at: 'l048' }); karto.pose('neutral', { at: 'l048', sfx: false });
  const sparkle = art1(D.sparkle(), { slot: tall ? { x: 640, y: 1080, w: 130, h: 130 } : { x: 1560, y: 680, w: 140, h: 140 }, plane: 'front', at: 'l048+0.2', out: 'l050', enter: 'pop', exit: 'cut', edge: 3, idle: { rot: 12, y: 4, f: 1.4 } });
  sparkle.pulse({ at: 'l048+0.7' }); K.sfx('ding', 'l048+0.25', { db: -14 });
  ss.tilt(2, 'l048');

  /* ---------- l050: "This is slow. I am skipping." - the one skip attempt of the video ---------- */
  const btn = F.skipAttempt('l050+0.1', { stopAt: 'l051', out: 'l049' });
  karto.pose('neutral', { at: 'l050', sfx: false });
  skip.tilt({ deg: -6, at: 'l050+0.2' });

  /* ---------- l051: "Hold on." - the real gold bar in a hand, price tag, the SKIP button tips over ---------- */
  karto.pose('shocked', { at: 'l051' }); karto.pose('present', { at: s('l051', 1, 0.2) }); karto.pose('point', { at: s('l051', 2, 0.1) });
  const BHS = tall ? B(0, 0, 1, 0.84) : { x: 540, y: 20, w: 760, h: 650 };
  const bh = F.photo('gold_bar_hand', { slot: BHS, caption: 'cap_bar_hand', at: 'l051+0.05', out: 'l049', enter: 'slam', exit: 'fly', tilt: -2, push: 1.1 });
  const bs = rect(BHS);
  const price = P.label('bar_price', { slot: { x: bs.x + bs.w * (tall ? 0.06 : 0.5), y: bs.y + bs.h * (tall ? 0.04 : 0.62), w: bs.w * (tall ? 0.86 : 0.46), h: tall ? 150 : 130 }, size: 'l', stock: 'yellow', tape: true, at: 'l051+0.5', out: 'l049', tilt: 4, enter: 'slap' });
  price.wiggle({ at: 'l051+1.2' });
  btn.to({ rot: 78, y: 260 }, { at: 'l051+0.1', dur: 0.5, ease: 'inQuad' }); K.sfx('thud', 'l051+0.55', { db: -8 }); cam.shake('l051+0.55', { amp: 6, dur: 0.3 });
  skip.pose('shocked', { at: 'l051' }); skip.tilt({ deg: 0, at: 'l051+0.1' });

  /* ---------- l049: "Watch the seesaw. When rates rise ... Money slides off the gold end." ---------- */
  skip.pose('neutral', { at: 'l049', sfx: false });
  karto.pose('point', { at: 'l049' });
  const bagLayers = [];
  const pos0 = [{ x: 118, y: 176 }, { x: 70, y: 130 }, { x: 150, y: 96 }];
  pos0.forEach((p, i) => bagLayers.push({ id: 'b' + i, svg: D.bag(), x: p.x, y: p.y, w: 120, h: 120, edge: 4, hidden: true }));
  const bags = F.piece({ slot: SSL, fit: 1, w: 760, h: 520, plane: 'front', at: 'l049', out: 'l052', enter: 'none', exit: 'cut', layers: bagLayers });
  const rt = s('l049', 1, 0.0);
  P.label('rates_up', { slot: tall ? B(0.04, 0.02, 0.6, 0.16) : { x: 600, y: 90, w: 520, h: 110 }, size: 'l', stock: 'yellow', tape: true, at: 'l049+0.2', out: 'l052', tilt: -3, enter: 'slam' });
  bags.L('b0').pop('l049+0.3', { sfx: 'pop' }); bags.L('b1').pop('l049+0.45', { sfx: 'pop' }); bags.L('b2').pop('l049+0.6', { sfx: 'pop' });
  ss.tilt(18, rt, 0.8);
  [0, 1, 2].forEach((i) => { const L = bags.L('b' + i); L.to({ x: 8 + i * 16, y: -62 + i * 5 }, { at: rt, dur: 0.8, ease: 'back(1.3)' }); L.to({ x: 420 + i * 16 - pos0[i].x * 0, y: 70 - i * 12, rot: 540 }, { at: T(rt) + 0.85 + i * 0.25, dur: 0.9, ease: 'inQuad' }); K.sfx('slide', T(rt) + 0.85 + i * 0.25, { db: -14 }); K.sfx('coin', T(rt) + 1.7 + i * 0.25, { db: -12 }); });
  cam.to({ x: -20, y: -30, zoom: 1.14 }, { at: rt, dur: 2.5 }); cam.shake(T(rt) + 0.6, { amp: 6, dur: 0.3 });
  karto.pose('present', { at: s('l049', 2, 0.1) });

  /* ---------- l052: "Fine. And the dollar?" - Skip hops on the seesaw edge; the dollar bill appears ---------- */
  cam.reset({ at: 'l052', dur: 0.5 });
  ss.tilt(0, 'l052', 0.5);
  skip.pose('neutral', { at: 'l052', sfx: false }); skip.hop({ at: 'l052+0.2', h: 50 }); karto.pose('neutral', { at: 'l052', sfx: false });
  const DB = tall ? B(0, 0, 1, 0.52) : { x: 540, y: 20, w: 560, h: 450 };
  const dbl = F.photo('dollar_bill', { slot: DB, caption: 'cap_dollar', at: 'l052+0.1', out: 'l054', enter: 'drop', exit: 'cut', tilt: -2, push: 1.1 });
  // the seesaw leaves at the start of l053 so the dollar scales have the board
  /* ---------- l053: "Gold is priced in dollars. A stronger dollar makes it dearer abroad." ---------- */
  ss.exit({ at: 'l053', style: 'fly' });
  karto.pose('present', { at: 'l053' }); skip.pose('thinking', { at: 'l053' });
  dbl.to({ sc: 1.12 }, { at: 'l053', dur: 2.6, ease: 'inOutCubic' });
  const SCS = tall ? B(0, 0.5, 1, 0.5) : { x: 1020, y: 120, w: 500, h: 680 };
  const sc = F.piece({ slot: SCS, fit: 1, w: 700, h: 560, at: s('l053', 0, 0.4), out: 'l054', enter: 'rise', exit: 'cut', layers: [
    { id: 'st', art: 'seesawTri', x: 250, y: 356, w: 200, h: 180, edge: 6 },
    { id: 'bm', svg: D.beam(), x: 40, y: 330, w: 620, h: 40, edge: 4, origin: '50% 50%' },
    { id: 'usd', svg: D.usdCoin(), x: 20, y: 160, w: 180, h: 180, edge: 4, hidden: true },
    { id: 'fc', svg: D.foreignCoin(), x: 520, y: 210, w: 130, h: 130, edge: 4, hidden: true },
    { id: 'gb', svg: ART_GOLDBAR(), x: 505, y: 110, w: 160, h: 92, edge: 4, hidden: true }] });
  function ART_GOLDBAR() { return [260, 150, `<path d="M52 14 L208 14 L250 64 L10 64 Z" fill="#FFE27A" stroke="#1E1712" stroke-width="6" stroke-linejoin="round"/><path d="M10 64 L250 64 L250 136 L10 136 Z" fill="#F2B824" stroke="#1E1712" stroke-width="6" stroke-linejoin="round"/>`]; }
  const ta = s('l053', 1, 0.0);
  sc.L('usd').pop(s('l053', 0, 0.9), { sfx: 'pop' }); sc.L('fc').pop(s('l053', 0, 1.3), { sfx: 'pop' }); sc.L('gb').drop(s('l053', 1, 0.0), { dy: 200, sfx: 'thud', db: -10 });
  const dy = 64; // beam half-length 310 x sin(12deg)
  sc.L('bm').to({ rot: 12 }, { at: T(ta) + 0.3, dur: 0.8, ease: 'back(1.4)' });
  sc.L('usd').to({ y: -dy }, { at: T(ta) + 0.3, dur: 0.8, ease: 'back(1.4)' });
  sc.L('fc').to({ y: dy }, { at: T(ta) + 0.3, dur: 0.8, ease: 'back(1.4)' }); sc.L('gb').to({ y: dy }, { at: T(ta) + 0.3, dur: 0.8, ease: 'back(1.4)' });
  K.sfx('thud', T(ta) + 1.0, { db: -9 });
  const sr2 = rect(SCS), ks = Math.min(sr2.w / 700, sr2.h / 560), sxs = sr2.x + (sr2.w - 700 * ks) / 2, sys = sr2.y + (sr2.h - 560 * ks) / 2;
  P.label('strong_dollar', { slot: tall ? B(0.04, 0.78, 0.42, 0.14) : { x: sxs + 20 * ks, y: sys + 330 * ks, w: 300 * ks, h: 80 }, size: 'm', stock: 'white', tape: true, at: s('l053', 1, 0.2), out: 'l054', tilt: -3, enter: 'slap' });
  const gl = P.label('gold_in_dollars', { slot: tall ? B(0.2, 0.9, 0.78, 0.1) : { x: 1080, y: 60, w: 420, h: 100 }, size: 'l', stock: 'yellow', tape: true, at: s('l053', 1, 0.7), out: 'l054', tilt: 3, enter: 'slam' });
  cam.to({ x: 20, y: -5, zoom: 1.08 }, { at: 'l053', dur: 4 });

  /* ---------- l054: "One report: American government bonds were paying near five percent." ---------- */
  cam.reset({ at: 'l054', dur: 0.4 });
  skip.pose('neutral', { at: 'l054', sfx: false }); karto.pose('point', { at: 'l054' });
  const TZ = tall ? B(0, 0, 1, 0.84) : { x: 540, y: 20, w: 780, h: 640 };
  const tr = F.photo('treasury', { slot: TZ, caption: 'cap_treasury', at: 'l054+0.05', out: 'l055', enter: 'drop', exit: 'cut', tilt: -1.5, push: 1.1 });
  const tz = rect(TZ);
  P.label('yield5', { slot: { x: tz.x + tz.w * (tall ? 0.04 : 0.1), y: tz.y + tz.h * (tall ? 0.7 : 0.66), w: tz.w * (tall ? 0.9 : 0.86), h: tall ? 160 : 130 }, size: 'l', stock: 'yellow', tape: true, at: K.at('l054', 0.45), out: 'l055', tilt: -3, enter: 'slam' });
  cam.to({ x: -10, y: -5, zoom: 1.08 }, { at: 'l054', dur: 3.5 });

  /* ---------- l055: "So it is a seesaw with a panic button." - Skip taps the red button ---------- */
  cam.reset({ at: 'l055', dur: 0.4 });
  skip.pose('point', { at: 'l055' }); karto.pose('deadpan', { at: 'l055' });
  const SS2 = tall ? B(0, 0.1, 1, 0.8) : { x: 560, y: 150, w: 940, h: 640 };
  const ss2 = F.seesaw({ slot: SS2, fit: 1, at: 'l055+0.05', out: 'l056+1.2', enter: 'rise', exit: 'cut' });
  const r2 = rect(SS2), k2 = Math.min(r2.w / 760, r2.h / 520), x2 = r2.x + (r2.w - 760 * k2) / 2, y2 = r2.y + (r2.h - 520 * k2) / 2;
  const rb = art1(D.redBtn(), { slot: { x: x2 + 330 * k2, y: y2 + 130 * k2, w: 100 * k2, h: 72 * k2 }, fit: 1, plane: 'front', at: 'l055+0.4', out: 'l056+1.2', enter: 'drop', exit: 'cut', edge: 4 });
  P.label('panic', { slot: { x: x2 + 180 * k2, y: y2 - 20 * k2, w: 420 * k2, h: 90 }, size: 'm', stock: 'yellow', tape: true, at: 'l055+0.7', out: 'l056+1.2', tilt: -3, enter: 'slap' });
  rb.to({ y: 14 }, { at: 'l055:0.55', dur: 0.12, ease: 'inQuad' }); rb.to({ y: 0 }, { at: 'l055:0.65', dur: 0.2, ease: 'outQuad' });
  K.sfx('ding', 'l055:0.58', { db: -8 });
  ss2.tilt(-9, 'l055:0.6', 0.5); ss2.tilt(9, 'l055:0.95', 0.5);
  skip.hop({ at: 'l055:0.55', h: 20 });

  /* ---------- l056: "So who gets hurt when it tips?" - STAMP 4, seesaw wheeled off, a crowd rises ---------- */
  skip.pose('point', { at: 'l056' }); karto.pose('neutral', { at: 'l056', sfx: false });
  const sa = K.at('l056', 0.0); F.stamp(4, sa);
  P.label('stamp_piece', { plane: 'hud', slot: tall ? { x: 190, y: 800, w: 600, h: 90 } : { x: 770, y: 660, w: 600, h: 100 }, size: 'm', stock: 'yellow', tape: true, at: T(sa) + 0.8, out: T(sa) + 1.9, tilt: -2, enter: 'slap' });
  ss2.to({ x: 1300 }, { at: 'l056+0.25', dur: 0.8, ease: 'inQuad' }); rb.to({ x: 1300 }, { at: 'l056+0.25', dur: 0.8, ease: 'inQuad' }); K.sfx('slide-long', 'l056+0.25', { db: -8 });
  const crowd = F.crowd({ rows: 2, cols: 6, expr: 'wow', look: 0, slot: tall ? B(0, 0.45, 1, 0.55) : { x: 560, y: 250, w: 940, h: 400 }, fit: 1, at: 'l056+0.6', enter: 'rise' });
  crowd.wiggle({ at: 'l056+1.3' });
}
