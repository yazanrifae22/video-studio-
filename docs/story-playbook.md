# Story Playbook: the body of every video after the hook (studio standard, 2026-11-08)

Sibling of `docs/hook-playbook.md`. The hook playbook owns 0-3 s (H1-H10, frame 0, first line, loop seam); this page owns what happens between the hook and the seam: spine, beats, escalation, mid-payoff, peak, ending meaning, talk trigger and the ear test. Where the two overlap (H6 re-hooks, H7 payoff windows, H8 seam, H9 send reason) the hook playbook's numbers stand and this page adds the design method.
Background: `research/council/2026-11-08-story/` (MINUTES, S1-S4). Viral scoring: `docs/viral-check.md`.

**Precedence:** owner rules (CLAUDE.md, brand goal docs: GOAL-15, goal-28, goal-26, quiz-ar SR rules, TECH-R rules, kids series bible) > channel learning (`data/learning/<brand>.json`) > this page. Made for Kids (Sunny Hill): no virality-pressure tactics; the kids rows below already adapt every rule.
**Evidence note:** almost nothing here is proven on Shorts retention. The but/therefore test, curiosity-gap and peak-end rules are craft canon or lab findings; beat timings are design proposals to be checked against our own per-video data (see `docs/viral-check.md` Calibration). Our own data says topic recognisability and an open talk trigger move views and comments more than word counts do (S4).

## The core contract (every video, every brand)
| # | Rule | Yes/no check |
|---|---|---|
| S1 | **Spine first.** Before any line: one spine sentence in And-But-Therefore form ("X and Y, but Z, therefore W") plus the payoff sentence (= `hook.json.what_the_payoff_is`). A 30-45 s video holds one spine, never two. | `story.json.spine` and `payoff` exist before `script.json` |
| S2 | **Every beat has a named job** from the beat vocabulary below. A beat that does none is cut. | every `beats[].job` filled; no duplicate job twice in a row except STEP |
| S3 | **But / therefore, never "and then".** Each beat complicates (but) or follows from (therefore) the one before. A countdown rung, a quiz round and a ladder step all need a stated link. | every `beats[i>0].link` is `but` or `therefore`; read the pairs aloud |
| S4 | **New information every 5-8 s and escalation.** Each unit (rank, round, step, try) is bigger, harder or a different kind than the last, or the reversal is deliberate and named. No unit repeats the previous unit's line shape. | `beats[].new_info` never empty; no window > 8 s without it (H6); intensity rises to the payoff |
| S5 | **Mid-payoff, and an answer preview for Q&A.** A real small payoff that answers something and opens the next loop: countdown/quiz at `mid_payoff_ts` (60-80%, H7); single-story at 35-55%. Q&A, explainers and how-it-was-made: a partial answer (the wrong answer named, or the first half of the mechanism) lands by 50%; never a one-line answer withheld for the whole runtime. | `mid_payoff_ts` set and in band; `open_loops[]` each has `paid_t` |
| S6 | **One peak.** A single most intense moment, held uncut 0.5-1.5 s, no narration over it (the source sound or silence carries it). Two competing peaks = pick one. | `peak_t` set; no voice over the peak window |
| S7 | **Specific, sourced, true.** Named, counted, dated nouns beat adjectives ("6-million-pound crawler", not "an amazing machine"). Every fact has a `claims[{claim, evidence}]` line. Narration adds what the picture does not show; it never describes what the viewer can see. | adjective-without-noun count 0 in key lines; every factual line has evidence |
| S8 | **The ending means something.** The last line reframes the hook or states the consequence (1-3 s, never a lecture), then the seam (H8). Kids: a warm, resolved ending with a callback to the opening question. | read the last line, then the first: does the first read differently now? |
| S9 | **An honest talk trigger and a send reason.** `comment_trigger` is open and woven into the content: pick-a-side with a reason, a numeric self-score, a debatable order, a reply prompt ("did yours do this?"). `send_reason` names who sends it to whom and why. Never a closed YES/NO card, never "comment X to get Y", never a bolted-on "tag a friend" (S4: YES/NO cards and send cards produced ~0). Kids: no viewer asks; parent retell value only. | `comment_trigger.type` ≠ `none` (kids: `none` allowed); no bait wording |
| S10 | **Ear test.** Read aloud at the brand's real TTS speed and it fits the runtime: words/s within the brand cap (general ≤ 2.6; quiz-ar ≤ 2.7; Podium Pop GOAL-15 V3 target 2.2-2.5, cap 2.8; kids 1.8-2.2 = bible 110-130 wpm), ≤ 12 spoken words per sentence (kids ≤ 8), one idea per sentence. Mute test: the picture alone still carries the spine. | words/s computed; longest sentence counted; spine visible in a 360 px frame strip |

