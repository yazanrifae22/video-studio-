"""Write the Video Hunter exclude-used list: every TikTok/YouTube URL the studio already registered as a source
(any brand) plus every URL in a Podium Pop production's hunt.json picks. Clip-hunter passes it as --exclude-used.

    python scripts/hunt-used.py [--out data/cache/hunt-used.json]
"""
import glob, json, os, re, sqlite3, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(ROOT, "data", "cache", "hunt-used.json")
URL = re.compile(r"https?://(?:www\.)?(?:tiktok\.com/@[\w.\-]+/video/\d+|youtube\.com/(?:shorts/|watch\?v=)[\w\-]{11}|youtu\.be/[\w\-]{11})")

urls = set()
con = sqlite3.connect(os.path.join(ROOT, "data", "studio.db"))
for (u, d) in con.execute("SELECT original_url, data FROM sources"):
    for s in (u or "", d or ""):
        urls.update(URL.findall(s))
for f in glob.glob(os.path.join(ROOT, "productions", "rank-*", "hunt.json")):
    try:
        with open(f, encoding="utf8") as fh:
            urls.update(URL.findall(fh.read()))
    except OSError:
        pass
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf8") as fh:
    json.dump({"urls": sorted(urls)}, fh, indent=1)
print(json.dumps({"out": out, "urls": len(urls)}))
