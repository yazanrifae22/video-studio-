"""Writes productions/rank-261028-kb5h/cutlist.json + script.json (UTF-8). Usage: python scripts/pe-mtn-writejson.py"""
import json, os, re
PID = 'rank-261028-kb5h'
D = rf'E:\clips-viral\productions\{PID}'
os.makedirs(D, exist_ok=True)
S = dict(hookA='src-261028-76ar', end='src-261028-d9j9', venus='src-261028-pl8p', iapetus='src-261028-ysul', io='src-261028-og1r',
         vesta='src-261028-p2h7', hookB='src-261028-4gjc', c5='src-261028-ejx5', c4='src-261028-c45o', c3='src-261028-mzek',
         c2='src-261028-qgdk', lead='src-261028-dc4b')
seg = lambda a, d, item, why: dict(asset_id=S[a], src_in=0, src_out=d, fill='cover', mute_source=True, item=item, why=why)
segments = [
    seg('hookA', 1.0, 0, 'hook: Viking 1 Olympus Mons crop (#1) + chip EVEREST: NOT TOP 5; frame 0 = loop-end crop'),
    seg('hookB', 2.0, 0, 'hook shot 2 (cut at 1.0 s): Everest vs the five tallest, one scale'),
    seg('venus', 2.1, 5, '#5 Maxwell Montes, Venus: Magellan radar image (NASA/JPL)'),
    seg('c5', 2.1, 5, '#5 original bar graphic: 11 km vs Everest 8.85'),
    seg('iapetus', 2.1, 4, '#4 Iapetus equatorial ridge: Cassini close-up (NASA/JPL/SSI)'),
    seg('c4', 2.1, 4, '#4 original bar graphic: 13 km vs Everest'),
    seg('io', 2.1, 3, '#3 Io mountains: Galileo image of Mongibello Mons (NOT Boosaule; labelled)'),
    seg('c3', 2.1, 3, '#3 original bar graphic: Boosaule 17.5 km vs Everest'),
    seg('vesta', 2.2, 2, '#2 Vesta: Dawn colour height map of the Rheasilvia central complex region'),
    seg('c2', 2.2, 2, '#2 original bar graphic: 20 km vs Everest'),
    seg('lead', 2.5, 1, '#1 original graphic: Olympus 21.3 vs Vesta 20 vs Everest'),
    seg('end', 2.5, 1, 'push-out ends on the exact frame-0 crop: seamless loop'),
]
T = lambda text, at, dur, role, **kw: dict(text=text, at=at, dur=dur, role=role, **kw)
texts = [
    T('EVEREST: NOT TOP 5', 0, 3.0, 'title'),
    T('#5 · 11 KM', 3.0, 4.2, 'rank'), T('MAXWELL MONTES · VENUS', 3.0, 2.1, 'fact'), T('MAGELLAN RADAR VIEW', 5.1, 2.1, 'fact'),
    T('#4 · 13 KM', 7.2, 4.2, 'rank'), T('IAPETUS RIDGE · SATURN', 7.2, 2.1, 'fact'), T('ESTIMATES: 10–20 KM', 9.3, 2.1, 'fact'),
    T('#3 · 17.5 KM', 11.4, 4.2, 'rank'), T('BOOSAULE MONTES · IO', 11.4, 2.1, 'fact'), T('MONGIBELLO SHOWN', 13.5, 2.1, 'fact'),
    T('#2 · 20 KM', 15.6, 4.4, 'rank'), T('RHEASILVIA PEAK · VESTA', 15.6, 2.2, 'fact'), T('DAWN HEIGHT MAP', 17.8, 2.2, 'fact'),
    T('#1 · 21.3 KM', 20.0, 5.0, 'rank'), T('OLYMPUS MONS · MARS', 20.0, 2.5, 'fact'), T('VIKING 1 IMAGE', 22.5, 2.5, 'fact'),
    T('Images: NASA/JPL', 20.0, 5.0, 'credit', y=26, font_px=56),
]
AT = [0.1, 3.08, 7.28, 11.48, 15.68, 20.08]
LINES = [
    ('hook', "Mount Everest isn't even top five."),
    ('i5', 'Five: Venus, eleven kilometres.'),
    ('i4', "Four: Saturn's moon, thirteen kilometres."),
    ('i3', "Three: Jupiter's moon Io, seventeen and a half kilometres."),
    ('i2', 'Two: Vesta, twenty kilometres.'),
    ('i1', 'One: Olympus Mons, twenty-one point three.'),
]
KEEP = ['eleven kilometres', 'thirteen kilometres', 'seventeen and a half kilometres', 'twenty kilometres', 'twenty-one point three',
        'Mount Everest', "Saturn's moon", "Jupiter's moon Io", 'Olympus Mons', 'top five']
