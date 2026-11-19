import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { db } from '../../shared/src/db.ts';
import { emit } from '../../shared/src/events.ts';
import { occToken, redact } from '../../shared/src/secrets.ts';

/**
 * Thin adapter over OpenChatCut's external MCP endpoint. We never touch its project store directly:
 * every read and edit goes through the supported tools, so projects stay editable in the app.
 *
 * The running instance is an isolated dev profile, so its port is not the documented 5199.
 * OCC_MCP_URL overrides; otherwise we probe the known ports. Since 2026-10-26 OCC answers on IPv6 loopback only, so
 * [::1]:5299 is probed first (no env var needed).
 */
const CANDIDATE_URLS = [process.env.OCC_MCP_URL, 'http://[::1]:5299/api/external-mcp/mcp', 'http://127.0.0.1:5299/api/external-mcp/mcp', 'http://127.0.0.1:5199/api/external-mcp/mcp'].filter(Boolean) as string[];

export class OccError extends Error {
  constructor(public tool: string, message: string, public detail?: unknown) { super(`${tool}: ${message}`); }
}

let shared: Promise<Occ> | null = null;

export class Occ {
  private constructor(public client: Client, public url: string, private transport?: StreamableHTTPClientTransport) {}

  /** Terminate the MCP session (HTTP DELETE) so OpenChatCut releases any offline project lease immediately. */
  async close() {
    await this.transport?.terminateSession().catch(() => {});
    await this.client.close().catch(() => {});
    if (shared) shared = null;
  }

  /** A dedicated connection (own MCP session = own project binding). Use for builds; close() when done. */
  static async fresh(): Promise<Occ> { return Occ.connect(); }

  static async connect(): Promise<Occ> {
    const token = occToken();
    if (!token) throw new Error('OpenChatCut MCP token not found (expected ~/.openchatcut/dev-profiles/<id>/mcp-token or OPENCHATCUT_MCP_TOKEN)');
    let lastErr: unknown;
    for (const url of CANDIDATE_URLS) {
      const transport = new StreamableHTTPClientTransport(new URL(url), {
        requestInit: { headers: { authorization: `Bearer ${token}`, 'x-openchatcut-mcp-client': 'claude-code', 'x-openchatcut-mcp-surface': 'external' } },
      });
      const client = new Client({ name: 'clips-viral-studio', version: '0.1.0' });
      try {
        await client.connect(transport);
        return new Occ(client, url, transport);
      } catch (e) { lastErr = e; }
    }
    throw new Error(`OpenChatCut MCP unreachable at ${CANDIDATE_URLS.join(', ')}: ${redact(String((lastErr as any)?.message ?? lastErr))}`);
  }

  /** One shared connection per process. */
  static get(): Promise<Occ> {
    shared ??= Occ.connect().catch(e => { shared = null; throw e; });
    return shared;
  }

  async listTools() {
    return (await this.client.listTools()).tools;
  }

