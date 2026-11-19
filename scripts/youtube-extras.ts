/**
 * Extras for a video that scripts/youtube.ts already uploaded (private / scheduled): custom thumbnail and a caption track.
 * Added 2026-11-16 for the Parable long-form (youtube.ts is Shorts logic: no thumbnail, no captions; youtube-long.ts is quiz-ar only).
 *
 *   npx tsx scripts/youtube-extras.ts <brand> <videoId> [--thumb <jpg|png>] [--srt <file.srt>] [--lang en] [--dry-run]
 *
 * Never changes title, description, privacy or schedule. Checks that the video belongs to the brand's channel. Each step is
 * reported, never fatal (a new channel without phone verification cannot set custom thumbnails: YouTube answers 403).
 * Secrets: secrets/youtube-oauth-client.json and data/tokens/<brand>.json (git-ignored; never printed).
 */
import fs from 'node:fs';
import path from 'node:path';

const R = path.resolve(import.meta.dirname, '..');
const CHANNEL_IDS: Record<string, string> = { 'parable-salt': 'UC6Axmks3MUxVg5nQhBwQH1A', 'parable-copper': 'UCwBRx8KM-9TxJscnSx0z2-Q', 'parable-brass': 'UCGLESXKMrbRXzMVzJZ7t-Iw' };
const [brand, vid] = process.argv.slice(2);
const opt = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const thumb = opt('--thumb'), srt = opt('--srt'), lang = opt('--lang') ?? 'en', dry = process.argv.includes('--dry-run');
if (!brand || !vid || !CHANNEL_IDS[brand]) { console.log(`usage: youtube-extras.ts <${Object.keys(CHANNEL_IDS).join('|')}> <videoId> [--thumb f] [--srt f] [--lang en] [--dry-run]`); process.exit(2); }
for (const f of [thumb, srt]) if (f && !fs.existsSync(f)) throw new Error(`missing ${f}`);

async function accessToken() {
  const j = JSON.parse(fs.readFileSync(path.join(R, 'secrets', 'youtube-oauth-client.json'), 'utf8')); const c = j.installed ?? j.web;
  const { refresh_token } = JSON.parse(fs.readFileSync(path.join(R, 'data', 'tokens', `${brand}.json`), 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token, grant_type: 'refresh_token' }) })).json() as any;
  if (!t.access_token) throw new Error(`Token refresh failed: ${t.error}`);
  return t.access_token as string;
}
const token = await accessToken();
const g = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails,processingDetails&id=${vid}`, { headers: { authorization: `Bearer ${token}` } });
const v = ((await g.json()) as any).items?.[0];
if (!v || v.snippet.channelId !== CHANNEL_IDS[brand]) throw new Error(`${vid}: not a video of ${brand}`);
const out: any = { brand, video: `https://youtu.be/${vid}`, title: v.snippet.title, privacy: v.status.privacyStatus, publishAt: v.status.publishAt ?? null,
  upload: v.status.uploadStatus, duration: v.contentDetails?.duration ?? null, definition: v.contentDetails?.definition ?? null, processing: v.processingDetails?.processingStatus ?? null };
if (dry) { console.log(JSON.stringify({ dry: true, ...out, thumb: thumb ?? null, srt: srt ?? null, lang }, null, 1)); process.exit(0); }
const step = async (name: string, f: () => Promise<unknown>) => { try { out[name] = (await f()) ?? 'ok'; } catch (e: any) { out[name] = `FAILED: ${e?.message ?? e}`; } };
if (thumb) await step('thumbnail', async () => {
  const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}`, { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': thumb.endsWith('.png') ? 'image/png' : 'image/jpeg' }, body: fs.readFileSync(thumb) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
});
if (srt) await step('captions', async () => {
  const b = 'studio' + Date.now();
  const body = Buffer.concat([Buffer.from(`--${b}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ snippet: { videoId: vid, language: lang, name: '', isDraft: false } })}\r\n--${b}\r\ncontent-type: application/octet-stream\r\n\r\n`),
    fs.readFileSync(srt), Buffer.from(`\r\n--${b}--\r\n`)]);
  const r = await fetch('https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet', { method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/related; boundary=${b}` }, body });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
});
console.log(JSON.stringify(out, null, 1));
