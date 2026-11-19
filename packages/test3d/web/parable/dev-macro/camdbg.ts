// dev: camera numbers at given times of the real score (sub 1). npx tsx packages/test3d/web/parable/dev-macro/camdbg.ts 10.1,150
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of (process.argv[2] ?? '10').split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { const st = K.show.state(${t}); K.view.draw(st, ${t}); const c = K.camera; return { t: ${t}, line: st.line, shot: st.shot.id, kind: st.shot.kind, move: st.shot.move, cont: st.shot.continuous, subject: st.shot.subject, to: st.shot.to, focus: st.focus ?? null, pos: c.position.toArray().map(v => +v.toFixed(3)), fov: c.fov, dbg: K.dbgCam }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
