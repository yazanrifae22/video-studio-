# Viral Rankings — implementation gap audit (verified in code)

Author: `pipeline-engineer` (orchestrator helper), 2026-10-31. Every "exists now" claim below was checked in the live code, not the snapshot docs (`STUDIO-FEATURES.md`, `RANKING VIDEO.md`). Line numbers are as of this commit.
Legend: **C** = confirmed current behaviour (before this change) · **N** = added in this change (Phase 0/1) · **B** = added by the build step (2026-10-31, see ARCHITECTURE.md §6) · **P** = proposed, not built.

## 1. Confirmed current behaviour (short inventory)

| Area | Confirmed behaviour | Evidence |
|---|---|---|
| DB | One SQLite file, schema created by `CREATE TABLE IF NOT EXISTS` on every open; no migration table, no versioning; JSON columns for nested data | `packages/shared/src/db.ts:20-149` (`SCHEMA`), `db()` |
| Brands | `brands` row + 5 placeholder `accounts` rows (`not_created`) per brand via `brand:upsert`; 4 brands (`clipping`, `compilations`, `quiz-ar`, `rankings`) | `packages/orchestrator/src/cli.ts:107-117` |
| Ideas | `ideas` has scores/evidence + a free `data` JSON; no category link; no proposal/judge structure | `db.ts:29-34`, `cli.ts` `idea:add` |
| Sources | Rights live on the **source** (`permission_status`, `license_expires`, `usage_restrictions`, `fingerprint` sha256, `phash` column never written) | `db.ts:35-46` |
| Moments | Only `candidates` (start/end seconds, scores, `rights_status` copied from source). No moment identity across productions, no usage/lineage, no setup/payoff/reaction times, no duplicate links | `db.ts:51-59`, `rights.ts:94` |
| Rights gate | `assertPublishable(assetIds)` = approved/approved_with_conditions + not expired; called by the builder on every cut-list asset | `packages/rights/src/rights.ts:100-110`, `packages/occ/src/build.ts:516` |
| Rights changes | `setRights` requires evidence for approvals and logs to `rights_log`; candidates inherit | `rights.ts:80-98` |
| Productions | `production:attach` merges ids into JSON arrays — **cannot detach**; the build gate only reads `cutlist.json`, so stale attached sources are harmless but misleading in lineage | `cli.ts:274-284`, `docs/cutlist.md:54` |
| Builder | `cutlist.json` → TTS → align → OCC MCP project → OCC headless render (`withLock('render')`) → master → techqa. Text overlays: one colour per item from a role `STYLE` table (`rank`, `title`, `label`, `cta`…), purple/red/black plates | `build.ts:79-91`, `build.ts:826-860`, `build.ts:887` |
| Builder: stills | Still images only as `insert` B-roll over a video segment (ffmpeg plate), not as segments | `build.ts:30-33`, `docs/cutlist.md:54` |
| Builder: OCC dedupe | OCC skips importing a file whose content is already in the project; builder falls back to **lookup by file name** — a renamed identical file (e.g. stale TTS take) maps to the old pool item | `build.ts:771-774` |
| Builder: blank joins | Segments laid on an exact frame grid (fixes fractional-frame gaps). Remaining known ~2-frame blank is in the **quiz** hook→round join, not this builder | `build.ts:581-591`, `STUDIO-FEATURES.md` §6 |
| Discovery | Providers: wikimedia, internet_archive, nasa, pexels, pixabay, youtube (metadata only). **No TikTok/Instagram/Mixkit/Scrapling adapter**; social fetch is a separate yt-dlp script gated on approved rights | `packages/discovery/src/providers.ts:162`, `cli.ts` `source:fetch-social` |
| Voice | Gemini TTS, cached by text+voice+style hash, key bench on 429/403, shared quota | `packages/voice/src/gemini-tts.ts:55-61,117` |
| QA | `review:add` blocks self-review (`built_by`), verdict pass = ≥85 & no blockers; techqa.py checks blank tail, A/V length, loudness, flashes | `cli.ts:290-302`, `packages/intelligence/py/techqa.py:82-111` |
| Approval | API decision endpoint: verdict pass, or per-brand `approvalMinQa` bar (only `clipping: 80` existed) | `apps/api/src/server.ts:134-152` |
| Analytics | `analytics_snapshots` table exists but has **0 rows**; YouTube intelligence lives in files under `docs/youtube-intelligence/` (API pulls → CSV → artifact dashboard) | `db.ts:85-90`, live count 0 |
| Dashboard | Fastify + static vanilla JS (`apps/studio/public/app.js`, 681 lines) + SSE over `events`; `/api/channel/:brand` per-brand view | `apps/api/src/server.ts:58,185` |
| Agent log | `task:start` requires a row in `agents`; actors synced from `.claude/agents/*.md` + built-ins | `packages/shared/src/events.ts:35`, `packages/orchestrator/src/agents.ts` |
| Typecheck | `npm run -s typecheck` currently fails on **pre-existing** errors in `packages/quiz/src/hooks/4lys_domino_chain.ts`, `6go7_stair_climb.ts` (implicit any) — not from this change | `tsc` output |

