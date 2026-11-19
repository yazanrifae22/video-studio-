"""mv-BK: offline simulator for R2 gaps (-35 dB, >=0.25 s) and techqa no_audio_dropouts on a cut list.
usage: python scripts/mvbk-sim.py <production_id> <source.mp4>"""
import json, subprocess, sys, tempfile, os, re
import numpy as np

pid, src = sys.argv[1], sys.argv[2]
cl = json.load(open(f"E:/clips-viral/productions/{pid}/cutlist.json", encoding="utf-8"))
parts, prev_out, joins = [], None, []
for s in cl["segments"]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{s['src_in']:.3f}", "-t", f"{s['src_out']-s['src_in']:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    if prev_out is None or abs(s["src_in"] - prev_out) > 0.01:
        n = min(len(x) // 2, 800)
        x[:n] *= np.linspace(0, 1, n)
        if parts:
            parts[-1][-n:] *= np.linspace(1, 0, n)
            joins.append(sum(len(p) for p in parts) / 16000)
    prev_out = s["src_out"]
    parts.append(x)
x = np.concatenate(parts)
fd, wav = tempfile.mkstemp(suffix=".f32", dir=os.environ.get("TEMP"))
os.write(fd, x.tobytes()); os.close(fd)
out = wav + ".out.f32"
r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-f", "f32le", "-ar", "16000", "-ac", "1", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,silencedetect=n=-35dB:d=0.25", "-f", "f32le", out], capture_output=True, text=True, errors="replace")
y = np.fromfile(out, dtype=np.float32)
os.remove(wav); os.remove(out)
st = [float(v) for v in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
en = [float(v) for v in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
dur = len(x) / 16000
print("dur %.2f" % dur, "R2 gaps:", [(round(a, 2), round(b, 2)) for a, b in zip(st, en)])
n = len(y) // 160
env = 20 * np.log10(np.sqrt(np.mean(y[: n * 160].reshape(n, 160) ** 2, axis=1)) + 1e-12)
bad = []
for i in range(5, n - 5):
    around = np.concatenate([env[i - 5:i - 1], env[i + 2:i + 6]])
    if env[i] < -60 and np.median(around) > -40 and 0.3 < i / 100 < dur - 0.3:
        if not bad or i / 100 - bad[-1][0] > 0.1:
            bad.append((round(i / 100, 2), round(float(np.median(around)), 1)))
print("dropouts:", bad, "joins at", [round(j, 2) for j in joins])
