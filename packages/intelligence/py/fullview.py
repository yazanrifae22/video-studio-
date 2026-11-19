"""fullview: "watch" a whole video = shots + frames + the words spoken over each shot, in one readable package.

usage: python fullview.py <media> --out <cache dir> [--transcript transcript.json] [--max-frames-per-shot 3]
Merges the app's signals (analysis.json: scene cuts, motion/audio peaks; transcript: faster-whisper word timestamps)
with the video-analyze skill's idea (frames aligned to the transcript, tiled low-res grids to save tokens).
Local ffmpeg/python only. Never transcribes (the CLI wrapper does that under the GPU lock if asked).
Writes next to analysis.json: fullview.json, fullview.md, fullview_grid_NN.jpg (<=360 px tiles, timestamped),
fullview_frames/*.jpg (360 px, one or more per shot).
If analysis.json is missing it is created by analyze.py (same cache dir, same format).
"""
import argparse, glob, json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("media"); ap.add_argument("--out", required=True)
ap.add_argument("--transcript", default=None)
ap.add_argument("--max-frames-per-shot", type=int, default=3)
ap.add_argument("--max-shot-s", type=float, default=10.0, help="split scenes longer than this into sub-shots")
ap.add_argument("--cols", type=int, default=4); ap.add_argument("--rows", type=int, default=5)
a = ap.parse_args()
out = a.out
os.makedirs(out, exist_ok=True)
here = os.path.dirname(os.path.abspath(__file__))

apath = os.path.join(out, "analysis.json")
if not os.path.exists(apath):
    subprocess.run([sys.executable, "-I", os.path.join(here, "analyze.py"), a.media, out], check=True, capture_output=True)
an = json.load(open(apath, encoding="utf-8"))
dur = an["duration"]

# ---- transcript (reuse, never re-transcribe) ----
tpath = a.transcript if a.transcript and os.path.exists(a.transcript) else None
if not tpath:
    cands = sorted(glob.glob(os.path.join(out, "transcript*.json")))
    tpath = cands[0] if cands else None
words, language = [], None
if tpath:
    tr = json.load(open(tpath, encoding="utf-8"))
    language = tr.get("language")
    for s in tr.get("segments", []):
        ws = s.get("words") or []
        if ws:
            words += [(w["s"], w["e"], w["w"]) for w in ws]
        elif s.get("text"):
            words.append((s["start"], s["end"], s["text"].strip()))

# ---- shots: scenes, long ones split ----
shots = []
for sc in an["scenes"]:
    s0, s1 = sc["start"], sc["end"]
    n = max(1, math.ceil((s1 - s0) / a.max_shot_s))
    for k in range(n):
        t0, t1 = s0 + (s1 - s0) * k / n, s0 + (s1 - s0) * (k + 1) / n
        shots.append({"t0": round(t0, 2), "t1": round(t1, 2), "scene": an["scenes"].index(sc), "sub": k if n > 1 else None, "cut": k == 0})
motion, adb = an.get("motion_0p5s", []), an.get("audio_db_0p5s", [])
m_peaks = [p["t"] for p in an.get("motion_peaks", [])]; a_peaks = [p["t"] for p in an.get("audio_peaks", [])]
mmax = max(motion) if motion else 1.0
for i, sh in enumerate(shots):
    sh["shot"] = i
    i0, i1 = int(sh["t0"] * 2), max(int(sh["t1"] * 2), int(sh["t0"] * 2) + 1)
    sh["motion"] = round(float(np.mean(motion[i0:i1])), 2) if motion[i0:i1] else None
    sh["audio_db_max"] = max(adb[i0:i1]) if adb[i0:i1] else None
    sh["motion_peak"] = any(sh["t0"] <= t < sh["t1"] for t in m_peaks)
    sh["audio_peak"] = any(sh["t0"] <= t < sh["t1"] for t in a_peaks)
    # 0..1: how much a shot stands out (motion vs the loudest motion, plus peak bonuses)
    sc_ = (sh["motion"] or 0) / max(mmax, 1e-6) * 0.6 + 0.2 * sh["motion_peak"] + 0.2 * sh["audio_peak"]
    sh["peak_score"] = round(min(1.0, sc_), 2)
    ws = [w for w in words if sh["t0"] <= (w[0] + w[1]) / 2 < sh["t1"]]
    sh["text"] = " ".join(w[2] for w in ws).strip()
    sh["words"] = len(ws)

# ---- frames aligned to the shot (1 per ~6 s, capped) ----
fdir = os.path.join(out, "fullview_frames"); os.makedirs(fdir, exist_ok=True)
W = 360

