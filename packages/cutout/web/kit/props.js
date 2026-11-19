/* Karto kit - props. Every prop: created by a film call (sync: registers tweens), built in __load (async: assets, bakes, text fit),
   painted on seek from its tweened vars. Lifetime [at, out): enter style at `at`, exit style at `out` (or the next scene change). */
import { h, setTf, setOp, setText, clamp, rand, hashStr, win, lerp, ease } from './core.js';
import { bake, card, canvas, svgImage, roughRect, roughEllipse, pathPts, STOCK, RES } from './tex.js';
import { slotRect } from './stage.js';
import { ICON } from './art.js';

const SH = { back: [8, 10], mid: [12, 15], chars: [16, 18], front: [16, 20], fg: [20, 24], hud: [14, 18] };
const STOCKS = ['vermilion', 'yellow', 'blue', 'green', 'pink', 'white', 'kraftLight'];

/* ---------- text fitting (load time only) ---------- */
export function fitText(el, w, hh, max, min, lines, K, what) {
  el.style.width = w + 'px';
  let size = max;
  for (let i = 0; i < 60; i++) {
    el.style.fontSize = size.toFixed(1) + 'px';
    const lh = parseFloat(getComputedStyle(el).lineHeight) || size * 1.2;
    const nl = Math.round(el.scrollHeight / lh);
    if (el.scrollHeight <= hh + 1 && nl <= lines && el.scrollWidth <= w + 1) return size;
    size *= 0.94;
    if (size < min) { el.style.fontSize = min + 'px'; if (K) K.lint.push(`text does not fit (${what || ''}): "${el.textContent.slice(0, 40)}" in ${Math.round(w)}x${Math.round(hh)} at ${min}px`); return min; }
  }
  return size;
}
/** text element: font 'display'|'text'|'marker', fitted into w x h (max lines), returns el (shrink-wrapped width when o.wrap) */
function textEl(K, parent, str, o) {
  const el = h('div', 'kt kt--' + (o.font || 'display') + (o.cls ? ' ' + o.cls : ''), parent);
  el.dir = K.dir; el.textContent = str;
  if (o.color) el.style.color = o.color;
  const size = fitText(el, o.w, o.h, o.max || 64, o.min || 18, o.lines || 2, K, o.what);
  if (o.wrap) { el.style.width = 'max-content'; el.style.maxWidth = o.w + 'px'; }
  el.fit = size; return el;
}
/** place a baked piece (face + shadow canvases) inside a parent, top-left at (x, y) */
function placeBake(parent, b, x, y, cls = '') {
  const el = h('div', 'pc ' + cls, parent); el.style.left = x + 'px'; el.style.top = y + 'px';
  for (const [c, k] of [[b.shadow, 'pc__sh'], [b.face, 'pc__face']]) { c.className = k; c.style.width = b.w + 'px'; c.style.height = b.h + 'px'; c.style.left = -b.pad + 'px'; c.style.top = -b.pad + 'px'; el.appendChild(c); }
  el.style.width = (b.w - 2 * b.pad) + 'px'; el.style.height = (b.h - 2 * b.pad) + 'px';
  el.sh = b.shadow; return el;
}
function tapeEl(parent, x, y, w, rot, seed) {
  const el = h('div', 'tape', parent); el.style.left = x - w / 2 + 'px'; el.style.top = y - 17 + 'px'; el.style.width = w + 'px'; el.style.transform = `rotate(${rot}deg)`;
  const r = rand(seed); const z = (k) => (k % 2 ? 6 : 0) + r.range(0, 2);
  const pts = []; for (let k = 0; k <= 6; k++) pts.push(`${z(k).toFixed(1)}px ${(k / 6 * 100).toFixed(1)}%`);
  for (let k = 6; k >= 0; k--) pts.push(`calc(100% - ${z(k + 1).toFixed(1)}px) ${(k / 6 * 100).toFixed(1)}%`);
  el.style.clipPath = `polygon(${pts.join(',')})`; return el;
}
async function loadImg(K, src) {
  const url = K.asset(src), img = new Image(); img.src = url;
  try { await img.decode(); return img; } catch { K.lint.push(`asset not found or not an image: ${src}`); return null; }
}
function placeholder(w, hh) { const c = canvas(w, hh), g = c.getContext('2d'); g.fillStyle = '#7d6a55'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#e8d8bc'; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 20); g.lineTo(w - 20, hh - 20); g.moveTo(w - 20, 20); g.lineTo(20, hh - 20); g.stroke(); return c; }

/* ---------- base prop ---------- */
export class Prop {
  constructor(K, o = {}) {
    this.K = K; this.o = o; this.plane = o.plane || 'mid';
    this.v = { x: 0, y: 0, rot: o.tilt != null ? o.tilt : 0, sc: 1, sy: 1, op: 0, lift: 0 };
    this.rect = slotRect(K.L, o.slot || 'board');
    const pos = o.pos || [0.5, 0.5];
    this.cx = this.rect.x + pos[0] * this.rect.w; this.cy = this.rect.y + pos[1] * this.rect.h;
    this.at = K.T(o.at == null ? 0 : o.at);
    this.out = o.out != null ? K.T(o.out) : (o.dur != null ? this.at + o.dur : null);
    this.w = 100; this.h = 100; this.hinge = null; this.seekers = [];
    K.props._list.push(this);
  }
  /* -- scheduling helpers -- */
  _enter(style, at, sfx = true) {
    const tl = this.K.tl, v = this.v, K = this.K;
    tl.set(v, { op: 0 }, 0); tl.set(v, { op: 1 }, at);
    const S = (n, dt = 0, db) => { if (sfx && this.o.sfx !== false) K.sfx(this.o.sfx || n, at + dt, db != null ? { db } : undefined); };
    const r0 = this.v.rot;
    switch (style) {
      case 'drop': tl.to(v, { y: [-(this.cy + this.h / 2 + 260), 0], rot: [r0 + 9, r0] }, { at, dur: 0.55, ease: 'bounce' }); S('thud', 0.2); break;
      case 'pop': tl.to(v, { sc: [0.15, 1] }, { at, dur: 0.38, ease: 'back(2.4)' }); S('pop'); break;
      case 'slide': { const s = this.o.from === 'left' ? -1 : 1; tl.to(v, { x: [s * (this.K.L.W + this.w), 0], rot: [r0 + s * 8, r0] }, { at, dur: 0.6, ease: 'back(1.3)' }); S('slide'); break; }
      case 'rise': tl.to(v, { y: [this.K.L.H - this.cy + this.h / 2 + 120, 0] }, { at, dur: 0.6, ease: 'back(1.5)' }); S('whoosh'); break;
      case 'flap': this.hinge = 'top'; tl.to(v, { sy: [0.04, 1] }, { at, dur: 0.55, ease: 'bounce' }); S('flap'); break;
      case 'slam': tl.to(v, { sc: [2.1, 1] }, { at, dur: 0.16, ease: 'slam' }); tl.to(v, { rot: [r0 - 6, r0] }, { at, dur: 0.16, ease: 'outQuad' }); S('stamp'); K.cam.shake(at + 0.15, { amp: 7, dur: 0.25 }); break;
      case 'slap': tl.to(v, { sc: [1.45, 1] }, { at, dur: 0.18, ease: 'slam' }); S('tape'); break;
      case 'grow': this.hinge = 'bottom'; tl.to(v, { sy: [0.02, 1] }, { at, dur: 0.6, ease: 'back(1.4)' }); S('slide'); break;
      default: break;
    }
  }
  _exit(style, at, sfx = true) {
    const tl = this.K.tl, v = this.v, K = this.K;
    const S = (n) => { if (sfx && this.o.sfx !== false) K.sfx(n, at); };
    let dur = 0;
    switch (style) {
      case 'fly': dur = 0.45; tl.to(v, { y: -(this.cy + this.h / 2 + 300), rot: v.rot - 14 }, { at, dur, ease: 'inBack(1.3)' }); S('whoosh'); break;
      case 'drop': dur = 0.4; tl.to(v, { y: this.K.L.H - this.cy + this.h / 2 + 100 }, { at, dur, ease: 'inQuad' }); S('whoosh'); break;
      case 'pop': dur = 0.25; tl.to(v, { sc: 0.05 }, { at, dur, ease: 'inBack(2)' }); break;
      case 'slide': dur = 0.45; tl.to(v, { x: -(this.K.L.W + this.w) }, { at, dur, ease: 'inCubic' }); S('slide'); break;
      case 'fade': dur = 0.3; tl.to(v, { op: 0 }, { at, dur, ease: 'linear' }); break;
      default: break; // 'cut'
    }
    tl.set(v, { op: 0 }, at + dur);
  }
  schedule() { // called after the film ran (scene changes may have shortened `out`)
    this._enter(this.o.enter || this.enterStyle || 'pop', this.at);
    if (this.out != null) this._exit(this.cutAt != null && this.cutAt <= this.out ? 'cut' : this.o.exit || this.exitStyle || 'fly', this.out);
  }
  /* -- chainable motion API -- */
  /** move/rotate/scale relative to the resting place: .to({x, y, rot, sc}, {at, dur, ease}) */
  to(p, o = {}) { this.K.tl.to(this.v, p, { at: this.K.T(o.at), dur: o.dur == null ? 0.5 : o.dur, ease: o.ease || 'inOutCubic' }); return this; }
  pulse(o = {}) { const at = this.K.T(o.at); this.K.tl.to(this.v, { sc: o.to || 1.12 }, { at, dur: 0.12, ease: 'outQuad' }); this.K.tl.to(this.v, { sc: 1 }, { at: at + 0.12, dur: 0.35, ease: 'back(2.5)' }); this.K.sfx(o.sfx || 'pop', at, { db: -12 }); return this; }
  wiggle(o = {}) { const at = this.K.T(o.at), r0 = this.o.tilt || 0; for (let i = 0; i < 4; i++) this.K.tl.to(this.v, { rot: r0 + (i % 2 ? 5 : -5) * (1 - i / 4) }, { at: at + i * 0.09, dur: 0.09 }); this.K.tl.to(this.v, { rot: r0 }, { at: at + 0.36, dur: 0.1 }); return this; }
  exit(o = {}) { this.out = this.K.T(o.at); if (o.style) this.o.exit = o.style; return this; }
  center() { const p = this.K.S.planes[this.plane]; return [this.cx, this.cy, p ? p.depth : 1]; }
  /** stage point at fractions of this prop's box */
  point(fx, fy) { return [this.cx - this.w / 2 + fx * this.w, this.cy - this.h / 2 + fy * this.h]; }
  /* -- build + paint -- */
  async build() {}
  mount() {
    const el = h('div', 'prop', this.plane === 'hud' ? this.K.S.hud : this.K.S.planes[this.plane]); this.el = el; el.style.left = '0px'; el.style.top = '0px';
    this.box = h('div', 'prop__box', el); return this.box;
  }
  size(w, hh) { this.w = w; this.h = hh; this.box.style.width = w + 'px'; this.box.style.height = hh + 'px'; this.box.style.left = -w / 2 + 'px'; this.box.style.top = -hh / 2 + 'px'; }
  seek(t) {
    if (!this.el) return;
    const v = this.v; setOp(this.el, v.op);
    if (v.op <= 0) return;
    let dy = 0; if (this.hinge === 'top') dy = (this.h / 2) * (v.sy - 1); else if (this.hinge === 'bottom') dy = -(this.h / 2) * (v.sy - 1);
    setTf(this.el, this.cx + v.x, this.cy + v.y - v.lift + dy, v.rot, v.sc, v.sc * v.sy);
    for (const f of this.seekers) f(t);
  }
}

/* ---------- concrete props ---------- */
class Photo extends Prop {
  constructor(K, src, o) { super(K, o); this.src = src; this.enterStyle = 'drop'; if (o.tilt == null) this.v.rot = (rand(hashStr(src))() - 0.5) * 5; }
  async build() {
    const K = this.K, o = this.o, img = await loadImg(K, this.src);
    const iw = img ? img.naturalWidth : 1600, ih = img ? img.naturalHeight : 900;
    const capH = o.caption ? 0 : 0, border = 14, credH = o.credit ? 26 : 0;
    const maxW = this.rect.w * (o.size || 0.94) - 36, maxH = this.rect.h * (o.size || 0.94) - 36 - border * 2 - credH - (o.caption ? 20 : 0);
    const k = Math.min(maxW / iw, maxH / ih), pw = Math.round(iw * k), ph = Math.round(ih * k);
    const W = pw + border * 2 + 36, H = ph + border * 2 + credH + 36 + capH;
    const box = this.mount(); this.size(W, H);
    placeBake(box, card(W, H, { seed: hashStr(this.src) % 999, edge: 9, blur: 12 }), 0, 0, 'photo__back');
    const pr = h('div', 'print', box); pr.style.left = '18px'; pr.style.top = '18px'; pr.style.width = pw + border * 2 + 'px'; pr.style.height = ph + border * 2 + credH + 'px'; pr.style.padding = border + 'px';
    const win_ = h('div', 'print__win', pr); win_.style.width = pw + 'px'; win_.style.height = ph + 'px';
    const im = img ? img : placeholder(pw, ph); im.className = 'print__img'; im.style.width = pw + 'px'; im.style.height = ph + 'px'; win_.appendChild(im);
    if (o.credit) { const c = h('div', 'kt kt--text print__credit', pr); c.dir = K.dir; c.textContent = K.s(o.credit); c.style.width = pw + 'px'; }
    const sd = hashStr(this.src);
    if (o.tape !== false) { tapeEl(box, 40, 16, 120, -32, sd); tapeEl(box, W - 40, 16, 120, 30, sd + 1); if (o.tape === 4) { tapeEl(box, 40, H - 16, 110, 30, sd + 2); tapeEl(box, W - 40, H - 16, 110, -28, sd + 3); } }
    if (o.caption) {
      const lab = h('div', 'cap-strip', box); const tx = textEl(K, lab, K.s(o.caption), { font: 'marker', w: Math.min(W * 0.8, 640), h: 92, max: 44, min: 22, lines: 2, wrap: true, what: 'photo caption' });
      lab.style.left = '50%'; lab.style.top = (H - 40) + 'px'; lab.style.transform = `translateX(-50%) rotate(${(rand(sd)() - 0.5) * 4}deg)`;
    }
    // slow push-in inside the frame over the visible life
    const push = o.push == null ? 1.1 : o.push, a = this.at, b = this.out != null ? this.out : a + 8;
    if (push !== 1) { let last = ''; this.seekers.push((t) => { const s = (1 + (push - 1) * win(t, a, b)).toFixed(4); if (s !== last) { last = s; im.style.transform = `scale(${s})`; } }); }
  }
}

class Clip extends Prop {
  constructor(K, dir, o) { super(K, o); this.dir = dir; this.enterStyle = 'drop'; this.start = K.T(o.t0 != null ? o.t0 : o.at || 0); this.fps = o.fps || 15; }
  async build() {
    const K = this.K, o = this.o;
    let count = o.count, fps = this.fps;
    if (!count) { try { const r = await fetch(K.asset(this.dir.replace(/\/$/, '') + '/index.json')); if (r.ok) { const j = await r.json(); count = j.count; fps = o.fps || j.fps || fps; } } catch { /* probe */ } }
    if (!count) { count = 0; for (let i = 1; i <= 2000; i++) { const r = await fetch(this.frameUrl(i), { method: 'HEAD' }).catch(() => null); if (!r || !r.ok) break; count = i; } }
    this.fps = fps;
    if (!count) K.lint.push(`clip: no frames in ${this.dir} (expected ${this.frameUrl(1)})`);
    this.frames = (await Promise.all(Array.from({ length: count }, async (_, i) => { const im = new Image(); im.src = this.frameUrl(i + 1); try { await im.decode(); return im; } catch { return null; } }))).filter(Boolean);
    const fw = this.frames[0] ? this.frames[0].naturalWidth : 640, fh = this.frames[0] ? this.frames[0].naturalHeight : 360;
    // TV: body around a screen of the frames' aspect
    const maxW = this.rect.w * (o.size || 0.9), maxH = this.rect.h * (o.size || 0.9) - 60;
    const bw = 0.075, chin = 0.13; let W = maxW, sw = W * (1 - bw * 2), sh = sw * fh / fw, H = sh + W * (bw + chin);
    if (H > maxH) { const k = maxH / H; W *= k; sw *= k; sh *= k; H = maxH; }
    W = Math.round(W); H = Math.round(H); sw = Math.round(sw); sh = Math.round(sh);
    const ant = 60, box = this.mount(); this.size(W, H + ant);
    const sx = Math.round(W * bw), sy = ant + Math.round(W * bw);
    const scr = h('canvas', 'tv__screen', box); scr.width = Math.min(fw, 960); scr.height = Math.round(scr.width * fh / fw);
    scr.style.left = sx - 4 + 'px'; scr.style.top = sy - 4 + 'px'; scr.style.width = sw + 8 + 'px'; scr.style.height = sh + 8 + 'px';
    h('div', 'tv__glare', box).style.cssText = `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px`;
    const C = canvas(W * RES, (H + ant) * RES), g = C.getContext('2d'); g.scale(RES, RES);
    g.strokeStyle = '#3B2A18'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * 0.5, ant + 6); g.lineTo(W * 0.38, 4); g.moveTo(W * 0.5, ant + 6); g.lineTo(W * 0.64, 10); g.stroke();
    g.fillStyle = STOCK.vermilion; g.beginPath(); g.arc(W * 0.38, 6, 9, 0, 7); g.arc(W * 0.64, 12, 9, 0, 7); g.fill();
    g.fillStyle = STOCK.kraftDark; g.save(); g.translate(0, ant); pathPts(g, roughRect(W, H, 71, 2.4, 14)); g.fill(); g.restore();
    g.fillStyle = '#8E6236'; for (const [kx, kr] of [[0.82, 0.045], [0.92, 0.035]]) { g.beginPath(); g.arc(W * kx, ant + H - W * chin * 0.5, W * kr, 0, 7); g.fill(); g.strokeStyle = '#3B2A18'; g.lineWidth = 3; g.stroke(); }
    g.strokeStyle = 'rgba(40,25,10,0.5)'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { const y = ant + H - W * chin * 0.75 + i * 9; g.beginPath(); g.moveTo(W * 0.1, y); g.lineTo(W * 0.42, y); g.stroke(); }
    g.globalCompositeOperation = 'destination-out'; g.save(); g.translate(sx, sy); pathPts(g, roughRect(sw, sh, 72, 1.6, 18)); g.fill(); g.restore();
    placeBake(box, bake(C, W, H + ant, { edge: 10, blur: 14, flutes: true }), 0, 0, 'tv__body');
    const ctx = scr.getContext('2d'); let last = -1;
    this.seekers.push((t) => {
      const n = this.frames.length; if (!n) return;
      let i = Math.floor((t - this.start) * this.fps); i = o.loop ? ((i % n) + n) % n : clamp(i, 0, n - 1);
      if (i !== last) { last = i; const im = this.frames[i]; ctx.drawImage(im, 0, 0, scr.width, scr.height); }
    });
    this.K.sfx('tv-on', this.at + 0.3, { db: -10 });
  }
}
Clip.prototype.frameUrl = function (i) { return this.K.asset(this.dir.replace(/\/$/, '') + '/' + (this.o.pattern || '%04d.jpg').replace('%04d', String(i).padStart(4, '0'))); };

