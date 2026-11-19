# Clips Viral Studio — full feature list

Snapshot as of **2026-10-31** (commit `56dc206`). Dates come from the git history, `docs/STATUS.md` and brand docs. A date means when the feature first landed; later changes are listed under it.

---

## 1. At a glance

| | |
|---|---|
| Channels | 4 YouTube channels (+2 Facebook pages) |
| Productions in DB | 226. Scheduled 165 · published 5 · approved, waiting 31 · in QA 12 · editing 5 · rejected 4 |
| Per brand (scheduled+published / approved, waiting) | شو شايف؟ 110 / 9 · Mission Voices 23 / 9 · The Way It Was Made 22 / 11 · Planet Extremes 15 / 2 |
| Sources with rights decisions | 1,862 (298 approved with conditions, 926 pending, 5 rejected, 633 research only) |
| Agents | 15 subagents in `.claude/agents/`, run by the main session as orchestrator |
| Editor | OpenChatCut v0.2.17 (port 5299, MCP); the studio never writes OCC's database |

### Brands
| Brand id | Channel | Format | Started |
|---|---|---|---|
| `rankings` | **Planet Extremes** | Top-5 space/earth rankings from NASA footage | 2026-10-21 |
| `clipping` | **Mission Voices** | Short clips of astronauts talking, cut from long-form NASA interviews | 2026-10-21 |
| `compilations` | **The Way It Was Made** (TWIWM) | Archive build-story compilations | 2026-10-21 |
| `quiz-ar` | **«شو شايف؟»** | Arabic (Syrian dialect) visual brain-teaser quizzes, original art | 2026-10-22 |

---

## 2. Timeline — what was built and when

