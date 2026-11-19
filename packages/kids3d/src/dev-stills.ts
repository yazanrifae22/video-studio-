/** dev: stills of any choreo file with renderer options. npx tsx packages/kids3d/src/dev-stills.ts <prodDir> <score.json> <choreo-rel-to-prodDir> <outDir> <times,..> [extraQuery] */
import { open, stills } from './capture.ts';
const [dir, score, choreo, out, times, extra] = process.argv.slice(2);
const s = await open(dir, score, { choreo, extra: extra ? '&' + extra : '' });
try { console.log(await stills(s, times.split(',').map(Number), out, Number(process.env.W ?? 480))); } finally { await s.close(); }
