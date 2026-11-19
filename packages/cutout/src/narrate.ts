/**
 * Cutout narration, two speakers, quota-lean: one TTS call per take (a take = consecutive lines of one chapter, <= ~60 s).
 * A take with both speakers is ONE Gemini multi-speaker call (`synthesizeDialogue`, transcript lines `Karto:` / `Skip:`); a
 * one-speaker take is a plain `synthesize`. tts_mode "turns" (or a model that refuses multi-speaker) = one take per speaker turn.
 * Every take: align.py (--lang, cached) -> gates (WER, opening, style preamble, spoken speaker labels, extra words) -> level match
 * per take, then per speaker -> per-line clips laid end to end -> Score (lines carry who, chapter, word times).
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { synthesize, synthesizeDialogue, DialogueUnsupportedError } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { PY, PYDIR, lufs } from '../../test3d/src/build.ts';
import { rmsDb } from '../../test3d/src/audio.ts';
import {
  LABEL, chapterBounds, chapterGap, fileId, fmt, maxWer, pauseAfter, snapUp, tailOf, takesOf, tokens,
  type CutFilm, type CutLine, type Score, type ScoreLine, type Who, type Word,
} from './film.ts';

const run = promisify(execFile);
export const ALIGN_PY = path.join(PYDIR, 'align.py');
type Note = (m: string, l?: 'info' | 'warn' | 'success') => void;
type FLine = CutLine & { chapter: string };

/** align.py with a cache in productions/<id>/voice/ (key = audio bytes + lines + align.py + language) */
export async function alignCached(file: string, lines: { id: string; text: string }[], lang: string, cacheDir: string, workDir: string, tag: string, agent: string) {
  const key = crypto.createHash('sha1').update(fs.readFileSync(file)).update(JSON.stringify(lines.map(l => ({ id: l.id, text: l.text })))).update(fs.readFileSync(ALIGN_PY)).update(`|${lang}`).digest('hex').slice(0, 16);
  fs.mkdirSync(cacheDir, { recursive: true }); fs.mkdirSync(workDir, { recursive: true });
  const cached = path.join(cacheDir, `align-${key}.json`);
  if (fs.existsSync(cached)) { fs.copyFileSync(cached, path.join(workDir, `align-${tag}.json`)); return { al: JSON.parse(fs.readFileSync(cached, 'utf8')), cached: true }; }
  const lj = path.join(workDir, `lines-${tag}.json`), aj = path.join(workDir, `align-${tag}.json`);
  fs.writeFileSync(lj, JSON.stringify(lines.map(l => ({ id: l.id, text: l.text }))), 'utf8');
  await withLock('gpu', agent, () => run(PY, ['-I', ALIGN_PY, file, lj, aj, '--lang', lang], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  fs.copyFileSync(aj, cached);
  return { al: JSON.parse(fs.readFileSync(aj, 'utf8')), cached: false };
}

const lev = (a: string, b: string) => {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const c = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } }
  return d[b.length];
};
/** two tokens are "the same word" when their letters are >= 60 % alike (dialect spelling: بتوقع / بتقع, معك / معاك, ضلت / ظلت) */
const near = (a: string, b: string) => a === b || 1 - lev(a, b) / Math.max(a.length, b.length) >= 0.6;
/** word error rate where a near-spelling counts as a match: (substitutions + deletions + insertions) / script words. The Arabic gate
 *  (Whisper writes Syrian dialect in its own spelling, so align.py's exact-token WER over-counts); English keeps align.py's WER. */
/** Arabic takes: Whisper writes spoken numbers as digits, which align.py spells as ENGLISH words ("twenty twenty three"), while the
 *  script spells them in Arabic: number words are left out of both sides of the gate (2026-11-19; the orchestrator reads the numbers
 *  in takes.json asr_text by eye: digits there prove the number was spoken). */
