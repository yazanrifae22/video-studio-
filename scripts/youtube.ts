/**
 * YouTube Data API v3 uploader/scheduler (ported from the old video-automation studio's packages/youtube, merged 2026-11-02; same Google Cloud
 * OAuth "Desktop" client, same owner account). No browser automation, no file-size limit.
 *
 *   npx tsx scripts/youtube.ts status
 *   npx tsx scripts/youtube.ts auth <brand>                  # owner opens the printed URL and picks that brand channel
 *   npx tsx scripts/youtube.ts upload <brand> [--limit N] [--dry-run]
 *   npx tsx scripts/youtube.ts upload-legacy celebrity [--limit N] [--dry-run]   # legacy approved videos, plan data/celebrity-upload-plan.json
 *   npx tsx scripts/youtube.ts sync <brand|all>              # read-only: mirror every channel upload (scheduled/published) into the studio DB
 *   npx tsx scripts/youtube.ts stats <brand>                 # views + avg view % per video into data/hooks/<brand>.json
 *
 * Brands: rankings (Planet Extremes) · clipping (Mission Voices) · compilations (The Way It Was Made) · quiz-ar (شو شايف؟).
 * upload takes the brand's entries from data/publish-plan.json in order, skips anything already scheduled/published in the
 * studio DB, uploads private with publishAt = the plan slot (owner's local time → UTC), sets made-for-kids=false and
 * containsSyntheticMedia from the plan, and records each one (publishing + slots + events) for the dashboard.
 * The owner asked for all approved videos to be scheduled (2026-10-23). Stops cleanly on the daily upload cap.
 * Secrets: secrets/youtube-oauth-client.json and data/tokens/<brand>.json (both git-ignored; never print them).
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { aiHitText, aiTextFields } from '../packages/shared/src/ai-text.ts';
import { limitText, youtubeLimitIssues } from '../packages/shared/src/platform-limits.ts';

const R = path.resolve(import.meta.dirname, '..');
const CLIENT_FILE = path.join(R, 'secrets', 'youtube-oauth-client.json');
const TOKENS = path.join(R, 'data', 'tokens');
const PLAN = path.join(R, 'data', 'publish-plan.json');
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl', 'https://www.googleapis.com/auth/yt-analytics.readonly'];
const CHANNEL_IDS: Record<string, string> = { rankings: 'UCPjsW0-Bhy883CD0ZORachw', clipping: 'UCzTC21umXnyV1Tj6d5lx9ug',
  compilations: 'UC_CijmeZdzAY4EBl66xnfXA', 'quiz-ar': 'UC-ZF7rS8mQ9o6e9g0E-vhhg',
  'viral-rankings': 'UCj8LvxbqsD9tslbAaIncXVQ',
  // merged from the old explainer studio (video-automation) 2026-11-02 (animated explainer channels; same OAuth client)
  tech: 'UCp8RqP31XtjU8snoTMrUKrA', celebrity: 'UCNSxwqFWxYG2CU0c6S7xkTw', kids: 'UC94OOegtu_4mngD49Qhm2Ew',
  // test-3d visual test, three new channels created 2026-11-15 (docs/brands/test-3d/channels/); NOT in scripts/daily-uploads.ps1, skipped by `sync all`
  'parable-salt': 'UC6Axmks3MUxVg5nQhBwQH1A', 'parable-copper': 'UCwBRx8KM-9TxJscnSx0z2-Q', 'parable-brass': 'UCGLESXKMrbRXzMVzJZ7t-Iw' };
const TEST_BRANDS = new Set(['parable-salt', 'parable-copper', 'parable-brass']);
const db = new DatabaseSync(path.join(R, 'data', 'studio.db'));

function client() {
  if (!fs.existsSync(CLIENT_FILE)) return null;
  const j = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));
  const c = j.installed ?? j.web;
  return { id: c.client_id as string, secret: c.client_secret as string };
}

async function authorize(brand: string) {
  const c = client();
  if (!c) throw new Error(`Missing ${CLIENT_FILE}`);
  if (!CHANNEL_IDS[brand]) throw new Error(`unknown brand ${brand}`);
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(8).toString('hex');
  const server = http.createServer();
  await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as any).port, redirect = `http://127.0.0.1:${port}`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({ client_id: c.id, redirect_uri: redirect, response_type: 'code',
    scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', state, code_challenge: challenge, code_challenge_method: 'S256' });
  console.log(`\nOpen this URL, sign in, and choose the YouTube channel for "${brand}":\n\n${url}\n`);
  const code: string = await new Promise((resolve, reject) => {
    server.on('request', (req, res) => {
      const q = new URL(req.url!, redirect).searchParams;
      res.end(q.get('code') ? 'Authorized - you can close this tab.' : 'Authorization failed.');
      server.close();
      q.get('state') !== state ? reject(new Error('state mismatch')) : q.get('code') ? resolve(q.get('code')!) : reject(new Error(q.get('error') ?? 'no code'));
    });
  });
  const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: c.id,
    client_secret: c.secret, redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }) })).json() as any;
  if (!tok.refresh_token) throw new Error(`No refresh token: ${tok.error ?? 'unknown'}`);
  fs.mkdirSync(TOKENS, { recursive: true });
  const f = path.join(TOKENS, `${brand}.json`);
  fs.writeFileSync(f, JSON.stringify({ refresh_token: tok.refresh_token, scope: tok.scope, created: new Date().toISOString() }));
  const me = await api(brand, 'GET', 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true');
  const yt = me.items?.[0];
  if (yt?.id !== CHANNEL_IDS[brand]) {
    fs.rmSync(f);
    throw new Error(`Wrong channel picked: got "${yt?.snippet?.title}" (${yt?.id}); expected ${CHANNEL_IDS[brand]}. Run auth again and choose the right channel.`);
  }
  console.log(`Authorized ${brand}: ${yt.snippet.title}`);
}

async function accessToken(brand: string) {
  const c = client(); const f = path.join(TOKENS, `${brand}.json`);
  if (!c || !fs.existsSync(f)) throw new Error(`${brand} is not authorized (npx tsx scripts/youtube.ts auth ${brand})`);
  const { refresh_token } = JSON.parse(fs.readFileSync(f, 'utf8'));
  const t = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.id, client_secret: c.secret,
    refresh_token, grant_type: 'refresh_token' }) })).json() as any;
  if (!t.access_token) throw new Error(`Token refresh failed: ${t.error}`);
  return t.access_token as string;
}

async function api(brand: string, method: string, url: string, body?: unknown) {
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${await accessToken(brand)}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})) as any;
  if (!r.ok) throw new Error(`YouTube ${r.status}: ${j.error?.message ?? r.statusText}`);
  return j;
}

function scriptDescription(pid: string): string | null {
  try {
    const s = JSON.parse(fs.readFileSync(path.join(R, 'productions', pid, 'script.json'), 'utf8'));
    const d = s.description || s.description_ar;  // quiz-ar scripts keep it in description_ar
    return typeof d === 'string' && d.trim() ? d.replace(/</g, '＜').replace(/>/g, '＞').slice(0, 5000) : null;
  } catch { return null; }
}

/** AI-disclosure stripper (owner rule 2026-10-28: no AI-generation text in YouTube descriptions). Mirror of scripts/ai_strip.py. */
const AI_RE = /\bAI\b|AI-generated|synthetic (?:voice|narration|media|speech)|Gemini|\bTTS\b|text-to-speech|اصطناع|بالذكاء/i;
// tech (Tech Made Simple) explains AI itself: the topic word "AI" is allowed there; only AI-generation disclosure text is refused (owner rule 2026-10-28; 2026-11-03)
const AI_GEN_RE = /AI[- ]generated|generated (?:by|with) AI|synthetic (?:voice|narration|media|speech)|Gemini|\bTTS\b|text-to-speech|AI (?:voice|narrat)|اصطناع|بالذكاء/i;
/** The EXACT upload payload (title, description, tags) through the shared guard (packages/shared/src/ai-text.ts; owner 2026-11-08:
 *  never mention AI creation anywhere in the published info). null = clean, else the refusal. quiz-ar included: its synthetic-voice
 *  disclosure is the platform flag containsSyntheticMedia (status), which stays as it was - it is not text. */
