/**
 * quizlong:plan <id>: validate episode.json and print the timeline. Lines whose text is unchanged since the newest voiced
 * build (vN/show.json without `estimated`) use that build's measured speech duration (real audio, no TTS call); every other
 * line is estimated at 2.5 words/s. No TTS, no render.
 */
import fs from 'node:fs';
import path from 'node:path';
import { isSpeed, loadEpisode, selectQuestions, takeGroups, validateEpisode, type Episode } from './episode.ts';
import { buildShow, mmss, T, type Timings } from './show.ts';

/** Measured durations of unchanged lines from the newest voiced build (show.json host lines: id, text, t, end). */
function measuredTimings(ep: Episode, dir: string): { timing: Timings; from: string | null; measured: number; estimated: number } {
  const want = new Map(takeGroups(ep).flatMap(g => g.lines).map(l => [l.id, l.text.trim()]));
  const vs = fs.readdirSync(dir).map(d => /^v(\d+)$/.exec(d)).filter(Boolean).map(m => +m![1]).sort((a, b) => b - a);
  for (const n of vs) {
    const f = path.join(dir, `v${n}`, 'show.json');
    if (!fs.existsSync(f)) continue;
    let s: any; try { s = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    if (s.estimated || s.partial) continue;
    const timing: Timings = {};
    for (const seg of s.segments ?? []) for (const h of seg.host ?? []) if (want.get(h.id) === String(h.text ?? '').trim()) timing[h.id] = { dur: +(h.end - h.t).toFixed(3) };
    const measured = Object.keys(timing).length;
    return { timing, from: `v${n}`, measured, estimated: want.size - measured };
  }
  return { timing: {}, from: null, measured: 0, estimated: want.size };
}

export function planQuizLong(productionId: string, opts: { only?: string; withCards?: boolean } = {}) {
  const { ep, file, dir } = loadEpisode(productionId);
  const v = validateEpisode(ep);
  if (v.errors.length) return { ok: false, file, errors: v.errors, warnings: v.warnings };
  const mt = measuredTimings(ep, dir);
  const b = buildShow(ep, mt.timing, { only: selectQuestions(ep, opts.only), withCards: opts.withCards, estimate: mt.estimated > 0 });
  const f1 = (x: number) => x.toFixed(1).padStart(5);
  const rows = b.show.segments.map((s: any) => {
    const head = `${mmss(s.start)}.${String(Math.floor((s.start % 1) * 10))} ${f1(s.end - s.start)} s  `;
    if (s.type === 'question') return `${head}${s.id} L${s.level} ${s.mechanic.padEnd(9)}${s.speed_index ? ` speed ${s.speed_index}/${s.speed_total}` : ''} timer@${f1(s.t.timer_start - s.start)} ${s.think_s}s reveal ${f1(s.t.reveal - s.start)}${s.t.learn_in != null ? ` learn ${f1(s.t.learn_in - s.start)}` : ''} out ${f1(s.t.out - s.start)}${s.hints?.length ? ` hints@${s.hints.map((h: any) => (h.t - s.start).toFixed(1)).join(',')}` : ''}${s.answers ? ` answers@${s.answers.map((a: any) => (a.t - s.start).toFixed(1)).join(',')}` : ''}  | ${s.host.map((h: any) => h.id.replace(`${s.id}.`, '')).join(' ')}`;
    return `${head}${s.type}${s.kind ? ':' + s.kind : ''} ${s.title ?? s.text ?? ''}  | ${(s.host ?? []).map((h: any) => h.id).join(' ')}`;
  });
  const total = b.total;
  const range = total >= 480 && total <= 720 ? 'inside 8:00-12:00' : `OUTSIDE the 8:00-12:00 range`;
  const qsegs = b.show.segments.filter((s: any) => s.type === 'question');
  const std = qsegs.filter((s: any) => !isSpeed(s));
  const qd = std.map((s: any) => s.end - s.start);
  const cardsOf = (kind: string) => b.show.segments.filter((s: any) => s.type === 'card' && s.kind === kind).map((s: any) => `${s.id} ${(s.end - s.start).toFixed(2)} s`);
  const errors: string[] = [];
  // assert: spoken ending (q40 reveal hold end -> last word) <= 15 s
  if (b.ending_spoken_s != null && b.ending_spoken_s > T.spokenEndingMax) errors.push(`spoken ending ${b.ending_spoken_s} s > ${T.spokenEndingMax} s`);
  return {
    ok: errors.length === 0, file, ...(errors.length ? { errors } : {}),
    timings: mt.from ? `real audio from ${mt.from} for ${mt.measured} unchanged lines, ${mt.estimated} lines estimated at 2.5 words/s` : 'estimate (2.5 words/s, no voiced build yet)',
    total_s: total, total: mmss(total), range: opts.only ? 'partial (--only)' : range,
    questions: qsegs.length,
    standard_question_s: qd.length ? { n: qd.length, min: +Math.min(...qd).toFixed(1), mean: +(qd.reduce((a, c) => a + c, 0) / qd.length).toFixed(2), max: +Math.max(...qd).toFixed(1), over_15s: qd.filter(x => x > 15).length } : null,
    level_cards: cardsOf('level'), speed_cards: cardsOf('speed'),
    spoken_ending_s: b.ending_spoken_s,
    spoken_lines: b.lines.length, sfx_cues: b.sfx.length,
    tts_takes: takeGroups(ep).map(g => `${g.key}: ${g.lines.length} lines, ${g.lines.reduce((a, l) => a + l.text.split(/\s+/).filter(Boolean).length, 0)} words`),
    chapters: b.chapters.map(c => `${mmss(c.t)} ${c.title}`),
    timeline: rows,
    warnings: [...v.warnings, ...b.warnings],
  };
}
