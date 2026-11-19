// dev: world points of the l65 closing (hats, feet, Skeptic pawn, both heads) at a time, as JSON (Host view, draft score).
// npx tsx packages/test3d/web/parable/dev-host/probe-end.ts 640
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  const t = Number(process.argv[2] ?? 640);
  const r = await s.page.evaluate(`(() => { const st = K.show.state(${t}); K.view.draw(st, ${t}); const o = K.view.objects, c = K.view.cast, ids = st.shot.subject?.players ?? [];
    const a = (q) => q ? q.toArray().map((x) => +x.toFixed(4)) : null;
    return { shot: st.shot.id, t0: st.shot.t0, t1: st.shot.t1, ids, hats: ids.map((i) => a(o.anchor({ player: i }, st))), hatsTag: ids.map((i) => a(o.anchor({ player: i }, st, 'tag'))), sk: a(o.anchor({ skeptic: true }, st)), skTag: a(o.anchor({ skeptic: true }, st, 'tag')), Ht: a(c.tellerHead(${t})), Hs: a(c.skHead(${t})) }; })()`);
  console.log(JSON.stringify(r));
} finally { await s.close(); }
