"""usage: python scripts/mvb4-env.py <src.mp4> <from> <to> [step=0.1]  -> dB (20 ms RMS, min within each step) as a bar line"""
import subprocess, sys
import numpy as np
src, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
step = float(sys.argv[4]) if len(sys.argv) > 4 else 0.1
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
db = np.array([20 * np.log10(np.sqrt(np.mean(x[i:i + 320] ** 2)) + 1e-9) for i in range(0, len(x) - 320, 160)])
n = int(step * 100)
for i in range(0, len(db), n):
    seg = db[i:i + n]
    print(f"{a + i/100:8.2f} min {seg.min():6.1f} max {seg.max():6.1f} " + "#" * int(max(0, (seg.max() + 70) / 2)))