Failures are recorded by the script-doctor before TTS and by qa-director on the render as `story S<n>` issues (see Who runs what).

## Beat vocabulary (use these job names in `story.json.beats[].job`)
HOOK (0-3 s, from `hook.json`) · GROUND (who/what/where in one line, only if the hook did not) · TURN (a "but": expectation broken, a cost appears) · STEP (a "therefore": consequence, new info) · MID-PAY (small real payoff that opens the next loop) · PEAK (the single most intense moment) · RESOLVE (main promise paid at `payoff_ts`) · MEANING (the one-line so-what) · TALK (the woven comment/score/debate trigger; may share a beat) · SEAM (flow into frame 0, H8). Countdowns: each rung is a STEP or TURN with its own ruling. Quizzes: each round is question -> think -> reveal; the reveal is a STEP with a "you thought X, but Y" line.

## Two-axis model: subject x structure
Every video records two labels: `subject_category` (what: e.g. football-stunt, astronaut-confession, launch-hardware, colour-find, ai-quirk, letter-sounds) and `structure` (how). Subject is chosen at idea time (trend-hunter: recognisable subject + story potential). Structure follows the format: each brand has one default and at most two allowed alternates. Anything outside the menu needs the orchestrator's OK. Gluing a foreign structure onto a format ("myth vs reality" on a countdown) is an anti-pattern.

| Structure | Shape | Used by |
|---|---|---|
| `verdict-countdown` | 5 rungs, each charge -> clip -> ruling; each ruling beats the last by a named property; #1 earns the hook's promise | Podium Pop default |
| `countdown-with-stake` | as above, plus the Judge's running stake ("I have never given a 10") paid at #1 | Podium Pop alternate |
| `micro-story` | normal -> turn -> peak -> meaning, only the speaker's words | Mission Voices default |
| `claim-and-reason` | the speaker's bold claim first, then why, then the consequence | Mission Voices alternate |
| `problem-ladder` | requirement -> why it is hard -> fix 1 and its cost -> problem caused by fix 1 -> fix 2 -> result | Way It Was Made default |
| `why-didnt-they` | the obvious solution -> why it fails -> what they really did (named hardware only) | Way It Was Made alternate |
| `escalating-challenge` | 3 rounds: quick win -> doubt (debatable but fair) -> fair trap; score ask over the last reveal | quiz-ar (only structure) |
| `wrong-answer-first` | outcome as a question -> the common belief -> but -> mechanism with one analogy -> demo on the opening case -> consequence | Tech default |
| `qa-preview` | question -> partial answer by 50% -> full mechanism -> consequence | Tech alternate |
| `help-the-character` | small problem -> try 1 with a question and a pause -> try 2 fails funny, viewer corrects -> apply -> praise | Sunny Hill (only structure) |
Owner-study structures not used for our formats: before/after, underdog arc, tutorial, versus. They may be proposed by trend-hunter for a new format, not grafted onto these.

