// c03 - piece 3: the hacker (l036-l049 incl. l047a, ~110 s). Lead author. Night, tension; l047/l047a calm and respectful
// (no jokes, no face, slow moves). The teen is only ever the faceless hooded silhouette. Short s1 = l041-l046 (tall).
export default function (K, F) {
  const { karto, skip, P, cam, scene, tall } = F, T = F.T, s = F.s;
  const B = (x, y, w, h) => ({ in: 'board', x, y, w, h });
  F.chapterOpen('c03');

  /* ---- l036: SEPT 2022 calendar, SUNDAY circled ---- */
  const cal = F.calendar({ slot: tall ? B(0.04, 0.02, 0.92, 0.9) : B(0.08, 0, 0.84, 1), fit: 0.96, month: 'month_sep', year: 2022, first: 4, days: 30, circle: 18, band: '#1F2A44', at: s('l036', 2), out: 'l037', tilt: -2 });
  F.drawOn(cal, 'circle', s('l036', 3, 0), 0.5);
  const c18 = cal.cell(18);
  P.label('sunday', { slot: { x: c18.x - 170, y: c18.y + (tall ? 70 : 50), w: 340, h: 90 }, size: 'm', stock: 'yellow', tape: true, at: s('l036', 3, 0.15), out: 'l037' });
  F.push(cal.spot(0.3, 0.62), { zoom: 1.12, at: s('l036', 3), dur: 0.9 });
  karto.pose('point', { at: s('l036', 2) }); skip.pose('thinking', { at: s('l036', 3) });

  /* ---- l037: fan forum, 90 clip cards rain onto it, counter 0 -> 90 CLIPS, SECRET stamp ---- */
  cam.reset({ at: 'l037', dur: 0.5 });
  const forumSlot = tall ? B(0, 0, 1, 0.6) : B(0.03, 0, 0.58, 1);
  F.forum({ slot: forumSlot, fit: 0.95, at: 'l037', out: 'l038' });
  F.clipRain(25, 'l037+0.35', Math.max(2.5, (K.line('l037').t1 - K.line('l037').t0) * 0.45), { slot: tall ? B(0.08, 0.2, 0.84, 0.4) : B(0.04, 0.3, 0.54, 0.68), fit: 0.95, at: 'l037', out: 'l038' });
  F.counter(90, { unit: 'clips', from: 0, at: 'l037+0.2', dur: Math.max(2.5, (K.line('l037').t1 - K.line('l037').t0) * 0.45), slot: tall ? B(0.1, 0.62, 0.8, 0.38) : B(0.6, 0.1, 0.4, 0.5), out: 'l038' });
  P.stamp('secret', { slot: tall ? B(0.1, 0.05, 0.8, 0.25) : B(0.6, 0.6, 0.4, 0.34), at: s('l037', 1, 0.15), out: 'l038', tilt: -12, big: true });
  karto.pose('present', { at: 'l037' }); karto.pose('whisper', { at: s('l037', 1) }); karto.tilt({ deg: 5, at: s('l037', 1) });
  skip.pose('shocked', { at: 'l037:0.4' });

  /* ---- l038: office, staff chat bubble drops (from the thief), workers shocked, 24 h timer ---- */
  karto.tilt({ deg: 0, at: 'l038' });
  const off = F.office({ slot: tall ? B(0, 0.62, 1, 0.38) : B(0, 0.56, 1, 0.44), fit: 0.98, at: s('l038', 0, 0.02), out: 'l039', enter: 'rise' });
  const chat = F.chat({ slot: tall ? B(0, 0, 1, 0.42) : B(0, 0, 0.7, 0.56), fit: 0.95, at: s('l038', 0, 0.55), out: 'l039', tilt: -1.5 });
  F.hoodie({ slot: F.rtl ? (tall ? B(0.0, -0.05, 0.16, 0.16) : B(-0.02, -0.08, 0.13, 0.24)) : (tall ? B(0.82, -0.05, 0.16, 0.16) : B(0.6, -0.08, 0.13, 0.24)), fit: 0.95, at: s('l038', 1, 0.1), out: 'l039', enter: 'pop', plane: 'front', tilt: -8 });
  off.shock(s('l038', 1, 0.25));
  F.timer24({ slot: tall ? B(0.22, 0.43, 0.56, 0.18) : B(0.7, 0.12, 0.3, 0.34), fit: 0.95, at: s('l038', 2, 0.05), start: s('l038', 2, 0.05), out: 'l039' });
  F.push(chat, { zoom: 1.08, at: s('l038', 2), dur: 1.2 }); cam.reset({ at: 'l039', dur: 0.4 });
  karto.pose('point', { at: 'l038' }); karto.pose('shocked', { at: s('l038', 1) }); karto.pose('whisper', { at: s('l038', 2) });
  skip.pose('shocked', { at: s('l038', 1, 0.3) }); skip.hop({ at: s('l038', 1, 0.3), h: 50 });

  /* ---- l039: Skip guesses a spy agency (his guess, with a question mark) ---- */
  const right = tall ? B(0.4, 0.08, 0.6, 0.86) : B(0.5, 0.02, 0.5, 0.96);
  const spy = F.spy({ slot: right, fit: 1, at: 'l039+0.15', out: 'l040+0.25', exit: 'fly' });
  spy.L('q').pop('l039:0.55', { sfx: 'boing' });
  skip.pose('whisper', { at: 'l039' }); skip.tilt({ deg: -7, at: 'l039' }); karto.pose('thinking', { at: 'l039:0.3' });

  /* ---- l040: spy swapped for the hooded teen, UK map with the pin on England, LAPSUS$ label ---- */
  const t0 = s('l040', 0);
  F.hoodie({ slot: right, fit: 0.86, at: T(t0) + 0.35, out: s('l041', 2), enter: 'drop' });
  F.ukMap({ slot: tall ? B(0, 0.02, 0.46, 0.72) : B(0, 0, 0.5, 1), at: T(t0) + 0.5, pinAt: T(t0) + 1.1, out: 'l041', size: 0.92 });
  P.label('lapsus', { slot: right, pos: [0.5, 0.86], size: 'l', stock: 'black', ink: '#FFD23F', at: s('l040', 1, 0.3), out: s('l041', 2), tape: true });
  karto.pose('present', { at: 'l040' }); karto.pose('point', { at: s('l040', 1) });
  karto.pose('whisper', { at: s('l040', 2) }); karto.tilt({ deg: 7, at: s('l040', 2) }); skip.pose('thinking', { at: s('l040', 2) });
  cam.to({ zoom: 1.07, x: -20 }, { at: s('l040', 2), dur: 1.6, ease: 'inOutSine' });

  /* ---- l041 (Short s1 starts): ARRESTED / laptop into a POLICE evidence bag / flap to the hotel room ---- */
  cam.reset({ at: 'l041', dur: 0.5 }); karto.tilt({ deg: 0, at: 'l041' }); skip.tilt({ deg: 0, at: 'l041' });
  P.stamp('arrested', { slot: right, pos: [0.5, 0.42], at: s('l041', 0, 0.3), out: s('l041', 2), tilt: -10, big: true });
  const bag = F.laptopBag({ slot: tall ? B(0.0, 0.2, 0.46, 0.8) : B(0, 0, 0.5, 1), fit: 1, at: s('l041', 1), out: s('l041', 2), enter: 'drop' });
  bag.bagIt(s('l041', 1, 0.3));
  karto.pose('point', { at: 'l041' }); karto.pose('present', { at: s('l041', 1) }); skip.pose('deadpan', { at: s('l041', 1, 0.5) });
  const rm = s('l041', 2);
  scene.change({ at: rm, style: 'flap', backdrop: '#1D2236' });
  const room = F.hotelRoom({ slot: 'board', fit: 1, at: rm, out: s('l043', 1), exit: 'cut', pos: [0.5, tall ? 0.42 : 0.5] });
  room.L('nopc').pop(s('l041', 2, 0.6), { sfx: 'stamp', db: -10 });
  karto.pose('neutral', { at: rm, sfx: false }); skip.pose('neutral', { at: rm, sfx: false });

  /* ---- l042: Skip looks around the empty room ---- */
  skip.pose('thinking', { at: 'l042' }); skip.lookAt('left', { at: 'l042:0.15' }); skip.lookAt('right', { at: 'l042:0.6' });
  cam.to({ x: -50, zoom: 1.08 }, { at: 'l042', dur: 1.2, ease: 'inOutSine' }); cam.to({ x: 50 }, { at: 'l042:0.55', dur: 1.2, ease: 'inOutSine' });

  /* ---- l043: close on the TV; STREAMING STICK slides in and clicks, then PHONE; arrow; screen turns green ---- */
  F.push(room.lspot('tv', 0.5, 0.6), { zoom: 1.2, at: 'l043', dur: 0.7 });
  room.L('tv').wiggle(T('l043') + 0.5); K.sfx('tap', T('l043') + 0.5, { db: -8 });
  const u1 = s('l043', 1), u2 = s('l043', 2);
  cam.reset({ at: u1, cut: true });
  const tv = F.hotelTV({ slot: tall ? B(-0.02, 0.04, 0.8, 0.62) : B(-0.02, 0, 0.74, 0.82), fit: 0.96, at: u1, enter: 'none', out: 'l044', exit: 'cut' });
  K.sfx('thud', u1, { db: -8 });
  const port = tv.pt(553 / 600, 190 / 400), sk = tall ? 1.35 : 1.55;
  const stick = F.piece({ slot: { x: port.x + 75 * sk - 1, y: port.y - 1, w: 2, h: 2 }, k: sk, w: 150, h: 52, at: s('l043', 1, 0.15), enter: 'none', out: 'l044', exit: 'cut',
    layers: [{ id: 'st', art: 'stick', x: 0, y: 0, w: 150, h: 52, edge: 5 }] });
  K.tl.to(stick.v, { x: [420, 0], rot: [14, 0] }, { at: s('l043', 1, 0.15), dur: 0.5, ease: 'back(1.2)' }); K.sfx('slide', s('l043', 1, 0.15), { db: -10 });
  stick.pulse({ at: s('l043', 1, 0.15) + 0.55, sfx: 'snip' }); tv.L('tv').wiggle(s('l043', 1, 0.15) + 0.55, { deg: 2 });
  P.label('stick', { slot: tall ? { x: port.x - 230, y: port.y + 118, w: 400, h: 90 } : { x: port.x - 20, y: port.y - 150, w: 420, h: 90 }, size: 'm', stock: 'yellow', tape: true, at: s('l043', 1, 0.4), out: 'l044' });
  const phone = F.phone({ slot: tall ? { x: port.x - 40, y: port.y + 150, w: 300, h: 400 } : { x: port.x + 60, y: port.y + 140, w: 260, h: 420 }, fit: 0.85, at: T(u2) + 0.1, out: 'l044', exit: 'cut', enter: 'slide', idle: { rot: 2, f: 0.7 } });
  P.label('phone', { slot: tall ? { x: port.x - 470, y: port.y + 330, w: 380, h: 90 } : { x: port.x - 300, y: port.y + 300, w: 300, h: 90 }, size: 'm', stock: 'white', tape: true, at: s('l043', 2, 0.3), out: 'l044' });
  P.arrow([phone, 0.5, 0.06], [stick, 0.45, 0.95], { at: s('l043', 2, 0.45), out: 'l044', bow: 0.25 });
  tv.L('on').show(s('l043', 2, 0.72)); tv.L('off').hide(T(s('l043', 2, 0.72)) + 0.04); K.sfx('rewind', s('l043', 2, 0.72), { db: -8 }); cam.shake(T(s('l043', 2, 0.72)) + 0.05, { amp: 5 });
  karto.pose('point', { at: 'l043' }); karto.pose('present', { at: u1 }); karto.pose('point', { at: u2 }); skip.pose('neutral', { at: 'l043' }); skip.pose('thinking', { at: u2 });

  /* ---- l044: from the green TV, along a dotted line across the map, into the '6' vault: lid pops, big hit ---- */
  const vm = F.vaultMap({ slot: 'board', fit: 1, at: 'l044', out: s('l046', 1), exit: 'fly', pos: [0.5, tall ? 0.56 : 0.5] });
  F.push(vm.lspot('tv'), { zoom: tall ? 1.1 : 1.22, at: 'l044', cut: true });
  vm.route('l044+0.35', Math.max(1.6, (K.line('l044').t1 - K.line('l044').t0) * 0.5));
  F.push(vm.lspot('box', 0.5, 0.45), { zoom: tall ? 1.1 : 1.2, at: 'l044+0.45', dur: Math.max(1.6, (K.line('l044').t1 - K.line('l044').t0) * 0.5) });
  vm.open('l044:0.74');
  cam.to({ zoom: 1.06, x: 0, y: 0 }, { at: 'l044:0.9', dur: 0.6 });
  karto.pose('whisper', { at: 'l044' }); karto.pose('shocked', { at: 'l044:0.74' }); skip.pose('shocked', { at: 'l044:0.78' }); skip.hop({ at: 'l044:0.78', h: 60 });

  /* ---- l045: "With the thing I use to watch cartoons." Skip mind-blown holding a tiny stick ---- */
  cam.reset({ at: 'l045', dur: 0.5 });
  skip.pose('mindblown', { at: 'l045' }); skip.hop({ at: 'l045', h: 70 });
  const [hx, hy] = skip.center();
  const tiny = F.piece({ plane: 'front', slot: { x: hx - (tall ? 190 : 210) - 1, y: hy - (tall ? 80 : 60) - 1, w: 2, h: 2 }, k: 1, w: 150, h: 52, at: 'l045:0.2', enter: 'pop', out: s('l046', 1), exit: 'pop', tilt: -18, idle: { rot: 6, y: 6, f: 1.1 },
    layers: [{ id: 'st', art: 'stick', x: 0, y: 0, w: 150, h: 52, edge: 5, rim: 5 }] });
  karto.pose('deadpan', { at: 'l045:0.3' });

  /* ---- l046: "...told the court: 5 million dollars and thousands of hours" bench, bill prints, clock stack ---- */
  const v0 = s('l046', 0), v1 = s('l046', 1);
  karto.pose('point', { at: v0 }); karto.nod({ at: T(v0) + 0.3 }); skip.pose('deadpan', { at: T(v0) + 0.2 });
  const bench = F.bench({ slot: tall ? B(0, 0.56, 1, 0.44) : B(0, 0.5, 1, 0.5), fit: 0.98, at: T(v1) + 0.05, out: s('l047', 1), exit: 'fade' });
  F.bill({ slot: tall ? B(0.05, 0.02, 0.44, 0.56) : B(0.08, 0, 0.34, 0.56), fit: 0.95, amount: F.money(5000000), label: 'hours', at: s('l046', 1, 0.3), out: 'l047', exit: 'fade', tilt: -3 });
  K.sfx('tick-synth', s('l046', 1, 0.3), { db: -14 });
  F.clocks(6, { slot: tall ? B(0.56, 0.02, 0.38, 0.56) : B(0.62, 0, 0.3, 0.56), fit: 0.95, at: s('l046', 1, 0.5), out: 'l047', exit: 'fade' }).stack(s('l046', 1, 0.55), 0.18);
  karto.pose('present', { at: v1 }); skip.pose('shocked', { at: s('l046', 1, 0.6) });

  /* ---- l047: calm. year sign 2023, gavel taps once; secure hospital with a closed gate. No jokes, no face. ---- */
  const w0 = s('l047', 0), w1 = s('l047', 1);
  karto.pose('neutral', { at: 'l047', sfx: false }); skip.pose('neutral', { at: 'l047', sfx: false });
  const year = F.yearSign(2023, { slot: tall ? B(0.25, 0.08, 0.5, 0.42) : B(0.3, 0.02, 0.4, 0.46), fit: 0.95, at: T(w0) + 0.2, out: w1, exit: 'fade', enter: 'none', idle: { rot: 0.6, f: 0.25 } });
  K.tl.to(year.v, { y: [260, 0] }, { at: T(w0) + 0.2, dur: 1.2, ease: 'inOutSine' }); K.tl.to(year.v, { op: [0, 1] }, { at: T(w0) + 0.2, dur: 0.6, ease: 'linear' });
  bench.tap(T(w0) + (T(w1) - T(w0)) * 0.7, 1);
  const hosp = F.hospital({ slot: tall ? B(0.02, 0.05, 0.96, 0.7) : B(0.1, 0.02, 0.8, 0.96), fit: 0.95, at: w1, enter: 'none', out: s('l049', 1), exit: 'fade' });
  K.tl.to(hosp.v, { y: [320, 0], op: [0, 1] }, { at: w1, dur: 1.4, ease: 'inOutSine' });
  cam.to({ zoom: 1.06, y: -10 }, { at: w1, dur: 5, ease: 'inOutSine' });
  F.dim(w1, 0.22, 1.6);

  /* ---- l047a: calm. the gate opens; NOVEMBER 2026: courthouse on the 16th, the '6' box on the 19th ---- */
  const z0 = s('l047a', 0), z1 = s('l047a', 1);
  hosp.openGate(T(z0) + 0.3, 1.8);
  cam.reset({ at: z1, dur: 1.2 });
  hosp.to(tall ? { y: -K.slot('board').h * 0.24, sc: 0.62 } : { x: -K.slot('board').w * 0.24, sc: 0.62 }, { at: z1, dur: 1.2, ease: 'inOutSine' });
  const nov = F.calendar({ slot: tall ? B(0.06, 0.4, 0.88, 0.6) : B(0.46, 0, 0.54, 1), fit: 0.95, month: 'month_nov', year: 2026, first: 0, days: 30, band: '#2E4A5A', marks: { 16: 'courthouse', 19: 'box' }, at: T(z1) + 0.2, enter: 'none', out: s('l049', 1), exit: 'fade' });
  K.tl.to(nov.v, { y: [200, 0], op: [0, 1] }, { at: T(z1) + 0.2, dur: 1.0, ease: 'inOutSine' });
  nov.mark(19, s('l047a', 1, 0.4)); nov.mark(16, s('l047a', 1, 0.78));

  /* ---- l048: "That got dark." Skip quiet, phone down, light dims ---- */
  skip.pose('neutral', { at: 'l048', sfx: false }); skip.tilt({ deg: -4, at: 'l048', dur: 0.8 });
  F.dim('l048', 0.5, 0.7);

  /* ---- l049: light back; the twist: clip cards fly out of the '6' box and become wide-eyed heads at a shop window; STAMP 3 ---- */
  const x0 = s('l049', 0), x1 = s('l049', 1), x2 = s('l049', 2);
  F.dim(x0, 0, 0.8); skip.tilt({ deg: 0, at: x0 }); karto.nod({ at: T(x0) + 0.1 });
  const box = F.gameBox('6', { slot: tall ? B(0.3, 0.1, 0.4, 0.5) : B(0.35, 0.1, 0.3, 0.6), fit: 0.9, at: T(x1) + 0.1, out: T(x2) + 0.9, exit: 'pop', enter: 'drop', idle: { rot: 2, f: 0.8 } });
  const fly = F.piece({ slot: tall ? B(0.3, 0.1, 0.4, 0.5) : B(0.35, 0.1, 0.3, 0.6), w: 600, h: 500, fit: 0.9, at: x2, enter: 'none', out: T(x2) + 1.3, exit: 'cut',
    layers: Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i, art: 'clipCard', ao: { v: i }, x: 230, y: 200, w: 140, h: 100, edge: 3, hidden: true })) });
  for (let i = 0; i < 12; i++) { const a = T(x2) + i * 0.04, ang = (i / 12) * Math.PI * 2; fly.L('c' + i).pop(a, { sfx: i % 4 ? false : 'flip' }).to({ x: Math.cos(ang) * 420, y: Math.sin(ang) * 300 - 80, rot: (i % 2 ? 1 : -1) * 40 }, { at: a, dur: 0.7, ease: 'outCubic' }).fade(a + 0.75, { to: 0, dur: 0.3 }); }
  K.sfx('whoosh', x2, { db: -8 });
  const shop = F.shopWindow({ slot: 'board', fit: 0.98, at: T(x2) + 0.9, out: 'c04', enter: 'pop' });
  shop.press(T(x2) + 1.05, 0.1);
  cam.to({ zoom: 1.08 }, { at: T(x2) + 1, dur: 2, ease: 'inOutSine' }); cam.reset({ at: 'l049:end', dur: 0.4 });
  karto.pose('whisper', { at: x1 }); karto.tilt({ deg: 6, at: x1 }); karto.tilt({ deg: 0, at: x2 }); karto.pose('present', { at: x2 });
  skip.pose('thinking', { at: x1 }); skip.pose('mindblown', { at: T(x2) + 1.1 });
  F.stamp(3, 'l049:0.8');
}
