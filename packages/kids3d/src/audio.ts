/**
 * Original procedural audio for kids3d (no samples, no third-party material): SFX library + full-length music bed.
 * SFX ported from the old studio's audio-engine synth (whoosh/pop/ding/sparkle/tap/bell) plus kids3d sounds.
 * Everything is our own work -> rights: original, no attribution.
 */
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
function rng(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }
const env = (t: number, a: number, d: number) => (t < a ? t / a : Math.exp(-(t - a) / d));
function lowpass(x: Float32Array, cutoff: (i: number) => number) { const y = new Float32Array(x.length); let s = 0; for (let i = 0; i < x.length; i++) { const a = 1 - Math.exp(-2 * Math.PI * cutoff(i) / SR); s += a * (x[i] - s); y[i] = s; } return y; }
function highpass(x: Float32Array, f: number) { const lp = lowpass(x, () => f); return x.map((v, i) => v - lp[i]); }

export function writeWav(file: string, L: Float32Array, R: Float32Array = L, peakTo = 0.89) {
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? peakTo / peak : 1, buf = Buffer.alloc(44 + L.length * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + L.length * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(L.length * 4, 40);
  for (let i = 0; i < L.length; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf);
}
const N = (s: number) => new Float32Array(Math.round(SR * s));

export const SFX: Record<string, () => Float32Array> = {
  whoosh() { const x = N(0.5), r = rng(7); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; const y = lowpass(x, i => 300 + 3500 * Math.sin(Math.PI * i / x.length)); for (let i = 0; i < y.length; i++) y[i] *= Math.sin(Math.PI * i / y.length) ** 2; return y; },
  pop() { const x = N(0.16); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (520 + 900 * Math.exp(-t * 40)) / SR; x[i] = Math.sin(ph) * env(t, 0.003, 0.035); } return x; },
  ding() { const x = N(0.9); for (let i = 0; i < x.length; i++) { const t = i / SR; for (const [f, st] of [[1046.5, 0], [1568, 0.09]] as const) if (t >= st) { const tt = t - st; x[i] += (Math.sin(2 * Math.PI * f * tt) + 0.3 * Math.sin(2 * Math.PI * f * 2.01 * tt)) * env(tt, 0.004, 0.25) * 0.5; } } return x; },
  sparkle() { const x = N(0.8), notes = [1318, 1568, 1976, 2637]; for (let i = 0; i < x.length; i++) { const t = i / SR; notes.forEach((f, k) => { const st = k * 0.07; if (t >= st) x[i] += Math.sin(2 * Math.PI * f * (t - st)) * env(t - st, 0.002, 0.14) * 0.35; }); } return x; },
  tap() { const x = N(0.09), r = rng(19); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (380 + 500 * Math.exp(-t * 90)) * t) * env(t, 0.0008, 0.018) + (r() * 2 - 1) * env(t, 0.0003, 0.002) * 0.35; } return lowpass(x, () => 5000); },
  // Pip: two quick rising chirps
  chirp() { const x = N(0.42); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; const k = t < 0.16 ? t : t - 0.2; if (k < 0 || k > 0.16) { x[i] = 0; continue; } const f = 2600 + 1900 * (k / 0.16) + 300 * Math.sin(2 * Math.PI * 38 * k); ph += 2 * Math.PI * f / SR; x[i] = Math.sin(ph) * Math.sin(Math.PI * k / 0.16) ** 1.5 * 0.7; } return x; },
  // hoof clop: two woody knocks
  clop() { const x = N(0.3), r = rng(23); for (let i = 0; i < x.length; i++) { const t = i / SR; for (const [st, f] of [[0, 520], [0.13, 430]] as const) if (t >= st) { const tt = t - st; x[i] += (Math.sin(2 * Math.PI * f * tt) * 0.8 + Math.sin(2 * Math.PI * f * 2.7 * tt) * 0.3 + (r() * 2 - 1) * 0.2) * env(tt, 0.0005, 0.025); } } return lowpass(x, () => 4000); },
  // soft cartoon boing (jumps)
  boing() { const x = N(0.45); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (180 + 260 * (1 - Math.exp(-t * 9)) + 25 * Math.sin(2 * Math.PI * 14 * t)) / SR; x[i] = Math.sin(ph) * env(t, 0.004, 0.13) * 0.8; } return lowpass(x, () => 2500); },
  // splash: filtered noise + bubbles
  splash() { const x = N(0.7), r = rng(31); for (let i = 0; i < x.length; i++) x[i] = (r() * 2 - 1) * env(i / SR, 0.01, 0.12); let y = lowpass(highpass(x, 500), () => 3500); for (let b = 0; b < 6; b++) { const st = 0.05 + b * 0.07, f = 600 + b * 170; for (let i = Math.round(st * SR); i < y.length; i++) { const t = i / SR - st; y[i] += Math.sin(2 * Math.PI * (f + 900 * t) * t) * env(t, 0.002, 0.03) * 0.25; } } return y; },
  // bush rustle
  rustle() { const x = N(0.8), r = rng(41); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (r() * 2 - 1) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 11 * t)) * Math.sin(Math.PI * t / 0.8); } return lowpass(highpass(x, 900), () => 5000); },
  // barn door: soft wooden knock + air
  door() { const x = N(0.8), r = rng(53); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (140 + 60 * Math.exp(-t * 30)) * t) * env(t, 0.003, 0.06) * 0.8 + (r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.8)) * 0.12; } return lowpass(x, () => 2200); },
  // gentle three-note "yay" chime for praise
  yay() { const x = N(1.1), notes = [784, 988, 1175]; for (let i = 0; i < x.length; i++) { const t = i / SR; notes.forEach((f, k) => { const st = k * 0.11; if (t >= st) { const tt = t - st; x[i] += (Math.sin(2 * Math.PI * f * tt) + 0.25 * Math.sin(4 * Math.PI * f * tt)) * env(tt, 0.004, 0.32) * 0.4; } }); } return x; },
  // Sunny Hill jingle (series opening): 4-note glockenspiel/marimba hook (C E G C) then soft ukulele I-IV-V-I under the sung title line
  jingle() {
    const n = Math.round(SR * 5.4), L = new Float32Array(n), R = new Float32Array(n), r = rng(61);
    [[0, 72], [0.18, 76], [0.36, 79], [0.6, 84]].forEach(([t, m], k) => { glock(L, R, t, m, 0.16); marimba(L, R, t, m - 12, 0.1, k % 2 ? 0.6 : 0.4); });
    const ch = [[60, 64, 67], [53, 57, 60], [55, 59, 62], [60, 64, 67]], beat = 0.43;
    ch.forEach((c, b) => [0, 1].forEach((k) => c.forEach((m, j) => pluck(L, R, 0.9 + b * 2 * beat + k * beat + j * 0.014, m + 12, b === 3 && k === 1 ? 1.6 : beat * 1.5, b === 3 && k === 1 ? 0.07 : 0.05, 0.35 + j * 0.15, r))));
    [[0.9, 79], [1.76, 77], [2.62, 79], [3.48, 84]].forEach(([t, m]) => glock(L, R, t, m, 0.05));
    const y = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; y[i] = (L[i] + R[i]) * 0.5 * Math.min(1, (5.4 - t) / 0.6); } return y;
  },
  // tiny cartoon squeak (small things): short rising whistle, soft attack, never shrill
  squeak() { const x = N(0.2); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (1100 + 900 * (t / 0.2) + 60 * Math.sin(2 * Math.PI * 22 * t)) / SR; x[i] = Math.sin(ph) * env(t, 0.012, 0.06) * 0.55; } return lowpass(x, () => 3200); },
  // soft 'ting' sparkle (a gentle single glint: bell note + faint octave shimmer, never shrill)
  ting() { const x = N(0.7); for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1760 * t) * env(t, 0.003, 0.16) * 0.5 + Math.sin(2 * Math.PI * 2637 * t) * env(t, 0.003, 0.08) * 0.22 + Math.sin(2 * Math.PI * 3520 * t) * env(t, 0.002, 0.05) * 0.1); } return lowpass(x, () => 6000); },
  // gentle yawn: breathy "aah" that rises then sinks, soft and slow (sleepy / bedtime beats)
  yawn() { const x = N(1.3), r = rng(53); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR, u = t / 1.3, f = 230 + 90 * Math.sin(Math.PI * Math.min(1, u * 1.15)) - 70 * u * u; ph += 2 * Math.PI * f / SR; const e = Math.sin(Math.PI * u) ** 1.6; x[i] = (Math.sin(ph) * 0.35 + Math.sin(2 * ph) * 0.18 + (r() * 2 - 1) * 0.22) * e; } return lowpass(x, i => 700 + 900 * Math.sin(Math.PI * Math.min(1, i / x.length * 1.1))); },
  // warm hug: soft cloth rustle + a low two-note swell (no click)
  hug() { const x = N(0.9), r = rng(97); for (let i = 0; i < x.length; i++) { const t = i / SR; const rustle = (r() * 2 - 1) * env(t, 0.05, 0.12) * 0.18; const swell = Math.sin(Math.PI * Math.min(1, t / 0.8)) ** 2; x[i] = rustle + (Math.sin(2 * Math.PI * 196 * t) + 0.5 * Math.sin(2 * Math.PI * 294 * t) + 0.2 * Math.sin(2 * Math.PI * 392 * t)) * swell * 0.28; } return lowpass(x, () => 1800); },
  // soft padded thump (big things): low round bump, no click
  thump() { const x = N(0.35); let ph = 0; for (let i = 0; i < x.length; i++) { const t = i / SR; ph += 2 * Math.PI * (55 + 70 * Math.exp(-t * 18)) / SR; x[i] = Math.sin(ph) * env(t, 0.008, 0.09); } return lowpass(x, () => 400); },
  // one soft hand clap (hill clap)
  clap() { const x = N(0.22), r = rng(71); for (let i = 0; i < x.length; i++) { const t = i / SR; let e = 0; for (const st of [0, 0.011, 0.023]) if (t >= st) e += env(t - st, 0.0008, st ? 0.006 : 0.05) * (st ? 0.6 : 1); x[i] = (r() * 2 - 1) * e; } return lowpass(highpass(x, 700), () => 4200); },
};

