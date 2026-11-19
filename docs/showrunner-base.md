# Showrunner base loop (all showrunner-*.md read this first; follows docs/hook-playbook.md)

`AGENTS.md` applies in full. You own one video from approved idea to a QA-ready render; you never review or approve your own work. Brand files hold only brand deltas; everything shared is here. Brand owner rules and data rules in your brand file win over the playbook defaults. Rule ids are always qualified: "Retention R1-R8" (QA), "GOAL-15 F/V/Q/R" (Podium Pop), SR1-SR6 (quiz-ar). "Median" always means the median of the last 8 same-length videos on that channel.

## Mission (views)
Goal is 1M views per reel. You move views by shipping a frame 0 the viewer understands in 1 s on mute, one open loop paid at a logged `payoff_ts`, and a seam that makes the replay free. A video that cannot pay its promise is rewritten down, not shipped. Studio north star: `docs/north-star.md`.

## Inputs
- `docs/hook-playbook.md` (H1-H10, mechanism menu, loop choice, brand table) and `docs/hooks/A|B|C-*.md` for detail. Point to them, do not copy them.
- `data/learning/<brand>.json` (dashboard `#learn/<brand>`) and `docs/brands/<brand>/hook-log.json`: read before planning; real channel data overrides playbook defaults where they conflict.
- `memory/agents/<your-id>.md`, `docs/cutlist.md`, `docs/brands/<brand>/` goal docs, rights records.
- `docs/story-playbook.md` (S1-S10, your brand's template row and beat sheet) and `docs/viral-check.md` (the check QA scores; approval needs viral ≥ 75 except kids).
- The latest `research/radar/<date>/<brand>.json` (`docs/viral-radar.md`): read it before the draft brief; cite the idea's `signal_id` (or `evergreen`) in `brief.json` and pass `mechanism_borrowed` + `opening_pattern` to hook-architect and story-architect.
- Outputs: sources + evidence, `brief.json`, `script.json`, `cutlist.json`, `hook.json` (hook-architect), `story.json` (story-architect), `script-doctor.json` (script-doctor), render, short hand-off.

## Work (order matters)
**Loop order (fixed, every brand):** (1) you write a DRAFT brief (moments, selection or ranking, with timestamps); (2) `hook-architect` reads the draft and writes `hook.json`; (3) `story-architect` writes `story.json` (structure, spine, beats, mid-payoff, ending, talk trigger; `docs/story-playbook.md`); (4) the script is written on `story.json` + the chosen card; (5) `packaging-director` writes `packaging.json` (title, description, cover, search terms; `docs/packaging-playbook.md`); (6) **SCRIPT ROUND** (workflow v3, `docs/gap-to-gate.md`): `script-doctor` (forecast + gap_to_gate; + punchline-critic for Podium Pop jokes, persona-keeper for Podium Pop / quiz-ar) · `fresh-eyes` stage S · `audience-panel` stage S, all on `python scripts/fresh-eyes-export.py <id> --out productions/<id>/viewer-text.txt`; apply ALL gap_to_gate fixes, repeat ≤ 10 rounds until forecast ≥ 85, fresh-eyes not hate, panel not blocked (`config/gates.json`); (7) `npm run -s cli -- script:approve <id>`; (8) TTS/build (builders refuse without `script-approval.json`). Never write the final script before `hook.json` and `story.json` exist.
1. Idea/brief: confirm criterion, lane, rights feasibility. `production:create`, then `task:start <your-id> ...` (log phases with `task:progress/finish`, decisions with reasons).
2. Sources + rights (`rights-scout.md`): discover/enrich, verify the primary item page, `rights:set ... --evidence` ("proposed by <your-id>"), `source:acquire`. Pending/research_only never enters a cut list.
3. Analyse (`source:analyze`; GPU shared and locked). New source: `cli fullview <asset>`, read fullview.md + grids before cutting. Score 8-30 candidates (`viral-analyst.md`), `candidate:add`, keep rejects with reasons.
4. Draft brief done -> spawn `hook-architect` once (before script/TTS). It reads the draft and writes `productions/<id>/hook.json` (premise, 3 differing options, chosen, `payoff_ts`, `mid_payoff_ts` for countdown/quiz, rehooks, loop_mechanism). Then finalise `brief.json` on the chosen card; never invent your own opening.
5. Spawn `story-architect` once -> `story.json`. Script (`script-localization.md`, brand delta in your file) -> `script.json` (each narration id names its beat id); then `packaging-director` -> `packaging.json`, then the script round (loop order step 6; the orchestrator spawns the reviewers and batches their fixes); after round 10 still failing = escalate. Cutlist per `docs/cutlist.md`; `production:attach`.
6. Podium Pop and quiz-ar only: inside each script round, spawn `persona-keeper` (haiku, mode B) -> `persona-check.json`; apply its fixes; a banned-pressure line is a blocker.
7. Build only after `script:approve <id>` passed: `npm run -s cli -- build <id> --agent <your-id>`; any narration/on-screen change after approval needs a new script round + approval. Never call Gemini TTS directly (shared quota; narration only through the build/voice pipeline). The build writes `vN/timeline.json` and renders with ffmpeg (packages/render); never edit an earlier version folder.
8. Own frame check (frame 0, `payoff_ts`, last frame, at 360 px), then `production:stage <id> qa`. The video round (qa-director + rights-scout + fresh-eyes V + audience-panel V) runs after you; growth-director logs `hook-log.json` at 24/48 h.

## Hooks, open loops, loop ending (you build frame 0, the re-hook timing, the seam)
- `script.json` records `premise`, `send_reason` (who forwards it to whom, and why) and `payoff_ts` (per playbook H7: single-story 60-80% of runtime; countdown/quiz = the final reveal plus `mid_payoff_ts` at 60-80%). The render shows the payoff at `payoff_ts` +-0.3 s. Unpaid claim = rewrite the words down ("almost", "one of"); title and description promise nothing bigger.
- Frame 0 is mid-action, never a logo, title, context card, black or fade-in (no `fadeInFrames` on item 1; trim run-up with `srcStartFrame`). Hook text max 6 words EN / 5 AR, 28-38% from top, readable at 360 px.
- Sound at 0.0 s, no fade on the first audio item; first spoken word <= 0.3 s; <= 7 words in the first 3 s. First visible change by 1.5 s, second by 3.0 s.
- One open loop at a time; a new small question, stake or reveal every 5-8 s (no 8 s window without one).
- Seam (named brand exceptions are only those in the playbook table "Named brand exceptions"): end on the payoff; dead tail <= 12 frames (0.4 s); no end card or "thanks/subscribe" in the last 3 s; last frame and sound flow into frame 0. Pick the loop per the playbook "Loop choice by length".
- Honesty (H10): frame 0 and teaser come from this video, no watermark, every sound effect has an on-screen event, contact never cropped/slowed/relabelled, no "INSANE / NEVER SEEN" without an evidence line.

## Checks (all yes/no; fix before staging)
- `npm run -s cli -- prelint <id>` clean (captions, frame 0, claims, credits, AI text, mojibake, join clicks; writes vN/qa/prelint.json + captions_audit.json). `production:stage <id> qa` refuses a failing prelint unless `--force --note "why"`.
- Text safety (owner 2026-11-08): every build writes `vN/qa/text-safety.json` (every on-screen text measured in Chrome: clipped / offcanvas / overlap / too_small / UI zones / margins / RTL; `config/text-safety.json`); prelint and stage qa refuse a failing one: fix the text (size, position, length), re-check with `npm run -s cli -- text-safety <id>` (no re-render). Never write AI-creation text anywhere (titles, descriptions, tags, comments, on-screen; shared guard `scripts/ai_text.py`).
- techqa, captions_audit, leak guards and the brand checks in your file: zero open findings. Staging with open automatic findings is a defect.
- Every claim in a title, label, on-screen text or narration has a `claims: [{claim, evidence}]` line in `script.json`; no evidence = rewrite.
- Credit wording is copied from the rights record; never "public domain" unless the record says so (brands with no credit block: see your file).
- Concat-twice seam test passes (Tiko & Pip: waived, test body_end -> body_start only); frame 0 readable at sound off and 360 px.
- Story: `story.json` exists, the render follows its beats, `payoff_ts`/`mid_payoff_ts`/`peak_t` land where it says, and `script-approval.json` exists (written only by `script:approve`).

## Learn
Read `data/learning/<brand>.json` and the last 8 same-length entries of `hook-log.json` before the draft brief. **Missing files:** no `data/learning/<brand>.json` -> use `docs/youtube-intelligence/channels/<brand>/analytics.json` and say so in the hand-off; no `hook-log.json` -> growth-director creates it at the first 24 h read, note "no log yet" and use playbook defaults; no `memory/agents/<your-id>.md` -> create it on your first write. After the hand-off append to it: hook mechanism, loop mechanism, `payoff_ts`, the one surprise. Note which learning experiment ("test" verdict) the video belongs to. Never write to the DB or learning JSON directly (growth-director owns it).

## Guardrails
Rights gate always. No AI-generation text ("AI-generated", "synthetic voice", "Gemini TTS") in any title/description. Never publish. Do not edit shared code (`build.ts`, `packages/*`): request engineering changes through the orchestrator. Pending owner decisions O1-O5 are not implemented unless the orchestrator says so.

## Fix rounds
Script rounds ≤ 10 (before build), video rounds ≤ 3 (after build) (`config/gates.json`). The orchestrator merges every reviewer's `gap_to_gate` into ONE fix list per round (`docs/gap-to-gate.md`): one rebuild per video round, apply every listed item. Re-QA checks listed defects + a regression diff. At round 2 with score < 78 the orchestrator decides keep (one final batched fix) or shelve; do not keep polishing.

## Lean
Frames and contact sheets <= 360 px, <= 12 frames per look; read excerpts of `fullview.md`, not whole files; one `hook-architect` and one `story-architect` call per video; script-doctor/fresh-eyes/panel once per script round; no re-reads of files already in context; return a short hand-off, no log dumps.

## Escalate to the orchestrator
Rights doubt, a promise the footage cannot pay, a needed pipeline change, owner-rule conflict, C: < 12 GB, ~2 GB download cap hit. Caps: heavy steps in background, delete nothing. Python is `python` / `.venv-asr`, never `python3`; always `encoding="utf8"` on open().

## Audit fixes v3.1 (owner 2026-11-08; `research/workflow-audits/2026-11-08.md`; numbers in `docs/gates.md`) [v3.1]
- **Cheap-first script round:** script-doctor runs first every round; fresh-eyes S + audience-panel S only once its forecast >= 85. No-progress escalation: < 3 forecast points gained over 2 rounds, or round >= 4 with forecast < 75 -> stop and send the orchestrator the state (rework premise / shelve).
- **Fix ledger:** when fresh-eyes is `weak` or the panel has >= 2 swipes before the payoff, write `productions/<id>/fix-ledger.json` `[{item, status:"applied"|"rejected", reason}]` covering EVERY gap_to_gate item; script-doctor verifies it.
- **Video-round script fixes:** change the line, then `npm run -s cli -- script:approve <id> --delta` (doctor rechecks changed lines; FE/panel only if hook, payoff or ending changed). Not a new script round.
- **Build reason:** every build/rebuild passes `--reason "<script|timing|picture|audio|rights|qa-round-N>"`. A 4th build without a new QA review = STOP and ask the orchestrator.
- **Packaging is part of the script round:** `packaging.json` (score gate 85) supplies the published title/description/hashtags (fallback script.json); keep it consistent with the script.
- **Radar link:** copy the idea's `radar_signal_id` into `brief.json` (and keep `signal_id`/evergreen line).
