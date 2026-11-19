# LAB "Paper" run of 20 — stage briefs (owner order 2026-11-17)

The orchestrator spawns ONE fresh agent per stage and names the stage + slate number `n` + production id.
Every agent: read `RUNBOOK.md` (same folder) first, then only what its stage lists. Windows box: `python` never `python3`,
`open(..., encoding="utf8")`. Never commit, push, upload, publish, delete, or touch other productions. Never write any
AI-generation wording anywhere. Final report to the orchestrator: **max 10 lines**, no logs, no pasted files.
Run every command from `E:\clips-viral`, in the FOREGROUND with a timeout (`timeout 300 npx tsx …`); never start background
loops, monitors or watchers and never end your turn to wait for one (three agents hung that way on 2026-11-17).
At the end of every stage append one line to `productions/<id>/run.md`: `<stage> | <date time> | <result> | <files written>`.
The idea for video `n` is entry `n` of `slate-20.json` (same folder). Ledger of the run: `RUN-20.md`.

## S1 — SCRIPT (writer; never builds the picture)
Read: RUNBOOK §1-2, §4, §6; CONTRACT.md; slate entry `n`; `lab.json` + `brief.md` of ONE reference (`productions/quiz-261114-vafk`).
Do: 1) create the production (RUNBOOK §1). 2) `brief.md` (exact puzzle geometry/numbers, beats table, target 20-28 s, bed)
and `draft/proof.txt` (fairness proof: exactly one defensible answer, how to verify it in the render, no leak before the reveal).
3) `lab.json`: Syrian (Damascus) colloquial, written as spoken; first line = the stake/question (no setup, no greeting);
short lines; last line = an open question the comments can answer (not always «كم جبت؟»); `onscreen` strips <= 4 words,
Eastern Arabic digits only. Every line gets `picture`; every think/reveal beat gets `pause_after` + `beat`, so text reviewers see the real timing. 4) `packaging.json` (RUNBOOK §6; run `scripts/ai_text.py check` on every string).
5) `python scripts/fresh-eyes-export.py <id> --out productions/<id>/viewer-text.txt`.
6) voices: `warm.ts <id>` then `ear.ts <id> --blind`; fix wording / retake until every line is heard right (clear >= 4).
Report: id, title, line count, estimated length, ear result, anything you changed from the slate idea and why.
**Script rules that cost rounds on videos 1-2 (write them in from the first draft):**
- By ~2.5 s a stranger knows WHAT the thing is, WHAT the choices are and that it is a bet/dare (object + choices + stake in line 1).
- Nobody states or hints the answer before the proof. Bet window: >= 3 s between "the bet is clear" and the reveal, with the
  puzzle visible; any picture-only pause is FILLED with motion (countdown pad ٣ ٢ ١, ring, push-in), never dead air > 1.5 s.
- Reveal = big, physical, readable (ruler, lift-turn-stack), and the reveal line speaks to the viewer's guess ("if you said …").
- ENDING = a second, UNREVEALED puzzle of the same kind on screen >= 3 s + a one-word comment ask («اكتب حرفك»); its answer
  only in `pinned_comment_draft`. Never ask "what did you pick before the reveal?" and never just "did you get it?".
  The second puzzle must be as fair and as visible at 360 px as the first (difference >= 10 px at 360 wide), proof included.
- Never claim what "most people" see or say. No unexplained character lines (a job title needs a reason in the picture).
- Strips in plain Arabic every Arab viewer reads at once (voice stays Damascus): «على اليمين» not «عاليمين», «تحت الخط» not «أوطى».
- Letter labels are spoken as words («ألف / باء / جيم»). Raw speech <= 21 s; total 24-28 s including pauses and the final hold.
- LENGTH ARITHMETIC (videos 4, 8, 10 came in over): real total = sum of real spoken durations (trimmed takes, or raw x 0.82)
  + every `pause_after` + 0.35 s per line gap. It must be 25-27 s BEFORE the script goes to review; write the sum in the report.
  Payoff (the reveal) by ~12-13 s real; no silent window > 2 s unless the picture is counting or rolling.
