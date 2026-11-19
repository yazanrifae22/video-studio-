# quiz-ar — visual system v1 (orchestrator, 2026-10-22)

Shared contract for the brand designer and the quiz pipeline. The name/wordmark is pending (growth-director);
everything here is name-independent. Change tokens here, not in templates.

## Canvas & safe zones (1080×1920, 30 fps)
- Puzzle stage: x 90–990, y 470–1330 (never place the puzzle outside it); answer-critical elements stay left of x 950 below y 800 (action rail).
- Question text: y 330–470, max 2 lines. Captions: y 1340–1460 (nothing critical below y 1480).
- Keep clear: top 0–210 (status bar, TikTok Following/For You tabs, LIVE button top-left), bottom 1480–1920 (TikTok/Reels/Shorts caption + buttons), right 950–1080 between y 800–1700 (action rail).
- Signature bug: x 60–300, y 225–310 (below platform top chrome), ≤ 70% opacity during rounds; full end-card ≤ 1.5 s at the end.
- Decision 2026-10-22 (orchestrator): these zones supersede naming-and-packaging.md §5's conservative box (x 120–838 would shrink the puzzle too much); verify with the first private test upload per platform.

## Colour tokens
| Token | Hex | Use |
|---|---|---|
| bg-1 | #6A3BFF | gradient stop (violet) |
| bg-2 | #2F8CFF | gradient stop (azure) |
| bg-3 | #19D3C5 | gradient stop (teal) |
| card | #FFFFFF | puzzle card, radius 48 px, soft shadow 0 24px 60px rgba(29,21,72,.25) |
| ink | #1D1548 | text on card / light areas |
| text-on-bg | #FFFFFF | text on gradient (with 0 4px 18px rgba(0,0,0,.25) shadow) |
| accent | #FFC83D | countdown ring, highlights, score chips |
| correct | #22D489 | correct-answer glow/tick |
| alert | #FF5C7A | last second of countdown, "wrong" |

Background: slow animated diagonal gradient (bg-1→bg-2→bg-3, 8–12 s drift), plus 6–10 soft floating shapes
(circles, rounded squares, sparkles) at 8–15% white opacity with gentle parallax. Never busy behind the puzzle card.

## Type
- Cairo (Google Fonts, SIL OFL) — Black 900 for questions/numbers, Bold 700 for captions/body. Self-host the TTF/WOFF2 in `data/brand/quiz-ar/fonts/`.
- Question 78–92 px, captions 64–72 px (white, 6 px ink stroke or dark pill), countdown numerals 120 px.
- Arabic is RTL; use Eastern Arabic digits (٣ ٢ ١) for countdown & scores.

## Motion language
- Ease: back.out(1.6) for pop-ins, power3.inOut for moves; nothing slower than 0.6 s except background.
- Round grammar: question slides/pops in (0.4 s) → puzzle builds (≤ 0.8 s) → countdown ring 3 s (accent → alert in last second, tick SFX each second) → reveal (flash + scale pulse + correct glow + "ding") → 1-line explanation chip → whoosh transition to next round.
- Score chip "١/٤" style progress at top-right of the question area (round counter, not the viewer's score).

## Audio
- Narration: Gemini TTS (packages/voice), friendly quiz-host voice; ducks music by ~10 dB.
- SFX: original, synthesized (tick, whoosh, pop, ding, shimmer) — no third-party SFX packs unless licensed.
- Music: original bed or a licence-cleared track (Pixabay Content License is acceptable) at −24 to −20 LUFS-ish under voice.
