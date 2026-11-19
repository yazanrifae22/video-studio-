import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { P } from './paths.ts';

// node:sqlite prints an ExperimentalWarning on load; silence only that one.
const origEmit = process.emitWarning;
process.emitWarning = ((w: any, ...rest: any[]) => {
  if (String(w?.message ?? w).includes('SQLite is an experimental')) return;
  return (origEmit as any).call(process, w, ...rest);
}) as typeof process.emitWarning;

/**
 * One SQLite file holds all structured state (section 26 contracts). JSON columns hold
 * nested data; every row is validated by packages/shared/src/schemas.ts at the boundary.
 * Unknown metrics are stored as NULL, never invented.
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, format TEXT NOT NULL, positioning TEXT, audience TEXT,
  language TEXT DEFAULT 'en', status TEXT DEFAULT 'draft', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, platform TEXT NOT NULL, handle TEXT,
  status TEXT DEFAULT 'not_created', can_publish INTEGER DEFAULT 0, integration TEXT,
  data TEXT DEFAULT '{}', updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(brand_id, platform)
);
CREATE TABLE IF NOT EXISTS ideas (
  idea_id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, topic TEXT NOT NULL, audience TEXT, language TEXT DEFAULT 'en',
  description TEXT, hook TEXT, supporting_sources TEXT DEFAULT '[]', trend_evidence TEXT DEFAULT '[]',
  opportunity_score REAL, production_estimate TEXT, status TEXT DEFAULT 'proposed', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sources (
  asset_id TEXT PRIMARY KEY, original_url TEXT NOT NULL, source_platform TEXT NOT NULL, external_id TEXT,
  creator TEXT, title TEXT, description TEXT, category TEXT, language TEXT, published_at TEXT,
  duration REAL, view_count INTEGER, views_observed_at TEXT,
  license TEXT, license_url TEXT, permission_status TEXT NOT NULL DEFAULT 'pending',
  usage_restrictions TEXT DEFAULT '[]', attribution TEXT, commercial_use INTEGER, derivatives_allowed INTEGER,
  allowed_platforms TEXT DEFAULT '[]', permission_evidence TEXT, license_expires TEXT,
  download_url TEXT, local_path TEXT, fingerprint TEXT, phash TEXT, acquisition_date TEXT,
  transcript_path TEXT, analysis TEXT DEFAULT '{}', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(source_platform, external_id)
);
CREATE TABLE IF NOT EXISTS rights_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, asset_id TEXT NOT NULL, ts TEXT DEFAULT (datetime('now')),
  actor TEXT NOT NULL, from_status TEXT, to_status TEXT NOT NULL, reason TEXT NOT NULL, evidence TEXT
);
CREATE TABLE IF NOT EXISTS candidates (
  candidate_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL, production_id TEXT, idea_id TEXT,
  start_time REAL NOT NULL, end_time REAL NOT NULL, transcript_excerpt TEXT, moment_description TEXT,
  speakers TEXT, topic TEXT, suggested_title TEXT, suggested_hook TEXT, missing_context TEXT,
  hook_score REAL, coherence_score REAL, emotional_score REAL, value_score REAL, payoff_score REAL, visual_score REAL,
  overall_score REAL, editorial_rationale TEXT, confidence TEXT, edit_difficulty TEXT,
  rights_status TEXT, status TEXT DEFAULT 'proposed', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS productions (
  production_id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, idea_id TEXT, format TEXT NOT NULL, title TEXT NOT NULL,
  source_assets TEXT DEFAULT '[]', selected_candidates TEXT DEFAULT '[]', script TEXT,
  openchatcut_project_id TEXT, assigned_agents TEXT DEFAULT '[]', current_state TEXT DEFAULT 'idea',
  approval_status TEXT DEFAULT 'pending', qa_score REAL, version INTEGER DEFAULT 0,
  prediction TEXT DEFAULT '{}', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT, production_id TEXT NOT NULL, n INTEGER NOT NULL,
  render_path TEXT, captions_path TEXT, contact_sheet TEXT, export_id TEXT, tech_qa TEXT DEFAULT '{}',
  notes TEXT, created_at TEXT DEFAULT (datetime('now')), UNIQUE(production_id, n)
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, production_id TEXT NOT NULL, version INTEGER,
  reviewer TEXT NOT NULL, kind TEXT DEFAULT 'agent', score REAL, verdict TEXT,
  breakdown TEXT DEFAULT '{}', issues TEXT DEFAULT '[]', blockers TEXT DEFAULT '[]', summary TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS publishing (
  id INTEGER PRIMARY KEY AUTOINCREMENT, production_id TEXT NOT NULL, platform TEXT NOT NULL, account_id TEXT,
  export_variant TEXT, metadata TEXT DEFAULT '{}', scheduled_time TEXT, publication_status TEXT DEFAULT 'draft',
  approved_by TEXT, approved_at TEXT, external_post_id TEXT, error_details TEXT, idempotency_key TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, external_post_id TEXT NOT NULL, platform TEXT NOT NULL,
  production_id TEXT, observation_time TEXT NOT NULL, hours_since_publish REAL,
  views INTEGER, reach INTEGER, watch_time REAL, retention_metrics TEXT, engagement_metrics TEXT,
  followers_gained INTEGER, available_revenue_metrics TEXT, source TEXT
);
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, platform TEXT, topic TEXT, audience TEXT, contact TEXT,
  partnership_terms TEXT, permission_status TEXT DEFAULT 'not_contacted', allowed_content TEXT,
  allowed_platforms TEXT DEFAULT '[]', revenue_share TEXT, attribution TEXT, license_expires TEXT,
  evidence TEXT, data TEXT DEFAULT '{}', updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, production_id TEXT, dedupe_key TEXT,
  payload TEXT DEFAULT '{}', status TEXT DEFAULT 'queued', priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0, max_attempts INTEGER DEFAULT 3, run_after TEXT DEFAULT (datetime('now')),
  lease_until TEXT, worker TEXT, progress REAL DEFAULT 0, result TEXT, error TEXT,
  created_at TEXT DEFAULT (datetime('now')), started_at TEXT, finished_at TEXT
);
CREATE INDEX IF NOT EXISTS jobs_pick ON jobs(status, run_after, priority);
CREATE TABLE IF NOT EXISTS locks (
  resource TEXT PRIMARY KEY, holder TEXT NOT NULL, acquired_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  kind TEXT NOT NULL, agent TEXT, production_id TEXT, job_id INTEGER, task_id INTEGER, level TEXT DEFAULT 'info',
  message TEXT NOT NULL, data TEXT DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, role TEXT, personality TEXT, model TEXT, color TEXT,
  status TEXT DEFAULT 'idle', current_task TEXT, tools TEXT DEFAULT '[]', updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS agent_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT NOT NULL, production_id TEXT, title TEXT NOT NULL,
  status TEXT DEFAULT 'running', depends_on TEXT DEFAULT '[]', inputs TEXT DEFAULT '[]',
  started_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), finished_at TEXT,
  summary TEXT, artifacts TEXT DEFAULT '[]', decisions TEXT DEFAULT '[]', progress TEXT DEFAULT '[]', error TEXT
);
CREATE TABLE IF NOT EXISTS api_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  provider TEXT, model TEXT, key_index INTEGER, ok INTEGER, http_status INTEGER,
  units INTEGER, cost_usd REAL DEFAULT 0, latency_ms INTEGER, note TEXT
);
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id TEXT NOT NULL, slot_at TEXT NOT NULL,
  production_id TEXT, idea_id TEXT, platforms TEXT DEFAULT '[]', status TEXT DEFAULT 'open', note TEXT,
  UNIQUE(brand_id, slot_at)
);
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT DEFAULT (datetime('now')), brand_id TEXT, production_id TEXT,
  category TEXT, title TEXT NOT NULL, evidence TEXT, confidence TEXT DEFAULT 'low', kind TEXT DEFAULT 'hypothesis',
  status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, brand_id TEXT, hypothesis TEXT NOT NULL, variable TEXT,
  production_ids TEXT DEFAULT '[]', status TEXT DEFAULT 'running', result TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT DEFAULT (datetime('now')), created TEXT, approved TEXT, rejected TEXT,
  failed TEXT, learned TEXT, change TEXT, next TEXT
);
`;

/**
 * viral-rankings migration (2026-10-31, pipeline-engineer). Additive only: new tables + one nullable column on
 * `ideas`. Existing rows are never rewritten. Contracts: schemas.ts (Category, CategoryMetricsSnapshot, Moment, MomentUsage).
 * Metric columns are nullable on purpose: NULL = unknown / not measured, 0 = measured zero.
 */
