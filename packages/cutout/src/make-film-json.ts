/**
 * Master storyboard -> the two film.json files (English + Arabic). Never edit film.json by hand: change the storyboard and re-run.
 *   npx tsx packages/cutout/src/cli.ts make-film-json <slug> [--storyboard <file>] [--create]
 * Storyboard: docs/brands/karto/<slug>/storyboard.json
 *   { slug, productions: {en: "<id>", ar: "<id>"}, title: {en, ar}, hook_text: {en, ar}, end_text: {en, ar},
 *     cast: { karto: {voice, style: {en, ar}} | {en: {voice, style}, ar: {voice, style}}, skip: ... },
 *     tail?, chapter_gap?, captions?, music_seed?, tts_mode?,
 *     chapters: [{ id, title: {en, ar}, mood?, lines: [{ id, who, en, ar, picture, motion, asset?, pause_after? }] }],
 *     strings: { key: {en, ar} }, shorts: [{ id, from, to, hook_text: {en, ar}, cta: { who, text: {en, ar} }, retake? }] }
 * Kept from the existing film.json across runs: chapters[].retake, retake, max_wer (set by hand after a failed take).
 * --create: when `productions` is missing, create the two DB productions (brands karto-en / karto-ar) and write their ids into the storyboard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { P, production } from '../../shared/src/paths.ts';
import { validateFilm, type CutFilm } from './film.ts';
import { newProduction } from './new.ts';

type Lang = 'en' | 'ar';
const pick = (x: any, lang: Lang): any => (x && typeof x === 'object' && !Array.isArray(x) && ('en' in x || 'ar' in x) ? x[lang] : x);

export function makeFilmJson(slug: string, o: { storyboard?: string; create?: boolean } = {}) {
  const sbFile = path.resolve(P.root, o.storyboard ?? path.join('docs', 'brands', 'karto', slug, 'storyboard.json'));
  if (!fs.existsSync(sbFile)) throw new Error(`${sbFile} missing`);
  const raw = fs.readFileSync(sbFile, 'utf8').replace(/^﻿/, ''), sb = JSON.parse(raw);
  if (sb.slug && sb.slug !== slug) throw new Error(`storyboard slug "${sb.slug}" is not "${slug}"`);
  if (!sb.productions?.en || !sb.productions?.ar) {
    if (!o.create) throw new Error(`storyboard has no productions {en, ar}: add the two production ids, or run with --create`);
    sb.productions = { en: newProduction('karto-en', pick(sb.title, 'en')).productionId, ar: newProduction('karto-ar', pick(sb.title, 'ar')).productionId };
    fs.writeFileSync(sbFile, JSON.stringify(sb, null, 1) + '\n', 'utf8');
  }
  // extra string files next to the storyboard (`strings.d/*.json`, same {key: {en, ar}} shape): lets several scene authors add
  // on-screen words without editing the same file; the storyboard's own keys win on a clash (2026-11-19)
  const sdir = path.join(path.dirname(sbFile), 'strings.d');
  if (fs.existsSync(sdir)) for (const f of fs.readdirSync(sdir).filter(x => x.endsWith('.json')).sort())
    sb.strings = { ...JSON.parse(fs.readFileSync(path.join(sdir, f), 'utf8').replace(/^﻿/, '')), ...(sb.strings ?? {}) };
  const warn: string[] = [], written: string[] = [];
  for (const c of sb.chapters ?? []) for (const l of c.lines ?? []) {
    if (!l.picture) warn.push(`${l.id}: no picture (every named thing must be on screen)`);
    if (!l.motion) warn.push(`${l.id}: no motion`);
    for (const lang of ['en', 'ar'] as Lang[]) if (!String(l[lang] ?? '').trim()) throw new Error(`storyboard line ${l.id} has no ${lang} text (lines are 1:1 in both languages)`);
  }
  const films: CutFilm[] = [];
  for (const lang of ['en', 'ar'] as Lang[]) {
    const id = sb.productions[lang], f = path.join(production(id), 'film.json');
    const old = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const retakes = Object.fromEntries((old.chapters ?? []).filter((c: any) => c.retake != null).map((c: any) => [c.id, c.retake]));
    const cast: any = {};
    for (const w of ['karto', 'skip']) {
      const c = pick(sb.cast?.[w], lang) ?? {};
      cast[w] = { voice: pick(c.voice, lang), ...(pick(c.style, lang) ? { style: pick(c.style, lang) } : {}) };
    }
    const film: any = {
      schema: 'cutout-film/1', slug, lang, title: pick(sb.title, lang), format: sb.format ?? { width: 1920, height: 1080, fps: 30 }, cast,
      hook_text: pick(sb.hook_text, lang), end_text: pick(sb.end_text, lang) ?? '',
      ...(sb.tail != null ? { tail: sb.tail } : {}), ...(sb.chapter_gap != null ? { chapter_gap: sb.chapter_gap } : {}), captions: sb.captions !== false,
      ...(sb.music_seed != null ? { music_seed: sb.music_seed } : {}), ...(sb.tts_mode ? { tts_mode: sb.tts_mode } : {}),
      ...(old.retake != null ? { retake: old.retake } : {}), ...(old.max_wer != null ? { max_wer: old.max_wer } : {}),
      strings: Object.fromEntries(Object.entries(sb.strings ?? {}).map(([k, v]) => [k, String(pick(v, lang) ?? '')])),
      chapters: (sb.chapters ?? []).map((c: any) => ({ id: c.id, title: pick(c.title, lang), ...(c.mood ? { mood: c.mood } : {}), ...(retakes[c.id] != null ? { retake: retakes[c.id] } : {}),
        lines: c.lines.map((l: any) => ({ id: l.id, who: l.who, text: String(l[lang]).trim(), ...(l.pause_after ? { pause_after: l.pause_after } : {}) })) })),
      shorts: (sb.shorts ?? []).map((s: any) => ({ id: s.id, from: s.from, to: s.to, hook_text: pick(s.hook_text, lang), cta: { who: s.cta.who, text: pick(s.cta.text, lang) }, ...(s.retake != null ? { retake: s.retake } : {}) })),
      script_source: path.relative(P.root, sbFile).replace(/\\/g, '/'),
    };
    validateFilm(structuredClone(film));
    films.push(film);
  }
  for (const film of films) {
    const f = path.join(production(sb.productions[film.lang]), 'film.json');
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(film, null, 1) + '\n', 'utf8');
    written.push(f);
  }
  return { written, lines: films[0].chapters.reduce((n, c) => n + c.lines.length, 0), shorts: films[0].shorts?.length ?? 0, warn };
}
