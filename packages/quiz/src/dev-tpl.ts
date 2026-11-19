// Dev harness: render snapshot frames for template test rounds without a production record.
// usage: tsx dev-tpl.ts <rounds.json>   rounds.json = { "assetsDir": "<production dir with the art>", "rounds": [Round...] }
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { QuizSpec, Script } from './spec.ts';
import { HF, NPX_CLI, resolve, WORK, writeRound } from './compose.ts';
const run = promisify(execFile);
const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lines: any[] = [];
const rounds = cfg.rounds.map((r: any) => {
  const L = (k: string, t: string) => { lines.push({ id: `${r.id}-${k}`, section: r.id, start_hint: 0, end_hint: 1.6, narration_ar: 'نص', onscreen_ar: t, caption_ar: t }); return `${r.id}-${k}`; };
  return { ...r, set_line: r.set ? L('set', r.set) : undefined, q_line: L('q', r.q ?? 'السؤال؟'), a_line: L('a', r.a ?? 'الجواب!') };
});
const spec: QuizSpec = { production_id: 'dev', brand: 'quiz-ar', width: 1080, height: 1920, fps: 30, channel_name: 'شو شايف؟', script: '', narration: { voice: 'x', dialect: 'x' }, music: { kind: 'synth_bed' }, sfx_dir: '', rounds };
const script: Script = { production_id: 'dev', channel_name: 'x', lines, tts: { voice_suggestions: [], style_notes: '' } } as any;
const R = resolve(spec, script, Object.fromEntries(lines.map(l => [l.id, 1.4])));
const only = process.argv[3];
for (const [i, r] of R.rounds.entries()) {
  if (only && r.id !== only) continue;
  const p = r.plan;
  const pd = writeRound(spec, cfg.assetsDir, rounds[i], p, r.T0, path.join(WORK, 'dev-tpl', r.id));
  const at = [0.25, (p.marks.swap0 ?? p.marks.blink ?? 1.0) + 0.4, p.cd! + 0.5, p.reveal! + 0.15, p.reveal! + 1.3, p.duration - 0.35].filter(x => x < p.duration).map(x => x.toFixed(2)).join(',');
  const sd = path.join(pd, '.hyperframes', 'artifacts', 'snapshots'); fs.rmSync(sd, { recursive: true, force: true });
  await run(process.execPath, [NPX_CLI, '-y', HF, 'snapshot', pd, '--at', at], { cwd: pd, maxBuffer: 1 << 26 });
  const sub = fs.readdirSync(sd)[0];
  console.log(r.id, r.type, p.duration, path.join(sd, sub, 'contact-sheet.jpg'));
}
