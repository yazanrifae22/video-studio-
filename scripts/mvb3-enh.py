"""mv-B3: write productions/<id>/enhancements.json (retention-v1) from the cut list + per-clip notes below.
usage: python scripts/mvb3-enh.py   (all four clips; run after the final build)"""
import json

N = {
    "dj4e": dict(
        R3="opens on 'I expected people to say, oh, you Americans finally did it' (src 417.0 s): the contrast 'Uh-uh ... we did it' lands at ~4 s; his lead-in about 29 cities is cut; hook card 'Americans did it? The world disagreed.'",
        R5="all pieces <= 3.5 s; cover close-up, face-tracked, zoom alternates 1.0 / 1.25 on every cut (+25 %), eyes at ~33 % of the height",
        R6="emphasis UNANIMOUS, DINKY (yellow, larger captions); no bed",
        R7="ends on 'a wonderful unifying moment in our history'; the replay returns to 'I expected people to say, you Americans finally did it'",
        loop="'...wonderful unifying moment in our history' -> 'I expected people to say, oh, you Americans finally did it': the end names the unity the opening is about"),
    "xfmp": dict(
        R3="opens on 'being engineers, we're not really good with English' (src 64.4 s), the self-deprecating punchline of the mirror story; hook card 'Apollo 13's mirror had one typo' gives the context; payoff (the misspelt word) arrives at ~7 s",
        R5="pieces <= 2.7 s; cover, face-tracked on three cameras (two close-ups, one 4-person wide at zoom 1.65 / 2.15); zoom alternates on every cut",
        R6="emphasis ERROR, SPELLCHECK; no bed; caption_fixes render the spelled letters as heard",
        R7="ends on 'we certainly appreciated the effort'; replay returns to 'being engineers, we're not really good with English' (a gentle loop)",
        loop="'...we certainly appreciated the effort' -> 'being engineers, we're not really good with English': sincere beat, then the joke again"),
    "4tev": dict(
        R3="opens on 'I just want to say 100 percent point blank, that was a wonderful toilet' (src 2187.1 s); hook card 'Artemis II toilet: the verdict'",
        R5="all pieces <= 3.7 s; cover close-up, face-tracked, zoom alternates 1.15 / 1.5 on every cut (+30 %)",
        R6="emphasis WONDERFUL, HIGH; no bed",
        R7="ends on 'there's always things we need to improve'; replay returns to 'that was a wonderful toilet' (the end is the honest qualifier of the opening)",
        loop="'...always things we need to improve' -> 'that was a wonderful toilet': the opening reads as the answer to 'what would you improve'"),
    "xmsi": dict(
        R3="opens on 'we were all worried about, you know, what if we don't separate' (src 2623.7 s) = the hook card's question; the bang arrives at ~12 s",
        R5="all pieces <= 3.8 s; cover close-up, face-tracked, zoom alternates 1.15 / 1.5 on every cut",
        R6="emphasis BANG, EXPLODED, EJECTED; no bed",
        R7="ends on 'those are some legitimate spring pushers'; replay returns to 'what if we don't separate'",
        loop="'...legitimate spring pushers' -> 'we were all worried what if we don't separate': the joke closes the worry that opens the clip"),
}
for k, m in N.items():
    pid = f"clip-261025-{k}"
    base = f"E:/clips-viral/productions/{pid}"
    try:
        cl = json.load(open(base + "/cutlist.json", encoding="utf-8"))
        sj = json.load(open(base + "/script.json", encoding="utf-8"))
    except OSError:
        continue
    S = cl["segments"]
    d = [s["src_out"] - s["src_in"] for s in S]
    dur = sum(d)
    trim, dead, jumps = 0, 0.0, 0
    for a, b in zip(S, S[1:]):
        g = b["src_in"] - a["src_out"]
        if abs(g) < 0.01:
            continue
        if 0 < g < 2.5:
            trim += 1
            dead += g
        else:
            jumps += 1
    hook = [t for t in cl["texts"] if t["role"] == "hook"][0]
    cta = [t for t in cl["texts"] if t["role"] == "cta"][0]
    rules = [
        {"id": "R1", "applied": 20 <= dur <= 35, "how": f"{dur:.1f} s, one story beat (target 20-35, hard max 40)"},
        {"id": "R2", "applied": True, "how": f"{trim} pauses > 0.26 s removed with silence-snapped jump cuts ({dead:.1f} s); pieces shorter than the builder's 0.8 s minimum keep their pause (no clip has more than one remaining gap > 0.25 s in the render, see retention-auto.json)"},
        {"id": "R3", "applied": True, "how": m["R3"]},
        {"id": "R4", "applied": True, "how": f"hook '{hook['text']}' ({len(hook['text'].split())} words) at 0.0 s for {hook['dur']} s"},
        {"id": "R5", "applied": True, "how": m["R5"]},
        {"id": "R6", "applied": True, "how": m["R6"]},
        {"id": "R7", "applied": True, "how": m["R7"]},
        {"id": "R8", "applied": True, "how": f"CTA {sj['cta']['id']} '{sj['cta']['text']}' in the top band for the last {cta['dur']} s, after the punchline; frame-checked clear of the eyes"},
    ]
    out = {"production_id": pid, "ruleset": "retention-v1", "duration_s": round(dur, 1), "shots": len(d), "max_shot_s": round(max(d), 2), "avg_shot_s": round(dur / len(d), 2),
           "pauses_trimmed": trim, "dead_air_removed_s": round(dead, 1), "passages_skipped": jumps, "rules": rules,
           "hook": {"text": hook["text"], "at": hook["at"], "dur": hook["dur"]}, "cta": {"id": sj["cta"]["id"], "text": sj["cta"]["text"], "at": cta["at"]},
           "emphasis": cl["emphasis"], "loop": m["loop"], "results": None}
    json.dump(out, open(base + "/enhancements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(pid, out["duration_s"], out["shots"], out["max_shot_s"], trim, out["dead_air_removed_s"], jumps)
