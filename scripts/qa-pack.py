"""One-shot QA evidence pack for a render (orchestrator, 2026-10-31: cut reviewer tokens).

Usage: python scripts/qa-pack.py productions/<id>/v<N>
Writes <v>/qa/pack.jpg (one grid: 0.0/0.5/1.0/2.0 s, every ~2 s, last 3 s; 240 px tiles with timestamps)
and <v>/qa/pack.json (duration, silences > 0.6 s, techqa summary, captions by time, short caption pages,
spoken-ask time, title, script_forecast for viral.json forecast_delta). Reviewers read these two files first and pull extra frames only for a named defect.
Footage-scorecard brands (config/gates.json brand_overrides.<brand>.footage_scorecard, 2026-11-08) also get <v>/qa/bursts.jpg: one column per entry in play order,
rows = just before / at / just after its payoff, 288 px tiles (whole action inside the box? overlays clear of the subject? motion readable?) and scripts/framing-check.py evidence in pack.json "framing".
"""
import json, os, re, subprocess, sys

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")

v = sys.argv[1].rstrip("/\\")
render = os.path.join(v, "render.mp4")
qa = os.path.join(v, "qa")
os.makedirs(qa, exist_ok=True)

def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf8", errors="replace")

dur = float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", render]).stdout.strip())

# silences (speech gaps) on the master mix
sil, start = [], None
for line in run(["ffmpeg", "-hide_banner", "-i", render, "-af", "silencedetect=n=-35dB:d=0.6", "-f", "null", "-"]).stderr.splitlines():
    m = re.search(r"silence_start: ([\d.]+)", line)
    if m: start = float(m.group(1))
    m = re.search(r"silence_end: ([\d.]+)", line)
    if m and start is not None:
        sil.append([round(start, 2), round(float(m.group(1)), 2)]); start = None

# captions from the SRT
caps, short = [], []
srt = os.path.join(v, "captions.srt")
if os.path.exists(srt):
    ts = lambda s: sum(float(x) * k for x, k in zip(s.replace(",", ".").split(":"), (3600, 60, 1)))
    for block in open(srt, encoding="utf8").read().strip().split("\n\n"):
        lines = block.strip().splitlines()
        if len(lines) >= 3 and "-->" in lines[1]:
            a, b = (ts(x.strip()) for x in lines[1].split("-->"))
            text = " ".join(lines[2:])
            caps.append([round(a, 2), round(b, 2), text])
            if b - a < 0.7: short.append([round(a, 2), text])

techqa = {}
tq = os.path.join(qa, "techqa.json")
if os.path.exists(tq):
    d = json.load(open(tq, encoding="utf8"))
    techqa = {k: d.get(k) for k in ("pass", "failed", "lufs", "tp") if k in d}

script, prod = {}, os.path.dirname(v)
sp = os.path.join(prod, "script.json")
if os.path.exists(sp):
    s = json.load(open(sp, encoding="utf8"))
    script = {"title": s.get("title") or s.get("title_proposed"), "spoken_ask": s.get("spoken_cta") or s.get("spoken_ask") or s.get("engagement_ask"), "end_cta": s.get("cta")}

# frame grid
times = [0.0, 0.5, 1.0, 2.0] + [round(t, 1) for t in range(4, int(dur) - 3, 2)] + [round(dur - 3, 1), round(dur - 1.5, 1), round(dur - 0.1, 1)]
times = sorted(set(t for t in times if 0 <= t < dur))
tiles = os.path.join(qa, "_pack")
os.makedirs(tiles, exist_ok=True)
for i, t in enumerate(times):
    run(["ffmpeg", "-y", "-v", "error", "-ss", str(t), "-i", render, "-frames:v", "1",
         "-vf", f"scale=240:-2,drawtext=text='{t:.1f}s':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.6",
         os.path.join(tiles, f"{i:02d}.jpg")])
cols = 8
run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(tiles, "%02d.jpg"),
     "-vf", f"tile={cols}x{(len(times) + cols - 1) // cols}:padding=4", "-frames:v", "1", os.path.join(qa, "pack.jpg")])
for f in os.listdir(tiles): os.remove(os.path.join(tiles, f))
os.rmdir(tiles)

# payoff bursts + footage scorecard (owner 2026-11-08: QA must see the action, the rating boxes and the zoom, not one still per 2 s)
def _brand():
    import sqlite3
    try:
        c = sqlite3.connect("file:data/studio.db?mode=ro", uri=True)
        row = c.execute("select brand_id from productions where production_id=?", (os.path.basename(os.path.abspath(prod)),)).fetchone()
        return row[0] if row else None
    except sqlite3.Error:
        return None

