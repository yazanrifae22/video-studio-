"""mv-B4: measured caption timing for a cut list.
Assembles the cut list audio (as the builder does: non-contiguous joins faded), runs faster-whisper small with word timestamps on it,
aligns those words with the large-v3 transcript words of the same passage and writes `caption_timing` entries (source seconds) for every
word that the builder would drop (ASR midpoint outside all segments) or place > 0.15 s from where it is audible.
usage: .venv-asr/Scripts/python.exe scripts/mvb4-retime.py <production_id> <asset_id> <sha> <src.mp4>   -> data/mvb4/retime-<id>.json
"""
import difflib, json, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

pid, asset, sha, src = sys.argv[1:5]
cl = json.load(open(f"E:/clips-viral/productions/{pid}/cutlist.json", encoding="utf-8"))
segs = [(s["src_in"], s["src_out"]) for s in cl["segments"]]
# timeline map
tl, t0 = [], 0.0
for a, b in segs:
    tl.append((t0, t0 + (b - a), a)); t0 += b - a
parts, prev = [], None
for a, b in segs:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", src, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    if prev is None or abs(a - prev) > 0.01:
        n = min(len(x) // 2, 800)
        x[:n] *= np.linspace(0, 1, n)
        if parts:
            parts[-1][-n:] *= np.linspace(1, 0, n)
    prev = b
    parts.append(x)
x = np.concatenate(parts)
m = WhisperModel("small", device="cpu", compute_type="int8")
it, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False)
small = [(w.word.strip(), w.start, w.end) for s in it for w in s.words]


def to_src(t):
    for a, b, o in tl:
        if a - 0.02 <= t <= b + 0.02:
            return o + (min(max(t, a), b) - a)
    return None


tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
words = [w for s in tr["segments"] for w in s["words"]]
lo, hi = segs[0][0] - 0.6, segs[-1][1] + 0.6
big = [w for w in words if lo <= (w["s"] + w["e"]) / 2 <= hi]
# only the big words that are plausibly in the cut: those whose any part overlaps a kept segment, or lie in removed pauses (stretch)
norm = lambda s: re.sub(r"[^a-z0-9']", "", s.lower())
A = [norm(w["w"]) for w in big]
B = [norm(w[0]) for w in small]
sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
out, report = [], []
pair = {}
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            pair[i1 + k] = j1 + k
    elif tag == "replace" and (i2 - i1) == (j2 - j1):
        for k in range(i2 - i1):
            pair[i1 + k] = j1 + k
inc = lambda w: any(a <= (w["s"] + w["e"]) / 2 <= b for a, b in segs)
for i, w in enumerate(big):
    j = pair.get(i)
    if j is None:
        if inc(w):
            report.append(f"UNMATCHED big word kept by builder: {w['w']!r} @ {w['s']:.2f}")
        continue
    ss, se = to_src(small[j][1]), to_src(small[j][2])
    if ss is None:
        continue
    seg_end = next((b for a, b in segs if a - 0.02 <= ss <= b + 0.02), ss + 0.12)
    if se is None or se < ss or se > seg_end:
        se = min(seg_end, ss + 0.30)
    off = abs(ss - w["s"])
    mlen = (small[j][2] - small[j][1])
    if not inc(w):
        out.append({"asset_id": asset, "at": round(w["s"], 2), "word": w["w"], "start": round(ss, 2), "end": round(max(se, ss + 0.1), 2)})
        report.append(f"{'DROPPED' if not inc(w) else 'shift %.2f' % off}: {w['w']!r} asr {w['s']:.2f}-{w['e']:.2f} -> {ss:.2f}-{se:.2f}")
for j, (w, s, e) in enumerate(small):
    if j not in pair.values():
        report.append(f"UNMATCHED small word: {w!r} @ tl {s:.2f} (src {to_src(s)})")
json.dump(out, open(f"E:/clips-viral/data/mvb4/retime-{pid[-4:]}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n".join(report))
print(len(out), "caption_timing entries")
