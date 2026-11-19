// scratch: lint + stills for a cutout production (draft score). usage: tsx look.ts <id> <wide|tall> <out> <width> <refs comma: l003 | l003@0.2 | 12.5>
import fs from 'node:fs';
import path from 'node:path';
import { loadFilm, makeShow, resolvePage, allowFor } from 'file:///E:/clips-viral/packages/cutout/src/film.ts';
import { openPage } from 'file:///E:/clips-viral/packages/cutout/src/page.ts';

const [id, layout, out, width, refs] = process.argv.slice(2);
const { film, dir } = loadFilm(id);
const score = JSON.parse(fs.readFileSync(path.join(dir, 'draft', 'score.json'), 'utf8'));
const show = makeShow(film, score, { layout: layout as any });
const s = await openPage(resolvePage(), allowFor(dir), show, { scale: +width / show.width });
try {
  console.log('LINT', JSON.stringify(s.info.lint, null, 1));
  console.log('ERRORS', JSON.stringify(s.info.errors.slice(0, 5)));
  console.log('cues', s.info.cues.length);
  fs.mkdirSync(out, { recursive: true });
  for (const r of (refs || '').split(',').filter(Boolean)) {
    let t: number;
    if (/^[\d.]+$/.test(r)) t = +r;
    else { const [lid, f] = r.split('@'); const l = score.lines.find((x: any) => x.id === lid); t = l.t0 + (l.t1 - l.t0) * (f != null ? +f : 0.5); }
    const f = path.join(out, `${layout}-${film.lang}-${r.replace(/[@.]/g, '_')}.jpg`);
    await s.shot(t, f); const cv = await s.page.evaluate(() => { const v = (window as any).K.cam.v; const K = (window as any).K; const tv = K.props._list.find((p: any) => p.ids && p.ids.on && p.ids.stick); const r = tv && tv.el ? tv.el.getBoundingClientRect() : null; return [v.x, v.y, v.zoom, r ? r.top : -1, r ? r.height : -1, tv ? tv.v.y : -1, tv ? tv.cy : -1, K.S.planes.mid.style.transform].map((n: any) => typeof n === 'number' ? Math.round(n * 100) / 100 : n); }); console.log('still', path.basename(f), t.toFixed(2), 'cam', cv.join(','));
  }
} finally { await s.close(); }
