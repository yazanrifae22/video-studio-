# YouTube-insights rubric (Ask Studio, 2026-10-28)

Second gate next to `docs/review-rubric.md`. It scores whether a render fixes what YouTube Studio's Ask Studio
found on our channels (`docs/ask-studio-2026-10-28.md`, `docs/brands/<brand>/ask-studio-2026-10-28.md`).
**Approval needs BOTH: QA rubric ≥ 85 with no blockers AND insights score ≥ 85 with no "must" item at 0.**

The reviewer measures each item on the render itself (frames at 0.0/0.5/1.0/1.5/2.0/3.0 s, the last 3 s, ffprobe
duration, silencedetect on the first 1 s, transcript of the last 5 s) and writes
`productions/<id>/v<N>/qa/insights-score.json`:
```json
{ "production_id": "…", "version": 3, "brand": "clipping", "score": 88,
  "items": [ { "key": "frame0", "max": 20, "got": 18, "evidence": "0.0 s: 'I truly thought I was floating' + overlay 'FLOATING?'", "fix": "" } ] }
```
Put the same score and the failed items in the `review:add` summary as `INSIGHTS nn/100: …`.

## Common items (all brands), 70 points
| Key | Must | Check | Max |
|---|---|---|---:|
| frame0 | yes | Frame 0 shows the payoff/claim/most kinetic shot. No title card, date, location, logo or "And…" preamble | 20 |
| text0 | yes | 2–5 word bold overlay readable at 0.0 s (360 px test) | 10 |
| motion1s | | A cut, zoom or round start by ≤ 1.0 s; no dead air (silence < 0.15 s at the start) | 10 |
| length | yes | Inside the brand target (below); outside by ≤ 3 s = half points | 10 |
| no_outro | yes | No spoken CTA/sign-off/score question in the last 5 s; any CTA is on-screen text or mid-video | 10 |
| loop | | The last line/frame flows back into frame 0 (no fade to black, no end card) | 5 |
| title | | `title_proposed` (or the title) puts the curiosity gap/stakes in the first 30 chars and contains no invented facts | 5 |

## Brand items, 30 points
**clipping (Mission Voices)**: length 25–35 s single beat or 40–50 s full arc (16–24 s allowed for the 4 `length_test` clips, O-S1; CTA = 1.5–2.0 s overlay, no frozen 3 s hold, O-B1) (Studio learning 2026-11-03, `data/learning/clipping.json`; was 20–28 s)
| Key | Check | Max |
|---|---|---:|
| best_line_first | The clip's strongest quote is at 0 s (not at 0:20+) | 12 |
| jargon | Jargon is cut or explained by an overlay in the first 5 s | 8 |
| lower_third_cta | The follow/series CTA is a lower-third, not spoken | 5 |
| emotion_pattern | The hook is a sensory paradox, a stakes metaphor or an emotional confession | 5 |

**compilations (The Way It Was Made)**: length 18–30 s (≤ 45 s only for a real story arc)
| Key | Check | Max |
|---|---|---:|
| spectacle_plus_story | Spectacle shot in the first 1 s AND a narrated arc | 10 |
| open_loop | An open question/promise in the first 3 s, paid off at the end | 10 |
| no_dates_open | The first sentence has no date/location staging (dates come later) | 5 |
| sources_credited | Every new source (archive or owner-approved social clip) is credited in the description | 5 |

**quiz-ar (شو شايف؟)**: length 25–28 s (Studio learning 2026-11-03, `data/learning/quiz-ar.json`; a labelled 4-round "community" variant may run ≤ 35 s). `no_outro` exception for quiz-ar: the score question («كم جبت من ٣؟ اكتبها بالتعليقات») spoken OVER the last reveal is required, not a defect; a separate outro or > 1.5 s after the last reveal still fails. `round1_by_3s`: the hook line must be about the object on screen; rule/round-count/score/ego lines score 0. **Owner 2026-11-08: a big hook line from `docs/brands/quiz-ar/hook-lines.md` (quiz.json `hook_line`) scores like an object line** (full marks when the art is moving by 1.0 s and round 1 starts by ~2.5 s). The `end_question` big text in the final beat is part of the SR3 ending, not an outro.
| Key | Check | Max |
|---|---|---:|
| round1_by_3s | Round 1 is running by 2–3 s; the hook_intro motion + command word lands at 0–0.8 s | 10 |
| escalation | The rounds get harder; at most one mechanic family per video (or a justified mix) | 8 |
| no_counting | No sequence/counting round (the worst format) unless it is replaced with a visual odd-one-out | 6 |
| fair_hard | Harder but fair: every round is solvable at 360 px, with no leak (techqa leak guard + question-phase frame) | 6 |

**rankings (Planet Extremes)**: length 22–26 s
| Key | Check | Max |
|---|---|---:|
| one_first | #1's visual and claim at 0 s, with #5 reached by ~3 s | 12 |
| entry_pace | 4–5 s per entry | 10 |
| facts | Every value on screen matches script.json sources | 8 |

**rankings (viral-rankings, PROVISIONAL 2026-10-31: copied from the Planet Extremes rankings items; QA proxied it for rank-261031-fzcu; revisit after the first published data)**: length up to 60 s (owner 2026-10-31: length follows the footage so each moment shows its full idea; TOP 5 typical 30-50 s, hard max 60 s; do not deduct for length inside 60 s, deduct only for dead air or padding)
| Key | Check | Max |
|---|---|---|
| one_first | The payoff/claim is on screen at 0 s; the countdown reveals #1 last by design, so frame 0 must still carry a kinetic shot and the question title | 12 |
| entry_pace | 4-6.5 s per entry, no speechless stretch > 1.4 s except one deliberate payoff beat with visible motion | 10 |
| facts | Every value on screen matches script.json sources | 8 |
Also scored: title accents only on topic keywords (BRAND-GUIDE section 5), rail sublabels readable at 360 px, motion (cut/zoom/punch) by 1.0 s.
