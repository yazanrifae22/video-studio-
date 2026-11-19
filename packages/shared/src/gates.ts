/**
 * Studio gates (story council 2026-11-08 + workflow v3 contract, research/council/2026-11-08-workflow/CONTRACT.md,
 * + workflow audit fixes research/workflow-audits/2026-11-08.md I3-I11, owner-approved 2026-11-08).
 * Thresholds live in config/gates.json (single source; defaults below if the file is missing). Summary in docs/gates.md.
 *  - storyGate:          stage qa needs story.json + script-doctor.json verdict pass (new loop).
 *  - scriptRoundStatus:  cheap-first round state (I3): next required reviewer, no-progress escalation, doctor history.
 *  - scriptApprove:      `script:approve <id> [--delta]` checks doctor/fresh-eyes/panel/packaging (+ fix-ledger for weak verdicts,
 *                        I6; delta re-approval for video-round script fixes, I7), validates file shapes (I9), hashes the script
 *                        files, writes script-approval.json (approved true|false + history) and approved-script/ (snapshot).
 *  - scriptApprovalGate: builders (before TTS/render) and stage qa need an approved script-approval.json whose hash
 *                        matches the current script files (new loop; older productions: warnings only).
 *  - approveGate:        approve reads the REVIEWED vN (must equal the latest render, I4): insights >= insights, viral (story.json,
 *                        brand != kids; record-only while viral_mode = record, I11), new loop panel/fresh-eyes V, file shapes (I9).
 *  - countersignCheck:   every used source's latest rights_log row is a countersign (I4; strict with story.json, else warnings).
 * New loop = production created on/after STORY_LOOP_FROM or has a story.json.
 * Pure on (dir, facts) so scripts/test-gates.ts can run them on temp folders. Override: --force --note / force_note.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { P } from './paths.ts';

export const STORY_LOOP_FROM = '2026-11-08';

export interface Gates {
  script_forecast: number; script_rounds_max: number; qa: number; insights: number; viral: number; retention: number;
  video_rounds_max: number; panel_block_hate: number; panel_block_swipe: number; fresh_eyes_block: string;
  packaging: number; shelve_viral_round2: number; viral_mode: string; viral_mode_until: string;
  /** quiz-ar puzzle-judge (owner 2026-11-08): mean enjoyable/10 across rounds */ puzzle_enjoy: number;
  /** Podium Pop cut-judge (2026-11-08): every entry's window score /10 */ cut_entry_min: number;
  /** owner 2026-11-08: round-2 viral shelve suggestion paused until this date (YYYY-MM-DD; '' = active) */ shelve_viral_round2_paused_until: string;
  /** owner 2026-11-08: QA/insights bars kept until this date (note only) */ review_bars_until: string;
  /** owner 2026-11-08: approved videos per channel per day (dashboard target) */ daily_target_approved: number;
}
export const GATE_DEFAULTS: Gates = {
  script_forecast: 85, script_rounds_max: 10, qa: 85, insights: 85, viral: 75, retention: 80,
  video_rounds_max: 3, panel_block_hate: 3, panel_block_swipe: 3, fresh_eyes_block: 'hate',
  packaging: 85, shelve_viral_round2: 65, viral_mode: 'record', viral_mode_until: '2026-11-22', puzzle_enjoy: 7, cut_entry_min: 8,
  shelve_viral_round2_paused_until: '2026-11-22', review_bars_until: '2026-11-22', daily_target_approved: 2,
};
/** Escalation thresholds for the no-progress rule (I3; owner-approved, not in gates.json on purpose: they are rule constants). */
export const NO_PROGRESS = { min_gain: 3, over_rounds: 2, late_round: 4, late_floor: 75 };
/** Swipes before the payoff that make a panel need a fix-ledger answer (I6). */
export const PANEL_SWIPE_ANSWER = 2;

/**
 * config/gates.json merged over the defaults (STUDIO_GATES env overrides the path, for tests). Read fresh each call: cheap, and edits
 * apply without a restart. With a brand, `brand_overrides[<brand>]` is merged on top for ANY gate key (owner 2026-11-08: Sunny Hill
 * = kids script_forecast 90, every other brand 85).
 */
export function loadGates(file = process.env.STUDIO_GATES ?? path.join(P.config, 'gates.json'), brand?: string | null): Gates {
  const j = readJ(file);
  const g: any = { ...GATE_DEFAULTS };
  const put = (src: any) => { if (src && typeof src === 'object') for (const k of Object.keys(GATE_DEFAULTS)) if (src[k] != null) g[k] = typeof (GATE_DEFAULTS as any)[k] === 'number' ? Number(src[k]) : String(src[k]); };
  put(j);
  if (brand) put(j?.brand_overrides?.[brand]);
  return g;
}
/** Gates for one brand (config/gates.json + its brand_overrides entry). */
export const gatesFor = (brand?: string | null, file?: string): Gates => loadGates(file, brand);
/** brand -> {gate key: value} for the keys a brand overrides (dashboard / docs). */
export function brandOverrides(file = process.env.STUDIO_GATES ?? path.join(P.config, 'gates.json')): Record<string, Partial<Gates>> {
  const bo = readJ(file)?.brand_overrides, out: Record<string, Partial<Gates>> = {};
  if (bo && typeof bo === 'object') for (const [b, o] of Object.entries<any>(bo)) {
    if (!o || typeof o !== 'object' || b.startsWith('_')) continue;
    const full = loadGates(file, b), part: any = {};
    for (const k of Object.keys(GATE_DEFAULTS)) if (o[k] != null) part[k] = (full as any)[k];
    out[b] = part;
  }
  return out;
}
// back-compat exports (read at import time)
export const INSIGHTS_MIN = loadGates().insights;
export const VIRAL_MIN = loadGates().viral;
const NEVER_VIRAL_GATED = new Set(['kids']);   // Sunny Hill: viral is record-only (panel still gates)

/** I11: the render viral gate is record-only while viral_mode = "record" and today <= viral_mode_until; afterwards (or "hard") it blocks. */
export function viralMode(G: Gates = loadGates(), today = new Date().toISOString().slice(0, 10)): 'record' | 'hard' {
  return String(G.viral_mode).toLowerCase() === 'record' && (!G.viral_mode_until || today <= G.viral_mode_until) ? 'record' : 'hard';
}

/** Round-2 viral shelve suggestion (I8) is off while today <= shelve_viral_round2_paused_until (owner 2026-11-08: viral ran backwards vs views). */
export function shelveActive(G: Gates = loadGates(), today = new Date().toISOString().slice(0, 10)): boolean {
  return !G.shelve_viral_round2_paused_until || today > G.shelve_viral_round2_paused_until;
}

function readJ(f: string): any { try { return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, '')) : null; } catch { return null; } }
const mtime = (f: string) => { try { return fs.statSync(f).mtimeMs; } catch { return null; } };

// ---------- score normaliser (one rule for every reviewer file; the dashboard uses the same functions) ----------

