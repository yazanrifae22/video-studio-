import json
S = lambda a, i, o, item, why: dict(asset_id='src-261028-' + a, src_in=0, src_out=o, fill='cover', mute_source=True, item=item, why=why)
seg = [
 S('gg75', 0, 1.0, 0, 'hook: Vredefort ring of hills, Landsat 8 (NASA EO, L. Dauphin); frame 0 = loop-end crop'),
 S('3a8s', 0, 1.4, 0, 'hook shot 2: Vredefort wider crop; first cut at 1.0 s'),
 S('s46r', 0, 2.0, 5, 'Acraman region, MODIS 2010 (NASA EO, J. Allen) wide'),
 S('79zs', 0, 2.0, 5, 'Acraman close on Lake Acraman'),
 S('965b', 0, 2.0, 4, 'Popigai region ASTER 3D relief (NASA EO, J. Stevens)'),
 S('fl6m', 0, 2.0, 4, 'Popigai second crop'),
 S('wzvu', 0, 2.0, 3, 'Sudbury SRTM colour-coded relief (NASA EO, J. Stevens)'),
 S('mwcc', 0, 2.0, 3, 'Sudbury Landsat 8 2020'),
 S('kyd3', 0, 2.4, 2, 'Yucatan SRTM shaded relief (NASA/JPL/NIMA)'),
 S('cmdn', 0, 2.1, 2, 'ORIGINAL graphic (OFL Cairo): Chicxulub 150 km nested in Vredefort 160 km, true scale'),
 S('qkat', 0, 2.5, 1, 'Vredefort wide, Landsat 8'),
 S('695x', 0, 2.5, 1, 'push-out ends on the identical frame-0 crop: seamless loop'),
]
T = lambda text, at, dur, role: dict(text=text, at=at, dur=dur, role=role)
texts = [
 T('DINOSAUR CRATER IS ONLY #2', 0, 2.4, 'title'), T('RANKED BY DIAMETER · EID', 0.9, 1.5, 'fact'),
 T('#5 · 90 KM · TIED', 2.4, 4.0, 'rank'), T('ACRAMAN · S. AUSTRALIA', 2.4, 2.0, 'fact'), T('CLOSE: LAKE ACRAMAN', 4.4, 2.0, 'fact'),
 T('#4 · 90 KM · TIED', 6.4, 4.0, 'rank'), T('POPIGAI · RUSSIA', 6.4, 2.0, 'fact'), T('ASTER 3D RELIEF', 8.4, 2.0, 'fact'),
 T('#3 · 130 KM', 10.4, 4.0, 'rank'), T('SUDBURY · CANADA', 10.4, 2.0, 'fact'), T('LANDSAT VIEW', 12.4, 2.0, 'fact'),
 T('#2 · 150 KM', 14.4, 4.5, 'rank'), T('CHICXULUB · YUCATAN RELIEF', 14.4, 2.4, 'fact'),
 T('#1 · 160 KM', 18.9, 5.0, 'rank'), T('VREDEFORT · SOUTH AFRICA', 18.9, 2.5, 'fact'), T('RING OF HILLS · LANDSAT', 21.4, 2.5, 'fact'),
 dict(text='Images: NASA · Diameters: EID', at=18.9, dur=5.0, role='credit', y=26, font_px=56),
]
lines = [
 ('hook', 'The dinosaur crater is only second.', 0.1),
 ('i5', 'Five, tied: Acraman, Australia, ninety kilometres.', 2.15),
 ('i4', 'Four, tied: Popigai, Russia, ninety kilometres.', 6.15),
 ('i3', 'Three: Sudbury, Canada, one hundred thirty kilometres.', 10.15),
 ('i2', 'Two: Chicxulub, Mexico, one hundred fifty kilometres.', 14.15),
 ('i1', 'One: Vredefort, South Africa, one hundred sixty kilometres.', 18.9),
]
EO = 'https://science.nasa.gov/earth/earth-observatory/'
credits = [
 'Vredefort, Landsat 8, 27 Jun 2018: NASA Earth Observatory image by Lauren Dauphin, using Landsat data from the U.S. Geological Survey (public domain) - ' + EO + 'vredefort-crater-92689/',
 'Lake Acraman region, MODIS, 18 Feb 2010: NASA Earth Observatory image created by Jesse Allen, using data obtained from the Goddard Level 1 and Atmospheric Archive and Distribution System (LAADS) (public domain) - ' + EO + 'acraman-impact-structure-south-australia-42813/',
 'Popigai region, ASTER 3D relief: NASA Earth Observatory images by Joshua Stevens, using data from NASA/METI/AIST/Japan Space Systems, and the U.S./Japan ASTER Science Team, and Blue Marble data from NASA Earth Observatory (public domain) - ' + EO + 'russias-crater-of-diamonds-148403/',
 'Sudbury region, Landsat 8 (11 Sep 2020) and SRTM relief: NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey and topographic data from the Shuttle Radar Topography Mission (SRTM) (public domain) - ' + EO + 'sudbury-impact-structure-148844/',
 'Yucatan Peninsula relief map: Image Courtesy SRTM Team NASA/JPL/NIMA (public domain) - ' + EO + 'relief-map-yucatan-peninsula-mexico-3267/',
 'Chicxulub vs Vredefort size-to-scale graphic: original studio graphic drawn from the Earth Impact Database diameters (no third-party imagery; font Cairo, SIL Open Font License 1.1)',
]
cut = dict(production_id='rank-261028-jdml', width=1080, height=1920, fps=30, segments=seg, texts=texts,
 narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath (ninety kilometres, one hundred thirty kilometres, one hundred fifty kilometres); no hype. Read only the transcript, nothing else.', max_pause=0.28,
   lines=[dict(id=i, text=t, at=a) for i, t, a in lines]),
 captions='narration', music=None, bed='tone', bed_accents=[0, 2.4, 6.4, 10.4, 14.4, 18.9], credits=credits, target_duration=23.9,
 caption_min_page=1.5, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
 caption_keep=['ninety kilometres', 'one hundred thirty kilometres', 'one hundred fifty kilometres', 'Sudbury, Canada', 'Chicxulub, Mexico', 'one hundred sixty kilometres', 'South Africa', 'Five, tied', 'Four, tied', 'dinosaur crater', 'only second'])
json.dump(cut, open(r'E:\clips-viral\productions\rank-261028-jdml\cutlist.json', 'w', encoding='utf8'), indent=2, ensure_ascii=False)
json.dump(dict(lines=lines, texts=texts), open(r'E:\clips-viral\data\pe-crater\cut_meta.json', 'w', encoding='utf8'))
