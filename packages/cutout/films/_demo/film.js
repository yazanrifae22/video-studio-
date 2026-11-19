// Kit demo film (~46 s): uses every prop, every pose of both characters, 3 scene changes, camera moves, captions,
// hook, chapter titles, end screen (wide) and the Shorts CTA (tall shows carry `short`). Lines/strings: show.*.json.
export default function build(K) {
  const { cast: { karto, skip }, props: P, cam, scene } = K;

  /* ---- c01: one minute (sky) ---- */
  scene.backdrop('sky');
  P.hook();                                                        // show.hook_text, 0 - 2.8 s
  karto.enter({ from: 'left', at: 0.1 }); skip.enter({ from: 'right', at: 0.4 });
  karto.pose('present', { at: 'l001' }); skip.pose('skip', { at: 'l001:0.5' });
  P.counterBoard('cb_patience', { slot: 'right', at: 'l002', out: 'l003:0.3', from: 10, steps: [{ at: 'l002:0.35', value: 6 }, { at: 'l002:0.8', value: 3 }] });
  skip.pose('deadpan', { at: 'l002' }); karto.pose('facepalm', { at: 'l002:0.6' });
  karto.pose('point', { at: 'l003' }); skip.pose('neutral', { at: 'l003' });
  const photo = P.photo('assets/photo.jpg', { slot: 'left', at: 'l003', caption: 'cap_photo', credit: 'cr_nasa', push: 1.12 });
  const tag = P.label('lab_tape', { slot: 'right', pos: [0.5, 0.82], at: 'l003:0.55', out: 'l005:0.2', stock: 'yellow', size: 'l', tape: true });
  P.arrow([tag, 0.2, 0.1], [photo, 0.85, 0.55], { at: 'l003:0.7', out: 'l005:0.2' });
  cam.focus('left', { zoom: 1.18, at: 'l003:0.15', dur: 1.4 });
  skip.pose('shocked', { at: 'l004' }); karto.pose('thinking', { at: 'l004:0.4' });
  P.speech('sp_what', 'skip', { at: 'l004' });
  cam.reset({ at: 'l005', dur: 0.8 });
  karto.pose('whisper', { at: 'l005' }); karto.tilt({ deg: 7, at: 'l005' }); skip.pose('whisper', { at: 'l005:0.5' });
  P.cutout('assets/rocket.svg', { slot: 'right', pos: [0.5, 0.42], at: 'l005:0.25' });
  P.speech('sp_tape', 'karto', { at: 'l005:0.3', out: 'l005:end' });

  /* ---- c02: far from home (night) ---- */
  scene.change({ at: 14.3, style: 'flap', backdrop: 'night' });
  karto.tilt({ deg: 0, at: 14.3, dur: 0.01 }); karto.pose('neutral', { at: 14.3, sfx: false }); skip.pose('neutral', { at: 14.3, sfx: false });
  P.title('c02', { at: 14.45, dur: 1.7 });
  const big = P.bigNumber(400000, { unit: 'unit_km', at: 'l006:0.12', out: 'l008', dur: 1.6 });
  karto.pose('shocked', { at: 'l006:0.3' }); karto.hop({ at: 'l006:0.3' }); skip.pose('thinking', { at: 'l006:0.5' });
  cam.focus(big, { zoom: 1.3, at: 'l006:0.3', dur: 1.2 });
  cam.reset({ at: 'l007', dur: 0.7 });
  karto.pose('deadpan', { at: 'l007:0.3' }); skip.nod({ at: 'l007:0.5' });
  karto.pose('point', { at: 'l008' }); skip.pose('pointL', { at: 'l008:0.4' });
  P.map('assets/map.svg', [{ x: 0.2, y: 0.42, key: 'pin_start', at: 'l008:0.15' }, { x: 0.68, y: 0.3, key: 'pin_turn', at: 'l008:0.45' }, { x: 0.64, y: 0.82, key: 'pin_home', at: 'l008:0.75' }],
    { at: 'l008', out: 'l009', route: [[0.2, 0.42], [0.45, 0.2], [0.68, 0.3], [0.8, 0.6], [0.64, 0.82]], routeAt: 'l008:0.2', routeDur: 2 });
  skip.pose('typing', { at: 'l009' }); karto.pose('present', { at: 'l009' });
  P.bars([{ key: 'bar_air', value: 34 }, { key: 'bar_water', value: 18 }, { key: 'bar_power', value: 12 }], { at: 'l009', out: 'l010', max: 40, unit: 'unit_pct' });
  karto.pose('laughing', { at: 'l010' }); skip.pose('neutral', { at: 'l010:0.4' }); skip.hop({ at: 'l010:0.4', h: 50 });
  P.timeline([{ key: 'tl_launch', top: 'tl_d1', at: 'l010' }, { key: 'tl_bang', top: 'tl_d3', at: 'l010:0.3' }, { key: 'tl_moon', top: 'tl_d5', at: 'l010:0.6' }, { key: 'tl_home', top: 'tl_d7', at: 'l010:0.9' }],
    { at: 'l010', slot: 'board' });

  /* ---- c03: the way back (room) ---- */
  scene.change({ at: 30.1, style: 'slide', backdrop: 'room' });
  P.title('c03', { at: 30.25, dur: 1.4 });
  const tv = P.clip('assets/clip', { at: 'l011:0.25', t0: 'l011:0.25', out: 'l012', loop: true });
  karto.pose('point', { at: 'l011' }); skip.pose('neutral', { at: 'l011', sfx: false });
  cam.focus(tv, { zoom: 1.3, at: 'l011:0.45', dur: 1.2 }); cam.reset({ at: 'l012', dur: 0.6 });
  P.versus('vs_crew', 'vs_ship', { at: 'l012', out: 'l014:end' });
  skip.pose('point', { at: 'l012' }); karto.pose('thinking', { at: 'l012:0.3' }); karto.lookAt('left', { at: 'l012:0.3' }); karto.shake({ at: 'l012:0.6' }); karto.lookAt('right', { at: 'l013:0.3' });
  P.stamp('stamp_safe', { slot: 'board', pos: [0.25, 0.62], at: 'l013:0.4', big: true, out: 'l014:end' });
  P.confetti({ at: 'l013:0.45', dur: 2.6 });
  karto.pose('cheer', { at: 'l013:0.4' }); karto.hop({ at: 'l013:0.45' }); skip.pose('laughing', { at: 'l013:0.6' });
  skip.pose('mindblown', { at: 'l014' }); skip.hop({ at: 'l014', h: 80 }); karto.pose('laughing', { at: 'l014:0.3' });
  cam.to({ zoom: 1.06, rot: -1.2 }, { at: 'l014', dur: 0.5, ease: 'back(2)' }); cam.reset({ at: 'l014:end', dur: 0.5 });

  /* ---- end: curtain backdrop, end screen (wide) / short CTA (tall) ---- */
  scene.change({ at: 41.6, style: 'drop', backdrop: 'stage' });
  P.endScreen({ at: 41.75 });
  karto.pose('present', { at: 'l015' }); karto.pose('point', { at: 'l015:0.6' }); skip.pose('pointL', { at: 'l015:0.3' });
}
