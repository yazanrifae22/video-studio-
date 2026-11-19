// Hand-made named states for the three views (docs/brands/test-3d/fair-game/STATE.md). Same schema as show.js state(t).
// Numbers come from game.js. Together the fixtures use every field and every shot kind. `import { FIXTURES } from './fixtures.js'`.
import { N, SEAT, CAST, WORLDS, each, AGAIN, AGAIN_KINGS, TALLY } from './game.js';

const sqAt = (n) => ({ f: (n - 1) % 8 + 1, r: Math.floor((n - 1) / 8) + 1 });
const ROLE = Object.fromEntries(Object.entries(CAST).map(([k, p]) => [p, k]));
const player = (id, o = {}) => ({ id, at: sqAt(SEAT[id]), coins: 100, rings: 1, present: 1, down: 0, lit: 0, dim: 0, hop: 0, scale: 1, role: ROLE[id] ?? null, hat: ROLE[id] ? 1 : 0, slot: null, fallDir: { f: 0, r: 1 }, ...o });
const board = (coinsOf = () => 100, extra = () => ({})) => Array.from({ length: N }, (_, i) => { const c = coinsOf(i); return player(i, { coins: c, down: c < 1 ? 1 : 0, dim: c < 1 ? 1 : 0, ...extra(i) }); });
const extra = (id, kind, at, o = {}) => ({ id, kind, at, coins: 0, rings: 1, present: 1, down: 0, lit: 0, dim: 0, hop: 0, scale: 1, role: null, hat: 0, ghost: 0, jump: null, rect: null, gather: 0, fallDir: { f: 0, r: 1 }, ...o, show: o.show ?? o.coins ?? 0 });
const skeptic = (o = {}) => ({ present: 0, at: { f: 4.5, r: -0.7 }, forward: 0, lit: 0, hop: 0, coins: 0, jump: null, ...o });
const coin = (id, at, o = {}) => ({ id, at, present: 1, phase: 'rest', lift: 0, angle: 0, yaw: 0, face: 'heads', glint: 0, labels: null, ...o });
const tag = (id, text, anchor, o = {}) => ({ id, line: id.split('-')[0], text, anchor, opacity: 1, pop: 0, size: 'm', color: null, kind: 'number', ...o });
const shot = (id, kind, subject, move = 'hold', o = {}) => ({ id, kind, subject, to: null, move, continuous: false, t0: 0, t1: 4, u: 0.5, ...o });
const base = (o) => ({ t: 0, chapter: 'c01', line: 'l01', lineU: 0.5, world: 'fair', flips: 0, players: board(), extras: [], skeptic: skeptic(), king: { on: null, drop: 0, swap: 0, hat: 0 }, flipCoins: [], moves: [], chips: [], rain: [], level: null, layout: { kind: 'board', u: 0 }, tags: [], counter: null, total: null, title: { text: 'ONE PLAYER OWNS 90%. NOBODY CHEATED.', opacity: 1 }, focus: null, ...o });
const counterOf = (label, value, opacity = 1) => ({ label, value, text: `${label} ${value.toLocaleString('en-US')}`, opacity, fast: false });

const fair = WORLDS.fair(), at200 = fair.at(each(200)), end = fair.final, F = CAST.fool;
const f1 = fair.flip(1), mid = (a, b, k = 0.5) => { const A = sqAt(SEAT[a]), B = sqAt(SEAT[b]); return { f: A.f + (B.f - A.f) * k, r: A.r + (B.r - A.r) * k }; };

