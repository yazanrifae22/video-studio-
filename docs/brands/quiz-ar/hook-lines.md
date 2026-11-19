# «شو شايف؟» big hook lines (owner 2026-11-08)

**Owner rule 2026-11-08 (wins over learned QA1 / SR1 for these lines only):** every video may open with a big, bold stop-scrolling line, in the spirit of "Stop scrolling and fix your brain-dead with this test", in Syrian Arabic. It talks about **the TEST waking the brain**, never about the viewer being dumb. Only the lines in this bank are allowed. Any other rule, round-count, score or ego opener is still banned (QA1).

## How it is used
- `quiz.json`: `"hook_line": {"id": "HL07"}` (optional `"line": "h0"`; default = the hook_intro's `params.line`). The script line's `onscreen_ar` = the bank text (no tashkeel), `narration_ar` = the same words with tashkeel, `no_caption: true`. `hook.line_ar` / `hook.onscreen_ar` = the bank text too.
- The builder (`packages/quiz`) speaks it in the hook_intro (own TTS request, ≤ 2.5 s scene) and draws it as **huge type** (balanced 1-3 lines, up to 150 px, canvas y 150-462, 60 px margins, last line gold, navy outline) in place of the variant's title band. The variant's art keeps moving on the card; its own card text is hidden. Frame 0 shows the settled line.
- Round 1 still starts by ~2.0-2.5 s and the hook art is moving by 1.0 s (QA2 unchanged). `hook.category` stays one of the allowed keys (use `curiosity_tease` unless the line is a timer line).
- The builder refuses a hook line with 0-1 or > 7 words, or with a round-count, score, «الأذكياء», %/٩٩, «حدس» or insult word.

## Rules
1. ≤ 6-7 words, Syrian dialect, punchy; reads in one glance at 360 px.
2. About the test / the brain / the eyes waking up. Never insult the viewer (no «غبي», «نايم» aimed at the person as a judgement: «مخّك نايم؟» is a playful question about the brain, allowed; «إنت غبي» never).
3. Never the data-banned lines: round count («٣ جولات»), score («كم جبت»), «بس الأذكياء», «٩٩٪ بيغلطوا», fake stats, «حدس».
4. Must be true for the video (it is a short visual test).
5. **Rotation:** no line repeats within 10 consecutive quiz-ar videos (check `docs/brands/quiz-ar/hook-log.json` `hook_line_id` of the last 10 before picking).
6. Measurement: growth-director logs `hook_line_id` per video in `hook-log.json`; after 10 videos with a bank line, compare stayed-to-watch vs the previous object-command openers (baseline 61.7%, best 70.8 «انتبه.. لا ترمش!»). Below baseline → owner decides.

## Bank (25 + owner lines HL26-HL32 below)
| id | line (on screen) | note |
|---|---|---|
| HL01 | وقّف تقليب… وصحّي مخّك بهالاختبار! | the owner's spirit line |
| HL02 | مخّك نايم؟ هالاختبار بيصحّيه | |
| HL03 | وقّف هون… مخّك بدّه هالتمرين | |
| HL04 | استنّى! هالاختبار بيفيّق مخّك | |
| HL05 | قبل ما تقلّب… صحّي عيونك | |
| HL06 | تمرين سريع بيصحّي المخ | |
| HL07 | وقّف شوي… وفيّق عيونك معي | |
| HL08 | هالاختبار بيشغّل مخّك عالآخر | |
| HL09 | عيونك نعسانة؟ هاد بيصحّيها | |
| HL10 | خلّي مخّك يشتغل… ركّز معي | |
| HL11 | وقّف التقليب… جاي دور عيونك | |
| HL12 | صحّي مخّك قبل ما تكمّل | |
| HL13 | هالاختبار أقوى من فنجان قهوة | |
| HL14 | فنجان قهوة لمخّك… بس بالعيون | |
| HL15 | وقّف! تمرين للعيون بثواني | |
| HL16 | مخّك محتاج هزّة؟ جرّب هاد | |
| HL17 | استنّى… هالاختبار بيصحّي الشايف فيك | |
| HL18 | لا تقلّب! عيونك بدها تشتغل | |
| HL19 | بثواني بنعرف إذا عيونك صاحية | |
| HL20 | فيّق مخّك… الاختبار بلّش | |
| HL21 | وقّف هون وشغّل عيونك | |
| HL22 | هاد الاختبار بيوقّظ المخ النايم | about the brain, not the person |
| HL23 | قبل القهوة… صحّي مخّك هون | |
| HL24 | تمرين عيون بيصحّيك أحسن من المنبّه | |
| HL25 | وقّف تقليب… خلّي عيونك تلعب | |

### Owner lines HL26-HL32 (owner 2026-11-08; SUPERSEDED the same day by hook-bank-owner.md, history only; new videos use hook-bank-owner.md)
Bank text exactly (no tashkeel). They are ~6-9 words (~3-4 s spoken): the hook_intro may run up to 4.0 s for a bank line (2.5 s stays the cap for any other line; the variant choreography is time-stretched, round 1 starts right after). Owner override: ego / challenge / hurry tone and «99%» are ALLOWED for these seven lines only; the banned-opener rules still apply to every non-bank line. Max 10 words on screen for them (7 for HL01-HL25).
| id | line (on screen) |
|---|---|
| HL26 | وقف سكرول... خلينا نشوف إذا مخّك لسا شغّال! |
| HL27 | مخّك تعفّن من كتر السكرول؟ أثبت العكس! |
| HL28 | إذا حليت هاللغز من أول مرة، إنت مو شخص عادي! |
| HL29 | تحدّي سريع... يا بتحلها يا بتعترف إنك انضحك عليك! |
| HL30 | لا تستعين بغوغل... بدنا نشوف شو ضلّ بمخّك! |
| HL31 | عندك خمس ثواني تثبت إنك مو روبوت! |
| HL32 | 99% رح يركزوا بالمكان الغلط... إنت منهم؟ |
Force a fresh hook voice take (cache note applies to every hook line): set quiz.json `narration.hook_retake` to a new value (1, 2, ...) or run one build with env `QUIZ_HOOK_RETAKE=n`. The hook take is cached in `data/cache/tts/<key>.wav` (key = text + voice + style [+ retake]), NOT in the production's voice/ folder, so moving voice/ files never re-rolls it.

Retired / never: «بس الأذكياء بيجاوبوا», «٩٩٪ بيغلطوا», «٣ جولات…», «كم رح تجيب؟», «إنت أكيد ما رح تعرف».
