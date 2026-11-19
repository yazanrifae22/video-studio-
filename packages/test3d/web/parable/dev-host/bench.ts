// dev: ms per frame (render only, no encode) of the Host film at 1920x1080 sub 16. npx tsx .../dev-host/bench.ts 33,120,253,416,480
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 1920, height: 1080, sub: 16 });
try {
  const out: number[] = [];
  for (const t of (process.argv[2] ?? '33,120,253,416,480').split(',').map(Number)) { await s.page.evaluate(`t3d.bench(${t}, 2)`); const ms = await s.page.evaluate(`t3d.bench(${t}, 8)`) as number; out.push(ms); console.log(`t=${t}: ${ms.toFixed(1)} ms/frame`); }
  console.log(`mean ${(out.reduce((a, b) => a + b, 0) / out.length).toFixed(1)} ms/frame`);
} finally { await s.close(); }
