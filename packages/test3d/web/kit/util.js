// test3d kit: small pure helpers (easing, seeded random, noise, canvases). Everything is deterministic.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };

export const ease = {
  linear: (k) => clamp(k),
  in: (k) => { k = clamp(k); return k * k * k; },
  out: (k) => { k = 1 - clamp(k); return 1 - k * k * k; },
  inOut: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
  inOutQuad: (k) => { k = clamp(k); return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; },
  smooth,
  smoother: (k) => { k = clamp(k); return k * k * k * (k * (k * 6 - 15) + 10); },
  outExpo: (k) => { k = clamp(k); return k >= 1 ? 1 : 1 - Math.pow(2, -10 * k); },
  outBack: (k) => { k = clamp(k) - 1; return 1 + 2.70158 * k * k * k + 1.70158 * k * k; },
};

/** progress 0..1 of t inside [t0, t1], eased */
export const seg = (t, t0, t1, e = ease.inOut) => e(clamp((t - t0) / Math.max(1e-9, t1 - t0)));

/** closed-form damped spring step response: 0 at t <= 0, settles at 1 (freq in Hz, damp 0..1) */
export function spring(t, freq = 3, damp = 0.45) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq, d = clamp(damp, 0.01, 0.999), wd = w * Math.sqrt(1 - d * d);
  return 1 - Math.exp(-d * w * t) * (Math.cos(wd * t) + (d * w / wd) * Math.sin(wd * t));
}

/** keyframes [[t, value], ...] (value = number or array) -> fn(t); e eases every span */
export function keys(list, e = ease.inOut) {
  return (t) => {
    if (t <= list[0][0]) return list[0][1];
    for (let i = 1; i < list.length; i++) {
      if (t <= list[i][0]) {
        const k = e((t - list[i - 1][0]) / (list[i][0] - list[i - 1][0])), a = list[i - 1][1], b = list[i][1];
        return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
      }
    }
    return list[list.length - 1][1];
  };
}

/** seeded random generator (mulberry32): rng(seed)() -> [0, 1) */
export function rng(seed = 1) {
  let a = (seed * 2654435761) >>> 0 || 1;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += f(); return (s - 2) * 1.7320508; };   // ~N(0,1)
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

const h2 = (x, y, s) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1274126177); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** value noise 0..1; period > 0 makes it tile every `period` lattice cells */
export function noise2(x, y, seed = 0, period = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const w = (i) => (period ? ((i % period) + period) % period : i);
  const a = h2(w(xi), w(yi), seed), b = h2(w(xi + 1), w(yi), seed), c = h2(w(xi), w(yi + 1), seed), d = h2(w(xi + 1), w(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, seed = 0, oct = 4, period = 0) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x, y, seed + i * 17, period); n += a; x *= 2; y *= 2; a *= 0.5; if (period) period *= 2; }
  return s / n;
}

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** height (Float32Array, size x size, metres) -> tangent-space normal map canvas; texel = metres per pixel; wraps */
export function normalCanvas(height, size, texel, strength = 1) {
  const c = makeCanvas(size, size), ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  const at = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * texel) * strength, dy = (at(x, y + 1) - at(x, y - 1)) / (2 * texel) * strength;
    const l = 1 / Math.hypot(dx, dy, 1), o = (y * size + x) * 4;
    d[o] = (-dx * l * 0.5 + 0.5) * 255; d[o + 1] = (dy * l * 0.5 + 0.5) * 255; d[o + 2] = (l * 0.5 + 0.5) * 255; d[o + 3] = 255;   // canvas y runs down = +v flipped
  }
  ctx.putImageData(img, 0, 0); return c;
}
