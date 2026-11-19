// Fair Game model, proven without 3D. node dump.mjs <score.json> [--check] [--storyboard sb.json]
// Prints per line the state at its start, middle and end (and writes docs/brands/test-3d/fair-game/state-dump.txt).
// --check: invariants over the whole film at 10 samples per second (see STATE.md), exit code 1 on errors.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeShow } from './show.js';
import { CAST, N, START } from './game.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)), DOCS = path.resolve(HERE, '../../../../docs/brands/test-3d/fair-game');
const args = process.argv.slice(2), CHECK = args.includes('--check'), sbArg = args.indexOf('--storyboard');
const scorePath = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--storyboard') ?? path.join(DOCS, 'draft-score.json');
const sb = JSON.parse(fs.readFileSync(sbArg >= 0 ? args[sbArg + 1] : path.join(DOCS, 'storyboard.json'), 'utf8'));
const score = JSON.parse(fs.readFileSync(scorePath, 'utf8'));
const show = makeShow(score, { storyboard: sb });
const sbLine = new Map(sb.chapters.flatMap((c) => c.lines.map((l) => [l.id, l])));
const NAME = Object.fromEntries(Object.entries(CAST).map(([k, p]) => [p, k]));
const sq = (p) => { const a = show.state(0).players[p].at; return 'abcdefgh'[a.f - 1] + a.r; };
const who = (p) => NAME[p] ?? sq(p);
const r1 = (x) => (Math.abs(x) >= 100 ? Math.round(x) : +x.toFixed(1));

function describe(S) {
  const P = S.players, out = [];
  const sh = S.shot, subj = (o) => (o ? Object.entries(o).map(([k, v]) => (v === true ? k : `${k}:${[].concat(v).map((x) => (k === 'players' ? who(x) : x)).join('/')}`)).join(' ') : '');
  out.push(`shot ${sh.id} ${sh.kind}/${sh.move}${sh.continuous ? ' (cont)' : ''} [${subj(sh.subject)}]${sh.to ? ' -> [' + subj(sh.to) + ']' : ''} u=${sh.u.toFixed(2)}`);
  const pres = P.filter((p) => p.present > 0.5);
  out.push(`world ${S.world}${S.flips != null ? ' x=' + r1(S.flips) : ''} | present ${pres.length} standing ${pres.filter((p) => p.down < 0.5).length} down ${pres.filter((p) => p.down >= 0.5).length}${S.layout.kind !== 'board' ? ` | layout ${S.layout.kind} u=${S.layout.u.toFixed(2)}` : ''}`);
  const order = [...P].sort((a, b) => b.coins - a.coins).map((p) => p.id);
  out.push('hats ' + Object.entries(CAST).map(([k, p]) => `${k} ${r1(P[p].coins)} #${order.indexOf(p) + 1}${P[p].down > 0.5 ? ' DOWN' : ''}${P[p].hat < 1 ? ` hat=${P[p].hat.toFixed(2)}` : ''}`).join(', ') + ` | top ${who(order[0])} ${r1(P[order[0]].coins)}`);
  const lit = P.filter((p) => p.lit > 0.5); if (lit.length) out.push(`lit ${lit.length <= 6 ? lit.map((p) => who(p.id)).join(' ') : lit.length + ' players'}`);
  if (S.counter) out.push(`counter "${S.counter.text}" (${S.counter.opacity.toFixed(2)})`);
  if (S.total) out.push(`total "${S.total.text}" (${S.total.opacity.toFixed(2)})`);
  if (S.title) out.push(`title "${S.title.text}" (${S.title.opacity.toFixed(2)})`);
  if (S.tags.length) out.push('tags ' + S.tags.map((g) => `"${g.text}"@${Object.keys(g.anchor)[0]}${g.anchor.player != null ? ':' + who(g.anchor.player) : ''}(${g.opacity.toFixed(1)})`).join(' '));
  for (const c of S.flipCoins) if (c.present > 0.05) out.push(`coin ${c.id} ${c.phase} lift=${c.lift.toFixed(2)} angle=${c.angle.toFixed(2)} face=${c.face} at=${r1(c.at.f)},${r1(c.at.r)}${c.labels ? ' labels=' + c.labels.join('/') : ''}`);
  if (S.moves.length) out.push(`moves ${S.moves.length}: ` + S.moves.slice(0, 4).map((m) => `${m.id} ${m.kind === 'disc' ? r1(m.coins) + 'c' : m.count + 'chip'} u=${m.u.toFixed(2)}`).join(', ') + (S.moves.length > 4 ? ' ...' : ''));
  if (S.chips.length) out.push(`chips ${S.chips.length <= 6 ? S.chips.map((c) => `${c.id}=${r1(c.count)}`).join(' ') : `${S.chips.length} stacks, ${r1(S.chips.reduce((a, c) => a + c.count, 0))} chips`}`);
  if (S.extras.length) out.push('extras ' + S.extras.map((x) => `${x.id}(${x.kind} ${r1(x.coins)}${x.ghost ? ' ghost ' + r1(x.ghost) : ''}${x.down > 0.5 ? ' down' : ''}${x.jump ? ' jump ' + x.jump.u.toFixed(2) : ''}${x.gather ? ' gather ' + x.gather.toFixed(2) : ''})`).join(' '));
  if (S.rain.length) out.push(`rain ${S.rain.length} falling (${S.rain.filter((d) => d.kind === 'gold').length} gold)`);
  if (S.level) out.push(`level ${r1(S.level.coins)} sweep ${S.level.sweep.toFixed(2)}`);
  if (S.king.on != null && S.king.drop > 0) out.push(`king on ${who(S.king.on)} drop ${S.king.drop.toFixed(2)} swap ${S.king.swap.toFixed(2)} hat ${S.king.hat.toFixed(2)}`);
  if (S.skeptic.present > 0) out.push(`skeptic forward ${S.skeptic.forward.toFixed(2)}${S.skeptic.coins ? ' on tower ' + r1(S.skeptic.coins) : ''}${S.skeptic.jump ? ' jump ' + S.skeptic.jump.u.toFixed(2) : ''}`);
  if (S.players.some((p) => p.scale !== 1)) out.push(`scale ${Math.min(...P.map((p) => p.scale)).toFixed(2)}..${Math.max(...P.map((p) => p.scale)).toFixed(2)}`);
  return out;
}

