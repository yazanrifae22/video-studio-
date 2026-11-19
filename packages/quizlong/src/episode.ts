/**
 * quiz-long (quiz-ar long-form, 16:9) episode.json: types, loader, validator and the spoken-line list.
 * Schema: productions/quiz-261112-fpr4/brief.md (v1 + v1.1: 2-option mechanics truefalse/bigger, per-question think_s,
 * also_text, bets, ending.ladder; v1.4 productions/quiz-261113-cqz3/brief.md: animal picture clues {type:"animal", emoji,
 * effect zoom|blur|strips|silhouette, focus}, answer_emoji / subject_emoji stickers, option emoji, theme.palette "wild"; v1.5
 * productions/quiz-261113-5gku/brief.md "Schema v1.5": multi-flag clues {type:"flags"} - pick mode {pick:true, label} where the
 * options carry iso + text (flag_pick 4 / flag_pair 2), clue mode {isos 2-4, labels, names} + 4 text options (flag_diff /
 * flag_family), optional ratio {iso: [a, b]} = true proportion, read order-free as landscape (the brief's mc [4, 5] = 5:4 wide); theme.palette "twin"). Unknown optional fields are carried through untouched; nothing optional may crash.
 */
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import { aiTextFields, stringsWithKeys } from '../../shared/src/ai-text.ts';

export interface Option { text: string; iso?: string | null; emoji?: string | null; [k: string]: unknown }
export interface Hint { at: number; text: string }
export interface Question {
  id: string; level: number; mechanic: string;
  ask_text: string; ask_tts: string;
  clue?: Record<string, unknown> & { type?: string };
  options?: Option[]; answer_index?: number;
  answers?: Option[]; accept?: Option[];
  hints?: Hint[]; think_s?: number; also_text?: string;
  reveal_tts: string; learn_text: string; learn_tts: string;
  answer_iso?: string; answer_emoji?: string; subject_emoji?: string; source?: string;
  [k: string]: unknown;
}
export interface Level { n: number; name: string; think_s: number;
  /** null (v1.3) = no card for this level; tally_pause_s = extra silent seconds on the card after its line */
  card?: { title?: string; tts?: string; tally_text?: string; sub?: string; new_text?: string; series_text?: string; tally_pause_s?: number; merged_with_promise?: boolean; duration_s?: number; [k: string]: unknown } | null;
  /** v1.2 speed round of this level: card before its first speed item + outro over the last item's reveal hold */
  speed?: { title?: string; sub?: string; intro_tts?: string; outro_tts?: string; [k: string]: unknown } }
export interface Episode {
  schema: string; production_id?: string; brand?: string; title?: string;
  voice?: { name?: string; style?: string; retakes?: Record<string, string | number>; [k: string]: unknown };
  opening: { hook_tts: string; hook_text?: string; promise_tts?: string; promise_after_q?: number; promise_before_q?: number; promise_card_s?: number; [k: string]: unknown };
  levels: Level[];
  questions: Question[];
  bets?: { before_q: number; tts: string }[];
  ending?: { score_ask_tts?: string; ladder_tts?: string; handoff_tts?: string; signoff_tts?: string; ladder_title?: string; end_frame_text?: string; end_frame_sub?: string; ladder?: any; [k: string]: unknown };
  theme?: Record<string, unknown>;
  music?: { bpm?: number };
  [k: string]: unknown;
}

/** UTF-8 re-read as cp1252 (same pattern as prelint.ts MOJIBAKE). */
export const MOJIBAKE = /Â[\u0080-¿]|â€|Ã[\u0080-¿]|Ø[\u0080-¿]|Ù[\u0080-¿]/;
export const TWO_OPTION = new Set(['truefalse', 'bigger', 'versus', 'flag_pair']);
export const KNOWN_MECHANICS = new Set(['flag', 'emoji', 'nickname', 'capital', 'flag_hint', 'name3', 'truefalse', 'bigger', 'speed', 'neighbors', 'odd_one_out', 'landmark', 'currency', 'language', 'flag_zoom', 'flag_blur', 'flag_strips', 'symbol', 'distance',
  // v1.4 (animals)
  'animal', 'animal_zoom', 'animal_blur', 'animal_strips', 'silhouette', 'versus', 'sound', 'baby', 'group', 'home', 'number', 'record', 'habitat', 'who_am_i',
  // v1.5 (look-alike flags): multi-flag clues
  'flag_pick', 'flag_pair', 'flag_diff', 'flag_family']);
