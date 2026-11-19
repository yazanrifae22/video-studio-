/**
 * dev: render a test3d film to an mp4 (video only).
 * npx tsx packages/test3d/src/dev-video.ts <epDir> <score.json> --out file.mp4 [--sub N] [--film film.js] [--extra "k=v&k=v"]
 */
import path from 'node:path';
import { open, renderVideo } from './capture.ts';

const argv = process.argv.slice(2);
const opt = (k: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : undefined; };
const [epDir, score] = argv;
if (!epDir || !score || !opt('out')) { console.error('usage: dev-video.ts <epDir> <score.json> --out file.mp4 [--sub N] [--film f.js] [--extra "k=v&k=v"]'); process.exit(2); }
const s = await open(path.resolve(epDir), path.resolve(score), { sub: opt('sub') ? Number(opt('sub')) : undefined, film: opt('film'), extra: opt('extra') ? '&' + opt('extra') : '' });
try {
  console.log(`${s.info.gl} | ${s.info.frames} frames @ ${s.info.fps} fps | sub ${s.info.sub}`);
  let last = 0;
  const r = await renderVideo(s, path.resolve(opt('out')!), (f) => { if (f - last >= 0.1 || f === 1) { last = f; console.log(`  ${(f * 100).toFixed(0)} %`); } });
  console.log(`done: ${r.frames} frames in ${r.seconds.toFixed(1)} s = ${r.msPerFrame.toFixed(1)} ms/frame -> ${path.resolve(opt('out')!)}`);
  console.log(`cues: ${JSON.stringify(s.info.cues)}`);
} finally { await s.close(); }
