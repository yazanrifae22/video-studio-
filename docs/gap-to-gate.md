# gap_to_gate: every review says exactly how to reach the gate (workflow v3, owner 2026-11-08)
Contract: `research/council/2026-11-08-workflow/CONTRACT.md`. Gate values: `config/gates.json` (single source; summary in `docs/gates.md`). A score without a path to the gate is not a review.

## The item (all reviewers, same shape)
`{item, now, needed, fix, points, owner, t}`
- `item` what is short (one thing, not a theme) · `now` what is there (quote, frame, number) · `needed` what passes · `fix` the concrete change (a rewritten line, a cut at a second, a new title) · `points` the score it adds on that reviewer's scale · `owner` who changes it · `t` timeline second, line id, or null.
- **Sum rule:** `now_score + Σpoints ≥ gate`. If no edit can get there, add `{item:"ceiling", fix:"ceiling: <why>"}` (e.g. clip pool, footage limits, premise too small) instead of padding points.
- Points are honest estimates on the reviewer's own scale; never inflate them to hit the sum. Order items by points, biggest first.

## Who returns it, on which scale
| Reviewer | File | Scale / gate (`config/gates.json`) |
|---|---|---|
| script-doctor | `script-doctor.json` | forecast points → `script_forecast` (85) |
| packaging-director | `packaging.json` | packaging score → its playbook gate (`docs/packaging-playbook.md`) |
| fresh-eyes | `fresh-eyes.script.json`, `v<N>/qa/fresh-eyes.json` | `viewer_score` → 80 (= pass); `hate` blocks (`fresh_eyes_block`) |
| audience-panel | `panel.script.json`, `v<N>/qa/panel.json` | points = personas moved; hate+boring and early swipes each ≤ 2 (`panel_block_hate`, `panel_block_swipe`) |
| qa-director | review JSON + `qa/insights-score.json`, `qa/viral.json`, `qa/retention-review.json` | one list per score: `qa` 85, `insights` 85, `viral` 75, `retention` 80 |
| punchline-critic | `script/critic-pass-N.json` | line score → its pass bar |
| persona-keeper | `persona-check.json` | banned-pressure lines = blockers (points 0, must fix) |
| rights-scout | rights record notes | blocker items only (swap source / trim window); no points |

**Owner names.** Reviewers with context use team ids (showrunner, packaging-director, hook-architect, story-architect, comedy-voice-writer, script-localization, rights-scout, engineer). fresh-eyes and audience-panel use plain owners; the orchestrator maps them: `words` → showrunner (Podium Pop jokes: comedy-voice-writer; Arabic: script-localization), `picture` → showrunner (cut/footage), `title` → packaging-director, `art` → showrunner (quiz-ar/kids art).

## Orchestrator: ONE batched fix per round
1. Collect every reviewer's `gap_to_gate` for the round (script round: doctor + fresh-eyes S + panel S + packaging; video round: QA/insights/viral/retention + rights + fresh-eyes V + panel V).
2. **Dedupe:** same `t`/line and same underlying fix = one item; keep the clearest `fix`, sum nothing twice, list all reviewers it satisfies.
3. **Conflicts:** owner rules > rights > honesty (no bait) > the reviewer with the hardest gate miss; note the loser in the batch.
4. **Order:** blockers first (rights, honesty, persona pressure, fresh-eyes hate, panel block), then by points; group by owner.
5. Send ONE list to a fresh showrunner (SendMessage) with the owner per item; it applies ALL items, even if earlier work must be redone, then the round re-runs.
6. Each next round's reviewers first verify the previous round's items were applied (`applied: yes|no|partial` per item) before scoring; an unapplied item stays at the top.

## Round rules
- **Script round** (before any TTS/3D/render): ≤ `script_rounds_max` (10). Pass = forecast ≥ 85, fresh-eyes not `hate`, panel not blocked, packaging done → `npm run -s cli -- script:approve <id>` writes `script-approval.json`; builders refuse without it. After round 10 still failing: orchestrator reworks the premise or shelves.
- **Video round** (after build/techqa/prelint): ≤ `video_rounds_max` (3), one rebuild per round; re-review = listed items + regression diff. Approve only when every gate passes and all sources are countersigned. At round 2 with QA < 78 the orchestrator keeps (one final batch) or shelves.
- Kids (Made for Kids): viral record-only; panel block and fresh-eyes hate still stop it; no virality-pressure fixes.

## v3.1 additions (2026-11-08) [v3.1]
- **Cheap-first:** script-doctor first; fresh-eyes S + panel S only once forecast >= 85. **No progress** (< 3 points over 2 rounds, or round >= 4 with forecast < 75) = orchestrator decides rework or shelve.
- **Fix ledger:** weak fresh-eyes or >= 2 panel swipes before payoff -> `productions/<id>/fix-ledger.json`, every item `applied` or `rejected` + reason; script-doctor verifies.
- **Delta:** video-round script fixes use `script:approve --delta`; FE/panel rerun only if hook, payoff or ending changed.
