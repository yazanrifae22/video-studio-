import json, sys, os
P = 'E:/clips-viral/productions/'
def A(x): return 'src-261025-' + x
URL = {
 'qy63': 'https://images.nasa.gov/details/MAF_20190201_V_CS1%20LOX%20FWD%20Join',
 'ro6j': 'https://images.nasa.gov/details/MAF_20190401_ESmovetoA47_UHD-40Mbps(Approved)',
 'lwfq': 'https://images.nasa.gov/details/MAF_20200108_CS1%20rollout-1min%20Cut-FINAL-UHD',
 '1nfk': 'https://images.nasa.gov/details/KSC-19640101-MH-NAS01-0001-The_Crawler_Transporter_The_Beginning_Historical_Footage-B_2309',
 '7mjl': 'https://images.nasa.gov/details/KSC-20220315-MH-GEB01-0001-Artemis_I_WDR_Crawler_Roll_%20Into%20_VAB_Bay3-3299603',
 'i69h': 'https://images.nasa.gov/details/KSC-20190828-MH-DJN01-0001-Hurricane_Dorian_Preps_Crawler_Transporter_Move_to_Pad_39B_to_Retrieve_ML-3230313',
 'rxpz': 'https://images.nasa.gov/details/SSC_2022-02-08_RS-25_Engine_Test',
 'dvc5': 'https://images.nasa.gov/details/SSC_2019-04-04%20-%20Video%20File%20-%20RS-25%20Engine%20Test',
 'c5cz': 'https://images.nasa.gov/details/JPL-20200518-M2020f-0001-Shake%20Rattle%20and%20Roll%20Testing%20NASAs%20Mars%202020%20Perseverance%20Rover',
}
TITLE = {
 'qy63': 'NASA\'s Michoud Assembly Facility Completes SLS Forward Join (NASA MSFC/MAF, Feb. 2019)',
 'ro6j': 'Space Launch System (SLS) Core Stage Final Assembly (NASA MSFC/MAF, Apr. 2019)',
 'lwfq': 'NASA Rolls Out Space Launch System Rocket\'s Core Stage from Michoud Factory (NASA MAF, Jan. 2020)',
 '1nfk': 'Crawler-Transporter footage, 1964 KSC historical film (NASA KSC)',
 '7mjl': 'Artemis I WDR Pre-Rollout Activities - Crawler Transporter Rolls Into VAB (NASA KSC, Mar. 2022)',
 'i69h': 'Hurricane Dorian Preps: Crawler Transporter Treks to Pad 39B (NASA KSC, Aug. 2019)',
 'rxpz': 'NASA Conducts Second RS-25 Engine Test of Year at Stennis Space Center (NASA SSC, Feb. 2022)',
 'dvc5': 'NASA Achieves Testing Milestone with Engines for Initial SLS Missions (NASA SSC, Apr. 2019)',
 'c5cz': 'Shake, Rattle and Roll: Testing NASA\'s Mars 2020 Perseverance Rover (NASA/JPL-Caltech)',
}
def cred(keys): return [f'{TITLE[k]} - {URL[k]}' for k in keys] + ['NASA does not endorse this video.']
def attr(keys, extra=''):
    return 'Footage courtesy of NASA (NASA media is generally not copyrighted; see nasa.gov media guidelines). ' + ' | '.join(f'{TITLE[k]}: {URL[k]}' for k in keys) + extra + ' NASA does not endorse this video.'

STYLE = "Warm documentary narrator, confident and clear, unhurried, specific; no hype."
def save(pid, f, d):
    json.dump(d, open(P + pid + '/' + f, 'w', encoding='utf8', newline='\n'), indent=1, ensure_ascii=False)
def load(pid, f):
    b = open(P + pid + '/' + f, 'rb').read()
    try: return json.loads(b.decode('utf8'))
    except UnicodeDecodeError: return json.loads(b.decode('cp1252'))

