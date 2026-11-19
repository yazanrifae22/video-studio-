# Moment scoring (heuristic — not a virality predictor)

Each dimension is scored 0–10 on the candidate record; `overall_score` (0–100) is the weighted sum × 10.
Keep every candidate, including rejects with low scores and a reason: real performance later calibrates these weights.

## Clipping (long-form → short) — adapted from claude-shorts, with fixes
| Field | Dimension | Weight |
|---|---|---:|
| hook_score | First 3 s stop the scroll on their own (question, bold claim, vivid image) | 25 |
| coherence_score | Understandable with zero prior context | 20 |
| emotional_score | Emotion / surprise / tension | 20 |
| value_score | Insight or entertainment per second | 15 |
| payoff_score | Clear resolution before the cut | 10 |
| visual_score | Picture + audio suitability (speaker visible, clean audio) | 10 |

Rules: 25–58 s (≤ 90 s only if it truly needs it); ≥ 2 min between candidates from the same source; no repeated sub-topic;
minimum overall 60 to be eligible; boundaries on word timestamps at sentence ends (start may move ±1.5 s to a sentence start,
end may extend ≤ 3 s to finish the sentence, +0.3 s tail); reject any cut that changes the speaker's meaning (`missing_context`).

## Rankings & compilations (visual moments)
| Field | Dimension | Weight |
|---|---|---:|
| hook_score | Immediate visual impact in the first second of the shot | 25 |
| visual_score | Clarity, stability, resolution, framing that survives 9:16 | 20 |
| emotional_score | Surprise / awe / humour | 20 |
| coherence_score | Reads instantly without explanation | 15 |
| value_score | Uniqueness vs other candidates (no near-duplicates) | 10 |
| payoff_score | The shot completes an action (launch clears tower, wave hits) | 10 |

Evidence beats signals: an audio peak or a fast cut is a reason to *look*, never a score by itself. Inspect the contact
sheet / frames for every shortlisted window and cite what you saw in `editorial_rationale`.
