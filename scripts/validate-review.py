"""Validate reviewer JSON files against the workflow v3 contract (audit 2026-11-08 item I9).

usage: python scripts/validate-review.py [--json] [--type T] <file> [<file> ...]
Types (from the file name unless --type): script-doctor | fresh-eyes | panel | packaging | viral | review | fix-ledger | text-check.
  script-doctor*.json            {verdict pass|revise, forecast number|{score}, round>=1, gap_to_gate[], notes}
  fresh-eyes(.script).json       {stage S|V, verdict pass|weak|hate, swipe_at_s number|null, would_share bool, confusions[], gap_to_gate[]}
  panel(.script).json            {stage, personas[{name, reaction, swipe_at_s}], hate_count, swipe_before_payoff_count, block bool, gap_to_gate[]}
  packaging.json                 {titles[], chosen_title, description, hashtags[], score number, altered_content bool (default false), altered_content_reason?}
  viral.json                     {score number 0-100, forecast_delta number|null (render viral - script forecast)}
  review / *.review.json         QA review for review:add {production_id, version, reviewer, breakdown{}, issues[], blockers[], summary}
  fix-ledger.json                {items:[{source, item, applied:true | rejected_reason:"..."}]}
  text-check.json                {pass bool, frames_checked number, issues:[{t, text, problem, fix, owner, blocker?}], gap_to_gate[]} (frame-text-inspector)
  puzzle-judge.json              {stage P|V, rounds:[{n, mechanic, difficulty 1-10, target, correct, single_answer, leak null|str, visual_score, timing_ok, enjoyable, issues[], fix}], pass, gap_to_gate[]} (quiz-ar)
  hunt.json                      {production_id, need{}, queries[{description, platform tiktok}], candidates[{file, url, verdict pick|buffer|drop, reason}], picks[{file, asset_id, role, reason}], gaps[]} (Podium Pop clip-hunter)
  cut-review.json                {stage C|V, entries[{rank, clip, chosen{in,out}, score 0-10, issues[], best_window{in,out}, alt_windows[], crop_note}], order_ok, number1_strongest, pass, gap_to_gate[]} (Podium Pop cut-judge)
gap_to_gate item: {item, now, needed, fix, points, owner, t} (strings are accepted with a warning).
Gate values come from config/gates.json (a reviewer-written `gate` that differs is a warning, never the gate).
Exit 0 = all valid, 1 = at least one malformed file. --json prints {"ok", "files":[{file, type, ok, errors, warnings}]}.
Called by `script:approve` and the approve endpoint (packages/shared/src/gates.ts validateReviewFiles); reviewers run it
on their own output before they finish.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from platform_limits import youtube_limit_issues  # noqa: E402  (owner 2026-11-08 YouTube metadata limits)

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")


def gates():
    f = os.environ.get("STUDIO_GATES") or os.path.join(R, "config", "gates.json")
    try:
        with open(f, encoding="utf-8-sig") as h:
            return json.load(h)
    except (OSError, ValueError):
        return {}


def num(v):
    """number | numeric string | {score|viewer_score|value} -> float or None (same rule as gates.ts numScore)."""
    if isinstance(v, bool) or v is None or v == "":
        return None
    if isinstance(v, dict):
        for k in ("score", "viewer_score", "value", "forecast"):
            if k in v:
                return num(v[k])
        return None
    try:
        x = float(v)
        return x if x == x else None
    except (TypeError, ValueError):
        return None


def kind_of(path):
    b = os.path.basename(path).lower()
    if b.startswith("script-doctor"):
        return "script-doctor"
    if b.startswith("fresh-eyes"):
        return "fresh-eyes"
    if b.startswith("panel"):
        return "panel"
    if b.startswith("packaging"):
        return "packaging"
    if b.startswith("viral") or b.endswith(".viral.json"):
        return "viral"
    if b.startswith("fix-ledger"):
        return "fix-ledger"
    if b.startswith("text-check"):
        return "text-check"
    if b.startswith("puzzle-judge"):
        return "puzzle-judge"
    if "review" in b:
        return "review"
    return None


def check_gaps(j, E, W, need=False, label="gap_to_gate"):
    g = j.get("gap_to_gate")
    if g is None:
        (E if need else W).append(f"{label} missing")
        return []
    if not isinstance(g, list):
        E.append(f"{label} must be a list")
        return []
    if need and not g:
        E.append(f"{label} is empty (a non-passing verdict must list the fixes that clear the gate)")
    for i, x in enumerate(g):
        if isinstance(x, str):
            W.append(f"{label}[{i}] is a string (contract: {{item, now, needed, fix, points, owner, t}})")
        elif isinstance(x, dict):
            if not str(x.get("item") or "").strip():
                E.append(f"{label}[{i}].item missing")
            if not str(x.get("fix") or "").strip():
                E.append(f"{label}[{i}].fix missing")
            if x.get("points") is not None and num(x.get("points")) is None:
                E.append(f"{label}[{i}].points must be a number")
        else:
            E.append(f"{label}[{i}] must be an object")
    return g


def v_doctor(j, E, W, G):
    if str(j.get("verdict", "")).lower() not in ("pass", "revise"):
        E.append(f'verdict must be "pass" or "revise" (got {j.get("verdict")!r})')
    f = num(j.get("forecast"))
    if f is None:
        E.append("forecast missing or not a number / {score: number}")
    elif not 0 <= f <= 100:
        E.append(f"forecast {f} outside 0-100")
    r = num(j.get("round", j.get("pass_n")))
    if r is None or r < 1 or r != int(r):
        E.append("round must be an integer >= 1")
    gate = G.get("script_forecast", 85)
    # brand_overrides (owner 2026-11-08: kids 90): any brand's value is a valid reviewer-written gate (the file has no brand)
    ok = {num(gate)} | {num(o.get("script_forecast")) for k, o in (G.get("brand_overrides") or {}).items()
                        if isinstance(o, dict) and not k.startswith("_") and o.get("script_forecast") is not None}
    if j.get("gate") is not None and num(j.get("gate")) not in ok:
        W.append(f"gate {j.get('gate')} written by the reviewer differs from config/gates.json script_forecast {gate} / brand_overrides (config wins)")
    check_gaps(j, E, W, need=str(j.get("verdict", "")).lower() == "revise")


def v_fresh(j, E, W, G):
    if str(j.get("stage", "")).upper() not in ("S", "V"):
        E.append('stage must be "S" or "V"')
    v = str(j.get("verdict", "")).lower()
    if v not in ("pass", "weak", "hate"):
        E.append(f'verdict must be pass|weak|hate (got {j.get("verdict")!r})')
    if j.get("swipe_at_s") is not None and num(j.get("swipe_at_s")) is None:
        E.append("swipe_at_s must be a number or null")
    if "would_share" in j and not isinstance(j.get("would_share"), bool):
        E.append("would_share must be true/false")
    if "confusions" in j and not isinstance(j.get("confusions"), list):
        E.append("confusions must be a list")
    check_gaps(j, E, W, need=v in ("weak", "hate"))


REACTIONS = {"loved", "liked", "meh", "boring", "hate"}


def v_panel(j, E, W, G):
    if str(j.get("stage", "")).upper() not in ("S", "V"):
        E.append('stage must be "S" or "V"')
    ps = j.get("personas")
    if not isinstance(ps, list) or not ps:
        E.append("personas must be a non-empty list")
        ps = []
    elif len(ps) != 5:
        W.append(f"{len(ps)} personas (contract: 5)")
    hb = 0
    for i, p in enumerate(ps):
        if not isinstance(p, dict):
            E.append(f"personas[{i}] must be an object")
            continue
        r = str(p.get("reaction", "")).lower()
        if r not in REACTIONS:
            E.append(f"personas[{i}].reaction must be one of {sorted(REACTIONS)} (got {p.get('reaction')!r})")
        hb += r in ("hate", "boring")
        if p.get("swipe_at_s") is not None and num(p.get("swipe_at_s")) is None:
            E.append(f"personas[{i}].swipe_at_s must be a number or null")
    for k in ("hate_count", "swipe_before_payoff_count"):
        if num(j.get(k)) is None:
            E.append(f"{k} must be a number")
    if not isinstance(j.get("block"), bool):
        E.append("block must be true/false")
    else:
        rule = hb >= num(G.get("panel_block_hate", 3)) or (num(j.get("swipe_before_payoff_count")) or 0) >= num(G.get("panel_block_swipe", 3))
        if rule and not j["block"]:
            E.append(f"block is false but the contract rule says block ({hb} hate/boring, {j.get('swipe_before_payoff_count')} swipe before payoff)")
    check_gaps(j, E, W, need=bool(j.get("block")))


def v_packaging(j, E, W, G):
    t = j.get("titles")
    if not isinstance(t, list) or not t:
        E.append("titles must be a non-empty list")
    elif len(t) != 3:
        W.append(f"{len(t)} titles (contract: 3)")
    if not str(j.get("chosen_title") or "").strip():
        E.append("chosen_title missing")
    if "description" in j and j["description"] is not None and not isinstance(j["description"], str):
        E.append("description must be a string")
    h = j.get("hashtags")
    if h is not None and not (isinstance(h, list) and all(isinstance(x, str) for x in h)):
        E.append("hashtags must be a list of strings")
    # YouTube limits on the packaged surface (owner 2026-11-08; scripts/platform_limits.py). Credits/script fallback are added at
    # publish time (prelint + publish-plan.py check the full text); here: chosen_title, description + hashtag line, tags.
    if str(j.get("chosen_title") or "").strip():
        hs = [x for x in (h or []) if isinstance(x, str)] if isinstance(h, list) else []
        d = j["description"] if isinstance(j.get("description"), str) else ""
        line = " ".join(hs)
        for i in youtube_limit_issues(str(j["chosen_title"]), d + ("\n\n" + line if line and line not in d else ""), [x.lstrip("#") for x in hs]):
            E.append("YouTube limit: " + i["message"])
    # altered_content (owner 2026-11-08): YouTube altered/synthetic setting on upload (status.containsSyntheticMedia). true ONLY for
    # realistic depictions of real people/events that did not happen; default false. A platform setting, never text.
    ac = j.get("altered_content")
    if ac is None:
        W.append("altered_content missing (treated as false; packaging-director decides it per video)")
    elif not isinstance(ac, bool):
        E.append("altered_content must be true or false")
    elif ac and not str(j.get("altered_content_reason") or "").strip():
        W.append("altered_content true without altered_content_reason (which real person/event is depicted realistically)")
    s = num(j.get("score"))
    if s is None:
        E.append("score missing or not a number")
    check_gaps(j, E, W, need=s is not None and s < num(G.get("packaging", 85)))


def v_viral(j, E, W, G):
    s = num(j.get("score"))
    if s is None:
        E.append("score missing or not a number")
    elif not 0 <= s <= 100:
        E.append(f"score {s} outside 0-100")
    if "forecast_delta" in j and j["forecast_delta"] is not None and num(j["forecast_delta"]) is None:
        E.append("forecast_delta must be a number (render viral - script forecast) or null")
    elif "forecast_delta" not in j:
        W.append("forecast_delta missing (render viral - script forecast; qa-director writes it)")
    check_gaps(j, E, W)


def v_review(j, E, W, G):
    for k in ("production_id", "reviewer", "summary"):
        if not isinstance(j.get(k), str) or not j.get(k):
            E.append(f"{k} must be a non-empty string")
    v = num(j.get("version"))
    if v is None or v < 1 or v != int(v):
        E.append("version must be an integer >= 1")
    if not isinstance(j.get("breakdown"), dict):
        E.append("breakdown must be an object")
    else:
        for k, x in j["breakdown"].items():
            if num(x) is None:
                E.append(f"breakdown.{k} must be a number")
    if not isinstance(j.get("blockers"), list):
        E.append("blockers must be a list")
    iss = j.get("issues")
    if not isinstance(iss, list):
        E.append("issues must be a list")
    else:
        for i, x in enumerate(iss):
            if not isinstance(x, dict):
                E.append(f"issues[{i}] must be an object")
                continue
            for k in ("t", "severity", "issue", "fix", "owner"):
                if not isinstance(x.get(k), str):
                    E.append(f"issues[{i}].{k} must be a string")
            if x.get("severity") not in ("blocker", "major", "minor"):
                E.append(f"issues[{i}].severity must be blocker|major|minor")


def v_ledger(j, E, W, G):
    items = j.get("items") if isinstance(j, dict) else j
    if not isinstance(items, list):
        E.append("items must be a list")
        return
    for i, x in enumerate(items):
        if not isinstance(x, dict):
            E.append(f"items[{i}] must be an object")
            continue
        if not str(x.get("item") or "").strip():
            E.append(f"items[{i}].item missing (copy the gap_to_gate item text)")
        if not str(x.get("source") or "").strip():
            E.append(f"items[{i}].source missing (fresh-eyes | panel | script-doctor ...)")
        if x.get("applied") is not True and not str(x.get("rejected_reason") or "").strip():
            E.append(f"items[{i}] needs applied: true or a rejected_reason")


def v_text_check(j, E, W, G):
    """frame-text-inspector output (owner 2026-11-08): every on-screen text readable, not cut, not under UI, not covering the subject."""
    if not isinstance(j.get("pass"), bool):
        E.append("pass must be true|false")
    iss = j.get("issues")
    if not isinstance(iss, list):
        E.append("issues must be a list ([] when clean)")
        iss = []
    for i, x in enumerate(iss):
        if not isinstance(x, dict):
            E.append(f"issues[{i}] must be an object {{t, text, problem, fix, owner}}")
            continue
        if num(x.get("t")) is None:
            E.append(f"issues[{i}].t (seconds) missing or not a number")
        for k in ("text", "problem", "fix", "owner"):
            if not str(x.get(k) or "").strip():
                E.append(f"issues[{i}].{k} missing")
    if j.get("pass") is True and any(isinstance(x, dict) and (x.get("blocker") or str(x.get("severity", "")).lower() == "blocker") for x in iss):
        E.append("pass is true but an issue is marked blocker (any cut/unreadable text is a blocker -> pass false)")
    if num(j.get("frames_checked")) is None:
        W.append("frames_checked missing (how many 360 px frames were looked at, <= 16)")
    check_gaps(j, E, W, need=j.get("pass") is False)


V = {"text-check": v_text_check, "script-doctor": v_doctor, "fresh-eyes": v_fresh, "panel": v_panel, "packaging": v_packaging, "viral": v_viral, "review": v_review, "fix-ledger": v_ledger}


def v_puzzle_judge(j, E, W, G):
    """quiz-ar puzzle-judge (owner 2026-11-08): blockers = wrong/ambiguous/leaking round, difficulty <= 3, broken visual; gate = pass + mean enjoyable >= puzzle_enjoy."""
    if j.get("stage") not in ("P", "V"):
        E.append("stage must be P|V")
    rs = j.get("rounds")
    if not isinstance(rs, list) or not rs:
        E.append("rounds must be a non-empty list")
        rs = []
    block, enj = [], []
    for i, r in enumerate(rs):
        if not isinstance(r, dict):
            E.append(f"rounds[{i}] must be an object")
            continue
        d = num(r.get("difficulty"))
        if d is None or not 1 <= d <= 10:
            E.append(f"rounds[{i}].difficulty must be 1-10")
        for k in ("correct", "single_answer", "timing_ok"):
            if not isinstance(r.get(k), bool):
                E.append(f"rounds[{i}].{k} must be true|false")
        for k in ("visual_score", "enjoyable"):
            v = num(r.get(k))
            if v is None or not 0 <= v <= 10:
                E.append(f"rounds[{i}].{k} must be 0-10")
        if num(r.get("enjoyable")) is not None:
            enj.append(num(r.get("enjoyable")))
        if "leak" not in r:
            E.append(f"rounds[{i}].leak missing (null when clean)")
        if not isinstance(r.get("issues", []), list):
            E.append(f"rounds[{i}].issues must be a list")
        if r.get("correct") is False or r.get("single_answer") is False or r.get("leak") or (d is not None and d <= 3) or (num(r.get("visual_score")) is not None and num(r.get("visual_score")) < 4):
            block.append(i)
    if not isinstance(j.get("pass"), bool):
        E.append("pass must be true|false")
    gate = num(G.get("puzzle_enjoy")) or 7
    mean = sum(enj) / len(enj) if enj else 0
    if j.get("pass") is True and block:
        E.append(f"pass is true but rounds {block} hit a blocker (wrong/ambiguous/leak/difficulty <= 3/broken visual < 4)")
    if j.get("pass") is True and enj and mean < gate:
        E.append(f"pass is true but mean enjoyable {mean:.1f} < gate {gate:g}")
    check_gaps(j, E, W, need=j.get("pass") is False)


V["puzzle-judge"] = v_puzzle_judge


def _win(w, label, E):
    if not isinstance(w, dict) or num(w.get("in")) is None or num(w.get("out")) is None:
        E.append(f"{label} must be {{in, out}} (seconds)")
    elif num(w["out"]) <= num(w["in"]):
        E.append(f"{label}.out must be after in")


def v_cut_review(j, E, W, G):
    """Podium Pop cut-judge (2026-11-08): pass = every entry >= cut_entry_min AND number1_strongest AND no payoff cut off."""
    if j.get("stage") not in ("C", "V"):
        E.append("stage must be C|V")
    es = j.get("entries")
    if not isinstance(es, list) or not es:
        E.append("entries must be a non-empty list")
        es = []
    # cut-review is Podium Pop only: its brand_overrides value wins (owner 2026-11-08: 7)
    gate = num(((G.get("brand_overrides") or {}).get("viral-rankings") or {}).get("cut_entry_min")) or num(G.get("cut_entry_min")) or 8
    low = []
    for i, e in enumerate(es):
        if not isinstance(e, dict):
            E.append(f"entries[{i}] must be an object")
            continue
        if num(e.get("rank")) is None:
            E.append(f"entries[{i}].rank missing")
        sc = num(e.get("score"))
        if sc is None or not 0 <= sc <= 10:
            E.append(f"entries[{i}].score must be 0-10")
        elif sc < gate:
            low.append(e.get("rank"))
        _win(e.get("chosen"), f"entries[{i}].chosen", E)
        _win(e.get("best_window"), f"entries[{i}].best_window", E)
        if not isinstance(e.get("issues", []), list) or not isinstance(e.get("alt_windows", []), list):
            E.append(f"entries[{i}].issues/alt_windows must be lists")
    if j.get("stage") == "C" and es and len(es) != 5:
        W.append(f"{len(es)} entries (Podium Pop is always TOP 5)")
    for k in ("order_ok", "number1_strongest", "pass"):
        if not isinstance(j.get(k), bool):
            E.append(f"{k} must be true|false")
    if j.get("pass") is True and (low or j.get("number1_strongest") is False):
        E.append(f"pass is true but entries {low} < gate {gate:g} or number1_strongest is false")
    check_gaps(j, E, W, need=j.get("pass") is False)


def v_hunt(j, E, W, G):
    """Podium Pop clip-hunter hunt.json (2026-11-08); agent hunts are TikTok-only (YouTube = owner-run)."""
    for k in ("queries", "candidates", "picks", "gaps"):
        if not isinstance(j.get(k), list):
            E.append(f"{k} must be a list")
    if not isinstance(j.get("need"), dict):
        E.append("need must be an object {subject, criterion, number1_must_show}")
    for i, q in enumerate(j.get("queries") or []):
        if not isinstance(q, dict) or not str(q.get("description") or "").strip():
            E.append(f"queries[{i}].description missing")
        elif str(q.get("platform", "tiktok")).lower() != "tiktok":
            E.append(f"queries[{i}].platform {q.get('platform')!r}: agent hunts are TikTok-only (YouTube hunts are owner-run)")
    for i, c in enumerate(j.get("candidates") or []):
        if not isinstance(c, dict) or c.get("verdict") not in ("pick", "buffer", "drop"):
            E.append(f"candidates[{i}].verdict must be pick|buffer|drop")
        elif not str(c.get("reason") or "").strip():
            W.append(f"candidates[{i}].reason missing")
    for i, p in enumerate(j.get("picks") or []):
        if not isinstance(p, dict) or not p.get("file"):
            E.append(f"picks[{i}].file missing")
        elif not p.get("asset_id"):
            W.append(f"picks[{i}] has no asset_id (not registered with library:register yet)")
    if isinstance(j.get("picks"), list) and len(j["picks"]) < 5:
        W.append(f"only {len(j['picks'])} picks (TOP 5 needs 8-15 incl. buffers)")


V["cut-review"] = v_cut_review
V["hunt"] = v_hunt
_kind_of_base = kind_of


def kind_of(path):  # noqa: F811 - extends the base detector (cut-review contains "review")
    b = os.path.basename(path).lower()
    if b.startswith("cut-review") or b.endswith(".cut-review.json") or b.startswith("cut-review-"):
        return "cut-review"
    if b.startswith("hunt"):
        return "hunt"
    return _kind_of_base(path)


def validate(path, kind=None, G=None):
    G = G if G is not None else gates()
    kind = kind or kind_of(path)
    E, W = [], []
    if kind not in V:
        return dict(file=path, type=kind, ok=False, errors=[f"unknown file type (use --type {'|'.join(V)})"], warnings=[])
    try:
        with open(path, encoding="utf-8-sig") as h:
            j = json.load(h)
    except OSError as e:
        return dict(file=path, type=kind, ok=False, errors=[f"cannot read: {e}"], warnings=[])
    except ValueError as e:
        return dict(file=path, type=kind, ok=False, errors=[f"not valid JSON: {e}"], warnings=[])
    if kind != "fix-ledger" and not isinstance(j, dict):
        E.append("top level must be an object")
    else:
        V[kind](j, E, W, G)
    return dict(file=path, type=kind, ok=not E, errors=E, warnings=W)


def main(argv):
    as_json = "--json" in argv
    kind = argv[argv.index("--type") + 1] if "--type" in argv else None
    skip = {"--json", "--type", kind}
    files = [a for a in argv if a not in skip]
    if not files:
        print(__doc__)
        return 2
    G = gates()
    res = [validate(f, kind, G) for f in files]
    ok = all(r["ok"] for r in res)
    if as_json:
        print(json.dumps(dict(ok=ok, files=res), ensure_ascii=False))
    else:
        for r in res:
            print(f"{'ok  ' if r['ok'] else 'FAIL'} {r['file']} ({r['type']})")
            for e in r["errors"]:
                print(f"   error: {e}")
            for w in r["warnings"]:
                print(f"   warning: {w}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
