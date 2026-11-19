/**
 * kids:build — Tiko & Pip 3D episodes (brand kids, 16:9 1920x1080 long-form).
 *   productions/<id>/episode.json (script + voices + scene list) + productions/<id>/choreo.js (3D choreography on the kit)
 *   → narration (Gemini TTS via packages/voice, one take per voice, cached) → align (faster-whisper) → score.json
 *   → 3D render (headless Chrome GPU, WebCodecs H.264) → timeline.json (3D picture + title + narration + SFX cues + music bed)
 *   → packages/render (ffmpeg) → master (-14 LUFS) → techqa.
 * --no-tts: estimated timing (no quota); --no-render: real narration + score only. Both write productions/<id>/draft/ (layout + stills); never a version.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { renderTimeline } from '../../render/src/render.ts';
import type { Timeline, Track, Item } from '../../render/src/timeline.ts';
import { open, renderVideo, stills, thumbPng, titlePng } from './capture.ts';
import { duckWav, ensureSfx, musicBed, roomTone } from './audio.ts';
import { seriesEpisodes, seriesInfo, takeVoice, type SeriesInfo } from './series.ts';

const run = promisify(execFile);
/** De-plosive every narration clip (kids path only, 2026-11-08, Ep 5 take b14a): gentle 90 Hz highpass + adeclick. Deterministic, applied to the per-line clip only
 *  (the cached TTS take and the -14 LUFS master are untouched); on b14a it takes the click detector's worst ratio from 13.8 to 7.4 (limit 8). */
export const DEPLOSIVE = 'highpass=f=90,adeclick';
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const PYDIR = path.join(P.root, 'packages', 'intelligence', 'py');
export const SFX_DIR = path.join(P.data, 'brand', 'kids', 'sfx');

/** take: TTS take group (lines of one speaker with the same take are synthesized together; default = one take per speaker).
 *  omit: keep the line in its TTS take (cache stays valid) but leave it out of the score (e.g. an old goodbye replaced by the series ending). */
/** squeeze: cap pauses between words at this many seconds; tempo: speed-up factor (atempo, pitch kept). Both re-time the words. */
export interface EpLine { id: string; who: string; text: string; after?: number; delay?: number; take?: string; omit?: boolean; squeeze?: number; tempo?: number }
export interface EpScene { id: string; lead?: number; tail?: number; lines: EpLine[] }
export interface Episode {
  title: string; title_card?: string[]; fps?: number; width?: number; height?: number;
  voices: Record<string, { voice: string; style?: string }>;
  music?: { gainDb?: number; duckDb?: number; seed?: number };
  gap?: number; end_hold?: number; choreo?: string;
  /** Sunny Hill series wrapper: overrides of the registry (docs/brands/kids/episodes.json) or false = no opening/ending */
  series?: { name?: string; ep?: number; topic?: string; title?: string } | false;
  /** Sunny Hill cold open (owner 2026-11-08, O5/O-C3): `dur` (0.5-3.0) s of the episode picture from `from` s (the first payoff action)
   *  play BEFORE the series opening. Episode SFX cues inside the window play with it; narration only when a whole line fits the window. */
  cold_open?: { from: number; dur: number } | false;
  scenes: EpScene[];
}

/** Cold-open window on the frame grid (pure; validated against the episode score). null = no cold open. */
export function coldOpenPlan(ep: Pick<Episode, 'cold_open'>, score: Pick<Score, 'fps' | 'duration'>): { from: number; dur: number } | null {
  const c = ep.cold_open;
  if (!c) return null;
  if (!(c.dur >= 0.5 && c.dur <= 3.0)) throw new Error(`episode.json cold_open.dur ${c.dur} out of range 0.5-3.0 s (series bible: <= 3 s)`);
  const fps = score.fps, from = Math.round(c.from * fps) / fps, dur = Math.round(c.dur * fps) / fps;
  if (!(from >= 0) || from + dur > score.duration + 1e-6) throw new Error(`episode.json cold_open ${c.from}+${c.dur} s is outside the episode (0-${score.duration.toFixed(2)} s)`);
  return { from, dur };
}
export interface ScoreLine extends EpLine { scene: string; at: number; t0: number; t1: number; clip: string | null; dur: number; words: { w: string; t0: number; t1: number }[]; env: number[] }
export interface Score { fps: number; width: number; height: number; duration: number; title: string; lines: ScoreLine[]; scenes: { id: string; t0: number; t1: number }[] }