/** number | numeric string | {score} | {viewer_score} | {value} | {forecast} -> number, else null. */
export function numScore(v: any, depth = 0): number | null {
  if (v == null || v === '' || typeof v === 'boolean' || depth > 3) return null;
  if (typeof v === 'object') {
    for (const k of ['score', 'viewer_score', 'value', 'forecast']) if (v[k] != null) return numScore(v[k], depth + 1);
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** script-doctor forecast: `forecast` as number OR {score}, else forecast_detail / score. */
export const forecastOf = (sd: any): number | null => sd ? numScore(sd.forecast) ?? numScore(sd.forecast_detail) ?? numScore(sd.forecast_score) ?? numScore(sd.score) : null;
/** script-doctor round: `round` or `pass_n` (numbers or numeric strings). */
export const roundOf = (sd: any): number | null => sd ? numScore(sd.round) ?? numScore(sd.pass_n) : null;
/** fresh-eyes / panel / packaging / viral score: score or viewer_score (number or {score}). */
export const scoreOf = (j: any): number | null => j ? numScore(j.score) ?? numScore(j.viewer_score) : null;
export const viewerScoreOf = (j: any): number | null => j ? numScore(j.viewer_score) ?? numScore(j.score) : null;

export interface GateFacts { dir: string; createdAt?: string | null; brand?: string | null; version?: number | null; reviewedVersion?: number | null }
export interface GateResult { ok: boolean; errors: string[]; warnings: string[]; newLoop: boolean; gaps?: string[]; info?: Record<string, any> }

export function isNewLoop(f: GateFacts): boolean {
  return fs.existsSync(path.join(f.dir, 'story.json')) || String(f.createdAt ?? '').slice(0, 10) >= STORY_LOOP_FROM;
}

/** gap_to_gate items -> short readable lines ("<file>: item now->needed: fix (+points)"). */
export function gapLines(label: string, j: any): string[] {
  const g = Array.isArray(j?.gap_to_gate) ? j.gap_to_gate : [];
  return g.map((x: any) => typeof x === 'string' ? `${label}: ${x}`
    : `${label}: ${x?.item ?? '?'}${x?.now != null || x?.needed != null ? ` ${x?.now ?? '?'}->${x?.needed ?? '?'}` : ''}${x?.fix ? `: ${x.fix}` : ''}${x?.points != null ? ` (+${x.points})` : ''}${x?.owner ? ` [${x.owner}]` : ''}`);
}

// ---------- file-shape validation (I9: scripts/validate-review.py) ----------

export interface ValidationResult { ok: boolean; errors: string[]; warnings: string[]; ran: boolean }
/** Runs scripts/validate-review.py on the existing files (one python call). Python missing -> ran:false + warning (never blocks). */
export function validateReviewFiles(files: string[]): ValidationResult {
  const fs_ = files.filter(f => fs.existsSync(f));
  if (!fs_.length) return { ok: true, errors: [], warnings: [], ran: false };
  const py = process.env.STUDIO_PYTHON ?? 'python';
  const r = spawnSync(py, ['-I', path.join(P.root, 'scripts', 'validate-review.py'), '--json', ...fs_], { encoding: 'utf8', timeout: 60_000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  let j: any = null;
  try { j = JSON.parse(String(r.stdout ?? '').trim().split('\n').at(-1) ?? ''); } catch { /* below */ }
  if (!j) return { ok: true, errors: [], warnings: [`validate-review.py did not run (${r.error?.message ?? String(r.stderr ?? '').slice(0, 160) ?? 'no output'})`], ran: false };
  const errors: string[] = [], warnings: string[] = [];
  for (const f of j.files ?? []) {
    const n = path.basename(path.dirname(f.file)) === 'qa' ? `${path.basename(path.dirname(path.dirname(f.file)))}/qa/${path.basename(f.file)}` : path.basename(f.file);
    if (!f.ok) errors.push(`malformed ${n}: ${(f.errors ?? []).join('; ')} (python scripts/validate-review.py ${n})`);
    for (const w of f.warnings ?? []) warnings.push(`${n}: ${w}`);
  }
  return { ok: !errors.length, errors, warnings, ran: true };
}

export function storyGate(f: GateFacts): GateResult {
  const newLoop = isNewLoop(f), errors: string[] = [];
  if (newLoop) {
    if (!fs.existsSync(path.join(f.dir, 'story.json'))) errors.push('story.json missing (story-architect runs before the script)');
    const sd = readJ(path.join(f.dir, 'script-doctor.json'));
    if (!sd) errors.push('script-doctor.json missing (script-doctor runs before TTS/build)');
    else if (String(sd.verdict ?? '').toLowerCase() !== 'pass') errors.push(`script-doctor verdict is "${sd.verdict ?? 'none'}", needs "pass"`);
  }
  return { ok: errors.length === 0, errors, warnings: [], newLoop };
}

// ---------- script approval ----------

/** Files whose combined hash is the approved script, per brand. "?" = optional (hashed when present; appearing/disappearing changes the hash). */
export const SCRIPT_FILES: Record<string, string[]> = {
  'quiz-ar': ['quiz.json', 'script.json?'],  // script.json (on-screen text lives there too) joined 2026-11-08; older approvals hashed quiz.json only (see `only`)
  kids: ['episode.json', 'script.json?'],
  tech: ['script.json', 'spec.json?'],
  celebrity: ['script.json', 'spec.json?'],
  // quiz-ar LONG-FORM (packages/quizlong, 2026-11-12): episode.json carries every question, spoken line and on-screen text
  'quiz-long': ['episode.json', 'script.json?'],
  default: ['script.json'],
};
/** quiz-ar production folder built by packages/quizlong (episode.json, no quiz.json). */
export const isQuizLongDir = (dir?: string | null) => !!dir && fs.existsSync(path.join(dir, 'episode.json')) && !fs.existsSync(path.join(dir, 'quiz.json'));
export function scriptFilesFor(brand?: string | null, dir?: string | null): string[] {
  if (brand === 'quiz-ar' && isQuizLongDir(dir)) return SCRIPT_FILES['quiz-long'];
  return SCRIPT_FILES[String(brand ?? '')] ?? SCRIPT_FILES.default;
}

/** sha256 over `name\0bytes\0` of each listed file (absent optional file = `name\0-\0`). Missing required files are returned, not thrown. */
/** `only`: hash just these file names (an older approval recorded a shorter file list; its hash is re-derived from the same list). */
export function scriptHash(dir: string, brand?: string | null, only?: string[] | null): { sha256: string; files: Record<string, string | null>; missing: string[] } {
  const h = crypto.createHash('sha256'), files: Record<string, string | null> = {}, missing: string[] = [];
  for (const spec of scriptFilesFor(brand, dir)) {
    const opt = spec.endsWith('?'), name = opt ? spec.slice(0, -1) : spec, f = path.join(dir, name);
    if (only && !only.includes(name)) continue;
    if (fs.existsSync(f)) {
      const b = fs.readFileSync(f);
      files[name] = crypto.createHash('sha256').update(b).digest('hex');
      h.update(name).update('\0').update(b).update('\0');
    } else {
      files[name] = null;
      if (!opt) missing.push(name);
      h.update(name).update('\0-\0');
    }
  }
  return { sha256: h.digest('hex'), files, missing };
}

// ---------- stage C/P input hashes (audit #2 F6b, owner 2026-11-08): V stages re-run only when the input changed ----------

const sha = (s: string | Buffer) => crypto.createHash('sha256').update(s).digest('hex');
const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
/** Podium Pop cut windows + framing: ranking-plan.json entries (source, in/out, framing, extra shots, order). null = no plan. */
export function cutHash(dir: string): string | null {
  const p = readJ(path.join(dir, 'ranking-plan.json'));
  if (!p || !Array.isArray(p.entries)) return null;
  const K = ['source_id', 'moment_id', 'in_ms', 'out_ms', 'payoff_ms', 'fill', 'framing', 'extra_shots', 'rank_position', 'reveal_index'];
  return sha(JSON.stringify(stable(p.entries.map((e: any) => Object.fromEntries(K.map(k => [k, e?.[k] ?? null]))))));
}
/** quiz-ar puzzle art + round mechanics: quiz.json rounds without wording keys (narration / *_ar text) + bytes of art/ and of every referenced file. */
export function puzzleHash(dir: string): string | null {
  const q = readJ(path.join(dir, 'quiz.json'));
  if (!q && isQuizLongDir(dir)) {
    // quiz-long: questions (clues, options, answers, hints, think times) without the spoken wording (*_tts, learn/ask text stay: they are on screen)
    const ep = readJ(path.join(dir, 'episode.json'));
    if (!ep || !Array.isArray(ep.questions)) return null;
    const drop = (v: any): any => Array.isArray(v) ? v.map(drop) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !/_tts$|^source$/.test(k)).map(([k, x]) => [k, drop(x)])) : v;
    return sha(JSON.stringify(stable({ questions: drop(ep.questions), levels: (ep.levels ?? []).map((l: any) => ({ n: l.n, think_s: l.think_s })) })));
  }
  if (!q || !Array.isArray(q.rounds)) return null;
  const TEXT = /(_ar|narration|caption|line_id|lines?|script|say|voice)$/i, files = new Set<string>();
  const strip = (v: any): any => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !TEXT.test(k)).map(([k, x]) => [k, strip(x)]));
    if (typeof v === 'string' && /\.(png|jpe?g|webp|svg|gif|mp4|webm)$/i.test(v) && fs.existsSync(path.join(dir, v))) files.add(path.join(dir, v));
    return v;
  };
  const rounds = strip(q.rounds);
  const walk = (d: string) => { if (fs.existsSync(d)) for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : files.add(path.join(d, e.name)); };
  walk(path.join(dir, 'art'));
  const h = crypto.createHash('sha256').update(JSON.stringify(stable(rounds)));
  for (const f of [...files].sort()) h.update(path.relative(dir, f).split(path.sep).join('/')).update('\0').update(fs.readFileSync(f)).update('\0');
  return h.digest('hex');
}
/** `review:hash` output: the hashes a stage C/P reviewer copies into its file as input_sha256. */
export const reviewHashes = (dir: string) => ({ cut_sha256: cutHash(dir), puzzle_sha256: puzzleHash(dir) });

