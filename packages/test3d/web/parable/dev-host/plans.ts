// dev: the storyteller's planned acts (flip, push, coinhold, sweep, count, tap, ask) with times. npx tsx .../dev-host/plans.ts
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 640, height: 360, sub: 1 });
try { console.log(JSON.stringify(await s.page.evaluate(`K.view.cast.plans.map((p) => [p.kind, +p.t.toFixed(2), p.hand])`))); } finally { await s.close(); }
