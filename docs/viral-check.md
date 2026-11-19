# Viral check: will a stranger stop, stay, finish and talk? (studio standard, all brands, 2026-11-08)

Replaces the Podium-Pop-only check (2026-10-31; its items are mapped in below, brand specifics stay in `docs/brands/viral-rankings/viral-check.md`). QA (`docs/review-rubric.md`), insights (`docs/insights-rubric.md`) and Retention measure craft; this check asks a separate question from the MP4 + script: **would a stranger scrolling the feed stop, watch through, replay, and comment or send it?**
Sources: `research/council/2026-11-08-story/` (S1 story, S2 formats, S3 platform science, S4 our data). Story rules S1-S10: `docs/story-playbook.md`. Hook rules H1-H10: `docs/hook-playbook.md`.

**Evidence note.** No public study validates a pre-publish viral score. This is a calibrated checklist, not a forecast; weights and bands are uncalibrated until the Calibration step has run (~20 videos per brand). Platform facts it rests on: YouTube ranks Shorts on choose-to-view, then stay, average view duration/% viewed, likes and surveys (YouTube Help, primary); since 2025-03-31 every start is a view, so engaged/views is not a grade (S3). Our own data: recognisable subject and an open talk trigger separate videos more than length or words/s (S4).

## Who scores, when
- **Final score:** qa-director, in the same pass as QA, insights and Retention, from the QA pack (Podium Pop: `scripts/qa-pack.py`) or the normal frame budget, plus `script.json`, `hook.json`, `story.json`. Writes `productions/<id>/v<N>/qa/viral.json`.
- **Forecast:** script-doctor, after the script and before TTS/build, from `story.json` + `script.json` + `hook.json`. Writes `script-doctor.json.forecast` and copies it to `story.json.forecast`.
- Nobody scores their own work. Every item cites evidence: a timestamp, a frame, or a script line id. An item without evidence scores at most half its max.

## Items (100, default weights)
| Key | Max | Question (judge the picture and sound, not the plan) | Low anchor (0-30%) | High anchor (80-100%) |
|---|---:|---|---|---|
| stop | 15 | Would a stranger stop on frame 0 + the first second, sound off, at 360 px? | static, wide, title over nothing, generic subject | unusual action readable on mute in 0.5 s, specific subject, promise visible |
| subject | 10 | Is the subject one the average viewer already knows or instantly recognises on screen? | jargon, niche name, anonymous "maybe him" wide shot | household name / everyday object or device / famous hardware, recognisable in frame |
| promise | 12 | Is the thing promised visibly under way by 5-8 s and paid at `payoff_ts` (H7)? | promise unseen until 12 s, or title/hook bigger than the payoff | promise under way by 5 s, paid on time, title promises nothing bigger |
| drive | 18 | Does every 5-8 s add something new, linked by but/therefore, escalating to a real mid-payoff and the payoff (S2-S5)? | list of equal units, repeated line shapes, restarted intro, a dead 8 s window | every beat new and linked, clear escalation, mid-payoff answers and opens |
| peak | 10 | Is there one felt high-arousal moment (awe, amusement, surprise), held, on screen, not only narrated (S6)? | flat, informational or low/sad; or two peaks fighting | one clear peak with room (0.5-1.5 s), sound or silence carries it |
| ending | 10 | Does the last line mean something and the cut flow back into frame 0 (S8, H8)? | trails off, CTA card, lecture, dead tail | last beat reframes the hook, seam invisible, replay feels free |
| talk | 15 | Is there an honest, specific reason to comment or send, woven into the video (S9)? | none, closed YES/NO card, bolted-on "like and subscribe" or "tag a friend" | open pick-a-side / self-score / debatable order, a named person to send it to, supplied by the video |
| retell | 10 | Does the viewer leave with one retellable, true, specific thing, from an original angle (S7)? | nothing to retell, unsupported claim, looks like every other upload | one surprising checkable fact/line/score with a number or name, our own angle |

Sum = 15+10+12+18+10+10+15+10 = 100.

## Hard caps and rules
- Promise false or unpaid in the render (T3 fail) -> total max 69.
- Changed meaning, fake #1, fake near-miss, or a label that does not match the picture -> total max 69 (it is also a QA blocker).
- Bait wording ("comment X to get Y", guilt, "subscribe or…") -> talk max 3.
- No spine (the body is a list with no but/therefore link anywhere) -> total max 74.
- Owner-clip ceiling (Podium Pop): if the clip pool itself is the limit, say so in `why_it_could_flop`; do not ask for more rebuilds.
- Kids (Made for Kids): talk scores parent retell value only; any viewer ask, pressure or cliffhanger -> talk 0.

## Brand weights (move points between items; total stays 100)
| Brand | stop | subject | promise | drive | peak | ending | talk | retell | Why |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| default | 15 | 10 | 12 | 18 | 10 | 10 | 15 | 10 | |
| Podium Pop | 18 | 10 | 9 | 20 | 10 | 10 | 15 | 8 | old check mapped: stop 20, payoff 20 + escalation 10 (-> drive + peak), rewatch 15 (-> ending), share 15 (-> talk), subject 10, fresh 10 (-> retell) |
| Mission Voices | 12 | 10 | 12 | 18 | 10 | 10 | 15 | 13 | the human voice, not a stunt, stops the thumb; a quotable line is the retell |
| Way It Was Made | 15 | 10 | 15 | 18 | 10 | 7 | 12 | 13 | no spoken ask (SR4); the payoff answer and the pinned fact carry it |
| quiz-ar | 17 | 7 | 12 | 18 | 10 | 10 | 19 | 7 | self-score and friend challenge are the share unit (413 comments, S4) |
| Tech Made Simple | 15 | 14 | 12 | 18 | 7 | 7 | 15 | 12 | consumer-recognisable topic was the strongest separator (S4) |
| Sunny Hill (record only) | 10 | 14 | 12 | 24 | 12 | 13 | 5 | 10 | 2:30-3:00 episode: retention-first; ending = warm resolve; no asks |

