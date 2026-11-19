"""Export what a viewer would hear and read, in time order, for fresh-eyes / audience-panel stage S.

Usage:  python scripts/fresh-eyes-export.py <production_id> [--out productions/<id>/viewer-text.txt] [--no-title]

Reads ONLY the words the viewer meets: narration / speaker words (VOICE), on-screen text (TEXT),
and the title shown under the video (packaging.json chosen_title, else script title).
Never prints plan fields: premise, send_reason, payoff_ts, hook/story/brief fields, notes, sections,
roles, claims, evidence, descriptions, rules. Times are seconds; "~" = estimated from word count.
"""
import argparse
import json
import os
import re
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WPS = 2.5  # estimate speed when a line has no time


def load(path):
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf8") as f:
        return json.load(f)


def num(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        m = re.match(r"\s*(\d+(?:\.\d+)?)", v)
        if m:
            return float(m.group(1))
    return None


def words(s):
    return len(str(s).split())


class Ev:
    def __init__(self):
        self.rows = []  # (t, est, kind, text)

    def add(self, t, kind, text, est=False):
        if text is None:
            return
        text = re.sub(r"\s+", " ", str(text)).strip()
        if text:
            self.rows.append((t, est, kind, text))


def sequential(lines, start=0.1, gap=0.3):
    """lines: list of (t_or_None, text) -> fill missing times by word count."""
    out, cur = [], start
    for t, text in lines:
        if t is None:
            t, est = cur, True
        else:
            est = False
        out.append((t, est, text))
        cur = t + words(text) / WPS + gap
    return out


def narration_lines(sc):
    n = sc.get("narration")
    if isinstance(n, dict):
        n = n.get("lines")
    res = []
    for x in n or []:
        if isinstance(x, str):
            res.append((None, x))
            continue
        if not isinstance(x, dict):
            continue
        text = x.get("text") or x.get("narration") or x.get("narration_en") or x.get("line")
        t = None
        if x.get("at_ms") is not None:
            t = num(x["at_ms"]) / 1000.0
        else:
            for k in ("at", "t", "start", "start_s", "start_hint"):
                if x.get(k) is not None and num(x[k]) is not None:
                    t = num(x[k])
                    break
        res.append((t, text))
    return res


def screen_texts(sc, cl):
    src = (cl or {}).get("texts") or sc.get("on_screen") or sc.get("texts") or []
    res = []
    for x in src:
        if not isinstance(x, dict):
            continue
        t = None
        for k in ("at", "t", "start"):
            if x.get(k) is not None:
                t = num(x[k])
                if isinstance(x[k], str) and x[k].strip().lower().startswith("last"):
                    t = None  # "last 1.8 s": place at the end
                break
        res.append((t, x.get("text")))
    return res


def source_words(cl):
    """Clipping: speaker words from the source transcript inside each cut segment."""
    if cl.get("caption_words"):
        return [(w["t0"], w["w"]) for w in cl["caption_words"]]
    segs = cl.get("segments") or []
    if not segs:
        return []
    db = sqlite3.connect(os.path.join(ROOT, "data", "studio.db"))
    out, cur = [], 0.0
    for s in segs:
        a, i, o = s.get("asset_id"), num(s.get("src_in")), num(s.get("src_out"))
        if a is None or i is None or o is None:
            continue
        start = num(s.get("start")) if s.get("start") is not None else cur
        row = db.execute("select transcript_path from sources where asset_id=?", (a,)).fetchone()
        tp = row[0] if row else None
        if tp and not os.path.isabs(tp):
            tp = os.path.join(ROOT, tp)
        tr = load(tp) if tp else None
        for seg in (tr or {}).get("segments", []):
            for w in seg.get("words") or []:
                mid = (w["s"] + w["e"]) / 2
                if i <= mid <= o:
                    out.append((start + max(0.0, w["s"] - i), w["w"]))
        cur = start + (o - i)
    return out


def group_words(ws, max_gap=0.6, max_words=14):
    lines, buf, t0, last = [], [], None, None
    for t, w in ws:
        if buf and (t - last > max_gap or len(buf) >= max_words):
            lines.append((t0, " ".join(buf)))
            buf = []
        if not buf:
            t0 = t
        buf.append(w.strip())
        last = t
    if buf:
        lines.append((t0, " ".join(buf)))
    return lines


def export_quiz(d, ev):
    sc = load(os.path.join(d, "script.json")) or {}
    for x in sc.get("lines") or []:
        t = num(x.get("start_hint"))
        ev.add(t, "VOICE", x.get("narration_ar") or x.get("narration"))
        ev.add(t, "TEXT", x.get("onscreen_ar") or x.get("onscreen"))
    # orchestrator 2026-11-08: the viewer also sees each round's reveal reason chip (explanation_ar) and the
    # countdown method cue (params.cd_cue); reviewers kept asking for reasons that were already on screen
    q = load(os.path.join(d, "quiz.json")) or {}
    starts = {x.get("id"): num(x.get("start_hint")) for x in sc.get("lines") or []}
    for r in q.get("rounds") or []:
        cue = (r.get("params") or {}).get("cd_cue")
        qt = starts.get(r.get("q_line"))
        if cue:
            ev.add(None if qt is None else qt + 1.0, "TEXT", f"small cue during the countdown: {cue}", est=True)
        if r.get("explanation_ar") and not r.get("open"):
            at = starts.get(r.get("a_line"))
            ev.add(None if at is None else at + 0.3, "TEXT", f"reason chip under the answer: {r['explanation_ar']}", est=True)
        if r.get("open"):
            ev.add(None, "TEXT", "(last round: the answer is never shown in the video; viewers are asked to leave their answer in the comments)", est=True)
    return sc, num(sc.get("target_duration_s"))


def kids_timing(d):
    """Real timing for a kids production: the newest vN that has score.json (+ series.json), else draft/.
    Returns (score, series) or (None, None) when nothing was built yet (then the caller estimates)."""
    cands = []
    for n in os.listdir(d):
        m = re.fullmatch(r"v(\d+)", n)
        if m and os.path.isdir(os.path.join(d, n)):
            cands.append((int(m.group(1)), os.path.join(d, n)))
    dirs = [os.path.join(d, "draft")] + [p for _, p in cands]
    scored = [(os.path.getmtime(os.path.join(p, "score.json")), p) for p in dirs if os.path.exists(os.path.join(p, "score.json"))]
    for _, p in sorted(scored, reverse=True):   # newest build wins (a final vN is newer than its draft; a reworked draft beats an old vN)
        sc = load(os.path.join(p, "score.json"))
        if sc and sc.get("lines"):
            return sc, load(os.path.join(p, "series.json"))
    return None, None


def export_kids(d, ev):
    ep = load(os.path.join(d, "episode.json")) or {}
    sc = load(os.path.join(d, "script.json")) or {}
    score, ser = kids_timing(d)
    if score:
        off = num(((ser or {}).get("episode") or {}).get("offset")) or 0.0
        cold = (ser or {}).get("cold_open") or None
        if ser:   # Sunny Hill wrapper: fixed kit opening + ending, so reviewers do not read them as a silent card / silent tail
            c = num((cold or {}).get("duration")) or 0.0
            if cold:
                f0 = num(cold.get("src_from")) or 0.0
                for ln in score["lines"]:
                    if f0 - 0.05 <= ln["t0"] and ln["t1"] <= f0 + c + 0.05:
                        ev.add(max(0.0, ln["t0"] - f0), f"VOICE ({(ln.get('who') or 'voice').capitalize()}) [cold open, first seconds]", ln.get("text"))
            od = num((ser.get("opening") or {}).get("duration")) or (off - c)
            ev.add(c, "NOTE", f"[series opening ~{od:.1f}s: sung jingle, 'Sunny Hill' sign, 'Ep {ser.get('ep')}' badge; fixed for every episode]")
            end = ser.get("ending") or {}
            eo = num(end.get("offset"))
            if eo is not None:
                ev.add(eo, "NOTE", f"[series ending ~{num(end.get('duration')) or 30:.0f}s: recap song, next-time teaser, grown-up ask, goodbye; fixed for every episode]")
        else:
            tc = ep.get("title_card")
            if tc:
                ev.add(0.0, "TEXT", " / ".join(tc) if isinstance(tc, list) else tc)
        for ln in score["lines"]:
            ev.add(off + ln["t0"], f"VOICE ({(ln.get('who') or 'voice').capitalize()})", ln.get("text"))
        return sc, num((ser or {}).get("total")) or (off + (num(score.get("duration")) or 0.0))
    tc = ep.get("title_card")
    if tc:
        ev.add(0.0, "TEXT", " / ".join(tc) if isinstance(tc, list) else tc)
    cur = num(sc.get("body_start_s")) or 0.0
    gap = num(ep.get("gap")) or 0.2
    for scn in ep.get("scenes") or []:
        cur += num(scn.get("lead")) or 0.0
        for ln in scn.get("lines") or []:
            who = (ln.get("who") or "voice").capitalize()
            ev.add(cur, f"VOICE ({who})", ln.get("text"), est=True)
            cur += words(ln.get("text", "")) / 2.0 + gap
        for k in ("onscreen", "on_screen", "text_on_screen"):
            if scn.get(k):
                ev.add(cur, "TEXT", scn[k], est=True)
        cur += num(scn.get("tail")) or 0.0
    return sc, cur


def export_generic(d, ev):
    sc = load(os.path.join(d, "script.json")) or {}
    cl = load(os.path.join(d, "cutlist.json")) or {}
    spoken = narration_lines(sc)
    if not any(t for t, x in spoken if x) and cl.get("captions") == "source":
        for t, text in group_words(source_words(cl)):
            ev.add(t, "VOICE (speaker)", text)
    else:
        for t, est, text in sequential(spoken):
            ev.add(t, "VOICE", text, est=est)
    dur = num(cl.get("target_duration")) or num(sc.get("target_duration_s"))
    end_t = dur or (max([r[0] for r in ev.rows] or [0]) + 3)
    for t, text in screen_texts(sc, cl):
        ev.add(t if t is not None else max(0.0, end_t - 2), "TEXT", text, est=t is None)
    rail = sc.get("rail")
    if isinstance(rail, dict) and rail:
        rv = {"#5": 1.5, "#4": 6.7, "#3": 12.3, "#2": 19.2, "#1": 27.6}
        ev.add(0.0, "TEXT", "side list starts empty; each row slides in only at its reveal (#1 hidden until it is revealed)")
        for k, v in rail.items():
            ev.add(float(rv.get(k, 0.0)), "TEXT", f"side list row appears: {k} {v}")
    return sc, dur


def lab_plan(d):
    """Newest vN/plan.json -> ({line id: cue time}, duration). Builds also write estimated plans; those are fine too."""
    cands = []
    for n in os.listdir(d):
        m = re.fullmatch(r"v(\d+)", n)
        if m and os.path.exists(os.path.join(d, n, "plan.json")):
            cands.append((int(m.group(1)), os.path.join(d, n, "plan.json")))
    if not cands:   # LAB draft: draft/proof_times.json (proof_calc.py real timeline) is the next best source
        pt = load(os.path.join(d, "draft", "proof_times.json")) or {}
        if pt.get("at"):
            return {k: num(v) for k, v in pt["at"].items()}, num(pt.get("total"))
        return {}, None
    pl = load(max(cands)[1]) or {}
    pl = pl.get("plan") or pl   # draft/plan.json wraps it in {estimated, durs, plan}
    return {c["id"]: num(c.get("at")) for c in pl.get("cues") or [] if "id" in c}, num(pl.get("duration"))


def lab_durs(d):
    """Real spoken seconds per line id from draft/_lines.json (written by warm.ts), else {}."""
    pt = load(os.path.join(d, "draft", "proof_times.json")) or {}
    if pt.get("at") and pt.get("end"):   # trimmed real timeline from proof_calc.py wins over raw takes
        return {k: round(float(pt["end"][k]) - float(pt["at"][k]), 2) for k in pt["at"] if k in pt["end"]}
    arr = load(os.path.join(d, "draft", "_lines.json")) or []
    return {x["id"]: num(x.get("raw_s")) for x in arr if isinstance(x, dict) and "id" in x and num(x.get("raw_s")) is not None}


def export_lab(d, ev):
    """LAB "Paper" shorts: words live in lab.json lines {id, text, onscreen, [who, voice]}. Times from the newest
    vN/plan.json cues. With no plan: real spoken durations from draft/_lines.json (else words / 2.6, min 0.9 s like
    packages/quizlab build.ts), 0.35 s gap between lines. Optional per-line keys (the builder ignores them):
      picture      - short viewer-visible description of what is on screen during the line -> PICTURE row
      pause_after  - seconds of picture-only time after the line (replaces the gap when longer)
      beat         - one viewer-visible sentence of what the picture does in that pause -> PICTURE (n s, no voice) row"""
    lab = load(os.path.join(d, "lab.json")) or {}
    cues, dur = lab_plan(d)
    real = lab_durs(d)
    GAP = 0.35
    cur = 0.35
    end = 0.0
    multi = len({l.get("who") or l.get("voice") for l in lab.get("lines") or [] if l.get("who") or l.get("voice")}) > 1
    for ln in lab.get("lines") or []:
        t = cues.get(ln.get("id"))
        est = t is None
        if est:
            t = cur
        who = ln.get("who")
        kind = f"VOICE ({str(who).capitalize()})" if who and multi else "VOICE"
        ev.add(t, kind, ln.get("text"), est=est)
        ev.add(t, "TEXT", ln.get("onscreen"), est=est)   # on-screen line appears with its spoken line
        if ln.get("picture"):
            ev.add(t, "PICTURE", ln["picture"], est=est)
        d_line = real.get(ln.get("id")) or max(0.9, words(ln.get("text", "")) / 2.6)
        end = t + d_line
        pause = num(ln.get("pause_after")) or 0.0
        if pause > 0:
            ev.add(end, f"PICTURE ({pause:.1f} s, no voice)", ln.get("beat") or "the picture holds, nothing is said", est=est)
        cur = end + max(GAP, pause)
    if dur is None and not cues:
        dur = end + 0.4   # estimated total; with a plan its own duration wins
    for k, label in (("hook", "hook"), ("ending", "ending"), ("comment_ask", "comment ask")):   # only if a lab file carries them
        v = lab.get(k)
        if isinstance(v, str) and v.strip():
            ev.add(0.0 if k == "hook" else None, "TEXT", f"{label}: {v}", est=True)
    return lab, dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--out")
    ap.add_argument("--no-title", action="store_true")
    a = ap.parse_args()
    d = os.path.join(ROOT, "productions", a.id)
    if not os.path.isdir(d):
        sys.exit(f"no production folder {d}")
    ev = Ev()
    if os.path.exists(os.path.join(d, "quiz.json")):
        sc, dur = export_quiz(d, ev)
    elif os.path.exists(os.path.join(d, "lab.json")):
        sc, dur = export_lab(d, ev)
    elif os.path.exists(os.path.join(d, "episode.json")):
        sc, dur = export_kids(d, ev)
    else:
        sc, dur = export_generic(d, ev)
    if not ev.rows:
        sys.exit("nothing to export (no narration or on-screen text found)")
    pk = load(os.path.join(d, "packaging.json")) or {}
    title = pk.get("chosen_title") or sc.get("title") or (sc.get("titles") or {}).get("youtube")
    ev.rows.sort(key=lambda r: (r[0] if r[0] is not None else 1e9, r[2] != "TEXT"))
    last = max(r[0] for r in ev.rows if r[0] is not None)
    out = []
    if title and not a.no_title:
        out.append(f"Title under the video: {title}")
    out.append(f"Length: about {round(dur or last + 2)} s")
    out.append("")
    for t, est, kind, text in ev.rows:
        ts = ("~" if est else "") + (f"{t:.1f}s" if t is not None else "?")
        out.append(f"{ts:>7}  {kind}: {text}")
    txt = "\n".join(out) + "\n"
    if a.out:
        p = a.out if os.path.isabs(a.out) else os.path.join(ROOT, a.out)
        with open(p, "w", encoding="utf8") as f:
            f.write(txt)
    sys.stdout.reconfigure(encoding="utf8")
    sys.stdout.write(txt)


if __name__ == "__main__":
    main()
