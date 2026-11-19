import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { withLock } from '../../intelligence/src/analyze.ts';
import { master } from '../../occ/src/build.ts';
import { TimelineRecorder } from '../../render/src/recorder.ts';
import { renderTimeline } from '../../render/src/render.ts';
import { hintDurations, lineOf, loadSpec, type LineDurations } from './spec.ts';
import { pool, renderCleanStill, renderHF, resolve, WORK, writeRound } from './compose.ts';
import { ART_NOTES } from './templates.ts';
import { arabicForms, onsetLeads, pageWords, speechActivity, writeCaptionsProject, type Word } from './captions.ts';
import { align, fullTake, hookTake, splitTake, spoken, standaloneHookLines } from './narration.ts';
import { endcardFade } from './endcard.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const SYNTH = path.join(P.root, 'packages', 'quiz', 'py', 'synth_audio.py');
const TECHQA = path.join(P.root, 'packages', 'intelligence', 'py', 'techqa.py');
const SIGNATURE = path.join(P.data, 'brand', 'quiz-ar', 'signature');
const SFX_NAMES = ['tick', 'tick_last', 'whoosh', 'swap', 'pop', 'ding', 'shimmer', 'sting', 'flip'];

/** The edit is recorded into render.timeline.json and rendered by packages/render (ffmpeg); OpenChatCut retired 2026-11-02. */
export interface QuizBuildOptions { agent?: string; noTts?: boolean; skipRender?: boolean; onlyVisuals?: boolean }

const dbToGain = (db: number) => Math.pow(10, db / 20);

async function lufs(file: string): Promise<number> {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const s = String(stderr); const m = /I:\s+(-?[\d.]+) LUFS/.exec(s.slice(s.lastIndexOf('Summary:')));
  return m ? parseFloat(m[1]) : -70;
}

/** pipeline.json drives the studio dashboard's progress card for this production. */
function pipeline(dir: string, patch: Record<string, any>) {
  const f = path.join(dir, 'pipeline.json');
  const cur = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  const merged = { ...cur, ...patch, ...(patch.voice ? { voice: { ...(cur.voice ?? {}), ...patch.voice } } : {}), ...(patch.render ? { render: { ...(cur.render ?? {}), ...patch.render } } : {}) };
  fs.writeFileSync(f, JSON.stringify(merged, null, 1));
}

/** Allocate items to lanes so no two items on one track overlap (a track item never overlaps another on the same track). */
function lanes<T extends { from: number; dur: number }>(items: T[]): T[][] {
  const out: T[][] = [];
  for (const it of [...items].sort((a, b) => a.from - b.from)) {
    let k = out.findIndex(l => l.every(o => o.from + o.dur <= it.from || o.from >= it.from + it.dur));
    if (k < 0) { out.push([]); k = out.length - 1; }
    out[k].push(it);
  }
  return out;
}

function checked(r: any, what: string) {
  const bad = (r?.results ?? []).filter((x: any) => x?.ok === false);
  if (r?.ok === false || bad.length) throw new Error(`timeline rejected ${what}: ${JSON.stringify(bad.length ? bad.slice(0, 3) : r).slice(0, 600)}`);
  return r;
}

