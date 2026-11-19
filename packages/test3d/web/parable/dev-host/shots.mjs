// dev: the shot list with lines. node packages/test3d/web/parable/dev-host/shots.mjs [lineIds comma] (default all)
import fs from 'node:fs';
import { makeShow } from '../show.js';
const score = JSON.parse(fs.readFileSync('productions/expl-261115-u1h6/v2/score.json', 'utf8'));
const sb = JSON.parse(fs.readFileSync('docs/brands/test-3d/fair-game/storyboard.json', 'utf8'));
const show = makeShow(score, { storyboard: sb });
const want = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
for (const sh of show.shots) {
  const st = show.state((sh.t0 + sh.t1) / 2);
  const ls = new Set(); for (let t = sh.t0; t < sh.t1; t += 0.25) ls.add(show.state(t).line);
  if (want && ![...ls].some((l) => want.has(l))) continue;
  console.log(`${sh.id} ${sh.kind}/${sh.move}${sh.continuous ? ' cont' : ''} ${sh.t0.toFixed(2)}-${sh.t1.toFixed(2)} [${[...ls].join(',')}] sub=${JSON.stringify(sh.subject)}${sh.to ? ' to=' + JSON.stringify(sh.to) : ''} focus=${JSON.stringify(st.focus)}`);
}
