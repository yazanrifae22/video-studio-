import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { db, J } from '../../../packages/shared/src/db.ts';
import { emit, eventsSince } from '../../../packages/shared/src/events.ts';
import { P } from '../../../packages/shared/src/paths.ts';
import { secretPresence, geminiKeys, policy } from '../../../packages/shared/src/secrets.ts';
import { setRights } from '../../../packages/rights/src/rights.ts';
import { retryJob, cancelJob } from '../../../packages/orchestrator/src/queue.ts';
import { syncAgents } from '../../../packages/orchestrator/src/agents.ts';
import { QA_REVIEW_SQL, RIGHTS, STAGES } from '../../../packages/shared/src/schemas.ts';
import { exportStatus, libraryRows, syncLibrary } from '../../../packages/shared/src/reflib.ts';
import { approveGate, countersignCheck, gatesFor, type AssetDecision } from '../../../packages/shared/src/gates.ts';
import { HOOK_CATEGORIES } from '../../../packages/quiz/src/spec.ts';
import { registerVr } from './vr.ts';
import { registerRunway } from './runway.ts';
import { registerWorkflow } from './workflow.ts';

/**
 * Studio API: read-mostly views over data/studio.db plus a small set of real owner actions.
 * Binds to loopback only. Every POST must carry `x-studio: 1` (a browser cannot add it cross-origin without a
 * CORS preflight we never grant), so other sites can't drive these endpoints.
 */
const PORT = Number(process.env.STUDIO_PORT ?? 4320);
const app = Fastify({ logger: false });
syncAgents();

app.addHook('onRequest', async (req, reply) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-studio'] !== '1') reply.code(403).send({ error: 'missing x-studio header' });
});

const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as any[];
const one = (sql: string, ...a: any[]) => db().prepare(sql).get(...a) as any;
const parse = (r: any, cols: string[]) => { if (r) for (const c of cols) r[c] = J.parse(r[c], r[c]); return r; };

/** Output target (owner 2026-11-08: 2 approved videos per channel per day, config/gates.json daily_target_approved): per brand
 *  approved today (local day) and the 7-day average (today + 6 previous local days) from productions.data.decision (approve). */
function throughput() {
  const target = gatesFor(null).daily_target_approved;
  const rows = all(`SELECT brand_id, date(json_extract(data,'$.decision.at'),'localtime') d FROM productions
    WHERE approval_status='approved' AND json_extract(data,'$.decision.decision')='approve' AND json_extract(data,'$.decision.at') IS NOT NULL
      AND date(json_extract(data,'$.decision.at'),'localtime') >= date('now','localtime','-6 days')`);
  const today = one(`SELECT date('now','localtime') d`).d;
  const brands = all(`SELECT id, name, status FROM brands ORDER BY id`).map((b: any) => {
    const mine = rows.filter((r: any) => r.brand_id === b.id), t = mine.filter((r: any) => r.d === today).length;
    return { brand: b.id, name: b.name, status: b.status, today: t, last7: mine.length, avg7: +(mine.length / 7).toFixed(2), target, met_today: t >= target };
  });
  return { target, today, brands, total_today: brands.reduce((n: number, b: any) => n + b.today, 0) };
}
app.get('/api/throughput', async () => throughput());

app.get('/api/overview', async () => ({
  throughput: throughput(),
  brands: all(`SELECT b.*, (SELECT COUNT(*) FROM accounts a WHERE a.brand_id=b.id AND a.status='connected') connected FROM brands b`).map(b => parse(b, ['data'])),
  stages: all(`SELECT current_state stage, COUNT(*) n FROM productions GROUP BY 1`),
  published: one(`SELECT COUNT(*) n FROM publishing WHERE publication_status='published'`).n,
  scheduled: one(`SELECT COUNT(*) n FROM publishing WHERE publication_status='scheduled'`).n,
  views: one(`SELECT SUM(v) n FROM (SELECT MAX(views) v FROM analytics_snapshots GROUP BY external_post_id)`).n,
  rights: all(`SELECT permission_status s, COUNT(*) n FROM sources GROUP BY 1`),
  ideas: all(`SELECT status, COUNT(*) n FROM ideas GROUP BY 1`),
  jobs: all(`SELECT status, COUNT(*) n FROM jobs GROUP BY 1`),
  failedJobs: all(`SELECT id, type, production_id, error, finished_at FROM jobs WHERE status='failed' ORDER BY id DESC LIMIT 5`),
  usageToday: all(`SELECT provider, COUNT(*) calls, SUM(ok) ok, ROUND(SUM(cost_usd),4) shadow_cost_usd FROM api_usage WHERE date(ts)=date('now') GROUP BY provider`),
  agentsWorking: one(`SELECT COUNT(*) n FROM agents WHERE status='working'`).n,
  credentials: { gemini_keys: geminiKeys().length, ...secretPresence(['PEXELS_API_KEY', 'PIXABAY_API_KEY', 'YOUTUBE_API_KEY']) },
  disk: (() => { try { const s = fs.statfsSync(P.root); return { freeGB: Math.round(s.bavail * s.bsize / 1e9) }; } catch { return null; } })(),
}));

