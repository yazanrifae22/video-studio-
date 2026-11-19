/**
 * test-3d builder (TEST brand): a 9:16 Short around one 3D film.
 *   productions/<id>/film.json {title, format, voice, style, hook_text, lines[{id,text}], claims} + productions/<id>/film.js (3D film, other engineer)
 *   -> narration (ONE Gemini TTS take, cached) -> align (faster-whisper) -> ASR gate (WER <= 8 %, no spoken style preamble)
 *   -> score.json (script words, aligned times) -> 3D picture (packages/test3d/src/capture.ts, headless Chrome GPU; --no-3d = dark placeholder)
 *   -> timeline.json (picture + hook text + word-timed 1-3 word captions + narration + mixed SFX lane + ducked procedural music bed)
 *   -> packages/render (ffmpeg) -> master (-14 LUFS, <= -1.6 dBTP) -> techqa -> 360 px stills.
 * --draft: estimated timing (2.7 words/s, no TTS) -> productions/<id>/draft/score.json (+ 3D stills when capture exists); never a version.
 * Docs: docs/brands/test-3d/build.md.
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P, production } from '../../shared/src/paths.ts';
import { aiTextHits } from '../../shared/src/ai-text.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { renderTimeline } from '../../render/src/render.ts';
import type { Item, Timeline, Track } from '../../render/src/timeline.ts';
import { duckWav, mixSfx, musicBed, rmsDb, type Cue } from './audio.ts';

const run = promisify(execFile);
export const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
export const PYDIR = path.join(P.root, 'packages', 'intelligence', 'py');
const CAPTURE = path.join(P.root, 'packages', 'test3d', 'src', 'capture.ts');
export const BRAND = 'test-3d';
export const GOLD = '#FFC94A';
export const MAX_WER = 0.08;

export interface FilmLine { id: string; text: string; /** long-form: extra silence (s) after this line, shifts every later time */ pause_after?: number }
export interface Film {
  id?: string; brand?: string; title: string;
  format: { width: number; height: number; fps: number };
  voice: string; style?: string; hook_text: string; end_text?: string;
  pace?: { max_pause: number; tempo: number; target_wps: number };
  lines: FilmLine[]; claims?: unknown[];
  /** optional look parameters of the 3D engine for this film (URL params of the page: bloom, bloomthr, dof, grain, vig, tm, contrast, sat, ...; docs/brands/test-3d/engine.md) */
  engine?: Record<string, number | string>;
  /** optional: replaces the built-in KEY_NOUNS list for the gold accents in captions and hook (numbers / spelled numbers / percent / half stay automatic) */
  key_words?: string[];
  /** optional: line ids driving the music bed and the --no-3d riser/hit cues; absent = l08 / l11 / l15 / l16 */
  music?: { rise: string; resolve: string; swell_from: string; swell_to: string };
  /** optional: salt for the TTS cache key = a fresh take of the same text (re-roll after a misread take); absent = key unchanged */
  retake?: string | number;
  /** LONG-FORM (packages/test3d/src/long.ts, docs/brands/test-3d/build.md "Long-form"): true = 16:9 9-12 min film built from `chapters`
   *  (one TTS take per chapter or sub-group, per-chapter picture segments, lower-third captions, captions.srt, chapters.txt, mood bed). */
  long?: boolean;
  chapters?: FilmChapter[];
  /** long: seconds between the last word of a chapter and the first word of the next (default 1.2, 0.6-3) */
  chapter_gap?: number;
  /** long: lower-third burned captions on (default true); captions.srt is always written */
  captions?: boolean;
  /** long: seconds after the last word (default 2.0; raise it for a YouTube end screen) */
  tail?: number;
  /** long: seconds the hook text stays up (default 3.0) */
  hook_dur?: number;
  /** long: seed of the procedural music bed (another number = another bed with the same moods) */
  music_seed?: number;
}
export interface FilmChapter { id: string; title: string; lines: FilmLine[]; mood?: string; retake?: string | number }
const DEFAULT_MUSIC = { rise: 'l08', resolve: 'l11', swell_from: 'l15', swell_to: 'l16' };
/** film.json `engine` -> the `extra` query string for capture.open ("&bloom=1.2&dof=0"); undefined when the field is absent (engine defaults) */
export function engineExtra(film: Film): string | undefined {
  const e = film.engine;
  if (!e || typeof e !== 'object' || Array.isArray(e)) return undefined;
  const parts = Object.entries(e).filter(([k, v]) => /^[a-z][a-z0-9_]*$/i.test(k) && !['w', 'h', 'film', 'score'].includes(k) && (typeof v === 'number' ? Number.isFinite(v) : typeof v === 'string' && v !== ''))
    .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? parts.join('') : undefined;
}
export interface ScoreWord { w: string; t0: number; t1: number }
export interface ScoreLine { id: string; text: string; t0: number; t1: number; words: ScoreWord[] }
export interface Score { fps: number; width: number; height: number; duration: number; lines: ScoreLine[] }
/** placement of each narration clip on the timeline (real builds) */
interface Placed { id: string; clip: string; at: number; dur: number }

/** capture.ts contract (other engineer; same shapes as packages/kids3d/src/capture.ts) */
export interface Session { page: any; browser: any; close: () => Promise<void>; info: { frames: number; fps: number; width: number; height: number; duration: number; gl: string; cues: Cue[] } }
export interface CaptureMod {
  open(epDir: string, scorePath: string, opts?: { width?: number; height?: number; sub?: number; film?: string; extra?: string }): Promise<Session>;
  renderVideo(s: Session, outMp4: string, onProgress?: (f: number) => void): Promise<{ frames: number; seconds: number; msPerFrame: number }>;
  /** frames [f0, f1) -> one segment mp4 (long-form) */
  renderRange(s: Session, outMp4: string, f0: number, f1: number, onProgress?: (done: number, total: number) => void): Promise<{ frames: number; seconds: number; msPerFrame: number }>;
  stills(s: Session, times: number[], dir: string, width?: number): Promise<string[]>;
}
export const captureExists = () => fs.existsSync(CAPTURE);
export async function capture(): Promise<CaptureMod> {
  if (!captureExists()) throw new Error(`${CAPTURE} missing (3D capture not delivered yet): use --no-3d`);
  return await import(pathToFileURL(CAPTURE).href) as CaptureMod;
}

