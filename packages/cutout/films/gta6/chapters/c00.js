// c00 - cold open (l001-l011, ~60 s). Lead author. Frame 0 = thumbnail: Karto + leaning calendar tower + the '6' box + hook text.
import { COL } from '../art.js';

/* hook chips (show.hook_text), one row per sentence, fully visible at frame 0 */
function hookChips(el, K, k, L) {
  const wrap = document.createElement('div'); wrap.className = 'hook__words'; wrap.dir = K.dir; el.appendChild(wrap);
  const W = L.w * k, H = L.h * k; wrap.style.cssText = `left:0;top:0;width:${W}px;height:${H}px;flex-direction:column;align-items:${K.dir === 'rtl' ? 'flex-end' : 'flex-start'};justify-content:center;gap:${16 * k}px`;
  const rows = String(K.show.hook_text || '').split(/(?<=[.!?؟])\s+/).filter(Boolean), cls = [['yellow', 'black'], ['vermilion', 'white']];
  rows.forEach((row, r) => {
    const line = document.createElement('div'); line.style.cssText = `display:flex;gap:${0.18}em;flex-wrap:nowrap`; wrap.appendChild(line);
    row.split(/\s+/).forEach((w, i) => { const c = document.createElement('span'); c.className = 'chip chip--' + cls[r % 2][i % 2]; c.textContent = w; c.style.setProperty('--r', ((((r * 3 + i) * 37) % 9) - 4) + 'deg'); line.appendChild(c); });
  });
  let fs = 170 * k; for (let i = 0; i < 50; i++) { wrap.style.fontSize = fs + 'px'; if (wrap.scrollHeight <= H + 1 && [...wrap.children].every((c) => c.scrollWidth <= W + 1)) break; fs *= 0.95; }
}

