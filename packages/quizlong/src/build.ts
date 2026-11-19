/**
 * quiz-long builder (quiz-ar LONG-FORM, 16:9 1920x1080 30 fps, 8-12 min, 40 questions): `quizlong:build <id>`.
 * episode.json -> narration (one cached TTS take per 5 questions + one for cards/ending, aligned, cut per line)
 * -> show.json (show-contract: research/quiz-longform-2026-11-12/show-contract.md) -> template page frames (__seek per frame,
 * parallel headless Chrome, NVENC) = picture.mp4 -> audio stems (narration, SFX, ducked music bed) -> render.timeline.json
 * -> packages/render (ffmpeg) -> master (-14 LUFS) -> techqa. Silent mode (--no-tts) estimates speech at 2.5 words/s.
 * Outputs in productions/<id>/vN/: show.json, render.timeline.json, picture.mp4, render.raw.mp4, render.mp4, narration/,
 * chapters.txt, captions.srt (+ captions.json), audio/, qa/, build.json (timings per stage), pipeline.json at the production root.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { renderTimeline } from '../../render/src/render.ts';
import type { Timeline, Track } from '../../render/src/timeline.ts';
import { loadEpisode, selectQuestions, validateEpisode } from './episode.ts';
import { buildShow, chaptersText, srtText, type Placed } from './show.ts';
import { narrate, timingsOf, type Clip } from './narration.ts';
import { capturePicture, resolveTemplate } from './capture.ts';
import { applyEnvelope, dbToGain, decode, lufs, mixInto, peak, rmsDb, SR, writeWav } from './mix.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const SYNTH = path.join(P.root, 'packages', 'quiz', 'py', 'synth_audio.py');
const TECHQA = path.join(P.root, 'packages', 'intelligence', 'py', 'techqa.py');
const SFX_DIR = path.join(P.data, 'brand', 'quiz-ar', 'sfx');
const SFX_NAMES = ['tick', 'tick_last', 'whoosh', 'pop', 'ding', 'shimmer', 'sting'];
const FPS = 30, W = 1920, H = 1080;

export interface QuizLongOptions { agent?: string; noTts?: boolean; skipRender?: boolean; only?: string; withCards?: boolean; template?: string; workers?: number }

function pipeline(dir: string, patch: Record<string, any>) {
  const f = path.join(dir, 'pipeline.json');
  const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const merged = { ...cur, ...patch, ...(patch.voice ? { voice: { ...(cur.voice ?? {}), ...patch.voice } } : {}), ...(patch.render ? { render: { ...(cur.render ?? {}), ...patch.render } } : {}) };
  fs.writeFileSync(f, JSON.stringify(merged, null, 1));
}

export async function buildQuizLong(productionId: string, opts: QuizLongOptions = {}) {
  const agent = opts.agent ?? 'render';
  const t00 = Date.now();
  const stages: Record<string, number> = {};
  const stage = async <X>(name: string, fn: () => Promise<X>): Promise<X> => { const t = Date.now(); try { return await fn(); } finally { stages[name] = +((Date.now() - t) / 1000).toFixed(1); } };
  const { ep, dir } = loadEpisode(productionId);
  const v = validateEpisode(ep);
  if (v.errors.length) throw new Error(`episode.json invalid (run quizlong:plan): ${v.errors.slice(0, 6).join('; ')}`);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(productionId) as any;
  if (!prod) throw new Error(`production ${productionId} not found`);
  const only = selectQuestions(ep, opts.only);
  const n = (prod.version ?? 0) + 1;
  const vdir = path.join(dir, `v${n}`);
  fs.mkdirSync(path.join(vdir, 'qa'), { recursive: true });
  const log: string[] = [];
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[quizlong] ${m}`); try { emit({ kind: 'build.step', agent, productionId, level, message: m }); } catch { /* events busy */ } };
  note(`quiz-long build v${n} started (${only ? `partial: ${[...only].join(',')}${opts.withCards ? ' + cards' : ''}` : `${ep.questions.length} questions`}${opts.noTts ? ', silent: no TTS' : ''})`);
  for (const w of v.warnings) note(`episode: ${w}`, 'warn');
  db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, productionId);

  /* 1. SFX library (shared with the quiz builder) */
  if (SFX_NAMES.some(s => !fs.existsSync(path.join(SFX_DIR, `${s}.wav`)))) { await run(PY, ['-I', SYNTH, 'sfx', SFX_DIR]); note('Synthesized the SFX library'); }

  /* 2. narration (chunked takes) -> measured timings */
  let clips: Record<string, Clip> | null = null;
  let narrInfo: any = null;
  if (!opts.noTts) {
    pipeline(dir, { voice: { status: 'generating', name: ep.voice?.name ?? 'Zephyr', dialect: 'levantine' } });
    const nr = await stage('tts_align', () => narrate(ep, dir, vdir, productionId, { qids: only, withCards: !only || !!opts.withCards, agent, note }));
    clips = nr.clips;
    narrInfo = { voice: nr.voice, takes: nr.takes };
    const flags = nr.takes.flatMap(t => t.flags.map(f => `${t.key}: ${f}`));
    pipeline(dir, { voice: { status: 'aligned', takes: nr.takes.length, asr_flags: flags } });
  }

  /* 3. show.json + chapters + captions */
  const B = buildShow(ep, clips ? timingsOf(clips) : {}, { only, withCards: opts.withCards, estimate: !clips });
  for (const w of B.warnings) note(`timing: ${w}`, 'warn');
  if (clips) { const missing = B.lines.filter(l => !clips![l.id]).map(l => l.id); if (missing.length) throw new Error(`no narration clip for ${missing.slice(0, 6).join(', ')}`); }
  const showFile = path.join(vdir, 'show.json');
  fs.writeFileSync(showFile, JSON.stringify(B.show, null, 1), 'utf8');
  fs.writeFileSync(path.join(vdir, 'chapters.txt'), chaptersText(B.chapters), 'utf8');
  fs.writeFileSync(path.join(vdir, 'captions.srt'), srtText(B.lines), 'utf8');
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(B.lines.map(l => ({ t0: l.at, t1: l.end, text: l.text, line: l.id })), null, 1), 'utf8');
  const N = Math.round(B.total * FPS);
  note(`show.json: ${B.show.segments.length} segments, ${B.lines.length} spoken lines, ${B.sfx.length} SFX cues, ${B.total.toFixed(2)} s (${N} frames)${clips ? '' : ' -- silent estimate'}`);

  /* 4. audio stems: narration, SFX, music bed (ducked under the voice) */
  const audioDir = path.join(vdir, 'audio'); fs.mkdirSync(audioDir, { recursive: true });
  const stems = await stage('audio', () => mixStems(B, clips, audioDir, ep.music?.bpm ?? 112, note));

  /* 5. render timeline: V1 picture (template frames) - A narration - A SFX - A music */
  const picture = path.join(vdir, 'picture.mp4');
  const audioTrack = (name: string, src: string | null): Track => ({ name, kind: 'audio', items: src ? [{ type: 'audio', name, src, fromFrame: 0, durationInFrames: N }] : [] });
  const timeline: Timeline = {
    version: 1, width: W, height: H, fps: FPS, durationInFrames: N, background: 'black',
    tracks: [{ name: 'Picture', kind: 'video', items: [{ type: 'video', name: 'picture', src: picture, fromFrame: 0, durationInFrames: N, volume: 0, width: W, height: H }] },
      audioTrack('Narration', stems.narration), audioTrack('SFX', stems.sfx), audioTrack('Music', stems.bed)],
    meta: { production_id: productionId, version: n, builder: 'packages/quizlong/src/build.ts', agent, brand: 'quiz-ar', format: 'quiz-long', show: 'show.json', partial: !!only },
  };
  fs.writeFileSync(path.join(vdir, 'render.timeline.json'), JSON.stringify(timeline, null, 1), 'utf8');
  const template = resolveTemplate(opts.template);
  const report: any = { version: n, engine: 'ffmpeg', format: 'quiz-long', duration: B.total, frames: N, partial: only ? [...only] : null, with_cards: only ? !!opts.withCards : undefined, silent: !clips, template: path.relative(P.root, template),
    segments: B.show.segments.length, questions: B.show.segments.filter((s: any) => s.type === 'question').length, spoken_lines: B.lines.length, sfx_cues: B.sfx.length, chapters: B.chapters, narration: narrInfo, stems: stems.info, log, stages };
  db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET captions_path=excluded.captions_path, notes=excluded.notes`)
    .run(productionId, n, path.join(vdir, 'captions.json'), J.str(report));
  db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, productionId);
  if (opts.skipRender) { report.build_seconds = Math.round((Date.now() - t00) / 1000); fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(report, null, 1)); return report; }

  /* 6. picture (template page, one frame per __seek) -> 7. compositor -> master -> techqa; one render at a time */
  const raw = path.join(vdir, 'render.raw.mp4'), final = path.join(vdir, 'render.mp4');
  try {
    await withLock('render', agent, async () => {
      pipeline(dir, { visuals: 'rendering', render: { status: 'capturing', progress: 0 } });
      note(`Capturing ${N} frames from ${path.relative(P.root, template)}\\frame.html`);
      report.capture = await stage('capture', () => capturePicture({ templateDir: template, showFile, out: picture, frames: N, fps: FPS, width: W, height: H, workers: opts.workers,
        onProgress: f => pipeline(dir, { render: { status: 'capturing', progress: +(f * 0.7).toFixed(2) } }) }));
      note(`Picture: ${N} frames in ${report.capture.seconds} s (${report.capture.capture_fps} frames/s, ${report.capture.workers} workers, ${report.capture.ms_per_frame_per_worker} ms/frame/worker, GL ${report.capture.gl})`);
      for (const l of report.capture.template_lint ?? []) note(`template: ${l}`, 'warn');
      pipeline(dir, { visuals: 'done', render: { status: 'rendering', progress: 0.7 } });
      const rr = await stage('render', () => renderTimeline(timeline, raw, { workDir: path.join(vdir, 'render-work'), onProgress: f => pipeline(dir, { render: { status: 'rendering', progress: +(0.7 + f * 0.25).toFixed(2) } }) }));
      if (rr.textSafety) note(`Text safety: ${rr.textSafety.summary}`);
    });
  } catch (e) { pipeline(dir, { render: { status: 'failed', progress: 0 } }); throw e; }
  await stage('master', () => master(raw, final));
  note('Mastered audio to -14 LUFS, true peak <= -2 dBTP target + limiter (picture untouched)');
  const full = !only;
  await stage('techqa', () => run(PY, ['-I', TECHQA, final, path.join(vdir, 'qa'), '--size', `${W}x${H}`, '--expect-duration', B.total.toFixed(2), ...(B.show.segments.some((s: any) => s.type === 'end') ? ['--end-hold', '8'] : []),
    '--sheet-step', B.total > 120 ? '10' : '1.5', '--freeze-min', '6'], { maxBuffer: 1 << 26, timeout: 3600_000 }));
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  // quiz-long: runtime band 8:00-12:00 on full episodes (longform-rules G1)
  if (full) { tq.checks.runtime_8_to_12_min = tq.duration >= 480 && tq.duration <= 720; if (!tq.checks.runtime_8_to_12_min) { tq.pass = false; tq.failed = [...(tq.failed ?? []), 'runtime_8_to_12_min']; } }
  fs.writeFileSync(path.join(vdir, 'qa', 'techqa.json'), JSON.stringify(tq, null, 1));
  report.render = final; report.techqa = { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs, duration: tq.duration, bytes: tq.bytes };
  report.build_seconds = Math.round((Date.now() - t00) / 1000);
  db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=?, notes=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), J.str(report), productionId, n);
  pipeline(dir, { render: { status: 'done', progress: 1, file: final, version: n } });
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(report, null, 1));
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) -- technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}`, tq.pass ? 'success' : 'warn');
  return report;
}