## Per-channel story templates
| Brand | Structure | Length (owner) | Spine template | Mid-payoff | Ending type | Talk trigger (honest) |
|---|---|---|---|---|---|---|
| Podium Pop | verdict-countdown | 30-45 s (GOAL-15) | "Five [subject] moments, but only one beats [bar], therefore #1 is [named outcome]" | #2 reveal at 60-80%, the Judge hesitates | #1 picture + verdict line that re-reads the hook; debate overlay on #1 | debate-form ask on #1 (SR4/QA4) + F12 agree/disagree ask at 35-65% |
| Mission Voices | micro-story | 25-35 s or 40-50 s (goal-28) | "[Speaker] expected X, but Y happened, therefore they felt/learned Z" | the turn line at 35-55% | speaker's awe/emotional last line (QA3), goal-28 CTA on the 3.0 s end hold | goal-28 CTA family, worded as pick-a-side with a reason |
| Way It Was Made | problem-ladder | 30-45 s, max 55 s (goal-26) | "[Machine] had to do X, but Y made it impossible, therefore engineers Z" | fix 1 lands and creates problem 2, 35-55% | callback line to the opening number/question; goal-26 CTA overlay in body | none spoken (SR4); `pinned_fact` carries the retell |
| quiz-ar | escalating-challenge | 25-28 s (SR2) | "Three [object] rounds, each harder, but the last one fools most, therefore you check your score" | round-2 reveal at 60-80% | score ask over the last reveal, tail ≤ 1.5 s (SR3) | numeric self-score «كم جبت من ٣؟» + object-worded send line |
| Tech Made Simple | wrong-answer-first | 35-40 s, max 45 (TECH-R2) | "You think X causes [surprise], but really Y, therefore Z" | first half of the mechanism by 50% | return to frame-0 composition + opening question restated as a statement | reply prompt in the body ("did yours do this?", TECH-R4) |
| Sunny Hill | help-the-character | 2:30-3:00 total (series bible) | "Pip wants X, but can't until they learn Y, therefore together they Z" | try 2 / viewer correction at ~50% of body | praise + callback to the opening question, then the kit ending | none (Made for Kids); parent retell = one try-at-home idea |

