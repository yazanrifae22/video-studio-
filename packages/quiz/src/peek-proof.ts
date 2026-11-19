// Fairness proof for a peek_number round: render the round with every candidate glyph behind the same cover, take the
// visible ink (the pixels a viewer actually sees before the reveal) at phone scale (360 px card width) and check BOTH
// ends: the answer must be unique (every other candidate differs by >= --min-diff) but not obvious (visible ink of the
// answer <= --max-ink % of its full glyph). Also reports the visible window, for placing the clue ring.
// usage: npx tsx packages/quiz/src/peek-proof.ts <production> <roundId> [--candidates ١٢٣٤٥٦٧٨٩] [--max-ink=15] [--min-diff=0.12]
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { hintDurations, loadSpec } from './spec.ts';
import { HF, NPX_CLI, resolve, WORK, writeRound } from './compose.ts';
import { P } from '../../shared/src/paths.ts';

const run = promisify(execFile);
const [id, roundId] = process.argv.slice(2);
const ci = process.argv.indexOf('--candidates');
const { spec, script, dir } = loadSpec(id);
const idx = spec.rounds.findIndex(r => r.id === roundId);
if (idx < 0 || spec.rounds[idx].type !== 'peek_number') throw new Error(`${roundId} is not a peek_number round`);
const base = spec.rounds[idx];
const eastern = /[٠-٩]/.test(base.params.glyph);
const cands = ci > 0 ? [...process.argv[ci + 1]] : [...(eastern ? '١٢٣٤٥٦٧٨٩' : '123456789')];
const R = resolve(spec, script, hintDurations(script));
const plan = R.rounds[idx].plan;
const tCover = +(plan.cd! - 0.3).toFixed(2);   // cover in place, ring not yet in, no clue ring
const out = path.join(WORK, id, 'peek-proof');
try { fs.rmSync(out, { recursive: true, force: true, maxRetries: 3 }); } catch (e: any) { if (!['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(e.code)) throw e; console.error(`peek-proof: could not clear ${out} (${e.code}); renders overwrite it`); }
const BASELINE = ' ';  // NBSP glyph = cover only; subtracted from every candidate
const shots: Record<string, string> = {};
const variants: [string, Record<string, any>][] = [
  ...cands.map(g => [g, { ...base.params, glyph: g }] as [string, Record<string, any>]),
  ['baseline', { ...base.params, glyph: BASELINE }],
  ['full', { ...base.params, cover_clip: 'inset(0 0 100% 0)' }],  // the answer with the cover clipped away
];
for (const [key, params] of variants) {
  const pd = writeRound(spec, dir, { ...base, params }, plan, R.rounds[idx].T0, path.join(out, key === 'baseline' || key === 'full' ? key : `g${cands.indexOf(key) + 1}`));
  await run(process.execPath, [NPX_CLI, '-y', HF, 'snapshot', pd, '--at', String(tCover)], { cwd: pd, maxBuffer: 1 << 26 });
  const sd = path.join(pd, '.hyperframes', 'artifacts', 'snapshots');
  const sub = fs.readdirSync(sd)[0];
  shots[key] = path.join(sd, sub, fs.readdirSync(path.join(sd, sub)).find(f => f.endsWith('.png'))!);
}
fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify(shots));
const py = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const extra = process.argv.slice(4).filter(a => /^--(max-ink|min-diff)=/.test(a));
const { stdout } = await run(py, ['-I', path.join(P.root, 'packages', 'quiz', 'py', 'peek_proof.py'), path.join(out, 'shots.json'), base.params.glyph, path.join(out, 'proof.json'), ...extra], { maxBuffer: 1 << 26 });
console.log(String(stdout).trim());
