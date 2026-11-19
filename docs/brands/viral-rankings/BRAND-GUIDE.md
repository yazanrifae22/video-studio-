# viral-rankings — brand guide DRAFT v0 (2026-10-31)

Internal id `viral-rankings`. **Public name is provisional: owner decision.** No accounts created, nothing published.
Assets: `data/brand/viral-rankings/` (rebuild: `python data/brand/viral-rankings/tools/build.py`; swap wordmark via `WORD_A / WORD_B / HANDLE` at the top of that script, the mark has no text).

## 1. Name proposals (web conflict check, 2026-10-31; a search is not trademark clearance)
| # | Name / handle | What the search found | Verdict |
|---|---|---|---|
| 1 | **Podium Pop** `@podiumpop` | No YouTube/TikTok channel of that name found. Different things named "Podium": a podcast network (rebranded from The Roost, Jul 2026), MyPodium (old audio app). | Best. Clear picture (podium = ranking), "pop" = pop culture + pop of surprise. |
| 2 | Rank Rascals `@rankrascals` | No channel found. Unrelated "Rascals" diaper brand, "Certified Rascals" comedy channel (SG). | Free, playful; a bit kid-sounding. |
| 3 | Top Chaos `@topchaos` | No exact channel. Near misses: "Chaos Pop" (fails compilations), "Whos Chaos" (gaming). | Free but "Chaos Pop" is close in niche. |
| 4 | Rank Riot `@rankriot` | No exact match, but **"Rank Rioter"** (small ranking-random-moments channel, ~3K subs per third-party stats) is the same niche. | Avoid: confusable. |
| 5 | Wait For One `@waitforone` | "Wait For It" (7M subs Shorts channel) is a near neighbour. | Avoid. |

**Recommendation: Podium Pop.** Owner must still check handle availability on YouTube/TikTok/Instagram/Facebook and run a proper trademark check before creating accounts (the "Podium" podcast network is the one to look at).

## 2. Positioning, audience, voice
- Short TOP 3 / TOP 5 rankings of funny, surprising and impressive real moments across categories, a witty narrator, non-sequential reveal, rights-cleared footage only. Tagline (draft): FUNNY. UNBELIEVABLE. RANKED.
- Audience: general entertainment Shorts/Reels viewers 13-45, English first.
- Voice: playful, specific, quick. Jokes about the situation, not the person. One-liners reference what is on screen ("the hose never saw it coming"). Rankings are opinion: say "my #1", never "the best ever" as fact. No fake quotes, no clickbait that the video does not pay off, no repetitive robot openers ("Get ready for...").
- Never: mocking injury, disability, illness, age, race, religion, gender, nationality or other protected traits; humiliation of private individuals or children; real tragedy, danger played for laughs, or risky stunts framed as encouraged. Harmless fails, animals being funny, clever skills, awkward reactions are in.
- Topic lanes: Sports moments, Animals, People/reactions, Amazing skills/clever builds, Everyday chaos (harmless). Boundaries follow `brands/viral-rankings/categories.seed.json` and the rights pools in brand.json.

## 3. Colour tokens
| Token | Hex | Use | Contrast vs ink #0B0F1C |
|---|---|---|---|
| ink | #0B0F1C | outlines, bands, text on yellow | - |
| white | #FFFFFF | connectors, captions, rail text | 19.1 |
| accent A yellow | #FFD60A | key word 1, active rank, spark | 13.5 |
| accent B red | #FF3B47 | key word 2, podium 2 | 5.4 |

On footage, contrast is against the ink outline, not the picture (yellow vs mid-grey is only 2.8, red 1.1): **every title/accent word gets an ink outline of ~7% of font size (8 px at 108 px)**, captions sit on an ink band at ~80% opacity. Topic presets below also pass >= 5.4 vs ink.

## 4. Typography (free, OFL, copied to `data/brand/viral-rankings/fonts/`)
- Display: **Anton Regular** `fonts/Anton-Regular.ttf` (titles, `#N`, wordmark). Licence `OFL-Anton.txt`.
- Captions/secondary: **Montserrat** variable `fonts/Montserrat[wght].ttf`, ExtraBold (800) for captions, SemiBold (600) credits. Licence `OFL-Montserrat.txt`.
- Latin only; no Arabic in this brand (Cairo exists at `data/brand/quiz-ar/fonts/` if ever needed).

