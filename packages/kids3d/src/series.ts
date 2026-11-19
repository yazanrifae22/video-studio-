/**
 * Sunny Hill series wrapper (brand kids, 2026-11-02): every kids:build episode gets the same signature opening (~8 s: jingle,
 * 3D "Sunny Hill" title card with Tiko & Pip, "Ep N · Topic" badge, catchphrase + Boing) and ending (~25 s: recap song, next-time
 * teaser, the one grown-up-addressed subscribe ask led by Pip, playlist line + a non-clickable wall of episode tiles, "See you on
 * the hill!" + hill clap). Series data lives in docs/brands/kids/episodes.json (registry); episode.json may carry
 * `series: {name, ep, topic, title}` (overrides; `title` = custom YouTube title, see customTitleProblem) or `series: false` (no wrapper). Spec: docs/brands/kids/series-bible.md sections 4-5.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import type { EpLine, EpScene, Episode } from './build.ts';

export const REGISTRY = path.join(P.root, 'docs', 'brands', 'kids', 'episodes.json');

export type Token = { actor?: string; ball?: string; apple?: boolean; shape?: string; color?: string; pair?: Token; text?: string; scale?: number };
export interface RegEp { ep: number; topic: string; spoken?: string; production_id?: string | null; search?: string; thumbnail?: string; hero: Token; recap?: { word: string; token: Token }[]; next?: string; thumb_mark?: string | null }
export interface Registry {
  series: { name: string; short: string; playlist: string; season_size?: number; title_max?: number;
    voices: Record<'narrator' | 'narrator_sing' | 'tiko', { voice: string; style: string }>; lines: Record<string, string> };
  episodes: RegEp[];
}
export interface Tile { ep: number; topic: string; kind: 'prev' | 'classic' | 'next'; thumb: string | null; hero: Token }
export interface SeriesInfo {
  name: string; short: string; playlist: string; ep: number; topic: string; spoken: string; production_id: string;
  title: string; hero: Token; mark: string | null; recap: { word: string; token: Token }[];
  next: { ep: number; topic: string; spoken: string; hero: Token } | null;
  tiles: Tile[]; playlistLine: string;
}

export function loadRegistry(): Registry {
  return JSON.parse(fs.readFileSync(REGISTRY, 'utf8').replace(/^﻿/, ''));
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function numWord(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
  return String(n);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const epWords = (n: number) => `Episode ${cap(numWord(n))}`;

/** YouTube title: `Sunny Hill Ep N: <Topic> with Tiko & Pip | <search phrase>` (max 70 chars; the search phrase is dropped if it does not fit). */
export function seriesTitle(short: string, ep: number, topic: string, search?: string, max = 70) {
  const base = `${short} Ep ${ep}: ${topic} with Tiko & Pip`;
  const full = search ? `${base} | ${search}` : base;
  return full.length <= max ? full : base;
}

/** A production-supplied title (episode.json `series.title`, else packaging.json `chosen_title`) must be <= max chars and carry "Sunny Hill Ep N" and "Tiko & Pip". Returns the reason it is invalid, or null. */
export function customTitleProblem(title: string, short: string, ep: number, max = 70): string | null {
  const t = title.trim();
  if (!t) return 'empty';
  if (t.length > max) return `${t.length} chars (max ${max})`;
  if (!new RegExp(`${short} Ep ${ep}(?![0-9])`).test(t)) return `must contain "${short} Ep ${ep}"`;
  if (!t.includes('Tiko & Pip')) return 'must contain "Tiko & Pip"';
  return null;
}

/**
 * Wall tiles: the previous 2 episodes + one older "classic" (rotating); Ep 1 (no older episodes) shows "Coming next: Ep 2".
 * Thumbnails come from productions/<id>/thumbnail.png (or the registry's `thumbnail`); missing ones are drawn from the hero token.
 */
