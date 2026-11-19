# viral-rankings — Implementation report (2026-10-31)

Owner request: implement `docs/VIRAL_RANKING_STUDIO_MASTER_PROMPT.md` end to end and produce a ranking video. Mid-run owner change: **TOP 5 per video, bigger rank text, title accents on topic keywords only, three videos in parallel (fails / cute animals / funny animals).**

## Result
| Production | Title | Version | Length | QA | Insights | Retention | Rights |
|---|---|---|---|---|---|---|---|
| rank-261031-fzcu | TOP 5 DEEP-SEA OCTOPUS MOMENTS | v14 | 30.1 s | 89 | 91 | 83 | countersigned (NOAA OE, PD) |
| rank-261031-jcx9 | TOP 5 YOUNG ANIMAL MOMENTS | v5 | 27.0 s | 86 | 88 | 83 | countersigned (Pixabay) |
| rank-261031-8knt | TOP 5 SILENT-FILM FAIL MOMENTS | v8 | 27.1 s | 85 | 88 | 84 | countersigned (LoC Edison paper prints) |

All three approved by the orchestrator (stage `approved`). **None published or scheduled.** Renders: `productions/<id>/<version>/render.mp4`. Fixture `rank-261030-rp86` is stage `rejected` (build-path test only).

Retitled 2026-10-31 to the owner title rule `TOP <N> <WORD1> <WORD2> MOMENTS` (two accent words), validator-enforced; regression QA carried scores.

## Phase status (honest)
| Phase | Status | Evidence |
|---|---|---|
| 0 Audit | done | IMPLEMENTATION-GAP-AUDIT.md (incl. §5 hardening H1–H7), ARCHITECTURE.md |
| 1 Brand/data contracts | done | brand `viral-rankings`; tables categories, category_metrics_snapshots, moments, moment_usage; ideas.category_id; zod schemas; 22 seeded categories |
| 2 Discovery/library | done (partial providers) | Scrapling 0.5 + `discover noaa`, `packages/discovery/py/scrape_media.py`; Pixabay via page fetch (Scrapling 403); LoC via Wayback (loc.gov 403); TikTok/IG only for research; 40 moments in library |
| 3 Creative production | done | RankingPlan + validator + reveal director; writer/critic loop (2 rounds pilot, 1–2 per batch video); Gemini TTS cached; word-synced captions with onset snap |
| 4 OCC render + QA | done | 3 approved TOP 5 renders through OCC; independent QA, retention, rights on each |
| 5 Dashboard + learning | done (fixtures only for analytics) | `#vr/overview, arena, categories, moments, rank, script, lineage, learning`; `/api/vr/*`; 9 TEST FIXTURE snapshots |
| 6 Regression | done | typecheck (known quiz hook errors only), test-build-helpers 13/13, test-tone-bed pass, test-viral-rankings 101/101, dev-quiz-compat unchanged; legacy counts 222 productions / 209 approved / 290 publishing unchanged |

## Agents and decisions (orchestrator-reviewed)
- 3 independent scouts (trend / evergreen / gaps) → idea judge (Opus) picked deep-sea NOAA (78) with spot-checks that caught 3 scout errors (non-federal Nautilus footage, fake "720p", low-res cuttlefish).
- Rights-scout overturns this run: Lumière snowball fight (modern box-set restoration) rejected; hose gag (YouTube-sourced scored transfer), sack race (unknown IA uploader), 5 Commons-only NOAA copies held pending. Lesson: Commons PD tag ≠ clean transfer.
- QA loops: deep-sea 73 → 81 → 88 → 89; animals 76 → 86; fails 77 → 85 → 85. Retention: 74 → 79 → 83; 76 → 83; 77 → 84 → 84.
- Orchestrator calls: "our robot" → "this robot" (NOAA owns the ROV); BABY → YOUNG ANIMALS (dog is not a baby); credits per clip; compact title so 4:3 archive footage reaches 50 % height.
- `video-analyze` skill was not used at first (frames-by-eye only) — owner asked; then `source:analyze` ran on all 8 NOAA sources + the skill on 3 (found 2 eye-analysis errors). Wrapper `scripts/video-analyze.sh` added (skill calls `python3`).

## Key code changes
`packages/ranking/` (new: library, plan, reveal, cutlist, layout, layers + py/layers.py, zone_check), `packages/shared/src/{db,schemas}.ts`, `packages/orchestrator/src/{cli,agents}.ts`, `packages/occ/src/build.ts` (content-hash import, snap_onsets narration, caption clamp, per-entry framing/fill_box/clipped punch, credit/caption fields — all opt-in/brand-gated), `packages/discovery` (noaa provider, Scrapling helper), `apps/api/src/vr.ts` + `apps/studio/public/vr.js`, `config/policy.json` (viral-rankings bars = rankings; countersign actors), agents `.claude/agents/{comedy-voice-writer,punchline-critic,showrunner-viral-rankings}.md`, `scripts/test-viral-rankings.ts`, `scripts/video-analyze.sh`. DB backup before migration: `data/backups/studio-20261031-013208.db`. Nothing committed.

## Not done / limits
- Analytics: no real snapshots (nothing published); loader from yt-intel-pull into `category_metrics_snapshots` not built. Learning view runs on labelled fixtures only.
- Benchmark watched 6 refs (target 8–10); YouTube refs metadata-only by studio rule.
- Rank editor has no crop preview / voice audition; no QA/publishing view in the vr section.
- TTS: lane A used 3 requests, lane B 2 (shared quota with the sibling studio).
- Residual rights risk: NOAA Dive 04 piloted by contractor GFOE (approved on NOAA's PD publication; certainty needs an email to NOAA OE). Lumière worldwide status = owner legal call (not used in the final cut).
- fzcu/jcx9 were built with the old (unclipped) punch; a rebuild would look slightly different.

## Owner decisions needed
1. Public name/handles (proposed **Podium Pop**; conflict check only, no trademark clearance) and whether to create the channel.
2. Publishing the 3 approved videos (and which account/schedule).
3. Optional: email NOAA OE about GFOE-piloted footage; keep or delete the 6 research-only TikTok downloads.