def build(pid, segs, chips, cta, lines, keys, hook):
    """segs: (asset,in,out[,extra dict]); chips: (text,at,dur); cta: dict(place,at?); lines: (id,at,text,src)"""
    S = []; t = 0.0; starts = []
    for i, sg in enumerate(segs):
        a, ti, to = sg[:3]
        d = {"asset_id": A(a), "src_in": ti, "src_out": to, "fill": "blur", "zoom": 1.3, "mute_source": True, "item": i + 1, "why": ''}
        if len(sg) > 3: d.update(sg[3])
        S.append(d); starts.append(round(t, 3)); t += to - ti
    total = round(t, 3)
    T = [{"text": x, "at": at, "dur": dur, "role": "title" if k == 0 else "fact", **({"y": y} if (y := (ex[0] if ex else None)) is not None else {})}
         for k, (x, at, dur, *ex) in enumerate(chips)]
    if cta['place'] == 'E': at, dur = round(total - 3.0, 3), 3.0
    elif cta['place'] == 'S': at, dur = cta['at'], 2.0
    else: at, dur = cta['at'], 2.5
    T.append({"text": cta['text'], "at": at, "dur": dur, "role": "cta"})
    for x in T:
        if x['role'] == 'cta': continue
        assert not (x['at'] < at + dur and x['at'] + x['dur'] > at), (pid, x, 'overlaps CTA')
        assert x['dur'] <= 4.05, (pid, x)
    acc = [x['at'] for x in T if x['role'] in ('title', 'fact')]
    c = {"production_id": pid, "width": 1080, "height": 1920, "fps": 30, "segments": S, "texts": T,
         "narration": {"voice": "Charon", "style": STYLE, "lines": [{"id": i, "text": tx, "at": a_} for (i, a_, tx, sr) in lines]},
         "captions": "narration", "music": None, "bed": "tone", "bed_accents": acc, "credits": cred(keys), "target_duration": total}
    save(pid, 'cutlist.json', c)
    # script
    s = load(pid, 'script.json')
    s['hook_text'] = hook
    narr = []
    for (i, a_, tx, sr) in lines:
        item = max(k for k, st in enumerate(starts) if st <= a_ + 0.01) + 1
        narr.append({"id": i, "at_item": item, "text": tx, "words": len(tx.split()), "sources": sr if isinstance(sr, list) else [sr]})
    s['narration'] = narr; s.pop('narration_note', None)
    s['on_screen'] = [{"t": x['at'], "dur": x['dur'], "text": x['text'].replace('\n', ' '), **({"role": "cta"} if x['role'] == 'cta' else {})} for x in T]
    s['synthetic_media_disclosure'] = True
    s['disclosure_note'] = "Narration is AI-generated (Gemini TTS, voice Charon)"
    s['attribution_block'] = attr(keys)
    s['cta']['at'] = at
    save(pid, 'script.json', s)
    return c, starts, total, at, dur

def finish_script(pid, title, ask, body, cta_line=True):
    s = load(pid, 'script.json')
    s['title'] = title
    s['description'] = (ask + ".\n\nNarration is AI-generated (Gemini TTS, voice Charon).\n\n" + body +
        "\n\nFootage: NASA (NASA media is generally not copyrighted). Original archive audio removed. NASA does not endorse this video.\n\n" + s['attribution_block'])
    save(pid, 'script.json', s)

def enh(pid, c, starts, total, at, dur, payoff_at, loop, note, cta):
    lens = [round(s['src_out'] - s['src_in'], 2) for s in c['segments']]
    e = {"ruleset": "twiwm-cta-v1", "production_id": pid, "date": "2026-10-25", "duration_s": total, "shots": len(lens),
         "avg_shot_s": round(total / len(lens), 2), "shot_lengths": lens,
         "hook": {"text": c['texts'][0]['text'].replace('\n', ' '), "at": 0, "dur": c['texts'][0]['dur']},
         "cta": {**cta, "at": at, "dur": dur, "pct_of_runtime": round(100 * at / total)},
         "loop": loop, "narration": True, "narration_voice": "Charon (Gemini TTS)", "payoff_at": payoff_at, "payoff_pct": round(100 * payoff_at / total),
         "results": None, "revision": note}
    save(pid, 'enhancements.json', e)

# ============================================================ 8dx7
pid = 'comp-261025-8dx7'
segs = [('qy63', 41.7, 45.2), ('qy63', 17.0, 20.5), ('qy63', 56.0, 59.5), ('qy63', 148.0, 151.5), ('ro6j', 112.3, 115.8), ('lwfq', 5.2, 7.6),
        ('ro6j', 145.0, 149.0), ('lwfq', 37.0, 39.9), ('lwfq', 43.8, 45.4), ('lwfq', 45.9, 47.5), ('lwfq', 47.9, 51.0), ('lwfq', 9.0, 12.4)]