const txt = [`Fair Game state dump - score ${path.basename(scorePath)} (${show.duration.toFixed(1)} s, ${show.lines.length} lines, ${show.shots.length} shots, ${show.beats.length} beats)`, ''];
if (show.warnings.length) txt.push('WARNINGS', ...show.warnings.map((w) => '  ' + w), '');
for (const l of show.lines) {
  const sl = sbLine.get(l.id);
  txt.push(`== ${l.id} [${l.chapter}] ${l.t0.toFixed(2)}-${l.t1.toFixed(2)} (+${(l.next - l.t1).toFixed(2)} s silence)  "${sl?.text.slice(0, 90) ?? ''}${sl && sl.text.length > 90 ? '...' : ''}"`);
  if (sl?.tags.length) txt.push(`   storyboard tags: ${sl.tags.map((x) => `"${x}"`).join(' ')}`);
  for (const [lab, t] of [['start', l.t0 + 0.05], ['mid', (l.t0 + l.t1) / 2], ['end', l.next - 0.12]]) { txt.push(`  ${lab} t=${t.toFixed(2)}`); for (const s of describe(show.state(t))) txt.push('    ' + s); }
}
const dumpPath = path.join(DOCS, 'state-dump.txt');
fs.writeFileSync(dumpPath, txt.join('\n') + '\n', 'utf8');
if (!CHECK) { console.log(txt.slice(0, 60).join('\n')); console.log(`... full dump: ${dumpPath}`); process.exit(0); }

