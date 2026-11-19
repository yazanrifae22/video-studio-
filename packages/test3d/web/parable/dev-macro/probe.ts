// dev: camera numbers per fixture time (sub 1), and bench. npx tsx packages/test3d/web/parable/dev-macro/probe.ts [times] [--bench] [--film f.js] [--score s.json] [--ep dir]
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const argv = process.argv.slice(2), opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const ep = path.resolve(opt('ep') ?? 'packages/test3d/web/parable/dev-macro');
const s = await open(ep, path.resolve(opt('score') ?? path.join(ep, 'score.json')), { width: 1920, height: 1080, sub: Number(opt('sub') ?? 1), film: opt('film') });
try {
  s.page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text().slice(0, 500)}`); });
  for (const t of (argv[0] && !argv[0].startsWith('--') ? argv[0] : '1,3,5').split(',').map(Number)) {
    const r = await s.page.evaluate(`(() => { t3d.still(${t}, 64); const c = K.camera; return { t: ${t}, pos: c.position.toArray().map(v => +v.toFixed(3)), fov: K.lens.fov, focus: +K.lens.focus.toFixed(3), f: K.lens.fstop, dbg: K.dbgCam ?? null }; })()`);
    console.log(JSON.stringify(r));
  }
  if (argv.includes('--bench')) for (const t of (opt('bench') ?? '1').split(',').map(Number)) { await s.page.evaluate(`t3d.bench(${t}, 2)`); console.log(`bench t=${t}: ${(await s.page.evaluate(`t3d.bench(${t}, 8)`) as number).toFixed(1)} ms/frame`); }
} finally { await s.close(); }
