/* Karto kit - stage: layouts + slots, depth planes with camera parallax, the cardboard box proscenium, backdrops, light. */
import { h, setTf, noise1, win, clamp, rand } from './core.js';
import { bake, canvas, roughRect, pathPts, STOCK, EDGE, backdrop, grain, RES } from './tex.js';

/* ---------- layouts (stage px at camera rest) ---------- */
export const LAYOUTS = {
  wide: {
    W: 1920, H: 1080,
    open: { x: 40, y: 36, w: 1840, h: 964 },          // inside of the box opening; the lip starts at y 1000
    lipY: 1000,
    slots: {
      board: { x: 600, y: 70, w: 940, h: 720 }, left: { x: 600, y: 70, w: 462, h: 720 }, right: { x: 1078, y: 70, w: 462, h: 720 },
      sideL: { x: 600, y: 70, w: 462, h: 720 }, sideR: { x: 1078, y: 70, w: 462, h: 720 },
      center: { x: 760, y: 140, w: 620, h: 580 }, full: { x: 80, y: 60, w: 1760, h: 760 },
      top: { x: 600, y: 70, w: 940, h: 340 }, bottom: { x: 600, y: 440, w: 940, h: 350 },
    },
    captions: { x: 580, y: 836, w: 980, h: 124 },
    hook: { x: 160, y: 250, w: 1600, h: 460 },
    stand: { // character floor positions: x = stick centre, floor = stick foot, s = scale
      left: { x: 292, floor: 1072, s: 1.08 }, right: { x: 1700, floor: 1072, s: 1.15 }, center: { x: 960, floor: 1072, s: 1.1 },
      boardL: { x: 760, floor: 1072, s: 1.15 }, boardR: { x: 1380, floor: 1072, s: 1.15 },
      offL: { x: -420, floor: 1072, s: 1.15 }, offR: { x: 2340, floor: 1072, s: 1.15 },
    },
    tag: { x: 64, y: 56, w: 480, h: 64 },
  },
  tall: {
    W: 1080, H: 1920,
    open: { x: 30, y: 30, w: 1020, h: 1730 },
    lipY: 1760,
    slots: {
      board: { x: 54, y: 160, w: 872, h: 840 }, left: { x: 54, y: 150, w: 872, h: 520 }, right: { x: 54, y: 680, w: 872, h: 320 }, // tall: 'left'/'right' = upper/lower part
      sideL: { x: 54, y: 160, w: 428, h: 840 }, sideR: { x: 498, y: 160, w: 428, h: 840 },
      center: { x: 130, y: 250, w: 712, h: 660 }, full: { x: 54, y: 160, w: 872, h: 1330 },
      top: { x: 54, y: 160, w: 872, h: 400 }, bottom: { x: 54, y: 590, w: 872, h: 410 },
    },
    captions: { x: 60, y: 1016, w: 860, h: 132 },
    hook: { x: 60, y: 260, w: 860, h: 640 },
    stand: {
      left: { x: 300, floor: 1780, s: 0.95 }, right: { x: 770, floor: 1700, s: 0.95 }, center: { x: 540, floor: 1780, s: 0.95 },
      boardL: { x: 300, floor: 1780, s: 0.95 }, boardR: { x: 770, floor: 1700, s: 0.95 },
      offL: { x: -380, floor: 1780, s: 0.95 }, offR: { x: 1460, floor: 1780, s: 0.95 },
    },
    tag: null,
  },
};
export const DEPTH = { back: 0.42, mid: 0.82, chars: 0.92, front: 1.0, fg: 1.1 };

/** slot -> stage rect. slot: name | {in: name, x, y, w, h (fractions of that slot)} | {x,y,w,h} absolute px */
export function slotRect(L, slot = 'board') {
  if (typeof slot === 'string') return { ...(L.slots[slot] || L.slots.board) };
  if (slot && slot.in) {
    const b = L.slots[slot.in] || L.slots.board;
    return { x: b.x + (slot.x || 0) * b.w, y: b.y + (slot.y || 0) * b.h, w: (slot.w == null ? 1 : slot.w) * b.w, h: (slot.h == null ? 1 : slot.h) * b.h };
  }
  if (slot && slot.w) return { ...slot };
  return { ...L.slots.board };
}