def _footage_scorecard(brand):
    try:
        g = json.load(open("config/gates.json", encoding="utf8"))
    except OSError:
        return False
    return bool(((g.get("brand_overrides") or {}).get(brand) or {}).get("footage_scorecard"))

brand = _brand()
scorecard = "footage" if _footage_scorecard(brand) else "standard"
bursts, framing = [], None
cut = os.path.join(prod, "cutlist.json")
if scorecard == "footage" and os.path.exists(cut):
    entries = sorted((json.load(open(cut, encoding="utf8")).get("ranking") or {}).get("entries") or [], key=lambda e: e.get("est_start", 0))
    plan_file = os.path.join(prod, "ranking-plan.json")
    plan_entries = {x.get("rank_position"): x for x in json.load(open(plan_file, encoding="utf8")).get("entries", [])} if os.path.exists(plan_file) else {}
    for i, e in enumerate(entries):
        start = float(e.get("est_start") or 0)
        end = float(entries[i + 1]["est_start"]) if i + 1 < len(entries) else dur
        peak = e.get("payoff_est")
        pe = plan_entries.get(e.get("rank_position")) or {}   # payoff recorded on the plan entry
        if peak is None and pe.get("payoff_ms") is not None and e.get("in_ms", 0) <= pe["payoff_ms"] <= e.get("out_ms", 0):
            peak = start + (pe["payoff_ms"] - e["in_ms"]) / 1000 / (pe.get("speed") or 1)
        estimated = peak is None
        peak = float(peak) if peak is not None else start + (end - start) * 0.6   # no recorded payoff: 60 % into the entry
        bursts.append({"rank": e.get("rank_position"), "payoff_s": round(peak, 2), "payoff_estimated": estimated})
    if bursts:
        tiles = os.path.join(qa, "_bursts")
        os.makedirs(tiles, exist_ok=True)
        n = 0
        for off in (-0.4, 0.0, 0.4):
            for b in bursts:
                t = min(max(0.0, b["payoff_s"] + off), dur - 0.05)
                n += 1
                run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.2f}", "-i", render, "-frames:v", "1", "-vf",
                     f"scale=288:-2,drawtext=text='#{b['rank']} {t:.1f}s':x=4:y=4:fontsize=20:fontcolor=yellow:box=1:boxcolor=black@0.6",
                     os.path.join(tiles, f"{n:02d}.jpg")])
        run(["ffmpeg", "-y", "-v", "error", "-i", os.path.join(tiles, "%02d.jpg"),
             "-vf", f"tile={len(bursts)}x3:padding=4", "-frames:v", "1", os.path.join(qa, "bursts.jpg")])
        for f in os.listdir(tiles): os.remove(os.path.join(tiles, f))
        os.rmdir(tiles)
    if os.path.exists("scripts/framing-check.py"):
        run([sys.executable, "scripts/framing-check.py", v])
    fp = os.path.join(qa, "framing.json")
    if os.path.exists(fp):
        framing = json.load(open(fp, encoding="utf8"))

# script-stage forecast (audit 2026-11-08 I8): qa-director writes v<N>/qa/viral.json "forecast_delta" = render viral score - this
def _forecast():
    def num(x):
        x = x.get("score") if isinstance(x, dict) else x
        try:
            return float(x)
        except (TypeError, ValueError):
            return None
    for name, key in (("script-approval.json", "forecast"), ("script-doctor.json", "forecast")):
        p = os.path.join(prod, name)
        if os.path.exists(p):
            val = num(json.load(open(p, encoding="utf8")).get(key))
            if val is not None:
                return val
    return None

pack = {"render": render, "duration_s": round(dur, 2), "grid_times_s": times, "silences_gt_0_6s": sil,
        "techqa": techqa, "captions": caps, "caption_pages_lt_0_7s": short, **script,
        "scorecard": scorecard, "payoff_bursts": bursts, "framing": framing,
        "script_forecast": _forecast(), "forecast_delta_rule": "viral.json forecast_delta = viral score - script_forecast (null if no forecast)"}
json.dump(pack, open(os.path.join(qa, "pack.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
print(json.dumps({"pack": os.path.join(qa, "pack.jpg"), "frames": len(times), "duration_s": pack["duration_s"],
                  "silences": len(sil), "short_pages": len(short)}))
