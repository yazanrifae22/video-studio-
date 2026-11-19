/**
 * RankingPlan validator (viral-rankings). Two layers:
 *  1. structure (zod RankingPlan): exactly N entries, ranks 1..N once, reveal indices 0..N-1 once, reveal_order consistent.
 *  2. library + rights (this file): moment exists and belongs to the entry's source, in/out inside the moment, no
 *     overlapping windows on one source, ≤ 2 entries per source and never adjacent, reuse cooldown, and the RIGHTS GATE:
 *     every source and moment must be approved / approved_with_conditions AND countersigned (latest rights_log row by
 *     rights-scout/owner, see library.ts rightsCountersign) or the plan is NOT publishable.
 * Returns a report; `assertPublishablePlan` throws. Pure read — never writes.
 */
import { db } from '../../shared/src/db.ts';
import { MOMENT_DEAD, PUBLISHABLE_RIGHTS, RankingPlan, RANKING_FORMATS } from '../../shared/src/schemas.ts';
import { policy } from '../../shared/src/secrets.ts';
import { countersignActors, getMoment, momentRights, rightsCountersign } from './library.ts';
import { blockedAccentWords, titleFormatErrors } from './layout.ts';

export interface PlanReport {
  valid: boolean;            // structure + library checks passed
  publishable: boolean;      // valid AND the rights gate passed
  errors: string[];          // structural / library errors
  rights_blockers: string[]; // rights gate failures (each makes the plan non-publishable)
  warnings: string[];        // need independent review, not blocking
  plan: RankingPlan | null;
}

