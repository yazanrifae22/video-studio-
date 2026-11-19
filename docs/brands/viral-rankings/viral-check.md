# Podium Pop viral check: pointer + brand specifics (updated 2026-11-08)

The viral check is now studio-wide: **`docs/viral-check.md`** (8 items, brand weights, script-stage forecast, verdicts, gate, `qa/viral.json` shape, calibration). This page keeps only what is specific to Podium Pop. The original owner request (2026-10-31) still defines the question: would a stranger scrolling Shorts stop, watch to the end, rewatch, and share or comment?

## Podium Pop specifics
- **Weights:** use the `Podium Pop` row in `docs/viral-check.md` (stop 18, subject 10, promise 9, drive 20, peak 10, ending 10, talk 15, retell 8).
- **How the old items map in:** stop 20 -> stop; payoff 20 + escalation 10 -> drive + peak (subtract 4 in drive for each entry whose "whoa" is small, cropped, blurred or implied at phone size; #1 must be visibly the strongest); rewatch 15 -> ending; share 15 -> talk; subject 10 -> subject; fresh 10 -> retell.
- **Scored in one pass** with QA, insights and Retention from the QA pack: `python scripts/qa-pack.py productions/<id>/v<N>`, read only `qa/pack.jpg` and `qa/pack.json`. Report `QA nn · INSIGHTS nn · RETENTION nn · VIRAL nn (verdict)`.
- **Talk item:** the debate-form ask on #1 (viral-rankings SR4/QA4) and the GOAL-15 F12 spoken ask count only when woven into a moment. "Send this to X" cards have produced 0 shares in 3 tries (S4): no credit unless the video itself supplies the reason.
- **Ending item:** owner pacing exception applies (0.6-1.0 s silent beat after each reveal, slow-mo replay of the key beat, post-#1 tail ≤ 3 s ending on the #1 picture).
- **Owner's own clips:** if the clip pool itself is the ceiling (no clean clip shows the payoff), say so plainly in `why_it_could_flop` and do not ask for more rebuilds.
- **Joke quality** is punchline-critic's job before TTS; the viral check judges whether the whole video stops, drives and triggers talk.
- **Gate:** viral ≥ 75 on top of QA 85, insights 85 and Retention 80, hard only when `story.json` exists (O-S5, 2026-11-08); older Podium Pop productions record only.

Calibrate against what performs: `docs/youtube-intelligence/channels/` (rankings/viral-rankings) and `docs/youtube-intelligence/competitor-research.md`; skim only the relevant section and cite it in one line.