  /** Calls a tool; returns parsed JSON when the tool answers with JSON text, else raw text. Throws on isError. */
  async call<T = any>(tool: string, args: Record<string, unknown> = {}, opts: { timeoutMs?: number } = {}): Promise<T> {
    const t0 = Date.now();
    const res: any = await this.client.callTool({ name: tool, arguments: args }, undefined, { timeout: opts.timeoutMs ?? 120_000 });
    const text = (res.content ?? []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
    let parsed: any = res.structuredContent ?? text;
    if (!res.structuredContent) { try { parsed = JSON.parse(text); } catch { /* plain text */ } }
    db().prepare(`INSERT INTO api_usage(provider, model, ok, latency_ms, note) VALUES ('openchatcut', ?, ?, ?, ?)`)
      .run(tool, res.isError ? 0 : 1, Date.now() - t0, res.isError ? redact(text).slice(0, 300) : null);
    if (res.isError) throw new OccError(tool, redact(text).slice(0, 800), parsed);
    // Large results are archived by OpenChatCut and returned as a pointer; reassemble them transparently.
    if (parsed?.archived && parsed.artifactId && args.editSessionId && tool !== 'read_agent_artifact') {
      let body = '', offset = 0;
      for (;;) {
        const page = await this.call('read_agent_artifact', { editSessionId: args.editSessionId, artifactId: parsed.artifactId, offset, limit: 12000 });
        body += page.content ?? '';
        if (!page.hasMore) break;
        offset = page.nextOffset;
      }
      try { return JSON.parse(body) as T; } catch { return body as T; }
    }
    return parsed as T;
  }
}

/* ---------- project locks: one editor (agent/job) per OpenChatCut project ---------- */

export function acquireProjectLock(projectId: string, holder: string, ttlSec = 1800): boolean {
  const d = db();
  d.exec('BEGIN IMMEDIATE');
  try {
    d.prepare(`DELETE FROM locks WHERE resource=? AND expires_at < datetime('now')`).run(`occ:${projectId}`);
    const cur = d.prepare(`SELECT holder FROM locks WHERE resource=?`).get(`occ:${projectId}`) as any;
    if (cur && cur.holder !== holder) { d.exec('COMMIT'); return false; }
    d.prepare(`INSERT INTO locks(resource, holder, expires_at) VALUES (?,?,datetime('now', ?))
      ON CONFLICT(resource) DO UPDATE SET expires_at=excluded.expires_at`).run(`occ:${projectId}`, holder, `+${ttlSec} seconds`);
    d.exec('COMMIT');
    return true;
  } catch (e) { d.exec('ROLLBACK'); throw e; }
}

export function releaseProjectLock(projectId: string, holder: string) {
  db().prepare(`DELETE FROM locks WHERE resource=? AND holder=?`).run(`occ:${projectId}`, holder);
}

/* ---------- edit sessions ---------- */

export interface EditSession { occ: Occ; projectId: string; editSessionId: string; holder: string; approvalMode: 'manual' | 'auto' }

/**
 * Target a project, take our lock, and open a draft edit session.
 * `auto` applies the whole draft on review (used for unattended studio builds of *new* projects we own);
 * `manual` leaves the proposal for a human to approve inside OpenChatCut.
 */
export async function beginEdit(projectId: string, holder: string, approvalMode: 'manual' | 'auto' = 'manual', productionId?: string): Promise<EditSession> {
  if (!acquireProjectLock(projectId, holder)) throw new Error(`project ${projectId} is locked by another editor`);
  const occ = await Occ.get();
  try {
    await occ.call('target_project', { projectId });
    const s = await occ.call('begin_edit_session', { approvalMode, reuseExisting: true });
    const editSessionId = s?.editSessionId ?? s?.session?.editSessionId ?? s?.id;
    if (!editSessionId) throw new Error(`begin_edit_session returned no id: ${JSON.stringify(s).slice(0, 300)}`);
    emit({ kind: 'occ.session.begin', agent: holder, productionId, message: `Edit session opened on ${projectId} (${approvalMode})`, data: { projectId, editSessionId } });
    return { occ, projectId, editSessionId, holder, approvalMode };
  } catch (e) { releaseProjectLock(projectId, holder); throw e; }
}

/** Submit the draft; in auto mode wait until OpenChatCut reports `applied`. Never claims success otherwise. */
export async function finishEdit(s: EditSession, productionId?: string, summary = 'studio edit'): Promise<string> {
  try {
    await s.occ.call('review_edit_session', { editSessionId: s.editSessionId, summary });
    for (let i = 0; i < 60; i++) {
      const st = await s.occ.call('get_edit_session', { editSessionId: s.editSessionId });
      const status = st?.status ?? st?.session?.status;
      if (['applied', 'rejected', 'discarded', 'stale', 'failed', 'cancelled'].includes(status)) {
        emit({ kind: 'occ.session.end', agent: s.holder, productionId, level: status === 'applied' ? 'success' : 'warn', message: `Edit session ${status}`, data: { projectId: s.projectId } });
        return status;
      }
      if (s.approvalMode === 'manual') return status ?? 'pending_review';
      await new Promise(r => setTimeout(r, 1000));
    }
    return 'timeout';
  } finally { releaseProjectLock(s.projectId, s.holder); }
}

export async function discardEdit(s: EditSession) {
  try { await s.occ.call('discard_edit_session', { editSessionId: s.editSessionId }); } finally { releaseProjectLock(s.projectId, s.holder); }
}
