/**
 * viral-rankings data layer: categories (two levels), category metric snapshots, the moment library and moment usage.
 * Everything goes through zod contracts in packages/shared/src/schemas.ts and writes events for the dashboard feed.
 * NULL metrics mean "unknown", never zero.
 */
import { db, J, newId } from '../../shared/src/db.ts';
import { policy } from '../../shared/src/secrets.ts';
import { emit } from '../../shared/src/events.ts';
import { Category, CategoryMetricsSnapshot, CATEGORY_METRICS, Moment, MomentUsage, MOMENT_CREATIVE, MOMENT_DEAD, PUBLISHABLE_RIGHTS, RIGHTS, validate } from '../../shared/src/schemas.ts';

const LIST_COLS = ['research_queries', 'keywords', 'exclusions', 'safety_constraints', 'next_experiments'] as const;

/* ------------------------------------------------------------------ categories */

/** Insert or update one category. `parent_slug` may be used instead of `parent_id` (resolved within the brand). */
export function upsertCategory(raw: any, agent = 'orchestrator') {
  const brand = db().prepare(`SELECT id FROM brands WHERE id=?`).get(raw.brand_id);
  if (!brand) throw new Error(`unknown brand ${raw.brand_id}`);
  let parent_id = raw.parent_id ?? null;
  if (!parent_id && raw.parent_slug) {
    const p = db().prepare(`SELECT id FROM categories WHERE brand_id=? AND slug=?`).get(raw.brand_id, raw.parent_slug) as any;
    if (!p) throw new Error(`parent category "${raw.parent_slug}" not found for ${raw.brand_id}`);
    parent_id = p.id;
  }
  const existing = db().prepare(`SELECT id FROM categories WHERE brand_id=? AND slug=?`).get(raw.brand_id, raw.slug) as any;
  const { parent_slug: _ps, ...rest } = raw;
  const c = validate(Category, { ...rest, id: raw.id ?? existing?.id ?? newId('cat'), parent_id }, 'category');
  if (c.parent_id) {
    const p = db().prepare(`SELECT brand_id, parent_id FROM categories WHERE id=?`).get(c.parent_id) as any;
    if (!p) throw new Error(`parent ${c.parent_id} not found`);
    if (p.brand_id !== c.brand_id) throw new Error('parent belongs to another brand');
    if (p.parent_id) throw new Error('only two levels are supported (category → subcategory)');
  }
  db().prepare(`INSERT INTO categories(id, brand_id, parent_id, slug, title, purpose, audience_fit, research_queries, keywords, exclusions, origin, rights_risk,
      safety_constraints, review_cadence, next_experiments, status, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, slug=excluded.slug, title=excluded.title, purpose=excluded.purpose, audience_fit=excluded.audience_fit,
      research_queries=excluded.research_queries, keywords=excluded.keywords, exclusions=excluded.exclusions, origin=excluded.origin, rights_risk=excluded.rights_risk,
      safety_constraints=excluded.safety_constraints, review_cadence=excluded.review_cadence, next_experiments=excluded.next_experiments, status=excluded.status,
      data=excluded.data, updated_at=datetime('now')`)
    .run(c.id, c.brand_id, c.parent_id, c.slug, c.title, c.purpose, c.audience_fit, ...LIST_COLS.slice(0, 3).map(k => J.str(c[k])), c.origin, c.rights_risk,
      J.str(c.safety_constraints), c.review_cadence, J.str(c.next_experiments), c.status, J.str(raw.data ?? {}));
  emit({ kind: 'category.upserted', agent, message: `${c.brand_id}: category ${c.parent_id ? '↳ ' : ''}${c.title} saved` });
  return c.id;
}

/** Categories of a brand with their latest real (non-fixture unless asked) snapshot and live moment counts. */
export function listCategories(brandId: string, opts: { includeFixtures?: boolean; ageBucket?: string } = {}) {
  const rows = db().prepare(`SELECT * FROM categories WHERE brand_id=? ORDER BY COALESCE(parent_id, id), parent_id IS NOT NULL, title`).all(brandId) as any[];
  return rows.map(r => {
    for (const k of LIST_COLS) r[k] = J.parse(r[k], []);
    r.data = J.parse(r.data, {});
    const snap = db().prepare(`SELECT * FROM category_metrics_snapshots WHERE category_id=? ${opts.includeFixtures ? '' : 'AND is_fixture=0'}
      ${opts.ageBucket ? 'AND age_bucket=?' : ''} ORDER BY observed_at DESC, id DESC LIMIT 1`).get(...[r.id, ...(opts.ageBucket ? [opts.ageBucket] : [])]) as any;
    r.latest_snapshot = snap ? { ...snap, is_fixture: !!snap.is_fixture, data: J.parse(snap.data, {}) } : null;
    r.moments = momentCounts({ categoryId: r.id });
    r.ideas = (db().prepare(`SELECT COUNT(*) n FROM ideas WHERE category_id=?`).get(r.id) as any).n;
    return r;
  });
}

