"""rank-261028-urfr: write cutlist.json + script.json + brief.json. Usage: python scripts/pe-fireball-cutlist.py"""
import json, os
PID = 'rank-261028-urfr'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'productions', PID); os.makedirs(D, exist_ok=True)
DASH, NPP = 'src-261028-0esv', 'src-261028-sflq'
G = dict(hook='src-261028-37mw', loc5='src-261028-rmur', bar5='src-261028-izd2', loc4='src-261028-06e9', bar4='src-261028-imnd',
         loc3='src-261028-0p24', bar3='src-261028-vub4', loc2='src-261028-vlwe', misr='src-261028-is3g')
T0, E5, E4, E3, E2, E1, END = 3.3, 3.3, 7.3, 11.3, 15.3, 19.8, 24.8
DPAN = dict(zoom=1.0, pan_x=72, trim={'bottom': 100})          # dashcam: bring the fireball (x ~0.30 of the 16:9 frame) to the centre of the 9:16 crop
F0 = 19.6                                # dashcam source time of frame 0 (starburst); the loop tail ends exactly here
def seg(a, i, o, item, why, **k): return dict(asset_id=a, src_in=i, src_out=o, fill=k.pop('fill', 'cover'), mute_source=True, item=item, why=why, **k)
segments = [
    seg(DASH, F0, F0 + 1.0, 0, 'hook: #1 Chelyabinsk fireball at its brightest, dashcam (frame 0 = loop end + 1 frame)', **DPAN),
    seg(G['hook'], 0, 2.3, 0, 'hook shot 2 (cut at 1.0 s): five bars, one linear kt scale; #1 towers over the rest'),
    seg(G['loc5'], 0, 2.0, 5, '#5 locator: southern Africa'), seg(G['bar5'], 0, 2.0, 5, '#5 bar 20 kt'),
    seg(G['loc4'], 0, 2.0, 4, '#4 locator: western Pacific'), seg(G['bar4'], 0, 2.0, 4, '#4 bar 30 kt'),
    seg(G['loc3'], 0, 2.0, 3, '#3 locator: Sulawesi, Indonesia'), seg(G['bar3'], 0, 2.0, 3, '#3 bar 33 kt'),
    seg(G['loc2'], 0, 1.5, 2, '#2 locator: Bering Sea'), seg(G['misr'], 0, 3.0, 2, '#2 NASA Terra/MISR view of the trail shadow and cloud, minutes later (PIA22825)'),
    seg(NPP, 30.0, 32.0, 1, '#1 NASA/GSFC SVS: dust plume of the Chelyabinsk blast, 10-50 km altitude scale', zoom=1.0, trim={'left': 640, 'right': 580}),
    seg(DASH, F0 - 3.0, F0, 1, '#1 dashcam run-up; last frame = frame before hook frame 0 (seamless loop)', **DPAN),
]
T = []
def t(text, at, dur, role, **k): T.append(dict(text=text, at=round(at, 2), dur=round(dur, 2), role=role, **k))
t('441 KT EXPLOSION', 0, T0, 'title', y=-23)
t('CHELYABINSK · DASHCAM', 0, 1.0, 'fact', y=-16); t('TOP 5 · ONE ENERGY SCALE', 1.0, T0 - 1.0, 'fact', y=-16)
t('Dashcam: Noo4891', 0, 1.0, 'credit', y=26, font_px=56)
ent = [
    (5, E5, '#5 · 20 KT', 'S. AFRICA · 21 NOV 2009', '38 KM UP · 32 KM/S', 'Map: NASA Earth Observatory', 'Data: NASA/JPL CNEOS'),
    (4, E4, '#4 · 30 KT', 'PACIFIC · 1 FEB 1994', 'NO ALT/SPEED IN TABLE', 'Map: NASA Earth Observatory', 'Data: NASA/JPL CNEOS'),
    (3, E3, '#3 · 33 KT', 'SULAWESI · 8 OCT 2009', '19 KM UP · 19 KM/S', 'Map: NASA Earth Observatory', 'Data: NASA/JPL CNEOS'),
]
for n, a, chip, f1, f2, c1, c2 in ent:
    t(chip, a, 4.0, 'rank', y=-23)
    t(f1, a, 2.0, 'fact', y=-16); t(f2, a + 2.0, 2.0, 'fact', y=-16)
    t(c1, a, 2.0, 'credit', y=26, font_px=56); t(c2, a + 2.0, 2.0, 'credit', y=26, font_px=56)
