// dev: tag layout facts at a time (sub 1): focus rects, actor rects of tag anchors, tags. npx tsx packages/test3d/web/parable/dev-macro/tagdbg.ts 102.57
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of (process.argv[2] ?? '10').split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { t3d.still(${t}, 64); const st = K.show.state(${t}); const sc = K.view.objects.screen; const f = (o) => o && [o.x0, o.y0, o.x1, o.y1].map((v) => +v.toFixed(3));
      return { t: ${t}, title: st.title, focus: sc.focus.map(f), tags: st.tags.map((g) => ({ text: g.text, anchor: g.anchor, own: g.anchor.player != null ? f(sc.rects.get('p' + g.anchor.player)) : null, at: (() => { const p = K.view.objects.anchor(g.anchor, st); if (!p) return null; p.project(K.camera); return [+(0.5 + 0.5 * p.x).toFixed(3), +(0.5 - 0.5 * p.y).toFixed(3)]; })() })) }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
