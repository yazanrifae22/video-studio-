# Agent protocol (all studio subagents)

Every subagent in `.claude/agents/` follows these rules. The main session is the **orchestrator**: it assigns work, owns scheduling and resolves conflicts. Agents start only when there is meaningful work; never spawn all ten for one video.

## Log real work (the dashboard shows only this)
```
npm run -s cli -- task:start <your-id> "<what you are doing>" [--production <id>] [--depends <taskIds>]
npm run -s cli -- task:progress <taskId> "<milestone>"
npm run -s cli -- task:finish <taskId> --summary "<result>" --artifact <path> --decision "<decision>::<why>"
```
Use `--status blocked` / `--status failed` with `--error` when you cannot finish. Never fabricate activity, metrics, view counts or rights.

## Hand-offs are records, not prose
Write outputs as schema-valid JSON (contracts in `packages/shared/src/schemas.ts`) and load them through the CLI:
`idea:add`, `discover`, `rights:set`, `candidate:add`, `production:attach`, `production:predict`, `review:add`, `lesson:add`.
Unknown values are `null`. Put a short human summary in `task:finish --summary`.

## Hard rules
1. **Rights gate.** Only `approved` / `approved_with_conditions` sources enter a publishable production (`packages/rights`). Uncertain = not approved. A CC tag on YouTube is not proof of ownership. NC/ND licenses = research only. No DRM/access-control circumvention. YouTube media is never downloaded by the studio.
2. **Timelines are the edit.** Builders (`packages/occ/src/build.ts`, `packages/quiz/src/build.ts`) record every edit into `vN/timeline.json` and `packages/render` renders it with ffmpeg (OpenChatCut retired 2026-11-02). Change a video through its cut list / quiz.json and rebuild; hand-edit a timeline only for a one-off re-render (`cli render:timeline`). Never overwrite an earlier version folder.
3. **Independent review.** Whoever built a video never reviews it. QA judges the rendered MP4, not the plan. qa-director also scores Retention (Mission Voices, viral-rankings); retention-reviewer is retired (2026-11-02).
   **Round cap:** max 3 QA rounds per video; re-QA checks only listed defects + regression diff; at round 2 with score < 78 the orchestrator keeps (ONE batched fix) or shelves. Before staging `qa`, showrunners run automatic checks (techqa, captions_audit, leak guards) and fix findings; title/label claims need claim→evidence in script.json; credit wording comes from the rights record (never "public domain" unless it says so). Shared loop: `docs/showrunner-base.md`.
4. **Secrets** live in `secrets/` and `~/.openchatcut`. Never print, log, commit or send them anywhere. Never `cat` key files.
5. **Gemini TTS**: keys in `secrets/gemini-keys.txt` (21 keys since the 2026-11-02 merge of the old explainer studio, which is gone; the studio owns them alone now): ≈10 requests/day per model per Google project. One request per video, cached by content hash. Owner decision 2026-10-22: no studio cap, all configured keys are used with failover (`config/policy.json`); the code benches a key on 429/403 — never retry a benched key by hand.
6. **No spending, account creation, uploads or publishing** without the owner's explicit approval.
7. **Honest claims.** Distinguish evidence from hypothesis. Subjective rankings say so. Never cut a speaker so their meaning changes.

## Hooks and viewer bond (agent council 2026-11-03, `research/council/2026-11-03/MINUTES.md`)
- **hook-architect** (sonnet, one call per video, after the brief/moments, before script/TTS) writes `productions/<id>/hook.json`: premise, 3 hooks that differ by mechanism, the chosen one, and `payoff_ts`. Every hook promise must be paid in the cut at that timestamp. qa-director blocks an unpaid hook or a frame 0 that fails the mute test at 360 px.
- **persona-keeper** (haiku check after script, before TTS; Podium Pop + quiz-ar) keeps `docs/brands/<brand>/persona.md` and writes `persona-check.json`. It never blocks a hook, except for banned pressure lines.
- Views count on play start: track stayed-to-watch / viewed-vs-swiped **beside** views (growth-director).