class Cutout extends Prop {
  constructor(K, src, o) { super(K, o); this.src = src; this.enterStyle = 'rise'; if (o.tilt == null) this.v.rot = (rand(hashStr(src) + 3)() - 0.5) * 6; }
  async build() {
    const K = this.K, o = this.o, img = await loadImg(K, this.src);
    const iw = img ? img.naturalWidth || 400 : 400, ih = img ? img.naturalHeight || 400 : 400;
    const maxH = o.h || this.rect.h * (o.size || 0.72), maxW = o.w || this.rect.w * (o.size || 0.72);
    const k = Math.min(maxW / iw, maxH / ih), w = Math.round(iw * k), hh = Math.round(ih * k), stick = o.stick === false ? 0 : Math.round(hh * 0.45);
    const C = canvas(w * RES, (hh + stick) * RES), g = C.getContext('2d'); g.scale(RES, RES);
    if (stick) { g.fillStyle = STOCK.wood; g.strokeStyle = '#8C6A3C'; g.lineWidth = 2; g.beginPath(); g.roundRect(w / 2 - 13, hh * 0.6, 26, stick + hh * 0.4 - 2, 12); g.fill(); g.stroke(); }
    g.drawImage(img || placeholder(w, hh), 0, 0, w, hh);
    const box = this.mount(); this.size(w, hh + stick);
    placeBake(box, bake(C, w, hh + stick, { edge: o.edge == null ? 8 : o.edge, rim: o.rim == null ? 6 : o.rim, blur: 12, stock: 'paper' }), 0, 0);
    this.cy += stick / 2; // keep the picture (not the stick) centred on the slot point
  }
}

