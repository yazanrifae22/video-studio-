import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { P } from '../../shared/src/paths.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import type { QuizSpec, Script } from './spec.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const ALIGN = path.join(P.root, 'packages', 'quiz', 'py', 'align_ar.py');
export const KEYWORDS = ['كرزة', 'حمرا', 'ثواني', 'حدسك', 'يمينك', 'يسارك', 'سبعة', 'الوردة'];

const WHITE_STYLE = 'Warm, playful, energetic Arabic quiz host speaking light, neutral "white" Arabic (Gulf-leaning, close to MSA pronunciation, ق as in MSA), like a friend challenging you, not a news reader. Smile in the voice. Questions rise at the end. Answers land with a short beat of excitement on the first word, then the explanation relaxed and clear. Natural pauses between lines. Moderate pace, about 2.5 words per second.';

/** Spoken lines of the script in order (countdown lines have no narration and are never sent). */
export const spoken = (script: Script) => script.lines.filter(l => l.narration_ar);

/** Run the Arabic aligner on a take. GPU-locked like every other ASR job in the studio. */
export async function align(audio: string, lines: { id: string; text: string; caption?: string }[], out: string, agent = 'render') {
  const lj = out.replace(/\.json$/, '.lines.json');
  fs.writeFileSync(lj, JSON.stringify(lines));
  const { stdout } = await withLock('gpu', agent, () => run(PY, ['-I', ALIGN, audio, lj, out, '--keywords', KEYWORDS.join(',')], { maxBuffer: 1 << 26, timeout: 1800_000 }));
  return { summary: String(stdout).trim().split('\n').pop(), result: JSON.parse(fs.readFileSync(out, 'utf8')) };
}

/**
 * Dialect × voice A/B on the hook + R1 lines (script.ab_test). One request per voice × dialect; every take is cached by
 * text+voice+style, so re-running costs nothing. Writes <dir>/voice/ab.json with ASR accuracy and prosody per take.
 */
export async function abTest(spec: QuizSpec, script: Script, dir: string, voices: string[], productionId: string) {
  const vdir = path.join(dir, 'voice'); fs.mkdirSync(vdir, { recursive: true });
  const style = script.tts.style_notes;
  const res: any[] = [];
  for (const voice of voices) for (const dialect of ['levantine', 'white'] as const) {
    const ls: { id: string; narration_ar: string }[] = script.ab_test[dialect];
    const text = ls.map(l => l.narration_ar).join('\n\n');
    const t = await synthesize(text, voice, dialect === 'white' ? WHITE_STYLE : style, { productionId });
    const wav = path.join(vdir, `ab_${voice}_${dialect}.wav`);
    fs.copyFileSync(t.file, wav);
    const al = await align(wav, ls.map(l => ({ id: l.id, text: l.narration_ar })), path.join(vdir, `ab_${voice}_${dialect}.align.json`));
    res.push({ voice, dialect, cached: t.cached, model: t.model, file: wav, wer: al.result.wer, keywords: al.result.keywords, pitch: al.result.pitch, rate_wps: al.result.rate_wps, duration: al.result.duration, asr_text: al.result.asr_text });
  }
  fs.writeFileSync(path.join(vdir, 'ab.json'), JSON.stringify(res, null, 1));
  return res;
}

/** TTS style of a production's take (same for the main take and the standalone hook line). */
export const takeStyle = (spec: QuizSpec, script: Script) => spec.narration.style ?? (spec.narration.dialect === 'white' ? WHITE_STYLE : script.tts.style_notes);

/** The exact text of one TTS request (lines joined by blank lines). Exported for cache-key checks. */
export const takeText = (ls: { text: string }[]) => ls.map(l => l.text.trim()).join('\n\n');

/**
 * Spoken lines of hook_intro rounds that are voiced by their OWN TTS request (default since 2026-10-26; quiz.json
 * hook.tts:false puts them back into the main take). Keeping them out of the main take keeps its text, and so its TTS
 * cache key and every existing line's audio, exactly as before the hook was added.
 */
export function standaloneHookLines(spec: QuizSpec): string[] {
  if (spec.hook?.tts === false) return [];
  return [...new Set(spec.rounds.filter(r => r.type === 'hook_intro').flatMap(r => [r.params.line, ...(r.pre_lines ?? [])]).filter(Boolean) as string[])];
}

/** The lines (id, TTS text, caption) a take sends. exclude/only pick lines: the main take excludes standalone hook lines. */
export function takeLines(script: Script, opts: { textOverride?: Record<string, string>; exclude?: string[]; only?: string[] } = {}) {
  return spoken(script).filter(l => !opts.exclude?.includes(l.id) && (!opts.only || opts.only.includes(l.id)))
    .map(l => ({ id: l.id, text: opts.textOverride?.[l.id] ?? l.narration_ar!, caption: l.caption_ar }));
}

