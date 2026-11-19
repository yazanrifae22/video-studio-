/**
 * quiz-long audio stems, mixed in memory (48 kHz mono float) and written as 16-bit WAVs: narration, SFX, music bed (ducked).
 * A 10-minute episode has ~130 lines and ~400 SFX cues; as separate timeline items that would be ~550 ffmpeg inputs in one
 * filter graph, so the builder lays them into three stems here and the timeline carries the stems (show.json keeps every
 * line/cue time for reviewers).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';

const run = promisify(execFile);
export const SR = 48000;

const cache = new Map<string, Float32Array>();
/** Decode any audio file to 48 kHz mono float32 (cached per path). */
export async function decode(file: string): Promise<Float32Array> {
  const hit = cache.get(file); if (hit) return hit;
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { encoding: 'buffer', maxBuffer: 1 << 30 });
  const b = stdout as unknown as Buffer;
  const x = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.length / 4) * 4));
  cache.set(file, x);
  return x;
}

export const dbToGain = (db: number) => Math.pow(10, db / 20);

/** Add src (gain) into dst starting at `at` seconds (clipped to dst). */
export function mixInto(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  const o = Math.round(at * SR);
  const a = Math.max(0, -o), b = Math.min(src.length, dst.length - o);
  for (let i = a; i < b; i++) dst[o + i] += src[i] * gain;
}

/** RMS (dBFS) of [from, from+dur] s, ignoring near-silent 10 ms windows (same rule as packages/quiz rmsDb). */
export function rmsDb(x: Float32Array, from: number, dur: number) {
  const a = Math.max(0, Math.round(from * SR)), b = Math.min(x.length, Math.round((from + dur) * SR));
  const win: number[] = [];
  for (let i = a; i + 480 <= b; i += 480) { let e = 0; for (let k = 0; k < 480; k++) e += x[i + k] ** 2; win.push(e / 480); }
  const loud = win.filter(e => e > 1e-6);
  return 10 * Math.log10(loud.length ? loud.reduce((p, c) => p + c, 0) / loud.length : 1e-9);
}

export const peak = (x: Float32Array) => { let m = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; } return m; };

/** Piecewise-linear gain envelope [(t, gain)] applied in place. */
export function applyEnvelope(x: Float32Array, keys: { t: number; g: number }[]) {
  if (!keys.length) return;
  let k = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    while (k + 1 < keys.length && keys[k + 1].t <= t) k++;
    const A = keys[k], B = keys[k + 1];
    const g = !B || t <= A.t ? A.g : A.g + ((t - A.t) / Math.max(1e-6, B.t - A.t)) * (B.g - A.g);
    x[i] *= g;
  }
}

/** Write 16-bit PCM mono WAV (samples beyond +-1 saturate: callers keep the peak below 1, see build.ts mixStems). */
export function writeWav(file: string, x: Float32Array) {
  const n = x.length, buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, buf);
}

export async function lufs(file: string): Promise<number> {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const s = String(stderr); const m = /I:\s+(-?[\d.]+) LUFS/.exec(s.slice(s.lastIndexOf('Summary:')));
  return m ? parseFloat(m[1]) : -70;
}