export function ensureSfx(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [k, f] of Object.entries(SFX)) { const p = path.join(dir, `${k}.wav`); if (!fs.existsSync(p)) { const y = f(); writeWav(p, y, y, 0.85); } }
  return Object.fromEntries(Object.keys(SFX).map(k => [k, path.join(dir, `${k}.wav`)]));
}

/* ------------------------------------------------------------------ music bed */
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);
/** Karplus-Strong pluck (ukulele-ish) */
function pluck(L: Float32Array, R: Float32Array, at: number, note: number, dur: number, amp: number, pan: number, r: () => number) {
  const f = midi(note), p = Math.max(2, Math.round(SR / f)), buf = new Float32Array(p);
  for (let i = 0; i < p; i++) buf[i] = r() * 2 - 1;
  const s0 = Math.round(at * SR), n = Math.round(dur * SR); let idx = 0, prev = 0;
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const v = buf[idx]; const nv = 0.5 * (v + buf[(idx + 1) % p]) * 0.996; buf[idx] = nv; idx = (idx + 1) % p;
    const o = (v + prev) * 0.5 * amp * Math.min(1, (n - i) / 2000); prev = v;
    L[s0 + i] += o * (1 - pan); R[s0 + i] += o * pan;
  }
}
function marimba(L: Float32Array, R: Float32Array, at: number, note: number, amp: number, pan: number) {
  const f = midi(note), s0 = Math.round(at * SR), n = Math.round(0.9 * SR);
  for (let i = 0; i < n && s0 + i < L.length; i++) { const t = i / SR; const v = (Math.sin(2 * Math.PI * f * t) * env(t, 0.002, 0.28) + 0.35 * Math.sin(2 * Math.PI * f * 4 * t) * env(t, 0.001, 0.04)) * amp; L[s0 + i] += v * (1 - pan); R[s0 + i] += v * pan; }
}
function glock(L: Float32Array, R: Float32Array, at: number, note: number, amp: number) {
  const f = midi(note), s0 = Math.round(at * SR), n = Math.round(1.2 * SR);
  for (let i = 0; i < n && s0 + i < L.length; i++) { const t = i / SR; const v = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * env(t, 0.001, 0.08)) * env(t, 0.002, 0.45) * amp; L[s0 + i] += v; R[s0 + i] += v; }
}