/** YouTube metadata limits on the EXACT strings that would be sent (owner 2026-11-08; packages/shared/src/platform-limits.ts):
 *  title <= 100 chars, description <= 5000 bytes, no < >, tags <= 500, <= 15 hashtags. null = ok, else the refusal (field,
 *  length, limit). Checked BEFORE the old < > -> full-width swap and the .slice() caps, so nothing is changed silently. */
export function payloadLimitRefusal(snippet: { title?: string; description?: string; tags?: string[] }, id = ''): string | null {
  const iss = youtubeLimitIssues(snippet);
  return iss.length ? `YouTube metadata limits${id ? ` for ${id}` : ''}: ${limitText(iss)}; refusing (fix packaging.json / script.json, re-run python scripts/publish-plan.py; never truncated)` : null;
}
export function payloadAiRefusal(snippet: { title?: string; description?: string; tags?: string[] }, brand: string): string | null {
  const hits = aiTextFields([{ key: 'title', text: snippet.title }, { key: 'description', text: snippet.description }, ...(snippet.tags ?? []).map((t, i) => ({ key: `tags[${i}]`, text: String(t) }))], brand);
  return hits.length ? `AI-generation text in the upload payload (${aiHitText(hits)}); refusing (owner rule 2026-11-08)` : null;
}
function splitTop(s: string): string[] {
  const out: string[] = []; let depth = 0, cur = '', i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '(' || ch === '[') depth++; else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (depth === 0 && (ch === ';' || ch === '،')) {
      let j = i + 1; while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
      out.push(cur, s.slice(i, j)); cur = ''; i = j; continue;
    }
    cur += ch; i++;
  }
  out.push(cur); return out;
}
function cleanSentence(sent: string): string {
  const m = /^([\s\S]*?)([.!؟?]*)$/.exec(sent)!; const body = m[1], term = m[2];
  if (!AI_RE.test(body)) return sent;
  const parts = splitTop(body); const clauses: string[] = [], seps: string[] = [];
  parts.forEach((x, i) => (i % 2 ? seps : clauses).push(x));
  const keep = clauses.map((c, i) => ({ c, sp: seps[i] ?? '', drop: AI_RE.test(c) })).filter(x => !x.drop);
  if (!keep.length) return '';
  let out = '';
  keep.forEach((k, idx) => {
    let c = k.c.trim();
    if (idx === 0 && AI_RE.test(clauses[0])) {
      if (/^و[ء-ي]/.test(c)) c = c.slice(1); else if (/^[a-z]/.test(c)) c = c[0].toUpperCase() + c.slice(1);
    }
    out += c + (idx < keep.length - 1 ? k.sp : '');
  });
  return out.replace(/[ ;،]+$/, '') + (term || '.');
}
export function stripAi(text: string): string {
  if (!AI_RE.test(text)) return text;
  const t = text.replace(/U\.S\./g, 'U\u0001S\u0001').replace(/no AI image generation,\s*/g, '');
  const lines: string[] = [];
  for (const line of t.split('\n')) {
    if (!AI_RE.test(line)) { lines.push(line); continue; }
    const res = line.split(/(?<=[.!؟?])\s+/).map(cleanSentence).filter(x => x.trim());
    if (res.length) lines.push(res.join(' '));
  }
  let o = lines.join('\n').replace(/U\u0001S\u0001/g, 'U.S.').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  if (text[0] !== '\n') o = o.replace(/^\n+/, '');
  return o;
}

/**
 * Plan entry vs productions/<pid>/packaging.json (audit 2026-11-08 I1). publish-plan.py takes title/description/hashtags from
 * packaging.json (fallback script.json); an entry whose title differs from packaging.json chosen_title was planned before
 * packaging existed or changed: refuse that upload until `python scripts/publish-plan.py` is re-run. null = ok.
 * Only the upload path reads this; already uploaded videos (meta/replace/retitle) are never changed by it.
 */
export function packagingStale(p: { production_id: string; title?: string }, root = R): string | null {
  try {
    const f = path.join(root, 'productions', p.production_id, 'packaging.json');
    if (!fs.existsSync(f)) return null;
    const t = String(JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')).chosen_title ?? '').trim();
    if (!t) return null;
    return t.slice(0, 100) === String(p.title ?? '').trim() ? null : `plan title "${p.title}" != packaging.json chosen_title "${t}": re-run python scripts/publish-plan.py`;
  } catch (e: any) { return `packaging.json unreadable (${e.message}); fix it or re-run publish-plan.py`; }
}

/**
 * YouTube altered/synthetic-content setting (Data API v3 videos `status.containsSyntheticMedia`; owner 2026-11-08):
 * productions/<pid>/packaging.json `altered_content: true` ONLY for realistic depictions of real people/events that did not happen
 * (packaging-director decides); a packaging.json without the key = false. No packaging.json (legacy) = the plan's `altered` (old rule).
 * A platform setting, never text.
 */
export function alteredContent(p: { production_id: string; altered?: boolean; brand?: string }, root = R): boolean {
  // Rights conditions win over the packaging default: quiz-ar generated art carries condition C1
  // (docs/brands/quiz-ar/rights-review-2026-10-22.md: "platform toggle"), so quiz-ar is always flagged.
  if (p.brand === 'quiz-ar' || p.production_id.startsWith('quiz-')) return true;
  try {
    const f = path.join(root, 'productions', p.production_id, 'packaging.json');
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')).altered_content === true;
  } catch { /* unreadable packaging: packagingStale refuses the upload */ }
  return !!p.altered;
}

/** The QA'd insights title (script.json `title_proposed`), keeping the old title's #shorts tag; null = keep the old title. */
function scriptTitle(pid: string, oldTitle: string): string | null {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(R, 'productions', pid, 'script.json'), 'utf8')).title_proposed;
    if (typeof t !== 'string' || !t.trim()) return null;
    const tag = /#shorts/i.test(oldTitle) && !/#shorts/i.test(t) ? ' #shorts' : '';
    return (t.trim().slice(0, 100 - tag.length) + tag).replace(/</g, '＜').replace(/>/g, '＞');
  } catch { return null; }
}

function record(pid: string, brand: string, vid: string, day: string, hm: string, utc: string) {
  const meta = JSON.stringify({ url: `https://youtu.be/${vid}`, local_time: `${day} ${hm} PC local`, method: 'YouTube Data API (scripts/youtube.ts)' });
  db.prepare(`INSERT INTO publishing (production_id, platform, account_id, metadata, scheduled_time, publication_status, approved_by, approved_at, external_post_id, idempotency_key)
    VALUES (?,?,?,?,?,'scheduled','owner',datetime('now'),?,?) ON CONFLICT(idempotency_key) DO UPDATE SET metadata=excluded.metadata,
    scheduled_time=excluded.scheduled_time, publication_status='scheduled', external_post_id=excluded.external_post_id, error_details=NULL, updated_at=datetime('now')`)
    .run(pid, 'youtube', brand, meta, utc, vid, `youtube:${pid}`);
  db.prepare(`INSERT INTO slots (brand_id, slot_at, production_id, platforms, status, note) VALUES (?,?,?,?, 'scheduled', ?)
    ON CONFLICT(brand_id, slot_at) DO UPDATE SET production_id=excluded.production_id, status='scheduled', note=excluded.note`)
    .run(brand, utc, pid, '["youtube"]', `https://youtu.be/${vid}`);
  db.prepare(`UPDATE productions SET current_state='scheduled', updated_at=datetime('now') WHERE production_id=? AND current_state='approved'`).run(pid);
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
    .run(pid, `YouTube scheduled: ${pid} → https://youtu.be/${vid} at ${day} ${hm} (local)`, JSON.stringify({ production_id: pid }));
}

