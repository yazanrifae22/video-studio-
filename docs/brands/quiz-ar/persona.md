# Persona sheet: «شو شايف؟» (quiz-ar), v1 2026-11-03

Mandatory input for every quiz-ar script (council 2026-11-03). Light by design: it must never slow or block the first 3 s.
Data rules that win over this sheet: SR1 (no rule/round-count/score/ego opener), SR3 (score ask spoken over the last reveal, no outro card), SR2 (25-28 s), fairness (every answer deducible on screen).

## Who
**The cheeky Syrian quiz host (working name «الشايف»)**: a warm, quick-witted voice that bets you will miss the detail, then shows you the clue was on screen the whole time. Teases the puzzle, never the person. Loses gracefully when the viewer wins ("طلعت أشطر مني").
One-line intro every video (99.4% of viewers are new): the host is introduced by the first bit below inside round 1, not as a banner.

## Voice
- TTS: the existing brand voice, Gemini Zephyr, Levantine/Syrian style (same as the hook line; see hooks.md). No new voice, no pitch tricks.
- Pace: <= 2.7 words/s, brisk, smile in the voice; short sentences; tashkeel on ambiguous words.
- Dialect: Syrian only (شو، هلق، ليش، هيك، شايف، بدك، يلا). No MSA lecture tone, no Gulf/Egyptian words.
- Says (3): «شو شايف؟» (what do you see?) · «يلا ركّز» (come on, focus) · «شفتها؟» (did you spot it?)
- Never says (3): «حدسك/حاسّتك» (no intuition claims) · «٩٥٪ ما بيعرفوا» (no fake stats) · «بس الأذكيا» (no ego bait)

## Two recurring bits
1. **Catch-phrase «شو شايف؟»**: the host asks it once at the start of round 1 over the live puzzle (about the object, e.g. «شو شايف؟ وين الوردية؟»), then once at the final reveal as «شو، شفتها؟». Always <= 1 s. It is also the channel name, so it doubles as the one-line intro.
2. **The host's bet**: on the last (trap) round the host says «براهن بتقول سهل» (bet you'll say easy) before the countdown; at the reveal either «قلتلك» (told you, when the trap works) or «طلعت أشطر مني» (when it is fair and easy). Same two answers every video, so viewers learn to predict it. Needs the near-miss to be provably fair at 360 px.

## Signature sound mark (<= 0.5 s)
**The "شايف" ding**: the existing synthesized reveal ding played as a rising two-note shimmer (about 0.4 s), always at the correct-answer flash of every round, right after the ~0.3 s bed drop before the reveal. Same notes in every video. Logged in the cut list; max 3 simultaneous sounds.

## Viewer label
«يا شاطر» (hey sharp one), once per video max, on a won round or the score ask. Never «يا غبي»-type teasing, never a group label for "fans".

## Signature ending / loop seam
No outro card. Over the last reveal (<= 1.5 s): «كم جبت؟ اكتبها بالتعليقات» (how many did you get? write it below), optionally with the send line from showrunner Council rules («ابعتها لصاحبك اللي بيقول سهل»). The last reveal's ding and frame flow straight into frame 0, whose first line is again «شو شايف؟» so the loop reads as the next bet.

## Owner 2026-11-08 overrides
- **Big hook line:** the opener may be a bank line from `hook-lines.md` (spoken + huge type in the hook_intro). It counts as the visual command of the first 3 s; it talks about the test waking the brain, never about the viewer being dumb. The «شو شايف؟» catch-phrase then moves to round 1's question.
- **End open question:** the signature ending keeps the spoken «كم جبت؟ اكتبها بالتعليقات» and adds one on-screen open question from `end-questions.md` in the same final beat (not spoken, no extra outro).
- **Owner 2026-11-08 OPEN final round (alternative to the SR3 score ask):** the LAST puzzle round may be `"open": true` (a real puzzle - counting, shell_game, odd-one-out, spot_difference... - whose answer is NEVER revealed; no a_line / explanation_ar / end_question). After its countdown the video ends on a closing ask from `docs/brands/quiz-ar/open-endings.md` (OE01-OE15) as `post_lines` (spoken + big on-screen), then loops to frame 0; keep `params.answer` in quiz.json (pinned comment + puzzle-judge). Owner wants it on most videos, mixing with the score-ask ending. This is an owner override of the "no write-in bait" rule for the open-ending bank ONLY; `comments-draft.py` writes the pinned answer + first-hour reply. See templates.md "Open final round".

## Never
- Pressure, guilt, loneliness or "only true fans" mechanics; no "if you don't subscribe"; no fake intimacy («أنا بحبك»-type).
- No persona beat longer than 1.5 s. No persona beat in the first 3 s unless it IS the hook (the object-focused «شو شايف؟» command is allowed there).
- No rule, round-count, score or ego opener (SR1). No spoken outro beyond the SR3 ask.
- **Owner 2026-11-08 (hook source + override of the opening rules):** new quiz-ar videos ALWAYS use a hook line from `docs/brands/quiz-ar/hook-bank-owner.md` (SV Savage / SM Smart / FN Funny / SC Scientific; `quiz.json` `hook_line.id` = that id, onscreen_ar = the bank text; rotate personas, never repeat inside a batch; no promise-the-solution lines on open-ending videos). Owner override of SR1 / persona opening bans (ego, challenge, hurry) for these lines only; banned openers still apply to non-bank lines. Bank lines run ~2.5-4 s (hook_intro cap 4.0 s). HL01-HL32 in hook-lines.md are history / old productions.
- No claims about the viewer's intuition, personality or intelligence; the brand is observation.
- Never at the cost of the first 3 s, of fairness, or of the 25-28 s length.

## Per-video persona budget
1 catch-phrase at open + 1 bet line before the last round + 1 reveal reaction + the ending ask = max ~4 short beats, each <= 1.5 s, in different 5-8 s windows. Viewer label 0-1 times.

## Success test (growth-director reads it)
After 10 videos with this sheet vs the 10 before: returning-viewer % and subs per 1K views (baseline 1.5, lifetime, Studio 2026-11-03; 99.4% new viewers). Also watch stayed-to-watch (baseline 61.7%): must not drop. Flat or lower -> rewrite the sheet or drop it.

## Learned constraints (data/learning/quiz-ar.json, quiz-ar SR1/SR3/SR4, 2026-11-03)
- Persona beats stay <= 1.5 s and out of the first 3 s unless they ARE the visual command (quiz-ar SR1). The "host's bet" doubles as the trap round (quiz-ar SR4, 21 "too easy" comments).
- The ending ask is the only outro (quiz-ar SR3); optional variants to test: «أي جولة خسرتك؟» (C3.2), «بدك أصعب؟ اكتب أصعب» (C3.13).
- Owner rules win: faster shuffles (~0.4 s), memory flashes fast, Syrian dialect. "More time" comments (3) are not acted on.
