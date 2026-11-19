/* Karto cutout kit - core: seeded random, eases, smooth noise, random-access timeline.
   Timeline engine adapted from data/brand/shu-lab/kit.js (pure function of t). Adds plain-object targets ("vars"):
   tl.to(obj, {x: 10}) writes obj.x on seek; painters read those vars after the seek. */

export function rand(seed) {
  let a = (typeof seed === 'string' ? [...seed].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7) : (seed >>> 0)) || 1;
  const r = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * r());
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  return r;
}

/* deterministic 1D smooth noise in [-1, 1] */
export function noise1(seed) {
  const r = rand(seed), g = Array.from({ length: 256 }, () => r() * 2 - 1);
  return (x) => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return g[i & 255] + (g[(i + 1) & 255] - g[i & 255]) * s; };
}

const c1 = 1.70158;
export const E = {
  linear: (p) => p,
  inQuad: (p) => p * p,
  outQuad: (p) => 1 - (1 - p) * (1 - p),
  inCubic: (p) => p * p * p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
  outQuart: (p) => 1 - Math.pow(1 - p, 4),
  inOutQuart: (p) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
  back: (p, s = c1) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  inBack: (p, s = c1) => (s + 1) * p * p * p - s * p * p,
  elastic: (p) => Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  bounce: (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; },
  slam: (p) => (p < 0.8 ? Math.pow(p / 0.8, 3) * 1.04 : 1.04 - 0.04 * (1 - Math.pow(1 - (p - 0.8) / 0.2, 3))),
  step: (p) => (p < 1 ? 0 : 1),
};
export function ease(e) {
  let f;
  if (typeof e === 'function') f = e;
  else {
    const m = /^(\w+)(?:\(([-\d.]+)\))?$/.exec(e || 'outCubic');
    const base = m && E[m[1]];
    f = base ? (m[2] != null ? (p) => base(p, +m[2]) : base) : E.outCubic;
  }
  return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : f(p));
}

const DEF = { x: 0, y: 0, rot: 0, sc: 1, sx: 1, sy: 1, opacity: 1 };
const fmt = (v) => (Math.abs(v) < 1e-6 ? 0 : Math.round(v * 1000) / 1000);
const isEl = (t) => typeof Element !== 'undefined' && t instanceof Element;