/** Append a metrics snapshot. Unknown values must be null (they are stored as NULL, not 0). */
export function addCategorySnapshot(raw: any, opts: { fixture?: boolean; agent?: string } = {}) {
  const s = validate(CategoryMetricsSnapshot, { observed_at: new Date().toISOString(), ...raw, is_fixture: opts.fixture || raw.is_fixture === true, ...(opts.fixture && !raw.source ? { source: 'fixture' } : {}) }, 'category snapshot');
  const cat = db().prepare(`SELECT brand_id FROM categories WHERE id=?`).get(s.category_id) as any;
  if (!cat) throw new Error(`unknown category ${s.category_id}`);
  const r = db().prepare(`INSERT INTO category_metrics_snapshots(category_id, brand_id, observed_at, age_bucket, platform, sample_size, ${CATEGORY_METRICS.join(',')},
      confidence, is_fixture, source, provenance, data) VALUES (?,?,?,?,?,?,${CATEGORY_METRICS.map(() => '?').join(',')},?,?,?,?,?)`)
    .run(s.category_id, cat.brand_id, s.observed_at, s.age_bucket, s.platform, s.sample_size, ...CATEGORY_METRICS.map(k => s[k]), s.confidence, s.is_fixture ? 1 : 0, s.source, s.provenance, J.str(raw.data ?? {}));
  emit({ kind: 'category.snapshot', agent: opts.agent ?? 'growth-director', level: s.is_fixture ? 'warn' : 'info',
    message: `${s.is_fixture ? '[FIXTURE] ' : ''}metrics snapshot for ${s.category_id} (${s.age_bucket ?? 'no age bucket'})` });
  return Number(r.lastInsertRowid);
}

/* ------------------------------------------------------------------ moments */

function rowToMoment(r: any) {
  if (!r) return r;
  for (const k of ['scene_boundaries', 'content_risks', 'tags', 'license_conditions']) r[k] = J.parse(r[k], []);
  for (const k of ['transcript', 'quality']) r[k] = J.parse(r[k], null);
  r.evidence = J.parse(r.evidence, {}); r.data = J.parse(r.data, {});
  for (const k of ['audio_essential', 'baked_captions']) r[k] = r[k] == null ? null : !!r[k];
  return r;
}

export function getMoment(id: string) { return rowToMoment(db().prepare(`SELECT * FROM moments WHERE moment_id=?`).get(id)); }

/** Effective rights for a moment = the most restrictive of its source's status and its own (null = inherit). */
export function momentRights(m: { source_id: string; rights_status: string | null }) {
  const s = db().prepare(`SELECT permission_status, license_expires FROM sources WHERE asset_id=?`).get(m.source_id) as any;
  const reasons: string[] = [];
  if (!s) reasons.push(`source ${m.source_id} unknown`);
  else {
    if (!PUBLISHABLE_RIGHTS.has(s.permission_status)) reasons.push(`source ${m.source_id} is ${s.permission_status}`);
    if (s.license_expires && new Date(s.license_expires) < new Date()) reasons.push(`source licence expired ${s.license_expires}`);
  }
  if (m.rights_status != null && !PUBLISHABLE_RIGHTS.has(m.rights_status)) reasons.push(`moment rights ${m.rights_status}`);
  return { publishable: reasons.length === 0, source_status: s?.permission_status ?? null, moment_status: m.rights_status, reasons };
}

/**
 * Countersign gate (hardening 2026-10-31): a showrunner/librarian/classifier can only PROPOSE an approval. For a source (and a
 * moment with its own rights status) to be publishable in a viral-rankings plan, the LATEST rights_log row for that asset must be
 * by a countersigning actor (policy viralRankings.countersignActors, default rights-scout + owner). Derived from rights_log (the
 * audit trail), so a later re-proposal (changed window/conditions) automatically needs a new countersign. Pure read.
 */
