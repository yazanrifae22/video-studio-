/**
 * Text cards -> transparent PNGs, rendered once per build by ONE headless Chrome page (system Chrome over the DevTools
 * protocol, no npm dependency). The DOM is the same one OpenChatCut's TextLayer + ClipWrapper produced, so Chrome lays
 * out, shapes (incl. Arabic RTL) and paints text exactly as the old renderer did: 1920x1080 design box scaled to the
 * canvas, 96 px side padding, font stack "Geist, system-ui" (Geist is not loaded in a render -> Segoe UI on Windows),
 * text-shadow, optional pill with box-shadow. Each card is cropped to its painted area; pills also return a mask so
 * the compositor can reproduce the pill's backdrop blur.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TextItem } from './timeline.ts';

export interface CardMetrics { glyph: { x: number; y: number; w: number; h: number }; box: { x: number; y: number; w: number; h: number }; spill: boolean; cap: number; font_px: number; lines: number; arabic: boolean; rtl: { dir: string; problems: string[] } | null }
export interface Card { /** text-safety metrics of the laid-out text (canvas px) */ m?: CardMetrics; png: string; x: number; y: number; w: number; h: number; /** font scale applied so the text fits the canvas (1 = as authored) */ fit?: number; /** px the card was moved inward to stay inside the margins */ shift?: number; /** still outside the safe margin at 50 % */ clipped?: boolean; plate?: { png: string; x: number; y: number; w: number; h: number; blur: number } }

const CHROME_CANDIDATES = [
  process.env.STUDIO_CHROME,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean) as string[];
export const chromePath = () => {
  const p = CHROME_CANDIDATES.find(f => fs.existsSync(f));
  if (!p) throw new Error('render: no Chrome found for text cards (set STUDIO_CHROME)');
  return p;
};

