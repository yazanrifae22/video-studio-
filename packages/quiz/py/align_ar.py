"""Arabic narration aligner (faster-whisper large-v3, GPU) for quiz takes.

usage: python align_ar.py <audio.wav> <lines.json> <out.json> [--keywords k1,k2,...]
lines.json: [{"id": "...", "text": "<narration with tashkeel>", "caption": "<caption text, optional>"}]
Out: {
  asr_text, wer (normalised word error over the whole take), duration,
  lines: [{id, start, end, wer, words:[{w, s, e}]}]   # w = CAPTION words (display), times from the take
  keywords: {word: found_in_asr(bool)},  pitch: {median_hz, iqr_semitones}, rate_wps
}
Normalisation removes tashkeel/tatweel and unifies alef/ya/ta-marbuta forms so dialect spelling and ASR spelling compare.
Line boundaries come from the matched script words; caption words are mapped onto narration words by order.
"""
import difflib, glob, json, os, re, subprocess, sys, unicodedata

site = os.path.join(os.path.dirname(sys.executable), "..", "Lib", "site-packages", "nvidia")
for d in glob.glob(os.path.join(site, "*", "bin")):
    os.add_dll_directory(os.path.abspath(d)); os.environ["PATH"] = os.path.abspath(d) + os.pathsep + os.environ["PATH"]
import numpy as np  # noqa: E402
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from caption_match import edge_spill, reconcile  # noqa: E402
LINE_SUBS = []
from faster_whisper import WhisperModel  # noqa: E402

audio_path, lines_path, out_path = sys.argv[1:4]
kw = []
if "--keywords" in sys.argv:
    kw = [k for k in sys.argv[sys.argv.index("--keywords") + 1].split(",") if k]
lines = json.load(open(lines_path, encoding="utf-8"))

DIAC = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
AR_DIG = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
NUMS = {"1": "واحد", "2": "اثنين", "3": "ثلاثة", "4": "اربعة", "5": "خمسة", "6": "ستة", "7": "سبعة", "8": "ثمانية", "9": "تسعة"}


def norm(w):
    w = unicodedata.normalize("NFKC", w)
    w = DIAC.sub("", w).translate(AR_DIG)
    w = re.sub(r"[إأآٱ]", "ا", w).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    w = re.sub(r"[^\w]", "", w)
    if w.isdigit() and w in NUMS:
        w = norm(NUMS[w])
    return w


def toks(text):
    return [t for t in (norm(x) for x in text.split()) if t]


pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio_path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
dur = len(audio) / 16000
try:
    model = WhisperModel("large-v3", device="cuda", compute_type="int8_float16")
except Exception:
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, _ = model.transcribe(audio, language="ar", word_timestamps=True, beam_size=5, condition_on_previous_text=False, vad_filter=False)
asr = []
for s in segs:
    for w in (s.words or []):
        t = norm(w.word.strip())
        if t:
            asr.append({"raw": w.word.strip(), "w": t, "s": float(w.start), "e": float(w.end)})
asr_text = " ".join(a["raw"] for a in asr)

script = []  # (line index, token)
for li, ln in enumerate(lines):
    for t in toks(ln["text"]):
        script.append((li, t))
s_tok = [t for _, t in script]
a_tok = [a["w"] for a in asr]
sm = difflib.SequenceMatcher(a=s_tok, b=a_tok, autojunk=False)
times = [None] * len(script)
for blk in sm.get_matching_blocks():
    for k in range(blk.size):
        times[blk.a + k] = (asr[blk.b + k]["s"], asr[blk.b + k]["e"])
# near-matches (dialect spelling vs ASR spelling): align replaced spans one-to-one when lengths agree
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "replace" and i2 - i1 == j2 - j1:
        for k in range(i2 - i1):
            times[i1 + k] = (asr[j1 + k]["s"], asr[j1 + k]["e"])
    elif tag == "replace":  # spread the ASR span over the script words
        s0, e0 = asr[j1]["s"], asr[j2 - 1]["e"]
        n = i2 - i1
        for k in range(n):
            times[i1 + k] = (s0 + (e0 - s0) * k / n, s0 + (e0 - s0) * (k + 1) / n)