/**
 * cut-judge (viral-rankings) / puzzle-judge (quiz-ar) at approve: a stage V file (vN/qa/<file>) wins; without it the stage C/P file
 * is accepted when it passes AND its input_sha256 equals the current hash (nothing changed since). Returns errors / info.
 */
export function stageReviewCheck(dir: string, vdir: string | null, kind: 'cut' | 'puzzle'): { errors: string[]; source: string | null } {
  const file = kind === 'cut' ? 'cut-review.json' : 'puzzle-judge.json', who = kind === 'cut' ? 'cut-judge' : 'puzzle-judge', stage = kind === 'cut' ? 'C' : 'P';
  const ok = (j: any) => j?.pass === true;
  const v = vdir ? readJ(path.join(vdir, 'qa', file)) : null, tag = vdir ? path.basename(vdir) : 'v?';
  if (v) return ok(v) ? { errors: [], source: `${tag}/qa/${file}` } : { errors: [`${who} stage V failed (${tag}/qa/${file}): ${(v.gap_to_gate ?? []).slice(0, 3).map((g: any) => g?.item ?? g).join('; ') || 'pass is not true'}`], source: null };
  const s = readJ(path.join(dir, file)), cur = kind === 'cut' ? cutHash(dir) : puzzleHash(dir);
  if (!s) return { errors: [`${file} missing (${who} stage ${stage}, then stage V only if the input changes)`], source: null };
  if (!ok(s)) return { errors: [`${who} stage ${stage} not passing (${file}); fix and re-judge`], source: null };
  if (!s.input_sha256) return { errors: [`${who} stage ${stage} file has no input_sha256: run ${who} stage V on ${tag} (or re-run stage ${stage} with review:hash)`], source: null };
  if (s.input_sha256 !== cur) return { errors: [`${kind === 'cut' ? 'cut windows/framing' : 'quiz art/rounds'} changed since ${who} stage ${stage} (input_sha256 differs): run ${who} stage V on ${tag}`], source: null };
  return { errors: [], source: `${file} (stage ${stage}, input unchanged)` };
}

// ---------- script-doctor history (append-only) + round status (I3) ----------

export interface DoctorRound { round: number; forecast: number | null; verdict: string | null; mtime: number | null; src: string }
const HISTORY_FILE = 'script-doctor.history.json';

/**
 * Every script-doctor round known for a production, one entry per round (the latest record of a round wins), sorted by round.
 * Sources (all optional): script-doctor.history.json (append-only, written by recordDoctorRound), script-doctor.r<N>.json copies,
 * the current script-doctor.json, script-approval.json history.
 */
export function doctorHistory(dir: string): DoctorRound[] {
  const by = new Map<number, DoctorRound>();
  const put = (e: DoctorRound) => { if (e.round != null && Number.isFinite(e.round)) by.set(e.round, e); };
  const appr = readJ(path.join(dir, 'script-approval.json'));
  for (const h of Array.isArray(appr?.history) ? appr.history : []) {
    const r = numScore(h?.round); if (r == null || h?.delta) continue;
    put({ round: r, forecast: numScore(h.forecast), verdict: null, mtime: h.at && !isNaN(Date.parse(h.at)) ? Date.parse(h.at) : null, src: 'script-approval.json' });
  }
  const rfiles = fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => /^script-doctor\.r\d+\.json$/.test(n)) : [];
  for (const n of rfiles) {
    const j = readJ(path.join(dir, n)); const r = roundOf(j) ?? Number(/r(\d+)/.exec(n)![1]);
    put({ round: r, forecast: forecastOf(j), verdict: j?.verdict ?? null, mtime: mtime(path.join(dir, n)), src: n });
  }
  const cur = readJ(path.join(dir, 'script-doctor.json'));
  if (cur && roundOf(cur) != null) put({ round: roundOf(cur)!, forecast: forecastOf(cur), verdict: cur.verdict ?? null, mtime: mtime(path.join(dir, 'script-doctor.json')), src: 'script-doctor.json' });
  const hist = readJ(path.join(dir, HISTORY_FILE));
  for (const h of Array.isArray(hist?.rounds) ? hist.rounds : []) {
    const r = numScore(h?.round); if (r == null) continue;
    put({ round: r, forecast: numScore(h.forecast), verdict: h.verdict ?? null, mtime: numScore(h.file_mtime), src: HISTORY_FILE });
  }
  return [...by.values()].sort((a, b) => a.round - b.round);
}

