/** dev: evaluate a JS expression in an episode page (K, kids available). npx tsx packages/kids3d/src/dev-eval.ts <prodDir> <score.json> "<expr>" */
import { open } from './capture.ts';
const [dir, score, expr] = process.argv.slice(2);
const s = await open(dir, score, { sub: 1 });
try { console.log(JSON.stringify(await s.page.evaluate(expr))); } finally { await s.close(); }
