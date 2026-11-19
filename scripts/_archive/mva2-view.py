"""mv-A2 helper: print transcript words with times and gaps for a window.
usage: python -I scripts/mva2-view.py <sha> <start> <end> [mingap]
"""
import json, sys
sha, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
mg = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
d = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
ws = []
for s in d["segments"]:
    for w in s.get("words", []):
        ws.append(w)
prev = None
line = []
for w in ws:
    if w["e"] < a or w["s"] > b:
        continue
    if prev is not None and w["s"] - prev["e"] >= mg:
        print(f"[{line[0][0]:.2f}] " + " ".join(x[1] for x in line) + f"   <gap {w['s']-prev['e']:.2f} @ {prev['e']:.2f}-{w['s']:.2f}>")
        line = []
    line.append((w["s"], w["w"]))
    prev = w
if line:
    print(f"[{line[0][0]:.2f}] " + " ".join(x[1] for x in line))