class BigNumber extends Prop {
  constructor(K, value, o) { super(K, o); this.value = value; this.enterStyle = 'drop'; }
  async build() {
    const K = this.K, o = this.o, from = o.countFrom == null ? 0 : o.countFrom, dur = o.dur || 1.3, dec = o.decimals || 0;
    const W = Math.round(Math.min(this.rect.w * (o.size || 0.78), 760)), H = Math.round(Math.min(this.rect.h * (o.size || 0.78) * 0.75, o.unit ? 380 : 300));
    const box = this.mount(); this.size(W, H);
    placeBake(box, card(W, H, { stock: o.stock || 'yellow', seed: 81, edge: 9, flutes: false, paper: true }), 0, 0);
    tapeEl(box, W / 2, 10, 150, -3, 82);
    const numH = o.unit ? H * 0.62 : H * 0.84;
    const fmt = (v) => (o.prefix ? K.s(o.prefix) : '') + K.num(v, dec) + (o.suffix ? K.s(o.suffix) : '');
    const n = textEl(K, box, fmt(Math.max(Math.abs(this.value), Math.abs(from)) * (this.value < 0 ? -1 : 1)), { font: 'display', w: W * 0.84, h: numH * 1.1, max: numH * 1.12, min: 40, lines: 1, cls: 'bignum center', what: 'bigNumber' });
    n.style.whiteSpace = 'nowrap'; // mid-count digits are wider than the final zeros: never wrap the unit word under the number (2026-11-19)
    n.style.position = 'absolute'; n.style.left = W * 0.08 + 'px'; n.style.top = (o.unit ? H * 0.04 : (H - n.scrollHeight) / 2) + 'px';
    if (o.unit) { const u = textEl(K, box, K.s(o.unit), { font: 'marker', w: W * 0.86, h: H * 0.28, max: 84, min: 20, lines: 1, cls: 'center', what: 'bigNumber unit' }); u.style.position = 'absolute'; u.style.left = W * 0.07 + 'px'; u.style.top = H * 0.66 + 'px'; }
    const a = this.at + 0.25, e = ease('outCubic');
    this.seekers.push((t) => { const p = e(win(t, a, a + dur)); const v = from + (this.value - from) * p; setText(n, fmt(dec ? v : Math.round(v))); });
    K.sfx('count', a, { dur }); K.sfx('ding', a + dur);
  }
}

