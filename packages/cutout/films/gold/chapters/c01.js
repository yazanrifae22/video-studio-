// c01 - piece one: the record (l010-l019, ~75 s). Foundation engineer. Short s1 = l013-l019 (tall).
// Real media: bars_stack photo (l010-l013) with the price board + chart beside it, shop_crowd clip on the TV (l014), the NY Fed BUILDING photo (l017-l019).
export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s, B = F.B, Z = F.Z;
  const dur = (id) => K.line(id).t1 - K.line(id).t0;
  F.chapterOpen('c01');

  /* ---------- l010: "Piece one. The record. 2025 was gold's best year since 1979. Up about two thirds." ---------- */
  const pSlot = tall ? B(0, 0, 1, 0.56) : { x: 520, y: 80, w: 560, h: 700 };
  const ph = F.photo('bars_stack', { slot: pSlot, caption: 'cap_bars_stack', at: s('l010', 2, 0.0), out: 'l014', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  const bars = F.loanBar([{ key: 'other_years', pct: 0.3, col: '#3D7DB8' }, { key: 'best_year', pct: 1, col: '#E5401D' }], { W: 460, H: 700, bw: 170, gap: 60, x0: 50, slot: tall ? B(0.1, 0.5, 0.8, 0.5) : { x: 1040, y: 60, w: 460, h: 740 }, fit: 1, at: s('l010', 2, 0.2), out: 'l012', enter: 'rise', exit: 'fly' });
  bars.grow(0, s('l010', 2, 0.35), 0.4);
  const bg = s('l010', 3, 0), gd = Math.max(1.0, (K.line('l010').t1 - bg) * 0.9);
  bars.grow(1, bg - 0.1, gd);
  K.sfx('riser', bg - 0.1, { dur: gd, db: -10 });
  karto.pose('point', { at: 'l010' }); karto.pose('present', { at: s('l010', 2) }); karto.pose('cheer', { at: s('l010', 3) });
  cam.to({ x: 20, y: -8, zoom: 1.08 }, { at: s('l010', 2), dur: 3 });

  /* ---------- l011: pebble ---------- */
  skip.pose('deadpan', { at: 'l011' }); skip.tilt({ deg: -4, at: 'l011+0.1' });
  const peb = F.cut('pebble', { slot: tall ? { x: 560, y: 1120, w: 150, h: 110 } : { x: 1600, y: 760, w: 150, h: 110 }, fit: 1, plane: 'front', at: 'l011+0.2', out: 'l012', enter: 'drop', exit: 'cut' });
  peb.to({ x: tall ? -400 : -380, y: 250, rot: -500 }, { at: 'l011:0.55', dur: 0.9, ease: 'inQuad' }); K.sfx('tap', 'l011:0.55', { db: -12 });
  skip.pose('deadpan', { at: s('l011', 1) }); skip.hop({ at: 'l011:0.6', h: 30 });
  karto.pose('neutral', { at: 'l011', sfx: false });

  /* ---------- l012: "Of a shiny metal. Then January: gold crossed five thousand dollars an ounce for the first time." - board counts up ---------- */
  skip.tilt({ deg: 0, at: 'l012' }); skip.pose('neutral', { at: 'l012', sfx: false });
  karto.pose('laughing', { at: 'l012' }); karto.pose('present', { at: s('l012', 1) });
  const cs = s('l012', 1, 0.3), cd = Math.max(1.4, (K.line('l012').t1 - cs) * 0.7);
  const tmpl = K.s('five_k'); // count by re-using the five_k string with another number (no extra keys)
  const board = F.priceBoard(['board_title', 'five_k'], { slot: tall ? B(0.06, 0.55, 0.88, 0.45) : { x: 1090, y: 150, w: 420, h: 440 }, fit: 1, at: s('l012', 0, 0.55), out: 'l014', enter: 'drop', exit: 'fly', tilt: 3 });
  const r1 = board.ids.r1; r1.textAt = (t) => { const p = Math.min(1, Math.max(0, (t - cs) / cd)), e = 1 - Math.pow(1 - p, 3); return p >= 1 ? K.s('five_k') : tmpl.replace(/[0-9٠-٩][0-9٠-٩,٬.٫]*/, K.num(Math.round(e * 5000))); };
  r1.tcss = { whiteSpace: 'nowrap' }; r1.textEl = null; r1.max = 70;
  K.sfx('count', cs, { dur: cd, db: -12 }); K.sfx('ding', cs + cd, { db: -8 });
  board.pulse({ at: cs + cd }); cam.to({ x: 30, y: -4, zoom: 1.1 }, { at: cs, dur: cd });

  /* ---------- l013: "Who was buying all that?" ---------- */
  skip.pose('neutral', { at: 'l013', sfx: false }); skip.tilt({ deg: 5, at: 'l013' });
  karto.pose('neutral', { at: 'l013', sfx: false }); cam.reset({ at: 'l013', dur: 0.6 });

  /* ---------- l014: "Everybody..." - the TV of a crowded gold shop, three reasons on arrows ---------- */
  skip.tilt({ deg: 0, at: 'l014' });
  karto.pose('present', { at: 'l014' });
  const tv = F.tv('shop_crowd', { slot: tall ? B(0, 0, 0.58, 1) : { x: 620, y: 10, w: 520, h: 820 }, at: 'l014+0.03', t0: 'l014', out: 'l015', enter: 'drop', loop: true });
  const lx = tall ? 0.52 : 1130, wl = tall ? 0.48 : 380;
  const lab = (key, i, at) => {
    const slot = tall ? B(lx, 0.08 + i * 0.28, wl, 0.16) : { x: lx, y: 90 + i * 240, w: wl, h: 150 };
    const l = P.label(key, { slot, size: 'l', stock: i === 1 ? 'yellow' : 'white', tape: true, at, out: 'l015', tilt: i === 1 ? 3 : -3, enter: 'slap' });
    const lr = K.slot(slot), fromP = { x: lr.x, y: lr.y + lr.h / 2 }, toP = { x: tv.g.scrX + tv.g.sw * 0.8, y: tv.g.scrY + tv.g.sh * (0.2 + i * 0.3) };
    P.arrow(fromP, toP, { at: T(at) + 0.15, out: 'l015', color: '#C0391B', width: 10, bow: i === 1 ? -0.12 : 0.12 });
    return l;
  };
  lab('r_safe', 0, K.at('l014', 0.2)); lab('r_rates', 1, K.at('l014', 0.42)); lab('r_dollar', 2, K.at('l014', 0.64));
  karto.pose('point', { at: K.at('l014', 0.2) });

  /* ---------- l015: the FOMO train pulls out; the last paper head hops and misses ---------- */
  skip.pose('thinking', { at: 'l015' }); karto.pose('present', { at: 'l015' });
  const trk = F.piece({ slot: tall ? B(0, 0.12, 1, 0.5) : { x: 560, y: 160, w: 960, h: 430 }, fit: 1, w: 780, h: 270, at: 'l015', out: 'l016', enter: 'none', exit: 'cut', layers: [
    { id: 'tr', art: 'train', x: 10, y: 5, w: 760, h: 260, edge: 6 },
    { id: 'tag', key: 'fomo', x: 500, y: 100, w: 200, h: 56, max: 46, color: '#FFFDF6', hidden: true, tcss: { textShadow: '3px 3px 0 #1E1712' } }] });
  trk.L('tr').slideIn('l015+0.05', { dx: 900, dur: 0.55, sfx: 'whoosh' }); trk.L('tag').pop(s('l015', 0, 0.55));
  const leave = s('l015', 1, 0.2);
  trk.L('tr').to({ x: -1100 }, { at: leave, dur: 1.2, ease: 'inCubic' }); trk.L('tag').to({ x: -1100 + 500 - 10 }, { at: leave, dur: 1.2, ease: 'inCubic' });
  K.sfx('whoosh', leave, { db: -8 }); trk.L('tag').wiggle(s('l015', 1, 0.0));
  const hd = F.crowd({ rows: 1, cols: 4, expr: 'shout', look: -1, slot: tall ? B(0.3, 0.55, 0.7, 0.25) : { x: 940, y: 470, w: 520, h: 200 }, fit: 1, plane: 'front', at: s('l015', 0, 0.4), out: 'l016', enter: 'slide', exit: 'cut' });
  hd.to({ x: -420 }, { at: leave + 0.15, dur: 1.5, ease: 'inQuad' }); hd.to({ y: -50 }, { at: leave + 1.4, dur: 0.2, ease: 'outQuad' }); hd.to({ y: 0 }, { at: leave + 1.6, dur: 0.35, ease: 'bounce' });
  K.sfx('tap', leave + 1.7, { db: -12 }); skip.shake({ at: leave + 1.7 });

  /* ---------- l016: "So I buy a bar and I am rich?" - a gold bar balanced on Skip's phone ---------- */
  skip.pose('thinking', { at: 'l016' });
  F.goldBar({ slot: tall ? { x: 600, y: 1090, w: 230, h: 130 } : { x: 1640, y: 740, w: 220, h: 120 }, fit: 1, plane: 'front', at: 'l016+0.1', out: 'l017', enter: 'drop', exit: 'cut', idle: { rot: 8, y: 4, f: 1.1 } });
  F.goldBar({ slot: tall ? B(0.1, 0.1, 0.8, 0.5) : { x: 700, y: 140, w: 700, h: 500 }, fit: 0.75, at: 'l016+0.05', out: 'l017', enter: 'pop', exit: 'pop', tilt: 5, idle: { rot: 3, f: 0.6 } });
  karto.pose('deadpan', { at: 'l016' });

  /* ---------- l017: the NY Fed building (the BUILDING), record flag planted on top ---------- */
  skip.pose('neutral', { at: 'l017', sfx: false }); karto.pose('cheer', { at: s('l017', 1) });
  const fed = F.photo('ny_fed_building', { slot: tall ? B(0, 0, 1, 0.84) : Z.big, caption: 'cap_ny_fed', at: 'l017+0.1', out: 'l020', enter: 'drop', exit: 'fly', tilt: -1.5, push: 1.1 });
  const fs = K.slot(tall ? B(0, 0, 1, 0.84) : Z.big);
  const fx = tall ? 0.1 : 0.12, fy = tall ? 0.03 : 0.06;
  const flag = P.label('peak_price', { slot: { x: fs.x + fs.w * fx, y: fs.y + fs.h * fy, w: fs.w * 0.5, h: 130 }, size: 'xl', stock: 'yellow', tape: true, at: s('l017', 1, 0.2), out: 'l020', tilt: -4, enter: 'slam' });
  P.label('peak_lbl', { slot: { x: fs.x + fs.w * fx, y: fs.y + fs.h * fy + 150, w: fs.w * 0.62, h: 90 }, size: 'm', stock: 'white', tape: true, at: s('l017', 1, 0.5), out: 'l020', tilt: 2, enter: 'slap' });
  cam.to({ x: -10, y: -5, zoom: 1.1 }, { at: 'l017', dur: 5 });

  /* ---------- l018: "That sounds like a happy story." - party hat ---------- */
  skip.pose('deadpan', { at: 'l018' }); skip.tilt({ deg: -4, at: 'l018+0.1' });
  F.cut('partyHat', { slot: tall ? { x: 640, y: 1080, w: 110, h: 150 } : { x: 1650, y: 520, w: 130, h: 170 }, fit: 1, plane: 'front', at: 'l018+0.2', out: 'l020', enter: 'drop', exit: 'cut', idle: { rot: 5, f: 0.8 } });
  karto.pose('neutral', { at: 'l018', sfx: false });

  /* ---------- l019: "It was. For a few days. The record was real. But ..." - STAMP 1, then the vault photo shakes and cracks ---------- */
  skip.tilt({ deg: 0, at: 'l019' }); skip.pose('neutral', { at: 'l019', sfx: false });
  karto.pose('neutral', { at: 'l019', sfx: false }); karto.pose('deadpan', { at: s('l019', 1) }); karto.pose('present', { at: s('l019', 2) });
  const sa = s('l019', 1, 0.3); F.stamp(1, sa);
  P.label('stamp_piece', { plane: 'hud', slot: tall ? { x: 190, y: 800, w: 600, h: 90 } : { x: 770, y: 660, w: 600, h: 100 }, size: 'm', stock: 'yellow', tape: true, at: T(sa) + 0.8, out: T(sa) + 1.9, tilt: -2, enter: 'slap' });
  const cr = s('l019', 2, 0.15);
  const crack = F.piece({ slot: tall ? B(0.15, 0.02, 0.7, 0.58) : { x: 700, y: 40, w: 600, h: 760 }, fit: 1, plane: 'front', w: 520, h: 760, at: cr, out: 'l020', enter: 'none', exit: 'cut', layers: [{ id: 'cr', art: 'crack', x: 0, y: 0, w: 520, h: 760, flat: true, origin: '50% 0%' }] });
  crack.L('cr').to({ sy: [0.03, 1] }, { at: cr, dur: 0.9, ease: 'outCubic' }); K.sfx('scratch', cr, { db: -8 }); K.sfx('hit', cr + 0.5, { db: -10 });
  for (let i = 0; i < 6; i++) fed.to({ rot: i % 2 ? 2.5 : -2.5 }, { at: cr + i * 0.07, dur: 0.07 }); fed.to({ rot: -1.5 }, { at: cr + 0.45, dur: 0.1 });
  cam.shake(cr + 0.5, { amp: 7, dur: 0.4 });
  const peek = F.crowd({ rows: 1, cols: 1, expr: 'wow', look: 1, slot: tall ? { x: 660, y: 700, w: 180, h: 200 } : { x: 1330, y: 640, w: 200, h: 190 }, fit: 1, plane: 'front', at: s('l019', 2, 0.6), out: 'l020', enter: 'rise', exit: 'cut' });
}
