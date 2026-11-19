/**
 * Studio CLI — the interface agents and humans use for every real action. `npm run -s cli -- <command>`
 *
 * status                                        overview: productions by stage, jobs, agents, recent events
 * agents:sync                                   load .claude/agents/*.md into the agents table
 * task:start <agent> "<title>" [--production P] [--depends 1,2] [--input path]...
 * task:progress <taskId> "<note>"
 * task:finish <taskId> [--status done|failed|blocked] --summary "..." [--artifact p]... [--decision "what::why"]... [--error "..."]
 * brand:upsert <file.json> [--no-accounts] | brand:list
 * idea:add <file.json> [--radar <signal_id>] (one idea or an array) | idea:list [--brand B] [--status S] | idea:status <id> <status>
 * discover <wikimedia|internet_archive|nasa|pexels|pixabay|youtube|noaa> "<query>" [--limit N] [--min S] [--max S] [--portrait] [--any-license] [--idea I] [--agent A]
 * source:list [--status S] [--platform P] [--idea I] [--limit N] | source:show <asset>
 * source:enrich <asset>                         second-pass metadata (license, duration, file url)
 * source:acquire <asset>                        download (rights-approved only)
 * source:set-download <asset> <https url>      choose a specific file derivative (e.g. 720p) before acquiring
 * source:attach-file <asset> <path>             register a creator-supplied file
 * rights:set <asset> <status> --reason "..." [--evidence "..."] [--condition "..."]... [--actor A]
 * build <production> [--agent A] [--no-render]  cutlist.json → narration → captions → timeline.json → ffmpeg render (packages/render) → master → techqa
 * quiz:build <production> [--no-tts] [--no-render] [--agent A]   quiz.json → narration (cached TTS) → HyperFrames rounds + captions → render.timeline.json → ffmpeg render → master → techqa
 * quizlong:plan <production> [--only q01-q05]     quiz-ar LONG-FORM (16:9): validate episode.json + print the estimated timeline (2.5 words/s; no TTS, no render)
 * quizlong:build <production> [--no-tts] [--no-render] [--only q01-q03,q08-q10] [--with-cards] [--template DIR] [--workers N] [--agent A] [--reason "..."]   episode.json → chunked TTS (one take per 5 questions + cards) → show.json → template page frames (packages/quizlong/template, else template-stub) → picture.mp4 → stems → render.timeline.json → ffmpeg → master → techqa
 * celebrity:build <production> [--no-tts|--plan] [--snap ...] [--agent A]   Moments That Made Them: tech:build with the celebrity palette/voice/music + no-clips/no-likeness lint (docs/brands/celebrity/build.md)
 * tech:build <production> [--no-tts|--plan] [--snap t1,t2,...] [--agent A]   Tech Made Simple Short: spec.json + scenes/*.html → TTS (one take) → align → HyperFrames picture → timeline.json → ffmpeg → master → techqa (--no-tts = draft picture + stills in productions/<id>/draft)
 * kids:build <production> [--no-tts] [--no-render] [--snap t1,t2,...] [--reuse-3d N] [--agent A]   Tiko & Pip 3D episode: episode.json + choreo.js → TTS → score → 3D (headless Chrome GPU, WebCodecs) → timeline.json → ffmpeg → master → techqa (--no-tts = draft timing in productions/<id>/draft, no version)
 * kids:lint <production> [--version N|draft]   framing lint: Tiko/Pip + K.keep() marks inside the frame and not blocked (every 0.25 s) -> <ver>/qa/framing.json
 * kids:snap <production> [--times a,b,c] [--version N|draft] [--width 480]   stills of the latest score for frame checks (default 16 evenly spaced)
 * render:timeline <timeline.json> <out.mp4> [--work DIR]   re-render a saved timeline with the ffmpeg compositor (raw, no master)
 * quiz:assets <production>                      re-hash every file in assets.json, merge latest build media + quiz.json art (keeps rights/history)
 * quiz:plan <production> [--snapshots]           validate quiz.json + print the resolved timeline (no TTS, no render); --snapshots writes key frames per round
 * source:analyze <asset> [--transcribe] [--lang en|ar] [--agent A]   mezzanine + scenes/audio/motion/contact sheets (+ GPU transcript; GPU-locked)
 * fullview <asset> [--transcribe] [--lang]          shots + frames + words per shot + grids → data/cache/<sha>/fullview.md
 * source:fetch-social <asset> [url]               yt-dlp download of an approved YouTube/TikTok/IG source → data/media/<platform>/<asset>.mp4
 * analyze <asset> [--transcribe] [--scenes] [--fullview]     enqueue media analysis (worker)
 * candidate:add <file.json> | candidate:list [--asset A] [--production P] | candidate:status <id> <selected|rejected|proposed>
 * production:create --brand B --format F --title "..." [--idea I] | production:list | production:show <id>
 * production:retitle <id> "<title>"
 * production:stage <id> <stage> [--note "..."] [--force]   (stage qa runs prelint first; --force needs --note) | production:attach <id> [--assets a,b] [--candidates c,d] [--script file] [--agents a,b]
 * production:predict <id> <file.json>
 * build|quiz:build|kids:build|tech:build|celebrity:build ... --reason "<script|timing|picture|audio|rights|qa-round-N: what>"   (I5: vN/build-reason.json + versions.notes.reason; rebuild without it warns; 4th build since the last QA-reviewed version = REFUSED unless --force --note)
 * review:hash <production>   input hashes for cut-judge stage C (cut_sha256) / puzzle-judge stage P (puzzle_sha256): copy into the stage file as input_sha256
 * script:round-check <id>                     cheap-first round state: next required reviewer, no-progress escalation, doctor history (records script-doctor.history.json)
 * script:approve <id> [--delta] [--force --note "why"]    (--delta: script fix inside a video round, docs/gates.md) workflow v3 script gate: script-doctor pass + forecast, fresh-eyes != hate, panel not blocked, packaging chosen_title -> script-approval.json (hash of script files); builders refuse without it (docs/gates.md)
 * prelint <id> [--no-asr]                       pre-QA lint of the latest version (captions, frame 0, claims, credits, AI text, mojibake, clicks) -> vN/qa/prelint.json; exit 1 on findings
 * review:add <file.json>                        independent QA review (schema-validated)
 * job:list [--status S] | job:retry <id> | job:cancel <id> | enqueue <type> [--production P] [--payload json]
 * lesson:add <brand|all> "<lesson>" --evidence "..." [--confidence low|med|high] [--kind hypothesis|evidence]
 * cycle:report <file.json>                      end-of-cycle answers (created/approved/rejected/failed/learned/change/next)
 * secrets:check                                 which credentials are configured (names only)
 *
 * viral-rankings (2026-10-31; contracts in docs/brands/viral-rankings/RANKING-ENGINE.md)
 * category:add <file.json> (one or array; parent_slug or parent_id for a subcategory) | category:list --brand B [--fixtures] [--age 24h|72h|7d|28d]
 * category:snapshot <file.json> [--fixture]      append metrics snapshot(s); unknown = null (never 0); --fixture labels test data
 * moment:add <file.json> (one or array) | moment:list [--source S] [--category C] [--brand B] [--status S] [--rights publishable|blocked] [--available]
 * moment:set-status <moment> [<creative_status>] [--rights <status|inherit> --reason "..." --evidence "..."] [--actor A]
 * moment:reserve <moment> --production P [--until ISO]   reserves ONE moment; other moments of the same source stay usable
 * moment:usage <moment> | moment:usage --production P   usage history
 * library:register <folder> --brand B [--files 01,14] [--agent A] [--category C] [--idea I] [--propose] [--moments] [--allow-youtube] [--dry-run]   Video Hunter folder (+manifest.json) -> sources (+full-clip moments); dedupes by sha256 and video URL (packages/ranking/src/hunt-library.ts)
 * ranking:validate <plan.json> [--draft] [--record --production P [--version N]]   structure + library + rights gate (exit 1 unless publishable; --draft = structure/library only)
 * ranking:cutlist <plan.json> [--out productions/<id>/cutlist.json]   RankingPlan → builder cut list in reveal order (re-runs the per-moment rights gate; refuses non-publishable)
 * ranking:credits <plan.json>                  prints nothing but a note: viral-rankings descriptions carry NO credits block (owner 2026-11-01)
 * build:scratch <production> <dir>              dry build from <dir>/cutlist.json into <dir> (TTS cache only; no DB, events or render) for layout proofs
 * ranking:zones <production>                    burned-in text heuristic under the rail/caption/title zones for the current cutlist (warn-only; build runs it too)
 * ranking:reveal --n 3|5 --scores "1=6/9,2=8/7,3=5/6" [--weights json] [--recent "2,3,1;3,1,2"] [--all]   reveal-order director (rank=hook/payoff[/energy[/loop]])
 */
