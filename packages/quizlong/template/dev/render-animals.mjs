/* v1.4 dev capture (same Chrome flags and __load/__seek path as src/capture.ts, drift + warm on like a real build).
 *   node render-animals.mjs fixture [outDir]       -> frames of animals-fixture-show.json (make-animal-fixture.ts) at named moments
 *   node render-animals.mjs show <show.json> <outDir> <t1> [t2 ...]   -> <outDir>/t<t>.png for any show.json (regression)
 * Prints lint (missing fonts / flags, text that does not fit) and page errors. PNGs at 1920x1080; the caller scales them.
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(HERE, '..');
const ROOT = path.resolve(TEMPLATE, '..', '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.svg': 'image/svg+xml' };
const ALLOW = [TEMPLATE, path.join(ROOT, 'data', 'brand')].map(a => a.toLowerCase());
const CHROME = [process.env.STUDIO_CHROME, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].filter(Boolean).find(f => fs.existsSync(f));
const LAUNCH_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'];
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!ALLOW.some(a => path.resolve(f).toLowerCase().startsWith(a)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end(); }
  s.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(s);
}).listen(0, '127.0.0.1');
await new Promise(r => srv.once('listening', r));
const URL0 = `http://127.0.0.1:${srv.address().port}/${path.relative(ROOT, TEMPLATE).split(path.sep).join('/')}/frame.html`;

const [cmd = 'fixture', ...args] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: LAUNCH_ARGS });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errs = [];
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const cdp = await page.context().newCDPSession(page);
await page.goto(URL0); await page.waitForFunction('typeof window.__load === "function"');
async function load(show) { const r = await page.evaluate(async s => await window.__load(s, { drift: true, warm: true }), show); await page.waitForFunction('window.__ready === true'); return r; }
async function shot(t, file) {
  await page.evaluate(`window.__seek(${t})`);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
}
const out = { cmd, frames: [] };
if (cmd === 'show') {
  const [showFile, dir, ...ts] = args;
  fs.mkdirSync(dir, { recursive: true });
  const info = await load(JSON.parse(fs.readFileSync(showFile, 'utf8')));
  out.lint = info.lint;
  for (const t of ts) { const f = path.join(dir, `t${t}.png`); await shot(+t, f); out.frames.push(f); }
} else {
  const dir = args[0] || path.join(HERE, 'out', 'animals');
  fs.mkdirSync(dir, { recursive: true });
  const show = JSON.parse(fs.readFileSync(path.join(HERE, 'animals-fixture-show.json'), 'utf8'));
  const info = await load(show);
  out.lint = info.lint;
  const S = id => show.segments.find(s => s.id === id), at = (id, k) => { const s = S(id), T = s.t; return k === 'mid' ? (T.timer_start + T.timer_end) / 2 : k === 'early' ? T.timer_start + .2 * (T.timer_end - T.timer_start) : k === 'rv' ? T.reveal + .25 : k === 'pop' ? T.reveal + .12 : k === 'learn' ? (T.learn_in ?? T.reveal) + 1 : k === 'start' ? s.start + 1.0 : +k; };
  const plan = [
    ['zoom-early', 'q01', 'early'], ['zoom-mid', 'q01', 'mid'], ['zoom-learn', 'q01', 'learn'],
    ['blur-mid', 'q06', 'mid'], ['strips-mid', 'q09', 'mid'],
    ['sil-question', 'q11', 'mid'], ['sil-late', 'q11', 'end-0.05'], ['sil-pop', 'q11', 'pop'], ['sil-reveal', 'q11', 'learn'],
    ['speed-sil-q', 'q04', 'mid'], ['speed-sil-rv', 'q04', 'rv'], ['speed4-q', 'q13', 'mid'], ['speed4-rv', 'q14', 'rv'],
    ['tf-sticker', 'q02', 'learn'], ['sound-sticker', 'q07', 'learn'], ['versus-q', 'q03', 'mid'], ['versus-rv', 'q03', 'learn'],
    ['record-emoji-q', 'q08', 'mid'], ['record-emoji-rv', 'q08', 'learn'], ['whoami-q', 'q10', 'mid'], ['whoami-rv', 'q10', 'learn'],
    ['plain-q', 'q12', 'mid'], ['plain-entrance', 'q12', 'entr'],
  ];
  for (const [name, id, k] of plan) {
    const s = S(id); let t;
    if (k === 'end-0.05') t = s.t.timer_end - 0.05; else if (k === 'entr') t = s.start + 0.45; else t = at(id, k);
    const f = path.join(dir, name + '.png'); await shot(t, f); out.frames.push(f);
  }
  for (const c of show.segments.filter(s => s.type !== 'question')) { const f = path.join(dir, `${c.type}-${c.id}.png`); await shot(Math.min(c.end - .4, c.start + 2.2), f); out.frames.push(f); }
  // leak check: silhouette question phase must hold no animal colour (computed filter on the emoji) and the option keys stay identical
  const leak = [];
  for (const id of ['q11', 'q04', 'q13', 'q14']) {
    const s = S(id);
    for (const t of [s.start + .6, (s.t.timer_start + s.t.timer_end) / 2, s.t.reveal - .02]) {
      await page.evaluate(`window.__seek(${t})`);
      const r = await page.evaluate(() => { const e = [...document.querySelectorAll('.plate.animal .aemo')].find(x => x.offsetParent); return e ? getComputedStyle(e).filter : 'none-visible'; });
      if (!/brightness\(0\)/.test(r) && r !== 'none-visible') leak.push(`${id} t=${t.toFixed(2)} filter=${r}`);
      const keys = await page.evaluate(() => window.__keys());
      if (keys.length && new Set(keys.map(k => JSON.stringify({ ...k, cls: k.cls.replace(/key\s+c-tile\s*/, '') , text: k.text }))).size > 1 && keys.some(k => /st-/.test(k.cls))) leak.push(`${id} t=${t.toFixed(2)} keys differ`);
    }
    await page.evaluate(`window.__seek(${s.t.reveal + .01})`);
    const after = await page.evaluate(() => { const e = [...document.querySelectorAll('.plate.animal .aemo')].find(x => x.offsetParent); return e ? getComputedStyle(e).filter : 'none-visible'; });
    if (/brightness\(0\)/.test(after)) leak.push(`${id}: still black at reveal + 0.01`);
  }
  out.leak = leak;
}
out.errors = errs;
console.log(JSON.stringify(out, null, 1));
await browser.close(); srv.close();