/* ---------- front insert (owner 2026-11-08, Podium Pop) ----------
 * config/publish-times.json <brand>.front_insert = true: each newly approved upload takes the earliest scheduled slot that is
 * >= now + YT_FRONT_LEAD_MIN (default 90) min and later than its own plan slot is NOT; the video in that slot moves to the new
 * video's plan slot (the newest time). Videos that were themselves front-inserted are never bumped (metadata.front=true),
 * so fresh approvals keep their early slot. `upload <brand> --no-front` disables it for one run. */
function frontInsertOn(brand: string): boolean {
  try { return !!JSON.parse(fs.readFileSync(path.join(R, 'config', 'publish-times.json'), 'utf8'))[brand]?.front_insert; } catch { return false; }
}
function localParts(d: Date) {
  const l = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString();
  return { day: l.slice(0, 10), hm: l.slice(11, 16) };
}
function frontSlot(brand: string, planAt: Date, skip: Set<string>): { pid: string; vid: string; at: string } | null {
  const lead = Number(process.env.YT_FRONT_LEAD_MIN ?? 90) * 60_000;
  const rows = db.prepare(`SELECT p.production_id pid, p.external_post_id vid, p.scheduled_time t, p.metadata m FROM publishing p JOIN productions d USING(production_id)
    WHERE p.platform='youtube' AND d.brand_id=? AND p.publication_status='scheduled' AND p.external_post_id IS NOT NULL ORDER BY p.scheduled_time`).all(brand) as any[];
  for (const r of rows) {
    const t = new Date(r.t);
    if (isNaN(+t) || +t < Date.now() + lead || skip.has(r.pid)) continue;
    let m: any = {}; try { m = JSON.parse(r.m || '{}'); } catch { /* */ }
    if (m.front) continue;  // a fresh approval that already jumped the queue
    if (+t >= +planAt) return null;  // its own slot is already the earliest
    return { pid: r.pid, vid: r.vid, at: t.toISOString() };
  }
  return null;
}
function markFront(pid: string) {
  const r = db.prepare(`SELECT metadata FROM publishing WHERE platform='youtube' AND production_id=?`).get(pid) as any;
  let m: any = {}; try { m = JSON.parse(r?.metadata || '{}'); } catch { /* */ }
  m.front = true;
  db.prepare(`UPDATE publishing SET metadata=? WHERE platform='youtube' AND production_id=?`).run(JSON.stringify(m), pid);
}
async function moveScheduled(brand: string, pid: string, vid: string, at: Date) {
  const v = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=status&id=${vid}`)).items?.[0];
  if (!v) throw new Error(`${vid} not found on ${brand}`);
  if (v.status.privacyStatus !== 'private' || !v.status.publishAt) throw new Error(`${vid} is not a scheduled video (${v.status.privacyStatus})`);
  const { privacyStatus, selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } = v.status;
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=status', { id: vid,
    status: { privacyStatus, publishAt: at.toISOString(), selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } });
  const l = localParts(at);
  record(pid, brand, vid, l.day, l.hm, at.toISOString());
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
    .run(pid, `YouTube front insert: ${pid} moved to ${l.day} ${l.hm} (local) to make room for a new approval`, JSON.stringify({ production_id: pid }));
}
/** keep data/publish-plan.json (dashboard calendar) in step: the new pid gets the early slot, the bumped pid the plan slot. */
function planSwap(newPid: string, earlyUtc: string, oldPid: string, planAt: Date) {
  try {
    const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8')) as any[];
    const e = localParts(new Date(earlyUtc)), n = localParts(planAt);
    for (const p of plan) {
      if (p.production_id === newPid) { p.date = e.day; p.time = e.hm; }
      else if (p.production_id === oldPid) { p.date = n.day; p.time = n.hm; }
    }
    fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1) + '\n', 'utf8');
  } catch (err) { console.error('planSwap: publish-plan.json not updated', err); }
}

async function uploadBrand(brand: string, limit: number, dryRun: boolean) {
  const plan = (JSON.parse(fs.readFileSync(PLAN, 'utf8')) as any[]).filter(p => p.brand === brand);
  const done = new Set((db.prepare(`SELECT production_id FROM publishing WHERE platform='youtube' AND publication_status IN ('scheduled','published')`).all() as any[]).map(r => r.production_id));
  // never upload a production the studio has not approved (2026-11-01: an approve call was refused but the upload still ran)
  const approved = new Set((db.prepare(`SELECT production_id FROM productions WHERE approval_status='approved'`).all() as any[]).map(r => r.production_id));
  const todo = plan.filter(p => !done.has(p.production_id) && approved.has(p.production_id)).slice(0, limit);
  const out: any[] = [];
  const front = frontInsertOn(brand) && !process.argv.includes('--no-front');
  const frontDone = new Set<string>();
  for (const p of todo) {
    const publishAt = new Date(`${p.date}T${p.time}:00`);  // owner's local time (this PC)
    if (brand !== 'quiz-ar' && (brand === 'tech' ? AI_GEN_RE : AI_RE).test(`${p.title}
${p.description}`)) { out.push({ id: p.production_id, error: 'AI-generation text present in title/description; refusing' }); continue; }  // owner 2026-11-02
    if (publishAt.getTime() < Date.now() + 4 * 60_000) { out.push({ id: p.production_id, skipped: `slot ${p.date} ${p.time} is in the past or too close` }); continue; }
    if (!p.file || !fs.existsSync(p.file)) { out.push({ id: p.production_id, skipped: 'render file missing (legacy productions go through upload-legacy)' }); continue; }  // 2026-11-08 celebrity revival
    const stale = packagingStale(p);  // audit 2026-11-08 I1: the packaged title must reach YouTube (plan built before packaging.json -> rebuild the plan)
    if (stale) { out.push({ id: p.production_id, error: stale }); continue; }
    const limRef = payloadLimitRefusal({ title: p.title, description: p.description, tags: Array.isArray(p.tags) ? p.tags.map(String) : [] }, p.production_id);
    if (limRef) { out.push({ id: p.production_id, error: limRef }); continue; }
    const yt = (s: string) => s.replace(/</g, '＜').replace(/>/g, '＞');
    const meta = { snippet: { title: yt(p.title).slice(0, 100), description: yt(p.description).slice(0, 5000), categoryId: brand === 'quiz-ar' || brand === 'viral-rankings' ? '24' : '28',
        defaultLanguage: brand === 'quiz-ar' ? 'ar' : 'en', ...(Array.isArray(p.tags) && p.tags.length ? { tags: p.tags.map(String).slice(0, 15) } : {}) },
      status: { privacyStatus: 'private', publishAt: publishAt.toISOString(), selfDeclaredMadeForKids: brand === 'kids', containsSyntheticMedia: alteredContent(p), embeddable: true, license: 'youtube' } };
    // the exact payload through the shared guard, every brand incl. quiz-ar (owner 2026-11-08); dry runs report it too
    const aiRef = payloadAiRefusal(meta.snippet as any, brand);
    if (aiRef) { out.push({ id: p.production_id, error: aiRef }); continue; }
    // front insert (owner 2026-11-08): the new video takes the EARLIEST upcoming slot; the video holding it moves to this plan slot (the newest)
    const swap = front ? frontSlot(brand, publishAt, frontDone) : null;
    if (swap) meta.status.publishAt = swap.at;
    if (dryRun) { out.push({ id: p.production_id, at: `${p.date} ${p.time}`, publishAt: meta.status.publishAt, title: p.title, ...(swap ? { front_insert: { takes: swap.at, bumps: swap.pid, bumped_to: publishAt.toISOString() } } : {}) }); continue; }
    const file = p.file;
    const size = fs.statSync(file).size;
    const token = await accessToken(brand);
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) },
      body: JSON.stringify(meta) });
    if (!init.ok) { const t = await init.text(); out.push({ id: p.production_id, error: `init ${init.status}: ${t.slice(0, 300)}` }); break; }
    const up = await fetch(init.headers.get('location')!, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file) });
    const res = await up.json().catch(() => ({})) as any;
    if (!up.ok) { out.push({ id: p.production_id, error: `upload ${up.status}: ${res.error?.message ?? ''}` }); break; }
    if (swap) {
      const nl = localParts(new Date(swap.at));
      record(p.production_id, brand, res.id, nl.day, nl.hm, swap.at);
      markFront(p.production_id);
      frontDone.add(p.production_id);
      let moved = 'ok';
      try { await moveScheduled(brand, swap.pid, swap.vid, publishAt); }
      catch (e: any) { moved = `FAILED: ${e?.message ?? e} (both videos now share ${swap.at}; move ${swap.vid} by hand with reschedule)`; }
      planSwap(p.production_id, swap.at, swap.pid, publishAt);
      out.push({ id: p.production_id, video: `https://youtu.be/${res.id}`, at: `${nl.day} ${nl.hm}`, front_insert: { bumped: swap.pid, bumped_to: `${p.date} ${p.time}`, moved } });
      console.log(`scheduled ${p.production_id} → https://youtu.be/${res.id} at ${nl.day} ${nl.hm} (front insert; ${swap.pid} → ${p.date} ${p.time}: ${moved})`);
      continue;
    }
    record(p.production_id, brand, res.id, p.date, p.time, publishAt.toISOString());
    out.push({ id: p.production_id, video: `https://youtu.be/${res.id}`, at: `${p.date} ${p.time}` });
    console.log(`scheduled ${p.production_id} → https://youtu.be/${res.id} at ${p.date} ${p.time}`);
  }
  return { brand, attempted: todo.length, results: out };
}

