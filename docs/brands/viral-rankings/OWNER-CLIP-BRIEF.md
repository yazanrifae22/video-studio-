# Podium Pop: brief for an owner-clip TOP 5 (orchestrator, 2026-10-31)

Read with CLAUDE.md hard rules and `GOAL-15.md` (F1-F13, Q rules, owner rule block at the top).

**Source.** Use only the owner-supplied clips in the folder named in your task (`data/media/owner-supplied/...`). Every clip already has a cached `<clip>.analysis.json`: use it and never re-analyse. Never source footage anywhere else, and never download. Do not run GPU analysis or transcription jobs on other folders. The build may need DB analysis: `source:analyze` without transcription on the sources you use is fine.

**Reference production.** `productions/rank-261031-ohdc` (Messi) shows the owner-clip handling: source registration as owner-supplied `approved_with_conditions` ("proposed by <showrunner>"), `framing.follow` follow-crop, trims that hide watermarks, handles, subtitles and burned text, blur fill, and `work/post21.py`-style cutlist post-edits. Messi took 8 builds. These lessons stop that happening again:

- **Always TOP 5** (owner rule; cutlist refuses anything else). Five distinct plays, max 2 per source clip, and no repeated footage.
- **Frame 0** opens on the strongest action frame, with the full hook caption on screen from 0.0 s (never a fragment). Never open on crowd, an empty pitch, or a static stare.
- **Claims match the picture.** Every entry shows its claimed payoff on screen (ball in net, keeper down, the hit). Lines, title and description claim only what is visible.
- **Subject identifiable in every entry.** If you can't prove it's him or her, don't use it.
- **Watermarks.** Zero watermark, handle, subtitle or burned-text pixels anywhere, including the blur fill. Check frames. A clip with a mid-frame watermark is unusable.
- **Fill the screen (failed QA on Statham v2 and Jackie v1).** The default fit_box leaves the lower ~40% blurred. Use the tall layout (next rule), not Messi's older y410-1420 boxes. Footage fills the width. Portrait clips scale up to near full width, with no 40 %-empty blurred canvas (QA F13). Zoom wide shots so the action reads at phone size.
- **Use `"title_layout": "tall"` in every owner-clip plan (2026-10-31).** Footage box y 380-1600 (64 % of the frame; style v2 since 2026-11-04: two-line title band y 228-462, footage y 470-1600 = 59 %); captions, CTA pill and credits sit over the lower footage in the safe box. Give each entry `"fill":"blur","framing":{"follow":{"keys":[...]}}` with no `fit_box` and no `aspect` (window = box aspect, fills width and height). See docs/cutlist.md "Tall title layout".
- **Reveal order (decided 2026-11-01).** Use a true countdown, 5-4-3-2-1. QA and the viral check penalised mixed orders on pets, chameleon and Messi free kicks. The validator's "plain countdown" warning is non-blocking. Two entries from the same source must not be adjacent, so pick the clips to make that work.
- **No credits anywhere (owner, 2026-11-01).** No "Clip: owner-supplied" plate on screen and no `Video credits:` block in the description. Goal = millions of views; see GOAL-15 "VIEWS FIRST".
- **Use explicit trims for overlays (2026-11-01).** A follow-crop alone does not hide a watermark or score bug, because the blur fill uses the whole trimmed frame. Put every overlay removal in `framing.trim` on the entry. Rights-scout checks the trimmed frame, not your follow window.
- **Pace:** no speech gap over 0.8 s, and a cut or push-in at least every ~4 s.
- **#1:** a punch-in that never crops heads.
- **Spoken ask:** mid-video (about 50 %).
- **End CTA:** on screen for 3 s, clear of faces, with nothing spoken in the tail.
- **Loop:** the last 0.4 s cuts back to the frame-0 shot.
- **Title:** exactly `TOP 5 <W1> <W2> MOMENTS` (F2, no hype words), and identical in script.json, title_proposed, the burned title and DB productions.title. No AI-generation text in the description.
- **Length:** 25-40 s.

**Pipeline.** Create the idea and production per GOAL-15, then `ranking:validate`, then cutlist (plus any post-edit), then build, then techqa.
- Use `python` (never `python3`), and pass `open(..., encoding="utf8")`.
- If you edit `packages/occ/src/build.ts` or shared schemas, run `npm run -s typecheck`, `npx tsx scripts/test-build-helpers.ts` and `npx tsx scripts/test-tone-bed.ts`.
- Do your own check of 12 or fewer frames at 360 px or less, and aim for one good build. Stop at stage `qa`.
- Never approve, publish, upload or delete.

**Lean tokens (owner, 2026-10-31).**
- **Own frame check:** run `python scripts/qa-pack.py productions/<id>/v<N>` and read only `qa/pack.jpg` plus `qa/pack.json`. Extract ad-hoc frames only for one specific doubt.
- **Reading:** read this brief and the plan files, and nothing else you don't need. Skip AGENTS.md and the Messi files unless you are stuck.
- **Final check:** QA also scores a viral check (`viral-check.md`). Before you hand off, ask yourself whether a stranger would stop on frame 0, whether every payoff lands, and whether #1 is the strongest.

**Rights gate:** cutlist refuses until rights-scout countersigns. Do everything up to that point (sources registered, plan, script, TTS), write `work/resume.sh` (validate --record → cutlist → post-edit → build), then stop and list the source ids to countersign. The orchestrator runs rights-scout and resume.sh.

**If the pool cannot give 5 clean, identifiable entries,** stop and report which clips failed and why. Don't ship weak filler.

**Report** in 12 lines or fewer: production id, render path, length, title, the 5 entries (rank, clip, window, label), and risks.
- **Subscribe/like badge (owner, 2026-11-01).** The cut list adds an animated SUBSCRIBE + like badge at the spoken ask and in the last 2.5 s: put the narrator ask time in the plan as `spoken_cta_at_ms` (= `script.json` `spoken_cta.at_s` x 1000) so the mid-video badge lands on it; default top-right of the footage, see docs/cutlist.md `rank_layers.sub_badge`.

## Lessons 2026-11-01 (cost 3-5 QA rounds each — get them right in v1)
- **Triage the folder before planning:** count clean clips first. If < 5 distinct clean sources, widen the category across sibling micro folders (cucumber → "SCARED CAT" from MC-233 + MC-251) instead of reusing a source. Never use one source for two entries.
- **Frame 0 = motion + stake.** A cold-open flash of #1 (~0.8-1 s) works ONLY with its own tease caption ("HE CRIED AT #1") and the rail unlit; never under a "NUMBER FIVE" caption (= mislabel blocker). Otherwise open on #5 at its most dramatic frame.
- **Cut on the number line:** each entry's cut + rail reveal lands on its "NUMBER N" word (±0.2 s). Narration never trails the picture.
- **Every entry shows its payoff on screen** for ≥0.5 s at phone size (tongue, kick, jump). Label only what is visible. Cut the moment the subject leaves frame (no empty floor/net).
- **#1 gets a replay** (slow-mo via work/mk_slow.sh pattern in rank-261101-oxiz) and the end CTA starts after it, clear of the subject.
- **Captions:** spoken-ask page ≤2 lines, pages ≥0.7 s, never split a phrase across a cut; set `spoken_cta_at_ms` in the plan (badge mid + end).
- Folders with many TikTok-captioned clips (e.g. MC-208 Mr Bean: 4/18 clean) — prefer categories whose clips are clean; report the clean count.
