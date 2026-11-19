// dev: evaluate a JS expression in the Host page (K is the kit; draft score). npx tsx packages/test3d/web/parable/dev-host/probe-eval.ts "<expr>"
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try { console.log(JSON.stringify(await s.page.evaluate(process.argv[2]))); } finally { await s.close(); }
