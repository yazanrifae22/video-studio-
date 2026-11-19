import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 1 });
try {
  for (const t of process.argv.slice(2).map(Number)) {
    const r = await s.page.evaluate(`(() => { const V = K.view; const sts = []; for (let i = 0; i < 17; i++) sts.push(K.show.state(${t} + i * 0.001));
      const a = performance.now(); for (let i = 0; i < 17; i++) V.objects.update(sts[i], ${t} + i * 0.001); const b = performance.now(); for (let i = 0; i < 17; i++) V.camera.apply(sts[i], ${t} + i * 0.001); const c = performance.now();
      return { t: ${t}, update: +(b - a).toFixed(1), camera: +(c - b).toFixed(1) }; })()`);
    console.log(JSON.stringify(r));
  }
} finally { await s.close(); }
