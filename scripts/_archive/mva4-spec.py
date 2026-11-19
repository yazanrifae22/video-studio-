"""mv-A4: build a mva3-gen spec from ASR-time spans. Joins snap to measured silence (-42 dB), pauses >= 0.26 s inside a span are removed.
usage: python scripts/mva3-spec.py <name>   (reads SPANS from data/mva4/spans-<name>.json, writes data/mva4/spec-<name>.json)
"""
import json, subprocess, sys
import numpy as np


def env(a, b):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", SRC, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    return [(a + i / 16000, 20 * np.log10(np.sqrt(np.mean(x[i:i + 320] ** 2)) + 1e-9)) for i in range(0, len(x) - 320, 160)]


def runs(a, b, thr=-42, mn=0.10):
    out, cur, last = [], None, a
    for t, d in env(a, b):
        last = t
        if d < thr:
            cur = [t, t] if cur is None else [cur[0], t]
        elif cur is not None:
            out.append((cur[0], cur[1] + 0.02)); cur = None
    if cur:
        out.append((cur[0], cur[1] + 0.02))
    return [r for r in out if r[1] - r[0] >= mn]


def near(rs, t, which, reach=0.5):
    c = [r for r in rs if abs(r[which] - t) <= reach]
    return min(c, key=lambda r: abs(r[which] - t)) if c else None


name = sys.argv[1]
cfg = json.load(open(f"E:/clips-viral/data/mva4/spans-{name}.json", encoding="utf-8"))
SRC = f"E:/clips-viral/data/media/nasa/{cfg['asset']}.mp4"
SHA = cfg["sha"]
shots = []
for sp in cfg["spans"]:
    a, b = sp["a"], sp["b"]
    rs = runs(a - 0.7, b + 0.7, thr=cfg.get('thr', -42))
    first = near(rs, a, 1) if not sp.get("exact_in") else None
    ia = round(first[1] - 0.10, 2) if first else a
    if not first and not sp.get("exact_in"):
        print("WARN no silence before", a)
    last = near(rs, b, 0) if not sp.get("exact_out") else None
    ob = round(last[0] + 0.10, 2) if last else b
    if not last and not sp.get("exact_out"):
        print("WARN no silence after", b)
    if sp.get("exact_in"): ia = sp["exact_in"]
    if sp.get("exact_out"): ob = sp["exact_out"]
    inner = [r for r in runs(ia, ob, thr=cfg.get('thr', -42) + 2, mn=0.26) if r[0] > ia + 0.3 and r[1] < ob - 0.3 and not any(abs(r[0] - k) < 0.1 for k in sp.get('keep_pauses', []))]
    cur = ia
    for r in inner:
        shots.append({"in": round(cur, 2), "out": round(r[0] + 0.10, 2), "view": "close", "exact": True, "exact_out": True})
        cur = r[1] - 0.10
        print("  pause removed %.2f-%.2f (%.2f)" % (r[0], r[1], r[1] - r[0]))
    shots.append({"in": round(cur, 2), "out": ob, "view": "close", "exact": True, "exact_out": True})
    print("span", a, b, "->", ia, ob)
shots[0]["fade"] = 0.067
spec = {"production_id": cfg["pid"], "asset_id": cfg["asset"], "sha": SHA, "snap": False, "credits": [cfg["credit"]],
        "zooms": {"wide": [1.0, 1.2], "close": cfg.get("zooms", [1.3, 1.55])}, "pan_x": cfg.get("pan_x", 0), "pan_y_map": cfg["pan_y_map"],
        "shots": shots, "hook": cfg["hook"], "title": cfg["title"], "cta": cfg["cta"], "emphasis": cfg["emphasis"],
        "caption_fixes": cfg.get("caption_fixes", []), "max_piece": cfg.get("max_piece", 3.8)}
if cfg.get("caption_timing"): spec["caption_timing"] = cfg["caption_timing"]
json.dump(spec, open(f"E:/clips-viral/data/mva4/spec-{name}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("total %.2f s, %d shots" % (sum(s["out"] - s["in"] for s in shots), len(shots)))