## Beat sheets (seconds; scale to the actual runtime; owner and learned rules in brackets)
**Podium Pop, 36 s** [GOAL-15 30-45 s; QA2 entry 2 starts ≤ 5 s, no setup line; F12 ask 35-65%; 0.6-1.0 s silent beat after each reveal; post-#1 tail ≤ 3 s]
- 0-1 HOOK: #1 glimpse in motion + first line (hook-architect; title card at 0 s stays until O1).
- 1-5 #5 STEP: clip in motion, one ruling line AFTER the action lands; the ruling sets the bar ("Bar: one bounce.").
- 5-12 #4 TURN: transition line names a new property ("Decent. But he did it blindfolded."); different kind of absurd, not "same but bigger".
- 12-21 #3 TURN: break the pattern once (benign violation or reaction); F12 spoken ask woven here (~14-20 s).
- 21.5-29 #2 MID-PAY (`mid_payoff_ts` ≈ 22 s, 61%): a near-#1; the Judge hesitates: "No. Watch the next."
- 29-31 pre-reveal hold (0.2-0.4 s) + ~0.3 s bed drop.
- 31-36 #1 RESOLVE/PEAK (`payoff_ts` ≈ 31.5 s, 87%): longest clip, silent beat, slow-mo replay of the key beat, verdict line (MEANING) that re-reads the hook, debate overlay on the #1 picture, end on the #1 picture.
Line rules: each transition adds a new property (distance -> difficulty -> risk -> surprise); the ranking reason in ≤ 8 words; never the same intro twice; #1 must be visibly strongest (pick sets with a real escalation or change the criterion); joke quality belongs to punchline-critic.

**Mission Voices, 30 s single beat** [goal-28 R1; clipping QA1 first word ≤ 0.3 s = the key line; QA3 awe last line; CTA overlay 1.5-2.0 s over live picture, O-B1]
- 0-3 HOOK: the speaker's strongest clause, frame 0 mid-sentence; lower third (name, mission) after the first sound.
- 3-8 GROUND: the speaker sets the scene in their own words (no list or jargon before 10 s, QA2).
- 8-15 TURN: what went wrong or what they did not expect; cut-in footage only where the speaker names it.
- 15-23 PEAK/RESOLVE (`payoff_ts` 18-24 s, 60-80%): the emotional core uncut; keep the 0.5-1 s breath.
- 23-27 MEANING: the speaker's awe/emotional last line, ending on a sentence end.
- 27-30 goal-28 CTA as a 1.5-2.0 s overlay over the live last picture (owner 2026-11-08: no frozen hold; "pick a side and say why" wording replaces YES/NO, O-S3).
40-50 s full arc: add a second TURN at ~22 s only if the speaker truly has one. Never paraphrase, never stack 3 quotes, never two emotional peaks.

**The Way It Was Made, 38 s** [goal-26 30-45 s; SR1 machine moving at 0; SR2 number/stake first, no date/place before 10 s; SR4 no spoken comment ask]
- 0-3 HOOK: named machine moving at scale + the number that sounds wrong.
- 3-9 GROUND/WANT: what it had to do, with a number.
- 9-16 TURN: why ordinary solutions fail ("But the ground would crack.").
- 16-24 STEP/MID-PAY: fix 1, named part on screen, and its cost; it creates problem 2 (the ladder, not a list).
- 24-31 PEAK/RESOLVE (`payoff_ts` 23-30 s): the answer shot, longest uninterrupted shot, narrator silent 1-2 s.
- 31-36 STEP: the result with one hard fact (dates allowed now).
- 36-38 MEANING/SEAM: callback line that reframes the opening number; goal-26 CTA overlay inside the body or on the final picture.
Sentences start with the consequence word (so / but / because); labels match the picture (CGI ≠ footage, generic ≠ named).

**شو شايف؟ quiz-ar, 27 s** [SR1-SR6; hook_intro 2 s; 3 rounds incl. one B&W colour-find; SR4 trap last + one debatable round]
- 0-2 HOOK: hook_intro spoken motion scene, object moving by 1.0 s; never a rule/round-count/score/ego line.
- 2-9 R1 STEP: quick win; reveal ~8 s with the signature sound mark.
- 9-17 R2 TURN (`mid_payoff_ts` ≈ 16.5 s, 61%): the debatable-but-fair round; reveal line "you thought X, but Y" in ≤ 6 words.
- 17-25.5 R3 PEAK/RESOLVE (`payoff_ts` ≈ 24.5 s, 91%): the fair trap; shuffle ~0.4 s; held reveal.
- 24.5-26 TALK/SEAM: score ask spoken over the last reveal, send line on screen, tail ≤ 1.5 s.
The current format is the control (best channel): change it only through learning tests. Vary the reveal animation, keep the logic.

**Tech Made Simple, 38 s** [TECH-R1-R4; mechanism moving at frame 0; no named brand exception to H8]
- 0-3 HOOK: the surprise as a question, mechanism already moving.
- 3-8 GROUND: the wrong answer everyone holds, shown as a visual (the viewer now has an expectation to break).
- 8-13 TURN: "But that's not it": the real constraint in one sentence.
- 13-24 STEP/MID-PAY: mechanism with ONE analogy mapped 1:1 on screen; the first half of the answer lands by ~19 s.
- 24-31 PEAK/RESOLVE (`payoff_ts` 23-30 s): demo on the opening example; the aha.
- 31-36 MEANING/TALK: "So the fix isn't X. It's Y." + the reply prompt in the body.
- 36-38 SEAM: frame-0 composition returns with the opening question.
Max 2 new terms per video; no definition opener; no three analogies.

**Sunny Hill, 170 s total** [series bible; kit opening ~8.5 s and ending ~26 s are kit-owned; kids SR1-SR4; O5 pending]
- 0-5 HOOK: payoff action as cold open + Tiko names the goal in one line (SR1; log cold-open vs inside-opening choice).
- 5-13.5 kit series opening (unchanged).
- 13.5-40 GROUND/TURN: Pip wants X and cannot; a pointable task asked (SR2: by 0:05 of the body); no song or recap before 0:30.
- 40-75 STEP: try 1 teaches the concept; question + visible pause ≥ 2 s + answer; key word in 3 contexts.
- 75-105 TURN/MID-PAY: try 2 fails funny; Tiko gets it wrong so the child can correct him.
- 105-125 PEAK/RESOLVE (`payoff_ts` 102-136 s, 60-80%): they apply the concept; refrain with the learning word.
- 125-144 MEANING: praise + 3-beat recap with the earlier visuals + callback to the opening question.
- 144-170 kit ending (recap song, next time, the one grown-up ask).
One concept per episode; repeat before extend; calm edits, no montage; no startle, fear, pressure or cliffhanger.

## Line rules (all brands)
- One idea per sentence; ≤ 12 spoken words (kids ≤ 8); numbers written as spoken.
- No sentence starts "And then", "Next", "Also", "Here is", "So today"; transitions are a "but" or a "therefore".
- Narration never restates the visible action; it adds a reason, a number, a stake or a joke.
- Each unit gets a new line shape; never the same intro or reveal sentence twice in one video.
- The ranking/answer reason is ≤ 8 words. Claims are downgraded to what the footage proves ("almost", "one of").
- The talk trigger is a question the video cannot fully settle, or a score the viewer can state.

## Anti-patterns (script-doctor rejects; QA flags as `story S<n>`)
Five unrelated entries with numbers (S3) · a fake or weak #1 (S4) · the intro restarted mid-video (S4) · decorative "wait for it" re-hooks with no new info (S4) · a one-line answer held to the end (S5) · two peaks or narration over the peak (S6) · a definition or date/place opener (S7, brand rules) · adjectives instead of a number or name (S7) · a hard stop with no meaning, or a lecture after the payoff (S8) · closed YES/NO comment card, "send this to X" card with nothing in the video to send, bait (S9) · a script that only fits by speeding the voice (S10) · a structure from another format glued on (two-axis model).

## Record: `productions/<id>/story.json` (story-architect writes; script-doctor fills `forecast`)
```json
{ "production_id": "…", "brand": "viral-rankings", "subject_category": "football-stunt", "structure": "verdict-countdown",
  "spine": "Five keeper moments, and each looks impossible, but only one stops a penalty with his face, therefore #1 is the face save.",
  "payoff": "copy of hook.json.what_the_payoff_is", "runtime_target_s": 36, "payoff_ts": 31.5, "mid_payoff_ts": 22.0, "peak_t": 32.0,
  "beats": [ { "id": "b1", "t_start": 0.0, "t_end": 1.0, "job": "HOOK", "line_or_visual": "#1 glimpse + first line", "new_info": "a keeper vs a penalty", "link": null },
             { "id": "b2", "t_start": 1.0, "t_end": 5.0, "job": "STEP", "line_or_visual": "Bar: one hand.", "new_info": "the bar", "link": "therefore" } ],
  "open_loops": [ { "q": "which save is #1?", "opened_t": 0.0, "paid_t": 31.5 } ],
  "ending_type": "reframe|callback|consequence|split_sentence|score_ask|warm_resolve", "ending_line": "…",
  "comment_trigger": { "type": "pick_side|self_score|debate|reply_prompt|none", "text": "…", "t": 33.0 },
  "send_reason": "fan sends to the friend who rates keepers as boring, because #1 ends that argument",
  "owner_rules_applied": ["GOAL-15 F12", "viral-rankings QA2"], "forecast": null }
```
`beats[0].link` is null; every later beat is `but` or `therefore`. `payoff_ts`, `mid_payoff_ts` and `send_reason` are copied from `hook.json` (never changed here). `forecast` = `{score, verdict, items[{key, got, max, note}], caps[]}` from `docs/viral-check.md`, written by script-doctor.

## Who runs what
| Step | Agent | Reads | Writes |
|---|---|---|---|
| idea | trend-hunter | brand row above | `story_potential` (recognisable subject + the natural spine) in the idea sidecar |
| draft brief | showrunner / director | goal docs, learning | draft `brief.json` (moments, timestamps) |
| hook | hook-architect | hook playbook | `hook.json` |
| story | story-architect (once per video) | this page, `hook.json`, draft brief | `story.json` (no final words) |
| words | script-localization / comedy-voice-writer / showrunner (quiz-ar, tech, kids) | `story.json`, `hook.json` | `script.json` (narration ids map to beat ids) |
| critic | script-doctor (+ punchline-critic for Podium Pop jokes, persona-keeper for Podium Pop / quiz-ar) | this page, viral-check forecast | `script-doctor.json`, `story.json.forecast` |
| render QA | qa-director | render, `story.json` | `story S<n>` issues in the review, `qa/viral.json` |
| results | growth-director | hook-log, analytics | viral score vs 7-day views calibration rows |
