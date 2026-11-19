// Checks auto-crop detection on a real source and the generated tone bed's loudness.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { db, J } from '../packages/shared/src/db.ts';
import { detectCrop, toneBed } from '../packages/occ/src/build.ts';
const cl = JSON.parse(fs.readFileSync('productions/rank-261021-cwik/cutlist.json', 'utf8'));
for (const s of cl.segments.slice(0, 12)) {
  const r = db().prepare(`SELECT analysis FROM sources WHERE asset_id=?`).get(s.asset_id) as any; const a = J.parse<any>(r.analysis, {});
  console.log(s.asset_id, `${a.width}x${a.height}`, s.src_in, '→', JSON.stringify(await detectCrop(a.mezzanine, s.src_in, s.src_out, a.width, a.height)));
}
const f = await toneBed(10, 'data/cache/test/bed10.wav');
console.log(execFileSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).slice(-200) || 'ok');
