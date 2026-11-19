import { world, growthWorld, stats, N } from 'file:///E:/clips-viral/packages/test3d/web/parable/game.js';
const E = (each) => each * 32, fx = (x, d = 1) => (+x).toFixed(d), med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const S = 17, W = 59, H = 27, F = 46, C = [S, W, H, F];
const hats = (seed, flips = E(200)) => world({ seed, flips, edge: { [S]: 0.55 }, weight: { [W]: 2 }, startOf: { [H]: 1000 }, every: 1 << 20 });
// display world for the hats game
const hc = [];
for (let seed = 1; seed <= 300 && hc.length < 6; seed++) { const g = hats(seed), w = g.final, s = stats(w); if (s.richest === H && w[S] > 150 && s.order.indexOf(S) >= 6 && w[W] < 10 && w[F] > 10 && w[F] < 100) hc.push(`${seed}: H ${fx(w[H], 0)} (${fx(s.top1)}%) S ${fx(w[S], 0)} #${s.order.indexOf(S) + 1} W ${fx(w[W])} F ${fx(w[F])}`); }
console.log('HATS display candidates\n ' + hc.join('\n '));
// Monte Carlo
for (const [label, flips, R] of [['200 flips each', E(200), 10000], ['2,000 flips each', E(2000), 3000]]) {
  const win = [0, 0, 0, 0, 0], top6 = [0, 0, 0, 0], broke = [0, 0, 0, 0], ahead = [0, 0, 0, 0];
  for (let s = 0; s < R; s++) { const w = hats(100000 + s, flips).final, st = stats(w); const k = C.indexOf(st.richest); win[k < 0 ? 4 : k]++; C.forEach((p, c) => { if (st.order.indexOf(p) < 6) top6[c]++; if (w[p] < 10) broke[c]++; if (w[p] > (p === H ? 1000 : 100)) ahead[c]++; }); }
  const pc = (x) => fx(100 * x / R);
  console.log(`MC ${label} (${R} worlds) richest: Scholar ${pc(win[0])} Worker ${pc(win[1])} Heir ${pc(win[2])} Fool ${pc(win[3])} other60 ${pc(win[4])} | top6 S ${pc(top6[0])} W ${pc(top6[1])} H ${pc(top6[2])} F ${pc(top6[3])} | under 10 coins S ${pc(broke[0])} W ${pc(broke[1])} H ${pc(broke[2])} F ${pc(broke[3])} | ahead of own start S ${pc(ahead[0])} W ${pc(ahead[1])} H ${pc(ahead[2])} F ${pc(ahead[3])}`);
}
// fair-game check: 300 worlds to 6,000 each: distinct kings, range of top1
{ const kings = new Set(), t1 = []; for (let s = 1; s <= 300; s++) { const g = world({ seed: 7000 + s, flips: E(6000), every: 1 << 20 }), st = stats(g.final); kings.add(st.richest); t1.push(st.top1); } console.log(`FAIR 300 worlds at 6,000 each: top1 min ${fx(Math.min(...t1))} median ${fx(med(t1))} max ${fx(Math.max(...t1))}; distinct winning squares ${kings.size}`); }
// growth display world
const gc = [];
for (let seed = 1; seed <= 3000 && gc.length < 6; seed++) { const g = growthWorld({ seed }), s = stats(g.final), mult = s.total / 6400, m = med(Array.from(g.final)); if (s.ahead === 9 && mult > 4.3 && mult < 6.5 && s.top1 > 55 && s.top1 < 70) gc.push(`${seed}: ahead ${s.ahead} total x${fx(mult, 2)} top1 ${fx(s.top1)}% median player ${fx(m, 2)} richest ${fx(g.final[s.richest], 0)} under1 ${s.under1}`); }
console.log('GROWTH display candidates\n ' + gc.join('\n '));
// leak display world
for (const seed of [11, 12, 13, 14]) { const g = world({ seed, flips: E(12500), tax: 0.01, every: 1 << 20 }), s = stats(g.final); console.log(`LEAK seed ${seed}: top1 ${fx(s.top1)} top6 ${fx(s.top6)} bottom32 ${fx(s.bottom32)} min ${fx(Math.min(...g.final))} ahead ${s.ahead}`); }