export function loadEpisode(id: string) {
  const dir = path.join(P.productions, id), f = path.join(dir, 'episode.json');
  if (!fs.existsSync(f)) throw new Error(`${f} missing (see docs/brands/kids/episode-recipe.md)`);
  const ep = JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) as Episode;
  const ids = new Set<string>();
  for (const s of ep.scenes) for (const l of s.lines) {
    if (ids.has(l.id)) throw new Error(`episode.json: duplicate line id ${l.id}`); ids.add(l.id);
    if (!ep.voices[l.who]) throw new Error(`episode.json: line ${l.id} speaker "${l.who}" has no entry in voices`);
    if (/\d/.test(l.text)) throw new Error(`episode.json: line ${l.id} has digits; write numbers as words ("three")`);
  }
  if (!fs.existsSync(path.join(dir, ep.choreo ?? 'choreo.js'))) throw new Error(`choreography ${ep.choreo ?? 'choreo.js'} missing in ${dir}`);
  return { ep, dir };
}

/** per-frame mouth envelope (0..1) of a wav */
async function envelope(file: string, fps: number): Promise<number[]> {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', '12000', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 }) as any;
  const b = stdout as Buffer, x = new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4)), hop = 12000 / fps;
  const rms: number[] = [];
  for (let i = 0; i * hop < x.length; i++) { let s = 0, n = 0; for (let k = Math.floor(i * hop); k < Math.min(x.length, Math.floor((i + 1) * hop)); k++) { s += x[k] * x[k]; n++; } rms.push(Math.sqrt(s / Math.max(1, n))); }
  const sorted = [...rms].sort((a, b) => a - b), ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  let v = 0; return rms.map(r => { const tgt = Math.min(1, Math.max(0, (r / ref - 0.12) / 0.88)) ** 0.7; v += (tgt - v) * (tgt > v ? 0.7 : 0.45); return +v.toFixed(3); });
}

/** Narration: one TTS take per voice, aligned and cut per line. Returns per-line clip info. */
async function narrate(ep: Episode, dir: string, vdir: string, id: string, agent: string, note: (m: string, l?: any) => void, opt: { voiceOf?: (l: EpLine) => { voice: string; style?: string } } = {}) {
  const fps = ep.fps ?? 30, out: Record<string, { clip: string; dur: number; lead: number; words: { w: string; s: number; e: number }[]; env: number[] }> = {};
  const all = ep.scenes.flatMap(s => s.lines);
  fs.mkdirSync(path.join(vdir, 'narration'), { recursive: true }); fs.mkdirSync(path.join(dir, 'voice'), { recursive: true });
  const asr: any = {};
  const groups = new Map<string, EpLine[]>();   // one TTS take per speaker (+ per `take` when lines set one)
  for (const l of all) { const k = l.take ? `${l.who}#${l.take}` : l.who; if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(l); }
  for (const [key, lines] of groups) {
    const who = key.replace('#', '_');   // file names; the speaker is lines[0].who
    const v = opt.voiceOf?.(lines[0]) ?? ep.voices[lines[0].who];
    const tts = await synthesize(lines.map(l => l.text.trim()).join('\n\n'), v.voice, v.style, { productionId: id });
    const raw = path.join(dir, 'voice', `${who}_${path.basename(tts.file)}`); if (!fs.existsSync(raw)) fs.copyFileSync(tts.file, raw);
    note(tts.cached ? `Narration ${who} (${v.voice}) reused from cache` : `Narration ${who} generated (${tts.model}, ${v.voice})`);
    const lj = path.join(vdir, 'narration', `${who}.lines.json`), aj = path.join(vdir, 'narration', `${who}.align.json`);
    fs.writeFileSync(lj, JSON.stringify(lines.map(l => ({ id: l.id, text: l.text }))));
    await withLock('gpu', agent, () => run(PY, ['-I', path.join(PYDIR, 'align.py'), raw, lj, aj], { maxBuffer: 1 << 26, timeout: 1800_000 }));
    const al = JSON.parse(fs.readFileSync(aj, 'utf8'));
    // character names must be said the same way every time: Tiko = "TEE-ko" (ASR writes Tiko/Tico/Teeko; Taiko/Tyco = wrong vowel)
    const want = lines.reduce((a, l) => a + (l.text.match(/\bTiko\b/g)?.length ?? 0), 0);
    const ok = (String(al.asr_text).match(/\b(tiko|tico|teeko|teko|tikko)\b/gi) ?? []).length, bad = String(al.asr_text).match(/\b(taiko|tyco|tycho|tyko|psycho)\b/gi) ?? [];
    asr[who] = { wer: al.wer, asr_text: al.asr_text, names: { tiko_expected: want, tiko_tee_ko: ok, wrong: bad } };
    if (want && (ok < want || bad.length)) note(`Narration ${who}: "Tiko" heard as TEE-ko ${ok}/${want}${bad.length ? `, wrong: ${bad.join(', ')}` : ''} — fix spelling/style`, 'warn');
    if (al.wer > 0.15) note(`Narration ${who} WER ${(al.wer * 100).toFixed(0)}% — listen for misread words`, 'warn');
    for (const [i, l] of lines.entries()) {
      const a = al.lines[i];
      const s0 = Math.max(0, a.start - 0.06), s1 = Math.min(al.duration, a.end + 0.2);
      const clip = path.join(vdir, 'narration', `${l.id}.wav`);
      if (l.squeeze || l.tempo) {
        // squeeze: pauses between words longer than `squeeze` s are cut down to it; tempo: atempo speed-up (pitch kept). Word times follow.
        const segs: [number, number][] = [[s0, s1]];
        if (l.squeeze) for (let k = 1; k < a.words.length; k++) {
          const g0 = a.words[k - 1].e, g1 = a.words[k].s;
          if (g1 - g0 > l.squeeze) { const cur = segs[segs.length - 1]; cur[1] = g0 + l.squeeze / 2; segs.push([g1 - l.squeeze / 2, s1]); }
        }
        const T = l.tempo ?? 1, fc = segs.map(([x, y], k) => `[0:a]atrim=${x.toFixed(3)}:${y.toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,areverse,afade=t=in:d=${k === segs.length - 1 ? 0.05 : 0.012},areverse[s${k}]`);
        fc.push(`${segs.map((_, k) => `[s${k}]`).join('')}concat=n=${segs.length}:v=0:a=1${T !== 1 ? `,atempo=${T}` : ''},${DEPLOSIVE}[out]`);
        await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-filter_complex', fc.join(';'), '-map', '[out]', '-ar', '48000', '-ac', '2', clip]);
        const map = (t: number) => { let off = 0; for (const [x, y] of segs) { if (t <= y) return (off + Math.max(0, t - x)) / T; off += y - x; } return off / T; };
        const dur = segs.reduce((n, [x, y]) => n + y - x, 0) / T;
        out[l.id] = { clip, dur, lead: map(a.start), words: a.words.map((w: any) => ({ w: w.w, s: map(w.s), e: map(w.e) })), env: await envelope(clip, fps) };
        continue;
      }
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', raw, '-af', `afade=t=in:d=0.02,areverse,afade=t=in:d=0.05,areverse,${DEPLOSIVE}`, '-ar', '48000', '-ac', '2', clip]);
      out[l.id] = { clip, dur: s1 - s0, lead: a.start - s0, words: a.words.map((w: any) => ({ w: w.w, s: w.s - s0, e: w.e - s0 })), env: await envelope(clip, fps) };
    }
  }
  fs.writeFileSync(path.join(vdir, 'narration', 'asr.json'), JSON.stringify(asr, null, 1));
  return out;
}