/** Append the current script-doctor.json to script-doctor.history.json when this (round, forecast, verdict, mtime) is new. Never rewrites old entries. */
export function recordDoctorRound(dir: string, now = new Date().toISOString()): boolean {
  const f = path.join(dir, 'script-doctor.json'), sd = readJ(f);
  if (!sd || roundOf(sd) == null) return false;
  const hf = path.join(dir, HISTORY_FILE), hist = readJ(hf);
  const rounds: any[] = Array.isArray(hist?.rounds) ? hist.rounds : [];
  const e = { round: roundOf(sd), forecast: forecastOf(sd), verdict: sd.verdict ?? null, file_mtime: mtime(f), recorded_at: now };
  if (rounds.some(x => x.round === e.round && x.forecast === e.forecast && x.verdict === e.verdict && x.file_mtime === e.file_mtime)) return false;
  rounds.push(e);
  fs.writeFileSync(hf, JSON.stringify({ note: 'append-only: one entry per script-doctor run (packages/shared/src/gates.ts recordDoctorRound); never edit', rounds }, null, 2) + '\n', 'utf8');
  return true;
}

export interface RoundStatus {
  round: number | null; forecast: number | null; history: { round: number; forecast: number | null }[];
  doctor_pass: boolean; viewers_required: boolean; gate_reached_at: number | null;
  status: 'ok' | 'revise' | 'escalate: orchestrator decision'; next: string; reasons: string[];
}

/**
 * Cheap-first script round (I3). fresh-eyes S + audience-panel S are required (and counted) only once script-doctor passes with
 * forecast >= script_forecast. No-progress escalation while the doctor is still below the gate: forecast gained < 3 points over
 * the last 2 rounds, or round >= 4 with forecast < 75 -> "escalate: orchestrator decision" (approve refuses unless --force --note).
 */
export function scriptRoundStatus(f: GateFacts, G: Gates = gatesFor(f.brand)): RoundStatus {
  const d = f.dir, sd = readJ(path.join(d, 'script-doctor.json'));
  const hist = doctorHistory(d);
  const round = roundOf(sd), forecast = forecastOf(sd);
  const doctorPass = !!sd && String(sd.verdict ?? '').toLowerCase() === 'pass' && forecast != null && forecast >= G.script_forecast;
  const reasons: string[] = [];
  let status: RoundStatus['status'] = doctorPass ? 'ok' : 'revise';
  const fc = hist.filter(h => h.forecast != null);
  if (sd && !doctorPass) {
    if (fc.length > NO_PROGRESS.over_rounds) {
      const last = fc.at(-1)!, back = fc.at(-1 - NO_PROGRESS.over_rounds)!;
      const gain = last.forecast! - back.forecast!;
      if (gain < NO_PROGRESS.min_gain) reasons.push(`no progress: forecast ${back.forecast} (round ${back.round}) -> ${last.forecast} (round ${last.round}), +${gain} < +${NO_PROGRESS.min_gain} over ${NO_PROGRESS.over_rounds} rounds`);
    }
    if (round != null && round >= NO_PROGRESS.late_round && (forecast ?? 0) < NO_PROGRESS.late_floor) reasons.push(`round ${round} >= ${NO_PROGRESS.late_round} with forecast ${forecast ?? 'none'} < ${NO_PROGRESS.late_floor}`);
    if (reasons.length) status = 'escalate: orchestrator decision';
  }
  const reached = hist.filter(h => h.forecast != null && h.forecast >= G.script_forecast && h.mtime != null).map(h => h.mtime!);
  const gateReachedAt = doctorPass ? (reached.length ? Math.min(...reached) : mtime(path.join(d, 'script-doctor.json'))) : null;
  let next: string;
  if (!sd) next = 'script-doctor (round 1)';
  else if (status !== 'ok' && status !== 'revise') next = 'orchestrator: rework the premise / shelve, or script:approve --force --note';
  else if (!doctorPass) next = `showrunner applies script-doctor gap_to_gate, then script-doctor (round ${(round ?? 0) + 1}); fresh-eyes/panel wait until forecast >= ${G.script_forecast}`;
  else {
    const fe = viewerFileCounted(path.join(d, 'fresh-eyes.script.json'), gateReachedAt), pn = viewerFileCounted(path.join(d, 'panel.script.json'), gateReachedAt);
    const pk = readJ(path.join(d, 'packaging.json'));
    if (!fe || !pn) next = `${[!fe && 'fresh-eyes stage S', !pn && 'audience-panel stage S'].filter(Boolean).join(' + ')} (doctor passed at ${forecast})`;
    else if (!pk || !(scoreOf(pk)! >= G.packaging)) next = `packaging-director (packaging.json score ${scoreOf(pk) ?? 'none'} < ${G.packaging})`;
    else next = 'script:approve';
  }
  return { round, forecast, history: hist.map(h => ({ round: h.round, forecast: h.forecast })), doctor_pass: doctorPass, viewers_required: doctorPass, gate_reached_at: gateReachedAt, status, next, reasons };
}
/** A stage-S viewer file counts only when written after the doctor first reached the gate (2 min tolerance). */
function viewerFileCounted(file: string, gateReachedAt: number | null): boolean {
  const m = mtime(file);
  return m != null && (gateReachedAt == null || m >= gateReachedAt - 120_000);
}

// ---------- fix ledger (I6) ----------

/**
 * productions/<id>/fix-ledger.json = {items:[{source:"fresh-eyes"|"panel"|..., item:"<gap_to_gate item text>", applied:true |
 * rejected_reason:"why", round?, by?, note?}]}. Filled by the showrunner (applied) / script-doctor (verifies, or records the reason).
 * Returns the gap_to_gate items of `j` that have no applied/rejected answer.
 */
export function openLedgerItems(dir: string, source: 'fresh-eyes' | 'panel', j: any): string[] {
  const L = readJ(path.join(dir, 'fix-ledger.json'));
  const items: any[] = Array.isArray(L) ? L : Array.isArray(L?.items) ? L.items : [];
  const norm = (s: any) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const key = (x: any) => norm(typeof x === 'string' ? x : x?.item ?? x?.fix);
  const src = (s: any) => /fresh/.test(norm(s)) ? 'fresh-eyes' : /panel/.test(norm(s)) ? 'panel' : norm(s);
  const gaps: any[] = Array.isArray(j?.gap_to_gate) ? j.gap_to_gate : [];
  return gaps.filter(g => !items.some(e => src(e?.source) === source && key(e) === key(g) && (e?.applied === true || norm(e?.rejected_reason)))).map(g => (typeof g === 'string' ? g : g?.item ?? g?.fix ?? '?'));
}
/** I6 rule for one viewer file: weak fresh-eyes / panel with >= 2 swipes before the payoff needs every gap_to_gate item answered. */
function weakNeedsAnswers(dir: string, fe: any, pn: any): string[] {
  const out: string[] = [];
  if (fe && String(fe.verdict ?? '').toLowerCase() === 'weak') {
    const n = Array.isArray(fe.gap_to_gate) ? fe.gap_to_gate.length : 0;
    const open = openLedgerItems(dir, 'fresh-eyes', fe);
    if (!n) out.push('fresh-eyes verdict "weak" with no gap_to_gate items (fresh-eyes must list what to fix)');
    else if (open.length) out.push(`fresh-eyes verdict "weak": ${open.length} of ${n} gap_to_gate item(s) not answered in fix-ledger.json (applied:true or rejected_reason): ${open.slice(0, 3).join(' | ')}`);
  }
  const sw = Number(pn?.swipe_before_payoff_count ?? 0);
  if (pn && sw >= PANEL_SWIPE_ANSWER) {
    const n = Array.isArray(pn.gap_to_gate) ? pn.gap_to_gate.length : 0;
    const open = openLedgerItems(dir, 'panel', pn);
    if (!n) out.push(`audience panel: ${sw} swipe(s) before the payoff and no gap_to_gate items`);
    else if (open.length) out.push(`audience panel: ${sw} swipe(s) before the payoff: ${open.length} of ${n} gap_to_gate item(s) not answered in fix-ledger.json: ${open.slice(0, 3).join(' | ')}`);
  }
  return out;
}