export function wallTiles(reg: Registry, ep: number): Tile[] {
  const byEp = new Map(reg.episodes.map(e => [e.ep, e]));
  // tiles show a clean picture (no "?", text or chip): thumbnail_clean.png, else a frame of the latest 3D render, else drawn art
  const thumb = (e: RegEp) => {
    if (e.thumbnail && fs.existsSync(path.resolve(P.root, e.thumbnail))) return path.resolve(P.root, e.thumbnail);
    if (!e.production_id) return null;
    const d = path.join(P.productions, e.production_id), clean = path.join(d, 'thumbnail_clean.png');
    if (fs.existsSync(clean)) return clean;
    const vs = fs.existsSync(d) ? fs.readdirSync(d).filter(v => /^v\d+$/.test(v) && fs.existsSync(path.join(d, v, '3d.mp4'))).sort((a, b) => +b.slice(1) - +a.slice(1)) : [];
    if (!vs.length) return null;
    const out = path.join(P.cache, 'kids-tiles', `${e.production_id}_${vs[0]}.png`); fs.mkdirSync(path.dirname(out), { recursive: true });   // never written into another production's folder
    if (!fs.existsSync(out)) try { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '30', '-i', path.join(d, vs[0], '3d.mp4'), '-frames:v', '1', '-vf', 'scale=960:540', out]); } catch { return null; }
    return fs.existsSync(out) ? out : null;
  };
  const tile = (n: number, kind: Tile['kind']): Tile | null => { const e = byEp.get(n); return e ? { ep: n, topic: e.topic, kind, thumb: thumb(e), hero: e.hero } : null; };
  const out: Tile[] = [];
  for (const n of [ep - 2, ep - 1]) if (n >= 1) { const t = tile(n, 'prev'); if (t) out.push(t); }
  if (ep >= 4) { const older = ep - 3, k = ((ep - 4) % older) + 1; const t = tile(k, 'classic'); if (t) out.unshift(t); }   // rotates Ep 1..N-3
  if (!out.length) { const t = tile(ep + 1, 'next'); if (t) out.push(t); }
  return out;
}

/** Resolve the series info of a production (null = no wrapper: not brand kids, `series:false`, or not in the registry). */
export function seriesInfo(id: string, ep: Episode & { series?: any }, brand: string): SeriesInfo | null {
  if (brand !== 'kids' || ep.series === false) return null;
  const reg = loadRegistry();
  const over = (ep.series && typeof ep.series === 'object') ? ep.series : {};
  const e = reg.episodes.find(x => x.production_id === id) ?? (over.ep ? reg.episodes.find(x => x.ep === Number(over.ep)) : undefined);
  if (!e && !over.ep) return null;
  const n = Number(over.ep ?? e!.ep), topic = String(over.topic ?? e?.topic ?? ep.title);
  const nx = reg.episodes.find(x => x.ep === n + 1);
  const nextTopic = e?.next ?? nx?.topic;
  const tiles = wallTiles(reg, n);
  const real = tiles.filter(t => t.kind !== 'next').map(t => t.ep).sort((a, b) => a - b);
  const max = reg.series.title_max ?? 70;
  let title = seriesTitle(reg.series.short, n, topic, e?.search, max);   // default; unchanged when no custom title is supplied
  if (typeof over.title === 'string') {   // episode.json series.title: an invalid one is an error (the showrunner typed it)
    const bad = customTitleProblem(over.title, reg.series.short, n, max);
    if (bad) throw new Error(`episode.json series.title "${over.title}": ${bad}`);
    title = over.title.trim();
  } else {   // packaging.json chosen_title (packaging-director): used when valid; otherwise the default (prelint then flags the mismatch)
    try {
      const pk = JSON.parse(fs.readFileSync(path.join(P.productions, id, 'packaging.json'), 'utf8').replace(/^﻿/, ''));
      if (typeof pk?.chosen_title === 'string' && pk.chosen_title.trim() && pk.chosen_title.trim() !== title) {
        const bad = customTitleProblem(pk.chosen_title, reg.series.short, n, max);
        if (bad) console.error(`[kids3d] packaging.json chosen_title ignored (${bad}); using "${title}"`); else title = pk.chosen_title.trim();
      }
    } catch { /* no packaging.json yet */ }
  }
  const L = reg.series.lines;
  const playlistLine = real.length ? L.playlist.replace('{eps}', real.length === 1 ? epWords(real[0]) : `${real.slice(0, -1).map(epWords).join(', ')} and ${epWords(real.at(-1)!)}`) : L.playlist_first;
  return {
    name: String(over.name ?? reg.series.name), short: reg.series.short, playlist: reg.series.playlist, ep: n, topic, spoken: e?.spoken ?? topic, production_id: id,
    title,
    hero: e?.hero ?? { text: topic }, mark: e?.thumb_mark === undefined ? null : e.thumb_mark, recap: (e?.recap ?? []).slice(0, 10),
    next: nextTopic ? { ep: n + 1, topic: nextTopic, spoken: nx?.spoken ?? nextTopic, hero: nx?.hero ?? { text: nextTopic } } : null,
    tiles, playlistLine,
  };
}

