#!/usr/bin/env python
"""Build docs/brands/<brand>/hook-log.json (one row per published YouTube video) for the analytics read-back
(agents council 2026-11-08 never-discussed #1; story council E5/E6).

Sources (all read-only):
  data/studio.db publishing (youtube id -> production_id, title, publish time; status published, or scheduled
    with a past slot), latest API snapshot per brand docs/youtube-intelligence/snapshots/*/<brand>.json
    (perVideo90d: views, engagedViews, averageViewPercentage, comments, shares; uploads for videos the DB lacks),
  productions/<id>/hook.json, story.json, script-doctor.json, v<N>/qa/viral.json (latest version that has one),
  research/council/2026-11-08-story/review/<id>.viral.json (retro viral scores).
Unknown values are null, never 0. Fields growth-director fills by hand (viewed_vs_swiped_pct, notes) are kept
across refreshes. Run:  python scripts/hook-log-build.py [--brand quiz-ar]
"""
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAP = ROOT / "docs" / "youtube-intelligence" / "snapshots"
RETRO = ROOT / "research" / "council" / "2026-11-08-story" / "review"
BRANDS = ["viral-rankings", "clipping", "compilations", "quiz-ar", "tech", "kids", "rankings", "celebrity"]
KEEP = ("viewed_vs_swiped_pct", "viewed_vs_swiped", "notes", "retention_d3", "retention_d7", "drop_seconds", "retention_status",
        "views_24h", "views_72h", "views_7d", "snapshots")   # hand-filled fields survive a refresh