/* ---------- stage DOM ---------- */
export function buildStage(root, L, show) {
  root.innerHTML = '';
  root.style.width = L.W + 'px'; root.style.height = L.H + 'px';
  root.className = 'stage stage--' + show.layout + ' lang-' + show.lang;
  root.dir = 'ltr'; // stage geometry is fixed; text boxes take show.dir themselves
  const planes = {};
  for (const k of ['back', 'mid', 'chars', 'front', 'fg']) { planes[k] = h('div', 'plane plane--' + k, root); planes[k].depth = DEPTH[k]; }
  const light = h('canvas', 'light', root); light.width = L.W / 2; light.height = L.H / 2;
  const cover = h('div', 'cover', root);
  const hud = h('div', 'hud', root);
  paintLight(light, L);
  return { root, planes, light, cover, hud };
}

function paintLight(c, L) {
  const g = c.getContext('2d'), W = c.width, H = c.height;
  const lamp = g.createRadialGradient(W * 0.22, H * 0.08, 10, W * 0.4, H * 0.35, Math.max(W, H) * 0.95);
  lamp.addColorStop(0, 'rgba(255,214,150,0.16)'); lamp.addColorStop(0.35, 'rgba(255,214,150,0.04)'); lamp.addColorStop(0.7, 'rgba(40,20,5,0.10)'); lamp.addColorStop(1, 'rgba(25,12,2,0.42)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);
}

/* ---------- the box: proscenium frame (fg) + ground row + tall crate ---------- */
export function buildBox(S, L, show) {
  const M = 360, FW = L.W + M * 2, FH = L.H + M * 2, o = L.open;
  // frame sheet with the opening cut out (res 1: it is huge and never needs to be crisp)
  const C = canvas(FW, FH), g = C.getContext('2d');
  g.fillStyle = STOCK.kraft; g.fillRect(0, 0, FW, FH);
  // printed box marks on the board (faded ink), tape over the opening corners, brass fasteners
  const ink = 'rgba(40,26,12,0.42)', r = rand(91);
  const arrows = (x, y, k) => { g.strokeStyle = ink; g.lineWidth = 5 * k; g.lineCap = 'round'; for (const dx of [0, 34 * k]) { g.beginPath(); g.moveTo(x + dx, y + 46 * k); g.lineTo(x + dx, y); g.moveTo(x + dx - 12 * k, y + 14 * k); g.lineTo(x + dx, y); g.lineTo(x + dx + 12 * k, y + 14 * k); g.stroke(); } g.strokeRect(x - 20 * k, y - 12 * k, 74 * k, 72 * k); };
  const glass = (x, y, k) => { g.strokeStyle = ink; g.lineWidth = 5 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 * k, y); g.lineTo(x + 32 * k, y + 34 * k); g.quadraticCurveTo(x + 20 * k, y + 42 * k, x + 8 * k, y + 34 * k); g.closePath(); g.moveTo(x + 20 * k, y + 40 * k); g.lineTo(x + 20 * k, y + 62 * k); g.moveTo(x + 6 * k, y + 64 * k); g.lineTo(x + 34 * k, y + 64 * k); g.stroke(); };
  const lipMid = M + L.lipY + (L.H - L.lipY) / 2;
  if (show.layout === 'wide') { arrows(M + 70, lipMid - 26, 0.75); glass(M + L.W - 150, lipMid - 30, 0.8); }
  else { arrows(M + 70, lipMid - 30, 0.9); glass(M + L.W - 140, lipMid - 34, 0.9); }
  // a marker doodle row on the lip
  g.strokeStyle = 'rgba(30,20,10,0.55)'; g.lineWidth = 4; g.beginPath();
  for (let x = M + 220; x < M + L.W - 240; x += 26) { const y = M + L.lipY + 22 + Math.sin(x * 0.11) * 3; x === M + 220 ? g.moveTo(x, y) : g.lineTo(x, y); }
  g.stroke();
  // cut the opening
  g.globalCompositeOperation = 'destination-out';
  g.save(); g.translate(M + o.x, M + o.y); pathPts(g, roughRect(o.w, L.lipY - o.y, 17, 3, 10)); g.fill(); g.restore();
  g.globalCompositeOperation = 'source-over';
  // tape at the opening corners (over the cut)
  const tapeAt = (x, y, rot, w = 130) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = STOCK.tape; g.beginPath(); g.moveTo(-w / 2, -18); for (let k = 0; k <= 6; k++) g.lineTo(-w / 2 + (k % 2 ? 6 : 0), -18 + k * 6); g.lineTo(w / 2, 18); for (let k = 0; k <= 6; k++) g.lineTo(w / 2 - (k % 2 ? 6 : 0), 18 - k * 6); g.closePath(); g.fill(); g.restore(); };
  tapeAt(M + o.x + 6, M + o.y + 8, -0.7); tapeAt(M + o.x + o.w - 6, M + o.y + 10, 0.65);
  for (const [x, y] of [[M + 18, M + 16], [M + L.W - 18, M + 16], [M + 18, M + L.H - 20], [M + L.W - 18, M + L.H - 20]]) {
    g.fillStyle = STOCK.brass; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,180,0.8)'; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, 7); g.fill();
  }
  const fb = bake(C, FW, FH, { res: 1, edge: 12, blur: 22, flutes: true, lamp: 0 });
  const frame = h('div', 'pc box-frame', S.planes.fg);
  for (const [c, k] of [[fb.shadow, 'pc__sh'], [fb.face, 'pc__face']]) { c.className = k; c.style.width = fb.w + 'px'; c.style.height = fb.h + 'px'; c.style.left = -(fb.pad + M) + 'px'; c.style.top = -(fb.pad + M) + 'px'; frame.appendChild(c); }
  frame.sh = fb.shadow; frame.sh.style.transform = 'translate(16px,20px)';

  // ground row: a wavy cardboard strip in front of the characters' feet
  const gw = L.W + 200, gh = show.layout === 'wide' ? 90 : 110, gy = L.lipY - gh + 30;
  const G = canvas(gw * RES, gh * RES), gg = G.getContext('2d'); gg.scale(RES, RES);
  gg.fillStyle = '#B98A52'; gg.beginPath(); gg.moveTo(0, gh);
  for (let x = 0; x <= gw; x += 20) gg.lineTo(x, 28 + Math.sin(x * 0.012) * 14 + Math.sin(x * 0.043 + 1) * 6);
  gg.lineTo(gw, gh); gg.closePath(); gg.fill();
  gg.strokeStyle = 'rgba(60,35,10,0.35)'; gg.lineWidth = 3;
  for (let x = 30; x < gw; x += 46) { gg.beginPath(); gg.moveTo(x, 54); gg.lineTo(x + 14, 40); gg.stroke(); }
  const gb = bake(G, gw, gh, { edge: 8, blur: 12, flutes: true });
  const ground = h('div', 'pc ground', S.planes.front);
  for (const [c, k] of [[gb.shadow, 'pc__sh'], [gb.face, 'pc__face']]) { c.className = k; c.style.width = gb.w + 'px'; c.style.height = gb.h + 'px'; c.style.left = -gb.pad + 'px'; c.style.top = -gb.pad + 'px'; ground.appendChild(c); }
  ground.style.left = '-100px'; ground.style.top = gy + 'px'; gb.shadow.style.transform = 'translate(8px,10px)';

  if (show.layout === 'tall') { // crate under Skip's slot (hides the stick, lifts Skip above the Shorts UI zone)
    const cw = 400, ch = 240;
    const K = canvas(cw * RES, ch * RES), kg = K.getContext('2d'); kg.scale(RES, RES);
    kg.fillStyle = STOCK.kraftDark; pathPts(kg, roughRect(cw, ch, 33, 2.5, 6)); kg.fill();
    kg.fillStyle = 'rgba(255,230,190,0.18)'; kg.fillRect(0, 0, cw, 22);
    kg.strokeStyle = 'rgba(40,26,12,0.5)'; kg.lineWidth = 4; kg.strokeRect(cw / 2 - 40, 70, 80, 90);
    kg.beginPath(); kg.moveTo(cw / 2 - 20, 140); kg.lineTo(cw / 2 - 20, 92); kg.moveTo(cw / 2 + 20, 140); kg.lineTo(cw / 2 + 20, 92); kg.stroke();
    kg.fillStyle = STOCK.tape; kg.fillRect(cw / 2 - 30, 0, 60, ch);
    const kb = bake(K, cw, ch, { edge: 10, blur: 14, flutes: true });
    const crate = h('div', 'pc crate', S.planes.front);
    for (const [c, k] of [[kb.shadow, 'pc__sh'], [kb.face, 'pc__face']]) { c.className = k; c.style.width = kb.w + 'px'; c.style.height = kb.h + 'px'; c.style.left = -kb.pad + 'px'; c.style.top = -kb.pad + 'px'; crate.appendChild(c); }
    crate.style.left = (L.stand.right.x - cw / 2) + 'px'; crate.style.top = (L.stand.right.floor - 70) + 'px'; kb.shadow.style.transform = 'translate(10px,12px)';
  }
}