/* the page: one function that lays out a card exactly like TextLayer inside ClipWrapper and reports its painted box */
const PAGE = (W: number, H: number) => `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;width:${W}px;height:${H}px;overflow:hidden}</style></head><body><div id="root"></div>
<script>
window.card = function (s, mode) {
  const root = document.getElementById('root'); root.innerHTML = '';
  const fill = (el) => { Object.assign(el.style, { position: 'absolute', top: '0', left: '0', right: '0', bottom: '0', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }); return el; };
  const wrap = fill(document.createElement('div'));
  wrap.style.transform = 'translate(' + (s.x || 0) + '%, ' + (s.y || 0) + '%) rotate(0deg) scale(' + (s.scale ?? 1) + ', ' + (s.scale ?? 1) + ')';
  wrap.style.transformOrigin = '50% 50%'; wrap.style.transformBox = 'border-box';
  const abs = fill(document.createElement('div'));
  Object.assign(abs.style, { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' });
  const p = s.props || {};
  const align = p.align === 'left' || p.align === 'right' ? p.align : 'center';
  const design = document.createElement('div');
  Object.assign(design.style, { width: s.dw + 'px', height: s.dh + 'px', flexShrink: '0', transform: 'scale(' + s.k + ')', display: 'flex', alignItems: 'center',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center', padding: '0 96px', boxSizing: 'border-box' });
  const fam = String(p.fontFamily || '').trim();
  const t = document.createElement('div');
  const bg = !!p.bgEnabled;
  Object.assign(t.style, { color: String(p.color ?? '#ffffff'), fontSize: Number(p.fontSize ?? 96) + 'px', fontWeight: String(Number(p.fontWeight ?? 700)), fontStyle: p.fontStyle ? String(p.fontStyle) : 'normal',
    fontFamily: fam ? '"' + fam + '", system-ui, -apple-system, sans-serif' : 'Geist, system-ui, -apple-system, sans-serif',
    letterSpacing: p.letterSpacing !== undefined ? (typeof p.letterSpacing === 'number' ? p.letterSpacing + 'px' : String(p.letterSpacing)) : 'normal',
    lineHeight: String(p.lineHeight !== undefined ? Number(p.lineHeight) : 1.2), textAlign: align,
    textShadow: p.textShadow !== undefined ? String(p.textShadow) : '0 3px 16px rgba(0,0,0,0.55)', whiteSpace: 'pre-wrap' });
  if (!bg) t.style.width = '100%';
  if (p.accent && typeof p.accent === 'object') {
    // per-word accent colours (viral-rankings captions): WORD -> #RRGGBB, matched on A-Z0-9' only
    String(s.text).split(/(\\s+)/).forEach(function (w) {
      const sp = document.createElement('span'); sp.textContent = w;
      const c = p.accent[w.toUpperCase().replace(/[^A-Z0-9']/g, '')];
      if (c) sp.style.color = String(c);
      t.appendChild(sp);
    });
  } else t.textContent = String(s.text);
  let body = t, plate = null;
  if (bg) {
    plate = document.createElement('div');
    const blur = p.bgBlur !== undefined ? Number(p.bgBlur) : 20;
    Object.assign(plate.style, { display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: p.bgColor !== undefined ? String(p.bgColor) : 'rgba(10, 15, 26, 0.85)',
      border: p.bgBorder !== undefined ? String(p.bgBorder) : '1px solid rgba(255, 255, 255, 0.16)',
      borderRadius: (p.bgRadius !== undefined ? Number(p.bgRadius) : 9999) + 'px',
      padding: (p.bgPaddingY !== undefined ? Number(p.bgPaddingY) : 10) + 'px ' + (p.bgPaddingX !== undefined ? Number(p.bgPaddingX) : 32) + 'px',
      boxShadow: p.bgShadow !== undefined ? String(p.bgShadow) : '0 12px 36px rgba(0, 0, 0, 0.65), 0 2px 8px rgba(0, 0, 0, 0.4)', maxWidth: '88%' });
    // the compositor paints the backdrop blur itself (Chrome cannot see the video here); 'mask' = the pill's shape only
    if (mode === 'mask') { Object.assign(plate.style, { background: '#ffffff', boxShadow: 'none', border: 'none' }); t.style.visibility = 'hidden'; }
    plate.appendChild(t); body = plate;
    plate.dataset.blur = String(blur);
  }
  design.appendChild(body); abs.appendChild(design); wrap.appendChild(abs); root.appendChild(wrap);
  // fit (2026-11-02, QA: name cards / labels clipped at the canvas edge): the painted text (glyph extent, or the pill) must stay
  // inside the canvas with a 4 % margin and no word may overflow its box. Too big -> the font shrinks (max to 50 %); fits but
  // sits over the edge (x/y offset) -> the card is moved inward.
  const M = Math.round(Math.min(${W}, ${H}) * 0.04), base = Number(p.fontSize ?? 96), sc = s.scale ?? 1;
  const rng = document.createRange(); rng.selectNodeContents(t);
  const rect = () => plate ? plate.getBoundingClientRect() : rng.getBoundingClientRect();
  const spill = () => { const el = plate || t; return el.scrollWidth > el.clientWidth + 1; };
  const over = () => { const q = rect(); return q.left < M - 0.5 || q.right > ${W} - M + 0.5 || q.top < M - 0.5 || q.bottom > ${H} - M + 0.5 || spill(); };
  let fsz = base, dx = 0, dy = 0;
  for (let i = 0; i < 24 && over(); i++) {
    const q = rect();
    if (q.width <= ${W} - 2 * M + 0.5 && q.height <= ${H} - 2 * M + 0.5 && !spill()) {
      dx += q.left < M ? M - q.left : q.right > ${W} - M ? ${W} - M - q.right : 0;
      dy += q.top < M ? M - q.top : q.bottom > ${H} - M ? ${H} - M - q.bottom : 0;
      wrap.style.transform = 'translate(' + (s.x || 0) + '%, ' + (s.y || 0) + '%) translate(' + dx + 'px, ' + dy + 'px) rotate(0deg) scale(' + sc + ', ' + sc + ')';
      break;
    }
    if (fsz <= base * 0.5 + 0.01) break;
    fsz = Math.max(base * 0.5, fsz * 0.93); t.style.fontSize = fsz + 'px';
  }
  const r = body.getBoundingClientRect();
  const pr = plate ? plate.getBoundingClientRect() : null;
  // text-safety metrics (2026-11-08, owner: "every text in the frame viewable, not overflowing the video or cut"): the REAL laid-out
  // glyph box after fonts + fit, overflow of the text's own box, cap height, line count and an RTL order probe (packages/render/src/text-safety.ts)
  const tn = []; { const tw = document.createTreeWalker(t, NodeFilter.SHOW_TEXT); for (let x = tw.nextNode(); x; x = tw.nextNode()) tn.push(x); }
  const gb = rng.getBoundingClientRect(), ink = window.__inkBox ? window.__inkBox(tn) : null;
  const gr = ink ? { left: ink.x, top: ink.y, width: ink.w, height: ink.h } : gb;
  const cs = getComputedStyle(t);
  const arabic = /[\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF]/.test(String(s.text));
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const capRatio = (ctx.measureText(arabic && !/[A-Za-z]/.test(String(s.text)) ? '\\u0627' : 'H').actualBoundingBoxAscent || parseFloat(cs.fontSize) * 0.7) / parseFloat(cs.fontSize);
  const lineTops = new Set([...rng.getClientRects()].filter(q => q.width > 0.5).map(q => Math.round(q.top / 4)));
  const m = { glyph: { x: gr.left, y: gr.top, w: gr.width, h: gr.height }, box: pr ? { x: pr.left, y: pr.top, w: pr.width, h: pr.height } : { x: gr.left, y: gr.top, w: gr.width, h: gr.height },
    spill: spill(), cap: capRatio * fsz * s.k * sc, font_px: fsz * s.k * sc, lines: lineTops.size, arabic, rtl: window.__rtlProbe ? window.__rtlProbe(t) : null };
  // painted extent: text-shadow / box-shadow reach (design px x k) + 2 px
  const sh = (str) => { let m = 0; for (const part of String(str || '').split(/,(?![^(]*\\))/)) { const n = (part.match(/-?[\\d.]+px/g) || []).map(v => Math.abs(parseFloat(v))); m = Math.max(m, n.reduce((a, b) => a + b, 0) * 1.25); } return m; };
  const reach = Math.ceil(Math.max(sh(t.style.textShadow), plate ? sh(plate.style.boxShadow) : 0) * s.k) + 2;
  return { x: r.left - reach, y: r.top - reach, w: r.width + 2 * reach, h: r.height + 2 * reach, fit: +(fsz / base).toFixed(3), shift: Math.round(Math.hypot(dx, dy)), clipped: over(),
    plate: pr ? { x: pr.left, y: pr.top, w: pr.width, h: pr.height, blur: Number(plate.dataset.blur) * s.k } : null, m };
};
${RTL_PROBE}
</script></body></html>`;

