"""usage: python -I scripts/mvb4-words.py <sha> <from> <to>  -> words with start times, 8 per line"""
import json, sys
sha, a, b = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
ws = [w for s in tr["segments"] for w in s["words"] if a <= w["s"] <= b]
line = []
for w in ws:
    line.append(f'{w["w"].strip()}@{w["s"]:.2f}-{w["e"]:.2f}')
    if len(line) == 7:
        print(" ".join(line)); line = []
print(" ".join(line))