import fs from 'node:fs';
import path from 'node:path';
import { db, J, newId } from '../../shared/src/db.ts';
import { emit, finishAgentTask, progressAgentTask, startAgentTask } from '../../shared/src/events.ts';
import { P } from '../../shared/src/paths.ts';
import { loadGates, recordDoctorRound, scriptApprovalGate, scriptApprove, scriptRoundStatus, storyGate } from '../../shared/src/gates.ts';
import { secretPresence, geminiKeys } from '../../shared/src/secrets.ts';
import { ClipCandidate, Review, reviewKind, SideReview, STAGES, VideoIdea, validate, QA_RUBRIC, QA_REVIEW_SQL, FORMATS } from '../../shared/src/schemas.ts';
import { setRights } from '../../rights/src/rights.ts';
import { acquire, discover, enrich } from '../../discovery/src/engine.ts';
import { cancelJob, enqueue, retryJob } from './queue.ts';
import { syncAgents } from './agents.ts';
import { analyzeSource, fullviewSource } from '../../intelligence/src/analyze.ts';
import { buildProduction } from '../../occ/src/build.ts';

const argv = process.argv.slice(2);
const cmd = argv.shift();
function flag(name: string): string | undefined { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; }
function flags(name: string): string[] { const out: string[] = []; argv.forEach((a, i) => { if (a === `--${name}`) out.push(argv[i + 1]); }); return out; }
function has(name: string) { return argv.includes(`--${name}`); }
const BOOL_FLAGS = new Set(['--portrait', '--any-license', '--transcribe', '--scenes', '--no-render', '--no-tts', '--snapshots', '--fullview', '--no-accounts', '--fixture', '--fixtures', '--draft', '--record', '--available', '--all', '--force', '--no-asr', '--delta', '--propose', '--moments', '--allow-youtube', '--dry-run']);
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) { if (!BOOL_FLAGS.has(argv[i])) i++; continue; }
  positional.push(argv[i]);
}
const pos = (i: number): string => positional[i];
const readJson = (f: string) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8').replace(/^﻿/, ''));   // tolerate a UTF-8 BOM (PowerShell 5.1 Out-File)
const out = (v: unknown) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
const table = (rows: any[], cols: string[]) => { if (!rows.length) return console.log('(none)'); console.table(rows.map(r => Object.fromEntries(cols.map(c => [c, typeof r[c] === 'string' && r[c].length > 60 ? r[c].slice(0, 57) + '…' : r[c]])))); };

/**
 * Script-approval gate in front of every builder (workflow v3, 2026-11-08; packages/shared/src/gates.ts, docs/gates.md).
 * New-loop productions need an approved script-approval.json matching the current script hash, else refuse before any TTS/render.
 * Draft modes (--no-tts / --plan) spend nothing: allowed, but their outputs get an UNAPPROVED-DRAFT.json marker.
 * Override: --force --note "why" (logged). Returns a finisher that marks draft outputs.
 */
async function scriptBuildGate(id: string, command: string, draft: boolean): Promise<(res?: any) => void> {
  if (!id) throw new Error(`usage: ${command} <productionId>`);
  const pr = db().prepare(`SELECT created_at, brand_id FROM productions WHERE production_id=?`).get(id) as any;
  const dir = path.join(P.productions, id);
  const g = scriptApprovalGate({ dir, createdAt: pr?.created_at, brand: pr?.brand_id });
  const vmax = () => fs.existsSync(dir) ? Math.max(0, ...fs.readdirSync(dir).map(d => Number(/^v(\d+)$/.exec(d)?.[1] ?? 0))) : 0;
  const before = vmax();
  const noop = () => {};
  for (const w of g.warnings) console.error(`warning (script gate, pre-v3 production): ${w}`);
  if (g.ok) return noop;
  if (draft) {
    emit({ kind: 'production.script_gate', productionId: id, agent: flag('agent'), level: 'warn', message: `${command} draft without script approval (${g.errors.join('; ')})` });
    return () => {
      const marker = JSON.stringify({ unapproved_draft: true, command, reasons: g.errors, at: new Date().toISOString(), note: 'draft build before script:approve -- not shippable' }, null, 2) + '\n';
      const targets = [path.join(dir, 'draft')];
      const after = vmax();
      if (after > before) targets.push(path.join(dir, `v${after}`));
      for (const t of targets) if (fs.existsSync(t)) fs.writeFileSync(path.join(t, 'UNAPPROVED-DRAFT.json'), marker, 'utf8');
    };
  }
  if (!has('force')) throw new Error(`script gate: ${command} refused for ${id}: ${g.errors.join('; ')} -- approve the script first (script:approve), use a draft mode (--no-tts/--plan), or --force --note "..."`);
  if (!flag('note')) throw new Error('--force needs --note "<why building without an approved script is acceptable>"');
  emit({ kind: 'production.script_gate', productionId: id, agent: flag('agent'), level: 'warn', message: `${command} script gate FORCED (${g.errors.join('; ')}): ${flag('note')}` });
  return noop;
}

/**
 * Build reasons (audit 2026-11-08 I5): every builder takes --reason "<script|timing|picture|audio|rights|qa-round-N: what>".
 * Stored in vN/build-reason.json and versions.notes.reason. A rebuild (v >= 2) without --reason warns; the 4th build since the
 * last QA-reviewed version is REFUSED (audit #2, owner 2026-11-08: hard stop) unless --force --note "why" (logged as production.build_churn).
 */
function buildReasonGate(id: string, command: string): (res?: any) => void {
  const dir = path.join(P.productions, id);
  const vns = () => fs.existsSync(dir) ? fs.readdirSync(dir).map(d => Number(/^v(\d+)$/.exec(d)?.[1] ?? 0)).filter(n => n > 0) : [];
  const vmax = () => Math.max(0, ...vns());
  const before = vmax(), next = before + 1, reason = flag('reason')?.trim() || null;
  let lastQa: number | null = null;
  try { lastQa = (db().prepare(`SELECT MAX(version) v FROM reviews WHERE production_id=? AND ${QA_REVIEW_SQL}`).get(id) as any)?.v ?? null; } catch { /* no DB row */ }
  const unreviewed = vns().filter(n => n > (lastQa ?? 0)).length;
  const known = !!db().prepare(`SELECT 1 FROM productions WHERE production_id=?`).get(id);   // scratch builds (STUDIO_PRODUCTIONS) emit nothing
  const ev = (level: 'warn' | 'error', kind: string, message: string) => { if (known) try { emit({ kind, productionId: id, agent: flag('agent'), level, message }); } catch { /* events table busy */ } };
  if (next >= 2 && !reason) { console.error(`warning (build reason): ${command} ${id} builds v${next} (a rebuild) without --reason "<script|timing|picture|audio|rights|qa-round-N: what>"`); ev('warn', 'production.build_reason', `${command} v${next} rebuild without --reason`); }
  if (unreviewed >= 3) {
    // audit #2 F5 (owner 2026-11-08): the 4th build without a new QA review is a HARD STOP (was a warning; djxc made 8 builds for 1 review)
    const msg = `BUILD CHURN: ${command} ${id} would be build #${unreviewed + 1} since the last QA-reviewed version (v${lastQa ?? 'none'}); ${unreviewed} build(s) were never reviewed`;
    if (!(has('force') && flag('note'))) { ev('error', 'production.build_churn', `${msg} -- refused`); throw new Error(`${msg} -- refused: get a QA review (review:add) of the latest version first, or --force --note "orchestrator decision: why" (logged)`); }
    console.error(`!!! ${msg} -- FORCED: ${flag('note')}`); ev('error', 'production.build_churn', `${msg} -- FORCED by --force: ${flag('note')}`);
  }
  return () => {
    const n = vmax();
    if (n <= before) return;
    const rec = { version: n, command, reason, rebuild: n >= 2, last_qa_version: lastQa, builds_since_qa: unreviewed + 1, agent: flag('agent') ?? null, at: new Date().toISOString() };
    try { fs.writeFileSync(path.join(dir, `v${n}`, 'build-reason.json'), JSON.stringify(rec, null, 2) + '\n', 'utf8'); } catch { /* folder vanished */ }
    try { db().prepare(`UPDATE versions SET notes=json_set(CASE WHEN json_valid(notes) THEN notes ELSE json_object('text', notes) END, '$.reason', ?, '$.reason_meta', json(?)) WHERE production_id=? AND n=?`).run(reason, J.str(rec), id, n); } catch { /* no version row */ }
  };
}
async function buildGates(id: string, command: string, draft: boolean): Promise<(res?: any) => void> {
  const a = await scriptBuildGate(id, command, draft);
  const b = buildReasonGate(id, command);
  return (res?: any) => { a(res); b(res); };
}

