/**
 * Karto & Skip (brands karto-en / karto-ar, channels created 2026-11-19) - own upload path: one long video + Shorts cut from it.
 * The daily uploader (scripts/youtube.ts) never touches these channels.
 *
 *   npx tsx scripts/youtube-karto.ts auth <en|ar>                              # OAuth consent, choose the Karto channel
 *   npx tsx scripts/youtube-karto.ts long <en|ar> --at <ISO> [--dry-run]       # long video: scheduled (private + publishAt), captions, playlist, thumbnail
 *   npx tsx scripts/youtube-karto.ts shorts <en|ar> --ids s1,s5 --at <ISO>,<ISO> [--dry-run]
 *   npx tsx scripts/youtube-karto.ts thumb <en|ar>                             # set the long video's thumbnail again (after phone verification)
 *   (every command takes --film gold for the second film; without it = the first film, GTA 6)
 *   npx tsx scripts/youtube-karto.ts list <en|ar>                            # what the channel really holds (run before any retry)
 *
 * Reads productions/<pid>/publish-kit.json and shorts/shorts-kit.json; writes productions/<pid>/youtube.json (ids, times) and
 * refuses to upload anything already recorded there. Uploads are chunked (resumable, 16 MB) because one PUT of a 1 GB file
 * times out in Node while YouTube keeps the video. No AI-generation text (shared guard); the altered-content flag is off
 * (drawn cardboard animation, nothing realistic). Secrets: secrets/youtube-oauth-client.json, data/tokens/karto-<lang>.json (never printed).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { aiHitText, aiTextFields } from '../packages/shared/src/ai-text.ts';
import { limitText, youtubeLimitIssues } from '../packages/shared/src/platform-limits.ts';

const R = path.resolve(import.meta.dirname, '..');
const CH: Record<string, { brand: string; channel: string; pid: string; lang: string }> = {
  en: { brand: 'karto-en', channel: 'UCITuHJhBjOK5Kf_LKuBAd8g', pid: 'expl-261118-p72p', lang: 'en' },
  ar: { brand: 'karto-ar', channel: 'UCkFkoox3brQuAof5n1QMUdw', pid: 'expl-261118-ddib', lang: 'ar' },
};
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/yt-analytics.readonly'];
const [cmd, which] = process.argv.slice(2);
const flag = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
const dry = process.argv.includes('--dry-run');
const c = CH[which ?? ''];
// second and later films: --film <slug> picks that film's productions (default = the first film, GTA 6)
const FILMS: Record<string, Record<string, string>> = { gold: { en: 'expl-261119-i2xn', ar: 'expl-261119-x0ki' } };
const film = flag('film');
if (c && film) { const p = FILMS[film]?.[which!]; if (!p) { console.log(`unknown --film ${film}`); process.exit(2); } c.pid = p; }
const CATEGORY: Record<string, string> = { Gaming: '20', Education: '27' };
if (!c || !['auth', 'long', 'shorts', 'thumb', 'list'].includes(cmd)) { console.log('usage: auth|long|shorts|thumb|list <en|ar> [--at ISO[,ISO]] [--ids s1,s5] [--dry-run]'); process.exit(2); }
const pdir = path.join(R, 'productions', c.pid);
const tokenFile = path.join(R, 'data', 'tokens', `${c.brand}.json`);
const stateFile = path.join(pdir, 'youtube.json');
const state: any = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : { channel: c.channel, long: null, shorts: {} };
const save = () => fs.writeFileSync(stateFile, JSON.stringify(state, null, 1), 'utf8');
const db = new DatabaseSync(path.join(R, 'data', 'studio.db'));

function client() {
  const j = JSON.parse(fs.readFileSync(path.join(R, 'secrets', 'youtube-oauth-client.json'), 'utf8')); const k = j.installed ?? j.web;
  return { id: k.client_id as string, secret: k.client_secret as string };
}
let cached: { t: string; exp: number } | null = null;
async function accessToken() {
  if (cached && cached.exp > Date.now() + 120_000) return cached.t;
  if (!fs.existsSync(tokenFile)) throw new Error(`${c.brand} is not authorized (npx tsx scripts/youtube-karto.ts auth ${which})`);
  const k = client(), { refresh_token } = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: k.id, client_secret: k.secret, refresh_token, grant_type: 'refresh_token' }) })).json() as any;
  if (!t.access_token) throw new Error(`Token refresh failed: ${t.error}`);
  cached = { t: t.access_token, exp: Date.now() + (t.expires_in ?? 3000) * 1000 };
  return cached.t;
}
async function api(method: string, url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${await accessToken()}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})) as any;
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${j.error?.message ?? r.statusText}`);
  return j;
}
async function me() {
  const j = await api('GET', 'https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true');
  const it = j.items?.[0];
  if (it?.id !== c.channel) throw new Error(`token channel "${it?.snippet?.title}" (${it?.id}) is not ${c.channel}`);
  return it;
}

async function authorize() {
  const k = client();
  const verifier = crypto.randomBytes(32).toString('base64url'), challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const st = crypto.randomBytes(8).toString('hex');
  const server = http.createServer();
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const redirect = `http://127.0.0.1:${(server.address() as any).port}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: k.id, redirect_uri: redirect, response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', state: st, code_challenge: challenge, code_challenge_method: 'S256' });
  fs.writeFileSync(path.join(R, 'data', 'logs', `karto-auth-${which}.url`), url, 'utf8');   // the consent URL holds no secret
  console.log(`AUTH_URL ${url}`);
  const code: string = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const q = new URL(req.url!, redirect).searchParams;
      res.end(q.get('code') ? 'Authorized - you can close this tab.' : 'Authorization failed.');
      server.close();
      q.get('state') !== st ? reject(new Error('state mismatch')) : q.get('code') ? resolve(q.get('code')!) : reject(new Error(q.get('error') ?? 'no code'));
    });
  });
  const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: k.id, client_secret: k.secret,
    redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }) })).json() as any;
  if (!tok.refresh_token) throw new Error(`No refresh token: ${tok.error ?? 'unknown'}`);
  fs.writeFileSync(tokenFile, JSON.stringify({ refresh_token: tok.refresh_token, scope: tok.scope, created: new Date().toISOString() }));
  try { const it = await me(); console.log(`Authorized ${c.brand}: ${it.snippet.title}`); }
  catch (e) { fs.rmSync(tokenFile); throw e; }
}

const yt = (s: string) => s.replace(/</g, '＜').replace(/>/g, '＞');
function guard(snippet: { title: string; description: string; tags: string[] }) {
  const lim = youtubeLimitIssues(snippet);
  if (lim.length) throw new Error(`YouTube limits: ${limitText(lim)}`);
  const ai = aiTextFields([{ key: 'title', text: snippet.title }, { key: 'description', text: snippet.description }, { key: 'tags', text: snippet.tags.join(' | ') }], c.brand);
  if (ai.length) throw new Error(`AI-generation text: ${aiHitText(ai)}`);
}
function when(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime()) || d.getTime() < Date.now() + 15 * 60_000) throw new Error(`--at "${s}" must be an ISO time at least 15 min ahead`);
  return d;
}

/** Resumable upload in 16 MB chunks; returns the video resource. */
async function uploadVideo(file: string, meta: unknown) {
  const size = fs.statSync(file).size;
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) }, body: JSON.stringify(meta) });
  if (!init.ok) throw new Error(`init ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const loc = init.headers.get('location')!;
  const fd = fs.openSync(file, 'r'), CHUNK = 16 * 1024 * 1024, buf = Buffer.alloc(CHUNK);
  let off = 0, fails = 0, t0 = Date.now();
  try {
    while (off < size) {
      const n = fs.readSync(fd, buf, 0, Math.min(CHUNK, size - off), off);
      let r: Response;
      try {
        r = await fetch(loc, { method: 'PUT', headers: { 'content-length': String(n), 'content-range': `bytes ${off}-${off + n - 1}/${size}` }, body: buf.subarray(0, n) });
      } catch (e: any) {
        if (++fails > 8) throw new Error(`upload stalled at ${off}/${size}: ${e?.message ?? e}`);
        await new Promise(s => setTimeout(s, 4000 * fails));
        const q = await fetch(loc, { method: 'PUT', headers: { 'content-length': '0', 'content-range': `bytes */${size}` } });
        if (q.status === 308) { const rg = q.headers.get('range'); off = rg ? Number(rg.split('-')[1]) + 1 : 0; continue; }
        if (q.ok) return await q.json() as any;
        continue;
      }
      if (r.status === 308) { const rg = r.headers.get('range'); off = rg ? Number(rg.split('-')[1]) + 1 : off + n; fails = 0;
        if (Math.floor(off / CHUNK) % 8 === 0) console.log(`  ${(off / size * 100).toFixed(0)} % (${((Date.now() - t0) / 1000).toFixed(0)} s)`); continue; }
      const j = await r.json().catch(() => ({})) as any;
      if (r.ok && j.id) return j;
      if (r.status >= 500 && ++fails <= 8) { await new Promise(s => setTimeout(s, 4000 * fails)); continue; }
      throw new Error(`upload ${r.status}: ${j.error?.message ?? ''}`);
    }
  } finally { fs.closeSync(fd); }
  throw new Error('upload ended without a video id (run list before any retry)');
}
async function setThumb(vid: string, thumb: string) {
  const tr = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}`, { method: 'POST',
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': thumb.endsWith('.png') ? 'image/png' : 'image/jpeg' }, body: fs.readFileSync(thumb) });
  if (!tr.ok) throw new Error(`${tr.status} ${(await tr.text()).replace(/\s+/g, ' ').slice(0, 160)}`);
}
function record(variant: string, vid: string, at: Date, title: string) {
  try {
    db.prepare(`INSERT OR REPLACE INTO publishing (production_id, platform, account_id, export_variant, metadata, scheduled_time, publication_status, approved_by, approved_at, external_post_id, idempotency_key)
      VALUES (?, 'youtube', ?, ?, ?, ?, 'scheduled', 'owner', datetime('now'), ?, ?)`).run(c.pid, c.channel, variant, JSON.stringify({ title }), at.toISOString(), vid, `karto:${c.pid}:${variant}`);
    db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
      .run(c.pid, `YouTube ${variant} uploaded, SCHEDULED ${at.toISOString()}: https://youtu.be/${vid}`, JSON.stringify({ video_id: vid, variant }));
  } catch (e: any) { console.log(`  (studio DB record failed: ${e?.message ?? e})`); }
}
const step = async (out: any, name: string, f: () => Promise<unknown>) => { try { out[name] = (await f()) ?? 'ok'; } catch (e: any) { out[name] = `FAILED: ${e?.message ?? e}`; } };

if (cmd === 'auth') {
  await authorize();
} else if (cmd === 'list') {
  await me();
  const up = (await api('GET', 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true')).items[0].contentDetails.relatedPlaylists.uploads;
  const items = (await api('GET', `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${up}&maxResults=50`).catch(() => ({ items: [] }))).items ?? [];
  const ids = items.map((i: any) => i.contentDetails.videoId);
  const vs = ids.length ? (await api('GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,contentDetails,statistics&id=${ids.join(',')}`)).items : [];
  console.log(JSON.stringify(vs.map((v: any) => ({ id: v.id, title: v.snippet.title, privacy: v.status.privacyStatus, publishAt: v.status.publishAt ?? null, upload: v.status.uploadStatus, dur: v.contentDetails.duration, views: v.statistics?.viewCount })), null, 1));
} else if (cmd === 'thumb') {
  if (!state.long?.id) throw new Error('no long video recorded');
  const kit = JSON.parse(fs.readFileSync(path.join(pdir, 'publish-kit.json'), 'utf8'));
  await setThumb(state.long.id, path.join(pdir, kit.thumbnail[0]));
  state.long.thumbnail = 'ok'; save(); console.log('thumbnail set');
} else if (cmd === 'long') {
  if (state.long?.id) throw new Error(`long video already uploaded: ${state.long.id} (run list)`);
  const kit = JSON.parse(fs.readFileSync(path.join(pdir, 'publish-kit.json'), 'utf8'));
  const at = when(flag('at') ?? '');
  const file = path.join(pdir, kit.video), thumb = path.join(pdir, kit.thumbnail[0]), srt = path.join(pdir, kit.subtitles);
  for (const f of [file, thumb, srt]) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  const snippet = { title: yt(kit.title), description: yt(kit.description), tags: kit.tags.map(String), categoryId: CATEGORY[kit.category] ?? '20', defaultLanguage: c.lang, defaultAudioLanguage: c.lang };
  guard(snippet);
  const ai2 = aiTextFields([{ key: 'pinned_comment', text: kit.pinned_comment }, { key: 'playlist', text: kit.playlist }], c.brand);
  if (ai2.length) throw new Error(`AI-generation text: ${aiHitText(ai2)}`);
  const meta = { snippet, status: { privacyStatus: 'private', publishAt: at.toISOString(), selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true, license: 'youtube' } };
  const ch = await me();
  if (dry) { console.log(JSON.stringify({ dry: true, channel: ch.snippet.title, size: fs.statSync(file).size, meta, thumb, srt }, null, 1)); process.exit(0); }
  const res = await uploadVideo(file, meta);
  const vid = res.id as string;
  state.long = { id: vid, url: `https://youtu.be/${vid}`, publishAt: at.toISOString(), title: snippet.title, uploaded: new Date().toISOString() }; save();
  console.log(`uploaded ${vid}`);
  const out: any = {};
  await step(out, 'thumbnail', () => setThumb(vid, thumb));
  await step(out, 'playlist', async () => {
    const pls = await api('GET', 'https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50');
    let pl = (pls.items ?? []).find((p: any) => p.snippet.title.trim() === String(kit.playlist).trim());
    if (!pl) pl = await api('POST', 'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status', { snippet: { title: kit.playlist, defaultLanguage: c.lang }, status: { privacyStatus: 'public' } });
    await api('POST', 'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', { snippet: { playlistId: pl.id, resourceId: { kind: 'youtube#video', videoId: vid } } });
    return pl.id;
  });
  await step(out, 'captions', async () => {
    const b = 'studio' + Date.now();
    const body = Buffer.concat([Buffer.from(`--${b}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ snippet: { videoId: vid, language: c.lang, name: '', isDraft: false } })}\r\n--${b}\r\ncontent-type: application/octet-stream\r\n\r\n`),
      fs.readFileSync(srt), Buffer.from(`\r\n--${b}--\r\n`)]);
    const cr = await fetch('https://www.googleapis.com/upload/youtube/v3/captions?uploadType=multipart&part=snippet', { method: 'POST',
      headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': `multipart/related; boundary=${b}` }, body });
    if (!cr.ok) throw new Error(`${cr.status} ${(await cr.text()).slice(0, 200)}`);
  });
  Object.assign(state.long, out); save();
  record('long', vid, at, snippet.title);
  console.log(JSON.stringify(state.long, null, 1));
} else if (cmd === 'shorts') {
  if (!state.long?.id) throw new Error('upload the long video first (the Shorts link to it)');
  const kit = JSON.parse(fs.readFileSync(path.join(pdir, 'shorts', 'shorts-kit.json'), 'utf8'));
  const long = JSON.parse(fs.readFileSync(path.join(pdir, 'publish-kit.json'), 'utf8'));
  const ids = (flag('ids') ?? '').split(',').filter(Boolean), ats = (flag('at') ?? '').split(',').filter(Boolean).map(when);
  if (!ids.length || ids.length !== ats.length) throw new Error('--ids and --at need the same number of entries');
  const lead = c.lang === 'ar' ? `القصة كاملة (السبع قطع): ${state.long.url}` : `The full story (all 7 pieces): ${state.long.url}`;
  await me();
  for (let i = 0; i < ids.length; i++) {
    const s = kit.shorts.find((x: any) => x.id === ids[i]);
    if (!s) throw new Error(`unknown short ${ids[i]}`);
    if (state.shorts[s.id]?.id) { console.log(`${s.id}: already uploaded ${state.shorts[s.id].id}, skipped`); continue; }
    const file = path.join(pdir, s.video);
    if (!fs.existsSync(file)) throw new Error(`missing ${file}`);
    const snippet = { title: yt(s.title), description: yt(String(s.description).includes('{{FULL_VIDEO_URL}}') ? String(s.description).replace('{{FULL_VIDEO_URL}}', lead) : `${lead}\n\n${s.description}`), tags: long.tags.slice(0, 12).map(String).concat('shorts'), categoryId: CATEGORY[long.category] ?? '20', defaultLanguage: c.lang, defaultAudioLanguage: c.lang };
    guard(snippet);
    const meta = { snippet, status: { privacyStatus: 'private', publishAt: ats[i].toISOString(), selfDeclaredMadeForKids: false, containsSyntheticMedia: false, embeddable: true, license: 'youtube' } };
    if (dry) { console.log(JSON.stringify({ dry: true, id: s.id, size: fs.statSync(file).size, meta }, null, 1)); continue; }
    const res = await uploadVideo(file, meta);
    state.shorts[s.id] = { id: res.id, url: `https://youtube.com/shorts/${res.id}`, publishAt: ats[i].toISOString(), title: snippet.title, uploaded: new Date().toISOString() }; save();
    record(`short-${s.id}`, res.id, ats[i], snippet.title);
    console.log(`${s.id}: uploaded ${res.id}, scheduled ${ats[i].toISOString()}`);
  }
}
