import { world, growthWorld, stats, N } from 'file:///E:/clips-viral/packages/test3d/web/parable/game.js';
const E = (each) => each * 32, fx = (x, d = 1) => (+x).toFixed(d);
// fair world: first flip heads (a wins); close to the typical numbers; an early leader who is broke by 600 each; winner not an early leader
const out = [];
for (let seed = 1; seed <= 400; seed++) {
  const g = world({ seed, flips: E(6000) });
  if (!g.flip(1).aWins) continue;
  const s20 = stats(g.at(E(20))), s200 = stats(g.at(E(200))), s600 = stats(g.at(E(600))), s2000 = stats(g.at(E(2000))), s6000 = stats(g.final);
  const king = s6000.richest;
  if (s2000.richest !== king) continue;                         // the leader at 2,000 each is the final king (clean story)
  if (s20.order.indexOf(king) < 10) continue;                   // the king was nobody special early
  if (!(s200.top6 > 52 && s600.top6 > 80 && s2000.top1 > 50 && s6000.top1 > 84 && s6000.top1 < 93 && s6000.standing >= 2 && s6000.standing <= 3)) continue;
  const w600 = g.at(E(600)), early = s20.order.slice(0, 3).filter((p) => w600[p] < 1);
  if (!early.length) continue;
  out.push({ seed, king, kingRank20: s20.order.indexOf(king) + 1, early: early.map((p) => `${p}(#${s20.order.indexOf(p) + 1})`).join(','), s20: `${s20.ahead} ahead ${s20.belowHalf} belowHalf`, s200: `top6 ${fx(s200.top6)} under1 ${s200.under1}`, s600: `top6 ${fx(s600.top6)} under1 ${s600.under1}`, s2000: `top1 ${fx(s2000.top1)}`, s6000: `top1 ${fx(s6000.top1)} standing ${s6000.standing}` });
}
console.log('FAIR candidates'); for (const o of out.slice(0, 14)) console.log(JSON.stringify(o));
