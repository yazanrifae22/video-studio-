"""usage: python -I scripts/mvb4-dump.py <sha> [from] [to]  -> '<sec> text' per ASR segment"""
import json, sys
sha = sys.argv[1]
a = float(sys.argv[2]) if len(sys.argv) > 2 else 0
b = float(sys.argv[3]) if len(sys.argv) > 3 else 1e9
tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
for s in tr["segments"]:
    if not s["words"]: continue
    t = s["words"][0]["s"]
    if a <= t <= b:
        print(int(t), "".join(w["w"] if w["w"].startswith(" ") else " " + w["w"] for w in s["words"]).strip())
