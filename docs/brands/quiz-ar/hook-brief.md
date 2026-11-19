# Showrunner brief: adding a hook intro to a scheduled «شو شايف؟» video

You add a ~2 s spoken hook intro (round `hook_intro`) to ONE production that is already scheduled on YouTube. The orchestrator swaps the upload after QA. No uploads, no deleting, no git. Use `python`, never `python3`.

## Read first
- docs/brands/quiz-ar/hooks.md: categories and rules
- packages/quiz/src/hooks/README.md: the variant API
- the production's quiz.json and script.json. Know every round, because the hook line must be TRUE for this video.

## Creative
- Write a NEW variant file `packages/quiz/src/hooks/<id>_<name>.ts`. Look at the existing files in that folder and do not reuse their concept or wording, even within the same category.
- Never edit shared files. Several agents build in parallel, and OpenChatCut is shared through the occ-edit lock, so just wait when it's busy.
- Bold, obvious motion. Text ≥90 px and readable at 360 px. Brand palette from docs/brands/quiz-ar/visual-system.md.

## Lessons from QA so far (each one cost a round)
1. **Truth.** The line must hold for EVERY round it implies. Examples: "كلها شبه بعض" was false for a round with different shapes, and "you lose" was false because there's no elimination. No fake stats, no «حدس».
2. **No answer leak through the teaser.** The blurred round-1 crop has leaked answers: a smaller cup, a coin under a dome, a star behind a door, a gift's colour. If round 1's card shows anything answer-related, set `params.teaser_src` to a neutral image built only from the production's own art. It works on the hook round or on round 1. Record its provenance in assets.json: source files, sha256, and the command or script (e.g. art/compose_teaser.py). Then check `vN/hook/teaser.jpg` in the build.
3. **Margins.** Frame 0 must already show the settled title. Keep the title ≥60 px from the screen edges at ALL times, including pulses, shakes and the slide-out. Long lines go smaller or onto two lines.
4. **No white-out flashes.** Peak luma ≤ ~215, ramped over ≥4 frames, and never hiding the text.
5. **Timing.** On-screen punch words land on the spoken word, within 0.1 s. Keep the hook line ≤2.3 s. Round-1 pre-lines are dropped automatically. Don't speed the voice beyond ~1.1×.
6. **Audio.**
   - Hook voice loudness is within ±1.5 dB of the round narration.
   - Run ASR on the hook line in the RENDER, not just the stem. SFX and fast words have masked «في شي», «لصاحبك», «فخ», «حديد» and «قارن».
   - If a word fails ASR, re-word it rather than re-taking it again and again. Each take costs shared TTS quota.
   - Too loud or soft: pin a gain clip via `narration.pins.h0` (e.g. `voice/h0_gain-2dB.wav` + sha256; see okt7/4lys/ice0) instead of re-taking.
   - Levantine ق→ء is correct (Whisper writes «إبريق» as «بريء»). That's not a defect.
7. **Line fits every round.** Avoid «تفصيلة» / «قارن» lines that only describe round 1 (ice0 v3 lost a round). Hook text, including on-card text, fades before the slide automatically.

## Steps
1. Write hook.json, then run `npx tsx packages/quiz/src/dev-hook.ts apply <production> hook.json`.
2. Run `npx tsx packages/quiz/src/dev-hook.ts take <production> hook.json`. The main take must come back `cached:true`. Then run `preview`.
3. Build with `npm run -s cli -- quiz:build <production> --agent showrunner-shu-shayef`.
4. Run techqa and captions_audit, then ASR on the hook line in the render.
5. Check 360 px frames at 0, 0.5, 1.0, 1.5, 2.0 and 2.5 s, plus one question-phase frame for EVERY round. The leak guard is often empty, so check these by eye.

## Report (≤8 lines)
Render path, variant, line_ar/onscreen_ar, intro and total duration, first-question time, render ASR, techqa, teaser source, doubts.
