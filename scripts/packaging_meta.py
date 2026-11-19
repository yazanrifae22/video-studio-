"""Published metadata for one production (workflow audit 2026-11-08 item I1: packaging reaches the publisher).

Title / description / hashtags come from productions/<id>/packaging.json (`chosen_title`, `description`, `hashtags`,
written by packaging-director, kept OUTSIDE the script hash) and fall back to script.json field by field. Credits stay from
script.json `attribution_block` (copied from the rights record) and are appended once, as before. A packaging description
that is empty or an instruction such as "KEEP script.json description unchanged" means: use script.json's description.
`limits` = YouTube metadata limit issues (scripts/platform_limits.py). Used by scripts/publish-plan.py and scripts/fb-plan.py (and tested by scripts/test-publish-plan.py). Only NEW plan entries
read this: already scheduled/published videos are never regenerated.
"""
import json, os, re

from ai_text import ai_text_fields  # shared AI-generation text guard (owner 2026-11-08)
from platform_limits import youtube_limit_issues  # YouTube metadata limits (owner 2026-11-08; config/platform-limits.json)

KEEP = re.compile(r"^\s*(keep|same as|unchanged|use script)\b", re.I)


def _load(f):
    try:
        with open(f, encoding="utf-8-sig") as h:
            return json.load(h)
    except (OSError, ValueError):
        return None


def _tags(v):
    if isinstance(v, str):
        v = v.split()
    return [str(t).strip() for t in (v or []) if str(t).strip()]


def published_meta(pdir, brand, dbtitle, s=None):
    """-> dict(title, description, hashtags, source) ready for the plan (description already carries credits + hashtags)."""
    s = s if s is not None else (_load(os.path.join(pdir, "script.json")) or {})
    pk = _load(os.path.join(pdir, "packaging.json")) or {}
    ptitle = str(pk.get("chosen_title") or "").strip()
    pdesc = pk.get("description") if isinstance(pk.get("description"), str) else ""
    pdesc = "" if not pdesc.strip() or KEEP.match(pdesc) else pdesc.strip()
    ptags = _tags(pk.get("hashtags"))
    used = []
    if brand == "quiz-ar":
        title = ptitle or (s.get("titles") or {}).get("youtube") or dbtitle
        desc = pdesc or s.get("description_ar") or ""
        tags = ptags  # quiz-ar script descriptions already carry their hashtags; only packaging adds more
    else:
        title = ptitle or s.get("title") or dbtitle
        desc = pdesc or s.get("description") or ""
        att = s.get("attribution_block")
        if isinstance(att, list):
            att = "\n".join(att)
        if att and att[:60] not in desc:
            desc += "\n\n" + att
        tags = ptags or _tags(s.get("hashtags"))
    if ptitle:
        used.append("title")
    if pdesc:
        used.append("description")
    if ptags:
        used.append("hashtags")
    line = " ".join(tags)
    if line and line not in desc:
        desc += "\n\n" + line
    # owner 2026-11-08: never mention AI creation anywhere in the published info -> plan writers refuse an entry with hits
    ai = ai_text_fields({"title": title or "", "description": desc, "hashtags": tags}, brand)
    # owner 2026-11-08: YouTube limits (title 100 chars, description 5000 BYTES, no < >, tags 500, <= 15 hashtags): plan writers
    # refuse an entry with issues (never truncate); tags = hashtags without '#', as publish-plan.py sends them
    limits = youtube_limit_issues(title or "", desc, [t.lstrip("#") for t in tags])
    # owner 2026-11-08: YouTube altered/synthetic setting = packaging.json altered_content (true ONLY for realistic depictions of real
    # people/events that did not happen; a packaging.json without the key = false). None = no packaging.json (legacy rule in the caller).
    altered = (pk.get("altered_content") is True) if pk else None
    return dict(title=title or "", description=desc, hashtags=tags, ai_text=ai, limits=limits, altered=altered,
                source=("packaging.json(" + ",".join(used) + ")+script.json") if used else "script.json")
