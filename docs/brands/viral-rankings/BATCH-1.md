# viral-rankings — Batch 1 (owner request 2026-10-31)

Three TOP 5 videos in parallel, one showrunner each. Owner rules for every video:
- **TOP 5** (5 distinct moments, 5 distinct sources by default, reveal order non-sequential via `ranking:reveal --n 5`).
- **Title accents = topic keywords only** (subject nouns, e.g. "BABY GOATS", "OCTOPUS", "SACK RACE"), never hype words (funny, funniest, hottest, craziest, best, top, most, insane, epic, wild). White for the connective words.
- **Title format (owner, final 2026-10-31): exactly `TOP <N> <WORD1> <WORD2> MOMENTS`** (e.g. TOP 5 DEEP-SEA OCTOPUS MOMENTS); WORD1 primary accent, WORD2 secondary accent, TOP N / MOMENTS white; hyphenated compounds = one word. Validator-enforced. The three approved productions were retitled to this rule (title layer only).
- **Rank rail text is bigger** (new builder default) — keep labels ≤12 chars.
- Target 28–40 s, every entry ≈5–7 s, no speechless stretch >1.4 s unless a deliberate payoff beat with visible motion; frame 0 = motion (use `source:analyze` motion data, see `productions/_viral-rankings-pilot/motion-report.md` for the method).
- Bars: QA ≥85 no blockers, insights ≥85, retention ≥80, rights countersigned.

| Lane | Video | Pool | Production folder |
|---|---|---|---|
| A — funny fails | Vintage fails (1896–1928 public-domain films: sack races, snowball fights, pratfalls, early stunts) | Library of Congress / Wikimedia Commons / Internet Archive — verify PD on the primary page (LoC preferred); picture only, all audio ours (restoration scores are a rights risk); low-res 320–480 px sources need an honest "archival" frame treatment, never fake upscaling claims | created by showrunner |
| B — cute animals | Cute animals (baby animals, pets being adorable) | Pexels / Pixabay / Mixkit / Commons CC0 — licence on the clip page, no people-identifying faces needed, no watermarks | created by showrunner |
| C — funny animals | Deep-sea animals vs the robot, expanded to TOP 5 | Existing 8 rights-approved NOAA sources (`moment:list --brand viral-rankings`); reuse the library — one moment per source | rank-261031-fzcu (new version) |

## Showrunner phases
1. **Pre-production (now):** idea record (`idea:add`, brand viral-rankings, category id) → sources (`discover` / Scrapling provider; ≤2 GB) → `rights:set` proposed → `source:analyze` (GPU lock, one at a time) + your own frame look → `moment:add` (≥7 candidates so 5 slots have buffers) → `ranking-plan.json` + `ranking:reveal --n 5` + `ranking:validate` → **draft script** `productions/<id>/script/writer-pass-1.json` (format: `.claude/agents/comedy-voice-writer.md`; ≥3 lines per moment, hook options, titles obeying the keyword rule). Then STOP and report. The orchestrator sends the draft to an independent punchline-critic and rights-scout.
2. **Build (after the orchestrator relays critic + rights results):** apply critic notes → TTS (one request; cache) → `ranking:cutlist` → `build` (OCC; one render at a time — wait on the lock, don't fight it) → techqa → `ranking:zones` → ≤8-frame self-check → stage `qa`.
