// Hook-intro tooling (owner request 2026-10-26: a spoken ~2 s hook scene before round 1). See hooks/README.md.
//   npx tsx packages/quiz/src/dev-hook.ts apply <id> [hook.json]   patch productions/<id>/quiz.json + script.json from a hook
//        definition (adds round "hook" + spoken line h0 + the `hook` meta block in both files, removes every hook_banner, and drops round 1's spoken pre-lines unless hook.json has keep_r1_pre_lines:true).
//        Without hook.json the built-in HOOKS entry for <id> is used (the four 10-27 videos).
//   npx tsx packages/quiz/src/dev-hook.ts take <id> [hook.json]    standalone hook TTS into a scratch dir + main-take cache check
//        (the main take must be a cache hit = untouched; nothing is written to the production; works before or after apply)
//   npx tsx packages/quiz/src/dev-hook.ts preview <id> [t,t,...]    snapshots of the intro (+ round 1 after it), no OCC / no TTS
//
// hook.json = { category, variant, line_ar, onscreen_ar, narration_ar (TTS text, tashkeel ok), caption_ar?,
//               params?: { t1, t2, beats, … variant params }, timings?: { dur } }
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { P } from '../../shared/src/paths.ts';
import { hintDurations, validate, type HookCategory, type HookMeta, type QuizSpec, type Script } from './spec.ts';
import { HF, NPX_CLI, resolve, WORK, writeRound } from './compose.ts';
import { hookTake, standaloneHookLines, takeLines, takeStyle, takeText, ttsKey } from './narration.ts';

const run = promisify(execFile);

export interface HookDef { category: HookCategory; variant: string; line_ar: string; onscreen_ar: string; narration_ar: string; caption_ar?: string; params?: Record<string, any>; timings?: Record<string, number>; /** keep round 1's spoken pre-lines (default: dropped, the hook replaces them) */ keep_r1_pre_lines?: boolean }

export const HOOKS: Record<string, HookDef> = {
  'quiz-261022-x5iz': { category: 'ego_challenge', variant: 'eye', line_ar: 'صعب تجيب ٤ من ٤!', narration_ar: 'صَعْب تِجيب أَرْبَعَة مِن أَرْبَعَة!', onscreen_ar: 'صعب تجيب ٤ من ٤!', caption_ar: 'صعب تجيب أربعة من أربعة!',
    params: { t1: 'صعب تجيب', t2: '٤ من ٤!', beats: { lock: 0.84 } } },
  'quiz-261022-hrxp': { category: 'score_tracker', variant: 'scoreboard', line_ar: 'احسب نقاطك من ٤!', narration_ar: 'إِحْسِب نِقاطَك مِن أَرْبَعَة!', onscreen_ar: 'احسب نقاطك من ٤!', caption_ar: 'احسب نقاطك من أربعة!',
    params: { t1: 'احسب نقاطك من ٤!', t2: 'كم رح تجيب؟', max: 4, beats: { roll: 0.12, land: 1.0, pill: 1.2, stars: 1.32 } } },
  'quiz-261022-li3p': { category: 'difficulty_ladder', variant: 'heat_cards', line_ar: 'سهلة.. وللأذكيا بس!', narration_ar: 'سَهْلة.. وللأَذْكيا بَسّ!', onscreen_ar: 'سهلة.. عادية.. صعبة.. للأذكيا بس!', caption_ar: 'سهلة وللأذكيا بس',
    params: { words: ['سهلة', 'عادية', 'صعبة', 'للأذكيا بس!'], voice_at: 0.04, beats: { b: [0, 0.32, 0.62, 0.92] } } },
  'quiz-261022-30r2': { category: 'timer_pressure', variant: 'stopwatch', line_ar: 'عندك ٣ ثواني بس!', narration_ar: 'عِنْدَك تَلات تَواني بَسّ!', onscreen_ar: 'عندك ٣ ثواني بس!', caption_ar: 'عندك تلات ثواني بس!',
    params: { t1: 'عندك ٣ ثواني', t2: 'بس!', beats: { ticks: [0.2, 0.5, 0.8], bas: 1.12 } } },
};

