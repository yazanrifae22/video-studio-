// dev: the avoid rectangles the Host view hands the tag layout at given times. npx tsx .../dev-host/avoid.ts 167.13
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-u1h6');
const s = await open(ep, path.join(ep, 'v2/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv[2].split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { const st = K.show.state(${t}); K.view.draw(st, ${t}); const cam = K.camera; cam.fov = K.lens.fov; cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const e = K.view.cast.teller.marks.eyes.clone().project(cam);
      return { t: ${t}, eyes: [+(0.5 + 0.5 * e.x).toFixed(2), +(0.5 - 0.5 * e.y).toFixed(2)], avoid: K.view.objects.avoidRects.map((q) => [q.x0, q.y0, q.x1, q.y1].map((v) => +v.toFixed(2))), tags: (st.tags || []).map((g) => [g.text, JSON.stringify(g.anchor)]) }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
