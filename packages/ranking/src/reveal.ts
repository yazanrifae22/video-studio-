/**
 * Reveal-order director (viral-rankings). rank_position = editorial rank (#1 best); reveal order = which rank is
 * shown at each screen slot. This enumerates every permutation for N = 3 (6) or 5 (120), scores each with
 * transparent, configurable heuristics and returns all candidates + the chosen one + reasons.
 * Deterministic: same input → same output (ties break on the lexicographically smallest order).
 * It never changes rank positions; it only orders their reveals.
 */

export interface SlotScores {
  /** 0-10: how well this moment works as the opening second (instantly readable action) */
  hook: number;
  /** 0-10: size of the payoff / laugh / astonishment */
  payoff: number;
  /** 0-10 optional: energy/pace, used for contrast between neighbours (defaults to payoff) */
  energy?: number;
  /** 0-10 optional: how well its ending loops back to the first frame (defaults to payoff/2) */
  loop?: number;
}

export interface RevealWeights {
  hook: number;          // first reveal should have the strongest hook
  payoff_late: number;   // strongest payoff late, but not forced to be last
  escalation: number;    // payoff rises step by step after the opener
  contrast: number;      // neighbouring reveals differ in energy
  loop: number;          // last reveal loops cleanly
  rank1_first: number;   // penalty: revealing #1 first kills the tension
  sequential: number;    // penalty: plain N..1 or 1..N countdown (owner: don't default to it)
  recent: number;        // penalty: same order as a recent video (avoid a rigid template)
  payoff_target: number; // 0..1 position target for the strongest payoff (0.85 = late, not always last)
}

export const DEFAULT_WEIGHTS: RevealWeights = { hook: 3, payoff_late: 2, escalation: 1.5, contrast: 1, loop: 1, rank1_first: 2, sequential: 1, recent: 1.5, payoff_target: 0.85 };

export interface RevealCandidate { order: number[]; total: number; terms: Record<string, number> }
export interface RevealResult { n: number; weights: RevealWeights; chosen: RevealCandidate; reasons: string[]; candidates: RevealCandidate[] }

function permutations(xs: number[]): number[][] {
  if (xs.length <= 1) return [xs.slice()];
  const out: number[][] = [];
  xs.forEach((x, i) => { for (const rest of permutations([...xs.slice(0, i), ...xs.slice(i + 1)])) out.push([x, ...rest]); });
  return out;
}

const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** scores: keyed by rank_position (1..n). recent: reveal orders used by recent videos of the brand. */
export function directReveal(n: 3 | 5, scores: Record<number, SlotScores>, opts: { weights?: Partial<RevealWeights>; recent?: number[][] } = {}): RevealResult {
  if (n !== 3 && n !== 5) throw new Error('reveal director supports n = 3 or 5');
  const w: RevealWeights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };
  for (let r = 1; r <= n; r++) {
    const s = scores[r];
    if (!s) throw new Error(`missing scores for rank #${r}`);
    for (const k of ['hook', 'payoff'] as const) if (typeof s[k] !== 'number' || s[k] < 0 || s[k] > 10) throw new Error(`rank #${r}: ${k} must be 0-10`);
  }
  const energy = (r: number) => scores[r].energy ?? scores[r].payoff;
  const loop = (r: number) => scores[r].loop ?? scores[r].payoff / 2;
  const maxPayoff = Math.max(...Object.values(scores).map(s => s.payoff));
  const recentKeys = new Set((opts.recent ?? []).map(o => o.join(',')));
  const asc = Array.from({ length: n }, (_, i) => i + 1).join(','), desc = Array.from({ length: n }, (_, i) => n - i).join(',');

  const candidates: RevealCandidate[] = permutations(Array.from({ length: n }, (_, i) => i + 1)).map(order => {
    const terms: Record<string, number> = {};
    terms.hook = w.hook * scores[order[0]].hook / 10;
    // strongest payoff (first one if tied) — closeness of its position to the target
    const best = order.findIndex(r => scores[r].payoff === maxPayoff);
    terms.payoff_late = w.payoff_late * (1 - Math.abs(best / (n - 1) - w.payoff_target));
    let ups = 0;
    for (let i = 2; i < n; i++) if (scores[order[i]].payoff >= scores[order[i - 1]].payoff) ups++;
    terms.escalation = n > 2 ? w.escalation * ups / (n - 2) : 0;
    let diff = 0;
    for (let i = 1; i < n; i++) diff += Math.abs(energy(order[i]) - energy(order[i - 1]));
    terms.contrast = w.contrast * diff / ((n - 1) * 10);
    terms.loop = w.loop * loop(order[n - 1]) / 10;
    terms.rank1_first = order[0] === 1 ? -w.rank1_first : 0;
    const key = order.join(',');
    terms.sequential = key === asc || key === desc ? -w.sequential : 0;
    terms.recent = recentKeys.has(key) ? -w.recent : 0;
    for (const k of Object.keys(terms)) terms[k] = r3(terms[k]);
    return { order, total: r3(Object.values(terms).reduce((a, b) => a + b, 0)), terms };
  });
  candidates.sort((a, b) => b.total - a.total || a.order.join(',').localeCompare(b.order.join(',')));
  const chosen = candidates[0];
  const o = chosen.order;
  const bestPos = o.findIndex(r => scores[r].payoff === maxPayoff);
  const reasons = [
    `Opens on #${o[0]} (hook ${scores[o[0]].hook}/10)${o[0] === 1 ? ' — note: #1 shown first' : ''}.`,
    `Strongest payoff (#${o[bestPos]}, ${maxPayoff}/10) lands at reveal ${bestPos + 1} of ${n}${bestPos === n - 1 ? ' (last)' : ' (late, not last)'}.`,
    `Ends on #${o[n - 1]} (loop ${r3(loop(o[n - 1]))}/10).`,
    chosen.terms.sequential ? 'Plain countdown order chosen anyway: every alternative scored lower.' : 'Non-sequential reveal; each rank shown exactly once.',
    `Score ${chosen.total} vs runner-up ${candidates[1]?.total ?? '-'} (${candidates[1]?.order.join('→') ?? '-'}).`,
  ];
  return { n, weights: w, chosen, reasons, candidates };
}

/** Parse the CLI shorthand "1=6/9,2=8/7,3=5/6" (rank=hook/payoff[/energy[/loop]]) or a JSON object string. */
export function parseScores(s: string): Record<number, SlotScores> {
  const t = s.trim();
  if (t.startsWith('{')) return JSON.parse(t);
  const out: Record<number, SlotScores> = {};
  for (const part of t.split(/[,;]\s*/).filter(Boolean)) {
    const m = /^(\d+)\s*[=:]\s*([\d.]+)\/([\d.]+)(?:\/([\d.]+))?(?:\/([\d.]+))?$/.exec(part.trim());
    if (!m) throw new Error(`bad score "${part}" — use rank=hook/payoff[/energy[/loop]]`);
    out[+m[1]] = { hook: +m[2], payoff: +m[3], ...(m[4] ? { energy: +m[4] } : {}), ...(m[5] ? { loop: +m[5] } : {}) };
  }
  return out;
}