chips = [("5 PIECES.\n1 GIANT ROCKET STAGE", 0, 3.0), ("PIECES 1-3: SKIRT,\nOXYGEN TANK, INTERTANK", 3.5, 3.5), ("JOINED INTO THE TOP\nOF A 212-FT STAGE", 10.5, 3.5),
         ("PIECE 4:\nTHE ENGINE SECTION", 14.0, 3.5), ("BUILT TO HOUSE\nFOUR RS-25 ENGINES", 17.5, 2.4), ("5. THE LIQUID\nHYDROGEN TANK", 19.9, 4.0),
         ("NASA: LARGEST STAGE\nIT HAS BUILT", 23.9, 2.9), ("JAN. 8, 2020:\nROLLED ONTO A BARGE", 26.8, 3.2), ("40+ MILES TO STENNIS\nFOR TESTING", 30.0, 3.1)]
FWD = "https://images.nasa.gov/details/MAF_20190201_V_CS1%20LOX%20FWD%20Join"
lines = [
 ("hook", 0.2, "Five pieces. One giant rocket stage.", FWD),
 ("top", 3.5, "The top three: forward skirt, oxygen tank, intertank.", FWD + " (\"The forward join mated three structures: the forward skirt, liquid oxygen tank and intertank.\")"),
 ("join", 7.4, "Mated, they form the top of a two hundred twelve foot stage.", FWD + " (\"212-foot-tall SLS core stage\")"),
 ("engine", 14.0, "Piece four: the engine section, built for four RS-25 engines.", URL['ro6j'] + " (\"the engine section that will house the four RS-25 engines\")"),
 ("lh2", 19.9, "Piece five: the liquid hydrogen tank.", URL['ro6j'] + " (\"a liquid hydrogen tank and the engine section\"; five main structures)"),
 ("largest", 23.9, "NASA's largest stage ever built.", FWD + " (\"the largest stage NASA has ever built\")"),
 ("barge", 26.8, "January eighth, 2020: rolled onto a barge.", URL['lwfq'] + " (rollout Jan. 8, 2020, Pegasus barge)"),
 ("stennis", 30.0, "Then forty-plus miles to Stennis, for testing.", URL['lwfq'] + " (\"more than 40 miles ... Stennis Space Center\")"),
 ("close", 33.5, "Five pieces. One stage.", FWD),
]
c, st, tot, at, dur = build(pid, segs, chips, {'place': 'E', 'text': 'Subscribe for more build stories'}, lines, ['qy63', 'ro6j', 'lwfq'], "5 PIECES. 1 GIANT ROCKET STAGE")
finish_script(pid, "How NASA Built the SLS Core Stage in 5 Pieces", "Subscribe for more build stories",
  "NASA's SLS core stage is built from five main structures at the Michoud Assembly Facility in New Orleans. The top three (forward skirt, liquid oxygen tank, intertank) are mated first, then the engine section that houses four RS-25 engines, and the liquid hydrogen tank. "
  "NASA describes the 212-foot-tall core stage as the largest stage it has ever built. On Jan. 8, 2020 the first one rolled onto the Pegasus barge for the 40+ mile trip to Stennis Space Center for testing.")
enh(pid, c, st, tot, at, dur, st[6], "Closing payoff shot: the completed core stage rolling out in daylight (lwfq 9.0-12.4); narration repeats the hook.", "v-fix2: LH2 tank is the subject (ro6j 145.0-149.0), payoff shot of finished stage added at end; v-fix1: LH2 tank piece 5 added; narration added; NASA wording for largest stage", {"id": "C01", "family": "subscribe", "placement": "E", "text": "Subscribe for more build stories"})
print(pid, tot, st)

# ============================================================ ycyz
pid = 'comp-261025-ycyz'
segs = [('i69h', 21.0, 24.5), ('i69h', 36.0, 39.5), ('7mjl', 40.0, 43.5), ('1nfk', 487.4, 490.9), ('7mjl', 56.0, 59.5), ('i69h', 8.0, 11.5),
        ('7mjl', 24.0, 27.5), ('7mjl', 216.0, 219.5), ('7mjl', 280.0, 283.5), ('i69h', 81.0, 84.5)]
