/**
 * test-3d audio: original procedural SFX + an original cinematic music bed (no samples, no downloads, no third-party material).
 * SFX cue names the film can emit: tick, pour (dur), thud, whoosh, riser (dur), hit, ding, coin, tap.
 * Everything is mixed here in TypeScript into plain 16-bit 48 kHz stereo wavs (44-byte header, so kids3d `duckWav` works on them).
 */
import fs from 'node:fs';
import path from 'node:path';
export { duckWav } from '../../kids3d/src/audio.ts';

export const SR = 48000;
export interface Cue { name: string; t: number; db: number; dur?: number }

function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const env = (t: number, a: number, d: number) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
const N = (s: number) => new Float32Array(Math.max(1, Math.round(SR * s)));
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);
const dbLin = (d: number) => Math.pow(10, d / 20);
function lowpass(x: Float32Array, cutoff: (i: number) => number) { const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { const a = 1 - Math.exp(-2 * Math.PI * cutoff(i) / SR); s += a * (x[i] - s); y[i] = s; } return y; }
function highpass(x: Float32Array, f: number) { const lp = lowpass(x, () => f); return x.map((v, i) => v - lp[i]); }

/** 16-bit stereo 48 kHz wav, NO normalisation (levels are absolute); a soft knee above 0.9 guards against clipping. */
export function writeWav(file: string, L: Float32Array, R: Float32Array = L) {
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  const sat = (v: number) => { const a = Math.abs(v); return a <= 0.9 ? v : Math.sign(v) * (0.9 + 0.09 * Math.tanh((a - 0.9) / 0.09)); };
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.round(sat(L[i]) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(sat(R[i]) * 32767), 46 + i * 4); }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
  return file;
}

/** mono float samples of a 16-bit PCM wav (any channel count / rate; header parsed) */
export function readWavMono(file: string): { x: Float32Array; sr: number } {
  const b = fs.readFileSync(file);
  let o = 12, ch = 1, sr = SR, data = 44, len = b.length - 44;
  while (o + 8 <= b.length) {
    const id = b.toString('ascii', o, o + 4), sz = b.readUInt32LE(o + 4);
    if (id === 'fmt ') { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); }
    if (id === 'data') { data = o + 8; len = Math.min(sz, b.length - data); break; }
    o += 8 + sz + (sz & 1);
  }
  const n = Math.floor(len / (2 * ch)), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < ch; c++) s += b.readInt16LE(data + (i * ch + c) * 2); x[i] = s / ch / 32768; }
  return { x, sr };
}

/** RMS dBFS of a wav inside [t0,t1] spans (whole file when spans omitted) */
export function rmsDb(file: string, spans?: [number, number][], offset = 0) {
  const { x, sr } = readWavMono(file);
  let ss = 0, n = 0;
  const parts = spans ?? [[0, x.length / sr]];
  for (const [a, e] of parts) for (let i = Math.max(0, Math.floor((a - offset) * sr)); i < Math.min(x.length, Math.ceil((e - offset) * sr)); i++) { ss += x[i] * x[i]; n++; }
  return n ? +(10 * Math.log10(ss / n + 1e-12)).toFixed(1) : null;
}