/** Add (or replace) the hook intro: line h0, round "hook" first, `hook` meta in quiz.json + script.json. Idempotent. */
export function patch(spec: QuizSpec, script: Script, H: HookDef) {
  for (const r of spec.rounds) delete (r as any).hook_banner;
  const line = { id: 'h0', section: 'HOOK0', start_hint: 0.1, end_hint: 1.95, narration_ar: H.narration_ar, onscreen_ar: H.onscreen_ar, caption_ar: H.caption_ar ?? H.line_ar, no_caption: true };
  const li = script.lines.findIndex(l => l.id === 'h0');
  if (li >= 0) script.lines[li] = line; else script.lines.unshift(line);
  const round = { id: 'hook', type: 'hook_intro' as const, pre_lines: ['h0'], params: { variant: H.variant, ...(H.params ?? {}), line: 'h0' }, ...(H.timings ? { timings: H.timings } : {}) };
  const ri = spec.rounds.findIndex(r => r.type === 'hook_intro');
  if (ri >= 0) spec.rounds[ri] = round; else spec.rounds.unshift(round);
  // the hook replaces round 1's teaser pre-lines («٩ فناجين…»): drop them (voice + head) so the round-1 question starts <= 0.5 s after the
  // intro. The script lines stay, so the main take's text (= its TTS cache key) and every other clip are unchanged; they are simply not placed.
  const lead = spec.rounds.find(r => r.type !== 'hook_intro');
  if (lead?.pre_lines?.length && !H.keep_r1_pre_lines) { lead.dropped_pre_lines = [...new Set([...(lead.dropped_pre_lines ?? []), ...lead.pre_lines])]; delete lead.pre_lines; }
  const meta: HookMeta = { category: H.category, variant: H.variant, line_ar: H.line_ar, onscreen_ar: H.onscreen_ar, tts: true };
  const { rounds, ...rest } = spec;
  const out = { ...rest, hook: meta, rounds } as QuizSpec;  // keep `rounds` last in the file
  script.hook = meta;
  validate(out, script);
  return { spec: out, script };
}

