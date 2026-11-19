// dev: one time -> the fit groups (world points projected with the real camera) and the plan. npx tsx .../dev-host/dbg.ts 179.43
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv[2].split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { const T = K.THREE, st = K.show.state(${t}); K.view.draw(st, ${t}); const cam = K.camera; cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const pr = (q) => { const p = q.clone().project(cam); return [+(0.5 + 0.5 * p.x).toFixed(2), +(0.5 - 0.5 * p.y).toFixed(2)]; };
      const L = K.view.lastFit; return { t: ${t}, shot: st.shot.id, kind: st.shot.kind, cam: cam.position.toArray().map((x) => +x.toFixed(3)), fov: cam.fov, d: L.fr && +L.fr.d.toFixed(3), sc: L.fr && [+L.fr.scx.toFixed(2), +L.fr.scy.toFixed(2)], groups: (L.groups || []).map((g) => ({ box: g.box, pts: g.pts.map(pr) })), eyes: pr(K.view.cast.teller.marks.eyes) }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
