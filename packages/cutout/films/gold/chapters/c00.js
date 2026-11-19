// c00 - cold open (l001-l009, ~60 s). Foundation engineer. Frame 0 = THUMBNAIL: big real photo of gold bars (left), cardboard slide with the shrunk bar (right),
// "-30%" stamped across it, Karto present, hook chips on the lower board. Skip arrives at l002 (SKIP button), the vault photo, the Dubai souk clip on the TV,
// the score card with seven empty boxes (l007).  Real media on l001-l006 (photo, photo, photo, photo, clip, clip).
import { D as D2 } from './c02.art.js';
const INK = '#1E1712';

/* hook chips (show.hook_text): one row per sentence, big cut-letter chips, visible at frame 0 */
function hookChips(el, K, k, L) {
  const wrap = document.createElement('div'); wrap.className = 'hook__words'; wrap.dir = K.dir; el.appendChild(wrap);
  const W = L.w * k, H = L.h * k; wrap.style.cssText = `left:0;top:0;width:${W}px;height:${H}px;flex-direction:column;align-items:${K.dir === 'rtl' ? 'flex-end' : 'flex-start'};justify-content:center;gap:${12 * k}px`;
  const rows = String(K.show.hook_text || '').split(/(?<=[.!?؟])\s+/).filter(Boolean), cls = [['yellow', 'black'], ['vermilion', 'white']];
  rows.forEach((row, r) => {
    const line = document.createElement('div'); line.style.cssText = 'display:flex;gap:0.18em;flex-wrap:nowrap'; wrap.appendChild(line);
    row.split(/\s+/).forEach((w, i) => { const c = document.createElement('span'); c.className = 'chip chip--' + cls[r % 2][i % 2]; c.textContent = w; c.style.setProperty('--r', ((((r * 3 + i) * 37) % 9) - 4) + 'deg'); line.appendChild(c); });
  });
  let fs = 150 * k; for (let i = 0; i < 50; i++) { wrap.style.fontSize = fs + 'px'; if (wrap.scrollHeight <= H + 1 && [...wrap.children].every((c) => c.scrollWidth <= W + 1)) break; fs *= 0.95; }
}