/* ------------------------------------------------------------------ --check */
const errors = [], notes = [], extras = new Map(), jumps = new Map();
const err = (m) => errors.push(m), add = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
const nan = (o, p = '') => { if (typeof o === 'number') { if (!Number.isFinite(o)) return p; return null; } if (o && typeof o === 'object') for (const k in o) { const r = nan(o[k], p + '.' + k); if (r) return r; } return null; };
const TOT = { fair: [N * START], again: [N * START], leak: [N * START], hats: [N * START, N * START + 900] };   // hats: 6,400 until the Heir's 1,000 (l34), then 7,300
const cons = new Map(), seen = new Map();   // line -> worst conservation error ; line -> Set of shown texts
const dt = 0.1, T = Math.floor(show.duration / dt);
let prev = null, prevT = 0;
const isCut = (A, B) => A.shot.id !== B.shot.id && !B.shot.continuous;
/** refine a suspected jump between ta and tb: true if it is still there at a 1/512 s step (a real discontinuity) */
const realJump = (ta, tb, f, lim) => { for (let k = 0; k < 44; k++) { const m = (ta + tb) / 2, a = show.state(ta), mm = show.state(m); if (isCut(a, mm)) return false; if (Math.abs(f(mm) - f(a)) > Math.abs(f(show.state(tb)) - f(mm))) tb = m; else ta = m; if (tb - ta < 1e-9) break; } const A = show.state(ta), B = show.state(tb); return !isCut(A, B) && Math.abs(f(B) - f(A)) > lim; };
const handover = (A, B, p) => { const ids = new Set([...A.moves, ...B.moves].map((m) => m.id)); for (const id of ids) { const a = A.moves.find((m) => m.id === id), b = B.moves.find((m) => m.id === id), m = a ?? b; if ((!a || !b) && (m.from.player === p || m.to.player === p)) return true; } return false; };
for (let i = 0; i <= T; i++) {
  const t = i * dt, S = show.state(t), ln = S.line;
  const bad = nan(S); if (bad) err(`t=${t.toFixed(1)} ${ln}: NaN/Infinity at ${bad}`);
  if (!S.shot) err(`t=${t.toFixed(1)}: no shot`);
  for (const p of S.players) if (p.coins < 0) err(`t=${t.toFixed(1)}: player ${p.id} coins ${p.coins}`);
  for (const x of [...S.extras, ...S.moves]) if (x.coins < 0) err(`t=${t.toFixed(1)}: ${x.id} coins ${x.coins}`);
  if (TOT[S.world] && S.players.every((p) => p.present > 0.5) && S.layout.kind === 'board') {
    const tot = S.players.reduce((a, p) => a + p.coins, 0) + S.moves.reduce((a, m) => a + (m.kind === 'disc' && !(m.from.extra && m.from.extra !== 'pot') ? m.coins : 0), 0) + S.extras.filter((x) => x.id === 'pot').reduce((a, x) => a + x.coins, 0);
    const e = Math.min(...TOT[S.world].map((x) => Math.abs(tot - x))); if (e > 0.01) { const c = cons.get(ln) ?? { e: 0, t, world: S.world, tot }; if (e > c.e) cons.set(ln, { e, t, world: S.world, tot }); }
  }
  const shown = seen.get(ln) ?? new Set(); seen.set(ln, shown);
  for (const g of S.tags) if (g.opacity > 0.5) { shown.add(g.text); const sl = sbLine.get(g.line); if (!sl || !sl.tags.includes(g.text)) add(extras, `${g.line} "${g.text}"`, t); else if (g.line !== ln) add(extras, `carry-over: ${g.line} "${g.text}" still up in ${ln}`, t); }
  for (const c of [S.counter, S.total]) if (c && c.opacity > 0.5) { shown.add(c.text); shown.add(c.label); }
  if (prev && !isCut(prev, S)) {
    for (let p = 0; p < N; p++) {
      const a = prev.players[p], b = S.players[p];
      if (Math.abs(b.coins - a.coins) > Math.max(5, 0.1 * Math.max(a.coins, b.coins)) && realJump(prevT, t, (X) => X.players[p].coins, Math.max(1, 0.02 * Math.max(a.coins, b.coins)))) { const A = show.state(prevT), B = show.state(t); if (!handover(A, B, p)) add(jumps, `coins ${who(p)} in ${ln}`, t); }
      if (Math.abs(b.down - a.down) > 0.3 && realJump(prevT, t, (X) => X.players[p].down, 0.2)) add(jumps, `down ${who(p)} in ${ln}`, t);
      if (Math.hypot(b.at.f - a.at.f, b.at.r - a.at.r) > 0.6 && realJump(prevT, t, (X) => X.players[p].at.f + X.players[p].at.r, 0.3)) add(jumps, `position ${who(p)} in ${ln}`, t);
      if (Math.abs(b.present - a.present) > 0.5) add(jumps, `present ${who(p)} in ${ln}`, t);
    }
    for (const g of S.tags) { const h = prev.tags.find((x) => x.id === g.id); if (h && JSON.stringify(h.anchor) !== JSON.stringify(g.anchor)) add(jumps, `tag anchor "${g.text}" in ${ln}`, t); if (g.anchor.player != null) { const a = prev.players[g.anchor.player].at, b = S.players[g.anchor.player].at; if (h && Math.hypot(a.f - b.f, a.r - b.r) > 0.6) add(jumps, `tag position "${g.text}" in ${ln}`, t); } }
  }
  prev = S; prevT = t;
}
for (const l of show.lines) { const sl = sbLine.get(l.id); if (!sl) { notes.push(`${l.id}: in the score, not in the storyboard`); continue; } for (const tg of sl.tags) if (!seen.get(l.id)?.has(tg)) err(`${l.id}: storyboard tag "${tg}" never shown during the line`); }
for (const id of sbLine.keys()) if (!show.lines.find((l) => l.id === id)) notes.push(`${id}: in the storyboard, not in the score`);

