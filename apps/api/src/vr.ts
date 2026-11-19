import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import type { FastifyInstance } from 'fastify';
import { db, J } from '../../../packages/shared/src/db.ts';
import { emit } from '../../../packages/shared/src/events.ts';
import { P } from '../../../packages/shared/src/paths.ts';
import { MOMENT_DEAD } from '../../../packages/shared/src/schemas.ts';
import { validateRankingPlan } from '../../../packages/ranking/src/plan.ts';

/**
 * viral-rankings dashboard API (read-only except: idea status override, plan save).
 * Rules: unknown metrics stay null (never 0), fixture snapshots are always flagged and never mixed into real numbers,
 * no filesystem paths or secrets are returned, media is served only through the id-based routes below.
 * Pagination: ?limit (max 100) & ?cursor (offset); responses carry {total, next}.
 */
const BRAND = 'viral-rankings';
const IDEAS_DIR = path.join(P.root, 'docs', 'brands', 'viral-rankings', 'ideas');
const PUB = `('approved','approved_with_conditions')`;
const DEAD = [...MOMENT_DEAD].map(s => `'${s}'`).join(',') || `'rejected'`;
const AGES = ['24h', '72h', '7d', '28d', 'lifetime'] as const;
const METRICS = ['total_views', 'median_views', 'engaged_views', 'normalized_perf', 'avg_view_duration', 'avg_pct_viewed', 'stayed_to_watch', 'likes_per_1k', 'comments_per_1k', 'subs_per_1k', 'production_count', 'usable_moments'] as const;
const SAFE_ID = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,80}$/;

const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as any[];
const one = (sql: string, ...a: any[]) => db().prepare(sql).get(...a) as any;
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const page = (q: any) => ({ limit: Math.min(Math.max(Number(q.limit ?? 30) || 30, 1), 100), offset: Math.max(Number(q.cursor ?? 0) || 0, 0) });
const prodDir = (id: string) => { if (!SAFE_ID.test(id)) throw new Error('bad production id'); const d = path.resolve(P.productions, id); if (!d.startsWith(path.resolve(P.productions) + path.sep)) throw new Error('bad production id'); return d; };

/** SQL fragments over moments m + sources s: effective rights = stricter of source and moment (null moment status inherits). */
const CLEARED = `(s.permission_status IN ${PUB} AND (s.license_expires IS NULL OR s.license_expires >= date('now')) AND (m.rights_status IS NULL OR m.rights_status IN ${PUB}))`;
const RIGHTS_STATE = `CASE WHEN ${CLEARED} THEN 'cleared' WHEN s.permission_status='pending' OR m.rights_status='pending' THEN 'pending' ELSE 'blocked' END`;
const USED = `EXISTS(SELECT 1 FROM moment_usage u WHERE u.moment_id=m.moment_id AND u.status<>'released')`;
const RECENT = `EXISTS(SELECT 1 FROM moment_usage u WHERE u.moment_id=m.moment_id AND u.status IN ('approved','published') AND u.updated_at >= datetime('now','-30 days'))`;

const EMPTY_INV = () => ({ total: 0, available: 0, used: 0, rights_pending: 0, rights_cleared: 0, recently_used: 0, unused_high_potential: 0 });
type Inv = ReturnType<typeof EMPTY_INV>;

/** Inventory per category id (and rolled up to parents), one grouped pass over moments. */
function inventory(): { byCat: Record<string, Inv>; total: Inv; uncategorised: Inv } {
  const rows = all(`SELECT m.category_id cat, m.creative_status st, m.duplicate_of dup, m.rank_suitability fit, ${RIGHTS_STATE} rs, ${USED} used, ${RECENT} recent
    FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id WHERE m.brand_id=?`, BRAND);
  const parent: Record<string, string | null> = Object.fromEntries(all(`SELECT id, parent_id FROM categories WHERE brand_id=?`, BRAND).map(c => [c.id, c.parent_id]));
  const byCat: Record<string, Inv> = {}, total = EMPTY_INV(), un = EMPTY_INV();
  const dead = new Set([...MOMENT_DEAD]);
  const add = (inv: Inv, r: any) => {
    inv.total++;
    if (r.st === 'usable' && !r.dup) inv.available++;
    if (r.used) inv.used++;
    if (r.rs === 'pending') inv.rights_pending++;
    if (r.rs === 'cleared') inv.rights_cleared++;
    if (r.recent) inv.recently_used++;
    if (!r.used && r.rs === 'cleared' && !dead.has(r.st) && (r.fit ?? 0) >= 7) inv.unused_high_potential++;
  };
  for (const r of rows) {
    add(total, r);
    if (!r.cat) { add(un, r); continue; }
    for (let c: string | null = r.cat, hop = 0; c && hop < 3; c = parent[c] ?? null, hop++) add((byCat[c] ??= EMPTY_INV()), r);
  }
  return { byCat, total, uncategorised: un };
}

