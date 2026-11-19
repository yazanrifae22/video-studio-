// Regression helper for hook_intro variants: writes the generated hook-round HTML + plan (script-hint durations, no TTS,
// no OCC, no render) so a refactor can be diffed byte for byte.
//   npx tsx scripts/dump-hook-html.ts <outDir> [productionId ...]   (default: the four 10-27 productions)
import fs from 'node:fs';
import path from 'node:path';
import { hintDurations, loadSpec } from '../packages/quiz/src/spec.ts';
import { resolve, writeRound } from '../packages/quiz/src/compose.ts';

const [out, ...ids0] = process.argv.slice(2);
if (!out) { console.error('usage: dump-hook-html.ts <outDir> [productionId ...]'); process.exit(2); }
const ids = ids0.length ? ids0 : ['quiz-261022-x5iz', 'quiz-261022-hrxp', 'quiz-261022-li3p', 'quiz-261022-30r2'];
for (const id of ids) {
  const { spec, script, dir } = loadSpec(id);
  const R = resolve(spec, script, hintDurations(script));
  const i = spec.rounds.findIndex(r => r.type === 'hook_intro');
  if (i < 0) { console.log(`${id}: no hook_intro round`); continue; }
  const tz = `vpreview/teaser_${id}.jpg`;
  const r = fs.existsSync(path.join(dir, tz)) ? { ...spec.rounds[i], params: { ...spec.rounds[i].params, teaser: tz } } : spec.rounds[i];
  const pd = writeRound(spec, dir, r, R.rounds[i].plan, R.rounds[i].T0, path.join(out, id));
  fs.writeFileSync(path.join(out, `${id}.plan.json`), JSON.stringify(R.rounds[i].plan, null, 1));
  fs.copyFileSync(path.join(pd, 'index.html'), path.join(out, `${id}.html`));
  console.log(`${id}: ${r.params.variant} ${R.rounds[i].plan.duration}s -> ${path.join(out, `${id}.html`)}`);
}
