// dev: NEON stills + subject box + tag layout at given times of the real score (sub 1 unless --sub), and an optional bench.
// npx tsx packages/test3d/web/parable/dev-neon/probe.ts 5.18,12 [--out DIR] [--sub 4] [--width 960] [--bench 300,330]
import path from 'node:path';
import fs from 'node:fs';
import { open } from '../../../src/capture.ts';
const argv = process.argv.slice(2), opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const ep = path.resolve('productions/expl-261115-1yab'), ver = opt('version', '2');
const film = JSON.parse(fs.readFileSync(path.join(ep, 'film.json'), 'utf8'));
const extra = Object.entries(film.engine ?? {}).map(([k, v]) => `&${k}=${v}`).join('');
const s = await open(ep, path.join(ep, `v${ver}`, 'score.json'), { width: 1920, height: 1080, sub: Number(opt('sub', '1')), extra });
const out = opt('out');
try {
  s.page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text().slice(0, 300)}`); });
  if (out) fs.mkdirSync(out, { recursive: true });
  for (const t of (argv[0] && !argv[0].startsWith('--') ? argv[0] : '5').split(',').map(Number)) {
    const r: any = await s.page.evaluate(`(() => { window.NEON_DEBUG = []; const url = t3d.still(${t}, ${Number(opt('width', '960'))}); const st = window.NEON_VIEW && K.__show ? null : null;
      const c = K.camera; return { url, pos: c.position.toArray().map(v => +v.toFixed(3)), fov: +c.fov.toFixed(1), tags: window.NEON_DEBUG.map(d => d.text + '@' + d.r.map(v => v.toFixed(2)).join(',')) }; })()`);
    if (out) fs.writeFileSync(path.join(out, `t${t}.jpg`), Buffer.from(r.url.split(',')[1], 'base64'));
    console.log(t, JSON.stringify({ pos: r.pos, fov: r.fov, tags: r.tags }));
  }
  if (opt('eval')) console.log(JSON.stringify(await s.page.evaluate(opt('eval')!)));
  if (opt('bench')) for (const t of opt('bench')!.split(',').map(Number)) { await s.page.evaluate(`t3d.bench(${t}, 2)`); console.log(`bench t=${t}: ${(await s.page.evaluate(`t3d.bench(${t}, 8)`) as number).toFixed(1)} ms/frame (sub ${s.info.sub})`); }
} finally { await s.close(); }
