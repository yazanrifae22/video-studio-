#!/usr/bin/env python
"""E4 + E3: read-only YouTube analytics snapshots for videos published in the last N days (default 10).
  - ~24 h / ~72 h / ~7 d after publish -> analytics_snapshots (source 'snap-24h|72h|7d', one row per video+window,
    idempotent via a unique index) and hook-log views_24h/72h/7d + snapshots{} (views, engaged_views, avg_view_pct,
    likes, comments, shares). Views/likes/comments are live lifetime counts (Data API) taken the first time a run falls
    inside the window; engaged_views/avg_view_pct/shares come from Analytics (lags ~2 d: null until available, a later
    run inside the window fills them).
  - day >= 3 and >= 7: audienceWatchRatio by elapsedVideoTimeRatio -> docs/brands/<brand>/retention/<video_id>.json,
    drop_seconds summary in hook-log; 'scope_missing' when the token lacks the Analytics scope.
Safe to run hourly/daily. Usage: python scripts/analytics-snapshots.py [--brand B] [--days 10] [--no-retention]
"""
import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import yt_api  # noqa: E402

ROOT = yt_api.ROOT
DB = ROOT / "data" / "studio.db"
WINDOWS = {"24h": (20, 48), "72h": (66, 96), "7d": (156, 204)}   # hours since publish in which a snapshot counts
FIELDS = {"24h": "views_24h", "72h": "views_72h", "7d": "views_7d"}


def jload(p):
    try:
        return json.loads(Path(p).read_text(encoding="utf8").lstrip("﻿"))
    except Exception:
        return None


def migrate(con):
    # the table already fits: engaged_views/avg_view_pct live in retention_metrics, likes/comments/shares in
    # engagement_metrics (JSON). The unique index makes (video, window) idempotent.
    con.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snap_video_src ON analytics_snapshots(external_post_id, source)")
    con.commit()


def parse_t(s):
    s = (s or "").replace(" ", "T").replace("Z", "")[:19]
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc) if s else None


def lifetime_analytics(brand, vid, pub, today):
    start, end = pub.date().isoformat(), (today - timedelta(days=1)).date().isoformat()
    if start > end:
        return {}
    for metrics in ("views,engagedViews,averageViewPercentage,likes,comments,shares", "views,averageViewPercentage,likes,comments,shares"):
        try:
            r = yt_api.report(brand, startDate=start, endDate=end, filters=f"video=={vid}", metrics=metrics)
            return r[0] if r else {}
        except yt_api.ApiError:
            continue
    return {}


def retention(brand, vid, pub, today, dur):
    start, end = pub.date().isoformat(), (today - timedelta(days=1)).date().isoformat()
    rows = yt_api.report(brand, startDate=start, endDate=end, filters=f"video=={vid}", dimensions="elapsedVideoTimeRatio",
                         metrics="audienceWatchRatio,relativeRetentionPerformance", sort="elapsedVideoTimeRatio")
    curve = [[r["elapsedVideoTimeRatio"], r["audienceWatchRatio"]] for r in rows]
    drops = []
    for (t0, a0), (t1, a1) in zip(curve, curve[1:]):
        if a1 < a0:
            drops.append({"at_s": round(t0 * dur, 1) if dur else None, "ratio_at": round(t0, 3), "drop_pct_pts": round((a0 - a1) * 100, 1)})
    drops.sort(key=lambda d: -d["drop_pct_pts"])
    return curve, drops[:3]


