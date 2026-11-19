"""mv-BK: write brief.json + script.json for the three backup clips from their cutlists."""
import json
T_URL = "https://images.nasa.gov/details/iss073m262322015_NASA%E2%80%99s_SpaceX_Crew-10_Post-Flight_News_Conference_250820"
T_LINE = f'Source: NASA, "NASA\'s SpaceX Crew-10 Post-Flight News Conference", August 20, 2025, Johnson Space Center — {T_URL}'
C_URL = "https://images.nasa.gov/details/iss070m260851828-Crew-7_Post-Flight_News_Conference_240325_1971088"
C_LINE = f'Source: NASA, "NASA\'s SpaceX Crew-7 Post-Flight News Conference", March 25, 2024, Johnson Space Center — {C_URL}'
FOOT = "Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines. NASA does not endorse this video."


def attr(name, date, url):
    return f"Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines; NASA does not endorse this video. Source: {name}, {date}, NASA Johnson Space Center — {url}"


M = {
    "e2pk": dict(asset="src-261024-t8j7", cand="cand-mvbk-hard", fam="comment_opinion", cid="F4-B", line=T_LINE,
                 att=attr("NASA's SpaceX Crew-10 Post-Flight News Conference", "August 20, 2025", T_URL),
                 title='NASA astronaut Anne McClain: "We can do hard things"', card="Anne McClain", hook="Bad time for space?",
                 tags=["#NASA", "#Astronaut", "#Crew10", "#AnneMcClain", "#Artemis", "#SpaceExploration"],
                 intro="NASA astronaut Anne McClain, commander of SpaceX Crew-10, was asked what it is like to serve at a pivotal time in human spaceflight, with four colleagues about to fly around the Moon on Artemis II. She answers that \"we can do hard things and we can do multiple things at once,\" and that she will be proud to tell her grandkids what the crew was doing in 2025.",
                 omitted_before="her lead-in about the 1960s (\"It wasn't. You know, there's a lot going on, but our country and our international partners,\")",
                 omitted_after="her closing sentence (\"And so I think it's a great time to be working with this agency\")",
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: she is answering about serving at NASA during the Artemis II lead-up; the clip starts mid-sentence at 'we can do hard things' (her subject 'our country and our international partners' is cut; the hook card carries the context), and ends on her own sentence about grandkids. Her order is unchanged; only pauses were removed. Speaker name per NASA bio: Anne McClain."),
    "ttaf": dict(asset="src-261024-t8j7", cand="cand-mvbk-iss", fam="like", cid="F7-B", line=T_LINE,
                 att=attr("NASA's SpaceX Crew-10 Post-Flight News Conference", "August 20, 2025", T_URL),
                 title='NASA astronaut Anne McClain: "full confidence in the safety of the space station"', card="Anne McClain", hook="Is the ISS still safe?",
                 tags=["#NASA", "#Astronaut", "#ISS", "#Crew10", "#AnneMcClain", "#SpaceStation"],
                 intro="NASA astronaut Anne McClain, commander of SpaceX Crew-10, was asked by a reporter whether the 25-year-old International Space Station is holding up. She answers, \"I have full confidence in the safety of the space station, both this mission and last mission,\" says upgrades such as the rollout solar arrays were \"just an idea\" when she last flew, and adds that the systems \"have to be absolutely safe\" until the station's last day. These are her statements, not a NASA safety assessment.",
                 omitted_before="the reporter's question and her earlier explanation of why the station keeps being upgraded (her previous sentence ends \"...we have to continually upgrade these systems\")",
                 omitted_after="nothing of the answer; the next speaker is the moderator",
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: the answer opens on her own conclusion ('I have full confidence in the safety of the space station'); the reporter's question is not heard but the hook card poses it. 'Those systems' in the last sentence refers to the systems and upgrades she names in the clip itself. Her order is unchanged; only pauses were removed. Speaker name per NASA bio: Anne McClain. The Like ask is editorial."),
    "fzv3": dict(asset="src-261024-t8j7", cand="cand-mvbk-commercial", fam="comment_request", cid="F5-B", line=T_LINE,
                 att=attr("NASA's SpaceX Crew-10 Post-Flight News Conference", "August 20, 2025", T_URL),
                 title='NASA astronaut Anne McClain on commercial space: "jaw dropping"', card="Anne McClain", hook="Can't even comprehend what's next",
                 tags=["#NASA", "#Astronaut", "#Crew10", "#AnneMcClain", "#CommercialSpace", "#LowEarthOrbit"],
                 intro="NASA astronaut Anne McClain, commander of SpaceX Crew-10, was asked whether space labs could one day make custom organs for transplant. She says the crew lacks the expertise to answer that, but that when commercial companies get involved in low Earth orbit, \"I don't think we can even comprehend the advances that they're going to make,\" calls it \"jaw dropping,\" and compares enabling commercial spaceflight to \"having kids.\" These are her personal views.",
                 omitted_before="her opening words about technology gains between her first and second flights (the clip starts mid-sentence at \"when we can get commercial companies involved in low Earth orbit\")",
                 omitted_after="her remark that commercial companies will be interesting to watch over the next 10 years",
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: the answer to the organ question is that none of the panel has the expertise (cut before the clip); the clip is her broader view on commercial LEO. One middle passage is removed (about private astronaut missions bringing things nobody had thought of); 'it' in 'I think it's going to be jaw dropping' still refers to the advances she just named. Speaker name per NASA bio: Anne McClain."),
}


def merged(cl):
    r = []
    for s in cl["segments"]:
        if r and abs(s["src_in"] - r[-1][1]) < 0.01:
            r[-1][1] = s["src_out"]
        else:
            r.append([s["src_in"], s["src_out"]])
    return r


for k, m in M.items():
    pid = f"clip-261025-{k}"
    base = f"E:/clips-viral/productions/{pid}"
    cl = json.load(open(base + "/cutlist.json", encoding="utf-8"))
    kr = merged(cl)
    speech = round(sum(s["src_out"] - s["src_in"] for s in cl["segments"]), 1)
    cta = [t for t in cl["texts"] if t["role"] == "cta"][0]["text"]
    gaps = [f"{a[1]:.2f}-{b[0]:.2f}" for a, b in zip(kr, kr[1:])]
    cuts = (f"About this edit: a near-verbatim excerpt ({speech:.0f} s of speech plus a 3 s end card) of one answer, in the speaker's own order, from source time {kr[0][0]:.2f} s to {kr[-1][1]:.2f} s. "
            f"Left out before it: {m['omitted_before']}. Left out after it: {m['omitted_after']}. "
            f"{len(gaps)} pauses were removed (source seconds): {', '.join(gaps)}. "
            "The on-screen cards are editorial, not the speaker's words.")
    desc = f"{cta}.\n\n{m['intro']}\n\n{cuts}\n\n{m['line']}\n{FOOT}"
    brief = {"production_id": pid, "candidate_id": m["cand"],
             "segments": [{"asset_id": m["asset"], "start": kr[0][0], "end": kr[-1][1], "keep_ranges": kr,
                           "boundary_notes": "In/out points in measured silence (10 ms RMS) or at the nearest word edge; contiguous splits only change picture size; pauses >= 0.26 s removed (retention-v1 R2); no word stubs at joins (checked by ear-equivalent ASR on the assembled cut)."}],
             "duration": cl["target_duration"], "speech_duration": speech, "hook_text": m["hook"], "context_card": m["card"], "cta": {"id": m["cid"], "family": m["fam"], "text": cta},
             "context_check": "Speaker's answer reordered? No. Omitted passages are listed in script.json notes and the description.",
             "caption_style": "source speech verbatim (caption_clean off), onset snap on", "ruleset": "retention-v1", "arabic_variant": None}
    json.dump(brief, open(base + "/brief.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    on = [{"t": 0.0, "text": m["hook"]}, {"t": 0.0, "text": "Footage: NASA"}, {"t": 2.8, "text": m["card"]}, {"t": "end of last word", "text": cta, "note": "end-card CTA on the 3 s hold"}]
    script = {"production_id": pid, "hook_text": m["hook"], "narration": [], "cta": {"id": m["cid"], "family": m["fam"], "text": cta}, "on_screen": on,
              "title": m["title"], "description": desc, "hashtags": m["tags"], "attribution_block": m["att"], "synthetic_media": False, "notes": m["notes"]}
    json.dump(script, open(base + "/script.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(pid, len(m["title"]), len(cta), speech)