app.get('/api/agents', async () => all(`SELECT * FROM agents ORDER BY CASE status WHEN 'working' THEN 0 WHEN 'blocked' THEN 1 WHEN 'error' THEN 2 ELSE 3 END, id`).map(a => ({
  ...parse(a, ['tools']),
  tasks: all(`SELECT * FROM agent_tasks WHERE agent_id=? ORDER BY id DESC LIMIT 6`, a.id).map(t => parse(t, ['artifacts', 'decisions', 'progress', 'depends_on', 'inputs'])),
  done: one(`SELECT COUNT(*) n FROM agent_tasks WHERE agent_id=? AND status='done'`, a.id).n,
})));

app.get('/api/events', async (req: any) => all(`SELECT * FROM events WHERE id > ? ORDER BY id DESC LIMIT ?`, Number(req.query.since ?? 0), Math.min(Number(req.query.limit ?? 100), 500)).map(e => parse(e, ['data'])));

/** Live feed: polls the events table (written by CLI, worker and agents in other processes) and pushes over SSE. */
app.get('/api/stream', (req, reply) => {
  reply.raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  // Resume after a reconnect from the browser's Last-Event-ID, so no event is lost while the connection was down.
  const resume = Number(req.headers['last-event-id'] ?? (req.query as any).since ?? NaN);
  let last = Number.isFinite(resume) ? resume : one(`SELECT COALESCE(MAX(id),0) m FROM events`).m;
  const tick = () => {
    const rows = eventsSince(last, 200) as any[];
    for (const r of rows) { last = r.id; reply.raw.write(`id: ${r.id}\ndata: ${JSON.stringify(parse(r, ['data']))}\n\n`); }
    reply.raw.write(': ping\n\n');
  };
  const iv = setInterval(tick, 1000);
  req.raw.on('close', () => clearInterval(iv));
});

app.get('/api/ideas', async () => all(`SELECT * FROM ideas ORDER BY opportunity_score DESC`).map(i => parse(i, ['supporting_sources', 'trend_evidence', 'data'])));
app.post('/api/ideas/:id/status', async (req: any) => {
  const s = req.body?.status;
  if (!['proposed', 'approved', 'parked', 'rejected'].includes(s)) throw new Error('bad status');
  db().prepare(`UPDATE ideas SET status=?, updated_at=datetime('now') WHERE idea_id=?`).run(s, req.params.id);
  emit({ kind: 'idea.status', agent: 'owner', message: `Idea ${req.params.id} → ${s}` });
  return { ok: true };
});