const [cmd, id, arg] = process.argv.slice(2);
if (cmd && import.meta.url.endsWith(path.basename(process.argv[1] ?? ''))) {
  const dir = path.join(P.productions, id);
  const spec0: QuizSpec = JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
  const script0: Script = JSON.parse(fs.readFileSync(path.join(dir, spec0.script), 'utf8'));
  const def: HookDef | undefined = arg && cmd !== 'preview' ? JSON.parse(fs.readFileSync(arg, 'utf8')) : HOOKS[id];
  const already = spec0.rounds.some(r => r.type === 'hook_intro');
  if (!def && !already) throw new Error(`no hook definition for ${id}: pass a hook.json (see the header of this file)`);
  const { spec, script } = def ? patch(structuredClone(spec0), structuredClone(script0), def) : { spec: spec0, script: script0 };
  if (cmd === 'apply') {
    fs.writeFileSync(path.join(dir, 'quiz.json'), JSON.stringify(spec, null, 2));
    fs.writeFileSync(path.join(dir, spec.script), JSON.stringify(script, null, 2));
    console.log(`patched ${id}: hook ${spec.hook!.category}/${spec.hook!.variant}, rounds ${spec.rounds.map(r => r.id).join(',')}`);
  } else if (cmd === 'take') {
    // 1. main take: the exact request the build will send (hook lines excluded) must already be in the TTS cache
    const hookIds = standaloneHookLines(spec);
    const mainText = takeText(takeLines(script, { textOverride: spec.narration.take_text, exclude: hookIds }));
    const key = ttsKey(mainText, spec.narration.voice, takeStyle(spec, script));
    const cached = fs.existsSync(path.join(P.cache, 'tts', `${key}.wav`));
    const inProd = fs.existsSync(path.join(dir, 'voice')) && fs.readdirSync(path.join(dir, 'voice')).some(f => f.includes(key));
    // 2. hook line: its own request (same voice/dialect/style/tempo), into a scratch dir
    const scratch = path.join(process.env.STUDIO_RENDER_TMP ?? 'E:\\clips-viral-render-tmp', 'hook-take', id);
    fs.mkdirSync(scratch, { recursive: true });
    const t = await hookTake(spec, script, scratch, id, { textOverride: spec.narration.take_text });
    const h = t?.align.lines[0];
    console.log(JSON.stringify({ id, main_take: { key, cached, used_by_this_production: inProd, untouched: cached }, hook: t && { lines: t.ids, cached: t.cached, model: t.model, wav: t.wav, wer: t.align.wer,
      start: h.start, end: h.end, dur: +(h.end - h.start).toFixed(2), fits_2_5s: (r => r == null || h.end - h.start + (r.params.voice_at ?? 0.1) + 0.3 <= 2.5)(spec.rounds.find(r => r.type === 'hook_intro')),
      words: h.words.map((w: any) => `${w.w}@${w.s.toFixed(2)}-${w.e.toFixed(2)}`), subs: h.subs } }, null, 1));
    if (!cached) process.exitCode = 3;  // main take would be re-synthesized: the script text changed somewhere else
  } else if (cmd === 'preview') {
    const times = (arg ?? '0,0.5,1.0,1.5,1.9').split(',').map(Number);
    const { spec: s2, script: sc2 } = { spec, script };
    const dur = hintDurations(sc2);
    const takeDur = process.env.HOOK_DUR ? JSON.parse(process.env.HOOK_DUR) : null;
    const R = resolve(s2, sc2, takeDur ?? dur);
    const out = path.join(WORK, id, 'hook-preview'); fs.mkdirSync(out, { recursive: true });
    const snap = async (pd: string, at: number[]) => {
      const sd = path.join(pd, '.hyperframes', 'artifacts', 'snapshots'); fs.rmSync(sd, { recursive: true, force: true });
      await run(process.execPath, [NPX_CLI, '-y', HF, 'snapshot', pd, '--at', at.join(',')], { cwd: pd, maxBuffer: 1 << 26, timeout: 600_000 });
      const sub = fs.readdirSync(sd)[0]; return fs.readdirSync(path.join(sd, sub)).filter(f => f.endsWith('.png')).sort().map(f => path.join(sd, sub, f));
    };
    const r1 = R.rounds[1];
    const pd1 = writeRound(s2, dir, s2.rounds[1], r1.plan, r1.T0, path.join(out, 'r1'));
    const f1 = await snap(pd1, [0.45, 0.3, 0.6]);
    const tz = path.join(pd1, 'teaser.jpg');
    const tsrc = s2.rounds[0].params.teaser_src ?? s2.rounds[1].params.teaser_src;
    if (tsrc) fs.copyFileSync(path.join(dir, tsrc), tz);
    else await run('ffmpeg', ['-v', 'error', '-y', '-i', f1[0], '-frames:v', '1', '-vf', 'crop=900:860:90:470', '-q:v', '3', tz]);
    const hr = R.rounds[0];
    fs.mkdirSync(path.join(dir, 'vpreview'), { recursive: true });
    const rel = path.join('vpreview', `teaser_${id}.jpg`); fs.copyFileSync(tz, path.join(dir, rel));
    const pdh = writeRound(s2, dir, { ...s2.rounds[0], params: { ...s2.rounds[0].params, teaser: rel.replace(/\\/g, '/') } }, hr.plan, 0, path.join(out, 'hook'));
    const fh = await snap(pdh, times.filter(t => t < hr.plan.duration));
    console.log(JSON.stringify({ duration: hr.plan.duration, total: R.total, hook: fh, r1: f1.slice(1) }, null, 1));
  }
}
