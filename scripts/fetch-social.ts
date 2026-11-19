/**
 * Download an owner-approved YouTube / TikTok / Instagram source with yt-dlp (options taken from the video-analyze skill's download.sh).
 * Owner decision 2026-10-28: these platforms may be downloaded, but ONLY for sources whose permission_status is
 * approved / approved_with_conditions (and licence not expired). No Apify, no paid APIs.
 *
 * usage: npx tsx scripts/fetch-social.ts <asset_id> [url]     (or: npm run -s cli -- source:fetch-social <asset_id> [url])
 * Writes data/media/<platform>/<asset_id>.mp4, then sets sources.local_path, fingerprint (sha256), acquisition_date.
 * Env: VIDEO_ANALYZE_BROWSER=chrome|edge|firefox (default none; set it to use that browser's cookies for logged-in-only media).
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db } from '../packages/shared/src/db.ts';
import { emit } from '../packages/shared/src/events.ts';
import { P } from '../packages/shared/src/paths.ts';
import { assertPublishable } from '../packages/rights/src/rights.ts';

const run = promisify(execFile);
const FMT = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

function platformOf(url: string): 'youtube' | 'tiktok' | 'instagram' {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com|instagr\.am/i.test(url)) return 'instagram';
  throw new Error(`fetch-social only handles YouTube/TikTok/Instagram URLs, got: ${url.slice(0, 80)}`);
}

export async function fetchSocial(assetId: string, urlArg?: string, agent = 'orchestrator') {
  const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(assetId) as any;
  if (!s) throw new Error(`source ${assetId} not found`);
  if (!['approved', 'approved_with_conditions'].includes(s.permission_status)) {
    throw new Error(`Rights gate: ${assetId} is ${s.permission_status}; refusing to download (needs approved / approved_with_conditions)`);
  }
  assertPublishable([assetId]); // also checks licence expiry
  if (s.local_path && fs.existsSync(s.local_path)) return { path: s.local_path, cached: true };
  const url = urlArg || s.original_url;
  const plat = platformOf(url);
  const dir = path.join(P.media, plat);
  fs.mkdirSync(dir, { recursive: true });
  const final = path.join(dir, `${assetId}.mp4`);
  const args = ['-f', FMT, '--merge-output-format', 'mp4', '--no-playlist', '-o', final, '--quiet', '--no-warnings'];
  if (process.env.VIDEO_ANALYZE_BROWSER) args.push('--cookies-from-browser', process.env.VIDEO_ANALYZE_BROWSER);
  args.push(url);
  await run('yt-dlp', args, { maxBuffer: 1 << 26, timeout: 3600_000 });
  if (!fs.existsSync(final) || fs.statSync(final).size < 10_000) throw new Error(`yt-dlp produced no usable file for ${assetId}`);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(final)).digest('hex');
  db().prepare(`UPDATE sources SET local_path=?, fingerprint=?, acquisition_date=datetime('now'), updated_at=datetime('now') WHERE asset_id=?`).run(final, sha, assetId);
  emit({ kind: 'source.acquired', agent, level: 'success', message: `Fetched ${assetId} via yt-dlp (${plat}, ${(fs.statSync(final).size / 1e6).toFixed(1)} MB)`, data: { assetId, sha } });
  return { path: final, sha, cached: false };
}

if (process.argv[1] && /fetch-social\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  fetchSocial(process.argv[2], process.argv[3]).then(r => console.log(JSON.stringify(r, null, 2)), e => { console.error(String(e.message ?? e)); process.exit(1); });
}
