/**
 * test-3d LONG-FORM builder (film.json "long": true): a 16:9 9-12 min YouTube video around one 3D film.
 *   chapters[{id, title, lines, mood?, retake?}] -> one Gemini TTS take per chapter (or per sub-group of <= ~60 s), cached per chunk
 *   -> align (cached per take) -> ASR gates per take -> level-matched clips laid end to end (chapter gap) -> score.json (+ chapters)
 *   -> picture rendered per chapter into segments (reused across versions when the chapter's timing is unchanged) -> joined with -c copy
 *   -> lower-third captions, hook, end text -> narration premix + SFX lane + mood bed (ducked) -> render -> master -> techqa
 *   -> captions.srt + chapters.txt.
 * Draft (--draft): estimated timing (2.7 words/s), no TTS, stills. Preview: previewLong (time window / chapter, low sub-samples).
 * Docs: docs/brands/test-3d/build.md, section "Long-form".
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { renderTimeline } from '../../render/src/render.ts';
import type { Item, Timeline, Track } from '../../render/src/timeline.ts';
import { duckWav, mixClips, mixSfx, musicBedLong, rmsDb, MOODS, type Cue, type Mood } from './audio.ts';
import {
  BRAND, GOLD, MAX_WER, OUTLINE, HOOK_IN, HOOK_OUT, END_IN, PACE_CAP, PY, PYDIR, accentKey, capture, captureExists, engineExtra, fmt, gaps,
  hookTokens, isKey, keySet, lufs, norm, paceTake, placeholder, preambleCheck, snapUp, stillsAt, textEm, twoLines, wpsOf,
  type BuildOptions, type Film, type FilmChapter, type FilmLine, type Score, type ScoreLine, type ScoreWord,
} from './build.ts';

const run = promisify(execFile);
const ALIGN_PY = path.join(PYDIR, 'align.py');
export interface ScoreChapter { id: string; title: string; t0: number; t1: number; mood: Mood }
export interface LongScore extends Score { chapters: ScoreChapter[] }

/* ------------------------------------------------------------------ chapters + chunks */
const WPS_EST = 2.7, TAKE_MAX_WORDS = 165;   // ~61 s of speech at 2.7 words/s; a chapter longer than that is voiced in balanced sub-groups
const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
export const chapterGap = (film: Film) => film.chapter_gap ?? 1.2;
const tailOf = (film: Film) => film.tail ?? 2.0;
/** film.json line `pause_after` (s): extra silence after that line on top of the normal pause / chapter gap (belongs to the line's chapter) */
export const pauseAfter = (l: FilmLine) => Math.max(0, Number((l as any).pause_after ?? 0) || 0);
/** line id -> safe file name (long-form line ids are free-form strings) */
const fileId = (id: string) => id.replace(/[^A-Za-z0-9_.-]+/g, '_');
/** default mood: first chapter curious, last warm, the middle alternates calm / curious */
export function moodOf(film: Film, i: number): Mood {
  const c = film.chapters![i];
  if (c.mood) return c.mood as Mood;
  const n = film.chapters!.length;
  return i === 0 ? 'curious' : i === n - 1 ? 'warm' : i % 2 ? 'calm' : 'curious';
}
interface Chunk { key: string; chapter: FilmChapter; ci: number; k: number; lines: FilmLine[]; text: string }
/** a chapter -> takes of <= TAKE_MAX_WORDS words, split at line boundaries into balanced groups (deterministic: same text = same chunks) */
export function chunksOf(film: Film): Chunk[] {
  const out: Chunk[] = [];
  film.chapters!.forEach((c, ci) => {
    const total = c.lines.reduce((n, l) => n + wordsOf(l.text), 0), parts = Math.max(1, Math.ceil(total / TAKE_MAX_WORDS));
    const groups: FilmLine[][] = [[]]; let acc = 0;
    for (const l of c.lines) {
      const w = wordsOf(l.text), cur = groups[groups.length - 1];
      if (cur.length && groups.length < parts && acc + w / 2 > total * groups.length / parts) groups.push([]);
      groups[groups.length - 1].push(l); acc += w;
    }
    groups.forEach((g, k) => out.push({ key: groups.length > 1 ? `${c.id}_${k + 1}` : c.id, chapter: c, ci, k, lines: g, text: g.map(l => l.text.trim()).join('\n\n') }));
  });
  return out;
}

