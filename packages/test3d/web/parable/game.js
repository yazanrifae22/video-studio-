// "A fair game still ends with one winner" (parable long-form, 2026-11-15): the coin game that the picture plays out and the script quotes.
// Deterministic (mulberry32): the same numbers in node (seed scan, facts) and in the browser (the film). No Three.js in here.
// 64 players, 100 coins each. One flip = two random players, stake = FRACTION of the poorer player's stack, a coin decides who takes it.

export const N = 64, START = 100, FRACTION = 0.2;
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * One world, played to the end and kept: `at(i)` = every player's coins after i flips (i may be fractional: the flip in progress is
 * blended in, so stacks move smoothly), `flip(i)` = {a, b, aWins, stake} of flip number i (1-based).
 * opts: seed, flips, edge {player: chance to win a flip}, weight {player: how often picked}, startOf {player: coins},
 *       tax (fraction of every stack paid into the middle and shared equally, once per round = N/2 flips)
 */
export function world({ seed = 1, flips = 1000, edge = {}, weight = {}, startOf = {}, tax = 0, every = 128 } = {}) {
  const r = rng(seed), w = new Float64Array(N).fill(START); for (const k in startOf) w[k] = startOf[k];
  const wt = new Float64Array(N).fill(1); for (const k in weight) wt[k] = weight[k];
  let wsum = 0; for (let i = 0; i < N; i++) wsum += wt[i];
  const pick = () => { let u = r() * wsum; for (let i = 0; i < N; i++) { u -= wt[i]; if (u < 0) return i; } return N - 1; };
  const A = new Uint8Array(flips + 1), B = new Uint8Array(flips + 1), WIN = new Uint8Array(flips + 1), cps = [Float64Array.from(w)];
  const step = (w, i) => {
    const a = A[i], b = B[i], stake = FRACTION * Math.min(w[a], w[b]);
    if (WIN[i]) { w[a] += stake; w[b] -= stake; } else { w[a] -= stake; w[b] += stake; }
    if (tax && i % (N / 2) === 0) { let pot = 0; for (let k = 0; k < N; k++) { const c = w[k] * tax; w[k] -= c; pot += c; } for (let k = 0; k < N; k++) w[k] += pot / N; }
    return stake;
  };
  for (let i = 1; i <= flips; i++) {
    const a = pick(); let b = pick(); while (b === a) b = pick();
    let pa = 0.5; if (edge[a] != null && edge[b] == null) pa = edge[a]; else if (edge[b] != null && edge[a] == null) pa = 1 - edge[b];
    A[i] = a; B[i] = b; WIN[i] = r() < pa ? 1 : 0; step(w, i);
    if (i % every === 0) cps.push(Float64Array.from(w));
  }
  const whole = (i) => { i = Math.max(0, Math.min(flips, Math.floor(i))); const c = Math.floor(i / every), v = Float64Array.from(cps[c]); for (let k = c * every + 1; k <= i; k++) step(v, k); return v; };
  const at = (x) => { x = Math.max(0, Math.min(flips, x)); const i = Math.floor(x), f = x - i, v = whole(i); if (f > 0 && i < flips) { const n = Float64Array.from(v); step(n, i + 1); for (let k = 0; k < N; k++) v[k] += (n[k] - v[k]) * f; } return v; };
  const flip = (i) => { const v = whole(i - 1), a = A[i], b = B[i]; return { a, b, aWins: !!WIN[i], stake: FRACTION * Math.min(v[a], v[b]), before: [v[a], v[b]] }; };
  /** replay flips from..to in order on a copy of the start state: cb(i, w, a, b, stake) after flip i (tax applied). Added 2026-11-15 for show.js. */
  const scan = (cb, from = 1, to = flips) => { const v = whole(from - 1); for (let i = from; i <= to; i++) { const s = step(v, i); cb(i, v, A[i], B[i], s); } };
  return { flips, at, flip, scan, every, final: whole(flips) };
}