/** Legacy approved videos (celebrity, merged 2026-11-02): files + upload.json from data/legacy/.../pending-uploads, gate = DB approval_status='approved'.
 *  Slots: next free grid slot (config/publish-times.json) >= now+90 min, skipping slots reserved for date-bound videos in data/<brand>-upload-plan.json.
 *  Quota: one Cloud project (10,000 units/day, reset midnight Pacific); an upload = 1,600; Podium Pop reserves 4/day = 6,400 -> max 2/day here.
 *  Exit code 3 = nothing left (the Task Scheduler wrapper then removes its own task). */
function tzUtc(day: string, hm: string, tz: string): Date {
  const [y, mo, d] = day.split('-').map(Number), [h, mi] = hm.split(':').map(Number);
  const want = Date.UTC(y, mo - 1, d, h, mi);
  let t = want;
  for (let k = 0; k < 2; k++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
      .formatToParts(new Date(t)).map(x => [x.type, Number(x.value)]));
    t += want - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  }
  return new Date(t);
}
async function uploadLegacy(brand: string, limit: number, dryRun: boolean) {
  const PL = path.join(R, 'data', `${brand}-upload-plan.json`), LEDGER = path.join(R, 'data', `${brand}-upload-ledger.json`);
  const plan = JSON.parse(fs.readFileSync(PL, 'utf8'));
  const times = JSON.parse(fs.readFileSync(path.join(R, 'config', 'publish-times.json'), 'utf8'))[brand];
  const tz: string = times.audience_tz, grid: string[] = times.times;
  const pac = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());  // quota day
  const ledger: Record<string, number> = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : {};
  const maxDay = Number(process.env.YT_LEGACY_MAX_PER_DAY ?? 2);
  const done = new Set((db.prepare(`SELECT production_id FROM publishing WHERE platform='youtube' AND publication_status IN ('scheduled','published')`).all() as any[]).map(r => r.production_id));
  const approved = new Set((db.prepare(`SELECT production_id FROM productions WHERE approval_status='approved' AND brand_id=?`).all(brand) as any[]).map(r => r.production_id));
  const todo: string[] = (plan.queue as string[]).filter(p => !done.has(p) && approved.has(p));
  const out: any[] = [];
  if (!todo.length) { console.log(JSON.stringify({ brand, remaining: 0, results: out, finished: true })); return 3; }
  const taken = new Set((db.prepare(`SELECT slot_at FROM slots WHERE brand_id=? AND status!='moved'`).all(brand) as any[]).map(r => r.slot_at));
  for (const r of db.prepare(`SELECT scheduled_time t FROM publishing p JOIN productions d USING(production_id) WHERE p.platform='youtube' AND d.brand_id=? AND p.publication_status='scheduled'`).all(brand) as any[]) { const d = new Date(r.t); if (!isNaN(+d)) taken.add(d.toISOString()); }
  const reserved = new Map<string, string>(Object.entries(plan.reserved_et ?? {}).map(([pid, v]) => { const [d, h] = (v as string).split('T'); return [tzUtc(d, h, tz).toISOString(), pid]; }));
  const budget = Math.max(0, Math.min(limit, maxDay - (ledger[pac] ?? 0)));
  let used = 0, code = 0;
  for (const pid of todo) {
    if (used >= budget) break;
    const prod = db.prepare(`SELECT data FROM productions WHERE production_id=?`).get(pid) as any;
    const pd = JSON.parse(prod.data), up = JSON.parse(fs.readFileSync(pd.upload_json, 'utf8'));
    let at: Date | null = null;
    const myRes = [...reserved.entries()].find(([, p]) => p === pid)?.[0];
    if (myRes) at = new Date(myRes);
    else {
      const minT = Date.now() + 90 * 60_000;
      for (let k = 0; k < 120 && !at; k++) {
        const day = new Date(Date.now() + k * 864e5).toLocaleDateString('en-CA', { timeZone: tz });
        for (const hm of grid) { const u = tzUtc(day, hm, tz); if (u.getTime() >= minT && !taken.has(u.toISOString()) && !reserved.has(u.toISOString())) { at = u; break; } }
      }
    }
    if (!at || at.getTime() < Date.now() + 15 * 60_000) { out.push({ id: pid, skipped: 'no valid slot' }); continue; }
    const dl = plan.deadline_utc?.[pid]; if (dl && at.getTime() > Date.parse(dl)) { out.push({ id: pid, error: `slot ${at.toISOString()} after deadline ${dl}` }); code = 1; break; }
    const local = new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString();
    const yt = (x: string) => x.replace(/</g, '＜').replace(/>/g, '＞');
    if (AI_RE.test(`${up.title}\n${up.description}\n${(up.tags ?? []).join(' ')}`)) { out.push({ id: pid, error: 'AI text still present; refusing' }); code = 1; break; }
    { const lim = payloadLimitRefusal({ title: String(up.title ?? ''), description: String(up.description ?? ''), tags: (up.tags ?? []).map(String) }, pid); if (lim) { out.push({ id: pid, error: lim }); code = 1; break; } }  // owner 2026-11-08 YouTube limits
    { const lr = payloadAiRefusal({ title: yt(String(up.title ?? '')).slice(0, 100), description: yt(String(up.description ?? '')).slice(0, 5000), tags: (up.tags ?? []).slice(0, 15).map(String) }, brand); if (lr) { out.push({ id: pid, error: lr }); code = 1; break; } }  // shared guard on the exact payload (owner 2026-11-08)
    if (dryRun) { out.push({ id: pid, publishAt: at.toISOString(), title: up.title }); taken.add(at.toISOString()); used++; continue; }
    const meta = { snippet: { title: yt(up.title).slice(0, 100), description: yt(up.description).slice(0, 5000), tags: (up.tags ?? []).slice(0, 15), categoryId: '24', defaultLanguage: 'en' },
      status: { privacyStatus: 'private', publishAt: at.toISOString(), selfDeclaredMadeForKids: false, containsSyntheticMedia: true, embeddable: true, license: 'youtube' } };
    const size = fs.statSync(pd.file).size;
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
      headers: { authorization: `Bearer ${await accessToken(brand)}`, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) }, body: JSON.stringify(meta) });
    if (!init.ok) { const t = await init.text(); out.push({ id: pid, error: `init ${init.status}: ${t.slice(0, 300)}` }); code = 1; break; }
    const upr = await fetch(init.headers.get('location')!, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(pd.file), signal: AbortSignal.timeout(15 * 60_000) });
    const res = await upr.json().catch(() => ({})) as any;
    if (!upr.ok || !res.id) { out.push({ id: pid, error: `upload ${upr.status}: ${res.error?.message ?? ''}` }); code = 1; break; }
    ledger[pac] = (ledger[pac] ?? 0) + 1; fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1));
    record(pid, brand, res.id, local.slice(0, 10), local.slice(11, 16), at.toISOString());
    taken.add(at.toISOString()); used++;
    try {  // publish-plan.json entry (plan readers); a regenerated plan omits already-scheduled items, the DB rows stay the record
      const pp = JSON.parse(fs.readFileSync(PLAN, 'utf8')) as any[];
      if (!pp.some(x => x.production_id === pid)) { pp.push({ production_id: pid, brand, title: up.title, date: local.slice(0, 10), time: local.slice(11, 16), file: pd.file, altered: true, youtube_id: res.id, publish_at: at.toISOString(), legacy: true }); fs.writeFileSync(PLAN, JSON.stringify(pp, null, 1)); }
    } catch { /* plan optional */ }
    out.push({ id: pid, video: res.id, publishAt: at.toISOString() });
    console.log(`scheduled ${pid} -> https://youtu.be/${res.id} at ${at.toISOString()}`);
  }
  const left = todo.length - out.filter(o => o.video).length;
  console.log(JSON.stringify({ brand, pacificDay: pac, uploadedToday: ledger[pac] ?? 0, cap: maxDay, remaining: left, results: out }, null, 1));
  return code || (left === 0 && !dryRun ? 3 : 0);
}

