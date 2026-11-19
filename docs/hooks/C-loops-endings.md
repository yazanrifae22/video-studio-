# C. Loops and endings that never feel finished

Round 3, 2026-11-03. Scope: seams, rewatch triggers, nested loops, payoff placement, dead tails, series hooks, loop metrics. (A = spoken/text open questions, B = frame 0 visuals: not covered here.)
Tags: `[can]` = renderer does it today. `[needs-eng: x]` = needs pipeline work first.
Timeline facts used: fps 30 (`fps: 30` in builders), 1 s = 30 f. Keyframes `{frame,value,easing}` on opacity/scale/x/y/volume, item-local frames, easing on the LEFT key. Fades are linear, in frames. Audio tracks sum. `srcStartFrame` trims into a source. No masks, rotation, speed ramps, EQ.

## Sources (all new to the council, one line each)
1. https://virvid.ai/blog/looping-structure-shorts-retention-2026 - keep Shorts under ~20-25 s to loop, CTA out of the video (3 s of CTA in 20 s = ~15% dead tail), no black frame, no final musical note, write the ending first. Creator blog, no measured data.
2. https://www.influencers-time.com/loop-optimized-reels-the-seamless-cut-that-boosts-rewatch-ra/ - 6-12 s gives the highest rewatch; match final frame composition, motion direction and colour to frame 0; put the strongest audio beat on the seam; storyboard backwards from frame 1; rushed export adds a black frame.
3. https://joyspace.ai/looping-hack-trick-algorithm-double-views - split-sentence loop (second half of line opens the video, first half closes it), "did you catch that" flash detail, strip silence before first and after last word; example retention 85% -> 115% (illustrative); warns that "watch this again!" feels forced and that loops cheapen emotional moments.
4. https://slidycreator.com/blog/what-is-looping-video/ - five loop types (transformation, mesmerizing motion, reveal, educational, cliffhanger); cut speech mid-word at the seam; make video length equal the audio loop length; duplicate the first 2-3 frames at the end plus a crossfade (the editor recipe); 10 s watched 14 s = 1.4 replays.
5. https://air.io/en/youtube-hacks/what-do-viral-youtube-shorts-analytics-look-like-real-life-cases - viral Shorts are not longer, their watch time is above 30 s because of replays; tactics: half-finished tease, Easter eggs that change per pass. No per-case numbers (treat as anecdote).
6. https://1of10.com/blog/youtube-shorts-analytics/ - APV over 100% = loop marker; since 2025-03-31 every play or replay counts as a view; community ranges for under 35 s: APV 80-90 working, 90+ strong; compare to own baseline.
7. https://prepublish.ai/blog/viewed-vs-swiped-away-youtube-shorts - quotes YouTube's definitions: "Stayed to watch" measures only the first seconds; APV counts only those who stayed; engaged views exclude loops; no official benchmarks, use median of last 10-20 Shorts in the same length band.
8. https://www.influencers-time.com/multi-part-cliffhanger-series-scripting-the-comeback-view/ - series recipe: resolve the previous question before opening a new one, 5-7 s recap, 3-5 part pilot arc, cold open that works for drop-ins; a cliffhanger alone raises arousal but not enjoyment or return intent (as the page cites it; original study not verified).
9. https://blog.hubspot.com/marketing/psychology-hacks-for-making-engaging-videos - one creator's test: Zeigarnik-style open-loop videos converted 1 in 7 viewers to followers vs 1 in 13 without. Single anecdote, uncontrolled.
10. https://www.renascence.io/behavioral-biases/zeigarnik-effect - Zeigarnik effect summary: interrupted tasks are remembered better. Supports the idea, not a retention proof.
11. https://www.shortimize.com/blog/compare-watch-time-tiktok-vs-reels-vs-shorts - cross-platform watch-time comparison; use only as context for "benchmark against your own median".
Caution: all are creator/marketing sites; none is platform documentation. The numbers are hypotheses to test with our own `data/learning/<brand>.json`, not rules. Unofficial "rewatch = 10 points" claims were rejected as speculation.

## Global rules for every mechanism in this file
- Honest means the ending delivers what frame 0 and the title promised. A loop is a second look at something true, never a way to hide that nothing happened.
- Max one loop device per video plus one hidden detail. More reads as a trick.
- Loop only videos <= 30 s. Over 35 s the seam stops feeling natural (sources 1, 3). TWIWM compilations (long) use M6 and M7 instead of M1.
- CTA/subscribe goes in the caption or the pinned comment, never as an end card (source 1, 2). Existing owner rule for Podium Pop (subscribe/like animation) stays as an in-body animation placed at 40-60%, not at the end.

