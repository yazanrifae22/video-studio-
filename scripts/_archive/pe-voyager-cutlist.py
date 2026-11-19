"""rank-261028-k1wy: write cutlist.json + script.json + brief.json. Usage: python scripts/pe-voyager-cutlist.py"""
import json, os
PID = 'rank-261028-k1wy'
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'productions', PID); os.makedirs(D, exist_ok=True)
V1L, NEP, P10, P11, PLU, LAD = 'src-261028-6gm1', 'src-261028-o4j4', 'src-261028-ntgk', 'src-261028-s25j', 'src-261028-ptpg', 'src-261028-mle4'
E5, E4, E3, E2, E1, END = 3.3, 7.3, 11.3, 15.3, 19.8, 24.8
LOOP = END - 0.9
def seg(a, i, o, item, why, **k): return dict(asset_id=a, src_in=i, src_out=o, fill='cover', mute_source=True, item=item, why=why, **k)
segments = [
    seg(V1L, 3.0, 4.0, 0, 'hook: Voyager 1 launch photograph (NASA/JPL/KSC), push-in already running; frame 0 = loop end + 1 frame'),
    seg(LAD, 0, 2.3, 0, 'hook shot 2 (cut at 1.0 s): five bars on one scale, #1 touches the 1 light-day line'),
    seg(PLU, 10.0, 12.0, 5, '#5 New Horizons: NASA KSC video of the Atlas V for New Horizons on the pad (real footage, 4:3 area blur-filled to 9:16, slow push)').copy() | dict(fill='blur', motion='push'), seg(LAD, 2.3, 4.3, 5, '#5 ladder 9.9'),
    seg(P11, 0, 2.0, 4, '#4 Pioneer 11: NASA launch photograph 1973'), seg(LAD, 4.3, 6.3, 4, '#4 ladder EST. 17.7 (estimate)'),
    seg(P10, 0, 2.0, 3, '#3 Pioneer 10: NASA Ames composite of its Jupiter images'), seg(LAD, 6.3, 8.3, 3, '#3 ladder EST. 21.2 (estimate)'),
    seg(NEP, 0, 2.0, 2, '#2 Voyager 2: NASA/JPL Neptune image'), seg(LAD, 8.3, 10.8, 2, '#2 ladder 21.6'),
    seg(LAD, 10.8, 12.8, 1, '#1 ladder 25.8, light-day line + Nov 18'),
    seg(V1L, 0, 3.0, 1, '#1 Voyager 1 launch push-in; last frame = frame before hook frame 0 (seamless loop)'),
]
T = []
def t(text, at, dur, role, **k): T.append(dict(text=text, at=round(at, 2), dur=round(dur, 2), role=role, **k))
FOOT = 'BILLION KM FROM EARTH · 28 OCT'
t('1 LIGHT-DAY', 0, E5, 'title', y=-23)
t('VOYAGER 1 LAUNCH · 1977', 0, 1.0, 'fact', y=-16)
t('NASA/JPL-Caltech/KSC', 0, 1.0, 'credit', y=26, font_px=56)
t('Data: NASA/JPL Horizons', 1.0, E5 - 1.0, 'credit', y=26, font_px=56)
ent = [  # rank, start, chip, photo fact, photo credit, ladder credit
    (5, E5, '#5 · 9.9 BN KM', 'NEW HORIZONS ATLAS V · 2006', 'NASA/KSC', 'Data: NASA/JPL Horizons'),
    (4, E4, '#4 · EST. 17.7 BN KM', 'PIONEER 11 LAUNCH · 1973', 'NASA', 'Estimate: JPL Horizons'),
    (3, E3, '#3 · EST. 21.2 BN KM', 'PIONEER 10 AT JUPITER', 'NASA Ames', 'Estimate: JPL Horizons'),
]
for n, a, chip, f1, c1, c2 in ent:
    t(chip, a, 4.0, 'rank', y=-23)
    t(f1, a, 2.0, 'fact', y=-16)
    t(c1, a, 2.0, 'credit', y=26, font_px=56); t(c2, a + 2.0, 2.0, 'credit', y=26, font_px=56)