/** the growth coin (no exchange): every round each stack is multiplied by 1.5 (heads) or 0.6 (tails). at(round) may be fractional. */
export function growthWorld({ seed = 1, rounds = 100 } = {}) {
  const r = rng(seed), hist = [new Float64Array(N).fill(START)], heads = [null];
  for (let i = 1; i <= rounds; i++) { const p = hist[i - 1], v = new Float64Array(N), h = new Uint8Array(N); for (let k = 0; k < N; k++) { h[k] = r() < 0.5 ? 1 : 0; v[k] = p[k] * (h[k] ? 1.5 : 0.6); } hist.push(v); heads.push(h); }
  const at = (x) => { x = Math.max(0, Math.min(rounds, x)); const i = Math.floor(x), f = x - i, v = Float64Array.from(hist[i]); if (f > 0) for (let k = 0; k < N; k++) v[k] += (hist[i + 1][k] - v[k]) * f; return v; };
  return { rounds, at, heads: (i) => heads[i], final: hist[rounds] };
}

export function stats(w, start = START) {
  const s = Array.from(w).sort((x, y) => y - x), tot = s.reduce((p, c) => p + c, 0), sum = (a) => a.reduce((p, c) => p + c, 0);
  return { total: tot, top1: 100 * s[0] / tot, top6: 100 * sum(s.slice(0, 6)) / tot, bottom32: 100 * sum(s.slice(32)) / tot, ahead: s.filter((x) => x > start).length, belowHalf: s.filter((x) => x < start / 2).length, under1: s.filter((x) => x < 1).length, standing: s.filter((x) => x >= 1).length, richest: Array.from(w).indexOf(s[0]), order: Array.from(w.keys()).sort((x, y) => w[y] - w[x]) };
}

/* ------------------------------------------------------------------ the cast and the worlds this film shows (seeds picked 2026-11-15 by scanning; see docs/brands/test-3d/fair-game/) */
/** player ids of the four hats. In the FAIR world the hats change nothing; in the HATS world they do. */
export const CAST = { scholar: 17, worker: 59, heir: 27, fool: 46 };
export const COLORS = { scholar: '#3f7de0', worker: '#f08a1c', heir: '#e8b63a', fool: '#34b36a', skeptic: '#1b1b1f' };
export const each = (flipsEach) => flipsEach * N / 2;          // "20 flips each" = 640 flips
/** SEAT[player] = square 1..64 (1 = a1, row by row; row 1 nearest the camera). The four hats sit on the centre block: Heir d4, Fool e4, Scholar d5, Worker e5. */
export const SEAT = (() => { const fixed = { [CAST.heir]: 28, [CAST.fool]: 29, [CAST.scholar]: 36, [CAST.worker]: 37 }, used = new Set(Object.values(fixed)), seat = new Array(N); let sq = 1; for (let p = 0; p < N; p++) { if (fixed[p]) { seat[p] = fixed[p]; continue; } while (used.has(sq)) sq++; seat[p] = sq++; } return seat; })();
export const PLAYER_AT = (() => { const a = new Array(N + 1).fill(-1); SEAT.forEach((sq, p) => { a[sq] = p; }); return a; })();