/* ------------------------------------------------------------------ SFX */
/** one rice grain lands on marble: tiny dry click (4 variants so a run of ticks is not a machine gun) */
function tick(v = 0) {
  const x = N(0.05), r = rng(101 + v * 17), f1 = 3100 + v * 260, f2 = 5200 - v * 180, body = 820 + v * 70;
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (r() * 2 - 1) * env(t, 0.0002, 0.0012) * 0.9 + Math.sin(2 * Math.PI * f1 * t) * env(t, 0.0003, 0.004) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * env(t, 0.0002, 0.0025) * 0.4 + Math.sin(2 * Math.PI * body * t) * env(t, 0.0005, 0.007) * 0.35; }
  return highpass(x, 300);
}
const norm8 = (x: Float32Array) => { let p = 0; for (const v of x) p = Math.max(p, Math.abs(v)); return p > 0 ? x.map(v => v * 0.8 / p) : x; };
/** one coin set down on marble or on a coin stack: bright metallic clink with a short ring (~0.25 s); 4 variants */
function coin(v = 0) {
  const x = N(0.28), r = rng(701 + v * 23), f1 = 2650 + v * 310, f2 = f1 * 1.51, f3 = f1 * 2.32, f4 = 5900 + v * 240;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = (r() * 2 - 1) * env(t, 0.0001, 0.0008) * 0.7 + Math.sin(2 * Math.PI * f4 * t) * env(t, 0.0002, 0.003) * 0.35
      + (Math.sin(2 * Math.PI * f1 * t) * 0.55 + Math.sin(2 * Math.PI * f2 * t + 1) * 0.3 + Math.sin(2 * Math.PI * f3 * t + 2) * 0.18) * env(t, 0.0003, 0.07 + v * 0.008);
  }
  for (let i = 0; i < x.length; i++) x[i] *= Math.min(1, (0.28 - i / SR) / 0.04);
  return norm8(highpass(x, 700));
}
/** small chess piece set down firmly on marble: short dull knock, no ring (~0.09 s) */
function tap() {
  const x = N(0.09), r = rng(809);
  let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (150 + 90 * Math.exp(-t * 60)) / SR; x[i] = Math.sin(ph) * env(t, 0.0006, 0.014) * 0.9 + (r() * 2 - 1) * env(t, 0.0002, 0.003) * 0.5; }
  const y = lowpass(x, i => (i / SR < 0.01 ? 3200 : 1100));
  for (let i = 0; i < y.length; i++) y[i] *= Math.min(1, (0.09 - i / SR) / 0.02);
  return norm8(y);
}
/** rice pouring: dense grains (granular clicks) + a soft hiss bed */
function pour(dur = 1.5) {
  dur = Math.max(0.3, Math.min(12, dur));
  const x = N(dur + 0.25), r = rng(211), n = x.length;
  const shape = (t: number) => Math.min(1, t / 0.12) * Math.min(1, Math.max(0, (dur + 0.2 - t) / 0.35));
  for (let i = 0; i < n; i++) x[i] = (r() * 2 - 1) * 0.07 * shape(i / SR);
  let hiss = lowpass(highpass(x, 2200), () => 7000);
  const grains = Math.round(dur * 320);
  for (let g = 0; g < grains; g++) {
    const st = r() * dur, f = 2400 + r() * 3800, a = (0.18 + r() * 0.35) * shape(st), s0 = Math.round(st * SR);
    for (let k = 0; k < 0.006 * SR && s0 + k < n; k++) { const t = k / SR; hiss[s0 + k] += Math.sin(2 * Math.PI * f * t) * env(t, 0.0002, 0.0015) * a; }
  }
  return hiss;
}
/** heavy metal chess piece falls on stone and rolls */
function thud() {
  const x = N(1.8), r = rng(307);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += 2 * Math.PI * (52 + 60 * Math.exp(-t * 25)) / SR;
    const impact = Math.sin(ph) * env(t, 0.002, 0.16) * 0.9 + (r() * 2 - 1) * env(t, 0.0005, 0.012) * 0.7;
    const ring = (Math.sin(2 * Math.PI * 431 * t) * 0.25 + Math.sin(2 * Math.PI * 1127 * t) * 0.16 + Math.sin(2 * Math.PI * 2213 * t) * 0.08) * env(t, 0.001, 0.35);
    // roll: wobbling grind after the hit, knock rate slowing down
    const tr = t - 0.22, roll = tr > 0 && tr < 1.4 ? (r() * 2 - 1) * 0.18 * (0.55 + 0.45 * Math.sin(2 * Math.PI * (9 - 4 * tr) * tr)) * Math.min(1, tr / 0.05) * Math.max(0, 1 - tr / 1.4) : 0;
    x[i] = impact + ring + roll;
  }
  const y = lowpass(x, i => (i / SR < 0.22 ? 6000 : 1600));
  for (const k of [0.36, 0.55, 0.78, 1.05]) { const s0 = Math.round((0.22 + k) * SR); for (let j = 0; j < 0.05 * SR && s0 + j < y.length; j++) { const t = j / SR; y[s0 + j] += (Math.sin(2 * Math.PI * 180 * t) + 0.4 * Math.sin(2 * Math.PI * 610 * t)) * env(t, 0.001, 0.02) * 0.25 * (1.2 - k); } }
  return y;
}
function whoosh() {
  const x = N(0.65), r = rng(401);
  for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1;
  const y = lowpass(x, i => 250 + 3200 * Math.sin(Math.PI * i / x.length) ** 2);
  for (let i = 0; i < y.length; i++) y[i] *= Math.sin(Math.PI * i / y.length) ** 2 * 1.2;
  return y;
}
/** tension riser: rising detuned tone + opening noise, crescendo, quick release at the end */
function riser(dur = 2) {
  dur = Math.max(0.5, Math.min(20, dur));
  const x = N(dur + 0.08), r = rng(503), n = x.length;
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, u = Math.min(1, t / dur), f = 110 * Math.pow(6, u);
    p1 += 2 * Math.PI * f / SR; p2 += 2 * Math.PI * f * 1.007 / SR; p3 += 2 * Math.PI * f * 1.5 / SR;
    const g = Math.pow(u, 2.2) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.08) : 1);
    x[i] = (Math.sin(p1) * 0.35 + Math.sin(p2) * 0.3 + Math.sin(p3) * 0.15 + (r() * 2 - 1) * 0.35 * u) * g;
  }
  return lowpass(x, i => 600 + 7000 * Math.pow(Math.min(1, i / (dur * SR)), 2));
}
/** low cinematic impact */
function hit() {
  const x = N(2.4), r = rng(601);
  let ph = 0;
  for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (38 + 70 * Math.exp(-t * 14)) / SR; x[i] = Math.sin(ph) * env(t, 0.003, 0.7) + (r() * 2 - 1) * env(t, 0.001, 0.05) * 0.8 + (r() * 2 - 1) * env(t, 0.01, 0.6) * 0.12; }
  return lowpass(x, i => 300 + 4000 * Math.exp(-i / SR * 8));
}
function ding() {
  const x = N(1.8);
  for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1318.5 * t) * env(t, 0.003, 0.6) * 0.5 + Math.sin(2 * Math.PI * 1318.5 * 2.76 * t) * env(t, 0.002, 0.12) * 0.18 + Math.sin(2 * Math.PI * 659.25 * t) * env(t, 0.004, 0.8) * 0.22); }
  return x;
}

