"""Per-line ASR check for the quiz lab (faster-whisper large-v3, GPU, one model for all lines).

usage: python asr.py <lines.json> <out.json>
lines.json: [{"id", "text", "file"}]  ->  out.json: [{line, text, heard, wer, flag, reason}]
flag when WER > 0.35, or the heard text is much longer than the line (fallback TTS models sometimes read the style
notes aloud). Tashkeel / tatweel removed, alef / ya / ta-marbuta forms unified, digits spelled the same way before comparing.
"""
import glob, json, os, re, subprocess, sys, unicodedata

site = os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "nvidia")
for d in glob.glob(os.path.join(site, "*", "bin")):
    os.add_dll_directory(os.path.abspath(d))
    os.environ["PATH"] = os.path.abspath(d) + os.pathsep + os.environ["PATH"]
import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

DIAC = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")
AR_DIG = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
NUMS = {"0": "صفر", "1": "واحد", "2": "اثنين", "3": "ثلاثة", "4": "اربعة", "5": "خمسة", "6": "ستة", "7": "سبعة", "8": "ثمانية", "9": "تسعة", "10": "عشرة"}


def norm(w):
    w = unicodedata.normalize("NFKC", w)
    w = DIAC.sub("", w).translate(AR_DIG)
    w = re.sub("[إأآٱ]", "ا", w).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    w = re.sub(r"[^\w]", "", w)
    if w in NUMS:
        w = norm(NUMS[w])
    return w


def toks(s):
    return [t for t in (norm(x) for x in s.split()) if t]


def wer(ref, hyp):
    if not ref:
        return 0.0 if not hyp else 1.0
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
            prev, d[j] = d[j], cur
    return d[len(hyp)] / len(ref)


lines = json.load(open(sys.argv[1], encoding="utf8"))
try:
    model = WhisperModel("large-v3", device="cuda", compute_type="int8_float16")
except Exception:
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
out = []
for ln in lines:
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", ln["file"], "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    segs, _ = model.transcribe(audio, language="ar", beam_size=5, condition_on_previous_text=False, vad_filter=False)
    heard = " ".join(s.text.strip() for s in segs).strip()
    ref, hyp = toks(ln["text"]), toks(heard)
    w = wer(ref, hyp)
    reasons = []
    if w > 0.35:
        reasons.append("wer>0.35")
    if len(hyp) > 1.6 * len(ref) + 3:
        reasons.append("heard much longer than the line (style notes read aloud?)")
    out.append({"line": ln["id"], "text": ln["text"], "heard": heard, "wer": round(w, 3), "flag": bool(reasons), "reason": "; ".join(reasons)})
json.dump(out, open(sys.argv[2], "w", encoding="utf8"), ensure_ascii=False, indent=1)
