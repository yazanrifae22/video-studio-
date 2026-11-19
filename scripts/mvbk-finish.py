"""mv-BK: regenerate cutlist from data/mvb4/spans-<name>.json then apply end_hold/CTA/min page. usage: python scripts/mvbk-finish.py <name> <pid>"""
import json, subprocess, sys
name, pid = sys.argv[1], sys.argv[2]
S = "C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/37604470-a807-4bb9-b604-0dc7c09dcf51/scratchpad/apply_end_hold.py"
subprocess.run(["python", "scripts/mvb4-spec.py", name], check=True)
sp = f"E:/clips-viral/data/mvb4/spec-{name}.json"
cfg = json.load(open(f"E:/clips-viral/data/mvb4/spans-{name}.json", encoding="utf-8"))
spec = json.load(open(sp, encoding="utf-8"))
for ov in cfg.get("join_patch", []):  # {"out_near": t, "out": o, "in": i}: move one join deeper into its pause
    for k, sh in enumerate(spec["shots"][:-1]):
        if abs(sh["out"] - ov["out_near"]) < 0.02:
            sh["out"] = ov["out"]; spec["shots"][k + 1]["in"] = ov["in"]; print("patched join", ov)
json.dump(spec, open(sp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
subprocess.run(["python", "scripts/mvb3-gen.py", f"data/mvb4/spec-{name}.json"], check=True)
subprocess.run(["python", S, pid], check=True)
p = f"E:/clips-viral/productions/{pid}/cutlist.json"
c = json.load(open(p, encoding="utf-8"))
t = [x for x in c["texts"] if x["role"] == "cta"][0]["at"]
for x in c["texts"]:
    if x["role"] in ("title", "credit"): x["dur"] = round(t - x["at"], 3)
c["caption_min_page"] = 0.6
json.dump(c, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