/** v1.4 animal picture effects (null / absent = plain picture) */
export const ANIMAL_EFFECTS = new Set(['zoom', 'blur', 'strips', 'silhouette']);
/** mechanics without options[]: speed (v1.2, one answer, no learn line) and legacy name3 (3 answers). Everything else is a plain 2/4-option question. */
/** v1.5: an ISO code the template can draw (a file in template/assets/flags/4x3 or 1x1) */
const FLAG_DIR = path.join(P.root, 'packages', 'quizlong', 'template', 'assets', 'flags');
export const flagKnown = (iso: unknown) => typeof iso === 'string' && /^[a-z]{2}(-[a-z]{2,3})?$/.test(iso)
  && (fs.existsSync(path.join(FLAG_DIR, '4x3', iso + '.svg')) || fs.existsSync(path.join(FLAG_DIR, '1x1', iso + '.svg')));
/** v1.5 clue {type:"flags"}: pick mode (the options are the flags) vs clue mode (flags as the clue + 4 text options) */
export const isFlagPick = (q: { clue?: any }) => q.clue?.type === 'flags' && q.clue.pick === true;
export const NO_OPTIONS = new Set(['speed', 'name3']);
export const isSpeed = (q: { mechanic?: string }) => q.mechanic === 'speed';

export function loadEpisode(productionId: string) {
  const dir = path.join(P.productions, productionId);
  const file = path.join(dir, 'episode.json');
  if (!fs.existsSync(file)) throw new Error(`quiz-long: ${file} not found`);
  const ep = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')) as Episode;
  return { ep, dir, file };
}

export const words = (s: string | undefined | null) => String(s ?? '').trim().split(/\s+/).filter(Boolean);
/** Silent-mode speech estimate: 2.5 words/s, never below 0.5 s. */
export const estimateSpeech = (text: string) => Math.max(0.5, words(text).length / 2.5);

export const levelOf = (ep: Episode, n: number) => ep.levels.find(l => l.n === n);
export const thinkOf = (ep: Episode, q: Question) => Number(q.think_s ?? (isSpeed(q) ? 3 : levelOf(ep, q.level)?.think_s ?? 5));

/** Line id scheme (stable: TTS cache keys, narration clip names, show.json host lines). */
export const LID = { hook: 'hook', promise: 'promise', level: (n: number) => `level${n}`, speedIntro: (n: number) => `level${n}.speed_intro`, speedOutro: (n: number) => `level${n}.speed_outro`, ladder: 'ladder', signoff: 'signoff', bet: (q: string) => `${q}.bet`, ask: (q: string) => `${q}.ask`, reveal: (q: string) => `${q}.reveal`, learn: (q: string) => `${q}.learn`, score: 'score_ask', handoff: 'handoff' };

export interface Line { id: string; text: string }
/** Bet line of a question: bets[].before_q = question number N -> the question with id qNN, else the N-th question. */
export const betFor = (ep: Episode, qi: number) => {
  const id = ep.questions[qi]?.id;
  return (ep.bets ?? []).find(b => {
    if (typeof b.tts !== 'string' || !b.tts.trim()) return false;
    const byId = ep.questions.findIndex(q => q.id === `q${String(b.before_q).padStart(2, '0')}`);
    return byId >= 0 ? ep.questions[byId].id === id : Number(b.before_q) === qi + 1;
  });
};
const has = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
/** Where the promise line is spoken: 'before' = over Q{promise_before_q} after the hook (v1.2), else on a card after Q{promise_after_q}. */
export const promiseMode = (ep: Episode): { mode: 'before' | 'after' | 'none'; q: number } => !has(ep.opening?.promise_tts) ? { mode: 'none', q: 0 }
  : ep.opening.promise_before_q != null ? { mode: 'before', q: Number(ep.opening.promise_before_q) } : { mode: 'after', q: Number(ep.opening.promise_after_q ?? 1) };

/**
 * TTS takes: one per group of 5 questions (hook + bets + ask/reveal/learn lines in screen order) and one for the cards
 * (promise, level cards, ending). Groups are fixed by question position, so a partial (--only) build asks for exactly the
 * same take texts (and TTS cache keys) as the full episode.
 */
