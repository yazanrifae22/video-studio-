"""rank-261028-dhcd script.json generator (on_screen/attribution/description kept in sync with cutlist.json). Usage: python scripts/pe-erupt-script.py"""
import json
PID = 'rank-261028-dhcd'; P = f'E:/clips-viral/productions/{PID}/'
cl = json.load(open(P + 'cutlist.json', encoding='utf8'))
U_PANT = 'https://www.usgs.gov/observatories/yvo/news/pantheon-caldera-eruptions-where-does-yellowstone-rank'
U_HIST = 'https://www.usgs.gov/volcanoes/yellowstone/science/summary-yellowstone-eruption-history'
U_GL = 'https://www.usgs.gov/observatories/yvo/news/discovery-ancient-super-eruptions-suggests-yellowstone-hotspot-may-be-waning'
U_PIN = 'https://pubs.usgs.gov/fs/1997/fs113-97/'
SRC = {
 'hook': f'USGS Yellowstone Volcano Observatory, "Pantheon of caldera eruptions" (Jul 2023): {U_PANT}; Pinatubo 1991 "more than 1 cubic mile (5 cubic kilometers) of material": {U_PIN}. Smallest listed entry (Huckleberry Ridge 2,450 km3, {U_HIST}) vs Pinatubo 5 km3 = about 490x, so "dwarf" holds.',
 'i5': f'USGS Yellowstone eruption-history table: Huckleberry Ridge Tuff 2,450 km3 erupted, ~2.1 million years ago: {U_HIST}',
 'i4': f'USGS YVO news: Grey\'s Landing "more than 2800 km3 of volcanic material in a single event", ~8.7 million years ago, Snake River Plain (Idaho): {U_GL}; Knott et al. 2020, Geology 48(9), preferred volume 2,800 km3 DRE, doi:10.1130/G47384.1',
 'i3': f'USGS YVO pantheon table: La Garita caldera (Fish Canyon Tuff), Colorado, 5,000 km3, 27.8 million years ago: {U_PANT}',
 'i2': f'USGS YVO pantheon table: Toba, Indonesia, 5,300 km3, 74,000 years ago: {U_PANT}',
 'i1': f'USGS YVO pantheon table: Wah Wah Springs caldera, southern Utah, 5,900 km3, ~30 million years ago: {U_PANT}; USGS Geolex (Wah Wah Springs Tuff): "an estimated 5,900 km3 of crystal-rich dacitic magma erupted" https://ngmdb.usgs.gov/Geolex/UnitRefs/WahWahSpringsRefs_11023.html',
}
cred = [c for c in cl['credits']]
attr = '\n'.join('- ' + c for c in cred)
desc = f"""Pinatubo (1991) cooled the planet. The five largest eruptions on USGS's published lists dwarf it. Ranked by erupted volume (km3, as published by the U.S. Geological Survey; USGS does not say whether each figure is bulk or dense-rock equivalent, and published estimates vary, so treat every number as an estimate):

5. Huckleberry Ridge, Yellowstone region: 2,450 km3 (about 2.1 million years ago)
4. Grey's Landing, Snake River Plain, Idaho: more than 2,800 km3 (about 8.7 million years ago)
3. La Garita caldera (Fish Canyon Tuff), Colorado: 5,000 km3 (27.8 million years ago)
2. Toba, Sumatra, Indonesia: 5,300 km3 (74,000 years ago)
1. Wah Wah Springs caldera (Indian Peak complex), Utah: 5,900 km3 (about 30 million years ago)
For comparison, Pinatubo 1991 ejected more than 5 km3 of material (USGS Fact Sheet 113-97).

Scope: this list uses eruptions with a USGS-published volume. Other published lists include further very large ignimbrites that USGS does not list (for example other large tuffs of the Indian Peak-Caliente complex in Utah and Nevada, or the Atana ignimbrite in Chile, about 2,500 km3 per Lindsay et al. 2001), and Toba is put at about 2,800 km3 DRE in other studies, so places below #3 depend on which list and method are used. None of these eruptions has any footage.

What you see: NASA satellite imagery of each region, not the eruptions: #5 the Yellowstone region (Landsat 8 over an elevation model; Yellowstone Lake), #4 the Snake River Plain, where the Grey's Landing ignimbrite was laid down (MODIS), #3 the Creede caldera in the same San Juan volcanic field as La Garita (the La Garita caldera itself is not shown), #2 Toba caldera and its lake (ASTER). #1 has no satellite image, only our own graphic. The cube graphics are original: each cube's volume is exactly proportional to the erupted volume, one constant scale throughout (Pinatubo drawn at 5 km3, Grey's Landing at 2,800 km3).

Narration is AI-generated (Gemini TTS, voice Charon).

Sources and credits:
- Eruption volumes: USGS Yellowstone Volcano Observatory, pantheon of caldera eruptions {U_PANT}; USGS Yellowstone eruption history {U_HIST}; USGS YVO news on Grey's Landing {U_GL} (Knott et al. 2020, Geology, doi:10.1130/G47384.1); Pinatubo {U_PIN}
{attr}
NASA does not endorse this video."""
nar = [dict(id=l['id'], text=l['text'], sources=[SRC[l['id']]]) for l in cl['narration']['lines']]
on = [dict(t=t['at'], dur=t['dur'], text=t['text']) for t in cl['texts']]
sc = dict(production_id=PID, language='en', hook_text='PINATUBO? SMALL', title_proposed='Eruptions That Make Pinatubo Look Small', title='Eruptions That Make Pinatubo Look Small',
          description=desc, hashtags=['#Volcano', '#Supervolcano', '#PlanetExtremes', '#Earth', '#NASA'], narration=nar, on_screen=on,
          pacing_note='25.0 s: hook 3.0 (#1 cube graphic + chip at 0 s, first cut 1.0 s to the all-five lineup), #5 4.2, #4 4.2, #3 4.2, #2 4.4, #1 5.0 (graphics only, loop end = frame 0 crop). Each of #5-#2 = real NASA still 2.1 s + cube graphic 2.1 s.',
          comparator='Pinatubo 1991 (>5 km3, USGS FS 113-97)', synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)',
          attribution_block=attr + '\nNASA does not endorse this video.',
          value_checks=dict(source='USGS YVO pantheon table (Wah Wah Springs 5,900; Toba 5,300; La Garita 5,000), USGS Yellowstone eruption history (Huckleberry Ridge 2,450), USGS YVO news + Knott et al. 2020 (Grey\'s Landing >2,800), USGS FS 113-97 (Pinatubo >5)', checked='2026-10-28',
                            note='Plan n=6 ranking (Pinatubo 5 / Mesa Falls 280 / Lava Creek 1,000 / Huckleberry 2,450 / Grey\'s 2,800) did NOT hold: USGS itself lists Wah Wah Springs 5,900, Toba 5,300 and La Garita 5,000 above them, and Pinatubo (5), Mesa Falls (280) and Lava Creek (1,000) are not top five. Rebuilt as the five largest USGS-published eruption volumes, Pinatubo kept as the comparator. Caveats: USGS gives no bulk/DRE basis; non-USGS lists add further Indian Peak-Caliente tuffs and Atana (~2,500, Lindsay 2001); Toba ~2,800 DRE elsewhere.'))
json.dump(sc, open(P + 'script.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(len(desc), 'chars')