const AR_NUM = /^[وبل]?(واحد|وحده|تنين|اتنين|تلات\S*|ثلاث\S*|اربع\S*|خمس\S*|ست|سته|ستين|ستاشر|سبع\S*|تمان\S*|ثمان\S*|تسع\S*|عشر\S*|ميه|ميت\S*|متين|الف|الفين|الاف|تناشر|حداشر|نص)$/;
const isNumTok = (t: string) => /^[a-z']+$/.test(t) || /\d/.test(t) || AR_NUM.test(t.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه'));
export function fuzzyWer(asrText: string, script: string, lang: 'en' | 'ar') {
  let r = tokens(script, lang), h = tokens(asrText, lang);
  if (lang === 'ar') { r = r.filter(t => !isNumTok(t)); h = h.filter(t => !isNumTok(t)); }
  if (!r.length) return h.length ? 1 : 0;
  let prev = Array.from({ length: h.length + 1 }, (_, j) => j);
  for (let i = 1; i <= r.length; i++) {
    const cur = [i];
    for (let j = 1; j <= h.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (near(r[i - 1], h[j - 1]) ? 0 : 1));
    prev = cur;
  }
  return +(prev[h.length] / r.length).toFixed(3);
}

/** the gated WER: Arabic = near-spelling WER, English = align.py's exact-token WER */
export const gateWer = (film: CutFilm, raw: number, fuzzy: number) => (film.lang === 'ar' ? fuzzy : raw);

const LABEL_TOKENS = ['karto', 'carto', 'kartu', 'cartoe', 'كرتو', 'كارتو', 'كرطو', 'skip', 'skipp', 'سكيب', 'سكب', 'سكيپ'];
/** opening / preamble / spoken-label / extra-words checks of one take (ASR text vs the take's script) */
export function takeCheck(asrText: string, lines: { text: string }[], film: CutFilm, firstStart: number) {
  const lang = film.lang, asr = tokens(asrText, lang), script = lines.flatMap(l => tokens(l.text, lang)), sset = new Set(script);
  const problems: string[] = [];
  const head = asr.slice(0, 9), i0 = head.indexOf(script[0]), i1 = head.indexOf(script[1] ?? '\u0000');
  if (!(i0 >= 0 && i0 <= 2) && !(i1 >= 0 && i1 <= 3)) problems.push(`take does not open with the script ("${head.slice(0, 6).join(' ')}" vs "${script.slice(0, 6).join(' ')}")`);
  const styleWords = new Set([...Object.values(film.cast).flatMap(c => tokens(c.style ?? '', 'en')), 'audio', 'profile', 'director', 'directors', 'notes', 'transcript'].filter(w => w.length > 3 && !sset.has(w)));
  const styleHits = head.filter(w => styleWords.has(w));
  if (styleHits.length) problems.push(`style/preamble words in the first ~3 s: ${styleHits.join(', ')}`);
  const count = (xs: string[]) => xs.filter(w => LABEL_TOKENS.includes(w)).length;
  const labels = count(asr) - count(script);
  if (labels > 0) problems.push(`speaker label spoken ${labels}x (ASR heard ${asr.filter(w => LABEL_TOKENS.includes(w)).join(', ')})`);
  const extra = script.length ? asr.length / script.length : 1;
  if (extra > 1.25) problems.push(`ASR heard ${asr.length} words for ${script.length} script words (+${Math.round((extra - 1) * 100)} %): something extra is spoken`);
  if (firstStart > 1.5) problems.push(`first script word starts at ${firstStart.toFixed(2)} s of the take`);
  return { ok: !problems.length, head: head.join(' '), problems, spoken_labels: Math.max(0, labels), extra_ratio: +extra.toFixed(2) };
}

interface Unit { key: string; chapter: string; lines: FLine[]; mode: 'dialogue' | 'single'; who: Who[]; retake: string | number | null }
export interface TakeReport { key: string; chapter: string; mode: 'dialogue' | 'single'; speakers: Who[]; lines: string[]; words: number; cached: boolean; model: string | null; file: string; retake: string | number | null;
  wer: number; wer_raw: number; wer_fuzzy: number; check: ReturnType<typeof takeCheck>; asr_text: string; spoken_s: number; wps: number; lufs: number; gain_db: number; flags: string[]; align_cached: boolean }
