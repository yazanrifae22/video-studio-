"""Platform metadata limits, Python twin of packages/shared/src/platform-limits.ts (owner 2026-11-08: "max description is 5000
characters"). ONE source: config/platform-limits.json.

YouTube Data API: title <= 100 characters, description <= 5000 BYTES UTF-8 (Arabic ~2 bytes per letter), no < or > in
title/description/tags, tags <= 500 characters (commas between tags + 2 quotes around a tag with a space count), <= 15
hashtags in title + description (over 15 -> YouTube ignores all). Callers refuse with the message; nothing is truncated here.
Used by packaging_meta.py, publish-plan.py, validate-review.py (packaging.json). Facebook: no verified limit, not enforced.

    python scripts/platform_limits.py check '{"title": "...", "description": "...", "tags": []}'
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_DEF = dict(title_max_chars=100, description_max_bytes=5000, tags_max_chars=500, hashtags_max=15, forbidden_chars="<>")
_MARK = "̀-ͯؐ-ًؚ-ٰٟۖ-ۭ"
_HASH = re.compile(r"(?<![\w&/#])#((?:\w|[" + _MARK + r"])+)")


def youtube_limits():
    try:
        j = json.loads((ROOT / "config" / "platform-limits.json").read_text(encoding="utf-8-sig")).get("youtube") or {}
    except (OSError, ValueError):
        j = {}
    return {k: j.get(k, v) for k, v in _DEF.items()}


def utf8_bytes(s):
    return len((s or "").encode("utf-8"))


def tags_length(tags):
    t = [str(x) for x in (tags or []) if str(x)]
    return sum(len(x) + (2 if re.search(r"\s", x) else 0) for x in t) + max(0, len(t) - 1)


def hashtags_in(text):
    out = []
    for m in _HASH.finditer(str(text or "")):
        h = m.group(1).lower()
        if any(c.isalpha() for c in h) and h not in out:
            out.append(h)
    return out


def youtube_limit_issues(title, description, tags=None, L=None):
    """-> [{field, length, limit, unit, message}] for every YouTube limit the payload breaks (empty = ok)."""
    L = L or youtube_limits()
    title, desc, tags = str(title or ""), str(description or ""), [str(t) for t in (tags or [])]
    out = []
    if not title.strip():
        out.append(dict(field="title", length=0, limit=L["title_max_chars"], unit="chars", message="title is empty (YouTube requires a title)"))
    if len(title) > L["title_max_chars"]:
        out.append(dict(field="title", length=len(title), limit=L["title_max_chars"], unit="chars",
                        message=f"title is {len(title)} characters (YouTube max {L['title_max_chars']}): shorten it by {len(title) - L['title_max_chars']}"))
    b = utf8_bytes(desc)
    if b > L["description_max_bytes"]:
        out.append(dict(field="description", length=b, limit=L["description_max_bytes"], unit="bytes",
                        message=f"description is {b} bytes UTF-8 ({len(desc)} characters; YouTube max {L['description_max_bytes']} bytes, Arabic ~2 bytes per letter): cut {b - L['description_max_bytes']} bytes"))
    for field, s in [("title", title), ("description", desc)] + [(f"tags[{i}]", t) for i, t in enumerate(tags)]:
        bad = [c for c in dict.fromkeys(s) if c in L["forbidden_chars"]]
        if bad:
            out.append(dict(field=field, length=sum(1 for c in s if c in L["forbidden_chars"]), limit=0, unit="char",
                            message=f"{field} contains {' and '.join(chr(34) + c + chr(34) for c in bad)} (YouTube rejects < and > in titles/descriptions/tags): remove or reword"))
    tg = tags_length(tags)
    if tg > L["tags_max_chars"]:
        out.append(dict(field="tags", length=tg, limit=L["tags_max_chars"], unit="chars",
                        message=f"tags total {tg} characters (YouTube max {L['tags_max_chars']}, commas + quotes around tags with spaces count): drop tags"))
    hs = hashtags_in(title + "\n" + desc)
    if len(hs) > L["hashtags_max"]:
        out.append(dict(field="hashtags", length=len(hs), limit=L["hashtags_max"], unit="hashtags",
                        message=f"{len(hs)} hashtags in title + description (YouTube max {L['hashtags_max']}; over {L['hashtags_max']} it ignores ALL): keep the best {L['hashtags_max']}"))
    return out


def limit_text(issues):
    return "; ".join(i["message"] for i in issues)


if __name__ == "__main__":
    for _s in (sys.stdout, sys.stderr):
        _s.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) >= 3 and sys.argv[1] == "check":
        a = json.loads(sys.argv[2] if sys.argv[2] != "-" else sys.stdin.read())
        print(json.dumps(youtube_limit_issues(a.get("title"), a.get("description"), a.get("tags")), ensure_ascii=False))
    else:
        print(__doc__)
