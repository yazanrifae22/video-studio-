// Renders Karto / Skip pose plates from the kit as transparent PNGs (2x). Usage: node render-cutouts.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'E:/clips-viral';
const require = createRequire(ROOT + '/package.json');
const { chromium } = require('playwright-core');
const OUT = path.join(ROOT, 'docs/brands/karto/gta6/thumbs/work');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.ttf': 'font/ttf', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/cut.html') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><html><body style="margin:0;background:transparent"><div id="o"></div></body></html>'); }
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
}).listen(0);
const port = srv.address().port;
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((f) => fs.existsSync(f));
const browser = await chromium.launch({ executablePath: exe, headless: true });
const jobs = [
  ['karto', 'shocked', 'karto_shocked', 'full'], ['karto', 'deadpan', 'karto_deadpan', 'full'],
  ['karto', 'shocked', 'head_shocked', 'head'], ['karto', 'deadpan', 'head_deadpan', 'head'],
  ['skip', 'skip', 'skip_skip', 'nostick'], ['skip', 'shocked', 'skip_shocked', 'nostick'],
];
for (const [who, pose, name, mode] of jobs) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 800, height: 760 } });
  await page.goto(`http://127.0.0.1:${port}/cut.html`);
  await page.evaluate(async ([who, pose, mode]) => {
    const art = await import('/packages/cutout/web/kit/art.js');
    const { STOCK } = await import('/packages/cutout/web/kit/tex.js');
    const r = art[who](pose, false);
    const o = document.getElementById('o'); o.innerHTML = r.svg;
    const svg = o.querySelector('svg');
    const drop = [];
    if (mode === 'head') drop.push(STOCK.kraftDark, STOCK.wood, STOCK.vermilion, '#D93A18');
    if (mode === 'nostick') drop.push(STOCK.wood);
    for (const el of [...svg.querySelectorAll('path,circle,rect,g')]) {
      const f = (el.getAttribute('fill') || '').toUpperCase();
      if (drop.map((d) => d.toUpperCase()).includes(f)) el.remove();
    }
    if (mode === 'head') { // keep only the box: clip below the face bottom, hide arms
      const cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'); cp.id = 'c';
      cp.innerHTML = '<rect x="0" y="0" width="760" height="458"/>'; svg.prepend(cp);
      const g = svg.querySelector('g'); g.setAttribute('clip-path', 'url(#c)');
      // arms are drawn last as groups/paths with kraftLight / E2BE86 fills: remove everything after the mouth
      const kids = [...g.children]; // arms were appended last (2 groups or paths)
      for (const k of kids.slice(-2)) k.remove();
    }
    document.body.dataset.w = r.w; document.body.dataset.h = r.h;
  }, [who, pose, mode]);
  await page.waitForTimeout(300);
  const sz = await page.evaluate(() => [+document.body.dataset.w, +document.body.dataset.h]);
  await page.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true, clip: { x: 0, y: 0, width: sz[0], height: sz[1] } });
  await page.close();
  console.log('ok', name, sz);
}
await browser.close(); srv.close();