app.get('/api/sources', async (req: any) => {
  const w: string[] = [], a: any[] = [];
  if (req.query.status) { w.push('permission_status=?'); a.push(req.query.status); }
  if (req.query.platform) { w.push('source_platform=?'); a.push(req.query.platform); }
  if (req.query.q) { w.push('(title LIKE ? OR creator LIKE ?)'); a.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  return all(`SELECT asset_id, source_platform, creator, title, duration, view_count, views_observed_at, license, permission_status, usage_restrictions,
    original_url, local_path IS NOT NULL acquired, transcript_path IS NOT NULL transcribed, license_expires, json_extract(data,'$.rights_proposal') proposal,
    json_extract(data,'$.possible_duplicate_of') dup, created_at FROM sources ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`, ...a)
    .map(s => parse(s, ['usage_restrictions', 'proposal']));
});
app.get('/api/sources/:id', async (req: any) => {
  const s = parse(one(`SELECT * FROM sources WHERE asset_id=?`, req.params.id), ['data', 'usage_restrictions', 'analysis']);
  if (!s) return { error: 'not found' };
  s.rights_log = all(`SELECT * FROM rights_log WHERE asset_id=? ORDER BY id`, req.params.id);
  s.candidates = all(`SELECT * FROM candidates WHERE asset_id=? ORDER BY overall_score DESC`, req.params.id);
  return s;
});
app.post('/api/sources/:id/rights', async (req: any) => {
  const { status, reason, evidence } = req.body ?? {};
  if (!RIGHTS.includes(status)) throw new Error('bad status');
  setRights(req.params.id, status, { actor: 'owner', reason: reason || 'owner decision in studio', evidence });
  return { ok: true };
});

app.get('/api/candidates', async (req: any) => all(`SELECT c.*, s.title source_title FROM candidates c LEFT JOIN sources s USING(asset_id)
  ${req.query.production ? 'WHERE c.production_id=?' : req.query.asset ? 'WHERE c.asset_id=?' : ''} ORDER BY overall_score DESC LIMIT 300`,
  ...(req.query.production ? [req.query.production] : req.query.asset ? [req.query.asset] : [])));
app.post('/api/candidates/:id/status', async (req: any) => {
  if (!['selected', 'rejected', 'proposed'].includes(req.body?.status)) throw new Error('bad status');
  db().prepare(`UPDATE candidates SET status=? WHERE candidate_id=?`).run(req.body.status, req.params.id);
  emit({ kind: 'candidate.status', agent: 'owner', message: `Candidate ${req.params.id} → ${req.body.status}` });
  return { ok: true };
});

app.get('/api/productions', async () => all(`SELECT p.*, b.name brand_name FROM productions p LEFT JOIN brands b ON b.id=p.brand_id ORDER BY p.updated_at DESC`)
  .map(p => parse(p, ['source_assets', 'selected_candidates', 'assigned_agents', 'data', 'prediction'])));
app.get('/api/productions/:id', async (req: any) => {
  const p = parse(one(`SELECT * FROM productions WHERE production_id=?`, req.params.id), ['source_assets', 'selected_candidates', 'assigned_agents', 'data', 'prediction']);
  if (!p) return { error: 'not found' };
  p.versions = all(`SELECT * FROM versions WHERE production_id=? ORDER BY n DESC`, req.params.id).map(v => ({ ...parse(v, ['tech_qa']), exists: renderExists(v.render_path) }));
  p.reviews = all(`SELECT * FROM reviews WHERE production_id=? ORDER BY id DESC`, req.params.id).map(r => parse(r, ['breakdown', 'issues', 'blockers']));
  p.sources = all(`SELECT asset_id, title, creator, license, permission_status, usage_restrictions, attribution FROM sources WHERE asset_id IN (SELECT value FROM json_each(?))`, J.str(p.source_assets));
  p.publishing = all(`SELECT * FROM publishing WHERE production_id=?`, req.params.id).map(x => parse(x, ['metadata']));
  p.slots = all(`SELECT slot_at, status, note FROM slots WHERE production_id=? ORDER BY slot_at`, req.params.id);
  p.events = all(`SELECT * FROM events WHERE production_id=? ORDER BY id DESC LIMIT 50`, req.params.id);
  p.watch = watchInfo(req.params.id, p.versions);
  return p;
});

/** Script panel data: hook + story + spoken lines + every script-doctor round, read defensively from productions/<id>/. */
function scriptInfo(id: string) {
  const dir = path.join(P.productions, id);
  const rj = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } };
  const brief = rj('brief.json'), hook = rj('hook.json'), story = rj('story.json'), script = rj('script.json'), ep = rj('episode.json');
  const num = (v: any) => (typeof v === 'number' && isFinite(v) ? v : null);
  const brand = (() => { try { return one(`SELECT brand_id FROM productions WHERE production_id=?`, id)?.brand_id ?? null; } catch { return null; } })();
  const gate = gatesFor(brand).script_forecast;   // config/gates.json + brand_overrides (kids 90, others 85)
  const hk = hook && {
    premise: hook.premise ?? brief?.premise ?? null,
    chosen: (() => { const o = (hook.options ?? []).find((x: any) => x.id === (hook.chosen ?? hook.chosen_id ?? hook.pick)) ?? (hook.options ?? [])[0];
      const c = hook.chosen_hook ?? hook.chosen; const str = typeof c === 'string' ? c : null;
      return o ? [o.id && `Option ${o.id}`, o.mechanism, o.first_line && `“${o.first_line}”`, o.overlay && `[${o.overlay}]`].filter(Boolean).join(' · ') : str; })(),
    payoff_ts: num(hook.payoff_ts) ?? num(story?.payoff_ts),
    promise: hook.what_the_payoff_is ?? null,
  };
  const beats = (story?.beats ?? []).map((b: any) => ({ id: b.id, t: num(b.t_start ?? b.t), t_end: num(b.t_end), job: b.job ?? null, what: b.line_or_visual ?? b.what ?? null, new_info: b.new_info ?? null, link: b.link ?? null }));
  const st = story && { spine: story.spine ?? null, structure: story.structure ?? null, beats, payoff_ts: num(story.payoff_ts), peak_t: num(story.peak_t), ending: story.ending_line ?? story.ending_type ?? story.ending ?? null, send_reason: story.send_reason ?? script?.send_reason ?? null };
  let lines: any[] = [];
  if (ep?.scenes) for (const sc of ep.scenes) for (const l of sc.lines ?? []) lines.push({ id: l.id, beat: sc.id, speaker: l.who ?? null, text: l.text });
  else {
    const src = [script?.narration, script?.lines, script?.script].find(a => Array.isArray(a)) ?? [];
    for (const l of src) if (l && typeof l.text === 'string') {
      const t = num(l.at_ms) != null ? l.at_ms / 1000 : num(l.t ?? l.at);
      const b = t != null ? beats.find((x: any) => x.t != null && x.t_end != null && t >= x.t && t < x.t_end)?.id : null;
      lines.push({ id: l.id ?? null, beat: l.beat ?? b ?? null, speaker: l.who ?? l.speaker ?? null, text: l.text, t });
    }
  }
  let files: string[] = [];
  try { files = fs.readdirSync(dir).filter(f => /^script-doctor(\.r\d+)?\.json$/.test(f)); } catch {}
  const rounds = files.map(f => { const d = rj(f); const m = /\.r(\d+)\.json$/.exec(f);
    const fc = d?.forecast; const score = typeof fc === 'number' ? fc : num(fc?.score) ?? num(d?.score);
    return { file: f, round: num(d?.pass_n) ?? num(d?.round) ?? (m ? +m[1] : 1), verdict: d?.verdict ?? null, score, gate, forecast_verdict: fc?.verdict ?? null,
      notes: (d?.notes ?? []).map((n: any) => ({ line_id: n.line_id ?? null, issue: n.issue ?? null, rewrite: n.rewrite ?? null })), improvements: d?.one_change_with_biggest_lift ?? d?.improvements ?? null };
  }).filter(r => r.verdict != null || r.score != null).sort((a, b) => a.round - b.round || a.file.localeCompare(b.file));
  return { hook: hk, story: st, lines, title: ep?.title ?? script?.title ?? script?.title_proposed ?? hook?.title ?? story?.title ?? null,
    description: script?.description ?? ep?.description ?? null, rounds, brand, gate };
}
app.get('/api/productions/:id/script', async (req: any) => {
  if (!/^[\w.-]+$/.test(req.params.id)) return { error: 'bad id' };
  return scriptInfo(req.params.id);
});

