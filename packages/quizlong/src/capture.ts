/**
 * quiz-long picture capture: serves the template page (show-contract API: `await __load(show)`, `__seek(t)`, `__ready`)
 * to N headless Chrome instances (GPU, ANGLE/D3D11), each owning one contiguous frame range. Per frame: `__seek(f/fps)` ->
 * CDP Page.captureScreenshot -> piped as an image stream into its own ffmpeg h264_nvenc encoder -> partK.mp4 (each part
 * starts on an IDR frame, same encoder settings) -> joined by stream copy into picture.mp4 (exactly `frames` frames).
 * Colour is tagged like packages/render output (full-range BT.601) so the compositor passes it through unchanged.
 * Callers hold the studio 'render' lock.
 */
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { P } from '../../shared/src/paths.ts';
import { chromePath } from '../../render/src/text.ts';

const run = promisify(execFile);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
export const TEMPLATE_DIR = path.join(P.root, 'packages', 'quizlong', 'template');
export const STUB_DIR = path.join(P.root, 'packages', 'quizlong', 'template-stub');

/** --template <dir> (absolute or repo-relative), else packages/quizlong/template when it has frame.html, else the stub. */
export function resolveTemplate(dir?: string) {
  const d = dir ? path.resolve(P.root, dir) : fs.existsSync(path.join(TEMPLATE_DIR, 'frame.html')) ? TEMPLATE_DIR : STUB_DIR;
  if (!fs.existsSync(path.join(d, 'frame.html'))) throw new Error(`quiz-long template: ${d}\\frame.html not found`);
  return d;
}

/**
 * Local HTTP server over the repo root, restricted to the template folder, brand assets (fonts), node_modules (flag-icons,
 * fonts) and the show file (served at /__show/show.json). Template pages reference fonts relatively (../../../data/brand/...).
 */
async function serve(templateDir: string, showFile: string, extra: string[] = []) {
  const allow = [templateDir, path.join(P.data, 'brand'), path.join(P.root, 'node_modules'), ...extra].map(a => path.resolve(P.root, a).toLowerCase());
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent((q.url ?? '/').split('?')[0]);
    const f = u === '/__show/show.json' ? showFile : path.join(P.root, u);
    const ok = f === showFile || allow.some(a => path.resolve(f).toLowerCase().startsWith(a));
    if (!ok || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(s);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const rel = path.relative(P.root, templateDir).split(path.sep).map(encodeURIComponent).join('/');
  // no ?show= on the URL: the builder calls __load(show, opts) itself (a self-load first would warm the page twice)
  return { srv, url: `http://127.0.0.1:${(srv.address() as any).port}/${rel}/frame.html` };
}

export interface CaptureOpts {
  templateDir: string; showFile: string; out: string;
  fps?: number; width?: number; height?: number; frames: number;
  /** parallel Chrome instances (default: up to 4, >= 150 frames each). Measured 2026-11-13 on the real template (RTX 4070
   *  laptop, 60 s window, drift + warm): 4 workers 45.8 frames/s (load 7 s), 6 workers 50.2 frames/s (load 13.6 s) = +7 %
   *  on a full episode for 1.5x the memory -> 4. Full 9:20 episode (16.8k frames) ~ 6.3 min. */
  workers?: number;
  /** frame image format through the pipe. jpeg q95 = 45.8 frames/s vs png 28.9 (4 workers); Saudi-flag calligraphy at 2x
   *  zoom shows no JPEG artefacts after NVENC (PSNR 42 dB / SSIM 0.994 vs png) -> jpeg 95 */
  format?: 'jpeg' | 'png'; quality?: number;
  /** encoder args (default h264_nvenc p4, cq 16) */
  videoArgs?: string[];
  onProgress?: (fraction: number) => void;
  /** optional time mapping: frame index -> seconds (default f / fps) */
  timeOf?: (f: number) => number;
  /** options for the page's __load(show, opts) (default {drift: true, warm: true}) */
  load?: Record<string, unknown>;
  /** extra folders the page may load from (absolute or repo-relative), on top of the template folder, data/brand and node_modules */
  allow?: string[];
}

const LAUNCH_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];

