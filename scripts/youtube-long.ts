/**
 * Long-form (quiz-long) YouTube upload path. The daily uploader (scripts/youtube.ts + publish-plan.py) is Shorts logic and
 * never plans long-form; the owner OKs each long-form video explicitly (first one 2026-11-13, quiz-261112-fpr4).
 *
 *   npx tsx scripts/youtube-long.ts upload <pid> [--dry-run] [--at <ISO time>]   # private upload + thumbnail + playlist + Arabic captions;
 *                                                                 # --at = scheduled (private + publishAt), e.g. 2026-11-20T16:30:00Z
 *   npx tsx scripts/youtube-long.ts record <pid> <videoId>      # mirror the video's real state (public/scheduled) into the studio DB
 *
 * Reads productions/<pid>/publish-kit.json (title, description, tags, playlist, thumbnail[0], video, subtitles). Upload is
 * PRIVATE; with --at it is scheduled (publishAt, owner OK per video, added 2026-11-13). Going public by hand, end screen and the
 * pinned comment are done in YouTube Studio (owner's Chrome). Same guards as youtube.ts: approved production only, no AI-generation text, YouTube limits, never truncates.
 * quiz-ar keeps the altered/synthetic platform flag (rights condition C1, see alteredContent in youtube.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { aiHitText, aiTextFields } from '../packages/shared/src/ai-text.ts';
import { limitText, youtubeLimitIssues } from '../packages/shared/src/platform-limits.ts';

const R = path.resolve(import.meta.dirname, '..');
const BRAND = 'quiz-ar', CHANNEL = 'UC-ZF7rS8mQ9o6e9g0E-vhhg';
const db = new DatabaseSync(path.join(R, 'data', 'studio.db'));
const [cmd, pid, vidArg] = process.argv.slice(2);
const dry = process.argv.includes('--dry-run');
const atIdx = process.argv.indexOf('--at'), atDate = atIdx > 0 ? new Date(process.argv[atIdx + 1] ?? '') : null;
if (atDate && (isNaN(atDate.getTime()) || atDate.getTime() < Date.now() + 15 * 60_000)) throw new Error('--at needs an ISO time at least 15 min ahead');

async function accessToken() {
  const j = JSON.parse(fs.readFileSync(path.join(R, 'secrets', 'youtube-oauth-client.json'), 'utf8')); const c = j.installed ?? j.web;
  const { refresh_token } = JSON.parse(fs.readFileSync(path.join(R, 'data', 'tokens', `${BRAND}.json`), 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret,
    refresh_token, grant_type: 'refresh_token' }) })).json() as any;
  if (!t.access_token) throw new Error(`Token refresh failed: ${t.error}`);
  return t.access_token as string;
}
async function api(token: string, method: string, url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})) as any;
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${j.error?.message ?? r.statusText}`);
  return j;
}

if (!pid || !['upload', 'record'].includes(cmd)) { console.log('usage: upload <pid> [--dry-run] | record <pid> <videoId>'); process.exit(2); }
const pdir = path.join(R, 'productions', pid);
const row = db.prepare('SELECT brand_id, approval_status FROM productions WHERE production_id=?').get(pid) as any;
if (!row || row.brand_id !== BRAND || row.approval_status !== 'approved') throw new Error(`${pid}: not an approved ${BRAND} production`);
if (!fs.existsSync(path.join(pdir, 'episode.json'))) throw new Error(`${pid}: not a long-form production (no episode.json)`);
const kit = JSON.parse(fs.readFileSync(path.join(pdir, 'publish-kit.json'), 'utf8'));

if (cmd === 'upload') {
  const done = db.prepare(`SELECT external_post_id FROM publishing WHERE production_id=? AND platform='youtube' AND publication_status IN ('scheduled','published','planned')`).get(pid) as any;
  if (done) throw new Error(`${pid}: already on YouTube (${done.external_post_id})`);
  const file = path.join(pdir, kit.video), thumb = path.join(pdir, kit.thumbnail[0]), srt = path.join(pdir, kit.subtitles);
  for (const f of [file, thumb, srt]) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  const yt = (s: string) => s.replace(/</g, '＜').replace(/>/g, '＞');
  const snippet = { title: yt(kit.title), description: yt(kit.description), tags: kit.tags.map(String), categoryId: '24', defaultLanguage: 'ar', defaultAudioLanguage: 'ar' };
  const lim = youtubeLimitIssues({ title: snippet.title, description: snippet.description, tags: snippet.tags });
  if (lim.length) throw new Error(`YouTube limits: ${limitText(lim)}`);
  const ai = aiTextFields([{ key: 'title', text: snippet.title }, { key: 'description', text: snippet.description }, { key: 'tags', text: snippet.tags.join(' | ') },
    { key: 'pinned_comment', text: kit.pinned_comment }], BRAND);
  if (ai.length) throw new Error(`AI-generation text: ${aiHitText(ai)}`);
  const meta = { snippet, status: { privacyStatus: 'private', ...(atDate ? { publishAt: atDate.toISOString() } : {}), selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true, license: 'youtube' } };
  const token = await accessToken();
  const me = await api(token, 'GET', 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true');
  if (me.items?.[0]?.id !== CHANNEL) throw new Error(`token channel ${me.items?.[0]?.id} is not ${CHANNEL}`);
  const pls = await api(token, 'GET', 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50');
  const pl = (pls.items ?? []).find((p: any) => p.snippet.title.trim() === String(kit.playlist).trim());
  if (!pl) throw new Error(`playlist not found: ${kit.playlist}`);
  const size = fs.statSync(file).size;
  if (dry) { console.log(JSON.stringify({ dry: true, channel: me.items[0].snippet.title, playlist: { id: pl.id, items: pl.contentDetails.itemCount }, size, meta, thumb, srt }, null, 1)); process.exit(0); }

  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) }, body: JSON.stringify(meta) });
  if (!init.ok) throw new Error(`init ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const up = await fetch(init.headers.get('location')!, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file) });
  const res = await up.json().catch(() => ({})) as any;
  if (!up.ok || !res.id) throw new Error(`upload ${up.status}: ${res.error?.message ?? ''}`);
  const vid = res.id as string, out: any = { pid, video: `https://youtu.be/${vid}`, privacy: res.status?.privacyStatus, publishAt: res.status?.publishAt ?? null };
  console.log(`uploaded ${vid}`);
  // from here on every step is reported, never fatal: the video already exists (private)
  const step = async (name: string, f: () => Promise<unknown>) => { try { out[name] = (await f()) ?? 'ok'; } catch (e: any) { out[name] = `FAILED: ${e?.message ?? e}`; } };
  await step('thumbnail', async () => {
    const tr = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}`, { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': thumb.endsWith('.png') ? 'image/png' : 'image/jpeg' }, body: fs.readFileSync(thumb) });
    if (!tr.ok) throw new Error(`${tr.status} ${(await tr.text()).slice(0, 200)}`);
  });
  await step('playlist', async () => { await api(token, 'POST', 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    { snippet: { playlistId: pl.id, resourceId: { kind: 'youtube#video', videoId: vid } } }); return pl.snippet.title; });
  await step('captions', async () => {
    const b = 'studio' + Date.now();
    const body = Buffer.concat([Buffer.from(`--${b}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ snippet: { videoId: vid, language: 'ar', name: '', isDraft: false } })}\r\n--${b}\r\ncontent-type: application/octet-stream\r\n\r\n`),
      fs.readFileSync(srt), Buffer.from(`\r\n--${b}--\r\n`)]);
    const cr = await fetch('https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet', { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${b}` }, body });
    if (!cr.ok) throw new Error(`${cr.status} ${(await cr.text()).slice(0, 200)}`);
  });
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
    .run(pid, `YouTube long-form uploaded ${atDate ? 'SCHEDULED ' + atDate.toISOString() : 'PRIVATE'}: ${pid} → https://youtu.be/${vid}`, JSON.stringify({ production_id: pid, video_id: vid, steps: out }));
  console.log(JSON.stringify(out, null, 1));
} else {
  if (!vidArg) throw new Error('record needs <videoId>');
  const token = await accessToken();
  const v = (await api(token, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${vidArg}`)).items?.[0];
  if (!v || v.snippet.channelId !== CHANNEL) throw new Error(`${vidArg}: not a video of this channel`);
  const pub = v.status.privacyStatus === 'public', at = pub ? v.snippet.publishedAt : v.status.publishAt;
  if (!pub && !at) { console.log(JSON.stringify({ pid, vid: vidArg, privacy: v.status.privacyStatus, recorded: false, note: 'private without schedule: nothing to record yet' })); process.exit(0); }
  const d = new Date(at), pad = (n: number) => String(n).padStart(2, '0');
  const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`, st = pub ? 'published' : 'scheduled';
  db.prepare(`INSERT INTO publishing (production_id, platform, account_id, metadata, scheduled_time, publication_status, approved_by, approved_at, external_post_id, idempotency_key)
    VALUES (?,?,?,?,?,?,'owner',datetime('now'),?,?) ON CONFLICT(idempotency_key) DO UPDATE SET metadata=excluded.metadata, scheduled_time=excluded.scheduled_time,
    publication_status=excluded.publication_status, external_post_id=excluded.external_post_id, error_details=NULL, updated_at=datetime('now')`)
    .run(pid, 'youtube', BRAND, JSON.stringify({ url: `https://youtu.be/${vidArg}`, local_time: `${local} PC local`, format: 'long-form', method: 'YouTube Data API upload (scripts/youtube-long.ts) + Studio' }),
      d.toISOString(), st, vidArg, `youtube:${pid}`);
  db.prepare(`UPDATE productions SET current_state=?, updated_at=datetime('now') WHERE production_id=? AND current_state IN ('approved','scheduled')`).run(st, pid);
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
    .run(pid, `YouTube long-form ${st}: ${pid} → https://youtu.be/${vidArg} at ${local} (local)`, JSON.stringify({ production_id: pid }));
  console.log(JSON.stringify({ pid, vid: vidArg, status: st, at: d.toISOString(), local }));
}