export const FIXTURES = {
  /** l02 (round 4, 2026-11-15; l01 now opens on the king tower): the equal board, '64 players' and '100' tags */
  equalBoard: base({ t: 2, line: 'l02', players: board(() => 100, (i) => ({ hat: 0 })), title: null,
    tags: [tag('l01-64', '64 players', { screen: [0.5, 0.2] }, { size: 'l', kind: 'title' }), tag('l01-100a', '100', { player: 27 }, { pop: 0.6 })],
    shot: shot('s-l01', 'wide', { board: true }, 'push') }),
  /** l09: flip 1 in the air over c8 / g3, both stakes resting between them, the rest dimmed */
  flipInAir: base({ t: 40, chapter: 'c02', line: 'l09', flips: 0.5,
    players: board((i) => (i === f1.a || i === f1.b ? 80 : 100), (i) => ({ hat: 0, lit: i === f1.a || i === f1.b ? 1 : 0, dim: i === f1.a || i === f1.b ? 0 : 0.7 })),
    moves: [{ id: 'stake-1a', kind: 'disc', coins: 20, count: 0, from: { player: f1.a }, to: mid(f1.a, f1.b, 0.42), u: 1 }, { id: 'stake-1b', kind: 'disc', coins: 20, count: 0, from: { player: f1.b }, to: mid(f1.a, f1.b, 0.58), u: 1 }],
    flipCoins: [coin('main', mid(f1.a, f1.b), { phase: 'air', lift: 0.8, angle: 3.3, yaw: 0.05, face: 'heads' })],
    shot: shot('s-l09', 'pair', { players: [f1.a, f1.b], coins: ['main'] }, 'push') }),
  /** l17: the fair world at 200 flips each: six leaders lit, 20 down, counter */
  midGame: base({ t: 120, chapter: 'c04', line: 'l17', flips: each(200), players: board((i) => at200[i], (i) => ({ lit: [...at200].sort((a, b) => b - a).indexOf(at200[i]) < 6 ? 1 : 0 })),
    counter: counterOf('FLIPS EACH', 200), tags: [tag('l17-56', '56%', { screen: [0.5, 0.15] }, { size: 'l' })],
    shot: shot('s-l17', 'high', { board: true }, 'orbit') }),
  /** l23 / l61: the end of the fair world, the king on the Fool's tower with the cone hat */
  endKing: base({ t: 200, chapter: 'c04', line: 'l23', flips: fair.flips, players: board((i) => end[i]), king: { on: F, drop: 1, swap: 1, hat: 1 },
    shot: shot('s-l23', 'tower', { players: [F], king: true }, 'tilt', { to: { king: true } }) }),
  /** l36-l40: the tally columns in front of the four and one plain pawn, chips moving Heir -> Scholar */
  tally: base({ t: 330, chapter: 'c06', line: 'l40', world: 'hats', flips: 0, players: board((i) => (i === CAST.heir ? 1000 : 100)),
    chips: [['heir', CAST.heir, 30.4], ['scholar', CAST.scholar, 14], ['worker', CAST.worker, TALLY.richest.worker], ['fool', CAST.fool, TALLY.richest.fool], ['nobody', 3, TALLY.richest.nobody]]
      .map(([k, p, n]) => ({ id: 'tally-' + k, at: { f: sqAt(SEAT[p]).f, r: sqAt(SEAT[p]).r - 0.45 }, count: n, color: 'red', lit: 0, label: k })),
    moves: [{ id: 'chip-9', kind: 'chip', coins: 0, count: 1, from: { chips: 'tally-heir' }, to: { chips: 'tally-scholar' }, u: 0.4 }],
    counter: counterOf('FLIPS EACH', 1200), tags: [tag('l40-28', '28', { chips: 'tally-scholar' })],
    shot: shot('s-l36', 'tally', { chips: ['tally-heir', 'tally-scholar', 'tally-worker', 'tally-fool', 'tally-nobody'] }, 'hold') }),
  /** l27 / l28: the c05 demo towers (board cleared), ghost outline, a 16-coin slice lifted off each */
  demoTowers: base({ t: 230, chapter: 'c05', line: 'l28', world: 'demo', flips: null, players: board(() => 100, () => ({ present: 0 })),
    extras: [extra('short', 'pawn', { f: 3.8, r: 4.5 }, { coins: 64 }), extra('tall', 'pawn', { f: 5.2, r: 4.5 }, { coins: 784, ghost: 800 })],
    moves: [{ id: 'slice-s', kind: 'disc', coins: 16, count: 0, from: { extra: 'short' }, to: { extra: 'short', y: 0.6 }, u: 0.8 }, { id: 'slice-t', kind: 'disc', coins: 16, count: 0, from: { extra: 'tall' }, to: { extra: 'tall', y: 0.6 }, u: 0.8 }],
    tags: [tag('l28-20', '20%', { extra: 'short' }), tag('l28-2', '2%', { extra: 'tall' })],
    shot: shot('s-l28', 'demo', { extras: ['short', 'tall'] }, 'rack', { to: { extras: ['tall'] }, continuous: true }) }),
  /** l44 / l45a: the real board: a 32.5-disc tower, the bottom half's thin layer half gathered, the fair world's 90 % tower */
  realBoard: base({ t: 380, chapter: 'c07', line: 'l45a', world: 'empty', flips: null, players: board(() => 100, () => ({ present: 0 })),
    extras: [extra('real1', 'tower', { f: 4.6, r: 6.2 }, { coins: 325, lit: 1 }), extra('real50', 'layer', { f: 5.6, r: 6.2 }, { coins: 23, rect: { f0: 0.5, r0: 0.5, f1: 8.5, r1: 4.5 }, gather: 1 }),
      extra('board90', 'tower', { f: 3.4, r: 6.2 }, { coins: 900, present: 0.7 })],
    tags: [tag('l45a-90', 'the board: 90%', { extra: 'board90' }), tag('l45a-32', 'the real top 1%: 32.5%', { extra: 'real1' }, { size: 'm', kind: 'note' })],
    shot: shot('s-l45a', 'top', { extras: ['real1', 'board90'] }, 'hold') }),
  /** l52: the growth world's end with the average plane sweeping in */
  averagePlane: (() => { const g = WORLDS.growth().final; return base({ t: 470, chapter: 'c08', line: 'l52', world: 'growth', flips: 100, players: board((i) => g[i], () => ({ rings: 2 })),
    level: { coins: 673, sweep: 0.7, opacity: 1 }, tags: [tag('l52-avg', 'average 673', { f: 8.6, r: 4.5, y: 0.9 })], shot: shot('s-l52', 'low', { board: true }, 'pan') }); })(),
  /** l59: the leak world sorted into the rising row, red marker chips on the tower tops */
  sortedRow: (() => { const w = WORLDS.leak().final, order = [...w.keys()].sort((a, b) => w[a] - w[b]), slot = (i) => order.indexOf(i);
    return base({ t: 560, chapter: 'c09', line: 'l59', world: 'leak', flips: each(12500), layout: { kind: 'row', u: 1 },
      players: board((i) => w[i], (i) => ({ rings: 0, slot: slot(i), at: { f: 0.6 + slot(i) * 7.8 / 63, r: 4.5 } })),
      chips: order.slice(0, 20).map((p) => ({ id: 'real-' + p, at: { player: p }, count: 1, color: 'red', lit: 0, label: 'data' })),
      tags: [tag('l59-b', 'Boghosian, Tufts', { screen: [0.5, 0.12] }, { size: 's', kind: 'source' }), tag('l59-us', 'US wealth data 1989-2016', { screen: [0.5, 0.18] }, { size: 's', kind: 'source', opacity: 0.5 })],
      shot: shot('s-l59', 'row', { board: true }, 'pan') }); })(),
  /** l11d: the centre block, the Fool's cone hat still dropping, name tags */
  fourHats: base({ t: 60, chapter: 'c02', line: 'l11d', flips: 6, players: board(() => 100, (i) => ({ hat: i === F ? 0.6 : ROLE[i] ? 1 : 0, lit: i === F ? 1 : 0 })),
    tags: [['scholar', 'THE SCHOLAR'], ['worker', 'THE WORKER'], ['heir', 'THE HEIR'], ['fool', 'THE FOOL']].map(([k, s]) => tag('name-' + k, s, { player: CAST[k] }, { color: k, kind: 'name', pop: k === 'fool' ? 0.8 : 0 })),
    shot: shot('s-l11', 'block', { players: [CAST.heir, CAST.fool, CAST.scholar, CAST.worker] }, 'push') }),
  /** l64a: the Skeptic forward, its 10-disc tower risen beside it, mid-jump */
  skepticHop: base({ t: 640, chapter: 'c10', line: 'l64a', flips: fair.flips, players: board((i) => end[i]), king: { on: F, drop: 1, swap: 1, hat: 1 },
    skeptic: skeptic({ present: 1, forward: 1, at: { f: 4.5, r: -0.3 }, lit: 1, jump: { to: { extra: 'skTower' }, u: 0.5 }, hop: 0 }),
    extras: [extra('skTower', 'tower', { f: 5.3, r: -0.3 }, { coins: 100 })],
    tags: [tag('l31-sk', 'THE SKEPTIC', { skeptic: true }, { color: 'skeptic', kind: 'name', opacity: 0.4 })],
    shot: shot('s-l64a', 'skeptic', { skeptic: true, board: true }, 'push') }),
  /** l49: the coin close, labelled sides, the growth demo tower */
  coinClose: base({ t: 440, chapter: 'c08', line: 'l49', world: 'demo', flips: null, players: board(() => 100, () => ({ dim: 0.5 })),
    total: { label: 'TOTAL', value: 6400, text: 'TOTAL 6,400', opacity: 1 },
    flipCoins: [coin('main', { f: 4.5, r: 3 }, { phase: 'hover', lift: 0.55, angle: 0.35, yaw: 0.1, face: 'tails', glint: 0.3, labels: ['+50%', '-40%'] })],
    extras: [extra('demo', 'pawn', { f: 5.5, r: 3 }, { coins: 150 })],
    tags: [tag('l49-h', '+50%', { coin: 'main', side: 'heads' }, { color: 'good' }), tag('l49-t', '-40%', { coin: 'main', side: 'tails' }, { color: 'bad' })],
    shot: shot('s-l49', 'coin', { coins: ['main'], extras: ['demo'] }, 'hold') }),
  /** l42 / l43: talent sizes, the rain of lucky gold and unlucky red, a pawn hopping */
  talentRain: base({ t: 360, chapter: 'c07', line: 'l42', world: 'talent', flips: null, players: board((i) => 100 * 2 ** ((i * 7) % 5 - 2), (i) => ({ scale: [0.7, 0.85, 0.92, 0.96, 1, 1, 1, 1.04, 1.1, 1.25, 1.6][(i * 37) % 11], hop: i === 12 ? 0.4 : 0 })),
    rain: [{ id: 'r1', kind: 'gold', to: { player: 12 }, u: 0.7, used: true }, { id: 'r2', kind: 'red', to: { player: 40 }, u: 0.3, used: false }],
    tags: [tag('l43-rich', 'richest', { player: 12 }, { color: 'good', kind: 'note' })],
    shot: shot('s-l43', 'player', { players: [12] }, 'pan', { to: { players: [40] } }) }),
  /** l24: the chips rain onto the squares after the third extra ending (again world winner on its square) */
  markerChips: (() => { const k = AGAIN_KINGS[5], win = AGAIN.winners[k]; return base({ t: 215, chapter: 'c04', line: 'l24', world: 'again', flips: each(6000),
    players: board((i) => (i === win ? 5000 : i % 9 === 0 ? 120 : 0)), chips: Array.from({ length: 64 }, (_, s) => ({ id: 'mark-' + (s + 1), at: sqAt(s + 1), count: s < 40 ? 1 : s === 40 ? 0.5 : 0, color: 'red', lit: 0, label: 'won' })),
    tags: [tag('l24-300', '300 worlds', { screen: [0.5, 0.15] }, { size: 'l' })], shot: shot('s-l24c', 'top', { board: true }, 'hold') }); })(),
};
export default FIXTURES;
