import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import { variantOf } from './hooks/index.ts';

/**
 * quiz.json — the production spec for a quiz video. Rounds are instances of reusable TEMPLATES (see templates.ts and
 * docs/brands/quiz-ar/templates.md). All words come from script.json by line id, so the script can change without
 * touching the spec; the spec only says which template, which images, which answer, and which lines drive each phase.
 */
export interface ScriptLine { id: string; section: string; start_hint: number; end_hint: number; narration_ar: string | null; onscreen_ar: string; caption_ar: string; /** spoken but not captioned (hook intro: the words are already on screen at 90+ px) */ no_caption?: boolean }
/** Hook categories (docs/brands/quiz-ar/hooks.md): key → Arabic label. One per video; compared on the dashboard. */
export const HOOK_CATEGORIES = {
  ego_challenge: 'تحدي الذات', score_tracker: 'عداد النقاط', difficulty_ladder: 'تصاعد الصعوبة', timer_pressure: 'ضغط الوقت',
  curiosity_tease: 'فضول ولمحة', friend_challenge: 'تحدّي صاحبك', trick_warning: 'انتبه فخ', streak_survival: 'ولا غلطة',
} as const;
export type HookCategory = keyof typeof HOOK_CATEGORIES;
/** quiz.json + script.json `hook`: what the ~2 s spoken intro is (analytics key = category). */
export interface HookMeta {
  category: HookCategory;
  /** hooks/<variant>.ts (or an alias) */
  variant: string;
  /** the spoken line, plain Arabic (TTS text with tashkeel lives in the script line's narration_ar) */
  line_ar: string;
  /** text on screen */
  onscreen_ar: string;
  /** true = voiced by its own standalone TTS request (main take untouched); false = inside the main take (legacy) */
  tts: boolean;
}

export interface Script { production_id: string; channel_name: string; lines: ScriptLine[]; tts: { voice_suggestions: string[]; style_notes: string }; ab_test?: any; hook?: HookMeta }

export type RoundType = 'colour_reveal' | 'shell_game' | 'memory_flash' | 'peek_number' | 'score_cta' | 'image_reveal' | 'follow_path' | 'sequence' | 'what_changed' | 'spot_difference' | 'hook_intro';

export interface Round {
  id: string;
  type: RoundType;
  /** "١/٤" style round counter shown top-right of the question area (omit for intro/outro) */
  progress?: string;
  /** line ids spoken before the question (hook, "and now the hardest!") */
  pre_lines?: string[];
  /** round 1 pre-lines removed by dev-hook apply (the hook replaces them); kept for the audit trail, never placed */
  dropped_pre_lines?: string[];
  /** line spoken while the puzzle performs its action (shuffle / memory flash) */
  set_line?: string;
  /** the question line (its onscreen_ar is the headline) */
  q_line?: string;
  /** the answer line (its onscreen_ar is the answer headline after the reveal) */
  a_line?: string;
  /** extra lines after the answer (outro) */
  post_lines?: string[];
  /** OPEN final round (owner 2026-11-08): only on the LAST puzzle round. Question + countdown play as normal, then NO reveal
   *  (no a_line, ring, glow, tick, flash, explanation chip) and post_lines (an open-endings.md OE id line) carry the closing ask.
   *  params.answer stays for the pinned comment + puzzle-judge, never rendered. end_question is not allowed with it. */
  open?: boolean;
  /** one-line explanation chip shown after the reveal */
  explanation_ar?: string;
  /** template parameters (images, answer, cups, …) */
  params: Record<string, any>;
  /** opening hook banner (first round only): pill near the top, visible from frame 0 for `dur` s (default 2.0), with a pop+whoosh SFX.
   *  `chip` = small score chip beside the text. Never covers the puzzle, round chip, question band or captions. */
  hook_banner?: { text: string; chip?: string; dur?: number; sfx_db?: number };
  /** optional timing overrides (seconds) — see each template's plan() */
  timings?: Record<string, number>;
}