export interface Placed { id: string; who: Who; clip: string; at: number; dur: number; gainDb: number }

/** the film's takes as TTS units (dialogue / single, or per speaker turn) */
function unitsOf(film: CutFilm, mode: 'dialogue' | 'turns'): Unit[] {
  const out: Unit[] = [];
  for (const t of takesOf(film)) {
    const retake = t.chapter.retake ?? film.retake ?? null;
    if (t.speakers.length === 1) { out.push({ key: t.key, chapter: t.chapter.id, lines: t.lines, mode: 'single', who: t.speakers, retake }); continue; }
    if (mode === 'dialogue') { out.push({ key: t.key, chapter: t.chapter.id, lines: t.lines, mode: 'dialogue', who: ['karto', 'skip'], retake }); continue; }
    const turns: FLine[][] = [];
    for (const l of t.lines) { const cur = turns[turns.length - 1]; if (cur && cur[0].who === l.who) cur.push(l); else turns.push([l]); }
    turns.forEach((g, k) => out.push({ key: `${t.key}_t${k + 1}`, chapter: t.chapter.id, lines: g, mode: 'single', who: [g[0].who], retake }));
  }
  return out;
}

async function synthUnit(u: Unit, film: CutFilm, id: string) {
  if (u.mode === 'dialogue') {
    const speakers = (['karto', 'skip'] as Who[]).map(w => ({ name: LABEL[w], voice: film.cast[w].voice, style: film.cast[w].style }));
    return synthesizeDialogue(u.lines.map(l => ({ speaker: LABEL[l.who], text: l.text.trim() })), speakers, { productionId: id, retake: u.retake ?? undefined });
  }
  const c = film.cast[u.who[0]];
  return synthesize(u.lines.map(l => l.text.trim()).join('\n\n'), c.voice, c.style, { productionId: id, retake: u.retake ?? undefined });
}
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

