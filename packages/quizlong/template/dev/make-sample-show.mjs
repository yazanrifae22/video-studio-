/* episode.json -> sample-show.json with ESTIMATED times (2.5 words/s), for previewing the template without the real builder.
 * A compact, defensive port of packages/quizlong/src/show.ts (same order of segments and the same timing constants);
 * the real show.json always comes from quizlong:build. Handles schema v1 / v1.1 / v1.2 (speed rounds, cards, ladder).
 *   node make-sample-show.mjs [episode.json] [out.json]
 * defaults: productions/quiz-261112-fpr4/episode.json -> packages/quizlong/template/dev/sample-show.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const src = path.resolve(process.argv[2] || path.join(ROOT, 'productions', 'quiz-261112-fpr4', 'episode.json'));
const out = path.resolve(process.argv[3] || path.join(HERE, 'sample-show.json'));

const T = { firstLine: 0.15, optionsIn: 0.35, askAfterIn: 0.4, lineGap: 0.2, timerAfterAsk: 0.15, revealLineAfter: 0.08, revealMin: 1.2, learnAfterReveal: 0.15, outAfterLearn: 0.6, exit: 0.3,
  name3Gap: 0.6, cardLead: 0.2, cardPad: 0.8, cardMin: 3, cardMax: 4.5, speedTimer: 0.25, speedOut: 0.4, speedOutroOver: 1.5, speedCardPad: 0.5, speedCardMin: 2.5, speedCardMax: 3.5,
  ladderLead: 0.3, ladderPad: 1.2, ladderMin: 4.5, endFrame: 8 };
const r3 = x => Math.round(x * 1000) / 1000;
const has = s => typeof s === 'string' && s.trim().length > 0;
const words = s => String(s ?? '').trim().split(/\s+/).filter(Boolean);
const speech = text => Math.max(0.5, words(text).length / 2.5);
const arDigits = n => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const arr = v => (Array.isArray(v) ? v : []);

const ep = JSON.parse(fs.readFileSync(src, 'utf8'));
const levels = arr(ep.levels).filter(l => l && typeof l === 'object');
const questions = arr(ep.questions).filter(q => q && typeof q === 'object' && q.id);
const levelOf = n => levels.find(l => l.n === n);
const isSpeed = q => q.mechanic === 'speed';
const opening = ep.opening && typeof ep.opening === 'object' ? ep.opening : {};
const pm = !has(opening.promise_tts) ? { mode: 'none', q: 0 } : opening.promise_before_q != null ? { mode: 'before', q: Number(opening.promise_before_q) } : { mode: 'after', q: Number(opening.promise_after_q ?? 1) };
const betFor = qi => arr(ep.bets).find(b => { if (!b || !has(b.tts)) return false; const byId = questions.findIndex(q => q.id === `q${String(b.before_q).padStart(2, '0')}`); return byId >= 0 ? questions[byId].id === questions[qi].id : Number(b.before_q) === qi + 1; });
const regular = questions.filter(q => !isSpeed(q));
const numberOf = new Map(); questions.forEach((q, k) => numberOf.set(q.id, k + 1));   // owner 2026-11-13: speed items count too (1..40)
const speedPos = new Map();
for (const L of levels) { const items = questions.filter(q => q.level === L.n && isSpeed(q)); items.forEach((q, k) => speedPos.set(q.id, { index: k + 1, total: items.length, first: k === 0, last: k === items.length - 1 })); }

const segments = [], warnings = [];
let t = 0;
const say = (text, at, mood, id) => ({ t: r3(at), end: r3(at + speech(text)), mood, text, id });

function card(kind, id, n, said, lim, extra) {
  const start = t, host = [];
  let c = start + T.cardLead;
  for (const s of said) if (has(s.text)) { const p = say(s.text, c, s.mood, s.id); host.push(p); c = p.end + T.lineGap; }
  const spoken = host.length ? host[host.length - 1].end - start : 0;
  let dur = host.length ? Math.min(lim.max, Math.max(lim.min, spoken - T.cardLead + lim.pad)) : (lim.silent ?? lim.min);
  if (host.length && spoken + 0.3 > dur) dur = spoken + 0.3;
  t = r3(start + dur);
  segments.push({ type: 'card', kind, id, level: n, ...extra, start: r3(start), end: t, host });
}
function levelCard(n, first) {
  const L = levelOf(n); if (!L || L.card === null) return;   // v1.3: card null = no card for that level
  const C = L.card && typeof L.card === 'object' ? L.card : {};
  const said = [...(first && pm.mode === 'after' && C.merged_with_promise ? [{ id: 'promise', text: opening.promise_tts, mood: 'dare' }] : []), { id: `level${n}`, text: C.tts, mood: 'tease' }];
  card('level', `level${n}`, n, said, { pad: T.cardPad, min: T.cardMin, max: T.cardMax, silent: Number(C.duration_s ?? (first ? opening.promise_card_s : undefined) ?? T.cardMin) },
    { title: C.title ?? `المستوى ${arDigits(n)}: ${L.name ?? ''}`, level_name: L.name ?? '', sub: C.sub ?? null, tally_text: C.tally_text ?? null, new_text: C.new_text ?? null, stake_text: C.stake_text ?? null, series_text: C.series_text ?? null, think_s: L.think_s });
}
function speedCard(n) {
  const L = levelOf(n), S = (L && L.speed) || {};
  card('speed', `level${n}.speed`, n, [{ id: `level${n}.speed_intro`, text: S.intro_tts, mood: 'dare' }], { pad: T.speedCardPad, min: T.speedCardMin, max: T.speedCardMax }, { title: S.title ?? null, sub: S.sub ?? null, level_name: (L && L.name) ?? '' });
}
function question(q, i) {
  const L = levelOf(q.level), S = t, speed = isSpeed(q), sp = speedPos.get(q.id), host = [];
  let c = S + T.firstLine;
  const pre = (id, text, mood) => { if (!has(text)) return; const p = say(text, c, mood, id); host.push(p); c = p.end + T.lineGap; };
  if (i === 0) pre('hook', opening.hook_tts, 'dare');
  if (pm.mode === 'before' && pm.q === i + 1) pre('promise', opening.promise_tts, 'dare');
  const b = betFor(i); if (b) pre(`${q.id}.bet`, b.tts, 'tease');
  const options = arr(q.options).filter(o => o && typeof o === 'object');
  const optionsIn = S + T.optionsIn;
  let timerStart;
  if (has(q.ask_tts)) { const ask = say(q.ask_tts, Math.max(c, S + (speed ? T.firstLine : T.askAfterIn)), 'ask', `${q.id}.ask`); host.push(ask); timerStart = ask.end + T.timerAfterAsk; }
  else timerStart = Math.max(S + T.speedTimer, c - T.lineGap + T.timerAfterAsk);
  const think = Number(q.think_s ?? (L && L.think_s) ?? 5) || 5;
  const timerEnd = timerStart + think, reveal = timerEnd;
  const hints = arr(q.hints).filter(h => h && has(h.text)).map(h => ({ t: r3(timerStart + (Number(h.at) || 0.5) * think), text: h.text }));
  const rvText = has(q.reveal_tts) ? q.reveal_tts : '...';
  const rv = say(rvText, reveal + T.revealLineAfter, 'react', `${q.id}.reveal`); host.push(rv);
  let answers, lastPop = reveal;
  if (speed) answers = arr(q.answers).slice(0, 1).map(a => ({ ...a, iso: a.iso ?? null, t: r3(reveal) }));
  else if (q.mechanic === 'name3') { let prev = -Infinity; const dur = speech(rvText); answers = arr(q.answers).map((a, k, all) => { const tt = r3(Math.max(rv.t + (k * dur) / all.length, k === 0 ? reveal : prev + T.name3Gap)); prev = tt; return { ...a, iso: a.iso ?? null, t: tt }; }); lastPop = prev; }
  else if (arr(q.answers).length) answers = q.answers.map(a => ({ ...a, iso: a.iso ?? null, t: r3(reveal) }));
  let learnIn = null, outT;
  if (speed || !has(q.learn_tts)) {
    outT = r3(rv.end + T.speedOut);
    if (speed && sp && sp.last && has(L && L.speed && L.speed.outro_tts)) { const p = say(L.speed.outro_tts, Math.max(rv.end + 0.15, outT - T.speedOutroOver), 'tease', `level${q.level}.speed_outro`); host.push(p); outT = r3(Math.max(outT, p.end + T.speedOut)); }
  } else {
    learnIn = r3(Math.max(rv.end + T.learnAfterReveal, reveal + T.revealMin, lastPop + 0.4));
    const lr = say(q.learn_tts, learnIn, 'teach', `${q.id}.learn`); host.push(lr);
    outT = r3(lr.end + T.outAfterLearn);
  }
  if (speed && has(q.hold_text)) outT = r3(Math.max(outT, reveal + 0.4 + (Number(q.hold_s) || 3)));   // the hold strip stays readable
  const end = r3(outT + T.exit);
  const seg = { type: 'question', id: q.id, index: numberOf.get(q.id), level: q.level, level_name: (L && L.name) ?? '', mechanic: q.mechanic,
    ...(speed && sp ? { speed_index: sp.index, speed_total: sp.total } : {}), start: r3(S), end, ask_text: q.ask_text ?? '', clue: q.clue ?? null,
    ...(options.length ? { options: options.map(o => ({ ...o, iso: o.iso ?? null })), answer_index: q.answer_index } : {}), ...(answers ? { answers } : {}),
    ...(q.also_text ? { also_text: q.also_text } : {}), hints, ...(learnIn != null ? { learn_text: q.learn_text } : {}), think_s: think,
    t: { in: r3(S), ...(options.length ? { options_in: r3(optionsIn) } : {}), timer_start: r3(timerStart), timer_end: r3(timerEnd), reveal: r3(reveal), ...(learnIn != null ? { learn_in: learnIn } : {}), out: outT }, host };
  for (const [k, v] of Object.entries(q)) if (!(k in seg) && !['ask_tts', 'reveal_tts', 'learn_tts', 'source', 'source2', 'accept', 'think_s', 'learn_text'].includes(k)) seg[k] = v;
  if (i === 0 && has(opening.hook_text)) seg.hook_text = opening.hook_text;   // small on-screen line over Q1 (template shows it when present)
  segments.push(seg);
  t = end;
}

let pendingFirst = null;
const seen = new Set();
questions.forEach((q, i) => {
  if (!seen.has(q.level)) { seen.add(q.level); if (i === 0) pendingFirst = q.level; else levelCard(q.level, false); }
  if (speedPos.get(q.id)?.first) speedCard(q.level);
  question(q, i);
  if (pendingFirst != null && (pm.mode !== 'after' || i + 1 >= pm.q)) {
    if (pm.mode === 'after' && !levelOf(pendingFirst)?.card?.merged_with_promise) card('promise', 'promise', null, [{ id: 'promise', text: opening.promise_tts, mood: 'dare' }], { pad: T.cardPad, min: T.cardMin, max: T.cardMax }, { title: opening.promise_text ?? null, sub: null });
    levelCard(pendingFirst, true); pendingFirst = null;
  }
});
if (ep.ending && typeof ep.ending === 'object') {
  const E = ep.ending, start = t, host = [];
  let c = start + T.ladderLead;
  for (const [id, text, mood] of [['ladder', E.ladder_tts, 'react'], ['score_ask', E.score_ask_tts, 'dare'], ['handoff', E.handoff_tts, 'tease'], ['signoff', E.signoff_tts, 'dare']]) if (has(text)) { const p = say(text, c, mood, id); host.push(p); c = p.end + T.lineGap; }
  const ladderEnd = r3(Math.max(start + T.ladderMin, c - T.lineGap + T.ladderPad));
  const ld = E.ladder, rows = (Array.isArray(ld) ? ld : arr(ld && ld.rows)).filter(r => r && typeof r === 'object');
  segments.push({ type: 'ladder', id: 'ladder', title: E.ladder_title || (ld && !Array.isArray(ld) && ld.title) || `كم جبت من ${arDigits(questions.length)}؟`   /* the builder falls back to end_frame_text here */, rows, start: r3(start), end: ladderEnd, host });
  t = ladderEnd;
  segments.push({ type: 'end', id: 'end', text: E.end_frame_text ?? '', sub: E.end_frame_sub ?? null, start: r3(t), end: r3(t + T.endFrame), host: [] });
  t = r3(t + T.endFrame);
}
for (let k = 1; k < segments.length; k++) if (Math.abs(segments[k].start - segments[k - 1].end) > 1e-6) warnings.push(`segments ${segments[k - 1].id} -> ${segments[k].id} not contiguous`);

const show = { schema: 'quiz-long-show/1', fps: 30, width: 1920, height: 1080, duration: r3(t), brand: 'شو شايف؟', total_questions: questions.length, production_id: ep.production_id ?? null, title: ep.title ?? null,
  estimated: true, theme: { direction: 'blocks', level_themes: { 1: 'l1', 2: 'l2', 3: 'l3', 4: 'l4' }, ...(ep.theme ?? {}) }, segments };
fs.writeFileSync(out, JSON.stringify(show, null, 1), 'utf8');
const count = {}; for (const s of segments) { const k = s.type === 'question' ? s.mechanic : `${s.type}${s.kind ? ':' + s.kind : ''}`; count[k] = (count[k] || 0) + 1; }
console.log(JSON.stringify({ out, episode_schema: ep.schema ?? null, duration_s: show.duration, mmss: `${Math.floor(show.duration / 60)}:${String(Math.floor(show.duration % 60)).padStart(2, '0')}`, segments: segments.length, count, warnings }));