/** Lay narration clips, SFX cues and the synth bed into three stems (48 kHz mono 16-bit), no clipping, bed ducked ~10 dB under speech. */
async function mixStems(B: ReturnType<typeof buildShow>, clips: Record<string, Clip> | null, audioDir: string, bpm: number, note: (m: string, l?: 'info' | 'warn') => void) {
  const len = Math.ceil(B.total * SR);
  const narr = new Float32Array(len), sfx = new Float32Array(len);
  const placed = new Map<string, Placed>(B.lines.map(l => [l.id, l]));
  if (clips) for (const l of B.lines) { const c = clips[l.id]; mixInto(narr, await decode(c.file), l.at - c.lead); }
  let lowered = 0;
  for (const c of B.sfx) {
    const x = await decode(path.join(SFX_DIR, `${c.name}.wav`));
    let g = c.gain_db;
    // a cue tied to a line (the reveal ding) sits >= 5 dB under that line's first 0.5 s of speech
    if (clips && c.under && clips[c.under] && placed.get(c.under)) { const vL = rmsDb(await decode(clips[c.under].file), clips[c.under].lead, 0.5), sL = rmsDb(x, 0, 0.5); const g2 = Math.min(g, vL - sL - 5); if (g2 < g - 0.05) lowered++; g = g2; }
    mixInto(sfx, x, c.at, dbToGain(g));
  }
  if (lowered) note(`${lowered} reveal ding(s) lowered to stay 5 dB under their reveal line`);
  const bedRaw = path.join(audioDir, 'bed.synth.wav');
  await run(PY, ['-I', SYNTH, 'bed', bedRaw, B.total.toFixed(3), '--hits', B.reveals.map(x => x.toFixed(2)).join(',') || '0', '--bpm', String(bpm)], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const bedL = await lufs(bedRaw);
  if (!(bedL >= -30 && bedL <= -12)) throw new Error(`music bed measures ${bedL.toFixed(1)} LUFS (expected -30...-12): synth fault, refusing to mix (${bedRaw})`);
  const bedSrc = await decode(bedRaw);
  const bed = new Float32Array(len); bed.set(bedSrc.subarray(0, Math.min(len, bedSrc.length)));
  fs.rmSync(bedRaw, { force: true });   // ~115 MB per 10 min; bed.wav (ducked) is the stem the timeline uses
  const narrFile = clips ? path.join(audioDir, 'narration.wav') : null;
  if (narrFile) writeWav(narrFile, narr);
  const voiceL = narrFile ? await lufs(narrFile) : -18;
  const open = Math.min(1, dbToGain(voiceL - 6 - bedL)), duck = Math.min(1, dbToGain(voiceL - 16 - bedL));
  const keys: { t: number; g: number }[] = [{ t: 0, g: open }];
  if (clips) {
    const spans: [number, number][] = [];
    for (const l of B.lines) { const a = l.at - 0.15, b = l.end + 0.2; if (spans.length && a <= spans[spans.length - 1][1] + 0.3) spans[spans.length - 1][1] = b; else spans.push([a, b]); }
    for (const [a, b] of spans) keys.push({ t: Math.max(0.001, a), g: open }, { t: a + 0.15, g: duck }, { t: b, g: duck }, { t: b + 0.3, g: open });
  }
  applyEnvelope(bed, keys);
  // no clipping: the stems' sum stays <= -0.5 dBFS (scaled together when it would not)
  const sum = new Float32Array(len); for (let i = 0; i < len; i++) sum[i] = narr[i] + sfx[i] + bed[i];
  const pk = peak(sum), lim = dbToGain(-0.5);
  const scale = pk > lim ? lim / pk : 1;
  if (scale < 1) { for (const x of [narr, sfx, bed]) for (let i = 0; i < len; i++) x[i] *= scale; note(`Stems scaled by ${(20 * Math.log10(scale)).toFixed(1)} dB (sum peak ${(20 * Math.log10(pk)).toFixed(1)} dBFS) to avoid clipping`, 'warn'); if (narrFile) writeWav(narrFile, narr); }
  const sfxFile = path.join(audioDir, 'sfx.wav'), bedFile = path.join(audioDir, 'bed.wav');
  writeWav(sfxFile, sfx); writeWav(bedFile, bed);
  const info = { voice_lufs: +voiceL.toFixed(1), bed_lufs: +bedL.toFixed(1), bed_open_db: +(20 * Math.log10(open)).toFixed(1), bed_duck_db: +(20 * Math.log10(duck)).toFixed(1), duck_spans: clips ? (keys.length - 1) / 4 : 0, sum_peak_dbfs: +(20 * Math.log10(Math.max(1e-9, pk * scale))).toFixed(1) };
  note(`Stems: voice ${info.voice_lufs} LUFS${clips ? '' : ' (assumed, silent)'}, bed ${info.bed_lufs} LUFS -> ${info.bed_open_db} dB open / ${info.bed_duck_db} dB ducked, sum peak ${info.sum_peak_dbfs} dBFS`);
  return { narration: narrFile, sfx: sfxFile, bed: bedFile, info };
}
