/** dev: preview the 1280x720 thumbnail of an episode without a build. npx tsx packages/kids3d/src/dev-thumb.ts <prodDir> <score.json> <out.png> */
import { open, thumbPng } from './capture.ts';
const [dir, score, out] = process.argv.slice(2);
const s = await open(dir, score, {});
try { console.log(await thumbPng(s, out)); } finally { await s.close(); }
