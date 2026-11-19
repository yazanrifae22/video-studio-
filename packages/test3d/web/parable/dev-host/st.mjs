import fs from 'node:fs';
import { makeShow } from 'file:///E:/clips-viral/packages/test3d/web/parable/show.js';
const score = JSON.parse(fs.readFileSync('E:/clips-viral/productions/expl-261115-u1h6/v2/score.json', 'utf8'));
const sb = JSON.parse(fs.readFileSync('E:/clips-viral/docs/brands/test-3d/fair-game/storyboard.json', 'utf8'));
const show = makeShow(score, { storyboard: sb });
for (const t of process.argv[2].split(',').map(Number)) {
  const s = show.state(t);
  console.log(t, s.line, s.shot.id, s.world, JSON.stringify({ extras: s.extras.map(e => [e.id, e.kind, e.at, +e.coins.toFixed?.(0), e.present, e.jump?.u]), coins: s.flipCoins.filter(c=>c.present>0).map(c => [c.id, c.at, c.phase, +c.lift.toFixed(2), c.labels]), sk: s.skeptic && [s.skeptic.present, s.skeptic.at, s.skeptic.coins, s.skeptic.forward, s.skeptic.jump?.u], king: s.king, tags: s.tags.map(g => [g.text, JSON.stringify(g.anchor)]) }));
}
if (process.argv[3]) for (const t of process.argv[2].split(',').map(Number)) { const s = show.state(t); const P = s.players.filter(p => p.present > 0.5); console.log(t, 'present', P.length, 'down', P.filter(p => p.down > 0.5).length, 'lit', JSON.stringify(s.players.filter(p => p.lit > 0.5).map(p => [p.id, p.at, Math.round(p.coins), p.down])), 'focus', JSON.stringify(s.focus)); }
