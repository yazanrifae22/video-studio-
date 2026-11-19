/**
 * test3d capture: serves the photographic 3D kit + one film to headless Chrome (GPU WebGL via ANGLE/D3D11) and either renders
 * the whole film to an H.264 mp4 (WebCodecs encoder inside the page, Annex B pulled in batches, muxed by ffmpeg, video only)
 * or grabs stills. Same shapes as packages/kids3d/src/capture.ts. One render at a time (callers hold the studio 'render' lock).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium, type Browser, type Page } from 'playwright-core';
import { P } from '../../shared/src/paths.ts';
import { chromePath } from '../../render/src/text.ts';

const run = promisify(execFile);
const WEB = path.join(P.root, 'packages', 'test3d', 'web');
const THREE_DIR = path.join(P.root, 'node_modules', 'three');
const TYPES: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

export interface Cue { name: string; t: number; db: number; dur?: number }
export interface Info { frames: number; fps: number; width: number; height: number; duration: number; gl: string; sub: number; cues: Cue[] }
export interface Session { page: Page; browser: Browser; close: () => Promise<void>; info: Info }
export interface OpenOpts { width?: number; height?: number; sub?: number; film?: string; extra?: string }

/** epDir = folder that holds the film module (served as /ep/*, default /ep/film.js); scorePath = score.json */
export async function open(epDir: string, scorePath: string, opts: OpenOpts = {}): Promise<Session> {
  const W = opts.width ?? 1080, H = opts.height ?? 1920;
  const inside = (f: string, root: string) => { const r = path.relative(path.resolve(root), path.resolve(f)); return !r.startsWith('..') && !path.isAbsolute(r); };
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url!.split('?')[0]);
    let f: string | null = null, root: string | null = null;
    if (u === '/favicon.ico') { s.writeHead(204); return s.end(); }
    if (u === '/' || u === '/index.html') { f = path.join(WEB, 'index.html'); root = WEB; }
    else if (u.startsWith('/three/')) { f = path.join(THREE_DIR, u.slice(7)); root = THREE_DIR; }
    else if (u.startsWith('/kit/')) { f = path.join(WEB, u.slice(5)); root = WEB; }
    else if (u.startsWith('/ep/')) { f = path.join(epDir, u.slice(4)); root = epDir; }
    else if (u === '/score.json') { f = scorePath; root = path.dirname(scorePath); }
    if (!f || !root || !inside(f, root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(s);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const port = (srv.address() as any).port;
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb'] });
  const fail = async (msg: string) => { await browser.close().catch(() => {}); srv.close(); return new Error(msg); };
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const film = opts.film ? (opts.film.startsWith('/') ? opts.film : `/ep/${opts.film}`) : '/ep/film.js';
  await page.goto(`http://127.0.0.1:${port}/?w=${W}&h=${H}&sub=${opts.sub ?? 16}&film=${encodeURIComponent(film)}${opts.extra ?? ''}`);
  try { await page.waitForFunction('window.ready === true || !!window.bootError', null, { timeout: 180_000 }); }
  catch { throw await fail(`test3d page did not boot: ${errs.join(' | ').slice(0, 1200)}`); }
  const bootError = await page.evaluate('window.bootError || null');
  if (bootError) throw await fail(`test3d film failed: ${bootError}`);
  const info = await page.evaluate('t3d.info()') as Info;
  if (!/NVIDIA|AMD|Intel/i.test(String(info.gl))) console.error(`[test3d] warning: WebGL renderer is "${info.gl}" (software?)`);
  if (errs.length) console.error(`[test3d] page errors: ${errs.join(' | ').slice(0, 1500)}`);
  return { page, browser, info, close: async () => { await browser.close(); srv.close(); } };
}

/** Render every frame to <out>.mp4 (video only, H.264). Returns timing. */
export async function renderVideo(s: Session, out: string, onProgress?: (f: number) => void) {
  const t0 = Date.now(), N = s.info.frames;
  const h264 = out.replace(/\.mp4$/i, '') + '.h264';
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(h264, Buffer.alloc(0));
  await s.page.evaluate('t3d.encStart()');
  for (let i = 0; i < N;) {
    i = await s.page.evaluate(`t3d.renderBatch(${i}, 15)`) as number;
    fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('t3d.take()') as string, 'base64'));
    onProgress?.(i / N);
  }
  await s.page.evaluate('t3d.encFlush()');
  fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('t3d.take()') as string, 'base64'));
  await run('ffmpeg', ['-v', 'error', '-y', '-r', String(s.info.fps), '-f', 'h264', '-i', h264, '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(h264);
  const seconds = (Date.now() - t0) / 1000;
  return { frames: N, seconds, msPerFrame: seconds * 1000 / N };
}

/** Render frames [f0, f1) to <out>.mp4 (video only, H.264, first frame a key frame): one long-form segment or a preview window.
 *  Segments of the same session settings join losslessly (ffmpeg concat demuxer, -c copy). */
export async function renderRange(s: Session, out: string, f0: number, f1: number, onProgress?: (done: number, total: number) => void) {
  const t0 = Date.now(), N = s.info.frames;
  f0 = Math.max(0, Math.min(N, Math.round(f0))); f1 = Math.max(f0, Math.min(N, Math.round(f1)));
  if (f1 <= f0) throw new Error(`renderRange: empty frame range ${f0}..${f1} (film has ${N} frames)`);
  const h264 = out.replace(/\.mp4$/i, '') + '.h264';
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(h264, Buffer.alloc(0));
  await s.page.evaluate('t3d.encStart()');
  for (let i = f0; i < f1;) {
    i = await s.page.evaluate(`t3d.renderBatch(${i}, 15, ${f1})`) as number;
    fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('t3d.take()') as string, 'base64'));
    onProgress?.(i - f0, f1 - f0);
  }
  await s.page.evaluate('t3d.encFlush()');
  fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('t3d.take()') as string, 'base64'));
  await run('ffmpeg', ['-v', 'error', '-y', '-r', String(s.info.fps), '-f', 'h264', '-i', h264, '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(h264);
  const seconds = (Date.now() - t0) / 1000;
  return { frames: f1 - f0, seconds, msPerFrame: seconds * 1000 / (f1 - f0) };
}

/** JPEG stills (full frame scaled to `width`). crop = [x, y, w, h] as fractions of the frame for a detail view. */
export async function stills(s: Session, times: number[], dir: string, width = 540, crop: number[] | null = null) {
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const t of times) {
    const d = await s.page.evaluate(`t3d.still(${t}, ${width}, ${JSON.stringify(crop)})`) as string;
    const f = path.join(dir, `t${t.toFixed(2).padStart(7, '0')}${crop ? '-crop' : ''}.jpg`);
    fs.writeFileSync(f, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); files.push(f);
  }
  return files;
}
