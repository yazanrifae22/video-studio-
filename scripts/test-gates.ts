/** Unit test for packages/shared/src/gates.ts (story gate, script:approve, script-approval build gate, approve gate). `npx tsx scripts/test-gates.ts` */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { approveGate, countersignCheck, cutHash, forecastDelta, forecastOf, GATE_DEFAULTS, brandOverrides, gatesFor, loadGates, puzzleHash, shelveActive, stageReviewCheck, numScore, openLedgerItems, recordDoctorRound, scriptApprovalGate, scriptApprove, scriptDiff, scriptRoundStatus, storyGate, viewerScoreOf, viralMode } from '../packages/shared/src/gates.ts';
import { lintCelebrityScenes } from '../packages/tech/src/brands.ts';

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`); };
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gates-'));
const mk = (name: string, files: Record<string, unknown>) => {
  const d = path.join(root, name);
  for (const [f, v] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), JSON.stringify(v), 'utf8'); }
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const w = (d: string, f: string, v: unknown) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), JSON.stringify(v), 'utf8'); };
/** push every file in d back by `sec` seconds (mtime-based rules: gate reached, recheck newer than the change) */
const age = (d: string, sec = 3600, only?: string[]) => { const t0 = (Date.now() - sec * 1000) / 1000; for (const n of only ?? fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isFile()) fs.utimesSync(p, t0, t0); } };
const HARD = path.join(root, 'gates-hard.json');
fs.writeFileSync(HARD, JSON.stringify({ viral_mode: 'hard' }), 'utf8');

// story gate
const old = mk('old', {});
eq('old production, no story -> ok', storyGate({ dir: old, createdAt: '2026-11-05 10:00:00' }).ok, true);
eq('new production, nothing -> refused', storyGate({ dir: mk('new0', {}), createdAt: '2026-11-09 00:00:01' }).errors.length, 2);
eq('new production, doctor revise -> refused', storyGate({ dir: mk('new1', { 'story.json': {}, 'script-doctor.json': { verdict: 'revise' } }), createdAt: '2026-11-10' }).ok, false);
eq('new production, doctor pass -> ok', storyGate({ dir: mk('new2', { 'story.json': {}, 'script-doctor.json': { verdict: 'pass' } }), createdAt: '2026-11-10' }).ok, true);
eq('old production with story.json but no doctor -> refused', storyGate({ dir: mk('mid', { 'story.json': {} }), createdAt: '2026-11-08' }).ok, false);

// approve gate
const a1 = approveGate({ dir: old, brand: 'clipping' });
eq('old, no insights -> ok with warning', [a1.ok, a1.warnings.length], [true, 1]);
eq('old, insights 80 -> refused', approveGate({ dir: mk('o80', { 'v2/qa/insights-score.json': { score: 80 } }), brand: 'clipping' }).ok, false);
eq('old, insights 88, no viral -> ok', approveGate({ dir: mk('o88', { 'v2/qa/insights-score.json': { score: 88 } }), brand: 'clipping' }).ok, true);
eq('latest version only (v10 > v9)', approveGate({ dir: mk('lv', { 'v9/qa/insights-score.json': { score: 90 }, 'v10/qa/insights-score.json': { score: 70 } }), brand: 'tech' }).ok, false);
eq('explicit version wins', approveGate({ dir: path.join(root, 'lv'), brand: 'tech', version: 9 }).ok, true);
const panelOk = { stage: 'V', personas: [{ reaction: 'loved' }, { reaction: 'liked' }, { reaction: 'meh' }, { reaction: 'boring' }, { reaction: 'liked' }], hate_count: 0, swipe_before_payoff_count: 1, block: false };
const feOk = { stage: 'V', verdict: 'pass' };
const tcOk = { pass: true, frames_checked: 8, issues: [], gap_to_gate: [] };
const v1ok = { 'story.json': {}, 'v1/qa/insights-score.json': { score: 90 }, 'v1/qa/panel.json': panelOk, 'v1/qa/fresh-eyes.json': feOk, 'v1/qa/text-check.json': tcOk };
const n74 = mk('n74', { ...v1ok, 'v1/qa/viral.json': { score: 74 } });
eq('new loop, viral 74, after viral_mode_until -> refused', approveGate({ dir: n74, brand: 'tech' }, { today: '2026-11-23' }).ok, false);
const rec74 = approveGate({ dir: n74, brand: 'tech' }, { today: '2026-11-10' });
eq('I11 viral 74 in record mode (until 11-22) -> ok + warning', [rec74.ok, rec74.warnings.some(x => /record-only until 2026-11-22/.test(x))], [true, true]);
process.env.STUDIO_GATES = HARD;
eq('I11 viral_mode "hard" -> viral 74 refused', approveGate({ dir: n74, brand: 'tech' }, { today: '2026-11-10' }).ok, false);
delete process.env.STUDIO_GATES;
eq('I11 record mode still needs viral.json', approveGate({ dir: mk('nvm', v1ok), brand: 'tech' }, { today: '2026-11-10' }).errors.some(e => /viral\.json missing/.test(e)), true);
eq('I11 viralMode switches to hard after the until date', [viralMode(loadGates(), '2026-11-22'), viralMode(loadGates(), '2026-11-23')], ['record', 'hard']);
eq('new loop, viral 75 -> ok', approveGate({ dir: mk('n75', { ...v1ok, 'v1/qa/viral.json': { score: 75 } }), brand: 'tech' }).ok, true);
eq('new loop, no insights -> refused', approveGate({ dir: mk('nni', { 'story.json': {}, 'v1/qa/viral.json': { score: 90 }, 'v1/qa/panel.json': panelOk, 'v1/qa/fresh-eyes.json': feOk }), brand: 'tech' }).ok, false);
eq('kids new loop, no viral -> ok', approveGate({ dir: mk('kids', { ...v1ok, 'v1/qa/insights-score.json': { score: 86 } }), brand: 'kids' }).ok, true);
eq('new loop, no panel/fresh-eyes/text-check -> 3 errors', approveGate({ dir: mk('npf', { 'story.json': {}, 'v1/qa/insights-score.json': { score: 90 }, 'v1/qa/viral.json': { score: 80 } }), brand: 'tech' }).errors.length, 3);
// frame-text-inspector (owner 2026-11-08): vN/qa/text-check.json pass:true required in the new loop
const { ['v1/qa/text-check.json']: _tc, ...v1noTc } = v1ok;
const ntc = approveGate({ dir: mk('ntc', { ...v1noTc, 'v1/qa/viral.json': { score: 80 } }), brand: 'tech' });
eq('new loop, no text-check.json -> refused', [ntc.ok, ntc.errors.some(e => /text-check\.json missing/.test(e))], [false, true]);
const ftc = approveGate({ dir: mk('ftc', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/text-check.json': { pass: false, frames_checked: 6, issues: [{ t: 3.2, text: 'Pick your #1', problem: 'cut at the right edge', fix: 'move x -6', owner: 'showrunner', blocker: true }], gap_to_gate: [{ item: 'CTA cut', fix: 'move x -6', owner: 'showrunner' }] } }), brand: 'tech' });
eq('text-check pass:false -> refused with gap_to_gate', [ftc.ok, (ftc.gaps ?? []).some(g => /text-check/.test(g))], [false, true]);
eq('old production: no text-check needed', approveGate({ dir: mk('otc', { 'v2/qa/insights-score.json': { score: 88 } }), brand: 'clipping' }).ok, true);
const pb = approveGate({ dir: mk('pblk', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/panel.json': { ...panelOk, block: true, issues: ['swipe at 2 s'], gap_to_gate: [{ item: 'hook', now: 2, needed: 4, fix: 'cut the intro', points: 6, owner: 'hook-architect', t: 0 }] } }), brand: 'tech' });
eq('panel block -> refused with gap_to_gate', [pb.ok, (pb.gaps ?? []).length], [false, 1]);
eq('panel 3 hate/boring (block flag false) -> refused', approveGate({ dir: mk('pb3', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/panel.json': { ...panelOk, personas: [{ reaction: 'boring' }, { reaction: 'hate' }, { reaction: 'boring' }, { reaction: 'liked' }, { reaction: 'liked' }] } }), brand: 'tech' }).ok, false);
eq('kids panel block -> refused', approveGate({ dir: mk('kpb', { ...v1ok, 'v1/qa/panel.json': { ...panelOk, block: true } }), brand: 'kids' }).ok, false);
eq('fresh-eyes hate -> refused', approveGate({ dir: mk('feh', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/fresh-eyes.json': { verdict: 'hate', why: 'no idea what it is' } }), brand: 'tech' }).ok, false);
eq('fresh-eyes weak -> ok', approveGate({ dir: mk('few', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/fresh-eyes.json': { stage: 'V', verdict: 'weak', gap_to_gate: [{ item: 'end', fix: 'name the ball' }] } }), brand: 'tech' }).ok, true);
eq('created >= 11-09 without story.json still needs panel', approveGate({ dir: mk('ncr', { 'v1/qa/insights-score.json': { score: 90 } }), brand: 'clipping', createdAt: '2026-11-09 08:00:00' }).ok, false);

// I4: reviewed version must be the latest render; gates read the reviewed vN
const rv = mk('rv', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v2/qa/insights-score.json': { score: 50 } });
const rvBad = approveGate({ dir: rv, brand: 'tech', version: 2, reviewedVersion: 1 });
eq('I4 review v1, render v2 -> refused (stale review)', [rvBad.ok, rvBad.errors.some(e => /latest QA review is for v1 but the latest render is v2/.test(e))], [false, true]);
eq('I4 review v1 = render v1 -> reads v1 files -> ok', approveGate({ dir: rv, brand: 'tech', version: 1, reviewedVersion: 1 }).ok, true);
eq('I4 countersign: rights-scout approved -> ok', countersignCheck([{ asset_id: 'a', last: { id: 1, actor: 'rights-scout', to_status: 'approved' } }]).errors.length, 0);
const csb = countersignCheck([{ asset_id: 'a', last: { id: 2, actor: 'showrunner-x', to_status: 'approved' } }, { asset_id: 'b', last: null }, { asset_id: 'c', last: { id: 3, actor: 'owner', to_status: 'rejected' } }]);
eq('I4 countersign: proposal only / none / rejected -> 3 errors', csb.errors.length, 3);
const csw = countersignCheck([{ asset_id: 'b', last: null }], undefined, false);
eq('I4 countersign without story.json -> warning, not refusal', [csw.errors.length, csw.warnings.length], [0, 1]);
eq('I9 approve: malformed viral.json -> refused', approveGate({ dir: mk('mv', { ...v1ok, 'v1/qa/viral.json': { score: 'high' } }), brand: 'tech' }, { today: '2026-11-10' }).errors.some(e => /malformed v1\/qa\/viral\.json/.test(e)), true);
eq('I8 forecast_delta = viral - script forecast', forecastDelta(mk('fd', { 'script-approval.json': { forecast: 88 } }), { score: 70 }), -18);

// config/gates.json
eq('config/gates.json matches the code defaults (incl. packaging 85, shelve_viral_round2 65, viral record until 11-22)', loadGates(), GATE_DEFAULTS);
eq('gates defaults carry the audit keys', [GATE_DEFAULTS.packaging, GATE_DEFAULTS.shelve_viral_round2, GATE_DEFAULTS.viral_mode, GATE_DEFAULTS.viral_mode_until], [85, 65, 'record', '2026-11-22']);

// score normaliser (forecast-shape bug)
eq('numScore: number | "91" | {score} | {viewer_score}', [numScore(91), numScore('91'), numScore({ score: 76 }), numScore({ viewer_score: 58 }), numScore('x'), numScore(null)], [91, 91, 76, 58, null, null]);
eq('forecastOf: forecast object / number / forecast_detail', [forecastOf({ forecast: { score: 85, verdict: 'revise' } }), forecastOf({ forecast: 91 }), forecastOf({ forecast_detail: { score: 77 } })], [85, 91, 77]);
eq('viewerScoreOf fresh-eyes', viewerScoreOf({ viewer_score: '58' }), 58);
const cfg = path.join(root, 'gates.json'); fs.writeFileSync(cfg, JSON.stringify({ script_forecast: 90 }), 'utf8');
eq('custom gates file overrides one key', [loadGates(cfg).script_forecast, loadGates(cfg).qa], [90, 85]);
eq('missing gates file -> defaults', loadGates(path.join(root, 'nope.json')), GATE_DEFAULTS);
// per-brand overrides (owner 2026-11-08: kids script gate 90, others 85), generic for every gate key
const cfgB = path.join(root, 'gates-brand.json'); fs.writeFileSync(cfgB, JSON.stringify({ script_forecast: 85, brand_overrides: { _doc: 'x', kids: { script_forecast: 90, qa: '88' } } }), 'utf8');
eq('brand_overrides: kids 90 (+ any key), others 85, no brand 85', [loadGates(cfgB, 'kids').script_forecast, loadGates(cfgB, 'kids').qa, loadGates(cfgB, 'clipping').script_forecast, loadGates(cfgB).script_forecast, gatesFor('kids', cfgB).script_forecast], [90, 88, 85, 85, 90]);
eq('brandOverrides lists only overridden keys, skips _doc', brandOverrides(cfgB), { kids: { script_forecast: 90, qa: 88 } });
eq('live config/gates.json: kids script gate 90, viral-rankings 85', [gatesFor('kids').script_forecast, gatesFor('viral-rankings').script_forecast], [90, 85]);

// script:approve
const sdPass = { verdict: 'pass', forecast: 87, round: 2, items: [], gap_to_gate: [], notes: [] };
const feS = { stage: 'S', verdict: 'pass', gap_to_gate: [] };
const panelS = { ...panelOk, stage: 'S', gap_to_gate: [] };
const pack = { titles: ['a', 'b', 'c'], chosen_title: 'a', score: 88, gap_to_gate: [] };
const good = { 'story.json': {}, 'script.json': { lines: ['hi'] }, 'script-doctor.json': sdPass, 'fresh-eyes.script.json': feS, 'panel.script.json': panelS, 'packaging.json': pack };
const sa = mk('sa-ok', good);
const r1 = scriptApprove({ dir: sa, brand: 'clipping', createdAt: '2026-11-09' }, { now: 't1' });
eq('script:approve all pass -> approved', [r1.approved, r1.failures, r1.record.history.length], [true, [], 1]);
eq('approval writes the approved-script/ snapshot', fs.existsSync(path.join(sa, 'approved-script', 'script.json')) && fs.existsSync(path.join(sa, 'approved-script', 'meta.json')), true);
eq('doctor round recorded in script-doctor.history.json (append-only)', JSON.parse(fs.readFileSync(path.join(sa, 'script-doctor.history.json'), 'utf8')).rounds.length, 1);
eq('recordDoctorRound twice for the same file -> no duplicate', recordDoctorRound(sa), false);
eq('build gate after approval -> ok', scriptApprovalGate({ dir: sa, brand: 'clipping', createdAt: '2026-11-09' }).ok, true);
fs.writeFileSync(path.join(sa, 'script.json'), JSON.stringify({ lines: ['hi', 'changed'] }), 'utf8');
const hm = scriptApprovalGate({ dir: sa, brand: 'clipping', createdAt: '2026-11-09' });
eq('script edited after approval -> hash mismatch refusal', [hm.ok, /changed since approval \(script\.json\)/.test(hm.errors[0] ?? '')], [false, true]);
eq('forecast as {score} object is read (forecast-shape bug)', scriptApprove({ dir: mk('sa-obj', { ...good, 'script-doctor.json': { ...sdPass, forecast: { score: 91, verdict: 'pass' } } }), brand: 'clipping' }).approved, true);

// per-brand script gate in script:approve: kids at 87 refused (< 90), same files as clipping approved at 87
{ const prev = process.env.STUDIO_GATES; process.env.STUDIO_GATES = cfgB;
  const kd = mk('sa-kids87', { ...good, 'episode.json': { scenes: [] } });
  const rk = scriptApprove({ dir: kd, brand: 'kids', createdAt: '2026-11-09' });
  eq('kids forecast 87 -> refused "forecast 87 < 90"', [rk.approved, rk.failures.some(x => /forecast 87 < 90/.test(x))], [false, true]);
  eq('kids round status names the brand gate', /forecast >= 90/.test(scriptRoundStatus({ dir: kd, brand: 'kids' }).next), true);
  eq('clipping forecast 87 -> approved (85)', scriptApprove({ dir: mk('sa-clip87', good), brand: 'clipping', createdAt: '2026-11-09' }).approved, true);
  if (prev == null) delete process.env.STUDIO_GATES; else process.env.STUDIO_GATES = prev; }

// I3 cheap-first: doctor below the gate -> fresh-eyes/panel are not required (nor counted)
const bad = mk('sa-bad', { ...good, 'script-doctor.json': { verdict: 'revise', forecast: 79, round: 3, gap_to_gate: [{ item: 'payoff', now: 79, needed: 85, fix: 'pay at 12 s', points: 6, owner: 'story-architect', t: 12 }] }, 'fresh-eyes.script.json': { stage: 'S', verdict: 'hate', gap_to_gate: [{ item: 'x', fix: 'y' }] }, 'panel.script.json': { ...panelS, block: true }, 'packaging.json': { titles: ['a'], chosen_title: '', score: 70, gap_to_gate: [{ item: 'title', fix: 'name the ball' }] } });
const r2 = scriptApprove({ dir: bad, brand: 'clipping' }, { now: 't2' });
eq('I3 doctor revise -> refused; fresh-eyes/panel not listed (cheap-first)', [r2.approved, r2.failures.some(x => /^(fresh-eyes verdict|audience panel blocked|fresh-eyes\.script\.json missing|panel\.script\.json missing)/.test(x)), r2.failures.some(x => /forecast 79 < 85/.test(x))], [false, false, true]);
eq('I3 next reviewer = script-doctor after fixes', /^showrunner applies script-doctor gap_to_gate, then script-doctor \(round 4\)/.test(r2.status!.next), true);
eq('I5 packaging score 70 < 85 -> refusal line', r2.failures.some(x => /packaging score 70 < 85/.test(x)), true);
eq('refusal written approved:false', JSON.parse(fs.readFileSync(path.join(bad, 'script-approval.json'), 'utf8')).approved, false);
eq('build gate on refused approval -> refused', scriptApprovalGate({ dir: bad, brand: 'clipping', createdAt: '2026-11-09' }).ok, false);
w(bad, 'script-doctor.json', { ...sdPass, round: 4, forecast: 88 });
w(bad, 'fresh-eyes.script.json', feS); w(bad, 'panel.script.json', panelS); w(bad, 'packaging.json', pack);
const r3 = scriptApprove({ dir: bad, brand: 'clipping' }, { now: 't3' });
eq('next round fixed -> approved, history rounds 3,4', [r3.approved, r3.record.history.map((h: any) => h.round)], [true, [3, 4]]);
const st0 = mk('sa-old-fe', { ...good });
age(st0, 3600, ['fresh-eyes.script.json', 'panel.script.json']);
const rOld = scriptApprove({ dir: st0, brand: 'clipping' });
eq('I3 fresh-eyes/panel written before the doctor reached the gate -> not counted', [rOld.approved, rOld.failures.filter(x => /predates script-doctor reaching the gate/.test(x)).length], [false, 2]);
// no-progress escalation
const np = mk('sa-np', { ...good, 'script-doctor.r1.json': { verdict: 'revise', forecast: 70, round: 1, gap_to_gate: [{ item: 'a', fix: 'b' }] }, 'script-doctor.r2.json': { verdict: 'revise', forecast: 71, round: 2, gap_to_gate: [{ item: 'a', fix: 'b' }] }, 'script-doctor.json': { verdict: 'revise', forecast: 72, round: 3, gap_to_gate: [{ item: 'a', fix: 'b' }] } });
const npS = scriptRoundStatus({ dir: np, brand: 'clipping' });
eq('I3 +2 over 2 rounds -> escalate: orchestrator decision', [npS.status, /no progress: forecast 70 \(round 1\) -> 72 \(round 3\)/.test(npS.reasons[0] ?? '')], ['escalate: orchestrator decision', true]);
const npR = scriptApprove({ dir: np, brand: 'clipping' });
eq('I3 escalation -> script:approve refuses with escalate line first', /^escalate: orchestrator decision/.test(npR.failures[0] ?? ''), true);
const late = mk('sa-late', { ...good, 'script-doctor.r3.json': { verdict: 'revise', forecast: 60, round: 3, gap_to_gate: [{ item: 'a', fix: 'b' }] }, 'script-doctor.json': { verdict: 'revise', forecast: 74, round: 4, gap_to_gate: [{ item: 'a', fix: 'b' }] } });
eq('I3 round 4 with forecast 74 < 75 -> escalate', scriptRoundStatus({ dir: late, brand: 'clipping' }).status, 'escalate: orchestrator decision');
const prog = mk('sa-prog', { ...good, 'script-doctor.r1.json': { verdict: 'revise', forecast: 70, round: 1 }, 'script-doctor.r2.json': { verdict: 'revise', forecast: 76, round: 2 }, 'script-doctor.json': { verdict: 'revise', forecast: 82, round: 3, gap_to_gate: [{ item: 'a', fix: 'b' }] } });
eq('I3 +12 over 2 rounds -> revise (no escalation)', scriptRoundStatus({ dir: prog, brand: 'clipping' }).status, 'revise');
// I6 weak fresh-eyes / panel swipes need fix-ledger answers
const feWeak = { stage: 'S', verdict: 'weak', viewer_score: 58, gap_to_gate: [{ item: "Which ball is Pip's", fix: 'give a clue', points: 10 }, { item: 'Whisper line', fix: 'say why' }] };
const wk = mk('sa-weak', { ...good, 'fresh-eyes.script.json': feWeak, 'panel.script.json': { ...panelS, swipe_before_payoff_count: 2, gap_to_gate: [{ item: 'Size chain', fix: 'one comparison' }] } });
const rW = scriptApprove({ dir: wk, brand: 'clipping' });
eq('I6 weak fresh-eyes + panel 2 swipes, no ledger -> refused (2 lines)', [rW.approved, rW.failures.filter(x => /fix-ledger\.json/.test(x)).length], [false, 2]);
w(wk, 'fix-ledger.json', { items: [{ source: 'fresh-eyes', item: "which ball is pip's", applied: true }, { source: 'fresh-eyes.script.json', item: 'Whisper line', rejected_reason: 'toddler whisper game is intended' }] });
eq('I6 ledger answers fresh-eyes only -> panel still open', openLedgerItems(wk, 'panel', JSON.parse(fs.readFileSync(path.join(wk, 'panel.script.json'), 'utf8'))), ['Size chain']);
w(wk, 'fix-ledger.json', { items: [{ source: 'fresh-eyes', item: "which ball is pip's", applied: true }, { source: 'fresh-eyes', item: 'Whisper line', rejected_reason: 'intended' }, { source: 'panel', item: 'Size chain', applied: true }] });
eq('I6 every item applied/rejected -> approved', scriptApprove({ dir: wk, brand: 'clipping' }).approved, true);
w(wk, 'fix-ledger.json', { items: [{ source: 'panel', item: 'Size chain' }] });
eq('I9 ledger item without applied/rejected_reason -> malformed refusal', scriptApprove({ dir: wk, brand: 'clipping' }).failures.some(x => /malformed fix-ledger\.json/.test(x)), true);
// I9 malformed reviewer file
eq('I9 forecast "high" -> malformed script-doctor.json refusal', scriptApprove({ dir: mk('sa-mal', { ...good, 'script-doctor.json': { ...sdPass, forecast: 'high' } }), brand: 'clipping' }).failures.some(x => /^malformed script-doctor\.json: forecast missing/.test(x)), true);
// round cap + force
const cap = mk('sa-cap', { ...good, 'script-doctor.json': { ...sdPass, round: 11 } });
const r4 = scriptApprove({ dir: cap, brand: 'clipping' });
eq('round 11 > 10 -> round cap refusal', [r4.approved, /^round cap reached: orchestrator decision/.test(r4.failures[0])], [false, true]);
const r5 = scriptApprove({ dir: cap, brand: 'clipping' }, { force: true, note: 'owner: ship as is' });
eq('round cap + --force --note -> approved forced', [r5.approved, r5.forced, r5.record.force_note], [true, true, 'owner: ship as is']);
eq('--force without note -> still refused', scriptApprove({ dir: mk('sa-cap2', { ...good, 'script-doctor.json': { ...sdPass, round: 11 } }), brand: 'clipping' }, { force: true }).approved, false);
const qz = mk('sa-quiz', { ...good, 'quiz.json': { rounds: [] } });
eq('quiz-ar hashes quiz.json + script.json', Object.keys(scriptApprove({ dir: qz, brand: 'quiz-ar' }).record.script_files), ['quiz.json', 'script.json']);
eq('kids without episode.json -> refused', scriptApprove({ dir: mk('sa-kids', good), brand: 'kids' }).failures.some(f => f.startsWith('episode.json missing')), true);
const tk = mk('sa-tech', good); scriptApprove({ dir: tk, brand: 'tech' });
fs.writeFileSync(path.join(tk, 'spec.json'), '{}', 'utf8');
eq('tech: spec.json appearing after approval -> hash mismatch', scriptApprovalGate({ dir: tk, brand: 'tech', createdAt: '2026-11-10' }).ok, false);
const oldNoAppr = scriptApprovalGate({ dir: old, brand: 'clipping', createdAt: '2026-11-05' });
eq('old production without approval -> ok with warning', [oldNoAppr.ok, oldNoAppr.warnings.length], [true, 1]);

// delta sensitivity (owner 2026-11-08): text of hook/payoff/ending only; timing/visual params are not
const qa0 = { hook_line: { id: 'HL19' }, end_question: { id: 'EQ18', text_ar: 'a' }, narration: { tempo: 1.1, hook_retake: 1 }, rounds: [{ id: 'hook', params: { exit_lead: 0.2, voice_at: 0.1, t1: 'x' }, timings: { dur: 2 } }, { id: 'r1', params: {} }] };
const qa1 = { hook_line: { id: 'HL19' }, end_question: { id: 'EQ18', text_ar: 'a' }, narration: { tempo: 1.2, hook_retake: 2 }, rounds: [{ id: 'hook', params: { exit_lead: 0.4, voice_at: 0.3, t1: 'x' }, timings: { dur: 2.4 } }, { id: 'r1', params: {} }] };
eq('scriptDiff: hook timing/tempo/retake changes are not sensitive', scriptDiff(qa0, qa1).filter(x => x.sensitive), []);
eq('scriptDiff: hook on-screen text (params.t1) is sensitive', scriptDiff(qa0, { ...qa1, rounds: [{ ...qa1.rounds[0], params: { ...qa1.rounds[0].params, t1: 'y' } }, qa1.rounds[1]] }).filter(x => x.sensitive).map(x => x.path), ['rounds.0.params.t1']);
eq('scriptDiff: hook_line id / end_question text are sensitive', scriptDiff(qa0, { ...qa0, hook_line: { id: 'HL20' }, end_question: { id: 'EQ18', text_ar: 'b' } }).filter(x => x.sensitive).map(x => x.path), ['hook_line.id', 'end_question.text_ar']);
// I7 delta approval inside a video round
eq('scriptDiff: hook line sensitive, middle line not', scriptDiff({ lines: [{ id: 'hook', text: 'a' }, { id: 'b2', text: 'b' }, { id: 'b3', text: 'c' }] }, { lines: [{ id: 'hook', text: 'A' }, { id: 'b2', text: 'B' }, { id: 'b3', text: 'c' }] }), [{ path: 'lines.0.text', sensitive: true }, { path: 'lines.1.text', sensitive: false }]);
const script3 = { lines: [{ id: 'l1', role: 'hook', text: 'open' }, { id: 'l2', text: 'middle' }, { id: 'l3', text: 'more' }, { id: 'l4', role: 'ending', text: 'end' }] };
const dl = mk('sa-delta', { ...good, 'script.json': script3 });
eq('delta without an approved snapshot -> refused', scriptApprove({ dir: mk('sa-nosnap', good), brand: 'clipping' }, { delta: true }).failures[0]?.startsWith('delta: no approved snapshot'), true);
eq('delta: full approval first', scriptApprove({ dir: dl, brand: 'clipping' }).approved, true);
age(dl);
w(dl, 'script.json', { lines: [script3.lines[0], { id: 'l2', text: 'middle, tighter' }, script3.lines[2], script3.lines[3]] });
const d1 = scriptApprove({ dir: dl, brand: 'clipping' }, { delta: true });
eq('I7 delta: middle line changed, no doctor recheck newer than the change -> refused', [d1.approved, /script-doctor recheck missing/.test(d1.failures[0] ?? '')], [false, true]);
w(dl, 'script-doctor.delta.json', { verdict: 'pass', forecast: 88, round: 2, gap_to_gate: [] });
const d2 = scriptApprove({ dir: dl, brand: 'clipping' }, { delta: true });
eq('I7 delta: recheck pass, non-hook line -> approved without fresh-eyes/panel', [d2.approved, d2.delta?.viewers_rerun, d2.record.deltas.length], [true, false, 2]);
eq('I7 delta approval keeps builders happy (hash updated)', scriptApprovalGate({ dir: dl, brand: 'clipping', createdAt: '2026-11-10' }).ok, true);
age(dl);
w(dl, 'script.json', { lines: [{ id: 'l1', role: 'hook', text: 'new hook' }, { id: 'l2', text: 'middle, tighter' }, script3.lines[2], script3.lines[3]] });
w(dl, 'script-doctor.delta.json', { verdict: 'pass', forecast: 88, round: 2, gap_to_gate: [] });
const d3 = scriptApprove({ dir: dl, brand: 'clipping' }, { delta: true });
eq('I7 delta: hook line changed -> fresh-eyes + panel rerun required', [d3.approved, d3.failures.filter(x => /hook\/payoff\/ending line changed/.test(x)).length], [false, 2]);
w(dl, 'fresh-eyes.script.json', feS); w(dl, 'panel.script.json', panelS);
eq('I7 delta: hook change + fresh viewers -> approved', scriptApprove({ dir: dl, brand: 'clipping' }, { delta: true }).approved, true);

// builder entry points refuse before any TTS/render (CLI on a temp productions root; production not in DB -> scope = story.json)
const cliRun = (cmd: string, id: string, extra: string[] = []) => spawnSync(process.execPath, ['--import', 'tsx', 'packages/orchestrator/src/cli.ts', cmd, id, ...extra], { encoding: 'utf8', env: { ...process.env, STUDIO_PRODUCTIONS: root }, cwd: path.resolve(import.meta.dirname, '..') });
mk('cli-new', { 'story.json': {}, 'script.json': {} });
for (const c of ['build', 'quiz:build', 'kids:build', 'tech:build', 'celebrity:build']) {
  const r = cliRun(c, 'cli-new');
  eq(`${c} without approval -> refused by script gate`, [r.status, /script gate: .* refused/.test(r.stderr)], [1, true]);
}
const rc = cliRun('script:round-check', 'sa-np');
eq('script:round-check prints escalate status', [rc.status, /"status": "escalate: orchestrator decision"/.test(rc.stdout)], [0, true]);
mk('cli-rs', { 'v1/x.json': {}, 'v2/x.json': {}, 'v3/x.json': {} });
const br = cliRun('tech:build', 'cli-rs', ['--plan']);
eq('I5 rebuild without --reason -> warning; 4th build since QA -> BUILD CHURN refused (hard stop)', [br.status, /without --reason/.test(br.stderr), /BUILD CHURN: tech:build cli-rs would be build #4.*refused/.test(br.stderr)], [1, true, true]);
const brf = cliRun('tech:build', 'cli-rs', ['--plan', '--force', '--reason', 'x']);
eq('BUILD CHURN: --force without --note still refused', /BUILD CHURN.*refused/.test(brf.stderr), true);
const brn = cliRun('tech:build', 'cli-rs', ['--plan', '--force', '--note', 'orchestrator: one more', '--reason', 'x']);
eq('BUILD CHURN: --force --note passes the churn gate (logged FORCED)', /BUILD CHURN.*FORCED: orchestrator: one more/.test(brn.stderr), true);
const br2 = cliRun('tech:build', 'cli-rs', ['--plan', '--reason', 'qa-round-2: caption timing']);
eq('I5 --reason given -> no reason warning', /without --reason/.test(br2.stderr), false);
const fr = cliRun('build', 'cli-new', ['--force']);
eq('build --force without --note -> refused', [fr.status, /--force needs --note/.test(fr.stderr)], [1, true]);

// audit #2 (owner 2026-11-08): shelve paused, review bars note, daily target
eq('shelve suggestion paused until 2026-11-22', [shelveActive(loadGates(), '2026-11-22'), shelveActive(loadGates(), '2026-11-23')], [false, true]);
eq('live config: daily_target_approved 2, review_bars_until 2026-11-22', [loadGates().daily_target_approved, loadGates().review_bars_until], [2, '2026-11-22']);

// cut-judge / puzzle-judge: stage V only when the input changed (input_sha256 vs review:hash)
const plan = { entries: [{ rank_position: 1, reveal_index: 4, source_id: 's1', in_ms: 0, out_ms: 3000, framing: { trim: { left: 10 } } }] };
const cr = { stage: 'C', entries: [], order_ok: true, number1_strongest: true, pass: true, gap_to_gate: [] };
const cd = mk('cut1', { 'ranking-plan.json': plan, 'v1/x.json': {} });
w(cd, 'cut-review.json', { ...cr, input_sha256: cutHash(cd) });
eq('cut: stage C pass + unchanged hash -> accepted', stageReviewCheck(cd, path.join(cd, 'v1'), 'cut').errors, []);
w(cd, 'ranking-plan.json', { entries: [{ ...plan.entries[0], out_ms: 3400 }] });
eq('cut: window changed -> stage V needed', /changed since cut-judge stage C/.test(stageReviewCheck(cd, path.join(cd, 'v1'), 'cut').errors[0] ?? ''), true);
w(cd, 'v1/qa/cut-review.json', { ...cr, stage: 'V' });
eq('cut: stage V pass wins', stageReviewCheck(cd, path.join(cd, 'v1'), 'cut').errors, []);
const qd = mk('pz1', { 'quiz.json': { rounds: [{ id: 'r1', type: 'image_reveal', params: { img: 'art/a.png' }, explanation_ar: 'x' }] }, 'v1/x.json': {} });
fs.mkdirSync(path.join(qd, 'art'), { recursive: true }); fs.writeFileSync(path.join(qd, 'art', 'a.png'), 'png1');
const h0 = puzzleHash(qd);
w(qd, 'quiz.json', { rounds: [{ id: 'r1', type: 'image_reveal', params: { img: 'art/a.png' }, explanation_ar: 'changed wording' }] });
eq('puzzle: wording change keeps the hash', puzzleHash(qd), h0);
fs.writeFileSync(path.join(qd, 'art', 'a.png'), 'png2');
eq('puzzle: art change changes the hash', puzzleHash(qd) !== h0, true);
eq('puzzle: stage P without input_sha256 -> stage V needed', /no input_sha256/.test(stageReviewCheck((w(qd, 'puzzle-judge.json', { stage: 'P', pass: true, rounds: [] }), qd), path.join(qd, 'v1'), 'puzzle').errors[0] ?? ''), true);
const pzA = approveGate({ dir: mk('pzA', { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'quiz.json': { rounds: [] } }), brand: 'quiz-ar' }, { validate: false });
eq('approve quiz-ar story loop without puzzle-judge -> refused', pzA.errors.some(e => /puzzle-judge\.json missing/.test(e)), true);
// frame-text-inspector scope: measured text-safety pass with nothing unmeasured and no painted layers stands in for text-check
const tsOnly = { ...v1ok, 'v1/qa/viral.json': { score: 80 }, 'v1/qa/text-safety.json': { pass: true, unmeasured: [], items: [{ source: 'timeline' }] } } as Record<string, unknown>;
delete tsOnly['v1/qa/text-check.json'];
eq('text-check missing but text-safety proved everything -> ok', approveGate({ dir: mk('tso', tsOnly), brand: 'tech' }, { validate: false }).ok, true);
eq('text-check missing + painted layer -> refused', approveGate({ dir: mk('tsl', { ...tsOnly, 'v1/qa/text-safety.json': { pass: true, unmeasured: [], items: [{ source: 'layer' }] } }), brand: 'tech' }, { validate: false }).ok, false);

// celebrity no-clips/no-likeness lint (celebrity:build)
eq('celebrity: typography only -> ok', lintCelebrityScenes([{ scene: 's1', html: '<div>2</div>' }], null).length, 0);
eq('celebrity: <video> -> refused', lintCelebrityScenes([{ scene: 's1', html: '<video src="assets/a.mp4">' }], null).length, 1);
eq('celebrity: unlisted photo -> refused', lintCelebrityScenes([{ scene: 's1', html: '<img src="assets/messi.jpg">' }], null).length, 1);
eq('celebrity: original art listed -> ok', lintCelebrityScenes([{ scene: 's1', html: '<img src="assets/trophy.png">' }], { items: [{ path: 'assets/trophy.png', origin: 'original (codex)' }] }).length, 0);

fs.rmSync(root, { recursive: true, force: true });
console.log(fail ? `${fail} FAILED` : 'all gate tests passed');
process.exit(fail ? 1 : 0);