/* ---------------------------------------------------------------- learning rule (transparent, documented in ANALYTICS-EXPERIMENTS.md) */
const CONF_W: Record<string, number> = { none: 0, low: 0.25, medium: 0.6, high: 1 };
const MIN_N = 6;              // docs/brands/viral-rankings/RANKING-REFERENCE-BENCHMARK.md section 9: >= 6 videos per arm
const STALE_DAYS = 14;
function recommend(s: any, peerMedian: number | null) {
  const warn: string[] = [];
  let perf: number | null = s.normalized_perf ?? null, perfSource = 'normalized_perf (1.0 = channel baseline at the same age)';
  if (perf == null && s.median_views != null && peerMedian) { perf = s.median_views / peerMedian; perfSource = 'median_views / peer-category median (computed here)'; }
  const n = s.sample_size ?? 0, conf = s.confidence ?? 'none';
  const damp = (CONF_W[conf] ?? 0) * Math.min(1, n / MIN_N);
  if (n < MIN_N) warn.push(`sample ${s.sample_size == null ? 'unknown' : n} < ${MIN_N} videos: directional only`);
  if (conf === 'none' || conf === 'low') warn.push(`confidence ${conf}`);
  const ageDays = (Date.now() - Date.parse(s.observed_at)) / 864e5;
  if (ageDays > STALE_DAYS) warn.push(`snapshot is ${Math.round(ageDays)} days old (stale after ${STALE_DAYS})`);
  if (s.age_bucket === '24h') warn.push('24h is an early read: only compare with other 24h numbers');
  if (s.engaged_views == null) warn.push('engaged views unknown (raw views are not engaged views)');
  if (perf == null) return { perf: null, perf_source: null, damping: damp, weight: null, delta: null, action: 'unknown', text: 'No recommendation: performance unknown for this category/age.', warnings: warn };
  const raw = Math.max(-0.5, Math.min(0.5, perf - 1)), delta = raw * damp, weight = 1 + delta;
  const action = damp === 0 ? 'hold' : Math.abs(delta) < 0.03 ? 'hold' : delta > 0 ? 'raise' : 'lower';
  const text = damp === 0 ? 'Hold weight at 1.00: confidence/sample too low to move it.'
    : `${action === 'hold' ? 'Hold' : action === 'raise' ? 'Raise' : 'Lower'} category weight to ${weight.toFixed(2)} (performance ${perf.toFixed(2)}x baseline, damped x${damp.toFixed(2)}).`;
  return { perf, perf_source: perfSource, damping: damp, weight, delta, action, text, warnings: warn };
}

/** Range-aware file sender (same behaviour as /media in server.ts). */
function sendFile(req: any, reply: any, file: string, type: string) {
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
}

/** Source media on disk for a library source (DB path may still carry an old drive root: map by the /data/media/ suffix). */
function mediaFile(assetId: string): string | null {
  const r = one(`SELECT local_path FROM sources WHERE asset_id=? AND asset_id IN (SELECT source_id FROM moments WHERE brand_id=?)`, assetId, BRAND);
  if (!r?.local_path) return null;
  const n = String(r.local_path).replace(/\\/g, '/'), i = n.indexOf('/data/media/');
  const f = path.resolve(i >= 0 ? path.join(P.media, n.slice(i + 12)) : n);
  if (!f.startsWith(path.resolve(P.media) + path.sep) || !/\.(mp4|webm|mov|ogv)$/i.test(f) || !fs.existsSync(f)) return null;
  return f;
}

const momentRow = (r: any) => ({
  moment_id: r.moment_id, source_id: r.source_id, source_title: r.source_title ?? null, category_id: r.category_id, idea_id: r.idea_id,
  start_ms: r.start_ms, end_ms: r.end_ms, description: r.description, rank_suitability: r.rank_suitability, confidence: r.confidence,
  creative_status: r.creative_status, duplicate_of: r.duplicate_of, reserved_by: r.reserved_by,
  tags: J.parse(r.tags, []), content_risks: J.parse(r.content_risks, []),
  rights: { state: r.rs, source_status: r.source_status ?? null, moment_status: r.rights_status ?? null, strictest: r.rs === 'cleared' ? (r.rights_status ?? r.source_status) : (!['approved', 'approved_with_conditions'].includes(r.source_status) ? r.source_status : r.rights_status) },
  used: r.used, thumb: `/api/vr/moments/${encodeURIComponent(r.moment_id)}/thumb`,
});

