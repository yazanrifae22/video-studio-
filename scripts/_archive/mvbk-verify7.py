"""mv-A3: assemble the audio of a spec/cutlist (non-contiguous joins get 0.12 s fades) and transcribe it with whisper small, so the edit is checked by ear-equivalent text.
usage: .venv-asr/Scripts/python.exe scripts/mva3-verify.py <cutlist.json|spec.json>"""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
d = json.load(open(sys.argv[1], encoding="utf-8"))
SRC = "E:/clips-viral/data/media/nasa/src-261024-7t0d.mp4"
if "segments" in d:
    rng = [(s["src_in"], s["src_out"]) for s in d["segments"]]
else:
    rng = [(s["in"], s["out"]) for s in d["shots"]]
merged = []
for a, b in rng:
    if merged and abs(a - merged[-1][1]) < 0.01:
        merged[-1][1] = b
    else:
        merged.append([a, b])
parts = []
for a, b in merged:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", SRC, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    n = min(len(x) // 2, 1920)
    x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    parts.append(x)
x = np.concatenate(parts)
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=False, condition_on_previous_text=False)
print("joins:", [(round(a, 2), round(b, 2)) for a, b in merged])
for s in segs:
    print(f"{s.start:6.2f} {s.text.strip()}")