/** soft two-note chime (A5 then D6), long gentle decay: a chapter mark under narration, not a notification ping */
function chime() {
  const x = N(2.2);
  for (const [f, at, a] of [[880, 0, 0.45], [1174.66, 0.14, 0.38]] as const) {
    const s0 = Math.round(at * SR);
    for (let i = s0; i < x.length; i++) { const t = (i - s0) / SR; x[i] += (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(2 * Math.PI * f * 2.76 * t) * env(t, 0.002, 0.15) + 0.12 * Math.sin(2 * Math.PI * f * 0.5 * t)) * env(t, 0.004, 0.75) * a; }
  }
  return x;
}
/** airy swell (filtered noise, no pitch) rising over `dur` s and stopping softly: leads into a chapter or a reveal */
function swell(dur = 1.6) {
  dur = Math.max(0.4, Math.min(8, dur));
  const x = N(dur + 0.25), r = rng(1103);
  for (let i = 0; i < x.length; i++) { const t = i / SR, u = Math.min(1, t / dur); x[i] = (r() * 2 - 1) * Math.pow(u, 2.4) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.25) : 1); }
  return lowpass(highpass(x, 180), i => 400 + 5200 * Math.pow(Math.min(1, i / (dur * SR)), 1.6));
}

/** SFX registry: a film cue name -> generator(dur, variant). Add a sound = add one entry here (and list it in docs/brands/test-3d/build.md);
 *  any name not in this table fails the build. */
const SFX: Record<string, (dur?: number, variant?: number) => Float32Array> = {
  tick: (_d, v = 0) => tick(v % 4), pour: (d) => pour(d), thud: () => thud(), whoosh: () => whoosh(), riser: (d) => riser(d), hit: () => hit(),
  ding: () => ding(), coin: (_d, v = 0) => coin(v % 4), tap: () => tap(), chime: () => chime(), swell: (d) => swell(d),
};
export const SFX_NAMES = Object.keys(SFX);
export function sfx(name: string, dur?: number, variant = 0): Float32Array {
  const g = SFX[name];
  if (!g) throw new Error(`sfx "${name}" unknown (have: ${SFX_NAMES.join(', ')})`);
  return g(dur, variant);
}

/** Lay mono/stereo 16-bit wav clips at their times into ONE stereo wav of `dur` s (long-form narration: one timeline item instead of 150). gainDb per clip. */
export function mixClips(file: string, items: { file: string; at: number; gainDb?: number }[], dur: number) {
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  for (const it of items) {
    const { x, sr } = readWavMono(it.file);
    if (sr !== SR) throw new Error(`mixClips: ${it.file} is ${sr} Hz (want ${SR})`);
    const g = dbLin(it.gainDb ?? 0), s0 = Math.round(it.at * SR);
    for (let i = 0; i < x.length; i++) { const k = s0 + i; if (k >= 0 && k < n) { L[k] += x[i] * g; R[k] += x[i] * g; } }
  }
  return writeWav(file, L, R);
}
/** reference peak of each sound before cue gain: cue db = level of the sound's peak (dBFS) */
const peakNorm = (y: Float32Array) => { let p = 0; for (const v of y) p = Math.max(p, Math.abs(v)); return p > 0 ? 1 / p : 1; };

/** Mix every cue into ONE stereo wav of `dur` seconds (one timeline item instead of hundreds of tick inputs). */
export function mixSfx(file: string, cues: Cue[], dur: number) {
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n), cache = new Map<string, Float32Array>(), r = rng(907);
  let ticks = 0, coins = 0, used = 0;
  const last = new Map<string, number>();
  for (const c of [...cues].sort((a, b) => a.t - b.t)) {
    if (!(SFX_NAMES as readonly string[]).includes(c.name)) throw new Error(`film sfx cue "${c.name}" unknown (have: ${SFX_NAMES.join(', ')})`);
    if ((c.name === 'tick' || c.name === 'coin') && (last.get(c.name) ?? -1) > c.t - 0.012) continue;   // closer than 12 ms = one click
    last.set(c.name, c.t);
    const v = c.name === 'tick' ? ticks++ % 4 : c.name === 'coin' ? coins++ % 4 : 0, key = `${c.name}:${v}:${c.dur != null ? c.dur.toFixed(2) : ''}`;
    let y = cache.get(key); if (!y) { y = sfx(c.name, c.dur, v); const k = peakNorm(y); y = y.map(s => s * k); cache.set(key, y); }
    const g = dbLin(c.db ?? -12), pan = c.name === 'tick' || c.name === 'coin' ? 0.5 + (r() - 0.5) * 0.5 : 0.5, s0 = Math.round(c.t * SR);
    for (let i = 0; i < y.length && s0 + i < n; i++) if (s0 + i >= 0) { L[s0 + i] += y[i] * g * Math.sqrt(2 * (1 - pan)) * 0.71; R[s0 + i] += y[i] * g * Math.sqrt(2 * pan) * 0.71; }
    used++;
  }
  writeWav(file, L, R);
  return { file, cues: used };
}

