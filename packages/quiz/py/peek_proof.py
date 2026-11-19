"""Analyse peek_number proof snapshots: visible ink per candidate glyph at phone scale (card 900 px -> 360 px).
usage: peek_proof.py <shots.json> <answer glyph> <out.json> [--max-ink=15] [--min-diff=0.12]
shots.json: {glyph: png, ..., "baseline": png (cover only), "full": png (answer, cover clipped away)}
Visible ink = card pixels within 40 levels of ink #1D1548, minus the baseline (cover's own dark pixels), excluding the
range chip band (card y < 120).
Pass (both ends guarded): the answer's visible ink is <= max-ink % of its full glyph ink (not obvious), every other
candidate differs from it in >= min-diff of the union of visible pixels at phone scale (unique), window height >= 60 px.
"""
import json, sys
import numpy as np
from PIL import Image

shots = json.load(open(sys.argv[1], encoding="utf-8"))
ans = sys.argv[2]
opt = {a.split("=")[0]: float(a.split("=")[1]) for a in sys.argv[4:] if "=" in a}
MAX_INK, MIN_DIFF = opt.get("--max-ink", 15.0), opt.get("--min-diff", 0.12)
INK = np.array([0x1D, 0x15, 0x48])


def visible(path):
    a = np.array(Image.open(path).convert("RGB")).astype(int)[470:1330, 90:990]
    m = (np.abs(a - INK) < 40).all(axis=2)
    m[:120] = False
    return m


base = visible(shots.pop("baseline"))
full_ink = int((visible(shots.pop("full")) & ~base).sum())
full = {g: visible(p) & ~base for g, p in shots.items()}
small = {g: np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((360, 344), Image.BILINEAR)) > 127 for g, m in full.items()}
A = full[ans]
ys, xs = np.where(A)
win = None if not len(xs) else {"x0": int(xs.min()), "x1": int(xs.max()), "y0": int(ys.min()), "y1": int(ys.max()), "w": int(xs.max() - xs.min() + 1), "h": int(ys.max() - ys.min() + 1), "ink_px": int(A.sum())}
ink_pct = round(100.0 * int(A.sum()) / max(1, full_ink), 1)
res = {"answer": ans, "window_card_px": win, "visible_ink_pct": ink_pct, "full_glyph_ink_px": full_ink, "max_ink_pct": MAX_INK, "min_diff_required": MIN_DIFF,
       "phone_scale_card_width": 360, "candidates": {}}
ok = win is not None and win["h"] >= 60 and ink_pct <= MAX_INK
for g, m in small.items():
    if g == ans:
        continue
    union = (m | small[ans]).sum()
    diff = (m ^ small[ans]).sum() / max(1, union)
    res["candidates"][g] = {"visible_ink_px_phone": int(m.sum()), "diff_vs_answer": round(float(diff), 3)}
    if diff < MIN_DIFF:
        ok = False
res["min_diff"] = min(v["diff_vs_answer"] for v in res["candidates"].values())
res["pass"] = bool(ok)
if win:
    res["suggested_peek"] = [int((win["x0"] + win["x1"]) / 2), int((win["y0"] + win["y1"]) / 2), int(max(win["w"], win["h"]) + 40)]
json.dump(res, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(json.dumps({k: res.get(k) for k in ("window_card_px", "visible_ink_pct", "min_diff", "pass", "suggested_peek")}))
