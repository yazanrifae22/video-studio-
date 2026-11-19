// Dev helper: tightened take → measured line durations → resolved timeline (no visuals).
import os from 'node:os';
import path from 'node:path';
import { loadSpec } from './spec.ts';
import { fullTake, splitTake } from './narration.ts';
import { resolve } from './compose.ts';
const id = process.argv[2];
const { spec, script, dir } = loadSpec(id);
const t = await fullTake(spec, script, dir, id);
const clips = await splitTake(t.wav, t.align, path.join(os.tmpdir(), 'quiz-dev-split'));
const R = resolve(spec, script, Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v.dur])));
console.log(JSON.stringify({ wer: t.align.wer, kw: t.align.keywords, take_s: t.align.duration, total: R.total, rounds: R.rounds.map(r => [r.id, r.plan.duration]) }));
for (const l of t.align.lines) console.log(l.id, l.start, l.end);