/**
 * A cheerful bed exactly `dur` seconds long: 104 bpm, C major, 8-bar sections (A: I-V-vi-IV ukulele + marimba; B: IV-I-V-I + glockenspiel melody),
 * soft bass, shaker 8ths, light kick; fades in 1 s, ends on a ringing C chord.
 */
export function musicBed(file: string, dur: number, seed = 7) {
  const bpm = 104, beat = 60 / bpm, bar = beat * 4, n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n), r = rng(seed);
  const A = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], B = [[53, 57, 60], [60, 64, 67], [55, 59, 62], [60, 64, 67]];
  const penta = [72, 74, 76, 79, 81, 84];
  const bars = Math.floor((dur - 2.5) / bar);
  let mel = 2;
  for (let b = 0; b < bars; b++) {
    const sec = Math.floor(b / 8) % 2, ch = (sec ? B : A)[b % 4], t0 = 0.4 + b * bar;
    // ukulele strum pattern: D . D U . U D U
    [0, 1, 1.5, 2.5, 3, 3.5].forEach((bt, k) => ch.forEach((nn, j) => pluck(L, R, t0 + bt * beat + j * 0.012 * (k % 2 ? -1 : 1) + 0.03, nn + 12, beat * 1.4, 0.055, 0.35 + j * 0.15, r)));
    // bass
    [0, 2].forEach((bt) => { const f = midi(ch[0] - 12), s0 = Math.round((t0 + bt * beat) * SR); for (let i = 0; i < beat * 1.7 * SR && s0 + i < n; i++) { const t = i / SR, v = Math.sin(2 * Math.PI * f * t) * env(t, 0.01, 0.45) * 0.16; L[s0 + i] += v; R[s0 + i] += v; } });
    // marimba off-beats (A) / glockenspiel melody (B)
    if (!sec) [0.5, 1.5, 2.5, 3.5].forEach((bt, k) => marimba(L, R, t0 + bt * beat, ch[(k + 1) % 3] + 24, 0.05, k % 2 ? 0.7 : 0.3));
    else for (let k = 0; k < 4; k++) { mel = Math.max(0, Math.min(penta.length - 1, mel + (r() < 0.5 ? -1 : 1) * (r() < 0.3 ? 2 : 1))); if (r() < 0.8) glock(L, R, t0 + k * beat, penta[mel], 0.06); }
    // soft sustained pad (keeps the bed continuous under speech gaps)
    ch.forEach((nn, j) => { const f = midi(nn), s0 = Math.round(t0 * SR), len = Math.round(bar * 1.04 * SR); for (let i = 0; i < len && s0 + i < n; i++) { const t = i / SR, e = Math.min(1, t / 0.5, (bar * 1.04 - t) / 0.4), v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2.003 * t)) * e * 0.035; L[s0 + i] += v * (j % 2 ? 0.8 : 1); R[s0 + i] += v * (j % 2 ? 1 : 0.8); } });
    // shaker + soft kick
    for (let k = 0; k < 8; k++) { const s0 = Math.round((t0 + k * beat / 2) * SR); for (let i = 0; i < 0.06 * SR && s0 + i < n; i++) { const t = i / SR, sh = (r() * 2 - 1) * env(t, 0.002, 0.012) * (k % 2 ? 0.03 : 0.02); L[s0 + i] += sh; R[s0 + i] += sh * 0.8; } }
    [0, 2].forEach((bt) => { const s0 = Math.round((t0 + bt * beat) * SR); for (let i = 0; i < 0.2 * SR && s0 + i < n; i++) { const t = i / SR, k = Math.sin(2 * Math.PI * (55 + 50 * Math.exp(-t * 30)) * t) * env(t, 0.002, 0.06) * 0.12; L[s0 + i] += k; R[s0 + i] += k; } });
  }
  // final chord
  const tf = 0.4 + bars * bar; [60, 64, 67, 72].forEach((nn, j) => { pluck(L, R, tf + j * 0.03, nn + 12, Math.max(0.5, dur - tf), 0.08, 0.3 + j * 0.13, r); marimba(L, R, tf + j * 0.03, nn + 12, 0.04, 0.5); });
  // fades
  for (let i = 0; i < n; i++) { const t = i / SR, g = Math.min(1, t / 1.0, (dur - t) / 1.2); L[i] *= g; R[i] *= g; }
  writeWav(file, lowpass(L, () => 9000), lowpass(R, () => 9000), 0.7);
  return file;
}

