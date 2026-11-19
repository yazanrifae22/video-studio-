/**
 * Cutout audio: the SFX table the page may cue (packages/cutout/sfx.json = shu-lab paper foley files + test3d procedural sounds,
 * one name -> one source), the SFX lane mixer and the final narration + SFX + ducked bed mix.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { P } from '../../shared/src/paths.ts';
import { readWavMono, sfx as synth, SFX_NAMES, writeWav, SR } from '../../test3d/src/audio.ts';
import { CUTOUT } from './film.ts';
import type { Cue } from './page.ts';

const run = promisify(execFile);
export const SFX_JSON = path.join(CUTOUT, 'sfx.json');
export interface SfxEntry { source: 'file' | 'synth'; file?: string; gen?: string; uses_dur?: boolean; seconds?: number; description: string }
export interface SfxTable { schema: 'cutout-sfx/1'; note: string; sfx: Record<string, SfxEntry> }

const SYNTH_DESC: Record<string, [string, boolean]> = {
  tick: ['one tiny dry click (4 variants rotated, cues closer than 12 ms merge)', false], pour: ['grains pouring, uses dur', true],
  thud: ['heavy piece falls on stone and rolls', false], whoosh: ['airy whoosh', false], riser: ['tension riser, uses dur', true], hit: ['low cinematic impact', false],
  ding: ['bright ding', false], coin: ['coin clink with a short ring (4 variants)', false], tap: ['small piece set down: dull knock', false],
  chime: ['soft two-note chime, long decay (chapter mark)', false], swell: ['airy filtered-noise swell, uses dur', true],
};
/** sfx.json from the two sources. Paper foley wins a shared name (tick, tap, thud, whoosh: the cardboard look); the procedural
 *  version of a shared name stays available as `<name>-synth`. */
export function buildSfxTable(): SfxTable {
  const dir = path.join(P.data, 'brand', 'shu-lab', 'sfx');
  const idx: { name: string; seconds: number; kind: string; description: string }[] = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
  const sounds: Record<string, SfxEntry> = {};
  for (const s of idx.filter(x => x.kind === 'sfx')) sounds[s.name] = { source: 'file', file: `data/brand/shu-lab/sfx/${s.name}.wav`, seconds: s.seconds, description: `paper foley: ${s.description}` };
  for (const n of SFX_NAMES) {
    const [d, dur] = SYNTH_DESC[n] ?? ['procedural sound', false];
    sounds[sounds[n] ? `${n}-synth` : n] = { source: 'synth', gen: n, ...(dur ? { uses_dur: true } : {}), description: `procedural (packages/test3d/src/audio.ts): ${d}` };
  }
  // alias asked for by the kit (chapter tag = a masking-tape strip): the paper rip is a tape pull
  if (sounds.rip && !sounds.tape) sounds.tape = { ...sounds.rip, description: 'masking-tape strip pulled and pressed (same file as rip)' };
  return { schema: 'cutout-sfx/1', note: 'Cue names the page may return from __load (cues[].name) = the keys of sfx. db = peak level of the sound in dBFS (default -12); dur only for uses_dur sounds. Unknown names fail the build. Regenerate: npx tsx packages/cutout/src/cli.ts sfx-table', sfx: sounds };
}
let table: SfxTable | null = null;
export function sfxTable(): SfxTable {
  if (!table) table = fs.existsSync(SFX_JSON) ? JSON.parse(fs.readFileSync(SFX_JSON, 'utf8')) : buildSfxTable();
  return table!;
}

async function decode48(file: string) {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { encoding: 'buffer', maxBuffer: 1 << 28 });
  const b = stdout as unknown as Buffer;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + Math.floor(b.length / 4) * 4));
}
const peakNorm = (y: Float32Array) => { let p = 0; for (const v of y) p = Math.max(p, Math.abs(v)); return p > 0 ? y.map(s => s / p) : y; };

/** unknown cue names (checked before any mixing) */
export const unknownCues = (cues: Cue[]) => [...new Set(cues.map(c => c.name).filter(n => !sfxTable().sfx[n]))];

/** every cue into ONE stereo 48 kHz wav of `dur` s: each sound peak-normalised, cue db = its peak (default -12), times shifted by -offset */
export async function mixSfx(file: string, cues: Cue[], dur: number, offset = 0) {
  const bad = unknownCues(cues);
  if (bad.length) throw new Error(`page sfx cue(s) ${bad.join(', ')} unknown (have: ${Object.keys(sfxTable().sfx).join(', ')}; packages/cutout/sfx.json)`);
  const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n), cache = new Map<string, Float32Array>(), last = new Map<string, number>();
  let used = 0, variant = 0;
  for (const c of [...cues].sort((a, b) => a.t - b.t)) {
    const t = c.t - offset; if (t < -0.5 || t >= dur) continue;
    const e = sfxTable().sfx[c.name];
    if ((last.get(c.name) ?? -1) > c.t - 0.012) continue;   // closer than 12 ms = one sound
    last.set(c.name, c.t);
    const v = e.gen === 'tick' || e.gen === 'coin' ? variant++ % 4 : 0, key = `${c.name}:${v}:${e.uses_dur && c.dur != null ? c.dur.toFixed(2) : ''}`;
    let y = cache.get(key);
    if (!y) { y = peakNorm(e.source === 'file' ? await decode48(path.join(P.root, e.file!)) : synth(e.gen!, e.uses_dur ? c.dur : undefined, v)); cache.set(key, y); }
    const g = Math.pow(10, (c.db ?? -12) / 20), s0 = Math.round(t * SR);
    for (let i = 0; i < y.length && s0 + i < n; i++) if (s0 + i >= 0) { L[s0 + i] += y[i] * g; R[s0 + i] += y[i] * g; }
    used++;
  }
  writeWav(file, L, R);
  return { file, cues: used };
}

/** narration + sfx + music (all 48 kHz stereo 16-bit wavs of the same length) -> one stereo wav; scaled down when the sum peaks over -1 dBFS */
export function sumStems(file: string, stems: string[]) {
  const read = (f: string) => { const b = fs.readFileSync(f); return { b, n: (b.length - 44) / 4 }; };
  const xs = stems.map(read), n = Math.max(...xs.map(x => x.n)), L = new Float32Array(n), R = new Float32Array(n);
  for (const { b, n: m } of xs) for (let i = 0; i < m; i++) { L[i] += b.readInt16LE(44 + i * 4) / 32768; R[i] += b.readInt16LE(46 + i * 4) / 32768; }
  let p = 0; for (let i = 0; i < n; i++) p = Math.max(p, Math.abs(L[i]), Math.abs(R[i]));
  const k = p > 0.89 ? 0.89 / p : 1;
  if (k < 1) for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  writeWav(file, L, R);
  return { peak_dbfs: +(20 * Math.log10(Math.max(1e-9, p * k))).toFixed(1), scaled_db: +(20 * Math.log10(k)).toFixed(1) };
}
export { readWavMono };