export const WORLDS = {
  fair:   () => world({ seed: 329, flips: each(6000) }),                                                                                             // the main game: Fool #56 at 20 each, king at the end (90.4 %); Scholar #1 at 20 each, broke by 150
  again:  (k) => world({ seed: 7001 + k, flips: each(6000), every: 4096 }),                                                                         // "run it again": other shuffles, other kings (k = 0, 1, 2, ...)
  hats:   () => world({ seed: 278, flips: each(200), edge: { [CAST.scholar]: 0.55 }, weight: { [CAST.worker]: 2 }, startOf: { [CAST.heir]: 1000 } }), // one of the 10,000 worlds: Heir wins, Scholar ahead but 10th, Worker broke
  growth: () => growthWorld({ seed: 56, rounds: 100 }),                                                                                              // x1.5 / x0.6 coin: board x6.7, 9 ahead, one stack 71 %
  leak:   () => world({ seed: 13, flips: each(12500), tax: 0.01 }),                                                                                  // 1 % of every stack to the middle each round: no king
};
/** 10,000 worlds of the hats game, 200 flips each (and 3,000 worlds at 2,000 each), measured 2026-11-15: worlds out of 100 in which each is the richest / ends under 10 coins */
export const TALLY = { richest: { heir: 47, scholar: 6, worker: 2, fool: 1, nobody: 45 }, broke: { worker: 70, fool: 46, scholar: 10, heir: 0 }, tenTimesLonger: { scholar: 28, heir: 11 } };
/** the same measurement unrounded (percent; storyboard claims): the Fool's 0.8 is what the voice calls "less than one" */
export const TALLY_PCT = { richest: { heir: 47.0, scholar: 5.6, worker: 1.9, fool: 0.8, nobody: 44.7 }, broke: { worker: 69.6, fool: 46.4 }, tenTimesLonger: { scholar: 28.3, heir: 11.2 } };
/**
 * "We ran three hundred worlds": WORLDS.again(k) for k = 0..299 (seeds 7001..7300), measured 2026-11-15 by a full replay to 6,000 flips each.
 * winners[k] = player id of the richest at the end, top1[k] = that player's share in %. 64 distinct winners; share 33.5-99 %, median 85.4 %.
 * AGAIN_KINGS = the again worlds the film shows (winner over 85 %, each on a different square, none on the Fool's e4).
 */
export const AGAIN = {
  winners: [33,9,6,38,21,23,46,40,38,38,30,45,22,28,33,21,34,60,59,23,20,22,6,9,3,54,48,37,6,9,2,8,0,6,49,45,38,54,39,38,17,59,14,41,23,4,60,4,42,28,0,32,32,22,61,5,31,39,44,24,29,11,3,63,0,46,52,13,15,58,54,63,41,31,63,28,61,41,12,11,14,32,63,5,25,42,0,47,5,62,0,56,60,33,16,53,13,4,59,54,14,58,36,6,56,15,54,54,50,38,42,22,23,63,8,61,2,29,41,7,33,49,47,19,45,47,6,10,18,54,30,37,2,54,25,51,60,9,11,54,56,46,37,7,7,49,23,39,14,20,42,18,18,13,5,0,15,10,42,27,40,18,61,50,55,40,37,55,5,43,35,4,42,31,41,18,44,24,55,2,28,19,4,46,18,63,6,24,14,37,57,9,5,63,18,43,46,63,46,41,5,41,5,2,53,33,24,29,61,42,50,35,63,57,18,7,22,54,18,42,39,28,50,4,62,31,50,54,52,38,27,42,1,53,28,62,55,11,45,31,11,40,55,2,37,0,55,61,26,50,48,63,63,20,44,13,2,36,63,9,2,17,29,49,6,26,34,56,6,14,55,50,6,24,59,9,56,23,55,31,40,10,29,4,6,16,51,12,22,22,23,5,11,30,23,38,31,43,41,27],
  top1: [57.8,61.5,87.9,88.7,85.2,57.1,49.9,65.1,64.1,73.7,84.8,82.5,60.5,66.3,79.3,56.1,82,94.5,48.8,94.1,99,74.6,71.5,95.7,98.4,90.6,68.6,90.1,97.1,75,98.8,95.4,95.6,89.1,85,40.8,77.5,74.7,92.2,97.8,54.2,89.9,96.2,98,89.8,77.8,92.5,73.2,91.4,83.3,84.3,97,92.9,52.1,95.4,50.4,86.6,76.1,50.2,88,61.1,92.7,85.3,77.6,70.9,95,93.5,83,89.8,73.4,94.7,86.5,75.8,87.3,66.9,65.9,77.4,84.3,59.3,59.9,98.4,93.1,96.6,59.6,89,88.4,95,88.5,94.8,98.4,50,53.2,78.3,67.8,71.4,81.9,92.5,89,95.7,75.2,93.2,89,60.8,84.7,96.8,78.9,86.2,91,82.9,82.1,78.1,88.8,78.3,77.9,85.5,96.4,76.5,97.4,74.5,94.4,64.7,88.6,98.1,94.4,47.7,68.7,96.2,94.3,94.7,84.3,90.1,85.3,93.6,94,83.1,97.1,98.4,77.1,64.3,95.4,90.8,62.8,85.6,92.6,90.2,92.9,92.8,59.5,96.2,96,85.8,98.9,91.9,89.5,88.6,80.5,88,92.9,75.9,92.5,72.2,91.8,96.9,89.3,87,86.5,94.3,70.2,86,90.6,90.9,62.6,79.9,59.7,83.1,69.3,83.6,85.9,76,80.9,79.9,94.5,70.2,84.5,94.2,85.4,64.2,93.7,73.7,92.7,64.1,96.5,60.3,95.2,94.9,57.2,72,56.1,56.9,96.8,95.5,84.3,90.8,83.1,97.7,73.2,81.4,84.3,85.4,76,79.4,98.3,93.4,87.3,83.9,74.6,94.1,33.5,82.8,96,83.6,95.6,95.6,82.8,87.4,81.9,92.2,80,90.3,95,87.5,98.9,73.2,84.8,67.7,56.8,84.9,84.2,96,95.8,89.3,91.7,84.7,85.2,90.2,88.6,81.2,81.7,98.2,94.7,78.6,76.1,78.1,74.8,67.7,98.4,87.8,66.2,89.3,91.5,93.1,63.7,75.2,76.5,86.7,74.5,74,95.1,78,73.2,87.4,83.9,94.7,85.4,73.6,95.2,87.7,86.6,87.1,66.5,94.5,82.8,84.2,93.6,90.3,92.1,54.1,80.7,77.5,86.1,87.3,69.3,93.9,67.6,83.3,91.7,68.5,53.4,80.2,72.6],
};
export const AGAIN_KINGS = [2, 3, 4, 17, 19, 20];   // l04 shows the first three, l24 the last three (winners: players 6, 38, 21, 60, 23, 20)

