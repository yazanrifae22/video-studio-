/**
 * QA sheets from a render: per-line mode = one frame at the middle of every line, 12 per sheet (4 x 3) at 480 px per cell, the line
 * id + speaker + text written UNDER the frame (never over it) -> <vN>/qa/line-sheets/sheet-NN.jpg; --every S mode = one frame
 * every S seconds, 30 per sheet (6 x 5) with the time code under each -> <vN>/qa/time-sheets/. Labels are laid out by Chrome
 * (Arabic shapes and runs right to left). --short <sid> = the same for productions/<id>/shorts/<sid>/render.mp4.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { chromePath } from '../../render/src/text.ts';
import { loadFilm, versionDir } from './film.ts';

const run = promisify(execFile);
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const tc = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export async function makeSheets(id: string, o: { version?: string; every?: number; short?: string } = {}) {
  const { dir } = loadFilm(id);
  const base = o.short ? path.join(dir, 'shorts', o.short) : versionDir(dir, o.version);
  const video = path.join(base, 'render.mp4');
  if (!fs.existsSync(video)) throw new Error(`${video} missing`);
  const probe = String((await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', video])).stdout);
  const pj = JSON.parse(probe), W = pj.streams[0].width, H = pj.streams[0].height, D = parseFloat(pj.format.duration);
  type Cell = { t: number; head: string; text: string; who?: string };
  let cells: Cell[];
  if (o.every) {
    cells = []; for (let t = 0; t < D - 0.05; t += o.every) cells.push({ t: +Math.min(D - 0.05, t + Math.min(0.5, o.every / 2)).toFixed(3), head: '', text: '' });
    cells.forEach(c => { c.head = tc(c.t); });
  } else {
    const show = JSON.parse(fs.readFileSync(path.join(base, 'show.json'), 'utf8')), off = show.window?.t0 ?? 0;
    cells = (show.lines as any[]).map(l => ({ t: +(((l.t0 + l.t1) / 2) - off).toFixed(3), head: `${l.id} · ${l.who} · ${tc((l.t0 + l.t1) / 2 - off)}`, text: l.text, who: l.who })).filter(c => c.t >= 0 && c.t < D);
  }
  const per = o.every ? 30 : 12, cols = o.every ? 6 : 4, cw = 480, ch = Math.round(cw * H / W);
  const out = path.join(base, 'qa', o.every ? 'time-sheets' : 'line-sheets'), fr = path.join(out, '_frames');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
  for (const [i, c] of cells.entries()) await run('ffmpeg', ['-v', 'error', '-y', '-ss', c.t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${cw}:-2`, '-q:v', '3', path.join(fr, `f${String(i).padStart(4, '0')}.jpg`)]);
  const sheets: string[] = [];
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true, args: ['--allow-file-access-from-files', '--force-color-profile=srgb'] });
  try {
    const page = await browser.newPage({ viewport: { width: cols * (cw + 6) + 6, height: 800 }, deviceScaleFactor: 1 });
    for (let k = 0; k * per < cells.length; k++) {
      const part = cells.slice(k * per, (k + 1) * per);
      const html = `<!doctype html><html><head><meta charset="utf-8"><style>
        body{margin:0;background:#151515;font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#eee}
        .g{display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:6px;padding:6px}
        .c{background:#222;width:${cw}px} .c img{display:block;width:${cw}px;height:${ch}px}
        .h{font:600 13px/1.3 Consolas,monospace;padding:4px 6px 0;color:#9cf} .h.skip{color:#fd6}
        .t{font-size:15px;line-height:1.35;padding:2px 6px 6px;unicode-bidi:plaintext}
      </style></head><body><div class="g">${part.map((c, j) => `<div class="c"><img src="${pathToFileURL(path.join(fr, `f${String(k * per + j).padStart(4, '0')}.jpg`)).href}"><div class="h ${c.who ?? ''}">${esc(c.head)}</div>${c.text ? `<div class="t" dir="auto">${esc(c.text)}</div>` : ''}</div>`).join('')}</div></body></html>`;
      const hf = path.join(fr, `sheet-${k}.html`); fs.writeFileSync(hf, html, 'utf8');
      await page.goto(pathToFileURL(hf).href); await page.waitForLoadState('load');
      const f = path.join(out, `sheet-${String(k + 1).padStart(2, '0')}.jpg`);
      await page.screenshot({ path: f, type: 'jpeg', quality: 85, fullPage: true });
      sheets.push(f);
    }
  } finally { await browser.close().catch(() => {}); }
  fs.rmSync(fr, { recursive: true, force: true });
  return { video, cells: cells.length, sheets };
}
