// dev: CPU cost of state(t) + draw (no GPU work) and pawn/disc counts
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv.slice(2).map(Number)) {
    const r = await s.page.evaluate(`(() => { const t0 = performance.now(); let st; for (let i = 0; i < 17; i++) st = K.show.state(${t} + i * 0.001); const t1 = performance.now(); for (let i = 0; i < 17; i++) K.view.draw(K.show.state(${t} + i * 0.001), ${t} + i * 0.001); const t2 = performance.now();
      const sc = K.scene; let inst = []; sc.traverse(o => { if (o.isInstancedMesh) inst.push(o.count); });
      return { t: ${t}, stateMs: +(t1 - t0).toFixed(1), drawMs: +(t2 - t1).toFixed(1), inst }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
