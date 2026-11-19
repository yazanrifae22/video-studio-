"""Draft the pinned comment + 3 first-hour replies for a production (owner D-O1, 2026-11-08).

usage: python scripts/comments-draft.py <production_id> [--print]

Writes productions/<id>/comments-draft.json {production_id, brand, language, pinned, first_hour_replies[3], source, note}.
Drafts only: nothing is posted anywhere (the owner posts from his own Chrome).
- quiz-ar: pinned = the video's question (script.json pinned_comment_ar) + the answer key in Syrian Arabic
  (script.json answers_for_replies, else quiz.json rounds' explanation_ar); replies in Syrian Arabic.
- kids (Made for Kids): comments are off on YouTube, so pinned = null and replies = [].
- everyone else: the honest talk trigger already in the script (story.json comment_trigger, closing_question,
  a comment-family cta, pinned_fact) - never a made-up claim.
"""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMMENT_FAMILIES = ("comment", "debate", "opinion", "request", "yesno", "pickside", "question")
AR_DIGITS = "٠١٢٣٤٥٦٧٨٩"


def rd(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf8").lstrip("﻿"))
    except (OSError, ValueError):
        return None


def brand_of(pid: str, sj: dict) -> str:
    b = sj.get("brand") or sj.get("brand_id")
    if b:
        return str(b)
    try:
        con = sqlite3.connect(ROOT / "data" / "studio.db")
        row = con.execute("SELECT brand_id FROM productions WHERE production_id=?", (pid,)).fetchone()
        con.close()
        if row and row[0]:
            return str(row[0])
    except sqlite3.Error:
        pass
    return {"quiz": "quiz-ar", "epis": "kids", "clip": "clipping", "comp": "compilations", "expl": "tech", "rank": "viral-rankings"}.get(pid.split("-")[0], "unknown")


def ar_num(n: int) -> str:
    return "".join(AR_DIGITS[int(c)] for c in str(n))


def open_draft(d: Path, sj: dict, qj: dict, r: dict, answers: list) -> dict:
    """Open final round: pinned comment = the question + the answer behind a spoiler-style note; replies praise right answers
    without revealing it to others. Answer = round params.answer_ar / script answers_for_replies[-1] / params.answer."""
    scr = rd(d / qj.get("script", "script.json")) or sj
    qline = next((l for l in scr.get("lines", []) if l.get("id") == r.get("q_line")), {})
    P = r.get("params") or {}
    ans = str(P.get("answer_ar") or "").strip()
    if not ans and sj.get("answers_for_replies"):
        ans = str(sj["answers_for_replies"][-1]).split(")", 1)[-1].strip()
    if not ans and P.get("answer") is not None:
        ans = str(P["answer"]).strip()
        if ans.isdigit():
            ans = ar_num(int(ans))
    if not ans:
        raise SystemExit("open round: no answer (params.answer_ar / params.answer / script.json answers_for_replies)")
    q = (qline.get("onscreen_ar") or "").strip()
    pinned = (q + "\n\n" if q else "") + "الجواب الصح: " + ans + "\n(لا تفتح الجواب قبل ما تجاوب بالتعليقات!)"
    replies = [
        "برافو! جوابك صح، عينك ما بتنغش.",
        "قريب كتير.. عيد العد/النظر مرة تانية وخبرنا شو طلع معك.",
        "شو الجواب اللي اخترته؟ اكتبه هون وبنشوف كم واحد وافقك.",
    ]
    return {"language": "ar-SY", "pinned": pinned, "first_hour_replies": replies, "open_round": True, "answer_stored": ans,
            "reply_rule": "reply 'صح' / praise ONLY to right answers; to wrong ones say 'قريب.. جرّب مرة تانية' without the answer; the answer lives only in the pinned comment",
            "source": "open final round (quiz.json round open:true) + params.answer"}


def quiz_draft(d: Path, sj: dict) -> dict:
    answers = [str(a).strip() for a in (sj.get("answers_for_replies") or []) if str(a).strip()]
    src = "script.json answers_for_replies"
    if not answers:
        q = rd(d / "quiz.json") or {}
        rounds = [r for r in q.get("rounds", []) if r.get("type") != "hook_intro" and (r.get("explanation_ar") or "").strip()]
        answers = [f"{ar_num(i + 1)}) {r['explanation_ar'].strip()}" for i, r in enumerate(rounds)]
        src = "quiz.json rounds explanation_ar"
    if not answers and not any(r.get("open") for r in (rd(d / "quiz.json") or {}).get("rounds", [])):
        raise SystemExit("quiz-ar: no answers (script.json answers_for_replies or quiz.json rounds[].explanation_ar) - add them first")
    qj = rd(d / "quiz.json") or {}
    open_r = next((r for r in qj.get("rounds", []) if r.get("open")), None)
    if open_r:   # owner 2026-11-08: OPEN final round, the answer is NOT in the video; the pinned comment carries it
        return open_draft(d, sj, qj, open_r, answers)
    question = (sj.get("pinned_comment_ar") or "شو جبت؟ اكتب جوابك قبل ما تشوف الحل.").strip()
    has_key = "١)" in question or "الأجوبة" in question or "الحل" in question   # older scripts already carry the key in the pinned text
    pinned = question if has_key else question + "\n\nالحل (لا تفتحه قبل ما تجاوب):\n" + "\n".join(answers)
    eq = str(((rd(d / "quiz.json") or {}).get("end_question") or {}).get("text_ar") or "").strip()   # owner 2026-11-08: echo the on-screen open question
    if eq and eq not in pinned:
        pinned = eq + "\n" + pinned
        src += " + quiz.json end_question"
    last = answers[-1].split(")", 1)[-1].strip() if ")" in answers[-1][:4] else answers[-1]
    replies = [
        "يا سلام عليك! إذا جبتهن كلهن فعينك ما بتنغش أبداً.",
        f"قريبة كتير! الجواب الصح بالجولة الأخيرة: {last}. جرّب الفيديو الجاي وخبّرنا كم جبت.",
        "أي جولة كانت الأصعب معك؟ قلّنا لنعملك وحدة أصعب منها.",
    ]
    return {"language": "ar-SY", "pinned": pinned, "first_hour_replies": replies, "source": f"pinned_comment_ar + {src}"}


def trigger_of(d: Path, sj: dict):
    st = rd(d / "story.json") or {}
    ct = st.get("comment_trigger")
    if isinstance(ct, dict) and ct.get("type") not in (None, "none") and str(ct.get("text") or "").strip():
        return str(ct["text"]).strip(), "story.json comment_trigger"
    if isinstance(ct, str) and ct.strip() and ct.strip().lower() != "none":
        return ct.strip(), "story.json comment_trigger"
    if str(sj.get("closing_question") or "").strip():
        return str(sj["closing_question"]).strip(), "script.json closing_question"
    cta = sj.get("cta") if isinstance(sj.get("cta"), dict) else {}
    fam = str(cta.get("family") or "").lower()
    if cta.get("text") and any(k in fam for k in COMMENT_FAMILIES):
        return str(cta["text"]).strip(), f"script.json cta ({cta.get('family')})"
    sp = sj.get("spoken_cta") if isinstance(sj.get("spoken_cta"), dict) else {}
    if str(sp.get("text") or "").strip():
        return str(sp["text"]).strip(), "script.json spoken_cta"
    return None, None


def honest_draft(d: Path, sj: dict, brand: str) -> dict:
    trig, src = trigger_of(d, sj)
    fact = str(sj.get("pinned_fact") or "").strip()
    note = ""
    if not trig:
        trig = "Which moment stood out for you, and why?"
        src = "fallback (no comment trigger in story.json/script.json)"
        note = "No talk trigger found in the script: generic open question used; the showrunner should replace it with the video's own."
    pinned = f"{fact}\n\n{trig}" if fact else trig
    crit = str(sj.get("ranking_criterion") or "").strip()
    replies = [
        "Thanks for watching to the end! Which part surprised you most?",
        "Fair point! Which one would you put at #1 instead, and why?" if (crit or brand in ("viral-rankings", "rankings"))
        else "Good point, thanks for adding it. What would you have done in that moment?",
        "What should we cover next? The most-liked idea in the replies goes on the list.",
    ]
    lang = str(sj.get("language") or "en")
    return {"language": lang, "pinned": pinned, "first_hour_replies": replies, "source": src, **({"note": note} if note else {})}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        raise SystemExit(__doc__)
    pid = args[0]
    d = ROOT / "productions" / pid
    sj = rd(d / "script.json")
    if sj is None:
        raise SystemExit(f"{d / 'script.json'} missing or not JSON")
    brand = brand_of(pid, sj)
    if brand == "quiz-ar":
        out = quiz_draft(d, sj)
    elif brand == "kids" or sj.get("made_for_kids") is True:
        out = {"language": "en", "pinned": None, "first_hour_replies": [], "source": "made_for_kids",
               "note": "Made for Kids: YouTube turns comments off, so there is nothing to pin or reply to."}
    else:
        out = honest_draft(d, sj, brand)
    doc = {"production_id": pid, "brand": brand, **out, "posted": False,
           "warning": "Draft only. Nothing was posted; the owner posts from his own Chrome."}
    # owner 2026-11-08: never mention AI creation anywhere public -> refuse a draft that would (scripts/ai_text.py, shared patterns)
    sys.path.insert(0, str(ROOT / "scripts"))
    from ai_text import AiTextError, refuse_ai_text
    try:
        refuse_ai_text({"pinned": doc.get("pinned"), "first_hour_replies": doc.get("first_hour_replies")}, brand, "comments-draft: ")
    except AiTextError as e:
        sys.stderr.buffer.write((str(e) + " -- nothing written\n").encode("utf8"))
        raise SystemExit(2)
    f = d / "comments-draft.json"
    f.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    if "--print" in sys.argv:
        sys.stdout.buffer.write((json.dumps(doc, ensure_ascii=False, indent=1) + "\n").encode("utf8"))
    else:
        print(f"wrote {f.relative_to(ROOT)} ({brand}, {out['language']}, source: {out['source']})")


if __name__ == "__main__":
    main()
