"""Strip AI-generation text from LIVE YouTube metadata (owner 2026-11-08). DEFAULT = --dry-run: prints the exact before/after and
changes nothing. --apply (owner's explicit OK only) PUTs the cleaned snippet (title, description, tags) of the listed videos;
category, language and every status field (incl. the altered/synthetic-content setting containsSyntheticMedia) are kept as they are.

usage: python scripts/fix-live-ai-text.py [--dry-run | --apply] [--audit research/workflow-audits/live-ai-text-<date>.json] [--brand B] [--limit N]
Input: the newest live-ai-text-*.json written by scripts/audit-live-ai-text.py. Each video is re-read live before any change, and
a video whose cleaned text still hits the guard is skipped (fix by hand). Quota: 1 GET + 50 units per PUT (shared Cloud project).
"""
import sys as _sys
if "--apply" in _sys.argv:
    raise SystemExit("fix-live-ai-text: --apply is locked. Owner rule 2026-11-08: descriptions of uploaded videos are never edited on any channel. Dry-run only.")
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ai_text import ai_text_hits, strip_ai_text  # noqa: E402
from yt_api import ROOT, ApiError, token, videos  # noqa: E402

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def put_snippet(brand, vid, snippet):
    body = json.dumps({"id": vid, "snippet": snippet}).encode("utf8")
    req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?part=snippet", data=body, method="PUT",
                                 headers={"Authorization": f"Bearer {token(brand)}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise ApiError(e.code, e.read().decode("utf8", "replace")[:300])


def main():
    apply = "--apply" in sys.argv
    audits = sorted((ROOT / "research" / "workflow-audits").glob("live-ai-text-*.json"))
    src = Path(arg("--audit")) if arg("--audit") else (audits[-1] if audits else None)
    if not src or not src.exists():
        raise SystemExit("no audit JSON: run python scripts/audit-live-ai-text.py first")
    rows = json.loads(src.read_text(encoding="utf8"))["hits"]
    if arg("--brand"):
        rows = [r for r in rows if r["brand"] == arg("--brand")]
    rows = rows[: int(arg("--limit", len(rows)))]
    print(f"{'APPLY' if apply else 'DRY RUN (nothing changed)'}: {len(rows)} video(s) from {src.name}")
    done = skipped = 0
    for r in rows:
        b, vid = r["brand"], r["video_id"]
        v = videos(b, [vid], part="snippet").get(vid)
        if not v:
            print(f"- {vid}: not found / no access, skipped")
            skipped += 1
            continue
        sn = v["snippet"]
        title, desc, tags = sn.get("title", ""), sn.get("description", ""), list(sn.get("tags") or [])
        n_title, n_desc = strip_ai_text(title, b), strip_ai_text(desc, b)
        n_tags = [t for t in tags if not ai_text_hits(t, b)]
        left = ai_text_hits(n_title, b) + ai_text_hits(n_desc, b)
        if left or not n_title.strip():
            print(f"- {vid} ({b}): automatic strip not clean ({'; '.join(h['phrase'] for h in left) or 'title would be empty'}), skipped: fix by hand")
            skipped += 1
            continue
        if (n_title, n_desc, n_tags) == (title, desc, tags):
            print(f"- {vid} ({b}): already clean")
            continue
        removed = [ln for ln in desc.split("\n") if ln not in n_desc.split("\n")]
        added = [ln for ln in n_desc.split("\n") if ln not in desc.split("\n")]
        print(f"- {vid} ({b}) {sn.get('title', '')[:60]!r}")
        for ln in removed:
            print(f"    - {ln[:160]}")
        for ln in added:
            print(f"    + {ln[:160]}")
        if n_title != title:
            print(f"    title: {title!r} -> {n_title!r}")
        if n_tags != tags:
            print(f"    tags removed: {[t for t in tags if t not in n_tags]}")
        if apply:
            keep = {k: sn[k] for k in ("categoryId", "defaultLanguage", "defaultAudioLanguage") if k in sn}
            try:
                put_snippet(b, vid, {"title": n_title, "description": n_desc, "tags": n_tags, **keep})
                done += 1
            except ApiError as e:
                print(f"    PUT failed: {e}")
                if "quota" in str(e).lower():
                    break
        else:
            done += 1
    print(f"{'changed' if apply else 'would change'}: {done}, skipped: {skipped}")


if __name__ == "__main__":
    main()