## 2. Requirement matrix

| # | Requirement (master §) | Exists now (C) | Reusable module | Missing → status | Risk | Owner decision | Evidence |
|---|---|---|---|---|---|---|---|
| 1 | Register new brand without affecting others (A5, Q1) | `brand:upsert` (adds 5 account rows) | `cli.ts` brand:upsert | `--no-accounts` flag, `brands/viral-rankings/brand.json` → **N** | low | public name + accounts | `cli.ts:107-117`; test [1] |
| 2 | Same QA/approval bar as `rankings` (A6) | default pass ≥85 | `policy.json approvalMinQa` | `approvalMinQa["viral-rankings"]=85`, `viralRankings` block → **N** | low | — | `config/policy.json` |
| 3 | Two-level categories with purpose/queries/risk/cadence (E) | none | — | `categories` table + `Category` zod + `category:add/list` + seed (5×2–4) → **N** | low | final category set from research | `db.ts` SCHEMA_V2; test [2] |
| 4 | Category metrics as timestamped snapshots, null≠0, 24h/72h/7d buckets, fixture label (E, N, Q12) | none (analytics in files) | — | `category_metrics_snapshots` + `category:snapshot --fixture` → **N**; aggregation job from real YouTube data → **P** | med (fake numbers) | — | test [2] |
| 5 | Idea ↔ category link; 3 scout proposals + judge scores (C, F, Q3) | ideas without category | `ideas.data` JSON | `ideas.category_id` (nullable) → **N**; proposals/judge stored in `ideas.data.{scout,judge}` → convention documented, CLI → **P** | low | — | `db.ts:210` |
| 6 | Moment entity (start/end ms, setup/payoff/reaction, transcript, quality, risks, tags) (H) | candidates only | `candidates` for older brands | `moments` + `Moment` zod + `moment:add/list` → **N** | low | — | test [5] |
| 7 | Creative status separate from rights status (H) | n/a | — | `moments.creative_status` + nullable `moments.rights_status` (null = inherit source) → **N** | low | — | `library.ts momentRights` |
| 8 | Reserve one moment, siblings stay usable (H, Q5) | n/a | — | `moment:reserve` + `moment_usage` → **N** | low | — | test [5] |
| 9 | Usage lineage source→moment→production→version→platform (H, Q11) | `productions.source_assets` JSON only | — | `moment_usage` rows; `ranking:validate --record` writes them → **N**; usage updates on approve/publish → **P** | med (lineage drift) | — | `library.ts recordUsage` |
| 10 | Fingerprint/phash + duplicate linking (H) | `sources.fingerprint` sha256; `phash` column unused | `analyze.py` frames | `moments.checksum/phash/duplicate_of`, exact-window + phash dupe flag → **N**; computing perceptual hashes → **P** | med | — | `library.ts addMoment` |
| 11 | Reuse cooldown + duplication alerts (H) | none | — | `policy.viralRankings.reuseCooldownDays` (30) checked by the plan validator as a warning → **N** | low | cooldown length | `plan.ts` |
| 12 | ≤2 per source, non-adjacent, no overlap, no repeated moment (H) | none | — | enforced in `validateRankingPlan` → **N** | low | — | test [7] |
| 13 | rank_position ≠ reveal_index, exactly one reveal per rank (J, Q7) | builder has `item` only | — | `RankingPlan` zod + validator → **N** | low | — | test [7] |
| 14 | Reveal-order director with recorded candidates + reasons (J) | none | — | `packages/ranking/src/reveal.ts`, `ranking:reveal` → **N** | low | default weights | test [J] |
| 15 | Rights gate before a publishable cut list (A8, O, Q6) | source-level gate in builder | `assertPublishable` | plan-level gate incl. moment rights, expiry, `rights_decision_id` → **N**; `ranking:cutlist` re-runs it per moment and the builder re-checks moment rights before building → **B**; countersign required (latest rights_log row by rights-scout/owner) → **H1** | **high** if bypassed | — | test [6] |
| 16 | RankingPlan → cutlist.json conversion | none | `build.ts` cut list | `ranking:cutlist` (ms→s, reveal order, `item`=rank, `ranking.entries` map, rank_layers) → **B** | med | — | — |
| 17 | Two-colour title (A/M) | one colour per text item | `STYLE` table | `title_styles.spans` → full-canvas title PNG (per-word colours) → **B** | med | accent colours | `build.ts:79-91,851` |
| 18 | Left rank rail with active marker, 3/5 slots, persistent labels in non-sequential order (M) | `rank` role = one centred card | text items + `Overlays N` lanes | one rail PNG per reveal state on track `VR Rail` (active/revealed/hidden cards, 3/5 slots) → **B** | med (collisions) | — | `build.ts:826-838` |
| 19 | Brand mark in a safe corner (M) | none; only text overlays and B-roll inserts | `insert` (ffmpeg) / OCC image items | `vr_logo.png` image item on `VR Brand` (fallback text mark) → **B** | low | logo art | `build.ts` (no logo code) |
| 20 | Optional ≤0.8 s mid CTA, end CTA, loop ending (K, M) | `cta` role = end card (red plate) | `STYLE.cta` | `cta_variant` none / `mid_sub` (≤ 0.8 s alpha WebM, payoff-safe) → **B**; end CTA stays a narration line | low | default off | `build.ts:90` |
| 21 | Safe-zone collision detection vs baked-in captions (B) | role safe-zone defaults only; techqa has no OCR/collision check | `fullview` T flag (edge heuristic) | `zone_check.py` edge-density heuristic under rail/caption/title zones (warn-only) → **B** | med | — | `docs/cutlist.md` fullview |
| 22 | Still images as segments (B) | not supported | `insert` plate code | still→short mezzanine clip (ffmpeg loop) as a segment → **P** | low | — | `docs/cutlist.md:54` |
| 23 | `production:attach` detach (B) | merge-only | — | `--detach` flag + lineage event → **P** | low | — | `cli.ts:274-284` |
| 24 | OCC import dedupe by hash (B) | name fallback | — | content-hash staged names + `occ-pool.json` sha map + tagged-copy fallback; test in test-viral-rankings [B] → **B** | med (wrong take) | — | `build.ts:771-774` |
| 25 | Blank joins (B) | frame grid + techqa blank-tail | techqa | per-join black-frame check in techqa (not just tail) → **P** | low | — | `techqa.py:82` |
| 26 | Discovery: TikTok/IG/Scrapling adapters with graceful failure (G, Q4) | none (TikTok failed in the demo) | `ingest()` in discovery engine | metadata-only adapters storing `research_only` + `verified/unknown` stats → **P** | high (ToS) | platform access | `providers.ts:162` |
| 27 | Ranking rationale separate from presentation order; no "likes = quality" (B) | demo ranked by likes | — | `ranking_criterion` + `criterion_kind` (editorial/measured) in plan; fact-like wording warning → **N** | med | — | `schemas.ts RankingPlan` |
| 28 | Comedy writer / critic loop + word captions (L, Q8) | narration + captions in builder | `voice`, `align.py`, `pageCaptions` | per-entry `narration_ref`/`captions_ref` fields exist → **N**; writer/critic workflow → **P** | low | voice style | `build.ts:540-650` |
| 29 | Dashboard views (overview, idea arena, category explorer, moment library, rank editor, lineage) (M) | per-brand channel view only | `server.ts`, `app.js`, SSE | API routes listed in ARCHITECTURE.md §5 → **P** | low | — | `server.ts:185` |
| 30 | Analytics snapshots at 24h/72h/7d from real data (N, Q12) | table empty; data in files | `docs/youtube-intelligence/tools/yt-intel-pull.ts` | loader from the existing pull into `analytics_snapshots` + category roll-up → **P** | med | — | live count 0 |
| 31 | Never overwrite live DB unsafely; backups (A2) | none | — | `data/backups/studio-<ts>.db` via `VACUUM INTO`, `data/backups/` git-ignored → **N** | low | — | `.gitignore` |
| 32 | Schema versioning / migration log | none (implicit) | — | `PRAGMA user_version` or a `migrations` table → **P** | low | — | `db.ts` |

