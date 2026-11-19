"""mv-BK: apply measured caption_timing (retime-<suffix>.json) + hand fixes to a cut list. Run after mvbk-finish.py and mvb4-retime.py.
usage: python scripts/mvbk-captions.py <suffix>"""
import json, sys

k = sys.argv[1]
pid = f"clip-261025-{k}"
p = f"E:/clips-viral/productions/{pid}/cutlist.json"
cl = json.load(open(p, encoding="utf-8"))
M = "src-261024-7t0d"
T = "src-261024-t8j7"
CFG = {
    "9yxa": dict(skip=["You"], extra=[], fixes=[
        {"asset_id": M, "at": 712.94, "from": "know,", "to": ""},
        {"asset_id": M, "at": 729.17, "from": "space.", "to": ""},
        {"asset_id": M, "at": 730.26, "from": "you", "to": ""},
        {"asset_id": M, "at": 730.70, "from": "know,", "to": ""},
    ]),
    "ttaf": dict(skip=["and", "pretty"], extra=[{"asset_id": T, "at": 260.96, "word": "pretty", "start": 260.93, "end": 261.05}], fixes=[
        {"asset_id": T, "at": 270.48, "from": "and", "to": ""},
        {"asset_id": T, "at": 271.84, "from": "non", "to": "non-zero"},
        {"asset_id": T, "at": 271.98, "from": "-zero", "to": ""},
    ]),
    "e2pk": dict(skip=[], extra=[{"asset_id": T, "at": 1917.22, "word": "and", "start": 1918.30, "end": 1918.70}], fixes=[
        {"asset_id": T, "at": 1924.33, "from": "innate", "to": ""},
        {"asset_id": T, "at": 1918.60, "from": "we", "to": ""},
        {"asset_id": T, "at": 1931.44, "from": "going", "to": "gonna"},
        {"asset_id": T, "at": 1931.44, "from": "to", "to": ""},
    ]),
    "fzv3": dict(skip=["you"], extra=[{"asset_id": T, "at": 2295.18, "word": "you", "start": 2295.20, "end": 2295.33}], fixes=[{"asset_id": T, "at": 2268.0, "from": "make", "to": "make."}]),
}[k]
rt = json.load(open(f"E:/clips-viral/data/mvb4/retime-{k}.json", encoding="utf-8"))
cl["caption_timing"] = [e for e in rt if e["word"] not in CFG["skip"]] + CFG["extra"]
cl["caption_fixes"] = list(CFG["fixes"])
json.dump(cl, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(pid, "timing", len(cl["caption_timing"]), "fixes", len(cl["caption_fixes"]))

if k in ("e2pk", "ttaf"):  # CTA starts at the end of the last segment (speech runs to the out-point; ASR word end is early)
    end = round(sum(s["src_out"] - s["src_in"] for s in cl["segments"]), 3)
    for t in cl["texts"]:
        if t["role"] == "cta": t["at"] = end; t["dur"] = 3.0
        if t["role"] in ("title", "credit"): t["dur"] = round(end - t["at"], 3) if t["role"] == "title" else end
    json.dump(cl, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
