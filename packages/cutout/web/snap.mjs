// Karto cutout page: stills, seek-determinism check, capture speed.
//   node packages/cutout/web/snap.mjs <show.json> --times 0.5,3,12 --out DIR [--width 640] [--check-seek] [--perf 300] [--no-drift] [--png]
// Serves the repo root (allow-list: packages/cutout, data/brand, node_modules, the show's folder), opens
// packages/cutout/web/frame.html in headless system Chrome, __load(show), seeks and writes t<sec>.jpg at --width.
// Prints lint, cue count and page errors.
//   --check-seek  fresh page seek(t) vs seek(end) -> seek(t/2) -> seek(t) on one page: must be pixel-identical
//   --perf N      N frames at full size with one worker, CDP jpeg q95 like packages/quizlong/src/capture.ts -> frames/s
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = require('playwright-core');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const showFile = args.find((a, i) => !a.startsWith('--') && !(i > 0 && ['--times', '--out', '--width', '--perf'].includes(args[i - 1])));
if (!showFile) { console.error('usage: node packages/cutout/web/snap.mjs <show.json> --times a,b,c --out DIR [--width 640] [--check-seek] [--perf 300] [--no-drift]'); process.exit(2); }
const showPath = path.resolve(process.cwd(), showFile);
const show = JSON.parse(fs.readFileSync(showPath, 'utf8'));
const W = show.width || (show.layout === 'tall' ? 1080 : 1920), H = show.height || (show.layout === 'tall' ? 1920 : 1080);
const times = String(opt('--times', '1')).split(',').map((s) => s.trim()).filter(Boolean);
const outDir = path.resolve(process.cwd(), opt('--out', path.join(path.dirname(showPath), '_snap')));
const width = +opt('--width', 640);
const perfN = flag('--perf') ? +(opt('--perf', '300')) || 300 : 0;
const loadOpts = { drift: !flag('--no-drift'), warm: false };
fs.mkdirSync(outDir, { recursive: true });

const chromePath = () => {
  const c = [process.env.STUDIO_CHROME, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'), '/usr/bin/google-chrome'].filter(Boolean);
  const p = c.find((f) => fs.existsSync(f)); if (!p) throw new Error('no Chrome found (set STUDIO_CHROME)'); return p;
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const allow = [path.join(ROOT, 'packages', 'cutout'), path.join(ROOT, 'data', 'brand'), path.join(ROOT, 'node_modules'), path.dirname(showPath)].map((a) => path.resolve(a).toLowerCase());
const srv = http.createServer((q, s) => {
  const u = decodeURIComponent((q.url ?? '/').split('?')[0]);
  if (u === '/favicon.ico') { s.writeHead(204); return s.end(); }
  const f = path.join(ROOT, u);
  const ok = allow.some((a) => path.resolve(f).toLowerCase().startsWith(a));
  if (!ok || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  if (q.method === 'HEAD') return s.end();
  fs.createReadStream(f).pipe(s);
}).listen(0, '127.0.0.1');
await new Promise((r) => srv.once('listening', r));
const url = `http://127.0.0.1:${srv.address().port}/packages/cutout/web/frame.html`;

const LAUNCH = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
// --no-gpu: software raster, for when the machine is busy (stills only)
const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: flag('--no-gpu') ? ['--disable-gpu', ...LAUNCH.slice(4)] : LAUNCH });
const errs = [];
async function openPage(scale) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !/index\.json$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
  await page.goto(url);
  await page.waitForFunction('typeof window.__load === "function" && typeof window.__seek === "function"', null, { timeout: 30000 });
  const t0 = Date.now();
  const info = await page.evaluate(async ([s, o]) => window.__load(s, o), [show, loadOpts]);
  await page.waitForFunction('window.__ready === true', null, { timeout: 120000 });
  info.loadMs = Date.now() - t0;
  return { page, info };
}
const settle = +opt('--settle', 0); // extra ms after each seek (raster settle test)
const seek = async (page, t) => { await page.evaluate((t) => { window.__seek(t); return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))); }, t); if (settle) await page.waitForTimeout(settle); };