## Story and viral check (Story & Script Council 2026-11-08, `research/council/2026-11-08-story/MINUTES.md`)
- **story-architect** (sonnet, one call per video, after hook-architect, before the script) writes `productions/<id>/story.json` per `docs/story-playbook.md`: structure, spine, beats with jobs and but/therefore links, mid-payoff, peak, ending, honest talk trigger. It never writes final words.
- **script-doctor** (sonnet, independent, after the script, before TTS; all brands) checks S1-S10 and scores the viral forecast (`docs/viral-check.md`) into `script-doctor.json`; once per script round (≤ 10, gate 85, workflow v3 below). Podium Pop jokes stay with punchline-critic; persona with persona-keeper.
- **qa-director** scores the viral check for every brand (`qa/viral.json`); approval needs viral ≥ 75 on top of the existing gates only for productions with `story.json` (older ones: record only; Sunny Hill never gated; recalibrate after ~20 scored videos per brand, owner 2026-11-08).

## North star and viral radar (Agent Council 2026-11-08, `research/council/2026-11-08-agents/MINUTES.md`)
- One goal for every agent: each video is built to reach 1M+ views, honestly (`docs/north-star.md`). Owner rules > channel learning > council; no bait; rights gate untouched; Made for Kids reaches it only through parent-trusted quality.
- What is viral NOW comes from `docs/viral-radar.md` (trend-hunter: daily light pass, Monday deep pass) → `research/radar/<date>/<brand>.json`. Ideas cite a `signal_id` or an evergreen demand line; showrunners read the latest radar file before the draft brief; hook-architect and story-architect name the borrowed mechanism. Borrow mechanisms, never footage, words or sounds.
- growth-director closes the loop (radar idea → video → 7-day result) in `hook-log.json` and `research/calibration/<brand>.csv`.

## Workflow v3: script approval before build (owner 2026-11-08, `research/council/2026-11-08-workflow/CONTRACT.md`)
- New loop: draft brief → hook-architect → story-architect → script (+ comedy/persona checks) → **packaging-director** (`packaging.json`) → **SCRIPT ROUND** {script-doctor (forecast ≥ 85) · **fresh-eyes** S (zero-context stranger) · **audience-panel** S (5 channel personas, `docs/audience/<brand>.md`)} ≤ 10 rounds → `npm run -s cli -- script:approve <id>` → build → techqa/prelint → **VIDEO ROUND** {qa-director · rights-scout · fresh-eyes V · audience-panel V} ≤ 3 rounds → approve.
- Gates live only in `config/gates.json` (`docs/gates.md`). Every reviewer returns `gap_to_gate` items that sum to the gate (`docs/gap-to-gate.md`); the orchestrator merges them into ONE fix per round. Stage-S input = `python scripts/fresh-eyes-export.py <id> --out productions/<id>/viewer-text.txt`. fresh-eyes reads nothing but its named inputs: never brief it with the premise or rules.

## quiz-ar long-form team (2026-11-13, `docs/brands/quiz-ar/longform-series.md` "Team and loop")
- **showrunner-shu-shayef-long** (sonnet): one stage per call (W write/revise `episode.json`, B `quizlong:build` + own frame check, K thumbnails + `publish-kit.json`). Shorts stay with showrunner-shu-shayef.
- **quiz-fact-checker** (sonnet, independent): every answer, wrong option and learn line re-verified from two sources -> `fact-check.json`; `arguable` / `wrong` / `unverified` blocks `script:approve`. Later rounds = changed items only.
- **quiz-picture-judge** (sonnet, independent): EVERY picture item in question phase at 360 px (shadows, zoom, blur, shutters, flags), stage P on silent frames before the first voiced build, stage V only for changed items -> `picture-judge.json`.
- **blind-viewer-nada** / **blind-viewer-abukarim** (sonnet): read ONLY `script.txt` in their own folder, never any context; script rounds 1-3.

## Memory
- Structured state: `data/studio.db` (query via CLI, don't dump it).
- Curated notes: `memory/agents/<your-id>.md` (≤150 lines; dated entries; what worked, what failed, why). Read yours at task start; append durable learnings at the end.

## Descriptions (owner rule, 2026-10-28)
Never put AI-generation text in a video description (description / description_ar / publish-plan): no "Narration is AI-generated (Gemini TTS…)", no «صوت مولّد بالذكاء الاصطناعي», no "synthetic voice" / "images AI-generated". Source credits stay. The platform's altered-content checkbox is set by the uploader, not by description text.

## v3.1 (2026-11-08) [v3.1]
Cheap-first script round, no-progress escalation, fix-ledger, `script:approve --delta`, build `--reason`, publish from `packaging.json`, reviewers run `python scripts/validate-review.py <file>`. Details: `docs/showrunner-base.md`, `docs/gates.md`.
