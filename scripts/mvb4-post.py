"""mv-B4: post-process a generated cut list (run after mvb3-gen + mvb3-frame, before every build).
- deflash + compress flags on every segment (see build.ts Segment: single-frame press flashes, bursty archive audio)
- hook text patch, caption_timing (only words the builder would drop: ASR midpoint outside every segment) + manual overrides + caption_fixes
usage: python scripts/mvb4-post.py <suffix>"""
import json, sys

k = sys.argv[1]
pid = f"clip-261025-{k}"
p = f"E:/clips-viral/productions/{pid}/cutlist.json"
cl = json.load(open(p, encoding="utf-8"))
A = "src-261021-mh9v"
CFG = {
    "is1d": dict(fixes=[{"asset_id": A, "at": 2169.48, "from": "moment.", "to": "moment"}, {"asset_id": A, "at": 2172.62, "from": "was", "to": "was,"}], timing_extra=[], skip=[]),
    "wfam": dict(fixes=[{"asset_id": A, "at": 1241.31, "from": "many", "to": "many,"}, {"asset_id": A, "at": 1236.27, "from": "are", "to": "are,"}], skip=["Well,", "To", "and"], timing_extra=[
        {"asset_id": A, "at": 1214.83, "word": "Well,", "start": 1215.38, "end": 1215.62},
        {"asset_id": A, "at": 1217.49, "word": "To", "start": 1216.80, "end": 1217.58},
        {"asset_id": A, "at": 1215.83, "word": "nature", "start": 1216.28, "end": 1216.60},
        {"asset_id": A, "at": 1236.57, "word": "and", "start": 1237.15, "end": 1237.95},
        {"asset_id": A, "at": 1237.83, "word": "so", "start": 1238.25, "end": 1238.58}]),
    "tqfb": dict(fixes=[{"asset_id": A, "at": 172.35, "from": "the", "to": ""}, {"asset_id": A, "at": 173.79, "from": "moon.", "to": "moons."},
                        {"asset_id": A, "at": 148.90, "from": "to", "to": "to,"}, {"asset_id": A, "at": 149.08, "from": "me,", "to": "me"},
                        {"asset_id": A, "at": 156.05, "from": "NASA,", "to": "NASA"},
                        {"asset_id": A, "at": 166.65, "from": "as", "to": "as,"}, {"asset_id": A, "at": 166.87, "from": "stepping", "to": "stepping,"},
                        {"asset_id": A, "at": 167.65, "from": "to", "to": "to,"}, {"asset_id": A, "at": 167.99, "from": "interesting", "to": "interesting,"}],
                 skip=["a"], timing_extra=[{"asset_id": A, "at": 164.95, "word": "a", "start": 164.97, "end": 165.10}]),
}[k]
segs = [(s["src_in"], s["src_out"]) for s in cl["segments"]]
for s in cl["segments"]:
    s["deflash"] = True
    s["compress"] = True
rt = json.load(open(f"E:/clips-viral/data/mvb4/retime-{k}.json", encoding="utf-8"))
tm = [e for e in rt if e["word"] not in CFG["skip"]] + CFG["timing_extra"]
cl["caption_timing"] = tm
cl["caption_fixes"] = CFG["fixes"]
if k == "tqfb":
    for t in cl["texts"]:
        if t["role"] == "hook":
            t["text"] = "Collins: the Moon is a direction"
json.dump(cl, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(pid, "timing", len(tm), "fixes", len(cl["caption_fixes"]))
