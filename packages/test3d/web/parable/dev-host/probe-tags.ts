// dev: per time, the placed tags (text + screen box) and leader lines, and whether any of them touches a face rect (Host view, draft score).
// npx tsx packages/test3d/web/parable/dev-host/probe-tags.ts 170,183
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv[2].split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { const T = K.THREE, st = K.show.state(${t}); K.view.draw(st, ${t}); const cam = K.camera; cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      for (const f of K.onFrame) { try { f(${t}, cam, K.lens); } catch (e) {} }
      cam.updateMatrixWorld();
      const pr = (q) => { const p = q.clone().project(cam); return [0.5 + 0.5 * p.x, 0.5 - 0.5 * p.y]; };
      const faces = (K.view.objects.avoidRects || []).filter((_, i) => i === 0 || i === 2).map((r) => [r.x0, r.y0, r.x1, r.y1]);
      const fr = (a) => a.map((x) => +x.toFixed(3));
      const tags = [], lines = [];
      K.scene.traverse((o) => {
        if (o.setText && (o.opacity ?? 0) > 0.05) { const c = pr(o.position); tags.push({ text: o.text ?? o.userData?.text ?? '?', at: fr(c) }); }
        if (o.isMesh && o.renderOrder === 95 && o.visible) { o.updateMatrixWorld(); const a = pr(new T.Vector3(-0.5, 0, 0).applyMatrix4(o.matrixWorld)), b = pr(new T.Vector3(0.5, 0, 0).applyMatrix4(o.matrixWorld)); lines.push(fr([...a, ...b])); }
      });
      const seg = (l, r) => { for (let k = 0; k <= 20; k++) { const x = l[0] + (l[2] - l[0]) * k / 20, y = l[1] + (l[3] - l[1]) * k / 20; if (x > r[0] && x < r[2] && y > r[1] && y < r[3]) return true; } return false; };
      const bad = []; for (const l of lines) for (const f of faces) if (seg(l, f)) bad.push('line ' + l.join(',')); for (const g of tags) for (const f of faces) if (g.at[0] > f[0] && g.at[0] < f[2] && g.at[1] > f[1] && g.at[1] < f[3]) bad.push('tag ' + g.text);
      return { t: ${t}, shot: st.shot.id, kind: st.shot.kind, faces: faces.map(fr), tags, lines, bad }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
