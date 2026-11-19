# Ranking engine — moments, RankingPlan, reveal director

Code: `packages/ranking/src/{library,plan,reveal}.ts` · contracts: `packages/shared/src/schemas.ts` · tests: `scripts/test-viral-rankings.ts` (2026-10-31, `pipeline-engineer`).

## 1. Rank vs reveal (never the same field)
- `rank_position` = the editorial rank under the declared `ranking_criterion` (#1 = best). Exactly one entry per rank 1..N.
- `reveal_index` = screen order (0 = first shown). Exactly one entry per index 0..N-1.
- `reveal_order[k]` = the rank shown at reveal k. It must agree with every entry: `reveal_order[e.reveal_index] === e.rank_position`.
- Labels on the rail always show the true rank (`#2`), whatever the reveal order. Narration must not say "number one" before #1 is shown unless intended.
- `criterion_kind: "editorial"` (default) = opinion; present it as such. The validator warns on fact-like words ("official", "proven", "verified", "scientifically").

## 2. Moment contract
A moment is one usable window of one source (`moments` table; many per source).
- Times are **integer milliseconds on the source's timebase** (same as the analysed mezzanine). `setup_ms`/`payoff_ms`/`reaction_ms` are absolute and must lie inside `[start_ms, end_ms]`.
- `creative_status`: discovered → metadata_verified → analyzed → usable → reserved → used_in_draft → used_in_approved → published; dead states: rejected, expired, unavailable.
- `rights_status` is separate: `null` = inherits the source's `permission_status`; set it only to narrow one window (e.g. a broadcast logo → `rejected`). **Effective rights = most restrictive of source and moment**, plus licence expiry. Moment approvals need `--evidence` and are logged in `rights_log` (asset_id = moment id).
- `checksum` defaults to the source file sha256; `phash` is the perceptual fingerprint (not computed yet). An identical window or equal phash sets `duplicate_of`.
- Reserving a moment (`moment:reserve <id> --production P`) touches only that moment; siblings on the same source stay `usable`. Reservations write a `moment_usage` row.

## 3. RankingPlan (`schema: "ranking-plan/1"`)
Stored as `productions/<id>/plan.json`. It is the hand-off from the ranking director; a later converter turns it into `cutlist.json` (seconds, `item` = rank).

```json
{
  "schema": "ranking-plan/1",
  "brand_id": "viral-rankings",
  "production_id": "rank-261031-abcd",
  "idea_id": "idea-261031-xxxx",
  "category_id": "cat-261030-5ky0",
  "format": "top3",
  "ranking_criterion": "most confident cat jumps that went wrong",
  "criterion_kind": "editorial",
  "reveal_order": [2, 3, 1],
  "entries": [
    { "rank_position": 2, "reveal_index": 0, "source_id": "src-…", "moment_id": "mom-…", "in_ms": 1200, "out_ms": 5800, "left_label": "Overconfident", "narration_ref": null, "captions_ref": null, "rights_decision_id": 2950 },
    { "rank_position": 3, "reveal_index": 1, "source_id": "src-…", "moment_id": "mom-…", "in_ms": 2000, "out_ms": 8000, "left_label": "Slow regret" },
    { "rank_position": 1, "reveal_index": 2, "source_id": "src-…", "moment_id": "mom-…", "in_ms": 0, "out_ms": 5000, "left_label": "Pure physics" }
  ],
  "title": "TOP 3 CAT FAILS",
  "title_styles": { "primary": "yellow", "secondary": "red", "connector": "white" },
  "branding": { "logo_asset_id": null },
  "cta_variant": "none"
}
```
TOP 5 example reveal: `[4, 2, 5, 3, 1]` (entries carry reveal_index 0..4 accordingly).

### Validation (`ranking:validate plan.json`)
Structure (zod): format top3→3 / top5→5 entries; ranks 1..N once; reveal indices 0..N-1 once; reveal_order a permutation consistent with entries; `out_ms > in_ms`, window ≥ 0.8 s (builder minimum); no moment twice.
Library: brand/category exist and match; moment exists, belongs to `source_id`, window inside the moment; moment not dead; not reserved by another production; per source ≤ 2 entries, never adjacent reveals, no overlapping windows (2 per source → review warning); reuse inside `policy.viralRankings.reuseCooldownDays` (30) → warning; plain countdown → warning.
**Rights gate:** every entry's source must be `approved`/`approved_with_conditions` and unexpired, the moment's own `rights_status` (if set) too, and a given `rights_decision_id` must be a publishable `rights_log` row for that source/moment. Any failure → `publishable: false`, CLI exits 1. `--draft` checks structure/library only (for planning before countersign) — a draft plan can never be built.
Report: `{ valid, publishable, errors[], rights_blockers[], warnings[], reveal }`. `--record --production P [--version N]` writes `moment_usage` rows (status `in_draft`).

## 4. Reveal-order director (`ranking:reveal`)
Enumerates all N! orders (6 for top3, 120 for top5), scores each, sorts (ties → lexicographically smallest), returns chosen + reasons + all candidates. Input per rank: `hook`, `payoff` (0-10), optional `energy`, `loop`. CLI shorthand: `--scores "1=5/9/9/8,2=8/6/5,3=6/4/7"` (rank=hook/payoff[/energy[/loop]]).

| Term | Default weight | Meaning |
|---|---|---|
| hook | 3 | hook score of the first reveal /10 |
| payoff_late | 2 | 1 − |position of strongest payoff − 0.85| (late, not forced last) |
| escalation | 1.5 | share of non-decreasing payoff steps after the opener |
| contrast | 1 | mean energy difference between neighbours /10 |
| loop | 1 | loop score of the last reveal /10 (default payoff/2) |
| rank1_first | −2 | #1 shown first |
| sequential | −1 | plain 1..N or N..1 |
| recent | −1.5 | order used by a recent video (`--recent "2,3,1;4,2,5,3,1"`) |

Weights override: `--weights '{"hook":4,"payoff_target":1}'`. Example: scores `1=5/9/9/8,2=8/6/5,3=6/4/7` → **#2 → #3 → #1** (6.6 vs 5.1 for 3→2→1). The director only orders reveals; it never changes rank positions. These are heuristics to test against analytics, not proven rules.

## 5. Categories and metrics
`category:add brands/viral-rankings/categories.seed.json` (5 parents × 3–4 subs, seeded 2026-10-31, metrics null). `category:snapshot file.json [--fixture]` appends a snapshot; unknown metrics must be `null` (stored NULL, shown "unknown"), measured zero is `0`. Fixture rows are hidden from `category:list` unless `--fixtures`. Compare snapshots only within the same `age_bucket`.

## 6. Build defaults since 2026-10-31 (wave-1 QA: i1gu v2, akn1 v3)
Written by `ranking:cutlist` into every viral-rankings cut list and applied by `build` (packages/occ/src/build.ts). Re-run `ranking:cutlist` to pick them up. Opt out per plan with `build_defaults: { caption_zero, rail_empty, open_punch, one_hit, clip_credits, cta_band: false, tail_max_ms: null }`; geometry/values in `VR_DEFAULTS` (packages/ranking/src/layout.ts).
1. **Frame-0 text + empty rail** (`caption_start_zero`, `rank_layers.empty_open`): the first caption page starts at 0.00 s when it starts within 1 s (warn if later). The rail shows N empty `#N` slots from frame 0; the first revealed rank lights when the narration says "Number <N>" (word time), else `rank_layers.first_light_at` / 0.3 s.
2. **Opening motion** (`segments[0].punch_stages`): punch 100→112 % at 0.15-0.65 s, clipped to the footage box (baked into the window for `fit_box` segments, OCC scale keyframes on full-bleed `cover`). A plan punch on that clip that overlaps it and ramps in ≤ 1.5 s is kept instead; a slower one continues after the stage.
3. **#1 emphasis** (`one_hit`): at the #1 payoff (entry `payoff_ms` > moment `payoff_ms` > the #1 `rail_label_at_ms` > 40 % of the window, max 1.2 s): punch 100→112 % over 0.4 s, white flash over the #1 footage box (0.4 s alpha WebM, track `VR Hit`, long fade so techqa does not flag a flash frame), sting SFX (`data/brand/viral-rankings/sfx/hook_slam.wav`, track `SFX`, volume 0.8, own seeded numpy synthesis by `packages/quiz/py/synth_hook_sfx.py`, no samples; regenerated when missing), bed dip -8 dB for 1 s unless a plan dip already covers the payoff.
4. **Per-clip credits** (`clip_credits`): one plate per clip while it plays, ≥ 32 px, centre y 1388 (plan `credit_center_y_px` clamped to ≤ 1400, bottom edge ≤ 1420). Text = entry `credit`, else the source attribution when it is a real credit line, else `<creator> via <platform>` (licence on screen only for Creative Commons). The single persistent `credit_text` plate is used only with `clip_credits: false`. Description: `ranking:credits <plan.json>` prints the "Video credits:" block, one line per clip in reveal order (`#<rank> <plan.credits[i]>` or `#<rank> <label>: <creator via platform (licence) url>`), also stored as `cutlist.ranking.description_credits`.
5. **Tail ≤ 0.3 s** (`tail_max`): the builder measures where the last narration clip's speech really ends (10 ms level > max(-50 dBFS, peak - 35 dB)) and trims/extends the last segment so the video ends 0.25 s later; never cuts the word, warns when the last segment would drop below 0.8 s. Off when `end_hold_ms` is set.
6. **End CTA in the caption band** (`cta_band`, plan `end_cta: {text, dur_ms?}`): every `role: cta` text (also the ones `post-cutlist.py` scripts add) is bottom-anchored in the caption band above the credit plate (≤ y 1400), centred, and re-anchored to the real end after a tail trim; caption pages under it are lifted just above it. Never over the subject. `end_cta` replaces the post-cutlist.py CTA step.
7. **Per-clip exposure lift** (entry `grade: {brightness, contrast, gamma}` → segment `lift`): ffmpeg `eq` on that clip's cached window. Ranges: gamma 0.7-2.0 (dark animals 1.25-1.4), brightness -0.2..0.3 (use 0.03-0.08), contrast 0.7-1.5 (1.05-1.1 after a gamma lift). Optional; no default grade.
8. **`scripts/video-analyze.sh`**: accepts a local file path (converted to a `file:///` URL); without `OPENAI_API_KEY` the transcript comes from local faster-whisper in `.venv-asr` (`VIDEO_ANALYZE_WHISPER_MODEL`, default large-v3) instead of being skipped.