/* ------------------------------------------------------------------ coins -> a tower the pawn stands on */
export const DISC = 10;            // coins per disc: 100 coins = a pedestal of 10 discs
export const COIN = { radius: 0.0135, thick: 0.002, pitch: 0.028 };
const RING = [[0, 0]]; for (let k = 0; k < 6; k++) RING.push([Math.cos(k * Math.PI / 3 + 0.26), Math.sin(k * Math.PI / 3 + 0.26)]); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.1, r = k % 2 ? 1.732 : 2; RING.push([r * Math.cos(a), r * Math.sin(a)]); }
const OFFSET = (i) => (i === 0 ? 0 : i < 7 ? 30 : 60);
/**
 * tower(coins, {rings}) -> {height, columns: [{dx, dz, discs}]} : the centre column carries the pawn; once it is 30 discs tall six more columns
 * grow around it (and, with rings: 2, twelve more after 60). discs is fractional (draw the whole discs and one thinner one on top). Continuous in coins.
 */
export function tower(coins, { rings = 1 } = {}) {
  const D = Math.max(0, coins) / DISC, n = rings >= 2 ? 19 : rings >= 1 ? 7 : 1;
  let L = D; for (const m of [7, 19]) { if (m > n) break; const off = m === 7 ? 30 : 60, cand = (D + [...Array(m).keys()].reduce((s, i) => s + OFFSET(i), 0)) / m; if (cand > off) L = cand; }
  const columns = []; for (let i = 0; i < n; i++) { const h = L - OFFSET(i); if (h > 0) columns.push({ dx: RING[i][0] * COIN.pitch, dz: RING[i][1] * COIN.pitch, discs: h }); }
  return { height: L * COIN.thick, columns };
}
