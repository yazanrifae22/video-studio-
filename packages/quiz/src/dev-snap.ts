// Dev helper: write round projects with script-hint timing and print key times (for `hyperframes snapshot --at`).
import path from 'node:path';
import { loadSpec, hintDurations } from './spec.ts';
import { resolve, writeRound, WORK } from './compose.ts';
const id = process.argv[2];
const { spec, script, dir } = loadSpec(id);
const R = resolve(spec, script, hintDurations(script));
for (const [i, r] of R.rounds.entries()) {
  const pd = path.join(WORK, id, 'dev', r.id);
  writeRound(spec, dir, spec.rounds[i], r.plan, r.T0, pd);
  const p = r.plan;
  console.log(JSON.stringify({ id: r.id, T0: r.T0, D: p.duration, cd: p.cd, reveal: p.reveal, explain: p.explain, marks: p.marks, dir: pd }));
}
console.log('total', R.total);
