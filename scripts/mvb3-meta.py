"""mv-B3: write brief.json + script.json for the four batch-3 lane-B clips from their cutlists."""
import json
FOOT = "Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines. NASA does not endorse this video."
O7 = 'Source: NASA, "Artemis II Crew Discusses Historic Moon Mission at Post-Flight News Conference", April 16, 2026, Johnson Space Center — https://images.nasa.gov/details/art002m1501061829_Artemis_II_Crew_Discusses_Historic_Moon_Mission_at_Post-Flight_News_Conference_250416'
F3 = 'Source: NASA, "Taped Q&A with Michael Collins", July 16, 2019, Kennedy Space Center — https://images.nasa.gov/details/KSC-20190716-VP-CDC01-0001_Taped_Q%26A_with_Collins-3226203'
A13 = 'Source: NASA, "NASA Apollo 13 Veterans Recall Mission 50 Years Later", Johnson Space Center, 2020 — https://images.nasa.gov/details/jsc2020m001403_NASA_Apollo_13_Veterans_Recall_Mission_50_Years_Later-201027'


def attr(s):
    return "Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines; NASA does not endorse this video. " + s


M = {
    "dj4e": dict(asset="src-261021-f3fa", cand="cand-mvb3-wedidit", fam="share_save", cid="F6-3", src=F3, card="Michael Collins", hook="Americans did it? The world disagreed.",
                 title='Apollo 11\'s Michael Collins: "We human beings left this dinky little planet"',
                 first="Share this with a future astronaut.",
                 desc="Michael Collins, Apollo 11 command module pilot, in a NASA interview at Kennedy Space Center on the 50th anniversary of the launch, answering what message he has for the next generation. He recalls the trip he, Neil Armstrong and Buzz Aldrin made around the world right after the landing (\"I think 29 cities\"): he expected people to say \"you Americans finally did it\", but everywhere, he says, \"it was unanimous. They said, we did it.\" He calls it a wonderful unifying moment in our history.\n\nAbout this edit: a near-verbatim excerpt (about 26 s) of one answer; pauses were trimmed and the words are in the original order; the first lines of his answer (the amazement and the 29 cities) were left out. The hook card is editorial, not his words.",
                 tags=["#Apollo11", "#MichaelCollins", "#NASA", "#Moon", "#Astronaut", "#Space"],
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: 'Americans finally did it' is what he says he EXPECTED people to say (quote marks only around his verbatim words); the hook card summarises his contrast ('Uh-uh ... we did it'). Omitted: 'The fact that we went to the moon, I was amazed. And Neil, Buzz and I made a trip around the world ... 29 cities' before the excerpt, and his closing 'whether we can recreate that unification' after it. Speaker confirmed on camera (single close-up). Retention-v1 clip."),
    "xfmp": dict(asset="src-261021-5r4z", cand="cand-mvb3-mirror", fam="subscribe", cid="F1-4", src=A13, card="Fred Haise", hook="Apollo 13's mirror had one typo",
                 title='Apollo 13\'s Fred Haise: "that\'s the only mistake we made"',
                 first="New astronaut story daily. Subscribe.",
                 desc="Fred Haise, Apollo 13 lunar module pilot, with fellow Apollo 13 veterans in the restored Apollo Mission Control for the mission's 50th anniversary. He says the crew took a mirror from the spacecraft, that the inscription \"from the grateful crew\" has a spelling error (engineers, he jokes, \"not really good with English\"), and that without spellcheck \"that's the only mistake we made\". He adds that it means what it says: the crew appreciated the effort of the people who supported them.\n\nAbout this edit: a near-verbatim excerpt (about 26 s) from one answer; pauses were trimmed and the words are in the original order; the passage before it (what else the crew took from the lunar module) and a clause about presenting the gift were left out. The hook card is editorial.",
                 tags=["#Apollo13", "#FredHaise", "#NASA", "#Apollo", "#Astronaut", "#SpaceHistory"],
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: speaker is Fred Haise (centre, blue jacket; verified by mouth movement and by the same seat as clip-261021-7m29); the spelling of the misspelt word is his own spoken letters (captions show them as heard: G-R-E-A-T-ful, G-R-A-T-E); omitted clause between 'it means what it says' and 'we certainly appreciated the effort' is 'we obviously want to present something to tell everybody here that was in the room'. The mirror's later fate/recipient is not stated in the clip. Retention-v1 clip."),
    "4tev": dict(asset="src-261021-o7kw", cand="cand-mvb3-toilet", fam="comment_request", cid="F5-4", src=O7, card="Reid Wiseman", hook="Artemis II toilet: the verdict",
                 title='Artemis II commander on the Orion toilet: "a great piece of gear"',
                 first="Moon or ISS story next? Comment.",
                 desc="Reid Wiseman, commander of Artemis II, was asked at the post-flight news conference about the toilet problems on Orion. He says the toilet itself flushed fine, but the liquid clogged the vent line and the tank, which he guesses holds \"under 10 urination events\", then has to be dumped. He says the engineers should hold their heads high: \"It was a great piece of gear\", and adds that there is always something to improve.\n\nAbout this edit: a near-verbatim excerpt (about 27 s) of one answer; pauses and a false start were trimmed, and two passages were left out (his explanation of the vent line, and the part about watching the tank dump \"a billion little tiny flecks of ice\"). Words are in the original order. The hook card is editorial.",
                 tags=["#Artemis2", "#ReidWiseman", "#NASA", "#Orion", "#Astronaut", "#Moon"],
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: speaker confirmed by name tag (WISEMAN) on a close-up; the questioner (Scientific American) asked about the toilet problems. 'Wonderful toilet' is followed in his answer by 'where we had an issue ... primary vent line' (kept as 'flushed fine, but ... clogged up in our vent line'); omitted: 'where we had an issue, and it was an issue for sure ... primary vent line which takes ...' and the ice-flecks passage; he repeats 'maybe' (kept 'maybe I'm guessing'). The end 'there's always things we need to improve' is his wrap-up. Retention-v1 clip."),
    "xmsi": dict(asset="src-261021-o7kw", cand="cand-mvb3-bang", fam="comment_yesno", cid="F3-4", src=O7, card="Jeremy Hansen", hook="Waiting for Orion to separate",
                 title='Artemis II\'s Jeremy Hansen: "a loud bang ... we\'re all pinned to the floor"',
                 first="Would you volunteer? Comment below.",
                 desc="Jeremy Hansen, Canadian Space Agency astronaut on Artemis II, tells the story of the moment Orion separated from the rocket's upper stage during the proximity operations demonstration: waiting for separation, \"all of a sudden bang, a loud bang\", the crew pinned to the floor, looking at each other: \"I guess we separated. Or it exploded.\" The last seconds are quick comments from other crew members (the camera cuts away from Hansen); the biggest force of the mission, they say, was that separation.\n\nAbout this edit: a near-verbatim excerpt (about 23 s) of one answer; pauses were trimmed, the simulation set-up before it was left out, and words are in the original order. The hook card is editorial.",
                 tags=["#Artemis2", "#JeremyHansen", "#NASA", "#Orion", "#Astronaut", "#Moon"],
                 notes="Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Meaning check: Hansen is on camera (Canadian Space Agency badge, close-up) through 'or it exploded'; after the camera cuts to the wide shot and to Reid Wiseman the lines 'I think ... we just got ejected off of that thing' (a different, unidentified crew voice), 'it was the biggest force we felt on the whole mission' and Wiseman's 'those are some legitimate spring pushers' are other crew members: the description says so and no card attributes them to Hansen. 'ICPS' = interim cryogenic propulsion stage (Wiseman's words earlier in the conference). Omitted: his 'in the simulations we were all worried what if we don't separate ...' set-up and 'trying to tell whether you've separated and the camera views'. Retention-v1 clip."),
}
for k, m in M.items():
    pid = f"clip-261025-{k}"
    base = f"E:/clips-viral/productions/{pid}"
    cl = json.load(open(base + "/cutlist.json", encoding="utf-8"))
    r = []
    for s in cl["segments"]:
        if r and abs(s["src_in"] - r[-1][1]) < 0.01:
            r[-1][1] = s["src_out"]
        else:
            r.append([s["src_in"], s["src_out"]])
    dur = round(sum(s["src_out"] - s["src_in"] for s in cl["segments"]), 2)
    cta = [t for t in cl["texts"] if t["role"] == "cta"][0]["text"]
    brief = {"production_id": pid, "candidate_id": m["cand"],
             "segments": [{"asset_id": m["asset"], "start": r[0][0], "end": r[-1][1], "keep_ranges": r,
                           "boundary_notes": "Joins in measured silence (-40 dB) or at the nearest dip; contiguous splits only change picture size; pauses > 0.26 s removed (retention-v1 R2). Words checked against the audio (whisper small on the assembled cut)."}],
             "duration": dur, "hook_text": m["hook"], "context_card": m["card"], "cta": {"id": m["cid"], "family": m["fam"], "text": cta},
             "context_check": "Speaker's answer reordered? No: passages are in the speaker's own order; omitted passages are listed in script.json notes.",
             "caption_style": "source speech verbatim (caption_clean off), onset snap on", "ruleset": "retention-v1", "arabic_variant": None}
    json.dump(brief, open(base + "/brief.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    on = [{"t": 0.0, "text": m["hook"]}, {"t": 0.0, "text": "Footage: NASA"}, {"t": 2.8, "text": m["card"]}, {"t": "end-3s", "text": cta, "note": "end-card CTA"}]
    script = {"production_id": pid, "hook_text": m["hook"], "narration": [], "cta": {"id": m["cid"], "family": m["fam"], "text": cta}, "on_screen": on,
              "title": m["title"], "description": m["first"] + "\n\n" + m["desc"] + "\n\n" + m["src"] + "\n" + FOOT, "hashtags": m["tags"],
              "attribution_block": attr(m["src"]), "synthetic_media": False, "notes": m["notes"]}
    json.dump(script, open(base + "/script.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(pid, dur, len(m["title"]), len(cta))