class Label extends Prop {
  constructor(K, key, o) { super(K, o); this.key = key; this.enterStyle = 'slap'; if (o.tilt == null) this.v.rot = (rand(hashStr(key))() - 0.5) * 6; }
  async build() {
    const K = this.K, o = this.o, max = { s: 34, m: 50, l: 72, xl: 96 }[o.size || 'm'];
    const box = this.mount(), maxW = o.w || Math.min(this.rect.w * 0.9, 900);
    const tx = textEl(K, box, K.s(this.key), { font: o.font || 'marker', w: maxW - 40, h: max * 2.6, max, min: 18, lines: 2, wrap: true, what: 'label ' + this.key, color: o.ink });
    const tw = Math.ceil(tx.offsetWidth), th = Math.ceil(tx.scrollHeight);
    const W = tw + 44, H = th + 26; this.size(W, H);
    const b = card(W, H, { stock: o.stock || 'white', seed: hashStr(this.key) % 997, edge: o.edge == null ? 5 : o.edge, rim: o.rim || 0, paper: true, flutes: false, blur: 8 });
    const pc = placeBake(box, b, 0, 0); box.insertBefore(pc, tx);
    tx.style.position = 'absolute'; tx.style.left = '22px'; tx.style.top = '13px';
    if (o.tape) tapeEl(box, W / 2, 0, Math.min(110, W * 0.5), 4, 7);
  }
}

class Arrow extends Prop {
  constructor(K, from, to, o) { super(K, { ...o, slot: 'full' }); this.from = from; this.toP = to; this.slotFor = slotRect(K.L, o.slot || 'board'); this.cx = 0; this.cy = 0; this.enterStyle = 'none'; this.exitStyle = 'fade'; }
  pt(p) {
    if (p && p.point) return p.point(0.5, 0.5);
    if (Array.isArray(p) && p.length === 3 && p[0] && p[0].point) return p[0].point(p[1], p[2]);
    if (p && p.x != null) return [p.x, p.y];
    const r = this.slotFor; return [r.x + p[0] * r.w, r.y + p[1] * r.h];
  }
  async build() {
    const K = this.K, o = this.o, L = K.L, [x1, y1] = this.pt(this.from), [x2, y2] = this.pt(this.toP);
    const el = h('div', 'prop', K.S.planes[this.plane]); this.el = el; el.style.left = '0px'; el.style.top = '0px';
    const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('class', 'marker'); el.appendChild(svg);
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len, bow = o.bow == null ? 0.18 : o.bow;
    const mx = (x1 + x2) / 2 + nx * len * bow, my = (y1 + y2) / 2 + ny * len * bow;
    const ang = Math.atan2(y2 - my, x2 - mx), hl = Math.min(56, len * 0.3);
    const head = `M${x2 - Math.cos(ang - 0.5) * hl} ${y2 - Math.sin(ang - 0.5) * hl} L${x2} ${y2} L${x2 - Math.cos(ang + 0.5) * hl} ${y2 - Math.sin(ang + 0.5) * hl}`;
    const col = o.color === 'ink' ? '#1E1712' : o.color || STOCK.vermilion, w = o.width || 13;
    const paths = [];
    for (const [d, sw, op] of [[`M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`, w, 0.95], [`M${x1 + 2} ${y1 + 1} Q${mx + 3} ${my - 2} ${x2 - 1} ${y2 + 1}`, w * 0.4, 0.5], [head, w, 0.95]]) {
      const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.style.stroke = col; p.style.strokeWidth = sw; p.style.opacity = op; p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = '1'; svg.appendChild(p); paths.push(p);
    }
    const a = this.at, d = o.drawDur || 0.5;
    this.seekers.push((t) => { const p = ease('inOutCubic')(win(t, a, a + d * 0.75)), q = ease('outCubic')(win(t, a + d * 0.7, a + d)); const s1 = (1 - p).toFixed(3), s2 = (1 - q).toFixed(3); if (paths[0].__d !== s1) { paths[0].__d = s1; paths[0].style.strokeDashoffset = s1; paths[1].style.strokeDashoffset = s1; } if (paths[2].__d !== s2) { paths[2].__d = s2; paths[2].style.strokeDashoffset = s2; } });
    K.sfx('marker', a, { dur: d });
  }
  seek(t) { if (!this.el) return; setOp(this.el, this.v.op); if (this.v.op > 0) for (const f of this.seekers) f(t); }
}

class Stamp extends Prop {
  constructor(K, key, o) { super(K, o); this.key = key; this.enterStyle = 'slam'; this.exitStyle = 'fade'; this.v.rot = o.tilt != null ? o.tilt : -9; }
  async build() {
    const K = this.K, o = this.o, box = this.mount();
    const st = h('div', 'stamp', box); if (o.color) st.style.setProperty('--ink', o.color);
    const tx = textEl(K, st, K.s(this.key), { font: 'display', w: Math.min(this.rect.w * 0.8, 680), h: o.big ? 260 : 150, max: o.big ? 170 : 84, min: 26, lines: 2, wrap: true, what: 'stamp ' + this.key });
    this.size(st.offsetWidth, st.offsetHeight); st.style.position = 'absolute'; st.style.left = '0'; st.style.top = '0';
  }
}

class Speech extends Prop {
  constructor(K, key, who, o) {
    super(K, { ...o, plane: o.plane || 'front' }); this.key = key; this.who = who; this.enterStyle = 'pop'; this.exitStyle = 'pop';
    if (this.out == null && typeof o.at === 'string') { const ln = K.lineOf(o.at); if (ln) this.out = ln.t1 + 0.25; }
    const actor = K.cast[who]; if (!actor) K.lint.push(`speech: unknown speaker "${who}"`);
    const tall = K.layout === 'tall', L = K.L;
    this.bw = tall ? 500 : 460; this.bh = tall ? 170 : 190;
    if (actor) {
      const [hx, hy] = actor.center();
      if (tall) { this.tailX = clamp(hx, 120, L.W - 120); this.cx = clamp(hx + (who === 'karto' ? 150 : -120), this.bw / 2 + 50, 926 - this.bw / 2); this.cy = 900; this.tailUp = false; }
      else { const top = actor.v.by - (actor.id === 'karto' ? 600 : 480) * actor.v.bs; this.cx = clamp(hx + (who === 'karto' ? 60 : -80), this.bw / 2 + 50, L.W - this.bw / 2 - 50); this.cy = top - this.bh / 2 - 40; this.tailX = hx; }
    }
  }
  async build() {
    const K = this.K, box = this.mount(), W = this.bw, H = this.bh, tailH = 46;
    this.size(W, H + tailH);
    const C = canvas(W * RES, (H + tailH) * RES), g = C.getContext('2d'); g.scale(RES, RES);
    g.fillStyle = STOCK.white; pathPts(g, roughEllipse(W / 2, H / 2, W / 2 - 4, H / 2 - 4, hashStr(this.key), 0.02, 36)); g.fill();
    const tx = clamp(this.tailX - (this.cx - W / 2), 40, W - 40), base = W / 2 + (tx - W / 2) * 0.4;
    g.beginPath(); g.moveTo(base - 34, H - 30); g.lineTo(tx, H + tailH - 2); g.lineTo(base + 24, H - 26); g.closePath(); g.fill();
    placeBake(box, bake(C, W, H + tailH, { edge: 5, blur: 9, stock: 'paper' }), 0, 0);
    const t = textEl(K, box, K.s(this.key), { font: 'display', w: W * 0.78, h: H * 0.68, max: 54, min: 20, lines: 2, what: 'speech ' + this.key, cls: 'center' });
    t.style.position = 'absolute'; t.style.left = W * 0.11 + 'px'; t.style.top = (H - t.scrollHeight) / 2 + 'px';
  }
}