export async function narrateFilm(film: CutFilm, dir: string, vdir: string, id: string, agent: string, note: Note) {
  const { W, H, fps } = fmt(film), gap = chapterGap(film);
  const nd = path.join(vdir, 'narration'), voiceDir = path.join(dir, 'voice');
  fs.mkdirSync(nd, { recursive: true }); fs.mkdirSync(voiceDir, { recursive: true });
  let mode: 'dialogue' | 'turns' = film.tts_mode ?? 'dialogue', fallback: string | null = null;
  let units = unitsOf(film, mode);
  note(`Narration: ${film.chapters.length} chapters -> ${units.length} takes (${units.filter(u => u.mode === 'dialogue').length} two-speaker, mode ${mode}; ${film.lang}, karto ${film.cast.karto.voice}, skip ${film.cast.skip.voice})`);
  const takes: (TakeReport & { al: any })[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    let tts: Awaited<ReturnType<typeof synthesize>>;
    try { tts = await synthUnit(u, film, id); }
    catch (e) {
      if (!(e instanceof DialogueUnsupportedError) || mode === 'turns') throw e;
      fallback = e.message; mode = 'turns';
      note(`Multi-speaker TTS refused (${e.message.slice(0, 200)}): falling back to one take per speaker turn`, 'warn');
      units = [...units.slice(0, i), ...unitsOf(film, 'turns').filter(x => !units.slice(0, i).some(d => d.lines.some(l => x.lines.some(m => m.id === l.id))))];
      i--; continue;
    }
    const raw = path.join(voiceDir, path.basename(tts.file)); if (!fs.existsSync(raw)) fs.copyFileSync(tts.file, raw);
    const { al, cached: alc } = await alignCached(raw, u.lines, film.lang, voiceDir, nd, fileId(u.key), agent);
    const ws = (al.lines as any[]).flatMap(l => l.words), spoken = ws[ws.length - 1].e - ws[0].s;
    const check = takeCheck(String(al.asr_text), u.lines, film, al.lines[0]?.start ?? 0);
    /* the full-take ASR sometimes drops a short opening fragment ("Piece seven. The panic."): before failing the take, transcribe
       its first 6 s alone and test the opening on that (2026-11-19: a good Arabic take failed twice on this) */
    const openIdx = check.problems.findIndex(p => p.startsWith('take does not open'));
    if (openIdx >= 0) {
      try {
        const clip = path.join(nd, `head-${fileId(u.key)}.wav`);
        await run('ffmpeg', ['-hide_banner', '-v', 'error', '-y', '-i', raw, '-t', '4.5', '-af', 'volume=8dB', clip]);
        const { stdout } = await withLock('gpu', agent, () => run(PY, ['-I', path.join(import.meta.dirname, 'asr_head.py'), clip, film.lang], { maxBuffer: 1 << 22, timeout: 600_000, encoding: 'utf8' }));
        const hd = tokens(String(stdout), film.lang).slice(0, 4), sc = u.lines.flatMap(l => tokens(l.text, film.lang)).slice(0, 2);
        if (sc.length && hd.slice(0, 3).some(h => near(h, sc[0])) && (sc.length < 2 || hd.some(h => near(h, sc[1])))) {
          check.problems.splice(openIdx, 1); check.ok = !check.problems.length;
          note(`Take ${u.key}: opening confirmed by a separate listen of the first 6 s ("${String(stdout).trim().slice(0, 60)}")`);
        }
      } catch (e: any) { note(`Take ${u.key}: opening re-check could not run (${String(e?.message ?? e).slice(0, 120)})`, 'warn'); }
    }
    const L = await lufs(raw), wf = fuzzyWer(String(al.asr_text), u.lines.map(l => l.text).join(' '), film.lang), wer = gateWer(film, al.wer, wf);
    takes.push({ key: u.key, chapter: u.chapter, mode: u.mode, speakers: u.who, lines: u.lines.map(l => l.id), words: ws.length, cached: tts.cached, model: tts.model, file: raw, retake: u.retake,
      wer, wer_raw: al.wer, wer_fuzzy: wf, check, asr_text: String(al.asr_text), spoken_s: +spoken.toFixed(2), wps: +(ws.length / spoken).toFixed(2), lufs: L.i, gain_db: 0, flags: [], align_cached: alc, al });
    note(`Take ${u.key} (${u.mode === 'dialogue' ? 'karto+skip' : u.who[0]}): ${tts.cached ? 'cached' : `generated (${tts.model})`}, ${spoken.toFixed(1)} s, WER ${(wer * 100).toFixed(1)} %${film.lang === 'ar' ? ` (exact-token ${(al.wer * 100).toFixed(1)} %)` : ''}, ${L.i} LUFS${check.ok ? '' : `; CHECK: ${check.problems.join('; ')}`}`);
  }
  const strip = (t: typeof takes[number]) => { const { al, ...r } = t; return r; };
  fs.writeFileSync(path.join(nd, 'takes.json'), JSON.stringify(takes.map(strip), null, 1), 'utf8');
  const MW = maxWer(film), fails = takes.filter(t => t.wer > MW || !t.check.ok);
  if (fails.length) throw new Error(`Narration gate failed for ${fails.length} take(s): ${fails.map(t => `${t.key} (chapter ${t.chapter}:${t.wer > MW ? ` WER ${(t.wer * 100).toFixed(1)} % > ${MW * 100} %` : ''}${t.check.ok ? '' : ` ${t.check.problems.join('; ')}`})`).join(' | ')}. Raise chapters[].retake of those chapters (re-voices only them); details ${path.join(nd, 'takes.json')}`);
  /* level match 1: every take to the median loudness (+-6 dB) */
  const mL = med(takes.map(t => t.lufs)), mW = med(takes.map(t => t.wps));
  for (const t of takes) {
    t.gain_db = +Math.max(-6, Math.min(6, mL - t.lufs)).toFixed(2);
    if (Math.abs(t.lufs - mL) > 2) t.flags.push(`loudness ${t.lufs} LUFS is ${(t.lufs - mL).toFixed(1)} dB from the median ${mL} (corrected by ${t.gain_db} dB)`);
    if (Math.abs(t.wps / mW - 1) > 0.15) t.flags.push(`speaking rate ${t.wps} words/s is ${((t.wps / mW - 1) * 100).toFixed(0)} % from the median ${mW}`);
    for (const f of t.flags) note(`Take ${t.key}: ${f}`, 'warn');
  }
  /* layout: pause inside a take = its own pause clamped 0.3-0.75 s; between takes of one chapter 0.55 s; between chapters chapter_gap */
  const placed: Placed[] = [], lines: ScoreLine[] = [], firsts: number[] = [], lasts: number[] = [];
  let prevEnd = 0;
  for (const [ti, tk] of takes.entries()) {
    const newChapter = ti === 0 || takes[ti - 1].chapter !== tk.chapter, ci = film.chapters.findIndex(c => c.id === tk.chapter);
    for (const [i, lid] of tk.lines.entries()) {
      const a = tk.al.lines[i], fl = film.lines.find(l => l.id === lid)!;
      const s0 = Math.max(0, a.start - 0.04), s1 = Math.min(tk.al.duration, a.end + 0.12);
      const clip = path.join(nd, `line-${fileId(lid)}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', tk.file, '-af', `volume=${tk.gain_db.toFixed(2)}dB,afade=t=in:d=0.01,areverse,afade=t=in:d=0.04,areverse`, '-ar', '48000', '-ac', '2', clip]);
      const pause = i ? Math.max(0.3, Math.min(0.75, a.start - tk.al.lines[i - 1].end)) : newChapter ? gap : 0.55;
      const first = ti === 0 && i === 0 ? 0.15 : prevEnd + pause;
      const at = Math.round((first - (a.start - s0)) * fps) / fps, off = at - s0;
      const words: Word[] = a.words.map((w: any) => ({ w: w.w, t0: +(w.s + off).toFixed(3), t1: +(w.e + off).toFixed(3) }));
      if (i === 0 && newChapter) firsts[ci] = words[0].t0;
      placed.push({ id: lid, who: fl.who, clip, at, dur: s1 - s0, gainDb: 0 });
      lines.push({ id: lid, chapter: fl.chapter, who: fl.who, text: fl.text, t0: words[0].t0, t1: words[words.length - 1].t1, words });
      prevEnd = words[words.length - 1].t1 + pauseAfter(fl); lasts[ci] = prevEnd;
    }
  }
  /* level match 2: per speaker (a two-speaker take can carry one voice louder than the other): speaker median line RMS -> overall median, +-4 dB */
  const rms = placed.map(p => rmsDb(p.clip) ?? -60), all = med(rms), perSpeaker: Record<string, { median_rms_db: number; gain_db: number; lines: number }> = {};
  for (const w of ['karto', 'skip'] as Who[]) {
    const xs = rms.filter((_, i) => placed[i].who === w); if (!xs.length) continue;
    const m = med(xs), g = Math.abs(all - m) > 0.5 ? +Math.max(-4, Math.min(4, all - m)).toFixed(2) : 0;
    perSpeaker[w] = { median_rms_db: +m.toFixed(1), gain_db: g, lines: xs.length };
    for (const p of placed) if (p.who === w) p.gainDb = g;
  }
  note(`Speaker levels: ${Object.entries(perSpeaker).map(([w, s]) => `${w} ${s.median_rms_db} dB RMS (gain ${s.gain_db} dB, ${s.lines} lines)`).join(', ')}`);
  const duration = snapUp(prevEnd + tailOf(film), fps);
  const score: Score = { fps, width: W, height: H, duration, lang: film.lang, lines, chapters: chapterBounds(film, firsts, lasts, duration, fps) };
  fs.writeFileSync(path.join(nd, 'placed.json'), JSON.stringify(placed, null, 1), 'utf8');
  return { score, placed, takes: takes.map(strip), loudness_median: mL, wps_median: mW, speakers: perSpeaker, tts_mode: mode, dialogue_fallback: fallback };
}