def grab(t, path):
    if os.path.exists(path):
        return
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{max(t, 0):.3f}", "-i", a.media, "-frames:v", "1", "-vf", f"scale={W}:-2", "-q:v", "4", path], check=True)

def text_likely(path):
    """Cheap heuristic: dense hard edges in the lower third / top band suggest captions or titles. A hint, not OCR."""
    g = np.asarray(Image.open(path).convert("L"), dtype=np.float32)
    h = g.shape[0]
    best = 0.0
    for band in (g[int(h * 0.66):], g[: int(h * 0.25)], g[int(h * 0.4): int(h * 0.66)]):
        dx = np.abs(np.diff(band, axis=1)); best = max(best, float((dx > 80).mean()))
    return best > 0.045

frames = []
for sh in shots:
    L = sh["t1"] - sh["t0"]
    n = min(a.max_frames_per_shot, max(1, round(L / 6)))
    sh["frames"] = []
    tl = False
    for k in range(n):
        t = sh["t0"] + L * (k + 0.5) / n
        p = os.path.join(fdir, f"s{sh['shot']:04d}_{k}.jpg")
        grab(min(t, dur - 0.05), p)
        rel = os.path.relpath(p, out).replace("\\", "/")
        sh["frames"].append({"t": round(t, 2), "path": rel})
        tl = tl or text_likely(p)
        frames.append((sh, k, t, p))
    sh["text_on_screen_likely"] = tl

# ---- grids: tiles with timestamp + shot id, only the first frame of each shot to keep sheets small ----
try:
    font = ImageFont.truetype("arial.ttf", 16)
except OSError:
    font = ImageFont.load_default()
tiles = [(sh, t, p) for (sh, k, t, p) in frames]
PER = a.cols * a.rows
for old in glob.glob(os.path.join(out, "fullview_grid_*.jpg")):
    os.remove(old)
grids = []
for gi in range(0, len(tiles), PER):
    chunk = tiles[gi: gi + PER]
    ims = [Image.open(p).convert("RGB") for (_, _, p) in chunk]
    th = max(im.size[1] for im in ims)
    rows = (len(ims) + a.cols - 1) // a.cols
    sheet = Image.new("RGB", (a.cols * W, rows * (th + 20)), (16, 16, 16))
    d = ImageDraw.Draw(sheet)
    for j, ((sh, t, _), im) in enumerate(zip(chunk, ims)):
        x, y = (j % a.cols) * W, (j // a.cols) * (th + 20)
        sheet.paste(im, (x, y + 20))
        m, s = divmod(t, 60)
        d.text((x + 4, y + 1), f"#{sh['shot']}  {int(m):02d}:{s:04.1f}", fill=(255, 220, 0), font=font)
        sh.setdefault("grid", f"fullview_grid_{gi // PER:02d}.jpg")
    gp = os.path.join(out, f"fullview_grid_{gi // PER:02d}.jpg")
    sheet.save(gp, quality=72)
    grids.append(os.path.basename(gp))

def ts(t):
    m, s = divmod(t, 60); return f"{int(m):02d}:{int(s):02d}"

result = {"media": a.media.replace("\\", "/"), "duration": dur, "width": an.get("width"), "height": an.get("height"),
          "language": language, "transcript": os.path.basename(tpath) if tpath else None, "shot_count": len(shots),
          "grids": grids, "shots": shots}
json.dump(result, open(os.path.join(out, "fullview.json"), "w", encoding="utf-8"), ensure_ascii=False)

md = [f"# fullview  ({ts(dur)}, {len(shots)} shots, {len(grids)} grids, transcript: {os.path.basename(tpath) if tpath else 'none'})", "",
      "Read this top to bottom; open a grid only for the shots you care about. `P`=peak score 0-1, `T`=on-screen text likely (heuristic), `M`/`A`=motion/audio peak.", ""]
for sh in shots:
    flags = ("T" if sh["text_on_screen_likely"] else "") + ("M" if sh["motion_peak"] else "") + ("A" if sh["audio_peak"] else "")
    txt = f"'{sh['text']}'" if sh["text"] else "(no speech)"
    sub = f"{sh['scene']}{chr(97 + sh['sub'])}" if sh["sub"] is not None else str(sh["scene"])
    md.append(f"{ts(sh['t0'])}-{ts(sh['t1'])} | shot {sh['shot']} (scene {sub}) | {txt} | P{sh['peak_score']:.2f} {flags} | {sh['grid']} {sh['frames'][0]['path']}")
open(os.path.join(out, "fullview.md"), "w", encoding="utf-8").write("\n".join(md) + "\n")
print(json.dumps({"done": True, "shots": len(shots), "frames": len(frames), "grids": len(grids), "words": len(words)}))
