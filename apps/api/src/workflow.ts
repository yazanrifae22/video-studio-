import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { db, J } from '../../../packages/shared/src/db.ts';
import { P } from '../../../packages/shared/src/paths.ts';
import { QA_REVIEW_SQL } from '../../../packages/shared/src/schemas.ts';
import { loadGates, gatesFor, brandOverrides, shelveActive, isNewLoop, panelBlocked, scriptApprovalGate, scriptFilesFor, scriptRoundStatus, forecastOf, forecastDelta, numScore, roundOf, scoreOf, viewerScoreOf, viralMode, type Gates } from '../../../packages/shared/src/gates.ts';

/**
 * Workflow visualisation (dashboard #workflow + live pipeline on the review page).
 *  GET /api/workflow                      config/workflow.json (+ derived edges per version) + config/gates.json (loadGates)
 *  GET /api/productions/:id/progress      per-step status (done | active | blocked | todo | skipped | na) computed from files on disk + DB
 *  GET /api/progress                      compact progress for every production (board cards), cached 8 s
 * Thresholds always come from loadGates() / packages/shared/src/gates.ts; nothing is duplicated here.
 */
const all = (sql: string, ...a: any[]) => db().prepare(sql).all(...a) as any[];
const one = (sql: string, ...a: any[]) => db().prepare(sql).get(...a) as any;
const readJ = (f: string): any => { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : null; } catch { return null; } };
const numOr = (v: any): number | null => numScore(v);   // one normaliser for every reviewer file (packages/shared/src/gates.ts)

type Status = 'done' | 'active' | 'blocked' | 'todo' | 'skipped' | 'na';
interface Eval { s: 'done' | 'blocked' | 'partial' | 'none' | 'na'; score?: number | null; gate?: number | string | null; detail?: string; file?: string | null; warn?: boolean }

let wfCache: { mtime: number; v: any } | null = null;
function loadWorkflow(): any {
  const f = path.join(P.config, 'workflow.json');
  const mtime = fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0;
  if (wfCache && wfCache.mtime === mtime) return wfCache.v;
  const wf = readJ(f);
  if (!wf) throw new Error('config/workflow.json missing or unreadable');
  for (const v of wf.versions) {
    const flat: string[] = [], edges: [string, string][] = [];
    let prev: string[] = [];
    for (const item of v.flow) {
      const grp: string[] = Array.isArray(item) ? item : [item];
      for (const a of prev) for (const b of grp) edges.push([a, b]);
      flat.push(...grp); prev = grp;
    }
    v.steps = flat; v.edges = edges;
  }
  wfCache = { mtime, v: wf };
  return wf;
}
const stepDef = (wf: any, ver: any, id: string) => ({ id, ...wf.steps[id], ...(ver.overrides?.[id] ?? {}) });

/** gap_to_gate -> structured items (string items kept as `fix`). */
function gaps(source: string, j: any): any[] {
  const g = Array.isArray(j?.gap_to_gate) ? j.gap_to_gate : [];
  return g.map((x: any) => typeof x === 'string' ? { source, item: null, fix: x, points: null }
    : { source, item: x?.item ?? null, now: x?.now ?? null, needed: x?.needed ?? null, fix: x?.fix ?? null, points: numOr(x?.points), owner: x?.owner ?? null, t: x?.t ?? null });
}
const NO_SOURCE_BRANDS = new Set(['quiz-ar', 'kids', 'tech', 'celebrity']);   // own art / animation: no footage sources
const RETENTION_BRANDS = new Set(['clipping', 'viral-rankings']);
const AFTER_QA = ['qa', 'approved', 'scheduled', 'published', 'analytics'];
const AFTER_APPROVE = ['approved', 'scheduled', 'published', 'analytics'];

function versionFor(p: any, dir: string, wf: any, newLoop: boolean): { id: string; legacy: string | null } {
  if (newLoop) return { id: wf.current, legacy: null };
  const ex = (f: string) => fs.existsSync(path.join(dir, f));
  const c = String(p.created_at ?? '').slice(0, 10);
  if (ex('script-doctor.json')) return { id: 'v2.1', legacy: 'legacy v2.1 (story council, before the v3 script round)' };
  if (ex('hook.json') || c >= '2026-11-03') return { id: 'v2', legacy: 'legacy v2 (hook council)' };
  if (c >= '2026-11-02') return { id: 'v1.5', legacy: 'legacy v1.5 (own renderer)' };
  return { id: 'v1', legacy: 'legacy v1 (showrunner loop + OCC)' };
}