/* ------------------------------------------------------------------ music bed */
export interface BedMarks {
  /** rise starts (line l08 begins) */ riseStart: number;
  /** rise resolves (line l11 begins) */ resolve: number;
  /** calmer, warmer second half begins (line l11 ends) */ calm: number;
  /** soft swell under l15-l16 */ swell0: number; swell1: number;
}

/**
 * Original bed for test-3d, exactly `dur` s: D minor, slow and tense. Low drone (D1/D2/A2) through a slowly breathing filter, a sparse
 * soft pulse; from riseStart the pulse interval HALVES stage by stage (1 s, 0.5, 0.25, 0.125: the doubling) while a dissonant string
 * cluster glides up an octave and the filter opens; at `resolve` a low boom + D minor chord that decays; after `calm` a warm pad
 * (F - C - Dm - Bb) with sparse soft bell notes, one swell under swell0..swell1. Normalised to -20 dBFS RMS (duck it with duckWav).
 */
export function musicBed(file: string, dur: number, m: BedMarks, seed = 5) {
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n), r = rng(seed);
  const sm = (a: number, b: number, t: number) => { const u = Math.max(0, Math.min(1, (t - a) / Math.max(1e-3, b - a))); return u * u * (3 - 2 * u); };
  // 1) drone (fades out over 2.5 s after the resolve chord has rung)
  const dr = new Float32Array(n), drR = new Float32Array(n);
  const fD1 = midi(26), fD2 = midi(38), fA2 = midi(45);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = 0.5 * sm(0, 3, t) * (1 - sm(m.calm, m.calm + 3, t) * 0.75) * (1 + 0.6 * sm(m.riseStart, m.resolve, t));
    let a = Math.sin(2 * Math.PI * fD1 * t) * 0.6, b = 0, c = 0;
    for (let k = 1; k <= 6; k++) { b += Math.sin(2 * Math.PI * fD2 * k * t + k) / k; c += Math.sin(2 * Math.PI * fA2 * k * 1.0015 * t + 2 * k) / k; }
    const breathe = 0.75 + 0.25 * Math.sin(2 * Math.PI * t / 9);
    dr[i] = (a + b * 0.35 * breathe + c * 0.18) * g;
    drR[i] = (a + b * 0.3 * breathe + c * 0.24) * g;
  }
  const cut = (i: number) => { const t = i / SR; return 260 + 900 * sm(m.riseStart, m.resolve, t) * (1 - sm(m.resolve, m.resolve + 1.5, t)) + 60 * Math.sin(2 * Math.PI * t / 11); };
  const dl = lowpass(lowpass(dr, cut), cut), drl = lowpass(lowpass(drR, cut), cut);
  for (let i = 0; i < n; i++) { L[i] += dl[i]; R[i] += drl[i]; }
  // 2) pulse: soft low thumps; sparse before the rise, interval halves during it, gone after the resolve
  const thump = (at: number, amp: number) => { const s0 = Math.round(at * SR); let ph = 0; for (let i = 0; i < 0.35 * SR && s0 + i < n; i++) { const t = i / SR; ph += 2 * Math.PI * (48 + 40 * Math.exp(-t * 30)) / SR; const v = Math.sin(ph) * env(t, 0.006, 0.12) * amp; L[s0 + i] += v; R[s0 + i] += v; } };
  for (let t = 1.2; t < m.riseStart; t += 2.0) thump(t, 0.5);
  { const span = m.resolve - m.riseStart, stages = [1, 0.5, 0.25, 0.125];
    let t = m.riseStart;
    while (t < m.resolve - 0.06) { const k = Math.min(3, Math.floor((t - m.riseStart) / span * 4)); thump(t, 0.4 + 0.35 * (t - m.riseStart) / span); t += stages[k]; } }
  // 3) rise: dissonant string cluster (D4 + Eb4 + A4) gliding up an octave, crescendo, cut at the resolve
  { const s0 = Math.round(m.riseStart * SR), s1 = Math.round(m.resolve * SR), len = s1 - s0, x = new Float32Array(Math.max(1, len)), xr = new Float32Array(Math.max(1, len)), ph = [0, 0, 0, 0, 0, 0];
    const notes = [62, 63, 69];
    for (let i = 0; i < len && s0 + i < n; i++) {
      const u = i / len, glide = Math.pow(2, u), g = Math.pow(u, 1.8) * Math.min(1, (len - i) / (0.03 * SR)) * 0.22, trem = 0.8 + 0.2 * Math.sin(2 * Math.PI * (5 + 6 * u) * i / SR);
      let a = 0, b = 0;
      notes.forEach((nn, k) => { const f = midi(nn) * glide; ph[k] += 2 * Math.PI * f / SR; ph[k + 3] += 2 * Math.PI * f * 1.004 / SR; for (let h = 1; h <= 4; h++) { a += Math.sin(ph[k] * h) / h; b += Math.sin(ph[k + 3] * h) / h; } });
      x[i] = a * g * trem; xr[i] = b * g * trem;
    }
    const f = (i: number) => 700 + 4000 * (i / len) ** 2, y = lowpass(x, f), yr = lowpass(xr, f);
    for (let i = 0; i < len && s0 + i < n; i++) { L[s0 + i] += y[i]; R[s0 + i] += yr[i]; } }
  // 4) resolve: low boom + D minor chord (D3 F3 A3 D4) that rings and decays
  { const s0 = Math.round(m.resolve * SR); let ph = 0;
    for (let i = 0; i < 6 * SR && s0 + i < n; i++) {
      const t = i / SR; ph += 2 * Math.PI * (40 + 50 * Math.exp(-t * 10)) / SR;
      let v = Math.sin(ph) * env(t, 0.004, 0.9) * 0.9;
      [50, 53, 57, 62].forEach((nn, k) => { const f = midi(nn); v += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env(t, 0.02, 1.8) * 0.12 * (k === 1 ? 1.1 : 1); });
      L[s0 + i] += v; R[s0 + i] += v;
    } }
  // 5) calm, warm second half: pad F - C - Dm - Bb (4 s each), sparse soft bells, one swell under swell0..swell1
  { const prog = [[53, 57, 60, 65], [48, 55, 60, 64], [50, 57, 62, 65], [46, 53, 58, 62]], bar = 4;
    const swell = (t: number) => 1 + 1.4 * sm(m.swell0 - 0.5, m.swell0 + 2.5, t) * (1 - sm(m.swell1, m.swell1 + 2.5, t));
    for (let b = 0, t0 = m.calm - 0.5; t0 < dur; b++, t0 += bar) {
      const ch = prog[b % 4], s0 = Math.round(t0 * SR), len = Math.round((bar + 1.2) * SR);
      ch.forEach((nn, j) => { const f = midi(nn);
        for (let i = 0; i < len && s0 + i < n; i++) {
          if (s0 + i < 0) continue;
          const t = i / SR, abs = t0 + t, e = Math.min(1, t / 1.4, (bar + 1.2 - t) / 1.2) * sm(m.calm - 0.5, m.calm + 2.5, abs) * swell(abs);
          const v = (Math.sin(2 * Math.PI * f * t) + 0.35 * Math.sin(2 * Math.PI * f * 2.003 * t) + 0.12 * Math.sin(2 * Math.PI * f * 3.01 * t)) * e * 0.06;
          L[s0 + i] += v * (j % 2 ? 0.75 : 1); R[s0 + i] += v * (j % 2 ? 1 : 0.75);
        } });
      // soft bell notes: two per bar at most, chord tones an octave up
      for (let k = 0; k < 2; k++) if (r() < 0.7) { const at = t0 + 0.6 + k * 2 + r() * 0.4, f = midi(ch[1 + Math.floor(r() * 3)] + 12), q = Math.round(at * SR), pan = 0.3 + r() * 0.4;
        for (let i = 0; i < 2.5 * SR && q + i < n; i++) { if (q + i < 0) continue; const t = i / SR, v = (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 2.01 * t) * env(t, 0.002, 0.2)) * env(t, 0.004, 0.7) * 0.07 * swell(at); L[q + i] += v * (1 - pan) * 1.4; R[q + i] += v * pan * 1.4; } }
    } }
  // fades + soften the top
  for (let i = 0; i < n; i++) { const t = i / SR, g = Math.min(1, t / 0.6, Math.max(0, dur - t) / 1.2); L[i] *= g; R[i] *= g; }
  const Lf = lowpass(L, () => 8000), Rf = lowpass(R, () => 8000);
  let ss = 0; for (let i = 0; i < n; i++) ss += (Lf[i] * Lf[i] + Rf[i] * Rf[i]) / 2;
  const k = dbLin(-20) / Math.sqrt(ss / Math.max(1, n) + 1e-12);
  for (let i = 0; i < n; i++) { Lf[i] *= k; Rf[i] *= k; }
  return writeWav(file, Lf, Rf);
}

