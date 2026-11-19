"""cut-judge evidence for ONE source clip (or one render): paged contact sheets + motion/brightness/crop curve + ranked windows.

    python scripts/cut-sheet.py <video> --out <dir> [--in S --to S] [--step 0.25|0.5] [--label rank1]
                                [--box 1080x1130] [--win S] [--cols 6] [--rows 4] [--tile 360]

Writes into <dir>:
  <label>_sheet_<k>.jpg   tiles <tile> px wide every <step> s over the WHOLE clip, timestamp on each tile,
                          tiles inside the chosen window (--in/--to) framed yellow, the motion peak framed red
  <label>_curve.png       motion (white), scene change (red ticks), brightness (blue), share of motion outside the
                          9:16 crop window (orange); chosen window shaded
  <label>_cut.json        per-sample curve + summary: peak, dead runs, dark/blur flags, crop risk, top windows
Motion = mean abs luma difference between samples (whole frame: camera + subject). Heuristic evidence, not a verdict.
"""
import argparse, json, math, os, subprocess, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--out", required=True)
ap.add_argument("--in", dest="t_in", type=float); ap.add_argument("--to", dest="t_out", type=float)
ap.add_argument("--step", type=float); ap.add_argument("--label", default="clip")
ap.add_argument("--box", default="1080x1130", help="target footage box WxH (Podium Pop style v2 tall: 1080x1130; title_layout full: 'full' = 1080x1920 for vertical sources)")
ap.add_argument("--win", type=float, help="window length for the ranked alternatives (default = chosen length or 5 s)")
ap.add_argument("--cols", type=int, default=6); ap.add_argument("--rows", type=int, default=4)
ap.add_argument("--tile", type=int, default=360)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height:format=duration", "-of", "json", p],
                                  capture_output=True, text=True).stdout)
    s = j["streams"][0]
    return s["width"], s["height"], float(j["format"]["duration"])


W, H, DUR = probe(a.video)
step = a.step or (0.25 if DUR <= 20 else 0.5)
CURVE_FPS = 8  # curve resolution 0.125 s
cw = 96; ch = max(2, int(round(cw * H / W / 2)) * 2)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-vf", f"fps={CURVE_FPS},scale={cw}:{ch},format=gray",
                      "-f", "rawvideo", "-"], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8)[: (len(raw) // (cw * ch)) * cw * ch].reshape(-1, ch, cw).astype(np.float32)
n = len(fr)
ts = np.arange(n) / CURVE_FPS
luma = fr.mean(axis=(1, 2))
diff = np.zeros(n); diff[1:] = np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))
# sharpness proxy: mean abs Laplacian
lap = np.abs(4 * fr[:, 1:-1, 1:-1] - fr[:, :-2, 1:-1] - fr[:, 2:, 1:-1] - fr[:, 1:-1, :-2] - fr[:, 1:-1, 2:]).mean(axis=(1, 2))
# scene change: diff spike vs local median
med = np.array([np.median(diff[max(0, i - 8):i + 8]) for i in range(n)])
scene = (diff > np.maximum(25, 3.5 * med)).astype(int)
# crop risk: share of motion energy outside the centred crop window that the box aspect takes from this source
bw, bh = (int(x) for x in ("1080x1920" if a.box.lower() == "full" else a.box.lower()).split("x"))
crop_w = min(1.0, (H * bw / bh) / W)  # fraction of source width visible when the box is filled (cover)
x0, x1 = int((1 - crop_w) / 2 * cw), int((1 + crop_w) / 2 * cw)
outside = np.zeros(n)
cx = np.full(n, 0.5)
if n > 1:
    m = np.abs(fr[1:] - fr[:-1]).sum(axis=1)  # (n-1, cw) column energy
    tot = m.sum(axis=1) + 1e-6
    outside[1:] = (m[:, :x0].sum(axis=1) + m[:, x1:].sum(axis=1)) / tot
    cx[1:] = (m * np.arange(cw)).sum(axis=1) / tot / cw
