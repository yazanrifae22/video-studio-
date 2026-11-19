"""GPU transcription with word timestamps (faster-whisper / CTranslate2).

usage: python transcribe.py <media> <out.json> [--lang en|ar|auto] [--model large-v3] [--device cuda|cpu]
Writes {language, duration, model, segments:[{start,end,text,words:[{w,s,e,p}]}]}.
OpenChatCut's own local whisper is CPU-only on Windows, so long-form sources are transcribed here once and cached.
"""
import json, os, sys, time, glob, argparse

# CUDA runtime DLLs ship as pip wheels (nvidia-cublas-cu12 / nvidia-cudnn-cu12); make them loadable on Windows.
site = os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "nvidia")
for d in glob.glob(os.path.join(site, "*", "bin")):
    os.add_dll_directory(os.path.abspath(d))
    os.environ["PATH"] = os.path.abspath(d) + os.pathsep + os.environ["PATH"]

from faster_whisper import WhisperModel  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("media"); ap.add_argument("out")
ap.add_argument("--lang", default="auto"); ap.add_argument("--model", default="large-v3")
ap.add_argument("--device", default="cuda")
a = ap.parse_args()

t0 = time.time()
try:
    model = WhisperModel(a.model, device=a.device, compute_type="int8_float16" if a.device == "cuda" else "int8")
except Exception as e:  # no usable GPU → CPU fallback, recorded in output
    print(f"cuda unavailable ({e}); falling back to cpu", file=sys.stderr)
    a.device = "cpu"
    model = WhisperModel(a.model, device="cpu", compute_type="int8")

# Decode with ffmpeg ourselves (16 kHz mono float32): avoids PyAV version breakage and handles any container.
import subprocess  # noqa: E402
import numpy as np  # noqa: E402
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.media, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0

segments, info = model.transcribe(
    audio, language=None if a.lang == "auto" else a.lang, word_timestamps=True,
    vad_filter=True, vad_parameters={"min_silence_duration_ms": 400}, beam_size=5, condition_on_previous_text=False,
)
out = {"language": info.language, "language_probability": round(info.language_probability, 3), "duration": info.duration,
       "model": a.model, "device": a.device, "segments": []}
last = 0
for s in segments:
    out["segments"].append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
                            "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in (s.words or [])]})
    if s.end - last > 120:  # progress line every ~2 min of media, parsed by the worker
        print(json.dumps({"progress": round(s.end / max(info.duration, 1), 3)}), flush=True)
        last = s.end
out["elapsed_s"] = round(time.time() - t0, 1)
with open(a.out, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)
print(json.dumps({"done": True, "segments": len(out["segments"]), "language": out["language"], "elapsed_s": out["elapsed_s"], "device": a.device}), flush=True)