export function validateRankingPlan(input: unknown): PlanReport {
  const parsed = RankingPlan.safeParse(input);
  if (!parsed.success)
    return { valid: false, publishable: false, errors: parsed.error.issues.map(i => `${i.path.join('.') || 'plan'}: ${i.message}`), rights_blockers: [], warnings: [], plan: null };
  const plan = parsed.data;
  const errors: string[] = [], rights: string[] = [], warnings: string[] = [];
  const n = RANKING_FORMATS[plan.format];

  if (!db().prepare(`SELECT 1 FROM brands WHERE id=?`).get(plan.brand_id)) errors.push(`unknown brand ${plan.brand_id}`);
  // mojibake guard (2026-10-31): UTF-8 re-read as cp1252 and re-saved turns "—"/"·" into "â€”"/"Â·"; refuse it in any plan string (labels, title, narration, credits)
  { const moji = /Â[\u0080-¿]|â€|Ã[\u0080-¿]/; const hits: string[] = [];
    const walk = (v: unknown, p: string) => { if (typeof v === 'string') { if (moji.test(v)) hits.push(`${p}: "${v.slice(0, 40)}"`); }
      else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`)); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k); };
    walk(input, '');
    if (hits.length) errors.push(`plan text carries mojibake (re-save as UTF-8; Python open(..., encoding="utf8"), PowerShell -Encoding utf8): ${hits.slice(0, 3).join(' | ')}`); }
  // title accent rule (owner 2026-10-31): accent colours only on topic keywords, never on hype/generic words
  { const st: any = (plan as any).title_styles ?? {}; const conn = st.connector ?? 'connector';
    const acc = (st.spans ?? []).filter((sp: any) => (sp.color ?? 'connector') !== 'connector' && sp.color !== conn).flatMap((sp: any) => String(sp.text).split(/\s+/));
    const bad = blockedAccentWords(acc);
    if (bad.length) errors.push(`title accent colours must sit on topic keywords, not hype/generic words: ${bad.join(', ')}`); }
  // title format rule (owner 2026-10-31 final): "TOP <N> <WORD1> <WORD2> MOMENTS", two different accent colours on the two middle words
  errors.push(...titleFormatErrors(plan as any, n));
  if (plan.category_id) {
    const c = db().prepare(`SELECT brand_id FROM categories WHERE id=?`).get(plan.category_id) as any;
    if (!c) errors.push(`unknown category ${plan.category_id}`);
    else if (c.brand_id !== plan.brand_id) errors.push(`category ${plan.category_id} belongs to ${c.brand_id}`);
  }
  const seqDesc = Array.from({ length: n }, (_, i) => n - i).join(), seqAsc = Array.from({ length: n }, (_, i) => i + 1).join();
  if ([seqDesc, seqAsc].includes(plan.reveal_order.join())) warnings.push(`reveal order ${plan.reveal_order.join('→')} is a plain countdown — fine if chosen on purpose (reveal director), not as a default`);

  const cooldownDays = Number((policy() as any).viralRankings?.reuseCooldownDays ?? 30);
  const byReveal = [...plan.entries].sort((a, b) => a.reveal_index - b.reveal_index);
  for (const e of byReveal) {
    const tag = `#${e.rank_position} (reveal ${e.reveal_index})`;
    const m = getMoment(e.moment_id);
    if (!m) { errors.push(`${tag}: moment ${e.moment_id} not found`); continue; }
    if (m.source_id !== e.source_id) errors.push(`${tag}: moment ${e.moment_id} belongs to ${m.source_id}, not ${e.source_id}`);
    if (e.in_ms < m.start_ms || e.out_ms > m.end_ms) errors.push(`${tag}: window ${e.in_ms}-${e.out_ms} ms outside moment bounds ${m.start_ms}-${m.end_ms} ms`);
    if (MOMENT_DEAD.has(m.creative_status)) errors.push(`${tag}: moment is ${m.creative_status}`);
    if (m.duplicate_of) warnings.push(`${tag}: moment duplicates ${m.duplicate_of} (same event) — check it is not also in this plan`);
    if (m.reserved_by && plan.production_id && m.reserved_by !== plan.production_id) errors.push(`${tag}: moment reserved by ${m.reserved_by}`);
    // rights gate (source + moment + licence expiry + optional decision id)
    const r = momentRights(m);
    if (!r.publishable) rights.push(`${tag} ${e.moment_id}: ${r.reasons.join('; ')}`);
    else { const cs = rightsCountersign(m); if (!cs.countersigned) rights.push(`${tag} ${e.moment_id}: ${cs.reasons.join('; ')}`); }   // proposed ≠ cleared
    if (e.rights_decision_id != null) {
      const d = db().prepare(`SELECT asset_id, to_status, actor FROM rights_log WHERE id=?`).get(e.rights_decision_id) as any;
      if (!d) rights.push(`${tag}: rights_decision_id ${e.rights_decision_id} not found`);
      else if (![e.source_id, e.moment_id].includes(d.asset_id)) rights.push(`${tag}: rights_decision_id ${e.rights_decision_id} is for ${d.asset_id}`);
      else if (!PUBLISHABLE_RIGHTS.has(d.to_status)) rights.push(`${tag}: rights decision ${e.rights_decision_id} is ${d.to_status}`);
      else if (!countersignActors().includes(d.actor)) rights.push(`${tag}: rights decision ${e.rights_decision_id} is by ${d.actor} (a proposal), not a countersign`);
    }
    if (m.audio_essential && m.license_conditions.some((c: string) => /strip source audio|mute/i.test(c))) warnings.push(`${tag}: audio is essential but rights require muting — check the joke survives`);
    // reuse cooldown across videos
    const prior = db().prepare(`SELECT production_id, updated_at FROM moment_usage WHERE moment_id=? AND status IN ('approved','published') AND production_id<>? AND updated_at >= datetime('now', ?)`)
      .all(e.moment_id, plan.production_id ?? '', `-${cooldownDays} days`) as any[];
    if (prior.length) warnings.push(`${tag}: moment used in ${prior.map(p => p.production_id).join(', ')} within the ${cooldownDays}-day cooldown — needs new editorial context + review`);
  }

  // per-source rules: no overlapping windows, ≤ 2 entries, never adjacent reveals
  const bySource = new Map<string, typeof byReveal>();
  for (const e of byReveal) bySource.set(e.source_id, [...(bySource.get(e.source_id) ?? []), e]);
  for (const [src, es] of bySource) {
    if (es.length > 2) errors.push(`source ${src} used ${es.length} times — max 2 per video`);
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
      const [a, b] = [es[i], es[j]];
      if (a.in_ms < b.out_ms && b.in_ms < a.out_ms) errors.push(`source ${src}: #${a.rank_position} and #${b.rank_position} overlap (${a.in_ms}-${a.out_ms} vs ${b.in_ms}-${b.out_ms} ms)`);
      if (Math.abs(a.reveal_index - b.reveal_index) === 1) errors.push(`source ${src}: #${a.rank_position} and #${b.rank_position} are adjacent reveals — separate them`);
    }
    if (es.length === 2) warnings.push(`source ${src} used twice — needs independent review that the two moments are meaningfully distinct`);
  }
  if (plan.credit_center_y_px != null && plan.credit_center_y_px > 1460)
    warnings.push(`credit_center_y_px ${plan.credit_center_y_px} is below y 1460 — may sit under the Shorts/TikTok channel row; QA must check the credit stays readable`);
  if (plan.criterion_kind === 'editorial' && /\b(official|proven|verified|scientifically)\b/i.test(plan.ranking_criterion))
    warnings.push('editorial criterion uses fact-like wording — present the ranking as opinion');

  const valid = errors.length === 0;
  return { valid, publishable: valid && rights.length === 0, errors, rights_blockers: rights, warnings, plan };
}

export function assertPublishablePlan(input: unknown) {
  const r = validateRankingPlan(input);
  if (!r.publishable) throw new Error(`RankingPlan rejected (non-publishable): ${[...r.errors, ...r.rights_blockers].join(' | ')}`);
  return r;
}
