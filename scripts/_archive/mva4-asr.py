"""mv-A4: 2nd-opinion word times on a short slice. usage: .venv-asr/Scripts/python.exe scripts/mva4-asr.py <asset> <a> <b> [model=small]"""
import subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
asset, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]); mdl = sys.argv[4] if len(sys.argv) > 4 else "small"
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", f"E:/clips-viral/data/media/nasa/{asset}.mp4", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()
m = WhisperModel(mdl, device="cpu", compute_type="int8")
segs, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
print(" ".join(f"{w.word.strip()}@{a + w.start:.2f}-{a + w.end:.2f}" for s in segs for w in s.words))