def jload(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf8").lstrip("﻿")) if Path(p).exists() else None
    except Exception:
        return None


def latest_snapshot(brand):
    best, key = None, ("", "")
    for p in SNAP.glob("*/*.json"):
        if p.stem.endswith("-studio") or re.sub(r"-\d+$", "", p.stem) != brand:
            continue
        d = jload(p) or {}
        k = (d.get("snapshotDate", ""), d.get("fetchedAt", ""))
        if best is None or k > key:
            best, key = d, k
    return best or {}


def published_rows(con, brand, now):
    q = """SELECT pu.external_post_id, pu.production_id, pu.metadata, pu.scheduled_time, pu.publication_status
           FROM publishing pu JOIN productions p USING(production_id)
           WHERE pu.platform='youtube' AND pu.external_post_id IS NOT NULL AND p.brand_id=?"""
    out = {}
    for vid, pid, meta, when, st in con.execute(q, (brand,)):
        if st not in ("published", "scheduled"):
            continue
        try:
            title = json.loads(meta or "{}").get("title")
        except Exception:
            title = None
        live = st == "published" or bool(when and when[:19].replace(" ", "T") <= now)
        out[vid] = {"production_id": pid, "title": title, "published_at": when, "status": "published" if live else "scheduled"}
    return out


def latest_viral(pdir):
    vs = sorted((int(m.group(1)), d) for d in pdir.glob("v*") if (m := re.fullmatch(r"v(\d+)", d.name)))
    for n, d in reversed(vs):
        v = jload(d / "qa" / "viral.json")
        if v and v.get("score") is not None:
            return v.get("score"), v.get("verdict"), n
    return None, None, None


def num(x):
    if isinstance(x, dict):
        x = x.get("score", x.get("viewer_score"))
    return x if isinstance(x, (int, float)) and not isinstance(x, bool) else None


def latest_v(pdir, name):
    vs = sorted((int(m.group(1)), d) for d in pdir.glob("v*") if (m := re.fullmatch(r"v(\d+)", d.name)))
    for n, d in reversed(vs):
        j = jload(d / "qa" / name)
        if j:
            return j
    return None


def db_qa_score(con, pid):
    try:
        r = con.execute("SELECT score FROM reviews WHERE production_id=? AND kind='agent' AND reviewer LIKE 'qa-director%' AND score IS NOT NULL "
                        "ORDER BY version DESC, id DESC LIMIT 1", (pid,)).fetchone()
        return r[0] if r else None
    except Exception:
        return None


def enrich(pid, con, f):
    """I2 (workflow audit 2026-11-08): calibration inputs. Unknown = None."""
    e = {"script_forecast": f.get("forecast"), "script_rounds": None, "fresh_eyes_S_verdict": None, "fresh_eyes_S_viewer_score": None,
         "fresh_eyes_S_swipe_at_s": None, "fresh_eyes_V_verdict": None, "fresh_eyes_V_viewer_score": None, "fresh_eyes_V_swipe_at_s": None,
         "panel_S_hate_count": None, "panel_S_swipe_before_payoff_count": None, "panel_S_block": None, "panel_V_hate_count": None,
         "panel_V_swipe_before_payoff_count": None, "panel_V_block": None, "packaging_score": None, "chosen_title": None, "qa_score": None,
         "insights": None, "viral_forecast_delta": None, "radar_signal_id": None}
    if not pid:
        return e
    pdir = ROOT / "productions" / pid
    d = jload(pdir / "script-doctor.json") or {}
    e["script_forecast"] = num(d.get("forecast"))
    rnd = d.get("round") if isinstance(d.get("round"), int) else None
    rf = len(list(pdir.glob("script-doctor.r*.json")))
    e["script_rounds"] = max(rnd or 0, rf) or None
    for st, fn in (("S", pdir / "fresh-eyes.script.json"), ("V", None)):
        j = jload(fn) if fn else latest_v(pdir, "fresh-eyes.json")
        if j:
            e[f"fresh_eyes_{st}_verdict"] = j.get("verdict")
            e[f"fresh_eyes_{st}_viewer_score"] = num(j.get("viewer_score"))
            e[f"fresh_eyes_{st}_swipe_at_s"] = j.get("swipe_at_s")
    for st, fn in (("S", pdir / "panel.script.json"), ("V", None)):
        j = jload(fn) if fn else latest_v(pdir, "panel.json")
        if j:
            hc = j.get("hate_count")
            if hc is None and isinstance(j.get("personas"), list):
                hc = sum(1 for x in j["personas"] if str(x.get("reaction", "")).lower() in ("hate", "boring", "bored"))
            e[f"panel_{st}_hate_count"] = hc
            e[f"panel_{st}_swipe_before_payoff_count"] = j.get("swipe_before_payoff_count")
            e[f"panel_{st}_block"] = j.get("block")
    pk = jload(pdir / "packaging.json") or {}
    e["packaging_score"] = num(pk.get("score"))
    e["chosen_title"] = pk.get("chosen_title")
    e["qa_score"] = db_qa_score(con, pid)
    ins = latest_v(pdir, "insights-score.json") or jload(pdir / "qa" / "insights-score.json")
    e["insights"] = num((ins or {}).get("score"))
    if f.get("viral_score") is not None and e["script_forecast"] is not None:
        e["viral_forecast_delta"] = f["viral_score"] - e["script_forecast"]
    b = jload(pdir / "brief.json") or {}
    rad = b.get("radar") if isinstance(b.get("radar"), dict) else {}
    e["radar_signal_id"] = b.get("radar_signal_id") or rad.get("signal_id")
    return e


def hook_fields(h):
    """hook.json -> hook_mechanism / premise / payoff_ts (audit #2 F12). `chosen` may be an option index (int or digit string), an
    option id, or the chosen option itself; mechanism from the chosen option, else top-level `mechanism`; quiz-ar hook_intro files
    (no options) carry their mechanism family as `category` (+ `variant`)."""
    opts = [o for o in (h.get("options") or []) if isinstance(o, dict)]
    c, ch = h.get("chosen"), {}
    if isinstance(c, dict):
        ch = c
    elif isinstance(c, bool):
        ch = {}
    elif isinstance(c, int) or (isinstance(c, str) and c.strip().isdigit()):
        i = int(c)
        ch = opts[i] if 0 <= i < len(opts) else {}
    elif isinstance(c, str):
        ch = next((o for o in opts if str(o.get("id", "")).strip().lower() == c.strip().lower()), {})
        if not ch and len(c) == 1 and c.isalpha() and ord(c.upper()) - 65 < len(opts):   # "B" without option ids = 2nd option
            ch = opts[ord(c.upper()) - 65]
    mech = ch.get("mechanism") or h.get("mechanism")
    if isinstance(mech, dict):
        mech = mech.get("name") or mech.get("id") or mech.get("type")
    if not mech and h.get("category"):
        mech = "quiz:%s%s" % (h["category"], (":" + str(h["variant"])) if h.get("variant") else "")
    return {"hook_mechanism": mech, "hook_premise": h.get("premise") or ch.get("premise") or ch.get("expectation"),
            "payoff_ts": h.get("payoff_ts") or ch.get("payoff_ts")}


def prod_fields(pid):
    f = {"hook_mechanism": None, "hook_premise": None, "payoff_ts": None, "story_structure": None, "story_spine": None,
         "doctor_verdict": None, "forecast": None, "viral_score": None, "viral_verdict": None, "viral_version": None,
         "viral_source": None}
    if not pid:
        return f
    pdir = ROOT / "productions" / pid
    h = jload(pdir / "hook.json") or {}
    f.update(hook_fields(h))
    s = jload(pdir / "story.json") or {}
    f["story_structure"] = s.get("structure") or s.get("template") or s.get("structure_id") or s.get("type")
    f["story_spine"] = s.get("spine")
    d = jload(pdir / "script-doctor.json") or {}
    f["doctor_verdict"] = d.get("verdict")
    fc = d.get("forecast")
    f["forecast"] = fc.get("score") if isinstance(fc, dict) else fc
    sc, vd, n = latest_viral(pdir)
    if sc is not None:
        f.update(viral_score=sc, viral_verdict=vd, viral_version=n, viral_source="qa/viral.json")
    else:
        r = jload(RETRO / f"{pid}.viral.json")
        if r and r.get("score") is not None:
            f.update(viral_score=r["score"], viral_verdict=r.get("verdict"), viral_version=r.get("version"),
                     viral_source="retro (story council 2026-11-08)")
    return f


def build(brand, con, now):
    snap = latest_snapshot(brand)
    per = {v["video"]: v for v in snap.get("perVideo90d") or [] if v.get("video")}
    ups = {u["videoId"]: u for u in snap.get("uploads") or [] if u.get("videoId")}
    pubs = published_rows(con, brand, now)
    # DB rows first (published + scheduled, so pre-publish viral scores are already joined), then public
    # snapshot-only videos (legacy uploads); private scheduled uploads the DB lacks are skipped
    ids = list(pubs) + [v for v in per if v not in pubs] +           [v for v, u in ups.items() if v not in pubs and v not in per and u.get("privacyStatus") == "public"]
    out_p = ROOT / "docs" / "brands" / brand / "hook-log.json"
    old = {r.get("video_id"): r for r in (jload(out_p) or {}).get("videos", [])}
    rows, seen = [], set()
    for vid in ids:
        if vid in seen:
            continue
        seen.add(vid)
        p, a, u = pubs.get(vid, {}), per.get(vid, {}), ups.get(vid, {})
        if p.get("status") == "scheduled":
            a, u = {}, {k: v for k, v in u.items() if k not in ("views", "comments")}   # not live yet: metrics unknown
        row = {"video_id": vid, "production_id": p.get("production_id"), "status": p.get("status", "published"),
               "title": p.get("title") or u.get("title") or a.get("title"),
               "published_at": p.get("published_at") or u.get("publishAt") or u.get("publishedAt"),
               "views": a.get("views", u.get("views")), "engaged_views": a.get("engagedViews"),
               "avg_view_pct": a.get("averageViewPercentage"), "comments": a.get("comments", u.get("comments")),
               "shares": a.get("shares"), "viewed_vs_swiped_pct": None, "retention_d3": None, "retention_d7": None,
               "views_24h": None, "views_72h": None, "views_7d": None, "drop_seconds": None, "retention_status": None, "viewed_vs_swiped": None,
               **prod_fields(p.get("production_id")), "notes": None}
        row.update(enrich(p.get("production_id"), con, row))
        for k in KEEP:
            if old.get(vid, {}).get(k) is not None:
                row[k] = old[vid][k]
        rows.append(row)
    rows.sort(key=lambda r: r["published_at"] or "", reverse=True)
    doc = {"brand": brand, "generated": now, "snapshot_date": snap.get("snapshotDate"),
           "analytics_end": snap.get("analyticsEndDate"),
           "method": "scripts/hook-log-build.py: studio.db publishing + latest API snapshot (perVideo90d, 90-day window) "
                     "+ production hook/story/script-doctor/viral json; null = unknown",
           "videos": rows}
    out_p.parent.mkdir(parents=True, exist_ok=True)
    out_p.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf8")
    return rows


def main():
    sys.stdout.reconfigure(encoding="utf8")
    only = sys.argv[sys.argv.index("--brand") + 1] if "--brand" in sys.argv else None
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    con = sqlite3.connect(f"file:{(ROOT / 'data' / 'studio.db').as_posix()}?mode=ro", uri=True)
    for b in [only] if only else BRANDS:
        rows = build(b, con, now)
        print(f"{b}: {len(rows)} videos ({sum(1 for r in rows if r['status'] == 'published')} published), linked {sum(1 for r in rows if r['production_id'])}, "
              f"with views {sum(1 for r in rows if r['views'] is not None)}, viral {sum(1 for r in rows if r['viral_score'] is not None)}, "
              f"hook_mechanism {sum(1 for r in rows if r['hook_mechanism'])}/{sum(1 for r in rows if r['production_id'])} linked, "
              f"story_structure {sum(1 for r in rows if r['story_structure'])}")
    con.close()


if __name__ == "__main__":
    main()