export function progress(id: string, opts: { light?: boolean; G?: Gates } = {}) {
  const wf = loadWorkflow();
  const p = one(`SELECT * FROM productions WHERE production_id=?`, id);
  if (!p) return { error: 'not found' };
  const dir = path.join(P.productions, id);
  const brand = p.brand_id as string;
  const G: Gates = gatesFor(brand);   // config/gates.json + brand_overrides[brand] (kids script_forecast 90, owner 2026-11-08); opts.G kept for callers, overrides re-read per brand
  const facts = { dir, brand, createdAt: p.created_at };
  const newLoop = isNewLoop(facts);
  const vinfo = versionFor(p, dir, wf, newLoop);
  const ver = wf.versions.find((v: any) => v.id === vinfo.id) ?? wf.versions.at(-1);
  const rj = (f: string) => readJ(path.join(dir, f));
  const ex = (f: string) => fs.existsSync(path.join(dir, f));

  // latest version folder on disk (or DB version)
  const vns = fs.existsSync(dir) ? fs.readdirSync(dir).map(d => /^v(\d+)$/.exec(d)?.[1]).filter(Boolean).map(Number) : [];
  const vN = vns.length ? Math.max(...vns) : (p.version || null);
  const vdir = vN ? path.join(dir, `v${vN}`) : null;
  const vq = (f: string) => vdir ? readJ(path.join(vdir, 'qa', f)) : null;
  const vex = (f: string) => !!vdir && fs.existsSync(path.join(vdir, f));
  const vrel = (f: string) => `v${vN}/${f}`;

  const reviews = all(`SELECT version, score, verdict, blockers, issues, reviewer, created_at FROM reviews WHERE production_id=? AND ${QA_REVIEW_SQL} ORDER BY id DESC`, id);
  const lastQa = reviews[0] ?? null;
  const videoRounds = new Set(reviews.map(r => r.version)).size;
  const srcIds: string[] = J.parse(p.source_assets, []) ?? [];
  const srcs = srcIds.length ? all(`SELECT asset_id, permission_status FROM sources WHERE asset_id IN (SELECT value FROM json_each(?))`, J.str(srcIds)) : [];
  const pubs = all(`SELECT publication_status, scheduled_time FROM publishing WHERE production_id=?`, id);
  const stage = String(p.current_state);
  const approved = AFTER_APPROVE.includes(stage) || p.approval_status === 'approved';

  const sd = rj('script-doctor.json'), fe = rj('fresh-eyes.script.json'), pn = rj('panel.script.json'), pk = rj('packaging.json'), sa = rj('script-approval.json');
  const sdFiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^script-doctor(\.r\d+)?\.json$/.test(f)) : [];
  const scriptRound = roundOf(sd) ?? (sdFiles.length || null);
  const rs = sd ? scriptRoundStatus(facts, G) : null;   // cheap-first next reviewer + no-progress escalation (I3)
  const vfe = vq('fresh-eyes.json'), vpn = vq('panel.json'), vir = vq('viral.json'), ins = vq('insights-score.json');
  const ret = vq('retention-review.json') ?? vq('review-retention.json');
  const pre = vq('prelint.json'), tq = vq('techqa.json');
  const storyLoop = ex('story.json');
  // I8 (owner rule): video round >= 2 with render viral < shelve_viral_round2 -> orchestrator keeps (ONE batched fix) or shelves
  // owner 2026-11-08: PAUSED until shelve_viral_round2_paused_until (viral score ran backwards vs views) -> never suggested while paused
  const shelveSuggested = (sc: number | null) => shelveActive(G) && videoRounds >= 2 && sc != null && sc < G.shelve_viral_round2;

  const E: Record<string, () => Eval> = {
    radar: () => {
      const b = rj('brief.json') ?? rj('draft-brief.json');
      const sig = b && (b.signal_id ?? b.signal_ids ?? b.evergreen ?? b.radar_file ?? b.radar);
      return sig ? { s: 'done', detail: typeof sig === 'string' ? sig : 'radar signal cited', file: 'brief.json' } : { s: 'none' };
    },
    brief: () => ['brief.json', 'draft-brief.json'].find(ex) ? { s: 'done', file: ['brief.json', 'draft-brief.json'].find(ex) } : { s: 'none' },
    sources: () => {
      if (!srcs.length) return NO_SOURCE_BRANDS.has(brand) ? { s: 'na', detail: 'own art / animation' } : { s: 'none' };
      const bad = srcs.filter(s => s.permission_status === 'rejected');
      return bad.length ? { s: 'blocked', detail: `${bad.length} source(s) rejected` } : { s: 'done', detail: `${srcs.length} source(s)` };
    },
    analyze: () => {
      if (!srcs.length && NO_SOURCE_BRANDS.has(brand)) return { s: 'na', detail: 'no footage to analyse' };
      const c = one(`SELECT COUNT(*) n FROM candidates WHERE production_id=?`, id)?.n ?? 0;
      return c ? { s: 'done', detail: `${c} candidate(s)` } : { s: 'none' };
    },
    hook: () => {
      const h = rj('hook.json'); if (!h) return { s: 'none' };
      return { s: 'done', file: 'hook.json', detail: h.payoff_ts != null ? `payoff ${h.payoff_ts}s` : undefined };
    },
    story: () => ex('story.json') ? { s: 'done', file: 'story.json' } : { s: 'none' },
    script: () => {
      const req = scriptFilesFor(brand, dir).filter(f => !f.endsWith('?'));
      const miss = req.filter(f => !ex(f));
      return !miss.length ? { s: 'done', file: req[0] } : miss.length < req.length ? { s: 'partial', detail: `${miss.join(', ')} missing` } : { s: 'none', detail: `${req.join(' + ')} not written` };
    },
    packaging: () => {
      if (!pk) return { s: 'none' };
      const sc = scoreOf(pk), gate = G.packaging;   // hard gate at script:approve since 2026-11-08 (I5 audit)
      if (!String(pk.chosen_title ?? '').trim()) return { s: 'blocked', score: sc, gate, detail: 'no chosen_title', file: 'packaging.json' };
      if (sc == null || sc < gate) return { s: 'blocked', score: sc, gate, detail: `score ${sc ?? 'none'} < ${gate} · ${pk.chosen_title}`, file: 'packaging.json' };
      return { s: 'done', score: sc, gate, detail: pk.chosen_title, file: 'packaging.json' };
    },
    doctor: () => {
      if (!sd) return { s: 'none' };
      const f = forecastOf(sd), pass = String(sd.verdict ?? '').toLowerCase() === 'pass';
      const ok = pass && (!newLoop || (f != null && f >= G.script_forecast));
      return { s: ok ? 'done' : 'blocked', score: f, gate: G.script_forecast, file: 'script-doctor.json', detail: `round ${scriptRound ?? '?'} · verdict ${sd.verdict ?? '—'}${rs?.status === 'escalate: orchestrator decision' ? ' · ESCALATE: ' + rs.reasons.join('; ') : ''}`, warn: rs?.status === 'escalate: orchestrator decision' };
    },
    fresh_s: () => {
      if (!fe) return rs && !rs.doctor_pass ? { s: 'none', detail: `waits for script-doctor >= ${G.script_forecast} (cheap-first)` } : { s: 'none' };
      const v = String(fe.verdict ?? '').toLowerCase();
      return { s: !v || v === G.fresh_eyes_block ? 'blocked' : 'done', score: viewerScoreOf(fe), gate: G.fresh_eyes_block, detail: `verdict ${fe.verdict ?? '—'}${fe.swipe_at_s != null ? ` · swipe ${fe.swipe_at_s}s` : ''}${v === 'weak' ? ' · weak: every gap_to_gate item needs applied/rejected_reason in fix-ledger.json' : ''}`, file: 'fresh-eyes.script.json', warn: v === 'weak' };
    },
    panel_s: () => {
      if (!pn) return rs && !rs.doctor_pass ? { s: 'none', detail: `waits for script-doctor >= ${G.script_forecast} (cheap-first)` } : { s: 'none' };
      const b = panelBlocked(pn, G);
      return { s: b ? 'blocked' : 'done', detail: b ?? `hate ${pn.hate_count ?? 0} · swipe ${pn.swipe_before_payoff_count ?? 0}`, file: 'panel.script.json' };
    },
    script_approve: () => {
      if (!sa) return { s: 'none' };
      const g = scriptApprovalGate(facts);
      const probs = [...g.errors, ...g.warnings];
      if (sa.approved === true && !probs.length) return { s: 'done', score: numOr(sa.forecast), gate: G.script_forecast, detail: `round ${sa.round ?? '?'}${sa.forced ? ' · FORCED' : ''}`, file: 'script-approval.json', warn: !!sa.forced };
      return { s: 'blocked', detail: probs[0] ?? (sa.failures ?? []).join('; '), file: 'script-approval.json' };
    },
    build: () => {
      if (!vdir) return { s: 'none' };
      if (vex('UNAPPROVED-DRAFT.json')) return { s: 'partial', detail: `v${vN} is an unapproved draft` };
      if (vex('render.mp4')) return { s: 'done', detail: `v${vN} rendered + mastered`, file: vrel('render.mp4') };
      if (vex('render.raw.mp4')) return { s: 'partial', detail: `v${vN} raw render (not mastered)`, file: vrel('render.raw.mp4') };
      if (vex('timeline.json') || vex('render.timeline.json')) return { s: 'partial', detail: `v${vN} timeline built, not rendered` };
      return { s: 'partial', detail: `v${vN} folder started` };
    },
    techqa: () => {
      if (!tq && !pre) return { s: 'none' };
      if (pre && pre.pass === false) return { s: 'blocked', detail: `prelint: ${(pre.failures ?? []).slice(0, 2).map((x: any) => typeof x === 'string' ? x : x?.check ?? x?.msg ?? JSON.stringify(x)).join('; ') || 'failed'}`, file: vrel('qa/prelint.json') };
      if (!pre) return { s: 'partial', detail: 'techqa done, prelint not run', file: vrel('qa/techqa.json') };
      return { s: 'done', detail: tq?.duration ? `${tq.duration}s · prelint pass` : 'prelint pass', file: vrel('qa/prelint.json') };
    },
    stage_qa: () => AFTER_QA.includes(stage) || reviews.length ? { s: 'done', detail: `stage ${stage}` } : { s: 'none' },
    qa: () => {
      if (!lastQa) return { s: 'none' };
      const bl = J.parse(lastQa.blockers, []) ?? [];
      const ok = lastQa.verdict === 'pass' && !bl.length;
      const stale = vN != null && lastQa.version != null && lastQa.version < vN;
      return { s: ok && !stale ? 'done' : stale ? 'partial' : 'blocked', score: numOr(lastQa.score), gate: G.qa,
        detail: stale ? `last QA on v${lastQa.version}; v${vN} not reviewed` : bl.length ? `${bl.length} blocker(s): ${bl[0]}` : ok ? `${lastQa.verdict} · ${lastQa.reviewer}` : `QA ${lastQa.score ?? '?'} < ${G.qa} · ${lastQa.verdict} (${lastQa.reviewer}, v${lastQa.version})` };
    },
    insights: () => { if (!ins) return { s: 'none' }; const sc = numOr(ins.score), ok = sc != null && sc >= G.insights;
      return { s: ok ? 'done' : 'blocked', score: sc, gate: G.insights, file: vrel('qa/insights-score.json'), detail: ok ? undefined : `insights ${sc ?? '?'} < ${G.insights}` }; },
    viral: () => {
      const gated = storyLoop && brand !== 'kids', record = viralMode(G) === 'record';
      if (!vir) return gated ? { s: 'none' } : { s: 'na', detail: brand === 'kids' ? 'record only (Made for Kids)' : 'record only (no story.json)' };
      const sc = scoreOf(vir), ok = sc != null && sc >= G.viral, fd = forecastDelta(dir, vir);
      const shelve = shelveSuggested(sc);
      const extra = `${fd != null ? ` · forecast_delta ${fd > 0 ? '+' : ''}${fd}` : ''}${shelve ? ` · SHELVE SUGGESTED (video round ${videoRounds}, viral < ${G.shelve_viral_round2})` : ''}`;
      const blocks = gated && !record;
      return { s: ok || !blocks ? 'done' : 'blocked', score: sc, gate: G.viral, file: vrel('qa/viral.json'), detail: (gated ? (record ? `record-only until ${G.viral_mode_until}${vir.verdict ? ' · ' + vir.verdict : ''}` : vir.verdict) : 'record only') + extra, warn: !ok || shelve };
    },
    retention: () => {
      if (!RETENTION_BRANDS.has(brand)) return { s: 'na', detail: 'Mission Voices / Podium Pop only' };
      if (!ret) return { s: 'none' };
      const sc = numOr(ret.score);
      return { s: sc != null && sc >= G.retention ? 'done' : 'blocked', score: sc, gate: G.retention, file: vrel('qa/retention-review.json') };
    },
    rights_cs: () => {
      if (!srcs.length) return NO_SOURCE_BRANDS.has(brand) ? { s: 'na', detail: 'no footage sources' } : { s: 'none' };
      const open = srcs.filter(s => !['approved', 'approved_with_conditions'].includes(s.permission_status));
      return open.length ? { s: 'blocked', detail: `${open.length} of ${srcs.length} not cleared (${open[0].permission_status})` } : { s: 'done', detail: `${srcs.length} cleared` };
    },
    fresh_v: () => {
      if (!vfe) return newLoop ? { s: 'none' } : { s: 'na' };
      const v = String(vfe.verdict ?? '').toLowerCase();
      return { s: !v || v === G.fresh_eyes_block ? 'blocked' : 'done', gate: G.fresh_eyes_block, detail: `verdict ${vfe.verdict ?? '—'}`, file: vrel('qa/fresh-eyes.json'), warn: v === 'weak' };
    },
    panel_v: () => {
      if (!vpn) return newLoop ? { s: 'none' } : { s: 'na' };
      const b = panelBlocked(vpn, G);
      return { s: b ? 'blocked' : 'done', detail: b ?? `hate ${vpn.hate_count ?? 0} · swipe ${vpn.swipe_before_payoff_count ?? 0}`, file: vrel('qa/panel.json') };
    },
    approve: () => stage === 'rejected' ? { s: 'blocked', detail: 'rejected' } : approved ? { s: 'done', detail: p.approval_status } : { s: 'none' },
    publish: () => {
      if (pubs.some(x => x.publication_status === 'published') || ['published', 'analytics'].includes(stage)) return { s: 'done', detail: 'published' };
      const sch = pubs.find(x => x.publication_status === 'scheduled');
      if (sch || stage === 'scheduled') return { s: 'partial', detail: `scheduled${sch?.scheduled_time ? ' ' + String(sch.scheduled_time).slice(0, 16).replace('T', ' ') : ''}` };
      return { s: 'none' };
    },
    learn: () => {
      const n = one(`SELECT COUNT(*) n FROM analytics_snapshots WHERE production_id=?`, id)?.n ?? 0;
      return stage === 'analytics' || n ? { s: 'done', detail: `${n} analytics snapshot(s)` } : { s: 'none' };
    },
  };

  const ids: string[] = ver.steps;
  const evals = ids.map(sid => { let e: Eval; try { e = E[sid]?.() ?? { s: 'none' }; } catch (err: any) { e = { s: 'none', detail: 'error: ' + err.message }; } return e; });
  // Approved / rejected productions: nothing before "approve" is still open.
  const iApprove = ids.indexOf('approve');
  // current = first step that is not done/na; earlier "none" with later done = skipped
  let cur = -1;
  const lastDone = Math.max(-1, ...evals.map((e, i) => e.s === 'done' ? i : -1));
  for (let i = 0; i < ids.length; i++) {
    const e = evals[i];
    if (e.s === 'done' || e.s === 'na') continue;
    if (e.s === 'none' && (i < lastDone || (approved && i < iApprove))) continue;   // skipped
    if (approved && i < iApprove && e.s !== 'blocked') continue;
    cur = i; break;
  }
  // inside a parallel group, the current step is the first open one, but the whole group is active
  const groupOf = (sid: string) => (ver.flow.find((x: any) => Array.isArray(x) && x.includes(sid)) as string[] | undefined) ?? null;
  const curGroup = cur >= 0 ? groupOf(ids[cur]) : null;
  const steps = ids.map((sid, i) => {
    const d = stepDef(wf, ver, sid), e = evals[i];
    let status: Status;
    if (e.s === 'na') status = 'na';
    else if (e.s === 'done') status = 'done';
    else if (cur < 0 || i < cur) status = e.s === 'blocked' ? 'blocked' : 'skipped';
    else if (i === cur || curGroup?.includes(sid)) status = e.s === 'blocked' ? 'blocked' : 'active';
    else status = e.s === 'blocked' ? 'blocked' : 'todo';
    if (approved && i < iApprove && status === 'blocked' && sid !== 'approve') status = 'skipped';   // approved anyway (forced / older rules)
    return { id: sid, label: d.label, short: d.short ?? d.label, lane: d.lane, status, score: e.score ?? null, gate: e.gate ?? null, detail: e.detail ?? null, file: e.file ?? null, warn: !!e.warn };
  });
  const current = cur >= 0 ? steps[cur] : null;
  const doneN = steps.filter(s => s.status === 'done' || s.status === 'skipped' || s.status === 'na').length;
  if (opts.light) return { id, version: ver.id, legacy: vinfo.legacy, done: doneN, total: steps.length, current: current ? { id: current.id, label: current.label, status: current.status } : null };

  // blocker + gap_to_gate items, from the files that block the current step (or the whole open round)
  const blocked = steps.filter(s => s.status === 'blocked');
  const curStep = current ?? null;
  const blockerStep = curStep?.status === 'blocked' ? curStep : blocked.find(s => cur < 0 || ids.indexOf(s.id) >= cur) ?? null;
  const g: any[] = [];
  const inScript = curStep && ['packaging', 'doctor', 'fresh_s', 'panel_s', 'script_approve', 'script'].includes(curStep.id);
  if (inScript || (curStep && wf.steps[curStep.id]?.lane === 'script')) {
    if (sa && sa.approved === false && Array.isArray(sa.gap_to_gate)) g.push(...gaps('script-approval', sa));
    else g.push(...gaps('script-doctor', sd), ...gaps('fresh-eyes', fe), ...gaps('panel', pn), ...gaps('packaging', pk));
  } else if (curStep && wf.steps[curStep.id]?.lane === 'videoqa') {
    g.push(...gaps('viral', vir), ...gaps('insights', ins), ...gaps('panel V', vpn), ...gaps('fresh-eyes V', vfe));
    if (lastQa) for (const it of (J.parse(lastQa.issues, []) ?? []) as any[]) if (it?.fix && ['blocker', 'major', 'critical'].includes(String(it.severity))) g.push({ source: 'qa', item: it.issue, fix: it.fix, points: null, owner: it.owner ?? null, t: it.t ?? null });
  }
  g.sort((a, b) => (b.points ?? -1) - (a.points ?? -1));

  const nextDef = curStep ? stepDef(wf, ver, curStep.id).next : null;
  const sr = `showrunner-${brand}`;
  const BUILD: Record<string, string> = { 'quiz-ar': 'quiz:build', kids: 'kids:build', tech: 'tech:build', celebrity: 'celebrity:build' };
  const sub = (s: string) => String(s ?? '').replace(/build <id> --agent <showrunner>\s*\([^)]*\)/, `${BUILD[brand] ?? 'build'} <id> --agent <showrunner>`).replaceAll('<id>', id).replaceAll('<brand>', brand).replaceAll('<showrunner>', sr).replaceAll('v<N>', vN ? `v${vN}` : 'v<N>');
  let next: any = null;
  if (curStep && nextDef) {
    const fixRound = curStep.status === 'blocked' && ['doctor', 'fresh_s', 'panel_s', 'script_approve'].includes(curStep.id);
    const fixVideo = curStep.status === 'blocked' && wf.steps[curStep.id]?.lane === 'videoqa';
    next = fixRound ? { step: 'script', label: `Apply gap_to_gate fixes, then script round ${(scriptRound ?? 0) + 1}`, agent: sr, command: 'edit the script files with every gap_to_gate fix, then re-run script-doctor + fresh-eyes + audience-panel' }
      : fixVideo ? { step: 'build', label: `Batch all defects into ONE rebuild (video round ${videoRounds + 1})`, agent: sr, command: sub(stepDef(wf, ver, 'build').next.command) }
      : { step: curStep.id, label: curStep.label, agent: sub(nextDef.agent), command: sub(nextDef.command) };
    if (rs?.status === 'escalate: orchestrator decision' && ['doctor', 'fresh_s', 'panel_s', 'script_approve', 'packaging'].includes(curStep.id)) next = { step: 'script_approve', label: 'No progress: orchestrator decides', agent: 'orchestrator', command: `rework the premise / shelve, or script:approve --force --note "..." (${rs.reasons.join('; ')})` };
    else if (rs && ['doctor', 'fresh_s', 'panel_s', 'script_approve'].includes(curStep.id) && !fixRound) next = { ...next, label: `${next.label} · next reviewer: ${rs.next}` };
    if (fixRound && scriptRound != null && scriptRound >= G.script_rounds_max) next = { step: 'script_approve', label: 'Round cap reached: orchestrator decides', agent: 'orchestrator', command: 'rework the premise / shelve, or script:approve --force --note "..."' };
    if (shelveSuggested(scoreOf(vir)) && wf.steps[curStep.id]?.lane === 'videoqa') next = { step: 'approve', label: `Shelve suggested: video round ${videoRounds}, viral ${scoreOf(vir)} < ${G.shelve_viral_round2}`, agent: 'orchestrator', command: 'keep (ONE batched fix) or shelve' };
    if (fixVideo && videoRounds >= G.video_rounds_max) next = { step: 'approve', label: 'Video round cap reached: orchestrator decides', agent: 'orchestrator', command: 'keep (one batched fix) or shelve' };
  } else if (!curStep) next = { step: null, label: stage === 'published' || stage === 'analytics' ? 'Live: read the results back' : 'Nothing open', agent: 'growth-director', command: sub(wf.steps.learn.next.command) };

  return {
    id, title: p.title, brand, stage, approval_status: p.approval_status, created_at: p.created_at,
    workflow: ver.id, workflow_title: ver.title, legacy: vinfo.legacy, new_loop: newLoop, latest_version: vN,
    gates: G,
    shelve_suggested: shelveSuggested(scoreOf(vir)), shelve_paused_until: shelveActive(G) ? null : G.shelve_viral_round2_paused_until, forecast_delta: vir ? forecastDelta(dir, vir) : null, viral_mode: viralMode(G),
    script_round: rs ? { status: rs.status, next: rs.next, reasons: rs.reasons, history: rs.history } : null,
    rounds: { script: { n: scriptRound, max: G.script_rounds_max, applies: ids.includes('doctor') }, video: { n: videoRounds, max: ver.loops?.some((l: any) => l.id === 'video_round' && l.max_gate) ? G.video_rounds_max : null } },
    steps, current: current ? current.id : null, done: doneN, total: steps.length, pct: Math.round(doneN / steps.length * 100),
    blocker: blockerStep ? { step: blockerStep.id, label: blockerStep.label, text: blockerStep.detail } : null,
    gaps: g.slice(0, 8), gaps_total: g.length, next,
    at: new Date().toISOString(),
  };
}

let bulk: { at: number; v: any } = { at: 0, v: null };
export function registerWorkflow(app: FastifyInstance) {
  app.get('/api/workflow', async () => ({ ...loadWorkflow(), gate_values: loadGates(), gate_brand_overrides: brandOverrides() }));
  app.get('/api/productions/:id/progress', async (req: any) => {
    if (!/^[\w.-]+$/.test(req.params.id)) return { error: 'bad id' };
    return progress(req.params.id);
  });
  app.get('/api/progress', async () => {
    if (bulk.v && Date.now() - bulk.at < 8000) return bulk.v;
    const out: Record<string, any> = {}, G = loadGates();
    for (const r of all(`SELECT production_id FROM productions WHERE current_state NOT IN ('scheduled','published','analytics','rejected')`)) { try { out[r.production_id] = progress(r.production_id, { light: true, G }); } catch {} }
    bulk = { at: Date.now(), v: out };
    return out;
  });
}