t('#2 · 21.6 BN KM', E2, 4.5, 'rank', y=-23)
t('VOYAGER 2 AT NEPTUNE', E2, 2.0, 'fact', y=-16)
t('NASA/JPL', E2, 2.0, 'credit', y=26, font_px=56); t('Data: NASA/JPL Horizons', E2 + 2.0, 2.5, 'credit', y=26, font_px=56)
t('#1 · 25.8 BN KM', E1, LOOP - E1, 'rank', y=-23)
t('Data: NASA/JPL Horizons', E1, 2.0, 'credit', y=26, font_px=56)
t('VOYAGER 1 LAUNCH · 1977', E1 + 2.0, END - E1 - 2.0, 'fact', y=-16)
t('NASA/JPL-Caltech/KSC', E1 + 2.0, END - E1 - 2.0, 'credit', y=26, font_px=56)
t('1 LIGHT-DAY', LOOP, 0.9, 'title', y=-23)
t(FOOT, 0, END, 'credit', y=-34, font_px=48)
lines = [
    ('hook', 'We built something almost one light-day from Earth.', 0.05),
    ('i5', 'Five: New Horizons. Nine point nine billion kilometres.', E5),
    ('i4', 'Four: Pioneer Eleven. Estimated seventeen point seven billion.', E4),
    ('i3', 'Three: Pioneer Ten. Estimated twenty-one point two billion.', E3),
    ('i2', 'Two: Voyager Two. Twenty-one point six billion, still transmitting.', E2),
    ('i1', 'One: Voyager One. Twenty-five point eight billion. One light-day, November eighteenth.', E1),
]
HOR = 'https://ssd.jpl.nasa.gov/api/horizons.api'
LDP = 'https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/'
WHERE = 'https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/'
P10URL = 'https://science.nasa.gov/missions/pioneer/pioneer-10-sends-last-signal/'
P11URL = 'https://science.nasa.gov/mission/pioneer-11/'
cred = [
    "Distances: JPL Horizons system (NASA/JPL Solar System Dynamics) geocentric range of each spacecraft, 28 Oct 2026 00:00 TDB, queried through the Horizons API (targets -31 Voyager 1, -32 Voyager 2, -23 Pioneer 10, -24 Pioneer 11, -98 New Horizons) - " + HOR + " ; Horizons also backs NASA's live Voyager status pages",
    "Voyager 1 reaching 1 light-day (25.902 billion km from Earth) on Wednesday 18 Nov 2026 at 5:16:07 a.m. EST: NASA Science, 'What is a light-day?' - " + LDP + " ; see also " + WHERE,
    "Last signals: Pioneer 10, 23 Jan 2003 - " + P10URL + " ; Pioneer 11, last contact Sept 1995 (last engineering data 24 Nov 1995) - " + P11URL,
    "Voyager 1 Launch (PIA21747), 5 Sep 1977, photograph: NASA/JPL-Caltech/KSC - https://www.jpl.nasa.gov/images/pia21747-voyager-1-launch/ (slow push-in added)",
    "Neptune (PIA00049), reconstructed from two Voyager 2 images: NASA/JPL - https://www.jpl.nasa.gov/images/pia00049-neptune-great-dark-spot-scooter-dark-spot-2/ (cropped, slow push)",
    "Composite of Pioneer 10 images of Jupiter (ARC-1973-AC73-9341): NASA Ames Research Center - https://images.nasa.gov/details/ARC-1973-AC73-9341 (cropped, slow pan)",
    "Launch of Pioneer G (Pioneer 11), 5 Apr 1973, photograph: NASA - https://images.nasa.gov/details/9139575 (slow push)",
    "New Horizons' Atlas V launch vehicle on the pad at Kennedy Space Center, Jan 2006 (NASA video KSC-06-S-00004): NASA/KSC - https://images.nasa.gov/details/ksc_011906_nh_launchchange (muted, cropped, slow push)",
    "Distance-ladder graphics: original studio graphics drawn from the Horizons numbers (font Cairo, SIL Open Font License 1.1)",
]
NOEND = 'NASA, JPL and KSC do not endorse this video.'
CLIPS = json.load(open(os.path.join(D, 'caption_clips.json'), encoding='utf8')) if os.path.exists(os.path.join(D, 'caption_clips.json')) else []
cut = dict(production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=T,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath (twenty-five point eight, seventeen point seven); no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=[dict(id=i, text=x, at=a) for i, x, a in lines]),
    captions='narration', music=None, bed='tone', bed_accents=[0, E5, E4, E3, E2, E1],
    credits=cred, target_duration=END, caption_min_page=1.6, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_y_ranges=[{'from': 0, 'to': 26, 'y': 11}],
    caption_keep=['Five New Horizons', 'Nine point nine billion kilometres', 'Four Pioneer Eleven', 'Estimated seventeen point seven billion', 'Three Pioneer Ten', 'Estimated twenty-one point two billion',
                  'Two Voyager Two', 'Twenty-one point six billion', 'One Voyager One', 'Twenty-five point eight billion', 'One light-day, November eighteenth'],
    caption_clip=CLIPS)