// ---------- approved snapshot + delta diff (I7) ----------

const SNAP_DIR = 'approved-script';
function writeSnapshot(dir: string, brand: string | null | undefined, hash: ReturnType<typeof scriptHash>, at: string, round: number | null) {
  const s = path.join(dir, SNAP_DIR);
  fs.rmSync(s, { recursive: true, force: true });
  fs.mkdirSync(s, { recursive: true });
  for (const [n, h] of Object.entries(hash.files)) if (h) fs.copyFileSync(path.join(dir, n), path.join(s, n));
  fs.writeFileSync(path.join(s, 'meta.json'), JSON.stringify({ note: 'copy of the script files at the last script:approve (delta approvals diff against it)', script_sha256: hash.sha256, script_files: hash.files, brand: brand ?? null, round, at }, null, 2) + '\n', 'utf8');
}

/** Lines whose change needs fresh-eyes + panel again in a delta round: hook / payoff / ending (by key, id/role label, or first/last line). */
export const SENSITIVE_LINE = /hook|payoff|pay_off|ending|outro|reveal|punch|final|closing|loop|first_line|signature|cta|answer/i;
const LINE_ARRAYS = /^(lines|beats|narration|script|scenes|segments|vo|voiceover|sentences|rounds)$/i;
const LABEL_KEYS = ['id', 'line_id', 'role', 'kind', 'type', 'beat', 'job', 'name', 'section', 's_id'];
/**
 * Viewer-visible TEXT only (owner 2026-11-08): a change is "sensitive" (fresh-eyes + panel stage S re-run) only when a string leaf
 * that is spoken / on-screen text changes on a hook / payoff / ending line (or the hook_line / end_question / open-ending line ids).
 * Timing and visual params (exit_lead, voice_at, timings, beats, narration.hook_retake / tempo, variants, art paths...) need only
 * the script-doctor delta recheck.
 */
const TEXT_KEY = /narration|onscreen|on_screen|caption|text|_ar$|^t\d+$|^line$|^words$|cta|title|question|ask|copy|body|say|spoken|label|headline/i;
const NONTEXT_KEY = /(^|_)(at|dur|duration|exit|lead|delay|timing|timings|beats|tempo|retake|start|end|hint|gain|volume|seed|px|scale|color|colour|variant|teaser|img|image|file|art|puzzle|path|src|voice|dialect|bpm|kind|type)(_|$)/i;
const TEXT_ID_PATH = /(^|\.)(hook_line|end_question|post_lines|pre_lines|closing_ask|open_ending)(\.|$)/;
/** the hook-line / end-question / open-ending ids and texts are always hook/ending lines */
const ENDING_PATH = /(^|\.)(hook_line|end_question|post_lines|closing_ask|open_ending)(\.|$)/;
function isTextLeaf(p: string[], o: any): boolean {
  if (typeof o !== 'string') return false;
  if (TEXT_ID_PATH.test(p.join('.'))) return true;
  const k = [...p].reverse().find(x => !/^\d+$/.test(x)) ?? '';
  return TEXT_KEY.test(k) && !NONTEXT_KEY.test(k);
}
/** Leaf-level diff of two JSON values; each change says whether it is a text change on a hook/payoff/ending line. */
export function scriptDiff(a: any, b: any): { path: string; sensitive: boolean }[] {
  const flat = (o: any, p: string[], labels: string[], edge: boolean, out: Map<string, { v: string; s: boolean }>) => {
    if (o && typeof o === 'object') {
      const lab = Array.isArray(o) ? [] : LABEL_KEYS.map(k => o[k]).filter(x => typeof x === 'string');
      const arrKey = p.at(-1) ?? '';
      if (Array.isArray(o)) o.forEach((x, i) => flat(x, [...p, String(i)], labels, edge || (LINE_ARRAYS.test(arrKey) && (i === 0 || i === o.length - 1)), out));
      else for (const [k, v] of Object.entries(o)) flat(v, [...p, k], [...labels, ...lab], edge, out);
    } else out.set(p.join('.'), { v: JSON.stringify(o), s: isTextLeaf(p, o) && (edge || ENDING_PATH.test(p.join('.')) || [...p, ...labels].some(x => SENSITIVE_LINE.test(x))) });
    return out;
  };
  const A = flat(a, [], [], false, new Map()), B = flat(b, [], [], false, new Map());
  const out: { path: string; sensitive: boolean }[] = [];
  for (const k of new Set([...A.keys(), ...B.keys()])) {
    const x = A.get(k), y = B.get(k);
    if (x?.v !== y?.v) out.push({ path: k, sensitive: !!(x?.s || y?.s) });
  }
  return out;
}

export interface ScriptApproveOpts { force?: boolean; note?: string; now?: string; delta?: boolean; validate?: boolean }
export interface ScriptApproveResult { ok: boolean; approved: boolean; forced: boolean; round: number | null; forecast: number | null; failures: string[]; gaps: string[]; record: any; file: string; status?: RoundStatus; delta?: any; warnings: string[] }

