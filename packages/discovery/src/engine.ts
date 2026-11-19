import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { db, J, newId } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { classifyLicense, assertPublishable, setRights } from '../../rights/src/rights.ts';
import { PROVIDERS, internetArchiveFiles, nasaFiles, youtubeDetails, type Found, type ProviderName, type SearchOpts } from './providers.ts';

/** Normalised title for cheap cross-source near-duplicate detection before any media is fetched. */
export function titleKey(t: string | null) {
  return (t ?? '').toLowerCase().replace(/\.(webm|mp4|ogv|mov)$/, '').replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/).filter(w => w.length > 2 && !['the', 'and', 'with', 'for', 'nasa', 'video', 'official', '4k', 'hd'].includes(w)).sort().join(' ');
}
function jaccard(a: string, b: string) {
  const A = new Set(a.split(' ')), B = new Set(b.split(' '));
  if (!A.size || !B.size) return 0;
  let i = 0; for (const x of A) if (B.has(x)) i++;
  return i / (A.size + B.size - i);
}

/** Upsert discovered records. Re-discovery refreshes metrics (with observation time) but never downgrades a human rights decision. */
export function ingest(found: Found[], ctx: { query: string; agent?: string; ideaId?: string; category?: string }) {
  const ins: string[] = [], upd: string[] = [];
  const existingKeys = (db().prepare(`SELECT asset_id, title FROM sources`).all() as any[]).map(r => ({ id: r.asset_id, k: titleKey(r.title) }));
  for (const f of found) {
    if (!f.external_id || !f.original_url) continue;
    const prev = db().prepare(`SELECT asset_id, data FROM sources WHERE source_platform=? AND external_id=?`).get(f.source_platform, f.external_id) as any;
    const obs = f.view_count != null ? new Date().toISOString() : null;
    if (prev) {
      db().prepare(`UPDATE sources SET view_count=COALESCE(?, view_count), views_observed_at=COALESCE(?, views_observed_at),
        duration=COALESCE(duration, ?), updated_at=datetime('now') WHERE asset_id=?`).run(f.view_count, obs, f.duration, prev.asset_id);
      upd.push(prev.asset_id);
      continue;
    }
    const a = classifyLicense({ platform: f.source_platform, license: f.license, licenseUrl: f.license_url, description: f.description, creator: f.creator });
    const id = newId('src');
    const k = titleKey(f.title);
    const dup = k ? existingKeys.find(e => jaccard(e.k, k) >= 0.8) : undefined;
    db().prepare(`INSERT INTO sources(asset_id, original_url, source_platform, external_id, creator, title, description, category, published_at,
      duration, view_count, views_observed_at, license, license_url, permission_status, usage_restrictions, attribution, commercial_use, derivatives_allowed,
      download_url, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, f.original_url, f.source_platform, f.external_id, f.creator, f.title, f.description, ctx.category ?? null, f.published_at,
      f.duration, f.view_count, obs, a.license, f.license_url, a.initial, J.str(a.conditions),
      f.creator ? `${f.title ?? 'Untitled'} by ${f.creator}${a.license ? ` (${a.license})` : ''} — ${f.original_url}` : null,
      a.commercial == null ? null : +a.commercial, a.derivatives == null ? null : +a.derivatives, f.download_url,
      J.str({ ...f.extra, width: f.width, height: f.height, discovered_by: ctx.agent ?? null, query: ctx.query, idea_id: ctx.ideaId ?? null,
        rights_proposal: { proposed: a.proposed, reasons: a.reasons }, possible_duplicate_of: dup?.id ?? null }));
    db().prepare(`INSERT INTO rights_log(asset_id, actor, from_status, to_status, reason) VALUES (?,?,?,?,?)`)
      .run(id, 'classifier', null, a.initial, `${a.reasons.join('; ')}${a.proposed !== a.initial ? ` (proposed: ${a.proposed}, awaiting scout)` : ''}`);
    existingKeys.push({ id, k });
    ins.push(id);
  }
  emit({ kind: 'discovery.ingested', agent: ctx.agent, message: `"${ctx.query}": ${ins.length} new, ${upd.length} refreshed`, data: { inserted: ins, refreshed: upd } });
  return { inserted: ins, refreshed: upd };
}

export async function discover(provider: ProviderName, query: string, opts: SearchOpts & { agent?: string; ideaId?: string; category?: string } = {}) {
  const found = await PROVIDERS[provider](query, opts);
  return { found: found.length, ...ingest(found, { query, agent: opts.agent, ideaId: opts.ideaId, category: opts.category }) };
}

/** Second-pass enrichment for shortlisted items (license detail, real duration, file URL). */
export async function enrich(assetId: string) {
  const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (!s) throw new Error(`source ${assetId} not found`);
  const data = J.parse<any>(s.data, {});
  let patch: Record<string, any> = {};
  if (s.source_platform === 'youtube') {
    const d = await youtubeDetails(s.external_id);
    patch = { license: d.license, published_at: d.upload_date, view_count: d.view_count, views_observed_at: new Date().toISOString(), duration: d.duration, description: d.description?.slice(0, 4000), language: d.language };
    data.youtube = { like_count: d.like_count, comment_count: d.comment_count, channel_follower_count: d.channel_follower_count, channel_is_verified: d.channel_is_verified, has_subtitles: d.has_subtitles, has_auto_captions: d.has_auto_captions, categories: d.categories, tags: d.tags };
  } else if (s.source_platform === 'internet_archive') {
    const f = await internetArchiveFiles(s.external_id);
    if (f) { patch = { download_url: f.url, duration: f.duration, license_url: s.license_url ?? f.licenseurl }; data.width = f.width; data.height = f.height; data.ia_rights = f.rights; }
  } else if (s.source_platform === 'nasa' && data.manifest) {
    const f = await nasaFiles(data.manifest);
    if (f) patch = { download_url: f.url };
  }
  const a = classifyLicense({ platform: s.source_platform, license: patch.license ?? s.license, licenseUrl: patch.license_url ?? s.license_url, description: patch.description ?? s.description, creator: s.creator });
  data.rights_proposal = { proposed: a.proposed, reasons: a.reasons };
  const cols = Object.keys(patch);
  if (cols.length) db().prepare(`UPDATE sources SET ${cols.map(c => `${c}=?`).join(', ')}, usage_restrictions=?, data=?, updated_at=datetime('now') WHERE asset_id=?`)
    .run(...cols.map(c => patch[c] ?? null), J.str(a.conditions), J.str(data), assetId);
  // Only move between machine states; never override a human/scout decision.
  if (s.permission_status === 'pending' && a.initial === 'research_only') setRights(assetId, 'research_only', { actor: 'classifier', reason: a.reasons.join('; ') });
  return { ...patch, proposal: a };
}

/**
 * Acquire media for an asset. Only rights-approved assets, only via a host that offers the file for download.
 * Content-addressed: the sha256 becomes the fingerprint; re-acquisition is a no-op.
 */
export async function acquire(assetId: string, agent = 'rights-scout') {
  assertPublishable([assetId]);
  const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (s.local_path && fs.existsSync(s.local_path)) return { path: s.local_path, cached: true };
  if (s.source_platform === 'youtube') throw new Error('YouTube media is not downloaded by the studio (ToS). Obtain the file from the creator, then `source:attach-file`.');
  if (!s.download_url) throw new Error(`no download_url for ${assetId}; run source:enrich first`);
  const dir = path.join(P.media, s.source_platform);
  fs.mkdirSync(dir, { recursive: true });
  const ext = (/\.(mp4|webm|ogv|mov|mkv|mpeg4)(?:$|\?)/i.exec(s.download_url)?.[1] ?? 'mp4').toLowerCase();
  const tmp = path.join(dir, `${assetId}.part`);
  const res = await fetch(s.download_url, { headers: { 'user-agent': 'ClipsViralStudio/0.1' }, redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`download HTTP ${res.status}`);
  const hash = crypto.createHash('sha256');
  const body = Readable.fromWeb(res.body as any);
  body.on('data', (c: Buffer) => hash.update(c));
  await pipeline(body, fs.createWriteStream(tmp));
  const sha = hash.digest('hex');
  const final = path.join(dir, `${assetId}.${ext}`);
  fs.renameSync(tmp, final);
  const dupe = db().prepare(`SELECT asset_id FROM sources WHERE fingerprint=? AND asset_id<>?`).get(sha, assetId) as any;
  db().prepare(`UPDATE sources SET local_path=?, fingerprint=?, acquisition_date=datetime('now'), updated_at=datetime('now') WHERE asset_id=?`).run(final, sha, assetId);
  emit({ kind: 'source.acquired', agent, level: 'success', message: `Acquired ${assetId} (${(fs.statSync(final).size / 1e6).toFixed(1)} MB)${dupe ? ` — identical file to ${dupe.asset_id}` : ''}`, data: { assetId, sha } });
  return { path: final, sha, duplicateOf: dupe?.asset_id ?? null };
}
