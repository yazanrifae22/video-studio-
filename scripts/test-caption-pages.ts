// Plans ranking captions only (no render) from existing word timestamps and runs prelint's shortPages gate over them.
import fs from 'node:fs';
import { pageCaptions } from '../packages/occ/src/build.ts';
import { shortPages } from '../packages/orchestrator/src/prelint.ts';
import { CAPTION_MIN_PAGE } from '../packages/shared/src/caption-gate.ts';
let bad = 0;
for (const id of process.argv.slice(2).length ? process.argv.slice(2) : ['rank-261108-3xjc', 'rank-261108-fz6p', 'rank-261108-zv6s']) {
  const vs = fs.readdirSync(`productions/${id}`).filter(d => /^v\d+$/.test(d)).sort((a, b) => +a.slice(1) - +b.slice(1));
  const v = vs.at(-1)!, dir = `productions/${id}/${v}`;
  const f = ['narration.align.json'].map(n => `${dir}/${n}`).find(p => fs.existsSync(p));
  if (!f) { console.log(id, 'no words file in', dir, fs.readdirSync(dir).join(',')); bad++; continue; }
  const raw = JSON.parse(fs.readFileSync(f, 'utf8')), lines: any[] = raw.lines ?? [];
  const pages = lines.flatMap(l => pageCaptions(l.words.map((w: any) => ({ w: w.w, t0: w.s, t1: w.e })) as any, 3, 16, CAPTION_MIN_PAGE)).sort((a, b) => a.t0 - b.t0);
  // build.ts then clamps each page end to the next start (caption_per_line); apply the same and re-check
  pages.forEach((pg, i, arr) => { if (arr[i + 1] && arr[i + 1].t0 < pg.t1 && arr[i + 1].t0 > pg.t0 + 0.05) pg.t1 = arr[i + 1].t0; });
  const overlap = pages.filter((p, i) => i && p.t0 < pages[i - 1].t1 - 1e-6).length;
  const short = shortPages(pages as any);
  console.log(id, v, `${pages.length} pages, caption_short=${short.length}, overlaps=${overlap}`, short.map(s => s.detail).join(' | '));
  if (short.length || overlap) bad++;
}
process.exit(bad ? 1 : 0);
