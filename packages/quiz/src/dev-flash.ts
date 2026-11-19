// Dev check: flash peak per round of a production's quiz.json.
import { loadSpec } from './spec.ts';
import { flashPeak } from './compose.ts';
const { spec, dir } = loadSpec(process.argv[2]);
for (const r of spec.rounds) console.log(r.id, r.type, flashPeak(r, dir));
