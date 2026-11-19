// c06 - piece six: it happened before (l070-l080). Scene author C. Short s6 = l074-l080 (tall).
// Real media: trading_floor_bw + krugerrand (1980 atmosphere), trading_floor (2013 atmosphere), miners_old, mine, bars_worker_bw, gold_coins.
// Dated facts live on cardboard (newspaper, bars, calendar page, timeline); photos are captioned as what they are.
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B;
  const ST = (w, t) => (tall ? t : w);
  F.chapterOpen('c06');

  /* ---------- l070: door to the past, then the 1980 newspaper + an older NYSE floor photo; $850 slams on ---------- */
  const door = F.piece({ slot: ST({ x: 640, y: 70, w: 520, h: 720 }, B(0.1, 0.02, 0.8, 0.96)), fit: 1, w: 280, h: 440, at: K.at('l070', 0.12), out: s('l070', 2, 0.5), enter: 'drop', exit: 'cut', layers: [{ id: 'd', art: 'door', x: 0, y: 0, w: 280, h: 440, origin: '0% 50%' }] });
  // (c06 title card lives on the first 1.7 s; the door drops in right behind it)
  door.L('d').to({ sx: 0.05 }, { at: s('l070', 2, 0.0), dur: 0.5, ease: 'inCubic' }); K.sfx('whoosh', s('l070', 2, 0.0), { db: -8 });
  karto.pose('present', { at: s('l070', 1) }); karto.pose('point', { at: s('l070', 2) }); karto.pose('cheer', { at: s('l070', 4, 0.1) });
  const fl = F.photo('trading_floor_bw', { slot: ST({ x: 960, y: 50, w: 540, h: 730 }, B(0.3, 0, 0.7, 0.8)), caption: 'cap_tf_bw', at: s('l070', 2, 0.25), out: 'l072', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });
  const np = F.newspaper('y1980', { slot: ST({ x: 610, y: 70, w: 400, h: 540 }, B(0, 0.05, 0.5, 0.8)), fit: 1, at: s('l070', 3, 0.0), out: 'l072', enter: 'drop', exit: 'fly', tilt: -4 });
  const pr = P.label('p850', { slot: ST({ x: 650, y: 610, w: 440, h: 170 }, B(0.04, 0.62, 0.6, 0.22)), size: 'xl', stock: 'yellow', tape: true, at: s('l070', 3, 0.55), out: 'l072', tilt: -5, enter: 'slam' });
  cam.to({ x: 10, y: -4, zoom: 1.07 }, { at: s('l070', 2), dur: 5 });

  /* ---------- l071: "Let me guess. It dropped." - Skip nods, a modern Krugerrand drops in as atmosphere ---------- */
  cam.reset({ at: 'l071', dur: 0.5 });
  skip.pose('deadpan', { at: 'l071' }); skip.tilt({ deg: -5, at: 'l071+0.2' }); skip.hop({ at: 'l071:0.6', h: 25 });
  karto.pose('neutral', { at: 'l071', sfx: false });
  F.photo('krugerrand', { slot: ST({ x: 650, y: 440, w: 330, h: 360 }, B(0, 0.5, 0.5, 0.5)), caption: 'cap_krugerrand', at: 'l071+0.2', out: 'l073', enter: 'drop', exit: 'fly', tilt: 5, push: 1.1 });

  /* ---------- l072: three cardboard bars thud down; the third carries the 40 %+ (one source) ---------- */
  skip.tilt({ deg: 0, at: 'l072' }); skip.pose('neutral', { at: 'l072', sfx: false });
  karto.pose('present', { at: 'l072' }); karto.pose('point', { at: s('l072', 1) });
  const bars = F.loanBar([{ key: 'b850', pct: 1, col: '#F2B824' }, { key: 'b_days', pct: 0.75, col: '#E27A55' }, { key: 'b_spring', pct: 0.5, col: '#E5401D' }],
    { W: 600, H: 700, bw: 175, gap: 30, x0: 20, slot: ST({ x: 990, y: 60, w: 520, h: 740 }, B(0.3, 0.02, 0.7, 0.96)), fit: 1, at: 'l072+0.05', out: 'l073', enter: 'rise', exit: 'fly' });
  bars.grow(0, 'l072+0.1', 0.45);
  const b1 = s('l072', 0, 0.55); bars.grow(1, b1, 0.45); K.sfx('thud', b1 + 0.4, { db: -8 });
  const b2 = s('l072', 1, 0.3); bars.grow(2, b2, 0.5); K.sfx('thud', b2 + 0.45, { db: -6 }); cam.shake(b2 + 0.45, { amp: 6, dur: 0.3 });
  P.label('minus40plus', { slot: ST({ x: 1200, y: 195, w: 310, h: 165 }, B(0.3, 0.1, 0.55, 0.3)), size: 'l', stock: 'yellow', tape: true, at: b2 + 0.7, out: 'l073', tilt: -3, enter: 'slam' });

  /* ---------- l073: April 2013: calendar page, a price cliff and "-9% IN ONE DAY" beside an NYSE floor photo ---------- */
  skip.pose('neutral', { at: 'l073', sfx: false }); karto.pose('neutral', { at: 'l073', sfx: false });
  F.photo('trading_floor', { slot: ST({ x: 1020, y: 50, w: 480, h: 730 }, B(0.36, 0, 0.64, 0.6)), caption: 'cap_tf', at: 'l073+0.1', out: 'l075', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });
  const cal = F.piece({ slot: ST({ x: 650, y: 40, w: 330, h: 330 }, B(0, 0, 0.36, 0.4)), fit: 1, w: 230, h: 250, at: s('l073', 0, 0.2), out: 'l075', enter: 'drop', exit: 'fly', tilt: -4, layers: [
    { id: 'cp', art: 'calPage', x: 0, y: 0, w: 230, h: 250 }, { id: 't', key: 'apr2013', x: 22, y: 82, w: 186, h: 120, max: 40, lines: 3, color: '#2B2015' }] });
  const cliff = F.piece({ slot: ST({ x: 650, y: 370, w: 340, h: 240 }, B(0, 0.38, 0.38, 0.32)), fit: 1, w: 460, h: 280, at: s('l073', 1, 0.0), out: 'l075', enter: 'none', exit: 'fly', layers: [
    { id: 'base', art: 'stepCol', ao: { w: 440, h: 26, col: '#A97A45' }, x: 10, y: 250, w: 440, h: 26, edge: 5 },
    { id: 'hi', art: 'stepCol', ao: { w: 200, h: 220, col: '#F2B824' }, x: 20, y: 30, w: 200, h: 220, edge: 5, hidden: true, origin: '50% 100%' },
    { id: 'lo', art: 'stepCol', ao: { w: 200, h: 150, col: '#E5401D' }, x: 240, y: 100, w: 200, h: 150, edge: 5, hidden: true, origin: '50% 100%' }] });
  cliff.L('hi').pop(s('l073', 1, 0.05), { from: 0.1, sfx: 'pop' });
  const cf = s('l073', 1, 0.5); cliff.L('lo').show(cf).to({ sy: [1.5, 1] }, { at: cf, dur: 0.35, ease: 'bounce' }); K.sfx('thud', cf + 0.2, { db: -6 });
  P.label('minus9', { slot: ST({ x: 650, y: 650, w: 380, h: 140 }, B(0.36, 0.69, 0.64, 0.2)), size: 'xl', stock: 'yellow', tape: true, at: cf + 0.15, out: 'l075', tilt: -3, enter: 'slam' });
  karto.pose('present', { at: s('l073', 1) }); karto.pose('cheer', { at: s('l073', 2) });
  cam.to({ x: 10, y: -4, zoom: 1.07 }, { at: 'l073', dur: 6 });

  /* ---------- l074: "But it came back, right?" - Skip tilts hopefully, everything stays ---------- */
  cam.reset({ at: 'l074', dur: 0.4 });
  skip.pose('thinking', { at: 'l074' }); skip.tilt({ deg: 6, at: 'l074+0.1' }); skip.hop({ at: 'l074:0.5', h: 22 });
  karto.pose('neutral', { at: 'l074', sfx: false });

  /* ---------- l075: timeline strip 2011 -> Dec 2015; miners photo above ---------- */
  skip.tilt({ deg: 0, at: 'l075' }); skip.pose('neutral', { at: 'l075', sfx: false }); karto.pose('present', { at: 'l075' });
  F.photo('miners_old', { slot: ST({ x: 620, y: 10, w: 760, h: 380 }, B(0, 0, 1, 0.56)), caption: 'cap_miners_old', at: 'l075+0.1', out: 'l077', enter: 'drop', exit: 'fly', tilt: -2, push: 1.08 });
  const X1 = 70, X2 = 482, X3 = 870;
  const strip = '<rect x="4" y="4" width="872" height="18" rx="8" fill="#B8875A" stroke="#6B4423" stroke-width="4"/>';
  const tickSvg = '<rect x="3" y="3" width="14" height="50" rx="4" fill="#5A3A22"/>';
  const lab = (id, key, x, y, w, h, col) => ({ id, key, x, y, w, h, max: 40, lines: 2, color: col || '#1E1712', hidden: true });
  const tl = F.piece({ slot: ST({ x: 650, y: 460, w: 860, h: 350 }, B(0, 0.62, 1, 0.38)), fit: 1, w: 940, h: 400, at: s('l075', 0, 0.1), out: s('l080', 1, 0.4), enter: 'none', exit: 'fly', layers: [
    { id: 'strip', svg: [880, 26, strip], x: 30, y: 226, w: 880, h: 26, edge: 4 },
    { id: 'k1', svg: [20, 56, tickSvg], x: X1 - 10, y: 210, w: 20, h: 56, edge: 3, hidden: true }, { id: 'k2', svg: [20, 56, tickSvg], x: X2 - 10, y: 210, w: 20, h: 56, edge: 3, hidden: true }, { id: 'k3', svg: [20, 56, tickSvg], x: X3 - 10, y: 210, w: 20, h: 56, edge: 3, hidden: true },
    lab('l1', 't2011', 6, 276, 300, 110), lab('l2', 't2015', 332, 276, 300, 110, '#C0391B'), lab('l3', 't2020', 640, 276, 296, 110),
    { id: 'br', svg: [800, 80, '<path d="M8 76 V16 H792 V76" fill="none" stroke="#1E1712" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 76 V16 H792 V76" fill="none" stroke="#D2361A" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'], x: X1, y: 10, w: 800, h: 80, flat: true, hidden: true, origin: '0% 50%' },
    { id: 'nine', key: 'nine_years', x: 150, y: 30, w: 400, h: 70, max: 54, color: '#D2361A', hidden: true, tcss: { textShadow: '2px 2px 0 #FFFDF6' } },
    { id: 'ptr', art: 'goldBar', x: X1 - 60, y: 148, w: 120, h: 70, edge: 4, hidden: true }] });
  tl.L('strip').slideIn(s('l075', 0, 0.1), { dx: 900, dur: 0.55, sfx: 'whoosh' });
  tl.L('k1').pop(K.at('l075', 0.22)); tl.L('l1').pop(K.at('l075', 0.26), { sfx: 'tape' }); tl.L('ptr').show(K.at('l075', 0.28));
  tl.L('ptr').to({ x: X2 - 60 }, { at: K.at('l075', 0.5), dur: Math.max(0.8, (K.at('l075', 0.92) - K.at('l075', 0.5))), ease: 'inOutCubic' }); K.sfx('slide-long', K.at('l075', 0.5), { db: -9 });
  tl.L('k2').pop(K.at('l075', 0.9)); tl.L('l2').pop(K.at('l075', 0.94), { sfx: 'tape' }); K.sfx('thud', K.at('l075', 0.95), { db: -7 });

  /* ---------- l076: pointer on to Aug 2020, the "ABOUT 9 YEARS" bracket GROWS across the strip (peak of the chapter) ---------- */
  skip.pose('thinking', { at: 'l076' }); skip.tilt({ deg: -4, at: 'l076+0.3' });
  const a76 = K.line('l076').t0, e76 = K.line('l076').t1, arr = K.at('l076', 0.4);
  tl.L('ptr').to({ x: X3 - 60 }, { at: a76 + 0.05, dur: arr - a76 - 0.05, ease: 'inOutCubic' }); K.sfx('slide-long', a76 + 0.05, { db: -9 });
  tl.L('k3').pop(arr); tl.L('l3').pop(arr + 0.05, { sfx: 'tape' }); K.sfx('thud', arr + 0.05, { db: -7 });
  const gs = arr + 0.3, gd = Math.max(1.2, e76 - gs - 0.35);
  tl.L('br').show(gs).to({ sx: [0.02, 1] }, { at: gs, dur: gd, ease: 'inOutQuad' }); K.sfx('scratch', gs, { db: -8 }); K.sfx('riser', gs, { dur: gd, db: -9 });
  tl.L('nine').pop(gs + gd, { from: 0.3, dur: 0.45 }); K.sfx('ding', gs + gd + 0.05, { db: -8 }); cam.shake(gs + gd + 0.1, { amp: 6, dur: 0.3 });
  karto.pose('point', { at: K.at('l076', 0.5) });
  cam.to({ x: 20, y: 0, zoom: 1.05 }, { at: 'l076', dur: 3.5 });

  /* ---------- l077: "Nine years? For GOLD?" - burst behind Skip, a real mine photo ---------- */
  cam.reset({ at: 'l077', dur: 0.4 });
  skip.pose('mindblown', { at: 'l077' }); skip.tilt({ deg: 0, at: 'l077' }); skip.hop({ at: 'l077+0.15', h: 60 });
  F.cut('burst', { slot: ST({ x: 1560, y: 420, w: 220, h: 190 }, { x: 590, y: 1040, w: 210, h: 180 }), fit: 1, plane: 'front', at: 'l077+0.2', out: 'l078', enter: 'pop', exit: 'cut', idle: { rot: 4, f: 1.2 } });
  K.sfx('pop', 'l077+0.2', { db: -8 });
  F.photo('mine', { slot: ST({ x: 620, y: 10, w: 760, h: 400 }, B(0, 0, 1, 0.6)), caption: 'cap_mine', at: 'l077+0.05', out: 'l078', enter: 'drop', exit: 'fly', tilt: 2, push: 1.1 });
  karto.pose('neutral', { at: 'l077', sfx: false });

  /* ---------- l078: Karto's caution - the MAYBE tape slaps on the bracket, the bracket shakes ---------- */
  skip.pose('neutral', { at: 'l078', sfx: false });
  karto.pose('present', { at: 'l078' });
  F.photo('bars_worker_bw', { slot: ST({ x: 620, y: 10, w: 760, h: 400 }, B(0, 0, 1, 0.6)), caption: 'cap_bars_worker', at: 'l078+0.05', out: s('l080', 1, 0.4), enter: 'drop', exit: 'fly', tilt: -2, push: 1.08 });
  const tp = F.tapeNote(tl.lpt('br', 0.9, 0.3), 'not_prediction', s('l078', 1, 0.0), { w: 300, tilt: -6, out: s('l080', 1, 0.4), exit: 'cut' });
  const bw = s('l078', 1, 0.05); tl.L('br').wiggle(bw, { deg: 4 }); tl.L('nine').wiggle(bw + 0.05, { deg: 4 });
  cam.to({ x: 20, y: 0, zoom: 1.04 }, { at: 'l078', dur: 4 });

  /* ---------- l079: "So history tells me nothing about next week." - Skip shrugs ---------- */
  skip.pose('deadpan', { at: 'l079' }); skip.tilt({ deg: -6, at: 'l079+0.1' }); skip.hop({ at: 'l079:0.5', h: 22 });
  karto.pose('neutral', { at: 'l079', sfx: false });
  cam.reset({ at: 'l079', dur: 0.4 });

  /* ---------- l080: stamp 6; the strip rolls up, a signpost with two paths rises; gold coins photo ---------- */
  skip.tilt({ deg: 0, at: 'l080' }); skip.pose('neutral', { at: 'l080', sfx: false });
  karto.pose('present', { at: 'l080' }); karto.pose('cheer', { at: s('l080', 2, 0.3) });
  const sa = s('l080', 2, 0.05); F.stamp(6, sa);
  P.label('stamp_piece', { plane: 'hud', slot: ST({ x: 770, y: 660, w: 600, h: 100 }, { x: 190, y: 800, w: 600, h: 90 }), size: 'm', stock: 'yellow', tape: true, at: T(sa) + 0.8, out: T(sa) + 1.9, tilt: -2, enter: 'slap' });
  F.photo('gold_coins', { slot: ST({ x: 620, y: 90, w: 470, h: 640 }, B(0, 0, 0.55, 0.6)), caption: 'cap_gold_coins', at: s('l080', 1, 0.5), out: 'l081', enter: 'drop', exit: 'fly', tilt: -3, push: 1.1 });
  const sp = F.piece({ slot: ST({ x: 1060, y: 60, w: 440, h: 740 }, B(0.42, 0.02, 0.58, 0.96)), fit: 1, w: 560, h: 640, at: s('l080', 3, 0.0), out: 'l081', enter: 'none', exit: 'fly', layers: [
    { id: 'post', svg: [60, 640, '<rect x="8" y="0" width="44" height="640" rx="8" fill="#E3C08A" stroke="#8C6A3C" stroke-width="6"/>'], x: 250, y: 10, w: 60, h: 630, edge: 5, hidden: true },
    { id: 'pu', svg: [440, 190, '<path d="M10 20 H350 L430 95 L350 170 H10 Z" fill="#7FC77A" stroke="#1E1712" stroke-width="7" stroke-linejoin="round"/>'], x: 100, y: 40, w: 440, h: 190, edge: 5, rot: -7, hidden: true },
    { id: 'pd', svg: [440, 190, '<path d="M430 20 H90 L10 95 L90 170 H430 Z" fill="#E5401D" stroke="#1E1712" stroke-width="7" stroke-linejoin="round"/>'], x: 20, y: 300, w: 440, h: 190, edge: 5, rot: 7, hidden: true },
    { id: 'tu', key: 'path_up', x: 130, y: 70, w: 300, h: 120, max: 90, color: '#1E1712', hidden: true, rot: -7 },
    { id: 'td', key: 'path_down', x: 110, y: 330, w: 300, h: 120, max: 90, color: '#FFFDF6', hidden: true, rot: 7 }] });
  sp.L('post').slideIn(s('l080', 3, 0.0), { dy: 700, dur: 0.5, sfx: 'thud' });
  sp.L('pu').pop(s('l080', 3, 0.25), { from: 0.2 }); sp.L('tu').pop(s('l080', 3, 0.3), { sfx: false });
  sp.L('pd').pop(s('l080', 3, 0.5), { from: 0.2 }); sp.L('td').pop(s('l080', 3, 0.55), { sfx: false });
  sp.L('pu').wiggle(s('l080', 3, 0.8), { deg: 4 });
}