/**
 * What the owner can still watch for a production whose newest version has no render yet (stage "editing"):
 * the latest earlier render (vN/render.mp4 | render.raw.mp4 | productions/<id>/*.mp4), a quick low-res preview of the
 * newest timeline, the plan summary when there is no timeline yet, and the latest contact sheet / qa/pack.jpg.
 */
const previewJobs = new Map<string, { pct: number; at: number; startedAt: number }>();
function watchInfo(id: string, dbVersions: any[]) {
  const dir = path.join(P.productions, id);
  const url = (f: string) => '/media/productions/' + path.relative(P.productions, f).split(path.sep).join('/');
  const ex = (f: string) => fs.existsSync(f);
  const disk = fs.existsSync(dir) ? fs.readdirSync(dir).filter(d => /^v\d+$/.test(d)).map(d => +d.slice(1)) : [];
  const ns = [...new Set([...disk, ...dbVersions.map(v => v.n)])].sort((a, b) => b - a);
  const latest = ns[0] ?? null;
  const vd = (n: number) => path.join(dir, 'v' + n);
  const rendered = (n: number) => ['render.mp4', 'render.raw.mp4'].map(x => path.join(vd(n), x)).find(ex);
  const latestRender = latest != null ? rendered(latest) : undefined;
  let fallback: any = null;
  if (latest != null && !latestRender) {
    for (const n of ns.filter(x => x < latest)) { const f = rendered(n); if (f) { fallback = { n, url: url(f), mtime: fs.statSync(f).mtimeMs }; break; } }
    if (!fallback && fs.existsSync(dir)) {
      const f = fs.readdirSync(dir).filter(x => /\.mp4$/i.test(x)).map(x => path.join(dir, x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
      if (f) fallback = { n: null, url: url(f), mtime: fs.statSync(f).mtimeMs, file: path.basename(f) };
    }
  }
  const tl = latest != null ? ['timeline.json', 'render.timeline.json'].map(x => path.join(vd(latest), x)).find(ex) : undefined;
  const pv = latest != null ? path.join(vd(latest), 'preview.mp4') : '';
  const preview = pv && ex(pv) ? { url: url(pv), mtime: fs.statSync(pv).mtimeMs, stale: !!tl && fs.statSync(tl).mtimeMs > fs.statSync(pv).mtimeMs } : null;
  let plan: any = null;
  if (!tl) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, 'cutlist.json'), 'utf8'));
      plan = { segments: (c.segments ?? []).length, texts: (c.texts ?? []).length, captions: Array.isArray(c.captions) ? c.captions.length : null, fps: c.fps, size: c.width && c.height ? `${c.width}x${c.height}` : null };
      const rp = path.join(dir, 'ranking-plan.json');
      if (ex(rp)) { const r = JSON.parse(fs.readFileSync(rp, 'utf8')); plan.title = r.title ?? r.working_title ?? null; plan.entries = (r.entries ?? r.items ?? []).length || null; }
    } catch { plan = null; }
  }
  // newest contact sheet / qa pack across versions (this one first)
  let pack: string | null = null, contact: string | null = null;
  for (const n of ns) {
    const q = path.join(vd(n), 'qa');
    if (!pack && ex(path.join(q, 'pack.jpg'))) pack = url(path.join(q, 'pack.jpg'));
    if (!contact && ex(path.join(q, 'contact_sheet.jpg'))) contact = url(path.join(q, 'contact_sheet.jpg'));
    if (pack && contact) break;
  }
  const job = previewJobs.get(id);
  return { latest, latestRendered: !!latestRender, fallback, hasTimeline: !!tl, preview, plan, pack, contact, previewing: job ? { pct: job.pct, startedAt: job.startedAt } : null };
}

