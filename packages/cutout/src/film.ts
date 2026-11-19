/**
 * Karto cutout builder: film.json model, validation, language helpers, draft timing and paths.
 * Contract: docs/brands/karto/CONTRACT.md. Builder docs: docs/brands/karto/build.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { P, production } from '../../shared/src/paths.ts';
import { aiTextHits } from '../../shared/src/ai-text.ts';
import { MOODS, type Mood } from '../../test3d/src/audio.ts';

export const CUTOUT = path.join(P.root, 'packages', 'cutout');
export const WEB_DIR = path.join(CUTOUT, 'web');
export const STUB_DIR = path.join(CUTOUT, 'web-stub');
export const SPEAKERS = ['karto', 'skip'] as const;
export type Who = typeof SPEAKERS[number];
/** transcript labels of the multi-speaker TTS take (Latin in both languages: the model gets the speaker from the label, never speaks it) */
export const LABEL: Record<Who, string> = { karto: 'Karto', skip: 'Skip' };

export interface CutLine { id: string; who: Who; text: string; pause_after?: number }
export interface CutChapter { id: string; title: string; mood?: Mood; retake?: string | number; lines: CutLine[] }
export interface CutShort { id: string; from: string; to: string; hook_text: string; cta: { who: Who; text: string } }
export interface CutFilm {
  schema: 'cutout-film/1'; slug: string; lang: 'en' | 'ar'; title: string;
  format: { width: number; height: number; fps: number };
  cast: Record<Who, { voice: string; style?: string }>;
  hook_text: string; end_text: string; tail?: number; chapter_gap?: number; captions?: boolean;
  strings?: Record<string, string>;
  chapters: CutChapter[];
  shorts?: CutShort[];
  /** optional: "dialogue" (default: one multi-speaker take per chapter group) | "turns" (one single-voice take per speaker turn) */
  tts_mode?: 'dialogue' | 'turns';
  /** optional: narration WER gate per take (default en 0.08 on align.py's exact-token WER, ar 0.15 on the near-spelling WER) */
  max_wer?: number;
  music_seed?: number;
  /** optional film-wide TTS cache salt (chapters[].retake overrides it per chapter) */
  retake?: string | number;
  /** computed: chapters' lines flattened */
  lines: (CutLine & { chapter: string })[];
}

/** digits are allowed only in `strings` (spoken text spells numbers out): ASCII, Arabic-Indic and extended Arabic-Indic digits */
const DIGIT = /[0-9٠-٩۰-۹]/;

export function loadFilm(id: string) {
  const dir = production(id), f = path.join(dir, 'film.json');
  if (!fs.existsSync(f)) throw new Error(`${f} missing (cutout film: docs/brands/karto/build.md; made by make-film-json from the storyboard)`);
  const film = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) as CutFilm;
  validateFilm(film);
  return { film, dir };
}

