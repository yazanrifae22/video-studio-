// mv-B4: offline caption-page simulator (no onset snap): npx tsx scripts/mvb4-pages.ts <production_id>
// Mirrors build.ts lines "captions: source": inclusion by midpoint (or caption_timing midpoint), caption_timing, caption_fixes, pageCaptions.
import fs from 'node:fs';
import { pageCaptions } from '../packages/occ/src/build.ts';

const pid = process.argv[2];
const cl = JSON.parse(fs.readFileSync(`E:/clips-viral/productions/${pid}/cutlist.json`, 'utf8'));
const shaOf: Record<string, string> = { 'src-261021-mh9v': 'dd4bb701828aa01dcb21eb9ca04d028d8b2dc59ca55e2b1b051dab8ed036a04e', 'src-261024-7t0d': 'fc6a1beebda943e86df94d36d0a23211139e00bf8077327a3ccf0a74bc4af9c3', 'src-261024-t8j7': 'c297bd583b0aad837c2f0ff3d67013274e7daffba81893931f6390ad0b798dda', 'src-261021-o7kw': '8e437aa4551d53383b835b2af5585f1b26b5299f2ee48a52d7a1412848e05fe7' };
let t = 0;
const words: { w: string; t0: number; t1: number }[] = [];
for (const s of cl.segments) {
  const start = t; t += s.src_out - s.src_in;
  const tr = JSON.parse(fs.readFileSync(`E:/clips-viral/data/cache/${shaOf[s.asset_id]}/transcript.en.json`, 'utf8'));
  const sw: any[] = [];
  for (const seg of tr.segments) for (const w of seg.words ?? []) {
    const ov = (cl.caption_timing ?? []).find((o: any) => o.asset_id === s.asset_id && o.word === w.w && Math.abs(o.at - w.s) <= 0.3);
    const mid = ov ? ((ov.start ?? w.s) + (ov.end ?? w.e)) / 2 : (w.s + w.e) / 2;
    if (mid >= s.src_in && mid <= s.src_out) sw.push({ ...w, s0: w.s });
  }
  for (const o of cl.caption_timing ?? []) {
    const w = sw.find(x => x.w === o.word && Math.abs(o.at - x.s0) <= 0.3);
    if (!w) continue;
    if (o.start != null) w.s = o.start;
    if (o.end != null) w.e = o.end;
  }
  for (const w of sw) {
    const fx = (cl.caption_fixes ?? []).find((f: any) => f.asset_id === s.asset_id && f.from === w.w && Math.abs(f.at - (w.s0 ?? w.s)) <= 0.3);
    if (fx?.s != null) w.s = Math.min(fx.s, w.e - 0.05);
    if (fx) w.w = fx.to;
  }
  for (const w of sw) words.push({ w: w.w, t0: start + Math.max(0, w.s - s.src_in), t1: start + Math.min(s.src_out - s.src_in, w.e - s.src_in) });
}
const ws = words.filter(w => w.w.trim() !== "");
if (process.env.DBG) console.log(ws.slice(-8).map(w => `${w.w}@${w.t0.toFixed(2)}-${w.t1.toFixed(2)}`).join(" "));
const pages = pageCaptions(ws, 3, 16, cl.caption_min_page ?? 0);
console.log(pages.map(p => `${p.text}@${p.t0.toFixed(2)}`).join(' | '));
const lone = pages.filter(p => p.text.split(' ').length === 1);
console.log(`pages ${pages.length}, one-word pages: ${lone.map(p => p.text).join(', ') || 'none'}`);