/* ------------------------------------------------------------------ long-form music bed (9-12 min) */
export const MOODS = ['calm', 'curious', 'tension', 'rise', 'drop', 'warm'] as const;
export type Mood = typeof MOODS[number];
export interface BedSection { id?: string; t0: number; t1: number; mood: Mood }

interface MoodSpec { bank: 'minor' | 'dark' | 'major'; chord: number; pad: number; bright: number; drone: number; droneP: number; bells: number; arp: number; arpStep: number; pulse: number; cluster: number; air: number; levelDb: number }
/** chord = seconds per chord (jittered +-15 %), pad/drone = layer gains, bright = upper partials, droneP = drone darkness, bells = chance per half bar,
 *  arp = chance per bar, pulse = seconds between thumps (-1 rise halving, -2 heartbeat), cluster/air = gains, levelDb = section RMS before the global normalisation */
const MOOD: Record<Mood, MoodSpec> = {
  calm:    { bank: 'minor', chord: 8, pad: 0.07, bright: 0.25, drone: 0.20, droneP: 2.4, bells: 0.55, arp: 0, arpStep: 0.5, pulse: 0, cluster: 0, air: 0, levelDb: -22 },
  curious: { bank: 'minor', chord: 6, pad: 0.05, bright: 0.35, drone: 0.14, droneP: 2.2, bells: 0.25, arp: 0.75, arpStep: 0.375, pulse: 0, cluster: 0, air: 0, levelDb: -21 },
  tension: { bank: 'dark', chord: 8, pad: 0.025, bright: 0.15, drone: 0.34, droneP: 1.7, bells: 0, arp: 0, arpStep: 0.5, pulse: 2.0, cluster: 0.5, air: 0.5, levelDb: -20 },
  rise:    { bank: 'dark', chord: 6, pad: 0.03, bright: 0.2, drone: 0.3, droneP: 1.6, bells: 0, arp: 0.3, arpStep: 0.25, pulse: -1, cluster: 1, air: 0.35, levelDb: -20 },
  drop:    { bank: 'minor', chord: 9, pad: 0.045, bright: 0.18, drone: 0.26, droneP: 2.0, bells: 0.15, arp: 0, arpStep: 0.5, pulse: -2, cluster: 0, air: 0.2, levelDb: -22 },
  warm:    { bank: 'major', chord: 6, pad: 0.075, bright: 0.5, drone: 0.1, droneP: 2.6, bells: 0.6, arp: 0.35, arpStep: 0.75, pulse: 0, cluster: 0, air: 0, levelDb: -21 },
};
const CH: Record<string, number[]> = {
  Dm: [50, 57, 62, 65], Bb: [46, 53, 58, 62], F: [53, 57, 60, 65], C: [48, 55, 60, 64], Gm: [50, 55, 58, 62], A: [49, 52, 57, 61], Am: [52, 57, 60, 64], Eb: [51, 55, 58, 63],
};
const BANKS: Record<MoodSpec['bank'], string[][]> = {
  minor: [['Dm', 'Bb', 'F', 'C'], ['Dm', 'Gm', 'Bb', 'A'], ['Dm', 'C', 'Bb', 'C'], ['Gm', 'Dm', 'Bb', 'F'], ['Dm', 'Bb', 'Gm', 'A']],
  dark: [['Dm', 'Eb', 'Dm', 'C'], ['Dm', 'Dm', 'Bb', 'A'], ['Dm', 'Gm', 'Dm', 'Eb']],
  major: [['F', 'C', 'Dm', 'Bb'], ['Bb', 'F', 'C', 'Dm'], ['F', 'Am', 'Bb', 'C'], ['Bb', 'C', 'F', 'F']],
};