## Catalogue

### M1. Seamless seam (audio + picture flow into frame 0)
What: the last frame and last sound are a continuation of frame 0, so the platform's auto-replay feels like the video keeps going.
Why: sources 1, 2, 4, 6 (APV over 100% is the loop signal).
Recipe `[can]`:
1. Final item ends exactly on the last frame, no `fadeOutFrames` on video, text or the music bed. No black or empty tail: the last 6 frames must contain picture.
2. Make the end state the start state: if frame 0 is "scale 1.00, x 0", the last 12 frames drift toward the same pose (scale keyframes `[{f:end-12,v:1.06,easing:'easeIn'},{f:end,v:1.00}]`), or frame 0 starts at the end pose and settles: item-local keyframes on the first item `scale [{0:1.08},{9:1.00,'easeOut'}]`, `x [{0:-2},{9:0,'easeOut'}]` (values in % of canvas). Settle in 6-9 f (0.2-0.3 s). Pick whichever matches the last frame, then verify by extracting the last frame and frame 0 as PNGs and diffing (SSIM > 0.9 on the main subject).
3. Audio bed: use a bed whose length is a whole number of bars (e.g. 4 bars at 120 bpm = 8.0 s = 240 f) so the beat phase restarts correctly; trim `srcStartFrame` so the bed starts on a downbeat and ends one beat before the downbeat. Do not use fadeIn on the bed at frame 0 and no fadeOut at the end.
4. Self-crossfade tail (for pad/drone beds): add a second audio item on its own audio track, the same bed starting at `srcStartFrame: 0`, `fromFrame: end-9`, `durationInFrames: 9`, `fadeInFrames: 9`, and fade the main bed out over the same last 9 frames (`fadeOutFrames: 9`, or volume keyframes 1 -> 0 linear). Net: the tail ramps into what the head plays, crossfade 9 f = 0.30 s. For beat beds use 4 f (0.13 s) or none.
5. Voice: cut the first word at frame 0 with no pre-roll and trim trailing silence to <= 2 f. Do not fade voice at either end.
`[needs-eng: true seam preview]` a `render:timeline --loop 2` option that renders end+start back to back would let QA watch the seam; today do it by hand with ffmpeg concat of two copies of `render.mp4`, watch seconds `dur-2 .. dur+2`.
Failure: any silence or black frame > 1 f at the seam; a final musical "stinger"; a subject that jumps position.
Honesty test: does the video still make sense on first play (seam is invisible, not a puzzle)? Prevent bait: seam is a polish, the first viewing must be complete without it.
Examples: Podium Pop - the last replay of the stunt ends with the player mid-air, frame 0 is the same player mid-air before the run-up (needs matching crop, the pose cut is what matters). Mission Voices - ends on the soft word of the astronaut's sentence, bed continues into the first card. TWIWM - skip (long). quiz-ar - the last round's «؟» box is the same box that opens round 1. Tiko & Pip - skip: kids content ends warmly (see M7).

### M2. Split-sentence loop
What: one sentence broken across the seam: the video starts on the second half, the last line is the first half.
Why: source 3 (technique), source 4 (cut speech so the restart is not obvious).
Recipe `[can]`: write the sentence first, e.g. "...and that is why nobody ever [END]" / "[START] saw the second one." Final TTS clip ends on the unfinished clause with falling-to-open intonation; frame 0 text card shows the missing second half as a caption at f0-f12 so silent viewers read it too. The captions for the last line end with an em dash, the opening caption begins in lowercase. The spoken start sits at frame 0 + 0..2 f.
Failure: confusing first play (viewer hears half a sentence and swipes). The start half must work as a hook on its own (see section A); the end half must still read as a satisfying last beat.
Honesty test: the sentence must be literally true when joined; the join must not imply a result the video does not show. Do not use for emotional moments (source 3: loops cheapen them), so never for Mission Voices speeches with real astronauts, and never for Tiko & Pip.
Examples: Podium Pop - "...and the goalkeeper still couldn't" / "reach it" (comedy). quiz-ar - Syrian dialect, «شو شايف بهالصورة... ما حدا» / «لقى الجواب من أول مرة»: join must be true across rounds; check with the Arabic captions (RTL) that the split sits on a word boundary. TWIWM/Mission Voices - not used.

