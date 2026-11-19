"""mv-A4: derive caption_timing / caption_fixes from the audio that is actually audible in the cut.
Assembles the cut-list audio (joins fade 0.12 s like the builder), transcribes it with whisper large-v3 (word times on continuous audio are
reliable), maps the words back to source time, aligns them with the transcript tokens and prints
  - caption_timing for words whose ASR time is wrong / that the midpoint rule drops,
  - caption_fixes ("to": "") for transcript words the midpoint rule keeps but that are not audible.
usage: .venv-asr/Scripts/python.exe scripts/mva4-capfix.py <production_id> <sha> [--write]
--write merges the result into the cut list (caption_timing / caption_fixes, previous auto entries replaced)."""
import json, re, subprocess, sys, difflib
import numpy as np
from faster_whisper import WhisperModel

pid, sha = sys.argv[1], sys.argv[2]
WRITE = "--write" in sys.argv
cp = f"E:/clips-viral/productions/{pid}/cutlist.json"
cl = json.load(open(cp, encoding="utf-8"))
asset = cl["segments"][0]["asset_id"]
SRC = f"E:/clips-viral/data/media/nasa/{asset}.mp4"
tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
T = [w for s in tr["segments"] for w in s["words"]]
rng = []
for s in cl["segments"]:
    if rng and abs(s["src_in"] - rng[-1][1]) < 0.01:
        rng[-1][1] = s["src_out"]
    else:
        rng.append([s["src_in"], s["src_out"]])
parts, offs, t0 = [], [], 0.0
for a, b in rng:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", SRC, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).copy()
    n = min(len(x) // 2, 1920)
    x[:n] *= np.linspace(0, 1, n); x[-n:] *= np.linspace(1, 0, n)
    parts.append(x); offs.append(t0); t0 += len(x) / 16000
x = np.concatenate(parts)
m = WhisperModel("large-v3", device="cpu", compute_type="int8")
segs, _ = m.transcribe(x, language="en", beam_size=5, word_timestamps=True, condition_on_previous_text=False, vad_filter=False)
A = []
for s in segs:
    for w in s.words:
        mid = (w.start + w.end) / 2
        i = max(k for k in range(len(offs)) if offs[k] <= mid + 1e-6)
        A.append((w.word.strip(), rng[i][0] + (w.start - offs[i]), rng[i][0] + (w.end - offs[i]), i))


def norm(t):
    return re.sub(r"[^a-z0-9']", "", t.lower())


def included(w):
    mid = (w["s"] + w["e"]) / 2
    return any(a <= mid <= b for a, b in rng)


cands = [w for w in T if any(a - 1.2 <= w["s"] <= b + 1.2 for a, b in rng)]
an = [norm(a[0]) for a in A]
tn = [norm(w["w"]) for w in cands]
sm = difflib.SequenceMatcher(None, tn, an, autojunk=False)
timing, fixes, unmatched = [], [], []
matched_t = set()
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == "equal":
        for k in range(i2 - i1):
            w = cands[i1 + k]; a = A[j1 + k]; matched_t.add(i1 + k)
            ok_time = abs(w["s"] - a[1]) < 0.12 and abs(w["e"] - a[2]) < 0.2
            if (not included(w)) or not ok_time:
                timing.append({"asset_id": asset, "at": round(w["s"], 2), "word": w["w"].strip(), "start": round(a[1], 2), "end": round(max(a[2], a[1] + 0.08), 2)})
    elif tag == "replace" or tag == "insert":
        for k in range(j1, j2):
            unmatched.append(("audible-not-in-transcript", A[k][0], round(A[k][1], 2)))
        for k in range(i1, i2):
            w = cands[k]
            if included(w):
                fixes.append({"asset_id": asset, "at": round(w["s"], 2), "from": w["w"].strip(), "to": ""})
    elif tag == "delete":
        for k in range(i1, i2):
            w = cands[k]
            if included(w):
                fixes.append({"asset_id": asset, "at": round(w["s"], 2), "from": w["w"].strip(), "to": ""})
print("AUDIO:", " ".join(f"{a[0]}@{a[1]:.2f}" for a in A))
print("caption_timing:", json.dumps(timing, ensure_ascii=False))
print("caption_fixes (deletions):", json.dumps(fixes, ensure_ascii=False))
print("unmatched audible words:", unmatched)
if WRITE:
    keep = [t for t in cl.get("caption_timing", []) if not any(t["word"] == n["word"] and abs(t["at"] - n["at"]) < 0.3 for n in timing)]
    cl["caption_timing"] = keep + timing
    cf = [f for f in cl.get("caption_fixes", []) if f.get("to") != ""]
    cl["caption_fixes"] = cf + fixes
    json.dump(cl, open(cp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("written")