/** The full narration as ONE take (tts_text_single_request), then aligned to lines with caption words.
 *  tag names the raw file (take_… for the main take, hook_… for the standalone hook line). */
export async function fullTake(spec: QuizSpec, script: Script, dir: string, productionId: string, opts: { textOverride?: Record<string, string>; exclude?: string[]; only?: string[]; tag?: string; retake?: string | number } = {}) {
  const vdir = path.join(dir, 'voice'); fs.mkdirSync(vdir, { recursive: true });
  const ls = takeLines(script, opts);
  if (!ls.length) throw new Error(`no spoken lines for this take${opts.only ? ` (${opts.only.join(',')})` : ''}`);
  const text = takeText(ls);
  const t = await synthesize(text, spec.narration.voice, takeStyle(spec, script), { productionId, retake: opts.retake });
  // raw take named by its TTS cache key, so every take a render used stays on disk (rights provenance by sha256)
  const raw = path.join(vdir, `${opts.tag ?? 'take'}_${spec.narration.voice}_${spec.narration.dialect}_${path.basename(t.file, '.wav')}.wav`);
  fs.copyFileSync(t.file, raw);
  // Tighten the take before alignment: pauses longer than max_pause shrink to max_pause (TTS leaves 0.4-0.9 s gaps,
  // including inside lines), then a gentle pitch-preserving tempo. Alignment runs on the tightened audio, so word
  // times match what is heard.
  const tempo = spec.narration.tempo ?? 1.0, maxPause = spec.narration.max_pause ?? 0.3;
  const wav = raw.replace(/\.wav$/, `.t${tempo}_p${maxPause}.wav`);
  await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=${maxPause}:stop_threshold=-42dB:stop_silence=${maxPause}${tempo !== 1 ? `,atempo=${tempo}` : ''}`, '-ar', '24000', '-ac', '1', wav]);
  const alPath = wav.replace(/\.wav$/, '.align.json');
  const al = await align(wav, ls, alPath);
  return { wav, alignPath: alPath, cached: t.cached, model: t.model, align: al.result, cacheFile: t.file };
}

/**
 * The hook line(s) as a separate standalone TTS request: same voice, dialect, style, tempo and pause tightening as the
 * main take, cached on its own key (rebuilds cost nothing). null when the production has no standalone hook line.
 */
export async function hookTake(spec: QuizSpec, script: Script, dir: string, productionId: string, opts: { textOverride?: Record<string, string> } = {}) {
  const ids = standaloneHookLines(spec).filter(id => script.lines.find(l => l.id === id)?.narration_ar);
  if (!ids.length) return null;
  return { ids, ...(await fullTake(spec, script, dir, productionId, { ...opts, only: ids, tag: 'hook', retake: spec.narration.hook_retake ?? process.env.QUIZ_HOOK_RETAKE })) };
}

/** TTS cache key, same formula as packages/voice synthesize() (text + voice + style). */
export const ttsKey = (text: string, voice: string, style: string | undefined) => crypto.createHash('sha256').update(JSON.stringify({ text, voice, style })).digest('hex').slice(0, 24);

/**
 * Cut the take into one clip per line (line window + small pads, short fades). Returns measured durations and the
 * caption words relative to each clip's start.
 */
export async function splitTake(wav: string, alignRes: any, outDir: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const clips: Record<string, { file: string; dur: number; words: { w: string; s: number; e: number }[]; subs: any[]; speechEnd: number }> = {};
  const L = alignRes.lines as any[];
  for (const [i, l] of L.entries()) {
    if (l.start == null) throw new Error(`line ${l.id} not found in the take`);
    const prevEnd = i > 0 ? L[i - 1].end : 0, nextStart = i < L.length - 1 ? L[i + 1].start : alignRes.duration;
    const s0 = Math.max(prevEnd + 0.02, l.start - 0.06), s1 = Math.min(nextStart - 0.02, l.end + 0.12);
    const file = path.join(outDir, `narr_${String(i).padStart(2, '0')}_${l.id}.wav`);
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', s0.toFixed(3), '-to', s1.toFixed(3), '-i', wav, '-af', 'afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', file]);
    clips[l.id] = { file, dur: +(s1 - s0).toFixed(3), words: l.words.map((w: any) => ({ w: w.w, s: +(w.s - s0).toFixed(3), e: +(w.e - s0).toFixed(3) })), subs: l.subs ?? [], speechEnd: +(l.end - s0).toFixed(3) };
  }
  return clips;
}
