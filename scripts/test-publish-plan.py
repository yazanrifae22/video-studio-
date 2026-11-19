"""publish-plan.py (run to a temp file) must keep every production/brand already in data/publish-plan.json."""
import json, os, subprocess, sys, tempfile
R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
old = json.load(open(os.path.join(R, "data", "publish-plan.json"), encoding="utf-8"))
with tempfile.TemporaryDirectory() as t:
    out = os.path.join(t, "plan.json")
    subprocess.run([sys.executable, os.path.join(R, "scripts", "publish-plan.py"), "--out", out], check=True, capture_output=True)
    new = json.load(open(out, encoding="utf-8"))
ids = [p["production_id"] for p in new]
assert len(ids) == len(set(ids)), "duplicate production ids"
missing = [p["production_id"] for p in old if p["production_id"] not in set(ids)]
assert not missing, missing
assert {p["brand"] for p in old} <= {p["brand"] for p in new}
print("ok", len(old), "->", len(new))

# packaging.json reaches the publisher (audit 2026-11-08 I1): packaging first, script.json fallback, credits kept
sys.path.insert(0, os.path.join(R, "scripts"))
from packaging_meta import published_meta  # noqa: E402
with tempfile.TemporaryDirectory() as t:
    s = {"title": "Old title", "description": "Old desc", "attribution_block": "Video: NASA", "hashtags": ["#old"]}
    json.dump(s, open(os.path.join(t, "script.json"), "w", encoding="utf-8"))
    m = published_meta(t, "clipping", "db")
    assert (m["title"], m["source"]) == ("Old title", "script.json"), m
    json.dump({"chosen_title": "Packaged title", "description": "New desc", "hashtags": ["#space", "#moon"]}, open(os.path.join(t, "packaging.json"), "w", encoding="utf-8"))
    m = published_meta(t, "clipping", "db")
    assert m["title"] == "Packaged title" and m["description"].startswith("New desc") and "Video: NASA" in m["description"] and "#space #moon" in m["description"] and "#old" not in m["description"], m
    json.dump({"chosen_title": "Packaged", "description": "KEEP script.json description unchanged", "hashtags": []}, open(os.path.join(t, "packaging.json"), "w", encoding="utf-8"))
    m = published_meta(t, "clipping", "db")
    assert m["title"] == "Packaged" and m["description"].startswith("Old desc") and "#old" in m["description"], m
    json.dump({"titles": {"youtube": "عنوان"}, "description_ar": "وصف"}, open(os.path.join(t, "script.json"), "w", encoding="utf-8"))
    json.dump({"chosen_title": "عنوان جديد", "description": "", "hashtags": ["#لغز"]}, open(os.path.join(t, "packaging.json"), "w", encoding="utf-8"))
    m = published_meta(t, "quiz-ar", "db")
    assert m["title"] == "عنوان جديد" and m["description"].startswith("وصف") and "#لغز" in m["description"], m
    # YouTube limits (owner 2026-11-08): packaging over a limit -> m["limits"] (publish-plan refuses the entry, never truncates)
    json.dump({"chosen_title": "T" * 101, "description": "ك" * 2501, "hashtags": ["#h%d" % i for i in range(16)]}, open(os.path.join(t, "packaging.json"), "w", encoding="utf-8"))
    m = published_meta(t, "quiz-ar", "db")
    assert sorted({i["field"] for i in m["limits"]}) == ["description", "hashtags", "title"], m["limits"]
    json.dump({"chosen_title": "عنوان جديد", "description": "", "hashtags": ["#لغز"]}, open(os.path.join(t, "packaging.json"), "w", encoding="utf-8"))
    assert published_meta(t, "quiz-ar", "db")["limits"] == []
print("ok packaging_meta")
