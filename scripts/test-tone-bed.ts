import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { toneBed } from '../packages/occ/src/build.ts';
// Regression: accents late in a long video once overflowed exp() to Infinity → NaN → huge DC offset.
// Run: npx tsx scripts/test-tone-bed.ts [outDir]
//   outDir optional (2026-10-31: it used to crash on a missing argument); default = a temp dir, removed afterwards. Exits non-zero on failure.
const dir = process.argv[2] ?? fs.mkdtempSync(path.join(os.tmpdir(), 'tone-bed-'));
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, 'bed_test.wav');
await toneBed(60, out, [2, 8, 15, 30, 45, 55]);
// astats prints to stderr
const p = spawnSync('ffmpeg', ['-hide_banner', '-i', out, '-af', 'astats=measure_overall=DC_offset+Peak_level:measure_perchannel=none', '-f', 'null', '-'], { encoding: 'utf8' });
const num = (re: RegExp) => { const v = re.exec(p.stderr ?? '')?.[1]; return v == null ? NaN : Number(v); };
const dc = num(/DC offset:\s*(\S+)/i), peak = num(/Peak level dB:\s*(\S+)/i);
const ok = Number.isFinite(dc) && Math.abs(dc) < 0.01 && Number.isFinite(peak) && peak < 0;
console.log(`${ok ? 'ok  ' : 'FAIL'} tone bed 60 s with late accents: DC offset ${dc}, peak ${peak} dB${process.argv[2] ? ` (${out})` : ''}`);
if (!process.argv[2]) fs.rmSync(dir, { recursive: true, force: true });
process.exitCode = ok ? 0 : 1;