### 2026-10-21 — Day 1: studio core
- **Studio core** (`2a71380`): audit, OpenChatCut MCP adapter (`packages/occ`), discovery engine (`packages/discovery`), rights gate (`packages/rights`), GPU analysis (`packages/intelligence`), and the first 10 agents.
- **Brands and policy** (`ae5809a`): 3 brands, a 30-idea backlog, owner policy (`config/policy.json`), account specs.
- **Dashboard v1** (`72e0790`): API on :4320 plus a live SSE event feed over `data/studio.db`. Pixabay connected.
- **Watch mode verified** (`1d339ea`): when the owner has a project open in OCC, edits appear live in their timeline, one undo step each.
- **Channel showrunners** (`94a072c`): one end-to-end agent per channel, a cut-list contract (`docs/cutlist.md`), and `source:analyze` with a GPU lock.
- **Builder, end to end** (`15b180c`): cut list → narration/captions → OCC (watch or background) → headless render → master → techqa.
- **Scoring model and QA rubric** (`771889f`): `docs/scoring.md`, `docs/review-rubric.md` (100 points).
- **Builder hardening** through the same day:
  - Import: cached windows of large sources (to fit OCC's upload limit), import errors surfaced, ids taken from the import response, tracks found by name, overlay lanes.
  - Layout: platform safe zones, balanced line wrap, emphasis words, pan and push/pull motion, symmetric auto-crop of baked-in borders, manual trims.
  - Captions: a cleaner for fillers, stutters and restarts that is pronoun-aware, with unit tests. Caption pages shorter than 0.3 s are merged.
  - Audio: source audio levelled and faded, an original tone bed at −36 LUFS, audio fades only at real source changes, audio trimmed to picture.
  - Aligner: word starts moved out of silence to the real speech onset (fixed captions running ~0.4 s early), a pause-stretch fix, and spoken numbers matched.
  - Frame-exact segment grid (fixed a 1-frame gap/click at joins). Overlays snap to cuts within 2 frames.
  - techqa: detects single-frame flashes and 10 ms audio dropouts.
  - Render temp/cache moved to E: (a nearly full C: broke Chrome fetches).
- **First approvals**: `rank-261021-cwik` v9 and `comp-261021-eqeq` v9.

### 2026-10-22 — First run of 9 approved videos + Arabic quiz channel
- **Two showrunners per channel** with separate topic lanes. **9 videos approved** (3 per English channel, QA 85–89) (`8281197`).
- Score bed rewritten (pad, air band, accent ticks, DC guard, NaN clamps). The bed is capped to the timeline and the master is padded to exact video length.
- New techqa checks: `no_blank_tail`, `av_length_match`.
- New cut-list opt-ins: `caption_fixes`, `caption_onset_snap`, `caption_timing`, `audio_fade_in`, `font_px`, `bed_accents`.
- **Keep only approved versions** in `productions/` (`be01f65`), which freed ~8.8 GB.
- **New channel «شو شايف؟» (`quiz-ar`)**:
  - Brand guide, visual system, naming and packaging docs, Cairo fonts (`docs/brands/quiz-ar/`, `data/brand/quiz-ar/`).
  - **`packages/quiz`**: HyperFrames rounds → OCC layers → OCC render. Commands: `quiz:plan`, `quiz:build`, `quiz:assets`.
  - Pipeline features: templates, caption near-miss rule (`caption_match.py`), eased reveal flash, Eastern Arabic digits, auto-merged `assets.json`, true-peak master, **peek-proof** fairness test, **answer-leak guard**.
  - **Reference library** of 608 reels (research only, never reused): `scripts/ref-library.ts stats|list|claim|done|skip|sync`. Reels are marked done automatically on approval.
  - Agent **`showrunner-shu-shayef`** with two lanes (perception, memory-attention).
  - **Gemini TTS** (`packages/voice`): all keys used with failover, a key is benched on 429/403, cache keyed by content hash (owner decision: no studio cap).

### 2026-10-23 — YouTube live + move to E:
- **Studio moved to `E:\clips-viral`**. OCC stays on C: behind a junction. 83 old version folders removed (8.4 GB).
- **YouTube channels live** (`1aac43d`): handles, channel ids, brand art. Art generated free through Codex (`brands/_artgen/`).
- **YouTube publishing** (`5ec8eb2`): `scripts/youtube.ts status|auth|list|upload|adopt`.
  - Uploads go up private with publishAt, made-for-kids off, and the synthetic-media flag set per plan.
  - `scripts/publish-plan.py` builds the plan in `data/publish-plan.json`.
  - Fallback is Studio in the owner's Chrome plus `yt-studio-helper.js`.
- **Dashboard scheduling** (`3a29970`): accounts connected, a "scheduled" board stage, and a publishing calendar in local time with weeks and video links. `scripts/sync-publishing.py` keeps it in sync.
- **Quiz goal raised to 200 new** (`docs/brands/quiz-ar/goal-200.md`): 125 quiz-ar approved by the end of the day. `scripts/render-queue.ps1` runs a single render worker (two workers crashed RAM/OCC).

### 2026-10-24 — Quiz cadence 4/day
- شو شايف؟ cadence set to **4/day** (11/14/17/20 local). The planner skips taken and past slots.
- quiz-ar OAuth done. **101 quiz-ar videos scheduled** through Nov 18, until the daily upload quota was hit.

### 2026-10-25 — Goal runs, Facebook, Dashboard v2
- **TWIWM goal 26** (`docs/brands/compilations/goal-26.md`): 26 compilations, 4/day, each with a unique CTA (text and position: start/mid/end). **26/26 approved the same day.**
  - New builder opt-ins: `caption_min_page`, `caption_clip`, `caption_y_ranges`, `caption_bg`, segment `lift`.
- **Mission Voices goal 28** (`docs/brands/clipping/goal-28.md`): 28 clips, 4/day, an A/B test of 7 CTA families.
  - **Retention rules R1–R8** come from the owner's YouTube Studio data.
  - New agent **`retention-reviewer`** and script `scripts/mv-retention-check.py`.
  - Per-video `enhancements.json` → `scripts/mv-enhancements.py` → `enhancements-log.md`.
  - Clipping QA bar lowered to **80** (owner). **27/28 approved**; the last slot is waiting on the owner.
- **Upload-limit retry loops** (`mv-upload-retry.sh`, `yt-retry-all.sh`) work around YouTube's account-wide `uploadLimitExceeded`.
- **Facebook**: two pages (شو شايف؟, Planet Extremes) and the Clips Viral Studio portfolio. 119/125 quiz reels scheduled through Meta Business Suite in the browser.
  - Tools: `fb-plan.py`, `fb-mark.py`, `fb-encode.py` (copies under 10 MB).
  - The Graph API route (`fb-api.py`) is blocked because the owner's account is Syria-flagged on Meta for Developers.
- **Dashboard v2** (`apps/studio/public/index.html` + `app.css` + `app.js`, no build step):
  - DOM-morphed views, so live events don't reload the page.
  - Review view: version tabs and a decision dialog.
  - Calendar: week, month and list views, brand filter, video drawer.
  - Board: brand chips, search. Every channel has its own page.
  - API: `/media` byte ranges (video seeking), `/api/schedule`, SSE resume.

### 2026-10-26 — Audience-time scheduling + quiz hook intros
- **Audience-time scheduling**:
  - `youtube.ts analytics <brand>` (views by country) → `scripts/audience-slots.py` → `config/publish-times.json` (viewer time zone + slots).
  - `publish-plan.py` converts slots to the owner's local time, DST-safe.
  - Defaults: US Eastern for the English channels, Riyadh for شو شايف؟.
- **Quiz `hook_intro`** (`packages/quiz/src/templates-hook.ts`): a ~2 s spoken motion hook before round 1, with synthesized SFX (`synth_hook_sfx.py`).
- `youtube.ts replace` swaps a live upload and keeps its title, description and publishAt.

### 2026-10-27 — Hook week
- **28/28 quiz videos (10-27 → 11-02) carry an approved hook intro** and were swapped on YouTube. Tracker: `data/hooks/quiz-ar.json` (8 hook categories). Docs: `hooks.md`, `hook-brief.md`.
- Per-line loudness pins and standalone re-voice pins for narration.

### 2026-10-28 — Analytics, Ask Studio, quality rules
- quiz-ar Studio analytics (views, stayed %, average view %, subs, likes) pulled into the hooks tracker. A pre-hook baseline row was added to the dashboard Hooks panel.
- **Ask Studio review of all 4 channels** (`docs/ask-studio-2026-10-28.md`, per-brand files, `data/ask-studio/`). Finding: the first 3 s lose viewers, and outro CTAs cause a drop-off cliff.
- **Planet Extremes 12/12 scheduled** at 3/day. `youtube.ts reschedule` added.
- **Enhancement queue** (`data/enhance-queue.json`, `scripts/enhance-queue.py`): 17 quiz videos rebuilt and replaced, then paused by the owner for an old-vs-new comparison.
- **Description rule**: no AI-generation text anywhere. `youtube.ts desc-clean` + `scripts/ai_strip.py` cleaned 132 uploads.
- **Mojibake guard**: `build.ts` refuses on-screen text with cp1252 damage, after the "Â·" name card on og7k.
- `.venv-asr` pinned to `av==13.1.0` (faster-whisper fix). B-roll `inserts` added to the builder.
- Rights tightened: JHUAPL MESSENGER/New Horizons rejected as non-commercial. SOHO/EIT pending.

### 2026-10-29 — YouTube intelligence system
- **`docs/youtube-intelligence/`**: an evidence-first audit of all 4 channels. Read-only API pull (`tools/yt-intel-pull.ts`) plus Studio reads and Ask Studio (fact-checked).
- Outputs: scoring spec v1.1, per-channel scorecards and action plans, a recommendations tracker, pre-registered experiments, a video registry (162 videos), and competitor and features research.
- **Dashboard artifact**: https://claude.ai/artifact/QAXJ8pXQ7zTrrDbSUP4V1m (a snapshot; refresh with `yt-intel-pull.ts` + `build-dashboard-data.py`).
- Provisional scores: quiz-ar 66.1 · Mission Voices 53.6 · TWIWM 49.1 · Planet Extremes 42.8.

### 2026-10-31
- Full snapshot commit `56dc206`. Bulky working media (PNG frames, npy, mpg, pdf, logs) are now git-ignored and kept on disk.

---

## 3. Agents — who does what

All agents follow `AGENTS.md`:
- Log real work with `task:start` / `task:progress` / `task:finish`.
- Hand off work as JSON records, not prose.
- Respect the rights gate.
- Only OCC edits videos.
- Nobody reviews their own work.
- No spending or publishing without the owner's OK.

Each agent keeps notes in `memory/agents/<id>.md`.

### Channel showrunners (end-to-end producers)
| Agent | Model | Since | Job |
|---|---|---|---|
| `showrunner-planet-extremes` | opus* | 10-21 | Planet Extremes rankings: research → footage and rights → analysis → ranking → script → cut list → build → techqa → hand to QA |
| `showrunner-mission-voices` | opus* | 10-21 | Mission Voices clips: long-form source → GPU transcript → moment scoring → word-accurate cut → context card → build → techqa |
| `showrunner-way-it-was-made` | opus* | 10-21 | TWIWM compilations: archive footage → scene analysis → story angle → script → build → techqa |
| `showrunner-shu-shayef` | sonnet | 10-22 | شو شايف؟ quizzes: round design → original puzzle art (Codex) → Arabic script → `quiz.json` → `packages/quiz` build → techqa |

\*The agent files say opus, but per CLAUDE.md (token budget, 10-22) showrunners are run as **sonnet**. The owner likes **two per channel** in separate topic lanes.

### Independent gatekeepers
| Agent | Model | Since | Job |
|---|---|---|---|
| `qa-director` | sonnet | 10-21 | Scores the rendered MP4 on the 100-point rubric with timestamped defects. Bars: ≥85 (clipping ≥80), no blockers |
| `rights-scout` | sonnet | 10-21 | Gives every source a rights status with evidence and countersigns sources and generated art. It often overturns sources (CBS, CIRA, JunoCam, JHUAPL…) |
| `retention-reviewer` | sonnet | 10-25 | Second reviewer for Mission Voices: checks R1–R8 retention rules (length, dead air, cold open, frame-0 hook, loop ending, CTA). Bar ≥80 |

### Specialists (used on demand)
| Agent | Model | Since | Job |
|---|---|---|---|
| `ranking-director` | opus | 10-21 | Ranking criteria, order, countdown story, edit brief |
| `clipping-director` | opus | 10-21 | Picks moments from long-form, sets word-accurate boundaries, protects the speaker's meaning |
| `compilation-director` | opus | 10-21 | Editorial storyline for themed compilations |
| `viral-analyst` | opus | 10-21 | Multimodal moment analysis; scores 8–50 clip candidates with evidence |
| `occ-producer` | sonnet | 10-21 | Builds and revises OpenChatCut projects: timeline, captions, audio mix, export |
| `script-localization` | opus | 10-21 | Hooks, narration, on-screen text, titles/descriptions, Arabic localization and RTL |
| `trend-hunter` | sonnet | 10-21 | Topic, trend and competitor research → scored idea records |
| `growth-director` | sonnet | 10-21 | Account strategy, platform packaging, publishing queue, analytics, experiments |

### Orchestrator (main Claude session)
- Spawns showrunners with caps (~2 GB downloads, stop if C: is under 12 GB, at most ~3 agents at once).
- Relays QA and rights findings in compact lists.
- Approves through `POST /api/productions/<id>/decision`, only when QA, insights score and rights all pass.
- Runs publishing (owner's standing OK for YouTube API uploads of approved videos).

### Production loop (the same for every video)
`showrunner build → techqa → qa-director + rights-scout (+ retention-reviewer for MV) → fixes back to the same showrunner → rebuild (2–5 rounds) → orchestrator approve → publish-plan → youtube.ts upload → dashboard sync`

---

## 4. Feature map by area

### Pipeline packages
| Package | What it does |
|---|---|
| `packages/shared` | SQLite DB, event bus, JSON schemas (contracts), secrets reader, reference-library helper |
| `packages/orchestrator` | Job queue, agents sync, the **CLI** (`npm run -s cli -- …`) |
| `packages/discovery` | Source discovery across providers (NASA, Internet Archive, Wikimedia, Pixabay; YouTube only for discovery) |
| `packages/rights` | Rights gate: only approved and approved-with-conditions sources can enter a publishable video |
| `packages/intelligence` | GPU transcription (faster-whisper), word aligner, scene/audio/motion analysis, `fullview`, **techqa** |
| `packages/occ` | OCC MCP client, edit locks, the **builder** (`build.ts`: cut list → finished, mastered render) |
| `packages/voice` | Gemini TTS with key failover and a content-hash cache |
| `packages/quiz` | Quiz engine: templates, hook intros, Arabic captions, narration, peek-proof, leak guard, remaster, A/B takes |

### CLI commands (`npm run -s cli -- <cmd>`)
- **Work log**: `status`, `task:start|progress|finish`, `job:list|retry|cancel`, `cycle:report`, `lesson:add`, `agents:sync`, `secrets:check`
- **Ideas and brands**: `brand:list|upsert`, `idea:add|list|status`
- **Sources**: `source:acquire|analyze|attach-file|enrich|fetch-social|list|show|set-download`, `rights:set`
- **Productions**: `production:create|attach|list|show|stage|retitle|predict`, `candidate:add|list|status`, `review:add`
- **Quiz**: `quiz:plan`, `quiz:build`, `quiz:assets`

### Builder (`packages/occ/src/build.ts`)
- **Modes**: headless or watch mode (live in the owner's editor). Every step runs in an OCC edit session, and a step's draft is discarded if the step fails.
- **Layout**: platform safe zones, balanced line wrap, auto-crop of baked-in borders, pan and push/pull motion, blur fill, B-roll inserts, overlay lanes.
- **Captions**: built from our own word timestamps. Fillers, stutters and restarts are cleaned; emphasis words; minimum page length; clip/y-range/background options.
- **Audio**: original tone/score bed with accents, source levelling and fades, loudness master, true peak, A/V length match.
- **Safety**: frame-exact grid, refuses mojibake text, rights-gated cut list.

### QA tooling
- `techqa.py`:
  - flashes and 10 ms dropouts
  - blank tail
  - A/V length
  - answer-leak guard
  - card on every round change
  - loudness
- Also: `captions_audit`, quiz `peek-proof`, `mv-retention-check.py`.
- Rubrics: `docs/review-rubric.md` (QA /100), `docs/insights-rubric.md` (YouTube-insights score, approval needs ≥85), `docs/scoring.md`.

### Publishing and growth
- **YouTube API** (`scripts/youtube.ts`): `status`, `auth`, `list`, `upload`, `adopt`, `replace`, `reschedule`, `meta`, `desc-clean`, `stats`, `views`, `analytics`.
- **Planning**:
  - `publish-plan.py` (audience-time slots, DST-safe, skips taken and past slots)
  - `audience-slots.py`
  - `sync-publishing.py`
  - `yt-refresh-published.py`
  - hourly retry loops for the upload cap
- **Facebook**: Business Suite in the browser plus `fb-plan.py` / `fb-mark.py` / `fb-encode.py`.
- **Intelligence**: `docs/youtube-intelligence/` (scorecards, experiments, tracker, dashboard artifact), Ask Studio reviews, quiz hooks tracker.

### Dashboard (`npm run api` → http://127.0.0.1:4320)
- **Live**: SSE feed over the DB.
- **Board**: production stages, from idea to published.
- **Review**: version tabs, video seeking, approve/reject dialog.
- **Calendar**: week, month and list, in local time, with YouTube links.
- **Channel pages**: one per brand, including the quiz-ar Hooks panel with stayed % and baseline.
- **Accounts**: connected YouTube accounts.

---

## 5. Goals and where they stand (2026-10-31)
| Goal | Owner set | Status |
|---|---|---|
| شو شايف؟ 100 → 200 new videos | 10-22 / 10-23 | 125+ approved, 110 scheduled or published; new batches paused by the owner; enhancement queue paused for comparison |
| TWIWM goal 26 | 10-25 | 26/26 approved; uploads limited by the account-wide YouTube cap |
| Mission Voices goal 28 | 10-25 | 27/28 approved; the 28th slot is the owner's choice (iyl5 at 77 vs 5eqr at 78) |
| Planet Extremes plan 12 | 10-28 | 12/12 scheduled |
| YouTube intelligence | 10-29 | Audit done; next audit 11-01, re-score 11-05 |

## 6. Open owner decisions / known gaps
- Mission Voices 28th slot. Re-upload the two public clips with mojibake name cards (8np0, og7k)?
- Facebook quiz posts still carry pre-hook renders. Mission Voices and TWIWM Facebook pages are not created yet.
- quiz-ar: creator written permission, trademark search for «شو شايف؟».
- Gaps:
  - Still images can't be used as segments.
  - `production:attach` can't detach a source.
  - OCC dedupes imports by content hash (stale TTS takes).
  - ~2-frame blank at the hook→round-1 join.
