// dev: SFX cues of the production film (names, density, loudest)
import path from 'node:path';
import { open } from '../../../src/capture.ts';
const ep = path.resolve('productions/expl-261115-c2fy');
const s = await open(ep, path.join(ep, 'draft/score.json'), { width: 640, height: 360, sub: 1 });
try {
  const c = s.info.cues, h: Record<string, number> = {};
  for (const x of c) h[x.name] = (h[x.name] ?? 0) + 1;
  console.log('cues', c.length, JSON.stringify(h));
  let mx = 0, at = 0; for (let i = 0; i < c.length; i++) { let n = 0; for (let j = i; j < c.length && c[j].t < c[i].t + 1; j++) n++; if (n > mx) { mx = n; at = c[i].t; } }
  console.log('max cues in 1 s', mx, 'at', at, 'loudest', Math.max(...c.map((x) => x.db)));
} finally { await s.close(); }