/** Pure-ish: reads the round files, writes script-approval.json (approved true, or false with failures) and returns the verdict. */
export function scriptApprove(f: GateFacts, opts: ScriptApproveOpts = {}): ScriptApproveResult {
  if (opts.delta) return scriptApproveDelta(f, opts);
  const G = gatesFor(f.brand), d = f.dir, failures: string[] = [], gaps: string[] = [], warnings: string[] = [];
  const sdF = path.join(d, 'script-doctor.json'), feF = path.join(d, 'fresh-eyes.script.json'), pnF = path.join(d, 'panel.script.json'), pkF = path.join(d, 'packaging.json'), lgF = path.join(d, 'fix-ledger.json');
  recordDoctorRound(d, opts.now);
  const sd = readJ(sdF), fe = readJ(feF), pn = readJ(pnF), pk = readJ(pkF);
  const st = scriptRoundStatus(f, G);
  const round = st.round, forecast = st.forecast;

  if (opts.validate !== false) { const v = validateReviewFiles([sdF, feF, pnF, pkF, lgF]); failures.push(...v.errors); warnings.push(...v.warnings); }
  if (!sd) failures.push('script-doctor.json missing');
  else {
    if (String(sd.verdict ?? '').toLowerCase() !== 'pass') failures.push(`script-doctor verdict "${sd.verdict ?? 'none'}" (needs "pass")`);
    if (forecast == null || forecast < G.script_forecast) failures.push(`script-doctor forecast ${forecast ?? 'none'} < ${G.script_forecast}`);
  }
  if (st.status === 'escalate: orchestrator decision') failures.unshift(`escalate: orchestrator decision (${st.reasons.join('; ')}; rework the premise / shelve, or --force --note)`);
  // cheap-first: viewer files are required (and counted) only after the doctor passes
  let pb: string | null = null;
  if (st.doctor_pass) {
    if (!fe) failures.push('fresh-eyes.script.json missing (fresh-eyes stage S runs once script-doctor passes)');
    else if (!viewerFileCounted(feF, st.gate_reached_at)) failures.push('fresh-eyes.script.json predates script-doctor reaching the gate: re-run fresh-eyes stage S on the current script');
    else if (String(fe.verdict ?? '').toLowerCase() === G.fresh_eyes_block || !fe.verdict) failures.push(`fresh-eyes verdict "${fe.verdict ?? 'none'}"${fe.why ? ` (${fe.why})` : ''}`);
    pb = pn ? panelBlocked(pn, G) : null;
    if (!pn) failures.push('panel.script.json missing (audience-panel stage S runs once script-doctor passes)');
    else if (!viewerFileCounted(pnF, st.gate_reached_at)) failures.push('panel.script.json predates script-doctor reaching the gate: re-run audience-panel stage S on the current script');
    else if (pb) failures.push(`audience panel blocked: ${pb}`);
    failures.push(...weakNeedsAnswers(d, fe, pn));
  }
  if (!pk) failures.push('packaging.json missing (packaging-director)');
  else {
    if (!String(pk.chosen_title ?? '').trim()) failures.push('packaging.json has no chosen_title');
    if (!(scoreOf(pk)! >= G.packaging)) failures.push(`packaging score ${scoreOf(pk) ?? 'none'} < ${G.packaging}`);
  }
  const hash = scriptHash(d, f.brand);
  for (const m of hash.missing) failures.push(`${m} missing (script file for brand ${f.brand ?? 'default'})`);
  const capHit = round != null && round > G.script_rounds_max;
  if (capHit) failures.unshift(`round cap reached: orchestrator decision (round ${round} > ${G.script_rounds_max}; rework premise / shelve, or --force --note)`);
  if (failures.length) gaps.push(...gapLines('script-doctor', sd), ...(st.doctor_pass ? [...gapLines('fresh-eyes', fe), ...gapLines('panel', pn)] : []), ...gapLines('packaging', pk));

  const forced = failures.length > 0 && !!opts.force && !!opts.note?.trim();
  const approved = failures.length === 0 || forced;
  const at = opts.now ?? new Date().toISOString();
  const file = path.join(d, 'script-approval.json');
  const prev = readJ(file);
  const history: any[] = Array.isArray(prev?.history) ? prev.history.filter((h: any) => h?.round !== round || h?.delta) : [];
  history.push({ round, forecast, fresh_eyes: st.doctor_pass ? fe?.verdict ?? null : null, panel_block: st.doctor_pass && pn ? !!pb : null, approved, at });
  history.sort((a, b) => (a.round ?? 0) - (b.round ?? 0));
  const record: any = {
    approved, round, forecast, script_sha256: hash.sha256, script_files: hash.files, brand: f.brand ?? null,
    checks: {
      doctor: sd ? { verdict: sd.verdict ?? null, forecast, round, gate: G.script_forecast } : null,
      fresh_eyes: fe && st.doctor_pass ? { verdict: fe.verdict ?? null, viewer_score: viewerScoreOf(fe) } : null,
      panel: pn && st.doctor_pass ? { block: !!pb, hate_count: pn.hate_count ?? null, swipe_before_payoff_count: pn.swipe_before_payoff_count ?? null } : null,
      packaging: pk ? { chosen_title: pk.chosen_title ?? null, score: scoreOf(pk), gate: G.packaging } : null,
    },
    round_status: { status: st.status, next: st.next, reasons: st.reasons },
    history, deltas: Array.isArray(prev?.deltas) ? prev.deltas : undefined, at,
  };
  if (failures.length) { record.failures = failures; record.gap_to_gate = gaps; }
  if (forced) { record.forced = true; record.force_note = opts.note!.trim(); }
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  if (approved) writeSnapshot(d, f.brand, hash, at, round);
  return { ok: approved, approved, forced, round, forecast, failures, gaps, record, file, status: st, warnings };
}

/**
 * I7 delta approval (`script:approve <id> --delta`) for script fixes inside a video round: needs an approved snapshot
 * (approved-script/), a script-doctor recheck (script-doctor.delta.json or script-doctor.json) newer than the change with verdict
 * pass, and fresh-eyes S + panel S newer than the change only when a hook/payoff/ending line changed. Counts as part of the current
 * video round (no new script round, no round cap / escalation).
 */