chips = [("6+ MILLION LB.\n1 MPH LOADED", 0, 2.9), ("8 TRACK BELTS\nON EACH CRAWLER", 5.0, 2.0), ("16 TRACTION MOTORS,\n375 HP EACH", 7.0, 3.5),
         ("CARRIES THE ROCKET\nAND LAUNCH TOWER", 10.5, 3.5), ("BUILT IN 1965\nFOR THE SATURN V", 14.0, 3.5), ("3.4 MILES TO PAD 39A.\n4.2 TO 39B", 17.5, 3.5),
         ("STILL AT WORK\nON ARTEMIS", 21.0, 3.5), ("HYDRAULICS KEEP THE LOAD\nLEVEL ON THE SLOPE", 24.5, 3.5), ("ONE GALLON OF DIESEL\nPER 32 FEET", 28.0, 3.5),
         ("BUILT 1965.\nSTILL ROLLING.", 31.5, 3.5)]
FSU = "NASA Facts: Crawler-Transporter, FS-2012-04-085-KSC https://www.nasa.gov/wp-content/uploads/2015/12/638823main_crawler-transporter.pdf"
lines = [
 ("hook", 0.2, "Six-million-plus pounds, one mile an hour.", FSU + " (weight 6.3 million lb overall as listed; speed loaded 1 mph)"),
 ("belts", 3.5, "Eight track belts on each crawler.", FSU + " (Belts: 8 each, 2 per truck)"),
 ("motors", 7.0, "Sixteen traction motors drive it.", FSU + " (16 traction motors, 375 hp each)"),
 ("load", 10.5, "It carries the rocket and its launch tower.", FSU + " (carries rockets and spacecraft to the pad)"),
 ("built", 14.0, "Built in 1965 to move the Saturn V.", FSU + " (\"built in 1965 to move the massive Saturn V rocket\")"),
 ("miles", 17.5, "Three point four miles to Pad 39A.", FSU + " (3.4 miles to 39A, 4.2 to 39B)"),
 ("artemis", 21.0, "It rolled again for Artemis One.", URL['7mjl'] + " (Artemis I WDR crawler roll into VAB, KSC, 2022-03-15)"),
 ("level", 24.5, "Hydraulics keep its load level on the slope.", FSU + " (hydraulic suspension keeps the platform level up the pad ramp)"),
 ("fuel", 28.0, "One gallon of diesel every thirty-two feet.", FSU + " (fuel consumption 1 gallon per 32 feet)"),
 ("close", 31.5, "Built in 1965. Still rolling.", FSU),
]
c, st, tot, at, dur = build(pid, segs, chips, {'place': 'S', 'text': 'New build story daily. Subscribe', 'at': 3.0}, lines, ['i69h', '7mjl', '1nfk'], "6+ MILLION LB. 1 MPH LOADED")
finish_script(pid, "The 6-Million-Pound-Plus Crawler That Carries NASA's Rockets", "New build story daily. Subscribe",
  "Two crawler-transporters built in 1965 for the Saturn V still move NASA rockets to the pad. NASA's fact sheet lists each at about 6.3 million pounds overall (modifications since have added weight, so it is a 6-million-pound-plus machine). "
  "They run on eight track belts driven by sixteen 375-horsepower traction motors, crawl at 1 mph loaded and 2 mph empty, burn about one gallon of diesel per 32 feet, and carry the rocket and launch tower 3.4 miles to Pad 39A or 4.2 miles to Pad 39B. "
  "Hydraulics keep the load level on the pad's slope. One rolled again in 2022 for Artemis I.")
enh(pid, c, st, tot, at, dur, st[3], "Closing wide shot of a crawler on the road mirrors the opening crawler shot; closing line repeats 'Built in 1965'.", "v-fix2: soft tape windows 508/604 s replaced by sharp 7mjl 56-59.5 and i69h 8-11.5 (only 1nfk 487.4-490.9 kept); v-fix1: removed uncleared 1nfk windows (Marion plant scenes); only 1nfk>=480 s + i69h + 7mjl; weight claim reworded; narration added", {"id": "C04", "family": "subscribe", "placement": "S", "text": "New build story daily. Subscribe"})
print(pid, tot, st)