try {
  if (flag('--pose-sheet') || flag('--hero')) { // --pose-sheet out.jpg | --hero DIR (karto.jpg + skip.jpg)
    const p = await browser.newPage({ viewport: { width: 800, height: 600 } }); await p.goto(url);
    const jobs = flag('--hero') ? ['karto', 'skip'].map((id) => [id, path.resolve(process.cwd(), opt('--hero'), id + '.jpg')]) : [['sheet', path.resolve(process.cwd(), opt('--pose-sheet'))]];
    for (const [id, out] of jobs) {
      const data = await p.evaluate(async (id) => { const m = await import('/packages/cutout/web/kit/sheet.js'); return id === 'sheet' ? m.poseSheet() : m.hero(id); }, id);
      fs.writeFileSync(out, Buffer.from(data.split(',')[1], 'base64')); console.log('wrote ' + out);
    }
    await browser.close(); srv.close(); process.exit(0);
  }
  const { page, info } = await openPage(width / W);
  console.log(`loaded in ${info.loadMs} ms; duration ${info.marks?.duration}s; ${info.cues.length} sfx cues; lint ${info.lint.length}`);
  for (const l of info.lint) console.log('  lint: ' + l);
  for (const ts of times) {
    await seek(page, +ts);
    const f = path.join(outDir, `t${ts}.${flag('--png') ? 'png' : 'jpg'}`);
    await page.screenshot({ path: f, type: flag('--png') ? 'png' : 'jpeg', ...(flag('--png') ? {} : { quality: 85 }) });
    console.log('wrote ' + f);
  }
  if (flag('--check-seek')) {
    const dur = info.marks?.duration || 10; let bad = 0;
    for (const ts of times) {
      const t = +ts, fresh = (await openPage(width / W)).page;
      await seek(fresh, t); const a = await fresh.screenshot({ type: 'png' }); await fresh.close();
      let b;
      if (flag('--fresh-pair')) { const f2 = (await openPage(width / W)).page; await seek(f2, t); b = await f2.screenshot({ type: 'png' }); await f2.close(); } // page-to-page noise baseline
      else { await seek(page, dur); await seek(page, t / 2); await seek(page, t); b = await page.screenshot({ type: 'png' }); }
      let diff = 0;
      if (!a.equals(b)) diff = await page.evaluate(async ([x, y]) => {
        const img = async (s) => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
        const p = await img(x), q = await img(y); let n = 0; for (let k = 0; k < p.length; k += 4) if (Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]) > 3) n++; return n;
      }, [a.toString('base64'), b.toString('base64')]);
      if (diff) { bad++; fs.writeFileSync(path.join(outDir, `seek-fresh-t${ts}.png`), a); fs.writeFileSync(path.join(outDir, `seek-back-t${ts}.png`), b); }
      console.log(`check-seek t=${ts}: ${diff ? 'DIFF ' + diff + ' px' : 'identical'}`);
    }
    console.log(bad ? `check-seek: ${bad} time(s) differ` : 'check-seek: all identical');
  }
  if (perfN) {
    const { page: p1 } = await openPage(1);
    const cdp = await p1.context().newCDPSession(p1), dur = info.marks?.duration || 10, fps = show.fps || 30, start = Math.max(0, Math.min(dur - perfN / fps, 2));
    const t0 = Date.now(); let bytes = 0;
    for (let f = 0; f < perfN; f++) {
      await cdp.send('Runtime.evaluate', { expression: `window.__seek(${start + f / fps})`, returnByValue: true });
      const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true, fromSurface: true, captureBeyondViewport: false });
      bytes += shot.data.length;
    }
    const sec = (Date.now() - t0) / 1000;
    console.log(`perf: ${perfN} frames ${W}x${H} one worker in ${sec.toFixed(1)} s = ${(perfN / sec).toFixed(1)} frames/s (avg jpeg ${(bytes * 0.75 / perfN / 1024).toFixed(0)} KB)`);
  }
} finally {
  await browser.close(); srv.close();
  const uniq = [...new Set(errs)];
  console.log(uniq.length ? 'page errors:\n  ' + uniq.slice(0, 20).join('\n  ') : 'page errors: none');
}
