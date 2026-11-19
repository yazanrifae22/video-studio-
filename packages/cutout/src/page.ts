/**
 * Cutout page session for stills and cues (the video itself is captured by packages/quizlong/src/capture.ts capturePicture):
 * serves the repo root restricted to the allow-list, opens frame.html in headless Chrome, calls `await __load(show, opts)` and
 * returns its `{cues, lint, marks}`; `shot(t, file, width)` seeks (film time) and saves a jpg.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, type Browser, type Page } from 'playwright-core';
import { P } from '../../shared/src/paths.ts';
import { chromePath } from '../../render/src/text.ts';

const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
const LAUNCH_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'];

/** static server over the repo root: only the page folder + `allow` folders (+ the show at /__show/show.json) */
export async function serveDir(pageDir: string, allow: string[], showFile?: string) {
  const ok = [pageDir, ...allow].map(a => path.resolve(P.root, a).toLowerCase() + path.sep);
  const srv = http.createServer((q, s) => {
    const u = decodeURIComponent((q.url ?? '/').split('?')[0]);
    if (u === '/favicon.ico') { s.writeHead(204); return s.end(); }
    const f = u === '/__show/show.json' && showFile ? showFile : path.join(P.root, u);
    const allowed = f === showFile || ok.some(a => (path.resolve(f).toLowerCase() + path.sep).startsWith(a));
    if (!allowed || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
    s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(s);
  }).listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  const rel = path.relative(P.root, pageDir).split(path.sep).map(encodeURIComponent).join('/');
  return { srv, url: `http://127.0.0.1:${(srv.address() as any).port}/${rel}/frame.html` };
}

export interface Cue { name: string; t: number; db?: number; dur?: number }
export interface PageInfo { cues: Cue[]; lint: string[]; marks?: Record<string, unknown> | null; errors: string[] }
export interface Session { page: Page; info: PageInfo; shot: (t: number, file: string) => Promise<string>; close: () => Promise<void> }

/** open frame.html at the show's size, `__load(show, {warm:true})`, return the load info. Caller closes. */
export async function openPage(pageDir: string, allow: string[], show: any, o: { scale?: number } = {}): Promise<Session> {
  const { srv, url } = await serveDir(pageDir, allow);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: LAUNCH_ARGS });
    const page = await browser.newPage({ viewport: { width: show.width, height: show.height }, deviceScaleFactor: o.scale ?? 1 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url);
    try { await page.waitForFunction('typeof window.__load === "function" && typeof window.__seek === "function"', null, { timeout: 60_000 }); }
    catch { throw new Error(`cutout page has no __load/__seek: ${errors.join(' | ').slice(0, 600)}`); }
    const r: any = await page.evaluate(async (s: any) => { const w = window as any; const x = await w.__load(s, { warm: true }); if (w.__ready && typeof w.__ready.then === 'function') await w.__ready; return x ?? null; }, show);
    await page.waitForFunction('window.__ready === true || !!(window.__ready && typeof window.__ready.then === "function")', null, { timeout: 120_000 });
    const info: PageInfo = { cues: Array.isArray(r?.cues) ? r.cues : [], lint: Array.isArray(r?.lint) ? r.lint.map(String) : [], marks: r?.marks ?? null, errors };
    const b = browser;
    return {
      page, info,
      shot: async (t: number, file: string) => {
        await page.evaluate(async (x: number) => { const w = window as any; const p = w.__seek(x); if (p && typeof p.then === 'function') await p; }, t);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
        return file;
      },
      close: async () => { await b.close().catch(() => {}); srv.close(); },
    };
  } catch (e) { await browser?.close().catch(() => {}); srv.close(); throw e; }
}
