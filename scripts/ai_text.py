"""AI-generation text guard, Python twin of packages/shared/src/ai-text.ts (owner 2026-10-28, widened 2026-11-08:
"the description must never mention that it is created by AI - in the full info, never mention").

ONE pattern list: config/ai-text-patterns.json (both engines compile the same strings, case-insensitive, per line).
Only creation/disclosure phrasing hits; a TOPIC line (question/explainer phrasing about AI, no SELF marker) is allowed.
Used by publish-plan.py, fb-plan.py, packaging_meta.py, comments-draft.py, audit-live-ai-text.py, fix-live-ai-text.py.

    python scripts/ai_text.py test            # shared fixtures config/ai-text-fixtures.json
    python scripts/ai_text.py check "<text>" [brand]
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_CFG = None


def _load():
    global _CFG
    if _CFG is None:
        j = json.loads((ROOT / "config" / "ai-text-patterns.json").read_text(encoding="utf8"))
        _CFG = dict(
            rules=[dict(id=r["id"], re=re.compile(r["re"], re.I), always=bool(r.get("always")),
                        exempt=[str(b) for b in r.get("brands_exempt", [])]) for r in j["rules"]],
            topic=re.compile(j["topic"], re.I), self=re.compile(j["self"], re.I))
    return _CFG


def ai_text_hits(text, brand=None):
    """-> [{rule, phrase, line}] for every creation/disclosure hit (line by line)."""
    if not isinstance(text, str) or not text.strip():
        return []
    c = _load()
    out = []
    for line in re.split(r"\r?\n", text):
        if not line.strip():
            continue
        topical = bool(c["topic"].search(line)) and not c["self"].search(line)
        for r in c["rules"]:
            if brand and str(brand) in r["exempt"]:
                continue
            if topical and not r["always"]:
                continue
            m = r["re"].search(line)
            if m:
                out.append(dict(rule=r["id"], phrase=m.group(0), line=line.strip()[:160]))
    return out


def ai_text_hit(text, brand=None):
    h = ai_text_hits(text, brand)
    return h[0]["phrase"] if h else None


def strings_with_keys(o, key="", out=None):
    out = [] if out is None else out
    if isinstance(o, str):
        out.append((key, o))
    elif isinstance(o, list):
        for i, x in enumerate(o):
            strings_with_keys(x, f"{key}[{i}]", out)
    elif isinstance(o, dict):
        for k, v in o.items():
            strings_with_keys(v, f"{key}.{k}" if key else str(k), out)
    return out


def ai_text_fields(obj, brand=None, prefix=""):
    """-> [{key, rule, phrase, line}] over every string of obj (dict/list/str)."""
    return [dict(key=k, **h) for k, t in strings_with_keys(obj, prefix) for h in ai_text_hits(t, brand)]


class AiTextError(ValueError):
    pass


def refuse_ai_text(obj, brand=None, where=""):
    """Raise AiTextError when obj carries AI-generation text (owner rule)."""
    hits = ai_text_fields(obj, brand)
    if hits:
        lst = "; ".join(f'{h["key"]}: "{h["phrase"]}"' for h in hits[:6])
        raise AiTextError(f"{where}AI-generation text (owner rule 2026-11-08, never mention AI creation): {lst}")


_SENT = re.compile(r"(?<=[.!?؟])\s+")


def strip_ai_text(text, brand=None):
    """Remove the clauses/sentences/lines/hashtags that carry a hit; everything else stays byte-identical."""
    if not isinstance(text, str) or not ai_text_hits(text, brand):
        return text
    lines = []
    for line in text.split("\n"):
        if not ai_text_hits(line, brand):
            lines.append(line)
            continue
        # hashtag-only lines: drop the offending tags only
        if line.strip().startswith("#"):
            kept = [t for t in line.split() if not ai_text_hits(t, brand)]
            if kept:
                lines.append(" ".join(kept))
            continue
        sents = []
        for s in _SENT.split(line):
            if not ai_text_hits(s, brand):
                sents.append(s)
                continue
            m = re.match(r"^(.*?)([.!?؟]*)$", s, re.S)
            body, term = m.group(1), m.group(2)
            parts = re.split(r"(;\s+|،\s*|,\s+|\s+[-–—]\s+)", body)
            clauses, seps = parts[0::2], parts[1::2]
            keep = [(c.strip(), seps[i] if i < len(seps) else "") for i, c in enumerate(clauses) if c.strip() and not ai_text_hits(c, brand)]
            if keep and not ai_text_hits(" ".join(c for c, _ in keep), brand):
                txt = "".join(c + (sp if k < len(keep) - 1 else "") for k, (c, sp) in enumerate(keep))
                if txt[:1].islower():
                    txt = txt[0].upper() + txt[1:]
                sents.append(txt.rstrip(" ;,،") + (term or "."))
        if any(x.strip() for x in sents):
            lines.append(" ".join(x for x in sents if x.strip()))
    out = "\n".join(lines)
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out).strip("\n")
    return out


def _test():
    fx = json.loads((ROOT / "config" / "ai-text-fixtures.json").read_text(encoding="utf8"))
    bad = 0
    for p in fx["positives"]:
        if not ai_text_hits(p["text"], p.get("brand")):
            bad += 1
            print("MISS (should hit):", p["text"].encode("unicode_escape").decode()[:120])
    for n in fx["negatives"]:
        h = ai_text_hits(n["text"], n.get("brand"))
        if h:
            bad += 1
            print("FALSE HIT:", n["text"].encode("unicode_escape").decode()[:120], h[0]["rule"])
    # strip keeps the clean parts
    s = strip_ai_text("Hook line?\n\nNarration is AI-generated (Gemini TTS, voice Charon).\n\nArchive footage: NASA.\n#space #aivoice", "clipping")
    if ai_text_hits(s, "clipping") or "Hook line?" not in s or "Archive footage: NASA." not in s or "#space" not in s:
        bad += 1
        print("STRIP FAILED:", repr(s))
    s2 = strip_ai_text("Original puzzles by the channel; images AI-generated; all art reviewed.", "quiz-ar")
    if ai_text_hits(s2, "quiz-ar") or "Original puzzles" not in s2:
        bad += 1
        print("STRIP FAILED:", repr(s2))
    n = len(fx["positives"]) + len(fx["negatives"]) + 2
    print(f"ai_text: {n - bad}/{n} ok")
    return bad == 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        sys.exit(0 if _test() else 1)
    if len(sys.argv) > 2 and sys.argv[1] == "check":
        h = ai_text_hits(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
        sys.stdout.buffer.write((json.dumps(h, ensure_ascii=False) + "\n").encode("utf8"))
        sys.exit(1 if h else 0)
    print(__doc__)