## 5. Title presets (white connectors + two accents; max 2 accent words)
| Preset | Accent 1 | Accent 2 | Topics |
|---|---|---|---|
| default | yellow #FFD60A | red #FF3B47 | sports, people, general |
| nature | mint #2EE6A6 | orange #FF8A1F | animals, outdoors |
| skill | cyan #19D3FF | magenta #FF3DB8 | amazing, clever builds, tech |
**Accent rule (owner 2026-10-31): the two accent colours go only on topic KEYWORDS (subject nouns, e.g. DEEP-SEA, OCTOPUS, ROBOT, NASA SHOTS), never on hype or generic words.** Enforced by `ranking:validate` / `ranking:cutlist`: accents on funny, funniest, hottest, craziest, best, top, most, insane, epic, wild are refused (adjectives like "unimpressed" are discouraged too). Example: "Which DEEP-SEA Animal Ignores This ROBOT Most?" (mint DEEP-SEA, orange ROBOT, "Most" white).
**Title format (owner 2026-10-31, FINAL): every title is exactly `TOP <N> <WORD1> <WORD2> MOMENTS`.** N = the plan's format count (3 or 5); WORD1 = primary accent, WORD2 = secondary accent of the preset (different colours); `TOP <N>` and `MOMENTS` white; hyphenated compounds count as one word (DEEP-SEA, SILENT-FILM). The blocklist above still applies to WORD1/WORD2. Examples: TOP 5 DEEP-SEA OCTOPUS MOMENTS (mint/orange), TOP 5 SILENT-FILM FAIL MOMENTS (yellow/red). Enforced by `ranking:validate` / `ranking:cutlist` (`titleFormatErrors` in `packages/ranking/src/layout.ts`; `title_styles.spans` must carry the colours). The question-style example above is superseded.
(Everyday chaos can use default or lilac #B388FF + orange.) Frame 0 = real action + title, 2-3 lines, Anton ~108 px, line pitch 132 px, max ~14 characters of accent per word.

## 5b. Style v2, 2026-11-04 (default for new builds)
Owner request for the 28-video run: modern look, two-line title, smaller rail. New cut lists from `ranking:cutlist` carry `rank_layers.style: "v2"` + `caption_style: "v2"` automatically; plan `"style": "v1"` brings the old look back. Cut lists without the keys (every production approved before 2026-11-04) still render v1, so a rebuild never changes them. Geometry in `packages/ranking/src/layout.ts` (`VR_V2`, `VR_TITLE_LAYOUTS_V2`).
- **Title: always 2 centred lines, the accent words are the break.** Line 1 `TOP 5 <WORD1>` (WORD1 accent 1, end of the line), line 2 `<WORD2> MOMENTS` (WORD2 accent 2, start of the line). Anton 116 px, shrinks only to fit the 1000 px width (floor 84 px, never tiny); ink stroke 7 % + soft shadow over a soft ink scrim. Band y 228-462 for `tall` / `compact` (`standard` keeps y 270-585). Title format rule unchanged (`titleFormatErrors`).
- **Footage:** `tall` box y 470-1600 (was 380-1600), max `[0,462,1080,1620]`; `compact` y 470-1370. A plan `fit_box` with its top above y 462 is moved down to y 470 (converter warning). Plans need no change: keep `title_layout: "tall"` + `framing.follow`.
- **Rank rail ~68 % of v1:** cards at x 28, 5 slots in y 540-950 (82 px pitch). Hidden = dark glass 88x68 (`#N` 46 px, dim); revealed = darker glass + yellow left bar, `#N` full white; active = 116x88 yellow gradient card, white rim, soft yellow glow, `#N` 62 px ink. Sublabel plate (ink glass, yellow tick, white Montserrat ExtraBold **52-58 px = >= 37 px cap at 1080 = >= 12 px at 360 wide**, one line when it fits, else 2 balanced lines of <= 440 px) joins the card's right edge, right edge <= x 624 (2026-11-04: 36 px measured ~7-9 px at 360 = unreadable). A label that needs 3 lines fails the build: keep `left_label` to ~2-3 short words (<= ~16 chars per line, e.g. "SOFA FLIP", "BOARD LEAVES / FIRST"). The active slot keeps its dim card under the sliding active card, so no slot is ever blank on the cut frame.
- **SUBSCRIBED badge (v2 default):** centred in the lower blur strip, 14 px under the footage box (tall: y 1614-1690; never above y 1440), off the subject; plan `sub_badge.x1/y0` still override. v1 keeps right edge 936 under the title band.
- **Reveal motion:** the active card slides in from off-screen left (x -30 % of W, 12 frames, back-out overshoot), the plate slides out from under it at the label beat (`rail_label_at_ms`, else 3 frames later; 9 frames). Hold = static.
- **Caption pill:** ink glass (62 % + backdrop blur), radius ~20 px, thin light rim, soft drop shadow, lighter text shadow. Position/size keys unchanged.
- Safe zones unchanged: text inside x 64-936 except rail (x 28) and title (x 40-1040) at heights without platform UI; nothing textual below y 1420; the logo stays in the top strip (y 150-230).

## 6. Rank rail (left, 1080x1920)
(Style v1 below; v2 = section 5b.)
- **2026-10-31 owner: bigger rail text is the shared default.** Rail zone y 600-1205, x 36-290. TOP 3: inactive 170x132 / active 200x172, `#N` 88/120 px. TOP 5: inactive 130x100 / active 170x128 (pitch 121), `#N` 66/90 px. Revealed cards show `#N` only; the ACTIVE card carries a sublabel plate (ink 92 %, yellow outline, white Montserrat ExtraBold, <= 2 lines, up to 72 px TOP 3 / 54 px TOP 5, <= 12 chars) joined to its right edge, shown from the entry's first strong beat (`rail_label_at_ms`). Checked at 360 px for 5 slots.
(Older sizes below are superseded.) - Cards at x=36 (left edge), vertical stack y 640-1130 (between title and caption band), one card per rank, `#N` in Anton.
- Inactive: 196x118, ink 67% fill, white 59% 4 px outline, white text 70 px. **Active: 250x150, yellow fill, white 6 px outline, ink text 96 px + soft yellow glow.** Revealed ranks persist (inactive style); unrevealed show the dim card with `#N` (or `?`). Order stays #1 top to #3 bottom regardless of reveal order (2 -> 3 -> 1). TOP 5: 5 cards, inactive 96x? scale 0.8 (pitch 120 px).
- Rail never overlaps caption band or title; right edge < 290 px so the subject stays visible.

## 7. Logo, watermark, CTA, thumbnail
- Mark: podium 2-1-3 (red / yellow / white blocks, numerals in ink) + four-point spark. Square, transparent, readable at 64 px (checked). Files in `logo/`.
- Watermark: `logo/watermark.png` (480x128, mark + wordmark, soft shadow) shown at ~300x80, top-left at (40,150); smaller alt `logo/watermark-mark.png` (mark only). Top-left is free of Shorts/TikTok/Reels UI (channel name sits bottom-left there). 70-90% opacity, never over the action centre.
- CTA style: spoken/on-screen one-liner in the narrator's voice, last 1.5 s, caption band style, e.g. "Follow for the next top 3." Mid-video subscribe cue stays an experiment (off by default). Rotate wording.
- Thumbnail/cover: frame of the #1 payoff, title in the same two-accent style at top (Anton, outlined), small `#1` badge (yellow card) left, mark bottom-left; 1080x1920 for Reels cover, 1280x720 centre-crop safe for channel grids. Keep text <= 4 words.

## 8. 9:16 safe zones (1080x1920)
| Platform | Avoid |
|---|---|
| YouTube Shorts | bottom ~380 px (title/channel/subscribe), right ~120 px (actions), top ~150 px |
| TikTok | bottom ~480 px (caption/sound), right ~140 px, top ~130 px |
| FB/IG Reels | bottom ~340 px, right ~120 px, top ~150 px |
**Union text-safe box: x 64-936, y 270-1420.** Captions end by y 1400; source credit under the band at y ~1376-1400. Logo sits in the top-UI strip left corner (y 150-230) where nothing but the status bar competes. See `mockups/layout-1080x1920-safezones.png`.

## 9. Asset index (`data/brand/viral-rankings/`)
`logo/mark-1024|256|64.png`, `logo/logo-horizontal-white.png`, `logo/watermark.png`, `logo/watermark-mark.png`, `social/avatar-800.png`, `social/banner-2560x1440.png` (YouTube safe area 1546x423 centred holds the whole lockup), `mockups/layout-1080x1920.png`, `mockups/layout-1080x1920-safezones.png`. Art sources in `src/` (backdrop and placeholder frame generated with Codex image gen, original, no third-party marks; placeholder frame is for the mockup only, never published).

## Framing and overlay clearance (2026-11-08)
- **A subject whole in frame beats a subject large in frame.** `framing.follow.zoom` below 0.75 needs `framing.zoom_ok_reason` (the build lists it as a warning); without a reason ranking:cutlist refuses.
- Caption band (one position per entry), active rail plate and subscribe badge are placed by `packages/ranking/py/clearance.py` on the framed picture. It is heuristic (motion + foreground, no person detector): it works on steady-camera shots and is weak on moving-camera textured ground. Explicit values win: entry `caption_center_y_px`, entry `plate_xy`, `sub_badge.pin`, `build_defaults.overlay_clearance: false`. Plan-level `caption_center_y_px` and `sub_badge.x1/y0` are the preferred position, not a pin.
- `scripts/framing-check.py <production>/v<N>` writes `v<N>/qa/framing.json` (heuristic evidence). Check frames at the flagged times; `subject_evidence_diffuse` means the tool could not see the subject there, so pin the caption by hand if it covers the action.