const SCHEMA_V2 = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, brand_id TEXT NOT NULL, parent_id TEXT, slug TEXT NOT NULL, title TEXT NOT NULL,
  purpose TEXT, audience_fit TEXT, research_queries TEXT DEFAULT '[]', keywords TEXT DEFAULT '[]', exclusions TEXT DEFAULT '[]',
  origin TEXT, rights_risk TEXT, safety_constraints TEXT DEFAULT '[]', review_cadence TEXT, next_experiments TEXT DEFAULT '[]',
  status TEXT DEFAULT 'active', data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(brand_id, slug)
);
CREATE INDEX IF NOT EXISTS categories_parent ON categories(brand_id, parent_id);
CREATE TABLE IF NOT EXISTS category_metrics_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, category_id TEXT NOT NULL, brand_id TEXT, observed_at TEXT NOT NULL,
  age_bucket TEXT, platform TEXT, sample_size INTEGER,
  total_views REAL, median_views REAL, engaged_views REAL, normalized_perf REAL, avg_view_duration REAL, avg_pct_viewed REAL,
  stayed_to_watch REAL, likes_per_1k REAL, comments_per_1k REAL, subs_per_1k REAL, production_count REAL, usable_moments REAL,
  confidence TEXT, is_fixture INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL, provenance TEXT, data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS cms_cat_time ON category_metrics_snapshots(category_id, age_bucket, observed_at);
