import { pageCaptions } from '../packages/occ/src/build.ts';
import fs from 'node:fs';
const al = JSON.parse(fs.readFileSync('productions/rank-261028-8f9e/v7/narration.align.json', 'utf8'));
for (const mp of [0.5, 0.55, 0.6, 0.7]) {
  console.log(mp, al.lines.flatMap((l: any) => pageCaptions(l.words.map((w: any) => ({ w: w.w, t0: w.s, t1: w.e })), 3, 16, mp)).map((p: any) => `${p.text}@${p.t0.toFixed(1)}`).join(' | '));
}