export function takeGroups(ep: Episode, per = 5): { key: string; qids: string[]; lines: Line[] }[] {
  const out: { key: string; qids: string[]; lines: Line[] }[] = [];
  ep.questions.forEach((q, i) => {
    const g = Math.floor(i / per);
    if (!out[g]) out[g] = { key: `q${String(g * per + 1).padStart(2, '0')}-q${String(Math.min(ep.questions.length, (g + 1) * per)).padStart(2, '0')}`, qids: [], lines: [] };
    const G = out[g];
    G.qids.push(q.id);
    const pm = promiseMode(ep);
    if (i === 0 && has(ep.opening?.hook_tts)) G.lines.push({ id: LID.hook, text: ep.opening.hook_tts });
    if (pm.mode === 'before' && pm.q === i + 1) G.lines.push({ id: LID.promise, text: ep.opening.promise_tts! });
    const b = betFor(ep, i);
    if (b) G.lines.push({ id: LID.bet(q.id), text: b.tts });
    if (has(q.ask_tts)) G.lines.push({ id: LID.ask(q.id), text: q.ask_tts });
    if (has(q.reveal_tts)) G.lines.push({ id: LID.reveal(q.id), text: q.reveal_tts });
    if (has(q.learn_tts) && q.learn_voice !== false) G.lines.push({ id: LID.learn(q.id), text: q.learn_tts });
  });
  const cards: Line[] = [];
  if (promiseMode(ep).mode === 'after') cards.push({ id: LID.promise, text: ep.opening.promise_tts! });
  for (const l of [...ep.levels].sort((a, b) => a.n - b.n)) {
    if (has(l.card?.tts)) cards.push({ id: LID.level(l.n), text: l.card!.tts! });
    if (has(l.speed?.intro_tts)) cards.push({ id: LID.speedIntro(l.n), text: l.speed!.intro_tts! });
    if (has(l.speed?.outro_tts)) cards.push({ id: LID.speedOutro(l.n), text: l.speed!.outro_tts! });
  }
  if (has(ep.ending?.ladder_tts)) cards.push({ id: LID.ladder, text: ep.ending!.ladder_tts! });
  if (has(ep.ending?.score_ask_tts)) cards.push({ id: LID.score, text: ep.ending!.score_ask_tts! });
  if (has(ep.ending?.handoff_tts)) cards.push({ id: LID.handoff, text: ep.ending!.handoff_tts! });
  if (has(ep.ending?.signoff_tts)) cards.push({ id: LID.signoff, text: ep.ending!.signoff_tts! });
  if (cards.length) out.push({ key: 'cards', qids: [], lines: cards });
  return out.filter(Boolean);
}

/** --only q01-q05 | q01,q04 -> the selected question ids (in episode order). */
export function selectQuestions(ep: Episode, only?: string): Set<string> | null {
  if (!only) return null;
  const ids = ep.questions.map(q => q.id);
  const sel = new Set<string>();
  for (const part of only.split(',').map(s => s.trim()).filter(Boolean)) {
    const m = /^(.+?)-(.+)$/.exec(part);
    if (m && ids.includes(m[1]) && ids.includes(m[2])) { const a = ids.indexOf(m[1]), b = ids.indexOf(m[2]); for (let i = Math.min(a, b); i <= Math.max(a, b); i++) sel.add(ids[i]); }
    else if (ids.includes(part)) sel.add(part);
    else throw new Error(`--only: unknown question id/range "${part}" (ids ${ids[0]}..${ids[ids.length - 1]})`);
  }
  if (!sel.size) throw new Error('--only selected no questions');
  return sel;
}

const str = (x: unknown) => typeof x === 'string' && x.trim().length > 0;

