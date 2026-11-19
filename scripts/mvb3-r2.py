"""mv-B3: offline R2 simulator. Assembles the cut list audio (source segments, 0.05 s fades at non-contiguous joins), normalises to -16 LUFS like the
master, and prints the silencedetect gaps (-35 dB, >= 0.25 s) the retention check would see.
usage: python scripts/mvb3-r2.py <production_id> <source.mp4>"""
import json, subprocess, sys, tempfile, os
import numpy as np

pid, src = sys.argv[1], sys.argv[2]
cl = json.load(open(f"E:/clips-viral/productions/{pid}/cutlist.json", encoding="utf-8"))
parts = []
prev_out = None
for s in cl["segments"]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s['src_in']:.3f}", "-t", f"{s['src_out']-s['src_in']:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    if prev_out is None or abs(s["src_in"] - prev_out) > 0.01:
        n = min(len(x) // 2, 800)
        x[:n] *= np.linspace(0, 1, n)
        if parts:
            parts[-1][-n:] *= np.linspace(1, 0, n)
    prev_out = s["src_out"]
    parts.append(x)
x = np.concatenate(parts)
fd, wav = tempfile.mkstemp(suffix=".f32", dir=os.environ.get("TEMP"))
os.write(fd, x.tobytes()); os.close(fd)
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-f", "f32le", "-ar", "16000", "-ac", "1", "-i", wav, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,silencedetect=n=-35dB:d=0.25", "-f", "null", "-"], capture_output=True, text=True, errors="replace")
os.remove(wav)
import re
st = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
en = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
dur = len(x) / 16000
print("dur %.2f" % dur, "gaps:", [(round(a, 2), round(b, 2)) for a, b in zip(st, en)], "(tail ignored if end >= %.2f)" % (dur - 0.35))
