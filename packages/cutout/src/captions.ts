/**
 * captions.srt (English or Arabic) + chapters.txt from the score. Burned captions are drawn by the page, not here.
 * SRT: one cue per sentence (Latin and Arabic sentence marks), split near a clause mark into balanced cues when longer than
 * 2 lines of 42 characters, word-timed, no overlaps. Arabic text is written as plain logical-order Unicode with no bidi control
 * characters (players lay it out RTL); tatweel removed.
 */
import { buildChapters as chaptersTxt } from '../../test3d/src/long.ts';
import { CLAUSE_END, SENT_END, type Score, type Word } from './film.ts';

const srtTime = (t: number) => { const ms = Math.max(0, Math.round(t * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const BIDI = /[‎‏‪-‮⁦-⁩ـ]/g;
function wrap2(text: string, max = 42) {
  if (text.length <= max) return [text];
  const ws = text.split(' '); let best: string[] = [text], bd = 1e9;
  for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '); const d = Math.max(a.length, b.length); if (d < bd) { bd = d; best = [a, b]; } }
  return best;
}
export function buildSrt(score: Pick<Score, 'lines' | 'duration'>, offset = 0) {
  const words = score.lines.flatMap(l => l.words.map((w, i) => ({ ...w, w: w.w.replace(BIDI, ''), end: i === l.words.length - 1 }))), sents: (Word & { end: boolean })[][] = []; let cur: typeof sents[number] = [];
  for (const w of words) { cur.push(w); if (SENT_END.test(w.w) || w.end) { sents.push(cur); cur = []; } }   // a line end also ends a cue (speaker change)
  if (cur.length) sents.push(cur);
  const len = (g: Word[]) => g.map(w => w.w).join(' ').length;
  const cues: Word[][] = [];
  for (const s of sents) {
    const parts = Math.ceil(len(s) / 84);
    if (parts <= 1) { cues.push(s); continue; }
    let rest: Word[] = s;
    for (let p = parts; p > 1; p--) {
      const target = len(rest) / p; let best = 1, bd = 1e9;
      for (let k = 1; k < rest.length; k++) { const l = len(rest.slice(0, k)), d = Math.abs(l - target) - (CLAUSE_END.test(rest[k - 1].w) && Math.abs(l - target) < target * 0.4 ? target * 0.45 : 0); if (l <= 84 && d < bd) { bd = d; best = k; } }
      cues.push(rest.slice(0, best)); rest = rest.slice(best);
    }
    cues.push(rest);
  }
  return cues.map((g, i) => {
    const t0 = g[0].t0 - offset, nx = cues[i + 1], t1 = Math.min(nx ? nx[0].t0 - offset - 0.04 : score.duration, g[g.length - 1].t1 - offset + 0.35);
    return `${i + 1}\n${srtTime(t0)} --> ${srtTime(Math.max(t1, t0 + 0.5))}\n${wrap2(g.map(w => w.w).join(' ')).join('\n')}\n`;
  }).join('\n');
}
/** chapters.txt (YouTube chapter list) + warnings (< 3 chapters, a chapter < 10 s) */
export const buildChapters = (score: Score) => chaptersTxt(score as any);
