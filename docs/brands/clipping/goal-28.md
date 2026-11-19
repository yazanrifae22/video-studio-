# Mission Voices — goal 28 (owner, 2026-10-25)

**Goal:** 28 new approved Mission Voices clips = 4 per day for 7 days. Each ends with a **different call to action** so we can
learn which ask moves viewers (subscribes, comments, likes, shares).
Baseline: 3 approved (vx23, 7m29, b75f — already scheduled Oct 24–26 at 22:00).

## Flow (same production loop as CLAUDE.md)
Showrunner (sonnet, fresh per batch of 4) → source + `rights:set` → analyze → candidates → cutlist (+ CTA) → `build` → techqa → own frame check → stage `qa`
→ qa-director (rubric, lean) + rights-scout (countersign new sources / changed windows) → fixes → approve at ≥85, no blockers.
Two lanes, distinct topics. One render at a time (DB render lock). Delete nothing.

| Lane | Topic | Seed sources (already approved + transcribed) |
|---|---|---|
| A — Living in orbit | ISS / Commercial Crew / Starliner: daily life, bodies, coming home, emergencies | Crew-9 post-flight `src-261021-31sd` (b75f used 2039–2077 s) |
| B — Moon & history | Artemis, Apollo, Shuttle veterans, scientists explaining missions | Artemis II post-flight `src-261021-o7kw` (vx23 used), Apollo 13 veterans `src-261021-5r4z` (7m29 used) |

Each hour-long conference yields several clips — never reuse a window already used by an approved clip. New sources: NASA-produced
conferences/interviews on images.nasa.gov (read the NASA .srt sidecar first, download ~medium or a keyframe excerpt).

## CTA rule
- Cut list text `{ "role": "cta", "text": "…", "at": <end of the last spoken word>, "dur": 1.5–2.0 }` as an overlay over the LIVE last picture (owner 2026-11-08, O-B1: no frozen/silent 3 s hold; top band, no other top-band card then).
- `script.json` gets `"cta": { "id": "F3-2", "family": "comment_pickside", "text": "…" }` and the description's **first line** repeats the ask
  (e.g. "Would you take this ride? Tell us in the comments."). Text ≤ 40 chars, no emoji, never claims something untrue.
- Comment questions may be tailored to the clip's topic (keep the family's form). Every one of the 28 texts must be unique.

| Family | id | Text (default) |
|---|---|---|
| F1 subscribe | F1-1 | Subscribe for more astronaut stories |
| | F1-2 | Hit subscribe. More voices from orbit |
| | F1-3 | Subscribe so you don't miss the next one |
| | F1-4 | New astronaut story daily. Subscribe |
| F2 follow-series | F2-1 | Next story drops in a few hours. Follow |
| | F2-2 | 4 astronaut stories a day. Follow along |
| | F2-3 | Follow for the next mission moment |
| | F2-4 | Want more stories like this? Follow |
| F3 pick a side + why (was yes/no; owner 2026-11-08, O-S3) | F3-1 | Would you take this ride? Say why |
| | F3-2 | Would you go? Pick a side, say why |
| | F3-3 | Could you do this job? Say why below |
| | F3-4 | Would you volunteer? Say why below |
| F4 comment opinion | F4-1 | What surprised you most? Comment |
| | F4-2 | Best line in this clip? Quote it below |
| | F4-3 | Scariest part? Tell us in the comments |
| | F4-4 | One word for this moment? Comment it |
| F5 comment request | F5-1 | Which astronaut should we clip next? |
| | F5-2 | Name a mission you want us to cover |
| | F5-3 | Question for an astronaut? Drop it below |
| | F5-4 | Moon or ISS story next? Comment |
| F6 share/save | F6-1 | Send this to someone who loves space |
| | F6-2 | Save this for the next launch day |
| | F6-3 | Share this with a future astronaut |
| | F6-4 | Send this to a friend who'd go |
| F7 like | F7-1 | Like if this gave you chills |
| | F7-2 | Like if you'd watch the full talk |
| | F7-3 | Hit like if you learned something |
| | F7-4 | Like if you want more like this |