### M3. Hidden detail + rewatch prompt ("did you catch it?")
What: a small real element is placed in the video, and the viewer is told once that there is one.
Why: sources 3, 5 (Easter eggs; changing detail each pass).
Recipe `[can]`: place a 4-8 f text or image item (opacity 1, fits in 0.13-0.27 s) at 25-40% of the runtime, size in the safe zone, high contrast so it is findable on a second look. Prompt text at 70-85% on the lower third for 20 f: "Spot the [thing]?" (not "Watch again!", source 3). The same detail appears in the answer frame so the viewer can verify. Log it in `enhancements.json` with its timestamp.
`[needs-eng: speed ramp / freeze-frame]` for slowing the detail; use a 10-frame hold on the nearest frame by duplicating the item with srcStartFrame equal on both ends instead (`[can]`).
Failure: detail too hard to see (rage) or too obvious (no rewatch); prompt shouting.
Honesty test: the detail must exist and be findable in 3 replays at 360 px; no fake "there's something hidden" without anything. Prevent: QA frame-checks the timestamp.
Examples: Podium Pop - a second ball/number on a jersey in rank 3 replay. Mission Voices - a patch or tool visible in the background of the cabin. TWIWM - a part number or a person who appears in two archive clips. quiz-ar - for the puzzle, the answer tile shows the very feature that was in frame 0 at 0.4 s (fair clue, per quiz fairness rule). Tiko & Pip - Pip's hat appears in one scene of every episode; the end says "did you see Pip's hat?" gently, no pressure.

### M4. Nested open loops with a payoff at 60-80%
What: three layers: L1 (promise) opened in 0-3 s and paid at 85-100%; L2 opened at 15-30% and paid at 60-80%; L3 a micro-question opened and paid inside a beat. Always one open at any time.
Why: sources 8, 9, 10 (open loops are plausible but weakly evidenced; payoff quality decides return). Source 8: never open a new gap before paying the last.
Recipe `[can]` for a 30-45 s video (30 fps):
- 0 s: L1 premise (hook, section A).
- ~5-8 s: L2 question ("and the third one isn't a goal").
- 12-24 s: L3 micro-loops every 6-8 s (counts of ranks, a countdown element), each paid within 6 s.
- at 60-80% (e.g. 21-28 s of 35): pay L2 and give a visible beat of 12-18 f (0.4-0.6 s) of silence or picture hold on the payoff, then immediately open L4 = "but this is not the biggest one" only if L1 is still unpaid.
- L1 paid on the final 10-18 f of picture.
Failure: all loops pay at the same time (viewer feels done at 70%); an invented L4 added only to stall.
Honesty test: write the claim->payoff table in `script.json` (existing claim->evidence rule): every open question has a timestamp where it is answered; if a loop has no payoff row, delete it.
Examples: Podium Pop TOP 5 - rank 5 pays L3 of "who tops the list"; #2 pays L2 ("the one that broke the crossbar"); #1 pays L1. Mission Voices - L2 = what the astronaut says he feared; paid at 70%; L1 = the call back home, paid at the end. TWIWM - each hardware item pays the previous item's question ("why did they cut the budget"). quiz-ar - round N's hint pays at round N+1's answer. Tiko & Pip - one gentle question per scene, answered in the same scene (no cliffhanger).

### M5. End on the payoff, not after it
What: the last frame of the video is the payoff beat, with no wrap-up.
Why: sources 1, 2 (outro cards and goodbyes replace the loop with an exit).
Recipe `[can]`: put the final payoff item's end at the video's last frame; trailing hold <= 12 f (0.4 s) after the last spoken/visual payoff word; remove "thanks for watching", the logo card, the subscribe card, end cards. Existing builder end CTA rule (Mission Voices unique end CTA text) -> move the CTA to the middle (40-60%, as an in-body line) or to caption text; if the CTA must stay on screen it is a text item over the payoff picture during its last 20 f, never a separate card. Audio: the last sound is the payoff sound itself (laugh, impact, word), no ring-out > 6 f.
Dead-tail check `[can]`: run a script that reads `timeline.json`, finds the last item with a visible picture change and warns if `durationInFrames - lastChangeEnd > 12`; today do it by hand with ffmpeg `silencedetect` and `freezedetect` on the last 1.5 s.
Failure: payoff too early so 15% of the video is left, or an abrupt cut that feels like a render bug (fix: keep the sound hit on the last frame).
Honesty test: does the last beat answer what the title/hook promised? If the title promised "number 1" the last frame must show it.
Examples: Podium Pop - cut on the #1 reaction. Mission Voices - ends on the last word, no card. TWIWM - ends on the final hardware frame with the name label. quiz-ar - ends on the answer reveal and the loop seam into the next question's «؟». Tiko & Pip - ends on a warm resolved beat, 1 s hold allowed.