/* ---------------- round 4 contract checks (QA fix round 1): timing of tags / hats / king / coin, fallen counts, Skeptic, columns, tally */
const SC = new Map(score.lines.map((l, i) => [l.id, { ...l, i }]));
const nrm = (x) => String(x).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}']/gu, '');
const word = (id, w, k = 0) => { const l = SC.get(id); if (!l) return null; const h = l.words.filter((x) => nrm(x.w) === nrm(w)); return h[k < 0 ? h.length + k : k] ?? null; };
const nxt = (id) => { const l = SC.get(id); return l.i + 1 < score.lines.length ? score.lines[l.i + 1].t0 : show.duration; };
const cuts = show.shots.filter((sh, i) => i && !sh.continuous).map((sh) => sh.t0);
const c4 = (m) => err('R4 ' + m);
const tagAt = (t, id) => show.state(t).tags.find((g) => g.id === id);
const range = (a, b, f, step = 0.1) => { for (let t = a; t <= b + 1e-9; t += step) { const r = f(t); if (r) return `${r} at ${t.toFixed(2)}`; } return null; };
let r4 = 0;
// 1. tags: up LEAD (0.15 s) before the word (titles at the line start) and held to the end of line + silence or the next cut
for (const d of show.tagDefs) {
  if (!SC.has(d.line)) continue; r4++;
  const L = SC.get(d.line);
  const c0 = cuts.filter((x) => x <= d.tw).pop() ?? -Infinity;   // a tag may start at its own shot's cut when the lead would cross it
  if (d.kind === 'title' ? d.t0 > Math.max(L.t0, c0) + 1e-6 : d.t0 > Math.max(d.tw - 0.15, c0) + 1e-6) c4(`tag ${d.id}: comes up at ${d.t0.toFixed(2)}, later than ${d.kind === 'title' ? 'its line start' : 'word - 0.15 s'}`);
  const c = cuts.find((x) => x > d.tw), need = d.replaced ? d.t1 : Math.min(nxt(d.line), c ?? Infinity);
  if (!d.replaced && d.t1 < need - 0.01) c4(`tag ${d.id}: ends at ${d.t1.toFixed(2)}, before the end of its line/silence ${need.toFixed(2)}`);
  const bad = range(Math.max(d.tw, d.t0 + 0.15), need - 0.3, (t) => ((tagAt(t, d.id)?.opacity ?? 0) > 0.5 ? null : 'not up'));
  if (bad) c4(`tag ${d.id} "${d.text}": ${bad}`);
}
// counters: up from the start of their line, exact storyboard text by the end of the line, stable strings, fast flag boolean
for (const [id, sl] of sbLine) {
  if (!SC.has(id)) continue; const L = SC.get(id);
  for (const tg of sl.tags) { const m = /^(FLIPS EACH|WORLDS|TOTAL) /.exec(tg); if (!m) continue; r4++;
    const key = m[1] === 'TOTAL' ? 'total' : 'counter', S0 = show.state(L.t0 + 0.25), S1 = show.state(nxt(id) - 0.3);
    if (!(S0[key]?.opacity > 0.5 && S0[key].label === m[1])) c4(`${id}: counter "${m[1]}" not up at the line start`);
    if (S1[key]?.text !== tg) c4(`${id}: counter shows "${S1[key]?.text}" at the end of the line, storyboard "${tg}"`); }
}
for (let t = 0; t < show.duration; t += 0.25) { const S = show.state(t); for (const c of [S.counter, S.total]) if (c && (typeof c.text !== 'string' || typeof c.fast !== 'boolean' || c.text !== `${c.label} ${c.value.toLocaleString('en-US')}`)) { c4(`t=${t.toFixed(2)}: counter text/fast malformed`); break; } }
// 2. hats seated by the end of the name, name tag up from the start of the name; all four names up at the end of l11d
for (const [id, w, role] of [['l11a', 'Scholar', 'scholar'], ['l11b', 'Worker', 'worker'], ['l11c', 'Heir', 'heir'], ['l11d', 'Fool', 'fool']]) {
  const h = word(id, w); if (!h) continue; r4++;
  if (show.state(h.t1).players[CAST[role]].hat < 0.999) c4(`${id}: hat of the ${role} not seated at the end of "${w}" (${show.state(h.t1).players[CAST[role]].hat.toFixed(2)})`);
  if (!(show.state(h.t0).tags.find((g) => g.text === `THE ${role.toUpperCase()}`)?.opacity > 0.5)) c4(`${id}: name tag not up at the start of "${w}"`);
}
if (SC.has('l11d')) { const S = show.state(SC.get('l11d').t1 - 0.01); for (const r of Object.keys(CAST)) if (!(S.tags.find((g) => g.text === `THE ${r.toUpperCase()}`)?.opacity > 0.5)) c4(`l11d: name tag of the ${r} not up at the end of the line`); }
// 3. king lands on "made", cone hat seated by "made" + 0.4 s, held through the silence
{ const m = word('l23', 'made'); if (m) { r4++; const S = show.state(m.t1); if (S.king.drop < 1 || S.king.swap < 1) c4(`l23: king not landed at the end of "made" (drop ${S.king.drop.toFixed(2)})`);
  const bad = range(m.t1 + 0.4, nxt('l23') - 0.1, (t) => { const K = show.state(t).king; return K.drop >= 1 && K.hat >= 0.999 ? null : 'king/hat not seated'; }); if (bad) c4('l23: ' + bad); } }