export const norm = (w: string) => String(w).toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'%-]/g, '').replace(/^[-']+|[-']+$/g, '');
export const accentKey = (w: string) => w.toUpperCase().replace(/[^A-Z0-9']/g, '');
const dbLin = (d: number) => Math.pow(10, d / 20);

export function loadFilm(id: string) {
  const dir = production(id), f = path.join(dir, 'film.json');
  if (!fs.existsSync(f)) throw new Error(`${f} missing (test-3d film: docs/brands/test-3d/build.md)`);
  const film = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '')) as Film;
  if (film.long) {   // long-form: chapters -> film.lines (flattened; line ids unique across the film)
    if (film.lines?.length) throw new Error('film.json: a long film has chapters[].lines, not top-level lines');
    if (!Array.isArray(film.chapters) || film.chapters.length < 1) throw new Error('film.json: long needs chapters [{id, title, lines:[{id,text}], mood?, retake?}]');
    const cids = new Set<string>(), moods = ['calm', 'curious', 'tension', 'rise', 'drop', 'warm'];
    for (const c of film.chapters) {
      if (!/^[a-z][a-z0-9_]*$/i.test(c.id ?? '')) throw new Error(`film.json: chapter id "${c.id}" must be [a-z][a-z0-9_]*`);
      if (cids.has(c.id)) throw new Error(`film.json: duplicate chapter id ${c.id}`); cids.add(c.id);
      if (!c.title?.trim()) throw new Error(`film.json: chapter ${c.id} needs a title (chapters.txt)`);
      if (!c.lines?.length) throw new Error(`film.json: chapter ${c.id} has no lines`);
      if (c.mood != null && !moods.includes(c.mood)) throw new Error(`film.json: chapter ${c.id} mood "${c.mood}" unknown (have: ${moods.join(', ')})`);
    }
    if (film.chapter_gap != null && !(film.chapter_gap >= 0.6 && film.chapter_gap <= 3)) throw new Error('film.json: chapter_gap must be 0.6-3 s');
    film.lines = film.chapters.flatMap(c => c.lines);
  }
  if (!film.lines?.length) throw new Error('film.json: lines is empty');
  if (!film.voice) throw new Error('film.json: voice is required');
  if (!film.hook_text?.trim()) throw new Error('film.json: hook_text is required');
  const ids = new Set<string>();
  for (const l of film.lines) {
    if (film.long) {   // long-form: free-form ids (l11a, l45a, intro-2 ...): any non-empty string without surrounding spaces
      if (typeof l.id !== 'string' || !l.id.trim() || l.id !== l.id.trim()) throw new Error(`film.json: line id ${JSON.stringify(l.id)} must be a non-empty string without leading/trailing spaces`);
      if (l.pause_after != null && !(typeof l.pause_after === 'number' && l.pause_after >= 0 && l.pause_after <= 10)) throw new Error(`film.json: line ${l.id} pause_after must be a number of seconds, 0-10`);
    } else {
      if (!/^[a-z][a-z0-9_]*$/i.test(l.id)) throw new Error(`film.json: line id "${l.id}" must be [a-z][a-z0-9_]*`);
      if (l.pause_after != null) throw new Error(`film.json: line ${l.id} pause_after is a long-form field ("long": true)`);
    }
    if (ids.has(l.id)) throw new Error(`film.json: duplicate line id ${l.id}`); ids.add(l.id);
    if (/\d/.test(l.text)) throw new Error(`film.json: line ${l.id} has digits; spell numbers out for TTS ("${l.text}")`);
  }
  if (film.key_words != null && (!Array.isArray(film.key_words) || film.key_words.some(w => typeof w !== 'string' || !norm(w)))) throw new Error('film.json: key_words must be an array of non-empty words');
  if (film.music != null) {
    const m = film.music as Record<string, unknown>;
    for (const k of ['rise', 'resolve', 'swell_from', 'swell_to']) {
      if (typeof m[k] !== 'string') throw new Error(`film.json: music.${k} is required (a line id) when music is given`);
      if (!ids.has(m[k] as string)) throw new Error(`film.json: music.${k} = "${m[k]}" is not a line id (have: ${[...ids].join(', ')})`);
    }
  }
  const hits = aiTextHits([film.title, film.hook_text, film.end_text ?? '', ...(film.chapters ?? []).map(c => c.title), ...film.lines.map(l => l.text)].join('\n'), { brand: BRAND });
  if (hits.length) throw new Error(`film.json: AI-generation wording is not allowed on screen or in narration: ${hits.map(h => `"${h.phrase}"`).join(', ')}`);
  return { film, dir };
}
export const fmt = (film: Film) => ({ W: film.format?.width ?? (film.long ? 1920 : 1080), H: film.format?.height ?? (film.long ? 1080 : 1920), fps: film.format?.fps ?? 30 });

/* ------------------------------------------------------------------ timing */
/** --draft: 2.7 words/s, +0.25 s after each sentence end (and between lines). */
export function estimateScore(film: Film): Score {
  const { W, H, fps } = fmt(film), per = 1 / 2.7;
  let t = 0.15; const lines: ScoreLine[] = [];
  for (const l of film.lines) {
    const words = l.text.trim().split(/\s+/).map(w => { const r = { w, t0: +t.toFixed(3), t1: +(t + per * 0.86).toFixed(3) }; t += per + (/[.!?]["']?$/.test(w) ? 0.25 : 0); return r; });
    lines.push({ id: l.id, text: l.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
  }
  return { fps, width: W, height: H, duration: snapUp(lines[lines.length - 1].t1 + 1.4, fps), lines };
}
export const snapUp = (t: number, fps: number) => +(Math.ceil(t * fps - 1e-6) / fps).toFixed(4);

/** words of the first ~3 s of the take vs the script opening and the style text (Gemini fallback models sometimes read the director's notes aloud) */
export function preambleCheck(asrText: string, film: Film, firstStart: number, lines: FilmLine[] = film.lines) {
  const asr = asrText.split(/[\s–—-]+/).map(norm).filter(Boolean);   // hyphens split: "sixty-four" is heard as "sixty four"
  const script = lines.flatMap(l => l.text.split(/[\s–—-]+/)).map(norm).filter(Boolean);
  const scriptSet = new Set(script);
  const styleWords = new Set([...(film.style ?? '').split(/\s+/).map(norm), 'audio', 'profile', 'narrator', 'director', "director's", 'directors', 'notes', 'transcript'].filter(w => w.length > 3 && !scriptSet.has(w)));
  const head = asr.slice(0, 9);   // ~3 s at 2.7 words/s
  const firstMatch = head.findIndex((w, i) => w === script[0] && asr[i + 1] === script[1]);
  const styleHits = head.filter(w => styleWords.has(w));
  const problems: string[] = [];
  if (firstMatch !== 0) problems.push(`take does not open with the script ("${head.slice(0, 6).join(' ')}" vs "${script.slice(0, 6).join(' ')}")`);
  if (styleHits.length) problems.push(`style/preamble words in the first 3 s: ${styleHits.join(', ')}`);
  if (firstStart > 1.5) problems.push(`first script word starts at ${firstStart.toFixed(2)} s of the take (something is spoken before it)`);
  return { ok: !problems.length, head: head.join(' '), problems };
}

/* ------------------------------------------------------------------ pace */
export const PACE_CAP = 1.12;
const XF = 0.008;
export interface PaceResult { file: string; max_pause: number; tempo: number; removed_s: number; cuts: number; cached: boolean }
/** silences longer than max_pause are cut down to max_pause (middle of the silence dropped, 8 ms crossfades), then atempo; cached by hash of take + settings */
export async function paceTake(raw: string, maxPause: number, tempo: number): Promise<PaceResult> {
  const hash = crypto.createHash('sha1').update(fs.readFileSync(raw)).update(`|${maxPause}|${tempo}|v1`).digest('hex').slice(0, 12);
  const out = path.join(path.dirname(raw), `paced-${hash}.wav`), meta = out + '.json';
  if (fs.existsSync(out) && fs.existsSync(meta)) return { ...JSON.parse(fs.readFileSync(meta, 'utf8')), file: out, cached: true };
  const sd = await run('ffmpeg', ['-hide_banner', '-i', raw, '-af', `silencedetect=n=-38dB:d=${(maxPause + 0.02).toFixed(3)}`, '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const sil: [number, number][] = []; let st = -1;
  for (const m of String(sd.stderr).matchAll(/silence_(start|end): (-?[\d.]+)/g)) { if (m[1] === 'start') st = Math.max(0, +m[2]); else if (st >= 0) { sil.push([st, +m[2]]); st = -1; } }
  const rate = 24000, pcm = (await run('ffmpeg', ['-v', 'error', '-i', raw, '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-'], { encoding: 'buffer', maxBuffer: 1 << 29 })).stdout as unknown as Buffer;
  const x = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength - (pcm.byteLength % 4))), nx = x.length;
  const xf = Math.round(XF * rate), parts: Float32Array[] = []; let pos = 0, removed = 0, cuts = 0;
  for (const [a0, a1] of sil) {
    if (a1 - a0 <= maxPause + 0.02) continue;
    const c0 = Math.round((a0 + maxPause / 2) * rate), c1 = Math.round((a1 - maxPause / 2) * rate);   // middle of the silence is dropped
    if (c1 - c0 <= xf * 2 || c0 < pos + xf || c1 > nx) continue;
    parts.push(x.subarray(pos, c0 + xf));   // xf extra samples overlap the head of the next part (still silence)
    pos = c1; removed += (c1 - c0 - xf) / rate; cuts++;
  }
  parts.push(x.subarray(pos));
  const total = parts.reduce((n, p, i) => n + p.length - (i ? xf : 0), 0), y = new Float32Array(total); let w = 0;
  parts.forEach((p, i) => {
    if (!i) { y.set(p, 0); w = p.length; return; }
    for (let k = 0; k < xf; k++) { const g = (k + 0.5) / xf; y[w - xf + k] = y[w - xf + k] * (1 - g) + p[k] * g; }
    y.set(p.subarray(xf), w); w += p.length - xf;
  });
  const tmpRaw = out + '.f32', tmpWav = out + '.pre.wav';
  fs.writeFileSync(tmpRaw, Buffer.from(y.buffer, y.byteOffset, y.byteLength));
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', tmpRaw, tmpWav]);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', tmpWav, ...(Math.abs(tempo - 1) > 1e-3 ? ['-af', `atempo=${tempo.toFixed(4)}`] : []), '-ar', String(rate), out]);
  fs.rmSync(tmpRaw, { force: true }); fs.rmSync(tmpWav, { force: true });
  const r = { max_pause: maxPause, tempo, removed_s: +removed.toFixed(3), cuts };
  fs.writeFileSync(meta, JSON.stringify(r), 'utf8');
  return { ...r, file: out, cached: false };
}
async function alignTake(file: string, film: Film, nd: string, agent: string) {
  const lj = path.join(nd, 'lines.json'), aj = path.join(nd, 'align.json');
  fs.writeFileSync(lj, JSON.stringify(film.lines.map(l => ({ id: l.id, text: l.text }))), 'utf8');
  await withLock('gpu', agent, () => run(PY, ['-I', path.join(PYDIR, 'align.py'), file, lj, aj], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  return JSON.parse(fs.readFileSync(aj, 'utf8'));
}
export const wpsOf = (al: any) => { const ws = (al.lines as any[]).flatMap(l => l.words); return ws.length / (ws[ws.length - 1].e - ws[0].s); };

/** ONE TTS take of all lines -> align -> ASR gate -> per-line clips laid end to end (natural pause kept, clamped 0.3-0.75 s). */
async function narrate(film: Film, dir: string, vdir: string, id: string, agent: string, note: (m: string, l?: any) => void) {
  const { W, H, fps } = fmt(film);
  const tts = await synthesize(film.lines.map(l => l.text.trim()).join('\n\n'), film.voice, film.style, { productionId: id, retake: film.retake });
  note(tts.cached ? `Narration reused from cache (${film.voice})` : `Narration generated (${tts.model}, ${film.voice})`);
  const nd = path.join(vdir, 'narration'); fs.mkdirSync(nd, { recursive: true }); fs.mkdirSync(path.join(dir, 'voice'), { recursive: true });
  const rawTake = path.join(dir, 'voice', path.basename(tts.file)); if (!fs.existsSync(rawTake)) fs.copyFileSync(tts.file, rawTake);
  let raw = rawTake, al: any, pace: (PaceResult & { raw_wps: number; final_wps: number; auto_raised: boolean }) | null = null;
  const pc = film.pace;
  if (pc) {
    let tempo = pc.tempo, p = await paceTake(rawTake, pc.max_pause, tempo);
    note(`Pace: ${p.cuts} silences cut to ${pc.max_pause} s (${p.removed_s.toFixed(2)} s removed), tempo ${tempo}${p.cached ? ' (cached)' : ''}`);
    al = await alignTake(p.file, film, nd, agent);
    let wps = wpsOf(al), raised = false;
    if (wps < pc.target_wps * 0.92 && tempo < PACE_CAP) {
      const want = Math.min(PACE_CAP, +(tempo * pc.target_wps / wps).toFixed(3));
      if (want > tempo + 0.005) {
        note(`Pace ${wps.toFixed(2)} words/s is more than 8 % below target ${pc.target_wps}: tempo ${tempo} -> ${want} (cap ${PACE_CAP})`, 'warn');
        tempo = want; raised = true; p = await paceTake(rawTake, pc.max_pause, tempo); al = await alignTake(p.file, film, nd, agent); wps = wpsOf(al);
      }
    }
    const wsAll = (al.lines as any[]).flatMap(l => l.words), spokenPaced = wsAll[wsAll.length - 1].e - wsAll[0].s;
    pace = { ...p, tempo, raw_wps: +(wsAll.length / (spokenPaced * tempo + p.removed_s)).toFixed(2), final_wps: +wps.toFixed(2), auto_raised: raised };
    note(`Pace result: ${pace.raw_wps} -> ${pace.final_wps} words/s (target ${pc.target_wps}), tempo ${tempo}${raised ? ' (auto-raised)' : ''}, ${p.removed_s.toFixed(2)} s of pauses removed`);
    raw = p.file;
  } else al = await alignTake(rawTake, film, nd, agent);
  const pre = preambleCheck(String(al.asr_text), film, al.lines[0]?.start ?? 0);
  const take = { file: raw, raw_file: rawTake, pace, cached: tts.cached, model: tts.model, duration: al.duration as number, wer: al.wer as number, asr_text: String(al.asr_text), preamble: pre,
    spans: (al.lines as any[]).map(a => [a.start, a.end] as [number, number]) };
  fs.writeFileSync(path.join(nd, 'asr.json'), JSON.stringify(take, null, 1), 'utf8');
  note(`ASR: WER ${(al.wer * 100).toFixed(1)} %, opening "${pre.head}"`);
  if (al.wer > MAX_WER) throw new Error(`Narration WER ${(al.wer * 100).toFixed(1)} % > ${MAX_WER * 100} %: the take misreads the script (ASR "${String(al.asr_text).slice(0, 160)}..."). Re-roll the take (new cache key) or simplify the line; details ${path.join(nd, 'asr.json')}`);
  if (!pre.ok) throw new Error(`Narration opening failed the preamble check: ${pre.problems.join('; ')}. Re-roll the take; details ${path.join(nd, 'asr.json')}`);
  const placed: Placed[] = [], lines: ScoreLine[] = [];
  let prevEnd = 0;
  for (const [i, l] of film.lines.entries()) {
    const a = al.lines[i], s0 = Math.max(0, a.start - 0.04), s1 = Math.min(al.duration, a.end + 0.12);
    const clip = path.join(nd, `${l.id}.wav`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', raw, '-af', 'afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', clip]);
    const nat = i ? a.start - al.lines[i - 1].end : 0;
    const first = i === 0 ? 0.15 : prevEnd + Math.max(0.3, Math.min(0.75, nat));   // timeline time of this line's first word
    const at = Math.round((first - (a.start - s0)) * fps) / fps, off = at - s0;   // frame-snapped clip start; take time -> timeline time
    const words = a.words.map((w: any) => ({ w: w.w, t0: +(w.s + off).toFixed(3), t1: +(w.e + off).toFixed(3) }));
    placed.push({ id: l.id, clip, at, dur: s1 - s0 });
    lines.push({ id: l.id, text: l.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
    prevEnd = words[words.length - 1].t1;
  }
  const score: Score = { fps, width: W, height: H, duration: snapUp(prevEnd + 1.4, fps), lines };
  return { score, placed, take };
}

/* ------------------------------------------------------------------ captions */
const NUMBER_WORDS = new Set('one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred hundreds thousand million billion first second third half percent'.split(' '));
const KEY_NOUNS = new Set(['grain', 'grains', 'king', 'kings', 'board', 'doubling', 'doubles', 'rich', 'square', 'squares', 'break', 'legend', 'rice', 'year', 'years', 'money', 'debt', 'stocks', 'smarter']);
/** film.json key_words -> lookup set (same normalisation as isKey); undefined = built-in KEY_NOUNS */
export const keySet = (film: Film): Set<string> | undefined => film.key_words ? new Set(film.key_words.map(w => norm(w).replace(/'s$/, ''))) : undefined;
export function isKey(w: string, keyWords?: Set<string>) {
  const k = norm(w).replace(/'s$/, '');
  if (/\d/.test(k)) return true;
  if (k.split('-').every(p => NUMBER_WORDS.has(p))) return true;
  return (keyWords ?? KEY_NOUNS).has(k);
}
/** Arial Black advance widths (em) for caption text: a character count is not enough (W/M vs I) to keep pages clear of the right rail */
const ADV: Record<string, number> = { A: .778, B: .778, C: .778, D: .778, E: .722, F: .667, G: .833, H: .833, I: .389, J: .667, K: .833, L: .667, M: .944, N: .833, O: .833, P: .722, Q: .833, R: .778, S: .722, T: .722, U: .833, V: .778, W: 1, X: .778, Y: .778, Z: .722, ' ': .333, "'": .278, '-': .333, '%': 1 };
export const textEm = (t: string) => [...t.toUpperCase()].reduce((a, c) => a + (ADV[c] ?? (/\d/.test(c) ? .667 : .75)), 0);
export interface CapPage { text: string; t0: number; t1: number; words: string[]; keys: string[] }
/** 1-3 word groups following the spoken words: break after punctuation, on a pause > 0.35 s, or past maxEm (Arial Black em width); each page stays up
 *  until the next one starts (>= 0.4 s when the gap allows, else to the next page), the last one 0.3 s past its word. */
export function groupCaptions(words: ScoreWord[], maxEm = 8.6, keyWords?: Set<string>): CapPage[] {
  const groups: ScoreWord[][] = []; let cur: ScoreWord[] = [];
  const clean = (w: string) => w.replace(/[.,;:!?"“”]+$/g, '').replace(/^["“”]+/, '');
  for (const w of words) {
    const len = textEm([...cur, w].map(x => clean(x.w)).join(' '));
    if (cur.length && (cur.length >= 3 || len > maxEm || w.t0 - cur[cur.length - 1].t1 > 0.35)) { groups.push(cur); cur = []; }
    cur.push(w);
    if (/[.,;:!?]["']?$/.test(w.w)) { groups.push(cur); cur = []; }
  }
  if (cur.length) groups.push(cur);
  const pages = groups.map(g => { const ws = g.map(x => clean(x.w).toUpperCase()); return { text: ws.join(' '), t0: g[0].t0, t1: g[g.length - 1].t1, words: ws, keys: ws.filter(w => isKey(w, keyWords)) }; });
  for (let i = 0; i < pages.length; i++) {
    const nx = pages[i + 1];
    pages[i].t1 = nx ? Math.min(nx.t0, Math.max(pages[i].t1 + 0.12, pages[i].t0 + 0.4)) : pages[i].t1 + 0.3;
  }
  return pages;
}
/** split a long page into two balanced lines (the renderer only wraps at the full 1728 px design width = into the right rail) */
export function twoLines(text: string, maxEm: number) {
  if (textEm(text) <= maxEm || !text.includes(' ')) return text;
  const ws = text.split(' '); let best = text, bd = 1e9;
  for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '), d = Math.max(textEm(a), textEm(b)); if (d < bd) { bd = d; best = `${a}\n${b}`; } }
  return best;
}
/** hook words as caption tokens: digits and their spelled forms are the same word */
export function hookTokens(hook: string) {
  const digit: Record<string, string> = { '1': 'ONE', '2': 'TWO', '3': 'THREE', '4': 'FOUR', '64': 'SIXTY-FOUR' };
  return new Set(hook.split(/\s+/).map(w => accentKey(w)).flatMap(w => [w, accentKey(digit[w] ?? w)]).filter(w => w.length && !['VS', 'A', 'THE', 'OF'].includes(w)));
}

/** sizes are in the renderer's 1920-wide design box (x0.5625 on a 1080 canvas): 150 = 84 px glyphs; maxEm 8.6 at 150 = 67 % width, centred = clear of the 15 % right rail */
export const OUTLINE = [[6, 0], [-6, 0], [0, 6], [0, -6], [4, 4], [-4, 4], [4, -4], [-4, -4]].map(([x, y]) => `${x}px ${y}px 0 #000`).join(', ');
const CAP = { font: 'Arial Black', size: 150, y: 16, maxEm: 8.6, shadow: `${OUTLINE}, 0 9px 0 #000, 0 12px 28px rgba(0,0,0,0.9)` };
const HOOK = { size: 176, maxSize: 250, fitPx: 1340, y: -22, dur: 2.2, maxEm: 7 };   // y -22 = centred 28 % from the top (docs/hook-playbook.md H3: 28-38 %); two lines cover about 18-38 % of the height
/** hook scale-in as per-frame text cards (the renderer paints a text item as ONE static card: text scale/opacity keyframes are not animated) */
export const HOOK_IN = [0.9, 0.97, 1.04, 1.07, 1.05, 1.02, 1.0];   // >= 0.62: text-safety too_small counts even one-frame cards
export const HOOK_OUT = [0.66, 0.33];
const END = { size: 140, y: -30, maxEm: 7.5, fitEm: 8.85, minK: 0.76 };   // fitEm: widest line that stays clear of the right rail at the 1.06 scale-in peak; longer end texts are set smaller
export const END_IN = [0.8, 0.9, 1.0, 1.06, 1.03];   // stepped scale-in (same trick as the hook), then hold at 1.0

/* ------------------------------------------------------------------ helpers */
export async function stillsAt(video: string, times: number[], outDir: string, width = 360) {
  fs.mkdirSync(outDir, { recursive: true });
  const files: string[] = [];
  for (const t of times) {
    const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', video, '-frames:v', '1', '-vf', `scale=${width}:-2`, '-q:v', '3', f]);
    files.push(f);
  }
  return files;
}
export async function placeholder(out: string, D: number, W: number, H: number, fps: number) {
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `gradients=s=${W}x${H}:r=${fps}:d=${D.toFixed(3)}:c0=0x0b0e14:c1=0x1b2433:n=2:speed=0.004:type=radial`, '-vf', 'noise=alls=5:allf=t,vignette=PI/4', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  return out;
}
export async function lufs(file: string) {
  const r = await run('ffmpeg', ['-hide_banner', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const s = String(r.stderr), sum = s.slice(s.lastIndexOf('Summary:'));
  return { i: parseFloat(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1] ?? 'NaN'), tp: parseFloat(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1] ?? 'NaN') };
}
/** --no-3d: a small cue list that exercises every SFX against the script (stands in for info.cues) */
function testCues(score: Score, mu = DEFAULT_MUSIC): Cue[] {
  const L = (id: string) => score.lines.find(l => l.id === id), W = (id: string, w: string) => L(id)?.words.find(x => norm(x.w) === w);
  const c: Cue[] = [];
  const push = (name: string, t: number | undefined, db: number, dur?: number) => { if (t != null && t >= 0 && t < score.duration) c.push({ name, t: +t.toFixed(3), db, ...(dur ? { dur: +dur.toFixed(3) } : {}) }); };
  push('whoosh', 0.02, -16);
  push('thud', W('l01', 'king')?.t1, -10);
  for (const w of ['one', 'two', 'four']) { const x = W('l03', w); if (x) for (let k = 0; k < (w === 'one' ? 1 : w === 'two' ? 2 : 4); k++) push('tick', x.t0 + k * 0.09, -14); }
  if (L('l05')) push('pour', L('l05')!.t0, -20, 1.6);
  if (L('l07')) push('pour', L('l07')!.t0, -20, 2.4);
  if (L(mu.rise) && L(mu.resolve)) push('riser', L(mu.rise)!.t0, -18, L(mu.resolve)!.t0 - L(mu.rise)!.t0);
  if (L(mu.resolve)) push('hit', L(mu.resolve)!.t0 - 0.02, -8);
  const last = score.lines[score.lines.length - 1];
  push('ding', last.t1 + 0.25, -16);
  return c;
}
/** music marks from the script (film.music line ids; default l08 rise, l11 resolve, l15-l16 swell); falls back to proportions when the ids are missing */
function marks(score: Score, mu = DEFAULT_MUSIC) {
  const L = (id: string) => score.lines.find(l => l.id === id), D = score.duration;
  return { riseStart: L(mu.rise)?.t0 ?? D * 0.35, resolve: L(mu.resolve)?.t0 ?? D * 0.5, calm: L(mu.resolve)?.t1 ?? D * 0.53, swell0: L(mu.swell_from)?.t0 ?? D * 0.8, swell1: L(mu.swell_to)?.t1 ?? D * 0.95 };
}

/* ------------------------------------------------------------------ build */
export interface BuildOptions { agent?: string; draft?: boolean; no3d?: boolean; sub?: number; snap?: number[]; reason?: string | null;
  /** long-form only: re-render these chapters' picture segments, reuse the others from the previous version (checked) */ chapters?: string[];
  /** long-form only: reuse every still-valid segment of the previous version (crash recovery) */ resume?: boolean }

export async function buildTest3d(id: string, opts: BuildOptions = {}) {
  const agent = opts.agent ?? 'render', t00 = Date.now(), log: string[] = [];
  const { film, dir } = loadFilm(id);
  if (film.long) return (await import('./long.ts')).buildLong(id, film, dir, opts);
  if (opts.chapters?.length || opts.resume) throw new Error('--chapters / --resume are long-form options (film.json "long": true)');
  const { W, H, fps } = fmt(film);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any;   // null = files only
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[test3d] ${m}`); if (prod) try { emit({ kind: 'build.step', agent, productionId: id, level, message: m }); } catch { /* events busy */ } };

  /* draft: estimated timing, no TTS, no version */
  if (opts.draft) {
    const vdir = path.join(dir, 'draft'); fs.mkdirSync(vdir, { recursive: true });
    const score = estimateScore(film), scoreFile = path.join(vdir, 'score.json');
    fs.writeFileSync(scoreFile, JSON.stringify(score, null, 1), 'utf8');
    note(`Draft score: ${score.duration.toFixed(2)} s, ${score.lines.length} lines, ${score.lines.reduce((n, l) => n + l.words.length, 0)} words (estimated 2.7 words/s)`);
    let stills: string[] = [];
    if (captureExists() && fs.existsSync(path.join(dir, 'film.js'))) {
      const times = opts.snap?.length ? opts.snap : Array.from({ length: 12 }, (_, i) => +((i + 0.5) * score.duration / 12).toFixed(2));
      const cap = await capture();
      stills = await withLock('render', agent, async () => { const s = await cap.open(dir, scoreFile, { width: W, height: H, sub: opts.sub ?? 1, extra: engineExtra(film) }); try { return await cap.stills(s, times, path.join(vdir, 'stills'), 540); } finally { await s.close(); } });
      note(`${stills.length} 3D stills -> ${path.join(vdir, 'stills')}`);
    } else note(`No 3D stills: ${captureExists() ? 'film.js' : 'packages/test3d/src/capture.ts'} not there yet`, 'warn');
    return { production_id: id, draft: true, duration: score.duration, score: scoreFile, stills, log };
  }

  /* version folder */
  const vmax = Math.max(0, ...fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)));
  const n = Math.max(vmax, Number(prod?.version ?? 0)) + 1, vdir = path.join(dir, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  note(`test-3d build v${n} started (${film.lines.length} lines${opts.no3d ? ', placeholder picture' : ''})${prod ? '' : ' (no DB row: files only)'}`);
  if (opts.reason) fs.writeFileSync(path.join(vdir, 'build-reason.json'), JSON.stringify({ version: n, command: 'test3d build', reason: opts.reason, rebuild: n >= 2, agent, at: new Date().toISOString() }, null, 2) + '\n', 'utf8');
  else if (n >= 2) note(`v${n} is a rebuild without --reason`, 'warn');
  if (prod) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  /* 1. narration + score */
  const { score, placed, take } = await narrate(film, dir, vdir, id, agent, note);
  const scoreFile = path.join(vdir, 'score.json');
  fs.writeFileSync(scoreFile, JSON.stringify(score, null, 1), 'utf8');
  const D = score.duration, NF = Math.round(D * fps), F = (t: number) => Math.max(0, Math.round(t * fps));
  const nWords = score.lines.reduce((k, l) => k + l.words.length, 0), spoken = score.lines[score.lines.length - 1].t1 - score.lines[0].t0;
  note(`Score: ${D.toFixed(2)} s; narration ${spoken.toFixed(2)} s, ${nWords} words = ${(nWords / spoken).toFixed(2)} words/s; first word at ${score.lines[0].t0.toFixed(2)} s`);

  /* 2. picture */
  const pic = path.join(vdir, 'picture.mp4');
  let cues: Cue[] = [], pictureInfo: any = null;
  if (opts.no3d) {
    await placeholder(pic, D, W, H, fps);
    cues = testCues(score, film.music ?? DEFAULT_MUSIC);
    note(`Placeholder picture (--no-3d) + ${cues.length} test SFX cues`);
  } else {
    const cap = await capture();
    await withLock('render', agent, async () => {
      const s = await cap.open(dir, scoreFile, { width: W, height: H, sub: opts.sub, extra: engineExtra(film) });
      try {
        pictureInfo = { ...s.info, cues: undefined };
        note(`3D page ready (${s.info.gl}; ${s.info.frames} frames, ${s.info.cues?.length ?? 0} sfx cues)`);
        if (!/NVIDIA|AMD|Intel/i.test(String(s.info.gl))) note(`WebGL renderer "${s.info.gl}" looks like software rendering`, 'warn');
        cues = s.info.cues ?? [];
        if (opts.snap?.length) await cap.stills(s, opts.snap, path.join(vdir, 'stills'), 540);
        const rv = await cap.renderVideo(s, pic, f => { if (prod) try { emit({ kind: 'render.progress', agent, productionId: id, message: `3D render ${Math.round(f * 100)}%` }); } catch { /* busy */ } });
        note(`3D rendered: ${rv.frames} frames in ${rv.seconds.toFixed(0)} s (${rv.msPerFrame.toFixed(1)} ms/frame)`);
        pictureInfo.render = rv;
      } finally { await s.close(); }
    });
  }
  fs.writeFileSync(path.join(vdir, 'cues.json'), JSON.stringify(cues, null, 1), 'utf8');

  /* 3. captions */
  // the end text stands in for the last line: it shows from that line's first word, so the line gets no caption (same idea as the hook)
  const endOn = !!film.end_text?.trim() && score.lines.length > 1, lastLine = score.lines[score.lines.length - 1];
  // 2026-11-17 (QA on three videos: 6-8 s of speech with no caption): a long last line (> 8 words) says more than the end text shows, so it keeps its captions (66 % band, clear of the end text at 14-26 %)
  const capLast = endOn && lastLine.words.length > 8;
  const pages = groupCaptions((endOn && !capLast ? score.lines.slice(0, -1) : score.lines).flatMap(l => l.words), CAP.maxEm, keySet(film));
  if (endOn && !capLast && pages.length) pages[pages.length - 1].t1 = Math.min(pages[pages.length - 1].t1, lastLine.t0);
  const hk = hookTokens(film.hook_text);
  let hookEnd = HOOK.dur;
  // no caption while the hook shows the same words: a same-word page starting late in the hook window ends the hook early; earlier ones wait for the hook
  const clash = pages.find(p => p.t0 < hookEnd && p.words.some(w => hk.has(accentKey(w))));
  if (clash && clash.t0 >= 1.6) hookEnd = clash.t0;
  const caps = pages.flatMap(p => {
    if (p.t0 < hookEnd && p.words.some(w => hk.has(accentKey(w)))) { if (p.t1 - hookEnd < 0.3) return []; return [{ ...p, t0: hookEnd }]; }
    return [p];
  });
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(caps, null, 1), 'utf8');

  /* 4. audio: SFX lane + music bed */
  const sfxFile = mixSfx(path.join(vdir, 'sfx.wav'), cues, D);
  const mk = marks(score, film.music ?? DEFAULT_MUSIC), music = musicBed(path.join(vdir, 'music.wav'), D, mk);
  const spans: [number, number][] = [];
  for (const l of score.lines) { const a = l.t0 - 0.12, e = l.t1 + 0.2; if (spans.length && a <= spans[spans.length - 1][1] + 0.5) spans[spans.length - 1][1] = e; else spans.push([a, e]); }
  const bedDb = -4, duckDb = -10;   // bed is normalised to -20 dBFS RMS: -24 between lines, -30 under speech (was -25 / -34: QA on two videos could barely hear it)
  duckWav(music, spans, bedDb, duckDb);

  /* 5. timeline */
  const tracks: Track[] = [];
  tracks.push({ name: 'picture', kind: 'video', items: [{ type: 'video', name: opts.no3d ? 'placeholder' : '3d', src: pic, fromFrame: 0, durationInFrames: NF, volume: 0 }] });
  const hd = F(hookEnd), hookAccent = Object.fromEntries(film.hook_text.split(/\s+/).filter(w => isKey(w, keySet(film))).map(w => [accentKey(w), GOLD]));
  // short hooks are set larger (2026-11-17, QA: hook cap 3.3 % of the height read small): the widest line may reach HOOK.fitPx design px (70 % of the width, clear of the right rail) at the 1.07 scale-in peak; never smaller than HOOK.size
  const hookLines = twoLines(film.hook_text, HOOK.maxEm), hookWide = Math.max(...hookLines.split(/\n/).map(textEm));
  const hookSize = Math.round(Math.max(HOOK.size, Math.min(HOOK.maxSize, HOOK.fitPx / (hookWide * Math.max(...HOOK_IN)))));
  const hookItem = (name: string, from: number, dur: number, k: number, op = 1) => ({ type: 'text', name, text: hookLines, fromFrame: from, durationInFrames: dur, transform: { y: HOOK.y, ...(op < 1 ? { opacity: op } : {}) },
    props: { fontFamily: CAP.font, fontSize: Math.round(hookSize * k), fontWeight: 900, color: '#FFFFFF', lineHeight: 1.04, textShadow: CAP.shadow, ...(Object.keys(hookAccent).length ? { accent: hookAccent } : {}) } }) as Item;
  const hookItems: Item[] = HOOK_IN.slice(0, -1).map((k, i) => hookItem(`hook_in${i}`, i, 1, k));
  const holdFrom = HOOK_IN.length - 1, outFrom = hd - HOOK_OUT.length;
  hookItems.push(hookItem('hook', holdFrom, Math.max(1, outFrom - holdFrom), 1));
  HOOK_OUT.forEach((op, i) => hookItems.push(hookItem(`hook_out${i}`, outFrom + i, 1, 1, op)));
  tracks.push({ name: 'hook', kind: 'video', items: hookItems });
  if (film.end_text?.trim()) {
    const et = film.end_text.trim().toUpperCase(), e0 = F(endOn ? lastLine.t0 : lastLine.t1), e1 = NF;
    const endText = twoLines(et, END.maxEm), endFit = Math.min(1, END.fitEm / Math.max(...endText.split(/\n/).map(textEm)));
    const endItem = (name: string, from: number, dur: number, k: number) => ({ type: 'text', name, text: endText, fromFrame: from, durationInFrames: dur, transform: { y: END.y },
      props: { fontFamily: CAP.font, fontSize: Math.round(END.size * Math.max(endFit * k, Math.min(k, END.minK))) /* minK: a fitted text never drops under the text-safety minimum during the scale-in */, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.04, textShadow: CAP.shadow, accent: { SQUARE: GOLD } } }) as Item;
    const ei: Item[] = []; let f = e0;
    for (const k of END_IN) { if (f >= e1 - 1) break; ei.push(endItem(`end_in${f - e0}`, f, 1, k)); f++; }
    if (e1 > f) ei.push(endItem('end', f, e1 - f, 1));
    tracks.push({ name: 'end_text', kind: 'video', items: ei });
  }
  if (caps.length) tracks.push({ name: 'captions', kind: 'video', items: caps.map((p, i) => ({ type: 'text', name: `cap${i}`, text: twoLines(p.text, CAP.maxEm), fromFrame: F(p.t0), durationInFrames: Math.max(1, F(p.t1) - F(p.t0)), transform: { y: CAP.y },
    props: { fontFamily: CAP.font, fontSize: CAP.size, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.05, textShadow: CAP.shadow, ...(p.keys.length ? { accent: Object.fromEntries(p.keys.map(k => [accentKey(k), GOLD])) } : {}) } }) as Item) });
  tracks.push({ name: 'narration', kind: 'audio', items: placed.map(p => ({ type: 'audio', name: p.id, src: p.clip, fromFrame: F(p.at), durationInFrames: Math.max(1, Math.min(Math.round(p.dur * fps), NF - F(p.at))), volume: 1 }) as Item) });
  if (cues.length) tracks.push({ name: 'sfx', kind: 'audio', items: [{ type: 'audio', name: 'sfx', src: sfxFile.file, fromFrame: 0, durationInFrames: NF, volume: 1 }] });
  tracks.push({ name: 'music', kind: 'audio', items: [{ type: 'audio', name: 'music', src: music, fromFrame: 0, durationInFrames: NF, volume: 1 }] });
  const tl: Timeline = { version: 1, width: W, height: H, fps, durationInFrames: NF, background: '#000000', tracks, meta: { builder: 'test3d', brand: BRAND, production: id, version: n } };
  fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(tl, null, 1), 'utf8');

  /* listen-by-numbers: voice vs music vs sfx (RMS dBFS under speech, timeline levels = file levels) */
  const voiceRms = rmsDb(take.file, take.spans);   // the take's spoken spans (line start..end)
  const mix = { voice_rms_db: voiceRms, music_rms_under_speech_db: rmsDb(music, spans), music_rms_between_lines_db: rmsDb(music, gaps(spans, D)), sfx_lufs: cues.length ? (await lufs(sfxFile.file)).i : null, voice_lufs: (await lufs(take.file)).i, music_lufs: (await lufs(music)).i };
  const mixReport = { ...mix, voice_over_music_under_speech_db: mix.voice_rms_db != null && mix.music_rms_under_speech_db != null ? +(mix.voice_rms_db - mix.music_rms_under_speech_db).toFixed(1) : null, voice_over_music_lufs_db: +(mix.voice_lufs - mix.music_lufs).toFixed(1) };
  note(`Mix: voice ${mix.voice_rms_db} dBFS RMS vs music under speech ${mix.music_rms_under_speech_db} (${mixReport.voice_over_music_under_speech_db} dB below the voice), between lines ${mix.music_rms_between_lines_db}`);

  const report: any = { production_id: id, version: n, duration: D, pace: take.pace, narration_s: +spoken.toFixed(2), words: nWords, words_per_s: +(nWords / spoken).toFixed(2), first_word: score.lines[0].t0,
    wer: take.wer, preamble: take.preamble, tts: { cached: take.cached, model: take.model, file: take.file }, picture: opts.no3d ? 'placeholder' : pictureInfo, cues: cues.length, captions: caps.length, hook_end: hookEnd, music_marks: mk, mix: mixReport, reason: opts.reason ?? null };
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
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(vdir, 'qa'), '--expect-duration', D.toFixed(2), '--size', `${W}x${H}`], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  // default stills: the hook + the middle of 3 caption pages with a gold key word (~30 / 55 / 80 % of the video)
  const keyed = caps.filter(p => p.keys.length && p.t1 - p.t0 >= 0.3);
  const snapT = opts.snap?.length ? opts.snap : [1.0, ...[0.3, 0.55, 0.8].map(f => { const p = keyed.reduce((b, q) => Math.abs(q.t0 - D * f) < Math.abs(b.t0 - D * f) ? q : b, keyed[0]); return +((p.t0 + p.t1) / 2).toFixed(2); })];
  const st = await stillsAt(final, snapT, path.join(vdir, 'qa', 'stills'));
  if (prod) {
    db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), id, n);
    if (opts.reason) try { db().prepare(`UPDATE versions SET notes=json_set(CASE WHEN json_valid(notes) THEN notes ELSE json_object('text', notes) END, '$.reason', ?) WHERE production_id=? AND n=?`).run(opts.reason, id, n); } catch { /* no row */ }
    db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(id);
  }
  report.minutes = +((Date.now() - t00) / 60000).toFixed(1);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) in ${report.minutes} min; technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}; ${tq.integrated_lufs} LUFS, ${tq.true_peak_dbfs} dBTP`, tq.pass ? 'success' : 'warn');
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, techqa: tq, log }, null, 1), 'utf8');
  return { ...report, render: final, score: scoreFile, stills: st, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs } };
}
export function gaps(spans: [number, number][], D: number): [number, number][] {
  const out: [number, number][] = []; let t = 0;
  for (const [a, e] of spans) { if (a - t > 0.3) out.push([t + 0.35, a - 0.25]); t = e; }
  if (D - t > 0.6) out.push([t + 0.35, D - 1.2]);
  return out.filter(([a, e]) => e > a);
}

/** Stills of the 3D picture from a version's (or the draft's) score, for frame checks. */
export async function snapTest3d(id: string, times: number[], opts: { version?: string; agent?: string; width?: number; sub?: number; /** long: 4 stills spread over this chapter when no times are given */ chapter?: string } = {}) {
  const { film, dir } = loadFilm(id);
  const { W, H } = fmt(film);
  let vd = opts.version === 'draft' ? 'draft' : opts.version ? `v${opts.version}` : '';
  if (!vd) { const vs = fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)).filter(Boolean); vd = vs.length ? `v${Math.max(...vs)}` : 'draft'; }
  const vdir = path.join(dir, vd), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: run build ${id} --draft first`);
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as Score & { chapters?: { id: string; t0: number; t1: number }[] };
  if (opts.chapter && !times.length) {
    const c = score.chapters?.find(x => x.id === opts.chapter);
    if (!c) throw new Error(`chapter ${opts.chapter} not in ${scoreFile} (have: ${(score.chapters ?? []).map(x => x.id).join(', ') || 'none'})`);
    times = [0.1, 0.37, 0.63, 0.9].map(f => +(c.t0 + f * (c.t1 - c.t0)).toFixed(2));
  }
  const ts = times.length ? times : Array.from({ length: 12 }, (_, i) => +((i + 0.5) * score.duration / 12).toFixed(2));
  const out = path.join(vdir, 'stills');
  if (!captureExists() && fs.existsSync(path.join(vdir, 'picture.mp4'))) return stillsAt(path.join(vdir, 'picture.mp4'), ts, out, opts.width ?? 540);   // no capture module: frames of the rendered picture
  const cap = await capture();
  return withLock('render', opts.agent ?? 'render', async () => {
    const s = await cap.open(dir, scoreFile, { width: W, height: H, sub: opts.sub ?? 1, extra: engineExtra(film) });
    try { return await cap.stills(s, ts, out, opts.width ?? 540); } finally { await s.close(); }
  });
}
