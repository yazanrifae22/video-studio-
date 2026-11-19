"""mv-A2: build cutlist.json for a retention-v1 clip from a compact spec.
usage: python -I scripts/mva2-gen.py <spec.json>
spec: {production_id, asset_id, sha, shots:[{in,out,view:'wide'|'close',x?}], zooms:[..], hook:{text,dur}, cta:{text}, emphasis:[...],
       caption_fixes:[...], caption_timing?, title?, credits:[..], max_piece: 3.8}
Spans longer than max_piece are split into equal contiguous pieces at the quietest word gap near the target (alternating zoom).
"""
import json, sys, math

spec = json.load(open(sys.argv[1], encoding="utf-8"))
sha = spec["sha"]
tr = json.load(open(f"E:/clips-viral/data/cache/{sha}/transcript.en.json", encoding="utf-8"))
words = [w for s in tr["segments"] for w in s["words"]]
gaps = [((a["e"] + b["s"]) / 2, b["s"] - a["e"]) for a, b in zip(words, words[1:]) if b["s"] - a["e"] > 0.0]
MAXP = spec.get("max_piece", 3.8)


def split_span(a, b):
    n = max(1, math.ceil((b - a) / MAXP))
    cuts = [a]
    for i in range(1, n):
        t = a + (b - a) * i / n
        cand = [(abs(m - t) - 3 * g, m) for m, g in gaps if abs(m - t) < 0.9 and a + 0.9 < m < b - 0.9]
        cuts.append(round(min(cand)[1], 2) if cand else round(t, 2))
    cuts.append(b)
    for i in range(1, len(cuts) - 1):
        for w in words:
            if w["s"] < cuts[i] < w["e"] and abs((w["s"] + w["e"]) / 2 - cuts[i]) < 0.04:
                cuts[i] = round((w["s"] + w["e"]) / 2 + 0.04, 2)
    return list(zip(cuts, cuts[1:]))


import subprocess
import numpy as np
SRC = f"E:/clips-viral/data/media/nasa/{spec['asset_id']}.mp4"
_env = {}


def env(a, b):
    """10 ms hop / 20 ms window RMS (dB) over [a,b]."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{a:.3f}", "-t", f"{b-a:.3f}", "-i", SRC, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    return [(a + i / 16000, 20 * np.log10(np.sqrt(np.mean(x[i:i + 320] ** 2)) + 1e-9)) for i in range(0, len(x) - 320, 160)]


def runs(t, reach=0.6, thr=-44):
    e = env(t - reach, t + reach)
    out, cur = [], None
    for tt, db in e:
        if db < thr:
            cur = [tt, tt] if cur is None else [cur[0], tt]
        elif cur is not None:
            out.append(cur); cur = None
    if cur:
        out.append(cur)
    return [(a, b + 0.02) for a, b in out if b + 0.02 - a >= 0.10]


def snap(t, kind, reach=0.35):
    rs = runs(t)
    if kind == "out":
        c = [r for r in rs if abs(r[0] - t) <= reach]
        if not c:
            print("WARN no silence run for out", t); return t
        a, b = min(c, key=lambda r: abs(r[0] - t))
        return round(a + 0.10 if b - a >= 0.22 else a + (b - a) / 2, 2)
    c = [r for r in rs if abs(r[1] - t) <= reach]
    if not c:
        print("WARN no silence run for in", t); return t
    a, b = min(c, key=lambda r: abs(r[1] - t))
    return round(b - 0.10 if b - a >= 0.22 else b - (b - a) / 2, 2)


SNAP = spec.get("snap", True)
if SNAP:
    sh_ = spec["shots"]
    for i, sh in enumerate(sh_):
        if i > 0 and abs(sh["in"] - sh_[i - 1]["out"]) > 0.01:
            if not sh.get("exact"):
                sh["in"] = snap(sh["in"], "in")
            if not sh_[i - 1].get("exact_out"):
                sh_[i - 1]["out"] = snap(sh_[i - 1]["out"], "out")
segs = []
zi = 0
for sh in spec["shots"]:
    for k, (a, b) in enumerate(split_span(sh["in"], sh["out"])):
        view = sh.get("view", "close")
        z = spec["zooms"][view][zi % len(spec["zooms"][view])]
        zi += 1
        if view == "wide":
            pan_x = max(-100.0, min(100.0, round((0.5 - sh["x"]) * 3.16 * z * 100, 1)))
            pan_y = sh.get("pan_y", 0)
        else:
            pan_x = sh.get("pan_x", 0)
            pan_y = round(min(0.95 * (z - 1) * 50, 26), 1)
        seg = {"asset_id": spec["asset_id"], "src_in": round(a, 2), "src_out": round(b, 2), "fill": "cover", "zoom": z, "pan_x": pan_x,
               "pan_y": pan_y, "motion": sh.get("motion"), "mute_source": False, "volume": 1.0,
               "why": sh.get("why", "jump-cut piece, zoom alternates for retention (R5)")}
        if k == 0 and "fade" in sh:
            seg["audio_fade_in"] = sh["fade"]
        segs.append(seg)
dur = sum(s["src_out"] - s["src_in"] for s in segs)
texts = [
    {"text": spec["hook"]["text"], "at": 0.0, "dur": spec["hook"].get("dur", 2.6), "role": "hook", "y": spec["hook"].get("y", -37)},
    {"text": "Footage: NASA", "at": 0.0, "dur": round(dur - 3.0, 2), "role": "credit", "x": 36, "y": -46},
    {"text": spec["cta"]["text"], "at": round(dur - 3.0, 2), "dur": 3.0, "role": "cta", "y": spec["cta"].get("y", -38)},
]
if spec.get("title"):
    t = spec["title"]
    texts.insert(1, {"text": t["text"], "at": t.get("at", 2.8), "dur": round(dur - 3.0 - t.get("at", 2.8), 2), "role": "title", "y": t.get("y", -39), "font_px": 76})
cl = {"production_id": spec["production_id"], "width": 1080, "height": 1920, "fps": 30, "segments": segs, "texts": texts, "narration": None,
      "captions": "source", "caption_clean": False, "caption_onset_snap": True, "caption_fixes": spec.get("caption_fixes", []),
      "emphasis": spec["emphasis"], "music": None, "credits": spec["credits"], "target_duration": round(dur, 2)}
if spec.get("caption_timing"):
    cl["caption_timing"] = spec["caption_timing"]
out = f"E:/clips-viral/productions/{spec['production_id']}/cutlist.json"
json.dump(cl, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(out, "dur %.2f" % dur, "segments", len(segs), "max piece %.2f" % max(s["src_out"] - s["src_in"] for s in segs))