CRED = [
    "Olympus Mons, Viking 1 Orbiter digital mosaic: NASA/JPL-Caltech/USGS (NASA page states no copyright notice) - https://science.nasa.gov/resource/viking-1-orbiter-image-olympus-mons/",
    "Venus - Maxwell Montes and Cleopatra Crater, Magellan radar image PIA00149 (5 Feb 1996): NASA/JPL (NASA page states no copyright notice) - https://photojournal.jpl.nasa.gov/catalog/PIA00149",
    "The Himalayas of Iapetus, Cassini image PIA08372 (13 Sep 2007): NASA/JPL/Space Science Institute (NASA page states no copyright notice) - https://photojournal.jpl.nasa.gov/catalog/PIA08372",
    "Mountains on Io at Sunset, Galileo image PIA03886: NASA/JPL/University of Arizona/Arizona State University (NASA page states no copyright notice; shows Mongibello Mons, not Boosaule Montes) - https://photojournal.jpl.nasa.gov/catalog/PIA03886",
    "Topography and Albedo Image of Central Complex and Hummocky Terrain, Vesta, Dawn framing camera PIA15124 (colour height-map panel): NASA/JPL-Caltech/UCLA/MPS/DLR/IDA (NASA page states no copyright notice; partner data co-credited as above) - https://photojournal.jpl.nasa.gov/catalog/PIA15124",
    "Height-bar graphics: original studio graphics drawn from the published heights (no third-party imagery; font Cairo, SIL Open Font License 1.1)",
]
cutlist = dict(production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=texts,
    narration=dict(voice='Charon', style="Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath; no hype. Read only the transcript, nothing else.",
                   max_pause=0.28, lines=[dict(id=i, text=t, at=a) for (i, t), a in zip(LINES, AT)]),
    captions='narration', music=None, bed='tone', bed_accents=[0, 3.0, 7.2, 11.4, 15.6, 20.0], credits=CRED, target_duration=25.0,
    caption_min_page=1.5, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8, caption_keep=KEEP)