/** Estimated narration (no TTS): 2.3 words/s, synthetic mouth envelope. */
function estimate(ep: Episode) {
  const fps = ep.fps ?? 30, out: Record<string, any> = {};
  for (const l of ep.scenes.flatMap(s => s.lines)) {
    const ws = l.text.split(/\s+/).filter(Boolean); let t = 0.06; const words = ws.map(w => { const d = 0.28 + w.replace(/[^a-z]/gi, '').length * 0.035 + (/[.!?]$/.test(w) ? 0.3 : /,$/.test(w) ? 0.15 : 0); const r = { w, s: t, e: t + d * 0.8 }; t += d; return r; });
    const dur = t + 0.2, env = Array.from({ length: Math.ceil(dur * fps) }, (_, i) => { const tt = i / fps; return words.some(w => tt >= w.s && tt < w.e) ? +(0.5 + 0.5 * Math.sin(tt * 2 * Math.PI * 4)).toFixed(3) : 0; });
    out[l.id] = { clip: null, dur, lead: 0.06, words, env };
  }
  return out;
}

function layout(ep: Episode, nar: Record<string, any>): Score {
  const fps = ep.fps ?? 30, gap = ep.gap ?? 0.3, lines: ScoreLine[] = [], scenes: Score['scenes'] = [];
  let cur = 0;
  for (const s of ep.scenes) {
    const st = cur; cur += s.lead ?? 0.5;
    for (const l of s.lines) {
      if (l.omit) continue;
      const n = nar[l.id], at = cur + (l.delay ?? 0);
      const words = n.words.map((w: any) => ({ w: w.w, t0: +(at + w.s).toFixed(3), t1: +(at + w.e).toFixed(3) }));
      lines.push({ ...l, scene: s.id, at: +at.toFixed(3), t0: words[0]?.t0 ?? at, t1: words[words.length - 1]?.t1 ?? at + n.dur, clip: n.clip, dur: +n.dur.toFixed(3), words, env: n.env });
      cur = at + n.dur + (l.after ?? gap);
    }
    cur += s.tail ?? 0.6;
    scenes.push({ id: s.id, t0: +st.toFixed(3), t1: +cur.toFixed(3) });
  }
  const duration = Math.ceil((cur + (ep.end_hold ?? 1.2)) * fps) / fps;
  return { fps, width: ep.width ?? 1920, height: ep.height ?? 1080, duration, title: ep.title, lines, scenes };
}

const dbLin = (d: number) => Math.pow(10, d / 20);
/** with the series wrapper the music bed starts this long before the opening ends (no silent gap at the cut) */
const MUSIC_LEAD = (O: number) => (O >= 240 / 104 ? 240 / 104 : 0);   // exactly one bar of the 104 bpm bed, so its beat grid stays where it was against the episode