CREATE TABLE IF NOT EXISTS moments (
  moment_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, brand_id TEXT, category_id TEXT, idea_id TEXT,
  start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL, setup_ms INTEGER, payoff_ms INTEGER, reaction_ms INTEGER,
  scene_boundaries TEXT DEFAULT '[]', description TEXT NOT NULL, transcript TEXT, quality TEXT, rank_suitability REAL,
  content_risks TEXT DEFAULT '[]', tags TEXT DEFAULT '[]',
  creative_status TEXT NOT NULL DEFAULT 'discovered', rights_status TEXT, license_conditions TEXT DEFAULT '[]',
  checksum TEXT, phash TEXT, duplicate_of TEXT, audio_essential INTEGER, baked_captions INTEGER, confidence TEXT,
  evidence TEXT DEFAULT '{}', reserved_by TEXT, reserved_until TEXT, data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
  CHECK (end_ms > start_ms)
);
CREATE INDEX IF NOT EXISTS moments_source ON moments(source_id, start_ms);
CREATE INDEX IF NOT EXISTS moments_cat_status ON moments(category_id, creative_status);
CREATE INDEX IF NOT EXISTS moments_phash ON moments(phash);
CREATE TABLE IF NOT EXISTS moment_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT, production_id TEXT NOT NULL, version INTEGER, moment_id TEXT NOT NULL, source_id TEXT,
  in_ms INTEGER, out_ms INTEGER, timeline_start_ms INTEGER, rank_position INTEGER, reveal_index INTEGER,
  transformation TEXT DEFAULT '{}', status TEXT NOT NULL DEFAULT 'planned', platform TEXT, published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS usage_moment ON moment_usage(moment_id, status);
CREATE INDEX IF NOT EXISTS usage_production ON moment_usage(production_id, version);
`;

function addColumn(d: DatabaseSync, table: string, col: string, decl: string) {
  const cols = (d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  if (!cols.includes(col)) d.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${decl}`);
}

let _db: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (_db) return _db;
  fs.mkdirSync(P.data, { recursive: true });
  _db = new DatabaseSync(P.db);
  _db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  _db.exec(SCHEMA);
  _db.exec(SCHEMA_V2);
  addColumn(_db, 'ideas', 'category_id', 'TEXT');  // nullable link idea → (sub)category; existing ideas stay NULL
  _db.exec('CREATE INDEX IF NOT EXISTS ideas_category ON ideas(category_id)');
  return _db;
}

export const J = {
  parse<T = any>(s: unknown, fallback: T): T {
    if (typeof s !== 'string' || !s) return fallback;
    try { return JSON.parse(s) as T; } catch { return fallback; }
  },
  str(v: unknown) { return JSON.stringify(v ?? null); },
};

export function now() { return new Date().toISOString(); }

export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try { const r = fn(); d.exec('COMMIT'); return r; } catch (e) { d.exec('ROLLBACK'); throw e; }
}

const PK: Record<string, string> = { productions: 'production_id', ideas: 'idea_id', sources: 'asset_id', brands: 'id', candidates: 'candidate_id' };

/** Merge a patch into the JSON `data` column of a row. */
export function patchData(table: keyof typeof PK, id: string, patch: Record<string, unknown>) {
  const pk = PK[table];
  const row = db().prepare(`SELECT data FROM ${table} WHERE ${pk}=?`).get(id) as { data: string } | undefined;
  if (!row) throw new Error(`${table} ${id} not found`);
  const merged = { ...J.parse(row.data, {}), ...patch };
  db().prepare(`UPDATE ${table} SET data=? WHERE ${pk}=?`).run(J.str(merged), id);
  return merged;
}

/** Short, sortable, human-friendly ids: prefix-yyMMdd-xxxx */
export function newId(prefix: string) {
  const d = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `${prefix}-${d}-${Math.random().toString(36).slice(2, 6)}`;
}
