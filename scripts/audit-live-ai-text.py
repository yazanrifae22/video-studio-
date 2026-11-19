"""READ-ONLY audit: every uploaded video's LIVE title / description / tags on every channel, through the shared AI-generation
text guard (scripts/ai_text.py; owner 2026-11-08: "the description must never mention that it is created by AI - in the full
info, never mention"). GET requests only (scripts/yt_api.py); nothing on YouTube is changed. The platform's
altered/synthetic-content flag (status.containsSyntheticMedia) is a setting, not text: reported as a count only.

usage: python scripts/audit-live-ai-text.py [brand ...]      (default: every brand with a token in data/tokens/)
writes research/workflow-audits/live-ai-text-<YYYY-MM-DD>.md (+ .json next to it, the input for fix-live-ai-text.py)
"""
import datetime as dt
import json
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_text import ai_text_hits  # noqa: E402
from yt_api import ROOT, TOKENS, ApiError, get, videos  # noqa: E402

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")


def uploads(brand):
    ch = get(brand, "https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&mine=true")
    items = ch.get("items") or []
    if not items:
        return None, []
    title = items[0]["snippet"]["title"]
    pl = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
    ids, tok = [], None
    while True:
        q = {"part": "contentDetails", "playlistId": pl, "maxResults": 50}
        if tok:
            q["pageToken"] = tok
        j = get(brand, "https://www.googleapis.com/youtube/v3/playlistItems?" + urllib.parse.urlencode(q))
        ids += [x["contentDetails"]["videoId"] for x in j.get("items", [])]
        tok = j.get("nextPageToken")
        if not tok:
            break
    return title, ids


def main():
    brands = sys.argv[1:] or sorted(p.stem for p in TOKENS.glob("*.json"))
    day = dt.date.today().isoformat()
    rows, summary, errors = [], [], []
    for b in brands:
        try:
            title, ids = uploads(b)
        except ApiError as e:
            errors.append(f"{b}: {e}")
            continue
        if title is None:
            errors.append(f"{b}: no channel for this token")
            continue
        vs = videos(b, ids, part="snippet,status")
        hits_n, synth = 0, 0
        for vid in ids:
            v = vs.get(vid)
            if not v:
                continue
            sn, st = v.get("snippet", {}), v.get("status", {})
            synth += 1 if st.get("containsSyntheticMedia") else 0
            fields = [("title", sn.get("title", "")), ("description", sn.get("description", ""))] + [(f"tags[{i}]", t) for i, t in enumerate(sn.get("tags") or [])]
            hs = [dict(field=k, **h) for k, t in fields for h in ai_text_hits(t, b)]
            if hs:
                hits_n += 1
                rows.append(dict(video_id=vid, brand=b, channel=title, privacy=st.get("privacyStatus"), publish_at=st.get("publishAt"),
                                 title=sn.get("title", ""), hits=hs))
        summary.append(dict(brand=b, channel=title, videos=len(ids), with_hits=hits_n, synthetic_flag_on=synth))
    out = ROOT / "research" / "workflow-audits" / f"live-ai-text-{day}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    total = sum(s["videos"] for s in summary)
    L = [f"# Live AI-generation text audit - {day}", "",
         "Read-only (YouTube Data API GET via scripts/yt_api.py). Guard: scripts/ai_text.py + config/ai-text-patterns.json "
         "(owner 2026-11-08: never mention AI creation in the published info). Nothing was changed on YouTube. "
         "`containsSyntheticMedia` is the platform's altered-content setting (not text) and is left as it is.", "",
         f"**{len(rows)} video(s) with hits** out of {total} uploads on {len(summary)} channel(s).", "",
         "| brand | channel | uploads | with hits | altered-content flag on |", "|---|---|---|---|---|"]
    L += [f"| {s['brand']} | {s['channel']} | {s['videos']} | {s['with_hits']} | {s['synthetic_flag_on']} |" for s in summary]
    if errors:
        L += ["", "Errors (not audited):"] + [f"- {e}" for e in errors]
    L += ["", "## Hits", "", "| video id | brand | privacy | field | rule | matched phrase | title |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        for h in r["hits"]:
            L.append(f"| [{r['video_id']}](https://youtu.be/{r['video_id']}) | {r['brand']} | {r['privacy']} | {h['field']} | {h['rule']} | `{h['phrase']}` | {r['title'][:60].replace('|', '/')} |")
    if not rows:
        L.append("_none_")
    L += ["", "Fix (owner's call, not run): `python scripts/fix-live-ai-text.py --dry-run` (default) shows the exact edits; "
          "`--apply` would PUT the cleaned title/description/tags for these videos only."]
    out.write_text("\n".join(L) + "\n", encoding="utf8")
    (out.with_suffix(".json")).write_text(json.dumps(dict(date=day, summary=summary, errors=errors, hits=rows), ensure_ascii=False, indent=1), encoding="utf8")
    print(json.dumps(dict(report=str(out.relative_to(ROOT)), videos=total, with_hits=len(rows), errors=errors,
                          by_brand={s["brand"]: s["with_hits"] for s in summary}), ensure_ascii=False))


if __name__ == "__main__":
    main()