/** Normalise the three scout files (different shapes) to one card shape. */
function scoutCards(): any[] {
  let files: string[] = [];
  try { files = fs.readdirSync(IDEAS_DIR).filter(f => /^scout-.*\.json$/.test(f)).sort(); } catch {}
  return files.map(f => {
    const d = readJson(path.join(IDEAS_DIR, f)); if (!d) return null;
    const list: any[] = Array.isArray(d) ? d : d.ideas ?? [];
    return { scout: f.replace(/^scout-|\.json$/g, ''), file: f, lane: Array.isArray(d) ? null : d.lane ?? null, accessed: Array.isArray(d) ? null : d.accessed ?? null,
      ideas: list.map(i => ({
        id: i.id, title: i.title, hook: i.hook ?? null, category: i.category ?? null, subcategory: i.subcategory ?? null,
        criterion: i.ranking_criterion ?? i.criterion ?? null, format: i.format_fit ? (typeof i.format_fit === 'string' ? i.format_fit : `top3: ${i.format_fit.top3 ?? '-'} | top5: ${i.format_fit.top5 ?? '-'}`) : i.fit ?? i.top3_vs_top5 ?? null,
        scores: i.scores ?? null, confidence: i.confidence ?? null, production_ready: i.production_ready ?? null, gate_notes: i.hard_gate_notes ?? null,
        usable_estimate: typeof i.usable_moments_estimate === 'object' && i.usable_moments_estimate ? `${i.usable_moments_estimate.estimate_after_review ?? '?'} (${i.usable_moments_estimate.confidence ?? 'unrated'})` : i.usable_moments_estimate ?? i.usable_moments_est ?? null,
        evidence_n: (i.demand_evidence ?? i.gap_evidence ?? []).length, candidates_n: (i.candidate_clips ?? i.candidates ?? []).length,
      })) };
  }).filter(Boolean);
}

