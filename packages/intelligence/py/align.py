"""Align known narration lines to TTS audio.

usage: python align.py <audio.wav> <lines.json> <out.json> [--lang en|ar]
--lang (default en): ASR language. ar = Arabic: word comparison ignores tashkeel / tatweel and unifies alef / ya / ta-marbuta /
hamza-seat forms (same folding as packages/quizlab/src/asr.py), so WER and the word match are diacritics-insensitive.
lines.json: [{"id": "...", "text": "..."}]
Out: {wer, asr_text, lines:[{id, start, end, words:[{w, s, e}]}]}. Word *text* comes from the script (no ASR typos);
timing comes from faster-whisper. Words ASR missed get interpolated times. WER lets QA catch TTS that spoke wrong words.
"""
import difflib, glob, json, os, re, subprocess, sys, unicodedata

site = os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "nvidia")
for d in glob.glob(os.path.join(site, "*", "bin")):
    os.add_dll_directory(os.path.abspath(d)); os.environ["PATH"] = os.path.abspath(d) + os.pathsep + os.environ["PATH"]
import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

audio_path, lines_path, out_path = sys.argv[1:4]
LANG = sys.argv[sys.argv.index("--lang") + 1] if "--lang" in sys.argv else "en"
lines = json.load(open(lines_path, encoding="utf-8"))


ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def num_words(n):
    if n < 20: return [ONES[n]]
    if n < 100: return [TENS[n // 10]] + ([ONES[n % 10]] if n % 10 else [])
    if n < 1000: return [ONES[n // 100], "hundred"] + (num_words(n % 100) if n % 100 else [])
    if n < 10000 and 1100 <= n <= 2099 and n % 100:  # years read as "twenty eleven"
        return num_words(n // 100) + num_words(n % 100)
    if n < 1_000_000: return num_words(n // 1000) + ["thousand"] + (num_words(n % 1000) if n % 1000 else [])
    return [str(n)]


def spoken(tok):
    """'30' -> ['thirty'], '2011' -> ['twenty','eleven'], '8th' -> ['eighth'], else [tok]."""
    m = re.fullmatch(r"(\d{1,6})(st|nd|rd|th)?", tok.replace(",", ""))
    if not m: return [tok]
    ws = num_words(int(m.group(1)))
    if m.group(2):
        last = ws[-1]; ws[-1] = {"one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth", "nine": "ninth", "twelve": "twelfth"}.get(last, (last[:-1] + "ieth") if last.endswith("y") else last + "th")
    return ws


AR_DIAC = re.compile("[ؐ-ًؚ-ٰٟۖ-ۭـ]")


def norm(w):
    if LANG == "ar":  # fold before NFKD (NFKD would split alef-madda / hamza seats into base + mark)
        w = AR_DIAC.sub("", unicodedata.normalize("NFKC", w))
        w = re.sub("[إأآٱ]", "ا", w).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    w = unicodedata.normalize("NFKD", w).lower().replace("’", "'")
    return re.sub(r"[^\w']", "", w).strip("'")


pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio_path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
dur = len(audio) / 16000
try:
    model = WhisperModel("large-v3", device="cuda", compute_type="int8_float16")
except Exception:
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, _ = model.transcribe(audio, language=LANG, word_timestamps=True, beam_size=5, condition_on_previous_text=False)
raw = []  # whisper sometimes splits "11,000" into "11" + ",000": glue digit-group tails back onto their number
for s in segs:
    for w in (s.words or []):
        if raw and re.fullmatch(r"[,.]\d{3}", w.word.strip()) and re.search(r"\d$", raw[-1][0].strip()):
            raw[-1] = (raw[-1][0].strip() + w.word.strip(), raw[-1][1], w.end)
        else:
            raw.append((w.word, w.start, w.end))
asr = []
for (word, start, end) in raw:
    if re.search(r"\d", word):
        parts = spoken(norm(word.strip())) + (["percent"] if word.strip().rstrip(".,;:!?").endswith("%") else [])
    elif word.strip() == "%":
        parts = ["percent"]
    else:  # "self-made" / "twenty-two" heard as one word = two script tokens (2026-11-15: hyphenated number words inflated WER)
        parts = [q for q in re.split(r"[-–—]", word.strip()) if norm(q)] or [word.strip()]
    step = (end - start) / len(parts)
    for k, p in enumerate(parts):  # a digit token spoken as several words shares its time span
        asr.append({"w": p, "s": start + k * step, "e": start + (k + 1) * step})

script = []  # (line_idx, word)
script_tokens = []  # (line_idx, display word, comparison token)
for li, ln in enumerate(lines):
    for w in ln["text"].split():
        toks = spoken(norm(w)) if re.search(r"\d", w) else ([norm(q) for q in re.split(r"[-–—]", w) if norm(q)] or [norm(w)])
        for k, t in enumerate(toks):
            script_tokens.append((li, w if k == 0 else None, t))
script = [(li, w) for li, w, _ in script_tokens]
a_norm = [norm(w["w"]) for w in asr]
s_norm = [t for _, _, t in script_tokens]
times = [None] * len(script)
sm = difflib.SequenceMatcher(a=s_norm, b=a_norm, autojunk=False)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        times[blk.a + k] = (asr[blk.b + k]["s"], asr[blk.b + k]["e"])
if LANG == "ar":  # dialect spellings differ from Whisper's (بتوقع / بتقع): a gap with as many heard words as script words maps 1:1
    pa = pb = 0
    for blk in sm.get_matching_blocks():
        if blk.a - pa == blk.b - pb > 0:
            for k in range(blk.a - pa):
                times[pa + k] = (asr[pb + k]["s"], asr[pb + k]["e"])
        pa, pb = blk.a + blk.size, blk.b + blk.size
# interpolate gaps
known = [i for i, t in enumerate(times) if t]
for i in range(len(times)):
    if times[i]:
        continue
    prev = max([k for k in known if k < i], default=None)
    nxt = min([k for k in known if k > i], default=None)
    ps = times[prev][1] if prev is not None else 0.0
    ne = times[nxt][0] if nxt is not None else dur
    span = [k for k in range(i, nxt if nxt is not None else len(times)) if not times[k]]
    step = (ne - ps) / (len(span) + 1)
    for j, k in enumerate(span):
        times[k] = (ps + step * (j + 0.2), ps + step * (j + 1))
    known = [x for x, t in enumerate(times) if t]

# Whisper often starts a phrase's first word early, inside the preceding silence. Move any word start that sits in
# silence forward to the real speech onset (10 ms RMS envelope, threshold −42 dBFS), never past the word's end.
hop = 160  # 10 ms at 16 kHz
n_frames = len(audio) // hop
env = 20 * np.log10(np.sqrt(np.mean(audio[: n_frames * hop].reshape(n_frames, hop) ** 2, axis=1) + 1e-12))
voiced = env > -42.0
for i, t in enumerate(times):
    if not t:
        continue
    s0, e0 = t
    f0, f1 = int(s0 * 100), min(max(int(s0 * 100) + 1, int(e0 * 100)), n_frames)
    if f0 >= n_frames:
        continue
    # Threshold relative to the word's own peak, so breaths/room tone in TTS pauses count as "not speech".
    peak = float(np.max(env[f0:f1])) if f1 > f0 else -100.0
    thr = max(-42.0, peak - 24.0)
    v = env[f0:f1] > thr
    if not v.any():
        continue
    if not v[0]:
        times[i] = (min((f0 + int(np.argmax(v))) / 100.0, e0 - 0.05), e0)
    # Overlong words (Whisper stretched the start back into a pause): snap to the last silence→speech onset
    # that still leaves ≥0.15 s of word.
    s1 = times[i][0]
    if e0 - s1 > 0.6:
        g0 = int(s1 * 100)
        onsets = [f for f in range(max(g0, f0) + 1, f1) if v[f - f0] and not v[f - f0 - 1] and e0 - f / 100.0 >= 0.15]
        if onsets:
            times[i] = (onsets[-1] / 100.0, e0)

# Whisper sometimes stretches a word back across a whole pause (its span = tail of the previous word + silence).
# If a word's span contains a real silence (≥ 0.25 s below −45 dBFS) followed by speech, the word starts at that
# speech; later words are pushed so the order stays monotonic.
SIL = env < -45.0
for i, t in enumerate(times):
    if not t:
        continue
    s0, e0 = t
    a0, a1 = int(s0 * 100), min(int((e0 + 0.3) * 100), n_frames)
    run_start, best = None, None
    for f in range(a0, a1):
        if SIL[f]:
            run_start = f if run_start is None else run_start
        else:
            if run_start is not None and f - run_start >= 25:
                best = f  # speech onset right after a long silence
            run_start = None
    if best is not None and best / 100.0 > s0 + 0.1:
        ns = best / 100.0
        times[i] = (ns, max(e0, ns + 0.25))
        for k in range(i + 1, len(times)):
            if times[k] and times[k][0] < times[k - 1][1] - 1e-3 if times[k - 1] else False:
                times[k] = (times[k - 1][1], max(times[k][1], times[k - 1][1] + 0.1))
            else:
                break

matched = sum(b.size for b in sm.get_matching_blocks())
wer = round(1 - matched / max(len(s_norm), 1), 3)
out_lines = []
for li, ln in enumerate(lines):
    ws = []
    for i, (l, w) in enumerate(script):
        if l != li: continue
        if w is None:  # continuation token of a number: extend the previous word's end
            if ws: ws[-1]["e"] = round(times[i][1], 3)
            continue
        ws.append({"w": w, "s": round(times[i][0], 3), "e": round(times[i][1], 3)})
    out_lines.append({"id": ln["id"], "start": ws[0]["s"] if ws else None, "end": ws[-1]["e"] if ws else None, "words": ws})
json.dump({"duration": round(dur, 3), "wer": wer, "asr_text": " ".join(w["w"] for w in asr), "lines": out_lines}, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
print(json.dumps({"done": True, "wer": wer, "lines": len(out_lines)}))
