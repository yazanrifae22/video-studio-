import { growthWorld, stats } from 'file:///E:/clips-viral/packages/test3d/web/parable/game.js';
const fx = (x, d = 1) => (+x).toFixed(d), med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
let n = 0;
for (let seed = 1; seed <= 6000 && n < 8; seed++) { const g = growthWorld({ seed }), s = stats(g.final), mult = s.total / 6400, m = med(Array.from(g.final)); if (s.ahead >= 8 && s.ahead <= 10 && mult > 4 && mult < 7 && s.top1 > 50 && s.top1 < 72) { n++; console.log(`${seed}: ahead ${s.ahead} total x${fx(mult, 2)} top1 ${fx(s.top1)}% median player ${fx(m, 2)} richest ${fx(g.final[s.richest], 0)} (player ${s.richest}) under1 ${s.under1} top6 ${fx(s.top6)}`); } }