export function registerVr(app: FastifyInstance) {
  /* ---------------------------------------------------------------- overview */
  app.get('/api/vr/overview', async () => {
    const brand = one(`SELECT id, name, format FROM brands WHERE id=?`, BRAND);
    if (!brand) return { error: 'brand viral-rankings is not registered' };
    const inv = inventory();
    const cats = all(`SELECT id, parent_id, title, rights_risk, status FROM categories WHERE brand_id=? ORDER BY title`, BRAND);
    const ideas = all(`SELECT idea_id, topic, status, opportunity_score, category_id, json_extract(data,'$.judge.decision') decision FROM ideas
      WHERE brand_id=? OR idea_id LIKE 'idea-vr-%' ORDER BY opportunity_score DESC`, BRAND);
    const prods = all(`SELECT production_id, title, current_state stage, approval_status, qa_score, json_extract(data,'$.fixture') fixture, updated_at FROM productions WHERE brand_id=? ORDER BY updated_at DESC`, BRAND)
      .map(p => ({ ...p, fixture: !!p.fixture, plan: fs.existsSync(path.join(P.productions, p.production_id, 'plan.json')) }));
    const real = one(`SELECT MAX(observed_at) at, COUNT(*) n FROM category_metrics_snapshots WHERE brand_id=? AND is_fixture=0`, BRAND);
    const fix = one(`SELECT MAX(observed_at) at, COUNT(*) n FROM category_metrics_snapshots WHERE brand_id=? AND is_fixture=1`, BRAND);
    const yt = one(`SELECT MAX(a.observation_time) at, COUNT(*) n FROM analytics_snapshots a JOIN productions p ON p.production_id=a.production_id WHERE p.brand_id=?`, BRAND);
    return {
      brand, ideas_in_progress: ideas.filter(i => ['proposed', 'approved'].includes(i.status) && (i.status === 'approved' || /^shortlist/.test(i.decision ?? ''))),
      ideas_by_status: all(`SELECT status, COUNT(*) n FROM ideas WHERE brand_id=? OR idea_id LIKE 'idea-vr-%' GROUP BY 1`, BRAND),
      inventory: { total: inv.total, uncategorised: inv.uncategorised, top: cats.filter(c => !c.parent_id).map(c => ({ id: c.id, title: c.title, rights_risk: c.rights_risk, ...(inv.byCat[c.id] ?? EMPTY_INV()),
        subs: cats.filter(s => s.parent_id === c.id).map(s => ({ id: s.id, title: s.title, ...(inv.byCat[s.id] ?? EMPTY_INV()) })) })) },
      productions: prods, stage_counts: all(`SELECT current_state stage, COUNT(*) n FROM productions WHERE brand_id=? GROUP BY 1`, BRAND),
      publishing: all(`SELECT pu.publication_status status, COUNT(*) n FROM publishing pu JOIN productions p ON p.production_id=pu.production_id WHERE p.brand_id=? GROUP BY 1`, BRAND),
      analytics: { real_snapshots: real.n, real_last: real.at, fixture_snapshots: fix.n, fixture_last: fix.at, youtube_rows: yt.n, youtube_last: yt.at,
        note: 'No background scheduler: snapshots appear only after an owner-invoked pull (see ANALYTICS-EXPERIMENTS.md).' },
    };
  });

  /* ---------------------------------------------------------------- idea arena */
  app.get('/api/vr/ideas/arena', async () => {
    const judge = readJson(path.join(IDEAS_DIR, 'judge-decision.json'));
    const dbIdeas = all(`SELECT idea_id, topic, status, opportunity_score score, category_id, hook, data, updated_at FROM ideas WHERE brand_id=? OR idea_id LIKE 'idea-vr-%' ORDER BY opportunity_score IS NULL, opportunity_score DESC`, BRAND)
      .map(i => { const d = J.parse(i.data, {}) as any; delete i.data; return { ...i, judge: d.judge ?? null, merged_from: d.scout?.merged_from ?? [], overrides: d.override ?? [] }; });
    const cat = Object.fromEntries(all(`SELECT id, title FROM categories WHERE brand_id=?`, BRAND).map(c => [c.id, c.title]));
    return {
      scouts: scoutCards(),
      judge: judge ? { decided_at: judge.decided_at, judge: judge.judge, formula: judge.formula?.total ?? null, formula_note: judge.formula?.note ?? null, hard_gates: judge.formula?.hard_gates ?? [],
        pick: judge.pick ? { merged_id: judge.pick.merged_id, format: judge.pick.format, why_top3_not_top5: judge.pick.why_top3_not_top5, criterion: judge.pick.ranking_criterion, hooks: judge.pick.hooks } : null,
        disagreements: judge.disagreements ?? [], spot_check_method: judge.spot_checks?.method ?? null } : null,
      ideas: dbIdeas.map(i => ({ ...i, category: cat[i.category_id] ?? null })),
      statuses: ['proposed', 'approved', 'parked', 'rejected'],
    };
  });
  /** Manual override: records who/why/when inside ideas.data.override (history is kept, nothing is erased). */
  app.post('/api/vr/ideas/:id/status', async (req: any) => {
    const { status, reason } = req.body ?? {};
    if (!['proposed', 'approved', 'parked', 'rejected'].includes(status)) throw new Error('bad status');
    if (!String(reason ?? '').trim()) throw new Error('a reason is required for a manual override');
    const i = one(`SELECT idea_id, status, data FROM ideas WHERE idea_id=? AND (brand_id=? OR idea_id LIKE 'idea-vr-%')`, req.params.id, BRAND);
    if (!i) throw new Error('idea not found in viral-rankings');
    const d = J.parse(i.data, {}) as any; (d.override ??= []).push({ at: new Date().toISOString(), by: 'owner', from: i.status, to: status, reason: String(reason).slice(0, 500) });
    db().prepare(`UPDATE ideas SET status=?, data=?, updated_at=datetime('now') WHERE idea_id=?`).run(status, J.str(d), i.idea_id);
    emit({ kind: 'idea.status', agent: 'owner', message: `Idea ${i.idea_id}: ${i.status} → ${status} (manual override: ${String(reason).slice(0, 120)})` });
    return { ok: true };
  });

  /* ---------------------------------------------------------------- categories */
  const snapshotsFor = (fixtures: boolean) => {
    const rows = all(`SELECT * FROM category_metrics_snapshots WHERE brand_id=? ${fixtures ? '' : 'AND is_fixture=0'} ORDER BY observed_at DESC, id DESC`, BRAND);
    const latest: Record<string, Record<string, any>> = {};
    const count: Record<string, { real: number; fixture: number }> = {};
    for (const r of rows) {
      const c = (count[r.category_id] ??= { real: 0, fixture: 0 }); r.is_fixture ? c.fixture++ : c.real++;
      const k = `${r.age_bucket ?? 'none'}${r.is_fixture ? ':fx' : ''}`;
      const slot = (latest[r.category_id] ??= {});
      if (!slot[k]) { delete r.data; r.is_fixture = !!r.is_fixture; slot[k] = r; }
    }
    return { latest, count };
  };
  app.get('/api/vr/categories', async (req: any) => {
    const fixtures = req.query.fixtures === '1';
    const inv = inventory(), snaps = snapshotsFor(fixtures);
    const rows = all(`SELECT * FROM categories WHERE brand_id=? ORDER BY title`, BRAND).map(c => ({
      id: c.id, parent_id: c.parent_id, slug: c.slug, title: c.title, purpose: c.purpose, audience_fit: c.audience_fit, rights_risk: c.rights_risk, status: c.status, origin: c.origin,
      keywords: J.parse(c.keywords, []), exclusions: J.parse(c.exclusions, []), safety_constraints: J.parse(c.safety_constraints, []), next_experiments: J.parse(c.next_experiments, []),
      ideas: one(`SELECT COUNT(*) n FROM ideas WHERE category_id=?`, c.id).n, inventory: inv.byCat[c.id] ?? EMPTY_INV(),
      metrics: snaps.latest[c.id] ?? {}, snapshot_counts: snaps.count[c.id] ?? { real: 0, fixture: 0 },
    }));
    return { fixtures, metrics: METRICS, ages: AGES, tree: rows.filter(c => !c.parent_id).map(c => ({ ...c, children: rows.filter(s => s.parent_id === c.id) })), uncategorised: inv.uncategorised };
  });
  app.get('/api/vr/categories/:id/snapshots', async (req: any) => {
    const { limit, offset } = page(req.query), fx = req.query.fixtures === '1';
    const where = `category_id=? AND brand_id=? ${fx ? '' : 'AND is_fixture=0'}`;
    const total = one(`SELECT COUNT(*) n FROM category_metrics_snapshots WHERE ${where}`, req.params.id, BRAND).n;
    const rows = all(`SELECT * FROM category_metrics_snapshots WHERE ${where} ORDER BY observed_at DESC, id DESC LIMIT ? OFFSET ?`, req.params.id, BRAND, limit, offset).map(r => { delete r.data; return { ...r, is_fixture: !!r.is_fixture }; });
    return { total, rows, next: offset + rows.length < total ? offset + rows.length : null };
  });

  /* ---------------------------------------------------------------- moment library */
  app.get('/api/vr/moments', async (req: any) => {
    const q = req.query, { limit, offset } = page(q);
    const w = ['m.brand_id=?'], a: any[] = [BRAND];
    if (q.q) { w.push(`(m.description LIKE ? OR m.tags LIKE ? OR s.title LIKE ? OR m.moment_id LIKE ?)`); const l = `%${q.q}%`; a.push(l, l, l, l); }
    if (q.category) { w.push(`(m.category_id=? OR m.category_id IN (SELECT id FROM categories WHERE parent_id=?))`); a.push(q.category, q.category); }
    if (q.status) { w.push('m.creative_status=?'); a.push(q.status); }
    if (q.source) { w.push('m.source_id=?'); a.push(q.source); }
    if (q.rights) { w.push(`${RIGHTS_STATE}=?`); a.push(q.rights); }
    if (q.available === '1') w.push(`m.creative_status='usable' AND m.duplicate_of IS NULL`);
    if (q.used === '1') w.push(USED); if (q.used === '0') w.push(`NOT ${USED}`);
    const order = { fit: 'm.rank_suitability IS NULL, m.rank_suitability DESC, m.moment_id', newest: 'm.created_at DESC, m.moment_id', source: 'm.source_id, m.start_ms', length: '(m.end_ms-m.start_ms) DESC' }[String(q.sort ?? 'fit')] ?? 'm.moment_id';
    const from = `FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id WHERE ${w.join(' AND ')}`;
    const total = one(`SELECT COUNT(*) n ${from}`, ...a).n;
    const rows = all(`SELECT m.*, s.title source_title, s.permission_status source_status, ${RIGHTS_STATE} rs, ${USED} used ${from} ORDER BY ${order} LIMIT ? OFFSET ?`, ...a, limit, offset).map(momentRow);
    return { total, rows, next: offset + rows.length < total ? offset + rows.length : null, facets: {
      status: all(`SELECT creative_status v, COUNT(*) n FROM moments WHERE brand_id=? GROUP BY 1 ORDER BY 2 DESC`, BRAND),
      rights: all(`SELECT ${RIGHTS_STATE} v, COUNT(*) n FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id WHERE m.brand_id=? GROUP BY 1`, BRAND) } };
  });
  app.get('/api/vr/moments/:id', async (req: any) => {
    const r = one(`SELECT m.*, s.title source_title, s.creator, s.license, s.original_url, s.source_platform, s.attribution, s.permission_status source_status, s.permission_evidence, s.license_expires, s.duration source_duration,
      ${RIGHTS_STATE} rs, ${USED} used FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id WHERE m.moment_id=? AND m.brand_id=?`, req.params.id, BRAND);
    if (!r) return { error: 'moment not found' };
    const row = momentRow(r);
    const sheets = (() => { try { return fs.readdirSync(path.join(P.productions, '_viral-rankings-pilot', 'sheets')).filter(f => f.startsWith(r.source_id) && /\.jpg$/i.test(f)).map(f => `/media/productions/_viral-rankings-pilot/sheets/${f}`); } catch { return []; } })();
    const idea = r.idea_id ? one(`SELECT idea_id, topic, status FROM ideas WHERE idea_id=?`, r.idea_id) : null;
    const cat = r.category_id ? one(`SELECT c.id, c.title, (SELECT title FROM categories WHERE id=c.parent_id) parent_title FROM categories c WHERE c.id=?`, r.category_id) : null;
    return { ...row, idea, category: cat,
      setup_ms: r.setup_ms, payoff_ms: r.payoff_ms, reaction_ms: r.reaction_ms, audio_essential: r.audio_essential == null ? null : !!r.audio_essential, baked_captions: r.baked_captions == null ? null : !!r.baked_captions,
      license_conditions: J.parse(r.license_conditions, []), evidence: J.parse(r.evidence, {}), updated_at: r.updated_at,
      source: { asset_id: r.source_id, title: r.source_title, creator: r.creator, license: r.license, original_url: r.original_url, platform: r.source_platform, attribution: r.attribution, status: r.source_status,
        evidence_url: r.permission_evidence, license_expires: r.license_expires, duration_s: r.source_duration },
      media_url: mediaFile(r.source_id) ? `/api/vr/media/${encodeURIComponent(r.source_id)}` : null, sheets,
      rights_log: all(`SELECT ts, asset_id, actor, from_status, to_status, reason, evidence FROM rights_log WHERE asset_id IN (?,?) ORDER BY id DESC LIMIT 20`, r.source_id, r.moment_id),
      usage: all(`SELECT production_id, version, status, rank_position, reveal_index, in_ms, out_ms, platform, published_at, updated_at FROM moment_usage WHERE moment_id=? ORDER BY id DESC LIMIT 50`, r.moment_id),
      siblings: all(`SELECT moment_id, start_ms, end_ms, creative_status FROM moments WHERE source_id=? AND moment_id<>? ORDER BY start_ms`, r.source_id, r.moment_id) };
  });
  /** Thumbnail from the moment's mid-frame, cached under data/cache/vr-thumbs. */
  app.get('/api/vr/moments/:id/thumb', async (req: any, reply) => {
    const m = one(`SELECT moment_id, source_id, start_ms, end_ms FROM moments WHERE moment_id=? AND brand_id=?`, req.params.id, BRAND);
    const src = m && mediaFile(m.source_id);
    if (!m || !src) return reply.code(404).send();
    const dir = path.join(P.cache, 'vr-thumbs'); fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, `${m.moment_id}-${m.start_ms}-${m.end_ms}.jpg`);
    if (!fs.existsSync(out)) {
      const at = ((m.start_ms + m.end_ms) / 2000).toFixed(2);
      await new Promise<void>(res => execFile('ffmpeg', ['-v', 'error', '-y', '-ss', at, '-i', src, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '4', out], { timeout: 20000 }, () => res()));
    }
    if (!fs.existsSync(out)) return reply.code(404).send();
    return reply.type('image/jpeg').header('cache-control', 'max-age=3600').send(fs.createReadStream(out));
  });
  /** Source media for the scrubber (range requests; id-based, only library sources, nothing outside data/media). */
  app.get('/api/vr/media/:asset', async (req: any, reply) => {
    const f = SAFE_ID.test(req.params.asset) ? mediaFile(req.params.asset) : null;
    if (!f) return reply.code(404).send();
    return sendFile(req, reply, f, /\.webm$/i.test(f) ? 'video/webm' : /\.mov$/i.test(f) ? 'video/quicktime' : /\.ogv$/i.test(f) ? 'video/ogg' : 'video/mp4');
  });

  /* ---------------------------------------------------------------- productions list (rank / script / lineage selectors) */
  app.get('/api/vr/productions', async () => {
    const ids = new Set<string>([...all(`SELECT production_id id FROM productions WHERE brand_id=?`, BRAND), ...all(`SELECT DISTINCT production_id id FROM moment_usage`)].map(r => r.id));
    let dirs: string[] = []; try { dirs = fs.readdirSync(P.productions); } catch {}
    for (const d of dirs) if (SAFE_ID.test(d) && (fs.existsSync(path.join(P.productions, d, 'script', 'writer-pass-1.json')) || (d.startsWith('rank-') && readJson(path.join(P.productions, d, 'plan.json'))?.brand_id === BRAND))) ids.add(d);
    return [...ids].map(id => {
      const p = one(`SELECT title, current_state stage, qa_score, brand_id, json_extract(data,'$.fixture') fixture FROM productions WHERE production_id=?`, id);
      const dir = path.join(P.productions, id);
      return { production_id: id, title: p?.title ?? null, stage: p?.stage ?? null, qa_score: p?.qa_score ?? null, fixture: !!p?.fixture || id.startsWith('_'),
        has_plan: fs.existsSync(path.join(dir, 'plan.json')), has_script: fs.existsSync(path.join(dir, 'script')), in_db: !!p };
    }).filter(p => p.in_db ? true : (p.has_plan || p.has_script)).sort((a, b) => a.production_id.localeCompare(b.production_id));
  });

  /* ---------------------------------------------------------------- rank editor */
  const enrichPlan = (plan: any) => (plan?.entries ?? []).map((e: any) => {
    const m = one(`SELECT m.moment_id, m.description, m.start_ms, m.end_ms, m.creative_status, ${RIGHTS_STATE} rs FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id WHERE m.moment_id=?`, e.moment_id);
    return { moment_id: e.moment_id, description: m?.description ?? null, window: m ? [m.start_ms, m.end_ms] : null, creative_status: m?.creative_status ?? null, rights: m?.rs ?? 'unknown',
      thumb: m && mediaFile(one(`SELECT source_id FROM moments WHERE moment_id=?`, e.moment_id).source_id) ? `/api/vr/moments/${encodeURIComponent(e.moment_id)}/thumb` : null };
  });
  app.get('/api/vr/ranking/plans/:production', async (req: any) => {
    const f = path.join(prodDir(req.params.production), 'plan.json');
    const plan = readJson(f);
    if (!plan) return { error: 'no plan.json for this production' };
    const rep = validateRankingPlan(plan);
    return { production_id: req.params.production, plan, report: { valid: rep.valid, publishable: rep.publishable, errors: rep.errors, rights_blockers: rep.rights_blockers, warnings: rep.warnings },
      moments: enrichPlan(plan), has_cutlist: fs.existsSync(path.join(path.dirname(f), 'cutlist.json')), saved_at: fs.statSync(f).mtime.toISOString() };
  });
  app.post('/api/vr/ranking/validate', async (req: any) => {
    const rep = validateRankingPlan(req.body?.plan);
    return { valid: rep.valid, publishable: rep.publishable, errors: rep.errors, rights_blockers: rep.rights_blockers, warnings: rep.warnings };
  });
  /** Save = structural + library validity required (rights blockers are allowed in a draft: the build gate still blocks them). Keeps the previous file. */
  app.post('/api/vr/ranking/plans/:production', async (req: any) => {
    const plan = req.body?.plan, id = req.params.production, dir = prodDir(id);
    if (!fs.existsSync(dir)) throw new Error('production folder not found');
    if (plan?.production_id && plan.production_id !== id) throw new Error('plan.production_id does not match this production');
    const rep = validateRankingPlan({ ...plan, production_id: id });
    if (!rep.valid) throw new Error('plan is not valid: ' + rep.errors.slice(0, 3).join('; '));
    const f = path.join(dir, 'plan.json');
    if (fs.existsSync(f)) fs.copyFileSync(f, path.join(dir, `plan.prev-${Date.now()}.json`));
    fs.writeFileSync(f + '.tmp', JSON.stringify({ ...plan, production_id: id }, null, 1) + '\n'); fs.renameSync(f + '.tmp', f);
    emit({ kind: 'ranking.plan.saved', agent: 'owner', productionId: id, level: rep.publishable ? 'info' : 'warn', message: `Ranking plan saved for ${id}: reveal ${plan.reveal_order?.join('→')} (${rep.publishable ? 'publishable' : 'not publishable yet'}); rebuild the cut list with ranking:cutlist` });
    return { ok: true, publishable: rep.publishable, warnings: rep.warnings };
  });

  /* ---------------------------------------------------------------- script review */
  app.get('/api/vr/script/:production', async (req: any) => {
    const dir = path.join(prodDir(req.params.production), 'script');
    let files: string[] = []; try { files = fs.readdirSync(dir); } catch {}
    const nums = [...new Set(files.map(f => /^(?:writer|critic)-pass-(\d+)\.json$/.exec(f)?.[1]).filter(Boolean).map(Number))].sort((a, b) => a - b);
    // Writer pass 1 = full `lines`; later passes may carry `alt_lines` and `critic_responses` (line_id, response, new_text) instead of a full list.
    const lines = (d: any): any[] => {
      if (Array.isArray(d)) return d;
      const base: any[] = d?.lines ?? d?.candidates ?? [];
      const seen = new Set(base.map(l => l.line_id));
      const alt = (d?.alt_lines ?? []).filter((l: any) => !seen.has(l.line_id));
      for (const l of alt) seen.add(l.line_id);
      const resp = (d?.critic_responses ?? []).filter((r: any) => r.new_text && !seen.has(r.line_id)).map((r: any) => ({ line_id: r.line_id, spoken_text: r.new_text, response: r.response, joke_rationale: r.note }));
      return [...base, ...alt, ...resp];
    };
    const reviews = (d: any): any[] => Array.isArray(d) ? d : d?.reviews ?? d?.lines ?? d?.critiques ?? [];
    const passes = nums.map(n => {
      const w = readJson(path.join(dir, `writer-pass-${n}.json`)), c = readJson(path.join(dir, `critic-pass-${n}.json`));
      return { n, fixture: !!(w?.fixture || c?.fixture), writer: w ? { lines: lines(w), answers: w.answers ?? null, note: w.note ?? null, concept: w.concept ?? null, titles: Array.isArray(w.titles) ? w.titles.slice(0, 8) : null, rail_labels: w.rail_labels && typeof w.rail_labels === 'object' ? w.rail_labels : null } : null,
        critic: c ? { reviews: reviews(c), selected: c.selected ?? null, stabilised: c.stabilised ?? null, note: c.note ?? null } : null };
    });
    const ids = new Set<string>(); for (const p of passes) for (const l of p.writer?.lines ?? []) if (l.moment_id) ids.add(l.moment_id);
    const moments = Object.fromEntries([...ids].map(id => [id, one(`SELECT description, start_ms, end_ms FROM moments WHERE moment_id=?`, id) ?? null]));
    const cap = path.join(prodDir(req.params.production), 'captions.json');
    return { production_id: req.params.production, passes, moments, has_captions: fs.existsSync(cap) };
  });

  /* ---------------------------------------------------------------- lineage */
  app.get('/api/vr/lineage/:production', async (req: any) => {
    const id = req.params.production; prodDir(id);
    const prod = one(`SELECT production_id, title, current_state stage, approval_status, qa_score, brand_id, json_extract(data,'$.fixture') fixture, created_at FROM productions WHERE production_id=?`, id);
    const usage = all(`SELECT u.id, u.version, u.status, u.rank_position, u.reveal_index, u.in_ms, u.out_ms, u.updated_at, u.moment_id, u.source_id, m.description, m.category_id mcat, m.idea_id midea, m.creative_status,
      s.title source_title, s.creator, s.license, s.original_url, s.permission_status, ${RIGHTS_STATE} rs FROM moment_usage u LEFT JOIN moments m ON m.moment_id=u.moment_id LEFT JOIN sources s ON s.asset_id=u.source_id
      WHERE u.production_id=? ORDER BY u.version, u.reveal_index, u.id`, id);
    const plan = readJson(path.join(prodDir(id), 'plan.json'));
    const ideaId = plan?.idea_id ?? usage.find(u => u.midea)?.midea ?? null, catId = plan?.category_id ?? usage.find(u => u.mcat)?.mcat ?? null;
    const idea = ideaId ? one(`SELECT idea_id, topic, status, opportunity_score score FROM ideas WHERE idea_id=?`, ideaId) : null;
    const cat = catId ? one(`SELECT c.id, c.title, c.parent_id, (SELECT title FROM categories WHERE id=c.parent_id) parent_title FROM categories c WHERE c.id=?`, catId) : null;
    const sources = [...new Set(usage.map(u => u.source_id))].map(sid => { const u = usage.find(x => x.source_id === sid); return { asset_id: sid, title: u.source_title, creator: u.creator, license: u.license, original_url: u.original_url, status: u.permission_status,
      moments: [...new Set(usage.filter(x => x.source_id === sid).map(x => x.moment_id))].map(mid => { const rows = usage.filter(x => x.moment_id === mid); const l = rows[rows.length - 1];
        return { moment_id: mid, description: l.description, rights: l.rs, usage: rows.map(r => ({ version: r.version, status: r.status, rank_position: r.rank_position, reveal_index: r.reveal_index, in_ms: r.in_ms, out_ms: r.out_ms, at: r.updated_at })) }; }) }; });
    const versions = all(`SELECT n, created_at, render_path, tech_qa FROM versions WHERE production_id=? ORDER BY n DESC`, id).map(v => { const t = J.parse(v.tech_qa, {}) as any;
      return { n: v.n, created_at: v.created_at, rendered: !!v.render_path, duration: t?.duration ?? null, width: t?.width ?? null, height: t?.height ?? null, tech_pass: t?.pass ?? t?.ok ?? null }; });
    const reviews = all(`SELECT id, reviewer, kind, score, verdict, created_at FROM reviews WHERE production_id=? ORDER BY id DESC LIMIT 10`, id);
    const publishing = all(`SELECT platform, publication_status status, external_post_id, scheduled_time FROM publishing WHERE production_id=?`, id);
    const analytics = all(`SELECT external_post_id, platform, observation_time, hours_since_publish, views, followers_gained, source FROM analytics_snapshots WHERE production_id=? ORDER BY observation_time`, id);
    return { production: prod ? { ...prod, fixture: !!prod.fixture } : null, idea, category: cat, sources, usage_rows: usage.length, versions, reviews, publishing, analytics,
      gaps: [!idea && 'no idea linked (plan.idea_id / moments.idea_id empty)', !publishing.length && 'not published or scheduled yet: no platform id', !analytics.length && 'no analytics snapshots yet'].filter(Boolean) };
  });

  /* ---------------------------------------------------------------- learning dashboard */
  app.get('/api/vr/learning', async (req: any) => {
    const age = (AGES as readonly string[]).includes(req.query.age) ? req.query.age : '7d';
    const cats = all(`SELECT id, parent_id, title FROM categories WHERE brand_id=? ORDER BY title`, BRAND);
    const snaps = all(`SELECT * FROM category_metrics_snapshots WHERE brand_id=? ORDER BY observed_at DESC, id DESC`, BRAND).map(r => { delete r.data; return { ...r, is_fixture: !!r.is_fixture }; });
    const build = (fixture: boolean) => {
      const mine = snaps.filter(s => s.is_fixture === fixture);
      const latest = (cid: string, bucket: string) => mine.find(s => s.category_id === cid && s.age_bucket === bucket) ?? null;
      const ids = [...new Set(mine.map(s => s.category_id))];
      const meds = ids.map(c => latest(c, age)?.median_views).filter((v: any) => v != null).sort((a: number, b: number) => a - b);
      const peer = meds.length >= 2 ? (meds.length % 2 ? meds[(meds.length - 1) / 2] : (meds[meds.length / 2 - 1] + meds[meds.length / 2]) / 2) : null;
      return { fixture, snapshots: mine.length, peer_median_views: peer, categories: ids.map(cid => {
        const c = cats.find(x => x.id === cid), cohorts: Record<string, any> = {};
        for (const b of AGES) { const s = latest(cid, b); if (s) cohorts[b] = { ...s, age_days: Math.round((Date.now() - Date.parse(s.observed_at)) / 864e5) }; }
        const at = cohorts[age];
        return { id: cid, title: c?.title ?? cid, parent_id: c?.parent_id ?? null, cohorts, recommendation: at ? recommend(at, peer) : { action: 'unknown', text: `No ${age} snapshot for this category.`, warnings: [], weight: null, perf: null } };
      }) };
    };
    return { age, ages: AGES, real: build(false), fixture: build(true), rule: {
      weight: 'new_weight = 1 + clamp(perf - 1, -0.5, +0.5) x confidence_weight x min(1, sample_size / 6)', confidence_weight: CONF_W, min_sample: MIN_N, stale_days: STALE_DAYS,
      perf: 'normalized_perf if present (1.0 = the channel\'s own baseline at the same age), else median_views / peer-category median at that age (needs >= 2 categories); else unknown (no recommendation).',
      note: 'Heuristic prior update, not a forecast. Fixture rows are shown separately and never feed real totals.' } };
  });
}