export function validateFilm(film: CutFilm) {
  const E = (m: string) => { throw new Error(`film.json: ${m}`); };
  if (film.schema !== 'cutout-film/1') E(`schema must be "cutout-film/1" (got ${JSON.stringify(film.schema)})`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(film.slug ?? '')) E(`slug "${film.slug}" must be [a-z0-9-]`);
  if (film.lang !== 'en' && film.lang !== 'ar') E(`lang must be en or ar`);
  if (!film.title?.trim()) E('title is required');
  for (const w of SPEAKERS) if (!film.cast?.[w]?.voice) E(`cast.${w}.voice is required`);
  if (!film.hook_text?.trim()) E('hook_text is required');
  if (film.end_text == null) E('end_text is required ("" for none)');
  if (!Array.isArray(film.chapters) || !film.chapters.length) E('chapters is empty');
  if (film.chapter_gap != null && !(film.chapter_gap >= 0.4 && film.chapter_gap <= 3)) E('chapter_gap must be 0.4-3 s');
  if (film.tail != null && !(film.tail >= 0.5 && film.tail <= 30)) E('tail must be 0.5-30 s');
  if (film.tts_mode != null && !['dialogue', 'turns'].includes(film.tts_mode)) E('tts_mode must be dialogue or turns');
  const cids = new Set<string>(), lids = new Set<string>();
  film.lines = [];
  for (const c of film.chapters) {
    if (!/^[a-z][a-z0-9_]*$/i.test(c.id ?? '')) E(`chapter id "${c.id}" must be [a-z][a-z0-9_]*`);
    if (cids.has(c.id)) E(`duplicate chapter id ${c.id}`); cids.add(c.id);
    if (!c.title?.trim()) E(`chapter ${c.id} needs a title (chapters.txt)`);
    if (c.mood != null && !(MOODS as readonly string[]).includes(c.mood)) E(`chapter ${c.id} mood "${c.mood}" unknown (have: ${MOODS.join(', ')})`);
    if (!c.lines?.length) E(`chapter ${c.id} has no lines`);
    for (const l of c.lines) {
      if (typeof l.id !== 'string' || !l.id.trim() || l.id !== l.id.trim()) E(`line id ${JSON.stringify(l.id)} must be a non-empty string without surrounding spaces`);
      if (lids.has(l.id)) E(`duplicate line id ${l.id}`); lids.add(l.id);
      if (!(SPEAKERS as readonly string[]).includes(l.who)) E(`line ${l.id} who "${l.who}" must be one of ${SPEAKERS.join(', ')}`);
      if (!l.text?.trim()) E(`line ${l.id} has no text`);
      if (DIGIT.test(l.text)) E(`line ${l.id} has digits; spoken text spells numbers out (digits only in strings): "${l.text}"`);
      if (l.pause_after != null && !(typeof l.pause_after === 'number' && l.pause_after >= 0 && l.pause_after <= 10)) E(`line ${l.id} pause_after must be 0-10 s`);
      film.lines.push({ ...l, chapter: c.id });
    }
  }
  // hook_text, end_text, chapter titles and Short hook texts are drawn on screen by the page (never spoken): digits are allowed there (2026-11-18)
  const order = new Map(film.lines.map((l, i) => [l.id, i]));
  const sids = new Set<string>();
  for (const s of film.shorts ?? []) {
    if (!/^[a-z0-9_-]+$/i.test(s.id ?? '')) E(`short id "${s.id}" must be [a-z0-9_-]`);
    if (sids.has(s.id)) E(`duplicate short id ${s.id}`); sids.add(s.id);
    if (!order.has(s.from) || !order.has(s.to)) E(`short ${s.id}: from/to must be line ids (${s.from}, ${s.to})`);
    if (order.get(s.from)! > order.get(s.to)!) E(`short ${s.id}: from ${s.from} comes after to ${s.to}`);
    if (!s.hook_text?.trim()) E(`short ${s.id} needs hook_text`);
    if (!(SPEAKERS as readonly string[]).includes(s.cta?.who) || !s.cta?.text?.trim()) E(`short ${s.id} needs cta {who: karto|skip, text}`);
    if (DIGIT.test(s.cta.text)) E(`short ${s.id}: digits in the spoken cta text (spell them out)`);
  }
  const all = [film.title, film.hook_text, film.end_text, ...film.chapters.map(c => c.title), ...film.lines.map(l => l.text), ...Object.values(film.strings ?? {}),
    ...(film.shorts ?? []).flatMap(s => [s.hook_text, s.cta.text])].join('\n');
  const hits = aiTextHits(all, { brand: brandOf(film) });
  if (hits.length) E(`AI-generation wording is not allowed anywhere: ${hits.map(h => `"${h.phrase}"`).join(', ')}`);
  return film;
}

export const brandOf = (film: Pick<CutFilm, 'lang'>) => `karto-${film.lang}`;
export const fmt = (film: CutFilm) => ({ W: film.format?.width ?? 1920, H: film.format?.height ?? 1080, fps: film.format?.fps ?? 30 });
export const chapterGap = (film: CutFilm) => film.chapter_gap ?? 1.0;
export const tailOf = (film: CutFilm) => film.tail ?? 2.0;
export const pauseAfter = (l: { pause_after?: number }) => Math.max(0, Number(l.pause_after ?? 0) || 0);
export const maxWer = (film: CutFilm) => film.max_wer ?? (film.lang === 'ar' ? 0.15 : 0.08);
export const fileId = (id: string) => id.replace(/[^A-Za-z0-9_.-]+/g, '_');
export const snapUp = (t: number, fps: number) => +(Math.ceil(t * fps - 1e-6) / fps).toFixed(4);
export const snap = (t: number, fps: number) => Math.round(t * fps) / fps;
export function moodOf(film: CutFilm, i: number): Mood {
  const c = film.chapters[i];
  if (c.mood) return c.mood;
  const n = film.chapters.length;
  return i === 0 ? 'curious' : i === n - 1 ? 'warm' : i % 2 ? 'calm' : 'curious';
}

