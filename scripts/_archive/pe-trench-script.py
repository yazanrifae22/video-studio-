"""Plan n=4 (rank-261028-4pgk): write productions/<id>/script.json from cutlist.json (on_screen, narration) + sources. UTF-8.
Usage: python scripts/pe-trench-script.py"""
import json

P = 'rank-261028-4pgk'
f = f'E:/clips-viral/productions/{P}/cutlist.json'
c = json.load(open(f, encoding='utf-8'))
NOAA = 'NOAA Ocean Exploration, "How deep is the ocean?": https://oceanexplorer.noaa.gov/ocean-fact/ocean-depth/ ("The deepest place in the ocean measures 10,935 meters (35,876 feet)", Challenger Deep, Mariana Trench)'
EV = 'Everest 8,849 m (8,848.86 m, joint Nepal-China survey announced 8 Dec 2020): https://www.aljazeera.com/news/2020/12/8/mt-everest-nepal-china-announce-revised-height-at-8848-metres ; 10,935 - 8,849 = 2,086 m'
IZU = 'Nagoya University, 1 Sep 2022: "reached a depth of 9,801 meters at the bottom of the Izu-Ogasawara Trench" (Ring of Fire Expedition 2022, 13 Aug 2022): https://en.nagoya-u.ac.jp/news/articles/news_279/'
PHI = 'University of the Philippines, 23 Mar 2021: "On March 23, the explorers made touchdown at 10,045 meters deep" (Emden Deep, Philippine Trench): https://up.edu.ph/up-marine-scientist-makes-history-as-the-1st-filipino-to-reach-the-3rd-deepest-point-on-earth/'
KER = 'New Zealand Gazette notice 2023-ln3297 (NZ Geographic Board, adopted undersea feature names, 1 Aug 2023): Kermadec Trench "ranging in depth from 4,000m to 10,047m": https://gazette.govt.nz/notice/id/2023-ln3297 ; Scholl Deep = deepest part (NIWA, 20 Jan 2023): https://niwa.co.nz/news/new-discoveries-new-zealands-deepest-waters'
TON = 'Bongiovanni, Stewart & Jamieson (2022), High-resolution multibeam sonar bathymetry of the deepest place in each ocean, Geoscience Data Journal 9(1):108-123, doi:10.1002/gdj3.122 (Five Deeps Expedition, Kongsberg EM124): Horizon Deep, Tonga Trench, 10,816 +/- 16 m: https://nora.nerc.ac.uk/id/eprint/530930/'
ETO = ('Order/completeness check, NOAA NCEI ETOPO 2022 15 arc-second grid (doi:10.25921/fd45-gt74), deepest cell per trench (the grid smooths narrow deeps, so it is used only to '
       'order near ties and rule out other trenches): Mariana 10,794; Tonga 10,768; Kermadec 10,102; Philippine 10,087; Izu-Ogasawara 9,889; Kuril-Kamchatka 9,654; Yap 8,933; '
       'Puerto Rico 8,639; South Sandwich 8,447; New Britain 8,257; Japan 7,959 m')
lines = {l['id']: l['text'] for l in c['narration']['lines']}
narr = [dict(id='hook', text=lines['hook'], sources=[NOAA, EV]), dict(id='i5', text=lines['i5'], sources=[IZU, ETO]),
        dict(id='i4', text=lines['i4'], sources=[PHI, ETO]), dict(id='i3', text=lines['i3'], sources=[KER, PHI, ETO]),
        dict(id='i2', text=lines['i2'], sources=[TON]), dict(id='i1', text=lines['i1'], sources=[NOAA, EV])]
