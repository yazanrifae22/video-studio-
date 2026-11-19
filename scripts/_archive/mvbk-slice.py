"""mv-BK: whisper large-v3 (CPU) on a source slice. usage: .venv-asr/Scripts/python.exe scripts/mvbk-slice.py <src.mp4> <from> <to> [model]"""
import subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
src, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()
m = WhisperModel(sys.argv[4] if len(sys.argv) > 4 else "large-v3", device="cpu", compute_type="int8")
segs, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
print(" ".join(f"{w.word.strip()}@{a + w.start:.2f}" for s in segs for w in s.words))
