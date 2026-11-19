// Compatibility check (2026-10-28, timings.cd / loop): for every quiz production, re-resolve the latest version's
// timeline from its own measured line durations and compare it with the timeline.json that build wrote.
// Productions that do not opt in (no timings.cd, no loop) must match exactly (unless quiz.json/script.json changed
// after that build, which is reported as "stale").
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../packages/shared/src/paths.ts';
import { loadSpec } from '../packages/quiz/src/spec.ts';
import { resolve } from '../packages/quiz/src/compose.ts';

const strip = (R: any) => JSON.parse(JSON.stringify(R));
let same = 0, diff = 0, stale = 0, opt = 0;
for (const id of fs.readdirSync(P.productions).filter(x => x.startsWith('quiz-')).sort()) {
  const dir = path.join(P.productions, id);
  if (!fs.existsSync(path.join(dir, 'quiz.json'))) continue;
  const vs = fs.readdirSync(dir).filter(x => /^v\d+$/.test(x) && fs.existsSync(path.join(dir, x, 'timeline.json'))).sort((a, b) => +b.slice(1) - +a.slice(1));
  if (!vs.length) continue;
  const tlf = path.join(dir, vs[0], 'timeline.json');
  let spec, script;
  try { ({ spec, script } = loadSpec(id)); } catch (e: any) { console.log(`${id} ${vs[0]}: spec error ${e.message}`); diff++; continue; }
  const optIn = !!(spec.loop || spec.timings?.cd || spec.rounds.some(r => r.timings?.cd != null));
  const old = JSON.parse(fs.readFileSync(tlf, 'utf8'));
  const dur = Object.fromEntries(old.lines.map((l: any) => [l.id, l.dur]));
  let now: any;
  try { now = strip(resolve(spec, script, dur)); } catch (e: any) { console.log(`${id} ${vs[0]}: resolve error ${e.message}`); diff++; continue; }
  const eq = JSON.stringify(now) === JSON.stringify(old);
  const newer = Math.max(fs.statSync(path.join(dir, 'quiz.json')).mtimeMs, fs.statSync(path.join(dir, spec.script)).mtimeMs) > fs.statSync(tlf).mtimeMs;
  if (optIn) { opt++; console.log(`${id} ${vs[0]}: opted in (cd ${spec.timings?.cd ?? '-'}, loop ${spec.loop ?? '-'}) total ${old.total} -> ${now.total}`); }
  else if (eq) same++;
  else if (newer) { stale++; console.log(`${id} ${vs[0]}: differs, but quiz.json/script.json is newer than the build (stale)`); }
  else { diff++; console.log(`${id} ${vs[0]}: DIFFERS total ${old.total} -> ${now.total}`); }
}
console.log(JSON.stringify({ identical: same, differs: diff, stale, opted_in: opt }));
