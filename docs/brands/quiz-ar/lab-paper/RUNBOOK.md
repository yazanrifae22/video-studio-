# LAB "Paper" Short — runbook (one video, end to end)

Read order: this file, `CONTRACT.md` (look + page contract), `data/brand/shu-lab/README.md` (kit API). Nothing from the old
quiz system (`packages/quiz`, Cairo, Zephyr, rounds, hook bank). `python` never `python3`; every Python `open()` with `encoding="utf8"`.
Never commit / push / upload / publish. Reference builds: `productions/quiz-261114-{csbw,vafk,adqi}` (final v3 / v5 / v4).

## 1. Create the production (once)
`npm run -s cli -- production:create --brand quiz-ar --format quiz --title "<Arabic title>"` -> prints `{productionId:"quiz-YYMMDD-xxxx"}`
(DB row, state `research`, folder `productions/<id>/` made). Use that id everywhere below. Do NOT run `quiz:build` / `build` (old systems).

## 2. Files per production
```
productions/<id>/brief.md     scene, trick/puzzle, fairness proof, beats table (| # | picture | line |), target length
productions/<id>/lab.json     words + voices (below)
productions/<id>/page/frame.html   the scene (kit + Lab.mount); assets only inside page/ (server serves page/, data/brand/, node_modules/)
productions/<id>/packaging.json    section 6
productions/<id>/draft/       stills, proof.txt, _lines.json, narration-check.json, ear-*.json (scratch, keep)
productions/<id>/vN/          builder output (never edit by hand)
```
**lab.json** = `{production_id, title, fps:30, voice:{name, style, tempo}, lines:[{id, text, onscreen?, voice?, style?, tempo?, gain?}]}`.
Unique line ids. `text` = spoken Syrian (Damascus) colloquial Arabic, written as spoken; `onscreen` = tighter strip text (`[word]` = vermilion highlight
in the page's own helper). Extra keys (`who`) are ignored. Optional text-review keys (builder ignores them, `fresh-eyes-export.py` prints them): `picture` (what is on screen during the line), `pause_after` (seconds of picture-only time after the line, replaces the 0.35 s gap) and `beat` (one viewer-visible sentence of what the picture does in that pause). `style` = one English sentence of acting direction (character, mood, pace,
"never a TV announcer"). `tempo` 1.04-1.08 used. Per-line `voice` = second speaker (adqi: Leda + Fenrir). Voices proven: Algieba (sly
magician), Sulafat (warm storyteller), Leda, Fenrir. Free Gemini TTS, cached by text+voice+style; one take per line; no extra cost on rebuilds.
Length: plan duration must be 12-45 s (builder refuses otherwise); the 3 shipped were 20-27 s; target 20-28 s. Opening line = a stake/question, not setup.

**brief.md shape**: title + script type; "The trick/puzzle — must be exact" (geometry, what never changes); beats table; fairness proof deliverable
(`draft/proof.txt`: exact numbers, identical paths, overlap/count proof); target length; bed name. The words are fixed by lab.json (do not rewrite in the page).

**page/frame.html contract** (details: CONTRACT §2, kit README): `<!doctype html><html lang="ar" dir="rtl">`, `kit.css` link, `<div class="stage">`,
`kit.js`, one `Lab.mount({ plan(durs){…}, build(stage, show, tl){…} })` (never define `__plan/__load/__seek/__ready`). `plan(durs)` is PURE:
compute every time from real `durs` (cue `at` = previous line end + gap, speech never cut), return `{duration (Lab.snap30), cues:[{id,at}] for EVERY line,
sfx:[{name,at,gain?}], bed:{name,from,to,gain}}`. sfx/bed names must exist in `data/brand/shu-lab/sfx/index.json`: slide slide-long rustle flip fold unfold snip thud
stamp scratch rip tap tick pop whoosh sting rewind; beds `bed-desk-96`, `bed-tense-88`, `bed-walk-104`. Seek-safe: no CSS transitions/animations, `Date.now`,
`Math.random` (use `Lab.rand(seed)`), `<video>/<audio>`; all motion via `tl.to/set/fn`; never set CSS `transform` on tweened elements; flip only `.paper`; text always in the DOM
inside a strip/tape/paper. Frame 0 = full puzzle readable; last frame == frame 0 layout. Safe zone x 70-950, y 230-1460. Owner preview: `page/frame.html?dev=1`.

