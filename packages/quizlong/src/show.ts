/**
 * quiz-long timing engine: episode.json + spoken-line timings -> show.json (research/quiz-longform-2026-11-12/show-contract.md),
 * placed narration lines, SFX cues, chapters and caption cues. Pure (no I/O): used by quizlong:plan (estimated timings) and
 * quizlong:build (measured timings from the aligned takes).
 */
import { betFor, estimateSpeech, isSpeed, ladderRows, levelOf, LID, promiseMode, thinkOf, words, type Episode, type Question } from './episode.ts';

/** Timing constants (seconds). One place, so pacing can be tuned without touching the logic. */
// v5 pacing (video round 1, QA 77 on pacing, 2026-11-13): old values in the trailing comments
export const T = {
  firstLine: 0.15,      // hook starts over Q1 at 0.15 s (first word <= 0.5 s)
  optionsIn: 0.35,      // options appear after the question card is in
  askAfterIn: 0.3,      // ask line may start 0.3 s after its segment starts, options animate under it (was 0.4)
  lineGap: 0.2,         // between consecutive spoken lines of one entrance (hook -> ask, bet -> ask)
  timerAfterAsk: 0.15,  // timer starts this long after the ask line ends (Q2+ without a bet)
  q1TimerAtAsk: true,   // Q1: countdown starts WITH its ask line, the ask is spoken over the running timer (was: after the ask)
  askEndToTimerEnd: 1.0,// guard when the timer runs under the ask: timer_end >= ask end + 1.0 (think extended if needed)
  revealLineAfter: 0.08,// reveal line starts just after the ding
  learnAfterReveal: 0.15,// learn line + learn strip start 0.15 s after the reveal line ends (was max(+0.15, reveal + 1.2))
  outAfterLast: 0.35,   // t.out = end of the last spoken line + 0.35 (was 0.6 after the learn line)
  exit: 0.3,            // segment end = t.out + exit: transition into the next segment <= 0.3 s
  name3Gap: 0.6,        // name3 answers pop >= 0.6 s apart
  silentLearn: 2.2,     // learn_text without a voice line: on screen alone for 2.2 s (was 3)
  betMaxAdd: 1.2,       // a bet/tease adds at most 1.2 s (over the previous learn hold when it fits, else at its question's entrance)
  cardLead: 0.2,        // card line starts 0.2 s after the card is in
  levelCardPad: 0.3, levelCardMax: 5.5, tallyPauseDefault: 1, levelCardSilent: 3,   // level card = line + 0.3 + tally_pause_s, <= 5.5 (was line + 0.8 in [3, 4.5] + tally)
  promiseCardPad: 0.8, promiseCardMin: 3, promiseCardMax: 4.5,                       // legacy promise card (promise_after_q), unchanged
  speedTimer: 0.25,     // speed item: timer starts 0.25 s after in (no ask line unless ask_tts)
  speedRevealPad: 0.3, speedRevealMin: 1.2,   // speed reveal hold = reveal line + 0.3, >= 1.2 s (was reveal line + 0.4)
  speedOutroOver: 1.5,  // speed outro spoken over the last 1.5 s of the last speed item's reveal hold
  speedCardPad: 0.3, speedCardMin: 2.2, speedCardMax: 3.2,   // was 0.5 / 2.5 / 3.5
  ladderLead: 0.3, ladderPad: 1.0, ladderMin: 5, ladderMax: 9,   // ladder = line + 1.0 in [5, 9] (was + 1.2, min 4.5, no max)
  handoffInEnd: 0.3,    // hand-off line spoken over the first seconds of the end frame (was inside the ladder)
  endFrame: 8,
  spokenEndingMax: 15,  // q40 reveal hold end -> last spoken word
  tickDb: -13, tickLastDb: -10,   // countdown ticks -4 dB (was -9 / -6)
};