/**
 * RTL order probe (in-page, shared with the HyperFrames text scan): for Arabic-majority text, the FIRST logical character must sit
 * at the right end of the first visual line and the LAST one at the left end of the last line. A neutral at the end of an RTL
 * sentence in an LTR paragraph ("?" / "!" / "." / Latin digits) lands on the wrong side - the classic broken-direction bug.
 * Pre-shaped presentation forms (U+FB50-FDFF, U+FE70-FEFF) are reported too. Returns null for non-Arabic text.
 */
export const RTL_PROBE = String.raw`
/* ink box of text nodes: client rects are the font's content area (ascent+descent, tall for Arabic fonts such as Cairo); the
   painted glyphs sit inside it - baseline = top + fontBoundingBoxAscent, ink = baseline - actualAscent .. baseline + actualDescent */
window.__inkCtx = window.__inkCtx || document.createElement('canvas').getContext('2d');
window.__inkBox = function (nodes) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const rg = document.createRange();
  for (const n of nodes) {
    const tx = n.data.trim(); if (!tx) continue;
    const c = getComputedStyle(n.parentElement); window.__inkCtx.font = c.fontStyle + ' ' + c.fontWeight + ' ' + c.fontSize + ' ' + c.fontFamily;
    const mt = window.__inkCtx.measureText(tx), fa = mt.fontBoundingBoxAscent, fd = mt.fontBoundingBoxDescent, ia = mt.actualBoundingBoxAscent, id = mt.actualBoundingBoxDescent;
    rg.selectNodeContents(n);
    for (const q of rg.getClientRects()) {
      if (q.width <= 0.5 || q.height <= 0.5) continue;
      let top = q.top, bot = q.bottom;
      if (fa > 0 && fa + fd > 0) { const k = q.height / (fa + fd); top = q.top + Math.max(0, fa - ia) * k; bot = Math.min(q.bottom, q.top + (fa + id) * k); }
      x0 = Math.min(x0, q.left); x1 = Math.max(x1, q.right); y0 = Math.min(y0, top); y1 = Math.max(y1, bot);
    }
  }
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
};
window.__rtlProbe = function (el) {
  const txt = el.textContent || '';
  const ar = (txt.match(/[ء-يٮ-ۓۺ-ۿݐ-ݿࢠ-ࣿ]/g) || []).length, lat = (txt.match(/[A-Za-z]/g) || []).length;
  if (!ar || lat > ar) return null;   // digits / punctuation only (e.g. a round counter) keep their own LTR order: no probe
  const out = { dir: getComputedStyle(el).direction, problems: [] };
  if (/[ﭐ-﷿ﹰ-﻿]/.test(txt)) out.problems.push('pre-shaped Arabic presentation forms (letters may not join)');
  const chars = [];
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) for (let i = 0; i < n.data.length; i++) if (n.data[i].trim()) chars.push({ n, i, ch: n.data[i] });
  if (chars.length < 2) return out;
  const rectOf = (c) => { const r = document.createRange(); r.setStart(c.n, c.i); r.setEnd(c.n, c.i + 1); const q = r.getClientRects(); return q.length ? q[0] : r.getBoundingClientRect(); };
  const all = chars.map(rectOf).filter(q => q.width > 0);
  if (!all.length) return out;
  const lineOf = (q) => q.top + q.height / 2;
  const first = rectOf(chars[0]), last = rectOf(chars[chars.length - 1]);
  const sameLine = (a, b) => Math.abs(lineOf(a) - lineOf(b)) < Math.min(a.height, b.height) * 0.5;
  const l0 = all.filter(q => sameLine(q, first)), l1 = all.filter(q => sameLine(q, last));
  const tol = 2;
  // a leading number («١٠ تبديلات!») is an LTR run inside the RTL line: its first digit is the run's LEFT end, so the run (not the digit) must sit at the right end
  let nk = 0; while (nk < chars.length && /[0-9٠-٩۰-۹]/.test(chars[nk].ch)) nk++;
  const runRight = nk ? Math.max(...chars.slice(0, nk).map(c => rectOf(c).right)) : first.right;
  if (runRight < Math.max(...l0.map(q => q.right)) - tol) out.problems.push('first character "' + chars[0].ch + '" is not at the right end of its line (direction not RTL)');
  if (last.left > Math.min(...l1.map(q => q.left)) + tol) out.problems.push('last character "' + chars[chars.length - 1].ch + '" is not at the left end of its line (punctuation/number on the wrong side)');
  return out;
};`;

