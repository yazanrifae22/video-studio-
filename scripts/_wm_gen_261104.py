import json, sys
ROOT = "E:/clips-viral/productions/"

def seg(asset, a, b, why, trim=None, zoom=1.3):
    if asset.startswith("src-261031") and trim is None: trim = {"top": 0, "bottom": 0, "left": 160, "right": 160}
    d = {"asset_id": asset, "src_in": a, "src_out": b, "fill": "blur", "zoom": zoom, "mute_source": True, "why": why}
    if trim: d["trim"] = trim
    return d

def write(pid, name, obj):
    with open(ROOT + pid + "/" + name, "w", encoding="utf8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)

VOICE = {"voice": "Charon", "style": "Warm documentary narrator, confident and clear, unhurried, specific; no hype. Read every line in full."}

# ---------- eca7 Green Run ----------
pid = "comp-261103-eca7"
U_B = "https://images.nasa.gov/details/0158%2035sec%20Green%20Run%20Clip%2003182021"
U_T = "https://images.nasa.gov/details/SSC-2021-05-17_-_A_Bird%E2%80%99s-Eye_View-SLS_Core_Stage_at_Stennis"
U_W = "https://images.nasa.gov/details/SSC_020-12-20%20-%20Wet%20Dress-Rehearsal_B-ROLL"
U_HQ = "https://images.nasa.gov/details/NHQ_2021_0318_Green%20Run%20Wrap"
U_BC = "https://images.nasa.gov/details/SSC_2021_0318_GreenRun2_CompleteBroadcast"
segs = [
    seg("src-261103-bnxm", 7.3, 10.8, "frame 0: plume past the B-2 stand"),
    seg("src-261103-0tmp", 8.9, 13.9, "stage barge through the lock"),
    seg("src-261103-0tmp", 39.3, 44.3, "night: stage standing in the B-2 stand"),
    seg("src-261103-8h2b", 18.5, 23.0, "four engine bells venting", trim={"top": 36, "bottom": 50, "left": 0, "right": 0}),
    seg("src-261103-bnxm", 1.3, 4.8, "ignition glow inside the stand", trim={"top": 36, "bottom": 72, "left": 0, "right": 0}),
    seg("src-261103-bnxm", 15.3, 18.8, "nozzle at full thrust", trim={"top": 36, "bottom": 72, "left": 0, "right": 0}),
    seg("src-261103-bnxm", 22.3, 28.5, "PAYOFF: four bells firing together, plume (25.0)", trim={"top": 36, "bottom": 72, "left": 0, "right": 0}),
    seg("src-261103-0tmp", 68.8, 71.8, "wide plume over the stand, flows into frame 0"),
]
lines = [
    ("hook", "1.6 million pounds, and it's chained down.", 0.1),
    ("barge", "A barge delivered the 212-foot stage.", 3.6),
    ("anchor", "Anchored in the test stand.", 8.8),
    ("green", "Green means all-new hardware, running together.", 13.4),
    ("fuel", "733,000 gallons of propellant went in.", 16.6),
    ("ign", "Four engines. Can it hold?", 19.8),
    ("pay", "All eight minutes, at full power.", 25.0),
    ("fin", "The final Green Run test.", 28.2),
    ("loop", "1.6 million pounds. Eight minutes.", 31.0),
]
texts = [
    {"text": "1.6 MILLION LBS. CHAINED DOWN.", "at": 0.0, "dur": 3.0, "role": "hook", "y": -17},
    {"text": "Save this for the next SLS launch", "at": 3.3, "dur": 2.0, "role": "cta"},
    {"text": "Footage: NASA", "at": 10.0, "dur": 2.5, "role": "credit"},
    {"text": "733,000 GALLONS", "at": 16.8, "dur": 2.2, "role": "fact"},
    {"text": "4 RS-25 ENGINES", "at": 19.4, "dur": 2.2, "role": "fact"},
    {"text": "8 MINUTES", "at": 25.2, "dur": 2.8, "role": "fact", "y": -17},
]
credits = [
    "0158 35sec Green Run Clip 03182021, SSC 2021-05-17 A Bird's-Eye View: SLS Core Stage at Stennis, SSC_020-12-20 Wet Dress-Rehearsal B-ROLL by NASA (NASA media usage guidelines, generally not subject to U.S. copyright) - " + U_B + " ; " + U_T + " ; " + U_W,
    "NASA does not endorse this video.",
]
CK = ["1.6 million pounds", "Anchored in the test stand", "Four engines. Can it hold?", "The final Green Run test"]
cut = {"production_id": pid, "width": 1080, "height": 1920, "fps": 30, "segments": segs, "texts": texts,
       "captions": "narration", "caption_bg": True, "caption_min_page": 0.7, "caption_max_chars": 30,
       "music": None, "bed": "tone", "target_duration": 36.0, "credits": credits,
       "narration": dict(VOICE, lines=[{"id": i, "text": t, "at": a} for i, t, a in lines]),
       "caption_no_cross": True, "caption_keep": CK}
write(pid, "cutlist.json", cut)
claims = [
    {"claim": "the stage made 1.6 million pounds of thrust while anchored in the B-2 Test Stand", "evidence": U_HQ + ": 'the 212-foot core stage generated 1.6 million pounds of thrust, while anchored in the B-2 Test Stand'"},
    {"claim": "all four RS-25 engines fired the full 8 minutes on a hot fire test", "evidence": U_B + ": 'The four RS-25 engines fired for the full-duration of 8 minutes during the test'"},
    {"claim": "the core stage is 212 feet long", "evidence": U_HQ + ": 'the 212-foot core stage'"},
    {"claim": "the stage was delivered by barge and installed in the B-2 stand", "evidence": U_T + ": 'drone footage of various Green Run activities ... including the arrival, installation, testing'; on-screen titles 'Core Stage Arrival', 'Lifting the Core Stage onto the B-2 Test Stand' in the same item (not used in picture)"},
    {"claim": "the test loaded 733,000 gallons of liquid oxygen and liquid hydrogen", "evidence": U_HQ + ": 'loading 733,000 gallons of liquid oxygen and liquid hydrogen'; propellant 'more than 700,000 gallons' also in " + U_BC},
    {"claim": "'green' means new hardware, 'run' means operating all components together for the first time", "evidence": U_HQ + ": 'The term green refers to the new hardware ... run refers to operating all the components together simultaneously for the first time'"},
    {"claim": "the four engines were lit at the same time", "evidence": U_BC + ": 'fire the rocket's four RS-25 engines at the same time'"},
    {"claim": "it was the final test of the Green Run series", "evidence": U_B + ": 'The hot fire test is the final stage of the Green Run test series'"},
]
script = {
    "production_id": pid, "language": "en",
    "hook_text": "1.6 MILLION LBS. CHAINED DOWN.",
    "premise": "The Moon rocket's core stage is anchored in a test stand and its four RS-25 engines light together at 1.6 million pounds of thrust: can it hold for the full 8 minutes?",
    "send_reason": "Send to the friend who thinks rockets just launch.",
    "payoff_ts": 25.0,
    "open_loop": "Frame 0 gives 1.6 million pounds, chained down; rehooks at barge (3.6), 'green' (13.4), 'Can it hold?' (19.8); the full 8-minute burn lands at 25.0 over four engine bells at full power; the closing line repeats the number and the closing plume flows into frame 0.",
    "pinned_fact": "The 'green' in Green Run means all-new hardware operated together for the first time (NASA, " + U_HQ + ").",
    "on_screen": [{"t": x["at"], "dur": x["dur"], "text": x["text"], "role": x["role"]} for x in texts],
    "title": "SLS Core Stage: Chained Down, 1.6 Million Pounds of Thrust",
    "description": "Save this for the next SLS launch.\n\nThe first Space Launch System core stage was anchored in a test stand while all four RS-25 engines fired together for the full 8 minutes at 1.6 million pounds of thrust. Green Run was the final hot fire test: 'green' means all-new hardware, 'run' means running every part together for the first time.\n\nFootage courtesy of NASA (NASA media is generally not subject to U.S. copyright; see nasa.gov media guidelines). Original archive audio removed.\n- Green Run clip: " + U_B + "\n- Core stage at Stennis: " + U_T + "\n- Wet dress rehearsal: " + U_W + "\nNASA does not endorse this video.",
    "hashtags": ["#SLS", "#NASA", "#Artemis", "#RS25", "#TheWayItWasMade"],
    "attribution_block": "Footage courtesy of NASA (images.nasa.gov, MSFC and Stennis Space Center). NASA does not endorse this video.",
    "narration": [{"id": i, "text": t, "words": len(t.split()), "sources": [U_HQ]} for i, t, a in lines],
    "claims": claims,
    "cta": {"id": "C32", "family": "save", "placement": "S", "text": "Save this for the next SLS launch", "at": 3.3},
    "synthetic_media_disclosure": True,
    "credits": credits,
}
write(pid, "script.json", script)
write(pid, "enhancements.json", {"ruleset": "twiwm-cta-v1", "production_id": pid, "date": "2026-11-04", "duration_s": 34.2, "shots": len(segs),
      "hook": {"text": "1.6 MILLION LBS. CHAINED DOWN.", "at": 0, "dur": 3.0},
      "cta": {"id": "C32", "family": "save", "placement": "S", "text": "Save this for the next SLS launch", "at": 3.3, "dur": 2.0, "pct_of_runtime": 10},
      "loop": "closing plume flows into frame 0 plume", "payoff_at": 25.0, "payoff_pct": 73, "results": None,
      "note": "C32 new save text; tests C1.2 + X1"})

# ---------- qjnq Apollo LES ----------
pid = "comp-261103-qjnq"
U_O = "https://images.nasa.gov/details/NDTV000907_Apollo_Digest_Series_Testing_Apollo"
A = "src-261031-opni"
segs = [
    seg(A, 58.2, 61.3, "frame 0: capsule skids through water (test)"),
    seg(A, 53.0, 57.4, "capsule dropped on a tower rig and splashing (test)"),
    seg(A, 88.4, 94.1, "Saturn rocket on the pad"),
    seg(A, 94.1, 98.8, "Saturn liftoff"),
    seg(A, 98.8, 100.2, "Saturn rising"),
    seg(A, 62.2, 66.8, "test rocket flying, escape tower on top of the capsule"),
    seg(A, 66.8, 69.4, "PAYOFF at 24.0: booster fire, capsule with escape tower on top"),
    seg(A, 69.4, 72.2, "booster breaks up in smoke"),
    seg(A, 73.8, 76.8, "capsule under parachutes"),
    seg(A, 77.5, 80.0, "parachutes descending, flows into frame 0 water"),
]
lines = [
    ("hook", "What saves a crew if the rocket fails?", 0.1),
    ("drop", "Dunk it in water. Drop it from a tower.", 3.4),
    ("sits", "Then remember what it sits on.", 8.4),
    ("fail", "Big rockets can fail.", 13.0),
    ("carry", "So Apollo carried a second rocket above the crew.", 18.0),
    ("watch", "Watch this test.", 22.3),
    ("pay", "The booster breaks up.", 24.1),
    ("down", "It floats down on parachutes.", 27.2),
    ("loop", "What saves a crew? A rocket on top.", 31.4),
]
texts = [
    {"text": "SURVIVE A ROCKET BLAST?", "at": 0.0, "dur": 3.0, "role": "hook", "y": -17},
    {"text": "Footage: NASA (archival)", "at": 9.0, "dur": 2.5, "role": "credit"},
    {"text": "ESCAPE ROCKET TEST", "at": 24.2, "dur": 2.8, "role": "fact", "y": -17},
    {"text": "Like if you love real NASA test film", "at": 31.4, "dur": 3.0, "role": "cta"},
]
credits = ["Apollo Digest Series: Testing Apollo (AFRC film stock) by NASA (NASA media usage guidelines, generally not subject to U.S. copyright) - " + U_O, "NASA does not endorse this video."]
CK = ["a second rocket above the crew"]
cut = {"production_id": pid, "width": 1080, "height": 1920, "fps": 30, "segments": segs, "texts": texts,
       "captions": "narration", "caption_bg": True, "caption_min_page": 0.7, "caption_max_chars": 30,
       "music": None, "bed": "tone", "target_duration": 34.9, "credits": credits,
       "narration": dict(VOICE, lines=[{"id": i, "text": t, "at": a} for i, t, a in lines]),
       "caption_no_cross": True, "caption_keep": CK}
write(pid, "cutlist.json", cut)
claims = [
    {"claim": "the film covers testing of the Apollo rocket and its elements, including the launch escape system on top of the capsule", "evidence": U_O + ": 'testing of the Apollo V rocket and its elements ... even the launch escape system on top of the capsule'"},
    {"claim": "Apollo carried a second rocket above the crew (launch escape system on top of the capsule)", "evidence": U_O + " (same sentence); no thrust or distance number is used"},
    {"claim": "a rocket this big can fail (framing for why an escape system exists)", "evidence": "general framing, no number; Apollo 204 / flight-abort rationale in NASA history; no figure stated in picture or narration"},
    {"claim": "the footage shows tests (capsule drop, water skid, escape-system test with parachute descent), not an Apollo flight", "evidence": "opni frames 54-80 s checked at frame level; labelled 'test' only; item is Apollo Digest 'Testing Apollo' film"},
]
script = {
    "production_id": pid, "language": "en",
    "hook_text": "SURVIVE A ROCKET BLAST?",
    "premise": "If the rocket under three astronauts fails, what saves them? Apollo put a second rocket on top of the capsule; this test film shows an escape test and the parachute descent.",
    "send_reason": "Send to someone who loves Apollo.",
    "payoff_ts": 24.0,
    "open_loop": "Frame 0 asks what saves a crew; rehooks at the tower drop (3.4), the rocket it sits on (8.4), 'can fail' (13.0), second rocket (18.0); the escape test lands at 24.0 (booster fire, then break-up, then parachutes); the closing line answers the opener over the descending parachutes that flow into the frame-0 water shot.",
    "pinned_fact": "Apollo capsules carried a launch escape system on a tower above the crew; the 'Testing Apollo' NASA film covers testing it (" + U_O + ").",
    "on_screen": [{"t": x["at"], "dur": x["dur"], "text": x["text"], "role": x["role"]} for x in texts],
    "title": "Apollo Launch Escape System Tests: A Rocket on Top of the Capsule",
    "description": "Like if you love real NASA test film.\n\nIf the rocket under the crew fails, what saves them? Apollo capsules carried a launch escape system on top. This NASA film shows a capsule test (drop and water skid), an escape-rocket test and the parachute descent.\n\nFootage courtesy of NASA (NASA media is generally not subject to U.S. copyright; see nasa.gov media guidelines). Original archive audio removed.\n- Apollo Digest Series: Testing Apollo: " + U_O + "\nNASA does not endorse this video.",
    "hashtags": ["#Apollo", "#NASA", "#LaunchEscapeSystem", "#SaturnV", "#TheWayItWasMade"],
    "attribution_block": "Footage courtesy of NASA (images.nasa.gov, Apollo Digest Series: Testing Apollo). NASA does not endorse this video.",
    "narration": [{"id": i, "text": t, "words": len(t.split()), "sources": [U_O]} for i, t, a in lines],
    "claims": claims,
    "cta": {"id": "C33", "family": "like", "placement": "E", "text": "Like if you love real NASA test film", "at": 31.4},
    "synthetic_media_disclosure": True,
    "credits": credits,
}
write(pid, "script.json", script)
write(pid, "enhancements.json", {"ruleset": "twiwm-cta-v1", "production_id": pid, "date": "2026-11-04", "duration_s": 34.9, "shots": len(segs),
      "hook": {"text": "SURVIVE A ROCKET BLAST?", "at": 0, "dur": 3.0},
      "cta": {"id": "C33", "family": "like", "placement": "E", "text": "Like if you love real NASA test film", "at": 31.4, "dur": 3.0, "pct_of_runtime": 90},
      "loop": "parachutes descending flows into frame 0 water shot", "payoff_at": 24.0, "payoff_pct": 69, "results": None,
      "note": "C33 new like text; tests X1 + C1.13"})
print("ok")
