// c04 - piece 4: the trailer (l050-l060, ~60 s). Scene author. Short s5 = l050-l057 (tall).
// Beats: leaking film can -> padlock gag -> cardboard player (original sunset beach) -> 93M counter + clock -> podium + rope ->
// trailer 2 + 5x bar -> ADVERT slap -> crowd + almost-empty hourglass -> the '2025' card under a spotlight, cracked by STAMP 4.
import { COL } from '../art.js';
import { D, INK } from './c04.art.js';

export default function (K, F) {
  const { karto, skip, P, cam, tall, rtl } = F, T = F.T, s = F.s;
  const B = (x, y, w, h) => ({ in: 'board', x, y, w, h });
  const dur = (id) => K.line(id).t1 - K.line(id).t0;
  const board = K.slot('board');
  const mir = (x, w, W) => (rtl ? W - x - w : x);
  const txtShadow = { textShadow: `3px 4px 0 ${INK}` };
  F.chapterOpen('c04');

  /* ---------- the REAL trailer on the cardboard TV: frame folders in assets/real (7 s each, played once from the line start, then the last frame holds) ---------- */
  const FW = 960, FH = 540;
  const tvGeom = (slot, size) => {   // same maths as the kit's Clip, so overlays/labels can be placed on the screen
    const r = K.slot(slot); let W = r.w * size; const maxH = r.h * size - 60, bw = 0.075, chin = 0.13;
    let sw = W * (1 - bw * 2), sh = (sw * FH) / FW, H = sh + W * (bw + chin);
    if (H > maxH) { const k = maxH / H; W *= k; sw *= k; sh *= k; H = maxH; }
    W = Math.round(W); H = Math.round(H); sw = Math.round(sw); sh = Math.round(sh);
    const ant = 60, cx = r.x + r.w / 2, cy = r.y + r.h / 2, top = cy - (H + ant) / 2;
    return { W, H, cx, cy, sw, sh, left: cx - W / 2, scrX: cx - sw / 2, scrY: top + ant + Math.round(W * bw), bottom: top + ant + H, chinH: W * chin };
  };
  /** real clip on a cardboard TV + the small publisher credit on its chin. o: {slot, at, t0, out, enter} */
  const tv = (dir, o) => {
    const g = tvGeom(o.slot, 1);
    const p = P.clip(dir, { slot: o.slot, size: 1, at: o.at, t0: o.t0, out: o.out, enter: o.enter || 'drop', exit: 'cut', loop: false });
    P.label('cr_rockstar', { slot: { x: g.left + g.W * 0.06, y: g.bottom - g.chinH * 0.95, w: g.W * 0.4, h: g.chinH * 0.8 }, size: 's', stock: 'white', at: T(o.at) + 0.65, out: o.out, enter: 'pop', exit: 'cut', tilt: -2 });
    return { p, g };
  };
  /** the drawn '2025' end card (no real end card exists) laid on a TV screen. o: {at, out, enter, anim (time the dark + card come in) | static} */
  const cardOverlay = (g, o) => {
    const cw = g.sw * 0.74, ch = cw * 0.485, st = !!o.static;
    const pc = F.piece({ slot: { x: g.scrX, y: g.scrY, w: g.sw, h: g.sh }, k: 1, w: g.sw, h: g.sh, at: o.at, out: o.out, enter: o.enter || 'none', exit: 'cut', layers: [
      { id: 'dark', svg: [g.sw, g.sh, `<rect width="${g.sw}" height="${g.sh}" fill="#0C0A18"/>`], x: 0, y: 0, w: g.sw, h: g.sh, flat: true, hidden: !st, op: st ? 0.82 : 1 },
      { id: 'card', svg: D.numCard(), x: (g.sw - cw) / 2, y: (g.sh - ch) / 2, w: cw, h: ch, hidden: !st, edge: 5 },
      { id: 'num', text: K.digit('2025'), x: (g.sw - cw) / 2 + cw * 0.05, y: (g.sh - ch) / 2 + ch * 0.1, w: cw * 0.9, h: ch * 0.76, max: ch * 0.8, color: INK, hidden: !st }] });
    if (!st) { pc.L('dark').fade(o.anim, { dur: 0.35, to: 0.82 }); pc.L('card').slam(T(o.anim) + 0.3, { amp: 9 }); pc.L('num').show(T(o.anim) + 0.3); }
    return pc;
  };
  const bigSlot = tall ? B(0, 0, 1, 0.86) : B(0, 0, 1, 1);
  const smallSlot = tall ? B(0, 0, 1, 0.55) : B(0.1, 0, 0.8, 0.52);
  const calSlot = tall ? B(0, 0, 0.34, 0.3) : B(rtl ? 0.76 : 0, 0, 0.24, 0.36);
  const q1 = s('l058', 1), q2 = s('l058', 2), q3 = s('l058', 3);

  /* ---------- l050: the REAL first trailer (t1_a) on the TV; a calendar page says December 2023; the picture "leaks" ---------- */
  const a2 = s('l050', 2, 0.08), a3 = s('l050', 3), a4 = s('l050', 4), a5 = s('l050', 5);
  // the TV waits for the 'Piece 4' title card to leave (it used to drop in front of it), then plays from its own start
  const tvAt = Math.max(T('c04') + 2.0, s('l050', 1));
  tv('assets/real/t1_a', { slot: bigSlot, at: tvAt, t0: tvAt, out: 'l051' });
  F.calPage({ month: 'c04_dec', year: 2023, band: COL.verm, slot: calSlot, fit: 0.95, plane: 'front', at: a2, out: 'l051', exit: 'cut', enter: 'slam', tilt: -5 });
  const lk = F.piece({ plane: 'front', slot: tall ? B(0.2, 0.8, 0.6, 0.2) : B(0.22, 0.86, 0.56, 0.14), fit: 1, w: 400, h: 140, at: a4, out: 'l051', exit: 'cut', enter: 'none', layers: [
    { id: 'pud', svg: D.puddle(), x: 30, y: 62, w: 340, h: 80, hidden: true },
    ...Array.from({ length: 6 }, (_, i) => ({ id: 'd' + i, svg: D.drop(), x: 36 + i * 54, y: 0, w: 40, h: 60, hidden: true, edge: 3 }))] });
  lk.L('pud').show(T(a4) + 0.3).to({ sx: [0.05, 1], sy: [0.05, 1] }, { at: T(a4) + 0.3, dur: 1.2, ease: 'outCubic' });
  for (let w = 0; w < 2; w++) for (let i = 0; i < 6; i++) {
    const t = T(a4) + 0.1 + w * 0.7 + i * 0.1;
    lk.L('d' + i).set({ op: 1, y: 0 }, t).to({ y: [0, 70], op: [1, 0] }, { at: t, dur: 0.5, ease: 'inQuad' });
    if (i % 3 === 0) K.sfx('tap', t + 0.45, { db: -16 });
  }
  K.sfx('hit', T(a4) + 0.05, { db: -12 }); cam.shake(T(a4) + 0.05, { amp: 6, dur: 0.3 });
  karto.pose('present', { at: a3 }); karto.pose('shocked', { at: a4 }); karto.pose('facepalm', { at: a5 });
  skip.pose('shocked', { at: T(a4) + 0.15 }); skip.hop({ at: T(a4) + 0.15, h: 50 }); skip.pose('deadpan', { at: a5 });

  /* ---------- l051: giant padlock that leaks too, "?" ---------- */
  const lock = F.piece({ slot: tall ? B(0.04, 0.04, 0.92, 0.9) : B(0.06, 0, 0.88, 1), fit: 0.97, w: 700, h: 600, at: 'l051', enter: 'pop', out: 'l052', exit: 'fly', layers: [
    { id: 'lock', art: 'padlock', x: mir(50, 400, 700), y: 20, w: 400, h: 500, edge: 7, origin: '50% 0%', idle: { rot: 5, f: 0.7 } },
    { id: 'q', art: 'qmark', x: mir(470, 210, 700), y: 30, w: 210, h: 300, edge: 5, hidden: true, idle: { rot: 6, f: 0.9 } },
    ...[0, 1, 2].map((i) => ({ id: 'd' + i, svg: D.drop(), x: mir(50, 400, 700) + 180 + (i - 1) * 26, y: 352, w: 40, h: 60, hidden: true, edge: 3 })),
  ] });
  lock.L('q').pop('l051:0.45', { sfx: 'boing' });
  for (let w = 0; w < 5; w++) for (let i = 0; i < 3; i++) { const t = T('l051') + 0.3 + w * 0.5 + i * 0.17; lock.L('d' + i).set({ op: 1 }, t).to({ y: [0, 160], op: [1, 0] }, { at: t, dur: 0.45, ease: 'inQuad' }); }
  skip.pose('deadpan', { at: 'l051' }); skip.tilt({ deg: -5, at: 'l051:0.2' }); skip.hop({ at: 'l051:0.1', h: 40 }); karto.pose('deadpan', { at: 'l051' });

  /* ---------- l052: the REAL second half of trailer 1 (t1_b) on the big TV; ends on the drawn 2025 card ---------- */
  skip.tilt({ deg: 0, at: 'l052' });
  const g1 = tv('assets/real/t1_b', { slot: bigSlot, at: 'l052', t0: 'l052', out: 'l053' }).g;
  if (tall) F.piece({ slot: B(0.2, 0.8, 0.6, 0.2), fit: 0.95, w: 520, h: 250, at: s('l052', 1, 0.1), out: 'l053', exit: 'drop', enter: 'slam', tilt: -3, layers: [
    { id: 'c', svg: D.bar(520, 250, COL.yel), x: 0, y: 0, w: 520, h: 250, edge: 6 }, { id: 't', text: K.digit('1:30'), x: 20, y: 25, w: 480, h: 200, max: 190, color: INK, tcss: { direction: 'ltr' } }] });
  F.tapeNote({ x: g1.cx, y: g1.scrY + g1.sh * 0.6 }, 'c04_nodate', s('l052', 2, 0.1), { out: s('l052', 3, 0.35), w: tall ? 440 : 460 });
  cardOverlay(g1, { at: s('l052', 3, 0.5) - 0.05, out: 'l053', anim: s('l052', 3, 0.5) });
  karto.pose('point', { at: 'l052' }); karto.pose('present', { at: s('l052', 2) }); karto.pose('point', { at: s('l052', 3) });
  skip.pose('neutral', { at: 'l052', sfx: false });

  /* ---------- l053: the TV shrinks to the top (same trailer frame + 2025 card), the view counter spins up to 93,000,000, DAY 1 tab, clock ---------- */
  const ccol = [0.2, 0.8];
  const gS = tv('assets/real/t1_b', { slot: smallSlot, at: 'l053', t0: 'l052', out: 'l055', enter: 'pop' }).g;
  cardOverlay(gS, { at: 'l053', out: 'l055', enter: 'pop', static: true });
  F.counter(93000000, { unit: 'c04_views', from: 0, at: 'l053+0.1', dur: dur('l053') * 0.75, slot: B(ccol[0], 0.56, ccol[1], 0.44), out: 'l055', enter: 'drop', size: 1 });
  P.label('day1', { slot: B(rtl ? 0.05 : 0.62, 0.5, 0.3, 0.1), pos: [0.5, 0.5], size: 'm', stock: 'black', ink: '#FFD23F', tape: true, at: 'l053+0.3', out: 'l055', tilt: -4, enter: 'slap' });
  const clock = F.piece({ slot: tall ? B(0, 0.62, 0.2, 0.3) : B(0, 0.62, 0.2, 0.36), fit: 0.95, w: 200, h: 200, at: 'l053', enter: 'pop', out: 'l055', exit: 'fly', layers: [
    { id: 'f', svg: D.clockFace(), x: 0, y: 0, w: 200, h: 200, edge: 6 }, { id: 'hd', svg: D.hand(), x: 89, y: 16, w: 22, h: 84, origin: '50% 100%', edge: 2 }] });
  clock.L('hd').to({ rot: [0, 360] }, { at: 'l053', dur: dur('l053') * 0.9, ease: 'inOutQuad' }); K.sfx('tick-synth', 'l053', { db: -16 });
  karto.pose('present', { at: 'l053' }); karto.tilt({ deg: 0, at: 'l053' });
  skip.pose('shocked', { at: 'l053:0.75' });

  /* ---------- l054: Skip shrugs; a big "?" over the counter ---------- */
  skip.pose('deadpan', { at: 'l054' }); skip.tilt({ deg: -6, at: 'l054:0.1' }); skip.hop({ at: 'l054:0.1', h: 36 });
  skip.pose('thinking', { at: s('l054', 1) }); skip.tilt({ deg: 4, at: s('l054', 1) });
  F.cut('qmark', { slot: tall ? B(0.64, 0.3, 0.34, 0.34) : B(0.74, 0.26, 0.24, 0.4), fit: 0.95, plane: 'front', at: s('l054', 1), out: 'l055', enter: 'pop', exit: 'pop', idle: { rot: 6, f: 0.9 } });
  K.sfx('boing', s('l054', 1), { db: -10 });
  karto.pose('neutral', { at: 'l054', sfx: false });

  /* ---------- l055: podium, reel on step 1 with a crown; music videos behind a rope ---------- */
  skip.tilt({ deg: 0, at: 'l055' });
  const PG = tall ? { W: 700, H: 1010, px: 40, py: 290, zx: 160, zy: 662, zs: 1 } : { W: 1000, H: 640, px: 20, py: 290, zx: 620, zy: 290, zs: 1 };
  const { W: PW, H: PH, px, py, zx, zy, zs } = PG, zw = 380 * zs, mP = (x, w) => mir(x, w, PW);
  const pLay = [
    { id: 'bunt', svg: D.bunting(), x: 0, y: 0, w: PW, h: PW * 0.13, edge: 3, idle: { y: 4, f: 0.6 } },
    { id: 'sun', svg: D.sun(), x: mP(px + 152, 300), y: py - 280, w: 300, h: 300, flat: true, idle: { rot: 8, f: 0.15 } },
    { id: 'pod', svg: D.podium(), x: mP(px, 620), y: py, w: 620, h: 330, edge: 6 },
    { id: 'n2', text: K.digit('2'), x: mP(px + 10, 160), y: py + 120, w: 160, h: 120, max: 100, color: INK, tcss: { opacity: 0.45 } },
    { id: 'n3', text: K.digit('3'), x: mP(px + 424, 160), y: py + 166, w: 160, h: 120, max: 100, color: INK, tcss: { opacity: 0.45 } },
    { id: 'n1', text: K.digit('1'), x: mP(px + 226, 128), y: py + 110, w: 128, h: 150, max: 130, color: INK },
    { id: 'reel', art: 'filmCan', x: mP(px + 216, 170), y: py - 170, w: 170, h: 170, edge: 6, hidden: true },
    { id: 'rlab', key: 'c04_trailer1', x: mP(px + 196, 210), y: py - 102, w: 210, h: 48, max: 36, color: '#FFFDF6', tcss: txtShadow, hidden: true },
    { id: 'crown', svg: D.crown(), x: mP(px + 236, 150), y: py - 256, w: 150, h: 112, edge: 4, hidden: true },
    { id: 'zone', svg: D.zone(), x: mP(zx, zw), y: zy, w: zw, h: 330 * zs, edge: 5, hidden: true },
    { id: 'zlab', key: 'c04_music', x: mP(zx + 20, zw - 40), y: zy + 60 * zs, w: zw - 40, h: 46 * zs, max: 38, color: INK, hidden: true },
  ];
  [[D.mini({ col: COL.pink }), 30, 114], [D.mini({ col: COL.sky }), 205, 114], [D.mini({ col: '#B8E986' }), 118, 222]].forEach(([art, rx, ry], i) => {
    const x = zx + rx * zs, y = zy + ry * zs;
    pLay.push({ id: 'mp' + i, svg: art, x: mP(x, 140 * zs), y, w: 140 * zs, h: 98 * zs, edge: 4, hidden: true });
    pLay.push({ id: 'mn' + i, svg: D.note(), x: mP(x + 50 * zs, 40), y: y + 12 * zs, w: 40, h: 52, hidden: true, flat: true, idle: { y: 5, rot: 10, f: 1.3, ph: i * 1.5 } });
  });
  pLay.push({ id: 'po1', svg: D.post(), x: mP(zx - 8, 44), y: zy - 40, w: 44, h: 230, edge: 3, hidden: true }, { id: 'po2', svg: D.post(), x: mP(zx + zw - 36, 44), y: zy - 40, w: 44, h: 230, edge: 3, hidden: true },
    { id: 'rope', svg: D.rope(), x: mP(zx + 6, zw - 8), y: zy - 28, w: zw - 8, h: 80 * zs, edge: 2, hidden: true });
  const pod = F.piece({ slot: 'board', fit: 0.99, w: PW, h: PH, at: 'l055', out: 'l056', exit: 'fly', enter: 'rise', layers: pLay });
  pod.L('reel').pop('l055:0.1', { from: 0.4 }); pod.L('rlab').show('l055:0.12'); pod.L('reel').to({ y: -40 }, { at: 'l055:0.2', dur: 0.15, ease: 'outQuad' }).to({ y: 0 }, { at: T('l055:0.2') + 0.15, dur: 0.3, ease: 'bounce' });
  pod.L('crown').drop('l055:0.3', { dy: 400, sfx: 'pop' });
  const zdx = (rtl ? -1 : 1) * 620;
  for (const id of ['zone', 'zlab', 'po1', 'po2', 'rope', 'mp0', 'mp1', 'mp2', 'mn0', 'mn1', 'mn2']) pod.L(id).slideIn('l055:0.5', tall ? { dx: 0, dy: 700, sfx: id === 'zone' ? 'slide' : false, dur: 0.5 } : { dx: zdx, sfx: id === 'zone' ? 'slide' : false, dur: 0.5 });
  pod.L('zone').wiggle(T('l055:0.5') + 0.5, { deg: 1 });
  karto.pose('present', { at: 'l055' }); karto.pose('point', { at: 'l055:0.5' });

  /* ---------- l056: the REAL trailer 2 (t2_a) on the big TV, then it shrinks aside (keeps playing) for the 93M bar vs the 5x bar + 475,000,000 REPORTED ---------- */
  const b2 = s('l056', 2);
  tv('assets/real/t2_a', { slot: bigSlot, at: 'l056', t0: 'l056', out: b2 });
  F.calPage({ month: 'c04_may', year: 2025, band: COL.blue, slot: calSlot, fit: 0.95, plane: 'front', at: s('l056', 1), out: b2, exit: 'cut', enter: 'slam', tilt: 3 });
  karto.pose('present', { at: 'l056' }); skip.pose('neutral', { at: 'l056', sfx: false });
  tv('assets/real/t2_a', { slot: tall ? B(0.62, 0, 0.38, 0.34) : B(rtl ? 0 : 0.5, 0.57, 0.5, 0.43), at: b2, t0: 'l056', out: 'l057', enter: 'pop' });
  const BW = tall ? 800 : 520, BH = tall ? 700 : 760, base = BH - 70, b1h = BH * 0.17, b2h = b1h * 5.1;
  const b1x = tall ? 130 : 50, b1w = tall ? 240 : 170, b2x = tall ? 450 : 290, b2w = tall ? 260 : 200, topY = base - b2h;
  const bars = F.piece({ slot: tall ? B(0, 0.3, 1, 0.7) : B(rtl ? 0.5 : 0, 0, 0.5, 1), fit: 0.98, w: BW, h: BH, at: b2, out: 'l057', exit: 'cut', enter: 'none', layers: [
    { id: 'base', svg: D.bar(BW - 20, 30, COL.kraftD), x: 10, y: base - 4, w: BW - 20, h: 30, edge: 4 },
    { id: 'bar1', svg: D.bar(b1w, b1h, COL.blue), x: b1x, y: base - b1h, w: b1w, h: b1h, edge: 5, origin: '50% 100%', hidden: true },
    { id: 'v1', key: 'c04_93m', x: b1x + 6, y: base - b1h / 2 - 32, w: b1w - 12, h: 64, max: 52, color: '#FFFDF6', tcss: txtShadow, hidden: true },
    { id: 'bar2', svg: D.bar(b2w, b2h, COL.verm), x: b2x, y: topY, w: b2w, h: b2h, edge: 6, origin: '50% 100%', hidden: true },
    { id: 'v2', key: 'c04_475m', x: b2x + 6, y: topY + b2h * 0.3, w: b2w - 12, h: 100, max: 84, color: '#FFFDF6', tcss: txtShadow, hidden: true },
    { id: 'flap', svg: D.flap(b2w, 70, COL.verm), x: b2x, y: topY - 8, w: b2w, h: 70, edge: 5, origin: '0% 100%', hidden: true },
  ] });
  bars.L('bar1').pop(b2, { sfx: 'pop' }); bars.L('v1').pop(T(b2) + 0.1, { sfx: false });
  const g0 = T(b2) + 0.35, gd = Math.max(1.2, dur('l056') * 0.18);
  bars.L('bar2').show(g0).to({ sy: [0.03, 1] }, { at: g0, dur: gd, ease: 'outCubic' }); K.sfx('riser', g0, { dur: gd, db: -10 });
  bars.L('flap').show(g0).to({ y: [b2h * 0.97 + topY * 0 , 0] }, { at: g0, dur: gd, ease: 'outCubic' });
  bars.L('flap').to({ rot: [0, rtl ? 38 : -38] }, { at: g0 + gd, dur: 0.35, ease: 'back(2.2)' }); K.sfx('thud', g0 + gd, { db: -8 }); cam.shake(g0 + gd, { amp: 8, dur: 0.3 });
  bars.L('v2').pop(g0 + gd * 0.6, { sfx: 'ding', db: -14 });
  // counter kept clear of the score card (wide top-right corner) and the REPORTED tape sits BELOW it, not over VIEWS
  const cSlot = tall ? B(0, 0, 0.62, 0.34) : B(rtl ? 0.04 : 0.5, 0, 0.44, 0.3), cRect = K.slot(cSlot), cH = Math.min(cRect.h * 0.75, 380);
  F.counter(475000000, { unit: 'c04_views', from: 0, at: T(b2) + 0.1, dur: gd + 0.8, slot: cSlot, out: 'l057', enter: 'drop', size: 1 });
  F.tapeNote({ x: cRect.x + cRect.w / 2, y: cRect.y + cRect.h / 2 + cH / 2 + 42 }, 'company_count', T(b2) + gd + 0.3, { out: 'l057', w: tall ? 420 : 340, tilt: -6 });
  P.label('c04_allplat', { slot: tall ? B(0.04, 0.4, 0.92, 0.07) : B(rtl ? 0.04 : 0.5, 0.415, 0.44, 0.12), size: 'm', stock: 'white', tape: true, at: s('l056', 2, 0.62), out: 'l057', tilt: 3, enter: 'slap' });
  karto.pose('point', { at: b2 }); skip.pose('shocked', { at: T(b2) + 0.6 }); skip.hop({ at: T(b2) + 0.6, h: 50 });

  /* ---------- l057: "For an advert." the REAL trailer 2 (t2_b) takes the board; ADVERT slapped on; it plays on through the NOT YET box ---------- */
  const tvEnd = Math.max(T(q2), Math.min(T('l057') + 7.0, T(q3) - 0.5));
  tv('assets/real/t2_b', { slot: tall ? bigSlot : B(rtl ? 0.32 : 0, 0, 0.68, 1), at: 'l057', t0: 'l057', out: tvEnd });
  P.label('c04_ad', { slot: tall ? B(0, 0.72, 1, 0.14) : B(rtl ? 0 : 0.4, 0.3, 0.6, 0.26), size: 'xl', stock: 'black', ink: '#FFD23F', tape: true, at: 'l057', out: q1, tilt: -6, enter: 'slap' });
  skip.pose('deadpan', { at: 'l057' }); skip.tilt({ deg: -4, at: 'l057' }); karto.pose('deadpan', { at: 'l057' });

  /* ---------- l058: NOT YET box, crowd, the almost-empty hourglass ---------- */
  skip.tilt({ deg: 0, at: q1 });
  const box = F.gameBox('6', { slot: tall ? B(0.55, 0.56, 0.45, 0.44) : B(rtl ? 0.02 : 0.7, 0.04, 0.28, 0.62), plane: 'front', fit: 0.95, at: q1, out: q3, exit: 'pop', enter: 'drop', idle: { rot: 2, f: 0.8 } });
  F.tapeNote(box, 'c04_notyet', T(q1) + 0.45, { out: q3, fy: 0.5, w: tall ? 400 : 360 });
  karto.pose('present', { at: q1 });
  F.crowd({ rows: 2, cols: 5, expr: 'wow', look: 0, slot: tall ? B(0, 0.56, 1, 0.44) : B(0, 0.5, 1, 0.5), fit: 0.99, at: tvEnd, enter: 'rise', out: 'l059', exit: 'drop' });
  karto.pose('whisper', { at: q2 }); karto.tilt({ deg: 6, at: q2 });
  const sandFall = Math.max(2, T('l059') - T(q3));
  const hg = F.piece({ slot: tall ? B(0.18, 0, 0.64, 0.6) : B(0.3, 0, 0.4, 0.58), fit: 0.97, w: 300, h: 400, at: q3, out: 'l059', exit: 'fly', enter: 'drop', layers: [
    { id: 'glass', svg: D.glass(), x: 20, y: 30, w: 260, h: 340, edge: 5, flat: true },
    { id: 'sb', svg: D.sandBot(), x: 55, y: 244, w: 190, h: 120, edge: 3, flat: true },
    { id: 'st', svg: D.stream(), x: 145, y: 176, w: 10, h: 150, flat: true, idle: { x: 1.5, sc: 0.02, f: 3 } },
    { id: 'sT', svg: D.sandTop(), x: 90, y: 118, w: 120, h: 60, flat: true, origin: '50% 100%' },
    { id: 'c1', svg: D.capH(), x: 20, y: 8, w: 260, h: 30, edge: 4 }, { id: 'c2', svg: D.capH(), x: 20, y: 362, w: 260, h: 30, edge: 4 }] });
  hg.L('sT').to({ sc: [1, 0.55] }, { at: q3, dur: sandFall, ease: 'linear' });
  hg.L('sb').to({ sc: [0.9, 1.0] }, { at: q3, dur: sandFall, ease: 'linear' });
  hg.wiggle({ at: T(q3) + 0.6 });
  P.label('c04_almost', { slot: tall ? B(0.52, 0.1, 0.46, 0.09) : B(0.56, 0.02, 0.36, 0.16), size: 'l', stock: 'yellow', tape: true, at: T(q3) + 0.7, out: 'l059', tilt: 4, enter: 'slap' });
  karto.pose('point', { at: q3 }); karto.tilt({ deg: 0, at: q3 }); skip.pose('thinking', { at: T(q3) + 0.3 });

  /* ---------- l059: warning sign, then the 2025 card alone under a spotlight ---------- */
  const w0 = s('l059', 0), w1 = s('l059', 1);
  F.piece({ slot: tall ? B(0.1, 0.04, 0.8, 0.9) : B(0.2, 0, 0.6, 1), fit: 0.95, w: 260, h: 230, at: w0, out: w1, exit: 'cut', enter: 'slam', layers: [{ id: 'w', svg: D.warn(), x: 0, y: 0, w: 260, h: 230, edge: 7, idle: { rot: 3, f: 1.1 } }] });
  karto.pose('whisper', { at: w0 }); karto.tilt({ deg: 6, at: w0 }); skip.pose('neutral', { at: w0, sfx: false });
  const Wd = board.w, Hd = board.h, cw = Math.min(Wd * 0.88, 700), ch = cw * 0.485, cxx = (Wd - cw) / 2, cyy = tall ? Hd * 0.16 : Hd * 0.2;
  const hang = { origin: '50% -30%', idle: { rot: 2.2, f: 0.33 } };
  const spot = F.piece({ slot: 'board', fit: 1, w: Wd, h: Hd, k: 1, at: w1, enter: 'none', layers: [
    { id: 'dark', x: 0, y: 0, w: Wd, h: Hd, hidden: true, dom: (el) => { el.style.background = 'radial-gradient(ellipse at 50% 35%, rgba(18,12,40,0.9), rgba(6,4,16,0.98))'; } },
    { id: 'cone', svg: D.spot(), x: (Wd - Wd * 0.95) / 2, y: 0, w: Wd * 0.95, h: Hd, flat: true, hidden: true },
    { id: 'cL', svg: D.numCard(), x: cxx, y: cyy, w: cw, h: ch, edge: 5, hidden: true, css: { clipPath: 'inset(0 50% 0 0)' }, ...hang },
    { id: 'cR', svg: D.numCard(), x: cxx, y: cyy, w: cw, h: ch, edge: 5, hidden: true, css: { clipPath: 'inset(0 0 0 50%)' }, ...hang },
    { id: 'nL', text: K.digit('2025'), x: cxx + cw * 0.05, y: cyy + ch * 0.1, w: cw * 0.9, h: ch * 0.76, max: ch * 0.8, color: INK, hidden: true, css: { clipPath: 'inset(0 50% 0 0)' }, ...hang },
    { id: 'nR', text: K.digit('2025'), x: cxx + cw * 0.05, y: cyy + ch * 0.1, w: cw * 0.9, h: ch * 0.76, max: ch * 0.8, color: INK, hidden: true, css: { clipPath: 'inset(0 0 0 50%)' }, ...hang },
    { id: 'crack', svg: [30, 300, `<path d="M16 0 L6 52 L24 96 L8 150 L24 204 L10 252 L16 300" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>`], x: cxx + cw / 2 - 12, y: cyy - 6, w: 24, h: ch + 12, hidden: true, flat: true },
  ] });
  spot.L('dark').fade(w1, { dur: 0.45, to: 1 }); spot.L('cone').fade(T(w1) + 0.1, { dur: 0.5, to: 1 });
  for (const id of ['cL', 'cR', 'nL', 'nR']) spot.L(id).pop(T(w1) + 0.2, { from: 0.4, sfx: id === 'cL' ? 'pop' : false });
  K.sfx('sting', T(w1) + 0.1, { db: -12 });
  karto.tilt({ deg: 0, at: w1 }); karto.pose('deadpan', { at: w1 });

  /* ---------- l060: STAMP 4 slams, the number cracks in half ---------- */
  const st = T('l060:0.12'), hit = st + 0.55;
  skip.pose('annoyed', { at: 'l060' }); skip.tilt({ deg: -5, at: 'l060' });
  spot.L('crack').show(hit).to({ sy: [0.1, 1] }, { at: hit, dur: 0.2, ease: 'outQuad' });
  for (const [id, dir] of [['cL', -1], ['cR', 1]]) {
    spot.L(id).to({ rot: dir * 16, x: dir * 34, y: dir > 0 ? 130 : 26 }, { at: hit + 0.05, dur: 0.5, ease: 'back(1.8)' });
    spot.L('n' + id.slice(1)).to({ rot: dir * 16, x: dir * 34, y: dir > 0 ? 130 : 26 }, { at: hit + 0.05, dur: 0.5, ease: 'back(1.8)' });
  }
  K.sfx('rip', hit, { db: -8 });
  F.stamp(4, st);
}