/** Series wrapper parts placed around the episode picture (Sunny Hill opening + ending). */
export interface Wrap { sdir: string; S: SeriesInfo; so: Score; se: Score; Do: number; Dn: number; total: number; askAt: number; wall?: { t0: number; t1: number }; cold?: { from: number; dur: number } | null }

export function timeline(score: Score, files: { video: string; title: string; music: string; coldBed?: string }, cues: { name: string; t: number; db: number }[], ep: Episode, sfx: Record<string, string>, wrap: Wrap | null = null): Timeline {
  const fps = score.fps, F = (t: number) => Math.max(0, Math.round(t * fps));
  const cold = wrap?.cold ?? null, C = cold ? cold.dur : 0;   // cold open (<= 3 s of the episode picture) before the series opening
  const O = wrap ? C + wrap.Do : 0, E = O + score.duration, N = Math.round((wrap ? wrap.total : score.duration) * fps);
  const tracks: Track[] = [];
  const scene: Item[] = [{ type: 'video', name: '3d', src: files.video, fromFrame: F(O), durationInFrames: Math.round(score.duration * fps), volume: 0 }];
  let cueEnd: { t: number; end: number }[] = [];
  if (wrap) {   // Sunny Hill opening + ending: own 3D segments on the same picture track
    scene.unshift({ type: 'video', name: 'series_opening', src: path.join(wrap.sdir, 'opening.mp4'), fromFrame: F(C), durationInFrames: F(O) - F(C), volume: 0 });
    if (cold) scene.unshift({ type: 'video', name: 'cold_open', src: files.video, srcStartFrame: F(cold.from), fromFrame: 0, durationInFrames: F(C), volume: 0 });
    scene.push({ type: 'video', name: 'series_ending', src: path.join(wrap.sdir, 'ending.mp4'), fromFrame: F(E), durationInFrames: N - F(E), volume: 0 });
    const shift = (ls: ScoreLine[], d: number) => ls.map(l => ({ ...l, at: l.at + d, t0: l.t0 + d, t1: l.t1 + d }));
    const coldLines = cold ? shift(score.lines.filter(l => l.at >= cold.from && l.at + l.dur <= cold.from + C).map(l => ({ ...l, id: `cold_${l.id}` })), -cold.from) : [];
    score = { ...score, duration: wrap.total, lines: [...coldLines, ...shift(wrap.so.lines, C), ...shift(score.lines, O), ...shift(wrap.se.lines, E)] };
    const rd = (f: string) => JSON.parse(fs.readFileSync(path.join(wrap.sdir, f), 'utf8')) as { name: string; t: number; db: number }[];
    const coldCues = cold ? cues.filter(c => c.t >= cold.from && c.t < cold.from + C - 0.1).map(c => ({ ...c, t: c.t - cold.from })) : [];
    cueEnd = coldCues.map(c => ({ t: c.t, end: C }));   // cold-open SFX stop at the cut to the opening jingle
    cues = [...coldCues, ...rd('opening.cues.json').map(c => ({ ...c, t: c.t + C })), ...cues.map(c => ({ ...c, t: c.t + O })), ...rd('ending.cues.json').map(c => ({ ...c, t: c.t + E }))];
  }
  tracks.push({ name: 'scene3d', kind: 'video', items: scene });
  const tdur = F(3.6);
  if (!wrap) tracks.push({ name: 'title', kind: 'video', items: [{ type: 'image', name: 'title', src: files.title, fromFrame: 0, durationInFrames: tdur, transform: { y: -31 },
    keyframes: { scale: [{ frame: 0, value: 0.5, easing: [0.34, 1.56, 0.64, 1] }, { frame: F(0.45), value: 0.62 }], opacity: [{ frame: 0, value: 1 }, { frame: tdur - F(0.45), value: 1, easing: 'easeIn' }, { frame: tdur, value: 0 }] } }] });
  // "watch more" wall (Sunny Hill ending): a picture row of episode tiles, not buttons
  if (wrap?.wall && fs.existsSync(path.join(wrap.sdir, 'wall.png'))) tracks.push({ name: 'wall', kind: 'video', items: [{ type: 'image', name: 'wall', src: path.join(wrap.sdir, 'wall.png'), fromFrame: F(E + wrap.wall.t0), durationInFrames: N - F(E + wrap.wall.t0), fadeInFrames: F(0.5) }] });
  // narration: one lane per speaker
  for (const who of [...new Set(score.lines.map(l => l.who))]) tracks.push({ name: `voice_${who}`, kind: 'audio', items: score.lines.filter(l => l.who === who && l.clip).map(l => ({ type: 'audio', name: l.id, src: l.clip!, fromFrame: F(l.at), durationInFrames: Math.max(1, Math.round(l.dur * fps)), volume: 1 }) as Item) });
  // SFX cues in non-overlapping lanes
  const lanes: Item[][] = [];
  for (const c of [...cues].sort((a, b) => a.t - b.t)) {
    if (!sfx[c.name]) throw new Error(`choreo sfx "${c.name}" unknown (have: ${Object.keys(sfx).join(', ')})`);
    const d = Math.max(1, Math.ceil(parseFloat(String(fs.statSync(sfx[c.name]).size - 44)) / (48000 * 4) * fps));
    const stop = cueEnd.find(x => x.t === c.t && c.t < x.end)?.end;
    const it: Item = { type: 'audio', name: c.name, src: sfx[c.name], fromFrame: F(c.t), durationInFrames: Math.min(d, (stop != null ? F(stop) : N) - F(c.t)), volume: +dbLin(c.db).toFixed(4) };
    if (it.durationInFrames < 1) continue;
    let k = lanes.findIndex(l => l.every(o => o.fromFrame + o.durationInFrames <= it.fromFrame));
    if (k < 0) { lanes.push([]); k = lanes.length - 1; } lanes[k].push(it);
  }
  lanes.forEach((l, i) => tracks.push({ name: `sfx${i}`, kind: 'audio', items: l }));
  // music bed (ducking is baked into music.wav by duckMusic; a long volume expression breaks ffmpeg)
  if (cold && files.coldBed) tracks.push({ name: 'cold_bed', kind: 'audio', items: [{ type: 'audio', name: 'cold_bed', src: files.coldBed, fromFrame: 0, durationInFrames: F(C) + 1, volume: 1 }] });   // 1 frame (33 ms) under the opening's first samples = crossfade with its 6 ms micro-fade-in; room tone: the cold open's speech pauses never hit digital silence
  tracks.push({ name: 'music', kind: 'audio', items: [{ type: 'audio', name: 'music', src: files.music, fromFrame: F(O - MUSIC_LEAD(O)), durationInFrames: N - F(O - MUSIC_LEAD(O)), volume: 1 }] });   // the series opening has its own jingle; the bed fades in under its last 2 s
  return { version: 1, width: score.width, height: score.height, fps, durationInFrames: N, background: '#000000', tracks, meta: { builder: 'kids3d', title: score.title } };
}