def main():
    sys.stdout.reconfigure(encoding="utf8")
    a = sys.argv
    only = a[a.index("--brand") + 1] if "--brand" in a else None
    days = int(a[a.index("--days") + 1]) if "--days" in a else 10
    do_ret = "--no-retention" not in a
    now = datetime.now(timezone.utc)
    con = sqlite3.connect(DB, timeout=30)
    migrate(con)
    q = """SELECT pu.external_post_id, pu.production_id, p.brand_id, pu.scheduled_time FROM publishing pu JOIN productions p USING(production_id)
           WHERE pu.platform='youtube' AND pu.external_post_id IS NOT NULL AND pu.publication_status IN ('published','scheduled')
             AND pu.scheduled_time IS NOT NULL"""
    by_brand = {}
    for vid, pid, brand, when in con.execute(q):
        t = parse_t(when)
        if t and t <= now and (now - t) <= timedelta(days=days) and (not only or brand == only):
            by_brand.setdefault(brand, []).append((vid, pid, t))
    stats = {"snap_new": 0, "retention_new": 0, "scope_missing": set(), "errors": 0, "videos": 0}
    for brand, items in by_brand.items():
        hl_p = ROOT / "docs" / "brands" / brand / "hook-log.json"
        hl = jload(hl_p)
        rows = {r["video_id"]: r for r in (hl or {}).get("videos", [])}
        try:
            meta = yt_api.videos(brand, [i[0] for i in items])
        except Exception as e:
            print(f"{brand}: Data API failed ({str(e)[:80]})")
            stats["errors"] += 1
            continue
        dirty = False
        for vid, pid, t in items:
            m = meta.get(vid)
            if not m or m["status"]["privacyStatus"] != "public":
                continue
            stats["videos"] += 1
            pub = parse_t(m["snippet"]["publishedAt"]) or t
            hrs = (now - pub).total_seconds() / 3600
            st = m["statistics"]
            row = rows.get(vid)
            for w, (lo, hi) in WINDOWS.items():
                if not (lo <= hrs < hi):
                    continue
                have = con.execute("SELECT id, retention_metrics FROM analytics_snapshots WHERE external_post_id=? AND source=?",
                                   (vid, f"snap-{w}")).fetchone()
                if have and json.loads(have[1] or "{}").get("engaged_views") is not None:
                    continue   # complete
                an = lifetime_analytics(brand, vid, pub, now)
                if have and an.get("engagedViews") is None:
                    continue   # nothing new to add yet
                eng = {"likes": int(st.get("likeCount", 0)), "comments": int(st.get("commentCount", 0)), "shares": an.get("shares")}
                ret = {"engaged_views": an.get("engagedViews"), "avg_view_pct": an.get("averageViewPercentage")}
                views, at = int(st.get("viewCount", 0)), now.isoformat(timespec="seconds")
                if have:
                    con.execute("UPDATE analytics_snapshots SET retention_metrics=?, engagement_metrics=? WHERE id=?",
                                (json.dumps(ret), json.dumps(eng), have[0]))
                else:
                    con.execute("""INSERT INTO analytics_snapshots(external_post_id, platform, production_id, views, observation_time,
                                   hours_since_publish, retention_metrics, engagement_metrics, source) VALUES (?,?,?,?,?,?,?,?,?)""",
                                (vid, "youtube", pid, views, at, round(hrs, 1), json.dumps(ret), json.dumps(eng), f"snap-{w}"))
                    stats["snap_new"] += 1
                    if row is not None:
                        row[FIELDS[w]] = views
                if row is not None:
                    snaps = dict(row.get("snapshots") or {})
                    snaps[w] = {"views": views, "engaged_views": ret["engaged_views"], "avg_view_pct": ret["avg_view_pct"], **eng,
                                "hours_since_publish": round(hrs, 1), "at": at}
                    row["snapshots"] = snaps
                    row[FIELDS[w]] = snaps[w]["views"] if row.get(FIELDS[w]) is None else row[FIELDS[w]]
                    dirty = True
            if do_ret and hrs >= 72 and row is not None:
                rp = ROOT / "docs" / "brands" / brand / "retention" / f"{vid}.json"
                doc = jload(rp) or {"video_id": vid, "brand": brand, "production_id": pid, "published_at": pub.isoformat()}
                dur = yt_api.duration_s(m["contentDetails"]["duration"])
                doc["duration_s"] = dur
                for tag, need in (("d3", 72), ("d7", 168)):
                    if hrs < need or doc.get(tag):
                        continue
                    try:
                        curve, drops = retention(brand, vid, pub, now, dur)
                    except yt_api.ApiError as e:
                        if e.scope_missing:
                            stats["scope_missing"].add(brand)
                            row["retention_status"] = "scope_missing"
                            dirty = True
                            break
                        stats["errors"] += 1
                        continue
                    if not curve:
                        continue   # Analytics lag: retry next run
                    doc[tag] = {"fetched_at": now.isoformat(timespec="seconds"), "audienceWatchRatio_by_elapsedVideoTimeRatio": curve}
                    row["drop_seconds"] = {**(row.get("drop_seconds") or {}), tag: drops}
                    row["retention_" + tag] = f"docs/brands/{brand}/retention/{vid}.json"
                    row["retention_status"] = "ok"
                    rp.parent.mkdir(parents=True, exist_ok=True)
                    rp.write_text(json.dumps(doc, ensure_ascii=False, indent=1), encoding="utf8")
                    stats["retention_new"] += 1
                    dirty = True
        con.commit()
        if dirty and hl is not None:
            hl_p.write_text(json.dumps(hl, ensure_ascii=False, indent=1), encoding="utf8")
    con.close()
    print(f"snapshots: {stats['videos']} public videos in last {days} d, {stats['snap_new']} new snapshot rows, "
          f"{stats['retention_new']} retention files, scope_missing={sorted(stats['scope_missing']) or 'none'}, errors={stats['errors']}")


if __name__ == "__main__":
    main()