export async function capturePicture(o: CaptureOpts) {
  const fps = o.fps ?? 30, W = o.width ?? 1920, H = o.height ?? 1080, N = o.frames;
  const fmt = o.format ?? 'jpeg', quality = o.quality ?? 95;
  const workers = Math.max(1, Math.min(o.workers ?? 4, Math.ceil(N / 150)));
  const venc = o.videoArgs ?? ['-c:v', 'h264_nvenc', '-preset', 'p4', '-rc', 'vbr', '-cq', '16', '-b:v', '0', '-profile:v', 'high', '-g', String(fps * 2), '-bf', '0'];
  const work = path.join(path.dirname(o.out), 'capture-work');
  fs.mkdirSync(work, { recursive: true });
  const show = JSON.parse(fs.readFileSync(o.showFile, 'utf8'));
  const { srv, url } = await serve(o.templateDir, o.showFile, o.allow);
  const t0 = Date.now();
  const cut = Array.from({ length: workers + 1 }, (_, i) => Math.round((N * i) / workers));
  const done = new Array(workers).fill(0);
  let lastP = -1;
  const tick = () => { const f = done.reduce((a, b) => a + b, 0) / N; if (o.onProgress && f - lastP >= 0.02) { lastP = f; o.onProgress(f); } };
  const parts = cut.slice(0, -1).map((_, i) => path.join(work, `part${i}.mp4`));
  const timeOf = o.timeOf ?? ((f: number) => f / fps);
  const stats: { worker: number; frames: number; seconds: number; gl: string }[] = [];
  const loadOpts = { drift: true, warm: true, ...(o.load ?? {}) };
  const loadSec: number[] = [], lint: string[] = [];
  try {
    await Promise.all(parts.map(async (part, wi) => {
      const a = cut[wi], b = cut[wi + 1];
      const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: LAUNCH_ARGS });
      const errs: string[] = [];
      let ff: ReturnType<typeof spawn> | null = null;
      try {
        const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
        page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        // the page may self-load from ?show=; either way we hand it the parsed show (contract: __load(show))
        await page.goto(url);
        try { await page.waitForFunction('typeof window.__load === "function" && typeof window.__seek === "function"', null, { timeout: 60_000 }); }
        catch { throw new Error(`template page has no __load/__seek: ${errs.join(' | ').slice(0, 600)}`); }
        // contract: __ready === true after load; a page that exposes __ready as a promise (the design prototype) is awaited too
        // real template: warm:true paints every segment once (~2.6 s) so the first captured frame is complete; drift stays on
        const tl = Date.now();
        const info: any = await page.evaluate(async ([s, lo]: any) => { const w = window as any; const r = await w.__load(s, lo); if (w.__ready && typeof w.__ready.then === 'function') await w.__ready; return r ?? null; }, [show, loadOpts] as const);
        loadSec.push((Date.now() - tl) / 1000);
        if (wi === 0 && info?.lint?.length) lint.push(...info.lint);
        await page.waitForFunction('window.__ready === true || !!(window.__ready && typeof window.__ready.then === "function")', null, { timeout: 120_000 });
        const gl = String(await page.evaluate(`(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c && c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; })()`));
        const cdp = await page.context().newCDPSession(page);
        ff = spawn('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', fmt === 'png' ? 'png' : 'mjpeg', '-i', '-',
          '-vf', 'scale=out_color_matrix=bt601:out_range=full,format=yuv420p', ...venc, '-color_range', 'pc', '-colorspace', 'bt470bg', '-r', String(fps), '-frames:v', String(b - a), '-an', part], { stdio: ['pipe', 'ignore', 'pipe'] });
        let ferr = '';
        ff.stderr!.on('data', (x: Buffer) => { ferr = (ferr + x.toString()).slice(-3000); });
        const closed = new Promise<void>((res, rej) => { ff!.on('error', rej); ff!.on('close', c => c === 0 ? res() : rej(new Error(`capture encoder (part ${wi}) failed (${c}): ${ferr.slice(-800)}`))); });
        const ts = Date.now();
        for (let f = a; f < b; f++) {
          const r = await cdp.send('Runtime.evaluate', { expression: `window.__seek(${timeOf(f)})`, returnByValue: true });
          if (r.exceptionDetails) throw new Error(`__seek(${timeOf(f).toFixed(3)}) threw: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
          const shot = await cdp.send('Page.captureScreenshot', { format: fmt, ...(fmt === 'jpeg' ? { quality } : {}), optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false });
          if (!ff.stdin!.write(Buffer.from(shot.data, 'base64'))) await new Promise(r2 => ff!.stdin!.once('drain', r2));
          done[wi] = f - a + 1; tick();
        }
        ff.stdin!.end();
        await closed;
        if (errs.length) console.error(`[quizlong] page errors in worker ${wi}: ${errs.slice(0, 3).join(' | ').slice(0, 400)}`);
        stats.push({ worker: wi, frames: b - a, seconds: (Date.now() - ts) / 1000, gl });
      } finally {
        try { ff?.stdin?.end(); } catch { /* closed */ }
        await browser.close().catch(() => {});
      }
    }));
  } finally { srv.close(); }
  const list = path.join(work, 'parts.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
  await run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-color_range', 'pc', '-colorspace', 'bt470bg', '-movflags', '+faststart', o.out]);
  const got = parseInt(String((await run('ffprobe', ['-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', o.out])).stdout).trim());
  if (got !== N) throw new Error(`picture.mp4 has ${got} frames, expected ${N}`);
  for (const p of [...parts, list]) fs.rmSync(p, { force: true });
  try { fs.rmdirSync(work); } catch { /* not empty */ }
  const seconds = (Date.now() - t0) / 1000;
  return { frames: N, workers, format: fmt, seconds: +seconds.toFixed(1), capture_fps: +(N / seconds).toFixed(1), ms_per_frame_per_worker: +(Math.max(...stats.map(s => s.seconds * 1000 / s.frames))).toFixed(1), gl: stats[0]?.gl,
    load_s: loadSec.length ? +Math.max(...loadSec).toFixed(1) : null, load: loadOpts, template_lint: lint, per_worker: stats };
}
