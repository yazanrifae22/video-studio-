/**
 * library:register — ingest a Video Hunter folder (*.mp4 + manifest.json) into the studio library (sources [+ moments]).
 * 2026-11-08 (owner: "get what's needed from Video Hunter"). Replaces the per-production register.ts scripts
 * (e.g. productions/rank-261104-vu1k/work/register.ts).
 *
 * Per file: sha256 + ffprobe dims, then dedupe (same sha -> existing source; same platform video id / URL -> existing
 * source, file attached if it had none), else a new `sources` row (platform 'other', external_id `hunt:<platform>:<id>`)
 * with url, platform, uploader, views, likes, duration, width/height, upload date, hunt folder in `data`.
 * Rights: the classifier's initial status, or with --propose an `approved_with_conditions` PROPOSAL by --agent
 * (owner accepted claim risk for hunt clips 2026-11-04); rights-scout must still countersign (DISCOVERY-AND-RIGHTS §4).
 * YouTube-origin files are skipped unless --allow-youtube (the studio never downloads YouTube; owner-run hunts only).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { ingest } from '../../discovery/src/engine.ts';
import { setRights } from '../../rights/src/rights.ts';
import { addMoment } from './library.ts';

export interface RegisterOpts {
  brand: string; agent?: string; files?: string[]; category?: string; idea?: string;
  propose?: boolean; moments?: boolean; allowYoutube?: boolean; dryRun?: boolean;
}

const VID = /tiktok\.com\/@[\w.\-]+\/video\/(\d+)|(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([\w\-]{11})/;

function sha256(file: string) {
  const h = crypto.createHash('sha256'); const fd = fs.openSync(file, 'r'); const buf = Buffer.alloc(1 << 20);
  try { let n: number; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest('hex');
}

function probe(file: string): { width: number | null; height: number | null; duration: number | null } {
  try {
    const j = JSON.parse(String(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file])));
    return { width: j.streams?.[0]?.width ?? null, height: j.streams?.[0]?.height ?? null, duration: j.format?.duration ? +j.format.duration : null };
  } catch { return { width: null, height: null, duration: null }; }
}

function videoKey(row: any): { platform: string; id: string } | null {
  if (typeof row?.id === 'string' && /^(tiktok|youtube):/.test(row.id)) { const [p, ...r] = row.id.split(':'); return { platform: p, id: r.join(':') }; }
  const m = VID.exec(String(row?.url ?? ''));
  return m ? { platform: m[1] ? 'tiktok' : 'youtube', id: m[1] ?? m[2] } : null;
}

export function registerHuntFolder(folder: string, o: RegisterOpts) {
  const dir = path.resolve(folder);
  if (!fs.existsSync(dir)) throw new Error(`no such folder ${dir}`);
  const agent = o.agent ?? 'clip-hunter';
  const manPath = path.join(dir, 'manifest.json');
  const manifest: any[] = fs.existsSync(manPath) ? [JSON.parse(fs.readFileSync(manPath, 'utf8'))].flat() : [];
  const byFile = new Map(manifest.filter(r => r?.file).map(r => [String(r.file), r]));
  let files = fs.readdirSync(dir).filter(f => /\.(mp4|mov|webm|mkv)$/i.test(f)).sort();
  if (o.files?.length) {
    const want = o.files.map(s => s.trim()).filter(Boolean);
    files = files.filter(f => want.some(w => f === w || f.replace(/\.[^.]+$/, '') === w || new RegExp(`_${w.replace(/\W/g, '')}\\.[^.]+$`).test(f)));
  }
  const results: any[] = [];
  for (const f of files) {
    const file = path.join(dir, f), row = byFile.get(f) ?? {};
    const key = videoKey(row);
    const platform = key?.platform ?? row.platform ?? 'unknown';
    if (platform === 'youtube' && !o.allowYoutube) { results.push({ file: f, status: 'skipped', reason: 'YouTube-origin file: owner-run hunts only (pass --allow-youtube when the owner supplied it)' }); continue; }
    const sha = sha256(file);
    const bySha = db().prepare(`SELECT asset_id FROM sources WHERE fingerprint=? LIMIT 1`).get(sha) as any;
    if (bySha) { results.push({ file: f, asset_id: bySha.asset_id, status: 'existing_sha' }); continue; }
    const ext = key ? `hunt:${key.platform}:${key.id}` : `hunt-file:${sha.slice(0, 16)}`;
    const byUrl = (db().prepare(`SELECT asset_id, local_path FROM sources WHERE (source_platform='other' AND external_id=?) OR (? <> '' AND original_url=?) LIMIT 1`)
      .get(ext, row.url ?? '', row.url ?? '') as any);
    const dims = probe(file);
    if (o.dryRun) { results.push({ file: f, status: byUrl ? 'would_attach_existing' : 'would_insert', external_id: ext, sha: sha.slice(0, 12), ...dims, views: row.views ?? null }); continue; }
    if (byUrl) {
      if (!byUrl.local_path || !fs.existsSync(byUrl.local_path))
        db().prepare(`UPDATE sources SET local_path=?, fingerprint=?, acquisition_date=datetime('now'), updated_at=datetime('now') WHERE asset_id=?`).run(file, sha, byUrl.asset_id);
      results.push({ file: f, asset_id: byUrl.asset_id, status: 'existing_url' }); continue;
    }
    const url = row.url || `file:///${file.replace(/\\/g, '/')}`;
    const uploader = row.uploader || null;
    const ins = ingest([{ source_platform: 'other', external_id: ext, original_url: url,
      title: `${f} (${platform} hunt) ${row.title ?? ''}`.trim().slice(0, 200), creator: uploader ? `${uploader} (${platform})` : `unknown uploader (${platform})`,
      description: `Video Hunter clip, folder ${path.basename(dir)}; topic: ${String(row.topic ?? '').trim()}`.slice(0, 500), published_at: row.upload_date ?? (row.year ? String(row.year) : null),
      duration: row.duration ?? dims.duration, view_count: row.views ?? null, license: null, license_url: null, download_url: null,
      width: dims.width, height: dims.height,
      extra: { discovered_by: 'owner-video-hunter', registered_by: agent, brand: o.brand, hunt_platform: platform, hunt_video_id: key?.id ?? null, uploader,
        likes: row.likes ?? null, comments: row.comments ?? null, upload_date: row.upload_date ?? null, hunt_folder: dir, hunt_file: f, hunted_at: row.hunted_at ?? null } } as any],
      { query: `library:register ${path.basename(dir)}`, agent, ideaId: o.idea, category: o.category });
    const id = ins.inserted[0] ?? ins.refreshed[0];
    db().prepare(`UPDATE sources SET local_path=?, fingerprint=?, acquisition_date=datetime('now'), attribution=?, permission_evidence=?, updated_at=datetime('now') WHERE asset_id=?`)
      .run(file, sha, `${f} (${platform} hunt${uploader ? `, @${uploader}` : ''})`, `Video Hunter folder ${dir}; ${url}`, id);
    if (o.propose) setRights(id, 'approved_with_conditions', { actor: agent,
      reason: `proposed by ${agent}: Video Hunter ${platform} clip for ${o.brand} (owner accepted claim risk for hunt clips 2026-11-04); needs rights-scout countersign`,
      evidence: url, conditions: ['owner Video Hunter clip; claim risk accepted by owner 2026-11-04; log origin in script.json claim_log', 'no watermark, handle or burned text inside the used window/trim'] });
    let moment: string | null = null;
    const durMs = Math.floor(((row.duration ?? dims.duration) || 0) * 1000);
    if (o.moments && durMs > 0) moment = addMoment({ moment_id: `mom-${id.split('-').pop()}-full`, source_id: id, brand_id: o.brand, category_id: o.category ?? null, idea_id: o.idea ?? null,
      start_ms: 0, end_ms: durMs, description: `${row.title || f}`.slice(0, 200), tags: ['hunt', platform], creative_status: 'discovered',
      evidence: { views: row.views ?? null, width: dims.width, height: dims.height, url } }, agent);
    results.push({ file: f, asset_id: id, status: 'inserted', moment, views: row.views ?? null, ...dims });
  }
  const n = (s: string) => results.filter(r => r.status === s).length;
  if (o.dryRun) return { folder: dir, brand: o.brand, dry_run: true, results };
  emit({ kind: 'library.registered', agent, message: `library:register ${path.basename(dir)} (${o.brand}): ${n('inserted')} new, ${n('existing_sha') + n('existing_url')} existing, ${n('skipped')} skipped`, data: { folder: dir, results: J.str(results) } as any });
  return { folder: dir, brand: o.brand, inserted: n('inserted'), existing: n('existing_sha') + n('existing_url'), skipped: n('skipped'), results };
}
