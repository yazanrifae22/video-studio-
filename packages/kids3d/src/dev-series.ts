// Preview the Sunny Hill opening/ending of a production from its draft (or vN) series scores: lint + stills + wall PNG.
// npx tsx packages/kids3d/src/dev-series.ts <productions/<id>/draft|vN> [opening|ending] [t1,t2,...]
import fs from 'node:fs';
import path from 'node:path';
import { open, stills } from './capture.ts';

const [vdir, only, ts] = process.argv.slice(2);
const sdir = path.resolve(vdir, 'series');
for (const part of (only ? [only] : ['opening', 'ending'])) {
  const sf = path.join(sdir, `${part}.score.json`), sc = JSON.parse(fs.readFileSync(sf, 'utf8'));
  const times = ts ? ts.split(',').map(Number) : Array.from({ length: 8 }, (_, i) => +((i + 0.5) * sc.duration / 8).toFixed(2));
  const s = await open(sdir, sf, { epUrl: '/kit/series/sunny-hill.js' });
  try {
    console.log(part, JSON.stringify(await s.page.evaluate('kids.lint(0.25)')));
    const out = await stills(s, times, path.join(sdir, `stills-${part}`), 480);
    console.log(out.length, 'stills', path.join(sdir, `stills-${part}`));
    if (part === 'ending') { const d = await s.page.evaluate('K.wallPng()') as string; fs.writeFileSync(path.join(sdir, 'wall.png'), Buffer.from(d.slice(d.indexOf(',') + 1), 'base64')); console.log('wall', JSON.stringify(await s.page.evaluate('K.wall'))); }
  } finally { await s.close(); }
}