motion = np.convolve(diff, np.ones(3) / 3, mode="same")
peak_i = int(np.argmax(motion)) if n else 0
mmax = float(motion.max() or 1)


def window_stats(t0, t1):
    i0, i1 = max(0, int(t0 * CURVE_FPS)), min(n, max(int(t1 * CURVE_FPS), int(t0 * CURVE_FPS) + 1))
    seg = motion[i0:i1]
    if not len(seg):
        return None
    pk = i0 + int(np.argmax(seg))
    low = seg < 0.15 * mmax
    runs, run = [], 0
    for k, v in enumerate(low):
        run = run + 1 if v else 0
        if run == int(0.5 * CURVE_FPS):
            runs.append(round((i0 + k - run + 1) / CURVE_FPS, 2))
    return {"in": round(t0, 2), "out": round(t1, 2), "peak_t": round(pk / CURVE_FPS, 2),
            "peak_rel": round(float(seg.max()) / mmax, 2), "energy": round(float(seg.mean()) / mmax, 3),
            "setup_s": round(pk / CURVE_FPS - t0, 2), "after_peak_s": round(t1 - pk / CURVE_FPS, 2),
            "dead_runs_at": runs, "luma_mean": round(float(luma[i0:i1].mean()), 1),
            "sharp_mean": round(float(lap[i0:i1].mean()), 2), "scene_cuts": [round(i / CURVE_FPS, 2) for i in range(i0, i1) if scene[i]],
            "crop_outside_max": round(float(outside[i0:i1].max()), 2),
            "crop_outside_at_peak": round(float(outside[pk]), 2)}


chosen = window_stats(a.t_in, a.t_out) if a.t_in is not None and a.t_out is not None else None
L = a.win or ((a.t_out - a.t_in) if chosen else 5.0)
# ranked alternatives: windows of length L whose peak sits after <= 1.2 s of setup and leaves >= 1 s landing
cands = []
for s in np.arange(0, max(0.01, DUR - L + 0.001), 0.25):
    w = window_stats(float(s), float(s + L))
    if not w:
        continue
    shape = 1.0 if (0.3 <= w["setup_s"] <= 1.2 and w["after_peak_s"] >= 1.0) else 0.6
    w["score"] = round((0.55 * w["peak_rel"] + 0.45 * w["energy"] * 3) * shape * (1 - 0.5 * w["crop_outside_at_peak"])
                       * (0.7 if w["luma_mean"] < 50 else 1.0) * (0.85 if w["dead_runs_at"] else 1.0), 3)
    cands.append(w)
cands.sort(key=lambda w: -w["score"])
top = []
for w in cands:  # non-overlapping-ish (peaks >= 1 s apart)
    if all(abs(w["peak_t"] - t["peak_t"]) >= 1.0 for t in top):
        top.append(w)
    if len(top) == 4:
        break