# interpolate remaining gaps (deleted words)
for i in range(len(times)):
    if times[i]:
        continue
    prev = next((times[k][1] for k in range(i - 1, -1, -1) if times[k]), 0.0)
    nxt = next((times[k][0] for k in range(i + 1, len(times)) if times[k]), dur)
    times[i] = (prev, max(prev + 0.05, min(nxt, prev + 0.3)))

# speech envelope (10 ms) for onset/offset refinement of line edges
hop = 160
nf = len(audio) // hop
env = 20 * np.log10(np.sqrt(np.mean(audio[: nf * hop].reshape(nf, hop) ** 2, axis=1)) + 1e-12)
voiced = env > max(-45.0, float(np.percentile(env, 95)) - 35)


def snap_start(t):
    f = int(t * 100)
    # walk back while voiced (whisper often starts late), forward while silent (or early)
    while f > 0 and voiced[min(f - 1, nf - 1)]:
        f -= 1
    while f < nf - 1 and not voiced[f] and f < int(t * 100) + 30:
        f += 1
    return f / 100


def snap_end(t):
    f = min(int(t * 100), nf - 1)
    while f < nf - 1 and voiced[f]:
        f += 1
    return f / 100


# Line edges from real pauses: TTS separates lines with clear silences, while Whisper word stamps tend to swallow the
# pause into a neighbouring word. Each boundary between consecutive lines snaps to the silence gap (>=0.18 s) nearest
# to the ASR estimate; a line spans [end of the gap before it, start of the gap after it].
sil = []
f = 0
SILM = env < max(-40.0, float(np.percentile(env, 95)) - 32)
ACT = env > -45.0
ONSETS = [f / 100 for f in range(1, nf) if ACT[f] and not ACT[max(0, f - 8):f].any()]
GAP = {}
for _o in ONSETS:
    _f = int(round(_o * 100)); _g = 0
    while _f - _g - 1 >= 0 and not ACT[_f - _g - 1]:
        _g += 1
    GAP[_o] = _g / 100
while f < nf:
    if SILM[f]:
        g = f
        while g < nf and SILM[g]:
            g += 1
        if g - f >= 18:
            sil.append((f / 100, g / 100))
        f = g
    else:
        f += 1
line_idx = [[k for k, (l, _) in enumerate(script) if l == li] for li in range(len(lines))]
edges = []  # (end of line i, start of line i+1)
used = set()
for li in range(len(lines) - 1):
    a, b = line_idx[li], line_idx[li + 1]
    if not a or not b:
        edges.append(None); continue
    est = (times[a[-1]][1] + times[b[0]][0]) / 2
    # the pause must lie between the start of line i's last word and the end of line i+1's first word: a pause after
    # that first word would hand a short line-initial word («كم») to the previous line (x5iz r4-a «17 كم»)
    lo, hi = times[a[-1]][0] + 0.03, times[b[0]][1] - 0.03
    cand = [(abs(min(max(est, s0), s1) - est), j) for j, (s0, s1) in enumerate(sil) if j not in used and s1 > lo and s0 < hi]
    j = min(cand)[1] if cand else None
    if j is None or min(cand)[0] > 1.0:
        edges.append((times[a[-1]][1], times[b[0]][0])); continue
    used.add(j); edges.append(sil[j])
lead = next((s1 for s0, s1 in sil if s0 <= 0.01), 0.0)
tail = next((s0 for s0, s1 in reversed(sil) if s1 >= dur - 0.02), dur)


def loose(w):
    """Spelling-insensitive key for caption/ASR matching (hamza, alef/ya/ta-marbuta forms, ل-prefix tatweel)."""
    w = norm(w.replace("ـ", ""))
    return w.replace("ء", "").replace("ئ", "ي")


