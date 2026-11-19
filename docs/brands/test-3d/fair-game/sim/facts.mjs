import * as G from 'file:///E:/clips-viral/packages/test3d/web/parable/game.js';
const fx = (x, d = 1) => +(+x).toFixed(d), C = G.CAST;
const sqName = (sq) => 'abcdefgh'[(sq - 1) % 8] + (Math.floor((sq - 1) / 8) + 1);
const out = { seats: Object.fromEntries(Object.entries(C).map(([k, p]) => [k, sqName(G.SEAT[p])])) };
const g = G.WORLDS.fair(); out.fair = {};
out.fair.first_flips = [1, 2, 3, 4, 5, 6].map((i) => { const f = g.flip(i); return { flip: i, a: sqName(G.SEAT[f.a]), b: sqName(G.SEAT[f.b]), winner: f.aWins ? 'a (heads)' : 'b (tails)', stake: fx(f.stake) }; });
for (const e of [20, 200, 600, 2000, 6000]) { const w = g.at(G.each(e)), s = G.stats(w); out.fair['each_' + e] = { top1: fx(s.top1), top6: fx(s.top6), ahead: s.ahead, belowHalf: s.belowHalf, under1: s.under1, standing: s.standing, richest: sqName(G.SEAT[s.richest]), cast: Object.fromEntries(Object.entries(C).map(([k, p]) => [k, `${fx(w[p])} coins, #${s.order.indexOf(p) + 1}`])) }; }
{ const w = G.WORLDS.hats().final, s = G.stats(w); out.hats_display = { cast: Object.fromEntries(Object.entries(C).map(([k, p]) => [k, `${fx(w[p])} coins, #${s.order.indexOf(p) + 1}`])), top1: fx(s.top1) }; }
{ const w = G.WORLDS.growth().final, s = G.stats(w); out.growth = { total: fx(s.total, 0), times: fx(s.total / 6400, 2), ahead: s.ahead, under1: s.under1, top1: fx(s.top1), richest: sqName(G.SEAT[s.richest]), richest_coins: fx(w[s.richest], 0), average: fx(s.total / 64, 0) }; }
{ const w = G.WORLDS.leak().final, s = G.stats(w); out.leak = { top1: fx(s.top1), top6: fx(s.top6), bottom32: fx(s.bottom32), poorest: fx(Math.min(...w)), ahead: s.ahead, total: fx(s.total, 0) }; }
out.again = [0, 1, 2, 3].map((k) => { const s = G.stats(G.WORLDS.again(k).final); return { k, king: sqName(G.SEAT[s.richest]), top1: fx(s.top1) }; });
out.towers = [100, 344, 782, 1441, 3502, 5788, 30719].map((c) => { const t = G.tower(c); return `${c} coins: ${fx(t.height * 100)} cm, ${t.columns.length} columns`; });
out.tally = G.TALLY;
console.log(JSON.stringify(out, null, 1));
