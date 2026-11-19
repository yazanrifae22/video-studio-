import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { hintDurations, loadSpec } from './spec.ts';
import { HF, NPX_CLI, resolve, WORK, writeRound } from './compose.ts';
import { ART_NOTES } from './templates.ts';

const run = promisify(execFile);

/**
 * Dry run for showrunners: validates quiz.json against script.json and the templates (e.g. a shell game whose swaps
 * don't end on the answer is refused), prints the resolved timeline from the script's timing hints, and optionally
 * writes snapshot PNGs at each round's question / countdown / reveal / explanation (no TTS, no video render).
 */
export async function planQuiz(productionId: string, opts: { snapshots?: boolean } = {}) {
  const { spec, script, dir } = loadSpec(productionId);
  const R = resolve(spec, script, hintDurations(script));
  const out: any = { production_id: productionId, total_s: +R.total.toFixed(2), note: 'timing from script start/end hints; the build re-times every round from the measured narration', rounds: [] };
  for (const [i, r] of R.rounds.entries()) {
    const p = r.plan;
    for (const h of p.heads) {  // QA (batch 5–9): headlines over ~24 letters wrap to two lines at the 84 px headline size
      const n = [...h.text.replace(/[ً-ْٰـ]/g, '')].length;
      const max = h.kind === 'a' ? 32 : 24;  // answer pills may take two lines; question/hook headlines may not
      if (n > max) throw new Error(`round ${r.id}: on-screen ${h.kind === 'a' ? 'answer' : 'headline'} «${h.text}» has ${n} letters; keep onscreen_ar ≤ ${max} (one line; the narration may say more)`);
    }
    const row: any = { id: r.id, type: r.type, start: +r.T0.toFixed(2), duration: p.duration, countdown: p.cd ?? null, reveal: p.reveal ?? null, explain: p.explain ?? null, lines: p.lines.map(l => `${l.id}@${l.at}`) };
    ART_NOTES.length = 0;
    const pd = writeRound(spec, dir, spec.rounds[i], p, r.T0, path.join(WORK, productionId, 'plan', r.id)); // also runs puzzle() → template validation
    if (ART_NOTES.length) row.notes = [...ART_NOTES];
    if (opts.snapshots) {
      const at = [0.3, p.cd != null ? p.cd + 0.5 : null, p.reveal != null ? p.reveal + 0.5 : null, p.explain != null ? p.explain + 0.6 : null, p.duration - 0.4]
        .filter((x): x is number => x != null && x < p.duration).map(x => x.toFixed(2)).join(',');
      const snapDir = path.join(pd, '.hyperframes', 'artifacts', 'snapshots');
      fs.rmSync(snapDir, { recursive: true, force: true });
      await run(process.execPath, [NPX_CLI, '-y', HF, 'snapshot', pd, '--at', at], { cwd: pd, maxBuffer: 1 << 26, timeout: 600_000 });
      const sub = fs.existsSync(snapDir) ? fs.readdirSync(snapDir).map(d => path.join(snapDir, d)) : [];
      row.snapshots = sub.flatMap(d => fs.readdirSync(d).map(f => path.join(d, f)));
    }
    out.rounds.push(row);
  }
  if (R.total > 45) out.warning = `total ${R.total.toFixed(1)} s exceeds the 45 s ceiling`;
  return out;
}
