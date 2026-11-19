"""Frame picker: best opening / thumbnail stills in one clip (Podium Pop frame 0, hook-architect + cut-judge evidence).

    python scripts/frame-pick.py <video> --out <dir> [--in S --to S] [--label x] [--top 5] [--step 0.1]

Samples every ~0.1 s in the window and scores each frame (0-100) on:
  sharp   Laplacian variance vs the window's best (motion blur scores low)
  action  motion energy vs neighbours; the peak or 1-2 samples before it score best (the moment just before impact)
  whole   bounding box of the moving region must not touch the frame edges (touching = something is cut)
  size    bigger moving-region box is better, up to ~60 % of the frame
  expo    not dark, not blown out
  text    burned text / watermark hint: edge density in the top / bottom 15 % strips well above the middle = penalty
Writes <label>_frames.json (top N: t, total, sub-scores, bbox as frame fractions) and <label>_frames.jpg
(the top N side by side at 360 px wide, moving box drawn, t + score burned in). Heuristic evidence, not a verdict.
numpy + PIL + ffmpeg only (no cv2).
"""
import argparse, json, os, subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--out", required=True)
ap.add_argument("--in", dest="t_in", type=float, default=0.0); ap.add_argument("--to", dest="t_out", type=float)
ap.add_argument("--label", default="clip"); ap.add_argument("--top", type=int, default=5)
ap.add_argument("--step", type=float, default=0.1)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height:format=duration", "-of", "json", p],
                                  capture_output=True, text=True, encoding="utf8").stdout)
    s = j["streams"][0]
    return s["width"], s["height"], float(j["format"]["duration"])


W, H, DUR = probe(a.video)
t0 = max(0.0, a.t_in)
t1 = min(DUR, a.t_out if a.t_out is not None else DUR)
if t1 - t0 < 3 * a.step:
    raise SystemExit(f"window {t0}-{t1} s too short")
AW = 240; AH = max(2, int(round(AW * H / W / 2)) * 2)          # analysis size
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t0:.3f}", "-i", a.video, "-t", f"{t1 - t0:.3f}",
                      "-vf", f"fps={1 / a.step:.4f},scale={AW}:{AH},format=gray", "-f", "rawvideo", "-"],
                     capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8)[: (len(raw) // (AW * AH)) * AW * AH].reshape(-1, AH, AW).astype(np.float32)
n = len(fr)
ts = t0 + np.arange(n) * a.step

# sharpness: variance of the 4-neighbour Laplacian
lap = 4 * fr[:, 1:-1, 1:-1] - fr[:, :-2, 1:-1] - fr[:, 2:, 1:-1] - fr[:, 1:-1, :-2] - fr[:, 1:-1, 2:]
lapv = lap.reshape(n, -1).var(axis=1)
sharp = np.clip(lapv / (np.percentile(lapv, 90) + 1e-6), 0, 1)

# motion: mean abs difference to the neighbours; action = peak or 1-2 samples before it
d = np.zeros(n); d[1:] = np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))
mot = np.convolve(d, np.ones(3) / 3, mode="same")
mmax = mot.max() or 1.0
ahead = np.array([max(mot[i + k] * (1 - 0.12 * k) for k in range(3) if i + k < n) for i in range(n)])
action = np.clip(ahead / mmax, 0, 1)

# moving region: pixels that change vs both neighbours (camera shake is spread out, the subject is concentrated)
def bbox_of(i):
    p, q = fr[max(0, i - 1)], fr[min(n - 1, i + 1)]
    m = np.minimum(np.abs(fr[i] - p), np.abs(q - fr[i])) if 0 < i < n - 1 else np.abs(q - p)
    thr = max(14.0, float(np.percentile(m, 92)))
    mask = m > thr
    if mask.sum() < 0.004 * m.size:
        return None
    def span(v):
        c = np.cumsum(v) / v.sum()
        return int(np.searchsorted(c, 0.03)), int(np.searchsorted(c, 0.97))
    x0, x1 = span(mask.sum(axis=0)); y0, y1 = span(mask.sum(axis=1))
    return [x0 / AW, y0 / AH, (x1 + 1) / AW, (y1 + 1) / AH]

boxes = [bbox_of(i) for i in range(n)]
EDGE = 0.02
whole = np.array([0.4 if b is None else 1.0 - 0.25 * sum([b[0] <= EDGE, b[1] <= EDGE, b[2] >= 1 - EDGE, b[3] >= 1 - EDGE])
                  for b in boxes])
