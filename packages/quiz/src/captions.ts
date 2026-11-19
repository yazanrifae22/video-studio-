import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { FONTS } from './compose.ts';

/**
 * Arabic RTL captions rendered by us (OpenChatCut's captions have no Arabic font / RTL): one HyperFrames composition
 * with every page, rendered as a transparent WebM and laid on V2. Pages: 2-4 words, one line (≤ maxChars), never
 * across a line boundary; the active word is drawn in the accent colour.
 */
/** Eastern Arabic digits and Arabic punctuation (0-9 → ٠-٩, ? → ؟, , → ،, ; → ؛). */
export const arabicForms = (w: string) => w.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]).replace(/\?/g, '؟').replace(/,/g, '،').replace(/;/g, '؛');
export interface Word { w: string; t0: number; t1: number; line: string; /** speech end of the line (absolute s), on the line's last word */ lineEnd?: number }
export interface Page { t0: number; t1: number; words: Word[] }

/** Words a caption page must not END on (they belong with the next word): prepositions, conjunctions, لـ. */
const GLUE = new Set(['لـ', 'ل', 'من', 'ورا', 'على', 'عَلى', 'في', 'عن', 'مع', 'بين', 'و', 'ب', 'يا', 'اللي', 'إلى', 'لل', 'بال', 'وال']);
const glue = (w: string) => { const x = w.replace(/[؟!،.:]/g, ''); return GLUE.has(x) || (x.length <= 2 && !/[0-9٠-٩]/.test(x)) || /ـ$/.test(x); };  // particles and <= 2-letter words never end a page
const len = (ws: Word[]) => ws.map(x => x.w).join(' ').length;