**Schedule design (balanced test):** day d (0–6), slot s (0–3, = 10:00 / 14:00 / 18:00 / 22:00 GMT+3) gets family `F((d + 2s) mod 7 + 1)`.
Every day has 4 different families and every family appears once in each time slot → time of day doesn't bias the comparison.
Measure after 7 days per video: subscribers gained, comments, likes, shares, views (YouTube Analytics) → normalise per 1k views.

## Batches
| Batch | Lane A (CTA ids) | Lane B (CTA ids) | Status |
|---|---|---|---|
| 1 | F1-1, F3-1, F5-1, F7-1 (27f0 jydp buc7 0z6u — QA pass 85–87) | F2-1, F4-1, F6-1, F1-2 (l4sr 8np0 og7k pw58 — fix round) | baseline |
| 2 | F3-2, F5-2, F7-2, F2-2 | F4-2, F6-2, F1-3, F3-3 | retention-v1, started 2026-10-25 |
| 3 | F5-3, F7-3, F2-3, F4-3 | F6-3, F1-4, F3-4, F5-4 | |
| 4 | F7-4, F2-4, F1-3 | F4-4, F6-4, F4-2 | F1-3/F4-2 replace synn/ocgn (source w8i2 pending: SCH production) |
| backups | ttaf F7-5 (like), e2pk F4-2 (opinion), fzv3 F5-B | iyl5 F1-3 (replaces 5eqr) | ttaf + e2pk approved; replace eyf0 (78) / wfam (74) |

**Final tally (2026-10-25):** 27 approved. CTA families among them: F1 subscribe 3 (+ 28th slot), F2 follow 4, F3 yes/no 4, F4 opinion 4, F5 request 3, F6 share/save 4, F7 like 5.
Compare families per 1k views, not raw totals (F5/F7 counts differ).
Talking-head clips plateau at QA 76–80 (originality cap for text-led, no-narration edits); 28th slot (iyl5 77 / 5eqr 78) waits on the owner.

Publishing (needs owner OK): 4/day, starting the first day after 28 are approved or as soon as batch 1+2 cover two days ahead.

## Retention rules v1 (owner, 2026-10-25 — from YouTube Studio advice on "Artemis II commander: I broke down in tears")
Data point: 71.7 % stayed vs swiped (hook works), but **58.2 % average viewed** (~28 s of 49 s) — viewers leave mid-way.
Applies to every clip started from batch 2 on. Batch 1 (already built) = baseline/control group, ruleset `baseline`.

| # | Rule | How we apply it (cut list / script) |
|---|---|---|
| R1 | Length 25–35 s single beat, or 40–50 s full arc (hard max 50 s); **O-S1 test (owner 2026-11-08): 4 clips at 16–24 s, tagged `length_test` in enhancements.json, read at 7 days; other bands unchanged.** Studio learning 2026-11-03: 44–57 s clips 62.4% stayed vs 50.7% for 21–26 s (n 6 vs 9), breakout is 45 s; `data/learning/clipping.json` N2 re-checks it | Single beat: payoff by ~25 s. Full arc: payoff by 60–80%, no 8 s window without new information. |
| R2 | Trim dead air | Cut every pause > 0.25 s and setup sentences (jump cuts on contiguous splits; audio fades are automatic). |
| R3 | Cold open on the emotional core | First spoken words = the strongest line or the critical moment; context goes to a later card, never before it. |
| R4 | Text hook from frame 0 | `hook` card at `at: 0`, ≤ 6 words, states the tension (sound-off viewers); visible ≥ 2 s. |
| R5 | Visual change every 3–4 s | No shot held > 4 s: alternate zoom (≥ +20 % size change) on contiguous splits, `motion: push/pull` on held shots, cards/emphasis on key words. |
| R6 | Emphasis on key reveals | `emphasis` words (yellow, larger captions) on the 1–3 payoff words. Optional subtle `bed: "tone"` accents only if they don't mask speech. |
| R7 | Seamless loop | Out-point on a line that leads back into the opening line (or ends on a question the opening answers); no fade-out, no dead tail. |
| R8 | CTA as an open question / ask | Per the CTA matrix above (1.5–2.0 s overlay over the live last picture from 2026-11-08, top band, closed YES/NO cards retired, must not cover the eyes — set `y` per clip after a frame check). |