function scriptApproveDelta(f: GateFacts, opts: ScriptApproveOpts): ScriptApproveResult {
  const G = gatesFor(f.brand), d = f.dir, failures: string[] = [], gaps: string[] = [], warnings: string[] = [];
  const file = path.join(d, 'script-approval.json'), prev = readJ(file), snap = readJ(path.join(d, SNAP_DIR, 'meta.json'));
  const hash = scriptHash(d, f.brand), at = opts.now ?? new Date().toISOString();
  const snapKeys = snap ? Object.keys(snap.script_files ?? {}) : [];
  const base = { round: numScore(prev?.round), forecast: numScore(prev?.forecast), file, warnings };
  if (!snap || !prev) {
    failures.push('delta: no approved snapshot (approved-script/meta.json) -- run a full script:approve first');
    return { ...base, ok: false, approved: false, forced: false, failures, gaps, record: prev };
  }
  for (const m of hash.missing) failures.push(`${m} missing (script file for brand ${f.brand ?? 'default'})`);
  // files the approval recorded are compared by hash; a file the older approval never hashed (script.json of a quiz-ar approved before
  // 2026-11-08) has no approved copy: it counts as changed when it was modified after the approval (text unverifiable -> doctor recheck only)
  const legacy: string[] = [];
  const changed = Object.keys({ ...hash.files, ...(snap.script_files ?? {}) }).filter(k => {
    if (!(k in (snap.script_files ?? {}))) {
      if (hash.files[k] == null) return false;
      const m = mtime(path.join(d, k)), a0 = Date.parse(String(snap.at ?? prev.at ?? ''));
      if (m != null && Number.isFinite(a0) && m > a0 + 1000) { legacy.push(k); return true; }
      return false;
    }
    return (hash.files[k] ?? null) !== (snap.script_files?.[k] ?? null);
  });
  if (!changed.length && prev.approved === true && prev.script_sha256 === scriptHash(d, f.brand, snapKeys).sha256) return { ...base, ok: true, approved: true, forced: false, failures, gaps, record: prev, delta: { changed: [], note: 'nothing changed since the approved script' } };
  const changeAt = Math.max(0, ...changed.map(n => mtime(path.join(d, n)) ?? Date.now()));
  // script-doctor recheck newer than the change
  const docs = ['script-doctor.delta.json', 'script-doctor.json'].map(n => ({ n, m: mtime(path.join(d, n)) })).filter(x => x.m != null && x.m >= changeAt).sort((a, b) => b.m! - a.m!);
  const doc = docs[0] ? readJ(path.join(d, docs[0].n)) : null;
  if (!doc) failures.push(`delta: script-doctor recheck missing: script-doctor.delta.json (or script-doctor.json) newer than the change to ${changed.join(', ')}`);
  else {
    if (String(doc.verdict ?? '').toLowerCase() !== 'pass') failures.push(`delta: ${docs[0].n} verdict "${doc.verdict ?? 'none'}" (needs "pass")`);
    const fc = forecastOf(doc);
    if (fc != null && fc < G.script_forecast) failures.push(`delta: ${docs[0].n} forecast ${fc} < ${G.script_forecast}`);
    gaps.push(...gapLines(docs[0].n, doc));
  }
  // which lines changed
  const diffs: { path: string; sensitive: boolean }[] = [];
  for (const n of changed) {
    const a = readJ(path.join(d, SNAP_DIR, n)), b = readJ(path.join(d, n));
    if (legacy.includes(n)) diffs.push({ path: `${n} (changed since approval; no approved copy to diff: doctor recheck only)`, sensitive: false });
    else if (a == null || b == null) diffs.push({ path: `${n} (${a == null ? 'added' : 'removed'})`, sensitive: true });
    else diffs.push(...scriptDiff(a, b).map(x => ({ path: `${n}:${x.path}`, sensitive: x.sensitive })));
  }
  const sensitive = diffs.filter(x => x.sensitive);
  const feF = path.join(d, 'fresh-eyes.script.json'), pnF = path.join(d, 'panel.script.json');
  if (sensitive.length) {
    const fe = readJ(feF), pn = readJ(pnF);
    const newer = (F: string) => (mtime(F) ?? 0) >= changeAt;
    const where = sensitive.slice(0, 3).map(x => x.path).join(', ');
    if (!fe || !newer(feF)) failures.push(`delta: hook/payoff/ending line changed (${where}): re-run fresh-eyes stage S (fresh-eyes.script.json newer than the change)`);
    else if (!fe.verdict || String(fe.verdict).toLowerCase() === G.fresh_eyes_block) failures.push(`delta: fresh-eyes verdict "${fe.verdict ?? 'none'}"`);
    if (!pn || !newer(pnF)) failures.push(`delta: hook/payoff/ending line changed (${where}): re-run audience-panel stage S (panel.script.json newer than the change)`);
    else { const b = panelBlocked(pn, G); if (b) failures.push(`delta: audience panel blocked: ${b}`); }
    if (fe && pn && newer(feF) && newer(pnF)) failures.push(...weakNeedsAnswers(d, fe, pn));
  }
  if (opts.validate !== false) {
    const v = validateReviewFiles([...(docs[0] ? [path.join(d, docs[0].n)] : []), ...(sensitive.length ? [feF, pnF] : []), path.join(d, 'fix-ledger.json')]);
    failures.push(...v.errors); warnings.push(...v.warnings);
  }
  const forced = failures.length > 0 && !!opts.force && !!opts.note?.trim();
  const approved = failures.length === 0 || forced;
  const delta = { at, changed_files: changed, changed_lines: diffs.length, sensitive: sensitive.slice(0, 12).map(x => x.path), viewers_rerun: sensitive.length > 0, doctor_file: docs[0]?.n ?? null, approved, ...(forced ? { forced: true, force_note: opts.note!.trim() } : {}), ...(failures.length ? { failures } : {}) };
  const record: any = { ...prev, deltas: [...(Array.isArray(prev.deltas) ? prev.deltas : []), delta] };
  if (approved) {
    Object.assign(record, { approved: true, script_sha256: hash.sha256, script_files: hash.files, at });
    delete record.failures; delete record.gap_to_gate; delete record.forced; delete record.force_note;
    if (forced) { record.forced = true; record.force_note = opts.note!.trim(); }
    writeSnapshot(d, f.brand, hash, at, numScore(prev.round));
  } else Object.assign(record, { approved: false, failures, gap_to_gate: gaps, at });
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', 'utf8');
  return { ...base, ok: approved, approved, forced, failures, gaps, record, delta };
}

/** Builder / stage-qa check: approved script-approval.json whose hash matches the current script files. Old scope: warnings only. */
export function scriptApprovalGate(f: GateFacts): GateResult {
  const newLoop = isNewLoop(f), problems: string[] = [];
  const a = readJ(path.join(f.dir, 'script-approval.json'));
  if (!a) problems.push('script-approval.json missing (run `npm run -s cli -- script:approve <id>` after the script round passes)');
  else if (a.approved !== true) problems.push(`script not approved (round ${a.round ?? '?'}: ${(a.failures ?? []).slice(0, 4).join('; ') || 'see script-approval.json'})`);
  else {
    const h = scriptHash(f.dir, f.brand, a.script_files ? Object.keys(a.script_files) : null);  // an older approval's own file list
    if (h.sha256 !== a.script_sha256) {
      const changed = Object.keys({ ...h.files, ...(a.script_files ?? {}) }).filter(k => (h.files[k] ?? null) !== (a.script_files?.[k] ?? null));
      problems.push(`script changed since approval (${changed.join(', ') || 'hash differs'}) -- inside a video round: script-doctor recheck + script:approve --delta; otherwise re-run the script round + script:approve`);
    }
  }
  return newLoop ? { ok: problems.length === 0, errors: problems, warnings: [], newLoop } : { ok: true, errors: [], warnings: problems, newLoop };
}

/** Panel block per contract: the file's block flag, or (hate+boring >= panel_block_hate) or (swipe_before_payoff >= panel_block_swipe). Returns the reason or null. */
export function panelBlocked(pn: any, G: Gates = loadGates()): string | null {
  const ps: any[] = Array.isArray(pn?.personas) ? pn.personas : [];
  const hb = ps.length ? ps.filter(p => ['hate', 'boring'].includes(String(p?.reaction ?? '').toLowerCase())).length : Number(pn?.hate_count ?? 0);
  const sw = Number(pn?.swipe_before_payoff_count ?? 0);
  const why: string[] = [];
  if (pn?.block === true) why.push('block=true');
  if (hb >= G.panel_block_hate) why.push(`${hb} hate/boring >= ${G.panel_block_hate}`);
  if (sw >= G.panel_block_swipe) why.push(`${sw} swipe before payoff >= ${G.panel_block_swipe}`);
  if (!why.length) return null;
  const issues = Array.isArray(pn?.issues) ? pn.issues.slice(0, 3).map((x: any) => typeof x === 'string' ? x : x?.issue ?? JSON.stringify(x)) : [];
  return why.join(', ') + (issues.length ? ` -- ${issues.join('; ')}` : '');
}

// ---------- rights countersign (I4) ----------

export interface AssetDecision { asset_id: string; last: { id: number; actor: string; to_status: string } | null }
/**
 * Every used source's LATEST rights_log row must be by a countersigning actor (policy viralRankings.countersignActors, default
 * rights-scout + owner) and publishable. strict (story.json productions) -> errors; older productions -> warnings only
 * (countersigns were checked by hand before 2026-11-08).
 */
export function countersignCheck(rows: AssetDecision[], actors: string[] = ['rights-scout', 'owner'], strict = true): { errors: string[]; warnings: string[] } {
  const probs: string[] = [];
  for (const r of rows) {
    if (!r.last) probs.push(`source ${r.asset_id} has no rights_log decision (needs a ${actors.join('/')} countersign)`);
    else if (!actors.includes(r.last.actor)) probs.push(`source ${r.asset_id}: latest rights decision #${r.last.id} (${r.last.to_status}) is by ${r.last.actor}, not countersigned by ${actors.join('/')}`);
    else if (!['approved', 'approved_with_conditions'].includes(r.last.to_status)) probs.push(`source ${r.asset_id}: countersigned ${r.last.to_status} (not publishable)`);
  }
  return strict ? { errors: probs, warnings: [] } : { errors: [], warnings: probs.map(p => `rights (pre-v3, not blocking): ${p}`) };
}

