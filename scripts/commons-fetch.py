"""Fetch free-licence photo candidates from Wikimedia Commons for a media wishlist.

usage: python scripts/commons-fetch.py <wishlist.json> <out_dir> [--per 3]
wishlist.json = {"key": ["search query", ...], ...}
Writes <out_dir>/<key>__<n>.jpg (1920 px wide thumbs), <out_dir>/candidates.json (licence, author, page url)
and contact sheets <out_dir>/sheet-NN.jpg. Only CC0 / public domain / CC BY / CC BY-SA files, >= 1400 px wide.
"""
import json, re, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
UA = "studio-media-fetch/1.0 (python-urllib)"
OK_LIC = re.compile(r"^(cc0|public domain|pd\b|cc[ -]by([ -]sa)?[ -]\d|cc by(-sa)? \d|no restrictions)", re.I)


def get(url, binary=False, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=40).read()
            return data if binary else json.loads(data.decode("utf8"))
        except Exception as e:  # noqa
            err = e
            time.sleep(2 + 3 * i)
    raise err


def strip(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()[:160]


def search(q, limit=12):
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": "6", "gsrsearch": q,
         "gsrlimit": str(limit), "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": "1920"}
    d = get(API + "?" + urllib.parse.urlencode(p))
    pages = sorted((d.get("query") or {}).get("pages", {}).values(), key=lambda x: x.get("index", 99))
    out = []
    for pg in pages:
        ii = (pg.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata") or {}
        lic = strip((md.get("LicenseShortName") or {}).get("value"))
        if ii.get("mime") not in ("image/jpeg", "image/png"):
            continue
        if (ii.get("width") or 0) < 1400 or not OK_LIC.search(lic):
            continue
        out.append({"title": pg.get("title"), "page_url": ii.get("descriptionurl"), "thumb": ii.get("thumburl") or ii.get("url"),
                    "w": ii.get("width"), "h": ii.get("height"), "licence": lic,
                    "author": strip((md.get("Artist") or {}).get("value")),
                    "credit": strip((md.get("Credit") or {}).get("value")),
                    "desc": strip((md.get("ImageDescription") or {}).get("value")),
                    "date": strip((md.get("DateTimeOriginal") or {}).get("value"))[:30]})
    return out


def main():
    wl = json.load(open(sys.argv[1], encoding="utf8"))
    out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
    per = int(sys.argv[sys.argv.index("--per") + 1]) if "--per" in sys.argv else 3
    cands, seen = [], set()
    for key, queries in wl.items():
        got = 0
        for q in queries:
            if got >= per:
                break
            try:
                res = search(q)
            except Exception as e:
                print("search failed", key, q, repr(e)); continue
            for r in res:
                if got >= per:
                    break
                if r["title"] in seen:
                    continue
                seen.add(r["title"])
                f = out / f"{key}__{got + 1}.jpg"
                try:
                    f.write_bytes(get(r["thumb"], binary=True))
                except Exception as e:
                    print("download failed", r["title"], repr(e)); continue
                got += 1
                cands.append({"key": key, "file": f.name, "query": q, **r})
                time.sleep(1.5)
            time.sleep(2.0)
        print(f"{key}: {got}")
    json.dump(cands, open(out / "candidates.json", "w", encoding="utf8"), ensure_ascii=False, indent=1)
    # contact sheets: 5 x 4 cells of 240x150, labelled with the running number
    tmp = out / "_t"; tmp.mkdir(exist_ok=True)
    cells = []
    for i, c in enumerate(cands):
        o = tmp / f"{i:03d}.jpg"
        label = f"{i + 1} {c['key']}"[:26].replace(":", " ").replace("'", "")
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(out / c["file"]), "-frames:v", "1", "-vf",
                        "scale=240:150:force_original_aspect_ratio=decrease,pad=240:170:(ow-iw)/2:0:color=black,"
                        f"drawtext=text='{label}':x=3:y=153:fontsize=14:fontcolor=yellow:fontfile='C\\:/Windows/Fonts/arial.ttf'",
                        str(o)], check=False)
        if o.exists():
            cells.append(o)
    n = 0
    for s in range(0, len(cells), 20):
        grp = cells[s:s + 20]; n += 1
        subprocess.run(["ffmpeg", "-y", "-v", "error"] + sum([["-i", str(x)] for x in grp], []) +
                       ["-filter_complex", f"xstack=inputs={len(grp)}:grid=5x4:fill=black" if len(grp) == 20 else
                        f"concat=n={len(grp)}:v=1:a=0,tile=5x4", "-frames:v", "1", "-q:v", "4", str(out / f"sheet-{n:02d}.jpg")],
                       check=False)
    print("candidates:", len(cands), "sheets:", n)


main()