/** Read-only sync of every channel upload (full pagination) into the studio: publishing row + legacy production when none matches. Idempotent. */
async function syncBrand(brand: string) {
  const ch = await api(brand, 'GET', 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true');
  const upl = ch.items[0].contentDetails.relatedPlaylists.uploads;
  const ids: string[] = []; let tok = '';
  do {
    const r = await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${upl}${tok ? `&pageToken=${tok}` : ''}`);
    for (const i of r.items ?? []) ids.push(i.contentDetails.videoId);
    tok = r.nextPageToken ?? '';
  } while (tok);
  const vids: any[] = [];
  for (let i = 0; i < ids.length; i += 50) vids.push(...((await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${ids.slice(i, i + 50).join(',')}`)).items ?? []));
  const fmt = (db.prepare(`SELECT format FROM brands WHERE id=?`).get(brand) as any)?.format ?? 'short';
  const norm = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const prods = db.prepare(`SELECT production_id, title, created_at FROM productions WHERE brand_id=?`).all(brand) as any[];
  const byTitle = new Map<string, string>(); for (const p of prods) byTitle.set(norm(p.title), p.production_id);
  const byVid = new Map<string, string>();
  for (const r of db.prepare(`SELECT production_id, external_post_id FROM publishing WHERE platform='youtube' AND external_post_id IS NOT NULL`).all() as any[]) byVid.set(r.external_post_id, r.production_id);
  const n = { total: vids.length, scheduled: 0, published: 0, skipped: 0, created: 0, matched: 0 };
  for (const v of vids) {
    const pv = v.status.privacyStatus, pa = v.status.publishAt ? new Date(v.status.publishAt) : null;
    const isSched = pv === 'private' && pa && +pa > Date.now(), isPub = pv !== 'private' || (pa && +pa <= Date.now());
    const when = isSched ? pa! : new Date(v.snippet.publishedAt);
    if (!isSched && !isPub) { n.skipped++; continue; }  // private draft without a schedule
    const status = isSched ? 'scheduled' : 'published'; isSched ? n.scheduled++ : n.published++;
    let pid = byVid.get(v.id);
    if (!pid) {  // title match only for a production not yet linked to another video and created before this upload (2026-11-03: Sunny Hill Ep 1 got linked to an older short with the same title and was never uploaded)
      const t = byTitle.get(norm(v.snippet.title));
      const pr = t ? prods.find((x: any) => x.production_id === t) : undefined;
      const linked = t ? [...byVid.values()].includes(t) : false;
      const created = pr?.created_at ? new Date(String(pr.created_at).replace(' ', 'T') + 'Z') : null;
      if (t && !linked && (!created || created <= new Date(v.snippet.publishedAt))) pid = t;
    }
    if (pid) n.matched++;
    else {
      pid = `yt-${v.id}`;
      db.prepare(`INSERT OR IGNORE INTO productions (production_id, brand_id, format, title, current_state, approval_status, data) VALUES (?,?,?,?,?,'approved',?)`)
        .run(pid, brand, fmt, String(v.snippet.title).slice(0, 200), status, JSON.stringify({ legacy: true, source: 'youtube-sync', youtube_id: v.id }));
      n.created++;
    }
    const meta = JSON.stringify({ url: `https://youtu.be/${v.id}`, source: 'youtube-sync', privacy: pv, title: v.snippet.title });
    db.prepare(`INSERT INTO publishing (production_id, platform, account_id, metadata, scheduled_time, publication_status, approved_by, approved_at, external_post_id, idempotency_key)
      VALUES (?,?,?,?,?,?,'youtube-sync',datetime('now'),?,?) ON CONFLICT(idempotency_key) DO UPDATE SET metadata=excluded.metadata,
      scheduled_time=excluded.scheduled_time, publication_status=excluded.publication_status, external_post_id=excluded.external_post_id, updated_at=datetime('now')`)
      .run(pid, 'youtube', brand, meta, when.toISOString(), status, v.id, `youtube:${pid}`);
    if (isSched) db.prepare(`INSERT INTO slots (brand_id, slot_at, production_id, platforms, status, note) VALUES (?,?,?,?, 'scheduled', ?)
      ON CONFLICT(brand_id, slot_at) DO NOTHING`).run(brand, when.toISOString(), pid, '["youtube"]', `https://youtu.be/${v.id}`);
    else db.prepare(`UPDATE productions SET current_state='published' WHERE production_id=? AND current_state IN ('approved','scheduled')`).run(pid);
  }
  return { brand, ...n };
}

