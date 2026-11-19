# Hook Playbook: open questions, visual hooks and loops (studio standard, 2026-11-03)

Every agent that touches an idea, script, cut, render or result follows this page. Detail, sources and per-brand examples are in:
- `docs/hooks/A-open-questions.md`: spoken and text hooks, M1–M7, plus the Arabic draft bank
- `docs/hooks/B-visual-hooks.md`: frames 0–3 s, M1–M9, keyframe recipes, safe zones
- `docs/hooks/C-loops-endings.md`: loop seams and endings, M1–M7, loop QA
- Background research: `research/council/2026-11-03/` (council MINUTES).
- After the hook: `docs/story-playbook.md` (body, S1-S10, story.json) and `docs/viral-check.md` (studio viral check), council 2026-11-08.

Evidence note: most numbers come from creator and vendor sources. Treat them as starting points and check them against `data/learning/<brand>.json`.

## The core contract (every video)
| # | Rule | Check |
|---|---|---|
| H1 | **Payoff first.** Write the payoff in one sentence before writing the hook. The hook is that sentence as a question, with the outcome hidden and the subject named. | `hook.json.premise` and `what_the_payoff_is` exist before the script |
| H2 | **Frame 0 = mid-action.** A Glimpse Tease still counts: the #1 clip plays in motion behind a partial cover (pill/backdrop blur over ≤ 50% of the subject), and the action must read at 360 px (passes T1 and viral-rankings QA1). Never black, a logo, a title or context card, or a fade-in (no `fadeInFrames` on the first item). Trim the run-up with `srcStartFrame`. | frame 0 at 360 px, sound off: understood in 1 s |
| H3 | **Hook text**: max 6 words EN / 5 AR, max 2 lines, placed 28–38% from the top (`y` −22…−12), right 15% clear, weight 900 with a heavy shadow, pill on busy footage. | readable at 360 px |
| H4 | **Sound at 0.0 s.** No fade on the first audio item. The first spoken word starts at 0.3 s or earlier, with at most 7 words in the first 3 s. Silence Snap is not silence at 0: sound plays from 0.0 s and the snap is the drop at 0.5–1.5 s. | waveform at frame 0 |
| H5 | **First visible change by 1.5 s, second by 3.0 s**, then one every 3–5 s. | cut/keyframe times |
| H6 | **One open loop at a time; a re-hook every 5–8 s.** A new small question, stake or reveal at least every 8 s. | no 8 s window without one |
| H7 | **Paid promise.** `payoff_ts` = where the hook's promise is paid (in `hook.json`). **Single-story reels** (MV, WIM, kids, clips): 60–80% of runtime, the rest is the consequence/twist + loop. **Countdown/quiz formats** (Podium Pop, quiz-ar, rankings): `payoff_ts` = the final reveal (#1 / last round, typically 85–95%) AND a `mid_payoff_ts` (rank 2–3 / round 2 reveal) at 60–80% keeps the middle paid. Smaller truth → downgrade the words ("almost", "nearly", "one of"). Title and description promise nothing bigger. | QA blocker if unpaid at `payoff_ts` ± 0.3 s |
| H8 | **Loop seam.** The video ends on the last payoff/twist, never after it (H7 and H8 together: the main payoff lands, then only its consequence or the final reveal remains). Dead tail is 12 frames (0.4 s) or less. No end card and no "thanks/subscribe" text in the last 3 s. The last frame and sound flow into frame 0. | concat-twice seam test |
| H9 | **Send reason.** One line stating who forwards it to whom, and why. | `script.json.send_reason` |
| H10 | **Honesty gate.** Frame 0 and the teaser come from this video. Every sound effect has an on-screen event. Contact is never cropped, slowed or relabelled to change what it means. No "INSANE / NEVER SEEN" without an evidence line. Near-miss only when the viewer has agency (a quiz) or the footage truly almost happens. | B §4 seven checks |