/** Quick preview: half-res, NVENC p1, no loudness master -> vN/preview.mp4. Never touches render.mp4 or the DB stage. */
app.post('/api/productions/:id/preview', async (req: any) => {
  const id = String(req.params.id);
  if (!/^[\w.-]+$/.test(id)) throw new Error('bad id');
  if (previewJobs.has(id)) throw new Error('a preview is already rendering for this production');
  const w = watchInfo(id, all(`SELECT n FROM versions WHERE production_id=?`, id));
  if (w.latest == null) throw new Error('no version folder yet');
  const vdir = path.join(P.productions, id, 'v' + w.latest);
  const tl = ['timeline.json', 'render.timeline.json'].map(x => path.join(vdir, x)).find(f => fs.existsSync(f));
  if (!tl) throw new Error(`v${w.latest} has no timeline.json yet (the build has not reached that step)`);
  const out = path.join(vdir, 'preview.mp4'), tmp = path.join(vdir, 'preview.tmp.mp4');
  const job = { pct: 0, at: Date.now(), startedAt: Date.now() };
  previewJobs.set(id, job);
  emit({ kind: 'preview.started', agent: 'studio', productionId: id, message: `Quick preview of v${w.latest} started`, data: { version: w.latest } });
  (async () => {
    try {
      const { withLock } = await import('../../../packages/intelligence/src/analyze.ts');
      const { renderTimelineFile } = await import('../../../packages/render/src/render.ts');
      const r = await withLock('render', `preview-${id}`, () => renderTimelineFile(tl, tmp, { preview: 0.5, workDir: path.join(vdir, 'preview-work'),
        onProgress: f => { job.pct = Math.round(f * 100); emit({ kind: 'render.progress', agent: 'studio', productionId: id, message: `Preview render ${job.pct}%` }); } }));
      fs.renameSync(tmp, out);
      fs.rmSync(path.join(vdir, 'preview-work'), { recursive: true, force: true });
      emit({ kind: 'preview.done', agent: 'studio', productionId: id, level: 'success', message: `Quick preview of v${w.latest} ready (${r.seconds.toFixed(0)} s)`, data: { version: w.latest, seconds: r.seconds } });
    } catch (e: any) {
      fs.rmSync(tmp, { force: true });
      emit({ kind: 'preview.failed', agent: 'studio', productionId: id, level: 'error', message: `Quick preview failed: ${String(e.message).slice(0, 300)}` });
    } finally { previewJobs.delete(id); }
  })();
  return { ok: true, version: w.latest };
});
/** Same mapping as /media: DB paths may still point at the old C: studio folder, files live under P.productions. */
function renderExists(p?: string | null) {
  if (!p) return false;
  const n = p.replace(/\\/g, '/'), i = n.indexOf('/productions/');
  return fs.existsSync(i >= 0 ? path.join(P.productions, n.slice(i + 13)) : p);
}
/** Sources a production uses: productions.source_assets + cutlist.json segments/inserts/music, each with its latest rights_log row. */
function productionAssets(id: string, sourceAssets: string | null | undefined, dir: string): AssetDecision[] {
  const ids = new Set<string>((J.parse(sourceAssets ?? '[]', []) ?? []).map(String));
  try {
    const cl = JSON.parse(fs.readFileSync(path.join(dir, 'cutlist.json'), 'utf8').replace(/^\uFEFF/, ''));
    for (const s of [...(cl.segments ?? []), ...(cl.inserts ?? []), ...(cl.music ? [cl.music] : [])]) if (s?.asset_id) ids.add(String(s.asset_id));
  } catch { /* no cutlist */ }
  return [...ids].map(a => ({ asset_id: a, last: one(`SELECT id, actor, to_status FROM rights_log WHERE asset_id=? ORDER BY id DESC LIMIT 1`, a) ?? null }));
}
function countersignActors(): string[] {
  const a = (policy() as any).viralRankings?.countersignActors;
  return Array.isArray(a) && a.length ? a.map(String) : ['rights-scout', 'owner'];
}
app.post('/api/productions/:id/decision', async (req: any, reply: any) => {
  const { decision } = req.body ?? {};
  let note: string | undefined = req.body?.note;
  const forceNote = typeof req.body?.force_note === 'string' && req.body.force_note.trim() ? req.body.force_note.trim() : null;
  let warnings: string[] = [];
  const by = ['owner', 'orchestrator'].includes(req.body?.by) ? req.body.by : 'owner';
  const map: Record<string, [string, string]> = { approve: ['approved', 'approved'], reject: ['rejected', 'rejected'], revise: ['revision_requested', 'editing'] };
  if (!map[decision]) throw new Error('bad decision');
  const p = one(`SELECT current_state, qa_score FROM productions WHERE production_id=?`, req.params.id);
  if (decision === 'approve') {
    const lastReview = one(`SELECT version, verdict, score, blockers FROM reviews WHERE production_id=? AND ${QA_REVIEW_SQL} ORDER BY id DESC LIMIT 1`, req.params.id);   // QA reviews only (retention/rights/critic never gate or overwrite)
    // Owner-set per-brand bar (config/policy.json approvalMinQa): score >= bar with no blockers also counts.
    const brand = one(`SELECT brand_id FROM productions WHERE production_id=?`, req.params.id)?.brand_id;
    const bar = policy().approvalMinQa?.[brand];
    const noBlockers = !lastReview?.blockers || J.parse(lastReview.blockers, []).length === 0;
    const meetsBar = bar != null && lastReview?.score >= bar && noBlockers;
    if (lastReview?.verdict !== 'pass' && !meetsBar) throw new Error('cannot approve: latest independent QA review has not passed');
    // config/gates.json: reviewed version == latest render (I4) + insights + viral (story.json, brand != kids; record-only while viral_mode=record)
    // + (new loop, kids too) panel not blocked + fresh-eyes != hate, all read from the REVIEWED vN; file shapes validated (I9);
    // rights countersign of every used source (I4; strict with story.json). force_note overrides and is logged (docs/gates.md)
    const pv = one(`SELECT brand_id, created_at, version, source_assets FROM productions WHERE production_id=?`, req.params.id);
    const dir = path.join(P.productions, req.params.id);
    const g = approveGate({ dir, brand: pv?.brand_id, createdAt: pv?.created_at, version: pv?.version, reviewedVersion: lastReview?.version ?? null });
    const cs = countersignCheck(productionAssets(req.params.id, pv?.source_assets, dir), countersignActors(), fs.existsSync(path.join(dir, 'story.json')));
    g.errors.push(...cs.errors); g.warnings.push(...cs.warnings); g.ok = g.errors.length === 0;
    warnings = g.warnings;
    if (!g.ok) {
      if (!forceNote) return reply.code(400).send({ ok: false, error: `cannot approve: ${g.errors.join('; ')} (override with "force_note")`, issues: g.errors, gap_to_gate: g.gaps ?? [], warnings });
      note = `${note ? note + ' | ' : ''}GATE FORCED (${g.errors.join('; ')}): ${forceNote}`;
    }
  }
  db().prepare(`UPDATE productions SET approval_status=?, current_state=?, updated_at=datetime('now') WHERE production_id=?`).run(map[decision][0], map[decision][1], req.params.id);
  db().prepare(`UPDATE productions SET data=json_set(data,'$.decision',json(?)) WHERE production_id=?`).run(J.str({ decision, by, note: note ?? null, at: new Date().toISOString() }), req.params.id);
  if (decision === 'approve') { try { if (syncLibrary()) exportStatus(); } catch (e: any) { console.error('reference library sync failed', e.message); } }
  emit({ kind: 'production.decision', agent: by, productionId: req.params.id, level: decision === 'approve' ? 'success' : 'warn', message: `${by === 'owner' ? 'Owner' : 'Orchestrator'} ${decision === 'revise' ? 'requested a revision' : decision + 'd'}${note ? `: ${note}` : ''}`, data: { from: p?.current_state } });
  return warnings.length ? { ok: true, warnings } : { ok: true };
});