size = np.array([0.0 if b is None else min(1.0, (b[2] - b[0]) * (b[3] - b[1]) / 0.6) for b in boxes])

# exposure: mean luma 50-200 is fine; heavy clipping at either end is penalised
mean = fr.mean(axis=(1, 2))
clip = ((fr < 12) | (fr > 245)).mean(axis=(1, 2))
expo = np.clip(1 - np.maximum(0, 50 - mean) / 50 - np.maximum(0, mean - 200) / 55 - np.maximum(0, clip - 0.15) * 2, 0, 1)

# burned text / watermark hint: edge density in the top / bottom 15 % strips vs the middle
gx = np.abs(np.diff(fr, axis=2))[:, :-1, :]; gy = np.abs(np.diff(fr, axis=1))[:, :, :-1]
edges = (np.maximum(gx, gy) > 40).astype(np.float32)
s = max(1, int(0.15 * edges.shape[1]))
top_d, bot_d = edges[:, :s].mean(axis=(1, 2)), edges[:, -s:].mean(axis=(1, 2))
mid_d = edges[:, s:-s].mean(axis=(1, 2)) + 1e-3
strip = np.maximum(top_d, bot_d)
text = np.clip((strip / mid_d - 1.6) / 2.0, 0, 1) * (strip > 0.04)   # 1 = strong text hint

total = 100 * (0.26 * sharp + 0.24 * action + 0.22 * whole + 0.14 * size + 0.08 * expo + 0.06 * (1 - text))
total = total * (0.6 + 0.4 * sharp)          # a blurred frame never wins on action alone

# top N with >= 0.3 s between picks
order = np.argsort(-total)
picks = []
for i in order:
    if all(abs(ts[i] - ts[j]) >= 0.3 for j in picks):
        picks.append(int(i))
    if len(picks) >= a.top:
        break
picks.sort(key=lambda i: -total[i])

r = lambda v: round(float(v), 3)
res = {"video": os.path.abspath(a.video), "size": [W, H], "window": [r(t0), r(t1)], "step": a.step, "samples": n,
       "weights": {"sharp": 0.26, "action": 0.24, "whole": 0.22, "size": 0.14, "expo": 0.08, "text": 0.06, "blur_gate": "x(0.6+0.4*sharp)"},
       "top": [{"t": r(ts[i]), "total": round(float(total[i]), 1), "sharp": r(sharp[i]), "action": r(action[i]), "whole": r(whole[i]),
                "size": r(size[i]), "expo": r(expo[i]), "text_hint": r(text[i]),
                "bbox": [r(v) for v in boxes[i]] if boxes[i] else None,
                "cut": bool(boxes[i] and whole[i] < 1.0)} for i in picks],
       "note": "bbox = moving region as frame fractions; cut = the moving region touches a frame edge (part of the action may be outside)"}
jf = os.path.join(a.out, f"{a.label}_frames.json")
with open(jf, "w", encoding="utf8") as f:
    json.dump(res, f, indent=1)

# strip: top N at 360 px wide, box + t + score burned in
TW = 360
try:
    fnt = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
except OSError:
    fnt = ImageFont.load_default()
tiles = []
for k, i in enumerate(picks):
    png = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{ts[i]:.3f}", "-i", a.video, "-frames:v", "1",
                          "-vf", f"scale={TW}:-2", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True).stdout
    from io import BytesIO
    im = Image.open(BytesIO(png)).convert("RGB")
    dr = ImageDraw.Draw(im)
    b = boxes[i]
    if b:
        dr.rectangle([b[0] * im.width, b[1] * im.height, b[2] * im.width - 1, b[3] * im.height - 1],
                     outline=(255, 80, 80) if whole[i] < 1 else (60, 230, 120), width=3)
    lab = f"#{k + 1}  t {ts[i]:.2f}s  {total[i]:.0f}"
    dr.rectangle([0, 0, im.width, 30], fill=(0, 0, 0))
    dr.text((8, 3), lab, font=fnt, fill=(255, 214, 10))
    tiles.append(im)
hh = max(t.height for t in tiles)
sheet = Image.new("RGB", (len(tiles) * (TW + 6) - 6, hh), (20, 20, 20))
for k, t in enumerate(tiles):
    sheet.paste(t, (k * (TW + 6), 0))
jp = os.path.join(a.out, f"{a.label}_frames.jpg")
sheet.save(jp, quality=88)
print(json.dumps({"json": jf, "jpg": jp, "top": [{"t": p["t"], "total": p["total"], "cut": p["cut"]} for p in res["top"]]}))