t('#2 · 49 KT', E2, 4.5, 'rank', y=-23)
t('BERING SEA · 18 DEC 2018', E2, 1.5, 'fact', y=-16); t('TERRA SATELLITE VIEW', E2 + 1.5, 3.0, 'fact', y=-16)
t('Map: NASA Earth Observatory', E2, 1.5, 'credit', y=26, font_px=56); t('Terra/MISR: NASA/JPL', E2 + 1.5, 3.0, 'credit', y=26, font_px=56)
LOOP = END - 0.9
t('#1 · 441 KT', E1, LOOP - E1, 'rank', y=-23)
t('NASA PLUME MODEL', E1, 2.0, 'fact', y=-16); t('1,600+ HURT BY GLASS', E1 + 2.0, LOOP - E1 - 2.0, 'fact', y=-16)
t('NASA/GSFC SVS', E1, 2.0, 'credit', y=26, font_px=56); t('Dashcam: Noo4891', E1 + 2.0, END - E1 - 2.0, 'credit', y=26, font_px=56)
t('441 KT EXPLOSION', LOOP, 0.9, 'title', y=-23); t('CHELYABINSK · DASHCAM', LOOP, 0.9, 'fact', y=-16)
t('CNEOS FIREBALL RECORDS SINCE 1988', 0, END, 'credit', y=-34, font_px=38)
t('IMPACT ENERGY · KT TNT · NASA/JPL', 0, END, 'credit', y=-31, font_px=38)
lines = [
    ('hook', 'Four hundred forty-one kilotons. That\'s only number one.', 0.05),
    ('i5', 'Five: southern Africa. Twenty kilotons, thirty-eight kilometres up.', E5),
    ('i4', 'Four: the western Pacific. Thirty kilotons, in nineteen ninety-four.', E4),
    ('i3', 'Three: Indonesia. Thirty-three kilotons, nineteen kilometres up.', E3),
    ('i2', 'Two: the Bering Sea. Forty-nine kilotons, over open water.', E2),
    ('i1', 'One: Chelyabinsk. More than sixteen hundred people hurt, mostly by glass.', E1),
]
CNEOS = 'https://ssd-api.jpl.nasa.gov/fireball.api?sort=-impact-e&limit=8'
CNEOS_PAGE = 'https://cneos.jpl.nasa.gov/fireballs/'
NASA_C = 'https://science.nasa.gov/blogs/planetary-defense/2023/02/15/remembering-the-chelyabinsk-impact-10-years-ago-and-looking-to-the-future/'
cred = [
    "Fireball energies and positions: NASA/JPL Center for Near-Earth Object Studies (CNEOS) Fireball and Bolide Reports, impact-energy field, kt of TNT (checked 28 Oct 2026) - %s and %s" % (CNEOS_PAGE, CNEOS),
    "Chelyabinsk blast energy (440,000 tons of TNT), window damage and 1,600+ injuries: NASA Science, Planetary Defense blog, 15 Feb 2023 - " + NASA_C,
    "Dashcam recording of the Chelyabinsk meteor event, Magnitogorsk, 15 Feb 2013: uploader Noo4891 (YouTube https://www.youtube.com/watch?v=Z_OYxWDUaI8), via Wikimedia Commons (tagged PD-RU-exempt-autocam) - https://commons.wikimedia.org/wiki/File:2013_Russian_meteor_event_(Magnitogorsk).webm . Clip muted, 4 s.",
    "Chelyabinsk Bolide Plume as seen by NPP and NASA Models (OMPS Limb data + GEOS-5 model visualization, not a photograph): NASA's Goddard Space Flight Center Scientific Visualization Studio (page states no copyright notice) - https://svs.gsfc.nasa.gov/4094/",
    "MISR Images Fireball Over Bering Sea (PIA22825), Terra satellite, 23:55 UTC 18 Dec 2018: NASA/GSFC/LaRC/JPL-Caltech, MISR Team (page states no copyright notice) - https://www.jpl.nasa.gov/images/pia22825-misr-images-fireball-over-bering-sea/",
    "World map base: Blue Marble: Next Generation with topography and bathymetry, NASA Earth Observatory (Reto Stockli) - https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry ; markers and graticule drawn by the studio",
    "Bar graphics: original studio graphics drawn from the CNEOS numbers (font Cairo, SIL Open Font License 1.1)",
]
NOEND = 'NASA, JPL, the Goddard SVS and the MISR team do not endorse this video.'
cut = dict(production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=T,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath (four hundred forty-one, thirty-three); no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=[dict(id=i, text=x, at=a) for i, x, a in lines]),
    captions='narration', music=None, bed='tone', bed_accents=[0, E5, E4, E3, E2, E1],
    credits=cred, target_duration=END, caption_min_page=1.6, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_y_ranges=[{'from': 0, 'to': 26, 'y': 11}],
    caption_keep=['Four hundred forty-one', 'only number one', 'Five: southern Africa', 'Twenty kilotons', 'Four: the western Pacific', 'Thirty kilotons', 'Three: Indonesia', 'Thirty-three kilotons',
                  'Two: the Bering Sea', 'Forty-nine kilotons', 'over open water', 'One: Chelyabinsk', 'sixteen hundred', 'people hurt'])
