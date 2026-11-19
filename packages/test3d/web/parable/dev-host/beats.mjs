// dev: beats of given types. node .../dev-host/beats.mjs objection,jump,hop,king
import fs from 'node:fs';
import { makeShow } from '../show.js';
const score = JSON.parse(fs.readFileSync('productions/expl-261115-u1h6/v2/score.json', 'utf8'));
const sb = JSON.parse(fs.readFileSync('docs/brands/test-3d/fair-game/storyboard.json', 'utf8'));
const show = makeShow(score, { storyboard: sb });
const want = new Set(process.argv[2].split(','));
for (const b of show.beats) if (want.has(b.type)) console.log(JSON.stringify(b).slice(0, 200));