export function pageWords(words: Word[], maxChars = 22, blockers: number[] = [], onsets: number[] = []): Page[] {
  // Split per narration line. A page never holds a pause >= 0.3 s; a page longer than maxChars is split at sentence
  // punctuation (! ؟ . …) first, then at commas, and only as a last resort (page > maxChars + 3) inside a phrase, at the
  // most balanced gap that does not leave a glue word (لـ من ورا على …) at a page end. No word moves across a boundary.
  const pages: Page[] = [];
  const SENT = /[!؟?.…]$/, COMMA = /[،,:]$/;
  const ENUM = /^و[^\s؟!،.:…]{2,}/;  // و-prefixed item (وأحمر، وكحلي…)
  const gapAfter = (ws: Word[], i: number) => ws[i + 1].t0 - ws[i].t1;
  const split = (ws: Word[]): void => {
    if (!ws.length) return;
    const idx = [...Array(ws.length - 1).keys()];
    // short enumerations stay on one page («زهري وأحمر وكحلي…» | «مين الأحمر؟»): no pause split inside one
    const inEnum = new Set<number>();
    for (let a = 0; a < ws.length - 1; a++) {
      if (SENT.test(ws[a].w) || !ENUM.test(ws[a + 1].w)) continue;
      let b = a + 1;
      while (b + 1 < ws.length && !SENT.test(ws[b].w) && ENUM.test(ws[b + 1].w)) b++;
      if (len(ws.slice(a, b + 1)) <= maxChars) for (let i = a; i < b; i++) inEnum.add(i);
      a = b - 1;
    }
    let pause: number | undefined = idx.filter(i => gapAfter(ws, i) >= 0.3 && !inEnum.has(i)).sort((x, y) => gapAfter(ws, y) - gapAfter(ws, x))[0];
    // a pause right after a glue word (e.g. «تسعة! في | علبتين») splits before that word instead
    while (pause != null && glue(ws[pause].w)) pause = pause > 0 ? pause - 1 : undefined;
    let at: number | undefined = pause;
    if (at == null && len(ws) > maxChars) {
      const bal = (cands: number[]) => cands.sort((x, y) => Math.abs(len(ws.slice(0, x + 1)) - len(ws.slice(x + 1))) - Math.abs(len(ws.slice(0, y + 1)) - len(ws.slice(y + 1))))[0];
      at = bal(idx.filter(i => SENT.test(ws[i].w))) ?? bal(idx.filter(i => COMMA.test(ws[i].w)));
      if (at == null && len(ws) > maxChars + 3) at = bal(idx.filter(i => !glue(ws[i].w)));
    }
    if (at == null) { pages.push({ t0: ws[0].t0, t1: ws[ws.length - 1].t1, words: ws }); return; }
    split(ws.slice(0, at + 1)); split(ws.slice(at + 1));
  };
  const byLine: Word[][] = [];
  for (const w of words) { const last = byLine[byLine.length - 1]; if (last && last[0].line === w.line) last.push(w); else byLine.push([w]); }
  for (const lw of byLine) split(lw);
  // onset snap: a page starts on the speech-activity onset it owns (the regress.py / techqa metric), within +-0.6 s,
  // never before the previous page or after its own last word's end (Whisper word starts can be 0.1-0.4 s off; words
  // the snap overtakes start with it)
  if (onsets.length) {
    const starts = pages.map(p => p.words[0].t0);
    pages.forEach((p, i) => {
      const t0 = starts[i];
      const o = owned(onsets, starts, i);                                       // nearest onset this page owns (not just the nearest onset)
      if (o == null || Math.abs(o - t0) < 0.001) return;
      const lo = i ? pages[i - 1].words[0].t0 + 0.2 : 0;
      const hi = p.words[p.words.length - 1].t1 + (p.words.length > 1 ? 0 : 0.4);
      if (o <= lo || o >= hi) return;
      for (const w of p.words) { if (w === p.words[0] || w.t0 < o) w.t0 = o; if (w.t1 < w.t0 + 0.05) w.t1 = w.t0 + 0.05; }
    });
  }
  // a length split must not leave a < 0.7 s page (prelint caption_short): after the onset snap, merge two consecutive pages of
  // one line when the first would be cut by the second in < 0.75 s and the merged page stays <= maxChars + 6 letters (long
  // pages shrink in the layout). A pause >= 0.3 s between them is a real break and keeps the split.
  for (let i = 0; i + 1 < pages.length; i++) {
    const a = pages[i], b = pages[i + 1];
    if (a.words[0].line !== b.words[0].line) continue;
    const gap = b.words[0].t0 - a.words[a.words.length - 1].t1;
    if (b.words[0].t0 - a.words[0].t0 < 0.75 && gap < 0.3 && len([...a.words, ...b.words]) <= maxChars + 6) { a.words.push(...b.words); pages.splice(i + 1, 1); i--; }
  }
  // a single-word trailing page of a line that the next page / a blocker (countdown ring, round change) would show < 0.5 s
  // merges into the previous page of the same line (1fva «البرتقالي؟» 0.33 s before the countdown)
  for (let i = 1; i < pages.length; i++) {
    const a = pages[i - 1], b = pages[i];
    if (b.words.length !== 1 || a.words[0].line !== b.words[0].line) continue;
    const t0 = b.words[0].t0, nextT = pages[i + 1]?.words[0].t0 ?? Infinity;
    const cut = Math.min(nextT, blockers.filter(x => x > t0 + 0.2).sort((x, y) => x - y)[0] ?? Infinity);
    if (cut - t0 < 0.5 && len([...a.words, ...b.words]) <= maxChars + 10) { a.words.push(...b.words); pages.splice(i, 1); i--; }
  }
  // timing: a page appears exactly on its first word's onset and is hard-cut when the next one appears; it holds at least
  // until its last word has ended (line-final pages: until the line's speech ends) plus 0.35 s, never into a countdown
  // ring / round change / end-card (blockers)
  pages.forEach((p, i) => {
    p.t0 = p.words[0].t0;
    const last = p.words[p.words.length - 1];
    const hold = Math.max(last.t1, last.lineEnd ?? 0);
    const next = pages[i + 1]?.words[0].t0 ?? Infinity;
    // prelint caption_short (>= 0.7 s on screen): hold short pages to 0.7 s unless the next page / a blocker cuts them
    p.t1 = Math.min(next, Math.max(hold + 0.35, p.t0 + 0.7));
    const cd = blockers.filter(b => b > p.t0 + 0.2).sort((x, y) => x - y)[0];
    if (cd != null) p.t1 = Math.min(p.t1, cd);
  });
  return pages;
}

const nearest = (xs: number[], t: number) => xs.length ? xs.reduce((a, b) => Math.abs(b - t) < Math.abs(a - t) ? b : a) : undefined;
const nearestIdx = (xs: number[], t: number) => xs.reduce((k, x, i) => Math.abs(x - t) < Math.abs(xs[k] - t) ? i : k, 0);
/** The onset page i owns: nearest to its start within 0.6 s among the onsets whose nearest page start is page i. A page
 *  split right after a short word («عشرة! | كل كومة…») has the previous word's onset nearer than its own (3uyp: 0.49 s
 *  lead when only the single nearest onset was considered). */
const owned = (onsets: number[], starts: number[], i: number) => {
  const c = onsets.filter(o => Math.abs(o - starts[i]) < 0.6 && nearestIdx(starts, o) === i);
  return c.length ? nearest(c, starts[i]) : undefined;
};

/**
 * Speech activity of the narration-only track (same metric as py/regress.py and QA): 16 kHz mono, 10 ms RMS frames,
 * active above -45 dBFS; onset = active frame after >= 80 ms of silence, offset = silent frame after activity followed
 * by >= 80 ms of silence. `lines`: narration clips at their timeline position (s).
 */