// 5. l09: the coin visible all line, lands crown up on "Heads" and hovers (lift >= 0.3); the payout slides on "takes"; tags on the two players
if (SC.has('l09')) { r4++; const L = SC.get('l09'), hd = word('l09', 'Heads'), tk = word('l09', 'takes'), pair = show.state(L.t0 + 0.1).shot.subject.players ?? [];
  const bad = range(L.t0 + 0.1, L.t1, (t) => { const C = show.state(t).flipCoins.find((c) => c.id === 'main'); return C && C.present > 0.9 ? null : 'coin not visible'; }); if (bad) c4('l09: ' + bad);
  if (hd) { const b2 = range(hd.t0 + 0.45, L.t1, (t) => { const C = show.state(t).flipCoins.find((c) => c.id === 'main'); return C && C.lift >= 0.3 && Math.abs(C.angle - Math.round(C.angle)) < 1e-6 ? null : `coin not hovering crown up (lift ${C?.lift.toFixed(2)})`; }); if (b2) c4('l09: ' + b2); }
  if (tk) { const mv1 = show.state(tk.t0 + 0.2).moves.find((m) => m.id === 'stake1a'); if (!mv1 || mv1.to.player == null) c4('l09: payout not sliding on "takes"'); if (show.state(tk.t0 - 0.2).moves.find((m) => m.id === 'stake1a')?.to.player != null) c4('l09: payout starts before "takes"'); }
  for (const d of show.tagDefs.filter((x) => x.line === 'l09')) if (!pair.includes(d.anchor.player)) c4(`l09: tag "${d.text}" not anchored on one of the pair`); }
// 6. fallen counts: the board shows the spoken number of fallen pawns from the moment its tag comes up until the tag ends
for (const d of show.tagDefs) { const m = /^(\d+) (out|under one coin|standing)$/.exec(d.text); if (!m || !SC.has(d.line)) continue; r4++;
  const want = +m[1], bad = range(d.t0, d.t1 - 0.05, (t) => { const P = show.state(t).players.filter((p) => p.present > 0.5), k = m[2] === 'standing' ? P.filter((p) => p.down < 0.5).length : P.filter((p) => p.down >= 0.5).length; return k === want ? null : `${k} shown, tag says ${want}`; });
  if (bad) c4(`${d.line} "${d.text}": ${bad}`); }
// 11. the Skeptic: not before l31; on the 64-seat board from l31 on; never on the cleared board, demos or the tally; steps forward only in l31, l48, l53
{ r4++; const t31 = SC.get('l31')?.t0 ?? Infinity, FWD = new Set(['l31', 'l48', 'l53']), TALLY = new Set(['l36', 'l37', 'l38', 'l39', 'l40']), CLEAR = new Set(['l44', 'l45', 'l45a', 'l46', 'l47', 'l60']);
  for (let t = 0; t < show.duration; t += 0.1) { const S = show.state(t), sk = S.skeptic, ln = S.shot.id.split('-')[1];   // the line the current SHOT belongs to
    if (t < t31 - 0.05 && sk.present) { c4(`skeptic present before l31 at ${t.toFixed(1)}`); break; }
    if ((CLEAR.has(ln) || TALLY.has(ln)) && sk.present) { c4(`skeptic present in ${ln} at ${t.toFixed(1)}`); break; }
    if (t >= t31 && !CLEAR.has(ln) && !TALLY.has(ln) && S.world !== 'demo' && S.world !== 'empty' && !sk.present) { c4(`skeptic missing on the board in ${ln} at ${t.toFixed(1)}`); break; }
    if (S.world === 'demo' && sk.present) { c4(`skeptic present in a demo close-up (${ln}) at ${t.toFixed(1)}`); break; }
    if (sk.forward > 0.01 && !FWD.has(ln)) { c4(`skeptic steps forward in ${ln} at ${t.toFixed(1)}`); break; } } }
// 12. l60: both columns complete before "fifty-three"
{ const w53 = word('l60', 'fifty-three'); if (w53) { r4++; const S = show.state(w53.t0 - 0.15), no = S.chips.find((c) => c.id === 'vote-no'), yes = S.chips.find((c) => c.id === 'vote-yes');
  if (no?.count !== 53 || yes?.count !== 47) c4(`l60: columns ${no?.count?.toFixed(1)} / ${yes?.count?.toFixed(1)} before "fifty-three"`);
  if (show.state(SC.get('l60').t0 + 0.4).chips.find((c) => c.id === 'vote-no')?.count <= 0) c4('l60: columns not building from the start of the line'); } }
