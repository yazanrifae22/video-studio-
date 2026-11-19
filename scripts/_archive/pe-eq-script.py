"""rank-261028-xgph: write script.json + brief.json from the cut list (on_screen mirrors cutlist texts). Usage: python scripts/pe-eq-script.py"""
import json
PID = 'rank-261028-xgph'
P = f'E:/clips-viral/productions/{PID}/'
cl = json.load(open(P + 'cutlist.json', encoding='utf-8'))
USGS = 'https://www.usgs.gov/programs/earthquake-hazards/science/20-largest-earthquakes-world-1900'
CC = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=8.8&starttime=1900-01-01&orderby=magnitude'
EV = 'https://earthquake.usgs.gov/earthquakes/eventpage/'
src = {
    'hook': [f'USGS, 20 Largest Earthquakes in the World since 1900: {USGS} (#1: 1960 Bio-Bio/Valdivia, Chile, M9.5)',
             f'USGS ComCat query (M>=8.8 since 1900, checked 2026-10-28): {CC} - no event above 9.5'],
    'i5': [f'USGS list: {USGS} (1952-11-04 Kamchatka M9.0); ComCat {EV}official19521104165830_30',
           'NOAA NGDC image 507 caption "Midway Island Flooded by 1952 Kamchatka Tsunami": https://www.ngdc.noaa.gov/hazard/data/kml/photos/35.kml'],
    'i4': [f'USGS list: {USGS} (2011-03-11 Tohoku M9.1); ComCat {EV}official20110311054624120_30 (mww 9.1)'],
    'i3': [f'USGS list: {USGS} (2004-12-26 Sumatra-Andaman M9.1, listed above Tohoku); ComCat {EV}official20041226005853450_30'],
    'i2': [f'USGS list: {USGS} (1964-03-28 UTC Great Alaska M9.2); ComCat {EV}official19640328033616_30',
           'USGS Fact Sheet 2014-3018: "the largest recorded earthquake in U.S. history" - https://pubs.usgs.gov/fs/2014/3018'],
    'i1': [f'USGS list: {USGS} (M9.5); ComCat {EV}official19600522191120_30',
           f'ComCat query {CC}: the next-largest events since 1960 are 9.2, 9.1, 9.1 - none matches 9.5'],
}
credits = cl['credits']
attrib = ('Magnitudes: USGS Earthquake Hazards Program, "20 Largest Earthquakes in the World since 1900" - ' + USGS +
          ' and the USGS ComCat catalogue. ' + '; '.join(credits) + '. USGS, NOAA, the U.S. Navy and the U.S. Air Force do not endorse this video.')
desc = (
    "Magnitude 9.5 - the strongest earthquake ever recorded on instruments. The five largest earthquakes since 1900, ranked by moment "
    "magnitude from the USGS list and its live catalogue (checked 28 Oct 2026):\n\n"
    "5. Kamchatka, Russia, 1952: M9.0 (its tsunami flooded Midway Island)\n"
    "4. Tohoku, Japan, 2011: M9.1\n"
    "3. Sumatra-Andaman, 2004: M9.1 (tied with Tohoku; the USGS lists it first)\n"
    "2. Alaska, 1964: M9.2 (the largest in U.S. history)\n"
    "1. Valdivia (Bio-Bio), Chile, 1960: M9.5 (its tsunami reached Hilo, Hawaii)\n\n"
    "Each whole step of magnitude releases about 32 times more energy (USGS), so 9.5 is roughly 5.6 times the energy of a 9.0. "
    "Next on the list: 8.8 (Chile 2010, Ecuador 1906, Kamchatka 2025). Photos show the damage after each event; the Tohoku footage was filmed "
    "on 22 March 2011, eleven days after the earthquake, and the Sumatra photos on 2 January 2005.\n\n"
    "Narration is AI-generated (Gemini TTS, voice Charon).\n\nSources and credits:\n"
    f"- Magnitudes: USGS Earthquake Hazards Program, 20 Largest Earthquakes in the World since 1900 - {USGS}\n"
    f"- USGS ComCat catalogue - {CC}\n"
    "- Energy per magnitude step: USGS, Earthquake Magnitude, Energy Release, and Shaking Intensity - https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity\n"
    + ''.join(f'- {c}\n' for c in credits) +
    "USGS, NOAA, the U.S. Navy and the U.S. Air Force do not endorse this video."
)
on_screen = [dict(t=x['at'], dur=x['dur'], text=x['text']) for x in cl['texts']]
sc = dict(
    production_id=PID, language='en', hook_text='M9.5 EARTHQUAKE',
    title_proposed='Magnitude 9.5: The Quake Nothing Has Matched',
    title='Magnitude 9.5: The Quake Nothing Has Matched',
    description=desc,
    hashtags=['#Earthquake', '#Tsunami', '#Chile1960', '#PlanetExtremes', '#Earth'],
    narration=[dict(id=l['id'], text=l['text'], sources=src[l['id']]) for l in cl['narration']['lines']],
    on_screen=on_screen,
    pacing_note='25.3 s: hook 3.1 (Chile 1960 aerial + M9.5 EARTHQUAKE at 0 s, first cut 1.0 s), #5 4.6, #4 4.0, #3 4.0, #2 4.6, #1 5.0. '
                'No spoken outro; "Nothing since has matched it" loops to "Nine point five"; last frame = frame 0 crop.',
    comparator='USGS: ~32x energy per whole magnitude step -> 10^(1.5*0.5) = 5.6x between M9.5 and M9.0 (description only)',
    synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)',
    attribution_block=attrib,
    value_checks=dict(source=USGS, catalogue=CC, checked='2026-10-28',
                      note='USGS list (2019 page) and live ComCat agree on the top 5: 9.5, 9.2, 9.1, 9.1, 9.0. Next: 8.8 x3 incl. Kamchatka 2025-07-29 (us6000qw60), '
                           'so the 2025 event does not enter the top 5. Plan entry n=3 was complete; no ranking change. #3/#4 tie at 9.1: USGS list order kept and the tie is shown on screen.'),
)
open(P + 'script.json', 'w', encoding='utf-8').write(json.dumps(sc, indent=1, ensure_ascii=False))
brief = dict(production_id=PID, brand='rankings', criterion='Moment magnitude (USGS), earthquakes since 1900 (instrumental era)',
             primary_list=USGS, catalogue_check=CC, checked='2026-10-28',
             ranking=[dict(rank=1, name='Valdivia, Chile', year=1960, value='M9.5'), dict(rank=2, name='Alaska', year=1964, value='M9.2'),
                      dict(rank=3, name='Sumatra-Andaman', year=2004, value='M9.1'), dict(rank=4, name='Tohoku, Japan', year=2011, value='M9.1'),
                      dict(rank=5, name='Kamchatka', year=1952, value='M9.0')],
             excluded=['Maule, Chile 2010 M8.8', 'Ecuador-Colombia 1906 M8.8', 'Kamchatka 2025 M8.8', 'pre-1900 estimates (e.g. Cascadia 1700) - not instrumental'],
             ranking_change='none (plan complete; tie disclosed)')
open(P + 'brief.json', 'w', encoding='utf-8').write(json.dumps(brief, indent=1, ensure_ascii=False))
print('ok')
