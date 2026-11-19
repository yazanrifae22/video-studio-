import fs from 'node:fs';
import path from 'node:path';
import { db, J } from './db.ts';

/**
 * Reference-reel library (quiz-ar): every reference reel's work status, so no reel is adapted twice.
 * Status lives in sources.data.library {status: available|claimed|done|skipped, production, ...}.
 * A claimed reel whose production is approved becomes done. exportStatus() writes studio-status.csv/json
 * next to the owner's reel files so the progress is visible without the studio.
 */
export type LibStatus = 'available' | 'claimed' | 'done' | 'skipped';

const refs = () => db().prepare(`SELECT asset_id, external_id, title, published_at, duration, view_count, data
  FROM sources WHERE source_platform='facebook' AND category='reference' ORDER BY published_at DESC`).all() as any[];

export function libOf(row: any) { return J.parse<any>(row.data, {}).library ?? { status: 'available' }; }

export function setLibrary(asset: string, patch: Record<string, unknown>) {
  const row = db().prepare(`SELECT data FROM sources WHERE asset_id=?`).get(asset) as any;
  if (!row) throw new Error(`unknown reference ${asset}`);
  const data = J.parse<any>(row.data, {});
  data.library = { ...(data.library ?? { status: 'available' }), ...patch, updated: new Date().toISOString() };
  db().prepare(`UPDATE sources SET data=?, updated_at=datetime('now') WHERE asset_id=?`).run(J.str(data), asset);
  return data.library;
}

/** Promote claimed reels whose production is approved to done. Returns how many changed. */
export function syncLibrary() {
  let n = 0;
  for (const r of refs()) {
    const lib = libOf(r);
    if (lib.status !== 'claimed' || !lib.production) continue;
    const p = db().prepare(`SELECT current_state FROM productions WHERE production_id=?`).get(lib.production) as any;
    if (p?.current_state === 'approved') { setLibrary(r.asset_id, { status: 'done', done_at: new Date().toISOString() }); n++; }
  }
  return n;
}

/** Library rows joined with production stage / latest QA, for the dashboard and the export. */
export function libraryRows() {
  return refs().map(r => {
    const lib = libOf(r);
    const data = J.parse<any>(r.data, {});
    const p = lib.production ? db().prepare(`SELECT current_state, title FROM productions WHERE production_id=?`).get(lib.production) as any : null;
    const qa = lib.production ? db().prepare(`SELECT score, verdict FROM reviews WHERE production_id=? AND COALESCE(kind,'agent') IN ('agent','qa') ORDER BY id DESC LIMIT 1`).get(lib.production) as any : null;
    return { id: r.external_id, asset: r.asset_id, caption: r.title, upload_date: r.published_at, duration: r.duration, views: r.view_count,
      status: lib.status as LibStatus, production: lib.production ?? null, stage: p?.current_state ?? null, our_title: p?.title ?? null,
      qa_score: qa?.score ?? null, qa_verdict: qa?.verdict ?? null, reason: lib.reason ?? null, updated: lib.updated ?? null,
      file: data.reference_file ?? null };
  });
}

const csvCell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Write studio-status.csv/.json beside the reference files (one folder per creator). */
export function exportStatus() {
  const rows = libraryRows();
  const dirs = new Set(rows.map(r => r.file && path.dirname(r.file)).filter(Boolean) as string[]);
  const counts = rows.reduce((a, r) => (a[r.status] = (a[r.status] ?? 0) + 1, a), {} as Record<string, number>);
  const cols = ['id', 'status', 'production', 'stage', 'qa_score', 'qa_verdict', 'our_title', 'upload_date', 'views', 'duration', 'caption', 'reason', 'updated'] as const;
  for (const dir of dirs) {
    const mine = rows.filter(r => r.file && path.dirname(r.file) === dir);
    fs.writeFileSync(path.join(dir, 'studio-status.csv'), '﻿' + [cols.join(','), ...mine.map(r => cols.map(c => csvCell((r as any)[c])).join(','))].join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'studio-status.json'), JSON.stringify({ updated: new Date().toISOString(), counts, reels: mine.map(({ file, ...r }) => r) }, null, 2));
  }
  return { counts, dirs: [...dirs] };
}