app.get('/api/jobs', async () => all(`SELECT * FROM jobs ORDER BY id DESC LIMIT 100`).map(j => parse(j, ['payload', 'result'])));
app.post('/api/jobs/:id/retry', async (req: any) => { retryJob(Number(req.params.id)); return { ok: true }; });
app.post('/api/jobs/:id/cancel', async (req: any) => { cancelJob(Number(req.params.id)); return { ok: true }; });

app.get('/api/accounts', async () => all(`SELECT a.*, b.name brand_name FROM accounts a JOIN brands b ON b.id=a.brand_id ORDER BY b.id, a.platform`).map(a => parse(a, ['data'])));
app.post('/api/accounts/:id', async (req: any) => {
  const { status, handle } = req.body ?? {};
  if (!['not_created', 'created', 'connected', 'restricted'].includes(status)) throw new Error('bad status');
  db().prepare(`UPDATE accounts SET status=?, handle=COALESCE(?, handle), updated_at=datetime('now') WHERE id=?`).run(status, handle ?? null, req.params.id);
  emit({ kind: 'account.status', agent: 'owner', message: `${req.params.id} → ${status}` });
  return { ok: true };
});

/** Calendar slots. `from`/`to` (ISO dates, UTC) select a window; default = from yesterday onwards. */
app.get('/api/schedule', async (req: any) => {
  const from = /^\d{4}-\d\d-\d\d/.test(req.query.from ?? '') ? req.query.from : null;
  const to = /^\d{4}-\d\d-\d\d/.test(req.query.to ?? '') ? req.query.to : null;
  return all(`SELECT s.*, p.title, p.current_state, p.qa_score, b.name brand_name,
    (SELECT json_extract(pu.metadata,'$.url') FROM publishing pu WHERE pu.production_id=s.production_id AND pu.platform='youtube') url
    FROM slots s LEFT JOIN productions p USING(production_id) LEFT JOIN brands b ON b.id=s.brand_id
    WHERE slot_at >= ${from ? '?' : "date('now','-1 day')"} ${to ? 'AND slot_at < ?' : ''} ORDER BY slot_at LIMIT 2000`, ...[from, to].filter(Boolean));
});
app.get('/api/lessons', async () => ({ lessons: all(`SELECT * FROM lessons ORDER BY id DESC`), experiments: all(`SELECT * FROM experiments ORDER BY id DESC`), cycles: all(`SELECT * FROM cycles ORDER BY id DESC LIMIT 10`) }));
app.get('/api/meta', async () => ({ stages: STAGES, rights: RIGHTS }));

/**
 * One channel's pipeline view: reference videos, downloaded footage, rights, and per-production progress.
 * Per-step progress (script/voice/render) comes from productions/<id>/pipeline.json when the pipeline writes it.
 */