## 3. Gaps found in live code that the snapshots did not mention
1. `analytics_snapshots` is empty (0 rows); all YouTube numbers live in files. Category analytics cannot be computed from the DB until a loader exists (#30).
2. `sources.phash` exists but nothing writes it (#10).
3. No schema version / migration log: `db()` re-runs DDL on every open, so any process that opens the DB applies new DDL — the running API (`npm run api`) picks up the new tables on its next restart only, but a CLI call applies them immediately.
4. `candidates.rights_status` is a copy of the source status updated by `setRights` (`rights.ts:94`); a moment-level narrower decision had nowhere to live. Now `moments.rights_status` (nullable = inherit).
5. `task:start` refuses unknown agents; `pipeline-engineer` added as a built-in actor (`agents.ts`).
6. `review:add` self-review guard relies on `productions.data.built_by`, written only by `build` and `quiz:build` (`occ/src/build.ts:531`, `quiz/src/build.ts:74`) — a production rendered by any other path would not be guarded; the ranking cut-list path must go through `build`.
7. CLI wrapper resets `process.exitCode = 0` after a successful handler, so handlers must throw to fail (`cli.ts` bottom).
8. `typecheck` fails on two committed quiz hook files (pre-existing).

## 4. Prioritised plan
1. **Done (this change):** brand, policy bar, tables + indexes, zod contracts, plan validator + rights gate, reveal director, CLI, seed, tests, backups.
2. **Build step — done 2026-10-31 (B rows; fixture rank-261030-rp86):** (a) `ranking:cutlist` converter RankingPlan → `cutlist.json` that re-runs `assertPublishablePlan`; (b) rail + two-colour title + brand mark + `cta_variant` in `build.ts` (#17–20); (c) OCC import map by sha (#24); (d) usage status update on build/approve (#9).
3. Rights-scout + viral-analyst workflow using `moment:add` / `moment:set-status --rights` on Pexels/Pixabay/Commons/PD sources.
4. Dashboard API routes + views (ARCHITECTURE.md §5) — read-only first.
5. Analytics loader into `analytics_snapshots` + category roll-ups with sample-size warnings (#30, #4).
6. Discovery adapters (metadata-only, `research_only`) and perceptual hashing (#26, #10). Still segments / detach / per-join blank check (#22, #23, #25).

## 5. Hardening found during production (2026-10-31, pipeline-engineer) — **H** = done, tested in `scripts/test-viral-rankings.ts`
Approved/QA productions (fzcu v13, jcx9 v4, 8knt) were not rebuilt; their plan/cutlist/script files and renders untouched. No DB schema change, no DB writes.

| # | Gap | Fix | Evidence |
|---|---|---|---|
| H1 | `ranking:validate`/`ranking:cutlist` accepted `approved_with_conditions` that a showrunner only *proposed* | Countersign derived from `rights_log`: latest row per used source (and per moment with its own rights) must be by `policy.viralRankings.countersignActors` (rights-scout, owner); applies in validate, cutlist and the build-time recheck; `rights_decision_id` must be a countersign row. fzcu/jcx9/8knt plans still pass (read-only) → **H** | `library.ts rightsCountersign`, `plan.ts`, `layers.ts rankingRightsRecheck`; tests [6] |
| H2 | Hand edits to `cutlist.json` after `ranking:cutlist` (end hold, credit plate size/y/wrap, caption width, clean credits) were lost on re-run; `credit_center_y_px` capped at 1430 | Plan fields `end_hold_ms`, `caption_max_chars`, `caption_font_px`, `credit_style{font_px,max_chars}`, `credits[]`; `credit_center_y_px` ≤ 1520 (warn > 1460). The three productions' hand-edited cut lists regenerate from plan + these fields (key order aside) → **H** | `schemas.ts RankingPlan`, `cutlist.ts`; `docs/cutlist.md`; tests [B] |
| H3 | "Mojibake in cutlist why strings" (fzcu v9 QA) | Root cause: the file was valid UTF-8; the em dash was mis-decoded by cp1252 readers (PowerShell 5.1 `Get-Content`, Python `open()` without encoding). `why` now ASCII; `ranking:validate` refuses mojibake in any plan string; CLI `readJson` tolerates a BOM → **H** | `cutlist.ts`, `plan.ts`, `cli.ts readJson`; tests [B] |
| H4 | `review:add` from retention-reviewer overwrote `productions.qa_score` / state, and became "the latest review" for approval | Review `kind` (json `kind`, else inferred: retention-reviewer → retention, rights-scout → rights, punchline-critic → critic). Only QA reviews (stored `kind='agent'` as before) update `qa_score`/state; side reviews stored with their kind and a free numeric breakdown. Approval gate, dashboard and reference-library "latest review" queries filter to QA kinds. Existing rows unchanged → **H** | `schemas.ts reviewKind/SideReview/QA_REVIEW_SQL`, `cli.ts review:add`, `server.ts`, `reflib.ts`, `vr.ts`; tests [R] |
| H5 | Fixed 3-line title band limited 4:3 footage to ~38 % height | Opt-in `title_layout: "compact"` (one-line band y 262-402, footage box y 410-1370 = 50 %, max `[0,410,1080,1420]`) + entry `framing.fill_box` (auto centre-crop to the box aspect, ≤ 25 %); `footage_height_pct` per entry. Defaults unchanged → **H** | `layout.ts VR_TITLE_LAYOUTS/fillBoxTrim`, `cutlist.ts`, `layers.ts` (title_box → layers.py + zone check), `build.ts` (passes title_box to the zone check); tests [B] |
| H5b | Punch-in (1.15x) grew the picture upward past the fit_box into the title band (8knt v6, compact layout) | Punch baked into the segment window at fixed frame size (zoompan, bottom-centre anchor) → clipped to the fit_box; `punch.clip:false` = legacy keyframes → **H** | `build.ts windowFor/punchFilter`; test [B] (synthetic: fixed 1080x810, 90/90 frames, top band cropped after zoom) |
| H6 | `video-analyze` skill calls `python3` (Store stub hangs) | `scripts/video-analyze.sh` wrapper: temp `python3` shim → `.venv-asr` python, YouTube refused, output under `data/cache/research/` → **H** | `DISCOVERY-AND-RIGHTS.md` §6 |
| H7 | `scripts/test-tone-bed.ts` crashed without an out-dir argument and asserted nothing | Optional out dir (temp by default), DC-offset/peak assertion, exit code → **H** | `scripts/test-tone-bed.ts` |