### Per-video log — `productions/<id>/enhancements.json` (required for every clip, batch 1 included)
```json
{ "production_id": "clip-…", "ruleset": "retention-v1",            // or "baseline" for batch 1
  "duration_s": 31.2, "shots": 9, "max_shot_s": 3.9, "avg_shot_s": 3.5,
  "pauses_trimmed": 6, "dead_air_removed_s": 2.4,
  "rules": [ { "id": "R3", "applied": true, "how": "opens on 'I broke down' at 0.0 s (source 1234.5)" },
             { "id": "R7", "applied": true, "how": "ends on '…and that's why', loops into opening 'I broke down'" } ],
  "hook": { "text": "…", "at": 0.0, "dur": 2.5 }, "cta": { "id": "F3-2", "text": "…", "at": 28.2 },
  "emphasis": ["TEARS"], "loop": "how the end flows into the start",
  "results": null }                                                // filled later from YouTube Studio: views, stayed_pct, avg_pct_viewed, subs, comments, likes, shares
```
Roll-up: `python scripts/mv-enhancements.py` → `docs/brands/clipping/enhancements-log.md` (one row per clip).

### Second reviewer: retention (owner, 2026-10-25)
Every clip also gets an independent **Retention** pass inside qa-director (`.claude/agents/qa-director.md`; retention-reviewer retired 2026-11-02): `python scripts/mv-retention-check.py <id>`
(automatic R1–R8 measurements) + a judged review of cold open, real shot change, loop, CTA fit and the main drop-off risk → score /100.
**Approval gate for `retention-v1` clips: qa-director ≥ 85 + Retention ≥ 80 (no rule at 0) + rights countersign.** Baseline (batch 1) clips are
scored for the record only. Score lands in `enhancements.json.retention_review` and the roll-up column "Retention review".

### Lessons from batch 2 review (2026-10-25) — apply to every new clip
- Framing: face fills the frame; no empty desk/stage/logo band > ~20 % of height (zoom 1.8–2.0, eyes at 30–40 % height; check sharpness at 360 px).
- No repeated idea inside a clip; condensing must never orphan a pronoun or move an attribution onto the wrong quote.
- CTA starts after the last payoff line, never on the punchline; CTA fixes stay inside the clip's CTA family.
- Sources: event recordings hosted by third parties (e.g. Space Center Houston panels) are not NASA-produced even if NASA "participated" — skip them.
- Endings: end in a pause (≥0.25 s room tone after the last word; last 0.3 s below −30 dB). CTA starts after the last payoff line.
- **End card (standard from 2026-10-25, superseded 2026-11-08 by O-B1):** the CTA is a 1.5–2.0 s overlay at `at` = end of the last spoken word, over the live last picture (`end_hold` 0 or ≤ 2.0 s of real run-out picture, never a silent frozen 3 s hold); the video still ends in room tone (≥ 0.25 s). Title/credit end when the CTA starts. Older clips keep their 3.0 s hold.

### Owner decision (2026-10-25): approval bar for the rest of goal-28
**QA ≥ 80 with no blockers + Retention ≥ 80 + rights countersign.** (Talking-head clips without narration were capped at 77–84 by the rubric's originality ceiling after all defects were fixed.) Applies to goal-28 Mission Voices only.

## Lane (owner, 2026-11-02)
Human astronaut moments only: vulnerability, emotion, famous quotes (best 6.4K "give us a lander"). No lab/health/procedural clips (<190 views). Max 3 QA rounds per video.

**Owner 2026-11-08 (council):** O-B1 + O-S3 approved (CTA overlay 1.5–2.0 s over live picture; "pick a side and say why" replaces YES/NO). O-B3: event-day crew press moments (e.g. a launch/landing day) are allowed even if procedural, a human line is still required. O-S1: 4-video 16–24 s length test. O-B4: Moonshot slot, 1 per 8 videos (orchestrator proposes 3 topics, owner picks).