class Title extends Prop {
  constructor(K, key, o) { super(K, { slot: 'board', pos: [0.5, 0.36], ...o }); this.key = key; this.enterStyle = 'flap'; if (this.out == null) this.out = this.at + (o.dur || 1.8); }
  async build() {
    const K = this.K, o = this.o, W = Math.round(this.rect.w * 0.94), H = Math.round(Math.min(this.rect.h * 0.52, K.layout === 'tall' ? 420 : 340));
    const box = this.mount(); this.size(W, H);
    const ch = K.chapters.find((c) => c.id === this.key);
    const text = K.show.strings && this.key in K.show.strings ? K.s(this.key) : ch ? ch.title : K.s(this.key);
    const num = o.num != null ? o.num : ch ? K.chapters.indexOf(ch) + 1 : null;
    placeBake(box, card(W, H, { stock: o.stock || 'kraftLight', seed: 55, edge: 12, blur: 16 }), 0, 0);
    tapeEl(box, W * 0.2, 4, 130, -6, 56); tapeEl(box, W * 0.8, 4, 130, 5, 57);
    let left = W * 0.07;
    if (num != null) {
      const d = Math.min(H * 0.6, 190), badge = h('div', 'title__num', box); badge.style.cssText = `width:${d}px;height:${d}px;top:${(H - d) / 2}px;${K.dir === 'rtl' ? 'right' : 'left'}:${W * 0.05}px;font-size:${d * 0.62}px`;
      badge.textContent = K.num(num); left = W * 0.05 + d + W * 0.04;
    }
    const tw = W - left - W * 0.06, tt = textEl(K, box, text, { font: 'display', w: tw, h: H * 0.78, max: K.layout === 'tall' ? 96 : 104, min: 28, lines: 2, what: 'title' });
    tt.style.position = 'absolute'; tt.style.top = (H - tt.scrollHeight) / 2 + 'px'; tt.style[K.dir === 'rtl' ? 'right' : 'left'] = left + 'px';
    K.sfx('thud', this.at + 0.32, { db: -8 });
  }
}

class MapProp extends Prop {
  constructor(K, src, pins, o) { super(K, o); this.src = src; this.pins = pins || []; this.enterStyle = 'drop'; if (o.tilt == null) this.v.rot = -1.5; }
  async build() {
    const K = this.K, o = this.o, img = await loadImg(K, this.src);
    const iw = img ? img.naturalWidth || 1000 : 1000, ih = img ? img.naturalHeight || 600 : 600;
    const maxW = this.rect.w * (o.size || 0.94) - 30, maxH = this.rect.h * (o.size || 0.94) - 30, k = Math.min(maxW / iw, maxH / ih), mw = Math.round(iw * k), mh = Math.round(ih * k);
    const W = mw + 30, H = mh + 30, box = this.mount(); this.size(W, H);
    const C = canvas(W * RES, H * RES), g = C.getContext('2d'); g.scale(RES, RES);
    g.fillStyle = '#EFE6CF'; pathPts(g, roughRect(W, H, 91, 2, 4)); g.fill(); g.drawImage(img || placeholder(mw, mh), 15, 15, mw, mh);
    placeBake(box, bake(C, W, H, { edge: 7, blur: 12, stock: 'paper' }), 0, 0);
    tapeEl(box, 36, 14, 110, -30, 92); tapeEl(box, W - 36, 14, 110, 30, 93);
    const ns = 'http://www.w3.org/2000/svg';
    if (o.route && o.route.length > 1) {
      const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('class', 'marker map__route'); box.appendChild(svg);
      const p = document.createElementNS(ns, 'path'); const pts = o.route.map(([x, y]) => [15 + x * mw, 15 + y * mh]);
      p.setAttribute('d', 'M' + pts.map((q) => q.join(' ')).join(' L')); p.setAttribute('pathLength', '1'); p.style.stroke = STOCK.vermilion; p.style.strokeWidth = 9; p.style.strokeDasharray = '1 1'; svg.appendChild(p);
      const ra = K.T(o.routeAt != null ? o.routeAt : this.at + 0.8), rd = o.routeDur || 1.2;
      this.seekers.push((t) => { const s = (1 - ease('inOutCubic')(win(t, ra, ra + rd))).toFixed(3); if (p.__d !== s) { p.__d = s; p.style.strokeDashoffset = s; } });
      K.sfx('marker', ra, { dur: rd });
    }
    const pinImg = await svgImage(ICON.pin());
    for (const [i, pn] of this.pins.entries()) {
      const pa = K.T(pn.at != null ? pn.at : this.at + 0.7 + i * 0.35), px = 15 + pn.x * mw, py = 15 + pn.y * mh;
      const pe = h('div', 'pin', box); pe.style.left = px - 20 + 'px'; pe.style.top = py - 54 + 'px';
      const pc = canvas(40 * RES, 56 * RES); pc.getContext('2d').drawImage(pinImg, 0, 0, 40 * RES, 56 * RES); pc.style.width = '40px'; pc.style.height = '56px'; pe.appendChild(pc);
      let lab = null;
      if (pn.key) { lab = h('div', 'pin__label', box); textEl(K, lab, K.s(pn.key), { font: 'display', w: Math.min(360, W * 0.42), h: 96, max: 42, min: 16, lines: 2, wrap: true, what: 'map pin' }); const right = pn.x < 0.7; lab.style.left = (right ? px + 18 : px - 18) + 'px'; lab.style.top = py - 30 + 'px'; if (!right) lab.style.transform = 'translateX(-100%)'; }
      const v = { y: -90, op: 0 }; K.tl.set(v, { op: 1 }, pa); K.tl.to(v, { y: [-90, 0] }, { at: pa, dur: 0.4, ease: 'bounce' });
      this.seekers.push(() => { setOp(pe, v.op); setTf(pe, 0, v.y, 0, 1, 1); if (lab) setOp(lab, v.op * clamp((v.y + 90) / 90, 0, 1)); });
      K.sfx('pin', pa + 0.12, { db: -10 });
    }
  }
}

