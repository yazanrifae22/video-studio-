// dev: per time, where the faces and the subject land on the picture with the real Host camera (draft score).
// npx tsx packages/test3d/web/parable/dev-host/probe.ts 631.6,633,636
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv[2].split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { const T = K.THREE, st = K.show.state(${t}); K.view.draw(st, ${t}); const cam = K.camera; cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const pr = (q) => { const p = q.clone().project(cam); return [+(0.5 + 0.5 * p.x).toFixed(3), +(0.5 - 0.5 * p.y).toFixed(3)]; };
      const box = (pts) => { const a = pts.map(pr); return [Math.min(...a.map((q) => q[0])), Math.min(...a.map((q) => q[1])), Math.max(...a.map((q) => q[0])), Math.max(...a.map((q) => q[1]))].map((x) => +x.toFixed(3)); };
      const V = (x, y, z) => new T.Vector3(x, y, z), head = (H) => [H.clone().add(V(0, 0.11, 0)), H.clone().add(V(0, -0.13, 0)), H.clone().add(V(-0.12, 0, 0)), H.clone().add(V(0.12, 0, 0))];
      const c = K.view.cast, sub = st.shot.subject || {}, ps = (sub.players || []).map((i) => pr(K.view.objects.anchor({ player: i }, st) || V(0,0,0)));
      return { t: ${t}, shot: st.shot.id, kind: st.shot.kind, fov: +cam.fov.toFixed(1), teller: box(head(c.tellerHead(${t}))), sk: box(head(c.skHead(${t}))), anchors: ps, skPawn: sub.skeptic ? pr(K.view.objects.anchor({ skeptic: true }, st) || V(0,0,0)) : null, ang: (K.view.shotDbg(st.shot.id) || {}).endAng, hf: (K.view.shotDbg(st.shot.id) || {}).headFix, tags: (st.tags || []).filter((g) => g.opacity > 0.05).map((g) => g.text), avoid: (K.view.objects.avoidRects || []).slice(0, 2).map((r) => [r.x0, r.y0, r.x1, r.y1].map((x) => +x.toFixed(2))) }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