Podium Pop item notes (from the old check, still applied): **drive** subtracts 4 for each entry whose "whoa" is small, cropped, blurred or implied at phone size, and checks #1 is visibly strongest; **ending** checks the post-#1 tail (≤ 3 s, playbook exception); **talk** counts the debate ask on #1 (SR4) and the F12 ask only when woven into a moment.

## Script-stage forecast (script-doctor, before TTS)
Cheap, text-only, no render. Score from `story.json`, `script.json`, `hook.json` (frame-0 description and source frame) and the idea sidecar:
- Scored: stop (from `hook.json` frame 0 + first line), subject, promise, drive, ending (last line + `loop_mechanism`), talk, retell. Not scored: peak (needs the render). Forecast = points earned / points possible x 100, using the brand weights.
- Hard caps at script stage: a promise the planned footage cannot pay -> max 69; no spine / any `and then` link -> max 74; bait wording -> talk max 3; a fact line with no evidence -> retell max 3.
- Gate for TTS (workflow v3, owner 2026-11-08): forecast ≥ **85** (`config/gates.json` `script_forecast`) plus fresh-eyes not hate, panel not blocked and packaging done -> `script:approve`. Below 85 -> `revise` with `gap_to_gate` items that sum to 85 (`docs/gap-to-gate.md`); up to 10 script rounds, each verifying the previous fixes. Still below after round 10 -> the orchestrator reworks the premise or shelves.
- The forecast is never the final score and never used for approval.

## Verdict and gate
| Score | Verdict |
|---|---|
| 85 and up | `likely viral` |
| 75-84 | `solid` |
| below 75 | `weak` |

**Gate (O-S5, owner 2026-11-08): viral ≥ 75 is a HARD gate only for productions built through the new loop (`story.json` exists); older productions record `qa/viral.json` only; Sunny Hill never gated (record only). Recalibrate bands/gate after ~20 scored videos per brand (owner 2026-11-08, O-S5).** Approval needs viral ≥ 75 on top of the existing gates (QA ≥ 85 with no blockers, insights ≥ 85, Retention ≥ 80 where it applies, rights countersigned). Sunny Hill (Made for Kids): **record only, never a gate** (no virality pressure on a kids product; the kids QA1-QA5 learning checks and the series bible already gate it).
- Below 75: name the single change with the biggest lift (a swapped entry, a new frame 0, a stronger #1, a reworded talk trigger, a cut beat) and route it to the showrunner inside the same QA round's batched fix. It does not add a QA round (max 3 stays).
- Viral never overrides a blocker, and a high viral score never lifts QA or insights.

## Output: `productions/<id>/v<N>/qa/viral.json` (Podium Pop shape kept; `brand`, `weights`, `caps`, `forecast` added)
```json
{ "score": 78, "verdict": "solid", "brand": "viral-rankings", "weights": "viral-rankings",
  "items": [ { "key": "stop", "got": 16, "max": 18, "evidence": "0.0 s Jackie mid-air, readable at 360 px", "fix": "" },
             { "key": "talk", "got": 7, "max": 15, "evidence": "33.1 s debate overlay present; F12 ask at 41% is generic", "fix": "tie the ask to #3's fall" } ],
  "caps": [], "forecast": 74,
  "why_it_could_pop": "…", "why_it_could_flop": "…", "one_change_with_biggest_lift": "…" }
```
`forecast` = the script-doctor forecast (null if none). Item keys are fixed: stop, subject, promise, drive, peak, ending, talk, retell.

## Calibration (growth-director)
1. For every published video, add to its row in `docs/brands/<brand>/hook-log.json`: `viral_score`, `viral_items` (key: got), `viral_forecast`, `views_7d`, `engaged_ratio_7d`, `viewed_vs_swiped` (Studio, where readable), `comments_per_1k`, `shares_per_1k`. Compare like with like (same brand, same length class).
2. Primary outcome = 7-day views vs the median of the last 8 same-length videos on that channel; secondary = viewed-vs-swiped and comments/1K.
3. After ~20 scored videos per brand: Spearman rank correlation of the total and of each item with the outcome. Items with rho ≥ 0.3 gain up to 3 points; items with rho near 0 or negative lose up to 3 points; re-check the 75/85 bands against where the channel median falls. Forecast vs final score is checked too (forecast should rank videos in the same order).
4. Report the proposal to the orchestrator with n, rho and the date; the orchestrator applies weight changes here (dated line below). The gate value (75) changes only with owner OK.
5. Until the export gaps are closed (shares column, all brands in `videos.csv`, per-video retention; see MINUTES engineering asks) the talk and drive items cannot be calibrated: say so in each report.

## Change log
- 2026-11-08 workflow v3: script-stage gate 70 -> 85, up to 10 script rounds with gap_to_gate (`research/council/2026-11-08-workflow/CONTRACT.md`).
- 2026-11-08 studio-wide version (Story & Script Council, `research/council/2026-11-08-story/MINUTES.md`): 8 items, brand weights, forecast, kids record-only.

## v3.1 (2026-11-08) [v3.1]
- Render viral gate is **record-only until 2026-11-22**; then the bar is set from real-view calibration (`research/calibration/`). The script forecast gate (85) stays hard.
- qa-director writes `forecast_delta = viral(render) - forecast` in `qa/viral.json`; at video round 2 with viral < 65 the orchestrator keeps (one batch) or shelves.
