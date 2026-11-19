"""Viewer pack for a parable test render (fresh-eyes V / audience-panel V input, orchestrator frame check).

Usage:  python scripts/parable-viewpack.py productions/<id>/v<N>

Writes <v>/qa/view/: 12 frames at 360 px taken on the story beats (times from score.json words, so the three
films of one script are sampled at the same story moments), transcript.txt (spoken lines with times + the
hook and end text) and sheet.jpg (the 12 frames in one 6x2 grid for a quick look).
"""
import json
import os
import re
import subprocess
import sys

v = sys.argv[1].rstrip("/\\")
render = os.path.join(v, "render.mp4")
out = os.path.join(v, "qa", "view")
os.makedirs(out, exist_ok=True)
with open(os.path.join(v, "score.json"), encoding="utf8") as f:
    score = json.load(f)
with open(os.path.join(os.path.dirname(v), "film.json"), encoding="utf8") as f:
    film = json.load(f)
L = {l["id"]: l for l in score["lines"]}
dur = score["duration"]


def word(line, w, nth=1):
    n = 0
    for x in L[line]["words"]:
        if re.sub(r"[^a-z0-9-]", "", x["w"].lower()) == w:
            n += 1
            if n == nth:
                return x
    raise SystemExit(f"word {w!r} #{nth} not in {line}")


def dollar_auction_times():
  return [
    ("frame 0", 0.10),
    ("l02 second highest pays too", word("l02", "pays")["t1"] + 0.25),   # the rule shown, not the reset after it
    ("l03 worth one dollar", L["l03"]["t1"]),
    ("l04 five, ten, fifty", L["l04"]["t1"] - 0.30),
    ("l05 ninety / ninety-five", word("l05", "ninety-five")["t1"] + 0.30),
    ("l05 stuck", L["l05"]["t1"]),
    ("l06 bid a dollar", L["l06"]["t1"]),
    ("l07 five cents worse", L["l07"]["t1"]),
    ("l09 king collects", word("l09", "cents")["t1"] + 0.25),
    ("l11 paying not to lose", L["l11"]["t1"] - 0.10),
    ("l12 sunk cost", word("l12", "sunk")["t1"] + 0.25),
    ("l13 end question", min(L["l13"]["t1"] - 0.30, dur - 0.2)),
  ]


def generic_times():
    # any other script (2026-11-17): frame 0 + one frame late in each line (80 % through it), thinned evenly to 12 frames, the last line always kept
    ls = score["lines"]
    per = [(f'{l["id"]} {" ".join(l["text"].split()[:5])}', min(l["t0"] + 0.8 * (l["t1"] - l["t0"]), dur - 0.2)) for l in ls]
    keep = 11
    if len(per) > keep:
        idx = sorted({round(i * (len(per) - 1) / (keep - 1)) for i in range(keep)})
        per = [per[i] for i in idx]
    return [("frame 0", 0.10)] + per


try:
    times = dollar_auction_times()
except (SystemExit, KeyError):
    times = generic_times()
files = []
for i, (label, t) in enumerate(times, 1):
    fp = os.path.join(out, f"f{i:02d}_{t:06.2f}.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", render, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "3", fp], check=True)
    files.append((fp, label, t))
with open(os.path.join(out, "transcript.txt"), "w", encoding="utf8") as f:
    f.write(f"Vertical short video, {dur:.1f} s. Text at the top for the first 2 s: {film['hook_text']}\n")
    f.write(f"Text at the top during the last line: {film['end_text'].upper()}\n\nSpoken (captions show the same words):\n")
    for l in score["lines"]:
        f.write(f"[{l['t0']:5.1f} s] {l['text']}\n")
    f.write("\nFrames:\n")
    for fp, label, t in files:
        f.write(f"{os.path.basename(fp)}  {t:5.1f} s\n")
lst = os.path.join(out, "sheet.txt")
with open(lst, "w", encoding="utf8") as f:
    for fp, _, _ in files:
        f.write(f"file '{os.path.abspath(fp).replace(os.sep, '/')}'\nduration 1\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-vf", "scale=300:-2,tile=6x2", "-frames:v", "1", "-q:v", "3",
                os.path.join(out, "sheet.jpg")], check=True)
os.remove(lst)
print(json.dumps({"view": out, "frames": len(files), "times": [round(t, 2) for _, _, t in files]}))