/** one section of the bed in its own buffer (starting at film time `a`): every layer of the mood, then scaled to the mood's RMS level */
function bedSection(sec: BedSection, a: number, b: number, r: () => number, prevMood: Mood | null): [Float32Array, Float32Array] {
  const M = MOOD[sec.mood], n = Math.max(1, Math.round((b - a) * SR)), L = new Float32Array(n), R = new Float32Array(n);
  const span = Math.max(1, sec.t1 - sec.t0), u = (t: number) => Math.max(0, Math.min(1, (t - sec.t0) / span));   // progress through the chapter
  const add = (i: number, l: number, rr: number) => { if (i >= 0 && i < n) { L[i] += l; R[i] += rr; } };
  // 1) drone on the tonic (D for minor/dark, F for major); brightness breathes on a per-section period and opens up through a rise
  { const root = M.bank === 'major' ? 29 : 26, fs = [midi(root), midi(root + 12), midi(root + 19)], per = 7 + r() * 6, ph0 = r() * 6.28;
    const ph = new Float64Array(15);
    for (let i = 0; i < n; i++) {
      const t = a + i / SR, br = M.droneP - (sec.mood === 'rise' ? 1.0 * u(t) : 0) - 0.35 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / per + ph0));
      let l = 0, rr = 0;
      for (let s = 0; s < 3; s++) for (let k = 1; k <= 5; k++) {
        const j = s * 5 + k - 1; ph[j] += 2 * Math.PI * fs[s] * k * (s === 2 ? 1.0015 : 1) / SR;
        const v = Math.sin(ph[j]) / Math.pow(k, br) * (s === 0 ? 0.6 : s === 1 ? 0.35 : 0.2);
        l += v * (s === 2 ? 0.8 : 1); rr += v * (s === 2 ? 1.2 : 1);
      }
      const g = M.drone * (sec.mood === 'rise' ? 0.7 + 0.6 * u(t) : 1); L[i] += l * g; R[i] += rr * g;
    } }
  // 2) chords: pad + bells + arp over one progression of the mood's bank; chord lengths jittered so bars never line up into a loop
  const prog = BANKS[M.bank][Math.floor(r() * BANKS[M.bank].length)];
  for (let c = 0, t0 = a; t0 < b; c++) {
    const len = M.chord * (0.85 + r() * 0.3), ch = CH[prog[c % prog.length]];
    if (M.pad > 0) ch.forEach((nn, j) => {
      const f = midi(nn), s0 = Math.round((t0 - a) * SR), m = Math.round((len + 1.6) * SR), det = 1 + (r() - 0.5) * 0.002;
      for (let i = 0; i < m; i++) {
        const t = i / SR, e = Math.min(1, t / 1.4, Math.max(0, len + 1.6 - t) / 1.6);
        const v = (Math.sin(2 * Math.PI * f * det * t) + M.bright * 1.4 * Math.sin(2 * Math.PI * f * 2.003 * t) + M.bright * 0.5 * Math.sin(2 * Math.PI * f * 3.01 * t)) * e * M.pad;
        add(s0 + i, v * (j % 2 ? 0.75 : 1), v * (j % 2 ? 1 : 0.75));
      } });
    for (let k = 0; k < 2; k++) if (r() < M.bells) {
      const at = t0 + 0.6 + k * len / 2 + r() * 0.5, f = midi(ch[1 + Math.floor(r() * 3)] + 12), q = Math.round((at - a) * SR), pan = 0.3 + r() * 0.4;
      for (let i = 0; i < 2.5 * SR; i++) { const t = i / SR, v = (Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 2.01 * t) * env(t, 0.002, 0.2)) * env(t, 0.004, 0.7) * 0.07; add(q + i, v * (1 - pan) * 1.4, v * pan * 1.4); }
    }
    if (M.arp > 0 && r() < M.arp) {   // soft plucked chord tones, 25 % rests, up or down per bar
      const up = r() < 0.6, oct = sec.mood === 'warm' ? 12 : 24, step = sec.mood === 'rise' ? M.arpStep * (1 - 0.5 * u(t0)) : M.arpStep;
      for (let k = 0, at = t0 + 0.2; at < t0 + len - 0.2; k++, at += step) {
        if (r() < 0.25) continue;
        const f = midi(ch[up ? k % 4 : 3 - (k % 4)] + oct), q = Math.round((at - a) * SR), pan = k % 2 ? 0.35 : 0.65;
        for (let i = 0; i < 0.6 * SR; i++) { const t = i / SR, v = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t) * env(t, 0.001, 0.05)) * env(t, 0.003, 0.22) * 0.05; add(q + i, v * (1 - pan) * 1.4, v * pan * 1.4); }
      }
    }
    t0 += len;
  }
  // 3) pulse: tension = soft thump every ~2 s; rise = the interval halves stage by stage (2, 1, 0.5, 0.25 s) with a crescendo; drop = slow heartbeat pairs
  const thump = (at: number, amp: number) => { const s0 = Math.round((at - a) * SR); let ph = 0; for (let i = 0; i < 0.35 * SR; i++) { const t = i / SR; ph += 2 * Math.PI * (48 + 40 * Math.exp(-t * 30)) / SR; const v = Math.sin(ph) * env(t, 0.006, 0.12) * amp; add(s0 + i, v, v); } };
  if (M.pulse > 0) for (let t = sec.t0 + 0.8; t < sec.t1; t += M.pulse * (0.95 + r() * 0.1)) thump(t, 0.4);
  if (M.pulse === -1) { const st = [2, 1, 0.5, 0.25]; for (let t = sec.t0 + 0.5; t < sec.t1 - 0.06;) { const k = Math.min(3, Math.floor(u(t) * 4)); thump(t, 0.3 + 0.4 * u(t)); t += st[k]; } }
  if (M.pulse === -2) for (let t = sec.t0 + 2.2; t < sec.t1; t += 2.4 + r() * 0.4) { thump(t, 0.32); thump(t + 0.28, 0.22); }
  // 4) dissonant string cluster (D4 Eb4 A4): tension = slow swells on a 10-14 s period; rise = glides up an octave over the chapter with a crescendo
  if (M.cluster > 0) {
    const notes = [62, 63, 69].map(midi), ph = new Float64Array(6), per = 10 + r() * 4, ph0 = r() * 6.28;
    for (let i = 0; i < n; i++) {
      const t = a + i / SR, p = u(t), glide = sec.mood === 'rise' ? Math.pow(2, p) : 1;
      const g = sec.mood === 'rise' ? Math.pow(p, 1.6) * 0.2 : 0.11 * Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * t / per + ph0), 2), trem = 0.8 + 0.2 * Math.sin(2 * Math.PI * (5 + 6 * p) * t);
      let l = 0, rr = 0;
      for (let k = 0; k < 3; k++) { const f = notes[k] * glide; ph[k] += 2 * Math.PI * f / SR; ph[k + 3] += 2 * Math.PI * f * 1.004 / SR; if (g > 1e-4) for (let h = 1; h <= 3; h++) { l += Math.sin(ph[k] * h) / h; rr += Math.sin(ph[k + 3] * h) / h; } }
      L[i] += l * g * trem * M.cluster; R[i] += rr * g * trem * M.cluster;
    }
  }
  // 5) air: low noise wind with a slow swell (tension / rise / drop)
  if (M.air > 0) { let sl = 0, sr = 0; const per = 9 + r() * 5, ph0 = r() * 6.28;
    for (let i = 0; i < n; i++) { const t = a + i / SR, g = M.air * 0.24 * (0.6 + 0.4 * Math.sin(2 * Math.PI * t / per + ph0)); sl += 0.06 * ((r() * 2 - 1) - sl); sr += 0.06 * ((r() * 2 - 1) - sr); L[i] += sl * g; R[i] += sr * g; } }
  // 6) boom + chord ring at the chapter start: always for a drop, and for any chapter after a rise (the rise resolves into it)
  if (sec.mood === 'drop' || prevMood === 'rise') { const s0 = Math.round((sec.t0 - a) * SR); let ph = 0;
    for (let i = 0; i < 6 * SR; i++) { const t = i / SR; ph += 2 * Math.PI * (40 + 50 * Math.exp(-t * 10)) / SR; let v = Math.sin(ph) * env(t, 0.004, 0.9) * 0.9;
      [50, 53, 57, 62].forEach((nn, k) => { const f = midi(nn); v += (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t)) * env(t, 0.02, 1.8) * 0.12 * (k === 1 ? 1.1 : 1); });
      add(s0 + i, v, v); } }
  // level: the section's own RMS inside the chapter (not the cross-fade tails) set to the mood level
  const i0 = Math.max(0, Math.round((sec.t0 - a) * SR)), i1 = Math.min(n, Math.round((sec.t1 - a) * SR));
  let ss = 0; for (let i = i0; i < i1; i++) ss += (L[i] * L[i] + R[i] * R[i]) / 2;
  const k = dbLin(M.levelDb) / Math.sqrt(ss / Math.max(1, i1 - i0) + 1e-12);
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return [L, R];
}