/* ---------- backdrops: one canvas per kind, switched by time ---------- */
export class Backdrops {
  constructor(S, L) { this.S = S; this.L = L; this.ev = [{ t: -1e9, kind: 'sky' }]; this.els = new Map(); this.last = null; }
  set(kind, t) { this.ev.push({ t, kind }); this.ev.sort((a, b) => a.t - b.t); }
  kinds() { return [...new Set(this.ev.map((e) => e.kind))]; }
  build() {
    const L = this.L, BW = Math.round(L.W * 1.6), BH = Math.round(L.H * 1.6);
    for (const k of this.kinds()) {
      const c = backdrop(k, Math.round(BW / 2), Math.round(BH / 2), 5 + k.length); // half-res paint, upscaled (soft painted look)
      const el = h('canvas', 'backdrop', this.S.planes.back); el.width = c.width; el.height = c.height; el.getContext('2d').drawImage(c, 0, 0);
      el.style.width = BW + 'px'; el.style.height = BH + 'px'; el.style.left = (L.W - BW) / 2 + 'px'; el.style.top = (L.H - BH) / 2 + 'px';
      el.style.visibility = 'hidden'; this.els.set(k, el);
    }
  }
  seek(t) {
    let k = this.ev[0].kind; for (const e of this.ev) { if (e.t <= t) k = e.kind; else break; }
    if (k !== this.last) { if (this.last && this.els.get(this.last)) this.els.get(this.last).style.visibility = 'hidden'; const el = this.els.get(k); if (el) el.style.visibility = 'visible'; this.last = k; }
  }
}

