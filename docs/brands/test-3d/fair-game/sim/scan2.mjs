import { world, growthWorld, stats, N } from 'file:///E:/clips-viral/packages/test3d/web/parable/game.js';
const E = (each) => each * 32, fx = (x, d = 1) => (+x).toFixed(d), med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const g = world({ seed: 329, flips: E(6000) });
console.log('first 6 flips:', [1, 2, 3, 4, 5, 6].map((i) => { const f = g.flip(i); return `${f.a}v${f.b} ${f.aWins ? 'a' : 'b'} wins ${fx(f.stake)}`; }).join(' | '));
const marks = [20, 200, 600, 2000, 6000];
const brokeAt = (p) => { for (let e = 10; e <= 6000; e += 10) if (g.at(E(e))[p] < 1) return e; return null; };
for (const m of marks) { const w = g.at(E(m)), s = stats(w); console.log(`${m} each: top1 ${fx(s.top1)} top6 ${fx(s.top6)} ahead ${s.ahead} belowHalf ${s.belowHalf} under1 ${s.under1} standing ${s.standing} | top5: ${s.order.slice(0, 5).map((p) => `${p}:${fx(w[p], 0)}`).join(' ')}`); }
const fin = stats(g.final); console.log('standing at end:', fin.order.slice(0, 4).map((p) => `${p}:${fx(g.final[p])}`).join(' '));
for (const p of [46, 17]) console.log(`player ${p}: ` + marks.map((m) => `${m}: ${fx(g.at(E(m))[p])} (#${stats(g.at(E(m))).order.indexOf(p) + 1})`).join(' | '), 'brokeAt', brokeAt(p));
// worker candidate: broke between 100 and 200 each; heir candidate: #2 at 2000 each
const cands = []; for (let p = 0; p < N; p++) { const b = brokeAt(p); if (b && b >= 80 && b <= 200) cands.push(`${p}@${b}`); } console.log('broke 80-200 each:', cands.join(' '));
const s2000 = stats(g.at(E(2000))); console.log('#2..#4 at 2000:', s2000.order.slice(1, 4).map((p) => `${p} (broke ${brokeAt(p)})`).join(' '));
// which flips do 46 and 17 play first
for (const p of [46, 17]) { const fl = []; for (let i = 1; i <= 400 && fl.length < 4; i++) { const f = g.flip(i); if (f.a === p || f.b === p) fl.push(`#${i} ${(f.a === p) === f.aWins ? 'W' : 'L'}`); } console.log('player', p, 'first flips', fl.join(' ')); }

// HATS: Monte Carlo 10,000 worlds, 200 flips each
const S = 17, F = 46;
globalThis.hats = (W, H, seed, flips = E(200)) => world({ seed, flips, edge: { [S]: 0.55 }, weight: { [W]: 2 }, startOf: { [H]: 1000 }, every: 100000 });
