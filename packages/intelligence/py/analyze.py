"""Cheap, cached multimodal signals for one media file (pass 1–3 of the hierarchical analysis).

usage: python analyze.py <media> <outdir>
Writes <outdir>/analysis.json and <outdir>/sheet_<n>.jpg contact sheets (timestamped, one tile per scene).
Signals: scene cuts (ffmpeg scdet), audio RMS dB per 0.5 s, motion energy per 0.5 s (frame difference on
a 96x54 grey proxy), keyframe pHash per scene (near-duplicate detection across sources).
These are *evidence for* an editor or analyst, not verdicts: a loud peak or fast motion is not proof of interest.
"""
import json, os, re, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imagehash

media, outdir = sys.argv[1], sys.argv[2]
os.makedirs(outdir, exist_ok=True)
FFMPEG = "ffmpeg"


def probe():
    p = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", media], capture_output=True, text=True, check=True)
    d = json.loads(p.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    fps = None
    if v and v.get("avg_frame_rate", "0/0") != "0/0":
        n, dd = v["avg_frame_rate"].split("/"); fps = round(int(n) / max(int(dd), 1), 3)
    dur = float(d["format"].get("duration", 0) or 0)
    try:  # prefer the video stream's own length: container duration can be longer (extra audio) and breaks frame sampling
        vd = float((v or {}).get("duration") or 0)
        if vd > 0:
            dur = vd
    except (TypeError, ValueError):
        pass
    return {"duration": dur, "width": v and v["width"], "height": v and v["height"], "fps": fps,
            "vcodec": v and v["codec_name"], "acodec": a and a["codec_name"], "has_audio": a is not None}


info = probe()
dur = info["duration"]

# --- scene cuts (scdet prints lavfi.scd.time) ---
p = subprocess.run([FFMPEG, "-hide_banner", "-i", media, "-an", "-vf", "scale=320:-2,scdet=threshold=12", "-f", "null", "-"], capture_output=True, text=True)
cuts = sorted({round(float(m.group(1)), 3) for m in re.finditer(r"lavfi\.scd\.time:\s*([\d.]+)", p.stderr)})
cuts = [c for i, c in enumerate(cuts) if c > 0.3 and (i == 0 or c - cuts[i - 1] > 0.4)]
bounds = [0.0] + cuts + [dur]
scenes = [{"start": round(bounds[i], 3), "end": round(bounds[i + 1], 3)} for i in range(len(bounds) - 1) if bounds[i + 1] - bounds[i] > 0.2]

# --- audio RMS (dB) per 0.5 s ---
audio_db = []
if info["has_audio"]:
    pcm = subprocess.run([FFMPEG, "-v", "error", "-i", media, "-f", "s16le", "-ac", "1", "-ar", "8000", "-"], capture_output=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    w = 4000
    n = len(x) // w
    if n:
        rms = np.sqrt(np.mean(x[: n * w].reshape(n, w) ** 2, axis=1) + 1e-12)
        audio_db = [round(float(v), 1) for v in 20 * np.log10(rms)]

# --- motion energy per 0.5 s on a tiny grey proxy ---
W, H = 96, 54
raw = subprocess.run([FFMPEG, "-v", "error", "-i", media, "-an", "-vf", f"fps=2,scale={W}:{H},format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
frames = np.frombuffer(raw, np.uint8)[: (len(raw) // (W * H)) * W * H].reshape(-1, H, W).astype(np.float32)
motion = [0.0] + [round(float(np.mean(np.abs(frames[i] - frames[i - 1]))), 2) for i in range(1, len(frames))]

# --- keyframe per scene (middle), pHash, contact sheets ---
def grab(t, path, width=360):
    subprocess.run([FFMPEG, "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", media, "-frames:v", "1", "-vf", f"scale={width}:-2", path], check=True)

kdir = os.path.join(outdir, "keyframes"); os.makedirs(kdir, exist_ok=True)
MAX_TILES = 120
step = max(1, len(scenes) // MAX_TILES + (1 if len(scenes) % MAX_TILES else 0)) if len(scenes) > MAX_TILES else 1
for i, sc in enumerate(scenes):
    if i % step:
        continue
    t = (sc["start"] + sc["end"]) / 2
    f = os.path.join(kdir, f"k{i:04d}.jpg")
    if not os.path.exists(f):
        grab(t, f)
    sc["keyframe"] = os.path.relpath(f, outdir).replace("\\", "/")
    sc["phash"] = str(imagehash.phash(Image.open(f)))
    a0, a1 = int(sc["start"] * 2), max(int(sc["end"] * 2), int(sc["start"] * 2) + 1)
    sc["audio_db_max"] = max(audio_db[a0:a1]) if audio_db[a0:a1] else None
    sc["motion_mean"] = round(float(np.mean(motion[a0:a1])), 2) if motion[a0:a1] else None

try:
    font = ImageFont.truetype("arial.ttf", 18)
except OSError:
    font = ImageFont.load_default()
tiles = [s for s in scenes if "keyframe" in s]
sheets = []
COLS, PER = 5, 30
for si in range(0, len(tiles), PER):
    chunk = tiles[si: si + PER]
    ims = [Image.open(os.path.join(outdir, s["keyframe"])) for s in chunk]
    tw, th = ims[0].size
    rows = (len(ims) + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * tw, rows * (th + 24)), (16, 16, 16))
    d = ImageDraw.Draw(sheet)
    for j, (im, s) in enumerate(zip(ims, chunk)):
        x, y = (j % COLS) * tw, (j // COLS) * (th + 24)
        sheet.paste(im, (x, y + 24))
        m, sec = divmod(s["start"], 60)
        d.text((x + 6, y + 3), f"#{scenes.index(s)}  {int(m):02d}:{sec:05.2f}-{s['end'] - s['start']:.1f}s", fill=(255, 220, 0), font=font)
    path = os.path.join(outdir, f"sheet_{si // PER:02d}.jpg")
    sheet.save(path, quality=82)
    sheets.append(os.path.basename(path))

# Peaks worth a closer look (top 8 loud windows and top 8 motion windows, 3 s apart) — candidates for pass 4.
def peaks(series, k=8, gap=6):
    idx = sorted(range(len(series)), key=lambda i: series[i], reverse=True)
    out = []
    for i in idx:
        if all(abs(i - j) >= gap for j in out):
            out.append(i)
        if len(out) >= k:
            break
    return [{"t": round(i / 2, 1), "v": series[i]} for i in sorted(out)]

result = {**info, "scene_count": len(scenes), "scenes": scenes, "cuts_per_min": round(len(cuts) / max(dur / 60, 1e-6), 2),
          "audio_db_0p5s": audio_db, "motion_0p5s": motion, "audio_peaks": peaks(audio_db) if audio_db else [],
          "motion_peaks": peaks(motion), "contact_sheets": sheets, "sheet_tile_step": step}
with open(os.path.join(outdir, "analysis.json"), "w", encoding="utf-8") as f:
    json.dump(result, f)
print(json.dumps({"done": True, "scenes": len(scenes), "sheets": len(sheets), "duration": dur}))
