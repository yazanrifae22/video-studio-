/**
 * End-card dissolve timing (2026-11-02, QA: end-card wordmark ghosting during the dissolve). The last round's score card fades out
 * under the end-card (templates.ts: opacity 1 -> 0 over 0.3 s, power1.in, from marks.endcard - 0.15 s) and the brand lockup used to
 * dissolve in over the same frames (it starts 2 frames + 1.4 s before the end), so the wordmark sat translucent on the half-faded
 * score tiles. The lockup now dissolves in only once the card is <= 10 % opaque: a short dip to the round background, no ghost.
 */
export const CARD_FADE = { lead: 0.15, dur: 0.3 };
/** opacity of the score card at absolute time t (power1.in = quadratic) */
export function cardOpacity(t: number, absEndcard: number) {
  const p = Math.max(0, Math.min(1, (t - (absEndcard - CARD_FADE.lead)) / CARD_FADE.dur));
  return 1 - p * p;
}
/** start (s, relative to the end-card item) and length of the lockup's fade-in. `absEndcard` = last round T0 + marks.endcard (null = no card). */
export function endcardFade(absEndcard: number | null, endStart: number, itemLen = 1.4) {
  if (absEndcard == null) return { st: 0, d: 0.2 };
  const gone = absEndcard - CARD_FADE.lead + CARD_FADE.dur * Math.sqrt(0.9);   // card opacity 0.1
  const st = Math.max(0, Math.min(itemLen - 0.8, gone - endStart));
  return { st: +st.toFixed(3), d: 0.15 };
}