json.dump(cut, open(os.path.join(D, 'cutlist.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)

title = 'Space Rocks That Exploded Over Earth (Since 1988)'
desc = f"""Space rocks that exploded in Earth's atmosphere, ranked by estimated impact energy (kilotons of TNT) from NASA/JPL's CNEOS fireball database, which lists events detected by US government sensors since 1988 (checked 28 Oct 2026).

5. Southern Africa (22.0 S, 29.2 E), 21 Nov 2009: 20 kt, about 38 km up, 32 km/s
4. Western Pacific (2.7 N, 164.1 E), 1 Feb 1994: 30 kt (no altitude or speed in the table)
3. Sulawesi, Indonesia (4.2 S, 120.6 E), 8 Oct 2009: 33 kt, about 19 km up, 19 km/s
2. Bering Sea (56.9 N, 172.4 E), 18 Dec 2018: 49 kt, about 26 km up, 14 km/s
1. Chelyabinsk, Russia (54.8 N, 61.1 E), 15 Feb 2013: 441 kt, about 23 km up, 19 km/s. NASA: the air blast injured over 1,600 people, mostly by shattered glass.

How to read it: the criterion is the CNEOS "impact energy" estimate in kt of TNT, the same field for every entry. Scope: only fireballs in the CNEOS table (1988 to present), which is not a complete history. The 1908 Tunguska event happened before these sensors existed and is not ranked. Early press coverage of the 2018 Bering Sea fireball quoted about 173 kt; the CNEOS table lists 49 kt today, and that table value is the one used here. Values are estimates and are revised over time.

What you see: real dashcam footage of the Chelyabinsk fireball (Magnitogorsk camera, 15 Feb 2013, muted); a NASA Goddard visualization of the dust plume (satellite data plus a model, not a photograph); a NASA Terra/MISR image of the Bering Sea trail shadow and cloud taken minutes after that fireball; locator markers on a NASA world map; and original bar graphics on one linear energy scale. Only #1 and #2 have real imagery of the event itself; #3 to #5 are shown as map markers and data graphics.

Narration is AI-generated (Gemini TTS, voice Charon). {NOEND}

Sources and credits:
""" + '\n'.join('- ' + c for c in cred) + '\n' + NOEND
script = dict(production_id=PID, language='en', hook_text='441 KT EXPLOSION', title_proposed=title, title=title, description=desc,
    hashtags=['#Meteor', '#Chelyabinsk', '#NASA', '#PlanetExtremes', '#Space'],
    narration=[dict(id=i, text=x, sources=[CNEOS + ' (impact-e, kt TNT, checked 2026-10-28)'] + ([NASA_C] if i in ('i1',) else [])) for i, x, a in lines],
    on_screen=[dict(t=x['at'], dur=x['dur'], text=x['text']) for x in T],
    pacing_note='24.8 s: hook 3.3 (Chelyabinsk dashcam starburst + 441 KT EXPLOSION chip at 0 s, bars cut at 1.0 s), #5 4.0 (at 3.3 s), #4 4.0, #3 4.0, #2 4.5, #1 5.0; no outro; the last dashcam frame is the frame before hook frame 0 so the loop plays on; footer CNEOS FIREBALL RECORDS SINCE 1988 from 0 s.',
    comparator='NASA Science: Chelyabinsk air blast injured over 1,600 people, mostly by broken glass',
    synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)',
    attribution_block='\n'.join('- ' + c for c in cred) + '\n' + NOEND,
    value_checks=dict(source=CNEOS, page=CNEOS_PAGE, checked='2026-10-28',
        note='CNEOS fireball.api sort=-impact-e: 441 (2013-02-15 54.8N 61.1E alt 23.3 v 18.6), 49 (2018-12-18 56.9N 172.4E 26.0 / 13.6), 33 (2009-10-08 4.2S 120.6E 19.1 / 19.2), 30 (1994-02-01 2.7N 164.1E no alt/vel), 20 (2009-11-21 22.0S 29.2E 38.0 / 32.1); next 18 (2004-10-07). Table = US-government-sensor detections since 1988 only; Tunguska 1908 out of scope.'))
json.dump(script, open(os.path.join(D, 'script.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
brief = dict(production_id=PID, brand='rankings', criterion='Estimated impact energy (kt of TNT), NASA/JPL CNEOS fireball database (field impact-e), events detected by US government sensors 1988-present',
    primary_list=CNEOS, catalogue_check=CNEOS_PAGE, checked='2026-10-28',
    ranking=[dict(rank=1, name='Chelyabinsk, Russia 2013-02-15', value='441 kt'), dict(rank=2, name='Bering Sea 2018-12-18', value='49 kt'), dict(rank=3, name='Sulawesi, Indonesia 2009-10-08', value='33 kt'),
             dict(rank=4, name='Western Pacific 1994-02-01', value='30 kt'), dict(rank=5, name='Southern Africa 2009-11-21', value='20 kt')],
    excluded=['Tunguska 1908 (before sensor records)', 'events not detected by US government sensors', 'next in table: 18 kt (2004-10-07, Indian Ocean)', 'impacts of recovered meteorites (not an energy metric)'],
    ranking_change='plan n=11 kept; value for #5 and ranks verified on the primary API; entry names generalised (South Africa -> southern Africa: 22.0S 29.2E is near the border; Marshall Islands -> western Pacific: 2.7N 164.1E is open ocean)')
json.dump(brief, open(os.path.join(D, 'brief.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('ok', sum(s['src_out'] - s['src_in'] for s in segments))