export interface WordT { w: string; s: number; e: number }
/** speech duration of a line (onset -> end) + optional word times relative to the onset */
export interface LineTiming { dur: number; words?: WordT[] }
export type Timings = Record<string, LineTiming>;
export interface Host { t: number; end: number; mood: string; text: string; id: string }
export interface Placed { id: string; text: string; at: number; end: number; seg: string; mood: string }
export interface Cue { name: string; at: number; gain_db: number; under?: string }
export interface Chapter { t: number; title: string }

const r3 = (x: number) => Math.round(x * 1000) / 1000;
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export const arDigits = (n: number | string) => String(n).replace(/[0-9]/g, d => AR_DIGITS[+d]);
export const DEFAULT_THEME = { direction: 'blocks', level_themes: { '1': 'l1', '2': 'l2', '3': 'l3', '4': 'l4' } };
/** v1.4 theme.palette "wild" (animals) / v1.5 "twin" (look-alike flags): the template's own four level palettes w1..w4 (jungle green, savanna amber, deep-sea
 * blue, night violet) + finale wf. Explicit level_themes / finale in episode.theme still win; no palette = episode 1's l1..l4. */
export const PALETTES: Record<string, { level_themes: Record<string, string>; finale: string }> = {
  wild: { level_themes: { '1': 'w1', '2': 'w2', '3': 'w3', '4': 'w4' }, finale: 'wf' },
  // v1.5 "twin" (look-alike flags): t1 teal, t2 coral, t3 royal blue, t4 deep crimson with gold; finale tf
  twin: { level_themes: { '1': 't1', '2': 't2', '3': 't3', '4': 't4' }, finale: 'tf' },
};
export const themeOf = (ep: Episode) => {
  const th = (ep.theme ?? {}) as Record<string, unknown>, pal = typeof th.palette === 'string' ? PALETTES[th.palette] : undefined;
  return { ...DEFAULT_THEME, ...(pal ?? {}), ...th };
};