export class Timeline {
  constructor() { this.tr = new Map(); this.fns = []; this.post = []; this.n = 0; this.dirty = true; this.end = 0; this.t = 0; }
  _track(target, prop) {
    let m = this.tr.get(target); if (!m) { m = new Map(); this.tr.set(target, m); }
    let tr = m.get(prop); if (!tr) { tr = { prop, tweens: [] }; m.set(prop, tr); }
    return tr;
  }
  /** tween props of a DOM element or a plain object. value or [from, to]. o: {at, dur, ease} */
  to(target, props, o = {}) {
    const at = +o.at || 0, dur = o.dur == null ? 0.4 : Math.max(0, o.dur), e = ease(o.ease);
    const list = target == null ? [] : Array.isArray(target) || target instanceof NodeList ? [...target] : [target];
    for (const el of list) for (const k of Object.keys(props)) {
      const v = props[k];
      this._track(el, k).tweens.push({ at, dur, e, from: Array.isArray(v) ? v[0] : undefined, to: Array.isArray(v) ? v[1] : v, i: this.n++ });
    }
    this.end = Math.max(this.end, at + dur); this.dirty = true; return this;
  }
  set(target, props, at = 0) { return this.to(target, props, { at: typeof at === 'object' ? at.at : at, dur: 0, ease: 'linear' }); }
  /** paint(p) runs on every seek with p = clamp((t - at) / dur). Must only write state. */
  fn(at, dur, paint) { this.fns.push({ at, dur, paint, i: this.n++ }); this.end = Math.max(this.end, at + dur); return this; }
  /** paint(t) runs after all tweens on every seek */
  every(paint) { this.post.push(paint); return this; }
  _prep() {
    for (const [el, m] of this.tr) for (const [k, tr] of m) {
      tr.tweens.sort((a, b) => a.at - b.at || a.i - b.i);
      tr.tweens.forEach((w) => { w.f = undefined; });
      const first = tr.tweens[0];
      if (tr.base0 === undefined) {
        if (!isEl(el)) tr.base0 = typeof el[k] === 'number' ? el[k] : k in DEF ? DEF[k] : 0;
        else tr.base0 = k in DEF ? DEF[k] : k.startsWith('--') ? 0 : parseFloat(getComputedStyle(el)[k]) || 0;
      }
      tr.base = first.from != null ? first.from : tr.base0;
    }
    this.dirty = false;
  }
  _val(tr, t, upto = tr.tweens.length) {
    let v = tr.base;
    for (let i = 0; i < upto; i++) {
      const w = tr.tweens[i];
      if (t < w.at) break;
      if (w.f === undefined) w.f = w.from != null ? w.from : this._val(tr, w.at, i);
      const p = w.dur > 0 ? (t - w.at) / w.dur : 1;
      v = w.f + (w.to - w.f) * w.e(p);
    }
    return v;
  }
  seek(t) {
    if (this.dirty) this._prep();
    this.t = t;
    for (const [el, m] of this.tr) {
      if (!isEl(el)) { for (const [k, tr] of m) el[k] = this._val(tr, t); continue; }
      const last = el.__k || (el.__k = {}); let tf = null;
      for (const [k, tr] of m) {
        const v = this._val(tr, t);
        if (k === 'x' || k === 'y' || k === 'rot' || k === 'sc' || k === 'sx' || k === 'sy') { (tf || (tf = {}))[k] = v; continue; }
        const val = fmt(v);
        if (last[k] === val) continue; last[k] = val;
        if (k === 'opacity') el.style.opacity = String(val);
        else if (k === 'dash') el.style.strokeDashoffset = String(val);
        else if (k.startsWith('--')) el.style.setProperty(k, String(val));
        else el.style[k] = val + 'px';
      }
      if (tf) setTf(el, tf.x || 0, tf.y || 0, tf.rot || 0, (tf.sc == null ? 1 : tf.sc) * (tf.sx == null ? 1 : tf.sx), (tf.sc == null ? 1 : tf.sc) * (tf.sy == null ? 1 : tf.sy));
    }
    for (const f of this.fns) {
      const p = f.dur > 0 ? Math.min(1, Math.max(0, (t - f.at) / f.dur)) : t >= f.at ? 1 : 0;
      f.paint(p);
    }
    for (const p of this.post) p(t);
    return this;
  }
}

/** 2D transform writer with change detection (2D only: 3D layers make raster scale history-dependent) */
export function setTf(el, x, y, rot, sx, sy) {
  const s = `translate(${fmt(x)}px,${fmt(y)}px) rotate(${fmt(rot)}deg) scale(${fmt(sx)},${fmt(sy)})`;
  if (el.__tf !== s) { el.__tf = s; el.style.transform = s; }
}
export function setOp(el, o) { const v = fmt(Math.max(0, Math.min(1, o))); if (el.__op !== v) { el.__op = v; el.style.opacity = String(v); el.style.visibility = v <= 0 ? 'hidden' : 'visible'; } }
export function setText(el, s) { if (el.__tx !== s) { el.__tx = s; el.textContent = s; } }

export const h = (tag, cls, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const win = (t, a, b) => clamp((t - a) / Math.max(1e-6, b - a), 0, 1);
export const hashStr = (s) => [...String(s)].reduce((a, c) => (Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0), 2166136261);

const AR = '٠١٢٣٤٥٦٧٨٩';
export const arDigits = (s) => String(s).replace(/[0-9]/g, (d) => AR[+d]);
