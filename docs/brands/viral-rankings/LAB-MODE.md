# Podium Pop LAB MODE (owner, 2026-11-11) - beats GOAL-15 and the v3.1 workflow where they disagree

Owner: "do not use the full workflow ... for each video try a new way, out of the box, never tried before (special niche, special hook,
special visual at the start, special ask to comment / share / like) ... each video should have its special things together ... you can
accept even if QA is less than 85 if you think it is good to get thousands of views."

## Why (research/deep-research-2026-11-11, read in full)
- A public view is only a play start. What moves a Short out of the seed test is **stayed to watch**; winners sit at 70-90 %, under 60 % rarely
  performs (Galloway, 5,400 Shorts). Podium Pop is at 46.6 % and every video stops at 1-2.8K views. So the job is the first second and the stay.
- Likes, comments and shares showed **no** strong link to views in that dataset. An ask only earns its place if it is also a reason to stay
  (a game the viewer finishes), never a begging line.
- The single strongest clip in frame 0 drives the 1M+ outliers, not the countdown (YTCG: 6 of 48 Shorts over 1M, median 134K).
- YouTube (2026-10-01) cuts the reach of re-uploaded clips; "inauthentic content" = template-looking videos; reused content needs a real
  transformation. Every video must carry an **original computed/creative layer** and must differ materially from the last one.
- Best code-only niche: real-scale / measured comparisons with a computed outcome ("the payoff is real"). Hooks with proof: X vs Y (28M),
  curiosity question (16-31M). Mini-payoffs through the video, end on the peak, no outro, never give the whole payoff away in the hook.
- Longer Shorts whose viewers stay > 50 s averaged 4.1M; length is fine when the stay is earned.

## The niche: MEASURED / PLAYED moments
Real viral clips + one original layer that the viewer can see being measured or can play along with. The ranking is decided or proven
by that layer, on screen. Honest only: a number must be measurable from the picture itself (same frame, same moment). Slow-motion sources
and cut take-offs make stopwatch times false - do not time them (MTB 35p5 lesson).

## Recipe - four specials per video, never repeated (log below)
1. **Mechanic** (the special niche twist): what is measured or played. One per video.
2. **Hook line**: 3-7 words on screen + 5-10 spoken, X-vs-Y or a curiosity question, never names #1's outcome.
3. **Frame 0**: the single strongest clip already in motion, whole subject, full screen (`title_layout: "full"`), picked with
   `scripts/frame-pick.py`; the mechanic's graphic is already visible in the first second.
4. **Ask**: one tap or one word, tied to the mechanic, finished only by watching to the end ("Held your breath? Double-tap.").
Also: vertical native >= 720p clips, no burned captions/stickers/logos over the action, captions and plates off the subject, labels <= 12 chars.

## How it is built (lean - no 15-agent chain)
- Orchestrator designs the four specials and reviews the frames itself. At most ONE builder agent per video; hunter only when the library lacks clips.
- Plan `title_layout: "full"`; build with `cli build ... --reason` (`--force --note "owner 2026-11-11 lab mode"` at the churn / script gates).
- Special layer: `productions/<id>/special.json` + `python scripts/special-layer.py <id>` (elements: stopwatch, stack, vote, banner, tap_ring,
  board, hold_bar; `--preview t1,t2` first; keeps `render.base.mp4`). It is composited after the build, so a rebuild needs it re-applied.
- Rights countersign and safety rules stay. No AI text. techqa + text-safety must pass.
- Approve: orchestrator frame check (>= 12 frames incl. 0.0 s, every payoff, the ask) then the decision call with a `force_note`.
  `config/policy.json` approvalMinQa viral-rankings = 75 (was 85).
- Log every video here, then read its stayed-to-watch at 48 h (`data/learning/viral-rankings.json`) and keep / kill the mechanic.

## Log (one line per video: mechanic | hook | frame 0 | ask | result)
| production | mechanic | hook | frame 0 | ask | stayed % / views @48 h |
|---|---|---|---|---|---|
| rank-261108-35p5 MTB jumps v22 (youtu.be/ht52Q2iAiT4, 11-12 23:00Z) | BREATH GAME: hold your breath for the whole #1 hang, bar fills until the wheels land | "WHO HANGS LONGEST?" | #1 rider upside down over the valley, full screen | "Held your breath? Double-tap." | pending |
| rank-261108-mok5 cheerleading tosses v24 (youtu.be/0_3uoEB-638, 11-14 23:00Z) | TAP THE PEAK: ring closes on each flyer, zero at her apex, tap on it | "WHO TOUCHES THE TOP?" + banner "TAP WHEN SHE HITS THE TOP" | #1 flyer rising to the apex (0.9 s glimpse; frame-0 ring removed in v24, rings 2-4 carry no label) | "Hit all 5? Double-tap." | pending |
| rank-261111-bk1z surf wipeouts v3 (youtu.be/M_6gfUMpM_A, 11-13 23:00Z) | SCALE STACK: each wave measured in surfer-heights on screen (x10 to x20, on-screen estimates), ranking follows the count, plain 5-to-1 so the stack climbs | "1 SURFER VS A WALL OF WATER" + "How many surfers tall is this wave?" | #1 Nazare wave with the ruler already climbing | "Still paddling out? Double-tap." | pending |

## Ideas not used yet (pick one per new video, never reuse a logged one)
- CALL IT: slow-mo before the outcome + two vote buttons + timer, score yourself out of 5 ("5/5? comment it").
- SPOT IT: one detail hidden in #1 that the replay circles ("saw it first time? like").
- SILENT ROUND: one entry with no voice and no caption, the viewer names it in the comments.
- WRONG ORDER ON PURPOSE: the reveal looks wrong until the measured layer overturns it at #1.
- ONE CLIP, THREE ANGLES: the same moment replayed with a different measured thing each time.

## Open items (2026-11-11)
- A lab video has no independent QA review, so the decision API refuses it (bk1z was approved by hand in the DB with a logged event): add a lab-mode approval path.
- Controls for the read at 48 h: the eight old-layout videos scheduled 11-15..11-21 on the same 18:00 ET slot.
- Layout: `framing.offset_y_px`, `open_glimpse` as a plan field, hook pill default y in full layout (use `texts[0].y` 17.1), plate pinning (`overlay_clearance.plate_xy`).