## 3. Build ladder (cheap first; run from `E:\clips-viral`)
1. Stills (no TTS, estimated or cached durations): `npx tsx packages/quizlab/src/build.ts <id> --snap 0,0.4,1.5,3,… ` -> `draft/t<sec>.png` (+`draft/plan.json`, plan errors printed). Or `node data/brand/shu-lab/snap.mjs productions/<id>/page productions/<id>/draft 0,1.5 --width 360` (add `--check-seek`: fresh seek(t) == seek(max)->seek(t); `--perf`).
2. Voices before picture: `npx tsx packages/quizlab/src/warm.ts <id> [--retake <lineId>=<salt>]` -> real takes + faster-whisper ASR -> `draft/_lines.json`, `draft/narration-check.json` (flag = WER > 0.35; Syrian spelling variants like الحمرة/هلا are false flags). Fix wording/style or retake before building (`--retake id=salt` saves `retake` on that line in lab.json = new Gemini take, and build.ts reuses that same take; lines without `retake` keep their old cache key).
3. Second listener: `npx tsx packages/quizlab/src/ear.ts <id> [lineId,..]` (told the words -> `draft/ear-check.json`) and `… ear.ts <id> --blind` (NOT told -> `draft/ear-blind.json`; `heard` must equal the text, `clear` >= 4, empty `problem`). Needs warm first.
4. Full build: `npx tsx packages/quizlab/src/build.ts <id> --reason "<why this build>" [--workers N]` -> next `vN/` (N = max(db version, folders)+1). 95-140 s total (ASR ~30-50 s, capture 40-80 s at 10-18 frames/s, rest < 20 s). Silent dry run: add `--no-tts`.
   Outputs: `vN/render.mp4` (mastered -14 LUFS), `render.raw.mp4`, `plan.json`, `show.json`, `build.json` (durs, stages, `result.lufs`, `techqa_pass`), `narration/*.wav`, `qa/{techqa.json,asr.json,sheet.jpg,contact_sheet.jpg,frames/}`. DB: `versions` row + `productions.version`. Techqa runs inside the build (pass needed: ~-14 LUFS, true peak <= -1.6, no silence, duration = plan).
5. Check yourself before reporting: `qa/sheet.jpg` + stills at 360 px (frame 0, each question/reveal, last), `asr.json` flags, loop (last frame vs frame 0). Keep builds to <= 3 per video (v1 -> QA fix list -> v2 -> re-QA).

## 4. Defects first builds ALWAYS had (check every one before handing to QA)
- Too still at the start: first visible change by **0.4 s** (was 3.2 s -> major), something moves at least every **1.5 s**, no hold > **1.5-2 s** with an unchanged picture (11.6-14.3 s and 9.2-12 s holds were majors). Fill think-beats with a push-in, ring + second ring, props peeking, ticks. Hook must not stay static > 3 s; first story beat by **~3.2 s** (vafk s1 at 4.4 s).
- Setup-only first line: the voice must open with the stake/question/bet; question on screen from 0 s. Soft "مو؟" endings are weak comment triggers: end on an open question that matches `pinned_comment_draft`.
- Stamps / rings on the WRONG object: each stamp sits on the thing it judges (cap, birds, moon), never over the sheet edge, never beside the head over a wire; answer stamp plain, above the paper, inside x<=950.
- Small text at 360 px: sign/label text at **>= 44 px** at 1080 wide (a ~8 px-high shop sign was never seen); countable objects (birds) big, spaced, each visible >= 1 s; zoom/crop must not cut a word («دكان أ»).
- Caption hand-over: two strips never overlap (text on text); the arriving strip starts fully off-canvas (x < -width) so no sliver shows; the old strip clears before the new one lands; a strip must not be half under another (clutter at the bottom ~20 s); no strip clipped by the frame edge mid-slide.
- Speaker clarity (two voices): each strip anchored to its speaker's side/tab/colour, in before their line starts; centre strips need an owner.
- Loop seam: last frame == frame 0 exactly (same layout, no labels/ring/stamp left; clear the sheet in the last ~0.4 s, scissors/props back at frame-0 height). Last caption must not be wiped mid-word.
- Consistency lies: a clock that reads 3 by day and 6 at night reads as a fifth mismatch; keep every incidental object plausible. Digits: Eastern Arabic only (٠-٩), one digit system on every strip/tab/stamp.
- Fairness proof is mandatory (`draft/proof.txt`): same geometry/paths for illusion pieces, fold maths, count of mismatches; no answer leak before the reveal (colour, size, shadow, tab).
- Speech never cut; line `at + dur <= duration`; narration lines do not overlap (builder errors). Audio: nobody listens in QA (meters only), so ASR + ear checks are the only voice proof — report them honestly.
- Length: 20-28 s; hook text legible at 360 px; channel tag at x70 y236 on the stage (not in the moving world).