// 15. the tally: five owners in one row, columns in front, subject = 5 players + 5 columns, counts at the words
if (SC.has('l36') && SC.has('l41')) { r4++;
  const five = [CAST.heir, CAST.scholar, CAST.worker, CAST.fool, show.cast.nobody], KEYS = ['heir', 'scholar', 'worker', 'fool', 'nobody'];
  const bad = range(SC.get('l36').t0, SC.get('l41').t0 - 0.15, (t) => { const S = show.state(t), pres = S.players.filter((p) => p.present > 0.5).map((p) => p.id).sort((a, b) => a - b);
    if (JSON.stringify(pres) !== JSON.stringify([...five].sort((a, b) => a - b))) return `present ${pres.length} players`;
    const at = five.map((p) => S.players[p].at), fs = at.map((a) => a.f).sort((a, b) => a - b);
    if (at.some((a) => Math.abs(a.r - at[0].r) > 1e-6)) return 'owners not in one row';
    for (let i = 1; i < 5; i++) if (Math.abs(fs[i] - fs[i - 1] - 1.5) > 0.11) return 'row spacing not ~1.5';
    if (Math.abs(fs[2] - 4.5) > 0.05) return 'row not centred';
    for (let i = 0; i < 5; i++) { const c = S.chips.find((x) => x.id === 'tally-' + KEYS[i]); if (!c || Math.abs(c.at.f - at[i].f) > 1e-6 || !(c.at.r < at[i].r)) return `column ${KEYS[i]} not in front of its owner`; }
    const sp = (S.shot.subject.players ?? []).slice().sort((a, b) => a - b), sc = (S.shot.subject.chips ?? []).slice().sort();
    if (S.shot.kind !== 'tally' || JSON.stringify(sp) !== JSON.stringify([...five].sort((a, b) => a - b)) || JSON.stringify(sc) !== JSON.stringify(KEYS.map((k) => 'tally-' + k).sort())) return 'tally subject is not the 5 players + 5 columns';
    return null; });
  if (bad) c4('tally: ' + bad);
  const cnt = (t, k) => show.state(t).chips.find((c) => c.id === 'tally-' + k)?.count;
  for (const [id, w, k, v] of [['l36', 'forty-seven', 'heir', 47], ['l37', 'Six', 'scholar', 6], ['l38', 'Two', 'worker', 2], ['l38', 'Less', 'fool', 1], ['l39', 'forty-five', 'nobody', 45]]) { const h = word(id, w); if (h && cnt(h.t0 + 0.15, k) !== v) c4(`${id}: column ${k} = ${cnt(h.t0 + 0.15, k)?.toFixed(1)} at "${w}", want ${v}`); }
  if (SC.has('l40')) { const te = nxt('l40') - 0.1; if (cnt(te, 'heir') !== 11 || cnt(te, 'scholar') !== 28) c4(`l40: columns heir ${cnt(te, 'heir')} scholar ${cnt(te, 'scholar')} at the end, want 11 / 28`); }
  const u = word('l38', 'ugly'); if (u && show.state(u.t0 + 0.6).players[CAST.worker].down < 0.99) c4('l38: the Worker has not tipped over on "ugly part"'); }
/* ---------------- round 5 checks (QA fix round 2), errors prefixed R5 */
const c5 = (m) => err('R5 ' + m);
let r5 = 0;
const shotAt = (t) => show.state(t).shot;
const subjP = (sh, key = 'subject') => sh[key]?.players ?? [];
// R5.1 l43: on the most talented pawn (tag + focus) up to "talented one"; pan starts on "It", done by "average"; 'richest' from "It"; held on the rich pawn
if (SC.has('l43') && show.cast.talentBest != null) { r5++; const B = show.cast.talentBest, R = show.cast.talentRich, it = word('l43', 'It'), av = word('l43', 'average'), on = word('l43', 'one'), mo = word('l43', 'most');
  const b1 = range(mo.t0, on.t1, (t) => { const S = show.state(t); return S.focus?.players?.includes(B) && !S.focus.players.includes(R) && S.tags.some((g) => g.text === 'most talented' && g.anchor.player === B && g.opacity > 0.5) ? null : 'not on the most talented pawn'; }); if (b1) c5('l43: ' + b1);
  const sp = shotAt(it.t0 + 0.02); if (!(sp.move === 'pan' && subjP(sp).includes(B) && subjP(sp, 'to').includes(R) && sp.t0 >= it.t0 - 0.15 && sp.t1 <= av.t0 + 0.02)) c5(`l43: pan not from "It" to "average" (${sp.move} ${sp.t0.toFixed(2)}-${sp.t1.toFixed(2)})`);
  if (!show.state(it.t0).tags.some((g) => g.text === 'richest' && g.anchor.player === R && g.opacity > 0.5)) c5('l43: richest tag not up at "It"');
  const b2 = range(av.t0 + 0.05, nxt('l43') - 0.1, (t) => { const sh = shotAt(t); return sh.move === 'hold' && subjP(sh).includes(R) ? null : 'not holding on the richest pawn'; }); if (b2) c5('l43: ' + b2); }