const [cmd, arg] = process.argv.slice(2);
const flag = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? undefined : (process.argv[i + 1] ?? 'true'); };
// owner 2026-11-08: "don't update any existing description on any channel" — commands that rewrite a LIVE video's description are locked.
if (['meta', 'desc-clean', 'adopt'].includes(cmd ?? '')) {
  throw new Error(`youtube.ts ${cmd}: locked — owner rule 2026-11-08: descriptions of uploaded videos are never edited (any channel). New uploads only.`);
}
if (cmd === 'status') {
  console.log(JSON.stringify({ clientConfigured: !!client(), channels: Object.keys(CHANNEL_IDS).map(b => ({ brand: b, authorized: fs.existsSync(path.join(TOKENS, `${b}.json`)) })) }, null, 1));
} else if (cmd === 'list') {
  // what is already on the channel (drafts and scheduled included): title, status, publishAt
  const ch = await api(arg, 'GET', 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true');
  const up = ch.items[0].contentDetails.relatedPlaylists.uploads;
  const items = (await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${up}`)).items ?? [];
  const ids = items.map((i: any) => i.contentDetails.videoId).join(',');
  const vids = ids ? (await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${ids}`)).items : [];
  console.log(JSON.stringify(vids.map((v: any) => ({ id: v.id, title: v.snippet.title, privacy: v.status.privacyStatus, publishAt: v.status.publishAt ?? null, upload: v.status.uploadStatus })), null, 1));
} else if (cmd === 'sync') {
  const bs = arg === 'all' || !arg ? Object.keys(CHANNEL_IDS).filter(b => !TEST_BRANDS.has(b)) : [arg];
  for (const b of bs) { try { console.log(JSON.stringify(await syncBrand(b))); } catch (e: any) { console.log(JSON.stringify({ brand: b, error: String(e.message).slice(0, 160) })); } }
} else if (cmd === 'views') {
  // every upload on the channel with views/likes/comments + average view % (Analytics), into data/youtube-stats/<brand>.json
  const ch = await api(arg, 'GET', 'https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&mine=true');
  const up = ch.items[0].contentDetails.relatedPlaylists.uploads, vids: any[] = [];
  let page = '';
  do {
    const pl = await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${up}${page ? `&pageToken=${page}` : ''}`);
    const ids = (pl.items ?? []).map((i: any) => i.contentDetails.videoId).join(',');
    if (ids) vids.push(...(await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics&id=${ids}`)).items ?? []);
    page = pl.nextPageToken ?? '';
  } while (page);
  const an: Record<string, any[]> = {}, now = new Date().toISOString();
  let note: string | null = null;
  try {
    const pub = vids.filter(v => v.status.privacyStatus === 'public');
    const start = pub.map(v => v.snippet.publishedAt.slice(0, 10)).sort()[0] ?? now.slice(0, 10);
    for (let i = 0; i < pub.length; i += 200) {
      const rep = await api(arg, 'GET', `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${now.slice(0, 10)}` +
        `&dimensions=video&filters=video==${pub.slice(i, i + 200).map(v => v.id).join(',')}&metrics=views,averageViewPercentage,averageViewDuration&sort=-views&maxResults=200`);
      for (const r of rep.rows ?? []) an[r[0]] = r;
    }
  } catch (e: any) { note = `analytics: ${e.message}`; }
  const rows = [...new Map(vids.map(v => [v.id, v])).values()].map(v => ({ id: v.id, title: v.snippet.title, privacy: v.status.privacyStatus, publishedAt: v.snippet.publishedAt, publishAt: v.status.publishAt ?? null,
    views: Number(v.statistics?.viewCount ?? 0), likes: Number(v.statistics?.likeCount ?? 0), comments: Number(v.statistics?.commentCount ?? 0),
    avg_view_pct: an[v.id] ? +Number(an[v.id][2]).toFixed(1) : null, avg_view_dur_s: an[v.id] ? +Number(an[v.id][3]).toFixed(1) : null }))
    .sort((a, b) => b.views - a.views);
  const out = { brand: arg, fetched: now, channel: ch.items[0].statistics, videos: rows, note };
  fs.mkdirSync(path.join(R, 'data', 'youtube-stats'), { recursive: true });
  fs.writeFileSync(path.join(R, 'data', 'youtube-stats', `${arg}.json`), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ brand: arg, subscribers: ch.items[0].statistics.subscriberCount, videos: rows.length, total_views: rows.reduce((n, v) => n + v.views, 0), note }));
} else if (cmd === 'adopt') {
  // finish a draft that was already uploaded (e.g. through Studio): apply the plan's metadata + schedule, then record it
  const [, brand, pid, vid] = process.argv.slice(2);
  const p = (JSON.parse(fs.readFileSync(PLAN, 'utf8')) as any[]).find(x => x.production_id === pid);
  if (!p) throw new Error(`${pid} not in plan`);
  const publishAt = new Date(`${p.date}T${p.time}:00`);
  const yt = (s: string) => s.replace(/</g, '＜').replace(/>/g, '＞');
  const aiRef = payloadAiRefusal({ title: yt(p.title).slice(0, 100), description: yt(p.description).slice(0, 5000) }, brand);
  if (aiRef) throw new Error(aiRef);
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=snippet,status', { id: vid,
    snippet: { title: yt(p.title).slice(0, 100), description: yt(p.description).slice(0, 5000), categoryId: brand === 'quiz-ar' ? '24' : '28', defaultLanguage: brand === 'quiz-ar' ? 'ar' : 'en' },
    status: { privacyStatus: 'private', publishAt: publishAt.toISOString(), selfDeclaredMadeForKids: brand === 'kids', containsSyntheticMedia: alteredContent(p), embeddable: true, license: 'youtube' } });
  record(pid, brand, vid, p.date, p.time, publishAt.toISOString());
  console.log(`adopted ${pid} → https://youtu.be/${vid} at ${p.date} ${p.time}`);
} else if (cmd === 'replace') {
  // swap a scheduled video for a rebuilt render: copy the old video's metadata + publishAt onto a fresh upload, then delete the old one
  const [, brand, pid, oldVid, file] = process.argv.slice(2);
  const old = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${oldVid}`)).items?.[0];
  if (!old) throw new Error(`${oldVid} not found on ${brand}`);
  if (old.status.privacyStatus === 'public') throw new Error(`${oldVid} is already public; not replacing a live video`);
  const publishAt = old.status.publishAt as string | undefined;
  if (!publishAt || new Date(publishAt).getTime() < Date.now() + 15 * 60_000) throw new Error(`${oldVid} publishAt ${publishAt} is missing or too close`);
  const { title, tags, categoryId, defaultLanguage } = old.snippet;
  // a rebuild may change "About this edit"/credits: the description follows the production's script.json when it has one
  const description = scriptDescription(pid) ?? old.snippet.description;
  { const lim = payloadLimitRefusal({ title: scriptTitle(pid, title) ?? title, description, tags: (tags ?? []).map(String) }, pid); if (lim) throw new Error(lim); }  // owner 2026-11-08 YouTube limits
  const meta = { snippet: { title: scriptTitle(pid, title) ?? title, description, tags, categoryId, defaultLanguage },
    status: { privacyStatus: 'private', publishAt, selfDeclaredMadeForKids: brand === 'kids', containsSyntheticMedia: old.status.containsSyntheticMedia ?? true, embeddable: true, license: 'youtube' } };
  const size = fs.statSync(file).size;
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(brand)}`, 'content-type': 'application/json', 'x-upload-content-type': 'video/mp4', 'x-upload-content-length': String(size) },
    body: JSON.stringify(meta) });
  if (!init.ok) throw new Error(`init ${init.status}: ${(await init.text()).slice(0, 300)}`);
  const up = await fetch(init.headers.get('location')!, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size) }, body: fs.readFileSync(file) });
  const res = await up.json().catch(() => ({})) as any;
  if (!up.ok) throw new Error(`upload ${up.status}: ${res.error?.message ?? ''}`);
  // the old upload is not deleted (owner deletes it in Studio): unschedule it (private, no publishAt) and mark the title
  const del = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', { method: 'PUT',
    headers: { authorization: `Bearer ${await accessToken(brand)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id: oldVid, snippet: { title: `[REPLACED] ${title}`.slice(0, 100), description: old.snippet.description, tags, categoryId, defaultLanguage },
      status: { privacyStatus: 'private', selfDeclaredMadeForKids: brand === 'kids', embeddable: true, license: 'youtube' } }) });
  const local = new Date(publishAt), pad = (n: number) => String(n).padStart(2, '0');
  record(pid, brand, res.id, `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`, `${pad(local.getHours())}:${pad(local.getMinutes())}`, publishAt);
  console.log(JSON.stringify({ pid, old: oldVid, oldUnscheduled: del.ok, new: `https://youtu.be/${res.id}`, publishAt }));
} else if (cmd === 'thumb') {
  // set a custom thumbnail on an uploaded video: thumb <brand> <videoId> <png|jpg>
  const [, brand, vid, file] = process.argv.slice(2);
  const tr = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${vid}`, { method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(brand)}`, 'content-type': file.endsWith('.png') ? 'image/png' : 'image/jpeg' }, body: fs.readFileSync(file) });
  console.log(JSON.stringify({ vid, status: tr.status, ok: tr.ok, error: tr.ok ? undefined : (await tr.text()).slice(0, 300) }));
} else if (cmd === 'reschedule') {
  // move a scheduled (private + publishAt) video to a new slot; utc = ISO time, e.g. 2026-10-28T16:00:00Z
  const [, brand, pid, vid, utc] = process.argv.slice(2);
  const at = new Date(utc);
  const minLead = Math.max(5, Number(process.env.YT_MIN_LEAD_MIN ?? 15));  // owner may ask for a slot ~10 min out
  if (isNaN(at.getTime()) || at.getTime() < Date.now() + minLead * 60_000) throw new Error(`bad or too-close slot ${utc}`);
  const v = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=status&id=${vid}`)).items?.[0];
  if (!v) throw new Error(`${vid} not found on ${brand}`);
  if (v.status.privacyStatus !== 'private' || !v.status.publishAt) throw new Error(`${vid} is not a scheduled video (${v.status.privacyStatus})`);
  const { privacyStatus, selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } = v.status;
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=status', { id: vid,
    status: { privacyStatus, publishAt: at.toISOString(), selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } });
  db.prepare(`UPDATE slots SET status='moved' WHERE brand_id=? AND production_id=? AND slot_at<>?`).run(brand, pid, at.toISOString());
  const local = new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString();
  record(pid, brand, vid, local.slice(0, 10), local.slice(11, 16), at.toISOString());
  console.log(JSON.stringify({ pid, vid, publishAt: at.toISOString() }));
} else if (cmd === 'unschedule') {
  // pull a scheduled video back to plain private (no publishAt) and free its slot; the upload stays (re-schedule with `reschedule`)
  const [, brand, pid, vid] = process.argv.slice(2);
  const v = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=status&id=${vid}`)).items?.[0];
  if (!v) throw new Error(`${vid} not found on ${brand}`);
  if (v.status.privacyStatus === 'public') throw new Error(`${vid} is already public`);
  const { selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } = v.status;
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=status', { id: vid,
    status: { privacyStatus: 'private', selfDeclaredMadeForKids, containsSyntheticMedia, embeddable, license, publicStatsViewable } });
  db.prepare(`UPDATE publishing SET publication_status='unscheduled', updated_at=datetime('now') WHERE platform='youtube' AND production_id=? AND external_post_id=?`).run(pid, vid);
  db.prepare(`DELETE FROM slots WHERE brand_id=? AND production_id=?`).run(brand, pid);
  db.prepare(`UPDATE productions SET current_state='qa', updated_at=datetime('now') WHERE production_id=? AND current_state='scheduled'`).run(pid);
  console.log(JSON.stringify({ pid, vid, unscheduled: true }));
} else if (cmd === 'delete-vid') {
  // owner-requested removal of one orphan video id only (no production/slot changes)
  const [, brand, vid] = process.argv.slice(2);
  if (!brand || !vid) throw new Error('usage: delete-vid <brand> <videoId>');
  const live = db.prepare(`SELECT production_id FROM publishing WHERE external_post_id=? AND publication_status!='deleted'`).get(vid) as any;
  if (live) throw new Error(`${vid} is the live upload of ${live.production_id}; use delete instead`);
  await api(brand, 'DELETE', `https://www.googleapis.com/youtube/v3/videos?id=${vid}`);
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',NULL,'warn',?,?)`)
    .run(`YouTube deleted orphan ${vid} (owner OK)`, JSON.stringify({ vid }));
  console.log(JSON.stringify({ vid, deleted: true }));
} else if (cmd === 'delete') {
  // owner-requested removal: delete the YouTube video, free its slot, mark the production rejected so publish-plan never re-adds it
  const [, brand, pid] = process.argv.slice(2);
  const row = db.prepare(`SELECT external_post_id vid FROM publishing WHERE platform='youtube' AND account_id=? AND production_id=? AND external_post_id IS NOT NULL`).get(brand, pid) as any;
  if (!row) throw new Error(`${pid}: no YouTube upload recorded for ${brand}`);
  await api(brand, 'DELETE', `https://www.googleapis.com/youtube/v3/videos?id=${row.vid}`);
  const note = flag('note') ?? 'owner asked to delete';
  db.prepare(`UPDATE publishing SET publication_status='deleted', error_details=?, updated_at=datetime('now') WHERE platform='youtube' AND production_id=?`).run(note, pid);
  db.prepare(`DELETE FROM slots WHERE brand_id=? AND production_id=?`).run(brand, pid);
  db.prepare(`UPDATE productions SET current_state='rejected', approval_status='rejected', updated_at=datetime('now') WHERE production_id=?`).run(pid);
  db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'warn',?,?)`)
    .run(pid, `YouTube deleted: ${pid} (${row.vid}) - ${note}`, JSON.stringify({ production_id: pid, vid: row.vid }));
  console.log(JSON.stringify({ pid, vid: row.vid, deleted: true }));
} else if (cmd === 'meta') {
  // re-sync an uploaded video's description + title_proposed from productions/<pid>/script.json (schedule and status untouched)
  const [, brand, pid, vid] = process.argv.slice(2);
  const description = scriptDescription(pid);
  if (!description) throw new Error(`${pid}: no description in script.json`);
  const v = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}`)).items?.[0];
  if (!v) throw new Error(`${vid} not found on ${brand}`);
  const { title, tags, categoryId, defaultLanguage } = v.snippet;
  const newTitle = scriptTitle(pid, title) ?? title;
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=snippet', { id: vid, snippet: { title: newTitle, description, tags, categoryId, defaultLanguage } });
  console.log(JSON.stringify({ pid, vid, title: newTitle, description_chars: description.length }));
} else if (cmd === 'retitle') {
  // change the title of one NOT-yet-public video (snippet PUT keeps description/tags/category/language); syncs script.json titles.youtube
  const [, brand, vid, ...rest] = process.argv.slice(2);
  const newTitle = rest.filter(x => !x.startsWith('--')).join(' ').trim().replace(/</g, '＜').replace(/>/g, '＞');
  if (!brand || !vid || !newTitle) throw new Error('usage: retitle <brand> <videoId> <title>');
  if (newTitle.length > 100) throw new Error(`title ${newTitle.length} chars > 100`);
  const v = (await api(brand, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet,status&id=${vid}`)).items?.[0];
  if (!v) throw new Error(`${vid} not found on ${brand}`);
  if (v.status.privacyStatus === 'public') throw new Error(`${vid} is already public`);
  const { title: oldTitle, description, tags, categoryId, defaultLanguage } = v.snippet;
  const bare = (t: string) => t.replace(/\s*#shorts\s*$/i, '').trim();
  const newDesc = bare(oldTitle).length > 8 ? description.split(bare(oldTitle)).join(bare(newTitle)) : description;
  await api(brand, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=snippet', { id: vid, snippet: { title: newTitle, description: newDesc, tags, categoryId, defaultLanguage } });
  const row = db.prepare(`SELECT production_id pid FROM publishing WHERE platform='youtube' AND external_post_id=? AND publication_status!='deleted'`).get(vid) as any;
  if (row) {
    const f = path.join(R, 'productions', row.pid, 'script.json');
    try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); j.titles = { ...(j.titles ?? {}), youtube: newTitle }; fs.writeFileSync(f, JSON.stringify(j, null, 2)); } catch { /* no script.json */ }
    db.prepare(`INSERT INTO events (kind, agent, production_id, level, message, data) VALUES ('publish','orchestrator',?,'info',?,?)`)
      .run(row.pid, `YouTube retitled ${vid}: ${oldTitle} -> ${newTitle}`, JSON.stringify({ vid, oldTitle, newTitle }));
  }
  console.log(JSON.stringify({ pid: row?.pid ?? null, vid, old: oldTitle, title: newTitle, desc_changed: newDesc !== description }));
} else if (cmd === 'desc-clean') {
  // strip AI-disclosure text from the LIVE descriptions of a brand's scheduled/published videos; PUT snippet only when changed (title/tags/category/language kept)
  const dry = process.argv.includes('--dry-run');
  const ids = (db.prepare(`SELECT production_id pid, external_post_id vid FROM publishing WHERE platform='youtube' AND account_id=? AND publication_status IN ('scheduled','published') AND external_post_id IS NOT NULL`).all(arg) as any[]);
  const res = { brand: arg, dry, total: ids.length, changed: 0, unchanged: 0, remaining: [] as string[], failed: [] as string[] };
  const samples: any[] = [];
  for (let i = 0; i < ids.length; i++) {
    const { pid, vid } = ids[i];
    try {
      const v = (await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${vid}`)).items?.[0];
      if (!v) { res.failed.push(`${vid} not found`); continue; }
      const old: string = v.snippet.description ?? '', neu = stripAi(old);
      if (neu === old) { res.unchanged++; continue; }
      if (samples.length < 3) samples.push({ vid, pid, removed: old.split('\n').filter(l => !neu.split('\n').includes(l)), added: neu.split('\n').filter(l => !old.split('\n').includes(l)) });
      if (!dry) {
        const { title, tags, categoryId, defaultLanguage } = v.snippet;
        await api(arg, 'PUT', 'https://www.googleapis.com/youtube/v3/videos?part=snippet', { id: vid, snippet: { title, description: neu, tags, categoryId, defaultLanguage } });
      }
      res.changed++;
    } catch (e: any) {
      const m = String(e?.message ?? e);
      res.failed.push(`${vid}: ${m.slice(0, 120)}`);
      if (/quota/i.test(m)) { res.remaining = ids.slice(i).map(x => x.vid); break; }
    }
  }
  console.log(JSON.stringify({ ...res, samples }, null, 1));
} else if (cmd === 'analytics') {
  // audience by country (views + watch minutes) since --days back (default 90) — used to pick posting times per channel
  const days = Number(flag('days') ?? 90), end = new Date().toISOString().slice(0, 10), start = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const q = (extra: string) => api(arg, 'GET', `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start}&endDate=${end}${extra}`);
  const tot = await q('&metrics=views,estimatedMinutesWatched,subscribersGained');
  const ctry = await q('&dimensions=country&metrics=views,estimatedMinutesWatched&sort=-views&maxResults=25');
  const out = { brand: arg, start, end, fetched: new Date().toISOString(), totals: tot.rows?.[0] ?? null,
    countries: (ctry.rows ?? []).map((r: any[]) => ({ country: r[0], views: r[1], minutes: r[2] })) };
  fs.mkdirSync(path.join(R, 'data', 'audience'), { recursive: true });
  fs.writeFileSync(path.join(R, 'data', 'audience', `${arg}.json`), JSON.stringify(out, null, 1));  // read by scripts/audience-slots.py
  console.log(JSON.stringify(out, null, 1));
} else if (cmd === 'stats') {
  // per-video views (Data API) + average view % / duration (Analytics API) into data/hooks/<brand>.json (hook-category test,
  // docs/brands/quiz-ar/hooks.md). Rows keyed by youtube_id; videos not public yet simply read 0.
  const file = path.join(R, 'data', 'hooks', `${arg}.json`);
  if (!fs.existsSync(file)) throw new Error(`${file} not found`);
  const H = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = (H.videos as any[]).filter(v => v.youtube_id);
  const now = new Date().toISOString(), st: Record<string, any> = {}, an: Record<string, any[]> = {};
  for (let i = 0; i < rows.length; i += 50) {
    const ids = rows.slice(i, i + 50).map(v => v.youtube_id).join(',');
    for (const v of (await api(arg, 'GET', `https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=${ids}`)).items ?? []) st[v.id] = v;
  }
  let note: string | null = null;
  try {
    const start = rows.map(v => (v.publish_at ?? now).slice(0, 10)).sort()[0], end = now.slice(0, 10);
    for (let i = 0; i < rows.length; i += 200) {
      const ids = rows.slice(i, i + 200).map(v => v.youtube_id).join(',');
      const rep = await api(arg, 'GET', `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${start < end ? start : end}&endDate=${end}` +
        `&dimensions=video&filters=video==${ids}&metrics=views,averageViewPercentage,averageViewDuration&sort=-views&maxResults=200`);
      for (const r of rep.rows ?? []) an[r[0]] = r;
    }
  } catch (e: any) { note = `analytics: ${e.message}`; }
  for (const v of rows) {
    const s = st[v.youtube_id], a = an[v.youtube_id];
    v.views = s ? Number(s.statistics?.viewCount ?? 0) : 0;
    v.likes = s ? Number(s.statistics?.likeCount ?? 0) : 0;
    v.comments = s ? Number(s.statistics?.commentCount ?? 0) : 0;
    v.privacy = s?.status?.privacyStatus ?? 'missing';
    v.avg_view_pct = a ? +Number(a[2]).toFixed(1) : (note ? v.avg_view_pct ?? null : null);  // null = no analytics row yet (not public / no views)
    v.avg_view_dur_s = a ? +Number(a[3]).toFixed(1) : (note ? v.avg_view_dur_s ?? null : null);
    v.stats_at = now;
  }
  H.stats_at = now; H.stats_note = note;
  fs.writeFileSync(file, JSON.stringify(H, null, 1));
  console.log(JSON.stringify({ brand: arg, videos: rows.length, found: Object.keys(st).length, analytics_rows: Object.keys(an).length, total_views: rows.reduce((n, v) => n + v.views, 0), note }, null, 1));
} else if (cmd === 'auth') {
  await authorize(arg);
} else if (cmd === 'upload-legacy') {
  // legacy approved videos (celebrity): upload-legacy celebrity [--limit N] [--dry-run]; exit 3 = nothing left
  process.exitCode = await uploadLegacy(arg, Number(flag('limit') ?? 2), process.argv.includes('--dry-run'));
} else if (cmd === 'upload') {
  console.log(JSON.stringify(await uploadBrand(arg, Number(flag('limit') ?? 999), process.argv.includes('--dry-run')), null, 1));
} else {
  console.log('usage: status | auth <brand> | upload <brand> [--limit N] [--dry-run] | list <brand> | adopt <brand> <pid> <vid> | replace <brand> <pid> <oldVid> <file> | meta <brand> <pid> <vid> | retitle <brand> <videoId> <title> | desc-clean <brand> [--dry-run] | analytics <brand> [--days N] | stats <brand>');
}