## 5. QA and approval (orchestrator spawns separate agents; the builder never reviews itself)
**qa-director LAB brief** (give it the render path, `build.json`, `qa/` folder, `brief.md`): "LAB mode. Judge the MP4 as a viewer. SKIP old round-format items: rounds, ring/countdown,
progress chip, hook bank, score ask, persona, learning ids, script/hook/story/quiz json, viral score (record-only). Check: H5 first change <= 1.5 s, motion cadence, dead holds, caption overlap/clipping,
text inside safe zone and readable at 360 px, fairness (redo the proof from the picture), loop seam (last == frame 0), comment trigger, labels match picture, no AI wording, ending, techqa/LUFS. Audio by meters only (say nobody listened).
Write `vN/review.qa-director.json` = `{production_id, version, reviewer:"qa-director", breakdown:{hook<=15,pacing<=15,story<=15,editing<=15,audio<=10,captions<=10,originality<=10,format<=10}, issues:[{t,severity,issue,fix,owner}], blockers:[], summary, gap_to_gate:[{item,now,needed,fix,points,owner,t}]}`;
also `vN/qa/insights-score.json` = `{production_id, version, brand:"quiz-ar", score, note:"LAB mode …", failed_items[], items:[{key,max,got,evidence,fix}]}` (docs/insights-rubric.md items scored proportionally)." Then record: `npm run -s cli -- review:add productions/<id>/vN/review.qa-director.json` (reviewer must differ from the builder, `built_by` = "render"; score >= 85 and no blockers -> verdict pass, <85 revise).
Batch ALL defects into ONE fix list -> one rebuild -> re-QA (listed defects + regression diff only). Max 3 QA rounds.

**Decision API gate** (`POST http://127.0.0.1:4320/api/productions/<id>/decision`, header `x-studio: 1`, body `{"decision":"approve","by":"orchestrator","note":"…"}`; start `npm run api` if down). It checks (apps/api/src/server.ts + packages/shared/src/gates.ts `approveGate`):
1. latest QA review row (review:add) verdict pass (score >= 85, no blockers);
2. reviewed version == `productions.version` (latest render) — re-run review:add for the newest vN;
3. `vN/qa/insights-score.json` score >= 85 (missing = error; brand quiz-ar created >= 2026-11-08 = "new loop");
4. `vN/qa/panel.json` (audience-panel stage V) not blocked (>= 3 hate/boring or >= 3 swipe-before-payoff blocks);
5. `vN/qa/fresh-eyes.json` (fresh-eyes stage V) verdict not `hate`;
6. `vN/qa/text-check.json` `pass:true` (frame-text-inspector, <= 16 frames) — or `qa/text-safety.json` measured pass (lab has no timeline, so text-check.json is the way);
7. rights countersign: no sources -> passes; story.json / viral.json / puzzle-judge are NOT required (no story.json). `script-approval.json` is NOT read by this endpoint.
Missing files -> HTTP 400 with the list; only an orchestrator `force_note` overrides (logged, used for the first 3). Approve only on `{"ok":true}`.
Shapes: panel/fresh-eyes/text-check follow their agent files (`audience-panel`, `fresh-eyes`, `frame-text-inspector`); they validate with `validateReviewFiles`.
**Not needed for lab**: `script:approve`, script-doctor, story/hook, `quiz-picture-judge`, rights records (art is code, fonts OFL). The quizlab builder never calls the script gate.

**Text round export (works on lab.json):** `python scripts/fresh-eyes-export.py <id> --out productions/<id>/viewer-text.txt`
It lists VOICE + TEXT rows in time order (cue times from the newest `vN/plan.json`, estimated before the first build) and never prints notes or the brief.
Feed that file to fresh-eyes / audience-panel stage S; no `script:approve` or script-doctor is involved.

## 6. packaging.json (orchestrator-written, no packaging-director score)
```json
{ "production_id":"<id>", "titles":["A","B","C"], "chosen_title":"A",
  "description":"2 lines of hook/context in Syrian dialect + the comment question\n\n#شو_شايف #<topic tag> #اختبر_نفسك #Shorts",
  "hashtags":["#شو_شايف","#<topic>","#اختبر_نفسك","#Shorts"],
  "pinned_comment_draft":"<the same open question as the last spoken line>", "altered_content": false,
  "note":"LAB Paper: written by the orchestrator, no packaging-director score." }
```
Title <= ~45 chars with the stake ("عينك رح تغلط مرتين", "كم فتحة بتطلع؟"). Description ends with a question the comment section can answer.
**HARD RULE: never any AI-generation wording anywhere** (title, description, tags, pinned comment, on-screen, narration, lab.json, page text): no "AI-generated", «صوت مولّد بالذكاء الاصطناعي», "synthetic voice", "Gemini TTS" etc.
Check: `python scripts/ai_text.py check "<text>" quiz-ar` for every string (patterns in `config/ai-text-patterns.json`). Publishing is owner-only (scheduling via `scripts/youtube.ts`, one video at a time after explicit OK).

## 7. Order of work for one video
create (1) -> brief.md + lab.json -> snap stills -> warm + ear --blind -> page -> `--snap`/seek check -> build v1 -> own 360 px check -> qa-director + insights (+ panel V, fresh-eyes V, frame-text-inspector in parallel) -> ONE batched fix -> v2 -> re-QA -> review:add -> decision API.
Update `docs/STATUS.md` at the end of the session. Never delete older vN folders.