class Bars extends Prop {
  constructor(K, items, o) { super(K, o); this.items = items || []; this.enterStyle = 'none'; this.exitStyle = 'fade'; }
  async build() {
    const K = this.K, o = this.o, n = Math.max(1, this.items.length), W = this.rect.w * 0.94, H = this.rect.h * 0.92, box = this.mount(); this.size(W, H);
    const max = o.max || Math.max(...this.items.map((i) => i.value), 1), colW = (W - 40) / n, bw = Math.min(colW * 0.62, 220), labH = Math.min(120, H * 0.18), valH = Math.min(96, H * 0.14);
    const baseY = H - labH - 10, barMax = baseY - valH - 10;
    placeBake(box, card(W, H, { stock: o.stock || 'cream', seed: 60, edge: 10, blur: 16, paper: true }), 0, 0); tapeEl(box, W * 0.18, 4, 130, -5, 63); tapeEl(box, W * 0.82, 4, 130, 6, 64);
    placeBake(box, card(W, 26, { stock: 'kraftDark', seed: 61, edge: 6, blur: 8 }), 0, baseY - 6);
    for (const [i, it] of this.items.entries()) {
      const bh = Math.max(8, barMax * (it.value / max)), x = 20 + colW * i + (colW - bw) / 2, a = this.at + 0.15 + i * (o.stagger || 0.3);
      const bar = placeBake(box, card(bw, bh, { stock: it.stock || STOCKS[i % STOCKS.length], seed: 62 + i, edge: 8, blur: 10, flutes: true }), x, baseY - bh, 'bar');
      bar.style.transformOrigin = `${bw / 2}px ${bh}px`;
      const val = textEl(K, box, K.num(it.value, o.decimals || 0) + (o.unit ? (/^\W$/.test(K.s(o.unit)) ? '' : ' ') + K.s(o.unit) : ''), { font: 'display', w: colW * 0.96, h: valH, max: valH * 0.8, min: 16, lines: 1, cls: 'center', what: 'bar value' });
      val.style.position = 'absolute'; val.style.left = 20 + colW * i + colW * 0.02 + 'px'; val.style.top = baseY - bh - valH - 4 + 'px';
      const lab = textEl(K, box, K.s(it.key), { font: 'display', w: colW * 0.94, h: labH, max: Math.min(58, labH * 0.5), min: 16, lines: 2, cls: 'center', what: 'bar label' });
      lab.style.position = 'absolute'; lab.style.left = 20 + colW * i + colW * 0.03 + 'px'; lab.style.top = baseY + 24 + 'px';
      const v = { s: 0 }; K.tl.to(v, { s: [0, 1] }, { at: a, dur: 0.7, ease: 'back(1.3)' });
      this.seekers.push(() => { const s = Math.max(0.001, v.s); setTf(bar, 0, 0, 0, 1, s); setOp(val, clamp((v.s - 0.6) * 3, 0, 1)); setTf(val, 0, bh * (1 - Math.min(1, v.s)), 0, 1, 1); setOp(lab, clamp(v.s * 4, 0, 1)); });
      K.sfx('pop', a, { db: -12 });
    }
  }
}

class Timeline_ extends Prop {
  constructor(K, items, o) { super(K, o); this.items = items || []; this.enterStyle = 'slide'; }
  async build() {
    const K = this.K, o = this.o, n = Math.max(1, this.items.length), W = this.rect.w * 0.96, H = Math.min(this.rect.h * 0.7, 380), box = this.mount(); this.size(W, H);
    const sy = H * 0.4, sh = 54;
    placeBake(box, card(W, H, { stock: o.stock || 'cream', seed: 70, edge: 10, blur: 16, paper: true }), 0, 0);
    placeBake(box, card(W, sh, { stock: 'white', seed: 71, edge: 5, blur: 8, paper: true }), 0, sy);
    tapeEl(box, 30, sy + sh / 2, 70, 90, 72); tapeEl(box, W - 30, sy + sh / 2, 70, 90, 73);
    const rtl = K.dir === 'rtl', xs = this.items.map((_, i) => { const f = n === 1 ? 0.5 : 0.08 + 0.84 * (i / (n - 1)); return (rtl ? 1 - f : f) * W; });
    for (const [i, it] of this.items.entries()) {
      const tick = h('div', 'tl__tick', box); tick.style.left = xs[i] - 4 + 'px'; tick.style.top = sy + 6 + 'px';
      const cw = Math.min(W / n * 0.96, 360);
      if (it.top) { const tp = textEl(K, box, K.s(it.top), { font: 'display', w: cw, h: sy * 0.5, max: 64, min: 16, lines: 1, cls: 'center', what: 'timeline top' }); tp.style.position = 'absolute'; tp.style.left = xs[i] - cw / 2 + 'px'; tp.style.top = sy * 0.1 + 'px'; }
      const lb = textEl(K, box, K.s(it.key), { font: 'display', w: cw, h: H - sy - sh - 24, max: 54, min: 16, lines: 2, cls: 'center', what: 'timeline label' });
      lb.style.position = 'absolute'; lb.style.left = xs[i] - cw / 2 + 'px'; lb.style.top = sy + sh + 12 + 'px';
    }
    // moving marker: a vermilion paper pointer above the strip
    const mk = h('div', 'tl__marker', box); mk.style.top = sy - 64 + 'px';
    const times = this.items.map((it, i) => K.T(it.at != null ? it.at : this.at + 0.6 + i * 0.8));
    times.forEach((tt) => K.sfx('slide', tt - 0.35, { db: -14 }));
    this.seekers.push((t) => {
      let x = xs[0]; for (let i = 0; i < times.length; i++) { if (t >= times[i]) x = xs[i]; else if (t >= times[i] - 0.4) { x = lerp(i ? xs[i - 1] : xs[0], xs[i], ease('inOutCubic')((t - times[i] + 0.4) / 0.4)); break; } else break; }
      setTf(mk, x - 26, 0, 0, 1, 1);
    });
  }
}

class Versus extends Prop {
  constructor(K, l, r, o) { super(K, o); this.l = l; this.r = r; this.enterStyle = 'none'; this.exitStyle = 'fade'; }
  async build() {
    const K = this.K, o = this.o, W = this.rect.w * 0.96, H = Math.min(this.rect.h * 0.8, K.layout === 'tall' ? 640 : 520), box = this.mount(); this.size(W, H);
    const cw = W * 0.43, sides = [[this.l, 0, -1, 'yellow', o.leftImg], [this.r, W - cw, 1, 'blue', o.rightImg]];
    const parts = [];
    for (const [key, x, s, stock, img] of sides) {
      const wrap = h('div', 'vs__side', box); wrap.style.left = x + 'px'; wrap.style.top = '0px'; wrap.style.width = cw + 'px'; wrap.style.height = H + 'px';
      placeBake(wrap, card(cw, H, { stock, seed: 40 + s, edge: 10, blur: 14, flutes: true }), 0, 0);
      let ty = H * 0.3;
      if (img) { const im = await loadImg(K, img); if (im) { const ih = H * 0.52, iw = cw * 0.8; const fr = h('div', 'print vs__img', wrap); fr.style.cssText = `left:${cw * 0.1 - 8}px;top:${H * 0.07}px;width:${iw}px;height:${ih}px;padding:8px`; const wn = h('div', 'print__win', fr); wn.style.cssText = `width:${iw}px;height:${ih}px`; im.className = 'print__img cover'; wn.appendChild(im); ty = H * 0.66; } }
      const tt = textEl(K, wrap, K.s(key), { font: 'display', w: cw * 0.84, h: img ? H * 0.28 : H * 0.5, max: 80, min: 20, lines: 2, cls: 'center', what: 'versus', color: stock === 'blue' ? '#FFFDF6' : null });
      tt.style.position = 'absolute'; tt.style.left = cw * 0.08 + 'px'; tt.style.top = (img ? ty : (H - tt.scrollHeight) / 2) + 'px';
      parts.push([wrap, s]);
    }
    const bolt = await svgImage(ICON.bolt()); const bh = Math.min(H * 0.7, 300), bw = bh * 160 / 240;
    const C = canvas(bw * RES, bh * RES); C.getContext('2d').drawImage(bolt, 0, 0, bw * RES, bh * RES);
    const be = placeBake(box, bake(C, bw, bh, { edge: 7, blur: 10, stock: 'paper' }), W / 2 - bw / 2, H / 2 - bh / 2, 'vs__bolt');
    const a = this.at, v = { l: 1, r: 1, b: 0 };
    K.tl.to(v, { l: [1, 0] }, { at: a, dur: 0.5, ease: 'back(1.3)' }); K.tl.to(v, { r: [1, 0] }, { at: a + 0.15, dur: 0.5, ease: 'back(1.3)' }); K.tl.to(v, { b: [0, 1] }, { at: a + 0.55, dur: 0.16, ease: 'slam' });
    this.seekers.push(() => { setTf(parts[0][0], -v.l * (K.L.W * 0.7), 0, -v.l * 10, 1, 1); setTf(parts[1][0], v.r * (K.L.W * 0.7), 0, v.r * 10, 1, 1); setOp(be, v.b > 0 ? 1 : 0); const s = 2.2 - 1.2 * v.b; setTf(be, 0, 0, -8, s, s); });
    K.sfx('whoosh', a); K.sfx('whoosh', a + 0.15); K.sfx('stamp', a + 0.6); K.cam.shake(a + 0.7, { amp: 8 });
  }
}

