import json
ID='rank-261028-xkgv'
cl=json.load(open(f'productions/{ID}/cutlist.json',encoding='utf8'))
NCEI='https://www.ngdc.noaa.gov/stp/space-weather/solar-data/solar-features/solar-flares/x-rays/goes/xrs/goes-xrs-report_%d.txt'
credit=cl['credits']
attr="\n".join('- '+c for c in credit)+"\nNASA does not endorse this video."
desc=f"""Metric: peak GOES soft X-ray (1-8 Angstrom) class, on NOAA's ORIGINAL (operational) scale, for every flare in NOAA's GOES record since 1976 (NOAA NCEI GOES X-ray flare event reports). One scale for all five. Scope: strongest flares in that record; no flare since 2005 comes close (the strongest since 2017 is X9.0, 3 Oct 2024, NOAA). The #1 value is an ESTIMATE: the GOES detector saturated.

Ranked by peak X-ray class, strongest first:
5. 7 Sep 2005 - X17.0 (peak 17:40 UT)
4. 28 Oct 2003 - X17.2 (peak 11:10 UT)
3. 16 Aug 1989 - X20.0 (tied with #2)
2. 2 Apr 2001 - X20.0 (peak 21:51 UT; tied with #3, the newer event is listed higher)
1. 4 Nov 2003 - X28, estimated (peak about 19:50 UT). The GOES X-ray detector saturated, so NOAA extrapolated the value. NASA's own caption calls X28 the consensus estimate and notes debate that it was as high as X40; later independent studies of ionospheric data put it near X45 (Thomson et al. 2004, Geophysical Research Letters).

Other scale: in 2020 NOAA reprocessed its science-quality GOES data from GOES-15 and earlier without the old 0.7 scaling factor, so older flares are quoted at different class numbers on that scale (some lists show X40 or higher for 4 Nov 2003). This video uses NOAA's original operational classes for all five. The order and the #2/#3 tie could change on rescaled values.

What you see: #1 and #4 are real SOHO/EIT extreme-ultraviolet images (195 Angstrom, shown in green) from NASA's Scientific Visualization Studio, including time-lapse crops (about 6 hours of Sun time per second). #5, #3 and #2 are original data graphics, not footage: SOHO missed the 2005 flare and there is no usable video of the 1989 and 2001 events. Bar length is exactly proportional to the X-class on one scale; the hatched #1 bar is an estimate.

Narration is AI-generated (Gemini TTS, voice Charon).

Sources and credits:
- Flare classes: NOAA NCEI GOES X-ray event reports {NCEI%1989} ; {NCEI%2001} ; {NCEI%2003} ; {NCEI%2005}
- NASA SVS 2959 caption (X28 consensus estimate, X40 debate): https://svs.gsfc.nasa.gov/2959 ; NASA Sun-Earth Day gallery: https://science.gsfc.nasa.gov/attic/sunearthday.nasa.gov/2010/multimedia/gal_004.php
- Strongest flare since 2017 (X9.0): NOAA NESDIS https://www.nesdis.noaa.gov/news/sun-releases-strong-x90-solar-flare
{attr}"""
def src(*a): return list(a)
narr=[
 dict(id='hook',text=cl['narration']['lines'][0]['text'],sources=["Scope: every flare in the NOAA NCEI GOES XRS event reports 1976-2017 (files 1976..2017) plus NOAA NESDIS for later years (strongest X9.0, 3 Oct 2024); the five listed are the only flares at or above X17.0. 4 Nov 2003: GOES X-ray detector saturated, NOAA estimate X28: NASA SVS 2959 and https://science.gsfc.nasa.gov/attic/sunearthday.nasa.gov/2010/multimedia/gal_004.php"]),
 dict(id='i5',text=cl['narration']['lines'][1]['text'],sources=[NCEI%2005+" : 20050907 1717 1803 1740 X17.0 (peak 17:40 UT)"]),
 dict(id='i4',text=cl['narration']['lines'][2]['text'],sources=[NCEI%2003+" : 20031028 0951 1124 1110 X17.2"]),
 dict(id='i3',text=cl['narration']['lines'][3]['text'],sources=[NCEI%1989+" : 19890816 X20.0 (tie with 2001-04-02)"]),
 dict(id='i2',text=cl['narration']['lines'][4]['text'],sources=[NCEI%2001+" : 20010402 2132 2203 2151 X20.0 (tie with 1989-08-16; newer listed higher)"]),
 dict(id='i1',text=cl['narration']['lines'][5]['text'],sources=[NCEI%2003+" : 20031104 1929 2006 1950 X28.0 (estimated; detector saturated); NASA gal_004: 'consensus ... somewhere around X28'; SVS 2959: debate that it was as high as X40"])]
on=[dict(t=t['at'],dur=t['dur'],text=t['text']) for t in cl['texts']]
sc=dict(production_id=ID,language='en',hook_text="X28 FLARE · ESTIMATED · DETECTOR SATURATED",title_proposed="The Solar Flare That Overloaded the Sensor",title="The Solar Flare That Overloaded the Sensor",
 description=desc,hashtags=["#SolarFlare","#Sun","#Space","#PlanetExtremes","#NASA"],narration=narr,on_screen=on,
 pacing_note="25.0 s: hook 3.0 (SOHO X28 flare crop + claim chip + scope footer at 0 s, cut at 1.0 s to lineup), #5 at 3.0, 4.2 s per entry (#2 4.4), #1 5.0; last 0.6 s repeats frame-0 title+chip (loop). Footer chips on every frame: PEAK GOES X-RAY CLASS / NOAA ORIGINAL SCALE / ALL FLARES 1976-2025.",
 synthetic_media_disclosure=True,disclosure_note="Narration is AI-generated (Gemini TTS, voice Charon)",attribution_block=attr,
 value_checks=dict(source="NOAA NCEI GOES XRS event reports 1976-2017 parsed in full (flares >= X12: 1982 X12.0/X12.9, 1984 X13.0, 1989-03-06 X15.0, 1989-08-16 X20.0, 1989-10-19 X13.0, 1991 X12.0 x5, 2001-04-02 X20.0, 2001-04-15 X14.4, 2003-10-28 X17.2, 2003-11-04 X28.0, 2005-09-07 X17.0); NOAA NESDIS for X9.0 (2024)",checked="2026-10-28",
  note="Plan values X17.0/X17.2/X20.0/X20.0/X28 all re-verified in the primary NCEI reports. Completeness: no other flare >= X15.1 in the 1976-2017 record; next is 1989-03-06 X15.0 (#6). Scale: NOAA original operational classes (rescaled science-quality data would change numbers, not shown). 2003-11-04 flagged ESTIMATED. 1989/2001 tie at X20.0 stated on screen."))
json.dump(sc,open(f'productions/{ID}/script.json','w',encoding='utf8'),indent=1,ensure_ascii=False)
print(len(desc))