# ============================================================ zpls
pid = 'comp-261025-zpls'
segs = [('dvc5', 150.0, 153.5), ('dvc5', 67.5, 71.0), ('dvc5', 140.0, 143.5), ('dvc5', 188.0, 191.5), ('dvc5', 35.0, 38.5), ('rxpz', 80.0, 83.5),
        ('rxpz', 204.0, 207.5), ('dvc5', 114.0, 117.5), ('dvc5', 156.0, 159.5)]
chips = [("500 SECONDS ON\nA TEST STAND", 0, 2.9), ("ONCE A SHUTTLE ENGINE:\nTHE RS-25", 5.0, 2.0), ("APRIL 4, 2019:\nSTENNIS A-1 STAND", 7.0, 3.5),
         ("FULL DURATION:\n500 SECONDS", 10.5, 3.5), ("2019 TEST ENDS A\n51-MONTH SERIES", 14.0, 3.5), ("2022: OVER HALF AT\n110-111% POWER", 17.5, 3.5),
         ("UP CLOSE: RS-25\nPIPEWORK AT FIRING", 21.0, 3.5, -33), ("16 ENGINES FOR THE\nFIRST 4 SLS FLIGHTS", 24.5, 3.5)]
D = URL['dvc5']; R = URL['rxpz']
lines = [
 ("hook", 0.2, "Five hundred seconds on a Stennis test stand.", D + " (\"full-duration of 500 seconds\", A-1 Test Stand, Apr. 4, 2019)"),
 ("rs25", 3.5, "An RS-25, once a shuttle engine.", D + " (\"former space shuttle main engines\")"),
 ("date", 7.0, "Stennis Space Center, April 2019.", D + " (hot fire on the A-1 Test Stand at Stennis, Apr. 4)"),
 ("full", 10.5, "This engine ran all five hundred seconds.", D + " (flight engine No. 2062, full duration of 500 seconds)"),
 ("series", 14.0, "That test ended a fifty-one-month series.", D + " (\"concludes a 51-month test series\"; Apr. 4, 2019)"),
 ("power", 17.5, "Later tests pushed past shuttle power.", R + " (\"over half of this test ... at 110 percent and 111 percent of power levels used for space shuttle main engines\")"),
 ("pipes", 21.0, "Up close, the plumbing of a firing engine.", R + " (RS-25 hot-fire test footage, Feb. 8, 2022)"),
 ("sixteen", 24.5, "Sixteen engines for four SLS missions.", D + " (\"all 16 former space shuttle main engines that will help launch the first four SLS missions\")"),
 ("close", 28.0, "Five hundred seconds. Then flight.", D),
]
c, st, tot, at, dur = build(pid, segs, chips, {'place': 'S', 'text': "Save this. You'll want it twice", 'at': 3.0}, lines, ['rxpz', 'dvc5'], "500 SECONDS ON A TEST STAND")
finish_script(pid, "Testing the RS-25: 500 Seconds on a Stennis Test Stand", "Save this. You'll want it twice",
  "Before an RS-25 engine flies on NASA's SLS rocket, it is fired on a test stand at Stennis Space Center. On April 4, 2019, flight engine No. 2062 ran a full 500 seconds on the A-1 stand, ending a 51-month test series on former space shuttle main engines. "
  "Sixteen of them are set to help launch the first four SLS missions. A 2022 test (also shown) ran over half its duration at 110 to 111 percent of the power level used on the space shuttle.")
enh(pid, c, st, tot, at, dur, st[7], "Closing nozzle shot matches the opening nozzle shot (same 2019 camera); closing line repeats the 500 seconds.", "v-fix2: chronology fixed (2019 series end before 2022 tests); 7 of 9 windows swapped for varied dvc5/rxpz angles (ignition, A-1 stand wide, haze cam, aerial plume); only the loop nozzle shot repeats", {"id": "C07", "family": "save", "placement": "S", "text": "Save this. You'll want it twice"})
print(pid, tot, st)