export interface QuizSpec {
  production_id: string;
  brand: string;
  width: number; height: number; fps: number;
  channel_name: string;
  script: string;              // path relative to the production dir
  narration: { voice: string; dialect: string; style?: string | null; file?: string | null; align?: string | null; tempo?: number; max_pause?: number;
    /** pin a line to a region of an existing audio file (sha-checked) instead of the take */
    pins?: Record<string, { file: string; sha256?: string; from?: number; to?: number }>;
    /** per-line tempo applied to that line's clip only (0.5-2), then re-aligned + ASR-checked */
    line_tempo?: Record<string, number>;
    /** text sent in the single TTS request for these lines (keeps the cached take valid when the script text was respelt and the line is pinned to a re-take) */
    take_text?: Record<string, string>;
    /** re-roll the standalone HOOK take: any new value (1, 2, ...) = fresh TTS sample of the same text (TTS cache key salt; env QUIZ_HOOK_RETAKE does the same for one build). Cache: data/cache/tts/<key>.wav, not the production's voice/ folder. */
    hook_retake?: number | string };
  music: { kind: 'synth_bed'; bpm?: number; gain_db?: number };
  sfx_dir: string;             // relative to repo root
  /** captions: 'eastern' (default) converts digits to ٠-٩ and punctuation to ؟ ، ؛ ; 'keep' leaves the text as is */
  caption_digits?: 'eastern' | 'keep';
  /** true = no brand end-card and no outro round: the last round is the last frame (loop into frame 0) */
  no_endcard?: boolean;
  /** video-wide timing defaults (a round's own `timings` wins). `cd` = countdown length in s (default 3.0; insights 2026-10-28: 2.0-2.5) */
  timings?: { cd?: number };
  /** "zoom" (needs no_endcard): the last ~0.3 s of the final round whip-zooms into a still of the video's frame 0, so the
   *  end flows into frame 0 on replay (insights loop item). Omitted = no loop (the last round simply ends). */
  loop?: 'zoom';
  /** the hook intro's analytics/meta record (required when a hook_intro round exists) */
  hook?: HookMeta;
  /** owner 2026-11-08: the big stop-scrolling line of the hook_intro (docs/brands/quiz-ar/hook-lines.md). Its script line
   *  (default: the hook_intro's params.line) is spoken in the intro and its onscreen_ar is drawn as huge type in place of the
   *  variant's title band; the variant's art keeps moving under it. */
  hook_line?: HookLine;
  /** owner 2026-11-08: an open question for the comments shown big over the final beat (docs/brands/quiz-ar/end-questions.md),
   *  next to the spoken SR3 score ask. Never extends the video unless it would be on screen < min_s. */
  end_question?: EndQuestion;
  rounds: Round[];
}
export interface HookLine { /** bank id, "HL01".."HL25" (hook-lines.md) */ id: string; /** script line id (default: hook_intro params.line) */ line?: string }
export interface EndQuestion {
  /** bank id, "EQ01".."EQ20" (end-questions.md) */ id: string;
  /** the on-screen question (big text above the card in the final beat) */ text_ar: string;
  /** optional spoken line id (placed after the last round's answer + post_lines; lengthens the tail) */ line?: string;
  /** s after the last reveal (default 0.6 = SR7 silent hold) */ at?: number;
  /** minimum time on screen before the loop zoom (default 1.4 s) */ min_s?: number;
}

/** Lines the big hook text may never carry (owner 2026-11-08 + quiz-ar SR1 data bans + persona Never). */
export const HOOK_LINE_BANNED: [RegExp, string][] = [
  [/جول[ةه]|جولات/, 'round count'], [/نقط|نقاط|كم جبت|من\s*[٣٤3-4]/, 'score'], [/الأذكيا|الاذكيا|أذكيا|اذكيا/, '«بس الأذكياء»'],
  [/[٪%]|٩٩|99/, 'fake stat'], [/حدس|حاسّت|حاست/, '«حدس»'], [/غبي|حمار|فاشل|أهبل|اهبل|متخلف/, 'insult'],
];
/** Owner bank lines HL26-HL32 (owner 2026-11-08; SUPERSEDED by hook-bank-owner.md but still valid): allowed despite ego / challenge / hurry / «99%» tone, up to 10 words;
 *  the banned-word guard applies to every other line. Compared without tashkeel / ellipsis style. */
