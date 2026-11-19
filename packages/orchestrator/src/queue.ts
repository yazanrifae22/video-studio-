import os from 'node:os';
import { db, J } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';

export interface Job {
  id: number; type: string; production_id: string | null; dedupe_key: string | null; payload: any; status: string;
  attempts: number; max_attempts: number; progress: number; error: string | null;
}

export const WORKER_ID = `${os.hostname()}:${process.pid}`;

const sqlTime = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

/** Idempotent: one live job per dedupe key (defaults to type + production). */
export function enqueue(type: string, opts: { productionId?: string; dedupeKey?: string; payload?: unknown; priority?: number; maxAttempts?: number; runAfter?: Date } = {}) {
  const key = opts.dedupeKey ?? (opts.productionId ? `${type}:${opts.productionId}` : null);
  if (key) {
    const live = db().prepare(`SELECT id FROM jobs WHERE dedupe_key=? AND status IN ('queued','running')`).get(key) as any;
    if (live) return Number(live.id);
  }
  const r = db().prepare(`INSERT INTO jobs(type, production_id, dedupe_key, payload, priority, max_attempts, run_after) VALUES (?,?,?,?,?,?,?)`)
    .run(type, opts.productionId ?? null, key, J.str(opts.payload ?? {}), opts.priority ?? 0, opts.maxAttempts ?? 3, sqlTime(opts.runAfter ?? new Date()));
  const id = Number(r.lastInsertRowid);
  emit({ kind: 'job.queued', jobId: id, productionId: opts.productionId, message: `Queued ${type}`, data: { dedupeKey: key } });
  return id;
}

/** Atomically claim the next runnable job of the given types with a lease. */
export function claim(types: string[], leaseSec = 900): Job | null {
  if (!types.length) return null;
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    const ph = types.map(() => '?').join(',');
    // +1 priority per hour waited, so nothing starves.
    const row = d.prepare(`SELECT * FROM jobs WHERE status='queued' AND type IN (${ph}) AND run_after <= datetime('now')
      ORDER BY priority + (julianday('now') - julianday(run_after)) * 24 DESC, id ASC LIMIT 1`).get(...types) as any;
    if (!row) { d.exec('COMMIT'); return null; }
    d.prepare(`UPDATE jobs SET status='running', attempts=attempts+1, worker=?, started_at=datetime('now'),
      lease_until=datetime('now', ?), error=NULL WHERE id=?`).run(WORKER_ID, `+${leaseSec} seconds`, row.id);
    d.exec('COMMIT');
    return { ...row, payload: J.parse(row.payload, {}), attempts: row.attempts + 1 };
  } catch (e) { d.exec('ROLLBACK'); throw e; }
}

export function heartbeat(id: number, progress?: number, leaseSec = 900) {
  db().prepare(`UPDATE jobs SET lease_until=datetime('now', ?), progress=COALESCE(?, progress) WHERE id=?`)
    .run(`+${leaseSec} seconds`, progress ?? null, id);
}

export function isCancelled(id: number) {
  return (db().prepare(`SELECT status FROM jobs WHERE id=?`).get(id) as any)?.status === 'cancelled';
}

export function complete(id: number, result: unknown) {
  db().prepare(`UPDATE jobs SET status='done', progress=1, result=?, finished_at=datetime('now'), lease_until=NULL WHERE id=? AND status='running'`).run(J.str(result), id);
}

/** Retry with exponential backoff, or fail permanently. `retryAt` (quota reset, dependency) defers without spending an attempt. */
export function fail(job: Job, err: Error, retryAt?: Date) {
  const permanent = job.attempts >= job.max_attempts && !retryAt;
  if (permanent) {
    db().prepare(`UPDATE jobs SET status='failed', error=?, finished_at=datetime('now'), lease_until=NULL WHERE id=?`).run(err.message, job.id);
  } else {
    const when = retryAt ?? new Date(Date.now() + 2 ** job.attempts * 15_000);
    db().prepare(`UPDATE jobs SET status='queued', error=?, run_after=?, lease_until=NULL,
      attempts=CASE WHEN ? THEN attempts-1 ELSE attempts END WHERE id=?`)
      .run(err.message, sqlTime(when), retryAt ? 1 : 0, job.id);
  }
  return permanent;
}

/** On startup: anything 'running' whose lease expired or whose worker died goes back to the queue. */
export function recoverStale() {
  const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const running = db().prepare(`SELECT id, worker, lease_until < datetime('now') AS expired FROM jobs WHERE status='running'`).all() as any[];
  let n = 0;
  for (const j of running) {
    const [host, pid] = String(j.worker ?? '').split(':');
    const dead = host === os.hostname() && pid && !alive(Number(pid));
    if (j.expired || dead || !j.worker) {
      db().prepare(`UPDATE jobs SET status='queued', worker=NULL, error='recovered after interrupted run' WHERE id=?`).run(j.id);
      n++;
    }
  }
  if (n) emit({ kind: 'job.recovered', level: 'warn', message: `Recovered ${n} interrupted job(s)` });
  return n;
}

export function retryJob(id: number) {
  db().prepare(`UPDATE jobs SET status='queued', attempts=0, run_after=datetime('now'), error=NULL WHERE id=? AND status IN ('failed','cancelled')`).run(id);
  emit({ kind: 'job.retry', jobId: id, message: `Manual retry of job #${id}` });
}

/** Queued jobs stop immediately; running jobs see isCancelled() at their next checkpoint. */
export function cancelJob(id: number) {
  db().prepare(`UPDATE jobs SET status='cancelled', finished_at=datetime('now') WHERE id=? AND status IN ('queued','running')`).run(id);
  emit({ kind: 'job.cancelled', jobId: id, level: 'warn', message: `Cancelled job #${id}` });
}

export class DeferError extends Error { constructor(msg: string, public retryAt: Date) { super(msg); } }
export class QuotaExhaustedError extends Error { constructor(public model: string, public retryAt: Date) { super(`Quota exhausted for ${model} until ${retryAt.toISOString()}`); } }