/** Structural + content validation. errors block plan/build; warnings are printed. */
export function validateEpisode(ep: Episode): { errors: string[]; warnings: string[] } {
  const errors: string[] = [], warnings: string[] = [];
  const E = (m: string) => errors.push(m), W = (m: string) => warnings.push(m);
  if (!String(ep?.schema ?? '').startsWith('quiz-long/')) E(`schema "${ep?.schema}" (expected quiz-long/1...)`);
  if (!ep.opening || !str(ep.opening.hook_tts)) E('opening.hook_tts missing');
  if (!Array.isArray(ep.levels) || !ep.levels.length) E('levels[] missing');
  const lv = new Set<number>();
  for (const l of ep.levels ?? []) {
    if (!(Number.isInteger(l.n) && l.n >= 1 && l.n <= 4)) E(`level n=${l.n}: must be 1-4`);
    if (lv.has(l.n)) E(`level ${l.n} defined twice`);
    lv.add(l.n);
    if (!str(l.name)) E(`level ${l.n}: name missing`);
    if (!(Number(l.think_s) >= 2 && Number(l.think_s) <= 15)) E(`level ${l.n}: think_s ${l.think_s} outside 2-15`);
    if (l.card !== null && !l.card?.title) W(`level ${l.n}: card.title missing (the card shows no title)`);
  }
  if (!Array.isArray(ep.questions) || !ep.questions.length) { E('questions[] missing'); return { errors, warnings }; }
  const ids = new Set<string>();
  let runSlot = 0, lastSlot = -1, runMech = 0, lastMech = '';
  ep.questions.forEach((q, i) => {
    const at = `${q?.id ?? `#${i + 1}`}`;
    if (!str(q?.id)) E(`question #${i + 1}: id missing`);
    else if (ids.has(q.id)) E(`${at}: duplicate id`);
    else if (/[.\s/\\]/.test(q.id)) E(`${at}: id must not contain dots, spaces or slashes`);
    ids.add(q?.id);
    if (!lv.has(q.level)) E(`${at}: level ${q.level} is not defined in levels[] (1-4)`);
    if (!str(q.mechanic)) E(`${at}: mechanic missing`);
    else if (!KNOWN_MECHANICS.has(q.mechanic)) W(`${at}: unknown mechanic "${q.mechanic}" (passed through to the template as is)`);
    const speed = isSpeed(q);
    // learn_voice false (v1.3 r7): no learn voice line, the learn_text runs alone
    for (const k of (speed ? ['reveal_tts'] : ['ask_text', 'ask_tts', 'reveal_tts', 'learn_text', ...(q.learn_voice === false ? [] : ['learn_tts'])]) as (keyof Question)[]) if (!str(q[k])) E(`${at}: ${String(k)} missing`);
    if (q.hold_s != null && !(Number(q.hold_s) >= 0 && Number(q.hold_s) <= 10)) E(`${at}: hold_s ${q.hold_s} outside 0-10`);
    if (q.clue != null && (typeof q.clue !== 'object' || !str((q.clue as any).type))) E(`${at}: clue must be an object with a type`);
    else if (q.clue?.type === 'animal') {
      const c = q.clue as any;
      if (!str(c.emoji)) E(`${at}: animal clue needs a non-empty emoji`);
      if (c.effect != null && !ANIMAL_EFFECTS.has(c.effect)) E(`${at}: animal clue effect "${c.effect}" (zoom | blur | strips | silhouette | null)`);
      if (c.focus != null && !(Array.isArray(c.focus) && c.focus.length === 2 && c.focus.every((v: unknown) => typeof v === 'number' && v >= 0 && v <= 1))) E(`${at}: clue.focus must be [fx, fy] in 0..1`);
      if (speed && c.effect !== 'silhouette') W(`${at}: speed animal items are silhouette rounds (effect "${c.effect ?? null}")`);
    } else if (q.clue?.type === 'flags') {
      // v1.5 multi-flag clue
      const c = q.clue as any, n = q.options?.length ?? 0;
      if (c.ratio != null) {
        if (typeof c.ratio !== 'object' || Array.isArray(c.ratio)) E(`${at}: clue.ratio must be an object {iso: [w, h]}`);
        else for (const [iso, r] of Object.entries(c.ratio)) if (!(Array.isArray(r) && r.length === 2 && r.every((v: unknown) => typeof v === 'number' && v > 0 && v <= 10) && Math.max(r[0], r[1]) / Math.min(r[0], r[1]) <= 3)) E(`${at}: clue.ratio.${iso} must be two positive numbers (flag proportion, e.g. [2, 3]; read order-free as a landscape flag, long side <= 3x short side)`);
      }
      if (c.pick === true) {
        if (!str(c.label)) E(`${at}: flags pick clue needs a label`);
        else if (words(c.label).length > 6) W(`${at}: clue.label has ${words(c.label).length} words (keep it short: it is the big line on top)`);
        for (const [k, o] of (q.options ?? []).entries()) if (!flagKnown(o?.iso)) E(`${at}: option ${k + 1} needs a known flag iso (got "${o?.iso ?? ''}")`);
        const isos = (q.options ?? []).map(o => o?.iso);
        if (new Set(isos).size !== isos.length) E(`${at}: two options show the same flag`);
        if (q.mechanic === 'flag_pick' && n !== 4) E(`${at}: flag_pick needs 4 options (got ${n})`);
        if (c.ratio && typeof c.ratio === 'object') for (const iso of Object.keys(c.ratio)) if (!isos.includes(iso)) W(`${at}: clue.ratio.${iso} is not one of the option flags`);
      } else {
        const isos = Array.isArray(c.isos) ? c.isos : [];
        if (!(isos.length >= 2 && isos.length <= 4)) E(`${at}: flags clue needs isos[] with 2-4 flags (got ${isos.length})`);
        for (const iso of isos) if (!flagKnown(iso)) E(`${at}: clue.isos "${iso}" is not a known flag`);
        if (new Set(isos).size !== isos.length) E(`${at}: clue.isos repeats a flag`);
        if (c.labels != null && !(Array.isArray(c.labels) && c.labels.length === isos.length && c.labels.every(str))) E(`${at}: clue.labels must be ${isos.length} non-empty strings (one per flag)`);
        if (c.names != null && typeof c.names !== 'boolean') E(`${at}: clue.names must be true or false`);
        if (c.names === true && c.labels == null) E(`${at}: clue.names true needs clue.labels`);
        if (n !== 4) E(`${at}: a flags clue (no pick) needs 4 text options (got ${n})`);
        if ((q.options ?? []).some(o => o?.iso)) W(`${at}: option iso on a flags clue item is ignored (the options are text tiles)`);
        if (c.ratio && typeof c.ratio === 'object') for (const iso of Object.keys(c.ratio)) if (!isos.includes(iso)) W(`${at}: clue.ratio.${iso} is not in clue.isos`);
      }
      if (['flag_pick', 'flag_pair'].includes(q.mechanic) && c.pick !== true) E(`${at}: ${q.mechanic} needs clue {type:"flags", pick:true}`);
      if (['flag_diff', 'flag_family'].includes(q.mechanic) && c.pick === true) E(`${at}: ${q.mechanic} is a clue-mode item (clue.isos, no pick)`);
    } else if (q.clue?.type === 'text' && (q.clue as any).lines != null && !(Array.isArray((q.clue as any).lines) && (q.clue as any).lines.length >= 1 && (q.clue as any).lines.length <= 3 && (q.clue as any).lines.every(str))) E(`${at}: clue.lines must be 1-3 non-empty strings`);
    for (const k of ['answer_emoji', 'subject_emoji'] as const) if (q[k] != null && !str(q[k])) E(`${at}: ${k} must be a non-empty emoji string`);
    for (const o of [...(q.options ?? []), ...(q.answers ?? [])]) if (o?.emoji != null && !str(o.emoji)) E(`${at}: option/answer emoji must be a non-empty string`);
    if (q.think_s != null && !(Number(q.think_s) >= 2 && Number(q.think_s) <= 15)) E(`${at}: think_s ${q.think_s} outside 2-15`);
    if (speed) {
      if (!Array.isArray(q.answers) || q.answers.length !== 1 || !str(q.answers[0]?.text)) E(`${at}: speed needs exactly one answer with text`);
      if (q.options?.length) E(`${at}: speed has no options`);
      if (str(q.learn_text) || str(q.learn_tts)) E(`${at}: speed has no learn_text/learn_tts`);
      if (!levelOf(ep, q.level)?.speed) W(`${at}: levels[${q.level}].speed (title/sub/intro_tts/outro_tts) missing: speed card has no text`);
    } else if (q.mechanic === 'name3') {
      if (!Array.isArray(q.answers) || q.answers.length !== 3 || !q.answers.every(a => str(a?.text))) E(`${at}: name3 needs exactly 3 answers with text`);
      if (!Array.isArray(q.accept) || !q.accept.length) E(`${at}: name3 needs an accept[] list of every valid answer`);
      else for (const a of q.answers ?? []) if (!q.accept.some(x => (x.iso && a.iso && x.iso === a.iso) || x.text === a.text)) E(`${at}: name3 answer "${a.text}" is not in accept[]`);
      if (q.options?.length) W(`${at}: name3 carries options[] (ignored)`);
    } else {
      const n = q.options?.length ?? 0;
      if (n !== 2 && n !== 4) E(`${at}: ${n} options (must be 2 or 4)`);
      else if (TWO_OPTION.has(q.mechanic) && n !== 2) E(`${at}: ${q.mechanic} needs 2 options`);
      if (!(q.options ?? []).every(o => str(o?.text))) E(`${at}: every option needs text`);
      if (!(Number.isInteger(q.answer_index) && q.answer_index! >= 0 && q.answer_index! < n)) E(`${at}: answer_index ${q.answer_index} out of range 0-${n - 1}`);
      const texts = (q.options ?? []).map(o => String(o?.text ?? '').trim());
      if (new Set(texts).size !== texts.length) E(`${at}: two options have the same text`);
      if (q.clue?.type === 'animal' && n === 4 && (q.options ?? []).some(o => str(o?.emoji))) W(`${at}: option emoji on a picture question gives the answer away (brief v1.4: never on picture questions)`);
      if (n === 4) { if (q.answer_index === lastSlot) runSlot++; else { runSlot = 1; lastSlot = q.answer_index ?? -1; } if (runSlot >= 3) W(`${at}: right answer in slot ${q.answer_index} three times in a row`); }
    }
    for (const h of q.hints ?? []) if (!(Number(h?.at) > 0 && Number(h.at) < 1) || !str(h?.text)) E(`${at}: hint needs at (0-1 fraction of think time) and text`);
    if (q.mechanic === lastMech) runMech++; else { runMech = 1; lastMech = q.mechanic; }
    if (runMech > 3) W(`${at}: mechanic ${q.mechanic} more than 3 times in a row`);
    if (!speed && words(q.ask_text).length > 6) W(`${at}: ask_text has ${words(q.ask_text).length} words (rule <= 6)`);
    if (words(q.learn_text).length > 12) W(`${at}: learn_text has ${words(q.learn_text).length} words (rule <= 12)`);
    if (str(q.ask_tts) && estimateSpeech(q.ask_tts) > 2.4) W(`${at}: ask_tts likely > 2 s (${words(q.ask_tts).length} words)`);
  });
  for (const b of ep.bets ?? []) if (!(Number.isInteger(Number(b?.before_q)) && b.before_q >= 1 && b.before_q <= ep.questions.length) || !str(b?.tts)) E(`bets: entry ${JSON.stringify(b).slice(0, 60)} needs before_q (1-${ep.questions.length}) and tts`);
  if (ep.opening?.promise_after_q != null && !(Number(ep.opening.promise_after_q) >= 1 && Number(ep.opening.promise_after_q) <= ep.questions.length)) E(`opening.promise_after_q ${ep.opening.promise_after_q} out of range`);
  if (ep.opening?.promise_before_q != null && !(Number(ep.opening.promise_before_q) >= 1 && Number(ep.opening.promise_before_q) <= ep.questions.length)) E(`opening.promise_before_q ${ep.opening.promise_before_q} out of range`);
  for (const l of ep.levels ?? []) if (l.speed && !str(l.speed.intro_tts)) W(`level ${l.n}: speed.intro_tts missing (silent speed card)`);
  if (!ep.ending) W('ending missing (no ladder / end frame)');
  else {
    // v5: score_ask_tts "" is deliberate (the ladder line carries the comment ask); only a missing key warns
    if (ep.ending.score_ask_tts === undefined && !str(ep.ending.ladder_tts)) W('ending.score_ask_tts missing');
    if (!str(ep.ending.end_frame_text)) W('ending.end_frame_text missing');
    if (!ladderRows(ep).length) W('ending.ladder rows missing (the ladder segment shows no rows)');
  }
  // every string except voice settings and source URLs: mojibake + AI-generation wording
  const fields = stringsWithKeys({ ...ep, voice: undefined }).filter(f => !/(^|\.)source$/.test(f.key));
  for (const f of fields) if (MOJIBAKE.test(f.text)) E(`mojibake in ${f.key}: "${f.text.slice(0, 50)}" (re-save as UTF-8, open(..., encoding="utf8"))`);
  for (const h of aiTextFields(fields, 'quiz-ar')) E(`AI-generation wording in ${h.key}: "${h.phrase}" (owner rule: never)`);
  return { errors, warnings };
}

/** ending.ladder: an array of rows or {rows: [...]}; each row {min, max, title, ...}. */
export function ladderRows(ep: Episode): any[] {
  const l = ep.ending?.ladder;
  const rows = Array.isArray(l) ? l : Array.isArray(l?.rows) ? l.rows : [];
  return rows.filter((r: any) => r && typeof r === 'object');
}
