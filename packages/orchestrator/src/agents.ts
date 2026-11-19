import fs from 'node:fs';
import path from 'node:path';
import { db, J } from '../../shared/src/db.ts';
import { P } from '../../shared/src/paths.ts';

/** Parses the YAML-ish frontmatter of .claude/agents/*.md (flat key: value pairs only). */
function frontmatter(md: string): Record<string, string> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(md);
  if (!m) return {};
  return Object.fromEntries(m[1].split(/\r?\n/).map(l => /^([\w-]+):\s*(.*)$/.exec(l)).filter(Boolean).map(x => [x![1], x![2].replace(/^["']|["']$/g, '')]));
}

/** The agents table mirrors the real Claude Code subagent definitions; the dashboard reads it. */
export function syncAgents() {
  const dir = path.join(P.root, '.claude', 'agents');
  const ids: string[] = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    const fm = frontmatter(md);
    if (!fm.name) continue;
    const role = /^## Role\s*\r?\n+([^\n]+)/m.exec(md)?.[1]?.trim() ?? fm.description?.split('.')[0] ?? null;
    const personality = /^## Personality\s*\r?\n+([^\n]+)/m.exec(md)?.[1]?.trim() ?? null;
    db().prepare(`INSERT INTO agents(id, name, role, personality, model, color, tools) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, personality=excluded.personality, model=excluded.model, color=excluded.color, tools=excluded.tools`)
      .run(fm.name, fm.title ?? fm.name, role, personality, fm.model ?? 'inherit', fm.color ?? null, J.str((fm.tools ?? '').split(',').map(s => s.trim()).filter(Boolean)));
    ids.push(fm.name);
  }
  // The orchestrator (main session) and the worker are actors too, so their events have an owner.
  for (const [id, name, role] of [['orchestrator', 'Orchestrator (CEO)', 'Main Claude session: scheduling, conflict resolution, final calls'], ['worker', 'Production Worker', 'Durable job runner: analysis, builds, renders, technical QA'], ['pipeline-engineer', 'Pipeline Engineer', 'Orchestrator helper: studio code, schemas, migrations and tests (not a creative or QA role)']])
    db().prepare(`INSERT INTO agents(id, name, role, model) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role`).run(id, name, role, id === 'worker' ? 'n/a' : 'inherit');
  return { synced: ids };
}