/* ------------------------------------------------------------------ language */
const AR_DIAC = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
/** comparison token: lower case, letters/digits only; Arabic without tashkeel/tatweel, alef/ya/ta-marbuta/hamza seats unified (= align.py --lang ar) */
export function normTok(w: string, lang: 'en' | 'ar' = 'en') {
  let s = String(w).normalize('NFKC');
  if (lang === 'ar' || /[؀-ۿ]/.test(s)) s = s.replace(AR_DIAC, '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  return s.toLowerCase().replace(/[’]/g, "'").replace(/[^\p{L}\p{N}']/gu, '').replace(/^'+|'+$/g, '');
}
export const tokens = (t: string, lang: 'en' | 'ar') => t.split(/[\s–—-]+/).map(w => normTok(w, lang)).filter(Boolean);
export const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
/** sentence end (Latin + Arabic punctuation) */
export const SENT_END = /[.!?؟۔…]["'”»)]?$/;
export const CLAUSE_END = /[,;:،؛]["'”»)]?$/;

/* ------------------------------------------------------------------ takes */
/** words per second for --draft and the take size: English 2.7, Arabic (shorter, denser words) 2.3 */
export const WPS_EST = (lang: 'en' | 'ar') => (lang === 'ar' ? 2.3 : 2.7);
/** ~60 s of speech per take */
const TAKE_MAX_WORDS = (lang: 'en' | 'ar') => Math.round(WPS_EST(lang) * 61);
export interface Take { key: string; chapter: CutChapter; ci: number; lines: (CutLine & { chapter: string })[]; speakers: Who[] }
/** chapter -> takes of consecutive lines up to ~60 s, split at line boundaries into balanced groups (deterministic: same text = same takes) */
export function takesOf(film: CutFilm): Take[] {
  const out: Take[] = [], max = TAKE_MAX_WORDS(film.lang);
  film.chapters.forEach((c, ci) => {
    const ls = film.lines.filter(l => l.chapter === c.id);
    const total = ls.reduce((n, l) => n + wordsOf(l.text), 0), parts = Math.max(1, Math.ceil(total / max));
    const groups: typeof ls[] = [[]]; let acc = 0;
    for (const l of ls) {
      const w = wordsOf(l.text), cur = groups[groups.length - 1];
      if (cur.length && groups.length < parts && acc + w / 2 > total * groups.length / parts) groups.push([]);
      groups[groups.length - 1].push(l); acc += w;
    }
    groups.forEach((g, k) => out.push({ key: groups.length > 1 ? `${c.id}_${k + 1}` : c.id, chapter: c, ci, lines: g, speakers: [...new Set(g.map(l => l.who))] }));
  });
  return out;
}

/* ------------------------------------------------------------------ score */
export interface Word { w: string; t0: number; t1: number }
export interface ScoreLine { id: string; chapter: string; who: Who; text: string; t0: number; t1: number; words: Word[] }
export interface ScoreChapter { id: string; title: string; t0: number; t1: number; mood: Mood }
export interface Score { fps: number; width: number; height: number; duration: number; lang: 'en' | 'ar'; lines: ScoreLine[]; chapters: ScoreChapter[] }

export function chapterBounds(film: CutFilm, firsts: number[], lasts: number[], duration: number, fps: number): ScoreChapter[] {
  const b = film.chapters.map((_, i) => (i ? Math.round((lasts[i - 1] + firsts[i]) / 2 * fps) / fps : 0));
  return film.chapters.map((c, i) => ({ id: c.id, title: c.title.trim(), t0: +b[i].toFixed(4), t1: +(i + 1 < b.length ? b[i + 1] : duration).toFixed(4), mood: moodOf(film, i) }));
}

/** --draft timing: WPS_EST words/s, +0.25 s after a sentence end, 0.4 s between lines (0.55 on a speaker change), chapter_gap between chapters */
export function estimateScore(film: CutFilm): Score {
  const { W, H, fps } = fmt(film), per = 1 / WPS_EST(film.lang), gap = chapterGap(film);
  let t = 0.15; const lines: ScoreLine[] = [], firsts: number[] = [], lasts: number[] = [];
  film.chapters.forEach((c, ci) => {
    if (ci) t = lasts[ci - 1] + gap;
    firsts.push(t);
    const ls = film.lines.filter(l => l.chapter === c.id);
    ls.forEach((l, i) => {
      if (i) t = lines[lines.length - 1].t1 + pauseAfter(ls[i - 1]) + (ls[i - 1].who !== l.who ? 0.55 : 0.4);
      const words = l.text.trim().split(/\s+/).map(w => { const r = { w, t0: +t.toFixed(3), t1: +(t + per * 0.86).toFixed(3) }; t += per + (SENT_END.test(w) ? 0.25 : 0); return r; });
      lines.push({ id: l.id, chapter: c.id, who: l.who, text: l.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
    });
    lasts.push(lines[lines.length - 1].t1 + pauseAfter(ls[ls.length - 1]));
  });
  const duration = snapUp(lasts[lasts.length - 1] + tailOf(film), fps);
  return { fps, width: W, height: H, duration, lang: film.lang, lines, chapters: chapterBounds(film, firsts, lasts, duration, fps) };
}

/* ------------------------------------------------------------------ show.json */
export interface ShowShort { id: string; hook_text: string; cta_text: string; t0: number; t1: number }
export function makeShow(film: CutFilm, score: Score, o: { layout?: 'wide' | 'tall'; window?: { t0: number; t1: number } | null; short?: ShowShort | null; lines?: (ScoreLine & { cta?: boolean })[]; chapters?: ScoreChapter[]; duration?: number; hook_text?: string; end_text?: string } = {}) {
  const tall = o.layout === 'tall';
  return {
    schema: 'cutout/1', lang: film.lang, dir: film.lang === 'ar' ? 'rtl' : 'ltr', layout: tall ? 'tall' : 'wide',
    fps: score.fps, width: tall ? 1080 : score.width, height: tall ? 1920 : score.height, duration: o.duration ?? score.duration,
    film: `/packages/cutout/films/${film.slug}/film.js`,
    window: o.window ?? null,
    hook_text: o.hook_text ?? film.hook_text, end_text: o.end_text ?? film.end_text, captions: film.captions !== false,
    chapters: (o.chapters ?? score.chapters).map(c => ({ id: c.id, title: c.title, t0: c.t0, t1: c.t1, mood: c.mood })),
    lines: (o.lines ?? score.lines).map(l => ({ id: l.id, chapter: l.chapter, who: l.who, text: l.text, t0: l.t0, t1: l.t1, words: l.words, ...((l as any).cta ? { cta: true } : {}) })),
    strings: film.strings ?? {},
    short: o.short ?? null,
  };
}

/* ------------------------------------------------------------------ page + versions */
/** --page <dir> (absolute or repo-relative), else packages/cutout/web when it has frame.html, else the stub */
export function resolvePage(dir?: string) {
  const d = dir ? path.resolve(P.root, dir) : fs.existsSync(path.join(WEB_DIR, 'frame.html')) ? WEB_DIR : STUB_DIR;
  if (!fs.existsSync(path.join(d, 'frame.html'))) throw new Error(`cutout page: ${path.join(d, 'frame.html')} not found`);
  return d;
}
/** folders the page may load from: packages/cutout (kit + films), data/brand, node_modules, the production folder */
export const allowFor = (dir: string) => [CUTOUT, path.join(P.data, 'brand'), path.join(P.root, 'node_modules'), dir];
export const versions = (dir: string) => fs.readdirSync(dir).map(f => Number(/^v(\d+)$/.exec(f)?.[1] ?? 0)).filter(Boolean).sort((a, b) => a - b);
/** version folder: --version N | draft, else the latest vN with a score.json, else draft */
export function versionDir(dir: string, v?: string) {
  if (v === 'draft') return path.join(dir, 'draft');
  if (v) return path.join(dir, `v${v}`);
  const vs = versions(dir).filter(n => fs.existsSync(path.join(dir, `v${n}`, 'score.json')));
  return vs.length ? path.join(dir, `v${vs[vs.length - 1]}`) : path.join(dir, 'draft');
}
