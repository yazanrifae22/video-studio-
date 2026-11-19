/**
 * Warm the TTS cache for a lab production and ASR-check the raw takes before any picture build:
 * `npx tsx packages/quizlab/src/warm.ts <id> [--retake <lineId>=<salt>]`  ->  productions/<id>/draft/narration-check.json
 * Same text + voice + style keys as build.ts, so the later build costs no quota.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { P } from '../../shared/src/paths.ts';
import { synthesize } from '../../voice/src/gemini-tts.ts';

const run = promisify(execFile);
const id = process.argv[2];
const dir = path.join(P.root, 'productions', id);
const lab = JSON.parse(fs.readFileSync(path.join(dir, 'lab.json'), 'utf8'));
const out = path.join(dir, 'draft');
fs.mkdirSync(out, { recursive: true });
// --retake <lineId>=<salt>: persist the salt as `retake` on that line in lab.json, so the later build reuses the same new take.
const rt = process.argv.indexOf('--retake');
if (rt > 0) {
  const [rid, ...rs] = String(process.argv[rt + 1] ?? '').split('=');
  const salt = rs.join('=');
  const tl = lab.lines.find((x: any) => x.id === rid);
  if (!tl || !salt) throw new Error(`--retake needs <lineId>=<salt> with an existing line id (got "${process.argv[rt + 1]}")`);
  tl.retake = /^\d+$/.test(salt) ? +salt : salt;
  fs.writeFileSync(path.join(dir, 'lab.json'), JSON.stringify(lab, null, 2) + '\n', 'utf8');
  console.log(`retake ${rid}=${salt} saved in lab.json`);
}
const lines: any[] = [];
for (const l of lab.lines) {
  const voice = l.voice ?? lab.voice.name, style = l.style ?? lab.voice.style, tempo = l.tempo ?? lab.voice.tempo ?? 1;
  const r = await synthesize(l.text, voice, style, { productionId: id, retake: l.retake });
  const dur = parseFloat(String((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', r.file])).stdout));
  lines.push({ id: l.id, text: l.text, file: r.file, voice, model: r.model, cached: r.cached, raw_s: +dur.toFixed(2), est_s: +(dur / tempo).toFixed(2) });
  console.log(`${l.id} ${voice} ${r.cached ? 'cached' : r.model} raw ${dur.toFixed(2)} s`);
}
const lj = path.join(out, '_lines.json'), oj = path.join(out, 'narration-check.json');
fs.writeFileSync(lj, JSON.stringify(lines), 'utf8');
const py = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
await run(py, [path.join(P.root, 'packages', 'quizlab', 'src', 'asr.py'), lj, oj], { maxBuffer: 1 << 26 });
const res = JSON.parse(fs.readFileSync(oj, 'utf8'));
for (const r of res) console.log(`${r.flag ? 'FLAG' : 'ok  '} ${r.line} wer ${r.wer}  heard: ${r.heard}`);
console.log(`total raw ${lines.reduce((a, l) => a + l.raw_s, 0).toFixed(1)} s`);