on = [dict(t=x['at'], dur=x['dur'], text=x['text']) for x in c['texts']]
credits = c['credits']
attr = '; '.join(credits) + '. Fonts in the graphics: Cairo, SIL Open Font License 1.1. NASA and NOAA do not endorse this video.'
desc = ("Drop Mount Everest into the Mariana Trench and its peak would still sit about 2 km underwater. The five deepest ocean trenches, ranked by the deepest point measured in each:\n\n"
        "5. Izu-Ogasawara Trench, Japan: 9,801 m (crewed dive to the bottom, 2022)\n"
        "4. Philippine Trench, Emden Deep: 10,045 m (crewed dive touchdown, 2021)\n"
        "3. Kermadec Trench, New Zealand: 10,047 m (NZ Geographic Board)\n"
        "2. Tonga Trench, Horizon Deep: 10,816 m +/- 16 m (multibeam sonar, Five Deeps Expedition)\n"
        "1. Mariana Trench, Challenger Deep: 10,935 m (NOAA)\n\n"
        "Everest is 8,849 m tall (2020 Nepal-China survey), so 10,935 - 8,849 = 2,086 m of water would remain above the summit.\n"
        "#3 and #4 are a near tie: depth figures differ by method and survey, by tens of metres. We ordered them with NOAA's ETOPO 2022 global relief grid, which also puts Kermadec "
        "just deeper than the Philippine Trench. Older textbook figures (Kuril-Kamchatka 10,542 m, Philippine Trench 10,540 m) come from mid-20th-century soundings that modern "
        "sonar surveys and grids do not support; Kuril-Kamchatka measured 9,604 m in a 2016 multibeam survey (Dreutter et al. 2020), so it falls out of the top five.\n"
        "What you see: the opening and closing frames are an original heights-to-scale graphic (shapes schematic). #5 to #2 are original relief maps drawn from NOAA ETOPO 2022 data, "
        "with a depth gauge. #1 shows NASA's sonar map of the Mariana Trench and a NOAA ROV clip of a jellyfish filmed about 3,700 m down, near the trench (not at its floor).\n\n"
        "Narration is AI-generated (Gemini TTS, voice Charon).\n\nSources and credits:\n"
        "- Challenger Deep 10,935 m: https://oceanexplorer.noaa.gov/ocean-fact/ocean-depth/\n"
        "- Horizon Deep 10,816 m: Bongiovanni, Stewart & Jamieson, Geoscience Data Journal (2022), doi:10.1002/gdj3.122\n"
        "- Kermadec 10,047 m: https://gazette.govt.nz/notice/id/2023-ln3297\n"
        "- Philippine Trench 10,045 m: https://up.edu.ph/up-marine-scientist-makes-history-as-the-1st-filipino-to-reach-the-3rd-deepest-point-on-earth/\n"
        "- Izu-Ogasawara 9,801 m: https://en.nagoya-u.ac.jp/news/articles/news_279/\n"
        "- Kuril-Kamchatka 9,604 m: Dreutter et al., Progress in Oceanography (2020)\n"
        "- Everest 8,849 m: https://www.aljazeera.com/news/2020/12/8/mt-everest-nepal-china-announce-revised-height-at-8848-metres\n"
        + ''.join('- ' + x + '\n' for x in credits) +
        "- Fonts in the graphics: Cairo, SIL Open Font License 1.1\nNASA and NOAA do not endorse this video.")
script = dict(
    production_id=P, language='en', hook_text='10,935 M DEEP', title_proposed='Everest Would Vanish in This Trench', title='Everest Would Vanish in This Trench',
    description=desc, hashtags=['#MarianaTrench', '#Ocean', '#PlanetExtremes', '#DeepSea', '#NOAA'], narration=narr, on_screen=on,
    pacing_note=('23.4 s: hook 1.87 (Everest-in-trench graphic + 10,935 M DEEP at 0 s, first cut 1.0 s), #5-#2 = original NOAA ETOPO 2022 relief maps (one layout), slots = measured TTS + 0.08 s (~0.32 s acoustic gap), '
                 '#1 NOAA ROV jelly + NASA sonar map + push-out to the identical frame 0. Brisk read, max_pause 0.28. Last line "two kilometres under" loops to '
                 '"Everest would vanish in this trench". Every spoken number verified by per-line ASR (faster-whisper medium.en).'),
    comparator='Everest 8,849 m (2020 survey); 10,935 - 8,849 = 2,086 m of water above the summit',
    synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)', attribution_block=attr,
    value_checks=dict(checked='2026-10-28', note=(
        'Plan n=4 ranking did NOT hold. Plan: #5 Kermadec ~10,047, #4 Philippine ~10,540, #3 Kuril-Kamchatka ~10,542, #2 Tonga 10,882, #1 Mariana 10,935. The NOAA OER '
        'depth-comparison PDF only labels Mariana (10,929 m) and Tonga (10,882 m) from the GEBCO_2019 grid, nothing for #3-#5. Kuril-Kamchatka 10,542 m is debunked (SO250 '
        'multibeam 9,604 m, Dreutter et al. 2020; NOAA NCEI PD20KK01 raw max 9,682 m) -> out; Izu-Ogasawara (9,801 m dive, Nagoya U; ETOPO 2022 9,889 m) enters at #5. '
        'Philippine 10,540 m is the 1951 Galathea sounding; the 2021 crewed dive touched down at 10,045 m (UP) and ETOPO 2022 gives 10,087 m -> 10,045 m, #4. Kermadec 10,047 m '
        '(NZ Gazette 2023; ETOPO 10,102 m) -> #3 (near tie, disclosed). Tonga: multibeam 10,816 +/- 16 m (Bongiovanni et al.) replaces the GEBCO_2019 grid value 10,882 m. '
        'Mariana 10,935 m (NOAA OE; multibeam 10,924 +/- 15 m agrees). Completeness: ETOPO 2022 deepest cells of the other trenches checked (Yap 8,933, Puerto Rico 8,639, '
        'South Sandwich 8,447, New Britain 8,257, Japan 7,959 m).')))
json.dump(script, open(f'E:/clips-viral/productions/{P}/script.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(desc))