export async function buildQuiz(productionId: string, opts: QuizBuildOptions = {}) {
  const agent = opts.agent ?? 'render';
  const t00 = Date.now();
  const { spec, script, dir } = loadSpec(productionId);
  const prod = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(productionId) as any;
  if (!prod) throw new Error(`production ${productionId} not found`);
  const fps = spec.fps;
  const n = (prod.version ?? 0) + 1;
  const vdir = path.join(dir, `v${n}`);
  const work = path.join(WORK, productionId, `v${n}`);
  fs.mkdirSync(vdir, { recursive: true });
  const log: string[] = [];
  const note = (m: string, level: 'info' | 'warn' | 'success' = 'info') => { log.push(m); console.error(`[quiz] ${m}`); emit({ kind: 'build.step', agent, productionId, level, message: m }); };
  note(`Quiz build v${n} started (${spec.rounds.length} rounds${opts.noTts ? ', silent: no TTS' : ''})`);
  db().prepare(`UPDATE productions SET current_state='editing', updated_at=datetime('now'), data=json_set(data,'$.built_by',?) WHERE production_id=?`).run(agent, productionId);

  /* 1. SFX library (synthesized once, reused by every quiz) */
  const sfxDir = path.join(P.root, spec.sfx_dir);
  if (SFX_NAMES.some(s => !fs.existsSync(path.join(sfxDir, `${s}.wav`)))) { await run(PY, ['-I', SYNTH, 'sfx', sfxDir]); note('Synthesized the SFX library'); }

  const HOOK_SFX = ['hook_slam', 'hook_riser', 'hook_blink', 'hook_lock', 'hook_alarm', 'hook_roll'];
  if (spec.rounds.some(r => r.type === 'hook_intro') && HOOK_SFX.some(s => !fs.existsSync(path.join(sfxDir, `${s}.wav`)))) { await run(PY, ['-I', path.join(P.root, 'packages', 'quiz', 'py', 'synth_hook_sfx.py'), sfxDir]); note('Synthesized the hook-intro SFX'); }

  /* 2. narration: one take (cached by text+voice+style) → align → per-line clips; or script hints when silent */
  let dur: LineDurations = hintDurations(script);
  let clips: Awaited<ReturnType<typeof splitTake>> | null = null;
  let narrInfo: any = null;
  if (!opts.noTts) {
    pipeline(dir, { voice: { status: 'generating', name: spec.narration.voice, dialect: spec.narration.dialect } });
    // hook_intro lines are voiced by their own standalone request (same voice/dialect/style), so the main take's text,
    // cache key and every existing line's audio stay exactly as they were before the hook was added
    const hookIds = standaloneHookLines(spec);
    const take = await fullTake(spec, script, dir, productionId, { textOverride: spec.narration.take_text, exclude: hookIds });
    note(take.cached ? `Narration reused from cache (${spec.narration.voice}, no quota used)` : `Narration generated (${take.model}, ${spec.narration.voice})`);
    clips = await splitTake(take.wav, take.align, path.join(vdir, 'narration'));
    const hk = await hookTake(spec, script, dir, productionId, { textOverride: spec.narration.take_text });
    if (hk) {
      Object.assign(clips, await splitTake(hk.wav, hk.align, path.join(vdir, 'narration', 'hook')));
      note(`Hook line ${hk.ids.join(',')} voiced on its own (${hk.cached ? 'cached' : `generated, ${hk.model}`}; main take untouched)`);
    }
    // pinned lines: replace a line's clip by a region of an existing (sha-checked) audio file — fixes one bad line
    // without a new take. quiz.json narration.pins = { "<lineId>": { "file": "voice/x.wav", "sha256": "…", "from": s, "to": s } }
    for (const [lid, pin] of Object.entries(spec.narration.pins ?? {})) {
      const src = path.resolve(dir, pin.file);
      const got = crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
      if (pin.sha256 && got !== pin.sha256) throw new Error(`narration pin ${lid}: ${pin.file} sha256 ${got.slice(0, 12)}… does not match the pinned ${pin.sha256.slice(0, 12)}…`);
      const ln = lineOf(script, lid);
      if (!ln?.narration_ar) throw new Error(`narration pin ${lid}: no such spoken line`);
      const out = path.join(vdir, 'narration', `pin_${lid}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(pin.from ?? 0), ...(pin.to != null ? ['-to', String(pin.to)] : []), '-i', src, '-af', 'afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse', '-ar', '48000', '-ac', '2', out]);
      const al = (await align(out, [{ id: lid, text: ln.narration_ar, caption: ln.caption_ar }], out.replace(/\.wav$/, '.align.json'))).result;
      const L = al.lines[0];
      clips[lid] = { file: out, dur: al.duration, words: L.words.map((w: any) => ({ w: w.w, s: w.s, e: w.e })), subs: L.subs ?? [], speechEnd: L.end };
      note(`Narration line ${lid} pinned to ${pin.file} [${pin.from ?? 0}–${pin.to ?? 'end'} s] (sha256 ok)`);
    }
    // per-line tempo (slow one hard line down): narration.line_tempo = { "<lineId>": 0.8 } — re-aligned + ASR-checked
    for (const [lid, tempo] of Object.entries(spec.narration.line_tempo ?? {})) {
      const c = clips[lid]; const ln = lineOf(script, lid);
      if (!c || !ln?.narration_ar) throw new Error(`narration line_tempo ${lid}: no such spoken line in the take`);
      if (!(tempo >= 0.5 && tempo <= 2)) throw new Error(`narration line_tempo ${lid}: ${tempo} outside 0.5-2`);
      const out = c.file.replace(/[.]wav$/, `.tempo${tempo}.wav`);
      await run('ffmpeg', ['-v', 'error', '-y', '-i', c.file, '-af', `atempo=${tempo}`, '-ar', '48000', '-ac', '2', out]);
      const al = (await align(out, [{ id: lid, text: ln.narration_ar, caption: ln.caption_ar }], out.replace(/[.]wav$/, '.align.json'))).result;
      const L = al.lines[0];
      clips[lid] = { file: out, dur: al.duration, words: L.words.map((w: any) => ({ w: w.w, s: w.s, e: w.e })), subs: L.subs ?? [], speechEnd: L.end };
      note(`Narration line ${lid} re-timed to tempo ${tempo} (${c.dur.toFixed(2)} -> ${al.duration.toFixed(2)} s), re-aligned`);
    }
    // stem ASR check: flag lines whose words did not transcribe as written (possible mispronunciation)
    const flags = Object.entries(clips).flatMap(([lid, c]) => (c.subs ?? []).filter((x: any) => x.kind === 'different' || x.kind === 'not-heard (kept)' || (x.kind === 'near-miss' && (x.ratio ?? 1) < 0.7))
      .map((x: any) => ({ line: lid, script: x.script, heard: x.heard, kind: x.kind, ratio: x.ratio ?? null })));
    if (flags.length) note(`ASR check: ${flags.length} word(s) to listen to — ${flags.map(f => `${f.line} «${f.script}»→«${f.heard || '∅'}»`).join(', ')}`, 'warn');
    pipeline(dir, { voice: { asr_flags: flags } });
    dur = Object.fromEntries(Object.entries(clips).map(([k, v]) => [k, v.dur]));
    narrInfo = { take: take.wav, align: take.alignPath, wer: take.align.wer, keywords: take.align.keywords, pitch: take.align.pitch, rate_wps: take.align.rate_wps, ...(hk ? { hook_take: hk.wav, hook_align: hk.alignPath, hook_wer: hk.align.wer } : {}) };
    if (take.align.wer > 0.15) note(`Narration ASR WER ${(take.align.wer * 100).toFixed(0)}% — listen for misread words`, 'warn');
    const missing = Object.entries(take.align.keywords).filter(([k, v]) => !v && script.lines.some(l => (l.caption_ar ?? '').includes(k))).map(([k]) => k);
    if (missing.length) note(`Key words not recognised by ASR: ${missing.join(', ')} — consider tashkeel and re-synthesis`, 'warn');
    pipeline(dir, { voice: { status: 'aligned', wer: take.align.wer } });
  }

  /* 3. timeline */
  const R = resolve(spec, script, dur);
  const F = (s: number) => Math.round(s * fps);
  note(`Timeline resolved: ${R.total.toFixed(2)} s, reveals at ${R.reveals.map(x => x.toFixed(1)).join(', ')} s`);
  fs.writeFileSync(path.join(vdir, 'timeline.json'), JSON.stringify(R, null, 1));

  /* 4. visuals: one HyperFrames composition per round + the caption overlay (parallel renders, work dirs on E:) */
  pipeline(dir, { visuals: 'rendering' });
  const clipFiles: Record<string, string> = {};
  const tv = Date.now();
  const renderOne = async ({ r, i }: { r: (typeof R.rounds)[number]; i: number }) => {
    const n0 = ART_NOTES.length;
    let rr = spec.rounds[i];
    if (rr.type === 'hook_intro') {
      // teaser: the card of the first real round (a frame just after it has slid in), cropped; the intro blurs it heavily
      const lead = R.rounds.findIndex(x => x.type !== 'hook_intro');
      const tz = path.join(vdir, 'hook', 'teaser.jpg');
      fs.mkdirSync(path.dirname(tz), { recursive: true });
      // params.teaser_src (production-relative 900x860 image) replaces the crop when round 1's card itself would give the answer away
      // (accepted on the hook round or on the first real round: showrunners put it on either)
      const tsrc = rr.params.teaser_src ?? spec.rounds[lead]?.params.teaser_src;
      if (tsrc) fs.copyFileSync(path.join(dir, tsrc), tz);
      else await run('ffmpeg', ['-v', 'error', '-y', '-ss', '0.45', '-i', clipFiles[R.rounds[lead].id], '-frames:v', '1', '-vf', 'crop=900:860:90:470', '-q:v', '3', tz]);
      rr = { ...rr, params: { ...rr.params, teaser: `v${n}/hook/teaser.jpg` } };
    }
    const pd = writeRound(spec, dir, rr, r.plan, r.T0, path.join(work, r.id));  // sync: notes belong to this round
    for (const m of ART_NOTES.splice(n0)) note(`Round ${m}`);
    const out = path.join(vdir, 'clips', `${String(i + 1).padStart(2, '0')}_${r.id}.mp4`);
    await renderHF(pd, out);
    clipFiles[r.id] = out;
    note(`Round ${r.id} (${r.type}) rendered — ${r.plan.duration.toFixed(2)} s`);
    const lk = JSON.parse(fs.readFileSync(path.join(pd, 'leak.json'), 'utf8'));
    if (spec.rounds[i].open) {  // open final round: nothing is revealed, so NO correct-green may appear anywhere on the card, in any sampled frame
      const g = await leakGuard(out, [{ x: 0, y: 0, w: 900, h: 860 }], r.plan.duration - 0.1, 14, true);
      if (g.leaks.length) throw new Error(`answer marker in OPEN round ${r.id} (${r.type}): NEW correct-green pixels appeared on the card (not in the art's first question frame) — ${g.leaks.join('; ')}`);
      note(`Round ${r.id}: OPEN-round marker guard passed (full card x ${g.times.length} frames)`);
    } else
    if (lk.boxes.length && lk.reveal != null) {
      const g = await leakGuard(out, lk.boxes, lk.reveal);
      if (g.leaks.length) throw new Error(`answer leak in round ${r.id} (${r.type}): correct-green pixels before the reveal — ${g.leaks.join('; ')}`);
      note(`Round ${r.id}: answer-leak guard passed (${lk.boxes.length} box(es) x ${g.times.length} frames before the reveal at ${lk.reveal.toFixed(2)} s)`);
    }
  };
  const allRounds = R.rounds.map((r, i) => ({ r, i }));
  // quiz.json loop "zoom": the final round zooms into a still of the video's frame 0, so it renders last (after the hook)
  const loopLast = spec.loop === 'zoom' && R.rounds.length > 1 ? R.rounds.length - 1 : -1;
  await pool(allRounds.filter(x => x.r.type !== 'hook_intro' && x.i !== loopLast), 2, renderOne);
  await pool(allRounds.filter(x => x.r.type === 'hook_intro' && x.i !== loopLast), 1, renderOne);  // after round 1: its frame is the teaser
  if (loopLast >= 0) {
    const f0 = path.join(vdir, 'loop', 'frame0.png');
    fs.mkdirSync(path.dirname(f0), { recursive: true });
    await run('ffmpeg', ['-v', 'error', '-y', '-i', clipFiles[R.rounds[0].id], '-frames:v', '1', f0]);
    spec.rounds[loopLast] = { ...spec.rounds[loopLast], params: { ...spec.rounds[loopLast].params, loop_img: `v${n}/loop/frame0.png` } };
    // seam still (final round keeps a closing ask): frame 0 without its headline, so the last frame shows the picture + the ask only
    if (R.rounds[loopLast].plan.marks.seam != null) {
      await renderCleanStill(path.join(work, R.rounds[0].id), path.join(vdir, 'loop', 'frame0_clean.png'));
      spec.rounds[loopLast].params.loop_clean_img = `v${n}/loop/frame0_clean.png`;
    }
    await renderOne(allRounds[loopLast]);
    note(`Loop: final round whip-zooms into frame 0 (${path.basename(clipFiles[R.rounds[0].id])} @ 0 s) over the last 0.3 s`);
  }
  // captions: narration words (measured) or, silent, the caption text spread over each line's hint window
  const words: Word[] = [];
  for (const l of R.lines) {
    if (lineOf(script, l.id)?.no_caption) continue;  // spoken hook: the words are already on screen
    if (clips?.[l.id]) {
      const ws = clips[l.id].words;
      ws.forEach((w, k) => words.push({ w: w.w, t0: l.at + w.s, t1: l.at + w.e, line: l.id, ...(k === ws.length - 1 ? { lineEnd: l.at + clips![l.id].speechEnd } : {}) }));
    }
    else {
      const ws = (lineOf(script, l.id)?.caption_ar ?? '').split(/\s+/).filter(Boolean);
      ws.forEach((w, k) => words.push({ w, t0: l.at + (k * l.dur) / ws.length, t1: l.at + ((k + 1) * l.dur) / ws.length, line: l.id }));
    }
  }
  // blockers: every countdown ring entry and every round change (a caption never rides into the next round)
  // one digit system, Arabic punctuation: take-true words can carry the ASR's Western digits/punctuation
  if (spec.caption_digits !== 'keep') for (const w of words) w.w = arabicForms(w.w);
  // speech activity of the narration-only track (the regress.py / techqa onset metric): page starts snap to it
  const activity = clips ? await speechActivity(R.lines.filter(l => clips![l.id]).map(l => ({ file: clips![l.id].file, at: l.at })), R.total) : null;
  const pages = pageWords(words, 22, [...R.rounds.filter(r => r.plan.cd != null).map(r => r.T0 + r.plan.cd! - 0.15), ...R.rounds.slice(1).map(r => r.T0 - 0.1), ...R.rounds.filter(r => r.plan.marks.endcard != null).map(r => r.T0 + r.plan.marks.endcard - 0.15), ...R.rounds.filter(r => r.plan.marks.loop != null).map(r => r.T0 + r.plan.marks.loop)], activity?.on ?? []);  // + end-card handover, loop zoom (frame 0 has no caption)
  // audit trail: every place where the caption (script) and the take (Whisper) differ, and which form was shown
  if (clips) {
    const audit = R.lines.flatMap(l => (clips![l.id]?.subs ?? []).map((x: any) => ({ line: l.id, ...x })));
    fs.writeFileSync(path.join(vdir, 'captions_audit.json'), JSON.stringify(audit, null, 1));
    const heard = audit.filter((x: any) => x.shown === 'heard');
    note(`Captions: ${audit.length} script/take differences logged (captions_audit.json), ${heard.length} shown as heard${heard.length ? ': ' + heard.map((x: any) => `${x.line} «${x.script}»→«${x.heard}»`).join(', ') : ''}`, heard.length ? 'warn' : 'info');
  }
  fs.writeFileSync(path.join(vdir, 'captions.json'), JSON.stringify(pages.map(p => ({ t0: +p.t0.toFixed(3), t1: +p.t1.toFixed(3), text: p.words.map(w => w.w).join(' ') })), null, 1));
  const capOut = path.join(vdir, 'overlays', 'captions.webm');
  await renderHF(writeCaptionsProject(pages, R.total, path.join(work, 'captions')), capOut, { format: 'webm' });
  note(`Captions rendered: ${pages.length} pages (transparent WebM) in ${((Date.now() - tv) / 1000).toFixed(0)} s total visuals`);
  pipeline(dir, { visuals: 'done' });
  // signature corner bug on a full canvas (70 % opacity, x 60 / y 225 per the visual system) → placed 1:1, no transform
  const bugSrc = path.join(SIGNATURE, 'corner-bug.png');
  const bug = path.join(vdir, 'overlays', 'corner_bug_canvas.png');
  await run('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black@0.0:s=${spec.width}x${spec.height},format=rgba`, '-i', bugSrc, '-filter_complex', '[1]format=rgba,colorchannelmixer=aa=0.7[b];[0][b]overlay=60:225:format=auto,format=rgba', '-frames:v', '1', bug]);
  // alpha end-card over the round background: it starts from an empty frame, so the score card fades out underneath
  // and the wordmark animates in once (an opaque end-card would flash the finished wordmark, then wipe it in again)
  const ecSrc = fs.existsSync(path.join(SIGNATURE, 'endcard-alpha.webm')) ? 'endcard-alpha.webm' : 'endcard.mp4';
  const endcard = path.join(vdir, 'overlays', ecSrc);
  fs.copyFileSync(path.join(SIGNATURE, ecSrc), endcard);
  // dissolve only once the score card under it has faded (no translucent wordmark over the tiles; packages/quiz/src/endcard.ts)
  const ecRound = [...R.rounds].reverse().find(r => r.plan.marks.endcard != null);
  const ecFade = endcardFade(ecRound ? ecRound.T0 + ecRound.plan.marks.endcard! : null, Math.max(0, F(R.total) - F(1.4) - 2) / fps, (F(R.total) - Math.max(0, F(R.total) - F(1.4) - 2)) / fps);
  if (/alpha\.webm$/.test(ecSrc)) {
    // quick lockup: the full end-card (mark + wordmark + CTA, its held last frame) dissolves in over 0.2 s and holds,
    // instead of a bare mark building over the last second (z5hx/gu0d QA)
    const still = path.join(work, 'endcard-last.png');
    fs.mkdirSync(work, { recursive: true });
    await run('ffmpeg', ['-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-sseof', '-0.1', '-i', endcard, '-update', '1', '-frames:v', '1', still]);
    await run('ffmpeg', ['-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', still, '-t', '1.5', '-vf', `format=rgba,fade=t=in:st=${ecFade.st}:d=${ecFade.d}:alpha=1`, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '28', endcard]);
    note(`End-card: full lockup dissolves in at +${ecFade.st.toFixed(2)} s over ${ecFade.d} s (score card <= 10 % by then), then holds`);
  }
  if (opts.onlyVisuals) return { R, vdir };

  /* 5. music bed (original synth, breaks on every reveal) + levels */
  const bed = path.join(vdir, 'audio', 'bed.wav');
  fs.mkdirSync(path.dirname(bed), { recursive: true });
  await run(PY, ['-I', SYNTH, 'bed', bed, R.total.toFixed(3), '--hits', R.reveals.map(x => x.toFixed(2)).join(','), '--bpm', String(spec.music.bpm ?? 112)]);
  const bedL = await lufs(bed);
  // guard: a broken synth (e.g. a numeric blow-up normalised away) yields a near-silent bed and a dry, "dropout" mix
  if (!(bedL >= -30 && bedL <= -12)) throw new Error(`music bed measures ${bedL.toFixed(1)} LUFS (expected -30…-12): synth fault, refusing to mix (${bed})`);
  const voiceL = clips ? await lufs(narrInfo.take) : -18;
  // bed sits ~6 dB under the voice between lines and ~16 dB under it while someone speaks (≈10 dB duck)
  const bedOpen = Math.min(1, dbToGain(voiceL - 6 - bedL)), bedDuck = Math.min(1, dbToGain(voiceL - 16 - bedL));
  note(`Levels: voice ${voiceL.toFixed(1)} LUFS, bed ${bedL.toFixed(1)} LUFS → bed gain ${(20 * Math.log10(bedOpen)).toFixed(1)} dB open / ${(20 * Math.log10(bedDuck)).toFixed(1)} dB ducked`);
  const duckKeys: { frame: number; value: number; easing?: string }[] = [{ frame: 0, value: bedOpen, easing: 'linear' }];
  if (clips) {
    const spans: [number, number][] = [];
    for (const l of R.lines) { const a = l.at - 0.15, b = l.at + l.dur + 0.2; if (spans.length && a <= spans[spans.length - 1][1] + 0.3) spans[spans.length - 1][1] = b; else spans.push([a, b]); }
    for (const [a, b] of spans) duckKeys.push({ frame: Math.max(1, F(a)), value: bedOpen, easing: 'easeInOut' }, { frame: F(a + 0.15), value: bedDuck, easing: 'linear' }, { frame: F(b), value: bedDuck, easing: 'easeInOut' }, { frame: F(b + 0.3), value: bedOpen, easing: 'linear' });
  }

  /* 6. timeline (render.timeline.json): V1 rounds · V2 captions · V3 brand · A1 narration · A2 SFX lanes · A3 music */
  // brand media is copied into the version folder so a version re-renders from its own folder
  const sfxLocal = path.join(vdir, 'audio', 'sfx'); fs.mkdirSync(sfxLocal, { recursive: true });
  // a hook variant may ship its own sound in packages/quiz/src/hooks/sfx/<name>.wav (no shared SFX library edit)
  const HOOK_OWN_SFX = path.join(P.root, 'packages', 'quiz', 'src', 'hooks', 'sfx');
  for (const s of new Set(R.sfx.map(x => x.name))) fs.copyFileSync(fs.existsSync(path.join(sfxDir, `${s}.wav`)) ? path.join(sfxDir, `${s}.wav`) : path.join(HOOK_OWN_SFX, `${s}.wav`), path.join(sfxLocal, `sfx_${s}.wav`));
  const sfxItems = R.sfx.map(s => ({ ...s, file: path.join(sfxLocal, `sfx_${s.name}.wav`), from: F(s.at), dur: 0 }));
  // cues tied to a narration line (the reveal ding) sit ≥ 5 dB under that line's first 0.5 s of speech
  // hook SFX: every cue that overlaps the hook voice (slam, whooshes, pops, closing whoosh) is ducked a further 5 dB and held
  // >= 6 dB under the voice (QA 2026-10-27: whooshes masked «في شي» / «لصاحبك» for ASR)
  const hookLineIds = new Set(spec.rounds.filter(r => r.type === 'hook_intro').map(r => r.params.line).filter(Boolean) as string[]);
  if (clips) for (const s of sfxItems) {
    if (!s.under || !clips[s.under]) continue;
    const hook = hookLineIds.has(s.under);
    const ln = R.lines.find(l => l.id === s.under);
    const overlaps = hook && !!ln && s.at >= ln.at - 0.15 && s.at <= ln.at + ln.dur;
    const vL = await rmsDb(clips[s.under].file, 0.06, 0.5), sL = await rmsDb(s.file, 0, 0.5);
    const g = overlaps ? Math.min((s.gain_db ?? 0) - 5, vL - sL - 6) : Math.min(s.gain_db ?? 0, vL - sL - 5);
    if (g < (s.gain_db ?? 0) - 0.05) note(`${hook ? 'Hook SFX' : 'Ding'} ${s.name} at ${s.at.toFixed(2)} s lowered to ${g.toFixed(1)} dB to stay ${overlaps ? '5-6' : '5'} dB under "${s.under}"`);
    s.gain_db = +g.toFixed(1);
  }
  for (const s of sfxItems) s.dur = Math.ceil(((await probeDur(s.file)) + 0.02) * fps);
  // loop "zoom": no audio tail past the last frame (the replay's frame 0 follows straight on)
  if (spec.loop) for (const s of sfxItems) if (s.from + s.dur > F(R.total)) { s.dur = Math.max(1, F(R.total) - s.from); (s as any).trim = true; }
  const sfxLanes = lanes(sfxItems);
  const narrItems = clips ? R.lines.filter(l => clips![l.id]).map(l => ({ id: l.id, file: clips![l.id].file, from: F(l.at), dur: Math.ceil(clips![l.id].dur * fps) })) : [];
  for (let i = 1; i < narrItems.length; i++) if (narrItems[i].from < narrItems[i - 1].from + narrItems[i - 1].dur) narrItems[i].from = narrItems[i - 1].from + narrItems[i - 1].dur; // never overlap on one track
  const totalF = F(R.total);
  // the alpha end-card's first frames are empty: start it 2 frames before the outro's handover so the frame after the
  // score card is never blank
  const endF = Math.max(0, totalF - F(1.4) - 2);
  // media are build-tagged (container metadata / PNG text chunk, picture/sound untouched) and content-hash named, so a
  // version folder's file names identify their content (kept from the OpenChatCut era; harmless for the ffmpeg renderer)
  const tag = `${productionId} v${n} ${new Date().toISOString()}`;
  const hashed = new Map<string, string>();
  const H = async (f: string) => { if (!hashed.has(f)) { await stamp(f, tag); hashed.set(f, hashName(f)); } return hashed.get(f)!; };
  for (const k of Object.keys(clipFiles)) clipFiles[k] = await H(clipFiles[k]);
  const capM = await H(capOut), bugM = await H(bug), endM = await H(endcard), bedM = await H(bed);
  for (const x of narrItems) x.file = await H(x.file);
  for (const s of sfxItems) s.file = await H(s.file);
  const media = [...Object.values(clipFiles), capM, bugM, endM, bedM, ...narrItems.map(x => x.file), ...new Set(sfxItems.map(s => s.file))];

  // the edit calls (same shape as the old OpenChatCut MCP calls) are recorded into a plain timeline -> render.timeline.json
  // (timeline.json in the production folder is the round plan)
  const ed = new TimelineRecorder(spec.width, spec.height, fps);
  const rec = ed;
  try {
    note('Engine: ffmpeg compositor (edit recorded to render.timeline.json)');
    const session = async (label: string, fn: (id: string) => Promise<void>) => {
      const s = await ed.call('begin_edit_session', {});
      await fn(s.editSessionId);
      await ed.call('review_edit_session', { editSessionId: s.editSessionId, summary: label });
      note(`Timeline: ${label} ✓`);
    };

    const tracks: Record<string, string> = {};
    const pid: Record<string, string> = {};
    const want: [string, 'video' | 'audio'][] = [['Captions', 'video'], ['Brand', 'video'], ['Narration', 'audio'], ...sfxLanes.map((_, k) => [`SFX ${k + 1}`, 'audio'] as [string, 'audio']), ['Music', 'audio']];
    await session('Prepare tracks and import quiz media', async id => {
      const tl0 = await ed.call('read_timeline', { editSessionId: id });
      if (tl0?.items?.length) { await ed.call('clear_timeline', { editSessionId: id }); note(`Cleared ${tl0.items.length} items from the previous version`); }
      const list = async () => { const l = await ed.call('edit_track', { editSessionId: id, action: 'list' }); return (l?.result ?? l?.tracks ?? []) as any[]; };
      let all = await list();
      const byName = (nm: string) => all.find(t => t.name === nm)?.id as string | undefined;
      if (!byName('Rounds')) {
        const v1 = all.find(t => t.alias === 'V1' && t.trackType === 'video') ?? all.find(t => t.id === 'track_v1');
        if (!v1) throw new Error('no V1 video track');
        await ed.call('edit_track', { editSessionId: id, action: 'update', trackId: v1.id, json: JSON.stringify({ name: 'Rounds' }) });
        all = await list();
      }
      tracks.Rounds = byName('Rounds')!;
      for (const [name, type] of want) {
        tracks[name] = byName(name) ?? (await ed.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: type, name }) })).created?.[0]?.id;
        if (!tracks[name]) throw new Error(`could not create track ${name}`);
      }
      for (let i = 0; i < media.length; i += 90) {
        let batch = media.slice(i, i + 90);
        for (let attempt = 0; ; attempt++) {
          const imp = await ed.call('import_assets', { editSessionId: id, paths: batch });
          for (const a of imp?.imported ?? []) pid[a.name] = a.id;
          const problems = [...(imp?.errors ?? []), ...(imp?.unsupportedFiles ?? [])];
          if (!imp?.error && imp?.ok !== false && !problems.length) break;
          // transient import failures ("import failed and can be retried") — retry just those files, up to 3 times
          const retry = problems.filter((p: any) => /retr/i.test(String(p?.error ?? ''))).map((p: any) => p.path).filter(Boolean);
          if (attempt >= 3 || !retry.length || retry.length !== problems.length) throw new Error(`media import failed: ${imp?.code ?? ''} ${imp?.error ?? ''} ${JSON.stringify(problems).slice(0, 400)}`);
          note(`Media import: retrying ${retry.length} file(s) (attempt ${attempt + 2})`, 'warn');
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          batch = retry;
        }
      }
      const poolList = await ed.call('read_project', { editSessionId: id, view: 'assets' });
      for (const a of poolList.mediaPool?.assets ?? []) pid[a.name] ??= a.id;
    });
    const A = (file: string) => { const x = pid[path.basename(file)]; if (!x) throw new Error(`imported media not in pool: ${path.basename(file)}`); return x; };

    await session('Lay down rounds, captions and brand layers', async id => {
      const adds: any[] = R.rounds.map(r => ({ type: 'video', assetId: A(clipFiles[r.id]), trackId: tracks.Rounds, fromFrame: F(r.T0), durationInFrames: F(r.plan.duration) }));
      adds.push({ type: 'video', assetId: A(capM), trackId: tracks.Captions, fromFrame: 0, durationInFrames: totalF });
      // quiz.json `no_endcard: true` (insights 2026-10-28): no brand end-card, the last round is the last frame (loops into frame 0)
      adds.push({ type: 'image', assetId: A(bugM), trackId: tracks.Brand, fromFrame: 0, durationInFrames: spec.no_endcard ? totalF : endF });
      if (!spec.no_endcard) adds.push({ type: 'video', assetId: A(endM), trackId: tracks.Brand, fromFrame: endF, durationInFrames: totalF - endF });
      const r = checked(await ed.call('edit_item', { editSessionId: id, adds }), 'picture adds');
      // end-card dissolves in over 7 frames (no hard cut from the score card)
      const ecId = r.results[r.results.length - 1]?.placed?.itemId;
      if (!spec.no_endcard && ecId && !/alpha/.test(endcard)) checked(await ed.call('edit_item', { editSessionId: id, updates: [{ type: 'video', itemId: ecId, keyframes: { opacity: [{ frame: 0, value: 0 }, { frame: Math.round(ecFade.st * fps), value: 0, easing: 'easeOut' }, { frame: Math.round(ecFade.st * fps) + Math.max(4, Math.round(ecFade.d * fps)), value: 1 }] } }] }), 'end-card dissolve');
    });
    await session('Add narration, SFX and music', async id => {
      const adds: any[] = narrItems.map(x => ({ type: 'audio', assetId: A(x.file), trackId: tracks.Narration, fromFrame: x.from }));
      sfxLanes.forEach((lane, k) => lane.forEach(s => adds.push({ type: 'audio', assetId: A(s.file), trackId: tracks[`SFX ${k + 1}`], fromFrame: s.from, ...((s as any).trim ? { durationInFrames: s.dur } : {}), _gain: s.gain_db ?? 0 })));
      adds.push({ type: 'audio', assetId: A(bedM), trackId: tracks.Music, fromFrame: 0, durationInFrames: totalF, _music: true });
      const r = checked(await ed.call('edit_item', { editSessionId: id, adds: adds.map(({ _gain, _music, ...a }) => a) }), 'audio adds');
      const ids: string[] = r.results.map((x: any) => x.placed?.itemId);
      const updates: any[] = [];
      adds.forEach((a, i) => {
        if (a._gain != null && a._gain !== 0) updates.push({ type: 'audio', itemId: ids[i], volume: +dbToGain(a._gain).toFixed(3) });
        if (a._music) updates.push({ type: 'audio', itemId: ids[i], volume: +bedOpen.toFixed(3), keyframes: { volume: duckKeys.map(k => ({ ...k, value: +k.value.toFixed(4) })) } });
      });
      if (updates.length) checked(await ed.call('edit_item', { editSessionId: id, updates }), 'audio levels');
    });
  } finally {
    await ed.close();
  }
  const timeline = await rec.toTimeline({ production_id: productionId, version: n, builder: 'packages/quiz/src/build.ts', agent });
  fs.writeFileSync(path.join(vdir, 'render.timeline.json'), JSON.stringify(timeline, null, 1));

  const report: any = { version: n, engine: 'ffmpeg', duration: R.total, rounds: R.rounds.map(r => ({ id: r.id, type: r.type, at: r.T0, dur: r.plan.duration, reveal: r.plan.reveal != null ? r.T0 + r.plan.reveal : null })), narration: narrInfo, caption_pages: pages.length, sfx_cues: sfxItems.length, sfx_lanes: sfxLanes.length, sfx: sfxItems.map(x => ({ name: x.name, at: +x.at.toFixed(3), gain_db: x.gain_db ?? 0, under: x.under ?? null })), endcard_frame: endF, log };
  db().prepare(`INSERT INTO versions(production_id, n, captions_path, notes) VALUES (?,?,?,?) ON CONFLICT(production_id, n) DO UPDATE SET captions_path=excluded.captions_path, notes=excluded.notes`)
    .run(productionId, n, path.join(vdir, 'captions.json'), J.str(report));
  db().prepare(`UPDATE productions SET version=?, updated_at=datetime('now') WHERE production_id=?`).run(n, productionId);
  if (opts.skipRender) { fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(report, null, 1)); return report; }

  /* 7. render (packages/render ffmpeg compositor) → loudness master → technical QA */
  pipeline(dir, { render: { status: 'rendering', progress: 0 } });
  const raw = path.join(vdir, 'render.raw.mp4');
  const tr = Date.now();
  try {
    await withLock('render', agent, () => renderTimeline(timeline, raw, { workDir: path.join(vdir, 'render-work'), onProgress: f => pipeline(dir, { render: { status: 'rendering', progress: +f.toFixed(2) } }) }));
  }
  catch (e) { pipeline(dir, { render: { status: 'failed', progress: 0 } }); throw e; }
  report.render_seconds = Math.round((Date.now() - tr) / 1000);
  const final = path.join(vdir, 'render.mp4');
  await master(raw, final);
  note('Mastered audio to −14 LUFS, true peak ≤ −2 dBTP target + limiter (picture untouched)');
  await run(PY, ['-I', TECHQA, final, path.join(vdir, 'qa'), '--expect-duration', R.total.toFixed(2)], { maxBuffer: 1 << 26, timeout: 1800_000 });
  const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
  // quiz check: a puzzle card is on screen on every frame around each round change (no empty frame between rounds)
  const emptyFrames: number[] = [];
  for (const r of R.rounds.slice(1)) for (let k = -3; k <= 2; k++) {
    const t = r.T0 + k / fps + 0.001;
    const raw = (await run('ffmpeg', ['-v', 'error', '-ss', t.toFixed(4), '-i', final, '-frames:v', '1', '-vf', 'scale=108:192,format=rgb24', '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 1 << 22 })).stdout as unknown as Buffer;
    // card = low-saturation surface (white, or the ink-dimmed grey of a revealed card); the gradient background is saturated
    let card = 0, n = 0;
    for (let y = 47; y < 133; y++) for (let x = 0; x < 108; x++) {
      const i = (y * 108 + x) * 3; n++;
      const mx = Math.max(raw[i], raw[i + 1], raw[i + 2]), mn = Math.min(raw[i], raw[i + 1], raw[i + 2]);
      if (mx > 90 && mx - mn < 45) card++;
    }
    if (card / n < 0.04) emptyFrames.push(Math.round(t * fps));
  }
  tq.checks.card_on_every_round_change = emptyFrames.length === 0;
  if (emptyFrames.length) { tq.pass = false; tq.failed = [...(tq.failed ?? []), 'card_on_every_round_change']; tq.empty_round_change_frames = emptyFrames; }
  // quiz check: every caption page starts within +-2 frames of the speech onset it owns (regress.py metric)
  if (activity) {
    const leads = onsetLeads(pages.map(p => ({ t0: +p.t0.toFixed(3), text: p.words.map(w => w.w).join(' ') })), activity.on);
    const off = leads.filter(x => x.lead != null && Math.abs(x.lead) > 2 / fps + 0.005);
    tq.checks.caption_onsets_within_2_frames = off.length === 0;
    tq.caption_onset_max_lead_s = Math.max(0, ...leads.map(x => Math.abs(x.lead ?? 0)));
    if (off.length) { tq.pass = false; tq.failed = [...(tq.failed ?? []), 'caption_onsets_within_2_frames']; tq.caption_onset_misses = off; }
  }
  fs.writeFileSync(path.join(vdir, 'qa', 'techqa.json'), JSON.stringify(tq, null, 1));
  db().prepare(`UPDATE versions SET render_path=?, contact_sheet=?, tech_qa=?, notes=? WHERE production_id=? AND n=?`).run(final, tq.contact_sheet, J.str(tq), J.str(report), productionId, n);
  pipeline(dir, { render: { status: 'done', progress: 1, file: final, version: n } });
  report.render = final; report.techqa = { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs, duration: tq.duration, bytes: tq.bytes };
  report.build_seconds = Math.round((Date.now() - t00) / 1000);
  // provenance manifest (sha256 of every input and output) for the rights countersign
  // every build MERGES its media (sha256 + origin) into assets.json; art entries and the rights block are kept
  await run(PY, ['-I', path.join(P.root, 'packages', 'quiz', 'py', 'assets_manifest.py'), dir, `v${n}`]);
  note(`assets.json merged with v${n} media`);
  fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(report, null, 1));
  note(`v${n} rendered (${tq.duration.toFixed(1)} s) — technical QA ${tq.pass ? 'passed' : 'FAILED: ' + tq.failed.join(', ')}`, tq.pass ? 'success' : 'warn');
  return report;
}

/** Write a metadata tag into a media file in place (stream copy; PNG via a text chunk), so its bytes are unique. */
async function stamp(file: string, tag: string) {
  const tmp = file + '.stamp' + path.extname(file);
  if (/\.png$/i.test(file)) {
    await run(PY, ['-I', '-c', 'import sys; from PIL import Image, PngImagePlugin; im=Image.open(sys.argv[1]); m=PngImagePlugin.PngInfo(); m.add_text("Comment", sys.argv[3]); im.save(sys.argv[2], pnginfo=m)', file, tmp, tag]);
  } else {
    await run('ffmpeg', ['-v', 'error', '-y', '-i', file, '-map', '0', '-c', 'copy', '-metadata', `comment=${tag}`, tmp]);
  }
  fs.renameSync(tmp, file);
}

/** Rename a file to <name>.<sha256:10><ext> (idempotent) and return the new path. */
function hashName(file: string) {
  const ext = path.extname(file), base = path.basename(file, ext);
  if (/\.[0-9a-f]{10}$/.test(base)) return file;
  const h = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
  const out = path.join(path.dirname(file), `${base}.${h}${ext}`);
  fs.renameSync(file, out);
  return out;
}

/** RMS level (dBFS) of [from, from+dur] s of an audio file, ignoring near-silent 10 ms windows. */
async function rmsDb(file: string, from: number, dur: number) {
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', String(dur), '-i', file, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { encoding: 'buffer', maxBuffer: 1 << 26 });
  const b = stdout as unknown as Buffer; const x = new Int16Array(b.buffer, b.byteOffset, Math.floor(b.length / 2));
  const win: number[] = [];
  for (let i = 0; i + 160 <= x.length; i += 160) { let e = 0; for (let k = 0; k < 160; k++) e += (x[i + k] / 32768) ** 2; win.push(e / 160); }
  const loud = win.filter(e => e > 1e-6);
  const m = loud.length ? loud.reduce((a, b) => a + b, 0) / loud.length : 1e-9;
  return 10 * Math.log10(m);
}

/**
 * Answer-leak guard: samples a few frames of a round clip between the card's arrival (0.35 s) and the reveal and counts
 * correct-green (#22D489 ±) pixels inside each declared answer box (card px; half-resolution crops). Any box with
 * >= 40 green pixels (≈ 160 px at full size) is a leak.
 */
export async function leakGuard(clip: string, boxes: { x: number; y: number; w: number; h: number }[], reveal: number, n = 5, relative = false) {
  const t1 = reveal - 0.07, t0 = Math.min(0.35, t1);
  const times = Array.from({ length: n }, (_, k) => +(t0 + ((t1 - t0) * k) / Math.max(1, n - 1)).toFixed(3));
  const leaks: string[] = [];
  const baselines = new Map<string, Uint8Array>();
  for (const t of times) for (const b of boxes) {
    const x = Math.max(0, Math.round(90 + b.x)) & ~1, y = Math.max(0, Math.round(470 + b.y)) & ~1;
    const w = Math.min(1080 - x, Math.round(b.w)) & ~1, h = Math.min(1920 - y, Math.round(b.h)) & ~1;
    if (w < 4 || h < 4) continue;
    const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', clip, '-frames:v', '1', '-vf', `crop=${w}:${h}:${x}:${y},scale=${w / 2}:${h / 2}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', maxBuffer: 1 << 24 });
    const px = stdout as unknown as Buffer;
    const mask = greenMask(px);
    let green = 0;
    if (relative) {
      // OPEN round: the art's own green (spice bowl, lines) is never a marker. Baseline = green of the round's first
      // question-phase frames (0.35 s, 0.65 s), dilated 6 half-res px to tolerate motion; only NEW green counts.
      const bk = `${b.x},${b.y},${b.w},${b.h}`;
      let base = baselines.get(bk);
      if (!base) {
        base = new Uint8Array(mask.length);
        for (const bt of [0.35, 0.65]) {
          const { stdout: so } = await run('ffmpeg', ['-v', 'error', '-ss', String(bt), '-i', clip, '-frames:v', '1', '-vf', `crop=${w}:${h}:${x}:${y},scale=${w / 2}:${h / 2}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { encoding: 'buffer', maxBuffer: 1 << 24 });
          const bm = greenMask(so as unknown as Buffer);
          for (let k = 0; k < bm.length; k++) base[k] |= bm[k];
        }
        base = dilate(base, w / 2, h / 2, 6);
        baselines.set(bk, base);
      }
      for (let k = 0; k < mask.length; k++) if (mask[k] && !base[k]) green++;
    } else for (let k = 0; k < mask.length; k++) green += mask[k];
    if (green >= 40) leaks.push(`${green} px in box [${b.x},${b.y},${b.w}x${b.h}] at ${t.toFixed(2)} s`);
  }
  return { times, leaks };
}

function greenMask(px: Buffer): Uint8Array {
  const m = new Uint8Array(Math.floor(px.length / 3));
  for (let i = 0, k = 0; i + 2 < px.length; i += 3, k++) { const R = px[i], G = px[i + 1], B = px[i + 2]; if (G > 160 && G - R > 90 && G - B > 35 && B > 80) m[k] = 1; }
  return m;
}
function dilate(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(m.length), out = new Uint8Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) for (let d = Math.max(0, x - r); d <= Math.min(w - 1, x + r); d++) tmp[y * w + d] = 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (tmp[y * w + x]) for (let d = Math.max(0, y - r); d <= Math.min(h - 1, y + r); d++) out[d * w + x] = 1;
  return out;
}

async function probeDur(file: string) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(String(stdout).trim());
}
