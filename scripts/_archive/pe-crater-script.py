import json
m = json.load(open(r'E:\clips-viral\data\pe-crater\cut_meta.json', encoding='utf8'))
c = json.load(open(r'E:\clips-viral\productions\rank-261028-jdml\cutlist.json', encoding='utf8'))
EID = 'Earth Impact Database (EID), Planetary and Space Science Centre, Univ. of New Brunswick (diameter-sorted table, archived 2019: https://web.archive.org/web/2019id_/http://passc.net/EarthImpactDatabase/Diametersort.html) and NASA JSC ARES copy https://ares.jsc.nasa.gov/interaction/eeab/pdfs/CCA/EarthImpactDatabase.pdf'
src = {'hook': EID + ' (Chicxulub 150 km, Vredefort 160 km; Chicxulub age 64.98 Ma)',
 'i5': EID + ' (Acraman 90 km, South Australia; ties Popigai)', 'i4': EID + ' (Popigai 90 km, Russia; ties Acraman)',
 'i3': EID + ' (Sudbury 130 km, Ontario, Canada)', 'i2': EID + ' (Chicxulub 150 km, Yucatan, Mexico)', 'i1': EID + ' (Vredefort 160 km, South Africa)'}
desc = ('The crater that ended the dinosaurs is only the second biggest on Earth. The five largest confirmed impact structures, ranked by diameter '
 '(Earth Impact Database, rim-to-rim estimate of the collapsed crater; not the larger "damage" or original-size figures):\n\n'
 '5. Acraman, South Australia: 90 km (tied)\n4. Popigai, Russia: 90 km (tied)\n3. Sudbury, Canada: 130 km\n2. Chicxulub, Mexico: 150 km\n1. Vredefort, South Africa: 160 km\n\n'
 'Next in the table is Manicouagan, Canada, at 85 km; other lists quote about 100 km for its original size. Sizes depend on how a crater is measured, so this ranking uses one consistent table.\n'
 'What you see: NASA satellite imagery of each region. The craters are old and eroded, so they are hard to spot: #5 shows the Lake Acraman region (MODIS), #4 a 3D relief view of the Popigai area (ASTER), #3 Sudbury (SRTM relief, Landsat), #2 a relief map of the Yucatan Peninsula where the Chicxulub crater is buried, and #1 the ring of hills at Vredefort (Landsat 8). The Chicxulub vs Vredefort comparison is an original size-to-scale graphic.\n\n'
 'Narration is AI-generated (Gemini TTS, voice Charon).\n\nSources and credits:\n- Diameters: ' + EID + '\n' + '\n'.join('- ' + x for x in c['credits']) + '\nNASA does not endorse this video.')
att = '; '.join(c['credits']) + '. NASA does not endorse this video.'
s = dict(production_id='rank-261028-jdml', language='en', hook_text='DINOSAUR CRATER IS ONLY #2',
 title_proposed="The Dinosaur Killer Isn't Earth's Biggest", title="The Dinosaur Killer Isn't Earth's Biggest", description=desc,
 hashtags=['#Craters', '#Asteroid', '#PlanetExtremes', '#Earth', '#NASA'],
 narration=[dict(id=i, text=t, sources=[src[i]]) for i, t, a in m['lines']],
 on_screen=[dict(t=x['at'], dur=x['dur'], text=x['text']) for x in m['texts']],
 pacing_note='23.9 s: hook 2.4 (Vredefort ring + chip at 0 s, first cut 1.0 s), #5 4.0, #4 4.0, #3 4.0, #2 4.5 (relief + original size-to-scale graphic, OFL Cairo), #1 5.0 ending on the frame-0 crop (loop). No spoken outro; last line "one hundred sixty kilometres" loops to "The dinosaur crater is only second."',
 comparator='Chicxulub 150 km vs Vredefort 160 km (EID)', synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)',
 attribution_block=att,
 value_checks=dict(source='EID diameter table (PASSC/UNB, archived 2019) + NASA JSC ARES copy (2013)', checked='2026-10-28',
  note='Plan n=5 ranking did NOT hold: it put Manicouagan (~100 km) and Popigai (~100 km) at #5/#4 from secondary lists. EID: Vredefort 160, Chicxulub 150, Sudbury 130, Popigai 90, Acraman 90 (tie), Manicouagan 85 (revised to collapsed transient crater rim-to-rim diameter). Rebuilt: Acraman and Popigai tied at #5/#4, Manicouagan dropped (#6). Title kept: Chicxulub is #2 in EID and in NASA/other lists.'))
json.dump(s, open(r'E:\clips-viral\productions\rank-261028-jdml\script.json', 'w', encoding='utf8'), indent=1, ensure_ascii=False)