// R5.2 l41: talent sizes 0.7..1.6 (spread readable), all sized by "middle"
if (SC.has('l41') && SC.has('l42')) { r5++; const m = word('l41', 'middle'), S = show.state(m ? m.t1 : SC.get('l41').t1), S2 = show.state(SC.get('l42').t0 + 0.1);
  if (S.players.some((p, i) => Math.abs(p.scale - S2.players[i].scale) > 1e-6)) c5('l41: pawns still resizing after "middle"');
  const sc = S2.players.map((p) => p.scale).sort((a, b) => a - b), med = sc[32]; if (sc[0] > 0.76 || sc[63] < 1.5 || Math.abs(med - 1) > 0.06) c5(`l41: talent sizes ${sc[0].toFixed(2)}..${sc[63].toFixed(2)} median ${med.toFixed(2)}`); }
// R5.3 l64a: the tower complete before "waiting", rising from "There"; the hop starts on "Everybody" and lands before the line end
if (SC.has('l64a')) { r5++; const th = word('l64a', 'There'), wt = word('l64a', 'waiting'), ev = word('l64a', 'Everybody'), L = SC.get('l64a');
  const tw = (t) => show.state(t).extras.find((x) => x.id === 'skTower')?.coins ?? (show.state(t).skeptic.coins || 0);
  if (tw(wt.t0) < 99.9) c5(`l64a: Skeptic tower ${tw(wt.t0).toFixed(1)} at "waiting"`);
  if (tw(th.t0 + 0.5) < 40) c5(`l64a: tower not rising fast from "There" (${tw(th.t0 + 0.5).toFixed(1)} at +0.5 s)`);
  if (show.state(ev.t0 - 0.05).skeptic.jump) c5('l64a: hop starts before "Everybody"'); if (!show.state(ev.t0 + 0.1).skeptic.jump) c5('l64a: no hop on "Everybody"');
  const S = show.state(L.t1); if (S.skeptic.jump || S.skeptic.coins !== 100) c5('l64a: the Skeptic has not landed on its tower by the end of the line'); }
// R5.4 l65: each name tag on its own player; the four in the line-up left to right (file order) = spoken order, settled before their tag
if (SC.has('l65')) { r5++; const roles = ['scholar', 'worker', 'heir', 'fool'], ws = ['Scholar', 'Worker', 'Heir', 'Fool'].map((w) => word('l65', w, -1));
  const S = show.state(nxt('l65') - 0.1), fs5 = roles.map((r) => S.players[CAST[r]].at.f);
  for (let i = 1; i < 4; i++) if (!(fs5[i] > fs5[i - 1])) c5(`l65: line-up order wrong (${fs5.join(', ')})`);
  roles.forEach((r, i) => { const g = S.tags.find((x) => x.text === `THE ${r.toUpperCase()}`); if (g?.anchor.player !== CAST[r]) c5(`l65: tag THE ${r.toUpperCase()} anchored on ${g?.anchor.player}`);
    const a = show.state(ws[i].t0 - 0.15); for (const q of roles) if (Math.hypot(a.players[CAST[q]].at.f - S.players[CAST[q]].at.f, a.players[CAST[q]].at.r - S.players[CAST[q]].at.r) > 0.05) { c5(`l65: ${q} still moving when THE ${r.toUpperCase()} comes up`); break; } }); }
// R5.5 l53: Skeptic shot with forward held at 1 through "matters?"; cut to the four hats on "No"; coin in the air on "luck decides"; king shot from the last "So" through the silence
if (SC.has('l53')) { r5++; const se = word('l53', 'objection'), ma = word('l53', 'matters'), no = word('l53', 'No'), lu = word('l53', 'luck'), de = word('l53', 'decides'), so = word('l53', 'So', -1);
  const b1 = range(se.t1, ma.t1, (t) => { const S = show.state(t); return S.shot.kind === 'skeptic' && S.skeptic.forward > 0.999 ? null : `skeptic shot/forward ${S.shot.kind} ${S.skeptic.forward.toFixed(2)}`; }); if (b1) c5('l53: ' + b1);
  const h = shotAt(no.t0 + 0.05); if (h.kind !== 'block' || h.t0 < ma.t1 || h.t0 > no.t0) c5(`l53: no cut to the four hats on "No" (${h.kind} at ${h.t0.toFixed(2)})`);
  const b2 = range(lu.t0 + 0.1, de.t1 - 0.05, (t) => { const C = show.state(t).flipCoins.find((c) => c.id === 'main'); return C && C.present > 0.9 && C.lift > 0.05 ? null : 'coin not up'; }); if (b2) c5('l53: ' + b2);
  const b3 = range(so.t0, nxt('l53') - 0.1, (t) => { const S = show.state(t); return S.shot.kind === 'tower' && S.shot.subject.king && S.king.drop === 1 && S.king.hat === 1 ? null : 'not on the king'; }); if (b3) c5('l53: ' + b3); }