### M6. Next-video hook that is not an end card
What: the series hook is a callback line inside the video body, so there is no outro.
Why: source 8 (payoff first, continuation cues, drop-in friendly).
Recipe `[can]`: at 70-85% add a 20-30 f text item "#2 is in the next one: [specific thing]" only when the next video exists (named in the publish plan); show the series number as a small persistent pill in the top-left for the whole video (`bgEnabled`, `bgBlur`). Recap for a Part 2 is 5-7 s max (150-210 f) and must also work for someone who did not see Part 1.
Failure: promising a next part that does not exist; stretching thin material over parts.
Honesty test: the next video is already scheduled in the plan before the hook is added; a part must stand alone.
Examples: Podium Pop - "next up: the one with a bicycle kick". Mission Voices - uses the unique-CTA slot: "the call from orbit continues" only with a real Part 2. TWIWM - "the same factory's other machine" naming the real hardware. quiz-ar - «الجولة الجاية أصعب» is not a loop; use a real numbered set «الجزء ٢». Tiko & Pip - "next time: the lighthouse" as a gentle wish, no cliffhanger, no guilt.

### M7. Long-form body loop (TWIWM and videos over 35 s)
What: instead of a seam loop, the video restarts the viewer's interest at 50% and ends with a callback to the hook.
Why: sources 1, 3 (loops rarely work over 35-60 s); source 5 (viral Shorts rewatch comes from short runtime).
Recipe `[can]`: callback line in the last 3 s that repeats one concrete word from the hook (source 1); no frame-0 match; keep audio bed continuous to the last frame.
Honesty test: callback must be a real echo, not a fake twist.

## Measuring loops (add to the learning loop)
Sources 6, 7, 1, 4.
- Metrics per video: APV (YouTube Studio, "Average percentage viewed"), Stayed to watch %, retention curve tail, views vs engaged views. APV over 100% = replays (source 4: 10 s video averaging 14 s = 1.4 replays).
- Loop success = retention graph tail flat or rising, not falling, at the last 10% (source 1) and APV >= 100% for videos under 20 s. For 20-35 s expect APV 80-95%; do not call it failed.
- Never use the circulating thresholds as gates (they are unofficial, sources 1, 6, 7). Compare to the median of the brand's last 10-20 videos in the same length band, as source 7 says.
- Record in `productions/<id>/enhancements.json`: `{device:"M1|M2|M3|M4|M5|M6", at_s, seam_ssim, silence_ms_at_seam}` so the next learning pull (`data/learning/<brand>.json`) can correlate device -> APV. Needs 3+ videos per device before any conclusion.
- Hook A/B: do not change hook and loop in the same video.
- Facebook/TikTok loops: replays exist as "loops/rewatches" in their insights, same method, no thresholds.

## QA checks to add (cheap)
1. Seam test: concat two copies, listen and watch `dur-2..dur+2`; no black frame, no silence > 33 ms (1 f), no pop. `[can]` with ffmpeg by hand.
2. Last-frame SSIM vs frame 0 > 0.9 on subject for M1 videos.
3. Dead tail <= 12 f; no end card, no "thanks/subscribe" in the final 3 s text items.
4. Every open loop has a payoff row; the payoff of L2 lies at 60-80% (+-5%).
5. Hidden detail verified at its timestamp at 360 px.

## Open engineering asks (pipeline engineer, not blocking)
- `[needs-eng: loop preview]` `render:timeline --loop-preview` that appends the first 2 s after the end.
- `[needs-eng: dead-tail lint]` in prelint: last 12 f activity, silence at seam, black frame at seam.
- `[needs-eng: audio equal-power crossfade]` fades are linear (-3 dB dip in the middle for uncorrelated audio); for beds the 9 f overlap is short enough that the dip is not audible, longer ones need an equal-power curve.