// ---------- approve ----------

/** Version folder the approve gate reads: the reviewed version, else facts.version, else highest vN on disk. */
function latestVdir(f: GateFacts): string | null {
  const v = f.reviewedVersion ?? f.version;
  if (v) return path.join(f.dir, `v${v}`);
  if (!fs.existsSync(f.dir)) return null;
  const ns = fs.readdirSync(f.dir).map(d => /^v(\d+)$/.exec(d)?.[1]).filter(Boolean).map(Number);
  return ns.length ? path.join(f.dir, `v${Math.max(...ns)}`) : null;
}

/** forecast_delta (I8) = render viral - script forecast (script-approval.json forecast, else script-doctor.json). */
export function forecastDelta(dir: string, vir: any): number | null {
  const own = numScore(vir?.forecast_delta);
  if (own != null) return own;
  const s = scoreOf(vir), fc = numScore(readJ(path.join(dir, 'script-approval.json'))?.forecast) ?? forecastOf(readJ(path.join(dir, 'script-doctor.json')));
  return s != null && fc != null ? s - fc : null;
}

export function approveGate(f: GateFacts, opts: { validate?: boolean; today?: string } = {}): GateResult {
  const G = gatesFor(f.brand);
  const storyLoop = fs.existsSync(path.join(f.dir, 'story.json'));   // viral gate follows story.json only (owner)
  const newLoop = isNewLoop(f);                                        // panel + fresh-eyes: story.json or created >= STORY_LOOP_FROM
  const errors: string[] = [], warnings: string[] = [], gaps: string[] = [], info: Record<string, any> = {};
  if (f.reviewedVersion != null && f.version != null && Number(f.reviewedVersion) !== Number(f.version))
    errors.push(`latest QA review is for v${f.reviewedVersion} but the latest render is v${f.version}: review v${f.version} first (insights/viral/panel/fresh-eyes are read from the reviewed version)`);
  const vdir = latestVdir(f);
  const tag = vdir ? path.basename(vdir) : 'v?';
  const qf = (n: string) => vdir ? path.join(vdir, 'qa', n) : '';
  const q = (n: string) => vdir ? readJ(qf(n)) : null;
  const ins = q('insights-score.json');
  if (!ins) (storyLoop || newLoop ? errors : warnings).push(`${tag}/qa/insights-score.json missing`);
  else if (!(scoreOf(ins)! >= G.insights)) errors.push(`${tag} insights score ${scoreOf(ins) ?? 'none'} < ${G.insights}`);
  const mode = viralMode(G, opts.today);
  info.viral_mode = mode;
  if (storyLoop && !NEVER_VIRAL_GATED.has(String(f.brand ?? ''))) {
    const vir = q('viral.json');
    if (!vir) errors.push(`${tag}/qa/viral.json missing (new story loop: viral.json required${mode === 'record' ? `; record-only until ${G.viral_mode_until}` : `, viral >= ${G.viral}`})`);
    else {
      info.viral = scoreOf(vir); info.forecast_delta = forecastDelta(f.dir, vir);
      if (!(scoreOf(vir)! >= G.viral)) {
        if (mode === 'hard') { errors.push(`${tag} viral score ${scoreOf(vir) ?? 'none'} < ${G.viral}`); gaps.push(...gapLines('viral', vir)); }
        else warnings.push(`${tag} viral score ${scoreOf(vir) ?? 'none'} < ${G.viral} (record-only until ${G.viral_mode_until}; not blocking)`);
      }
    }
  }
  if (newLoop) {   // kids included: a "hate" episode is not shipped
    const pn = q('panel.json'), fe = q('fresh-eyes.json');
    if (!pn) errors.push(`${tag}/qa/panel.json missing (audience-panel stage V)`);
    else { const b = panelBlocked(pn, G); if (b) { errors.push(`${tag} audience panel blocked: ${b}`); gaps.push(...gapLines('panel', pn)); } }
    if (!fe) errors.push(`${tag}/qa/fresh-eyes.json missing (fresh-eyes stage V)`);
    else if (!fe.verdict || String(fe.verdict).toLowerCase() === G.fresh_eyes_block) { errors.push(`${tag} fresh-eyes verdict "${fe.verdict ?? 'none'}"${fe.why ? ` (${fe.why})` : ''}`); gaps.push(...gapLines('fresh-eyes', fe)); }
    // frame-text-inspector (owner 2026-11-08: every on-screen text viewable, not cut / overflowing): vN/qa/text-check.json pass:true.
    // Audit #2 F6a: when the measured text-safety report passes with nothing unmeasured and no painted layers, code already proved it.
    const tc = q('text-check.json'), ts = q('text-safety.json');
    const codeProved = !!ts && ts.pass === true && !(ts.unmeasured ?? []).length && !(ts.items ?? []).some((i: any) => i.source === 'layer');
    if (!tc && codeProved) info.text_check = 'text-safety (measured pass, nothing unmeasured, no painted layers)';
    else if (!tc) errors.push(`${tag}/qa/text-check.json missing (frame-text-inspector, video round: only unmeasured / painted / burned-in items and text over faces/payoff)`);
    else if (tc.pass !== true) {
      errors.push(`${tag} frame text check failed: ${(Array.isArray(tc.issues) ? tc.issues : []).slice(0, 4).map((i: any) => `${i.t ?? '?'}s "${String(i.text ?? '').slice(0, 30)}" ${i.problem ?? ''}`).join('; ') || 'pass is not true'}`);
      gaps.push(...gapLines('text-check', tc));
      if (!(tc.gap_to_gate?.length)) for (const i of (tc.issues ?? []).slice(0, 6)) gaps.push(`text-check: ${i.t ?? '?'}s "${String(i.text ?? '').slice(0, 30)}" ${i.problem ?? ''} -> ${i.fix ?? ''} [${i.owner ?? '?'}]`);
    }
  }
  // cut-judge / puzzle-judge (audit #2 F6b): stage V only when the input changed since stage C/P (input_sha256)
  const sk = f.brand === 'viral-rankings' ? 'cut' : f.brand === 'quiz-ar' ? 'puzzle' : null;
  if (sk && storyLoop) { const r = stageReviewCheck(f.dir, vdir, sk); errors.push(...r.errors); info[`${sk}_review`] = r.source; }
  if ((storyLoop || newLoop) && opts.validate !== false && vdir) {
    const v = validateReviewFiles([qf('viral.json'), qf('panel.json'), qf('fresh-eyes.json'), qf('text-check.json'), qf('cut-review.json'), qf('puzzle-judge.json'), ...(sk && storyLoop ? [path.join(f.dir, sk === 'cut' ? 'cut-review.json' : 'puzzle-judge.json')] : [])]);
    errors.push(...v.errors); warnings.push(...v.warnings);
  }
  return { ok: errors.length === 0, errors, warnings, newLoop: storyLoop || newLoop, gaps, info };
}
