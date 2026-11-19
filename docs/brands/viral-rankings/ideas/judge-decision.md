# Idea judge: viral-rankings pilot (2026-10-31)

Full data: `judge-decision.json`. Inputs: scouts A (trend), B (evergreen), C (gaps); 22 ideas merged into 10 + 5 rejects.

## Formula (judge v0)
RANKING-ENGINE.md has no idea-scoring section yet (it scores reveal orders), so this run used:
`total = 0.25·creative + 0.15·demand + 0.30·feasibility + 0.15·portfolio + 0.15·(100 − risk)`.
Hard gates (verified clearable clips ≥ slots + buffer, safety) are pass/fail. Demand never offsets them. The sub-scores are my own re-scores after the spot-checks.

## Ranked shortlist
| # | Idea (merged from) | C/D/F/P/R | Total | Gate |
|---|---|---|---|---|
| 1 | **Deep-sea animals unimpressed by our robot** (b-004 + c-002) | 82/55/85/75/15 | **78** | pass |
| 2 | Fails from 1896, ranked by smugness (c-001) | 78/35/68/80/22 | 69 | pass (Lumière copies) |
| 3 | Animals with cheat codes (b-001, a-001 part) | 72/60/66/72/28 | 68 | pass (CC BY credits) |
| 4 | Impossible silent-era stunts (a-002 + b-003) | 84/50/62/70/40 | 67 | conditional |
| 5 | Animal engineers at work (b-005), reserve | 62/55/60/62/26 | 62 | pass, pool unverified |

Parked: Astronauts vs physics (a-006 + c-005, 63; portfolio 30 because it uses the same NASA ISS footage and look as Mission Voices), 1896 magic "spot the cut" (c-006, 62; this is a quiz mechanic), wild/goofy animals (a-001/a-004/c-007, 61), trail-cam/wholesome USFWS (c-004/b-007, 59).
Rejected: physics-looks-fake/chain reactions (56, the footage pool is too thin), Earth fireworks (Planet Extremes territory), Moon wipeouts (240–320 px, ~4 moments), Fat Bear Week (3 clips, conflicting licence tags), Ig Nobel (no footage), World Cup 2026 (highest demand, zero publishable clips).

## Convergence and disagreements
- B and C both found the NOAA pool. B framed it as generic "weirdos"; C ranked by an "unimpressed" criterion. C's framing wins: it is the brand's comic voice, and NOAA's own page says a Muusoctopus "didn't seem too bothered or impressed" by the ROV.
- A and B both chose silent stunts. A put feasibility at 85, B at 74. The spot-check agrees with B (see below).
- A and C both chose astronauts, but it overlaps Mission Voices. Convergence ≠ demand.
- All scouts agree that trend and clearable footage are anti-correlated in this lane. No idea has measured view data.

## Spot-checks (primary pages, not scout word)
- **M1 deep sea:** six NOAA clips confirmed PD/CC0 with a NOAA producer: Graneledone flees (1080p), Ghostlike octopod (1080p, 43 s), Flapjack (720p), Psychedelic Medusa (720p, 68 s, has an audio track, strip it), King crab (720p, 113 s), Ex1402 red animal (1080p, CC0, 45 s).
  **Wrong:** `Wk215-deep-sea-octopuses` is tagged PD-NOAA on Commons, but the primary page credits "OET/NOAA" (E/V Nautilus / ROV Hercules, Ocean Exploration Trust, private). Reject it.
  **Gotcha:** Graneledone-flees and Flapjack report durations of about 142,000 s (broken container). Use NOAA's mp4 masters and ffprobe them. One EX2301 video was flown by GFOE pilots; rights-scout must confirm NOAA's work status.
- **M3 1896 fails:** Course en Sacs is 1440×1080, 46 s, silent, PD-1923 + PDM, but Commons shows "licence review needed". Edison titles are 320×240, buffers only.
- **M4 cheat codes:** mantis shrimp is CC BY 2.0, 1080p, 11 s, Flickr review OK. Pexels octopus is 1080p, 9 s, JUN HO LEE. **Missed by scout:** the giant cuttlefish is 640×480 SD.
- **M2 silent stunts:** **Wrong:** "Sherlock Jr. HD (720p)" is actually 400×300. The Keaton shorts on Commons come from a modern restoration release ("The Shorts Collection 1917–23"), which risks Content ID claims. The Steamboat Bill IA item was uploaded 2026-09-20 with an unstated transfer source.

## Pick: M1, TOP 3
- **Why TOP 3:** about 9 verified clips gives 3 slots + 2 buffers each. TOP 5 needs ≥15 verified clips (sweep the EX2301/EX1811/EX1806 playlists first). The footage is slow, so 3 tight beats of 15–25 s hold pace.
- **Criterion (editorial):** "How little each deep-sea animal cares that our robot showed up". Framed as "my ranking", never as fact.
- **Hooks:** (1) "We sent a robot 1.5 miles down. These animals could NOT care less." (2) "Deep-sea animals, ranked by how unimpressed they are with our robot." (3) "Robot arrives. Octopus: absolutely not."
- **Slots** (URLs in the JSON):
  - #1 "Zero interest": EX2301 Muusoctopus video #6 (Commons copy still to find). Buffers: King crab eating brittle star, Ghostlike octopod.
  - #2 "Mildly annoyed": Flapjack octopus. Buffers: Ex1402 red animal, Venus flytrap anemone (unverified).
  - #3 "Rage quit": Graneledone flees. Buffers: Psychedelic Medusa, Graneledone close-up.
- **Reveal hint:** 2 → 3 → 1, to be confirmed with `ranking:reveal` once moments are scored.
- **Risks:**
  - Contractor/partner footage (GFOE, OET).
  - Broken metadata on two files.
  - ROV audio has to be stripped.
  - Slow footage is a retention risk (needs speed-ups and punch-ins).
  - Planet Extremes adjacency: keep the behaviour comedy, no depth/pressure facts.
  - Species names must match the NOAA captions.
  - Demand is unproven.
- **Confidence:** feasibility medium-high, demand low, overall medium.

## DB
Shortlist (5) and the parked/rejected ideas were added with `idea:add` (ids in the JSON `db_ids`). `idea:add` ignores `category_id`, so I set the column with a narrow UPDATE on these rows only. CLI gap noted for pipeline-engineer.