/** Arabic normaliser for matching answer names to aligned words (tashkeel, alef forms, ta marbuta, "ال", punctuation). */
const normAr = (s: string) => s.normalize('NFKD').replace(/[ً-ٰٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
  .replace(/[^\p{L}\p{N}]/gu, '').replace(/^ال/, '');

/**
 * only: the selected question ids (partial build). withCards: in a partial build also play the level cards, speed cards,
 * speed outros and the ending that sit next to the selected items (a level card plays when its level's first item is
 * selected, the level-1 card after Q1, a speed card with its first speed item, the ending when the last item is selected).
 */
export interface ShowOpts { only?: Set<string> | null; withCards?: boolean; brandName?: string; estimate?: boolean }

export function buildShow(ep: Episode, timing: Timings, opts: ShowOpts = {}) {
  const warnings: string[] = [];
  const lines: Placed[] = [];
  const sfx: Cue[] = [];
  const segments: any[] = [];
  const chapters: Chapter[] = [];
  const speech = (id: string, text: string): LineTiming => timing[id] ?? { dur: estimateSpeech(text) };
  const say = (seg: string, id: string, text: string, at: number, mood: string): Placed => {
    const lt = speech(id, text);
    const p = { id, text, at: r3(at), end: r3(at + lt.dur), seg, mood };
    lines.push(p);
    return p;
  };
  const has = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
  const host = (ps: Placed[]): Host[] => ps.map(p => ({ t: p.at, end: p.end, mood: p.mood, text: p.text, id: p.id }));
  const cue = (name: string, at: number, gain_db: number, under?: string) => { if (at >= 0) sfx.push({ name, at: r3(at), gain_db, ...(under ? { under } : {}) }); };
  const qs = ep.questions.map((q, i) => ({ q, i })).filter(x => !opts.only || opts.only.has(x.q.id));
  const partial = !!opts.only;
  const cardsOn = !partial || !!opts.withCards;
  const pm = promiseMode(ep);
  // counter (owner 2026-11-13): every item counts, speed items included: index = position 1..N, total_questions = N (40)
  const numberOf = new Map<string, number>(ep.questions.map((q, i) => [q.id, i + 1]));
  const lastQ = ep.questions[ep.questions.length - 1]?.id;
  // speed runs: index / total of every speed item inside its level
  const speedPos = new Map<string, { index: number; total: number; first: boolean; last: boolean }>();
  for (const L of ep.levels) { const items = ep.questions.filter(q => q.level === L.n && isSpeed(q)); items.forEach((q, k) => speedPos.set(q.id, { index: k + 1, total: items.length, first: k === 0, last: k === items.length - 1 })); }
  let t = 0;

  /** a card: spoken line(s) from start + cardLead; duration = speech + pad, clamped to [min, max]; extended (with a warning) rather than cutting speech */
  const card = (kind: string, id: string, n: number | null, said: { id: string; text: string | undefined; mood: string }[], lim: { pad: number; min: number; max: number; silent?: number; hold?: number }, extra: Record<string, unknown>) => {
    const start = t;
    if (start > 0) { cue('whoosh', start - 0.05, -6); cue('shimmer', start + 0.1, -10); }
    const ps: Placed[] = [];
    let c = start + T.cardLead;
    for (const s of said) if (has(s.text)) { const p = say(id, s.id, s.text, c, s.mood); ps.push(p); c = p.end + T.lineGap; }
    const spoken = ps.length ? ps[ps.length - 1].end - start : 0;
    let dur = ps.length ? Math.min(lim.max, Math.max(lim.min, spoken - T.cardLead + lim.pad)) : (lim.silent ?? lim.min);
    if (ps.length && spoken + 0.3 > dur) { warnings.push(`card ${id}: speech ends at +${spoken.toFixed(2)} s, past the ${lim.max} s card max: card extended to ${(spoken + 0.3).toFixed(2)} s (shorten the line)`); dur = spoken + 0.3; }
    // tally_pause_s: extra silent seconds on the card after its line (viewers count their points)
    const hold = Math.max(0, Number(lim.hold) || 0);
    t = r3(start + dur + hold);
    segments.push({ type: 'card', kind, id, level: n, ...extra, ...(hold ? { hold_s: hold } : {}), start: r3(start), end: t, host: host(ps) });
  };
  const levelCard = (n: number, first: boolean) => {
    const L = levelOf(ep, n);
    if (!L) return;
    chapters.push({ t: r3(t), title: `المستوى ${arDigits(n)}: ${L.name}` });
    if (L.card === null) return;   // v1.3: levels[n].card null = no card at all (Q1 runs straight into Q2)
    // v1.1: the level-1 card may carry the merged promise line (promise_after_q + merged_with_promise); v1.2 speaks the promise over Q1 instead
    const said = [...(first && pm.mode === 'after' && L.card?.merged_with_promise ? [{ id: LID.promise, text: ep.opening.promise_tts, mood: 'dare' }] : []), { id: LID.level(n), text: L.card?.tts, mood: 'tease' }];
    const start = t;
    if (start > 0) { cue('whoosh', start - 0.05, -6); cue('shimmer', start + 0.1, -10); }
    const ps: Placed[] = [];
    let c = start + T.cardLead;
    for (const s of said) if (has(s.text)) { const p = say(`level${n}`, s.id, s.text, c, s.mood); ps.push(p); c = p.end + T.lineGap; }
    // duration = lead + line + 0.3 + tally_pause_s (default 1), hard max 5.5 s; a line too long for 5.5 s gets line + 0.3 (no tally) + a warning
    const tally = Math.max(0, Number(L.card?.tally_pause_s ?? T.tallyPauseDefault) || 0);
    let dur: number, hold = 0;
    if (ps.length) {
      const spoken = ps[ps.length - 1].end - start + T.levelCardPad;
      if (spoken > T.levelCardMax) { dur = spoken; warnings.push(`card level${n}: line ends at +${(spoken - T.levelCardPad).toFixed(2)} s: card ${spoken.toFixed(2)} s > ${T.levelCardMax} s max, no tally pause (shorten the line)`); }
      else { hold = Math.min(tally, T.levelCardMax - spoken); dur = spoken + hold; }
    } else dur = Number(L.card?.duration_s ?? (first ? ep.opening?.promise_card_s : undefined) ?? T.levelCardSilent);
    t = r3(start + dur);
    segments.push({ type: 'card', kind: 'level', id: `level${n}`, level: n,
      title: L.card?.title ?? `المستوى ${arDigits(n)}: ${L.name}`, level_name: L.name, sub: L.card?.sub ?? null, tally_text: L.card?.tally_text ?? null,
      new_text: L.card?.new_text ?? null, series_text: L.card?.series_text ?? null, stake_text: L.card?.stake_text ?? null, think_s: L.think_s,
      ...(hold ? { hold_s: r3(hold) } : {}), start: r3(start), end: t, host: host(ps) });
  };
  const speedCard = (n: number) => {
    const L = levelOf(ep, n), S = L?.speed ?? {};
    const start = t;
    if (start > 0) { cue('whoosh', start - 0.05, -6); cue('shimmer', start + 0.1, -10); }
    const ps: Placed[] = [];
    if (has(S.intro_tts)) ps.push(say(`level${n}.speed`, LID.speedIntro(n), S.intro_tts, start + T.cardLead, 'dare'));
    // intro line + 0.3 in [2.2, 3.2]; never cut the line: when it ends later than max - 0.1 the card becomes line + 0.3 (warning)
    const spokenEnd = ps.length ? ps[0].end - start : 0;
    let dur = Math.min(T.speedCardMax, Math.max(T.speedCardMin, spokenEnd + T.speedCardPad));
    if (spokenEnd + 0.1 > dur) { dur = spokenEnd + T.speedCardPad; warnings.push(`card level${n}.speed: intro ends at +${spokenEnd.toFixed(2)} s: card ${dur.toFixed(2)} s > ${T.speedCardMax} s max (shorten the intro)`); }
    t = r3(start + dur);
    segments.push({ type: 'card', kind: 'speed', id: `level${n}.speed`, level: n, title: S.title ?? null, sub: S.sub ?? null, level_name: L?.name ?? '', start: r3(start), end: t, host: host(ps) });
  };
  /** q40 reveal-hold end (before the speed outro): start of the spoken ending */
  let endingFrom: number | null = null;
  /** per placed question: end of its last spoken line (a following bet may be spoken over its learn hold) */
  const qMeta = new Map<string, { lastSpoken: number }>();

  const question = ({ q, i }: { q: Question; i: number }) => {
    const L = levelOf(ep, q.level);
    const speed = isSpeed(q);
    const sp = speedPos.get(q.id);
    const b = betFor(ep, i);
    const askDur = has(q.ask_tts) ? speech(LID.ask(q.id), q.ask_tts).dur : 0;
    // bet/tease: over the END of the previous question's learn hold when that is cheaper than at this question's entrance
    // (the entrance path runs the countdown under the ask so the bet adds <= betMaxAdd)
    let betAtEntrance = !!b;
    if (b && !speed) {
      const prev = segments[segments.length - 1], pm2 = prev && qMeta.get(prev.id);
      if (prev?.type === 'question' && pm2 && prev.id === ep.questions[i - 1]?.id) {
        const bd = speech(LID.bet(q.id), b.tts).dur;
        const at = Math.max(pm2.lastSpoken + T.lineGap, prev.t.out - T.outAfterLast - bd);
        const newOut = r3(Math.max(prev.t.out, at + bd + T.outAfterLast));
        const prevCost = newOut - prev.t.out;
        const entranceCost = Math.min(T.betMaxAdd, Math.max(0, T.firstLine + bd + T.lineGap - T.askAfterIn));
        if (prevCost <= T.betMaxAdd && prevCost <= entranceCost + 1e-6) {
          const p = say(prev.id, LID.bet(q.id), b.tts, at, 'tease');
          prev.host.push(...host([p]));
          prev.t.out = newOut; prev.end = r3(newOut + T.exit); t = prev.end;
          betAtEntrance = false;
        }
      }
    }
    const S = t;
    const segLines: Placed[] = [];
    if (S > 0) cue('whoosh', S - 0.05, speed ? -6 : -4);
    let c = S + T.firstLine;
    const pre = (id: string, text: string | undefined, mood: string) => { if (!has(text)) return; const p = say(q.id, id, text, c, mood); segLines.push(p); c = p.end + T.lineGap; };
    if (i === 0) pre(LID.hook, ep.opening?.hook_tts, 'dare');
    if (pm.mode === 'before' && pm.q === i + 1) pre(LID.promise, ep.opening.promise_tts, 'dare');
    if (b && betAtEntrance) pre(LID.bet(q.id), b.tts, 'tease');
    const optionsIn = S + T.optionsIn;
    if (q.options?.length) cue('pop', optionsIn, -8);
    let timerStart: number;
    let think = thinkOf(ep, q);
    if (has(q.ask_tts)) {
      const ask = say(q.id, LID.ask(q.id), q.ask_tts, Math.max(c, S + (speed ? T.firstLine : T.askAfterIn)), 'ask');
      segLines.push(ask);
      const afterAsk = ask.end + T.timerAfterAsk;
      if (i === 0 && T.q1TimerAtAsk) timerStart = ask.at;   // Q1: the ask is spoken over the running countdown
      else if (b && betAtEntrance && !speed) timerStart = Math.max(ask.at, Math.min(afterAsk, S + T.askAfterIn + askDur + T.timerAfterAsk + T.betMaxAdd));
      else timerStart = afterAsk;
      // guard: a timer running under the ask never ends before ask end + 1.0 s
      if (timerStart < afterAsk - 1e-6 && timerStart + think < ask.end + T.askEndToTimerEnd) {
        const th = r3(ask.end + T.askEndToTimerEnd - timerStart);
        warnings.push(`${q.id}: think extended ${think} -> ${th} s (timer runs under the ask; timer_end >= ask end + ${T.askEndToTimerEnd} s)`);
        think = th;
      }
    } else timerStart = Math.max(S + T.speedTimer, c - T.lineGap + T.timerAfterAsk);
    const timerEnd = timerStart + think, reveal = timerEnd;
    const nt = Math.ceil(think - 1e-6);
    for (let k = 0; k < nt; k++) cue(k === nt - 1 ? 'tick_last' : 'tick', timerStart + k, k === nt - 1 ? T.tickLastDb : T.tickDb);
    const hints = (q.hints ?? []).map(h => ({ t: r3(timerStart + Number(h.at) * think), text: h.text }));
    for (const h of hints) cue('pop', h.t, -6);
    const rv = say(q.id, LID.reveal(q.id), q.reveal_tts, reveal + T.revealLineAfter, 'react');
    segLines.push(rv);
    cue('ding', reveal, -12, rv.id);
    let answers: any[] | undefined;
    let lastPop = reveal;
    if (speed) {
      answers = (q.answers ?? []).slice(0, 1).map(a => ({ ...a, iso: a.iso ?? null, t: r3(reveal) }));
    } else if (q.mechanic === 'name3') {
      // legacy name3: each answer pops when the reveal line says it (aligned words; silent mode spreads the words evenly), >= 0.6 s apart
      const lt = speech(rv.id, q.reveal_tts);
      const ws = lt.words?.length ? lt.words : words(q.reveal_tts).map((w, k, a) => ({ w, s: (k * lt.dur) / a.length, e: ((k + 1) * lt.dur) / a.length }));
      let from = 0, prev = -Infinity;
      answers = (q.answers ?? []).map((a, k) => {
        const key = normAr(words(a.text)[0] ?? '');
        let at: number | null = null;
        for (let j = from; j < ws.length && key; j++) { const w = normAr(ws[j].w); if (w && (w === key || w.startsWith(key) || key.startsWith(w) && w.length >= 3)) { at = rv.at + ws[j].s; from = j + 1; break; } }
        const tt = r3(Math.max(at ?? (k === 0 ? reveal : prev + T.name3Gap), k === 0 ? reveal : prev + T.name3Gap));
        prev = tt;
        cue('pop', tt, -8);
        return { ...a, iso: a.iso ?? null, t: tt };
      });
      lastPop = prev;
    } else if (q.answers?.length) answers = q.answers.map(a => ({ ...a, iso: a.iso ?? null, t: r3(reveal) }));
    let learnIn: number | null = null;
    let out: number;
    // hold_text goes to the learn strip on standard layouts only: on the speed layout the template's learn strip sits behind
    // the hero TV (proof v3 frame 09), so a speed item's hold_text is passed through untouched (template must place it)
    const learnText = has(q.learn_text) ? q.learn_text : !speed && has(q.hold_text) ? String(q.hold_text) : '';
    const learnVoice = has(q.learn_tts) && q.learn_voice !== false;
    const hold = Math.max(0, Number(q.hold_s) || 0);
    if (speed || !learnText) {
      if (speed) cue('pop', reveal, -10);
      // speed reveal hold = reveal line + 0.3 (>= 1.2 s from the reveal); a standard item without learn_text: last line + 0.35
      out = speed ? r3(Math.max(rv.end + T.speedRevealPad, reveal + T.speedRevealMin)) : r3(rv.end + T.outAfterLast);
      // hold_s (+ hold_text): the answer stays hold_s extra seconds after the reveal line; hold_text shows in the learn strip
      if (hold) {
        if (learnText) { learnIn = r3(rv.end + T.learnAfterReveal); out = r3(Math.max(out, learnIn + hold)); }
        else out = r3(out + hold);
      }
      if (q.id === lastQ) endingFrom = out;   // spoken ending is measured from here (before the speed outro)
      // speed-round outro: over the last 1.5 s of the LAST speed item's reveal hold; out extended so the line fits
      if (speed && sp?.last && cardsOn && has(L?.speed?.outro_tts)) {
        const at = hold ? out : Math.max(rv.end + 0.15, out - T.speedOutroOver);   // a hold_s plays out before the outro
        const p = say(q.id, LID.speedOutro(q.level), L!.speed!.outro_tts!, at, 'tease');
        segLines.push(p);
        out = r3(Math.max(out, p.end + T.outAfterLast));
      }
    } else {
      learnIn = r3(Math.max(rv.end + T.learnAfterReveal, lastPop + 0.4));
      if (learnVoice) {
        const lr = say(q.id, LID.learn(q.id), q.learn_tts, learnIn, 'teach');
        segLines.push(lr);
        out = r3(lr.end + T.outAfterLast);
      } else out = r3(learnIn + T.silentLearn);   // learn_voice false: the learn_text runs alone for its 2.2 s slot
      if (hold) out = r3(out + hold);              // hold_s: extend the hold after the learn line
      if (q.id === lastQ) endingFrom = out;
    }
    qMeta.set(q.id, { lastSpoken: Math.max(...segLines.map(p => p.end)) });
    const end = r3(out + T.exit);
    const seg: any = {
      type: 'question', id: q.id, index: numberOf.get(q.id), level: q.level, level_name: L?.name ?? '', mechanic: q.mechanic,
      ...(speed && sp ? { speed_index: sp.index, speed_total: sp.total } : {}),
      start: r3(S), end,
      ask_text: q.ask_text ?? '',
      clue: q.clue ?? null,
      ...(q.options?.length ? { options: q.options.map(o => ({ ...o, iso: o.iso ?? null })), answer_index: q.answer_index } : {}),
      ...(answers ? { answers } : {}),
      ...(q.mechanic === 'name3' ? { accept_count: q.accept?.length ?? null } : {}),
      ...(q.also_text ? { also_text: q.also_text } : {}),
      hints,
      ...(learnIn != null ? { learn_text: learnText } : {}),
      think_s: think,
      t: { in: r3(S), ...(q.options?.length ? { options_in: r3(optionsIn) } : {}), timer_start: r3(timerStart), timer_end: r3(timerEnd), reveal: r3(reveal), ...(learnIn != null ? { learn_in: learnIn } : {}), out },
      host: host(segLines),
    };
    // carry unknown optional fields (schema growth) without letting them override the timed ones
    for (const [k, v] of Object.entries(q)) if (!(k in seg) && !['ask_tts', 'reveal_tts', 'learn_tts', 'source', 'source2', 'source3', 'accept', 'think_s', 'learn_text', 'hold_note', 'hold_s'].includes(k)) seg[k] = v;
    if (hold) seg.hold_s = hold;
    // small on-screen opening line over Q1's clue frame (template: hook_text, shown until the reveal)
    if (i === 0 && has(ep.opening?.hook_text)) seg.hook_text = ep.opening.hook_text;
    segments.push(seg);
    t = end;
  };

  // order: Q1 at t=0 (hook, then the promise when promise_before_q = 1) -> level-1 card after Q1 (and the promise card when
  // promise_after_q) -> every later level opens with its card -> a level's speed card before its first speed item ->
  // ending = ladder (ladder line, score ask, hand-off) -> calm end frame
  let firstLevelCardPending: number | null = null;
  chapters.push({ t: 0, title: 'المقدمة' });
  const seenLevels = new Set<number>();
  // a level's first item in the FULL episode (its card plays right before it)
  const levelFirst = new Map<number, string>(); for (const q of ep.questions) if (!levelFirst.has(q.level)) levelFirst.set(q.level, q.id);
  qs.forEach(x => {
    if (!seenLevels.has(x.q.level)) {
      seenLevels.add(x.q.level);
      if (x.i === 0) firstLevelCardPending = x.q.level;
      else if (cardsOn && levelFirst.get(x.q.level) === x.q.id) levelCard(x.q.level, false);
    }
    if (cardsOn && speedPos.get(x.q.id)?.first) speedCard(x.q.level);
    question(x);
    if (cardsOn && firstLevelCardPending != null && (pm.mode !== 'after' || x.i + 1 >= pm.q)) {
      if (pm.mode === 'after' && !levelOf(ep, firstLevelCardPending)?.card?.merged_with_promise) card('promise', 'promise', null, [{ id: LID.promise, text: ep.opening.promise_tts, mood: 'dare' }], { pad: T.promiseCardPad, min: T.promiseCardMin, max: T.promiseCardMax }, { title: ep.opening.promise_text ?? null, sub: null });
      levelCard(firstLevelCardPending, true); firstLevelCardPending = null;
    }
  });
  if (!partial && firstLevelCardPending != null) warnings.push(`level ${firstLevelCardPending} card never played`);

  let endingSpoken: number | null = null;
  if (ep.ending && (!partial || (opts.withCards && !!lastQ && opts.only!.has(lastQ)))) {
    const start = t;
    chapters.push({ t: r3(start), title: 'النتيجة' });
    cue('whoosh', start - 0.05, -6); cue('sting', start + 0.05, -8);
    const ps: Placed[] = [];
    let c = start + T.ladderLead;
    // ladder segment: ladder line (+ score ask when not empty) -> line + 1.0 s in [5, 9]; empty lines produce nothing
    for (const [id, text, mood] of [[LID.ladder, ep.ending.ladder_tts, 'react'], [LID.score, ep.ending.score_ask_tts, 'dare']] as [string, string | undefined, string][])
      if (has(text)) { const p = say('ladder', id, text, c, mood); ps.push(p); c = p.end + T.lineGap; }
    const spokenL = ps.length ? ps[ps.length - 1].end - start : 0;
    let ldur = Math.min(T.ladderMax, Math.max(T.ladderMin, spokenL + T.ladderPad));
    if (spokenL + 0.3 > ldur) { ldur = spokenL + 0.3; warnings.push(`ladder: speech ends at +${spokenL.toFixed(2)} s, past the ${T.ladderMax} s max: ladder ${ldur.toFixed(2)} s (shorten ladder_tts)`); }
    const ladderEnd = r3(start + ldur);
    const ld = ep.ending.ladder;
    const ladderTitle = (ld && !Array.isArray(ld) && ld.title) || (has(ep.ending.ladder_title) ? ep.ending.ladder_title : '') || `كم جبت من ${arDigits(ep.questions.length)}؟`;
    segments.push({ type: 'ladder', id: 'ladder', title: ladderTitle, rows: ladderRows(ep), start: r3(start), end: ladderEnd, host: host(ps) });
    t = ladderEnd;
    // end frame (8 s, calm): the hand-off (+ sign-off when not empty) is spoken over its first seconds
    const es: Placed[] = [];
    let e = t + T.handoffInEnd;
    for (const [id, text, mood] of [[LID.handoff, ep.ending.handoff_tts, 'tease'], [LID.signoff, ep.ending.signoff_tts, 'dare']] as [string, string | undefined, string][])
      if (has(text)) { const p = say('end', id, text, e, mood); es.push(p); e = p.end + T.lineGap; }
    if (es.length && es[es.length - 1].end > t + T.endFrame - 1) warnings.push(`end frame: spoken until +${(es[es.length - 1].end - t).toFixed(2)} s of the ${T.endFrame} s end frame (keep >= 1 s calm)`);
    segments.push({ type: 'end', id: 'end', text: ep.ending.end_frame_text ?? '', sub: ep.ending.end_frame_sub ?? null, start: r3(t), end: r3(t + T.endFrame), host: host(es) });
    t = r3(t + T.endFrame);
    const lastWord = [...ps, ...es].reduce((m, p) => Math.max(m, p.end), start);
    if (endingFrom != null) {
      endingSpoken = r3(lastWord - endingFrom);
      if (endingSpoken > T.spokenEndingMax) warnings.push(`spoken ending ${endingSpoken.toFixed(1)} s (q40 reveal hold end -> last word) > ${T.spokenEndingMax} s`);
    }
  }

  const total = r3(t);
  const show = {
    schema: 'quiz-long-show/1', fps: 30, width: 1920, height: 1080, duration: total,
    brand: opts.brandName ?? 'شو شايف؟', total_questions: ep.questions.length,
    production_id: ep.production_id ?? null, title: ep.title ?? null, partial: partial || undefined, estimated: opts.estimate || undefined,
    theme: themeOf(ep),
    segments,
  };
  // contract checks: sorted, contiguous, non-overlapping
  for (let k = 1; k < segments.length; k++) if (Math.abs(segments[k].start - segments[k - 1].end) > 1e-6) warnings.push(`segments ${segments[k - 1].id} -> ${segments[k].id} not contiguous`);
  for (let k = 1; k < lines.length; k++) if (lines[k].at < lines[k - 1].end - 1e-6) warnings.push(`spoken lines overlap: ${lines[k - 1].id} (ends ${lines[k - 1].end}) / ${lines[k].id} (${lines[k].at})`);
  for (let k = 0; k < chapters.length; k++) { const e = k + 1 < chapters.length ? chapters[k + 1].t : total; if (!partial && e - chapters[k].t < 10) warnings.push(`chapter "${chapters[k].title}" is ${(e - chapters[k].t).toFixed(1)} s (YouTube needs >= 10 s)`); }
  sfx.sort((a, b) => a.at - b.at);
  return { show, lines, sfx, chapters, total, warnings, ending_spoken_s: endingSpoken, reveals: segments.filter(s => s.type === 'question').map(s => s.t.reveal as number) };
}

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const srtTime = (s: number) => { const ms = Math.round(s * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
export const chaptersText = (cs: Chapter[]) => cs.map(c => `${mmss(c.t)} ${c.title}`).join('\n') + '\n';
export const srtText = (ls: Placed[]) => ls.map((l, k) => `${k + 1}\n${srtTime(l.at)} --> ${srtTime(Math.max(l.end, l.at + 0.5))}\n${l.text}\n`).join('\n');