def take_true_words(cap, start, end, ws, next_first=None, carry=()):
    """Caption words that match what the TAKE says (QA: never caption a word the voice didn't say).
    Caption tokens are aligned to the ASR words heard in the line window:
      equal / near-equal spelling      -> caption spelling (keeps shadda, Eastern digits), ASR timing
      several caption tokens == one spoken word (e.g. «لـ ٩» ~ «لتسعة») -> caption tokens share that word's time
      different words                  -> the ASR words (what was actually said), ASR timing
      caption words not spoken         -> dropped; spoken words missing from the caption -> added
    A heard word at the window's end that is the next line's first caption word (edge_spill) is handed to the next line
    (returned as `spill`); `carry` = words handed over by the previous line, prepended here.
    Falls back to proportional script timing when the ASR heard nothing in the window.
    Returns (words, spill)."""
    aw = []
    taken = {c["i"] for c in carry}
    for ai, a in enumerate(asr):
        if ai in taken:
            continue
        # a word belongs to this line if most of it lies inside, or if Whisper started it early (inside the pause
        # before the line) but it runs well into the line
        ov = min(a["e"], end + 0.05) - max(a["s"], start - 0.05)
        if ov > 0.5 * (a["e"] - a["s"]) or (a["s"] < start and ov > 0.1):
            # onset = a speech-activity onset (> -45 dBFS after >= 80 ms below it — the same rule QA measures with)
            # inside the word's span if there is one (Whisper often starts a word on the previous word's tail and runs
            # it across a pause); else Whisper's start. Line-initial words may start up to 0.15 s before the line edge
            # (soft consonants like «س» sit under the line-split threshold).
            base = max(a["s"], start)
            # only a real pause (>= 0.2 s) inside the span moves the start; a geminate/stop closure (ركّز، التانية) is shorter
            # an onset inside the span moves the start (Whisper ran the word back across a pause), except a short closure
            # (< 0.2 s) right after a short (<= 0.15 s) word-initial syllable — a geminate like ركّز / التانية
            def geminate(o):
                g0 = o - GAP[o]
                prev = max([x for x in ONSETS if x <= g0 + 1e-6], default=None)
                return GAP[o] < 0.2 and prev is not None and prev >= base - 0.1 and g0 - prev <= 0.15
            inside = [o for o in ONSETS if base < o <= a["e"] - 0.05 and not geminate(o)]
            # pause-stretch: Whisper ran the word across a >= 0.25 s pause and ended it right at the real speech onset
            # (3uyp «كل» 9.68-10.20, speech at 10.18): the word starts at that onset
            late = [o for o in ONSETS if a["e"] - 0.05 < o <= a["e"] + 0.15 and GAP[o] >= 0.25 and o - GAP[o] <= a["e"] - 0.1 and o > base] if not inside else []
            if late:
                inside = late[:1]
            before = [o for o in ONSETS if start - 0.15 <= o <= base + 0.02] if a["s"] <= start + 0.05 else []
            s0 = inside[-1] if inside else (before[-1] if before else base)
            aw.append({"raw": a["raw"], "k": loose(a["raw"]), "s": s0, "e": min(max(a["e"], s0 + 0.12), end), "i": ai, "ae": a["e"]})
    spill = []
    n = edge_spill(cap, [a["raw"] for a in aw], next_first)
    if n:
        spill, aw = aw[-n:], aw[:-n]
    aw = [{**c, "e": min(max(c["ae"], c["s"] + 0.12), end)} for c in carry] + aw  # re-clamped to this line's window
    if not aw:
        n, m = len(cap), len(ws)
        return [{"w": cap[c], "s": round(ws[int(c * m / n)][0], 3), "e": round(ws[max(int(c * m / n), int((c + 1) * m / n) - 1)][1], 3)} for c in range(n)], spill
    items, subs = reconcile(cap, [a["raw"] for a in aw])
    out = []
    for it in items:
        if it["h"]:
            s0, e0 = aw[it["h"][0]]["s"], aw[it["h"][-1]]["e"]
            if "part" in it:  # several script tokens sharing one (merged) heard span
                d, n = it["part"]
                s0, e0 = s0 + (e0 - s0) * d / n, s0 + (e0 - s0) * (d + 1) / n
        else:  # script word Whisper did not hear: timed just before the next heard word
            nxt = aw[it["before"]]["s"] if it["before"] < len(aw) else end
            prv = out[-1]["e"] if out else start
            s0, e0 = max(prv, nxt - 0.25), nxt
        out.append({"w": it["w"], "s": s0, "e": e0, "src": it["src"]})
    LINE_SUBS.append(subs)
    for i, w in enumerate(out):
        w["s"] = round(max(w["s"], out[i - 1]["s"] + 0.02 if i else start), 3); w["e"] = round(max(w["e"], w["s"] + 0.05), 3)
    return out, spill


