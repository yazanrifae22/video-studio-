// Dev check: re-page an existing version's narration (its take alignment + timeline) with the current caption rules and
// print each page's lead vs the speech onset (regress.py metric). No TTS, no render.
// usage: npx tsx packages/quiz/src/dev-onsets.ts <production> v<n>
import fs from 'node:fs';
import path from 'node:path';
import { arabicForms, onsetLeads, pageWords, speechActivity, type Word } from './captions.ts';
import { loadSpec } from './spec.ts';

const [id, v] = process.argv.slice(2);
const { spec, dir } = loadSpec(id);
const vdir = path.join(dir, v);
const T = JSON.parse(fs.readFileSync(path.join(vdir, 'timeline.json'), 'utf8'));
const B = JSON.parse(fs.readFileSync(path.join(vdir, 'build.json'), 'utf8'));
const al = JSON.parse(fs.readFileSync(B.narration.take.replace(/\.wav$/, '.align.json'), 'utf8'));
const L = (al.result ?? al).lines as any[];
const nd = path.join(vdir, 'narration'), files = fs.readdirSync(nd).filter(f => /^narr_.*\.wav$/.test(f) && !/tempo/.test(f));
const words: Word[] = [], lines: { file: string; at: number }[] = [];
for (const [i, l] of L.entries()) {
  const tl = T.lines.find((x: any) => x.id === l.id); if (!tl) continue;
  const prevEnd = i > 0 ? L[i - 1].end : 0;
  const s0 = Math.max(prevEnd + 0.02, l.start - 0.06);
  l.words.forEach((w: any, k: number) => words.push({ w: spec.caption_digits !== 'keep' ? arabicForms(w.w) : w.w, t0: tl.at + w.s - s0, t1: tl.at + w.e - s0, line: l.id, ...(k === l.words.length - 1 ? { lineEnd: tl.at + l.end - s0 } : {}) }));
  lines.push({ file: path.join(nd, files.find(f => f.includes(`_${l.id}.`))!), at: tl.at });
}
const R = T;
const act = await speechActivity(lines, R.total);
const blockers = [...R.rounds.filter((r: any) => r.plan.cd != null).map((r: any) => r.T0 + r.plan.cd - 0.15), ...R.rounds.slice(1).map((r: any) => r.T0 - 0.1), ...R.rounds.filter((r: any) => r.plan.marks.endcard != null).map((r: any) => r.T0 + r.plan.marks.endcard - 0.15)];
for (const snap of [false, true]) {
  const pages = pageWords(words.map(w => ({ ...w })), 22, blockers, snap ? act.on : []);
  const leads = onsetLeads(pages.map(p => ({ t0: p.t0, text: p.words.map(w => w.w).join(' ') })), act.on);
  const bad = leads.filter(x => x.lead != null && Math.abs(x.lead) > 2 / 30 + 0.005);
  console.log(`${id} ${v} ${snap ? 'snapped' : 'unsnapped'}: ${pages.length} pages, ${bad.length} outside +-2 frames ${JSON.stringify(bad)}`);
  if (snap) console.log(leads.map(x => `${x.t0}${x.lead == null ? '(-)' : x.lead ? `(${x.lead})` : ''} ${x.text}`).join(' | '));
}