export default function (K, F) {
  const { karto, skip, P, cam, scene, tall, rtl } = F, T = F.T, s = F.s, B = F.B, Z = F.Z;
  const rt = (a, b) => (rtl ? b : a); // pick per reading direction when a layout really must differ
  scene.backdrop('sunset');

  /* ================= l001: frame 0 = the result ================= */
  karto.pose('present', { at: 0, sfx: false });
  P.label('name_karto', { slot: tall ? { x: 40, y: 1160, w: 300, h: 90 } : { x: 120, y: 395, w: 320, h: 90 }, plane: 'front', size: 'm', stock: 'white', tape: true, at: 0.5, out: 3.5, tilt: -4, enter: 'slap', exit: 'cut' });
  const photo = F.photo('bars_vault', { slot: tall ? B(0, 0.06, 1, 0.6) : { x: 600, y: 130, w: 590, h: 660 }, caption: 'cap_bars_vault', at: 0, enter: 'none', out: 'l003:0.05', exit: 'fly', push: 1.12, tilt: -2 });
  const slide = F.priceSlide({ slot: tall ? B(0.5, 0.4, 0.5, 0.6) : { x: 1210, y: 30, w: 350, h: 520 }, fit: 1, plane: 'front', at: 0, enter: 'none', out: 'l003:0.05', exit: 'fly', tilt: 3 });
  slide.pos(3, 0);              // frame 0: the bar already shrunk at the foot of the slide
  const m30 = P.stamp('minus30', { slot: tall ? B(0.02, 0.72, 0.6, 0.16) : { x: 1200, y: 570, w: 370, h: 200 }, big: true, at: 0, enter: 'none', out: 'l003:0.05', exit: 'fade', tilt: -9, plane: 'front' });
  K.sfx('stamp', 0.02, { db: -9 });
  const hook = F.piece({ plane: 'front', slot: tall ? B(0, 0, 1, 0.22) : { x: 520, y: 24, w: 900, h: 230 }, fit: 1, w: 900, h: 230, at: 0, enter: 'none', out: s('l001', 1) - 0.05, exit: 'fly', idle: { rot: 0.6, f: 0.45 },
    layers: [{ id: 'chips', x: 0, y: 0, w: 900, h: 230, dom: hookChips }] });
  hook.pulse({ at: s('l001', 0, 0.2) });
  cam.to({ x: -20, y: -10, zoom: 1.08 }, { at: 0.3, dur: 7 });
  // 2nd sentence "nobody lost thirty percent in one day": the bar flies back up and walks DOWN slowly in three steps (it took months)
  const st = s('l001', 1), sl = K.line('l001').t1 - st;
  slide.L('bar').to(slide.SL[0], { at: st - 0.05, dur: 0.35, ease: 'outBack' }); K.sfx('whoosh', st - 0.05, { db: -12 });
  [1, 2, 3].forEach((n, i) => {
    const a = st + 0.5 + (sl - 0.9) * (i / 3);
    slide.L('bar').to(slide.SL[n], { at: a, dur: Math.min(0.7, (sl - 0.9) / 3), ease: 'outQuad' }); K.sfx('tap', a + 0.5, { db: -14 });
  });
  m30.pulse({ at: st + 0.2 });
  karto.pose('present', { at: 0.01 }); karto.pose('point', { at: st });

  /* ================= l002: Skip pops in, SKIP button creeps over the vault photo ================= */
  skip.enter({ from: 'bottom', at: 'l002', dur: 0.45 }); skip.hop({ at: 'l002+0.4', h: 60 });
  // name stickers: each character gets a slapped-on tag for ~3 s the first time he appears
  P.label('name_skip', { slot: tall ? { x: 520, y: 1160, w: 320, h: 90 } : { x: 1560, y: 400, w: 310, h: 90 }, plane: 'front', size: 'm', stock: 'yellow', tape: true, at: 'l002+0.35', out: T('l002') + 3.2, tilt: 4, enter: 'slap', exit: 'cut' });
  const btn = F.skipAttempt('l002+0.25', { stopAt: 'l004', out: 'l005', exit: 'drop' });
  karto.pose('facepalm', { at: 'l002:0.7' });
  cam.to({ x: 30, y: 0, zoom: 1.04 }, { at: 'l002', dur: 1.5 });

  /* ================= l003: button stops; vault photo of a central bank; sign + tick ================= */
  skip.pose('shocked', { at: 'l003' }); skip.hop({ at: 'l003', h: 50 }); skip.tilt({ deg: 0, at: 'l003' });
  btn.wiggle({ at: 'l003+0.05' }); btn.to({ rot: 80, y: 60, x: 70 }, { at: 'l003:0.12', dur: 0.32, ease: 'inQuad' }); K.sfx('thud', T('l003:0.12') + 0.3, { db: -6 });
  karto.nod({ at: 'l003' });
  const vault = F.photo('cb_vault', { slot: tall ? B(0, 0, 1, 0.66) : { x: 545, y: 40, w: 940, h: 590 }, caption: 'cap_vault_old', at: 'l003+0.1', out: 'l005', enter: 'flap', exit: 'fly', push: 1.08, tilt: 1.5 });
  karto.pose('point', { at: s('l003', 1) }); cam.to({ x: -10, y: 10, zoom: 1.1 }, { at: s('l003', 1), dur: 1.2 });
  const cbSlot = tall ? B(0.04, 0.64, 0.66, 0.15) : { x: 575, y: 650, w: 620, h: 150 };
  P.label('cb_buying', { slot: cbSlot, size: 'l', stock: 'yellow', tape: true, at: s('l003', 2), out: 'l005', tilt: -2, enter: 'slap' });
  const cbr = K.slot(cbSlot);
  const tk = F.tick({ slot: { x: cbr.x + cbr.w * 0.97, y: cbr.y - 6, w: 150, h: 150 }, fit: 1, plane: 'front', at: s('l003', 3, 0.1), out: 'l005', enter: 'none', tilt: -6 });
  tk.L('tk').set({ sy: 0.05 }, 0).to({ sy: [0.05, 1], sx: [0.2, 1] }, { at: s('l003', 3, 0.1), dur: 0.35, ease: 'outCubic' }); K.sfx('scratch', s('l003', 3, 0.1), { db: -10 });
  karto.pose('present', { at: s('l003', 3) });

  /* ================= l004: "Then who sold?" - Skip thinks, question mark pops ================= */
  skip.pose('thinking', { at: 'l004' }); skip.tilt({ deg: 6, at: 'l004+0.1' });
  F.cut('qmark', { slot: tall ? { x: 640, y: 1090, w: 200, h: 280 } : { x: 1600, y: 330, w: 170, h: 240 }, fit: 1, plane: 'front', at: 'l004+0.1', out: 'l005', enter: 'pop', exit: 'pop', idle: { rot: 7, f: 0.9 } }); K.sfx('boing', 'l004+0.1', { db: -10 });
  karto.pose('neutral', { at: 'l004', sfx: false });

  /* ================= l005: "Everyone else." -> TV of the Dubai souk, labels, the seven ================= */
  skip.tilt({ deg: 0, at: 'l005' }); skip.pose('neutral', { at: 'l005', sfx: false });
  karto.pose('present', { at: 'l005' }); cam.reset({ at: 'l005', dur: 0.6 });
  const tv = F.tv('souk_clip', { slot: tall ? B(0, 0, 0.52, 1) : { x: 640, y: 10, w: 520, h: 820 }, at: s('l005', 0, 0.9), t0: 'l005', out: 'l007', enter: 'drop', loop: true });
  const tvr = tall ? K.slot(B(0.5, 0, 0.5, 1)) : K.slot(Z.right);
  P.label('one_day_nine', { slot: tall ? B(0.5, 0.05, 0.5, 0.2) : { x: 1170, y: 40, w: 380, h: 175 }, size: 'xl', stock: 'yellow', ink: '#C0391B', tape: true, at: s('l005', 1, 0.45), out: 'l007', tilt: 4, enter: 'slap' });
  P.label('jan30', { slot: tall ? B(0.5, 0.27, 0.5, 0.1) : { x: 1180, y: 232, w: 340, h: 108 }, size: 'm', stock: 'white', tape: true, at: s('l005', 1, 0.7), out: 'l007', tilt: -3, enter: 'slap' });
  P.label('dubai', { slot: tall ? B(0.5, 0.38, 0.5, 0.08) : { x: 1180, y: 350, w: 340, h: 62 }, size: 's', stock: 'white', tape: true, at: s('l005', 2, 0.2), out: 'l007', tilt: 3, enter: 'slap' });
  // the queue lives on its own card beside the TV: label + paper heads lining up at a cardboard shop (the clip itself is a lane walk, not a queue)
  const qT = s('l005', 2, 0.5);
  P.label('queue_sellers', { slot: tall ? B(0.5, 0.47, 0.5, 0.08) : { x: 1180, y: 422, w: 340, h: 70 }, size: 's', stock: 'black', ink: '#FFD23F', tape: true, at: qT, out: 'l007', tilt: -3, enter: 'slap' });
  F.piece({ slot: tall ? B(0.78, 0.56, 0.2, 0.14) : { x: 1385, y: 500, w: 150, h: 135 }, fit: 1, w: 440, h: 420, at: qT + 0.1, out: 'l007', enter: 'rise', exit: 'cut', layers: [{ id: 's', art: D2.shop(), x: 0, y: 0, w: 440, h: 420, edge: 7 }] });
  for (let i = 0; i < 3; i++) F.crowd({ rows: 1, cols: 1, expr: i % 2 ? 'calm' : 'shout', look: 1, seed: i + 2, slot: tall ? B(0.5 + i * 0.09, 0.57, 0.1, 0.12) : { x: 1180 + i * 70, y: 508, w: 75, h: 118 }, from: 'left', fit: 1, plane: 'front', at: qT + 0.2 + i * 0.12, out: 'l007', enter: 'slide', exit: 'cut' });
  P.stamp('seven_pieces', { slot: tall ? B(0.45, 0.72, 0.55, 0.26) : { x: 1190, y: 650, w: 330, h: 160 }, big: true, at: s('l005', 3), out: 'l007', tilt: -8 });
  karto.pose('point', { at: s('l005', 2) }); karto.pose('present', { at: s('l005', 3) }); karto.pose('point', { at: s('l005', 4) });

  /* ================= l006: Skip shocked, the clip keeps looping ================= */
  skip.pose('shocked', { at: 'l006' }); skip.hop({ at: 'l006', h: 60 }); skip.tilt({ deg: -5, at: 'l006+0.2' });
  karto.pose('neutral', { at: 'l006', sfx: false });
  cam.to({ x: -25, y: 0, zoom: 1.05 }, { at: 'l006', dur: 2 });

  /* ================= l007: the board clears; the score card swings in with seven boxes; a rubber stamp hovers ================= */
  scene.change({ at: 'l007', style: 'flap', backdrop: 'sunset' });
  cam.reset({ at: 'l007', dur: 0.5 }); skip.tilt({ deg: 0, at: 'l007' });
  F.cardIn('l007');
  karto.pose('present', { at: 'l007' }); karto.pose('point', { at: s('l007', 2) });
  skip.pose('neutral', { at: 'l007', sfx: false });
  // the rubber stamp cutout (a handle + a red ink pad base) hovers and bobs next to the card
  const stampSvg = [220, 300, `<rect x="82" y="8" width="56" height="130" rx="22" fill="#8B5A35" stroke="${INK}" stroke-width="7"/><rect x="40" y="130" width="140" height="40" rx="8" fill="#D2361A" stroke="${INK}" stroke-width="7"/><rect x="26" y="170" width="168" height="36" rx="8" fill="#E8D5AE" stroke="${INK}" stroke-width="7"/><path d="M110 218 L110 260" stroke="none"/>`];
  F.piece({ plane: 'front', slot: tall ? { x: 130, y: 1010, w: 200, h: 220 } : { x: 700, y: 560, w: 260, h: 300 }, fit: 1, w: 220, h: 210, at: s('l007', 2), out: 'l009', enter: 'drop', exit: 'fly', idle: { y: 10, rot: 3, f: 0.8 }, tilt: -8,
    layers: [{ id: 's', svg: stampSvg, x: 0, y: 0, w: 220, h: 210, edge: 6 }] });

  /* ================= l008: "Easy. Stamp me." - the card goes home, Skip nods ================= */
  F.cardHome('l008+0.2', 0.7);
  skip.pose('deadpan', { at: 'l008' }); skip.nod({ at: 'l008+0.15' }); skip.hop({ at: 'l008+0.6', h: 30 });
  karto.pose('neutral', { at: 'l008', sfx: false });

  /* ================= l009: "The record." - Karto points at box one, a gold bar drops toward it ================= */
  karto.pose('point', { at: 'l009' }); skip.pose('thinking', { at: 'l009+0.2' });
  const gb = F.goldBar({ slot: tall ? B(0.1, 0.1, 0.8, 0.5) : { x: 700, y: 140, w: 700, h: 500 }, fit: 0.75, at: 'l009+0.1', out: 'l009:end', enter: 'drop', exit: 'fly', tilt: -6 });
  gb.pulse({ at: 'l009+0.6' }); K.sfx('sting', 'l009+0.05', { db: -12 });
  cam.to({ x: 20, y: -5, zoom: 1.07 }, { at: 'l009', dur: 1.6 });
}
