/**
 * kids3d capture: serves the kit + one episode to headless Chrome (GPU WebGL via ANGLE/D3D11) and either renders the
 * whole episode to an H.264 mp4 (WebCodecs hardware encoder inside the page, Annex B pulled in batches, muxed by ffmpeg)
 * or grabs stills. One render at a time (callers hold the studio 'render' lock).
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
const WEB = path.join(P.root, 'packages', 'kids3d', 'web');
const THREE_DIR = path.join(P.root, 'node_modules', 'three');
const TYPES: Record<string, string> = { '.js': 'text/javascript', '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };

export interface Session { page: Page; browser: Browser; close: () => Promise<void>; info: any }

/** epDir = productions/<id> (choreo.js lives there), score = score.json path */
export async function open(epDir: string, score: string, opts: { width?: number; height?: number; sub?: number; choreo?: string; extra?: string; epUrl?: string } = {}): Promise<Session> {
  const W = opts.width ?? 1920, H = opts.height ?? 1080;
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent(q.url!.split('?')[0]);
    let f: string | null = null;
    if (u === '/' || u === '/index.html') f = path.join(WEB, 'index.html');
    else if (u.startsWith('/three/')) f = path.join(THREE_DIR, u.slice(7));
    else if (u.startsWith('/kit/')) f = path.join(WEB, u.slice(5));
    else if (u.startsWith('/ep/')) f = path.join(epDir, u.slice(4));
    else if (u === '/score.json') f = score;
    const root = f && [WEB, THREE_DIR, epDir].find(r => path.resolve(f!).startsWith(path.resolve(r)));
    if (!f || (!root && f !== score) || !fs.existsSync(f)) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(s);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const port = (srv.address() as any).port;
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/?w=${W}&h=${H}&sub=${opts.sub ?? 4}&ep=${opts.epUrl ?? `/ep/${opts.choreo ?? 'choreo.js'}`}${opts.extra ?? ''}`);
  try { await page.waitForFunction('window.ready === true || !!window.bootError', null, { timeout: 120_000 }); }
  catch { throw new Error(`kids3d page did not boot: ${errs.join(' | ').slice(0, 800)}`); }
  const bootError = await page.evaluate('window.bootError || null');
  if (bootError) { await browser.close(); srv.close(); throw new Error(`kids3d choreography failed: ${bootError}`); }
  const info = await page.evaluate('kids.info()');
  if (!/NVIDIA|AMD|Intel/i.test(String((info as any).gl))) console.error(`[kids3d] warning: WebGL renderer is "${(info as any).gl}" (software?)`);
  return { page, browser, info, close: async () => { await browser.close(); srv.close(); } };
}

/** Render every frame to <out>.mp4 (video only). Returns timing. */
export async function renderVideo(s: Session, out: string, onProgress?: (f: number) => void) {
  const t0 = Date.now(), N = s.info.frames as number;
  const h264 = out.replace(/\.mp4$/, '.h264');
  fs.writeFileSync(h264, Buffer.alloc(0));
  await s.page.evaluate('kids.encStart()');
  for (let i = 0; i < N;) {
    i = await s.page.evaluate(`kids.renderBatch(${i}, 30)`) as number;
    fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('kids.take()') as string, 'base64'));
    onProgress?.(i / N);
  }
  await s.page.evaluate('kids.encFlush()');
  fs.appendFileSync(h264, Buffer.from(await s.page.evaluate('kids.take()') as string, 'base64'));
  const fps = (await s.page.evaluate('K.fps')) as number;
  await run('ffmpeg', ['-v', 'error', '-y', '-r', String(fps), '-f', 'h264', '-i', h264, '-c', 'copy', '-movflags', '+faststart', out]);
  fs.rmSync(h264);
  const seconds = (Date.now() - t0) / 1000;
  return { frames: N, seconds, msPerFrame: seconds * 1000 / N };
}

export async function stills(s: Session, times: number[], dir: string, width = 480) {
  fs.mkdirSync(dir, { recursive: true });
  const files: string[] = [];
  for (const t of times) {
    const d = await s.page.evaluate(`kids.still(${t}, ${width})`) as string;
    const f = path.join(dir, `t${t.toFixed(2).padStart(7, '0')}.jpg`);
    fs.writeFileSync(f, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); files.push(f);
  }
  return files;
}

export async function titlePng(s: Session, lines: string[], file: string) {
  const d = await s.page.evaluate(`kids.title(${JSON.stringify(lines)})`) as string;
  fs.writeFileSync(file, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
  return file;
}

/** 1280x720 thumbnail PNG from the choreography's K.thumbnail() shot (big "?" badge drawn in the page). */
export async function thumbPng(s: Session, file: string, badge?: { series?: string; ep?: number; mark?: string | null; clean?: boolean } | null) {
  const d = await s.page.evaluate(`kids.thumbnail(${JSON.stringify(badge ?? null)})`) as string;
  fs.writeFileSync(file, Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
  return file;
}
