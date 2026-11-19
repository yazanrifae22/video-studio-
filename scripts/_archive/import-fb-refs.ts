// Registers Facebook reference reels as research-only sources (no reuse permission; never downloaded).
// Usage: npx tsx scripts/import-fb-refs.ts <refs.json> "<creator>"
import fs from 'node:fs';
import { db } from '../packages/shared/src/db.ts';
import { setRights } from '../packages/rights/src/rights.ts';

const [file, creator] = [process.argv[2], process.argv[3]];
const refs = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const r of refs) {
  const asset = `fb-${r.id}`;
  db().prepare(`INSERT OR IGNORE INTO sources(asset_id, original_url, source_platform, external_id, creator, title, language, published_at, duration, view_count, views_observed_at, category, data)
    VALUES (?,?,?,?,?,?,?,?,?,?,date('now'),'reference',?)`)
    .run(asset, `https://www.facebook.com/reel/${r.id}/`, 'facebook', r.id, creator, r.title, 'en', r.date, r.dur, r.views, JSON.stringify({ rank: r.rank, date_basis: r.date_basis, reactions: r.reactions }));
  setRights(asset, 'research_only', { actor: 'orchestrator', reason: 'Third-party creator reel; no reuse licence or permission. Format reference only - not downloaded, no footage reused.', evidence: 'Public Facebook reel, observed logged-out 2026-10-22' });
  console.log(asset);
}
