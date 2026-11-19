"""mv-A4: simulate which transcript words land in the captions (midpoint rule) per merged range of a cut list.
usage: python scripts/mva4-words.py <production_id> <sha>"""
import json, sys
pid, sha = sys.argv[1], sys.argv[2]
cl = json.load(open(f"E:/clips-viral/productions/{pid}/cutlist.json", encoding="utf-8"))
tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
words = [w for s in tr["segments"] for w in s["words"]]
rng = []
for s in cl["segments"]:
    if rng and abs(s["src_in"] - rng[-1][1]) < 0.01: rng[-1][1] = s["src_out"]
    else: rng.append([s["src_in"], s["src_out"]])
for a, b in rng:
    ws = [w for w in words if a <= (w["s"] + w["e"]) / 2 <= b]
    print(f"[{a:.2f}-{b:.2f}] " + " ".join(f"{w['w'].strip()}@{w['s']:.2f}" for w in ws))