- A bet must SOUND like a bet («بقول…», «بتراهن؟»), never a flat statement; when two speakers bet, the reveal shows both
  were wrong (a small X beside each tab) so nobody asks "who was right?".
- Voice takes: accept only when ASR hears the key words of the hook and the answer; `warm.ts --retake <line>=<salt>` re-rolls.
  The Gemini blind listener may be out of quota (empty replies): try once, say so, rely on ASR.

## S2 — SCRIPT CHECK (reviewers; the orchestrator spawns them, they never edit the script)
- `script-doctor`: LAB mode — there is no story.json / hook.json / script.json. Judge `brief.md` + `lab.json` + `viewer-text.txt`
  + slate entry: stake in the first 2 s, every line has a job, no repetition, specificity, promise paid, honest difficulty,
  fairness proof holds (`draft/proof.txt`), read-aloud at TTS speed (`draft/_lines.json` durations), ending = real comment
  trigger, packaging title pays what the video shows. Score the script-stage viral forecast (docs/viral-check.md).
  Write `productions/<id>/script-doctor.json` `{verdict, forecast, round, gap_to_gate[], notes}`. Gate: forecast >= 85.
- Only once forecast >= 85: `fresh-eyes` stage S and `audience-panel` stage S (brand quiz-ar) on `viewer-text.txt` ONLY
  -> `fresh-eyes.script.json`, `panel.script.json`.
- Fixes: ONE batched list to a fresh S1-fix agent (edit lab.json / brief / packaging, re-export, re-warm changed lines,
  write `fix-ledger.json`: every item applied or rejected + reason). Max 3 script rounds; then the orchestrator decides.

## S3 — BUILD (scene builder; never changes the words without telling the orchestrator)
Read: RUNBOOK §2-4; CONTRACT.md; kit README (`data/brand/shu-lab/README.md`); the production's `brief.md`, `lab.json`,
`draft/proof.txt`; skim ONE reference page for structure (`productions/quiz-261114-adqi/page/frame.html`).
Props: load `data/brand/shu-lab/props.css` + `props.js` after the kit tags and USE the ready helpers (README section
"Props (2026-11-17)": ruler/measure, pencil, scissors/snip, shape/cutout/punch, foldSheet/fold, answerStamp, speakerTab/sideStrip,
markerLine/ringAround, hand/press, pad/tear, envelope, box, balance, gears, disc + roll, loopReset; demo `demo/props.html`)
instead of re-drawing them. Missing prop = add it to props.js (additive, documented), not only to the page.
Do: write `page/frame.html` (+ assets inside `page/`); snap stills at 360 px (frame 0, 0.4 s, every beat, last frame) and
`--check-seek`; walk the WHOLE RUNBOOK §4 checklist and fix before building; full build (`--reason`); then look at
`vN/qa/sheet.jpg` + 360 px stills yourself; re-verify the fairness proof by measuring the rendered picture and update
`draft/proof.txt` with the measured numbers. At most 2 builds in this stage. Run one build at a time.
Report: version, length, techqa pass + LUFS, build count, what you checked on the frames, known weak spots (honest).
**Build lessons from the first builds (apply from the first build):**
- The builder ignores `pause_after` / `beat` / `picture`: the page's `plan(durs)` adds the pauses and the picture does what they say.
- Real takes are ~18 % shorter than `draft/_lines.json` raw lengths after trimming: size gaps/holds so the total lands 24-28 s.
- Techqa fails `no_freeze` on a still hold even when thin props move: every hold > 1.5 s needs a camera drift / push-in AND a
  visible change (pulse, tick, mark). No ending hold where only one small mark changes for > 3 s.
- Only ONE `bed` per plan. `snap.mjs` guesses durations: use `build.ts <id> --snap …` for stills with the real cached takes.
- `Lab.speakerTab` default y (1345) can collide with low objects: place tabs explicitly. `markerCircle` cannot follow a tilted
  shape: draw the ring in the page or add a helper to props.js.
