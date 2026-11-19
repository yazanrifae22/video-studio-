import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const PYDIR = path.join(P.root, 'packages', 'intelligence', 'py');

/** Cross-process exclusive lock (GPU, shared quotas). Stale locks from dead processes are reclaimed. */
export async function withLock<T>(name: string, holder: string, fn: () => Promise<T>, waitMs = 3 * 3600_000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const d = db();
    d.exec('BEGIN IMMEDIATE');
    let got = false;
    try {
      d.prepare(`DELETE FROM locks WHERE resource=? AND expires_at < datetime('now')`).run(name);
      const cur = d.prepare(`SELECT holder FROM locks WHERE resource=?`).get(name) as any;
      if (cur?.holder) { const pid = Number(String(cur.holder).split(':').pop()); try { process.kill(pid, 0); } catch { d.prepare(`DELETE FROM locks WHERE resource=?`).run(name); } }
      if (!d.prepare(`SELECT 1 FROM locks WHERE resource=?`).get(name)) {
        d.prepare(`INSERT INTO locks(resource, holder, expires_at) VALUES (?,?,datetime('now','+3 hours'))`).run(name, `${holder}:${process.pid}`);
        got = true;
      }
      d.exec('COMMIT');
    } catch (e) { d.exec('ROLLBACK'); throw e; }
    if (got) break;
    if (Date.now() - t0 > waitMs) throw new Error(`timed out waiting for lock ${name}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  try { return await fn(); } finally { db().prepare(`DELETE FROM locks WHERE resource=? AND holder=?`).run(name, `${holder}:${process.pid}`); }
}

/** Normalised H.264/AAC 30 fps mezzanine (max 1920 on the long side) — what the builders cut windows from. Cached by sha. */
export async function mezzanine(src: string, sha: string) {
  const out = path.join(P.media, 'mezz', `${sha.slice(0, 16)}.mp4`);
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = out.replace(/\.mp4$/, '.part.mp4');
  await run('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vf', "scale='if(gt(iw,ih),min(1920,iw),-2)':'if(gt(iw,ih),-2,min(1920,ih))',fps=30", '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '19',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', tmp], { maxBuffer: 1 << 26 });
  fs.renameSync(tmp, out);
  return out;
}

/**
 * Full analysis of an acquired source: mezzanine → scenes/audio/motion/keyframes/contact sheets → (optional) GPU transcript.
 * Results are cached under data/cache/<sha>/ and recorded on the source row.
 */
export async function analyzeSource(assetId: string, opts: { transcribe?: boolean; lang?: string; agent?: string } = {}) {
  const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (!s) throw new Error(`source ${assetId} not found`);
  if (!s.local_path || !fs.existsSync(s.local_path)) throw new Error(`${assetId} not acquired yet (source:acquire first)`);
  const agent = opts.agent ?? 'worker';
  const dir = path.join(P.cache, s.fingerprint);
  fs.mkdirSync(dir, { recursive: true });
  const mezz = await mezzanine(s.local_path, s.fingerprint);
  if (!fs.existsSync(path.join(dir, 'analysis.json'))) {
    await run(PY, ['-I', path.join(PYDIR, 'analyze.py'), mezz, dir], { maxBuffer: 1 << 26, timeout: 3600_000 });
  }
  const analysis = J.parse<any>(fs.readFileSync(path.join(dir, 'analysis.json'), 'utf8'), {});
  let transcript: string | null = s.transcript_path;
  if (opts.transcribe && !(transcript && fs.existsSync(transcript))) {
    transcript = path.join(dir, `transcript.${opts.lang ?? 'auto'}.json`);
    await withLock('gpu', agent, () => run(PY, ['-I', path.join(PYDIR, 'transcribe.py'), mezz, transcript!, '--lang', opts.lang ?? 'auto'], { maxBuffer: 1 << 26, timeout: 4 * 3600_000 }));
  }
  const summary = { mezzanine: mezz, cache_dir: dir, duration: analysis.duration, width: analysis.width, height: analysis.height, fps: analysis.fps,
    scene_count: analysis.scene_count, cuts_per_min: analysis.cuts_per_min, contact_sheets: (analysis.contact_sheets ?? []).map((f: string) => path.join(dir, f)),
    audio_peaks: analysis.audio_peaks, motion_peaks: analysis.motion_peaks, has_audio: analysis.has_audio };
  db().prepare(`UPDATE sources SET analysis=?, transcript_path=COALESCE(?, transcript_path), duration=COALESCE(duration, ?), updated_at=datetime('now') WHERE asset_id=?`)
    .run(J.str(summary), transcript, analysis.duration, assetId);
  emit({ kind: 'source.analyzed', agent, message: `Analysed ${assetId}: ${analysis.scene_count} scenes${transcript ? ', transcript ready' : ''}`, data: { assetId } });
  return { ...summary, transcript_path: transcript };
}

/**
 * fullview: shots + aligned frames + words per shot + tiled grids + readable timeline (fullview.md), next to analysis.json.
 * Runs analyzeSource first (cached, same cache dir), reuses an existing transcript, only transcribes with { transcribe: true }.
 */
export async function fullviewSource(assetId: string, opts: { transcribe?: boolean; lang?: string; agent?: string } = {}) {
  const base = await analyzeSource(assetId, opts);
  const s = db().prepare(`SELECT transcript_path FROM sources WHERE asset_id=?`).get(assetId) as any;
  const dir = base.cache_dir as string;
  const args = ['-I', path.join(PYDIR, 'fullview.py'), base.mezzanine, '--out', dir];
  if (s?.transcript_path && fs.existsSync(s.transcript_path)) args.push('--transcript', s.transcript_path);
  const { stdout } = await run(PY, args, { maxBuffer: 1 << 26, timeout: 3600_000 });
  const r = J.parse<any>(String(stdout).trim().split('\n').pop() ?? '{}', {});
  emit({ kind: 'source.fullview', agent: opts.agent ?? 'worker', message: `Fullview ${assetId}: ${r.shots} shots, ${r.grids} grids`, data: { assetId } });
  return { cache_dir: dir, fullview_md: path.join(dir, 'fullview.md'), fullview_json: path.join(dir, 'fullview.json'), ...r,
    transcript: s?.transcript_path ?? null };
}