# ============================================================ afhp
pid = 'comp-261025-afhp'
Z = {"zoom": 1.0}
segs = [('c5cz', 16.7, 19.7, Z), ('c5cz', 33.3, 35.8, Z), ('c5cz', 38.8, 41.0, Z), ('c5cz', 52.0, 54.2, Z), ('c5cz', 77.0, 79.2, Z),
        ('c5cz', 86.0, 88.2, Z), ('c5cz', 96.9, 99.3, Z), ('c5cz', 116.0, 118.0, Z), ('c5cz', 120.1, 121.9, Z),
        ('c5cz', 137.7, 141.3, Z), ('c5cz', 125.5, 128.7, Z), ('c5cz', 14.4, 17.6, Z)]
# starts: 0,3.0,5.5,7.7,9.9,12.1,14.3,16.7,18.7 (result),22.3 ; total 25.1
chips = [("SPUN. SHAKEN.\nFROZEN. THEN MARS.", 0, 3.0), ("SEPT-DEC 2019:\nROVER TEST SERIES", 3.0, 2.5), ("MOBILITY\nDEPLOYMENT TEST", 5.5, 2.1), ("ITS FIRST\nUNASSISTED STAND", 7.7, 2.1),
         ("SOLAR TEST\nUNDER LAMPS", 9.9, 2.1), ("THERMAL VACUUM:\nCHAMBER EVACUATED", 12.1, 1.9), ("FINALLY:\nTHE DRIVE TEST", 16.8, 3.5), ("TESTED HERE. LANDED\nON MARS, FEB. 18, 2021", 20.5, 3.6)]
C = URL['c5cz']
J = C + " (NASA/JPL-Caltech description)"
lines = [
 ("hook", 0.2, "Spun, shaken, frozen, then Mars.", J),
 ("series", 3.0, "From September 2019, test after test at JPL.", J + " (\"tests ... performed between September and December of 2019\")"),
 ("stand", 7.7, "Its first unassisted stand. Then solar lamps.", J + " (\"Rover's first unassisted stand\"; solar test)"),
 ("vac", 12.1, "Thermal vacuum: chamber emptied.", J + " (thermal vacuum test; on-screen sign CHAMBER EVACUATED)"),
 ("cache", 14.3, "Sample caching: tools for Mars rock.", J + " (sample caching test; Mars 2020 sample caching system)"),
 ("drive", 16.7, "Finally, the drive test.", J + " (drive test)"),
 ("land", 20.5, "Launched in 2020, landed on Mars in 2021.", J + " (launch 2020; landing Feb. 18, 2021)"),
 ("close", 24.1, "All of it, tested here first.", J),
]
c, st, tot, at, dur = build(pid, segs, chips, {'place': 'M', 'text': 'Enjoying it? Tap subscribe', 'at': 14.1}, lines, ['c5cz'], "SPUN. SHAKEN. FROZEN. THEN MARS.")
finish_script(pid, "How NASA Tortured the Perseverance Rover Before Mars", "Enjoying it? Tap subscribe",
  "Between September and December 2019, NASA's Perseverance rover went through spin, shake, mobility, first-stand, solar, thermal vacuum, sample caching and drive tests at JPL. It launched in 2020 and landed on Mars on Feb. 18, 2021.")
enh(pid, c, st, tot, at, dur, st[9], "Closing shot returns to the spin-table opening; closing line 'tested here first' echoes the hook.", "v-fix2: payoff pulled to ~67% (was 76%), chip reworded TESTED HERE. LANDED ON MARS + LAB FOOTAGE tag; v-fix1: payoff pulled to ~76% (was 86%); full-frame inset (zoom 1.0) so JPL labels are not cropped; lamp chip only on lamp shot; narration added", {"id": "C10", "family": "subscribe", "placement": "M", "text": "Enjoying it? Tap subscribe"})
print(pid, tot, st)
# afhp: small LAB FOOTAGE tag under the payoff chip
_c = load(pid, 'cutlist.json')
_c['texts'].append({"text": "LAB FOOTAGE (JPL CLEAN ROOM)", "at": st[9], "dur": 3.6, "role": "credit", "y": 40})
save(pid, 'cutlist.json', _c)
_s = load(pid, 'script.json')
_s['on_screen'].append({"t": st[9], "dur": 3.6, "text": "LAB FOOTAGE (JPL CLEAN ROOM)"})
save(pid, 'script.json', _s)