- Before a full build check that no other `packages/quizlab/src/build.ts` process is running (wait if one is).
- TEXT BLOCKERS seen on videos 1-2 (the text check fails the video): choice labels the viewer must type (letters, digits,
  يمين/شمال) upright, cap height >= 60 px at 1080 wide, on clean tapes, never crossed by ink, rings, X marks, ruler or pencil
  (fan tapes out with identical leader lines when the choices sit close together); no strip partly outside the canvas while
  readable (enter/exit in <= 3 frames or fade in place; never slide a readable strip across the edge); all text inside the
  safe zone; channel tag «شو شايف؟» >= 54 px font (the text check measures it: >= 18 px tall at 360 px); red words on tan strips need a heavier weight to stay readable at 360 px.
- Reveal marks NEVER touch a choice tape (video 3 repeated video 1's blocker): the stamp lands above/beside the tape row,
  wrong choices are marked beside their tapes or dim; choice digits/letters stay fully readable for the whole video.
- The unrevealed puzzle must be DEDUCIBLE from the picture: hold its clue (layers, start position, geometry) clearly for
  >= 1.2 s, and never ring or highlight something in a way that states a wrong answer (one ringed triangle = "1").
- First story beat (the cut, the swap, the roll) by ~2 s; frame 0 already in motion; the last 1.5 s is a clean hold
  (question + ask + choices fully on screen) until the hard cut to frame 0.
- Countdown pad: its torn ٣ ٢ ١ pages must not fly past or land near the choice tapes (they read as extra options or a
  hint); tear them off away from the choices. A pointing hand / pencil in a final hold must visit every choice with identical
  moves and never rest on one when the video ends (viewers read it as the answer).
- The question strip of the second puzzle is on screen from the second puzzle's FIRST second to the last frame.
- Any tape that carries the REASON or a speaker's bet (e.g. «٥ = عدد فردي», bet tabs) is real text: cream paper, font >= 56 px
  at 1080, on screen >= 1.8 s; speaker tabs >= 44 px and never dimmed to dark-on-dark. Clash / X marks: thick, with a light
  outline when they sit on a vermilion object.
- Packaging (S1): the description and titles never say who is wrong or what the answer is, and never rule out a choice.
- TEXT SIZE FLOOR (videos 4, 8, 9 failed the text check on this): it is measured as INK height, not font size — the
  letters of every text the viewer must read are >= 18 px tall on a still scaled to 360 px wide (>= 54 px of ink at 1080;
  for Arabic that needs a font of about 70-80 px; two-line strips and rotated stamps shrink most). MEASURE it on stills
  before the build and list the heights in your report. In short: >= 54 px of ink at 1080
  wide (>= 18 px tall at 360 px): counters and their labels, rule tapes, speaker tabs, «الجولة ٢», stamps, strips. Choice
  digits / words >= 86 px font, in their OWN row. A counter's zero state shows the word «صفر» (the Arabic zero glyph is a
  dot and reads as a bullet). Nothing below y 1460 (the Shorts UI band), no ask strip or tab down there.
- CLEARANCE SCRIPT (video 11 needed a 4th round for 0-8 px touches): before the full build run a headless check over
  every 0.5 s of the page that reads the bounding boxes of all text objects and of hands / props / rings / pads and
  prints every pair closer than 14 px (see `productions/quiz-261117-uito/draft/clearance.mjs` once it exists); fix until
  it prints nothing. A hand or prop never crosses a strip.
- CLEARANCE (video 11 failed the text check on this): a ring, stamp, X mark, pad or tape never TOUCHES another tape or
  strip — keep >= 14 px of clear space at 1080 between any mark and every text object other than the one it belongs to,
  and check it on stills at the reveal. When choices sit in two rows, leave >= 40 px between the rows for the ring.
- Second puzzle: its choice tapes are on screen from its first frame, a small «الجولة ٢» tape lands with it, and something
  changes every 1.5 s until the end. Countdown pads get a 2-3 word strip saying what to do («اختار حرفك…»).
- Use the canvas: the puzzle objects should fill the safe zone (x 70-950, y 230-1460); for an ending question bring the
  compared parts forward LARGE (push-in >= 25 % or a cut-out inset), not a 6 % drift.

## S4 — VIDEO ROUND (4 independent reviewers in parallel; none of them built it)
- `qa-director`: the LAB brief in RUNBOOK §5, verbatim. Writes `vN/review.qa-director.json` + `vN/qa/insights-score.json`
  and runs `review:add`. <= 12 frames at 360 px. Must redo the fairness proof from the picture.