# ---- contact sheets
tw = a.tile; th = int(round(tw * H / W))
times = list(np.arange(0, DUR - 0.05, step))
per = a.cols * a.rows
try:
    font = ImageFont.truetype("arial.ttf", max(14, tw // 14))
except OSError:
    font = ImageFont.load_default()
sheets = []
tmp = os.path.join(a.out, f"_{a.label}_frames")
os.makedirs(tmp, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vf", f"fps=1/{step},scale={tw}:{th}", "-q:v", "4",
                os.path.join(tmp, "f_%05d.jpg")], check=False)
files = sorted(f for f in os.listdir(tmp) if f.endswith(".jpg"))
for page in range(math.ceil(len(files) / per)):
    sheet = Image.new("RGB", (a.cols * tw, a.rows * th), (16, 16, 16))
    d = ImageDraw.Draw(sheet)
    for k, f in enumerate(files[page * per:(page + 1) * per]):
        t = (page * per + k) * step
        im = Image.open(os.path.join(tmp, f)).convert("RGB")
        x, y = (k % a.cols) * tw, (k // a.cols) * th
        sheet.paste(im, (x, y))
        inside = chosen and a.t_in - 1e-6 <= t < a.t_out
        is_peak = abs(t - peak_i / CURVE_FPS) < step / 2
        if inside or is_peak:
            d.rectangle([x + 1, y + 1, x + tw - 2, y + th - 2], outline=(255, 40, 40) if is_peak else (255, 214, 10), width=5)
        d.rectangle([x, y, x + tw // 3, y + tw // 11], fill=(0, 0, 0))
        d.text((x + 5, y + 2), f"{t:.2f}s", fill=(255, 255, 255), font=font)
    p = os.path.join(a.out, f"{a.label}_sheet_{page + 1}.jpg")
    sheet.save(p, quality=80)
    sheets.append(p)
for f in files:
    os.remove(os.path.join(tmp, f))
os.rmdir(tmp)

# ---- curve image
CW, CH = 1200, 220
img = Image.new("RGB", (CW, CH), (12, 12, 12)); d = ImageDraw.Draw(img)
X = lambda t: int(t / max(DUR, 0.01) * (CW - 1))
if chosen:
    d.rectangle([X(a.t_in), 0, X(a.t_out), CH], fill=(60, 52, 10))
for s in range(int(DUR) + 1):
    d.line([X(s), CH - 12, X(s), CH], fill=(90, 90, 90)); d.text((X(s) + 2, CH - 12), str(s), fill=(120, 120, 120))
def plot(vals, vmax, col):
    pts = [(X(ts[i]), int(CH - 16 - (vals[i] / (vmax or 1)) * (CH - 30))) for i in range(n)]
    if len(pts) > 1:
        d.line(pts, fill=col, width=2)
plot(luma, 255, (70, 130, 255)); plot(outside, 1, (255, 150, 30)); plot(motion, mmax, (240, 240, 240))
for i in range(n):
    if scene[i]:
        d.line([X(ts[i]), 0, X(ts[i]), 14], fill=(255, 40, 40), width=2)
d.text((6, 4), "motion=white  luma=blue  outside-crop=orange  cut=red  window=shaded", fill=(200, 200, 200))
curve = os.path.join(a.out, f"{a.label}_curve.png"); img.save(curve)

summary = {"video": a.video, "label": a.label, "width": W, "height": H, "duration": round(DUR, 2), "sheet_step_s": step,
           "box": a.box, "crop_width_share": round(crop_w, 3), "peak_t": round(peak_i / CURVE_FPS, 2),
           "chosen": chosen, "top_windows": top, "sheets": sheets, "curve": curve,
           "flags": [f for f, cond in [
               ("dark", chosen and chosen["luma_mean"] < 50), ("soft", chosen and chosen["sharp_mean"] < 2.0),
               ("dead_frames", chosen and bool(chosen["dead_runs_at"])),
               ("peak_outside_window", chosen and not (a.t_in <= peak_i / CURVE_FPS <= a.t_out)),
               ("crop_risk", chosen and chosen["crop_outside_at_peak"] > 0.35),
               ("long_setup", chosen and chosen["setup_s"] > 1.2), ("no_landing", chosen and chosen["after_peak_s"] < 0.8)] if cond],
           "curve_samples": [{"t": round(float(ts[i]), 3), "motion": round(float(motion[i]) / mmax, 3), "luma": round(float(luma[i]), 1),
                              "outside": round(float(outside[i]), 2), "scene": int(scene[i])} for i in range(0, n, 2)]}
with open(os.path.join(a.out, f"{a.label}_cut.json"), "w", encoding="utf8") as fh:
    json.dump(summary, fh, indent=1)
print(json.dumps({k: summary[k] for k in ("label", "duration", "peak_t", "chosen", "flags")} | {"top": [(w["in"], w["out"], w["score"]) for w in top], "sheets": len(sheets)}))