export async function speechActivity(lines: { file: string; at: number }[], total: number) {
  const SR = 16000, run = promisify(execFile);
  const tot = new Float32Array(Math.ceil((total + 2) * SR));
  for (const l of lines) {
    const raw = (await run('ffmpeg', ['-v', 'error', '-i', l.file, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 })).stdout as unknown as Buffer;
    const a = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1);
    const s = Math.round(l.at * SR);
    for (let k = 0; k < a.length && s + k < tot.length; k++) if (s + k >= 0) tot[s + k] += a[k] / 32768;
  }
  const n = Math.floor(tot.length / 160), act: boolean[] = [];
  for (let i = 0; i < n; i++) { let e = 0; for (let k = i * 160; k < i * 160 + 160; k++) e += tot[k] * tot[k]; act.push(20 * Math.log10(Math.sqrt(e / 160) + 1e-9) > -45); }
  const on: number[] = [], off: number[] = [];
  for (let i = 1; i < n; i++) {
    if (act[i] && !act.slice(Math.max(0, i - 8), i).some(Boolean)) on.push(i / 100);
    if (!act[i] && act[i - 1] && !act.slice(i, i + 8).some(Boolean)) off.push(i / 100);
  }
  return { on, off };
}

/** Caption page start vs the speech onset it owns (lead = onset - page start; + = page early). Pages with no owned
 *  onset within 0.6 s (mid-phrase splits) are reported with lead null. */
export function onsetLeads(pages: { t0: number; text?: string }[], onsets: number[]) {
  const starts = pages.map(p => p.t0);
  return pages.map((p, i) => {
    const o = owned(onsets, starts, i);
    return { t0: +p.t0.toFixed(3), text: p.text, onset: o ?? null, lead: o != null ? +(o - p.t0).toFixed(3) : null };
  });
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function writeCaptionsProject(pages: Page[], total: number, projDir: string, W = 1080, H = 1920) {
  fs.mkdirSync(projDir, { recursive: true });
  for (const f of ['Cairo-Black.ttf', 'Cairo-Bold.ttf']) fs.copyFileSync(path.join(FONTS, f), path.join(projDir, f));
  fs.copyFileSync(path.join(import.meta.dirname, '..', 'vendor', 'gsap.min.js'), path.join(projDir, 'gsap.min.js'));
  const html = `<!doctype html>
<html lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${W}, height=${H}" />
<script src="gsap.min.js"></script>
<style>
@font-face { font-family: "Cairo"; src: url("Cairo-Bold.ttf") format("truetype"); font-weight: 200 799; }
@font-face { font-family: "Cairo"; src: url("Cairo-Black.ttf") format("truetype"); font-weight: 800 1000; }
html, body { margin: 0; background: transparent; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Cairo"; }
.pg { position: absolute; left: 90px; right: 90px; top: 1320px; height: 160px; display: flex; align-items: center; justify-content: center; opacity: 0; direction: rtl; }
/* width guard: never wider than x 90-990; long pages shrink, then wrap to at most two lines */
.pg > div { max-width: 900px; box-sizing: border-box; text-align: center; background: rgba(29,21,72,.80); border-radius: 30px; padding: 4px 30px 12px; font-weight: 700; font-size: 66px; line-height: 1.28; color: #fff; white-space: normal; box-shadow: 0 10px 30px rgba(0,0,0,.18); }
.pg.long > div { font-size: 60px; }  /* cap height >= 2.2 % of 1920 (text-safety floor) */
.pg.xlong > div { font-size: 60px; }
.pg span.on { color: #FFC83D; }
</style>
</head>
<body>
<div id="root" data-composition-id="captions" data-start="0" data-width="${W}" data-height="${H}" data-duration="${total.toFixed(3)}">
${pages.map((p, i) => { const n = p.words.map(w => w.w).join(' ').length; return `<div class="pg${n > 34 ? ' xlong' : n > 24 ? ' long' : ''}" id="pg${i}"><div>${p.words.map((w, k) => `<span id="w${i}_${k}">${esc(w.w)}</span>`).join(' ')}</div></div>`; }).join('\n')}
</div>
<script>
const P = ${JSON.stringify(pages.map(p => ({ t0: +p.t0.toFixed(3), t1: +p.t1.toFixed(3), w: p.words.map(w => +w.t0.toFixed(3)) })))};
const tl = gsap.timeline({ paused: true });
P.forEach(function (p, i) {
  // hard cuts between pages (no cross-fade ghosting); a small scale settle only
  tl.set('#pg' + i, { opacity: 1 }, p.t0);
  tl.fromTo('#pg' + i + ' > div', { scale: 0.94 }, { scale: 1, duration: 0.12, ease: 'back.out(1.6)' }, p.t0);
  tl.set('#pg' + i, { opacity: 0 }, p.t1);
  p.w.forEach(function (t, k) {
    tl.set('#w' + i + '_' + k, { color: '#FFC83D' }, Math.max(p.t0, t));
    if (k > 0) tl.set('#w' + i + '_' + (k - 1), { color: '#FFFFFF' }, Math.max(p.t0, t));
  });
});
tl.set({}, {}, ${total.toFixed(3)});
window.__timelines['captions'] = tl;
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(projDir, 'index.html'), html);
  return projDir;
}