export function countersignActors(): string[] {
  const a = (policy() as any).viralRankings?.countersignActors;
  return Array.isArray(a) && a.length ? a.map(String) : ['rights-scout', 'owner'];
}
export function rightsCountersign(m: { moment_id?: string; source_id: string; rights_status: string | null }) {
  const actors = countersignActors();
  const reasons: string[] = [];
  const check = (assetId: string, label: string) => {
    const last = db().prepare(`SELECT id, actor, to_status FROM rights_log WHERE asset_id=? ORDER BY id DESC LIMIT 1`).get(assetId) as any;
    if (!last) reasons.push(`${label} ${assetId} has no rights_log decision (needs a ${actors.join('/')} countersign)`);
    else if (!actors.includes(last.actor)) reasons.push(`${label} ${assetId}: latest rights decision #${last.id} (${last.to_status}) is by ${last.actor}, not countersigned by ${actors.join('/')}`);
    return last?.id ?? null;
  };
  const source_decision = check(m.source_id, 'source');
  const moment_decision = m.rights_status != null && m.moment_id ? check(m.moment_id, 'moment') : null;
  return { countersigned: reasons.length === 0, source_decision, moment_decision, reasons };
}

export function addMoment(raw: any, agent = 'viral-analyst') {
  const src = db().prepare(`SELECT asset_id, duration, fingerprint FROM sources WHERE asset_id=?`).get(raw.source_id) as any;
  if (!src) throw new Error(`unknown source ${raw.source_id}`);
  const m = validate(Moment, { ...raw, moment_id: raw.moment_id ?? newId('mom'), checksum: raw.checksum ?? src.fingerprint ?? null }, 'moment');
  if (src.duration != null && m.end_ms > Math.round(src.duration * 1000) + 50) throw new Error(`moment ${m.moment_id}: end_ms ${m.end_ms} beyond source duration ${src.duration} s`);
  // duplicate guard: an identical window on the same source, or the same perceptual hash elsewhere
  const dupe = db().prepare(`SELECT moment_id FROM moments WHERE moment_id<>? AND ((source_id=? AND start_ms=? AND end_ms=?) OR (? IS NOT NULL AND phash=?)) LIMIT 1`)
    .get(m.moment_id, m.source_id, m.start_ms, m.end_ms, m.phash, m.phash) as any;
  if (dupe && !m.duplicate_of) m.duplicate_of = dupe.moment_id;
  db().prepare(`INSERT INTO moments(moment_id, source_id, brand_id, category_id, idea_id, start_ms, end_ms, setup_ms, payoff_ms, reaction_ms, scene_boundaries, description,
      transcript, quality, rank_suitability, content_risks, tags, creative_status, rights_status, license_conditions, checksum, phash, duplicate_of, audio_essential,
      baked_captions, confidence, evidence, data) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(moment_id) DO UPDATE SET start_ms=excluded.start_ms, end_ms=excluded.end_ms, setup_ms=excluded.setup_ms, payoff_ms=excluded.payoff_ms, reaction_ms=excluded.reaction_ms,
      scene_boundaries=excluded.scene_boundaries, description=excluded.description, transcript=excluded.transcript, quality=excluded.quality, rank_suitability=excluded.rank_suitability,
      content_risks=excluded.content_risks, tags=excluded.tags, category_id=excluded.category_id, idea_id=excluded.idea_id, license_conditions=excluded.license_conditions,
      checksum=excluded.checksum, phash=excluded.phash, duplicate_of=excluded.duplicate_of, audio_essential=excluded.audio_essential, baked_captions=excluded.baked_captions,
      confidence=excluded.confidence, evidence=excluded.evidence, data=excluded.data, updated_at=datetime('now')`)
    .run(m.moment_id, m.source_id, m.brand_id, m.category_id, m.idea_id, m.start_ms, m.end_ms, m.setup_ms, m.payoff_ms, m.reaction_ms, J.str(m.scene_boundaries), m.description,
      m.transcript ? J.str(m.transcript) : null, m.quality ? J.str(m.quality) : null, m.rank_suitability, J.str(m.content_risks), J.str(m.tags), m.creative_status, m.rights_status,
      J.str(m.license_conditions), m.checksum, m.phash, m.duplicate_of, m.audio_essential == null ? null : +m.audio_essential, m.baked_captions == null ? null : +m.baked_captions,
      m.confidence, J.str(m.evidence), J.str(raw.data ?? {}));
  emit({ kind: 'moment.added', agent, message: `Moment ${m.moment_id} on ${m.source_id} ${(m.start_ms / 1000).toFixed(1)}–${(m.end_ms / 1000).toFixed(1)} s${m.duplicate_of ? ` (duplicate of ${m.duplicate_of})` : ''}` });
  return m.moment_id;
}