out_lines = []
carry = []
cap_of = lambda ln: (ln.get("caption") or ln["text"]).split()
for li, ln in enumerate(lines):
    idx = line_idx[li]
    if not idx:
        out_lines.append({"id": ln["id"], "start": None, "end": None, "words": [], "wer": None}); continue
    start = edges[li - 1][1] if li > 0 and edges[li - 1] else lead
    end = edges[li][0] if li < len(lines) - 1 and edges[li] else tail
    # the line edge comes from a -40 dB-ish silence threshold; soft first consonants start earlier: move the edge back to
    # the speech-activity onset (-45 dBFS) when one lies within 0.15 s before it
    cand = [o for o in ONSETS if start - 0.15 <= o <= start + 0.02]
    if cand and li > 0 and edges[li - 1] and cand[-1] > edges[li - 1][0] + 0.05:
        start = min(start, cand[-1])
    if carry:  # the previous line's window held this line's first word: the edge moves back to it
        cs = carry[0]["s"]
        start = min(start, cs)
        pl = next((o for o in reversed(out_lines) if o["start"] is not None), None)
        if pl and pl["end"] > cs - 0.01:
            pl["end"] = round(max(pl["start"] + 0.05, cs - 0.01), 3)
            for w in pl["words"]:
                w["e"] = round(min(w["e"], pl["end"]), 3)
    ws = [list(times[k]) for k in idx]
    # clamp into the line window and keep word order monotonic
    prev = start
    for w in ws:
        w[0] = min(max(w[0], prev), end - 0.05); w[1] = min(max(w[1], w[0] + 0.05), end); prev = w[0]
    ws[0][0] = start
    # word onsets inside a pause move forward to the first voiced 10 ms frame (captions must not lead the voice)
    for w in ws[1:]:
        f0, f1 = int(w[0] * 100), int(w[1] * 100)
        k = f0
        while k < min(f1, nf - 1) and SILM[k]:
            k += 1
        if k > f0 and k < f1:
            w[0] = k / 100
    a_in = [a["w"] for a in asr if a["e"] > start + 0.08 and a["s"] < end - 0.08]
    lm = difflib.SequenceMatcher(a=[script[k][1] for k in idx], b=a_in, autojunk=False)
    errs = sum(max(i2 - i1, j2 - j1) for tag, i1, i2, j1, j2 in lm.get_opcodes() if tag != "equal")
    nl = lines[li + 1] if li + 1 < len(lines) and line_idx[li + 1] else None
    words, carry = take_true_words(cap_of(ln), start, end, ws, cap_of(nl)[0] if nl and cap_of(nl) else None, carry)
    out_lines.append({"id": ln["id"], "start": round(start, 3), "end": round(end, 3), "wer": round(errs / max(1, len(idx)), 3), "asr": " ".join(a_in), "words": words,
                      "subs": LINE_SUBS.pop() if LINE_SUBS else []})

ops = sm.get_opcodes()
errs = sum(max(i2 - i1, j2 - j1) for tag, i1, i2, j1, j2 in ops if tag != "equal")
keywords = {k: any(norm(k) == a or norm(k) in a for a in a_tok) for k in kw}

# prosody: f0 via autocorrelation on voiced 40 ms frames (cheap; enough to compare voices)
f0 = []
win = 640
for i in range(0, len(audio) - win, 320):
    x = audio[i:i + win]
    if np.sqrt(np.mean(x ** 2)) < 0.02:
        continue
    x = x - x.mean()
    c = np.correlate(x, x, "full")[win - 1:]
    lo, hi = 16000 // 400, 16000 // 70
    k = lo + int(np.argmax(c[lo:hi]))
    if c[k] > 0.3 * c[0]:
        f0.append(16000 / k)
f0 = np.array(f0)
pitch = {"median_hz": round(float(np.median(f0)), 1) if len(f0) else None,
         "iqr_semitones": round(float(12 * np.log2(np.percentile(f0, 75) / np.percentile(f0, 25))), 2) if len(f0) > 10 else None}
speech_s = float(voiced.sum()) / 100
res = {"duration": round(dur, 3), "asr_text": asr_text, "wer": round(errs / max(1, len(s_tok)), 3), "lines": out_lines,
       "keywords": keywords, "pitch": pitch, "rate_wps": round(len(s_tok) / max(0.1, speech_s), 2), "speech_s": round(speech_s, 2)}
json.dump(res, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: res[k] for k in ("duration", "wer", "keywords", "pitch", "rate_wps")}))