// R5.6 l51: '9 above', '55 below', '36 under one coin' up from their word to the end of the line + silence (through the cut to the giant tower)
if (SC.has('l51')) { r5++; for (const d of show.tagDefs.filter((x) => x.line === 'l51' && !/%$/.test(x.text))) { const b = range(d.tw, nxt('l51') - 0.15, (t) => ((tagAt(t, d.id)?.opacity ?? 0) > 0.5 ? null : 'not up')); if (b) c5(`l51 "${d.text}": ${b}`); } }
// R5.8 l11d: the Fool's hat seated at the START of "Fool"
{ const f = word('l11d', 'Fool'); if (f) { r5++; const h = show.state(f.t0).players[CAST.fool].hat; if (h < 0.999) c5(`l11d: the Fool's hat ${h.toFixed(2)} at the start of "Fool"`); } }
// R5.9 l23: king landed, swapped and cone hat = 1 by the end of "made" and before "king"
{ const m = word('l23', 'made'), k = word('l23', 'king'); if (m && k) { r5++; const K = show.state(Math.min(m.t1, k.t0)).king; if (K.drop < 1 || K.swap < 1 || K.hat < 0.999) c5(`l23: king drop ${K.drop.toFixed(2)} swap ${K.swap.toFixed(2)} hat ${K.hat.toFixed(2)} at the end of "made"`); } }
// R5.10 l60: the two columns never equal once chips are there ('no' leads by >= 1 whole chip)
if (SC.has('l60')) { r5++; const b = range(SC.get('l60').t0, nxt('l60') - 0.1, (t) => { const C = show.state(t).chips, no = C.find((c) => c.id === 'vote-no')?.count ?? 0, yes = C.find((c) => c.id === 'vote-yes')?.count ?? 0; return no + yes === 0 || Math.floor(no) > Math.floor(yes) || (no > 0 && yes === 0) ? null : `columns ${no.toFixed(1)} / ${yes.toFixed(1)}`; }, 0.05); if (b) c5('l60: ' + b); }

// focus on every sample is null or {players[], extras[], hard}
for (let t = 0; t < show.duration; t += 0.5) { const f = show.state(t).focus; if (f !== null && !(Array.isArray(f.players) && Array.isArray(f.extras) && typeof f.hard === 'boolean')) { c4(`t=${t}: focus malformed`); break; } }

const span = (ts) => `${ts.length}x at ${ts[0].toFixed(1)}${ts.length > 1 ? '..' + ts[ts.length - 1].toFixed(1) : ''} s`;
const rep = ['', `CHECK ${score.lines.length} lines, ${T + 1} samples at 10/s; round-4 contract checks: ${r4} (errors prefixed R4); round-5 checks: ${r5} (R5)`];
rep.push(`errors: ${errors.length}`, ...errors.slice(0, 40).map((e) => '  ' + e));
rep.push(`continuity jumps inside a shot: ${jumps.size}`, ...[...jumps].map(([k, v]) => `  ${k}: ${span(v)}`));
rep.push(`coin totals off (fair/again/leak 6,400, hats 7,300): ${cons.size} lines`, ...[...cons].map(([k, v]) => `  ${k}: world ${v.world} total ${v.tot.toFixed(1)} (off by ${v.e.toFixed(1)}) at ${v.t.toFixed(1)} s`));
rep.push(`tags to judge (not listed for their line / carried into the next line): ${extras.size}`, ...[...extras].map(([k, v]) => `  ${k}: ${span(v)}`));
if (notes.length) rep.push('notes', ...notes.map((x) => '  ' + x));
let t0 = performance.now(), k = 0; for (let t = 0; t < show.duration; t += 1 / 30 / 17) { show.state(t); k++; } const per = (performance.now() - t0) / k;
rep.push(`state(t) cost: ${(per * 1000).toFixed(1)} us average over ${k} calls (17 per frame)`);
console.log(rep.join('\n'));
fs.appendFileSync(dumpPath, rep.join('\n') + '\n', 'utf8');
process.exit(errors.length ? 1 : 0);