/** The wrapper as two mini-episodes (same Episode shape as episode.json, so narrate/layout/estimate run unchanged).
 *  Line ids start with "sx_". `take` groups lines into TTS takes: constant takes (jingle, series, tiko) are shared by every
 *  episode (one cached take, same voice performance each time); "song"/"ep" takes carry this episode's words. */
export function seriesEpisodes(S: SeriesInfo): { opening: Episode; ending: Episode } {
  const reg = loadRegistry(), V = reg.series.voices, L = reg.series.lines;
  const voices = { narrator: V.narrator, tiko: V.tiko };
  const ln = (id: string, who: string, text: string, take: string, after?: number, x: Partial<EpLine> = {}): EpLine => ({ id, who, text, after, take, ...x } as EpLine);
  const opening: Episode = {
    title: `${S.short} Ep ${S.ep}: ${S.topic}`, voices, gap: 0.35, end_hold: 0,
    scenes: [{ id: 'sx_open', lead: 0.7, tail: 0.35, lines: [
      ln('sx_sing', 'narrator', L.jingle, 'jingle', 0.3, { squeeze: 0.3, tempo: 1.12 }),
      ln('sx_boing', 'tiko', L.catchphrase, 'series', undefined, { squeeze: 0.42, tempo: 1.06 }),
    ] }],
  };
  const recapText = S.recap.length ? S.recap.map(r => r.word).join(', ') + '!' : `${S.spoken}!`;
  const end: EpLine[] = [
    ln('sx_letsing', 'narrator', L.recap_intro, 'series', 0.25),
    ln('sx_recap', 'narrator', recapText, 'song', 0.7),
  ];
  if (S.next) end.push(ln('sx_next', 'narrator', L.next.replace('{next}', S.next.spoken), 'ep', 0.7));
  end.push(ln('sx_ask', 'narrator', L.ask, 'series', 0.9, { squeeze: 0.45 }), ln('sx_list', 'narrator', S.playlistLine, 'ep', 0.4), ln('sx_bye', 'tiko', L.bye, 'series', 1.95));
  const ending: Episode = { title: `${S.short} Ep ${S.ep} ending`, voices, gap: 0.3, end_hold: 0.3, scenes: [{ id: 'sx_end', lead: 0.5, tail: 0.2, lines: end }] };
  return { opening, ending };
}

/** TTS voice + style of a series take (the jingle is sung). */
export function takeVoice(who: string, take?: string) {
  const V = loadRegistry().series.voices;
  if (who === 'narrator' && (take === 'jingle' || take === 'song')) return V.narrator_sing;
  return who === 'tiko' ? V.tiko : V.narrator;
}

/** Parent-facing description template (no AI-generation text, no links, no "subscribe!"). */
export function seriesDescription(S: SeriesInfo, learn: string, tryAtHome: string[]) {
  return [
    `${S.name}, Episode ${S.ep}: ${S.topic}. ${learn}`,
    '',
    'Try it at home:',
    ...tryAtHome.slice(0, 3).map(t => `- ${t}`),
    '',
    `Watch every episode in order in our playlist "${S.playlist}".`,
    'Made for kids: calm pacing, gentle sounds, no scary moments.',
  ].join('\n');
}