export const OWNER_HOOK_LINES: Record<string, string> = {
  HL26: 'وقف سكرول خلينا نشوف إذا مخك لسا شغال', HL27: 'مخك تعفن من كتر السكرول أثبت العكس', HL28: 'إذا حليت هاللغز من أول مرة إنت مو شخص عادي',
  HL29: 'تحدي سريع يا بتحلها يا بتعترف إنك انضحك عليك', HL30: 'لا تستعين بغوغل بدنا نشوف شو ضل بمخك', HL31: 'عندك خمس ثواني تثبت إنك مو روبوت',
  HL32: '99 رح يركزوا بالمكان الغلط إنت منهم',
};
const normHL = (s: string) => s.replace(/[ً-ْٰـ]/g, '').replace(/[…\.!؟?،,%٪]+/g, ' ').replace(/\s+/g, ' ').trim();
/** docs/brands/quiz-ar/hook-bank-owner.md (owner 2026-11-08, SUPERSEDES HL26-HL32): id -> normalised text of SV01.., SM01.., FN01.., SC01.. */
export function ownerBank(): Record<string, string> {
  const f = path.join(P.root, 'docs', 'brands', 'quiz-ar', 'hook-bank-owner.md');
  const out: Record<string, string> = {};
  if (!fs.existsSync(f)) return out;
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\|\s*((?:SV|SM|FN|SC)\d{2})\s*\|\s*(.+?)\s*\|\s*$/gm)) out[m[1]] = normHL(m[2]);
  return out;
}
const words = (s: string) => s.replace(/[…\.!؟?،,]+/g, ' ').trim().split(/\s+/).filter(Boolean);

export const prodDir = (id: string) => path.join(P.productions, id);

export function loadSpec(id: string): { spec: QuizSpec; script: Script; dir: string } {
  const dir = prodDir(id);
  const spec: QuizSpec = JSON.parse(fs.readFileSync(path.join(dir, 'quiz.json'), 'utf8'));
  const script: Script = JSON.parse(fs.readFileSync(path.join(dir, spec.script), 'utf8'));
  validate(spec, script);
  captionSpec(id, script);
  return { spec, script, dir };
}

/** Plan-time check (2026-11-08): every word of a spoken line's caption_ar must be in its narration_ar (tashkeel, punctuation, tatweel
 *  and alef/ya/ta-marbuta spellings ignored). Captions follow the TTS words, so an unspoken caption word shows as a ~0.04 s page flash
 *  (zp9c r1-q «تحدي الأسبوع #١»). Productions created before 2026-11-08 (id quiz-YYMMDD-xxxx): warning only; later: error. */
