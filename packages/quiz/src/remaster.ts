// Re-master + techqa an existing quiz version in place (OpenChatCut project and raw render unchanged), and update its
// version record. usage: npx tsx packages/quiz/src/remaster.ts <production> <n>
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { db, J } from '../../shared/src/db.ts';
import { P } from '../../shared/src/paths.ts';
import { master } from '../../occ/src/build.ts';
const [id, n] = process.argv.slice(2);
const vdir = path.join(P.productions, id, `v${n}`);
// raw render: render.raw.mp4 (ffmpeg compositor, 2026-11-02) or render.occ.mp4 (OpenChatCut)
await master(fs.existsSync(path.join(vdir, 'render.raw.mp4')) ? path.join(vdir, 'render.raw.mp4') : path.join(vdir, 'render.occ.mp4'), path.join(vdir, 'render.mp4'));   // render.occ.mp4 = raw render of a pre-2026-11-02 (OpenChatCut) version
const b = JSON.parse(fs.readFileSync(path.join(vdir, 'build.json'), 'utf8'));
execFileSync(path.join(P.root, '.venv-asr', 'Scripts', 'python.exe'), ['-I', path.join(P.root, 'packages', 'intelligence', 'py', 'techqa.py'), path.join(vdir, 'render.mp4'), path.join(vdir, 'qa'), '--expect-duration', String(b.duration.toFixed(2))]);
const tq = JSON.parse(fs.readFileSync(path.join(vdir, 'qa', 'techqa.json'), 'utf8'));
b.techqa = { pass: tq.pass, failed: tq.failed, lufs: tq.integrated_lufs, tp: tq.true_peak_dbfs, duration: tq.duration, bytes: tq.bytes };
b.log.push('Re-mastered in place (master(): limiter + exact-length pad)');
fs.writeFileSync(path.join(vdir, 'build.json'), JSON.stringify(b, null, 1));
db().prepare(`UPDATE versions SET tech_qa=?, notes=? WHERE production_id=? AND n=?`).run(J.str(tq), J.str(b), id, +n);
console.log(JSON.stringify(b.techqa));
