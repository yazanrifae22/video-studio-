/**
 * dev: stills of a test3d film.
 * npx tsx packages/test3d/src/dev-stills.ts <epDir> <score.json> --times a,b,c --out DIR [--sub N] [--width 540] [--film film.js] [--crop x,y,w,h] [--extra "tm=aces&grain=0"] [--bench]
 */
import path from 'node:path';
import { open, stills } from './capture.ts';

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const [epDir, score] = argv;
if (!epDir || !score || !opt('times') || !opt('out')) { console.error('usage: dev-stills.ts <epDir> <score.json> --times a,b,c --out DIR [--sub N] [--width 540] [--film f.js] [--crop x,y,w,h] [--extra "k=v&k=v"] [--bench]'); process.exit(2); }
const t0 = Date.now();
const size = opt('size') ? opt('size')!.split('x').map(Number) : null;   // --size 1920x1080 (16:9 long-form check); default 1080x1920
const s = await open(path.resolve(epDir), path.resolve(score), { ...(size ? { width: size[0], height: size[1] } : {}), sub: opt('sub') ? Number(opt('sub')) : undefined, film: opt('film'), extra: opt('extra') ? '&' + opt('extra') : '' });
try {
  s.page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}] ${m.text().slice(0, 700)}`); });
  s.page.on('pageerror', (e) => console.log(`[page error] ${String(e).slice(0, 700)}`));
  console.log(`boot ${((Date.now() - t0) / 1000).toFixed(1)} s | ${s.info.gl} | ${s.info.frames} frames @ ${s.info.fps} fps | sub ${s.info.sub} | ${s.info.cues.length} cues`);
  const files = await stills(s, opt('times')!.split(',').map(Number), path.resolve(opt('out')!), Number(opt('width') ?? 540), opt('crop') ? opt('crop')!.split(',').map(Number) : null);
  for (const f of files) console.log(f);
  if (argv.includes('--bench')) console.log(`bench: ${(await s.page.evaluate('t3d.bench(1, 6)') as number).toFixed(1)} ms/frame (no encode)`);
} finally { await s.close(); }