app.get('/api/channel/:brand', async (req: any) => {
  const brand = parse(one(`SELECT * FROM brands WHERE id=?`, req.params.brand), ['data']);
  if (!brand) return { error: 'not found' };
  const prods = all(`SELECT * FROM productions WHERE brand_id=? ORDER BY created_at`, brand.id).map(p => parse(p, ['source_assets', 'data']));
  const refs = all(`SELECT asset_id, original_url, source_platform, creator, title, published_at, duration, view_count, views_observed_at, permission_status, local_path, data
    FROM sources WHERE category='reference' OR asset_id IN (SELECT value FROM productions p, json_each(p.source_assets) WHERE p.brand_id=?) ORDER BY published_at DESC`, brand.id).map(s => parse(s, ['data']));
  const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
  const productions = prods.map(p => {
    const dir = path.join(P.productions, p.production_id);
    const versions = all(`SELECT n, render_path, created_at, tech_qa FROM versions WHERE production_id=? ORDER BY n DESC`, p.production_id).map(v => { parse(v, ['tech_qa']); v.duration = v.tech_qa?.duration ?? null; v.status = v.render_path ? 'rendered' : 'pending'; return v; });
    const review = one(`SELECT score, verdict, created_at FROM reviews WHERE production_id=? AND ${QA_REVIEW_SQL} ORDER BY id DESC LIMIT 1`, p.production_id);
    const publishing = all(`SELECT platform, publication_status, scheduled_time, external_post_id, metadata FROM publishing WHERE production_id=?`, p.production_id).map(x => parse(x, ['metadata']));
    return { production_id: p.production_id, title: p.title, stage: p.current_state, created_at: p.created_at,
      script: fs.existsSync(path.join(dir, 'script.json')), pipeline: readJson(path.join(dir, 'pipeline.json')),
      latest: versions[0] ?? null, versions: versions.length, review, publishing };
  });
  return { brand, refs, productions };
});

/**
 * Hook-category test (docs/brands/quiz-ar/hooks.md): data/hooks/<brand>.json (plan + views from `youtube.ts stats`),
 * overlaid with each production's quiz.json `hook` block (the showrunner's real category/variant/line) and DB stage.
 */
app.get('/api/hooks/:brand', async (req: any) => {
  const brand = String(req.params.brand);
  if (!/^[a-z0-9-]+$/.test(brand)) return { error: 'bad brand' };
  const f = path.join(P.data, 'hooks', `${brand}.json`);
  if (!fs.existsSync(f)) return { error: `no hook data for ${brand}` };
  const H = JSON.parse(fs.readFileSync(f, 'utf8'));
  const slotOf: Record<string, number> = {};
  const byDay: Record<string, string[]> = {};
  for (const v of H.videos as any[]) if (v.publish_at) (byDay[v.publish_at.slice(0, 10)] ??= []).push(v.publish_at);
  for (const l of Object.values(byDay)) l.sort().forEach((t, i) => (slotOf[t] = i + 1));
  const videos = (H.videos as any[]).map(v => {
    let hook: any = null;
    try { hook = JSON.parse(fs.readFileSync(path.join(P.productions, v.production_id, 'quiz.json'), 'utf8')).hook ?? null; } catch {}
    const p = one(`SELECT title, current_state, qa_score FROM productions WHERE production_id=?`, v.production_id);
    return { ...v, planned_category: v.category, category: hook?.category ?? v.category, variant: hook?.variant ?? v.variant ?? null, line_ar: hook?.line_ar ?? v.line_ar ?? null,
      hook_in_spec: !!hook, slot: v.publish_at ? slotOf[v.publish_at] : null, title: p?.title ?? null, stage: p?.current_state ?? null, qa_score: p?.qa_score ?? null,
      url: v.youtube_id ? `https://youtu.be/${v.youtube_id}` : null };
  });
  // averages only over published videos (views > 0); stayed_pct = Studio "stayed to watch" (Shorts feed), the hook metric
  const mean = (vs: any[], k: string) => { const x = vs.filter(v => v[k] != null && v.views > 0); return x.length ? x.reduce((n, v) => n + Number(v[k]), 0) / x.length : null; };
  const summary = (vs: any[]) => { const live = vs.filter(v => v.views > 0), views = vs.reduce((n, v) => n + (Number(v.views) || 0), 0);
    return { videos: vs.length, live: live.length, views, avg_views: live.length ? views / live.length : 0, avg_view_pct: mean(vs, 'avg_view_pct'), stayed_pct: mean(vs, 'stayed_pct') }; };
  const categories = Object.entries(HOOK_CATEGORIES).map(([key, label_ar]) => {
    const vs = videos.filter(v => v.category === key);
    return { key, label_ar, with_hook: vs.filter(v => v.hook_in_spec).length, ...summary(vs) };
  });
  const baseline = { key: 'no_hook', label_ar: 'بدون هوك', ...summary(H.baseline ?? []) };
  return { brand, stats_at: H.stats_at ?? null, stats_note: H.stats_note ?? null, categories, baseline, videos };
});

/**
 * YouTube Studio "Ask Studio" review (docs/ask-studio-*.md): data/ask-studio/<brand>.json written by the per-channel agents.
 * The four files grew different shapes, so videos/fixes/errors are normalised here; brand-specific extras pass through.
 */