/**
 * Long-form bed, exactly `dur` s: one section per chapter (mood from film.json chapters[i].mood), each with its own chord progression,
 * chord lengths, breathing periods and random bells/arps (seeded per chapter), so nothing repeats on a fixed loop. Sections overlap by
 * 2 x xf s and cross-fade on equal-power curves; a soft airy swell leads into a chapter whose mood changes. Normalised to
 * -20 dBFS RMS like the Short bed (duck it with duckWav).
 */
export function musicBedLong(file: string, dur: number, sections: BedSection[], seed = 7, xf = 2.5) {
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
  sections.forEach((sec, i) => {
    const first = i === 0, last = i === sections.length - 1;
    const a = first ? 0 : Math.max(0, sec.t0 - xf), b = last ? dur : Math.min(dur, sec.t1 + xf);
    const [sl, sr] = bedSection(sec, a, b, rng(seed * 1009 + i * 7919 + 1), first ? null : sections[i - 1].mood);
    const s0 = Math.round(a * SR);
    for (let k = 0; k < sl.length; k++) {
      const t = a + k / SR;
      let g = 1;
      if (!first) g *= Math.sin(Math.PI / 2 * Math.max(0, Math.min(1, (t - (sec.t0 - xf)) / (2 * xf))));
      if (!last) g *= Math.sin(Math.PI / 2 * Math.max(0, Math.min(1, ((sec.t1 + xf) - t) / (2 * xf))));
      const j = s0 + k; if (j < n) { L[j] += sl[k] * g; R[j] += sr[k] * g; }
    }
    if (!first && sec.mood !== sections[i - 1].mood) {   // airy swell into the new mood, ending at the chapter start
      const sw = sfx('swell', 1.8), at = Math.round((sec.t0 - 1.8) * SR);
      let p = 0; for (const v of sw) p = Math.max(p, Math.abs(v));
      const g = dbLin(-24) / Math.max(1e-6, p);
      for (let k = 0; k < sw.length; k++) { const j = at + k; if (j >= 0 && j < n) { L[j] += sw[k] * g * 0.9; R[j] += sw[k] * g * 1.1; } }
    }
  });
  for (let i = 0; i < n; i++) { const t = i / SR, g = Math.min(1, t / 0.6, Math.max(0, dur - t) / 2.5); L[i] *= g; R[i] *= g; }
  let sl = 0, sr = 0; const al = 1 - Math.exp(-2 * Math.PI * 8000 / SR);
  for (let i = 0; i < n; i++) { sl += al * (L[i] - sl); L[i] = sl; sr += al * (R[i] - sr); R[i] = sr; }
  let ss = 0; for (let i = 0; i < n; i++) ss += (L[i] * L[i] + R[i] * R[i]) / 2;
  const k = dbLin(-20) / Math.sqrt(ss / Math.max(1, n) + 1e-12);
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return writeWav(file, L, R);
}
