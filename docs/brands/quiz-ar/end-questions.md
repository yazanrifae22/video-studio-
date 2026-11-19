# «شو شايف؟» end open questions (owner 2026-11-08)

**Owner rule 2026-11-08:** keep the data-proven spoken score ask (SR3 «كم جبت من ٣؟ اكتبها بالتعليقات», 396 vs 8 comments) AND add one **open question** that invites a real comment answer.

## How it is used (one final beat, loop/tail rule kept)
- Spoken: the SR3 score ask over the last reveal, as the last round's `post_lines` (SR7: `timings.post_gap` so the ask starts ≈ 0.6 s after the reveal) or inside the answer line, as before.
- On screen: `quiz.json` `"end_question": {"id": "EQ05", "text_ar": "…"}` → the builder shows it as big text (navy pill, gold border, up to 104 px, 1-3 lines) **above the card** from reveal + 0.6 s (`at`) until the loop zoom; the answer stays visible on the card. The headline band (answer pill) gives way to it.
- Not spoken by default (the score ask owns the voice). Optional `line` (a spoken script line) lengthens the tail: only with an owner-approved test.
- Tail: the question lives inside the same final beat. If the beat would show it < 1.4 s (`min_s`) the builder extends the round by the shortfall and reports `marks.endq_ext` (a ≤ 0.5 s extension is the named exception in `docs/hook-playbook.md`; more = shorten the beat instead).
- Pinned comment (`productions/<id>/comments-draft.json`, `scripts/comments-draft.py`) echoes the same open question.

## Rules
- Honest: a question the viewer can really answer from this video or about the next one. No bait, no pressure, no fake stats, no «حدس», no ego («بس الأذكياء»).
- ≤ 10 words, Syrian dialect.
- **Rotation:** no question repeats within 10 consecutive quiz-ar videos (check `hook-log.json` `end_question_id`).
- `{OBJ}` = this video's hero object (fill it in; keep the sentence true).

## Bank (20)
| id | question (on screen) | type |
|---|---|---|
| EQ01 | أي جولة خدعتك؟ اكتب رقمها | which round fooled you |
| EQ02 | شو بدك نخبّي المرّة الجاية؟ | next object |
| EQ03 | الجولة التالتة: صعبة ولا سهلة؟ | pick a side |
| EQ04 | شو أوّل شي لفت نظرك؟ | open |
| EQ05 | اقترح غرض للتحدّي الجاي | next object |
| EQ06 | مين من رفقاتك رح يغلط؟ | friend (no ego) |
| EQ07 | ألوان ولا أشكال؟ شو بدك بعدين؟ | pick a side, next mechanic |
| EQ08 | أي جولة كانت الأحلى؟ | favourite round |
| EQ09 | كيف لقيتها؟ احكيلنا الطريقة | method |
| EQ10 | {OBJ} ولا شي تاني؟ اقترح | next object |
| EQ11 | شفتها من أول نظرة ولا بعدين؟ | honest self-report |
| EQ12 | الجولة التانية: مين قال الوسط؟ | pick a side |
| EQ13 | بدك جولة أصعب؟ شو تكون؟ | harder request |
| EQ14 | شو الغرض اللي بتحب نلعب فيه؟ | next object |
| EQ15 | ذاكرة ولا ألوان؟ اختار للجاي | pick a side, next mechanic |
| EQ16 | وين علقت أكتر شي؟ | which round fooled you |
| EQ17 | من وين عم تتفرّج؟ | community |
| EQ18 | الفخ الأخير: كان عادل ولا لأ؟ | fairness debate |
| EQ19 | اقترح فخ للحلقة الجاية | next trap |
| EQ20 | شو كان جوابك قبل الكشف؟ | open |