/* ---------- camera ---------- */
export class Camera {
  constructor(S, L, tl, opts) {
    this.S = S; this.L = L; this.tl = tl; this.v = { x: 0, y: 0, zoom: 1, rot: 0, shake: 0 }; this.drift = opts.drift !== false;
    this.nx = noise1(11); this.ny = noise1(23); this.nr = noise1(37); this.fps = 30;
  }
  /** cam.to({x, y, zoom, rot}, {at, dur, ease}) - x/y = world offset (px) of the point the camera looks at, from stage centre */
  to(p, o = {}) { const q = {}; for (const k of ['x', 'y', 'zoom', 'rot']) if (p[k] != null) q[k] = p[k]; this.tl.to(this.v, q, { at: o.at || 0, dur: o.dur == null ? 1.2 : o.dur, ease: o.ease || 'inOutCubic' }); return this; }
  /** hard cut on the frame grid */
  cut(p, o = {}) { const at = Math.round((o.at || 0) * this.fps) / this.fps; return this.to(p, { at, dur: 0 }); }
  /** centre a slot (or a prop / actor) on screen. o: {zoom 1.25, at, dur, ease, cut} */
  focus(target, o = {}) {
    let cx, cy, d = 0.82;
    if (target && target.center) { const c = target.center(); cx = c[0]; cy = c[1]; d = c[2] || d; }
    else { const r = slotRect(this.L, target || 'board'); cx = r.x + r.w / 2; cy = r.y + r.h / 2; }
    const z = o.zoom || 1.25, p = { x: (cx - this.L.W / 2) / d, y: (cy - this.L.H / 2) / d, zoom: z };
    if (o.rot != null) p.rot = o.rot;
    return o.cut ? this.cut(p, o) : this.to(p, o);
  }
  /** back to the wide shot */
  reset(o = {}) { return (o.cut ? this.cut : this.to).call(this, { x: 0, y: 0, zoom: 1, rot: 0 }, o); }
  /** short punch-in shake (thud), o: {amp 10, dur 0.35} */
  shake(at, o = {}) { const amp = o.amp || 10, dur = o.dur || 0.35; this.tl.to(this.v, { shake: [amp, 0] }, { at, dur, ease: 'outQuad' }); this.tl.set(this.v, { shake: 0 }, at + dur); return this; }
  apply(t) {
    const v = this.v, L = this.L;
    let dx = 0, dy = 0, dr = 0;
    if (this.drift) { dx = this.nx(t * 0.35) * 7; dy = this.ny(t * 0.3) * 5; dr = this.nr(t * 0.22) * 0.22; }
    if (v.shake) { dx += Math.sin(t * 71) * v.shake; dy += Math.cos(t * 59) * v.shake * 0.7; }
    for (const k in this.S.planes) {
      const pl = this.S.planes[k], d = pl.depth, z = 1 + (v.zoom - 1) * d;
      setTf(pl, -(v.x * d + dx * d) * z, -(v.y * d + dy * d) * z, (v.rot + dr) * Math.min(1, d), z, z);
    }
  }
}
