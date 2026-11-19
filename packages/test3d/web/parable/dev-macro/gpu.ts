// dev: GPU cost experiments at one t (sub 16): toggles parts of the scene and benches
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy'), t = Number(process.argv[2] ?? 188.4);
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 1920, height: 1080, sub: 16 });
try {
  await s.page.evaluate(`window.__orig = K.view.draw; window.__hide = null; K.view.draw = (st, tt) => { window.__orig(st, tt); if (window.__hide) window.__hide(); };`);
  const exps = {
    base: 'null',
    noDiscs: `() => { K.scene.traverse(o => { if (o.isInstancedMesh && o.material.type === 'MeshPhysicalMaterial' && !o.geometry.attributes.aLook && o.count > 100) o.visible = false; }); }`,
    noPawns: `() => { K.scene.traverse(o => { if (o.isInstancedMesh && o.geometry.attributes.aLook) o.visible = false; }); }`,
    noShadow: `() => { K.renderer.shadowMap.enabled = false; }`,
    noRimShadow: `() => { K.areaLights[1].castShadow = false; }`,
    base2: 'null',
  };
  for (const [k, f] of Object.entries(exps)) {
    await s.page.evaluate(`K.renderer.shadowMap.enabled = true; K.areaLights.forEach((l, i) => l.castShadow = i < 2); K.scene.traverse(o => { if (o.isInstancedMesh) o.visible = true; }); window.__hide = ${f};`);
    console.log(k, (await s.page.evaluate(`t3d.bench(${t}, 5)`) as number).toFixed(1));
  }
} finally { await s.close(); }
