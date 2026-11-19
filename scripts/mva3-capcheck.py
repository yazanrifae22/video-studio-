"""mv-A3: compare captions.srt with what is actually audible in the render (whisper on the render audio, word times).
usage: .venv-asr/Scripts/python.exe scripts/mva3-capcheck.py <production_id> [model=large-v3]"""
import glob, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
pid = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
vs = sorted(glob.glob(f"E:/clips-viral/productions/{pid}/v*/render.mp4"), key=lambda p: int(re.search(r"/v(\d+)/", p.replace("\\", "/")).group(1)))
mp4 = vs[-1]
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp4, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32).copy()
m = WhisperModel(model, device="cpu", compute_type="int8")
segs, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
words = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
srt = open(mp4.replace("render.mp4", "captions.srt"), encoding="utf-8").read().strip().split("\n\n")
pages = []
for b in srt:
    l = b.split("\n"); t = re.findall(r"(\d+):(\d+):(\d+),(\d+)", l[1])
    f = lambda g: int(g[0]) * 3600 + int(g[1]) * 60 + int(g[2]) + int(g[3]) / 1000
    pages.append((f(t[0]), f(t[1]), " ".join(l[2:])))
print(mp4)
print("AUDIO :", " ".join(f"{w}@{s:.2f}" for w, s, e in words))
print("PAGES :", " | ".join(f"{p[2]}@{p[0]:.2f}" for p in pages))
