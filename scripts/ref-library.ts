// Reference-reel library for quiz-ar: which reference reels are available, in production, or done (so none is redone).
// Files stay where the owner put them; every reel is a research_only source (study material, never rendered).
//
//   npx tsx scripts/ref-library.ts import <metadata.json> "<creator>"
//   npx tsx scripts/ref-library.ts list [--status available|claimed|done|skipped] [--limit N] [--q text]
//   npx tsx scripts/ref-library.ts claim <fb-id> <production> <agent>
//   npx tsx scripts/ref-library.ts done <fb-id> [<production>]
//   npx tsx scripts/ref-library.ts skip <fb-id> "<reason>"
//   npx tsx scripts/ref-library.ts stats
//   npx tsx scripts/ref-library.ts sync      (claimed + approved → done, then rewrite studio-status.csv/json next to the reel files)
import fs from 'node:fs';
import path from 'node:path';
import { db, J } from '../packages/shared/src/db.ts';
import { setRights } from '../packages/rights/src/rights.ts';
import { exportStatus, setLibrary, syncLibrary } from '../packages/shared/src/reflib.ts';

const [cmd, ...args] = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const lib = (r: any) => J.parse(r.data, {}).library ?? { status: 'available' };
const setLib = setLibrary;

if (cmd === 'import') {
  const meta = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  const dir = path.dirname(path.resolve(args[0]));
  let added = 0, updated = 0;
  for (const r of meta.reels) {
    const asset = `fb-${r.id}`;
    const file = path.join(dir, r.file);
    const exists = db().prepare(`SELECT data FROM sources WHERE asset_id=?`).get(asset) as any;
    const extra = { reference_file: fs.existsSync(file) ? file : null, caption: r.caption, likes: r.like_count, comments: r.comment_count };
    if (exists) {
      const data = { ...J.parse(exists.data, {}), ...extra };
      db().prepare(`UPDATE sources SET data=?, duration=COALESCE(duration, ?), view_count=MAX(COALESCE(view_count,0), ?), updated_at=datetime('now') WHERE asset_id=?`)
        .run(J.str(data), r.duration_seconds, r.view_count ?? 0, asset);
      updated++;
      continue;
    }
    db().prepare(`INSERT INTO sources(asset_id, original_url, source_platform, external_id, creator, title, language, published_at, duration, view_count, views_observed_at, category, data)
      VALUES (?,?,?,?,?,?,?,?,?,?,date('now'),'reference',?)`)
      .run(asset, `https://www.facebook.com/reel/${r.id}/`, 'facebook', r.id, args[1], r.caption, 'en', r.upload_date, r.duration_seconds, r.view_count, J.str({ ...extra, library: { status: 'available' } }));
    setRights(asset, 'research_only', { actor: 'orchestrator', reason: 'Third-party creator reel; local copy supplied by owner for format study only. No footage may be rendered until written creator permission is on file (docs/brands/quiz-ar/creator-permission.md).', evidence: 'Owner-supplied file, 2026-10-22' });
    added++;
  }
  console.log({ added, updated, total: meta.reels.length });
} else if (cmd === 'list') {
  const rows = db().prepare(`SELECT asset_id, title, published_at, duration, view_count, data FROM sources WHERE source_platform='facebook' AND category='reference' ORDER BY view_count DESC`).all() as any[];
  const st = flag('status'), q = flag('q')?.toLowerCase();
  const out = rows.filter(r => (!st || lib(r).status === st) && (!q || String(r.title).toLowerCase().includes(q)))
    .slice(0, Number(flag('limit') ?? 50))
    .map(r => ({ id: r.asset_id, views: r.view_count, date: r.published_at, dur: Math.round(r.duration), status: lib(r).status, production: lib(r).production ?? '', title: String(r.title).slice(0, 70) }));
  console.table(out);
} else if (cmd === 'claim') {
  const [asset, production, agent] = args;
  const cur = lib(db().prepare(`SELECT data FROM sources WHERE asset_id=?`).get(asset) as any ?? {});
  // A curator may reserve reels for a batch (production "batch-N"); the showrunner then claims it with the real id.
  const reserved = typeof cur.production === 'string' && cur.production.startsWith('batch-');
  if (cur.status && cur.status !== 'available' && cur.production !== production && !reserved) throw new Error(`${asset} is already ${cur.status} (${cur.production ?? ''})`);
  console.log(setLib(asset, { status: 'claimed', production, claimed_by: agent }));
} else if (cmd === 'done') {
  console.log(setLib(args[0], { status: 'done', ...(args[1] ? { production: args[1] } : {}) }));
} else if (cmd === 'skip') {
  console.log(setLib(args[0], { status: 'skipped', reason: args[1] }));
} else if (cmd === 'stats') {
  const rows = db().prepare(`SELECT data FROM sources WHERE source_platform='facebook' AND category='reference'`).all() as any[];
  const c: Record<string, number> = {};
  for (const r of rows) { const s = lib(r).status; c[s] = (c[s] ?? 0) + 1; }
  console.log({ total: rows.length, ...c });
} else if (cmd === 'sync') {
  console.log({ promoted_to_done: syncLibrary(), ...exportStatus() });
} else {
  console.log('commands: import | list | claim | done | skip | stats | sync');
}
// Every change is mirrored to studio-status.csv/json beside the reference files.
if (['import', 'claim', 'done', 'skip'].includes(cmd)) exportStatus();