export interface KidsBuildOptions { agent?: string; noTts?: boolean; skipRender?: boolean; snap?: number[]; reuse3d?: number }

export async function buildKids(id: string, opts: KidsBuildOptions = {}) {
  const agent = opts.agent ?? 'render', t00 = Date.now();
  const { ep, dir } = loadEpisode(id);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(id) as any;
  if (!prod) throw new Error(`production ${id} not found`);
  const log: string[] = [];
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[kids3d] ${m}`); emit({ kind: 'build.step', agent, productionId: id, level, message: m }); };
  const draft = !!opts.noTts || !!opts.skipRender;   // drafts never create a version
  const n = draft ? 0 : (prod.version ?? 0) + 1;
  const vdir = draft ? path.join(dir, 'draft') : path.join(dir, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  note(`kids3d ${draft ? `draft (${opts.noTts ? 'estimated timing, no TTS' : 'real narration, no render'})` : `build v${n}`} started (${ep.scenes.length} scenes)`);
  if (!draft) db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, id);

  const nar = opts.noTts ? estimate(ep) : await narrate(ep, dir, vdir, id, agent, note);
  const score = layout(ep, nar);
  const scoreFile = path.join(vdir, 'score.json');
  fs.writeFileSync(scoreFile, JSON.stringify(score), 'utf8');
  note(`Score: ${score.duration.toFixed(1)} s, ${score.lines.length} lines, ${score.scenes.length} scenes`);
  // Sunny Hill series wrapper (brand kids): opening + ending scores, narrated in their own takes (constant lines are shared by every episode)
  const S = seriesInfo(id, ep, String(prod.brand_id));
  let wrap: Wrap | null = null;
  if (S) {
    const sdir = path.join(vdir, 'series'); fs.mkdirSync(path.join(sdir, 'tiles'), { recursive: true });
    const { opening, ending } = seriesEpisodes(S), both: Episode = { ...opening, scenes: [...opening.scenes, ...ending.scenes] };
    const nar2 = opts.noTts ? estimate(both) : await narrate(both, dir, sdir, id, agent, note, { voiceOf: l => takeVoice(l.who, l.take) });
    const tiles = S.tiles.map(t => { let src: string | null = null; if (t.thumb) { fs.copyFileSync(t.thumb, path.join(sdir, 'tiles', `ep${t.ep}.png`)); src = `/ep/tiles/ep${t.ep}.png`; } return { ...t, thumb: t.thumb ? path.relative(P.root, t.thumb).split(path.sep).join('/') : null, src }; });
    const so = { ...layout(opening, nar2), series: { ...S, tiles, part: 'opening' } } as Score, se = { ...layout(ending, nar2), series: { ...S, tiles, part: 'ending' } } as Score;
    fs.writeFileSync(path.join(sdir, 'opening.score.json'), JSON.stringify(so)); fs.writeFileSync(path.join(sdir, 'ending.score.json'), JSON.stringify(se));
    const Do = so.duration, Dn = se.duration, total = +(Do + score.duration + Dn).toFixed(4), askAt = Do + score.duration + (se.lines.find(l => l.id === 'sx_ask')?.t0 ?? 0);
    const cold = coldOpenPlan(ep, score), C = cold ? cold.dur : 0;
    wrap = { sdir, S, so, se, Do, Dn, total: +(total + C).toFixed(4), askAt: askAt + C, cold };
    if (cold) note(`Cold open: ${C.toFixed(2)} s of the episode picture from ${cold.from.toFixed(2)} s before the series opening (body starts at ${(C + Do).toFixed(2)} s)`);
    else note('No cold_open in episode.json: the episode opens on the series opening (bible 2026-11-08: cold open <= 3 s first)', 'warn');
    note(`${S.short} Ep ${S.ep} "${S.topic}": ${C ? `cold open ${C.toFixed(1)} s + ` : ''}opening ${Do.toFixed(1)} s + episode ${score.duration.toFixed(1)} s + ending ${Dn.toFixed(1)} s = ${total.toFixed(1)} s; ask at ${(askAt + C).toFixed(1)} s; wall ${tiles.map(t => `${t.kind} Ep ${t.ep}${t.thumb ? '' : ' (no thumbnail yet)'}`).join(', ') || 'none'}`);
    if (askAt + C < 90) note(`Series ask at ${askAt.toFixed(1)} s is inside the first 90 s (bible: never)`, 'warn');
    const B = C + Do;   // body_start_s: first episode-body frame (QA frame-0 / hook tests)
    fs.writeFileSync(path.join(vdir, 'series.json'), JSON.stringify({ ...S, tiles, cold_open: cold ? { duration: C, src_from: cold.from } : null,
      opening: { offset: C, duration: Do, lines: so.lines.map(l => ({ id: l.id, who: l.who, text: l.text, t0: l.t0 + C, t1: l.t1 + C })) }, episode: { offset: B, duration: score.duration }, body_start_s: +B.toFixed(3),
      ending: { offset: B + score.duration, duration: Dn, lines: se.lines.map(l => ({ id: l.id, who: l.who, text: l.text, t0: l.t0 + B + score.duration, t1: l.t1 + B + score.duration })) }, total: wrap.total, ask_at: wrap.askAt }, null, 1), 'utf8');
  } else if (String(prod.brand_id) === 'kids' && ep.series !== false) note('No Sunny Hill registry entry for this production (docs/brands/kids/episodes.json): built without the series opening/ending', 'warn');
  const total = wrap ? wrap.total : score.duration;
  if (wrap ? (total < 150 || total > 195) : (score.duration < 120 || score.duration > 180)) note(`Duration ${total.toFixed(1)} s is outside the ${wrap ? '2:30-3:15 (with the series wrapper)' : '2:00-3:00'} target`, 'warn');

  const report: any = { production_id: id, version: n, duration: total, episode_duration: score.duration, series: wrap ? { ep: wrap.S.ep, topic: wrap.S.topic, title: wrap.S.title, cold_open: wrap.cold?.dur ?? 0, opening: wrap.Do, ending: wrap.Dn, body_start_s: +((wrap.cold?.dur ?? 0) + wrap.Do).toFixed(3), ask_at: +wrap.askAt.toFixed(2) } : null, scenes: score.scenes.length, lines: score.lines.length, draft };
  // --reuse-3d N: audio/mix-only fix; copy the picture from vN (same score required, so the picture still matches the voice)
  const prev = opts.reuse3d ? path.join(dir, `v${opts.reuse3d}`) : null;
  if (prev && !draft) {
    const strip = (x: Score) => JSON.stringify({ ...x, lines: x.lines.map(l => ({ ...l, clip: null })) });
    if (strip(JSON.parse(fs.readFileSync(path.join(prev, 'score.json'), 'utf8'))) !== strip(score)) throw new Error(`--reuse-3d ${opts.reuse3d}: score changed since v${opts.reuse3d}; a full render is needed`);
    for (const f of ['3d.mp4', 'cues.json', 'title.png']) fs.copyFileSync(path.join(prev, f), path.join(vdir, f));
    if (fs.existsSync(path.join(prev, 'qa', 'framing.json'))) { fs.mkdirSync(path.join(vdir, 'qa'), { recursive: true }); fs.copyFileSync(path.join(prev, 'qa', 'framing.json'), path.join(vdir, 'qa', 'framing.json')); }
    note(`3D picture reused from v${opts.reuse3d} (score identical)`); report.reused3d = opts.reuse3d;
  }
  if (opts.snap?.length || (!opts.skipRender && !draft && !prev)) {
    await withLock('render', agent, async () => {
      const s = await open(dir, scoreFile, { choreo: ep.choreo });
      try {
        note(`3D page ready (${s.info.gl}; ${s.info.actors.length} actors, ${s.info.cues} sfx cues)`);
        const lint = await s.page.evaluate('kids.lint(0.25)') as any[];
        fs.mkdirSync(path.join(vdir, 'qa'), { recursive: true }); fs.writeFileSync(path.join(vdir, 'qa', 'framing.json'), JSON.stringify(lint, null, 1));
        report.framing = lint.length;
        note(lint.length ? `Framing lint: ${lint.length} span(s) — ${lint.slice(0, 6).map((w: any) => `${w.name} ${w.issue} ${w.t0.toFixed(1)}-${w.t1.toFixed(1)}s`).join('; ')}` : 'Framing lint: clean', lint.length ? 'warn' : 'info');
        if (opts.snap?.length) { report.stills = await stills(s, opts.snap, path.join(vdir, 'stills')); note(`${report.stills.length} stills -> ${path.join(vdir, 'stills')}`); }
        if (!opts.skipRender && !draft) {
          const cues = await s.page.evaluate('kids.cues()') as any[];
          fs.writeFileSync(path.join(vdir, 'cues.json'), JSON.stringify(cues, null, 1));
          await titlePng(s, ep.title_card ?? [ep.title], path.join(vdir, 'title.png'));
          await thumbPng(s, path.join(vdir, 'thumbnail.png'), S ? { series: S.short, ep: S.ep, mark: S.mark } : null);
          if (S) await thumbPng(s, path.join(dir, 'thumbnail_clean.png'), { clean: true });   // series wall tiles use the clean picture fs.copyFileSync(path.join(vdir, 'thumbnail.png'), path.join(dir, 'thumbnail.png'));
          note(`Thumbnail 1280x720 -> ${path.join(dir, 'thumbnail.png')}`);
          const rv = await renderVideo(s, path.join(vdir, '3d.mp4'), f => emit({ kind: 'render.progress', agent, productionId: id, message: `3D render ${Math.round(f * 100)}%` }));
          note(`3D rendered: ${rv.frames} frames in ${rv.seconds.toFixed(0)} s (${rv.msPerFrame.toFixed(1)} ms/frame, ${(rv.seconds / (score.duration / 60)).toFixed(0)} s per video minute)`);
          report.render3d = rv; report.cues = cues.length;
        }
      } finally { await s.close(); }
    });
  }
  if (draft || opts.skipRender) { fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, log }, null, 1)); return report; }

  /* Sunny Hill opening + ending (kit choreography web/series/sunny-hill.js), the wall PNG, and the badge thumbnail on a reused picture */
  if (wrap) {
    const w = wrap;
    await withLock('render', agent, async () => {
      for (const part of ['opening', 'ending'] as const) {
        const s = await open(w.sdir, path.join(w.sdir, `${part}.score.json`), { epUrl: '/kit/series/sunny-hill.js' });
        try {
          const lint = await s.page.evaluate('kids.lint(0.25)') as any[];
          fs.mkdirSync(path.join(w.sdir, 'qa'), { recursive: true }); fs.writeFileSync(path.join(w.sdir, 'qa', `framing-${part}.json`), JSON.stringify(lint, null, 1));
          report[`framing_${part}`] = lint.length;
          if (lint.length) note(`Series ${part} framing lint: ${lint.slice(0, 6).map((x: any) => `${x.name} ${x.issue} ${x.t0.toFixed(1)}-${x.t1.toFixed(1)}s`).join('; ')}`, 'warn');
          fs.writeFileSync(path.join(w.sdir, `${part}.cues.json`), JSON.stringify(await s.page.evaluate('kids.cues()'), null, 1));
          if (part === 'ending') {
            const d = await s.page.evaluate('K.wallPng()') as string; fs.writeFileSync(path.join(w.sdir, 'wall.png'), Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'));
            w.wall = await s.page.evaluate('K.wall') as any;
          }
          const rv = await renderVideo(s, path.join(w.sdir, `${part}.mp4`));
          note(`Series ${part}: ${rv.frames} frames in ${rv.seconds.toFixed(0)} s`); report[`render_${part}`] = rv;
        } finally { await s.close(); }
      }
      if (prev) {   // reused episode picture: still give the thumbnail its series badge
        const s = await open(dir, scoreFile, { choreo: ep.choreo, sub: 1 });
        try { await thumbPng(s, path.join(vdir, 'thumbnail.png'), { series: w.S.short, ep: w.S.ep, mark: w.S.mark }); fs.copyFileSync(path.join(vdir, 'thumbnail.png'), path.join(dir, 'thumbnail.png')); await thumbPng(s, path.join(dir, 'thumbnail_clean.png'), { clean: true }); } finally { await s.close(); }
      }
    });
  }

  /* audio beds + timeline */
  const sfx = ensureSfx(SFX_DIR);
  const C = wrap?.cold?.dur ?? 0, O = wrap ? C + wrap.Do : 0, ML = MUSIC_LEAD(wrap ? wrap.Do : 0);
  const music = musicBed(path.join(vdir, 'music.wav'), total - O + ML, ep.music?.seed ?? 7);   // starts after the series opening (the jingle plays there)
  const spans: [number, number][] = [];
  const spoken = wrap ? [...wrap.so.lines.map(l => ({ t0: l.t0 + C - O + ML, t1: l.t1 + C - O + ML })), ...score.lines.map(l => ({ t0: l.t0 + ML, t1: l.t1 + ML })), ...wrap.se.lines.map(l => ({ t0: l.t0 + score.duration + ML, t1: l.t1 + score.duration + ML }))].filter(l => l.t1 > 0) : score.lines;   // music-file time
  for (const l of [...spoken].sort((a, b) => a.t0 - b.t0)) { const a = l.t0 - 0.15, b = l.t1 + 0.25; if (spans.length && a <= spans[spans.length - 1][1] + 0.6) spans[spans.length - 1][1] = Math.max(spans[spans.length - 1][1], b); else spans.push([a, b]); }
  duckWav(music, spans, ep.music?.gainDb ?? -21, (ep.music?.gainDb ?? -21) - (ep.music?.duckDb ?? 7));
  const cues = JSON.parse(fs.readFileSync(path.join(vdir, 'cues.json'), 'utf8'));
  const tl = timeline(score, { video: path.join(vdir, '3d.mp4'), title: path.join(vdir, 'title.png'), music, coldBed: C > 0 ? roomTone(path.join(vdir, 'cold_bed.wav'), C + 0.05) : undefined }, cues, ep, sfx, wrap);
  fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(tl, null, 1));
  db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET notes=excluded.notes`).run(id, n, null, J.str(report));
  db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, id);

  const raw = path.join(vdir, 'render.raw.mp4');
  const rr = await withLock('render', agent, () => renderTimeline(tl, raw, { workDir: path.join(vdir, 'render-work') }));
  note(`Composited with ffmpeg in ${rr.seconds.toFixed(1)} s (${rr.inputs} inputs)`);
  const final = path.join(vdir, 'render.mp4');
  await master(raw, final);
  note('Mastered audio to -14 LUFS / -1.5 dBTP');
  await run(PY, ['-I', path.join(PYDIR, 'techqa.py'), final, path.join(vdir, 'qa'), '--expect-duration', total.toFixed(2), '--size', `${score.width}x${score.height}`], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), id, n);
  db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now') WHERE production_id=? AND current_state NOT IN ('approved','scheduled','published')`).run(id);
  report.minutes = +((Date.now() - t00) / 60000).toFixed(1);
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) in ${report.minutes} min — technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}`, tq.pass ? 'success' : 'warn');
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify({ ...report, techqa: tq, log }, null, 1));
  return { ...report, render: final, techqa: { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs } };
}

/** Stills from the latest score (draft or a version) for frame checks. */
export async function snapKids(id: string, times: number[], opts: { version?: string; agent?: string; width?: number } = {}) {
  const { ep, dir } = loadEpisode(id);
  const vd = opts.version === 'draft' ? 'draft' : opts.version ? `v${opts.version}` : (() => { const p = db().prepare(`SELECT version FROM productions WHERE production_id=?`).get(id) as any; return p?.version ? `v${p.version}` : 'draft'; })();
  const vdir = path.join(dir, vd), scoreFile = path.join(vdir, 'score.json');
  if (!fs.existsSync(scoreFile)) throw new Error(`${scoreFile} missing: run kids:build ${id} --no-tts first`);
  const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8')) as Score;
  const ts = times.length ? times : Array.from({ length: 16 }, (_, i) => +((i + 0.5) * score.duration / 16).toFixed(2));
  return withLock('render', opts.agent ?? 'render', async () => {
    const s = await open(dir, scoreFile, { choreo: ep.choreo });
    try { return await stills(s, ts, path.join(vdir, 'stills'), opts.width ?? 480); } finally { await s.close(); }
  });
}

/** Framing lint of the latest score (draft or version): Tiko/Pip + K.keep marks in frame and unblocked. */
export async function lintKids(id: string, opts: { version?: string; agent?: string } = {}) {
  const { ep, dir } = loadEpisode(id);
  const vd = opts.version === 'draft' ? 'draft' : opts.version ? `v${opts.version}` : 'draft';
  const scoreFile = path.join(dir, vd, 'score.json');
  return withLock('render', opts.agent ?? 'render', async () => {
    const s = await open(dir, scoreFile, { choreo: ep.choreo, sub: 1 });
    try { const r = await s.page.evaluate('kids.lint(0.25)'); fs.mkdirSync(path.join(dir, vd, 'qa'), { recursive: true }); fs.writeFileSync(path.join(dir, vd, 'qa', 'framing.json'), JSON.stringify(r, null, 1)); return r; } finally { await s.close(); }
  });
}