export const capNorm = (t: string) => t.replace(/[ً-ْٰـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
export function captionSpec(id: string, script: Script): string[] {
  const msgs: string[] = [];
  for (const l of script.lines) {
    if (!l.narration_ar || !l.caption_ar || l.no_caption) continue;
    const spoken = new Set(capNorm(l.narration_ar));
    const near = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && Math.abs(a.length - b.length) <= 1 && (a.startsWith(b) || b.startsWith(a) || [...a].filter((c, i) => c !== b[i]).length <= 1));  // dialect spelling (بدلوا/بدلو)
    const extra = capNorm(l.caption_ar).filter(w => ![...spoken].some(x => near(w, x)) && !/^\d+$/.test(w));  // digits are spoken as number words
    if (extra.length) msgs.push(`line ${l.id}: caption_ar has words not in its narration_ar: ${extra.map(w => `«${w}»`).join(' ')} (captions show only spoken words; add them to narration_ar or drop them from caption_ar, the on-screen text belongs in onscreen_ar)`);
  }
  if (!msgs.length) return msgs;
  const d = /^quiz-(\d{6})-/.exec(id)?.[1] ?? '999999';
  if (d < '261108') { console.warn(`[captionSpec] ${id} (legacy, warning only): ` + msgs.join(' | ')); return msgs; }
  throw new Error(`caption spec check failed (${id}): ` + msgs.join(' | '));
}

export function lineOf(script: Script, id: string | undefined): ScriptLine | undefined {
  if (!id) return undefined;
  const l = script.lines.find(x => x.id === id);
  if (!l) throw new Error(`script.json has no line "${id}"`);
  return l;
}

/** Replace the {CHANNEL} placeholder in on-screen strings with the final channel name. */
export const fill = (s: string | undefined, spec: QuizSpec) => (s ?? '').replaceAll('{CHANNEL}', spec.channel_name);

export function validate(spec: QuizSpec, script: Script) {
  const ids = new Set(script.lines.map(l => l.id));
  for (const r of spec.rounds) {
    for (const k of [...(r.pre_lines ?? []), r.set_line, r.q_line, r.a_line, ...(r.post_lines ?? [])]) if (k && !ids.has(k)) throw new Error(`round ${r.id}: unknown line ${k}`);
  }
  validateOpen(spec, script);
  validateHook(spec, script);
  validateEnds(spec, script);
  if (spec.loop != null && spec.loop !== 'zoom') throw new Error(`quiz.json loop "${spec.loop}" is not supported (use "zoom")`);
  if (spec.loop && !spec.no_endcard) throw new Error('quiz.json loop "zoom" needs no_endcard: true (the end-card would cover the loop)');
  for (const r of spec.rounds) {  // countdown cue (optional): short method hint during the countdown, never an answer
    const cue = r.params?.cd_cue;
    if (cue == null) continue;
    if (typeof cue !== 'string' || !cue.trim() || [...cue].length > 18) throw new Error(`round ${r.id}: params.cd_cue must be a non-empty string of <= 18 characters incl. spaces (got ${typeof cue === 'string' ? [...cue].length : typeof cue})`);
  }
  for (const r of spec.rounds) { const c = cdLen(spec, r); if (!(c >= 1.5 && c <= 3)) throw new Error(`round ${r.id}: countdown timings.cd ${c} outside 1.5-3 s`); }
}

/** Open final round rules (owner 2026-11-08): last puzzle round only, no a_line / explanation_ar / end_question, needs post_lines
 *  (closing ask, spoken + on-screen) and a stored params.answer (pinned comment, puzzle-judge). */
export function validateOpen(spec: QuizSpec, script: Script) {
  spec.rounds.forEach((r, i) => {
    if (!r.open) return;
    const bad = (m: string) => { throw new Error(`round ${r.id}: open round ${m}`); };
    if (i !== spec.rounds.length - 1) bad('is allowed only on the LAST round');
    if (r.type === 'score_cta' || r.type === 'hook_intro') bad(`cannot be a ${r.type} round (needs a real puzzle)`);
    if (r.a_line) bad('must not have an a_line (the answer is never spoken or shown)');
    if (r.explanation_ar) bad('must not have explanation_ar (it would reveal the answer)');
    if (spec.end_question) bad('cannot be combined with end_question (the closing ask IS the end text)');
    if (!r.q_line) bad('needs a q_line');
    if (!(r.post_lines ?? []).filter(Boolean).length) bad('needs post_lines: the closing ask line (open-endings.md, OE01..OE15) with narration_ar + onscreen_ar');
    for (const k of r.post_lines ?? []) { const l = script.lines.find(x => x.id === k); if (!l?.narration_ar || !l.onscreen_ar) bad(`post line ${k} needs narration_ar and onscreen_ar`); }
    if (r.params?.answer == null && !r.params?.answer_ar) bad('keep params.answer (or params.answer_ar) stored in quiz.json for the pinned comment + puzzle-judge');
  });
}

/** Countdown length (s) of a round: round timings.cd → quiz.json timings.cd → 3.0. */
export const cdLen = (spec: QuizSpec, r: Round) => r.timings?.cd ?? spec.timings?.cd ?? 3;

/** quiz.json/script.json `hook` checks: category is one of the 8 hooks.md keys, variant is registered and matches the
 *  hook_intro round, both files agree, and the on-screen text matches the hook line. */
export function validateHook(spec: QuizSpec, script: Script) {
  const hr = spec.rounds.filter(r => r.type === 'hook_intro');
  const H = spec.hook;
  if (!H) {
    if (hr.length) throw new Error(`quiz.json: a hook_intro round needs quiz.json hook {category, variant, line_ar, onscreen_ar, tts} (docs/brands/quiz-ar/hooks.md)`);
    if (script.hook) throw new Error('script.json has hook but quiz.json does not');
    return;
  }
  const bad = (m: string) => { throw new Error(`hook: ${m}`); };
  if (!(H.category in HOOK_CATEGORIES)) bad(`category "${H.category}" is not one of ${Object.keys(HOOK_CATEGORIES).join(' | ')}`);
  for (const k of ['variant', 'line_ar', 'onscreen_ar'] as const) if (typeof H[k] !== 'string' || !H[k].trim()) bad(`${k} is required`);
  if (typeof H.tts !== 'boolean') bad('tts must be true or false');
  const v = variantOf(H.variant);
  if (hr.length !== 1) bad(`expected exactly one hook_intro round, found ${hr.length}`);
  if (variantOf(hr[0].params.variant).name !== v.name) bad(`hook.variant "${H.variant}" ≠ round ${hr[0].id} params.variant "${hr[0].params.variant}"`);
  const S = script.hook;
  if (!S) bad('script.json must carry the same hook block');
  for (const k of ['category', 'variant', 'line_ar', 'onscreen_ar', 'tts'] as const) if (S![k] !== H[k]) bad(`script.json hook.${k} «${S![k]}» ≠ quiz.json «${H[k]}»`);
  const ln = hr[0].params.line ? script.lines.find(l => l.id === hr[0].params.line) : undefined;
  if (H.tts && !ln?.narration_ar) bad(`tts:true but round ${hr[0].id} has no spoken params.line`);
  if (ln && ln.onscreen_ar !== H.onscreen_ar) bad(`onscreen_ar «${H.onscreen_ar}» ≠ script line ${ln.id} onscreen_ar «${ln.onscreen_ar}»`);
}

/** The script line that carries the big hook text (hook_line.line → the hook_intro's params.line). */
export const hookLineId = (spec: QuizSpec) => spec.hook_line ? (spec.hook_line.line ?? spec.rounds.find(r => r.type === 'hook_intro')?.params.line) : undefined;

/** hook_line / end_question / last-round post_lines checks (owner 2026-11-08). Old quiz.json files have none of them. */
export function validateEnds(spec: QuizSpec, script: Script) {
  const HL = spec.hook_line, EQ = spec.end_question;
  if (HL) {
    const bad = (m: string) => { throw new Error(`hook_line ${HL.id}: ${m}`); };
    if (!/^(HL|SV|SM|FN|SC)\d{2}$/.test(HL.id ?? '')) bad('id must be a bank id: hook-bank-owner.md (SV/SM/FN/SC nn, required for new videos) or hook-lines.md (HL nn, old productions)');
    const hr = spec.rounds.find(r => r.type === 'hook_intro');
    if (!hr) bad('needs a hook_intro round (the line is spoken and shown there)');
    const id = hookLineId(spec);
    if (!id) bad('no script line: set hook_line.line or the hook_intro params.line');
    if (hr!.params.line && hr!.params.line !== id) bad(`hook_line.line "${id}" ≠ hook_intro params.line "${hr!.params.line}" (the intro speaks params.line)`);
    const ln = script.lines.find(l => l.id === id);
    if (!ln) bad(`script.json has no line "${id}"`);
    if (!ln!.narration_ar) bad(`line ${id} has no narration_ar (the hook line is spoken)`);
    const bank = OWNER_HOOK_LINES[HL.id] ?? ownerBank()[HL.id];   // owner lines (hook-bank-owner.md; HL26-HL32 superseded but still valid)
    const owner = bank != null && normHL(ln!.onscreen_ar) === bank;
    if (/^(SV|SM|FN|SC)/.test(HL.id) && bank == null) bad(`${HL.id} is not in hook-bank-owner.md`);
    if (bank != null && !owner) bad(`onscreen_ar «${ln!.onscreen_ar}» ≠ the bank text of ${HL.id}`);
    const n = words(ln!.onscreen_ar).length;
    if (n < 2 || n > (owner ? 12 : 7)) bad(`onscreen_ar «${ln!.onscreen_ar}» has ${n} words (2-${owner ? 12 : 7})`);
    if (!owner) for (const t of [ln!.onscreen_ar, ln!.narration_ar ?? '']) for (const [re, what] of HOOK_LINE_BANNED) if (re.test(t)) bad(`«${t}» carries a banned ${what} word (hook-lines.md rules)`);
  }
  if (EQ) {
    const bad = (m: string) => { throw new Error(`end_question ${EQ.id}: ${m}`); };
    if (!/^EQ\d{2}$/.test(EQ.id ?? '')) bad('id must be an end-questions.md bank id like "EQ05"');
    const n = words(EQ.text_ar ?? '').length;
    if (n < 2 || n > 10) bad(`text_ar «${EQ.text_ar}» has ${n} words (2-10)`);
    if (/حدس/.test(EQ.text_ar)) bad('no «حدس» (brand = observation)');
    const last = spec.rounds[spec.rounds.length - 1];
    if (!last || last.type === 'score_cta' || last.type === 'hook_intro' || (!last.a_line && !last.open)) bad('the last round must be a puzzle round with an answer (no score_cta outro)');
    if (EQ.line && !script.lines.find(l => l.id === EQ.line)?.narration_ar) bad(`line "${EQ.line}" is not a spoken script line`);
    if (EQ.at != null && !(EQ.at >= 0 && EQ.at <= 1.5)) bad(`at ${EQ.at} outside 0-1.5 s after the reveal`);
  }
}

/** Duration of each spoken line: measured (after TTS + alignment) or the script's start/end hints (placeholder). */
export type LineDurations = Record<string, number>;
export function hintDurations(script: Script): LineDurations {
  return Object.fromEntries(script.lines.filter(l => l.narration_ar).map(l => [l.id, +(l.end_hint - l.start_hint - 0.15).toFixed(2)]));
}
