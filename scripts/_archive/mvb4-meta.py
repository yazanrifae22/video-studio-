"""mv-B4: write brief.json + script.json for the batch-4 lane-B clips from their cutlists.
usage: python scripts/mvb4-meta.py [suffix ...]   (default: every clip in M that has a cutlist)"""
import json, sys

FOOT = "Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines. NASA does not endorse this video."
A11 = 'Source: NASA Kennedy Space Center archive, "Apollo 11 - 20th Anniversary Crew Interviews" (the 1989 Apollo 11 20th anniversary press conference) — https://images.nasa.gov/details/KSC-19890701-MH-NAS01-0001-Apollo_11_20th_Anniversary_Crew_Interviews-B_2146'
AR_CREW = 'Source: NASA Johnson Space Center, "Artemis II Crew News Conference - 9-24-2025" (Artemis Media Days) — https://images.nasa.gov/details/jsc2025m000167-Artemis_Media_Days-Artemis_Crew_News_Conference'


def attr(s):
    return "Footage: NASA. NASA media, generally not subject to U.S. copyright; used under NASA media usage guidelines; NASA does not endorse this video. " + s


M = {
    "is1d": dict(
        asset="src-261021-mh9v", cand="cand-mvb4-sunrise", fam="comment_opinion", cid="F4-4", src=A11, card="Buzz Aldrin",
        hook="Aldrin: 20 minutes alone up there",
        title='Buzz Aldrin on Apollo 11 launch morning: "I could watch the sunrise"',
        first="One word for this moment? Comment it.",
        desc=("Buzz Aldrin, Apollo 11 lunar module pilot, at the 1989 Apollo 11 20th anniversary press conference, answering a reporter's question about entering the spacecraft on launch morning. "
              "He says that while the pad crew were installing Mike Collins and Neil Armstrong into the spacecraft he had \"what seemed like about 20 minutes\" waiting by himself, two-thirds of the way up. "
              "In this excerpt he says: \"I could watch the sunrise and watch the waves coming in moments before this giant Saturn was going to burst into action and propel us off\", "
              "and calls it \"a most memorable moment looking out and seeing some evidence of the millions of people and yet not any precise indication that there were that many people paying attention to what we were doing at that very moment.\" "
              "The excerpt ends mid-sentence on: \"Here I was just wandering around, they didn't know that I was wandering around\".\n\n"
              "About this edit: a verbatim excerpt (about 27 s) of one answer, in the original order. Short pauses were trimmed. Left out: the sentences before it (the 20 minutes waiting by himself, walking around briefly with his little air conditioning unit), the rest of the last sentence (\"the upper portions of this, looking, looking out at them\") and what follows (the brief realization he says he had later on the surface). The hook card is editorial."),
        tags=["#Apollo11", "#BuzzAldrin", "#NASA", "#SpaceHistory", "#Saturn5", "#Astronaut"],
        notes=("Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Speaker verified on camera (single close-up of Aldrin, gesturing; same camera as his other answers; ASR text matches his 'Men from Earth' book remarks elsewhere). "
               "The reporter's question (Dan Billow, WESH-TV, about entering the Apollo spacecraft and Guenter Wendt) is NOT in the clip; the hook card says '20 minutes alone up there' which is his own 'what seemed like about 20 minutes waiting by myself', said just before the excerpt. "
               "1989 archive video (NASA KSC), SD and soft by nature; no third-party footage; the NASA logo is part of the original studio set. Retention-v1 clip.")),
    "wfam": dict(
        asset="src-261021-mh9v", cand="cand-mvb4-bored", fam="comment_opinion", cid="F4-2", src=A11, card="Neil Armstrong",
        hook="Armstrong: wonder fades in a year",
        title='Neil Armstrong, 1989: "We sort of are amazed by, enthralled by, then bored by"',
        first="Best line here? Quote it below.",
        desc=("Neil Armstrong, Apollo 11 commander, at the 1989 Apollo 11 20th anniversary press conference. A reporter said many people had become blase about the space program and asked what it would take to get people more excited about human endeavors in space. "
              "Armstrong answers: \"Well, it's human nature to adapt very quickly to new situations. We sort of are amazed by, enthralled by, then bored by, and eventually forget some new things, usually within one revolution of the Earth around the Sun. "
              "That's the way humans are, and so it's a great surprise to me that so many people remember something that happened 20 years ago.\"\n\n"
              "About this edit: a verbatim excerpt (about 27 s) of one answer, in the original order. Short pauses were trimmed. Left out: his closing words after it (\"Doesn't surprise me\"). The hook card is editorial; the 'a year' refers to his own 'one revolution of the Earth around the Sun'."),
        tags=["#Apollo11", "#NeilArmstrong", "#NASA", "#SpaceHistory", "#Moon", "#Astronaut"],
        notes=("Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Speaker verified on camera (single close-up of Armstrong, mouth moving through the excerpt). "
               "The reporter's question (Alan Silverman, Voice of America) is paraphrased in the description, not in the clip. The excerpt is his complete answer except the trailing 'Doesn't surprise me.' (cut because the pause before it and the next sentence are another thought). "
               "1989 archive video (NASA KSC), SD and soft by nature; no third-party footage. Retention-v1 clip.")),
    "tqfb": dict(
        asset="src-261021-mh9v", cand="cand-mvb4-direction", fam="share_save", cid="F6-4", src=A11, card="Michael Collins",
        hook="Collins: the Moon is a direction",
        title="Michael Collins, 1989: \"I don't really think of it so much as a place, as a direction\"",
        first="Send this to a friend who'd go to Mars.",
        desc=("Michael Collins, Apollo 11 command module pilot, in his opening statement at the 1989 Apollo 11 20th anniversary press conference. "
              "He says: \"And the moon, as I think back on it, I don't really think of it so much as a place, as a direction. I think the moon, to me, represents out there. "
              "And at this stage in the development of NASA, of the space program, I think out there really points to Mars, so that when I think of the moon today, I really don't think of it as a destination but as a stepping stone to more interesting places like Mars and perhaps Titan, one of Saturn's moons.\"\n\n"
              "About this edit: a verbatim excerpt (about 29 s) of one passage, in the original order. Short pauses were trimmed. Left out: the sentences before it (that he has seen the Earth from a far distance and the Moon up close, and that the Earth is a very small and fragile planet) and his words after it. The hook card is editorial."),
        tags=["#Apollo11", "#MichaelCollins", "#NASA", "#SpaceHistory", "#Moon", "#Mars"],
        notes=("Original speech only; no narration, no TTS. Credit says 'Footage: NASA'. Speaker verified on camera: the broadcast lower third reads 'Micheal Collins' (sic) during his statement and the single close-up shows him speaking. "
               "Omitted: the preceding sentences about seeing the Earth from afar ('a very small and fragile planet'), which are a separate thought; the clip begins at 'And the moon'. 'It' = the Moon (antecedent inside the sentence). The CTA 'Send this to a friend who'd go to Mars' is our ask, not a claim by Collins. "
               "1989 archive video (NASA KSC), SD and soft by nature; no third-party footage. Retention-v1 clip.")),
}

if __name__ == "__main__":
    keys = sys.argv[1:] or list(M)
    for k in keys:
        m = M[k]
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
                               "boundary_notes": "Joins in measured silence or at the nearest dip; contiguous splits only change picture size; pauses > 0.26 s removed (retention-v1 R2). Words checked against the audio (whisper small on the assembled cut)."}],
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