json.dump(cutlist, open(os.path.join(D, 'cutlist.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)

SRC = dict(
    hook="Everest 8,848 m above mean sea level, NOAA National Ocean Service: https://oceanservice.noaa.gov/facts/highestpoint.html. Every listed peak is 11 km or more (Venus 'almost 11 km' NASA/JPL PIA00149), so Everest (8.85 km) is below all five on the published numbers; Mauna Kea 10,210 m base to peak (same NOAA page) is also below #5.",
    i5="NASA/JPL Magellan PIA00149: Maxwell is the highest mountain on Venus, 'rising almost 11 kilometers (6.8 miles) above mean planetary radius': https://photojournal.jpl.nasa.gov/catalog/PIA00149 ; NASA Venus facts 'One mountain reaches 36,000 feet (11 kilometers)': https://science.nasa.gov/venus/venus-facts/",
    i4="Giese et al. 2008, Icarus 193(2) 359-371, doi:10.1016/j.icarus.2007.06.005 (Cassini stereo terrain model of Iapetus' leading side: heights from -10 km to +13 km; ridge up to 13 km from its base). NASA/JPL captions differ: ~20 km (PIA06646, 2005) and ~10 km (PIA08372, 2007), hence 'estimates vary': https://elib.dlr.de/57135/ ; https://www.jpl.nasa.gov/images/pia06646-details-in-the-dark/ ; https://photojournal.jpl.nasa.gov/catalog/PIA08372",
    i3="Schenk et al. (NASA NTRS 20030012598, 'The Mountains of Io'): 'the highest known mountain is Boosaule Montes (17.5 +/- 3 km)': https://ntrs.nasa.gov/citations/20030012598 ; other published figures 14-18 km, so estimates vary. Io = Jupiter's moon (NASA https://science.nasa.gov/jupiter/moons/io/)",
    i2="NASA/JPL PIA15322: Rheasilvia central complex 'approximately 200 kilometers in diameter and has approximately 20 kilometers of relief from its base': https://www.jpl.nasa.gov/images/pia15322-3-d-image-of-the-central-complex-in-vestas-rheasilvia-impact-basin/ ; Schenk et al. 2012 Science 336:694 and NASA Dawn pages give 19-25 km depending on baseline. NASA/JPL's own retrospective ranks it second-tallest after Olympus Mons: https://www.jpl.nasa.gov/blog/2013/1/the-giant-asteroid-a-retrospective",
    i1="NASA Planetary Geodesy Data Archive, MOLA: 'the highest point on Olympus Mons (21,300 m)' above the MOLA datum: https://pgda.gsfc.nasa.gov/products/62 ; other NASA pages give 22-25 km on other baselines (SVS 2869 23 km; NASA Mars facts 25 mi base-to-summit claim not used), so estimates vary.",
)
narr = [dict(id=i, text=t, sources=[SRC[i]]) for i, t in LINES]
desc = """Ranked by the tallest mountain on each world, using published peak heights. Mount Everest (8.85 km above sea level, NOAA) is not in the top five. Here are the five tallest mountains, one per world, tallest first. Heights are as published by NASA mission teams and in peer-reviewed papers; baselines differ by world and estimates vary a lot, so treat every number as an estimate.

5. Maxwell Montes, Venus: about 11 km above mean planetary radius (NASA/JPL, Magellan)
4. Equatorial ridge, Iapetus (Saturn): up to about 13 km (Cassini stereo topography, Giese et al. 2008); NASA captions give 10 km to 20 km
3. Boosaule Montes, Io (Jupiter): 17.5 km, plus or minus 3 km (Schenk et al., NASA NTRS); other figures run 14-18 km
2. Central peak of the Rheasilvia basin, Vesta: about 20 km of relief from its base (NASA/JPL, Dawn); other Dawn figures run up to 25 km
1. Olympus Mons, Mars: 21.3 km above the MOLA datum, the highest point in NASA's laser-altimeter data; other baselines give about 22-25 km
Comparator: Mount Everest 8.85 km above sea level (NOAA).

Scope: one mountain per world. Mars also has other very tall volcanoes (for example Ascraeus Mons, second to Olympus Mons) that are not listed separately. Mauna Kea is 10.2 km from base to peak (NOAA), which is below #5's published 11 km but is measured from a different baseline. The Vesta, Iapetus, Io and Mars figures also use different baselines (relief from the base versus height above a datum), and #2 to #4 could swap order under other published estimates; Olympus Mons is ranked first on NASA/JPL's own statement that it is slightly higher than Vesta's peak.

What you see: real NASA spacecraft imagery, not always the mountain itself. #5 a Magellan radar image of Maxwell Montes and Cleopatra crater (radar, not a photograph). #4 a Cassini close-up of mountainous terrain along Iapetus' equatorial ridge (NASA's caption for this image says about 10 km). #3 a Galileo image of Io's Mongibello Mons (about 7 km), not Boosaule Montes. #2 a Dawn framing-camera height map of the Rheasilvia central complex region (the colours show height, not the real colours of Vesta). #1 a Viking 1 mosaic of Olympus Mons. The bar graphics are original: bar length is exactly proportional to the published height, one scale throughout.

Narration is AI-generated (Gemini TTS, voice Charon).

Sources and credits:
- Heights: NASA/JPL Magellan PIA00149 https://photojournal.jpl.nasa.gov/catalog/PIA00149; Giese et al. 2008, Icarus 193, doi:10.1016/j.icarus.2007.06.005; Schenk et al., NASA NTRS https://ntrs.nasa.gov/citations/20030012598; NASA/JPL PIA15322 https://www.jpl.nasa.gov/images/pia15322-3-d-image-of-the-central-complex-in-vestas-rheasilvia-impact-basin/; NASA MOLA https://pgda.gsfc.nasa.gov/products/62; NOAA Everest and Mauna Kea https://oceanservice.noaa.gov/facts/highestpoint.html
""" + "\n".join('- ' + c for c in CRED) + "\nNASA does not endorse this video."
on_screen = [dict(t=x['at'], dur=x['dur'], text=x['text']) for x in texts]
script = dict(production_id=PID, language='en', hook_text='EVEREST: NOT TOP 5',
    title_proposed="Everest Isn't Even a Top-5 Mountain in the Solar System", title="Everest Isn't Even a Top-5 Mountain in the Solar System",
    description=desc, hashtags=['#SolarSystem', '#OlympusMons', '#Space', '#PlanetExtremes', '#NASA'], narration=narr, on_screen=on_screen,
    pacing_note='25.0 s: hook 3.0 (Olympus Mons crop + chip at 0 s, first cut 1.0 s to the Everest-vs-five bar lineup), #5 4.2, #4 4.2, #3 4.2, #2 4.4, #1 5.0 (loop end = frame 0 crop). Each of #5-#2 = real NASA still 2.1 s + bar graphic 2.1 s.',
    comparator='Mount Everest 8,848 m above mean sea level (NOAA)', synthetic_media_disclosure=True,
    disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)', attribution_block="\n".join('- ' + c for c in CRED) + "\nNASA does not endorse this video.",
    value_checks=dict(source='NASA/JPL PIA00149 (Maxwell ~11), Giese et al. 2008 Icarus (Iapetus +13), Schenk et al. NTRS 20030012598 (Boosaule 17.5+/-3), NASA/JPL PIA15322 (Rheasilvia ~20 relief), NASA PGDA MOLA (Olympus 21.3), NOAA (Everest 8,848 m; Mauna Kea 10,210 m)', checked='2026-10-28',
        note="Plan n=7 ranking (Maxwell 11 / Boosaule 17.5 / Iapetus 20 / Rheasilvia 22 / Olympus 21.9) did NOT hold as drafted: NASA/JPL's own captions put Iapetus' ridge at 10 km (2007), 13 km (Giese stereo) or 20 km (2005), Vesta at ~20 km (JPL relief) and Olympus Mons at 21.3 km (MOLA datum), so the 'Rheasilvia 22 > Olympus 21.9' tie-break is baseline-dependent and JPL itself ranks Olympus first. Rebuilt as one mountain per world with one cited value each (Olympus 21.3, Vesta 20, Io 17.5, Iapetus 13, Venus 11) and Everest 8.85 as the comparator; Io/Iapetus order and #2-#4 spacing flagged 'estimates vary'. Title claim 'not a top-5 mountain' holds: Olympus, Vesta peak, Boosaule and Iapetus ridge alone exceed Everest by 2x even before other Mars volcanoes."))
json.dump(script, open(os.path.join(D, 'script.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print('ok', len(desc))