export function listMoments(f: { sourceId?: string; categoryId?: string; brandId?: string; status?: string; rights?: 'publishable' | 'blocked'; available?: boolean; limit?: number } = {}) {
  const w: string[] = [], a: any[] = [];
  if (f.sourceId) { w.push('m.source_id=?'); a.push(f.sourceId); }
  if (f.categoryId) { w.push('(m.category_id=? OR m.category_id IN (SELECT id FROM categories WHERE parent_id=?))'); a.push(f.categoryId, f.categoryId); }
  if (f.brandId) { w.push('m.brand_id=?'); a.push(f.brandId); }
  if (f.status) { w.push('m.creative_status=?'); a.push(f.status); }
  const rows = (db().prepare(`SELECT m.*, s.permission_status source_rights FROM moments m LEFT JOIN sources s ON s.asset_id=m.source_id
    ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY m.source_id, m.start_ms LIMIT ?`).all(...a, f.limit ?? 200) as any[]).map(rowToMoment);
  return rows.map(r => ({ ...r, rights: momentRights(r) }))
    .filter(r => !f.rights || (f.rights === 'publishable') === r.rights.publishable)
    .filter(r => !f.available || (r.creative_status === 'usable' && !r.duplicate_of));
}

/** Library counts the dashboard needs (per category or brand). */
export function momentCounts(f: { categoryId?: string; brandId?: string }) {
  const rows = listMoments({ categoryId: f.categoryId, brandId: f.brandId, limit: 100000 });
  const recentCut = Date.now() - 30 * 864e5;
  const recently = new Set((db().prepare(`SELECT DISTINCT moment_id FROM moment_usage WHERE status IN ('approved','published') AND updated_at >= ?`).all(new Date(recentCut).toISOString().slice(0, 19).replace('T', ' ')) as any[]).map(r => r.moment_id));
  const used = new Set((db().prepare(`SELECT DISTINCT moment_id FROM moment_usage WHERE status<>'released'`).all() as any[]).map(r => r.moment_id));
  return {
    total: rows.length,
    available: rows.filter(r => r.creative_status === 'usable' && !r.duplicate_of).length,
    used: rows.filter(r => used.has(r.moment_id)).length,
    rights_pending: rows.filter(r => !r.rights.publishable && (r.rights.source_status === 'pending' || r.rights_status === 'pending')).length,
    rights_cleared: rows.filter(r => r.rights.publishable).length,
    recently_used: rows.filter(r => recently.has(r.moment_id)).length,
    unused_high_potential: rows.filter(r => !used.has(r.moment_id) && r.rights.publishable && !MOMENT_DEAD.has(r.creative_status) && (r.rank_suitability ?? 0) >= 7).length,
  };
}

