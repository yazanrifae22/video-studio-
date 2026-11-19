// c05 - piece five "Who gets hurt" (l057-l069). Scene author B. Short s5 = l066-l069 (tall).
// Real media: india_loan_sign + bracelets (l057-l062), wedding_gold / wedding_box + clips coin_bracelet, wedding_hand (l066-l067), jeweller_shop (l068).
import { D } from './c04.art.js';
export default function (K, F) {
  const { karto, skip, P, cam, tall } = F, T = F.T, s = F.s, B = F.B;
  F.chapterOpen('c05');
  const art1 = (svg, o = {}) => F.piece({ w: svg[0], h: svg[1], fit: 1, enter: 'pop', ...o, layers: [{ id: 'a', svg, x: 0, y: 0, w: svg[0], h: svg[1], edge: o.edge == null ? 5 : o.edge, ...(o.layer || {}) }] });
  const rect = (sl) => K.slot(sl);
  const GOLD = '#F2B824', RED = '#E5401D';

  /* ---------- l057: "Piece five. Who gets hurt. First, India ... A gold loan." - the loan-shop photo, a gold ring on a tray, cash slides back ---------- */
  const IP = tall ? B(0, 0, 1, 0.6) : { x: 520, y: 20, w: 640, h: 620 };
  const ip = F.photo('india_loan_sign', { slot: IP, caption: 'cap_india_loan', at: 'l057+1.7', out: 'l063', enter: 'drop', exit: 'fly', tilt: -2, push: 1.1 });
  karto.pose('present', { at: s('l057', 1, 0.0) }); karto.pose('point', { at: s('l057', 2, 0.0) });
  const RTS = tall ? B(0.05, 0.6, 0.9, 0.4) : { x: 1140, y: 330, w: 380, h: 440 };
  const rt = F.piece({ slot: RTS, fit: 1, w: 380, h: 300, at: s('l057', 1, 0.5), out: 'l058', enter: 'rise', exit: 'cut', layers: [
    { id: 'tray', svg: D.tray(), x: 20, y: 160, w: 340, h: 118, edge: 4 },
    { id: 'ring', svg: [124, 124, `<circle cx="62" cy="62" r="44" fill="none" stroke="#1E1712" stroke-width="22"/><circle cx="62" cy="62" r="44" fill="none" stroke="${GOLD}" stroke-width="12"/>`], x: 130, y: -30, w: 110, h: 110, edge: 0, hidden: true },
    { id: 'cash', svg: D.cash(), x: 300, y: 60, w: 240, h: 130, edge: 4, hidden: true }] });
  rt.L('ring').show(s('l057', 2, 0.1)).to({ y: 118 }, { at: s('l057', 2, 0.1), dur: 0.45, ease: 'outBounce' }); K.sfx('coin', s('l057', 2, 0.55), { db: -10 });
  rt.L('cash').show(s('l057', 2, 0.6)).to({ x: -180, y: 90 }, { at: s('l057', 2, 0.6), dur: 0.6, ease: 'outCubic' }); K.sfx('slide', s('l057', 2, 0.6), { db: -12 });
  skip.pose('neutral', { at: 'l057', sfx: false });
  cam.to({ x: 20, y: -6, zoom: 1.07 }, { at: 'l057+1.7', dur: 5 });

  /* ---------- l058: "So the gold is the deposit." - the bangles (the pledged gold) beside the branch ---------- */
  cam.reset({ at: 'l058', dur: 0.4 });
  skip.pose('thinking', { at: 'l058' }); karto.pose('neutral', { at: 'l058', sfx: false });
  const BR = tall ? B(0.3, 0.45, 0.7, 0.55) : { x: 1000, y: 290, w: 500, h: 500 };
  const br = F.photo('bracelets', { slot: BR, caption: 'cap_bracelets', at: 'l058+0.1', out: 'l059', enter: 'slam', exit: 'fly', tilt: 3, push: 1.1 });
  const ipr = rect(IP), brr = rect(BR);
  P.arrow({ x: brr.x + brr.w * 0.1, y: brr.y + brr.h * 0.55 }, { x: ipr.x + ipr.w * 0.9, y: ipr.y + ipr.h * 0.5 }, { at: 'l058+0.5', out: 'l059', color: '#C0391B', width: 12, bow: 0.1 });

  /* ---------- l059: "The rule: a lender may lend at most seventy-five percent." - loan bar (gold 100 / loan 75) ---------- */
  skip.pose('neutral', { at: 'l059', sfx: false }); karto.pose('present', { at: 'l059' }); karto.pose('point', { at: s('l059', 2, 0.0) });
  const BS = tall ? B(0.1, 0.05, 0.8, 0.9) : { x: 1120, y: 40, w: 390, h: 760 };
  if (tall) { ip.to({ sc: 0.6, x: -230, y: -190 }, { at: 'l059', dur: 0.5 }); }
  const bars = F.loanBar([{ key: 'gold_100', pct: 1, col: GOLD }, { key: 'loan_75', pct: 0.75, col: RED }], { W: 460, H: 700, bw: 170, gap: 60, x0: 50, slot: BS, fit: 1, at: 'l059+0.2', out: 'l060', enter: 'none', exit: 'cut' });
  bars.grow(0, s('l059', 2, 0.0), 0.5); bars.grow(1, s('l059', 2, 0.6), 0.5);
  const bsr = rect(BS);
  P.label('ltv', { slot: { x: bsr.x + (tall ? 0 : -20), y: bsr.y + bsr.h * 0.02, w: bsr.w + (tall ? 0 : 40), h: 100 }, size: 'm', stock: 'yellow', tape: true, at: s('l059', 1, 0.2), out: 'l060', tilt: -3, enter: 'slam' });

  /* ---------- l060: gold falls to 80, the loan is still 75: far over the rule; the red phone rings ---------- */
  karto.pose('neutral', { at: 'l060', sfx: false }); skip.pose('shocked', { at: s('l060', 2, 0.0) });
  const bars2 = F.loanBar([{ key: 'gold_80', pct: 0.8, col: GOLD }, { key: 'loan_75', pct: 0.75, col: RED }], { W: 460, H: 700, bw: 170, gap: 60, x0: 50, slot: BS, fit: 1, at: 'l060', out: 'l062', enter: 'none', exit: 'cut' });
  for (const id of ['b1', 't1']) bars2.L(id).show('l060');
  bars2.L('b0').show('l060').to({ sy: [1.25, 1] }, { at: 'l060+0.2', dur: 0.5, ease: 'back(1.6)' }); bars2.L('t0').pop('l060+0.7', { sfx: false });
  K.sfx('thud', 'l060+0.6', { db: -8 }); cam.shake('l060+0.6', { amp: 7, dur: 0.3 });
  P.label('over_rule', { slot: { x: bsr.x + (tall ? 0.1 * bsr.w : -30), y: bsr.y + bsr.h * 0.62, w: bsr.w + (tall ? -0.2 * bsr.w : 60), h: 90 }, size: 'm', stock: 'white', ink: '#C0391B', tape: true, at: s('l060', 1, 0.1), out: 'l062', tilt: 4, enter: 'slam' });
  const ph = art1(D.redPhone(), { slot: tall ? { x: 80, y: 560, w: 170, h: 190 } : { x: 540, y: 660, w: 150, h: 150 }, fit: 1, plane: 'front', at: s('l060', 2, 0.0), out: 'l062', enter: 'drop', exit: 'cut', edge: 4 });
  for (let i = 0; i < 5; i++) { ph.wiggle({ at: T(s('l060', 2, 0.2)) + i * 0.28 }); K.sfx('tap', T(s('l060', 2, 0.2)) + i * 0.28, { db: -12 }); }
  P.label('topup', { slot: tall ? { x: 80, y: 770, w: 520, h: 90 } : { x: 720, y: 690, w: 400, h: 100 }, size: 'm', stock: 'yellow', tape: true, at: s('l060', 2, 0.3), out: 'l062', tilt: -3, enter: 'slap' });

  /* ---------- l061: "And if I cannot?" - Skip steps back ---------- */
  skip.pose('shocked', { at: 'l061' }); skip.tilt({ deg: 6, at: 'l061' }); karto.pose('deadpan', { at: 'l061' });
  ip.pulse({ at: 'l061+0.2' });

  /* ---------- l062: "Lenders can auction the gold, but only after missed grace periods. Not instantly." - calendar boxes ticked off, hammer waits ---------- */
  skip.tilt({ deg: 0, at: 'l062' }); skip.pose('thinking', { at: 'l062' }); karto.pose('present', { at: 'l062' });
  const CZ = tall ? B(0.1, 0.55, 0.85, 0.45) : { x: 1050, y: 20, w: 470, h: 640 };
  const cal = F.piece({ slot: CZ, fit: 1, w: 600, h: 560, at: 'l062+0.1', out: 'l063', enter: 'drop', exit: 'cut', layers: [
    { id: 'cal', art: 'calBig', x: 0, y: 0, w: 600, h: 560, edge: 6 },
    ...[0, 1, 2].map((i) => ({ id: 'bx' + i, svg: D.box(), x: 40 + i * 180, y: 200, w: 150, h: 130, edge: 4 })),
    ...[0, 1, 2].map((i) => ({ id: 'x' + i, svg: [150, 130, `<path d="M22 20 L128 110 M128 20 L22 110" stroke="#1E1712" stroke-width="16" stroke-linecap="round" fill="none"/><path d="M22 20 L128 110 M128 20 L22 110" stroke="${RED}" stroke-width="8" stroke-linecap="round" fill="none"/>`], x: 40 + i * 180, y: 200, w: 150, h: 130, flat: true, hidden: true })),
    { id: 'gv', art: 'gavel', x: 340, y: 380, w: 220, h: 122, edge: 4, rot: -25, origin: '100% 100%' }] });
  for (let i = 0; i < 3; i++) { const a = T(K.at('l062', 0.12)) + i * 0.55; cal.L('x' + i).pop(a, { sfx: 'scratch', from: 0.3 }); }
  cal.L('gv').to({ rot: -10 }, { at: K.at('l062', 0.72), dur: 0.5 }); cal.L('gv').to({ rot: -25 }, { at: T(K.at('l062', 0.72)) + 0.6, dur: 0.4 });
  const cr = rect(CZ);
  P.label('grace_lbl', { slot: { x: cr.x + cr.w * 0.05, y: cr.y + cr.h * 0.58, w: cr.w * 0.9, h: 90 }, size: 'm', stock: 'white', tape: true, at: K.at('l062', 0.3), out: 'l063', tilt: 3, enter: 'slap' });

  /* ---------- l063: Fitch report cover + a green "absorb" bar then a longer red bar ---------- */
  skip.pose('neutral', { at: 'l063', sfx: false }); karto.pose('point', { at: 'l063' });
  const RZ = tall ? B(0.02, 0.0, 0.5, 0.6) : { x: 520, y: 20, w: 470, h: 740 };
  const rep = F.piece({ slot: RZ, fit: 1, w: 380, h: 480, at: 'l063+0.05', out: 'l066', enter: 'slap', exit: 'cut', tilt: -3, layers: [
    { id: 'cv', svg: D.report(), x: 0, y: 0, w: 380, h: 480, edge: 6 },
    { id: 'ttl', key: 'fitch', x: 90, y: 60, w: 250, h: 130, max: 44, lines: 3, color: '#1E1712', font: 'marker' }] });
  const GZ = tall ? B(0.45, 0.05, 0.55, 0.55) : { x: 1010, y: 30, w: 500, h: 440 };
  const gz = rect(GZ);
  const hb = F.piece({ slot: GZ, fit: 1, w: 540, h: 400, at: 'l063+0.1', out: 'l066', enter: 'none', exit: 'cut', layers: [
    { id: 'ga', art: 'barBlock', ao: { w: 280, h: 150, col: '#57A05A' }, x: 0, y: 10, w: 280, h: 150, edge: 5, hidden: true, origin: '0% 50%' },
    { id: 'gt', key: 'fitch_a', x: 10, y: 24, w: 260, h: 120, max: 40, lines: 3, color: '#FFFDF6', hidden: true, tcss: { textShadow: '3px 4px 0 #1E1712' } },
    { id: 'ra', art: 'barBlock', ao: { w: 540, h: 170, col: RED }, x: 0, y: 200, w: 540, h: 170, edge: 5, hidden: true, origin: '0% 50%' },
    { id: 'rt', key: 'fitch_b', x: 14, y: 214, w: 510, h: 140, max: 44, lines: 2, color: '#FFFDF6', hidden: true, tcss: { textShadow: '3px 4px 0 #1E1712' } }] });
  const a1 = K.at('l063', 0.22);
  hb.L('ga').show(a1).to({ sx: [0.05, 1] }, { at: a1, dur: 0.6, ease: 'outCubic' }); hb.L('gt').pop(T(a1) + 0.5, { sfx: false }); K.sfx('riser', a1, { dur: 0.6, db: -12 });
  const a2 = K.at('l063', 0.6);
  hb.L('ra').show(a2).to({ sx: [0.05, 1] }, { at: a2, dur: 0.8, ease: 'outCubic' }); hb.L('rt').pop(T(a2) + 0.7, { sfx: false }); K.sfx('riser', a2, { dur: 0.8, db: -12 });

  /* ---------- l064: "So fifteen percent means panic." - smug Skip ---------- */
  skip.pose('point', { at: 'l064' }); skip.hop({ at: 'l064+0.2', h: 40 }); karto.pose('deadpan', { at: 'l064' });

  /* ---------- l065: "No. That is headline talk ... a stress test, not a forecast." - tape across the report, headline crossed out ---------- */
  karto.pose('present', { at: 'l065' }); skip.pose('neutral', { at: 'l065', sfx: false });
  const HZ = tall ? B(0.1, 0.62, 0.85, 0.2) : { x: 1010, y: 500, w: 500, h: 300 };
  const hl = F.piece({ slot: HZ, fit: 1, w: 420, h: 160, at: 'l065+0.1', out: 'l066', enter: 'drop', exit: 'cut', tilt: 2, layers: [
    { id: 'hc', svg: D.headline(), x: 0, y: 0, w: 420, h: 160, edge: 4 },
    { id: 'ht', key: 'panic_hl', x: 26, y: 20, w: 370, h: 120, max: 40, lines: 3, color: '#1E1712' },
    { id: 'xx', svg: [420, 160, `<path d="M16 130 L404 28" stroke="#1E1712" stroke-width="22" stroke-linecap="round"/><path d="M16 130 L404 28" stroke="${RED}" stroke-width="12" stroke-linecap="round"/>`], x: 0, y: 0, w: 420, h: 160, flat: true, hidden: true, origin: '0% 50%' }] });
  hl.L('xx').show(s('l065', 1, 0.2)).to({ sx: [0.02, 1] }, { at: s('l065', 1, 0.2), dur: 0.45, ease: 'outCubic' }); K.sfx('scratch', s('l065', 1, 0.2), { db: -8 });
  const rr = rect(RZ);
  F.tapeNote({ x: rr.x + rr.w * 0.5, y: rr.y + rr.h * 0.62 }, 'guess_tape', K.at('l065', 0.15), { out: 'l066', w: tall ? 440 : 420 });

  /* ---------- l066: the wedding gold: big photo, a coin bracelet clip, a paper family looking at it warmly ---------- */
  cam.reset({ at: 'l066', dur: 0.5 });
  skip.pose('neutral', { at: 'l066', sfx: false }); karto.pose('whisper', { at: 'l066' }); karto.tilt({ deg: -3, at: 'l066' });
  const WP = tall ? B(0, 0, 1, 0.64) : { x: 520, y: 10, w: 640, h: 540 };
  art1(D.glow(), { slot: tall ? B(-0.1, -0.1, 1.2, 0.8) : { x: 480, y: 0, w: 720, h: 640 }, fit: 1, at: 'l066', out: 'l068', enter: 'none', exit: 'cut', edge: 0, layer: { flat: true } });
  const wg = F.photo('wedding_gold', { slot: WP, caption: 'cap_wedding', at: 'l066+0.05', out: 'l067', enter: 'drop', exit: 'cut', tilt: -2, push: 1.12 });
  const tv1 = tall ? null : F.tv('coin_bracelet', { slot: { x: 1180, y: 10, w: 330, h: 800 }, at: s('l066', 1, 0.0), t0: s('l066', 1, 0.0), out: 'l067', loop: true });
  const fam = F.crowd({ rows: 1, cols: 3, expr: 'happy', look: 0, slot: tall ? B(0.02, 0.66, 0.55, 0.34) : { x: 560, y: 570, w: 420, h: 230 }, fit: 1, plane: 'front', at: s('l066', 1, 0.3), out: 'l068', enter: 'rise', exit: 'cut' });
  fam.wiggle({ at: s('l066', 2, 0.0) });
  cam.to({ x: -10, y: -4, zoom: 1.07 }, { at: 'l066', dur: 5 });

  /* ---------- l067: "That is not an investment. That is a hug in a drawer." - quiet; the clip of a hand holding the heavy gold ---------- */
  cam.reset({ at: 'l067', dur: 0.4 });
  skip.pose('neutral', { at: 'l067', sfx: false }); skip.tilt({ deg: 3, at: 'l067' }); karto.pose('neutral', { at: 'l067', sfx: false }); karto.tilt({ deg: 0, at: 'l067' });
  const wb = F.photo('wedding_box', { slot: tall ? B(0, 0, 1, 0.56) : { x: 520, y: 10, w: 640, h: 540 }, caption: 'cap_wedding_box', at: 'l067+0.05', out: 'l068', enter: 'drop', exit: 'cut', tilt: 2, push: 1.1 });
  const tv2 = F.tv('wedding_hand', { slot: tall ? B(0.4, 0.4, 0.6, 0.6) : { x: 1180, y: 10, w: 330, h: 800 }, at: 'l067+0.1', t0: 'l067', out: 'l068', loop: true });
  P.label('hug_drawer', { slot: tall ? B(0.04, 0.58, 0.5, 0.2) : { x: 540, y: 600, w: 560, h: 110 }, size: 'm', stock: 'white', tape: true, at: s('l067', 1, 0.2), out: 'l068', tilt: -2, enter: 'slap' });

  /* ---------- l068: "For them the screen price changes nothing ... About thirty percent down, on paper only." - the Damascus gold shop, a paper-only tag ---------- */
  cam.reset({ at: 'l068', dur: 0.4 });
  skip.pose('thinking', { at: 'l068' }); karto.pose('present', { at: 'l068' });
  const JP = tall ? B(0, 0, 1, 0.66) : { x: 520, y: 10, w: 640, h: 540 };
  const jp = F.photo('jeweller_shop', { slot: JP, caption: 'cap_jeweller', at: 'l068+0.05', out: 'l069', enter: 'drop', exit: 'fly', tilt: -1.5, push: 1.1 });
  const jr = rect(JP);
  const tvB = tall ? null : F.tv('souk_bangles', { slot: { x: 1180, y: 10, w: 330, h: 800 }, at: 'l068+0.3', t0: 'l068', out: 'l069', loop: true });
  P.label('minus30', { slot: tall ? B(0.04, 0.7, 0.4, 0.2) : { x: 560, y: 600, w: 300, h: 140 }, size: 'xl', stock: 'yellow', tape: true, at: s('l068', 2, 0.0), out: 'l069', tilt: -4, enter: 'slam' });
  P.label('on_paper', { slot: tall ? B(0.45, 0.72, 0.52, 0.2) : { x: 880, y: 620, w: 280, h: 110 }, size: 'm', stock: 'white', tape: true, at: s('l068', 2, 0.5), out: 'l069', tilt: 4, enter: 'slap' });
  cam.to({ x: 10, y: -4, zoom: 1.07 }, { at: 'l068', dur: 6 });

  /* ---------- l069: "Three kinds of people feel it. History is next." - STAMP 5, then the door to the past slides in ---------- */
  cam.reset({ at: 'l069', dur: 0.4 });
  skip.pose('neutral', { at: 'l069', sfx: false }); karto.pose('neutral', { at: 'l069', sfx: false });
  const sa = K.at('l069', 0.0); F.stamp(5, sa);
  P.label('stamp_piece', { plane: 'hud', slot: tall ? { x: 190, y: 800, w: 600, h: 90 } : { x: 770, y: 660, w: 600, h: 100 }, size: 'm', stock: 'yellow', tape: true, at: T(sa) + 0.8, out: T(sa) + 1.9, tilt: -2, enter: 'slap' });
  const DZ = tall ? B(0.25, 0.05, 0.5, 0.9) : { x: 760, y: 40, w: 420, h: 760 };
  const door = F.piece({ slot: DZ, fit: 1, w: 320, h: 540, at: K.at('l069', 0.5), enter: 'slide', exit: 'cut', layers: [
    { id: 'd', art: 'door', x: 20, y: 90, w: 280, h: 440, edge: 7 },
    { id: 'ck', art: 'clock', x: 110, y: 0, w: 100, h: 100, edge: 4, idle: { rot: 4, f: 0.8 } },
    { id: 'tx', key: 'door_past', x: 20, y: 300, w: 280, h: 80, max: 40, color: '#FFFDF6', tcss: { textShadow: '3px 4px 0 #1E1712' } }] });
  K.sfx('slide-long', K.at('l069', 0.52), { db: -10 });
}