/** Deterministic room tone (soft low-passed noise, ~-45 dBFS RMS, no fade-out: the render's 6 ms micro-fade ends it) so a cold open never falls to digital silence in a speech pause. */
export function roomTone(file: string, dur: number, seed = 11, rmsDb = -45) {
  const n = Math.max(1, Math.round(dur * SR)), r = rng(seed), x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = r() * 2 - 1;
  const y = lowpass(x, () => 900);
  let ss = 0; for (let i = 0; i < n; i++) ss += y[i] * y[i];
  const g = Math.pow(10, rmsDb / 20) / Math.sqrt(Math.max(ss / n, 1e-12)), f = 1;
  let peak = 0; for (let i = 0; i < n; i++) { y[i] *= g * (i > n - f ? (n - i) / f : 1); peak = Math.max(peak, Math.abs(y[i])); }
  writeWav(file, y, y, peak);   // writeWav peak-normalises to `peak` = a no-op scale, so the level stays at rmsDb
  return file;
}

/** Bake gain into a 16-bit stereo 48 kHz wav: base dB everywhere, duck dB inside spans (0.25 s ramps in, 0.35 s out). */
export function duckWav(file: string, spans: [number, number][], baseDb: number, duckDb: number) {
  const b = fs.readFileSync(file), n = (b.length - 44) / 4, g0 = 10 ** (baseDb / 20), g1 = 10 ** (duckDb / 20);
  const gain = new Float32Array(n).fill(g0);
  for (const [a, e] of spans) {
    const i0 = Math.max(0, Math.floor((a - 0.25) * SR)), i1 = Math.min(n, Math.ceil((e + 0.35) * SR));
    for (let i = i0; i < i1; i++) { const t = i / SR; const k = t < a ? (t - (a - 0.25)) / 0.25 : t > e ? 1 - (t - e) / 0.35 : 1; const s = 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, k))); gain[i] = Math.min(gain[i], g0 + (g1 - g0) * s); }
  }
  for (let i = 0; i < n; i++) for (const o of [44 + i * 4, 46 + i * 4]) b.writeInt16LE(Math.round(Math.max(-32768, Math.min(32767, b.readInt16LE(o) * gain[i]))), o);
  fs.writeFileSync(file, b);
}