/** Minimal DevTools-protocol session on one page target. */
export class Cdp {
  private id = 0; private pending = new Map<number, { res: (v: any) => void; rej: (e: Error) => void }>();
  constructor(private ws: WebSocket, private session: string) {}
  static async open(proc: ChildProcess, profile: string) {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const t0 = Date.now();
    while (!fs.existsSync(portFile) || fs.readFileSync(portFile, 'utf8').split('\n').length < 2) {
      if (proc.exitCode != null) throw new Error(`render: Chrome exited (${proc.exitCode}) before DevTools was ready`);
      if (Date.now() - t0 > 20000) throw new Error('render: Chrome DevTools did not come up in 20 s');
      await new Promise(r => setTimeout(r, 50));
    }
    const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
    const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
    await new Promise<void>((res, rej) => { ws.onopen = () => res(); ws.onerror = () => rej(new Error('render: DevTools socket failed')); });
    const c = new Cdp(ws, '');
    ws.onmessage = (ev: MessageEvent) => {
      const m = JSON.parse(String(ev.data));
      const p = m.id != null ? c.pending.get(m.id) : null;
      if (!p) return;
      c.pending.delete(m.id);
      m.error ? p.rej(new Error(`CDP ${m.error.message}`)) : p.res(m.result);
    };
    const { targetId } = await c.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await c.send('Target.attachToTarget', { targetId, flatten: true });
    c.session = sessionId;
    return c;
  }
  send(method: string, params: any = {}, root = false): Promise<any> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(this.session && !root ? { sessionId: this.session } : {}) }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  async eval(expr: string) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`render page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch { /* gone */ } }
}

/** One headless system Chrome (DevTools protocol) with a W x H transparent page; closed and cleaned up after `fn`. */
export async function withChrome<T>(W: number, H: number, fn: (cdp: Cdp, profile: string) => Promise<T>): Promise<T> {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-cards-'));
  const proc = spawn(chromePath(), ['--headless', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--force-color-profile=srgb', '--font-render-hinting=none', '--allow-file-access-from-files', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
  let cdp: Cdp | null = null;
  try {
    cdp = await Cdp.open(proc, profile);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    return await fn(cdp, profile);
  } finally {
    try { if (cdp) { await cdp.send('Browser.close', {}, true).catch(() => {}); cdp.close(); } } catch { /* ignore */ }
    if (proc.exitCode == null) { await new Promise(r => setTimeout(r, 300)); try { proc.kill(); } catch { /* gone */ } }
    await new Promise(r => setTimeout(r, 200));
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold files; temp dir */ }
  }
}

const cardKey = (it: TextItem, W: number, H: number) => crypto.createHash('sha1').update(JSON.stringify({ v: 6, W, H, text: it.text, props: it.props ?? {}, x: it.transform?.x ?? 0, y: it.transform?.y ?? 0, s: it.transform?.scale ?? 1, dw: it.width ?? 1920, dh: it.height ?? 1080 })).digest('hex').slice(0, 16);

/** Render every distinct text card once (cached by content in `dir`). Returns cards in item order. */
export async function renderCards(items: TextItem[], W: number, H: number, dir: string, fit: 'contain' | 'cover' = 'contain'): Promise<Card[]> {
  fs.mkdirSync(dir, { recursive: true });
  const keys = items.map(it => cardKey(it, W, H));
  const todo = [...new Set(keys)].filter(k => !fs.existsSync(path.join(dir, `${k}.json`)));
  if (todo.length) {
    await withChrome(W, H, async (cdp, profile) => {
      const html = path.join(profile, 'cards.html');
      fs.writeFileSync(html, PAGE(W, H), 'utf8');
      await cdp.send('Page.enable');
      await cdp.send('Page.navigate', { url: 'file:///' + html.replace(/\\/g, '/') });
      for (let i = 0; i < 200 && !(await cdp.eval('typeof window.card === "function" && document.readyState === "complete"').catch(() => false)); i++) await new Promise(r => setTimeout(r, 25));
      for (const k of todo) {
        const it = items[keys.indexOf(k)];
        const dw = it.width ?? 1920, dh = it.height ?? 1080;
        const kk = fit === 'cover' ? Math.max(W / dw, H / dh) : Math.min(W / dw, H / dh);
        const spec = { text: it.text, props: it.props ?? {}, x: it.transform?.x ?? 0, y: it.transform?.y ?? 0, scale: it.transform?.scale ?? 1, dw, dh, k: kk };
        const shot = async (mode: string, clip: { x: number; y: number; w: number; h: number }) => {
          await cdp!.eval(`window.card(${JSON.stringify(spec)}, ${JSON.stringify(mode)}); document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
          const r = await cdp!.send('Page.captureScreenshot', { format: 'png', clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 }, captureBeyondViewport: false, fromSurface: true });
          return Buffer.from(r.data, 'base64');
        };
        const box = await cdp.eval(`(async () => { window.card(${JSON.stringify(spec)}, 'card'); await document.fonts.ready; return window.card(${JSON.stringify(spec)}, 'card'); })()`);
        const x0 = Math.max(0, Math.floor(box.x)), y0 = Math.max(0, Math.floor(box.y)), x1 = Math.min(W, Math.ceil(box.x + box.w)), y1 = Math.min(H, Math.ceil(box.y + box.h));
        const meta: Card = { png: `${k}.png`, x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0), ...(box.fit < 1 ? { fit: box.fit } : {}), ...(box.shift ? { shift: box.shift } : {}), ...(box.clipped ? { clipped: true } : {}), ...(box.m ? { m: box.m } : {}) };
        fs.writeFileSync(path.join(dir, meta.png), await shot('card', { x: x0, y: y0, w: meta.w, h: meta.h }));
        if (box.plate && box.plate.blur > 0) {
          const p = box.plate, px0 = Math.max(0, Math.round(p.x)), py0 = Math.max(0, Math.round(p.y)), px1 = Math.min(W, Math.round(p.x + p.w)), py1 = Math.min(H, Math.round(p.y + p.h));
          if (px1 - px0 >= 2 && py1 - py0 >= 2) {
            meta.plate = { png: `${k}.mask.png`, x: px0, y: py0, w: px1 - px0, h: py1 - py0, blur: p.blur };
            fs.writeFileSync(path.join(dir, meta.plate.png), await shot('mask', { x: px0, y: py0, w: meta.plate.w, h: meta.plate.h }));
          }
        }
        fs.writeFileSync(path.join(dir, `${k}.json`), JSON.stringify(meta));
      }
    });
  }
  return keys.map(k => { const m = JSON.parse(fs.readFileSync(path.join(dir, `${k}.json`), 'utf8')) as Card; m.png = path.join(dir, m.png); if (m.plate) m.plate.png = path.join(dir, m.plate.png); return m; });
}