/** Change a moment's creative status and/or its own rights status (rights changes are logged in rights_log like sources). */
export function setMomentStatus(id: string, creative: string | null, opts: { rights?: string; actor: string; reason?: string; evidence?: string }) {
  const m = getMoment(id);
  if (!m) throw new Error(`moment ${id} not found`);
  if (creative) {
    if (!(MOMENT_CREATIVE as readonly string[]).includes(creative)) throw new Error(`creative status must be one of ${MOMENT_CREATIVE.join(', ')}`);
    db().prepare(`UPDATE moments SET creative_status=?, reserved_by=CASE WHEN ?='reserved' THEN reserved_by ELSE NULL END, reserved_until=CASE WHEN ?='reserved' THEN reserved_until ELSE NULL END, updated_at=datetime('now') WHERE moment_id=?`)
      .run(creative, creative, creative, id);
    emit({ kind: 'moment.status', agent: opts.actor, message: `${id}: ${m.creative_status} → ${creative}${opts.reason ? ` — ${opts.reason}` : ''}` });
  }
  if (opts.rights !== undefined) {
    const to = opts.rights === 'inherit' ? null : opts.rights;
    if (to != null && !(RIGHTS as readonly string[]).includes(to)) throw new Error(`rights must be one of ${RIGHTS.join(', ')} or "inherit"`);
    if (!opts.reason) throw new Error('a moment rights change requires --reason');
    if (to && PUBLISHABLE_RIGHTS.has(to) && !opts.evidence) throw new Error('approving a moment requires --evidence');
    db().prepare(`UPDATE moments SET rights_status=?, updated_at=datetime('now') WHERE moment_id=?`).run(to, id);
    const r = db().prepare(`INSERT INTO rights_log(asset_id, actor, from_status, to_status, reason, evidence) VALUES (?,?,?,?,?,?)`)
      .run(id, opts.actor, m.rights_status ?? 'inherit', to ?? 'inherit', opts.reason, opts.evidence ?? null);
    emit({ kind: 'rights.changed', agent: opts.actor, message: `${id} (moment): ${m.rights_status ?? 'inherit'} → ${to ?? 'inherit'} — ${opts.reason}`, data: { momentId: id, rightsLogId: Number(r.lastInsertRowid) } });
    return Number(r.lastInsertRowid);
  }
  return null;
}

/**
 * Reserve ONE moment for a production. Other moments of the same source are untouched and stay usable.
 * Refuses dead moments and moments already reserved by another production. Rights are not required to reserve
 * (drafting), but the result says whether the moment is publishable.
 */
export function reserveMoment(id: string, productionId: string, opts: { until?: string; agent?: string } = {}) {
  const m = getMoment(id);
  if (!m) throw new Error(`moment ${id} not found`);
  if (MOMENT_DEAD.has(m.creative_status)) throw new Error(`moment ${id} is ${m.creative_status}`);
  if (m.creative_status === 'reserved' && m.reserved_by && m.reserved_by !== productionId) throw new Error(`moment ${id} is reserved by ${m.reserved_by}`);
  if (m.duplicate_of) throw new Error(`moment ${id} duplicates ${m.duplicate_of}; reserve that one`);
  db().prepare(`UPDATE moments SET creative_status='reserved', reserved_by=?, reserved_until=?, updated_at=datetime('now') WHERE moment_id=?`).run(productionId, opts.until ?? null, id);
  const exists = db().prepare(`SELECT id FROM moment_usage WHERE production_id=? AND moment_id=? AND status IN ('planned','reserved')`).get(productionId, id) as any;
  if (!exists) recordUsage({ production_id: productionId, moment_id: id, in_ms: m.start_ms, out_ms: m.end_ms, status: 'reserved' });
  const rights = momentRights(m);
  emit({ kind: 'moment.reserved', agent: opts.agent ?? 'orchestrator', productionId, level: rights.publishable ? 'info' : 'warn',
    message: `${id} reserved for ${productionId}${rights.publishable ? '' : ` (not publishable yet: ${rights.reasons.join('; ')})`}` });
  return { moment_id: id, reserved_by: productionId, publishable: rights.publishable, rights_reasons: rights.reasons,
    siblings_still_available: listMoments({ sourceId: m.source_id, available: true }).map(x => x.moment_id) };
}

export function recordUsage(raw: any) {
  const u = validate(MomentUsage, raw, 'moment usage');
  const m = db().prepare(`SELECT source_id FROM moments WHERE moment_id=?`).get(u.moment_id) as any;
  if (!m) throw new Error(`moment ${u.moment_id} not found`);
  const r = db().prepare(`INSERT INTO moment_usage(production_id, version, moment_id, source_id, in_ms, out_ms, timeline_start_ms, rank_position, reveal_index, transformation, status, platform, published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(u.production_id, u.version, u.moment_id, m.source_id, u.in_ms, u.out_ms, u.timeline_start_ms, u.rank_position, u.reveal_index,
    J.str(u.transformation), u.status, u.platform, u.published_at);
  return Number(r.lastInsertRowid);
}

export function usageOf(f: { momentId?: string; productionId?: string }) {
  const w: string[] = [], a: any[] = [];
  if (f.momentId) { w.push('moment_id=?'); a.push(f.momentId); }
  if (f.productionId) { w.push('production_id=?'); a.push(f.productionId); }
  return (db().prepare(`SELECT * FROM moment_usage ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY id`).all(...a) as any[]).map(r => ({ ...r, transformation: J.parse(r.transformation, {}) }));
}
