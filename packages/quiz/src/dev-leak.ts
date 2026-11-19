// Dev check: run the answer-leak guard on an existing version's round clips (boxes from the CURRENT templates).
// usage: npx tsx packages/quiz/src/dev-leak.ts <production> v<n>
import fs from 'node:fs';
import path from 'node:path';
import { loadSpec } from './spec.ts';
import { WORK, writeRound } from './compose.ts';
import { leakGuard } from './build.ts';

const [id, v] = process.argv.slice(2);
const { spec, dir } = loadSpec(id);
const T = JSON.parse(fs.readFileSync(path.join(dir, v, 'timeline.json'), 'utf8'));
const clips = fs.readdirSync(path.join(dir, v, 'clips'));
for (const [i, r] of T.rounds.entries()) {
  let pd: string;
  try { pd = writeRound(spec, dir, spec.rounds[i], r.plan, r.T0, path.join(WORK, id, 'leak', r.id)); } catch (e: any) { console.log(`${r.id} ${r.type}: plan error — ${e.message}`); continue; }
  const lk = JSON.parse(fs.readFileSync(path.join(pd, 'leak.json'), 'utf8'));
  const clip = clips.find(f => f.startsWith(`${String(i + 1).padStart(2, '0')}_`) && f.endsWith('.mp4'));
  if (!lk.boxes.length || !clip) { console.log(`${r.id} ${r.type}: no answer layer declared`); continue; }
  const g = await leakGuard(path.join(dir, v, 'clips', clip), lk.boxes, lk.reveal);
  console.log(`${r.id} ${r.type}: ${g.leaks.length ? 'LEAK ' + g.leaks.join('; ') : 'clean'} (${lk.boxes.length} boxes x ${g.times.length} frames)`);
}
