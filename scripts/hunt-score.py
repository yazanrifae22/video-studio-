"""clip-hunter: score every clip of a Video Hunter folder and draw strip sheets for the visual check.

    python scripts/hunt-score.py <hunt folder> [--used data/cache/hunt-used.json] [--out <dir>] [--rows 10]

Score /100 (heuristic, the agent's eyes decide): views 25 (log, 10M = 25) · recency 10 · duration fit 10 (6-60 s)
· vertical 10 · resolution 15 (short side >= 720) · unique 10 (not in the studio DB by sha, not in --used)
· motion peak 10 (whole-frame) · clean 10 (static-overlay heuristic: watermark/handle/burned text = static edges).
Writes <out>/hunt-score.json (sorted) and <out>/strips_<k>.jpg (one row per clip: 6 frames at 180 px, label = index file score).
<out> defaults to <folder>/_score (library:register only ingests video files, so it is ignored there).
"""
import argparse, datetime, glob, hashlib, json, math, os, re, sqlite3, subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser(); ap.add_argument("folder"); ap.add_argument("--used"); ap.add_argument("--out"); ap.add_argument("--rows", type=int, default=10)
a = ap.parse_args()
out = a.out or os.path.join(a.folder, "_score"); os.makedirs(out, exist_ok=True)
man = {}
mp = os.path.join(a.folder, "manifest.json")
if os.path.exists(mp):
    with open(mp, encoding="utf8") as f:
        man = {r.get("file"): r for r in json.load(f)}
used = set()
if a.used and os.path.exists(a.used):
    with open(a.used, encoding="utf8") as f:
        used = set(json.load(f).get("urls", []))
con = sqlite3.connect(os.path.join(ROOT, "data", "studio.db"))
shas = {r[0] for r in con.execute("SELECT fingerprint FROM sources WHERE fingerprint IS NOT NULL")}
VID = re.compile(r"/video/(\d+)|shorts/([\w-]{11})|v=([\w-]{11})")


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                                   "-of", "json", p], capture_output=True, text=True).stdout or "{}")
    s = (j.get("streams") or [{}])[0]
    return s.get("width") or 0, s.get("height") or 0, float((j.get("format") or {}).get("duration") or 0)


def frames(p, dur, n, w):
    ims = []
    for k in range(n):
        t = dur * (k + 0.5) / n
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", p, "-frames:v", "1", "-vf", f"scale={w}:-2", "-f", "image2pipe",
                            "-vcodec", "png", "-"], capture_output=True).stdout
        if r:
            import io
            ims.append(Image.open(io.BytesIO(r)).convert("RGB"))
    return ims


rows = []
for f in sorted(glob.glob(os.path.join(a.folder, "*.mp4"))):
    b = os.path.basename(f); m = man.get(b, {})
    w, h, dur = probe(f)
    sha = hashlib.sha256(open(f, "rb").read()).hexdigest()
    url = m.get("url", "")
    vid = VID.search(url or "")
    in_used = bool(url) and any(vid and (vid.group(1) or vid.group(2) or vid.group(3)) in u for u in used)
    small = frames(f, dur, 12, 160)
    g = np.stack([np.asarray(i.convert("L"), np.float32) for i in small]) if small else np.zeros((1, 2, 2))
    motion = float(np.abs(np.diff(g, axis=0)).mean()) if len(g) > 1 else 0.0
    edges = np.abs(np.diff(g, axis=2))[:, :-1, :] + np.abs(np.diff(g, axis=1))[:, :, :-1]
    static = (g.std(axis=0)[:-1, :-1] < 6) & (edges.mean(axis=0) > 40)  # sharp + never changes = overlay
    overlay = float(static.mean())
    views = m.get("views") or 0
    ud = m.get("upload_date") or (str(m.get("year")) + "0101" if m.get("year") else "")
    age = (datetime.date.today() - datetime.date(int(ud[:4]), int(ud[4:6] or 1), int(ud[6:8] or 1))).days / 365 if len(ud) >= 4 else None
    short = min(w, h)
    s = {"views": round(min(25, 25 * math.log10(max(views, 1)) / 7), 1),
         "recency": 10 if age is not None and age <= 1 else 7 if age is not None and age <= 2 else 4 if age is None or age <= 4 else 2,
         "duration": 10 if 6 <= dur <= 60 else 6 if 3 <= dur <= 120 else 2,
         "vertical": 10 if h >= 1.2 * w else 5 if h >= w else 3,
         "resolution": 15 if short >= 720 else 6 if short >= 540 else 0,
         "unique": 0 if (sha in shas or in_used) else 10,
         "motion": round(min(10, motion / 2.5), 1),
         "clean": round(max(0, 10 - overlay * 400), 1)}
    flags = [x for x, c in [("low_res", short < 720), ("landscape", w > h), ("already_used", s["unique"] == 0),
                            ("overlay_suspect", overlay > 0.01), ("long", dur > 60), ("low_motion", motion < 6)] if c]
    rows.append({"file": b, "url": url, "platform": m.get("platform"), "uploader": m.get("uploader"), "views": views, "upload_date": ud or None,
                 "duration": round(dur, 1), "width": w, "height": h, "sha": sha, "score": round(sum(s.values()), 1), "parts": s, "flags": flags,
                 "overlay_share": round(overlay, 4), "_strip": frames(f, dur, 6, 180)})
rows.sort(key=lambda r: -r["score"])
try:
    font = ImageFont.truetype("arial.ttf", 16)
except OSError:
    font = ImageFont.load_default()
sheets = []
for k in range(0, len(rows), a.rows):
    part = rows[k:k + a.rows]
    th = max((i.height for r in part for i in r["_strip"]), default=320)
    sheet = Image.new("RGB", (6 * 180, len(part) * (th + 22)), (16, 16, 16)); d = ImageDraw.Draw(sheet)
    for j, r in enumerate(part):
        y = j * (th + 22)
        d.text((4, y + 2), f"#{k + j + 1} {r['file']}  score {r['score']}  {r['views']:,} views  {r['width']}x{r['height']}  {' '.join(r['flags'])}", fill=(255, 214, 10), font=font)
        for i, im in enumerate(r["_strip"]):
            sheet.paste(im, (i * 180, y + 22))
    p = os.path.join(out, f"strips_{k // a.rows + 1}.jpg"); sheet.save(p, quality=78); sheets.append(p)
for r in rows:
    r.pop("_strip")
with open(os.path.join(out, "hunt-score.json"), "w", encoding="utf8") as fh:
    json.dump({"folder": a.folder, "clips": rows, "sheets": sheets}, fh, indent=1, ensure_ascii=False)
print(json.dumps({"clips": len(rows), "top": [(r["file"], r["score"], r["flags"]) for r in rows[:5]], "sheets": sheets}, ensure_ascii=False))
