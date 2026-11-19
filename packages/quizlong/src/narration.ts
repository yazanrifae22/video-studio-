/**
 * quiz-long narration: one TTS request per take group (5 questions, plus one for the cards/ending; episode.ts takeGroups),
 * cached by text + voice + style (packages/voice synthesize), pause-tightened like the quiz builder, aligned with the Arabic
 * aligner (GPU-locked) and cut into one clip per line (packages/quiz splitTake). Never retakes on its own: a bad take is
 * re-rolled by adding episode.voice.retakes = { "<group key>": "<salt>" } (new cache key), on an operator's decision.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { synthesize } from '../../voice/src/gemini-tts.ts';
import { align, splitTake, takeText } from '../../quiz/src/narration.ts';
import { takeGroups, type Episode } from './episode.ts';
import type { Timings } from './show.ts';

const run = promisify(execFile);

export interface Clip { file: string; dur: number; words: { w: string; s: number; e: number }[]; subs: any[]; speechEnd: number; lead: number }
export interface TakeInfo { key: string; lines: number; cached: boolean; model: string; wav: string; align: string; wer: number; asr_head: string; first_line_start: number; flags: string[] }

const MAX_PAUSE = 0.3;

export async function narrate(ep: Episode, dir: string, vdir: string, productionId: string, opts: { qids?: Set<string> | null; withCards?: boolean; voice?: string; style?: string; agent?: string; note?: (m: string, l?: 'info' | 'warn') => void } = {}) {
  const voice = opts.voice ?? ep.voice?.name ?? 'Zephyr';
  const style = opts.style ?? ep.voice?.style;
  const groups = takeGroups(ep).filter(g => g.key === 'cards' ? opts.withCards !== false : !opts.qids || g.qids.some(q => opts.qids!.has(q)));
  const vd = path.join(dir, 'voice'); fs.mkdirSync(vd, { recursive: true });
  const clips: Record<string, Clip> = {};
  const takes: TakeInfo[] = [];
  for (const g of groups) {
    const text = takeText(g.lines);
    const t = await synthesize(text, voice, style, { productionId, retake: ep.voice?.retakes?.[g.key] });
    const raw = path.join(vd, `long_${g.key}_${voice}_${path.basename(t.file, '.wav')}.wav`);
    fs.copyFileSync(t.file, raw);
    // pauses longer than MAX_PAUSE shrink to it (TTS leaves 0.4-0.9 s gaps); alignment runs on the tightened audio
    const wav = raw.replace(/\.wav$/, `.p${MAX_PAUSE}.wav`);
    await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `silenceremove=start_periods=1:start_threshold=-45dB:stop_periods=-1:stop_duration=${MAX_PAUSE}:stop_threshold=-42dB:stop_silence=${MAX_PAUSE}`, '-ar', '24000', '-ac', '1', wav]);
    const alPath = wav.replace(/\.wav$/, '.align.json');
    const al = (await align(wav, g.lines, alPath, opts.agent)).result;
    // opening check of every take: Gemini fallback models sometimes read the style preamble aloud before line 1
    const L0 = al.lines?.[0];
    const flags: string[] = [];
    if (L0?.start == null || L0.start > 1.2) flags.push(`first line starts at ${L0?.start ?? '?'} s (spoken style preamble?)`);
    if ((L0?.wer ?? 0) > 0.34) flags.push(`first line WER ${Math.round(L0.wer * 100)} % ("${String(L0.asr ?? '').slice(0, 60)}")`);
    if (al.wer > 0.15) flags.push(`take WER ${Math.round(al.wer * 100)} %`);
    const info: TakeInfo = { key: g.key, lines: g.lines.length, cached: !!t.cached, model: String(t.model ?? ''), wav, align: alPath, wer: al.wer, asr_head: String(al.asr_text ?? '').slice(0, 120), first_line_start: L0?.start ?? -1, flags };
    takes.push(info);
    opts.note?.(`Take ${g.key}: ${g.lines.length} lines, ${t.cached ? 'cached' : `generated (${t.model})`}, WER ${Math.round(al.wer * 100)} %${flags.length ? ' -- CHECK: ' + flags.join('; ') : ''}`, flags.length ? 'warn' : 'info');
    if (L0?.start == null || L0.start > 2.0) throw new Error(`take ${g.key}: speech before the first line (${L0?.start ?? 'line not found'} s; ASR "${info.asr_head}") -- a spoken style preamble? Listen to ${raw}; re-roll with episode.voice.retakes["${g.key}"] = "<salt>"`);
    const cs = await splitTake(wav, al, path.join(vdir, 'narration', g.key));
    for (const [id, c] of Object.entries(cs)) clips[id] = { ...c, lead: c.words[0]?.s ?? 0.06 };
  }
  return { clips, takes, voice, style };
}

/** Clip -> show timing: speech duration from the first word onset, word times relative to the onset. */
export function timingsOf(clips: Record<string, Clip>): Timings {
  return Object.fromEntries(Object.entries(clips).map(([id, c]) => [id, { dur: Math.max(0.2, +(c.speechEnd - c.lead).toFixed(3)), words: c.words.map(w => ({ w: w.w, s: +(w.s - c.lead).toFixed(3), e: +(w.e - c.lead).toFixed(3) })) }]));
}