class CounterBoard extends Prop {
  constructor(K, key, o) { super(K, o); this.key = key; this.enterStyle = 'drop'; this.steps = (o.steps || []).map((s) => ({ t: K.T(s.at), v: s.value })).sort((a, b) => a.t - b.t); }
  async build() {
    const K = this.K, o = this.o, from = o.from || 0, vals = [from, ...this.steps.map((s) => s.v)];
    const digits = Math.max(...vals.map((v) => String(Math.abs(Math.round(v))).length));
    const W = Math.min(this.rect.w * 0.8, 120 * digits + 160), H = Math.min(this.rect.h * 0.75, 330), box = this.mount(); this.size(W, H);
    placeBake(box, card(W, H, { stock: 'black', seed: 31, edge: 9, blur: 14 }), 0, 0);
    tapeEl(box, W / 2, 6, 130, 3, 32);
    const lb = textEl(K, box, K.s(this.key), { font: 'marker', w: W * 0.86, h: H * 0.24, max: 46, min: 16, lines: 1, cls: 'center', color: '#FFFDF6', what: 'counterBoard label' });
    lb.style.position = 'absolute'; lb.style.left = W * 0.07 + 'px'; lb.style.top = H * 0.08 + 'px';
    const tw = Math.min((W * 0.86) / digits - 12, 120), th = H * 0.56, x0 = (W - digits * (tw + 12) + 12) / 2;
    const tiles = [];
    for (let i = 0; i < digits; i++) { const tile = h('div', 'cb__tile kt kt--display', box); tile.style.cssText = `left:${x0 + i * (tw + 12)}px;top:${H * 0.36}px;width:${tw}px;height:${th}px;font-size:${th * 0.78}px;line-height:${th}px`; tiles.push(tile); }
    const at = (t) => { let v = from, ct = -1e9; for (const s of this.steps) { if (s.t <= t) { v = s.v; ct = s.t; } else break; } return [v, ct]; };
    this.seekers.push((t) => {
      const [v, ct] = at(t), dt = t - ct, p = dt < 0.22 ? dt / 0.22 : 1;
      const shown = p < 0.5 ? at(ct - 1e-4)[0] : v, s = String(Math.abs(Math.round(shown))).padStart(digits, '0');
      tiles.forEach((tile, i) => { setText(tile, K.digit(s[i])); setTf(tile, 0, 0, 0, 1, p < 1 ? Math.max(0.06, Math.abs(Math.cos(p * Math.PI))) : 1); });
    });
    this.steps.forEach((s) => K.sfx('tick', s.t));
  }
}

class Confetti extends Prop {
  constructor(K, o) { super(K, { ...o, plane: 'hud' }); this.dur = o.dur || 2.6; this.n = o.count || 90; this.enterStyle = 'none'; if (this.out == null) this.out = this.at + this.dur; this.exitStyle = 'cut'; }
  async build() {
    const K = this.K, L = K.L, c = h('canvas', 'confetti', K.S.hud); c.width = L.W / 2; c.height = L.H / 2; this.el = c; this.box = c;
    const r = rand(Math.round(this.at * 100) + 5), cols = ['#E5401D', '#FFD23F', '#3D7DB8', '#57A05A', '#F4A3B5', '#F8F3E6', '#C99A62'];
    const burst = this.o.from === 'burst';
    this.bits = Array.from({ length: this.n }, () => ({ x: burst ? L.W * r.range(0.35, 0.65) : r() * L.W, y: burst ? L.H * 0.7 : -r.range(20, 400), vx: burst ? r.range(-900, 900) : r.range(-60, 60), vy: burst ? r.range(-1500, -700) : r.range(250, 520), w: r.range(18, 34), h: r.range(12, 22), rot: r() * 6, vr: r.range(-8, 8), ph: r() * 6, col: r.pick(cols) }));
    const g = c.getContext('2d'); let last = -1;
    this.paint = (t) => {
      const lt = t - this.at; if (lt === last) return; last = lt; g.clearRect(0, 0, c.width, c.height); if (lt < 0 || lt > this.dur) return;
      g.save(); g.scale(0.5, 0.5);
      for (const b of this.bits) {
        const drag = burst ? 1 - Math.exp(-lt * 2.2) : lt, x = b.x + (burst ? b.vx * drag / 2.2 : b.vx * lt) + Math.sin(b.ph + lt * 5) * 26;
        const y = b.y + (burst ? b.vy * drag / 2.2 + 520 * lt * lt : b.vy * lt + 60 * lt * lt);
        g.save(); g.translate(x, y); g.rotate(b.rot + b.vr * lt); g.scale(1, Math.cos(b.ph + lt * 9)); g.fillStyle = b.col; g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); g.restore();
      }
      g.restore();
    };
    K.sfx('confetti', this.at);
  }
  seek(t) { if (!this.el) return; const on = this.v.op > 0; setOp(this.el, on ? 1 : 0); if (on) this.paint(t); }
}

class Hook extends Prop {
  constructor(K, text, o) { super(K, { ...o, plane: 'hud' }); this.text = text; this.enterStyle = 'none'; this.exitStyle = 'fly'; if (this.out == null) this.out = this.at + (o.dur || 2.8); const r = K.L.hook; this.cx = r.x + r.w / 2; this.cy = r.y + r.h / 2; }
  async build() {
    const K = this.K, R = K.L.hook, box = this.mount(); this.size(R.w, R.h);
    const panel = placeBake(box, card(R.w, R.h, { stock: 'kraftDark', seed: 21, edge: 12, blur: 20, flutes: true }), 0, 0);
    tapeEl(box, 60, 14, 150, -28, 22); tapeEl(box, R.w - 60, 14, 150, 28, 23);
    const wrap = h('div', 'hook__words', box); wrap.dir = K.dir; wrap.style.cssText = `left:${R.w * 0.05}px;top:${R.h * 0.08}px;width:${R.w * 0.9}px;height:${R.h * 0.84}px`;
    const words = String(this.text || '').trim().split(/\s+/).filter(Boolean), r = rand(hashStr(this.text || 'h'));
    const chips = words.map((w, i) => { const c = h('span', 'chip chip--' + ['white', 'yellow', 'vermilion', 'white', 'black', 'yellow'][i % 6], wrap); c.textContent = w; c.style.setProperty('--r', ((r() - 0.5) * 8).toFixed(1) + 'deg'); return c; });
    // fit: shrink font until the chips fit in 3 rows
    let fs = K.layout === 'tall' ? 120 : 132;
    for (let i = 0; i < 40; i++) { wrap.style.fontSize = fs + 'px'; if (wrap.scrollHeight <= R.h * 0.84 + 1 && wrap.scrollWidth <= R.w * 0.9 + 1) break; fs *= 0.94; }
    const a = this.at; const v = { p: 0 }; this.K.tl.to(v, { p: [0, 1] }, { at: a, dur: 0.01 });
    const pan = { s: 1.4 }; K.tl.to(pan, { s: [1.4, 1] }, { at: a, dur: 0.18, ease: 'slam' });
    this.seekers.push((t) => {
      setTf(panel, 0, 0, 0, pan.s, pan.s);
      chips.forEach((c, i) => { const ca = a + 0.15 + i * 0.09, p = win(t, ca, ca + 0.16); setOp(c, p > 0 ? 1 : 0); const s = p < 1 ? 1.8 - 0.8 * ease('slam')(p) : 1; const tf = `rotate(var(--r)) scale(${s.toFixed(3)})`; if (c.__t !== tf) { c.__t = tf; c.style.transform = tf; } });
    });
    K.sfx('stamp', a); K.cam.shake(a + 0.16, { amp: 8 });
    words.forEach((_, i) => { if (i % 2 === 0) K.sfx('pop', a + 0.15 + i * 0.09, { db: -14 }); });
  }
}