- `fresh-eyes` stage V: <= 12 frames at 360 px (`vN/qa/frames/` or cut new ones) + `vN/qa/asr.json` words only
  -> `vN/qa/fresh-eyes.json`.
- `audience-panel` stage V (brand quiz-ar): same inputs -> `vN/qa/panel.json`.
- `frame-text-inspector`: <= 16 frames -> `vN/qa/text-check.json` (any cut / overlapping / unreadable text = fail).
Each reports: verdict / score, blockers, top 3 gap_to_gate items.

## S5 — FIX + RE-QA
Orchestrator merges every gap_to_gate into ONE list (dedupe, blockers first) -> fresh fix agent (S3 reading list +
the list): apply all, ONE rebuild, re-check the listed items on frames, report per item fixed / not fixed.
Re-QA: `qa-director` on the listed defects + a regression diff only (new review + insights files for the new vN,
`review:add`); `frame-text-inspector`, `fresh-eyes` V and `audience-panel` V write their files for the new vN from
<= 8 frames (the gate reads the files of the latest version). Max 3 QA rounds per video; at round 2 with QA < 78 the
orchestrator keeps (one more batch) or shelves.

## S6 — APPROVE (orchestrator only)
Decision API (RUNBOOK §5) on `{"ok":true}` only, no force note. Not uploaded / scheduled: publishing waits for the owner.

## Late lessons (videos 12-13, 2026-11-17)
- STRIP HEIGHT: every strip needs >= 14 px of paper above the highest ink and below the lowest ink, measured on a 1080 still. Dots under ي / ب / ج fall off short strips («شي» was cut on video 12 = text blocker).
- SMALL DIGITS: counter / disc digits count as text: ink >= 20 px at 360 px wide.
- SIBLING BOXES: zone tabs and choice tapes are ONE identical box sized for the longest word (padding >= 14 px each side), text vertically centred; only the words differ («بالنص» overflowed on video 13).
- STAMPS sit on a paper underlay (contrast >= 4.5:1), beside the thing they name, inside the answer's zone, never over another zone.
- DIFFICULTY: "find the odd one" grids need >= 60 tiles and a promise strip «الجولة ٢ أصعب» in round 1; a colour pop (red -> black) is found in the first cycle: change the shape, keep the colour.
- COUNTDOWN = one big changing numeral on a disc (ink >= 40 px at 360), never a row of small dots; round 2 gets its own.
- FIT / ELIMINATION tests run in shuffled order; the misfit shows only when the voice names it.
- SILENCE HOLES IN TAKES (videos 12, 14): fallback-voice takes can contain 20-50 ms of digital silence; techqa `no_audio_dropouts` then fails after the build. Before the first build scan every warmed take (ffmpeg `silencedetect=noise=-60dB:d=0.015`); for each hole put a soft filler sound (`slide` gain -10 or room tone) over it in `plan()`, or re-take the line. Never patch the rendered MP4 by hand: fix it in the page and rebuild.
- HOOK MOTION: something visibly changes by 0.4 s, 1.5 s and 3.0 s (entry, outline draw, identical lifts); a still first 4 s cost video 14 eight points. The last 4 s of round 2 must move too (identical moves on all siblings).
- NO BACKGROUND JOBS inside agents, clearance scripts included (video 12's fix stalled twice on one): foreground, <= 120 s, <= 12 sample times.
- VOICE: `Zephyr` is banned by the LAB contract (CONTRACT.md). Unused so far: Despina, Erinome, Autonoe.
- COUNTDOWN DIGITS vs CHOICES (video 16, orchestrator's own brief error): when the choices are digits, the bet-window countdown is a digit-free ring. A big «٣» counting down above tapes ٢ ٣ ٤ reads as the answer. Tally discs show nothing before the first proof mark.
- COUNT MARKS never cover what they count (video 17): number tags sit beside the counted object, the object stays fully visible and gets a pop / outline.
- ORCHESTRATOR: view the contact sheet of every first build BEFORE launching the four reviewers; a pre-QA fix build costs less than a failed QA round.