const commands: Record<string, () => Promise<void> | void> = {
  status() {
    const d = db();
    out('== productions by stage');
    table(d.prepare(`SELECT current_state stage, COUNT(*) n FROM productions GROUP BY 1`).all() as any[], ['stage', 'n']);
    out('== jobs');
    table(d.prepare(`SELECT status, type, COUNT(*) n FROM jobs GROUP BY 1,2`).all() as any[], ['status', 'type', 'n']);
    out('== sources by rights status');
    table(d.prepare(`SELECT permission_status, source_platform, COUNT(*) n FROM sources GROUP BY 1,2`).all() as any[], ['permission_status', 'source_platform', 'n']);
    out('== agents');
    table(d.prepare(`SELECT id, status, current_task FROM agents ORDER BY id`).all() as any[], ['id', 'status', 'current_task']);
    out('== last events');
    table(d.prepare(`SELECT id, ts, agent, level, message FROM events ORDER BY id DESC LIMIT 12`).all() as any[], ['id', 'ts', 'agent', 'level', 'message']);
  },
  'agents:sync'() { out(syncAgents()); },

  'task:start'() {
    const [agent, title] = [pos(0), pos(1)];
    if (!agent || !title) throw new Error('usage: task:start <agent> "<title>"');
    out({ taskId: startAgentTask(agent, title, { productionId: flag('production'), dependsOn: flag('depends')?.split(',').map(Number), inputs: flags('input') }) });
  },
  'task:progress'() { progressAgentTask(Number(pos(0)), pos(1)); out('ok'); },
  'task:finish'() {
    finishAgentTask(Number(pos(0)), {
      status: (flag('status') as any) ?? 'done', summary: flag('summary'), artifacts: flags('artifact'), error: flag('error'),
      decisions: flags('decision').map(s => { const [decision, why] = s.split('::'); return { decision: decision.trim(), why: (why ?? '').trim() }; }),
    });
    out('ok');
  },

  'brand:upsert'() {
    const b = readJson(pos(0));
    db().prepare(`INSERT INTO brands(id, name, format, positioning, audience, language, status, data) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, format=excluded.format, positioning=excluded.positioning, audience=excluded.audience,
      language=excluded.language, status=excluded.status, data=excluded.data`).run(b.id, b.name, b.format, b.positioning ?? null, b.audience ?? null, b.language ?? 'en', b.status ?? 'draft', J.str(b.data ?? {}));
    // --no-accounts: register the brand without placeholder account rows (public name/channels are still an owner decision)
    if (!has('no-accounts')) for (const p of ['youtube', 'tiktok', 'instagram', 'facebook', 'threads'])
      db().prepare(`INSERT OR IGNORE INTO accounts(id, brand_id, platform) VALUES (?,?,?)`).run(`${b.id}:${p}`, b.id, p);
    emit({ kind: 'brand.upserted', message: `Brand ${b.name} (${b.format}) saved` });
    out('ok');
  },
  'brand:list'() { table(db().prepare(`SELECT id, name, format, status, language FROM brands`).all() as any[], ['id', 'name', 'format', 'status', 'language']); },

  'idea:add'() {
    // radar link (2026-11-08): --radar <signal_id> or radar_signal_id in the idea JSON is stored in ideas.data.radar_signal_id; brief.json carries the same field name
    const radarData = (raw: any) => { const rid = flag('radar') ?? raw.radar_signal_id ?? raw.data?.radar_signal_id; return rid ? { ...(raw.data ?? {}), radar_signal_id: String(rid) } : (raw.data ?? {}); };
    const items = [readJson(pos(0))].flat();
    const ids: string[] = [];
    for (const raw of items) {
      const i = validate(VideoIdea, { idea_id: raw.idea_id ?? newId('idea'), status: 'proposed', audience: null, description: null, hook: null, opportunity_score: null, production_estimate: null, ...raw }, 'idea');
      db().prepare(`INSERT INTO ideas(idea_id, brand_id, topic, audience, language, description, hook, supporting_sources, trend_evidence, opportunity_score, production_estimate, status, data)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idea_id) DO UPDATE SET topic=excluded.topic, hook=excluded.hook, description=excluded.description,
        supporting_sources=excluded.supporting_sources, trend_evidence=excluded.trend_evidence, opportunity_score=excluded.opportunity_score, updated_at=datetime('now')`)
        .run(i.idea_id, i.brand_id, i.topic, i.audience, i.language, i.description, i.hook, J.str(i.supporting_sources), J.str(i.trend_evidence), i.opportunity_score, i.production_estimate, i.status, J.str(radarData(raw)));
      ids.push(i.idea_id);
    }
    emit({ kind: 'idea.added', agent: flag('agent') ?? 'trend-hunter', message: `${ids.length} idea(s) added to backlog` });
    out(ids);
  },
  'idea:list'() {
    const w: string[] = [], a: any[] = [];
    if (flag('brand')) { w.push('brand_id=?'); a.push(flag('brand')); }
    if (flag('status')) { w.push('status=?'); a.push(flag('status')); }
    table(db().prepare(`SELECT idea_id, brand_id, opportunity_score score, status, topic FROM ideas ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY opportunity_score DESC`).all(...a) as any[], ['idea_id', 'brand_id', 'score', 'status', 'topic']);
  },
  'idea:status'() { db().prepare(`UPDATE ideas SET status=?, updated_at=datetime('now') WHERE idea_id=?`).run(pos(1), pos(0)); out('ok'); },

  async discover() {
    const [provider, query] = [pos(0) as any, pos(1)];
    out(await discover(provider, query, { limit: flag('limit') ? +flag('limit')! : undefined, minDuration: flag('min') ? +flag('min')! : undefined, maxDuration: flag('max') ? +flag('max')! : undefined,
      portrait: has('portrait'), ccOnly: !has('any-license'), agent: flag('agent'), ideaId: flag('idea'), category: flag('category') }));
  },
  'source:list'() {
    const w: string[] = [], a: any[] = [];
    if (flag('status')) { w.push('permission_status=?'); a.push(flag('status')); }
    if (flag('platform')) { w.push('source_platform=?'); a.push(flag('platform')); }
    if (flag('idea')) { w.push(`json_extract(data,'$.idea_id')=?`); a.push(flag('idea')); }
    const rows = db().prepare(`SELECT asset_id, source_platform platform, permission_status rights, json_extract(data,'$.rights_proposal.proposed') proposed,
      CAST(duration AS INT) dur, view_count views, license, title FROM sources ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY created_at DESC LIMIT ?`).all(...a, +(flag('limit') ?? 50)) as any[];
    table(rows, ['asset_id', 'platform', 'rights', 'proposed', 'dur', 'views', 'license', 'title']);
  },
  'source:show'() {
    const s = db().prepare(`SELECT * FROM sources WHERE asset_id=?`).get(pos(0)) as any;
    if (!s) throw new Error('not found');
    out({ ...s, data: J.parse(s.data, {}), usage_restrictions: J.parse(s.usage_restrictions, []), analysis: J.parse(s.analysis, {}),
      rights_log: db().prepare(`SELECT ts, actor, from_status, to_status, reason, evidence FROM rights_log WHERE asset_id=? ORDER BY id`).all(pos(0)) });
  },
  async 'source:enrich'() { out(await enrich(pos(0))); },
  async 'source:acquire'() { out(await acquire(pos(0), flag('agent') ?? 'rights-scout')); },
  'source:set-download'() {
    const [id, url] = [pos(0), pos(1)];
    if (!/^https:\/\//.test(url)) throw new Error('url must be https');
    db().prepare(`UPDATE sources SET download_url=?, local_path=NULL, fingerprint=NULL, updated_at=datetime('now') WHERE asset_id=?`).run(url, id);
    emit({ kind: 'source.download_url', agent: flag('agent'), message: `${id}: download file set to ${url.split('/').pop()}` });
    out('ok');
  },
  async 'source:attach-file'() {
    const [id, file] = [pos(0), path.resolve(pos(1))];
    if (!fs.existsSync(file)) throw new Error(`no such file ${file}`);
    // fingerprint (sha256) is required downstream: mezzanine + analysis cache are keyed by it
    const sha = (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    db().prepare(`UPDATE sources SET local_path=?, fingerprint=?, acquisition_date=datetime('now'), updated_at=datetime('now') WHERE asset_id=?`).run(file, sha, id);
    emit({ kind: 'source.attached', message: `Attached creator-supplied file to ${id}` });
    out('ok');
  },
  'rights:set'() {
    // actor is required: a default of rights-scout let a showrunner's proposal count as the independent countersign (8rjb, 2026-10-31)
    if (!flag('actor')) throw new Error('rights:set needs --actor <who> (rights-scout | owner | showrunner-…); the countersign must name its real author');
    setRights(pos(0), pos(1) as any, { actor: flag('actor')!, reason: flag('reason') ?? '', evidence: flag('evidence'), conditions: flags('condition').length ? flags('condition') : undefined });
    out('ok');
  },
  async build() {
    const done = await buildGates(pos(0), 'build', false);   // no draft mode: --no-render still voices
    const r = await buildProduction(pos(0), { agent: flag('agent'), skipRender: has('no-render') });
    done(r); out(r);
  },
  async 'build:scratch'() {   // dry layout proof: build <id> from <dir>/cutlist.json into <dir> (TTS cache only, no DB/events/render, no build gates since nothing is recorded)
    if (!pos(0) || !pos(1)) throw new Error('usage: build:scratch <production> <dir>   (dir holds cutlist.json; then render:timeline <dir>/timeline.json <out.mp4>)');
    const r = await buildProduction(pos(0), { agent: flag('agent') ?? 'scratch', scratch: pos(1), skipRender: true });
    out({ timeline: r.timeline, duration: r.duration, log: r.log.filter((l: string) => /warn|refus|Rank layers|Overlay clearance:|Zone/i.test(l)).slice(0, 20) });
  },
  async 'quiz:build'() {
    const { buildQuiz } = await import('../../quiz/src/build.ts');
    const done = await buildGates(pos(0), 'quiz:build', has('no-tts'));
    const r = await buildQuiz(pos(0), { agent: flag('agent'), noTts: has('no-tts'), skipRender: has('no-render') });
    done(r); out(r);
  },
  async 'quizlong:plan'() {
    const { planQuizLong } = await import('../../quizlong/src/plan.ts');
    const r = planQuizLong(pos(0), { only: flag('only'), withCards: has('with-cards') });
    out(r);
    if (!r.ok) process.exitCode = 1;
  },
  async 'quizlong:build'() {
    // long-form quiz-ar (16:9): episode.json -> chunked TTS -> show.json -> template page capture -> stems -> ffmpeg -> master -> techqa
    const { buildQuizLong } = await import('../../quizlong/src/build.ts');
    const done = await buildGates(pos(0), 'quizlong:build', has('no-tts'));
    const r = await buildQuizLong(pos(0), { agent: flag('agent'), noTts: has('no-tts'), skipRender: has('no-render'), only: flag('only'), withCards: has('with-cards'), template: flag('template'), workers: flag('workers') ? Number(flag('workers')) : undefined });
    done(r); out(r);
  },
  async 'tech:build'() {
    const { buildTech } = await import('../../tech/src/build.ts');
    const snap = flag('snap')?.split(',').map(Number).filter(n => Number.isFinite(n));
    const done = await buildGates(pos(0), 'tech:build', has('no-tts') || has('plan'));
    const r = await buildTech(pos(0), { agent: flag('agent'), noTts: has('no-tts'), snap, plan: has('plan') });
    done(r); out(r);
  },
  async 'celebrity:build'() {   // Moments That Made Them: the tech builder with the celebrity profile (docs/brands/celebrity/build.md)
    const { buildTech } = await import('../../tech/src/build.ts');
    const snap = flag('snap')?.split(',').map(Number).filter(n => Number.isFinite(n));
    const done = await buildGates(pos(0), 'celebrity:build', has('no-tts') || has('plan'));
    const r = await buildTech(pos(0), { agent: flag('agent'), noTts: has('no-tts'), snap, plan: has('plan'), brand: 'celebrity' });
    done(r); out(r);
  },
  async 'kids:build'() {
    const { buildKids } = await import('../../kids3d/src/build.ts');
    const snap = flag('snap')?.split(',').map(Number).filter(n => Number.isFinite(n));
    const done = await buildGates(pos(0), 'kids:build', has('no-tts'));
    const r = await buildKids(pos(0), { agent: flag('agent'), noTts: has('no-tts'), skipRender: has('no-render'), snap, reuse3d: flag('reuse-3d') ? Number(flag('reuse-3d')) : undefined });
    done(r); out(r);
  },
  async 'kids:lint'() {
    const { lintKids } = await import('../../kids3d/src/build.ts');
    out(await lintKids(pos(0), { version: flag('version'), agent: flag('agent') }));
  },
  async 'kids:snap'() {
    const { snapKids } = await import('../../kids3d/src/build.ts');
    const times = (flag('times') ?? '').split(',').filter(Boolean).map(Number);
    out(await snapKids(pos(0), times, { version: flag('version'), agent: flag('agent'), width: flag('width') ? Number(flag('width')) : undefined }));
  },
  async 'render:timeline'() {
    // re-render a version's timeline.json (or render.timeline.json) with the ffmpeg compositor; raw render only (no master/techqa/DB)
    const { renderTimelineFile } = await import('../../render/src/render.ts');
    out(await renderTimelineFile(pos(0), pos(1), { workDir: flag('work') ? path.resolve(flag('work')!) : undefined }));   // absolute: the concat list resolves part paths against its own folder
  },
  async 'quiz:assets'() {
    // re-hash every file listed in productions/<id>/assets.json and merge build media / quiz.json art (rights + history kept)
    const { execFileSync } = await import('node:child_process');
    const dir = path.join(P.productions, pos(0));
    const vers = fs.readdirSync(dir).filter(d => /^v\d+$/.test(d)).sort((a, b) => +a.slice(1) - +b.slice(1));
    const py = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe'), script = path.join(P.root, 'packages', 'quiz', 'py', 'assets_manifest.py');
    out(String(execFileSync(py, ['-I', script, dir, ...(vers.length ? [vers[vers.length - 1]] : [])])).trim());
  },
  async 'quiz:plan'() {
    const { planQuiz } = await import('../../quiz/src/plan.ts');
    out(await planQuiz(pos(0), { snapshots: has('snapshots') }));
  },
  async 'source:analyze'() {
    const o = { transcribe: has('transcribe'), lang: flag('lang'), agent: flag('agent') };
    out(has('fullview') ? { ...(await analyzeSource(pos(0), o)), fullview: await fullviewSource(pos(0), o) } : await analyzeSource(pos(0), o));
  },
  async fullview() {
    out(await fullviewSource(pos(0), { transcribe: has('transcribe'), lang: flag('lang'), agent: flag('agent') }));
  },
  async 'source:fetch-social'() {
    const { fetchSocial } = await import('../../../scripts/fetch-social.ts');
    out(await fetchSocial(pos(0), pos(1) || flag('url'), flag('agent') ?? 'orchestrator'));
  },
  analyze() {
    const id = pos(0);
    out({ jobId: enqueue('analyze', { dedupeKey: `analyze:${id}`, payload: { assetId: id, transcribe: has('transcribe'), scenes: has('scenes') || !has('transcribe'), fullview: has('fullview') } }) });
  },

  'candidate:add'() {
    const items = [readJson(pos(0))].flat();
    const ids: string[] = [];
    for (const raw of items) {
      const src = db().prepare(`SELECT permission_status FROM sources WHERE asset_id=?`).get(raw.asset_id) as any;
      if (!src) throw new Error(`unknown asset ${raw.asset_id}`);
      const c = validate(ClipCandidate, { candidate_id: raw.candidate_id ?? newId('cand'), production_id: null, transcript_excerpt: null, speakers: null, topic: null, suggested_title: null,
        suggested_hook: null, missing_context: null, hook_score: null, coherence_score: null, emotional_score: null, value_score: null, payoff_score: null, visual_score: null,
        overall_score: null, confidence: null, edit_difficulty: null, ...raw, rights_status: src.permission_status }, 'candidate');
      const cols = Object.keys(c) as (keyof typeof c)[];
      db().prepare(`INSERT OR REPLACE INTO candidates(${cols.join(',')}, data, idea_id) VALUES (${cols.map(() => '?').join(',')}, ?, ?)`).run(...cols.map(k => c[k] as any), J.str(raw.data ?? {}), raw.idea_id ?? null);
      ids.push(c.candidate_id);
    }
    emit({ kind: 'candidates.added', agent: flag('agent') ?? 'viral-analyst', message: `${ids.length} clip candidate(s) scored` });
    out(ids);
  },
  'candidate:list'() {
    const w: string[] = [], a: any[] = [];
    if (flag('asset')) { w.push('asset_id=?'); a.push(flag('asset')); }
    if (flag('production')) { w.push('production_id=?'); a.push(flag('production')); }
    table(db().prepare(`SELECT candidate_id, asset_id, round(start_time,1) s, round(end_time,1) e, overall_score score, rights_status rights, status, moment_description FROM candidates
      ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY overall_score DESC`).all(...a) as any[], ['candidate_id', 'asset_id', 's', 'e', 'score', 'rights', 'status', 'moment_description']);
  },
  'candidate:status'() { db().prepare(`UPDATE candidates SET status=? WHERE candidate_id=?`).run(pos(1), pos(0)); out('ok'); },

  'production:create'() {
    const format = flag('format');
    if (!FORMATS.includes(format as any)) throw new Error(`--format must be one of ${FORMATS.join(', ')}`);
    const id = newId(format!.slice(0, 4));
    db().prepare(`INSERT INTO productions(production_id, brand_id, idea_id, format, title, current_state) VALUES (?,?,?,?,?,?)`).run(id, flag('brand') ?? null, flag('idea') ?? null, format!, flag('title') ?? null, 'research');
    fs.mkdirSync(path.join(P.productions, id), { recursive: true });
    if (flag('idea')) db().prepare(`UPDATE ideas SET status='in_production' WHERE idea_id=?`).run(flag('idea')!);
    emit({ kind: 'production.created', productionId: id, message: `Production created: ${flag('title')}` });
    out({ productionId: id });
  },
  'production:list'() { table(db().prepare(`SELECT production_id, brand_id, format, current_state stage, version v, qa_score qa, approval_status approval, title FROM productions ORDER BY created_at DESC`).all() as any[], ['production_id', 'brand_id', 'format', 'stage', 'v', 'qa', 'approval', 'title']); },
  'production:show'() {
    const p = db().prepare(`SELECT * FROM productions WHERE production_id=?`).get(pos(0)) as any;
    if (!p) throw new Error('not found');
    out({ ...p, data: J.parse(p.data, {}), prediction: J.parse(p.prediction, {}), source_assets: J.parse(p.source_assets, []), selected_candidates: J.parse(p.selected_candidates, []),
      versions: db().prepare(`SELECT n, render_path, contact_sheet, created_at FROM versions WHERE production_id=? ORDER BY n`).all(pos(0)),
      reviews: db().prepare(`SELECT version, reviewer, score, verdict, summary FROM reviews WHERE production_id=? ORDER BY id`).all(pos(0)) });
  },
  'production:retitle'() {
    db().prepare(`UPDATE productions SET title=?, updated_at=datetime('now') WHERE production_id=?`).run(pos(1), pos(0));
    emit({ kind: 'production.retitled', productionId: pos(0), agent: flag('agent'), message: `Retitled: ${pos(1)}` });
    out('ok');
  },
  async 'production:stage'() {
    const [id, stage] = [pos(0), pos(1)];
    if (!STAGES.includes(stage as any)) throw new Error(`stage must be one of ${STAGES.join(', ')}`);
    // pre-QA gate (2026-11-02): staging qa needs a passing prelint of the latest version (fresh one reused), or --force with a --note
    if (stage === 'qa') {
      // story-loop gate (2026-11-08): new-loop productions need story.json + script-doctor.json verdict pass
      // + script approval (workflow v3, 2026-11-08): approved script-approval.json matching the current script hash
      const pr = db().prepare(`SELECT created_at, brand_id FROM productions WHERE production_id=?`).get(id) as any;
      if (!pr) throw new Error(`production ${id} not found`);
      const facts = { dir: path.join(P.productions, id), createdAt: pr.created_at, brand: pr.brand_id };
      const sg = storyGate(facts), sa = scriptApprovalGate(facts);
      sg.errors.push(...sa.errors); sg.ok = sg.ok && sa.ok;
      for (const w of sa.warnings) console.error(`warning (script gate, pre-v3 production): ${w}`);
      if (!sg.ok) {
        if (!has('force')) throw new Error(`story gate failed for ${id}: ${sg.errors.join('; ')} -- fix them, or stage with --force --note "..."`);
        if (!flag('note')) throw new Error('--force needs --note "<why the story gate findings are acceptable>"');
        emit({ kind: 'production.story_gate', productionId: id, agent: flag('agent'), level: 'warn', message: `story gate FORCED (${sg.errors.join('; ')}): ${flag('note')}` });
      }
      const { freshPrelint, prelint } = await import('./prelint.ts');
      if (has('force')) {
        if (!flag('note')) throw new Error('--force needs --note "<why the prelint findings are acceptable>"');
        emit({ kind: 'production.prelint', productionId: id, agent: flag('agent'), level: 'warn', message: `prelint FORCED: ${flag('note')}` });
      } else {
        const r = freshPrelint(id) ?? await prelint(id, { agent: flag('agent') });
        if (!r.pass) throw new Error(`prelint failed for ${id} v${r.version} (${r.failures.length}): ${r.failures.slice(0, 8).map(f => `[${f.check}] ${f.detail}`).join('; ')} -- fix them, or stage with --force --note "..."`);
        // text-safety guard (owner 2026-11-08): the measured report of THIS version must pass (prelint wrote/refreshed it)
        const ts = (() => { try { return JSON.parse(fs.readFileSync(path.join(P.productions, id, `v${r.version}`, 'qa', 'text-safety.json'), 'utf8')); } catch { return null; } })();
        if (ts && (ts.error || ts.pass === false)) throw new Error(`text-safety failed for ${id} v${r.version}: ${ts.error ?? `${ts.blocking} blocking text(s): ${(ts.items ?? []).filter((i: any) => i.blocking).slice(0, 6).map((i: any) => `${i.t_start}s "${String(i.text).slice(0, 30)}" ${i.issues.join('+')}`).join('; ')}`} -- fix the text, or stage with --force --note "..."`);
      }
    }
    db().prepare(`UPDATE productions SET current_state=?, updated_at=datetime('now') WHERE production_id=?`).run(stage, id);
    emit({ kind: 'production.stage', productionId: id, agent: flag('agent'), message: `→ ${stage}${flag('note') ? ` — ${flag('note')}` : ''}` });
    out('ok');
  },
  'script:round-check'() {
    const id = pos(0);
    if (!id) throw new Error('usage: script:round-check <productionId>');
    const pr = db().prepare(`SELECT created_at, brand_id FROM productions WHERE production_id=?`).get(id) as any;
    const dir = path.join(P.productions, id);
    if (!pr && !fs.existsSync(dir)) throw new Error(`production ${id} not found`);
    recordDoctorRound(dir);
    const st = scriptRoundStatus({ dir, createdAt: pr?.created_at, brand: pr?.brand_id });
    out({ production: id, ...st, gate_reached_at: st.gate_reached_at ? new Date(st.gate_reached_at).toISOString() : null });
  },
  'script:approve'() {
    const id = pos(0);
    if (!id) throw new Error('usage: script:approve <productionId> [--delta] [--force --note "why"]');
    const pr = db().prepare(`SELECT created_at, brand_id FROM productions WHERE production_id=?`).get(id) as any;
    if (!pr) throw new Error(`production ${id} not found`);
    if (has('force') && !flag('note')) throw new Error('--force needs --note "<orchestrator decision>"');
    const delta = has('delta');
    const r = scriptApprove({ dir: path.join(P.productions, id), createdAt: pr.created_at, brand: pr.brand_id }, { force: has('force'), note: flag('note'), delta });
    const what = delta ? 'delta script approval' : 'script approved';
    emit({ kind: 'production.script_approval', productionId: id, agent: flag('agent'), level: r.approved ? (r.forced ? 'warn' : 'success') : 'warn',
      message: r.approved ? `${what} round ${r.round ?? '?'} forecast ${r.forecast ?? '?'}${delta && r.delta ? ` (${r.delta.changed_files?.length ?? 0} file(s), viewers ${r.delta.viewers_rerun ? 'rerun' : 'not needed'})` : ''}${r.forced ? ` FORCED (${r.failures.join('; ')}): ${flag('note')}` : ''}` : `script:approve${delta ? ' --delta' : ''} refused round ${r.round ?? '?'}: ${r.failures.join('; ')}` });
    for (const w of r.warnings) console.error(`warning: ${w}`);
    if (!r.approved) {
      console.error(`script:approve${delta ? ' --delta' : ''} refused for ${id} (round ${r.round ?? '?'}, forecast ${r.forecast ?? '?'}):`);
      for (const f of r.failures) console.error(`  - ${f}`);
      if (r.status) console.error(`next: ${r.status.next}${r.status.status === 'escalate: orchestrator decision' ? '  [ESCALATE: orchestrator decision]' : ''}`);
      if (r.gaps.length) { console.error('gap_to_gate:'); for (const g of r.gaps) console.error(`  * ${g}`); }
      throw new Error(`script not approved (${r.failures.length} failure(s)); apply the gap_to_gate fixes and run the next script round`);
    }
    out({ production: id, approved: true, delta, forced: r.forced, round: r.round, forecast: r.forecast, script_sha256: r.record.script_sha256, files: r.record.script_files, ...(r.delta ? { delta_detail: r.delta } : {}), file: path.relative(P.root, r.file) });
  },
  async 'review:hash'() {
    // audit #2 F6b (owner 2026-11-08): stage V of cut-judge / puzzle-judge runs only when this hash differs from the stage C/P file's input_sha256
    const id = pos(0);
    if (!id) throw new Error('usage: review:hash <productionId>');
    const { reviewHashes, stageReviewCheck } = await import('../../shared/src/gates.ts');
    const dir = path.join(P.productions, id), h = reviewHashes(dir);
    const v = Math.max(0, ...(fs.existsSync(dir) ? fs.readdirSync(dir).map(d => Number(/^v(\d+)$/.exec(d)?.[1] ?? 0)) : [0]));
    const vdir = v ? path.join(dir, `v${v}`) : null;
    out({ production: id, ...h, cut_review: h.cut_sha256 ? stageReviewCheck(dir, vdir, 'cut') : null, puzzle_judge: h.puzzle_sha256 ? stageReviewCheck(dir, vdir, 'puzzle') : null });
  },
  async 'text-safety'() {
    // re-measure every on-screen text of an existing render's timeline (no video re-render): vN/qa/text-safety.json (owner 2026-11-08)
    const id = pos(0);
    if (!id) throw new Error('usage: text-safety <productionId> [--version N] [--timeline <re-planned timeline.json>] [--out <report.json>]   (--timeline/--out: scratch re-plan checks; STUDIO_RENDER_TMP points the HyperFrames layers at a scratch work dir)');
    const pr = db().prepare(`SELECT brand_id, version FROM productions WHERE production_id=?`).get(id) as any;
    if (!pr) throw new Error(`production ${id} not found`);
    const n = Number(flag('version') ?? pr.version);
    const vdir = path.join(P.productions, id, `v${n}`);
    const { textSafety, textSafetySummary } = await import('../../render/src/text-safety.ts');
    const tl = (flag('timeline') ? [path.resolve(flag('timeline')!)] : ['render.timeline.json', 'timeline.json'].map(f => path.join(vdir, f))).filter(f => fs.existsSync(f)).map(f => JSON.parse(fs.readFileSync(f, 'utf8')))
      .find((t: any) => Array.isArray(t?.tracks) && t.width > 0);
    if (!tl) throw new Error(`${flag('timeline') ?? `v${n}`} has no render timeline (render.timeline.json / timeline.json with tracks + width)`);
    const outFile = flag('out') ? path.resolve(flag('out')!) : path.join(vdir, 'qa', 'text-safety.json');
    for (const tr of tl.tracks) for (const it of tr.items) if (it.src && !path.isAbsolute(it.src)) it.src = path.resolve(P.root, it.src);
    const r = await textSafety(tl, { productionId: id, version: n, brand: pr.brand_id, out: outFile });
    if (!flag('out')) emit({ kind: 'production.text_safety', productionId: id, agent: flag('agent'), level: r.pass ? 'info' : 'warn', message: `v${n} ${textSafetySummary(r)}` });
    out({ production: id, version: n, pass: r.pass, summary: textSafetySummary(r), file: path.relative(P.root, outFile),
      findings: r.items.filter(i => i.issues.length).slice(0, 40).map(i => `${i.blocking ? 'BLOCK' : 'warn '} ${i.t_start.toFixed(2)}-${i.t_end.toFixed(2)}s [${i.layer}] "${i.text.slice(0, 40)}": ${i.details.join(' | ')}`), unmeasured: r.unmeasured });
    if (!r.pass) process.exitCode = 1;
  },
  async prelint() {
    const id = pos(0);
    if (!id) throw new Error('usage: prelint <productionId> [--no-asr]');
    const { prelint } = await import('./prelint.ts');
    const r = await prelint(id, { asr: !has('no-asr'), agent: flag('agent') });
    emit({ kind: 'production.prelint', productionId: id, agent: flag('agent'), level: r.pass ? 'info' : 'warn', message: `prelint v${r.version}: ${r.pass ? 'pass' : `${r.failures.length} finding(s)`}` });
    out({ production: id, version: r.version, pass: r.pass, failures: r.failures.map(f => `[${f.check}] ${f.detail}`), warnings: r.warnings.map(f => `[${f.check}] ${f.detail}`), checked: r.checked });
    if (!r.pass) throw new Error(`prelint: ${r.failures.length} finding(s); fix them before staging qa`);
  },
  'production:attach'() {
    const id = pos(0);
    const p = db().prepare(`SELECT source_assets, selected_candidates, assigned_agents FROM productions WHERE production_id=?`).get(id) as any;
    if (!p) throw new Error('not found');
    const merge = (cur: string, add?: string) => J.str([...new Set([...J.parse<string[]>(cur, []), ...(add ? add.split(',') : [])])]);
    const script = flag('script') ? fs.readFileSync(flag('script')!, 'utf8') : null;
    db().prepare(`UPDATE productions SET source_assets=?, selected_candidates=?, assigned_agents=?, script=COALESCE(?, script), updated_at=datetime('now') WHERE production_id=?`)
      .run(merge(p.source_assets, flag('assets')), merge(p.selected_candidates, flag('candidates')), merge(p.assigned_agents, flag('agents')), script, id);
    if (flag('candidates')) for (const c of flag('candidates')!.split(',')) db().prepare(`UPDATE candidates SET production_id=?, status='selected' WHERE candidate_id=?`).run(id, c);
    out('ok');
  },
  'production:predict'() {
    db().prepare(`UPDATE productions SET prediction=? WHERE production_id=?`).run(J.str({ ...readJson(pos(1)), recorded_at: new Date().toISOString(), note: 'estimate, not a fact' }), pos(0));
    out('ok');
  },

  'review:add'() {
    const raw = readJson(pos(0));
    const kind = reviewKind(raw);   // qa (default) | retention | rights | critic — only qa reviews touch productions.qa_score (2026-10-31)
    const r: any = kind === 'qa' ? validate(Review, raw, 'review') : validate(SideReview, raw, `${kind} review`);
    const p = db().prepare(`SELECT json_extract(data,'$.built_by') built_by FROM productions WHERE production_id=?`).get(r.production_id) as any;
    if (p?.built_by && p.built_by === r.reviewer) throw new Error('the editor of a video may not review it');
    const score = kind !== 'qa' && r.score != null ? r.score : (Object.values(r.breakdown) as number[]).reduce((a, b) => a + b, 0);
    const verdict = r.blockers.length ? 'reject' : score >= loadGates().qa ? 'pass' : 'revise';   // config/gates.json qa (85)
    db().prepare(`INSERT INTO reviews(production_id, version, reviewer, kind, score, verdict, breakdown, issues, blockers, summary) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(r.production_id, r.version, r.reviewer, kind === 'qa' ? 'agent' : kind, score, verdict, J.str(r.breakdown), J.str(r.issues), J.str(r.blockers), r.summary);
    if (kind === 'qa') db().prepare(`UPDATE productions SET qa_score=?, current_state=CASE WHEN ?='pass' AND current_state IN ('approved','scheduled','published','analytics') THEN current_state WHEN ?='pass' THEN 'qa' ELSE 'editing' END, updated_at=datetime('now') WHERE production_id=?`).run(score, verdict, verdict, r.production_id);   // a passing re-review must not pull an approved/scheduled/published production back to 'qa'
    emit({ kind: 'review.added', agent: r.reviewer, productionId: r.production_id, level: verdict === 'pass' ? 'success' : 'warn',
      message: `v${r.version} ${kind === 'qa' ? '' : `${kind} `}review: ${score}/100 → ${verdict}${r.blockers.length ? ` (${r.blockers.length} blocker)` : ''}${kind === 'qa' ? '' : ' (QA score unchanged)'}`, data: { max: QA_RUBRIC, kind } });
    out({ score, verdict, kind, qa_score_updated: kind === 'qa' });
  },

  'job:list'() { table(db().prepare(`SELECT id, type, production_id, status, attempts, round(progress,2) progress, error FROM jobs ${flag('status') ? 'WHERE status=?' : ''} ORDER BY id DESC LIMIT 40`).all(...(flag('status') ? [flag('status')!] : [])) as any[], ['id', 'type', 'production_id', 'status', 'attempts', 'progress', 'error']); },
  'job:retry'() { retryJob(Number(pos(0))); out('ok'); },
  'job:cancel'() { cancelJob(Number(pos(0))); out('ok'); },
  enqueue() { out({ jobId: enqueue(pos(0), { productionId: flag('production'), payload: flag('payload') ? JSON.parse(flag('payload')!) : {} }) }); },

  'lesson:add'() {
    const brand = pos(0) === 'all' ? null : pos(0);
    db().prepare(`INSERT INTO lessons(brand_id, title, evidence, confidence, kind, category) VALUES (?,?,?,?,?,?)`).run(brand, pos(1), flag('evidence') ?? null, flag('confidence') ?? 'low', flag('kind') ?? 'hypothesis', flag('category') ?? null);
    emit({ kind: 'lesson.added', agent: flag('agent') ?? 'growth', message: pos(1) });
    out('ok');
  },
  'cycle:report'() {
    const c = readJson(pos(0));
    const keys = ['created', 'approved', 'rejected', 'failed', 'learned', 'change', 'next'];
    for (const k of keys) if (c[k] == null) throw new Error(`cycle report missing "${k}"`);
    db().prepare(`INSERT INTO cycles(${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map(k => J.str(c[k])));
    emit({ kind: 'cycle.report', message: 'Production cycle report recorded' });
    out('ok');
  },
  /* ---------------------------------------------------------------- viral-rankings */
  async 'category:add'() {
    const { upsertCategory } = await import('../../ranking/src/library.ts');
    // parents first so parent_slug resolves within one file
    const items = [readJson(pos(0))].flat().sort((a: any, b: any) => Number(!!(a.parent_slug || a.parent_id)) - Number(!!(b.parent_slug || b.parent_id)));
    out(items.map((c: any) => upsertCategory(c, flag('agent') ?? 'orchestrator')));
  },
  async 'category:list'() {
    const { listCategories } = await import('../../ranking/src/library.ts');
    if (!flag('brand')) throw new Error('usage: category:list --brand B');
    const rows = listCategories(flag('brand')!, { includeFixtures: has('fixtures'), ageBucket: flag('age') });
    const v = (x: any) => x == null ? 'unknown' : x;
    table(rows.map(r => ({ id: r.id, level: r.parent_id ? '  sub' : 'cat', title: r.title, risk: r.rights_risk ?? 'unknown', ideas: r.ideas,
      moments: `${r.moments.available}/${r.moments.total}`, cleared: r.moments.rights_cleared, pending: r.moments.rights_pending,
      median_views: v(r.latest_snapshot?.median_views), pct_viewed: v(r.latest_snapshot?.avg_pct_viewed), n: v(r.latest_snapshot?.sample_size),
      snap: r.latest_snapshot ? `${r.latest_snapshot.is_fixture ? 'FIXTURE ' : ''}${r.latest_snapshot.age_bucket ?? ''} ${String(r.latest_snapshot.observed_at).slice(0, 10)}` : 'none' })),
      ['id', 'level', 'title', 'risk', 'ideas', 'moments', 'cleared', 'pending', 'median_views', 'pct_viewed', 'n', 'snap']);
  },
  async 'category:snapshot'() {
    const { addCategorySnapshot } = await import('../../ranking/src/library.ts');
    out([readJson(pos(0))].flat().map((s: any) => addCategorySnapshot(s, { fixture: has('fixture'), agent: flag('agent') })));
  },
  async 'moment:add'() {
    const { addMoment } = await import('../../ranking/src/library.ts');
    out([readJson(pos(0))].flat().map((m: any) => addMoment(m, flag('agent') ?? 'viral-analyst')));
  },
  async 'moment:list'() {
    const { listMoments } = await import('../../ranking/src/library.ts');
    const rows = listMoments({ sourceId: flag('source'), categoryId: flag('category'), brandId: flag('brand'), status: flag('status'), rights: flag('rights') as any, available: has('available'), limit: +(flag('limit') ?? 200) });
    table(rows.map(r => ({ moment_id: r.moment_id, source: r.source_id, s: (r.start_ms / 1000).toFixed(1), e: (r.end_ms / 1000).toFixed(1), creative: r.creative_status,
      rights: r.rights.publishable ? 'publishable' : `blocked: ${r.rights.reasons.join('; ')}`, fit: r.rank_suitability, reserved_by: r.reserved_by, dup: r.duplicate_of, description: r.description })),
      ['moment_id', 'source', 's', 'e', 'creative', 'rights', 'fit', 'reserved_by', 'dup', 'description']);
  },
  async 'moment:set-status'() {
    const { setMomentStatus } = await import('../../ranking/src/library.ts');
    out({ rights_log_id: setMomentStatus(pos(0), pos(1) ?? null, { rights: flag('rights'), actor: flag('actor') ?? 'rights-scout', reason: flag('reason'), evidence: flag('evidence') }) });
  },
  async 'moment:reserve'() {
    const { reserveMoment } = await import('../../ranking/src/library.ts');
    if (!flag('production')) throw new Error('usage: moment:reserve <moment> --production P');
    out(reserveMoment(pos(0), flag('production')!, { until: flag('until'), agent: flag('agent') }));
  },
  async 'library:register'() {
    const { registerHuntFolder } = await import('../../ranking/src/hunt-library.ts');
    if (!pos(0) || !flag('brand')) throw new Error('usage: library:register <folder> --brand B [--files 01,14] [--propose] [--moments] [--dry-run]');
    out(registerHuntFolder(pos(0), { brand: flag('brand')!, agent: flag('agent'), files: flag('files')?.split(','), category: flag('category'), idea: flag('idea'),
      propose: has('propose'), moments: has('moments'), allowYoutube: has('allow-youtube'), dryRun: has('dry-run') }));
  },
  async 'moment:usage'() {
    const { usageOf } = await import('../../ranking/src/library.ts');
    table(usageOf({ momentId: pos(0), productionId: flag('production') }), ['id', 'production_id', 'version', 'moment_id', 'in_ms', 'out_ms', 'rank_position', 'reveal_index', 'status', 'platform', 'published_at']);
  },
  async 'ranking:validate'() {
    const { validateRankingPlan } = await import('../../ranking/src/plan.ts');
    const r = validateRankingPlan(readJson(pos(0)));
    const { plan, ...report } = r;
    out({ ...report, reveal: plan ? plan.reveal_order.map(x => `#${x}`).join(' -> ') : null });
    if (has('record')) {
      if (!r.valid || !plan) throw new Error('not recording usage: plan is invalid');
      const prod = flag('production') ?? plan.production_id;
      if (!prod) throw new Error('--record needs --production (or production_id in the plan)');
      const { recordUsage } = await import('../../ranking/src/library.ts');
      const ids = plan.entries.map(e => recordUsage({ production_id: prod, version: flag('version') ? +flag('version')! : null, moment_id: e.moment_id, in_ms: e.in_ms, out_ms: e.out_ms,
        rank_position: e.rank_position, reveal_index: e.reveal_index, transformation: { left_label: e.left_label, narration_ref: e.narration_ref ?? null }, status: 'in_draft' }));
      emit({ kind: 'ranking.usage', productionId: prod, agent: flag('agent'), message: `${ids.length} moment usage row(s) recorded (${plan.reveal_order.join('->')})` });
    }
    // the CLI wrapper resets exitCode on success, so fail by throwing (report already printed above)
    if (!(has('draft') ? r.valid : r.publishable)) throw new Error(r.valid ? 'plan is valid but NOT publishable (rights gate)' : 'plan is invalid');
  },
  async 'ranking:cutlist'() {
    const { planToCutlist } = await import('../../ranking/src/cutlist.ts');
    const planPath = pos(0);
    if (!planPath) throw new Error('usage: ranking:cutlist <plan.json> [--out <cutlist.json>]');
    const { cutlist, warnings } = planToCutlist(readJson(planPath), { planPath });
    const outFile = flag('out') ?? path.join(P.productions, cutlist.production_id, 'cutlist.json');
    fs.writeFileSync(outFile, JSON.stringify(cutlist, null, 1), 'utf8');
    emit({ kind: 'ranking.cutlist', productionId: cutlist.production_id, agent: flag('agent'), message: `cut list written from plan (${cutlist.ranking.reveal_order.join('->')}, ${cutlist.segments.length} segments, rights gate passed per moment)` });
    out({ out: outFile, segments: cutlist.segments.map((s: any) => `#${s.item} ${s.asset_id} ${s.src_in}-${s.src_out}s ${s.fill}${s.mute_source ? ' muted' : ''}`), narration_lines: cutlist.narration?.lines.length ?? 0, cta: cutlist.rank_layers.cta, warnings });
  },
  async 'ranking:credits'() {
    // owner 2026-11-01: no "Video credits:" block in viral-rankings descriptions (views first); nothing here feeds script.json / publish-plan
    console.error('ranking:credits: viral-rankings descriptions carry no credits block (owner 2026-11-01); nothing to print.');
  },
  async 'ranking:zones'() {
    const { zoneCheck } = await import('../../ranking/src/layers.ts');
    const id = pos(0);
    const cl = readJson(path.join(P.productions, id, 'cutlist.json'));
    const src: Record<string, any> = {};
    for (const s of cl.segments) { const r = db().prepare(`SELECT analysis FROM sources WHERE asset_id=?`).get(s.asset_id) as any; src[s.asset_id] = { a: J.parse(r?.analysis, {}) }; }
    let f = 0;
    const segs = cl.segments.map((s: any) => { const d = Math.round((s.src_out - s.src_in) * 30); const g = { ...s, startF: f, durF: d }; f += d; return g; });
    out(await zoneCheck(segs, src, path.join(P.productions, id, 'zone_check.json'), cl.rank_layers?.title_box ?? null, cl.rank_layers?.style === 'v2' ? (await import('../../ranking/src/layout.ts')).vrRailRect(cl.rank_layers.title_layout) : null));   // compact / tall title band, style-v2 rail
  },
  async 'ranking:reveal'() {
    const { directReveal, parseScores } = await import('../../ranking/src/reveal.ts');
    const n = Number(flag('n'));
    if (n !== 3 && n !== 5) throw new Error('--n must be 3 or 5');
    if (!flag('scores')) throw new Error('--scores required, e.g. "1=6/9,2=8/7,3=5/6" (rank=hook/payoff)');
    const recent = (flag('recent') ?? '').split(';').map(s => s.trim()).filter(Boolean).map(s => s.split(/[^0-9]+/).filter(Boolean).map(Number));
    const res = directReveal(n, parseScores(flag('scores')!), { weights: flag('weights') ? JSON.parse(flag('weights')!) : undefined, recent });
    out({ chosen: res.chosen.order.map(x => `#${x}`).join(' -> '), score: res.chosen.total, terms: res.chosen.terms, reasons: res.reasons, weights: res.weights,
      top: res.candidates.slice(0, has('all') ? res.candidates.length : 8).map(c => ({ order: c.order.join('->'), total: c.total })) });
  },

  'secrets:check'() {
    out({ gemini_keys: geminiKeys().length, ...secretPresence(['PEXELS_API_KEY', 'PIXABAY_API_KEY', 'YOUTUBE_API_KEY', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'UPLOAD_POST_API_KEY']) });
  },
};

const fn = cmd && commands[cmd];
if (!fn) { console.log(fs.readFileSync(import.meta.filename, 'utf8').split('*/')[0]); process.exit(cmd ? 1 : 0); }
try { await fn(); process.exitCode = 0; } catch (e: any) { console.error(`error: ${e.message}`); process.exitCode = 1; }