app.get('/api/ask-studio', async () => {
  const dir = path.join(P.data, 'ask-studio');
  if (!fs.existsSync(dir)) return { summary: null, channels: [] };
  const read = (f: string) => { try { return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; } };
  const n = (v: any) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
  const channels = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort().map(f => {
    const d = read(f); if (!d) return null;
    const brand = f.replace(/\.json$/, '');
    const fixes: any[] = d.video_fixes ?? [];
    const fixOf = (v: any) => fixes.find(x => (x.videoId && x.videoId === v.videoId) || x.title === v.title);
    const videos = (d.metrics ?? d.videos ?? []).map((v: any) => {
      const fx = fixOf(v), swiped = n(v.swipe_away_pct ?? v.swiped_pct);
      return { title: v.title, videoId: v.videoId ?? null, production: v.production ?? null, views: n(v.views),
        stayed_pct: n(v.stayed_pct ?? v.viewed_pct) ?? (swiped == null ? null : 100 - swiped), apv: n(v.apv ?? v.apv_pct), duration_s: n(v.duration_s),
        issue: fx?.issue ?? v.issue ?? null, fix: fx?.fix ?? v.fix ?? null };
    });
    for (const x of fixes) if (!videos.some((v: any) => (x.videoId && v.videoId === x.videoId) || v.title === x.title)) videos.push({ title: x.title, videoId: x.videoId ?? null, views: null, stayed_pct: null, apv: null, issue: x.issue, fix: x.fix });
    const errors = d.invented_or_unsupported ?? d.ask_studio_factual_errors ?? [];
    return { brand, channel: d.channel, date: d.date, source_available: d.source_available, blockers: d.blockers ?? [], hook_rules: d.hook_rules ?? [],
      channel_advice: d.channel_advice ?? [], ideas: d.ideas ?? [], playlists: d.playlists ?? [], videos, errors: Array.isArray(errors) ? errors : [errors],
      format_performance: d.format_performance ?? null, audience_countries: d.audience_countries ?? null, uploaded_fixes: d.uploaded_fixes ?? null, comment_signals: d.comment_signals ?? null,
      doc: `docs/brands/${brand}/ask-studio-${d.date}.md` };
  }).filter(Boolean);
  return { summary: read('_summary.json'), channels };
});

/**
 * Channel learning (docs/youtube-intelligence/learning-schema.md): data/learning/<brand>.json, read fresh per request.
 * Files starting with "_" (samples) are only served with ?sample=1.
 */
app.get('/api/learning', async (req: any) => {
  const dir = path.join(P.data, 'learning'), sample = req.query?.sample === '1';
  if (!fs.existsSync(dir)) return { brands: [] };
  const brands = fs.readdirSync(dir).filter(f => f.endsWith('.json') && (sample || !f.startsWith('_'))).sort().map(f => {
    let d: any; try { d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { return null; }
    return { brand: f.replace(/\.json$/, ''), channel: d.channel ?? null, updated_at: d.updated_at ?? null,
      counts: { questions: d.questions?.length ?? 0, ideas: d.ideas?.length ?? 0, next_open: (d.next_checks ?? []).filter((c: any) => c.status === 'open').length } };
  }).filter(Boolean);
  return { brands };
});
app.get('/api/learning/:brand', async (req: any) => {
  const brand = String(req.params.brand ?? ''), sample = req.query?.sample === '1';
  if (!/^_?[a-z0-9-]+$/.test(brand) || (brand.startsWith('_') && !sample)) return { error: 'invalid brand' };
  const file = path.join(P.data, 'learning', brand + '.json');
  if (!fs.existsSync(file)) return { error: `No learning file for ${brand} yet (data/learning/${brand}.json)` };
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e: any) { return { error: 'unreadable learning file: ' + e.message }; }
});

/** Reference-reel library: which reels are done, in production, skipped or still available. */
app.get('/api/reflib', async () => libraryRows().map(({ file, ...r }) => r));

/** Media: only contact sheets/keyframes and renders — never secrets or the DB. */
const MEDIA_ROOTS: Record<string, string> = { cache: P.cache, productions: P.productions };
app.get('/media/:root/*', async (req: any, reply) => {
  const base = MEDIA_ROOTS[req.params.root];
  const rel = String(req.params['*'] ?? '');
  const file = base && path.resolve(base, rel);
  if (!file || !file.startsWith(path.resolve(base) + path.sep) || !/\.(jpg|jpeg|png|webp|mp4|json|srt|vtt)$/i.test(file) || !fs.existsSync(file)) return reply.code(404).send();
  const type = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.json': 'application/json', '.srt': 'text/plain', '.vtt': 'text/vtt' }[path.extname(file).toLowerCase()]!;
  // Byte ranges: browsers need them to seek inside a video (without them the scrubber jumps back to 0).
  const size = fs.statSync(file).size;
  reply.header('accept-ranges', 'bytes').header('cache-control', 'no-cache');
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
  if (m && (m[1] || m[2])) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) return reply.code(416).header('content-range', `bytes */${size}`).send();
    return reply.code(206).type(type).header('content-range', `bytes ${start}-${end}/${size}`).header('content-length', end - start + 1).send(fs.createReadStream(file, { start, end }));
  }
  return reply.type(type).header('content-length', size).send(fs.createReadStream(file));
});

registerVr(app);
registerRunway(app);
registerWorkflow(app);

app.setErrorHandler((err: any, _req, reply) => { reply.code(400).send({ error: err.message }); });

await app.register(fastifyStatic, { root: path.join(P.root, 'apps', 'studio', 'public'), prefix: '/' });
await app.listen({ host: '127.0.0.1', port: PORT });
console.log(`Studio: http://127.0.0.1:${PORT}`);
