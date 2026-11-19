# «شو شايف؟» open-ending bank (owner 2026-11-08)
Closing asks for an OPEN final round (`quiz.json` last round `"open": true`, see templates.md "Open final round"). The ask is spoken right after the last countdown and shown as big on-screen text; the answer is posted later as a pinned comment.
Owner override: write-in asks («اكتب جوابك بالتعليقات») are allowed HERE only; the other quiz-ar bait rules stay. Rules: each line <= 7 words, Syrian dialect, no ego/hurry wording, no AI wording, no «كم جبت؟». Use one id per video, no repeat within 10 videos; note the id in the script line `notes`.

| id | closing ask (spoken = on screen) | best for |
|---|---|---|
| OE01 | عرفتها؟ اكتب جوابك بالتعليقات | any |
| OE02 | عرفتها؟ اكتب جوابك.. أو ابعتها لصاحبك يساعدك | any (the owner's wording) |
| OE03 | شو جوابك؟ اكتبه بالتعليقات | any |
| OE04 | اكتب الرقم بالتعليقات | counting |
| OE05 | كم عدّيت؟ اكتب الرقم | counting |
| OE06 | وين كانت؟ اكتب جوابك | shell_game / follow_path |
| OE07 | أي واحد؟ اكتب رقمه بالتعليقات | odd-one-out / follow_path |
| OE08 | ابعتها لصاحبك.. شوف شو بيجاوب | any |
| OE09 | جاوب بالتعليقات.. والحل بالتثبيت | any |
| OE10 | شو شفت؟ اكتب لنا بالتعليقات | spot_difference / what_changed |
| OE11 | اكتب جوابك.. وبنشوف مين صح | any |
| OE12 | الجواب بالتعليقات.. وصاحبك كمان | any |
| OE13 | وين الاختلاف؟ اكتب جوابك | spot_difference |
| OE14 | شو الجواب؟ ابعتها لصاحبك | any |
| OE15 | تعدّلنا؟ اكتب الرقم اللي شفته | counting / sequence |

Notes: the pinned comment (owner posts it) carries the answer behind «الجواب الصح:»; replies in the first hour praise right answers without revealing it to others (`scripts/comments-draft.py` drafts both).
