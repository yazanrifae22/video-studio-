"""Writes the Karto & Skip GOLD upload kits from kit-source.json:
  productions/<id>/publish-kit.json          (EN: expl-261119-i2xn, AR: expl-261119-x0ki)
  productions/<id>/shorts/shorts-kit.json

    python docs/brands/karto/gold/make-kit.py

Re-run when: (1) the voiced build exists or is rebuilt (chapter timestamps come from the NEWEST productions/<id>/v<N>/chapters.txt;
until then the kit carries CHAPTERS_PENDING), (2) kit-source.json changes (titles, tags, comment, Shorts), (3) photos/clips change in
packages/cutout/films/gold (credits are generated from assets/real/sources.json for the photos the film code actually uses),
(4) the owner picks a thumbnail (set thumb_default in kit-source.json, then copy it to productions/<id>/thumbnail.jpg).
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from ai_text import refuse_ai_text  # noqa: E402

SRC = json.loads((HERE / "kit-source.json").read_text(encoding="utf8"))
FILM = ROOT / "packages/cutout/films/gold"
SOURCES = json.loads((FILM / "assets/real/sources.json").read_text(encoding="utf8"))
AR_DIGITS = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")


def used_photos():
    names = set()
    for f in list((FILM / "chapters").glob("*.js")) + [FILM / "film.js"]:
        if f.exists():
            names |= set(re.findall(r"photo\(\s*['\"]([a-z_0-9]+)['\"]", f.read_text(encoding="utf8")))
    return names


def clean_author(owner, file):
    extra = SRC.get("photo_credit_extra", {})
    key = file.rsplit(".", 1)[0]
    if key in extra:
        return extra[key]
    if file == "bars_vault.jpg":
        return "Andrzej Barabasz (Chepry)"
    o = re.sub(r"[^\x00-\x7FÀ-ɏ]", "", owner).strip()
    o = re.sub(r"\s+from\s+.*$", "", o)
    if not o or o.lower().startswith("http") or "unknown" in o.lower():
        return "Unknown author"
    if o.startswith("This file was contributed"):
        return "Hennepin County Library / Digital Public Library of America"
    return o


def photo_credit_lines(via):
    used = used_photos()
    out_cc, out_pd = [], []
    for s in SOURCES:
        if "licence" not in s or not s["file"].endswith(".jpg"):
            continue
        key = s["file"][:-4]
        if used and key not in used:
            continue
        lic = s["licence"]
        author = clean_author(s.get("owner", ""), s["file"])
        if lic.upper().startswith("CC BY"):
            out_cc.append(f"- {author}, {lic}, {via}")
        else:
            out_pd.append(f"- {author} ({lic}), {s.get('source', 'Wikimedia Commons')}")
    return out_cc + out_pd


def clip_credit_lines():
    out, seen = [], set()
    for s in SOURCES:
        if s.get("platform") != "tiktok":
            continue
        m = re.search(r"tiktok\.com/@([^/]+)/", s.get("source_url", ""))
        # the uploader field comes from the video's own metadata (yt-dlp); the handle inside a search-result URL can be
        # stale or wrong, and the on-screen credits use the uploader, so the description must match them
        h = s.get("uploader") or (m.group(1) if m else "")
        if h and h not in seen:
            seen.add(h)
            out.append(f"- @{h} (TikTok)")
    return out


def chapters(pid):
    vs = sorted([d for d in (ROOT / "productions" / pid).glob("v*") if d.is_dir() and re.fullmatch(r"v\d+", d.name)],
                key=lambda d: int(d.name[1:]))
    for d in reversed(vs):
        f = d / "chapters.txt"
        if f.exists():
            return d.name, f.read_text(encoding="utf8").strip()
    print(f"[{pid}] NO voiced version with chapters.txt yet -> CHAPTERS_PENDING")
    return None, None


def build_kit(lang):
    pid = SRC["productions"][lang]
    L = SRC[lang]
    ver, chap = chapters(pid)
    chap_block = chap if chap else "CHAPTERS_PENDING"
    desc = "\n".join([
        L["hook"], "", L["covers"], "", L["score_line"], "", chap_block, "",
        L["sources_title"] + ":", *["- " + s for s in L["sources"]], "",
        L["credits_title"] + ":", *photo_credit_lines(L["via"]), "",
        L["credits_clips_title"] + ":", *clip_credit_lines(), "",
        L["disclaimer"], "", " ".join(L["hashtags"]),
    ])
    thumb = f"{SRC['thumb_dir']}/{SRC['thumb_default']}-{lang}.jpg"
    kit = {
        "title": L["titles"][0],
        "title_options": L["titles"],
        "description": desc,
        "hashtags": L["hashtags"],
        "tags": L["tags"],
        "pinned_comment": L["pinned_comment"],
        "end_screen": SRC["end_screen"],
        "playlist": SRC["playlist"][lang],
        "category": SRC["category"],
        "thumbnail": ["thumbnail.jpg"],
        "thumbnail_candidates": [f"{SRC['thumb_dir']}/{k}-{lang}.jpg" for k in "ABC"],
        "thumbnail_note": L["thumbnail_note"] + f" Default until chosen: {thumb}.",
        "video": f"{ver}/render.mp4" if ver else "CHAPTERS_PENDING (no voiced version yet)",
        "subtitles": f"{ver}/captions.srt" if ver else "CHAPTERS_PENDING",
        "language": lang,
        "audience": "not made for kids",
        "made_for_kids": False,
        "open_before_publish": [
            "Owner picks the thumbnail (A, B or C) and copies it to thumbnail.jpg.",
            "Third-party TikTok clips (owner order 2026-11-19, claim risk) and Wikimedia CC photos are credited in the description; owner decides on the claim risk.",
            "Check numbers in the description against the final voiced script before upload.",
        ],
        "status": "NOT uploaded",
    }
    if not chap:
        kit["chapters_status"] = "CHAPTERS_PENDING: re-run make-kit.py after the voiced build writes v<N>/chapters.txt"
    return pid, kit


def build_shorts(lang):
    S = SRC["shorts"]
    pid = SRC["productions"][lang]
    items = []
    for it in S["items"]:
        piece = it["piece"] if lang == "en" else str(it["piece"]).translate(AR_DIGITS)
        v = it[lang]
        desc = "\n".join([S["full_video_placeholder"], S["desc_line2"][lang].format(piece=piece), " ".join(v["hashtags"])])
        items.append({
            "id": it["id"], "piece": it["piece"], "lines": it["lines"],
            "video": f"shorts/{it['id']}/render.mp4",
            "title": v["title"], "description": desc, "hashtags": v["hashtags"],
            "hook_text": it["hook_text_" + lang],
        })
        assert len(v["title"]) < 60, v["title"]
        assert 3 <= len(v["hashtags"]) <= 5
    return pid, {
        "note": "One Short = one of the 7 pieces; each ends on the line that all seven are in the full video. Replace {{FULL_VIDEO_URL}} (first line of each description) with the full video link once it is public. Post order = strongest first.",
        "post_order": S["post_order"], "post_order_why": S["post_order_why"], "shorts": items,
    }


def main():
    for lang in ("en", "ar"):
        pid, kit = build_kit(lang)
        for t in kit["title_options"]:
            assert len(t) <= 70, (len(t), t)
        assert 15 <= len(kit["tags"]) <= 25
        refuse_ai_text(kit, where=f"[{lang} kit] ")
        out = ROOT / "productions" / pid / "publish-kit.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(kit, ensure_ascii=False, indent=1), encoding="utf8")
        print("wrote", out)
        pid, sk = build_shorts(lang)
        refuse_ai_text(sk, where=f"[{lang} shorts] ")
        sd = ROOT / "productions" / pid / "shorts"
        sd.mkdir(parents=True, exist_ok=True)
        (sd / "shorts-kit.json").write_text(json.dumps(sk, ensure_ascii=False, indent=1), encoding="utf8")
        print("wrote", sd / "shorts-kit.json")


if __name__ == "__main__":
    main()
