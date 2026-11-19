import { db, J } from './db.ts';
import { redact } from './secrets.ts';

export type Level = 'info' | 'success' | 'warn' | 'error';

export interface EventInput {
  kind: string;            // e.g. job.started, agent.decision, rights.changed, production.stage
  message: string;         // short, user-facing
  agent?: string | null;
  productionId?: string | null;
  jobId?: number | null;
  taskId?: number | null;
  level?: Level;
  data?: unknown;
}

/** Every real state change goes through here; the studio streams this table over SSE. */
export function emit(e: EventInput) {
  const r = db().prepare(
    `INSERT INTO events(kind, agent, production_id, job_id, task_id, level, message, data) VALUES (?,?,?,?,?,?,?,?)`
  ).run(e.kind, e.agent ?? null, e.productionId ?? null, e.jobId ?? null, e.taskId ?? null, e.level ?? 'info',
    redact(e.message), redact(J.str(e.data ?? {})));
  return Number(r.lastInsertRowid);
}

export function eventsSince(id: number, limit = 200) {
  return db().prepare(`SELECT * FROM events WHERE id > ? ORDER BY id ASC LIMIT ?`).all(id, limit);
}

export type AgentStatus = 'idle' | 'working' | 'blocked' | 'error';

export function setAgentStatus(agentId: string, status: AgentStatus, task?: string | null) {
  db().prepare(`UPDATE agents SET status=?, current_task=?, updated_at=datetime('now') WHERE id=?`)
    .run(status, task ?? null, agentId);
}

export function startAgentTask(agentId: string, title: string, opts: { productionId?: string | null; dependsOn?: number[]; inputs?: string[] } = {}) {
  const known = db().prepare(`SELECT 1 FROM agents WHERE id=?`).get(agentId);
  if (!known) throw new Error(`unknown agent "${agentId}" (see .claude/agents/)`);
  const r = db().prepare(`INSERT INTO agent_tasks(agent_id, production_id, title, depends_on, inputs) VALUES (?,?,?,?,?)`)
    .run(agentId, opts.productionId ?? null, title, J.str(opts.dependsOn ?? []), J.str(opts.inputs ?? []));
  const id = Number(r.lastInsertRowid);
  setAgentStatus(agentId, 'working', title);
  emit({ kind: 'agent.task.started', agent: agentId, productionId: opts.productionId, taskId: id, message: title });
  return id;
}

export function progressAgentTask(taskId: number, note: string) {
  const t = db().prepare(`SELECT agent_id, production_id, progress FROM agent_tasks WHERE id=?`).get(taskId) as any;
  if (!t) throw new Error(`agent task ${taskId} not found`);
  const list = J.parse<any[]>(t.progress, []);
  list.push({ ts: new Date().toISOString(), note });
  db().prepare(`UPDATE agent_tasks SET progress=? WHERE id=?`).run(J.str(list), taskId);
  emit({ kind: 'agent.task.progress', agent: t.agent_id, productionId: t.production_id, taskId, message: note });
}

export function finishAgentTask(taskId: number, opts: {
  status?: 'done' | 'failed' | 'blocked'; summary?: string; artifacts?: string[];
  decisions?: { decision: string; why: string }[]; error?: string;
}) {
  const t = db().prepare(`SELECT * FROM agent_tasks WHERE id=?`).get(taskId) as any;
  if (!t) throw new Error(`agent task ${taskId} not found`);
  const status = opts.status ?? 'done';
  db().prepare(`UPDATE agent_tasks SET status=?, finished_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'), summary=?,
    artifacts=?, decisions=?, error=? WHERE id=?`).run(status, opts.summary ?? null,
    J.str(opts.artifacts ?? []), J.str(opts.decisions ?? []), opts.error ?? null, taskId);
  for (const d of opts.decisions ?? [])
    emit({ kind: 'agent.decision', agent: t.agent_id, productionId: t.production_id, taskId, message: d.decision, data: { why: d.why } });
  emit({ kind: `agent.task.${status}`, agent: t.agent_id, productionId: t.production_id, taskId,
    level: status === 'done' ? 'success' : status === 'blocked' ? 'warn' : 'error',
    message: opts.summary ?? t.title, data: { artifacts: opts.artifacts, error: opts.error } });
  const open = db().prepare(`SELECT title FROM agent_tasks WHERE agent_id=? AND status='running' ORDER BY id DESC LIMIT 1`).get(t.agent_id) as any;
  setAgentStatus(t.agent_id, open ? 'working' : status === 'failed' ? 'error' : status === 'blocked' ? 'blocked' : 'idle', open?.title ?? null);
}
