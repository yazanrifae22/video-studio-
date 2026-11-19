# quiz-ar owner hook bank (owner 2026-11-08) — the ONLY source for new «شو شايف؟» hook lines

Owner rule: every new quiz-ar video ALWAYS opens with one line from this bank (spoken + huge type in the `hook_intro` scene).
It overrides the older opening bans (SR1 ego/challenge/hurry wording, persona "Never") for these lines only.
HL01–HL32 in `hook-lines.md` are retired for new videos (kept for history / old productions).

Rules for choosing:
- Rotate personas across a batch (Savage / Smart / Funny / Scientific); never reuse a line inside the same 10-video batch; check `hook-log.json` / recent productions.
- Pick a line that fits the video: "خمس ثواني" lines only when a visible countdown of about 5 s follows quickly; lines that promise the solution («قارن إجابتك بالحل», «قبل ما نكشفها») NOT on open-ending videos (answer not revealed, `open-endings.md`).
- The ending should echo the hook where natural (e.g. «مخّك» hook → «مخّك اشتغل؟»).
- The bank text is written without tashkeel; `narration_ar` = the same words with tashkeel.
- Lines run ~2.5–4 s spoken: the bank hook cap is 4.3 s (packages/quiz/src/templates-hook.ts).

## 1. 🔥 Savage — المستفز والمتحدّي (SV)
يهاجم السكرول، يستفز المشاهد، ويتحدّى ذكاءه.
| id | line |
|---|---|
| SV01 | وقف سكرول... مخّك تعفّن؟ خلينا نتأكد! |
| SV02 | إذا ما قدرت تحل هاللغز، عندك مشكلة يا صديقي! |
| SV03 | يا عبقري زمانك... ورّجيني شو عندك! |
| SV04 | بطل تمرّق فيديوهات، خلينا نشوف إذا مخّك لسا شغّال! |
| SV05 | هاللغز بسيط... إلا إذا مخّك عامل إجازة! |
| SV06 | لا تعمل حالك ذكي... حلّها أول شي! |
| SV07 | إذا احتجت أكتر من خمس ثواني، الوضع مو مطمّن! |
| SV08 | تحدّيت آلاف الناس... هلأ إجا دورك! |
| SV09 | لا تهرب! هالمرة بدنا نشوف شو ضلّ بمخّك! |
| SV10 | يا بتحلها، يا بتعترف إن السكرول انتصر عليك! |

## 2. 🧠 Smart — الذكي والغامض (SM)
هادئ، واثق، غامض، يحسس المشاهد أنه أمام اختبار ذكي.
| id | line |
|---|---|
| SM01 | في تفصيل واحد بالصورة رح يغيّر كل شي... بتقدر تلاحظه؟ |
| SM02 | قبل ما تجاوب، فكّر مرتين... الحقيقة مو مثل ما بتشوفها. |
| SM03 | خلينا نختبر طريقة تفكيرك بسؤال واحد. |
| SM04 | مو كل شخص بيشوف نفس الشي... إنت شو شايف؟ |
| SM05 | الجواب قدامك، بس هل انتبهت للتفصيل الصحيح؟ |
| SM06 | عقلك بيحب الأنماط... بس هل رح يكتشف هالنمط؟ |
| SM07 | عندك خمس ثواني تكتشف الشي اللي مخفي عن الجميع. |
| SM08 | أحياناً الحل مو بالنظر أكتر... بل بالتفكير بطريقة مختلفة. |
| SM09 | هالاختبار أبسط مما بتتوقع... وأصعب مما بتتخيّل. |
| SM10 | خلينا نشوف إذا بتقدر تكتشف الحقيقة قبل ما نكشفها. |

## 3. 😂 Funny — الكوميدي والسّاخر (FN)
خفيف دم، يسخر من المشاهد بطريقة مرحة، ويخلق جو تحدّي مضحك.
| id | line |
|---|---|
| FN01 | إذا ما حليت هاد، روح اشرب قهوة وارجع! |
| FN02 | مخّك صاحي معنا ولا لسا نايم؟ |
| FN03 | لا تخاف، اللغز ما بيعض... غالباً! |
| FN04 | إذا جاوبت غلط، منعتبر إنك ما شفت الفيديو! |
| FN05 | ركز يا أينشتاين، ما بدنا فضايح! |
| FN06 | خمس ثواني... لا تفتح الآلة الحاسبة يا غشاش! |
| FN07 | إذا حليتها، إلك جائزة... احترامنا إلك! |
| FN08 | لا تطالع فيني، الحل بالصورة! |
| FN09 | شكلك رح تحتاج تحديث للدماغ بعد هاللغز! |
| FN10 | إذا ما عرفت الجواب، عادي... مو كلنا عباقرة! |

## 4. 🔬 Scientific — العلمي والاختباري (SC)
مقدم اختبارات، يقدم التحدي كأنه تجربة قصيرة لاختبار الإدراك والانتباه.
| id | line |
|---|---|
| SC01 | خلينا نعمل اختبار سريع للانتباه البصري. |
| SC02 | اختبار اليوم: هل بتلاحظ التفاصيل الصغيرة؟ |
| SC03 | ركّز بالصورة... وراقب كيف عقلك بيعالج المعلومات. |
| SC04 | قدامك خمس ثواني لاكتشاف العنصر المختلف. |
| SC05 | اختبار إدراك بصري: شو أول شي لاحظته؟ |
| SC06 | هل عيونك عم تلتقط كل التفاصيل، ولا عم يفوتك شي؟ |
| SC07 | جرّب تحل هالتحدي بدون أي مساعدة. |
| SC08 | هاللغز رح يختبر قدرتك على اكتشاف الأنماط. |
| SC09 | راقب الصورة جيداً... وبعدين قارن إجابتك بالحل. |

(The owner's list for Scientific had a 10th slot left empty; add it when the owner sends it.)
The earlier owner lines (HL26–HL32, 2026-11-08) are superseded by this bank.
