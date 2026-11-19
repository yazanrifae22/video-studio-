"""Unit test for caption_match.reconcile (QA cases 2026-10-22). usage: python -I test_caption_match.py"""
import os, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles default to cp1252
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from caption_match import reconcile  # noqa: E402

CASES = [  # (script caption, what Whisper heard, expected caption)
    ("على يسارك!", "عليها سعرك", "على يسارك!"),                 # z5hx: wrong answer cue must not appear
    ("الباقيين", "البقين", "الباقيين"),
    ("رشّة", "رشي", "رشّة"),
    ("متل", "مثل", "متل"),
    ("كم علبة بالكومة؟", "كم عالبيب الكومة", "كم علبة بالكومة؟"),  # gu0d
    ("التالت", "الثالث", "التالت"),
    ("كم فرق بين الصورتين؟", "كان فرق بين الصورتين", "كم فرق بين الصورتين؟"),  # kyxs: short question word keeps script
    ("وينها؟", "وين هي؟", "وين هي؟"),                        # the take says a different thing: show it (update script)
    ("اللي بالنص!", "البنص؟", "اللي بالنص!"),                   # Whisper merge
    ("من ١ لـ ٩", "من واحد لتسعة", "من ١ لـ ٩"),               # digits + split prefix
    ("بالتعليقات!", "بال تعليقات", "بالتعليقات!"),              # Whisper split
    ("وين ظل لهالقبعة؟", "وين ظل لها القبعة؟", "وين ظل لهالقبعة؟"),  # x5iz: compound split with a contracted alef
    ("لهالقبعة مايلة؟", "لها القبعة مايلي", "لهالقبعة مايلة؟"),      # compound split next to a near-miss
    ("الكرة عالفخّارات", "الكرة على الفخارات", "الكرة عالفخّارات"),  # 4lys: «على الـ» contracted to «عالـ»
    ("وين المنقّط هلّق؟", "وين لم نقط هلأ؟", "وين المنقّط هلّق؟"),  # lgt7: split inside a multi-word span
    ("وين اللي عليه دعسوقة؟", "وين اللي عليه دا سوءة", "وين اللي عليه دعسوقة؟"),  # leqg: near-miss split keeps script
    ("الريشة مايلة؟", "الريشة ما يلي", "الريشة مايلة؟"),  # n9ey: near-miss split keeps script
    ("ع يمينك", "هلأ يمينك", "ع يمينك"),  # wbxi: unrelated heard word = ASR miss, keep script
    ("عينك عالأباريق!", "عينك على الأبريء", "عينك عالأباريق!"),  # 86jc: contraction + near-miss
    ("وين الطويل هلّق؟", "وين الطويل لا", "وين الطويل هلّق؟"),  # 86jc: «هلّق» misheard
    ("كم ريشة؟ ١٠", "كم ريشة عشرة", "كم ريشة؟ ١٠"),  # n9ey: script digits spoken as a number word
    ("شو صار بالتعليقات هون", "شو صار بال تعليقات هون", "شو صار بالتعليقات هون"),
    ("سبعطعش!", "17", "سبعطعش!"),                             # x5iz: spoken number written as digits
]
fails = 0
for script, heard, want in CASES:
    items, subs = reconcile(script.split(), heard.split())
    got = " ".join(i["w"] for i in items)
    ok = got == want
    fails += not ok
    print(("ok  " if ok else "FAIL"), f"{script!r} / heard {heard!r} -> {got!r}" + ("" if ok else f" (want {want!r})"), [s["kind"] for s in subs])
from caption_match import edge_spill  # noqa: E402
SPILL = [  # (caption, heard in the line window, next line's first caption word, heard words to hand over)
    ("سبعطعش!", "17 كم", "كم", 1),        # x5iz r4-a: «كم» of the next line absorbed
    ("ستة!", "ستة", "كم", 0),
    ("كم كم", "كم كم", "كم", 0),          # the line itself ends on that word
    ("الأخضر!", "الأخضر", None, 0),
]
for cap, heard, nxt, want in SPILL:
    got = edge_spill(cap.split(), heard.split(), nxt)
    ok = got == want
    fails += not ok
    print(("ok  " if ok else "FAIL"), f"edge_spill {cap!r} / heard {heard!r} / next {nxt!r} -> {got}" + ("" if ok else f" (want {want})"))
sys.exit(1 if fails else 0)