/** --draft: 2.7 words/s, +0.25 s after a sentence end, chapter_gap between chapters, chapter bounds at the middle of the gap */
export function estimateLong(film: Film): LongScore {
  const { W, H, fps } = fmt(film), per = 1 / WPS_EST, gap = chapterGap(film);
  let t = 0.15; const lines: ScoreLine[] = [], firsts: number[] = [], lasts: number[] = [];
  film.chapters!.forEach((c, ci) => {
    if (ci) t = lasts[ci - 1] + gap;
    firsts.push(t);
    for (const l of c.lines) {
      const words = l.text.trim().split(/\s+/).map(w => { const r = { w, t0: +t.toFixed(3), t1: +(t + per * 0.86).toFixed(3) }; t += per + (/[.!?]["']?$/.test(w) ? 0.25 : 0); return r; });
      lines.push({ id: l.id, text: l.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
      t += pauseAfter(l);   // pause_after: extra silence after the line, shifts everything later
    }
    lasts.push(lines[lines.length - 1].t1 + pauseAfter(c.lines[c.lines.length - 1]));
  });
  const duration = snapUp(lasts[lasts.length - 1] + tailOf(film), fps);
  return { fps, width: W, height: H, duration, lines, chapters: chapterBounds(film, firsts, lasts, duration, fps) };
}
function chapterBounds(film: Film, firsts: number[], lasts: number[], duration: number, fps: number): ScoreChapter[] {
  const b = film.chapters!.map((_, i) => (i ? Math.round((lasts[i - 1] + firsts[i]) / 2 * fps) / fps : 0));
  return film.chapters!.map((c, i) => ({ id: c.id, title: c.title.trim(), t0: +b[i].toFixed(4), t1: +(i + 1 < b.length ? b[i + 1] : duration).toFixed(4), mood: moodOf(film, i) }));
}

/* ------------------------------------------------------------------ narration */
/** align.py with a cache in productions/<id>/voice/ (key = take bytes + lines + align.py): a re-build re-aligns only changed takes */
async function alignCached(file: string, lines: FilmLine[], dir: string, nd: string, tag: string, agent: string) {
  const key = crypto.createHash('sha1').update(fs.readFileSync(file)).update(JSON.stringify(lines.map(l => ({ id: l.id, text: l.text })))).update(fs.readFileSync(ALIGN_PY)).digest('hex').slice(0, 16);
  const cached = path.join(dir, 'voice', `align-${key}.json`);
  if (fs.existsSync(cached)) { fs.copyFileSync(cached, path.join(nd, `align-${tag}.json`)); return { al: JSON.parse(fs.readFileSync(cached, 'utf8')), cached: true }; }
  const lj = path.join(nd, `lines-${tag}.json`), aj = path.join(nd, `align-${tag}.json`);
  fs.writeFileSync(lj, JSON.stringify(lines.map(l => ({ id: l.id, text: l.text }))), 'utf8');
  await withLock('gpu', agent, () => run(PY, ['-I', ALIGN_PY, file, lj, aj], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  fs.copyFileSync(aj, cached);
  return { al: JSON.parse(fs.readFileSync(aj, 'utf8')), cached: false };
}

interface TakeReport { key: string; chapter: string; lines: string[]; words: number; cached: boolean; model: string | null; file: string; raw_file: string; retake: string | number | null;
  wer: number; preamble: { ok: boolean; head: string; problems: string[] }; asr_text: string; spoken_s: number; wps: number; lufs: number; gain_db: number; flags: string[]; align_cached: boolean; pace: any }
interface Placed { id: string; clip: string; at: number; dur: number }

async function narrateLong(film: Film, dir: string, vdir: string, id: string, agent: string, note: (m: string, l?: any) => void) {
  const { W, H, fps } = fmt(film), gap = chapterGap(film);
  const nd = path.join(vdir, 'narration'); fs.mkdirSync(nd, { recursive: true }); fs.mkdirSync(path.join(dir, 'voice'), { recursive: true });
  const chunks = chunksOf(film), takes: (TakeReport & { al: any; play: string })[] = [];
  note(`Narration: ${film.chapters!.length} chapters -> ${chunks.length} takes (${film.voice})`);
  for (const ch of chunks) {
    const retake = ch.chapter.retake ?? film.retake ?? null;
    const tts = await synthesize(ch.text, film.voice, film.style, { productionId: id, retake: retake ?? undefined });
    const rawTake = path.join(dir, 'voice', path.basename(tts.file)); if (!fs.existsSync(rawTake)) fs.copyFileSync(tts.file, rawTake);
    let play = rawTake, pace: any = null, al: any, alc = false;
    if (film.pace) {   // same pacing as the Short (silences cut to max_pause, tempo, auto-raise up to PACE_CAP), per take
      const pc = film.pace; let tempo = pc.tempo, p = await paceTake(rawTake, pc.max_pause, tempo);
      ({ al, cached: alc } = await alignCached(p.file, ch.lines, dir, nd, ch.key, agent));
      let wps = wpsOf(al);
      if (wps < pc.target_wps * 0.92 && tempo < PACE_CAP) {
        const want = Math.min(PACE_CAP, +(tempo * pc.target_wps / wps).toFixed(3));
        if (want > tempo + 0.005) { tempo = want; p = await paceTake(rawTake, pc.max_pause, tempo); ({ al, cached: alc } = await alignCached(p.file, ch.lines, dir, nd, ch.key, agent)); wps = wpsOf(al); }
      }
      pace = { max_pause: pc.max_pause, tempo, removed_s: p.removed_s, cuts: p.cuts, final_wps: +wps.toFixed(2) }; play = p.file;
    } else ({ al, cached: alc } = await alignCached(rawTake, ch.lines, dir, nd, ch.key, agent));
    const pre = preambleCheck(String(al.asr_text), film, al.lines[0]?.start ?? 0, ch.lines);
    const ws = (al.lines as any[]).flatMap(l => l.words), spoken = ws[ws.length - 1].e - ws[0].s;
    const L = await lufs(play);
    takes.push({ key: ch.key, chapter: ch.chapter.id, lines: ch.lines.map(l => l.id), words: ws.length, cached: tts.cached, model: tts.model, file: play, raw_file: rawTake, retake,
      wer: al.wer, preamble: pre, asr_text: String(al.asr_text), spoken_s: +spoken.toFixed(2), wps: +(ws.length / spoken).toFixed(2), lufs: L.i, gain_db: 0, flags: [], align_cached: alc, pace, al, play });
    note(`Take ${ch.key}: ${tts.cached ? 'cached' : `generated (${tts.model})`}, ${spoken.toFixed(1)} s, WER ${(al.wer * 100).toFixed(1)} %, ${L.i} LUFS, ${(ws.length / spoken).toFixed(2)} words/s${alc ? ' (alignment cached)' : ''}`);
  }
  /* gates per take: report every failing take at once (one retake round, not one per chapter) */
  const fails = takes.filter(t => t.wer > MAX_WER || !t.preamble.ok);
  fs.writeFileSync(path.join(nd, 'takes.json'), JSON.stringify(takes.map(({ al, play, ...t }) => t), null, 1), 'utf8');
  if (fails.length) throw new Error(`Narration gate failed for ${fails.length} take(s): ${fails.map(t => `${t.key} (chapter ${t.chapter}: ${t.wer > MAX_WER ? `WER ${(t.wer * 100).toFixed(1)} %` : ''}${!t.preamble.ok ? ` ${t.preamble.problems.join('; ')}` : ''})`).join(' | ')}. Raise chapters[].retake of those chapters (re-voices only them); details ${path.join(nd, 'takes.json')}`);
  /* level match: every take to the median loudness (+-6 dB max); flag takes far from the others in loudness (> 2 dB) or rate (> 12 %) */
  const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };
  const mL = med(takes.map(t => t.lufs)), mW = med(takes.map(t => t.wps));
  for (const t of takes) {
    t.gain_db = +Math.max(-6, Math.min(6, mL - t.lufs)).toFixed(2);
    if (Math.abs(t.lufs - mL) > 2) t.flags.push(`loudness ${t.lufs} LUFS is ${(t.lufs - mL).toFixed(1)} dB from the median ${mL} (corrected by ${t.gain_db} dB; listen for a different voice colour)`);
    if (Math.abs(t.wps / mW - 1) > 0.12) t.flags.push(`speaking rate ${t.wps} words/s is ${((t.wps / mW - 1) * 100).toFixed(0)} % from the median ${mW} (raise chapters[].retake for a new take if it sounds rushed or slow)`);
    for (const f of t.flags) note(`Take ${t.key}: ${f}`, 'warn');
  }
  /* layout: lines end to end; pause inside a take = the take's own pause clamped 0.3-0.75 s; between takes of one chapter 0.55 s; between chapters chapter_gap */
  const placed: Placed[] = [], lines: ScoreLine[] = [], firsts: number[] = [], lasts: number[] = [];
  let prevEnd = 0;
  for (const [ti, tk] of takes.entries()) {
    const newChapter = ti === 0 || takes[ti - 1].chapter !== tk.chapter, ci = film.chapters!.findIndex(c => c.id === tk.chapter);
    for (const [i, lid] of tk.lines.entries()) {
      const a = tk.al.lines[i], s0 = Math.max(0, a.start - 0.04), s1 = Math.min(tk.al.duration, a.end + 0.12), text = film.lines.find(l => l.id === lid)!.text;
      const clip = path.join(nd, `line-${fileId(lid)}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', tk.play, '-af', `volume=${tk.gain_db.toFixed(2)}dB,afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse`, '-ar', '48000', '-ac', '2', clip]);
      const pause = i ? Math.max(0.3, Math.min(0.75, a.start - tk.al.lines[i - 1].end)) : newChapter ? gap : 0.55;
      const first = ti === 0 && i === 0 ? 0.15 : prevEnd + pause;
      const at = Math.round((first - (a.start - s0)) * fps) / fps, off = at - s0;
      const words: ScoreWord[] = a.words.map((w: any) => ({ w: w.w, t0: +(w.s + off).toFixed(3), t1: +(w.e + off).toFixed(3) }));
      if (i === 0 && newChapter) firsts[ci] = words[0].t0;
      placed.push({ id: lid, clip, at, dur: s1 - s0 });
      lines.push({ id: lid, text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
      prevEnd = words[words.length - 1].t1 + pauseAfter(film.lines.find(l => l.id === lid)!); lasts[ci] = prevEnd;   // pause_after shifts every later line
    }
  }
  const duration = snapUp(prevEnd + tailOf(film), fps);
  const score: LongScore = { fps, width: W, height: H, duration, lines, chapters: chapterBounds(film, firsts, lasts, duration, fps) };
  return { score, placed, takes: takes.map(({ al, play, ...t }) => t), loudness_median: mL, wps_median: mW };
}

/* ------------------------------------------------------------------ picture segments */
interface SegEntry { id: string; f0: number; f1: number; key: string; file: string; status: 'rendered' | 'reused'; from_version: number; film_sha: string; seconds?: number; ms_per_frame?: number; why?: string }
interface SegManifest { version: number; film_sha: string; params: Record<string, unknown>; segments: SegEntry[] }
const sha = (x: string | Buffer) => crypto.createHash('sha1').update(x).digest('hex').slice(0, 16);
/** what a segment's frames depend on (besides film.js): frame range, render settings and the chapter's own words + times */
function segKey(score: LongScore, c: ScoreChapter, f0: number, f1: number, params: Record<string, unknown>) {
  const ls = score.lines.filter(l => l.words[0].t0 >= c.t0 && l.words[0].t0 < c.t1);
  return sha(JSON.stringify({ f0, f1, params, lines: ls.map(l => ({ id: l.id, w: l.words.map(w => [w.w, w.t0, w.t1]) })) }));
}
function previousManifest(dir: string, n: number): { v: number; m: SegManifest } | null {
  const vs = fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)).filter(v => v && v < n).sort((a, b) => b - a);
  for (const v of vs) { const f = path.join(dir, `v${v}`, 'segments.json'); if (fs.existsSync(f)) return { v, m: JSON.parse(fs.readFileSync(f, 'utf8')) }; }
  return null;
}
const linkOrCopy = (src: string, dst: string) => { fs.rmSync(dst, { force: true }); try { fs.linkSync(src, dst); } catch { fs.copyFileSync(src, dst); } };
async function countFrames(f: string) {
  const r = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f]);
  return Number(String(r.stdout).trim().split(/\s+/)[0]);
}

async function renderSegments(id: string, film: Film, dir: string, vdir: string, n: number, scoreFile: string, score: LongScore, opts: BuildOptions, note: (m: string, l?: any) => void, prod: any) {
  const { W, H, fps } = fmt(film), NF = Math.round(score.duration * fps), agent = opts.agent ?? 'render';
  const filmSha = sha(fs.readFileSync(path.join(dir, 'film.js')));
  const params = { W, H, fps, sub: opts.sub ?? 16, extra: engineExtra(film) ?? '' };
  const segs = score.chapters.map((c, i) => { const f0 = Math.round(c.t0 * fps), f1 = i === score.chapters.length - 1 ? NF : Math.round(c.t1 * fps); return { c, f0, f1, key: segKey(score, c, f0, f1, params) }; });
  const want = new Set(opts.chapters ?? []);
  for (const c of want) if (!score.chapters.some(x => x.id === c)) throw new Error(`--chapters ${c}: no such chapter (have: ${score.chapters.map(x => x.id).join(', ')})`);
  const prev = want.size || opts.resume ? previousManifest(dir, n) : null;
  if ((want.size || opts.resume) && !prev) note('No earlier version with segments.json: every segment is rendered', 'warn');
  const sdir = path.join(vdir, 'segments'); fs.mkdirSync(sdir, { recursive: true });
  const man: SegManifest = { version: n, film_sha: filmSha, params, segments: [] };
  const save = () => fs.writeFileSync(path.join(vdir, 'segments.json'), JSON.stringify(man, null, 1), 'utf8');
  const todo: typeof segs = [];
  for (const s of segs) {
    const file = path.join(sdir, `${s.c.id}.mp4`);
    if (prev && !want.has(s.c.id)) {
      const p = prev.m.segments.find(x => x.id === s.c.id), src = p ? path.join(dir, `v${prev.v}`, 'segments', `${s.c.id}.mp4`) : '';
      if (p && p.key === s.key && fs.existsSync(src)) {
        linkOrCopy(src, file);
        man.segments.push({ id: s.c.id, f0: s.f0, f1: s.f1, key: s.key, file, status: 'reused', from_version: p.status === 'reused' ? p.from_version : prev.v, film_sha: p.film_sha });
        note(`Segment ${s.c.id} reused from v${prev.v}${p.film_sha !== filmSha ? ` (rendered with an older film.js ${p.film_sha}; current ${filmSha})` : ''}`);
        continue;
      }
      const why = !p ? 'not in the previous version' : p.key !== s.key ? (p.f0 !== s.f0 || p.f1 !== s.f1 ? `frame range changed (${p.f0}-${p.f1} -> ${s.f0}-${s.f1}): narration timing moved` : 'its words/timing or render settings changed') : 'previous file missing';
      if (want.size) note(`Segment ${s.c.id} not listed in --chapters but cannot be reused: ${why}; re-rendering it`, 'warn');
      (s as any).why = why;
    }
    todo.push(s);
  }
  save();
  let cues: Cue[] = [], info: any = null;
  const cap = await capture();
  const totalF = todo.reduce((k, s) => k + s.f1 - s.f0, 0), t0 = Date.now();
  await withLock('render', agent, async () => {
    const s = await cap.open(dir, scoreFile, { width: W, height: H, sub: opts.sub, extra: engineExtra(film) });
    try {
      info = { ...s.info, cues: undefined };
      cues = s.info.cues ?? [];
      note(`3D page ready (${s.info.gl}; ${s.info.frames} frames, ${cues.length} sfx cues); rendering ${todo.length}/${segs.length} segments, ${totalF} frames`);
      if (!/NVIDIA|AMD|Intel/i.test(String(s.info.gl))) note(`WebGL renderer "${s.info.gl}" looks like software rendering`, 'warn');
      if (opts.snap?.length) await cap.stills(s, opts.snap, path.join(vdir, 'stills'), 640);
      let done = 0;
      for (const [k, sg] of todo.entries()) {
        const file = path.join(sdir, `${sg.c.id}.mp4`); let lastPct = -1;
        const rv = await cap.renderRange(s, file, sg.f0, sg.f1, (d: number, tot: number) => {
          const pct = Math.floor(d / tot * 10) * 10; if (pct !== lastPct) { lastPct = pct; console.error(`[test3d]   ${sg.c.id} ${pct}%`); }
          if (prod) try { emit({ kind: 'render.progress', agent, productionId: id, message: `3D ${sg.c.id} ${Math.round((done + d) / totalF * 100)}%` }); } catch { /* busy */ }
        });
        done += rv.frames;
        const el = (Date.now() - t0) / 1000, eta = done < totalF ? el / done * (totalF - done) : 0;
        note(`Segment ${sg.c.id} [${k + 1}/${todo.length}]: ${rv.frames} frames in ${rv.seconds.toFixed(0)} s (${rv.msPerFrame.toFixed(1)} ms/frame)${eta ? `; about ${(eta / 60).toFixed(1)} min left` : ''}`);
        man.segments.push({ id: sg.c.id, f0: sg.f0, f1: sg.f1, key: sg.key, file, status: 'rendered', from_version: n, film_sha: filmSha, seconds: +rv.seconds.toFixed(1), ms_per_frame: +rv.msPerFrame.toFixed(1), ...((sg as any).why ? { why: (sg as any).why } : {}) });
        save();   // after every segment: a crash keeps the finished ones (next build: --resume)
      }
    } finally { await s.close(); }
  });
  man.segments.sort((a, b) => a.f0 - b.f0); save();
  /* join losslessly (concat demuxer, stream copy) and check the frame count */
  const list = path.join(vdir, 'segments.txt'), pic = path.join(vdir, 'picture.mp4');
  fs.writeFileSync(list, man.segments.map(s => `file '${s.file.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n') + '\n', 'utf8');
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', pic]);
  const got = await countFrames(pic);
  if (got !== NF) throw new Error(`joined picture has ${got} frames, expected ${NF} (segments: ${man.segments.map(s => `${s.id} ${s.f0}-${s.f1}`).join(', ')})`);
  const rendered = man.segments.filter(s => s.status === 'rendered'), secs = rendered.reduce((a, s) => a + (s.seconds ?? 0), 0), fr = rendered.reduce((a, s) => a + s.f1 - s.f0, 0);
  note(`Picture joined: ${got} frames (${rendered.length} rendered in ${(secs / 60).toFixed(1)} min${fr ? `, ${(secs * 1000 / fr).toFixed(1)} ms/frame` : ''}; ${man.segments.length - rendered.length} reused)`);
  return { pic, cues, info: { ...info, segments: man.segments.map(({ file, ...s }) => s) } };
}

/* ------------------------------------------------------------------ captions, srt, chapters */
/** Arial Black advance widths (em) for sentence-case text (build.ts textEm is upper-case only and reads lower case ~1.4x too wide) */
const ADV_LC: Record<string, number> = { a: .667, b: .667, c: .667, d: .667, e: .667, f: .389, g: .667, h: .667, i: .333, j: .333, k: .667, l: .333, m: 1, n: .667, o: .667, p: .667, q: .667, r: .444, s: .611, t: .444, u: .667, v: .611, w: .944, x: .667, y: .611, z: .556, ',': .333, '.': .333, ';': .333, ':': .333, '?': .611, '!': .333 };
/** mixed-case Arial Black width in em, +8 % for the renderer's real glyph box */
export const textEmMixed = (t: string) => 1.08 * [...t].reduce((a, c) => a + (ADV_LC[c] ?? textEm(c)), 0);
const STOP = new Set('a an the of to in on at by for from into onto with and or but nor so as if than that this these those its it is was are were be been his her their our your my when while which who whom whose where what how not no'.split(' '));
export interface LPage { text: string; t0: number; t1: number; words: string[]; keys: string[] }
/** lower-third groups of 2-6 words: break after a sentence end, after a comma once 3+ words, on a > 0.35 s pause, at 6 words or past 2 lines;
 *  a lone word is merged into its neighbour when the limits allow. Shown until the next page starts (>= 0.4 s when the gap allows). */
export function groupLower(words: ScoreWord[], lineEm: number, keyWords?: Set<string>): LPage[] {
  const clean = (w: string) => w.replace(/[.,;:!?"“”]+$/g, '').replace(/^["“”]+/, '');
  const groups: ScoreWord[][] = []; let cur: ScoreWord[] = [];
  const em = (g: ScoreWord[]) => textEmMixed(g.map(x => clean(x.w)).join(' '));
  for (const w of words) {
    if (cur.length && (cur.length >= 6 || em([...cur, w]) > lineEm * 1.9 || w.t0 - cur[cur.length - 1].t1 > 0.35)) {
      // a size break never leaves a dangling function word ("steps into the"): it moves on with the next words
      const pause = w.t0 - cur[cur.length - 1].t1 > 0.35, carry: ScoreWord[] = [];
      while (!pause && cur.length > 2 && carry.length < 2 && STOP.has(clean(cur[cur.length - 1].w).toLowerCase())) carry.unshift(cur.pop()!);
      groups.push(cur); cur = carry;
    }
    cur.push(w);
    if (/[.;:!?]["')]?$/.test(w.w) || (/,["')]?$/.test(w.w) && cur.length >= 3)) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);
  for (let i = 0; i < groups.length; i++) if (groups[i].length === 1 && groups.length > 1) {
    const g = groups[i], prev = groups[i - 1], next = groups[i + 1];
    const fitsPrev = prev && prev.length < 6 && em([...prev, ...g]) <= lineEm * 1.9 && g[0].t0 - prev[prev.length - 1].t1 <= 0.35 && !/[.;:!?]["')]?$/.test(prev[prev.length - 1].w);
    const fitsNext = next && next.length < 6 && em([...g, ...next]) <= lineEm * 1.9 && next[0].t0 - g[0].t1 <= 0.35 && !/[.;:!?]["')]?$/.test(g[0].w);
    if (fitsPrev) { prev.push(...g); groups.splice(i--, 1); } else if (fitsNext) { next.unshift(...g); groups.splice(i--, 1); }
    else if (prev && prev.length >= 4 && g[0].t0 - prev[prev.length - 1].t1 <= 0.35 && !/[.;:!?]["')]?$/.test(prev[prev.length - 1].w)) g.unshift(prev.pop()!);   // 6 + 1 -> 5 + 2
  }
  const pages = groups.map(g => { const ws = g.map(x => clean(x.w)); return { text: ws.join(' '), t0: g[0].t0, t1: g[g.length - 1].t1, words: ws, keys: ws.filter(w => isKey(w, keyWords)) }; });
  for (let i = 0; i < pages.length; i++) { const nx = pages[i + 1]; pages[i].t1 = nx ? Math.min(nx.t0, Math.max(pages[i].t1 + 0.12, pages[i].t0 + 0.4)) : pages[i].t1 + 0.3; }
  return pages;
}
const srtTime = (t: number) => { const ms = Math.max(0, Math.round(t * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
/** wrap to <= max chars per line, balanced into 2 lines when it does not fit one */
function wrap2(text: string, max = 42) {
  if (text.length <= max) return [text];
  const ws = text.split(' '); let best: string[] = [text], bd = 1e9;
  for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '); const d = Math.max(a.length, b.length); if (d < bd) { bd = d; best = [a, b]; } }
  return best;
}
/** captions.srt: one cue per sentence (split into balanced parts when longer than 2 lines of 42 chars), word-timed, no overlaps */
export function buildSrt(score: Score) {
  const words = score.lines.flatMap(l => l.words), sents: ScoreWord[][] = []; let cur: ScoreWord[] = [];
  for (const w of words) { cur.push(w); if (/[.!?]["')]?$/.test(w.w)) { sents.push(cur); cur = []; } }
  if (cur.length) sents.push(cur);
  const cues: ScoreWord[][] = [];
  for (const s of sents) {
    const len = (g: ScoreWord[]) => g.map(w => w.w).join(' ').length;
    const parts = Math.ceil(len(s) / 84);
    if (parts <= 1) { cues.push(s); continue; }
    // split at word boundaries near equal length, preferring a comma within +-25 % of the target
    let rest = s;
    for (let p = parts; p > 1; p--) {
      const target = len(rest) / p; let best = 1, bd = 1e9;
      for (let k = 1; k < rest.length; k++) { const l = len(rest.slice(0, k)), d = Math.abs(l - target) - (/[,;:]$/.test(rest[k - 1].w) && Math.abs(l - target) < target * 0.4 ? target * 0.45 : 0); if (len(rest.slice(0, k)) <= 84 && d < bd) { bd = d; best = k; } }
      cues.push(rest.slice(0, best)); rest = rest.slice(best);
    }
    cues.push(rest);
  }
  return cues.map((g, i) => {
    const t0 = g[0].t0, nx = cues[i + 1], t1 = Math.min(nx ? nx[0].t0 - 0.04 : score.duration, g[g.length - 1].t1 + 0.35);
    return `${i + 1}\n${srtTime(t0)} --> ${srtTime(Math.max(t1, t0 + 0.5))}\n${wrap2(g.map(w => w.w).join(' ')).join('\n')}\n`;
  }).join('\n');
}
const ytTime = (t: number, long: boolean) => { const s = Math.floor(t + 1e-6), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return long ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
/** chapters.txt (YouTube description chapter list): first at 0:00; warns when YouTube would ignore it (< 3 chapters or one < 10 s) */
export function buildChapters(score: LongScore) {
  const long = score.duration >= 3600, warn: string[] = [];
  if (score.chapters.length < 3) warn.push(`YouTube needs at least 3 chapters (have ${score.chapters.length})`);
  for (const c of score.chapters) if (c.t1 - c.t0 < 10) warn.push(`chapter ${c.id} is ${(c.t1 - c.t0).toFixed(1)} s (YouTube needs >= 10 s)`);
  return { text: score.chapters.map((c, i) => `${i ? ytTime(c.t0, long) : long ? '0:00:00' : '0:00'} ${c.title}`).join('\n') + '\n', warn };
}

/* 16:9 text layout in the renderer's 1920x1080 design box (= canvas px at 1920x1080). Lower third: 64 px Arial Black (cap ~46 px = 4.2 % of
 * the height, ~8.6 px on a 360 px wide phone), centred at 81 % height: one line 77.7-84.3 %, two lines 74.4-87.6 % = clear of the bottom 8 %
 * and of YouTube's player-controls zone (90-100 %), inside the 90 % title-safe width (lines <= 20 em ~ 1280 px = 67 %). */
const LCAP = { font: 'Arial Black', size: 64, y: 31, lineEm: 20, lineHeight: 1.12, shadow: [[3, 0], [-3, 0], [0, 3], [0, -3], [2, 2], [-2, 2], [2, -2], [-2, -2]].map(([x, y]) => `${x}px ${y}px 0 #000`).join(', ') + ', 0 4px 0 #000, 0 6px 18px rgba(0,0,0,0.85)' };
/** split into two balanced lines only when one line would pass maxEm (mixed-case widths) */
function twoLinesMixed(text: string, maxEm: number) {
  if (textEmMixed(text) <= maxEm || !text.includes(' ')) return text;
  const ws = text.split(' '); let best = text, bd = 1e9;
  for (let k = 1; k < ws.length; k++) { const d = Math.max(textEmMixed(ws.slice(0, k).join(' ')), textEmMixed(ws.slice(k).join(' '))); if (d < bd) { bd = d; best = `${ws.slice(0, k).join(' ')}\n${ws.slice(k).join(' ')}`; } }
  return best;
}
const LHOOK = { size: 120, y: -18, maxEm: 11 };   // centred at 32 % height; two lines about 22-42 %
const LEND = { size: 104, y: -18, maxEm: 12, fitEm: 14.5, minK: 0.76 };
const HOOK_SHADOW = `${OUTLINE}, 0 9px 0 #000, 0 12px 28px rgba(0,0,0,0.9)`;

/* ------------------------------------------------------------------ build */
export async function buildLong(id: string, film: Film, dir: string, opts: BuildOptions = {}) {
  const agent = opts.agent ?? 'render', t00 = Date.now(), log: string[] = [];
  const { W, H, fps } = fmt(film);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any;
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[test3d] ${m}`); if (prod) try { emit({ kind: 'build.step', agent, productionId: id, level, message: m }); } catch { /* events busy */ } };
  if (W <= H) note(`long film with format ${W}x${H}: long-form is laid out for 16:9`, 'warn');

  if (opts.draft) {
    const vdir = path.join(dir, 'draft'); fs.mkdirSync(vdir, { recursive: true });
    const score = estimateLong(film), scoreFile = path.join(vdir, 'score.json');
    fs.writeFileSync(scoreFile, JSON.stringify(score, null, 1), 'utf8');
    fs.writeFileSync(path.join(vdir, 'chapters.txt'), buildChapters(score).text, 'utf8');
    const nWords = score.lines.reduce((k, l) => k + l.words.length, 0);
    note(`Draft score: ${score.duration.toFixed(1)} s (${(score.duration / 60).toFixed(1)} min), ${score.chapters.length} chapters, ${score.lines.length} lines, ${nWords} words (estimated ${WPS_EST} words/s, chapter gap ${chapterGap(film)} s)`);
    for (const c of score.chapters) note(`  ${c.id} ${c.t0.toFixed(1)}-${c.t1.toFixed(1)} s ${c.mood} "${c.title}"`);
    let stills: string[] = [];
    if (captureExists() && fs.existsSync(path.join(dir, 'film.js'))) {
      const times = opts.snap?.length ? opts.snap : score.chapters.flatMap(c => [0.3, 0.7].map(f => +(c.t0 + f * (c.t1 - c.t0)).toFixed(2)));
      const cap = await capture();
      stills = await withLock('render', agent, async () => { const s = await cap.open(dir, scoreFile, { width: W, height: H, sub: opts.sub ?? 1, extra: engineExtra(film) }); try { return await cap.stills(s, times, path.join(vdir, 'stills'), 640); } finally { await s.close(); } });
      note(`${stills.length} 3D stills -> ${path.join(vdir, 'stills')}`);
    } else note(`No 3D stills: ${captureExists() ? 'film.js' : 'packages/test3d/src/capture.ts'} not there yet`, 'warn');
    return { production_id: id, draft: true, long: true, duration: score.duration, chapters: score.chapters, score: scoreFile, stills, log };
  }

  if ((opts as any).voiceOnly) {   // 2026-11-15: narration + gates + score only (no version folder, no picture): check new takes in minutes before a long render
    const vdir = path.join(dir, 'voice-check'); fs.mkdirSync(vdir, { recursive: true });
    const nar = await narrateLong(film, dir, vdir, id, agent, note);
    fs.writeFileSync(path.join(vdir, 'score.json'), JSON.stringify(nar.score, null, 1), 'utf8');
    note(`voice-only: ${nar.score.duration.toFixed(1)} s (${(nar.score.duration / 60).toFixed(2)} min); score + takes -> ${vdir}`, 'success');
    return { voice_only: true, score: path.join(vdir, 'score.json'), duration: nar.score.duration } as any;
  }

  const vmax = Math.max(0, ...fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)));
  const n = Math.max(vmax, Number(prod?.version ?? 0)) + 1, vdir = path.join(dir, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  note(`test-3d LONG build v${n} started (${film.chapters!.length} chapters, ${film.lines.length} lines, ${W}x${H}${opts.no3d ? ', placeholder picture' : ''}${opts.chapters?.length ? `, re-render ${opts.chapters.join(',')}` : opts.resume ? ', resume' : ''})${prod ? '' : ' (no DB row: files only)'}`);
  if (opts.reason) fs.writeFileSync(path.join(vdir, 'build-reason.json'), JSON.stringify({ version: n, command: 'test3d build (long)', reason: opts.reason, rebuild: n >= 2, agent, at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
  else if (n >= 2) note(`v${n} is a rebuild without --reason`, 'warn');
  if (prod) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  /* 1. narration + score */
  const nar = await narrateLong(film, dir, vdir, id, agent, note);
  const score = nar.score, scoreFile = path.join(vdir, 'score.json');
  fs.writeFileSync(scoreFile, JSON.stringify(score, null, 1), 'utf8');
  const D = score.duration, NF = Math.round(D * fps), F = (t: number) => Math.max(0, Math.round(t * fps));
  const nWords = score.lines.reduce((k, l) => k + l.words.length, 0), spoken = score.lines[score.lines.length - 1].t1 - score.lines[0].t0;
  note(`Score: ${D.toFixed(1)} s (${(D / 60).toFixed(2)} min), ${nWords} words; chapters ${score.chapters.map(c => `${c.id} ${c.t0.toFixed(1)}`).join(', ')}`);

  /* 2. picture */
  let pic: string, cues: Cue[], pictureInfo: any;
  if (opts.no3d) {
    pic = await placeholder(path.join(vdir, 'picture.mp4'), D, W, H, fps);
    cues = [{ name: 'whoosh', t: 0.02, db: -16 }, ...score.chapters.slice(1).map(c => ({ name: 'chime', t: +c.t0.toFixed(3), db: -20 })), { name: 'swell', t: +Math.max(0, score.chapters[score.chapters.length - 1].t0 - 1.8).toFixed(3), db: -22, dur: 1.8 }];
    pictureInfo = 'placeholder';
    note(`Placeholder picture (--no-3d) + ${cues.length} test SFX cues`);
  } else ({ pic, cues, info: pictureInfo } = await renderSegments(id, film, dir, vdir, n, scoreFile, score, opts, note, prod));
  fs.writeFileSync(path.join(vdir, 'cues.json'), JSON.stringify(cues, null, 1), 'utf8');

  /* 3. captions (lower third), srt, chapters */
  const keys = keySet(film), lastLine = score.lines[score.lines.length - 1];
  const endOn = !!film.end_text?.trim() && score.lines.length > 1, capsOn = film.captions !== false;
  const hookDur = film.hook_dur ?? 3.0;
  // film.json end_text_word: the end text comes in ON that word of the last line (0.3 s before it), not at the line's start; the words before it keep their captions
  const etw = String((film as any).end_text_word ?? '').toLowerCase(), ew = endOn && etw ? lastLine.words.find(w => String(w.w).toLowerCase().replace(/[^a-z0-9']/g, '') === etw) : null;
  const endT = endOn ? (ew ? Math.max(lastLine.t0, ew.t0 - 0.3) : lastLine.t0) : lastLine.t1;
  let pages = groupLower(endOn ? [...score.lines.slice(0, -1).flatMap(l => l.words), ...lastLine.words.filter(w => w.t1 <= endT - 0.05)] : score.lines.flatMap(l => l.words), LCAP.lineEm, keys);
  if (endOn && pages.length) pages[pages.length - 1].t1 = Math.min(pages[pages.length - 1].t1, endT);
  const hk = hookTokens(film.hook_text); let hookEnd = hookDur;
  const hookY = (film as any).hook_text_y ?? LHOOK.y, hookLow = hookY > 10;   // film.json hook_text_y (% of the height from the centre): a hook in the lower third shares the caption band, so NO caption shows before it ends
  const clash = pages.find(p => p.t0 < hookEnd && (hookLow || p.words.some(w => hk.has(accentKey(w)))));
  if (clash && clash.t0 >= hookDur - 0.6) hookEnd = clash.t0;
  pages = pages.flatMap(p => (p.t0 < hookEnd && (hookLow || p.words.some(w => hk.has(accentKey(w)))) ? (p.t1 - hookEnd < 0.3 ? [] : [{ ...p, t0: hookEnd }]) : [p]));
  const caps = capsOn ? pages : [];
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(caps, null, 1), 'utf8');
  fs.writeFileSync(path.join(vdir, 'captions.srt'), buildSrt(score), 'utf8');
  const chap = buildChapters(score);
  fs.writeFileSync(path.join(vdir, 'chapters.txt'), chap.text, 'utf8');
  for (const w of chap.warn) note(`chapters.txt: ${w}`, 'warn');

  /* 4. audio: narration premix, SFX lane, mood bed (ducked like the Short: -24 dBFS between lines, -32 under speech) */
  const narration = mixClips(path.join(vdir, 'narration', 'narration.wav'), nar.placed.map(p => ({ file: p.clip, at: p.at })), D);
  const sfxFile = mixSfx(path.join(vdir, 'sfx.wav'), cues, D);
  const sections = score.chapters.map(c => ({ id: c.id, t0: c.t0, t1: c.t1, mood: c.mood }));
  const tb = Date.now(), music = musicBedLong(path.join(vdir, 'music.wav'), D, sections, film.music_seed ?? 7);
  note(`Music bed: ${sections.map(s => `${s.id} ${s.mood}`).join(', ')} (${((Date.now() - tb) / 1000).toFixed(1)} s)`);
  const spans: [number, number][] = [];
  for (const l of score.lines) { const a = l.t0 - 0.12, e = l.t1 + 0.2; if (spans.length && a <= spans[spans.length - 1][1] + 0.5) spans[spans.length - 1][1] = e; else spans.push([a, e]); }
  duckWav(music, spans, -4, -12);   // 2026-11-15 long-form: -24 between lines, -32 under speech (the Short uses -30; 10 minutes of narration gets 2 dB more room, QA found -34 inaudible)

  /* 5. timeline */
  const tracks: Track[] = [];
  tracks.push({ name: 'picture', kind: 'video', items: [{ type: 'video', name: opts.no3d ? 'placeholder' : '3d', src: pic, fromFrame: 0, durationInFrames: NF, volume: 0 }] });
  const accentOf = (t: string) => { const a = Object.fromEntries(t.split(/\s+/).filter(w => isKey(w, keys)).map(w => [accentKey(w), GOLD])); return Object.keys(a).length ? { accent: a } : {}; };
  const hd = F(hookEnd), hookText = twoLines(film.hook_text, LHOOK.maxEm);
  const hookItem = (name: string, from: number, dur: number, k: number, op = 1) => ({ type: 'text', name, text: hookText, fromFrame: from, durationInFrames: dur, transform: { y: hookY, ...(op < 1 ? { opacity: op } : {}) },
    props: { fontFamily: LCAP.font, fontSize: Math.round(LHOOK.size * k), fontWeight: 900, color: '#FFFFFF', lineHeight: 1.04, textShadow: HOOK_SHADOW, ...accentOf(film.hook_text) } }) as Item;
  const hookItems: Item[] = HOOK_IN.slice(0, -1).map((k, i) => hookItem(`hook_in${i}`, i, 1, k));
  const holdFrom = HOOK_IN.length - 1, outFrom = hd - HOOK_OUT.length;
  hookItems.push(hookItem('hook', holdFrom, Math.max(1, outFrom - holdFrom), 1));
  HOOK_OUT.forEach((op, i) => hookItems.push(hookItem(`hook_out${i}`, outFrom + i, 1, 1, op)));
  tracks.push({ name: 'hook', kind: 'video', items: hookItems });
  if (film.end_text?.trim()) {
    const et = film.end_text.trim(), e0 = F(endOn ? endT : lastLine.t1), e1 = NF;
    const endText = twoLinesMixed(et, LEND.maxEm), endFit = Math.min(1, LEND.fitEm / Math.max(...endText.split(/\n/).map(textEmMixed)));
    const endItem = (name: string, from: number, dur: number, k: number) => ({ type: 'text', name, text: endText, fromFrame: from, durationInFrames: dur, transform: { y: (film as any).end_text_y ?? LEND.y },   // film.json end_text_y: % of the height from the centre (Host: top of the frame, the faces stay free)
      props: { fontFamily: LCAP.font, fontSize: Math.round(LEND.size * Math.max(endFit * k, Math.min(k, LEND.minK))), fontWeight: 900, color: '#FFFFFF', lineHeight: 1.06, textShadow: HOOK_SHADOW, ...accentOf(et) } }) as Item;
    const ei: Item[] = []; let f = e0;
    for (const k of END_IN) { if (f >= e1 - 1) break; ei.push(endItem(`end_in${f - e0}`, f, 1, k)); f++; }
    if (e1 > f) ei.push(endItem('end', f, e1 - f, 1));
    tracks.push({ name: 'end_text', kind: 'video', items: ei });
  }
  if (caps.length) tracks.push({ name: 'captions', kind: 'video', items: caps.map((p, i) => ({ type: 'text', name: `cap${i}`, text: twoLinesMixed(p.text, LCAP.lineEm), fromFrame: F(p.t0), durationInFrames: Math.max(1, F(p.t1) - F(p.t0)), transform: { y: LCAP.y },
    props: { fontFamily: LCAP.font, fontSize: LCAP.size, fontWeight: 900, color: '#FFFFFF', lineHeight: LCAP.lineHeight, textShadow: LCAP.shadow, ...(p.keys.length ? { accent: Object.fromEntries(p.keys.map(k => [accentKey(k), GOLD])) } : {}) } }) as Item) });
  tracks.push({ name: 'narration', kind: 'audio', items: [{ type: 'audio', name: 'narration', src: narration, fromFrame: 0, durationInFrames: NF, volume: 1 }] });
  if (cues.length) tracks.push({ name: 'sfx', kind: 'audio', items: [{ type: 'audio', name: 'sfx', src: sfxFile.file, fromFrame: 0, durationInFrames: NF, volume: 1 }] });
  tracks.push({ name: 'music', kind: 'audio', items: [{ type: 'audio', name: 'music', src: music, fromFrame: 0, durationInFrames: NF, volume: 1 }] });
  const tl: Timeline = { version: 1, width: W, height: H, fps, durationInFrames: NF, background: '#000000', tracks, meta: { builder: 'test3d-long', brand: BRAND, production: id, version: n } };
  fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(tl, null, 1), 'utf8');

  /* listen-by-numbers */
  const mix = { voice_rms_db: rmsDb(narration, spans), music_rms_under_speech_db: rmsDb(music, spans), music_rms_between_lines_db: rmsDb(music, gaps(spans, D)), sfx_lufs: cues.length ? (await lufs(sfxFile.file)).i : null, voice_lufs: (await lufs(narration)).i, music_lufs: (await lufs(music)).i };
  const mixReport = { ...mix, voice_over_music_under_speech_db: mix.voice_rms_db != null && mix.music_rms_under_speech_db != null ? +(mix.voice_rms_db - mix.music_rms_under_speech_db).toFixed(1) : null };
  // voice level per chapter after level matching (narration premix): should sit within ~1 dB
  const chapterVoice = score.chapters.map(c => ({ id: c.id, voice_rms_db: rmsDb(narration, spans.filter(([a, e]) => a >= c.t0 - 0.2 && e <= c.t1 + 0.4)) }));
  note(`Mix: voice ${mix.voice_rms_db} dBFS RMS vs music under speech ${mix.music_rms_under_speech_db} (${mixReport.voice_over_music_under_speech_db} dB below), between lines ${mix.music_rms_between_lines_db}; voice per chapter ${chapterVoice.map(c => c.voice_rms_db).join(' / ')}`);

  const report: any = { production_id: id, version: n, long: true, duration: D, minutes_of_video: +(D / 60).toFixed(2), narration_s: +spoken.toFixed(2), words: nWords, words_per_s: +(nWords / spoken).toFixed(2), first_word: score.lines[0].t0,
    chapters: score.chapters, chapter_gap: chapterGap(film), takes: nar.takes, loudness_median_lufs: nar.loudness_median, wps_median: nar.wps_median, take_flags: nar.takes.flatMap(t => t.flags.map(f => `${t.key}: ${f}`)),
    wer_max: Math.max(...nar.takes.map(t => t.wer)), picture: pictureInfo, cues: cues.length, captions: caps.length, captions_on: capsOn, hook_end: hookEnd, chapters_warn: chap.warn, mix: mixReport, voice_per_chapter: chapterVoice, reason: opts.reason ?? null };
  if (prod) {
    db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET notes=excluded.notes`).run(id, n, path.join(vdir, 'captions.json'), J.str(report));
    db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, id);
  }

  /* 6. render -> master -> techqa */
  const raw = path.join(vdir, 'render.raw.mp4');
  const rr = await withLock('render', agent, () => renderTimeline(tl, raw, { workDir: path.join(vdir, 'render-work') }));
  note(`Composited with ffmpeg in ${rr.seconds.toFixed(1)} s${rr.textSafety ? `; text safety ${rr.textSafety.pass ? 'pass' : 'FAIL'}: ${rr.textSafety.summary}` : ''}`, rr.textSafety && !rr.textSafety.pass ? 'warn' : 'info');
  report.text_safety = rr.textSafety ?? null;
  const final = path.join(vdir, 'render.mp4');
  await master(raw, final);
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(vdir, 'qa'), '--expect-duration', D.toFixed(2), '--size', `${W}x${H}`, '--sheet-step', D > 120 ? '10' : '1.5'], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  // stills: hook, 3 caption pages with a gold word, the first second of each later chapter (max 6), the end text
  const keyed = caps.filter(p => p.keys.length && p.t1 - p.t0 >= 0.3);
  const capT = keyed.length ? [0.3, 0.55, 0.8].map(f => { const p = keyed.reduce((b, q) => Math.abs(q.t0 - D * f) < Math.abs(b.t0 - D * f) ? q : b, keyed[0]); return +((p.t0 + p.t1) / 2).toFixed(2); }) : [];
  const snapT = opts.snap?.length ? opts.snap : [1.0, ...capT, ...score.chapters.slice(1, 7).map(c => +(c.t0 + 1).toFixed(2)), ...(film.end_text?.trim() ? [+(D - 1).toFixed(2)] : [])];
  const st = await stillsAt(final, snapT, path.join(vdir, 'qa', 'stills'));
  if (prod) {
    db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), id, n);
    if (opts.reason) try { db().prepare(`UPDATE versions SET notes=json_set(CASE WHEN json_valid(notes) THEN notes ELSE json_object('text', notes) END, '$.reason', ?) WHERE production_id=? AND n=?`).run(opts.reason, id, n); } catch { /* no row */ }
    db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(id);
  }
  report.minutes = +((Date.now() - t00) / 60000).toFixed(1);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) in ${report.minutes} min; technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')} (checks: ${Object.keys(tq.checks).join(', ')}); ${tq.integrated_lufs} LUFS, ${tq.true_peak_dbfs} dBTP`, tq.pass ? 'success' : 'warn');
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, techqa: tq, log }, null, 1), 'utf8');
  return { ...report, takes: undefined, render: final, score: scoreFile, srt: path.join(vdir, 'captions.srt'), chapters_txt: path.join(vdir, 'chapters.txt'), stills: st, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs } };
}

/** Fast preview of a time window (or one chapter) of the 3D picture: low sub-samples, smaller frame, video + the version's sound when it has any.
 *  -> <version|draft>/preview/<label>.mp4 */
export async function previewLong(id: string, film: Film, dir: string, o: { from?: number; to?: number; chapter?: string; version?: string; sub?: number; width?: number; agent?: string }) {
  const { W, H, fps } = fmt(film);
  let vd = o.version === 'draft' ? 'draft' : o.version ? `v${o.version}` : '';
  if (!vd) { const vs = fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)).filter(v => v && fs.existsSync(path.join(dir, `v${v}`, 'score.json'))); vd = vs.length ? `v${Math.max(...vs)}` : 'draft'; }
  const vdir = path.join(dir, vd), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: run build ${id} --draft first`);
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as LongScore;
  let a = o.from, b = o.to, label = '';
  if (o.chapter) { const c = score.chapters?.find(x => x.id === o.chapter); if (!c) throw new Error(`chapter ${o.chapter} not in ${scoreFile}`); a = c.t0; b = c.t1; label = c.id; }
  if (a == null || b == null || !(b > a)) throw new Error('preview needs --from S --to S (S in seconds) or --chapter ID');
  a = Math.max(0, a); b = Math.min(score.duration, b); label ||= `${a.toFixed(1)}-${b.toFixed(1)}`;
  const w = Math.round((o.width ?? 960) / 2) * 2, h = Math.round(w * H / W / 2) * 2, sub = o.sub ?? 4;
  const out = path.join(vdir, 'preview', `${label}.mp4`), silent = out.replace(/\.mp4$/, '.video.mp4');
  const cap = await capture(), t0 = Date.now();
  const rv = await withLock('render', o.agent ?? 'render', async () => {
    const s = await cap.open(dir, scoreFile, { width: w, height: h, sub, extra: engineExtra(film) });
    try { return await cap.renderRange(s, silent, Math.round(a! * fps), Math.round(b! * fps)); } finally { await s.close(); }
  });
  const sound = [path.join(vdir, 'render.mp4'), path.join(vdir, 'narration', 'narration.wav')].find(f => fs.existsSync(f));
  if (sound) { await run('ffmpeg', ['-v', 'error', '-y', '-i', silent, '-ss', a.toFixed(3), '-t', (b - a).toFixed(3), '-i', sound, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', out]); fs.rmSync(silent); }
  else fs.renameSync(silent, out);
  return { file: out, from: a, to: b, frames: rv.frames, size: `${w}x${h}`, sub, ms_per_frame: +rv.msPerFrame.toFixed(1), seconds: +((Date.now() - t0) / 1000).toFixed(1), sound: sound ?? null };
}