class EndScreen extends Prop {
  constructor(K, o) { super(K, { slot: 'full', ...o }); this.enterStyle = 'none'; }
  async build() {
    const K = this.K, L = K.L, box = this.mount();
    if (K.layout !== 'wide') return; // Shorts: the page draws shortCta instead
    // absolute stage coordinates: this prop's box covers the whole stage
    this.cx = L.W / 2; this.cy = L.H / 2; this.size(L.W, L.H);
    const sw = 560, shh = 315, slots = [[600, 80], [1240, 80]], a = this.at;
    slots.forEach(([x, y], i) => {
      const C = canvas((sw + 40) * RES, (shh + 40) * RES), g = C.getContext('2d'); g.scale(RES, RES);
      g.fillStyle = i ? STOCK.kraftLight : STOCK.kraft; pathPts(g, roughRect(sw + 40, shh + 40, 101 + i, 2, 8)); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.fillRect(20, 20, sw, shh);
      const grp = h('div', 'grp', box);
      const hole = h('div', 'end__hole', grp); hole.style.cssText = `left:${x + 20}px;top:${y + 20}px;width:${sw}px;height:${shh}px`;
      placeBake(grp, bake(C, sw + 40, shh + 40, { edge: 10, blur: 14, flutes: true }), x, y, 'end__frame');
      tapeEl(grp, x + 30, y + 10, 100, -30, 103 + i); tapeEl(grp, x + sw + 10, y + 10, 100, 30, 105 + i);
      const v = { y: -700 }; K.tl.to(v, { y: [-700, 0] }, { at: a + i * 0.2, dur: 0.6, ease: 'bounce' });
      this.seekers.push(() => setTf(grp, 0, v.y, 0, 1, 1));
      K.sfx('thud', a + i * 0.2 + 0.25);
    });
    // subscribe ring (the channel icon element sits here) + end text
    const d = 230, cx = 1160, cy = 640;
    const ring = h('div', 'end__ring', box); ring.style.cssText = `left:${cx - d / 2}px;top:${cy - d / 2}px;width:${d}px;height:${d}px`;
    const rv = { s: 0 }; K.tl.to(rv, { s: [0, 1] }, { at: a + 0.6, dur: 0.4, ease: 'back(2)' });
    const bellImg = await svgImage(ICON.bell()); const bc = canvas(120, 120); bc.getContext('2d').drawImage(bellImg, 0, 0); bc.className = 'end__bell'; bc.style.cssText = `left:${cx + d / 2 - 40}px;top:${cy + d / 2 - 90}px;width:90px;height:90px`; box.appendChild(bc);
    const txt = K.show.end_text || (K.show.strings && K.show.strings.end_text) || '';
    let strip = null;
    if (txt) { strip = h('div', 'cap-strip end__text', box); textEl(K, strip, txt, { font: 'display', w: 560, h: 100, max: 54, min: 22, lines: 2, wrap: true, cls: 'center', what: 'end text' }); strip.style.left = '880px'; strip.style.top = '440px'; }
    this.seekers.push(() => { const s = Math.max(0.001, rv.s); setTf(ring, 0, 0, 0, s, s); setTf(bc, 0, 0, -12 + 12 * rv.s, s, s); if (strip) setOp(strip, rv.s); });
    K.sfx('pop', a + 0.6);
  }
}

class ShortCta extends Prop {
  constructor(K, o) { super(K, { slot: 'board', pos: [0.5, 0.5], ...o }); this.enterStyle = 'drop'; }
  async build() {
    const K = this.K, s = K.show.short || {}, W = Math.round(this.rect.w * 0.9), H = Math.round(Math.min(this.rect.h * 0.62, 520)), box = this.mount(); this.size(W, H);
    placeBake(box, card(W, H, { stock: 'vermilion', seed: 121, edge: 12, blur: 16, flutes: false }), 0, 0);
    tapeEl(box, W * 0.15, 6, 140, -8, 122); tapeEl(box, W * 0.85, 6, 140, 8, 123);
    const pl = await svgImage(ICON.play()), d = Math.min(H * 0.42, 200), pc = canvas(d * RES, d * RES); pc.getContext('2d').drawImage(pl, 0, 0, d * RES, d * RES);
    const pe = placeBake(box, bake(pc, d, d, { edge: 6, blur: 8, stock: 'paper' }), W / 2 - d / 2, H * 0.08);
    const text = s.cta_text || (K.show.strings && K.show.strings.cta_full) || '';
    const tt = textEl(K, box, text, { font: 'display', w: W * 0.86, h: H * 0.4, max: 84, min: 24, lines: 2, cls: 'center', color: '#FFFDF6', what: 'short cta' });
    tt.style.position = 'absolute'; tt.style.left = W * 0.07 + 'px'; tt.style.top = H * 0.08 + d + H * 0.04 + 'px';
    const a = this.at; this.seekers.push((t) => { const p = Math.sin(Math.max(0, t - a - 0.6) * 6) * 0.05 * (t > a + 0.6 ? 1 : 0); setTf(pe, 0, 0, 0, 1 + p, 1 + p); });
  }
}

/* ---------- public API ---------- */
export function makeProps(K) {
  const list = [];
  const api = {
    _list: list,
    photo: (src, o = {}) => new Photo(K, src, o),
    clip: (dir, o = {}) => new Clip(K, dir, o),
    cutout: (src, o = {}) => new Cutout(K, src, o),
    bigNumber: (value, o = {}) => new BigNumber(K, value, o),
    label: (key, o = {}) => new Label(K, key, o),
    arrow: (from, to, o = {}) => new Arrow(K, from, to, o),
    stamp: (key, o = {}) => new Stamp(K, key, o),
    speech: (key, who, o = {}) => new Speech(K, key, who, o),
    title: (key, o = {}) => new Title(K, key, o),
    map: (src, pins, o = {}) => new MapProp(K, src, pins, o),
    bars: (items, o = {}) => new Bars(K, items, o),
    timeline: (items, o = {}) => new Timeline_(K, items, o),
    versus: (l, r, o = {}) => new Versus(K, l, r, o),
    counterBoard: (key, o = {}) => new CounterBoard(K, key, o),
    confetti: (o = {}) => new Confetti(K, o),
    hook: (text, o = {}) => { api._hook = true; return new Hook(K, text != null && K.show.strings && text in K.show.strings ? K.s(text) : text != null ? text : K.show.hook_text, o); },
    endScreen: (o = {}) => { api._end = true; const tail = o.tail || K.show.tail || 12; return new EndScreen(K, { at: o.at != null ? o.at : Math.max(0, K.duration - tail), ...o }); },
    shortCta: (o = {}) => { api._cta = true; const s = K.show.short; return new ShortCta(K, { at: o.at != null ? o.at : s ? Math.max(s.t0, s.t1 - 2.6) : K.duration - 2.6, ...o }); },
  };
  return api;
}
