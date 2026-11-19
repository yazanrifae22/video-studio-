// STAND-IN for show.js (Host view dev only): a short synthetic show over dev-host/score.json built from the fixtures, with beats.
// Same output shape as STATE.md: makeShow(score) -> {duration, beats, lines, state(t)}.
import { FIXTURES } from '../fixtures.js';
import { CAST, SEAT } from '../game.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const copy = (o) => JSON.parse(JSON.stringify(o));
const sqAt = (n) => ({ f: (n - 1) % 8 + 1, r: Math.floor((n - 1) / 8) + 1 });
const word = (line, w, n = 0) => { const ws = line.words.filter((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === w.toLowerCase()); return (ws[n] ?? ws[0] ?? line.words[0]).t0; };

export function makeShow(score) {
  const L = Object.fromEntries(score.lines.map((l) => [l.id, l]));
  const beats = [], segs = [];
  const seg = (id, fx, shot, fn) => segs.push({ id, fx, shot, fn });
  const coinFlight = (c, tF, tL, face, turns = 5) => (t) => {
    if (t < tF) return { ...c, phase: 'rest', lift: 0, angle: 0 };
    if (t > tL) return { ...c, phase: 'rest', lift: 0, angle: turns + (face === 'tails' ? 0.5 : 0), face };
    const u = (t - tF) / (tL - tF); return { ...c, phase: 'air', lift: Math.sin(Math.PI * u) * (1 - 0.15 * u), angle: (turns + (face === 'tails' ? 0.5 : 0)) * (1 - (1 - u) ** 2), face };
  };
  // l01: equal board, one slow flip in the middle (hand test)
  { const l = L.l01, tF = word(l, 'One', 1) - 0.2, tL = tF + 1.4, a = 10, b = 13, mid = { f: 4.5, r: 3.6 };
    beats.push({ type: 'flip', t0: tF, t1: tL, tLand: tL, coin: 'main', a, b, winner: a, face: 'heads' });
    const cf = coinFlight({ id: 'main', at: mid, present: 1, yaw: 0.05, glint: 0, labels: null, face: 'heads' }, tF, tL, 'heads');
    seg('l01', 'equalBoard', ['wide', { board: true }, 'push'], (s, t) => { s.flipCoins = [cf(t)]; s.title = t < 3 ? s.title : null; }); }
  // l09: a pair, stake then a slow flip on "coin", payout on "Heads"
  { const l = L.l09, fx = FIXTURES.flipInAir, a = fx.players.findIndex((p) => p.lit), b = fx.players.findIndex((p, i) => p.lit && i !== a);
    const tS = l.t0 - 0.4, tF = word(l, 'coin') - 0.1, tL = word(l, 'Heads') - 0.05;
    beats.push({ type: 'stake', t0: tS, t1: tS + 0.6, a, b, coins: 20 }, { type: 'flip', t0: tF, t1: tL, tLand: tL, coin: 'main', a, b, winner: a, face: 'heads' }, { type: 'payout', t0: tL + 0.3, t1: tL + 1, to: a, coins: 40 });
    const cf = coinFlight({ ...fx.flipCoins[0] }, tF, tL, 'heads');
    seg('l09', 'flipInAir', ['pair', { players: [a, b], coins: ['main'] }, 'push'], (s, t) => { s.flipCoins = [cf(t)]; s.moves.forEach((m) => { m.u = t < tS ? 0 : t < tS + 0.6 ? sm((t - tS) / 0.6) : 1; }); }); }
  // l11a-d: the hats
  for (const [id, role] of [['l11a', 'scholar'], ['l11b', 'worker'], ['l11c', 'heir'], ['l11d', 'fool']]) {
    const l = L[id], p = CAST[role]; beats.push({ type: 'intro', t0: l.t0 + 0.2, t1: l.t1 + 0.6, role, player: p });
    const order = ['scholar', 'worker', 'heir', 'fool'], k = order.indexOf(role);
    seg(id, 'fourHats', ['block', { players: [CAST.heir, CAST.fool, CAST.scholar, CAST.worker] }, 'push'], (s, t) => { s.players.forEach((pl) => { const j = order.indexOf(pl.role); pl.hat = j < 0 ? 0 : j < k ? 1 : j > k ? 0 : sm((t - l.t0 - 0.2) / 0.6); pl.lit = j === k ? 1 : 0; }); s.tags = s.tags.filter((tg) => order.indexOf(tg.id.slice(5)) <= k); });
  }
  // l16: "Keep flipping": a flip
  { const l = L.l16, tF = word(l, 'Keep') + 0.15, tL = tF + 1.3, a = 20, b = 30, mid = { f: 5, r: 5 };
    beats.push({ type: 'flip', t0: tF, t1: tL, tLand: tL, coin: 'main', a, b, winner: b, face: 'tails' });
    const cf = coinFlight({ id: 'main', at: mid, present: 1, yaw: 0, glint: 0, labels: null }, tF, tL, 'tails');
    seg('l16', 'midGame', ['wide', { board: true }, 'orbit'], (s, t) => { s.flipCoins = [cf(t)]; }); }
  // l17: a time-lapse from the line start
  { const l = L.l17; beats.push({ type: 'timelapse', t0: l.t0 - 0.5, t1: l.t0 + 4, world: 'fair', x0: 640, x1: 6400 });
    seg('l17', 'midGame', ['high', { board: true }, 'orbit'], () => {}); }
  // l31: the Skeptic objection: forward on "typing", objection beat
  { const l = L.l31, tf = word(l, 'typing') - 0.2; beats.push({ type: 'objection', t0: tf, t1: tf + 1.2 });
    seg('l31', 'skepticHop', ['skeptic', { skeptic: true, board: true }, 'push'], (s, t) => { s.skeptic.jump = null; s.extras = []; s.skeptic.forward = sm((t - tf) / 0.8); s.skeptic.at = { f: 4.5, r: -0.7 + 0.4 * s.skeptic.forward }; s.skeptic.lit = s.skeptic.forward; s.king = { on: null, drop: 0, swap: 0, hat: 0 }; }); }
  // l36: tally
  { const l = L.l36; for (let k = 0; k < 6; k++) beats.push({ type: 'chip', t0: l.t0 + 1 + k * 0.4, t1: l.t0 + 1.3 + k * 0.4, stack: 'tally-heir' });
    seg('l36', 'tally', ['tally', null, 'hold'], () => {}); }
  // l23: the king drops onto the great tower
  { const l = L.l23, tK = word(l, 'king'); beats.push({ type: 'king', t0: tK - 1.0, t1: tK });
    seg('l23', 'endKing', ['tower', { players: [CAST.fool], king: true }, 'tilt', { king: true }], (s, t) => { const d = sm((t - tK + 1.0) / 1.0); s.king = { on: CAST.fool, drop: d, swap: d >= 1 ? 1 : 0, hat: sm((t - tK - 0.2) / 0.3) }; }); }
  // l49: the coin close, hovering
  seg('l49', 'coinClose', ['coin', { coins: ['main'], extras: ['demo'] }, 'hold'], (s, t) => { s.flipCoins[0].angle = 0.35 + 0.08 * (t - L.l49.t0); });
  // l52: growth world, low pan
  seg('l52', 'averagePlane', ['low', { board: true }, 'pan'], () => {});
  // l62: the king (people), lean in
  seg('l62', 'endKing', ['wide', { king: true, board: true }, 'orbit'], () => {});
  // l64a: the Skeptic hops on its tower on "Everybody"
  { const l = L.l64a, tj = word(l, 'Everybody'); beats.push({ type: 'jump', t0: tj, t1: tj + 0.7, who: 'skeptic' });
    seg('l64a', 'skepticHop', ['skeptic', { skeptic: true, board: true }, 'push'], (s, t) => { const u = sm((t - tj) / 0.7); s.skeptic.jump = u > 0 && u < 1 ? { to: { extra: 'skTower' }, u } : null; s.skeptic.coins = u >= 1 ? 100 : 0; if (u >= 1) s.skeptic.at = { f: 5.3, r: -0.3 }; }); }
  // l65: equal board, the four, a question
  seg('l65', 'equalBoard', ['wide', { board: true }, 'pull'], (s) => { s.players.forEach((p) => { if (p.role) p.hat = 1; }); s.title = null; s.tags = []; });

  const bounds = segs.map((sg, i) => (i === 0 ? 0 : L[sg.id].t0 - 0.7));
  beats.sort((a, b) => a.t0 - b.t0);
  for (const sg of segs) beats.push({ type: 'cut', t0: L[sg.id].t0 - 0.7, t1: L[sg.id].t0 - 0.7, shot: 's-' + sg.id });
  beats.sort((a, b) => a.t0 - b.t0);
  const duration = score.duration;
  const state = (t) => {
    t = clamp(t, 0, duration);
    let i = 0; while (i + 1 < segs.length && t >= bounds[i + 1]) i++;
    const sg = segs[i], s = copy(FIXTURES[sg.fx]), l = L[sg.id], t0 = bounds[i], t1 = i + 1 < segs.length ? bounds[i + 1] : duration;
    s.t = t; s.line = sg.id; s.lineU = clamp((t - l.t0) / (l.t1 - l.t0)); s.chapter = 'c01';
    const [kind, subject, move, to] = sg.shot;
    s.shot = { id: 's-' + sg.id, kind, subject: subject ?? s.shot.subject, to: to ?? null, move, t0, t1, u: (t - t0) / (t1 - t0) };
    if (i > 0 && s.title) s.title = null;
    sg.fn(s, t);
    return s;
  };
  return { duration, beats, lines: score.lines, state, warnings: [] };
}