## Mechanism menu (hook-architect picks 3 that differ, then chooses 1)
- **Visual (B):** Withheld Contact (moves toward it, the cut lands one beat before impact, contact plays at the payoff) · Honest Near-Miss · Silence Snap · Glimpse Tease (#1 behind a cover, 0.3–0.6 s) · Punch-In · Freeze-Hit (needs a builder PNG helper) · Pattern Interrupt (1.5–3 s) · Mute-Proof Overlay · Hard Open.
- **Spoken/text (A):** Named-Outcome Question · Extreme-True-Moment Tease · Challenge Caption · Scripted Wrong-Guess · Re-Hook Line · Number Gap · Contrarian Question.
- **Ending (C):** Seamless Seam · Split-Sentence Loop (the last line finishes in the first line) · Hidden Detail plus "did you catch it?" · Nested Loops with the payoff at 60–80% · End on the Payoff · Next-video hook (not an end card) · Long-form Callback.

## Loop choice by length
- **≤ 35 s:** full Seamless Seam (the last frame matches frame 0 by `scale`/`x` keyframes that settle in 6–9 frames; audio self-crossfade of 9 frames on pad beds, 0–4 on beat beds) or a Split-Sentence Loop.
- **35–45 s:** countdowns (Podium Pop) end on the #1 payoff; single-story videos (compilations, clips) end on the consequence + a callback to the frame-0 question. The frame-0 #1 glimpse makes the replay feel like a seam: the payoff picture flows into its own teaser. Optionally add a split sentence.
- **Over 45 s (compilations, kids):** a Long-form Callback to the frame-0 question, plus a next-video hook spoken in the body, not on a card.

## Brand defaults (owner rules always win)
| Brand | Hook default | Loop | Never |
|---|---|---|---|
| Podium Pop | Glimpse Tease of #1 plus Mute-Proof Overlay; Withheld Contact or a true Near-Miss on ranks; benign-violation beat at ranks 3–4 | end on #1, seam into the glimpse | fake #1 teaser; title outside `TOP 5 <W1> <W2> MOMENTS`; credits |
| Mission Voices | Punch-In on face/hand plus a radio Silence Snap; cold open on the strongest line | split sentence or end on the line | a context card before the first sound (use a lower third after it; never hide context) |
| The Way It Was Made | Withheld Contact (docking/lift) plus a Named-Outcome Question | callback to the opening question | generic "How they built…" |
| quiz-ar | object moving by 1.0 s plus an AR Challenge Caption; no rule/ego opener (data: 37.6–49% vs 60–71% stayed) | score ask over the last reveal, then seam (SR3) | the answer visible before the question phase ends; banner on round 1 |
| Tiko & Pip (Made for Kids) | gentle Punch-In or a soft Withheld Contact; chime | callback to the opening question | startle, flash, falling, fear, pressure or near-miss |

## Named brand exceptions (owner rules; QA treats these as valid, anything else = defect)
| Brand | Exception to | What is allowed |
|---|---|---|
| Podium Pop | H8 tail | 0.6–1.0 s silent beat after each reveal and the slow-mo replay of the key beat (owner pacing 2026-11-02), incl. after #1 — the whole post-#1 tail ≤ 3 s, ending on the #1 picture; the honest debate question (owner rule) as a text overlay ON the #1 picture, not a card; badge per O4 (pending) |
| quiz-ar | H8 tail | score ask spoken over the last reveal, tail ≤ 1.5 s (SR3); owner 2026-11-08: the open `end_question` (docs/brands/quiz-ar/end-questions.md) as big on-screen text over the same final beat, and when the beat is too short for it the builder's extension (`marks.endq_ext`) of ≤ 0.5 s |
| quiz-ar | H1/H3 opener (QA1) | owner 2026-11-08: the big stop-scrolling hook line from docs/brands/quiz-ar/hook-lines.md (bank only, about the test waking the brain, no insult, no round/score/ego/fake-stat words), spoken + huge type in the hook_intro while the art moves |
| Mission Voices | H8 | goal-28 end standard (owner 2026-11-08, O-B1): the unique CTA text ("pick a side and say why" family, not YES/NO) is a 1.5–2.0 s overlay over the live last picture, starting at the end of the last spoken word; no silent frozen 3.0 s hold; the seam test runs from the end of the overlay (≤ 0.4 s dead tail); older clips with a 3.0 s hold keep it |
| The Way It Was Made | H8 | the unique CTA text+position of goal-26 as an overlay inside the body or on the final payoff picture, no card |
| Tiko & Pip (Made for Kids) | H2, H8 | the kit series ending, and the opening AFTER a cold open: from 2026-11-08 (O5/O-C3) the episode starts with a cold open ≤ 3 s (first payoff action, moving 3D frame 0), then the kit opening (moved after the first payoff action or shortened); "frame 0" for hook tests = the cold-open frame; the seam test is waived (16:9 episode) |

## Who runs which test
- **The three hook tests have fixed names everywhere**: **T1 glance** (from frame 0 alone, a stranger can say what it is about within 1 s), **T2 mute pull** (sound off, frame 0 + overlay make them want the payoff), **T3 honest payoff** (the cut pays the promise at `payoff_ts`). hook-architect answers them in `hook.json.tests`; qa-director re-runs the same three on the render (T1/T2 no = major, T3 no = blocker).
- hook-architect runs **once per video**. It re-runs only when QA records a T1–T3 failure, and that re-run is part of the same QA round's single batched fix.
- hook-architect runs T1–T3 itself, on its written frame-0 description plus ≤ 6 small frames of the source moment, and writes the yes/no answers in `hook.json.tests`. qa-director re-tests on the render. Nobody else is needed.
- First line wording: start with the verb or the named subject; never with "so", "today", "in this video", or a rule/ego claim.
- Length bands come from each brand's goal doc (Podium Pop 30–45 s; quiz-ar 25–28 s; compilations 30–45 s, hard max 55 s; Mission Voices per goal-28); trend-hunter and directors quote the brand band, never a generic range.

## Learned per channel (data/learning, 2026-11-03)
Learned rules win over the generic Brand defaults table above; owner rules win over both.
- **quiz-ar:** default hook = visual command or question about the moving object (curiosity_tease 61.1%, timer_pressure 60.3%, friend_challenge 57.6% / avg 7.4K views stayed). Banned openers: rule, round-count, score and ego lines only (ego/ladder/score/streak categories, 39.9-50.2%); friend_challenge is allowed when worded about the on-screen object. Round-1 live at 0 s; SR1-SR6; QA1-QA4 are blockers (QA5/QA6 should-pass); SR4 debatable round every video (X2 tests it on 4 of 8). X3 (drop hook_intro) pending owner.
- **viral-rankings (Podium Pop):** SR1/QA1 kinetic frame 0 (must); SR2/QA2 first entry change by ~4 s with no setup line (a separate check from H5); SR3/QA3 sparse narration, source sound over impacts; SR4/QA4 debate-form ask on #1 (must); SR5/QA5 topic runs, no passive topics. Current videos open with a title card at 0 s: X1/O1 pending owner. N1-N7 in the learning calendar (N3 length test 30-45 s vs old 18-28 s read 2026-11-07).
- **clipping (Mission Voices):** SR1 hook = the speaker's bold claim or confession as frame 0 (lander 74.1%, tears 72.7% stayed), no And/But/um/setup; SR2 no list or jargon in 0-10 s; SR3 bold first-person lane (Artemis II, Apollo legends); SR4 awe/peace ending then loop; SR5 title = the speaker's words. QA1/QA2 are blockers (QA1: first spoken word at ≤ 0.3 s and it is the key line, so no Silence Snap before the first words), QA3 awe last line, QA4 quote title. N1-N5 in the learning calendar. R1 = 25–35 s or 40–50 s full arc (goal-28); the 40-50 s test is N2, owner OK pending.
- **compilations (The Way It Was Made):** SR1 frame 0 = named machine moving at full scale; SR2 open on a number or stake, no date/place line before 10 s (RS-25 110% to 57%); SR3 famous searched hardware, name in the first 2 title words; SR4 no spoken comment ask, one checkable fact in `script.json.pinned_fact`; the goal-26 CTA is an on-screen overlay, never a card. QA1/QA2 are blockers, QA3 title, QA4 no spoken guess CTA + pinned fact. N1-N5 in the learning calendar (N4 channel median > 2,500 is the learning goal; the O2 pilot continue-bar of 2K median is a different gate). Question hooks only with a number/stake (Stack is #2 by views).

## Records
- `productions/<id>/hook.json` (hook-architect): `premise, options[3], chosen, first_line (copy of the chosen option's line; others read this), overlay, tests{T1,T2,T3}, payoff_ts, mid_payoff_ts (countdown/quiz), what_the_payoff_is, rehooks[], loop_mechanism, frame0_source, cut_frame, tease_source_ts, send_reason, titles[3]`.
- `docs/brands/<brand>/hook-log.json` (growth-director after 24/48 h): hook mechanism, loop mechanism, stayed-to-watch, APV, views, returning-viewer %, subs per 1K, and a comparison with the median of the last 8 same-length videos.
- Field names are fixed studio-wide: `send_reason` (never `share_line`), `payoff_ts`, `mid_payoff_ts`, `rehooks`. Rule ids: quiz-ar data rules keep `SR1–SR6`; other brands use `<BRAND>-R<n>` to avoid clashes.
- **Brand exceptions to H2/H8** must be named in the showrunner file (e.g. a Made-for-Kids series opening/ending, the quiz-ar score ask); anything not named is a defect.

## Engineering asks (queued, not blocking)
True blur or pixelate for the Glimpse Tease (until then: a pill with backdrop blur over the clip, verified on a test render) · freeze-frame PNG helper · equal-power audio crossfade · dead-tail lint and seam preview (concat-twice) in prelint · per-word caption highlight · speed ramps.