export default function (K, F) {
  const { karto, skip, P, cam, scene, tall } = F, T = F.T, s = F.s;
  const B = (x, y, w, h) => ({ in: 'board', x, y, w, h });
  scene.backdrop('sunset');

  /* ---- frame 0: Karto points at the tower, hook text, a little crowd looking up ---- */
  karto.pose('point', { at: 0, sfx: false });
  const tower = F.tower({ slot: tall ? { in: 'board', x: 0.5, y: 0, w: 0.5, h: 1 } : { x: 1100, y: 26, w: 430, h: 990 }, fit: 1, at: 0, enter: 'none', out: s('l003', 0), exit: 'cut' });
  const hook = F.piece({ plane: 'front', slot: tall ? { in: 'board', x: 0, y: 0.05, w: 0.5, h: 0.6 } : { x: 585, y: 70, w: 560, h: 470 }, fit: 1, w: 560, h: 470, at: 0, enter: 'none', out: s('l001', 2) - 0.05, exit: 'fly',
    layers: [{ id: 'chips', x: 0, y: 0, w: 560, h: 470, dom: hookChips }], idle: { rot: 0.8, f: 0.45 } });
  const crowd = tall ? null : F.crowd({ plane: 'front', rows: 2, cols: 4, expr: 'wow', look: -1, slot: { x: 1500, y: 790, w: 420, h: 250 }, fit: 1, at: 0, enter: 'none', out: 'l002', exit: 'drop' });
  K.sfx('stamp', 0.02, { db: -10 });
  if (!tall) F.piece({ plane: 'front', slot: { x: 1000, y: 410, w: 220, h: 180 }, fit: 1, w: 220, h: 180, at: 0, enter: 'none', out: s('l001', 2) - 0.05, exit: 'fade', layers: [{ id: 'a', art: 'arrowDoodle', x: 0, y: 0, w: 220, h: 180, flat: true }], idle: { rot: 2, f: 0.9 } });
  // l001: "Thirteen years. / One game. / GTA Six."
  hook.pulse({ at: s('l001', 0, 0.15) });
  tower.L('six').to({ sc: 1.3 }, { at: s('l001', 1, 0.1), dur: 0.14, ease: 'outQuad' }).to({ sc: 1 }, { at: s('l001', 1, 0.1) + 0.14, dur: 0.4, ease: 'back(2.5)' });
  tower.L('box').wiggle(s('l001', 1, 0.1)); K.sfx('pop', s('l001', 1, 0.1), { db: -10 });
  if (!tall) F.push(tower.lspot('box', 0.5, 0.7), { zoom: 1.14, at: s('l001', 2), dur: 0.7 }); K.sfx('sting', s('l001', 2), { db: -12 });
  karto.pose('shocked', { at: s('l001', 2, 0.2) });
  // "Grand Theft Auto Six": the REAL key art taped on the board (the hook chips have left by then), gone when Skip arrives
  P.photo('assets/real/keyart.jpg', { slot: tall ? { in: 'board', x: 0, y: 0.08, w: 1, h: 0.84 } : { x: 615, y: 60, w: 925, h: 700 }, size: 1, push: 1.05, credit: 'cr_rockstar', at: s('l001', 2), out: 'l002+0.15', enter: 'drop', exit: 'fly', tilt: -2 });

  /* ---- l002: Skip pops in, thumb to skip, the big SKIP button creeps in ---- */
  cam.to({ x: 50, y: 0, zoom: 1.04 }, { at: 'l002', dur: 1.2 });
  skip.enter({ from: 'bottom', at: 'l002', dur: 0.45 });
  const btn = F.skipAttempt('l002+0.25', { stopAt: 'l004', out: 'l005', exit: 'drop' });
  karto.pose('facepalm', { at: 'l002:0.75' });

  /* ---- l003: three hard cuts: hooded teen / hotel door / hotel TV with the stick, screen green ---- */
  const c1 = s('l003', 0), c2 = s('l003', 1), c3 = s('l003', 2);
  const pic = tall ? { in: 'board', x: 0, y: 0, w: 1, h: 0.76 } : { in: 'board', x: -0.04, y: -0.04, w: 0.66, h: 1.02 };
  F.hoodie({ slot: pic, fit: 0.9, at: c1, enter: 'none', out: c2, exit: 'cut' });
  F.door({ slot: pic, fit: 0.92, at: c2, enter: 'none', out: c3, exit: 'cut', tilt: -2 });
  const tv = F.hotelTV({ slot: pic, fit: 0.95, at: c3, enter: 'none', out: 'l005', exit: 'fly', on: true, stick: true });
  cam.cut({ x: -40, y: -10, zoom: 1.06 }, { at: c1 }); cam.cut({ x: 20, y: 0, zoom: 1.02 }, { at: c2 }); cam.cut({ x: -30, y: -20, zoom: 1.08 }, { at: c3 });
  K.sfx('thud', c1, { db: -7 }); K.sfx('thud', c2, { db: -7 }); K.sfx('rewind', c3 + 0.05, { db: -10 });
  karto.pose('whisper', { at: c1 }); karto.tilt({ deg: 6, at: c1 }); karto.pose('point', { at: c2 }); karto.tilt({ deg: 0, at: c2 }); karto.pose('present', { at: c3 });

  /* ---- l004: "Wait. The TV?" thumb freezes, the button stops and tips over ---- */
  skip.pose('shocked', { at: 'l004' }); skip.tilt({ deg: 0, at: 'l004' }); skip.hop({ at: 'l004', h: 70 });
  btn.wiggle({ at: 'l004+0.05' });
  btn.to({ rot: 84, y: 60, x: 60 }, { at: 'l004:0.5', dur: 0.32, ease: 'inQuad' }); K.sfx('thud', T('l004:0.5') + 0.3, { db: -5 }); cam.shake(T('l004:0.5') + 0.32, { amp: 7 });
  F.push(tv.lspot('on', 0.5, 0.7), { zoom: 1.16, at: 'l004', dur: 0.5 });
  karto.nod({ at: 'l004:0.6' });

  /* ---- l005: money sack + ESTIMATE tape / two pages DELAYED / two crowds fighting across a tear ---- */
  cam.reset({ at: 'l005', dur: 0.6 });
  const a0 = s('l005', 0), a1 = s('l005', 1), a2 = s('l005', 2);
  const sack = F.sack({ slot: tall ? B(0, 0, 0.5, 0.5) : B(-0.03, 0, 0.47, 1), fit: 0.95, at: a0 + 0.05, out: 'l006' });
  F.clapper({ slot: tall ? B(0.3, 0.3, 0.22, 0.22) : B(0.3, 0.56, 0.2, 0.34), fit: 1, at: a0 + 0.45, out: 'l006', tilt: 6 });
  F.tapeNote(sack, 'estimate', T(a0) + Math.max(0.9, (a1 - a0) * 0.55), { out: 'l006', fy: 0.42, k: tall ? 0.9 : 1.15 });
  const col = (x) => (tall ? 0.5 + (x - 0.46) * 0.95 : x);
  const pg = (x, tilt, band, at) => F.calPage({ slot: tall ? B(col(x), 0, 0.25, 0.42) : B(x, -0.03, 0.27, 0.52), fit: 1, at, out: 'l006', tilt, band });
  pg(0.46, -6, COL.blue, a1); pg(0.73, 5, COL.green, a1 + 0.15);
  const stp = (x, at, tilt) => P.stamp('delayed', { slot: tall ? B(col(x), 0.12, 0.25, 0.25) : B(x, 0.14, 0.27, 0.28), at, out: 'l006', tilt });
  stp(0.46, a1 + (a2 - a1) * 0.4, -14); stp(0.73, a1 + (a2 - a1) * 0.68, -8);
  const fy = tall ? 0.52 : 0.5, fh = tall ? 0.46 : 0.5;
  F.crowd({ slot: B(0.44, fy, 0.27, fh), fit: 1, rows: 2, cols: 2, expr: 'shout', look: 1, seed: 2, at: a2 + 0.05, enter: 'drop', out: 'l006' });
  F.cut('tear', { slot: B(0.705, fy - 0.02, 0.05, fh + 0.02), fit: 1, edge: 2, at: a2 + 0.25, enter: 'grow', out: 'l006' });
  F.crowd({ slot: B(0.75, fy, 0.27, fh), fit: 1, rows: 2, cols: 2, expr: 'shout', look: -1, seed: 7, at: a2 + 0.15, enter: 'drop', out: 'l006' });
  F.cut('burst', { slot: B(0.47, fy - 0.12, 0.16, 0.18), fit: 0.95, at: a2 + 0.5, enter: 'pop', out: 'l006', idle: { rot: 8, f: 1.3 } });
  F.cut('burst', { slot: B(0.84, fy - 0.13, 0.16, 0.18), fit: 0.95, at: a2 + 0.75, enter: 'pop', out: 'l006', idle: { rot: 8, f: 1.5, ph: 2 } });
  cam.to({ zoom: 1.04, y: 10 }, { at: a2, dur: 1.2, ease: 'inOutSine' });
  karto.pose('present', { at: a0 }); karto.pose('deadpan', { at: a1 }); karto.pose('shocked', { at: a2 }); karto.hop({ at: a2 + 0.1 });
  skip.pose('thinking', { at: 'l005:0.12' }); skip.pose('shocked', { at: a2 + 0.3 });

  /* ---- l006: title flap over the night city, three icons light up: wait / money / hotel TV ---- */
  F.nightTitle({ slot: 'board', fit: 0.99, at: 'l006+0.05', out: 'l007', pos: [0.5, tall ? 0.36 : 0.47] });
  const ic = F.icons(undefined, { plane: 'front', slot: tall ? { in: 'board', x: 0.06, y: 0.66, w: 0.88, h: 0.3 } : { in: 'board', x: 0.1, y: 0.62, w: 0.8, h: 0.34 }, fit: 1, at: s('l006', 1), out: 'l007', enter: 'pop' });
  ic.light(0, s('l006', 1, 0.3)); ic.light(1, s('l006', 1, 0.5)); ic.light(2, s('l006', 1, 0.8));
  cam.to({ zoom: 1.07, y: -12 }, { at: 'l006', dur: 6, ease: 'inOutSine' });
  karto.pose('present', { at: 'l006' }); karto.pose('point', { at: s('l006', 1) }); skip.pose('neutral', { at: 'l006:0.2' }); skip.pose('thinking', { at: s('l006', 1, 0.5) });

  /* ---- l007: the SCORE CARD swings in, labels pop word-synced (sentence starts) ---- */
  cam.reset({ at: 'l007', dur: 0.5 });
  F.cardIn('l007');
  karto.pose('present', { at: 'l007' }); karto.pose('point', { at: s('l007', 4) }); skip.pose('deadpan', { at: s('l007', 2) }); skip.pose('thinking', { at: s('l007', 6) });

  /* ---- l008: demo stamp on circle 1, lifts off (ghost), card shakes ---- */
  F.demoStamp(1, s('l008', 0, 0.72));
  karto.pose('point', { at: 'l008' }); karto.pose('cheer', { at: s('l008', 1) }); karto.hop({ at: s('l008', 1) }); skip.pose('deadpan', { at: 'l008:0.45' });

  /* ---- l009: Skip leans in, skeptical ---- */
  skip.pose('deadpan', { at: 'l009' }); skip.tilt({ deg: -11, at: 'l009' }); karto.pose('neutral', { at: 'l009' });

  /* ---- l010: "Nothing. It is cardboard." Karto deadpan, knocks on the card (hollow), beat ---- */
  karto.pose('deadpan', { at: 'l010' }); karto.tilt({ deg: 9, at: 'l010:0.45' }); karto.tilt({ deg: 0, at: 'l010:end' });
  for (const d of [0, 0.2]) { F.card.wiggle({ at: T('l010:0.5') + d }); K.sfx('tap', T('l010:0.5') + d, { db: -4 }); }
  skip.tilt({ deg: 0, at: 'l010:end' });

  /* ---- l011: Skip lowers the phone a little, card slides to its corner home ---- */
  skip.pose('neutral', { at: 'l011' }); skip.nod({ at: 'l011:0.3' });
  F.cardHome('l011:0.62', 0.6);
  karto.pose('cheer', { at: 'l011:0.75' }); karto.hop({ at: 'l011:0.75' });
}
