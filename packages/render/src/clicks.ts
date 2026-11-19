/**
 * Click detector for audio cuts (2026-11-02, QA: clicks at segment joins = blockers). A click is a step in the waveform: the
 * second difference |x[n] - 2x[n-1] + x[n-2]| spikes far above its level in the 50 ms around the join. Used by the render
 * regression test and by `cli prelint` on every render (joins = picture cuts + audio item edges from timeline.json).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const SR = 48000;

export async function decodeMono(file: string): Promise<Float32Array> {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 1 << 30 }) as any;
  const b = stdout as Buffer;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.length / 4) * 4));
}

export interface Click { t: number; peak: number; ref: number; ratio: number; click: boolean }
/** Score each join time (s). `ratio` = peak 2nd difference within ±4 ms / 95th percentile of the 50 ms on both sides (5-55 ms away). */
export function scoreJoins(x: Float32Array, times: number[], o: { ratio?: number; min?: number } = {}): Click[] {
  const R = o.ratio ?? 8, MIN = o.min ?? 0.02;
  const d2 = (n: number) => n >= 2 && n < x.length ? Math.abs(x[n] - 2 * x[n - 1] + x[n - 2]) : 0;
  return times.map(t => {
    const c = Math.round(t * SR), w = Math.round(0.004 * SR);
    let peak = 0;
    for (let n = c - w; n <= c + w; n++) peak = Math.max(peak, d2(n));
    const ref: number[] = [];
    for (let n = c - Math.round(0.055 * SR); n < c - Math.round(0.005 * SR); n++) ref.push(d2(n));
    for (let n = c + Math.round(0.005 * SR); n < c + Math.round(0.055 * SR); n++) ref.push(d2(n));
    ref.sort((a, b) => a - b);
    const r95 = ref.length ? ref[Math.floor(ref.length * 0.95)] : 0;
    const ratio = peak / Math.max(r95, 1e-4);
    return { t, peak: +peak.toFixed(4), ref: +r95.toFixed(4), ratio: +ratio.toFixed(1), click: ratio > R && peak > MIN };
  });
}

export async function detectClicks(file: string, times: number[], o: { ratio?: number; min?: number } = {}) {
  return scoreJoins(await decodeMono(file), times, o);
}
