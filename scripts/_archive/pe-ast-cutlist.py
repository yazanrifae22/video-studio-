"""rank-261028-hg6a: write cutlist.json + script.json. Usage: python scripts/pe-ast-cutlist.py"""
import json, os
PID = 'rank-261028-hg6a'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'productions', PID); os.makedirs(D, exist_ok=True)
ISS = 'src-261021-i31x'
G = dict(hook_a='src-261028-5oxp', hook_b='src-261028-w2qa', c5='src-261028-lfxk', c4='src-261028-wp1n', c3='src-261028-ys3b', c2='src-261028-jjjx', end='src-261028-y40e')
def seg(a, i, o, item, why, **k): return dict(asset_id=a, src_in=i, src_out=o, fill='cover', mute_source=True, item=item, why=why, **k)
ISSV = 'ISS external camera, Earth'
segments = [
    seg(G['hook_a'], 0, 1.0, 0, 'hook: #1 to-scale diagram (frame 0 = loop end)'),
    seg(G['hook_b'], 0, 2.0, 0, 'hook shot 2 (cut at 1.0 s): five bars, one scale, ISS line'),
    seg(G['c5'], 0, 2.0, 5, '#5 2024 XA diagram'),
    seg(ISS, 100.0, 102.0, 5, '#5 ISS view: limb and cloud ' + ISSV),
    seg(G['c4'], 0, 2.0, 4, '#4 2026 TP128 diagram'),
    seg(ISS, 640.0, 642.0, 4, '#4 ISS view: bright limb ' + ISSV),
    seg(G['c3'], 0, 2.0, 3, '#3 2025 TF diagram'),
    seg(ISS, 690.0, 692.0, 3, '#3 ISS view: station hardware and Earth ' + ISSV),
    seg(G['c2'], 0, 2.0, 2, '#2 2020 VT4 diagram'),
    seg(ISS, 750.0, 752.0, 2, '#2 ISS view: thin horizon ' + ISSV),
    seg(ISS, 410.0, 413.0, 1, '#1 ISS view: array, truss and Earth ' + ISSV),
    seg(G['end'], 0, 2.5, 1, '#1 diagram; last frame == frame 0 (loop)'),
]
FA, FB_ = 'CLOSEST KNOWN ASTEROID FLYBYS', 'NO IMPACTS · SINCE 1900'
T = []
def t(text, at, dur, role, **k): T.append(dict(text=text, at=at, dur=dur, role=role, **k))
t(FA, 0, 24.5, 'credit', y=-34, font_px=46); t(FB_, 0, 24.5, 'credit', y=-30.5, font_px=46)
t('TWO LOWER THAN THE ISS', 0, 3.0, 'title', y=-23); t('~220 KM AND ~370 KM UP', 0, 3.0, 'fact', y=-16)
E = [(5, 3.0, 7.0, '#5 · ~1,350 KM', '2024 XA · DEC 2024'), (4, 7.0, 11.0, '#4 · ~1,110 KM', '2026 TP128 · OCT 2026'),
     (3, 11.0, 15.0, '#3 · ~400 KM', '2025 TF · OCT 2025'), (2, 15.0, 19.0, '#2 · ~370 KM', '2020 VT4 · NOV 2020')]
for n, a, b, chip, des in E:
    mid = a + 2.0
    t(chip, a, b - a, 'rank', y=-23)
    t(des, a, mid - a, 'fact', y=-16)
    t('ISS VIEW · NOT THE ASTEROID', mid, b - mid, 'fact', y=-16)
    t('Video: NASA', mid, b - mid, 'credit', y=26, font_px=56)
t('#1 · ~220 KM', 19.0, 5.0, 'rank', y=-23)
t('ISS VIEW · NOT THE ASTEROID', 19.0, 3.0, 'fact', y=-16); t('Video: NASA', 19.0, 3.0, 'credit', y=26, font_px=56)
t('2025 UC11 · OCT 2025', 22.0, 2.0, 'fact', y=-16)
t('TWO LOWER THAN THE ISS', 24.0, 0.5, 'title', y=-23); t('~220 KM AND ~370 KM UP', 24.0, 0.5, 'fact', y=-16)
lines = [
    ('hook', 'Two asteroids flew lower than the space station.', 0.1),
    ('i5', 'Five: thirteen hundred fifty kilometres up. At fourteen kilometres a second.', 3.06),
    ('i4', 'Four: eleven hundred kilometres up. At twenty-one kilometres a second.', 7.06),
    ('i3', 'Three: four hundred kilometres up. At twenty-one kilometres a second.', 10.98),
    ('i2', 'Two: three hundred seventy kilometres up. At thirteen kilometres a second.', 14.88),
    ('i1', 'One: two hundred twenty kilometres up, below the station and the closest of all. At eleven kilometres a second.', 19.06),
]
RK = {'Five:': '#5·', 'Four:': '#4·', 'Three:': '#3·', 'Two:': '#2·', 'One:': '#1·'}
def disp(x):
    w = x.split(' ', 1); return RK.get(w[0], w[0]) + ' ' + w[1] if w[0] in RK else x
CAD = 'https://ssd-api.jpl.nasa.gov/cad.api?dist-max=0.0001&date-min=1900-01-01&date-max=2026-12-31&body=Earth&sort=dist'
NASA_ISS = 'https://images.nasa.gov/details/Expedition_69_Space_Station_Flies_Over_Hurricane_Idalia_Live'
cred_iss = ('Space station external-camera views of Earth (Expedition 69 flyover of Hurricane Idalia, 29 Aug 2023): NASA / Johnson Space Center '
            '(NASA media usage guidelines: generally not copyrighted; not footage of any asteroid) - ' + NASA_ISS)
cred_cad = 'Close-approach data: NASA/JPL Center for Near-Earth Object Studies, SBDB Close Approach Data API - ' + CAD
cred_g = 'Scale diagrams and bar graphic: original studio graphics drawn from the JPL numbers (no third-party imagery; font Cairo, SIL Open Font License 1.1)'
cut = dict(production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=T,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath; no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=[dict(id=i, say=x, text=disp(x), at=a) for i, x, a in lines]),
    captions='narration', music=None, bed='tone', bed_accents=[0, 3.0, 7.0, 11.0, 15.0, 19.0],
    credits=[cred_iss, cred_cad, cred_g], target_duration=24.5, caption_min_page=1.5, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_y_ranges=[{'from': 0, 'to': 26, 'y': 13}], caption_keep=['lower than the space station', 'thirteen hundred fifty kilometres up', 'eleven hundred kilometres up', 'four hundred kilometres up', 'three hundred', 'seventy kilometres up', 'two hundred twenty kilometres up', 'at fourteen kilometres a second', 'at twenty-one kilometres a second', 'at thirteen kilometres a second', 'at eleven kilometres a second', 'below the station and the closest of all'])
json.dump(cut, open(os.path.join(D, 'cutlist.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
# script.json: keep description/sources, refresh narration text and on_screen from this cut
sp = os.path.join(D, 'script.json'); sc = json.load(open(sp, encoding='utf8'))
old = {n['id']: n for n in sc['narration']}
sc['narration'] = [dict(id=i, text=x, sources=old[i]['sources']) for i, x, a in lines]
sc['on_screen'] = [dict(t=x['at'], dur=x['dur'], text=x['text']) for x in T]
json.dump(sc, open(sp, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('ok', sum(len(x[1].split()) for x in lines))
