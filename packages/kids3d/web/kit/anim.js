// Pure-function-of-time motion helpers (no state between frames: every value is computed from t).
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
export const EASE = {
  linear: (u) => clamp(u),
  in: (u) => clamp(u) ** 2,
  out: (u) => 1 - (1 - clamp(u)) ** 2,
  inOut: (u) => { u = clamp(u); return u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; },
  inOutSine: (u) => -(Math.cos(Math.PI * clamp(u)) - 1) / 2,
  inSine: (u) => 1 - Math.cos(Math.PI * clamp(u) / 2),
  outSine: (u) => Math.sin(Math.PI * clamp(u) / 2),
  outCubic: (u) => 1 - (1 - clamp(u)) ** 3,
  inOutCubic: (u) => { u = clamp(u); return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2; },
  outBack: (u) => { u = clamp(u); const c = 1.70158, c3 = c + 1; return 1 + c3 * (u - 1) ** 3 + c * (u - 1) ** 2; },
  step: (u) => (u >= 1 ? 1 : 0),
};
export const ease = (name) => (typeof name === 'function' ? name : EASE[name] ?? EASE.inOutSine);

/** Closed-form damped spring step response 0 -> 1 (x = seconds since the change). */
export function spring(x, { freq = 2.2, damp = 0.45 } = {}) {
  if (x <= 0) return 0;
  const w = 2 * Math.PI * freq, z = damp;
  if (z >= 1) return 1 - Math.exp(-w * x) * (1 + w * x);
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
}
/** A bump 0 -> 1 -> 0 over dur seconds (sine), 0 outside. */
export const bump = (x, dur) => (x <= 0 || x >= dur ? 0 : Math.sin(Math.PI * x / dur));
/** Hash noise (deterministic) and smooth 1D value noise. */
export const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i; return lerp(hash(i + seed * 101.3), hash(i + 1 + seed * 101.3), smooth(f)) * 2 - 1; }

/** Keyframe track for numbers or arrays. keys: [{t, v, ease}] — ease on the LEFT key; a key with hold:true steps. */
export class Track {
  constructor(v0) { this.keys = [{ t: -1e9, v: v0, ease: 'step' }]; }
  last() { return this.keys[this.keys.length - 1]; }
  valueBefore(t) { return this.at(t - 1e-6); }
  /** set instantly at t */
  set(t, v) { this.add(t - 1e-4, this.at(t - 1e-4), 'step'); this.add(t, v, 'step'); return this; }
  /** move from the value at t0 to v by t0+dur */
  to(t0, dur, v, e = 'inOutSine') { const cur = this.at(t0); this.add(t0, cur, e); this.add(t0 + Math.max(dur, 1e-3), v, 'step'); return this; }
  add(t, v, e = 'step') {
    const k = { t, v: Array.isArray(v) ? [...v] : v, ease: e };
    let i = this.keys.length; while (i > 0 && this.keys[i - 1].t > t) i--;
    // drop keys that a later edit overrides (same time)
    if (i > 0 && Math.abs(this.keys[i - 1].t - t) < 1e-9) this.keys[i - 1] = k; else this.keys.splice(i, 0, k);
    return this;
  }
  at(t) {
    const K = this.keys; let i = K.length - 1;
    while (i > 0 && K[i].t > t) i--;
    const a = K[i], b = K[i + 1];
    if (!b || a.ease === 'step') return a.v;
    const u = ease(a.ease)((t - a.t) / (b.t - a.t));
    return Array.isArray(a.v) ? a.v.map((x, j) => lerp(x, b.v[j], u)) : lerp(a.v, b.v, u);
  }
}
