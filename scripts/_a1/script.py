import json
P = 'E:/clips-viral/productions/'
FS = 'https://www.nasa.gov/wp-content/uploads/2015/12/638823main_crawler-transporter.pdf'
M = {
 '8dx7': dict(cta=('C01', 'subscribe', 'E'),
  title='How NASA Built the SLS Core Stage in 5 Pieces',
  desc="NASA's SLS core stage is built from five main structures at the Michoud Assembly Facility in New Orleans. The top three (forward skirt, liquid oxygen tank, intertank) are joined first, then the engine section that houses four RS-25 engines. At 212 feet it is the largest stage NASA has ever built, and on Jan. 8, 2020 the first one rolled onto the Pegasus barge for the 40+ mile trip to Stennis Space Center for testing.",
  tags=['#SLS', '#NASA', '#Artemis', '#SpaceEngineering', '#TheWayItWasMade'],
  src={'5 PIECES': 'images.nasa.gov/details/Space Launch System (SLS) Core Stage Final Assembly: "five main structures that make up the core stage"',
       'TOP: SKIRT': 'qy63 NASA page: "The forward join mated three structures: the forward skirt, liquid oxygen tank and intertank."',
       '212-FT': 'NASA forward-join page: "massive, 212-foot-tall SLS core stage"',
       'ENGINE SECTION': 'Final Assembly page: "the engine section that will house the four RS-25 engines"',
       'FOUR RS-25': 'Final Assembly / forward-join pages: four RS-25 engines',
       'LARGEST STAGE': 'forward-join page: "the largest stage NASA has ever built"',
       'BARGE': 'rollout page: rolled onto the Pegasus barge Jan. 8 (2020)',
       '40+ MILES': 'rollout page: "more than 40 miles from Michoud to ... Stennis Space Center ... Green Run test series"'},
  attrib="SLS Core Stage Forward Join (NASA MSFC) https://images.nasa.gov/details/NASA%E2%80%99s%20Michoud%20Assembly%20Facility%20Completes%20SLS%20Forward%20Join · SLS Core Stage Final Assembly (NASA MSFC) https://images.nasa.gov/details/Space%20Launch%20System%20%28SLS%29%20Core%20Stage%20Final%20Assembly · Core stage rollout (NASA MAF) https://images.nasa.gov/details/NASA%20Rolls%20Out%20Space%20Launch%20System%20Rocket%E2%80%99s%20Core%20Stage%20from%20Michoud%20Factory",
  loop="Closing shot is the same assembly bay as the opening tank shot.",
  hook="5 PIECES. 1 GIANT ROCKET STAGE"),
 'ycyz': dict(cta=('C04', 'subscribe', 'S'),
  title="The 6.3-Million-Pound Crawler That Carries NASA's Rockets",
  desc="Two crawler-transporters built in 1965 by Marion Power Shovel of Ohio still move NASA rockets to the pad. Each has 456 track shoes, weighs about 6.3 million pounds, and tops out at 1 mph loaded and 2 mph empty. They carry the rocket and launch tower 3.4 miles to Pad 39A or 4.2 miles to Pad 39B, and one rolled again for Artemis I.",
  tags=['#NASA', '#CrawlerTransporter', '#KennedySpaceCenter', '#Engineering', '#TheWayItWasMade'],
  src={'6.3 MILLION': FS + ' (overall weight 6.3 million lb; 1 mph loaded, 2 mph unloaded)',
       'OHIO': FS + ' (Marion Power Shovel Co., Marion, Ohio)',
       '1965': FS + ' (two crawlers, built 1965)',
       '456': FS + ' (456 shoes per crawler)',
       'DIESEL': FS + ' (diesel engines drive generators)',
       'ROCKET AND LAUNCH': FS + ' (carries launch vehicle on its mobile launcher)',
       '3.4 MILES': FS + ' (3.4 mi to 39A, 4.2 mi to 39B)',
       'ARTEMIS': 'images.nasa.gov/details/Artemis I WDR Pre-Rollout Activities - Crawler Transporter Rolls Into VAB (NASA KSC, 2022)',
       '2 MPH': FS,
       'BUILT 1965': FS + '; Crawler-Transporter 2 used for Artemis I (2022 KSC footage)'},
  attrib="Crawler-Transporter footage (NASA KSC, 1960s) https://images.nasa.gov/details/Crawler-Transporter%20footage · Hurricane Dorian Preps: Crawler Transporter (NASA KSC, 2019) · Artemis I WDR Crawler Transporter Rolls Into VAB (NASA KSC, 2022), all on images.nasa.gov. Facts: NASA Crawler-Transporter fact sheet " + FS,
  loop="Closing shot returns to the opening close-up of the crawler treads.",
  hook="6.3 MILLION LB. 1 MPH LOADED"),
 'zpls': dict(cta=('C07', 'save', 'S'),
  title="Testing the RS-25: 500 Seconds on a Stennis Test Stand",
  desc="Before an RS-25 engine flies on NASA's SLS rocket, it is bolted to a test stand at Stennis Space Center and fired. On April 4, 2019, flight engine No. 2062 ran a full 500 seconds on the A-1 stand, ending a 51-month test series on former space shuttle main engines. Sixteen of them are set to help launch the first four SLS missions.",
  tags=['#RS25', '#SLS', '#NASA', '#RocketEngine', '#TheWayItWasMade'],
  src={'500 SECONDS ON': 'NASA SSC Apr. 4, 2019 item: "full-duration of 500 seconds"',
       'ONCE A SHUTTLE': 'NASA SSC Apr. 4, 2019 item: "former space shuttle main engines"',
       'BOLTED': 'hot-fire test on a stand (NASA SSC captions)',
       'OVER HALF': 'NASA SSC Feb. 8, 2022 item: "Over half of this test was conducted at 110 percent and 111 percent of power levels used for space shuttle main engines"',
       'APRIL 4': 'NASA SSC Apr. 4, 2019 item: A-1 Test Stand, Stennis',
       'FULL DURATION': 'NASA SSC Apr. 4, 2019 item',
       '51-MONTH': 'NASA SSC Apr. 4, 2019 item: "concludes a 51-month test series"',
       '16 ENGINES': 'NASA SSC Apr. 4, 2019 item: "All 16 former space shuttle main engines that will help launch the first four SLS missions"'},
  attrib="RS-25 engine hot fire, Feb. 8, 2022 (NASA SSC) · NASA Achieves Testing Milestone with Engines for Initial SLS Missions, Apr. 4, 2019 (NASA SSC), both on images.nasa.gov",
  loop="Closing shot repeats the opening white-hot nozzle shot.",
  hook="500 SECONDS ON A TEST STAND"),
 'afhp': dict(cta=('C10', 'subscribe', 'M'),
  title="How NASA Tortured the Perseverance Rover Before Mars",
  desc="Between September and December 2019, NASA's Perseverance rover went through spin, shake, mobility, first-stand, solar, thermal vacuum, sample caching and drive tests at JPL. It launched in 2020 and landed on Mars on Feb. 18, 2021.",
  tags=['#Perseverance', '#Mars', '#NASA', '#JPL', '#TheWayItWasMade'],
  src={'SPUN': 'NASA/JPL-Caltech description: spin, shake, thermal vacuum tests',
       'SEPT-DEC': 'NASA/JPL description: "tests ... performed between September and December of 2019 at NASA JPL"',
       'SHAKE': 'NASA/JPL description (burned-in label SHAKE TEST)',
       'MOBILITY': 'NASA/JPL description: mobility deployment test',
       'UNASSISTED': "NASA/JPL description: Rover's first unassisted stand",
       'SOLAR': 'NASA/JPL description: solar test (lamps visible on the rover)',
       'THERMAL': 'NASA/JPL description: thermal vacuum test; on-screen sign reads CHAMBER EVACUATED',
       'SAMPLE': 'NASA/JPL description: sample caching test',
       'TUBES': 'NASA Mars 2020 sample caching system',
       'DRIVE': 'NASA/JPL description: drive test',
       'MARS LANDING': 'NASA/JPL description: "It will land on Mars February 18, 2021"'},
  attrib="Shake, Rattle and Roll: Testing NASA's Mars 2020 Perseverance Rover (NASA/JPL-Caltech) https://images.nasa.gov/details/Shake%2C%20Rattle%20and%20Roll%3A%20Testing%20NASA%E2%80%99s%20Mars%202020%20Perseverance%20Rover",
  loop="Closing shot returns to the spin-table opening.",
  hook="SPUN. SHAKEN. FROZEN. THEN MARS."),
}
for k, m in M.items():
    pid = 'comp-261025-' + k
    c = json.load(open(P + pid + '/cutlist.json'))
    cid, fam, pl = m['cta']
    cta = [t for t in c['texts'] if t['role'] == 'cta'][0]
    ons = []
    for t in c['texts']:
        if t['role'] == 'cta':
            continue
        e = {"t": t['at'], "dur": t['dur'], "text": t['text']}
        for kk, v in m['src'].items():
            if kk in t['text']:
                e['sources'] = [v]
                break
        ons.append(e)
    ons.append({"t": cta['at'], "dur": cta['dur'], "text": cta['text'], "role": "cta"})
    d = cta['text'] + ".\n\n" + m['desc'] + "\n\nAll footage: NASA (public domain, images.nasa.gov). Original archive audio removed. NASA does not endorse this video."
    s = {"production_id": pid, "language": "en", "hook_text": m['hook'], "narration": [], "narration_note": "Text-led, no narration (no TTS call).", "on_screen": ons, "title": m['title'], "description": d, "hashtags": m['tags'], "attribution_block": "Footage courtesy of NASA. " + m['attrib'] + ". NASA does not endorse this video.", "synthetic_media_disclosure": False, "disclosure_note": "No AI voice or generated imagery. Ambience bed is a synthesized tone, not archival sound.", "cta": {"id": cid, "family": fam, "placement": pl, "text": cta['text'], "at": cta['at']}}
    json.dump(s, open(P + pid + '/script.json', 'w'), indent=1, ensure_ascii=False)
    tot = c['target_duration']
    en = {"ruleset": "twiwm-cta-v1", "production_id": pid, "duration_s": tot, "shots": len(c['segments']), "avg_shot_s": round(tot / len(c['segments']), 2), "hook": {"text": m['hook'], "at": 0, "dur": c['texts'][0]['dur']}, "cta": {"id": cid, "family": fam, "placement": pl, "text": cta['text'], "at": cta['at'], "dur": cta['dur'], "pct_of_runtime": round(100 * cta['at'] / tot)}, "loop": m['loop'], "narration": False, "results": None}
    json.dump(en, open(P + pid + '/enhancements.json', 'w'), indent=1)
    print(pid, 'ok', tot, len(c['segments']))