json.dump(cut, open(os.path.join(D, 'cutlist.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)

title = 'Voyager 1 Hits 1 Light-Day on Nov 18'
desc = f"""The five farthest spacecraft from Earth, ranked by distance from Earth in billion km, with Voyager 1 about to reach 1 light-day (the distance light travels in 24 hours, 25.9 billion km): NASA says it gets there on Wednesday 18 Nov 2026 at 5:16:07 a.m. EST.

Distances from Earth on 28 Oct 2026 (JPL Horizons):
5. New Horizons: 9.90 billion km (66.2 AU), light takes 9.2 hours
4. Pioneer 11: about 17.7 billion km (118.5 AU), light takes about 16.4 hours. Estimated position: last contact 1995
3. Pioneer 10: about 21.2 billion km (141.4 AU), light takes about 19.6 hours. Estimated position: last signal 23 Jan 2003
2. Voyager 2: 21.62 billion km (144.5 AU), light takes 20.0 hours
1. Voyager 1: 25.85 billion km (172.8 AU), light takes 23.9 hours; it adds about 0.02 AU every day

How to read it: the criterion is geocentric distance (distance from Earth, not from the Sun) from the JPL Horizons system, the same quantity for every entry, on 28 Oct 2026. Voyager 1, Voyager 2 and New Horizons are still tracked by NASA. Pioneer 10 and Pioneer 11 stopped transmitting, so their positions are Horizons trajectory estimates, not measurements, and are marked EST. on screen. The order does not change between 28 Oct and 18 Nov. Scope: spacecraft with published ephemerides; spent rocket stages and untracked debris are not ranked. Distances are shown to 0.1 billion km.

What you see: photographs, images and one short video clip from NASA archives (the Voyager 1 launch in 1977, Neptune as imaged by Voyager 2, Pioneer 10's images of Jupiter, the Pioneer 11 launch in 1973, the Atlas V rocket for New Horizons on its pad in 2006) and original bar graphics on one linear distance scale. The spacecraft themselves are too far away to be photographed, so no image shows them at their current distance.

{NOEND}

Sources and credits:
""" + '\n'.join('- ' + c for c in cred) + '\n' + NOEND
script = dict(production_id=PID, language='en', hook_text='1 LIGHT-DAY', title_proposed=title, title=title, description=desc,
    hashtags=['#Voyager1', '#NASA', '#PlanetExtremes', '#Space', '#SolarSystem'],
    narration=[dict(id=i, text=x, sources=[HOR + ' (geocentric range, 2026-10-28 00:00 TDB)'] + ([LDP] if i in ('hook', 'i1') else []) + ([P11URL] if i == 'i4' else []) + ([P10URL] if i == 'i3' else [])) for i, x, a in lines],
    on_screen=[dict(t=x['at'], dur=x['dur'], text=x['text']) for x in T],
    pacing_note='24.8 s: hook 3.3 (Voyager 1 launch photo + 1 LIGHT-DAY chip at 0 s, ladder cut at 1.0 s), #5 4.0 (at 3.3 s), #4 4.0, #3 4.0, #2 4.5, #1 5.0; no outro; the last launch-photo frame is the frame before hook frame 0 so the loop plays on; footer BILLION KM FROM EARTH from 0 s; Pioneer values marked EST.',
    comparator='NASA Science: Voyager 1 reaches one light-day (25.902 billion km) on 18 Nov 2026',
    synthetic_media_disclosure=True, disclosure_note='platform altered-content flag is set by the uploader; no wording in the description',
    attribution_block='\n'.join('- ' + c for c in cred) + '\n' + NOEND,
    value_checks=dict(source=HOR, page=LDP, checked='2026-10-28',
        note='Horizons geocentric RG 2026-10-28 00:00 TDB (AU / bn km / LT h): V1 172.781 / 25.848 / 23.95; V2 144.505 / 21.618 / 20.03; P10 141.426 / 21.157 / 19.60; P11 118.450 / 17.720 / 16.42; NH 66.199 / 9.903 / 9.18. Heliocentric order identical (172.2 / 144.3 / 142.1 / 118.1 / 65.9 AU). Horizons V1 range crosses 25.902 bn km between 18 Nov 00:00 and 19 Nov 00:00 TDB (RG 25.9011 at 18 Nov 00:00, RR 2.21 million km/day) = NASA 18 Nov 10:16 UTC. Pioneer 10/11 Horizons trajectories are projections (no signal since 2003 / 1995).'))
json.dump(script, open(os.path.join(D, 'script.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
brief = dict(production_id=PID, brand='rankings', criterion='Distance from Earth (geocentric range, billion km) of the five farthest spacecraft, JPL Horizons, 2026-10-28 00:00 TDB; Pioneer 10 and 11 are Horizons trajectory estimates (no signal since 2003 / 1995)',
    primary_list=HOR, catalogue_check=LDP, checked='2026-10-28',
    ranking=[dict(rank=1, name='Voyager 1', value='25.85 bn km (172.8 AU), 23.9 light-hours'), dict(rank=2, name='Voyager 2', value='21.62 bn km (144.5 AU), 20.0 light-hours'),
             dict(rank=3, name='Pioneer 10 (estimate)', value='est. 21.16 bn km (141.4 AU), 19.6 light-hours'), dict(rank=4, name='Pioneer 11 (estimate)', value='est. 17.72 bn km (118.5 AU), 16.4 light-hours'),
             dict(rank=5, name='New Horizons', value='9.90 bn km (66.2 AU), 9.2 light-hours')],
    excluded=['spent rocket stages and untracked debris', 'Voyager 1 light-day date: NASA says 18 Nov 2026 5:16:07 a.m. EST, 18 days after publish', 'Pioneer ranks by estimate: Voyager 2 vs Pioneer 10 gap 0.46 bn km (2%), same order heliocentrically'],
    ranking_change='plan n=12 kept; metric fixed as distance from Earth (matches the light-day claim); title changed to lead with the hook; Pioneer 10/11 labelled estimates')
json.dump(brief, open(os.path.join(D, 'brief.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
print('ok', sum(s['src_out'] - s['src_in'] for s in segments))
