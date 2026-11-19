#!/usr/bin/env python
"""Weekly calibration (workflow audit 2026-11-08 I2/I10): Spearman rho (pure python) of each pre-publish score vs
  (a) 7-day views relative to the channel median (views_7d, else current views once the video is >= 7 d old,
      divided by the median of the last 8 earlier same-length videos of that brand; length bucket <=30 s, <=60 s, <=180 s, >180 s),
  (b) engaged ratio (engaged_views / views).
Scores: script_forecast, fresh_eyes_S_viewer_score, fresh_eyes_V_viewer_score, panel_S_hate_count, panel_V_hate_count,
        packaging_score, qa_score, insights, viral_score.   "too few" when n < 8.
Also fresh-eyes vs panel agreement (pass <-> not blocked) for owner item I10 (keep FE at S + panel at V if >= 80 % over 20 videos).
Writes research/calibration/<date>.json + .md. Read-only on everything else.   python scripts/calibrate-scores.py
"""
import json
import statistics
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRANDS = ["viral-rankings", "clipping", "compilations", "quiz-ar", "tech", "kids", "rankings", "celebrity"]
SCORES = ["script_forecast", "fresh_eyes_S_viewer_score", "fresh_eyes_V_viewer_score", "panel_S_hate_count", "panel_V_hate_count",
          "packaging_score", "qa_score", "insights", "viral_score"]
MIN_N = 8


def jload(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf8").lstrip("﻿"))
    except Exception:
        return None


def ranks(v):
    order = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
            j += 1
        for k in range(i, j + 1):
            r[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    if len(x) < 3:
        return None
    rx, ry = ranks(x), ranks(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    sxx = sum((a - mx) ** 2 for a in rx)
    syy = sum((b - my) ** 2 for b in ry)
    if sxx == 0 or syy == 0:
        return None
    return round(sum((a - mx) * (b - my) for a, b in zip(rx, ry)) / (sxx * syy) ** 0.5, 3)


def bucket(sec):
    return None if sec is None else 0 if sec <= 30 else 1 if sec <= 60 else 2 if sec <= 180 else 3


def durations(brand):
    d = {}
    for p in sorted((ROOT / "docs" / "youtube-intelligence" / "snapshots").glob("*/*.json")):
        if p.stem.rstrip("0123456789-") != brand and not p.stem.startswith(brand):
            continue
        if p.stem.endswith("-studio"):
            continue
        for u in (jload(p) or {}).get("uploads") or []:
            if u.get("durationSec") is not None:
                d[u["videoId"]] = u["durationSec"]
    for p in (ROOT / "docs" / "brands" / brand / "retention").glob("*.json"):
        j = jload(p) or {}
        if j.get("duration_s"):
            d[j["video_id"]] = j["duration_s"]
    return d


def brand_rows(brand, now):
    hl = jload(ROOT / "docs" / "brands" / brand / "hook-log.json") or {}
    dur = durations(brand)
    vids = [r for r in hl.get("videos", []) if r.get("status") == "published" and r.get("published_at")]
    vids.sort(key=lambda r: r["published_at"])
    out = []
    for i, r in enumerate(vids):
        pub = datetime.fromisoformat(r["published_at"].replace("Z", "").replace(" ", "T")[:19]).replace(tzinfo=timezone.utc)
        if now - pub < timedelta(days=7) and r.get("views_7d") is None:
            continue
        v = r.get("views_7d") if r.get("views_7d") is not None else r.get("views")
        if v is None:
            continue
        b = bucket(dur.get(r["video_id"]))
        prev = [p for p in vids[:i] if bucket(dur.get(p["video_id"])) == b and p.get("views") is not None][-8:]
        med = statistics.median([p["views"] for p in prev]) if len(prev) >= 3 else None
        out.append({**r, "_rel": (v / med) if med else None, "_eng": (r["engaged_views"] / r["views"]) if r.get("engaged_views") and r.get("views") else None})
    return out


def agreement(rows):
    res = {}
    for st in ("S", "V"):
        n = ag = 0
        for r in rows:
            v, b = r.get(f"fresh_eyes_{st}_verdict"), r.get(f"panel_{st}_block")
            if v is None or b is None:
                continue
            n += 1
            ag += (v == "pass") == (not b)
        res[st] = {"n": n, "agree": ag, "rate": round(ag / n, 3) if n else None}
    return res


def main():
    sys.stdout.reconfigure(encoding="utf8")
    now = datetime.now(timezone.utc)
    report = {"date": now.date().isoformat(), "min_n": MIN_N, "brands": {}, "agreement_FE_vs_panel": {}}
    all_rows = []
    for b in BRANDS:
        rows = brand_rows(b, now)
        all_rows += rows
        res = {"n_videos_with_views": len(rows), "scores": {}}
        for s in SCORES:
            for tgt, key in (("vs_relative_views", "_rel"), ("vs_engaged_ratio", "_eng")):
                pts = [(r[s], r[key]) for r in rows if isinstance(r.get(s), (int, float)) and r.get(key) is not None]
                e = res["scores"].setdefault(s, {})
                e[tgt] = {"n": len(pts), "rho": "too few" if len(pts) < MIN_N else spearman(*zip(*pts))}
        report["brands"][b] = res
    report["agreement_FE_vs_panel"] = agreement(all_rows)
    ag = report["agreement_FE_vs_panel"]
    n_all = sum(a["n"] for a in ag.values())
    rate = sum(a["agree"] for a in ag.values()) / n_all if n_all else None
    report["I10"] = {"n": n_all, "rate": round(rate, 3) if rate is not None else None,
                     "verdict": "need 20 videos with both" if n_all < 20 else ("keep FE at S and panel at V" if rate >= 0.8 else "disagree: review merge")}
    d = ROOT / "research" / "calibration"
    d.mkdir(parents=True, exist_ok=True)
    (d / f"{report['date']}.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf8")
    L = [f"# Score calibration {report['date']}", "",
         "Spearman rho of each score vs 7-day views relative to channel median (last 8 same-length videos) and vs engaged ratio. "
         f"'too few' = n < {MIN_N}. Negative rho for panel hate_count is the expected direction.", ""]
    for b, res in report["brands"].items():
        L += [f"## {b} (n with views = {res['n_videos_with_views']})", "", "| score | n rel | rho rel-views | n eng | rho engaged |", "|---|---|---|---|---|"]
        for s, e in res["scores"].items():
            a, c = e["vs_relative_views"], e["vs_engaged_ratio"]
            L.append(f"| {s} | {a['n']} | {a['rho']} | {c['n']} | {c['rho']} |")
        L.append("")
    L += ["## Fresh-eyes vs panel agreement (I10)", "", f"S: {ag['S']}", f"V: {ag['V']}", f"Overall: {report['I10']}", ""]
    (d / f"{report['date']}.md").write_text("\n".join(L), encoding="utf8")
    print(f"calibration: {sum(r['n_videos_with_views'] for r in report['brands'].values())} videos with views; "
          f"rho computed for {sum(1 for r in report['brands'].values() for e in r['scores'].values() for t in e.values() if t['rho'] not in ('too few', None))} score/brand pairs; "
          f"I10 {report['I10']['verdict']} (n={report['I10']['n']}) -> research/calibration/{report['date']}.json")


if __name__ == "__main__":
    main()
