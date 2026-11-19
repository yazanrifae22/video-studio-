"""rank-261028-xgph cut list generator: section lengths -> cutlist.json (retime to measured TTS by editing SEC).
Usage: python scripts/pe-eq-cutlist.py"""
import json

PID = 'rank-261028-xgph'
# section lengths (s): hook, #5, #4, #3, #2, #1
SEC = [3.1, 4.6, 4.0, 4.0, 4.6, 5.0]
S = {}
t = 0
for k, d in zip(['hook', 'i5', 'i4', 'i3', 'i2', 'i1'], SEC):
    S[k] = (round(t, 3), round(t + d, 3)); t += d
TOTAL = round(t, 3)
R = lambda x: round(x, 3)


def seg(a, i, o, item, why, **kw):
    d = dict(asset_id=a, src_in=R(i), src_out=R(o), fill='cover', mute_source=True, item=item, why=why); d.update(kw); return d


h0, h1 = S['hook']; a5, b5 = S['i5']; a4, b4 = S['i4']; a3, b3 = S['i3']; a2, b2 = S['i2']; a1, b1 = S['i1']
m5, m4, m3, m2 = (a5 + b5) / 2, (a4 + b4) / 2, (a3 + b3) / 2, (a2 + b2) / 2
hilo = 2.2
m1 = a1 + hilo
end_len = b1 - m1
segments = [
    seg('src-261028-uwku', 0, 1.0, 0, 'hook: Chilean coast after the 1960 tsunami, NOAA NGDC aerial; frame0 crop = loop-end crop (src-261028-riru last frame)'),
    seg('src-261028-o0vr', 0.5, 0.5 + (h1 - 1.0), 0, 'hook shot 2: same NOAA aerial, town crop; first cut at 1.0 s'),
    seg('src-261028-qotc', 0, m5 - a5, 5, 'Kamchatka 1952: tsunami floods Midway Island (US Navy via NOAA NGDC)', zoom=1.0),
    seg('src-261028-qotc', 3.0, 3.0 + (b5 - m5), 5, 'Midway continued, tighter part of the push'),
    seg('src-261028-qd1d', 186.5, 186.5 + (m4 - a4), 4, 'Tohoku 2011: aerial over a destroyed coastal town north of Sendai, 22 Mar 2011 (USAF/DVIDS)'),
    seg('src-261028-qd1d', 294.5, 294.5 + (b4 - m4), 4, 'Tohoku: smoke over the debris field, same flight'),
    seg('src-261028-ostq', 0, m3 - a3, 3, 'Sumatra 2004: village in ruin, 2 Jan 2005 (US Navy, McDaniel)'),
    seg('src-261028-evbh', 0.5, 0.5 + (b3 - m3), 3, 'Sumatra: second McDaniel aerial'),
    seg('src-261028-mtla', 0, m2 - a2, 2, 'Alaska 1964: Fourth Avenue collapse, Anchorage (USACE via USGS)'),
    seg('src-261028-qklg', 0.5, 0.5 + (b2 - m2), 2, 'Alaska 1964: school split by slumping ground (NOAA NGDC)'),
    seg('src-261028-lm6t', 0, hilo, 1, 'Chile 1960: its tsunami in Hilo, Hawaii (US Navy via NOAA NGDC)'),
    seg('src-261028-riru', 6.0 - end_len, 6.0, 1, 'Chile 1960 aerial pulls back to the exact frame-0 crop (loop)'),
]
texts = [
    dict(text='M9.5 EARTHQUAKE', at=0, dur=R(h1), role='title'),
    dict(text='LARGEST SINCE 1900 · USGS', at=0.9, dur=R(h1 - 0.9), role='fact'),
    dict(text='#5 · M9.0', at=R(a5), dur=R(b5 - a5), role='rank'),
    dict(text='KAMCHATKA, RUSSIA · 1952', at=R(a5), dur=R(m5 - a5), role='fact'),
    dict(text='TSUNAMI FLOODS MIDWAY', at=R(m5), dur=R(b5 - m5), role='fact'),
    dict(text='#4 · M9.1', at=R(a4), dur=R(b4 - a4), role='rank'),
    dict(text='TOHOKU, JAPAN · 2011', at=R(a4), dur=R(m4 - a4), role='fact'),
    dict(text='AERIAL · 22 MARCH 2011', at=R(m4), dur=R(b4 - m4), role='fact'),
    dict(text='Video: USAF / DVIDS', at=R(a4), dur=R(b4 - a4), role='credit', y=26, font_px=56),
    dict(text='#3 · M9.1', at=R(a3), dur=R(b3 - a3), role='rank'),
    dict(text='SUMATRA COAST · JAN 2005', at=R(a3), dur=R(m3 - a3), role='fact'),
    dict(text='TIED AT 9.1 WITH #4', at=R(m3), dur=R(b3 - m3), role='fact'),
    dict(text='Photos: U.S. Navy', at=R(a3), dur=R(b3 - a3), role='credit', y=26, font_px=56),
    dict(text='#2 · M9.2', at=R(a2), dur=R(b2 - a2), role='rank'),
    dict(text='ANCHORAGE · 4TH AVENUE', at=R(a2), dur=R(m2 - a2), role='fact'),
    dict(text='SCHOOL SPLIT BY SLUMPING', at=R(m2), dur=R(b2 - m2), role='fact'),
    dict(text='#1 · M9.5', at=R(a1), dur=R(b1 - a1), role='rank'),
    dict(text='ITS TSUNAMI IN HAWAII', at=R(a1), dur=R(m1 - a1), role='fact'),
    dict(text='CHILEAN COAST · 1960', at=R(m1), dur=R(b1 - m1), role='fact'),
    dict(text='NOAA · USGS · U.S. Navy', at=R(a1), dur=R(b1 - a1), role='credit', y=26, font_px=56),
]
LINES = [
    ('hook', 'Nine point five. The strongest quake ever recorded.'),
    ('i5', 'Five: Kamchatka, 1952, nine point zero. Its tsunami flooded Midway.'),
    ('i4', 'Four: Tohoku, Japan, 2011, nine point one.'),
    ('i3', 'Three: Sumatra, 2004, also nine point one.'),
    ('i2', 'Two: Alaska, 1964, nine point two, the largest in U.S. history.'),
    ('i1', 'One: Chile, 1960, nine point five. Nothing since has matched it.'),
]
lines = [dict(id=k, text=x, at=R(S[k][0] + (0.1 if k == 'hook' else 0.08))) for k, x in LINES]
NK = 'https://www.ngdc.noaa.gov/hazard/data/kml/photos/'
cl = dict(
    production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=texts,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, '
                   'every number said crisply in one breath (nine point five, nineteen sixty); no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=lines),
    captions='narration', music=None, bed='tone',
    bed_accents=[0, R(a5), R(a4), R(a3), R(a2), R(a1)],
    credits=[
        f'Aerial view of the Chilean coast after the 1960 tsunami: NOAA National Geophysical Data Center (public domain / CC0) - {NK}25.kml',
        f'Aftermath of the 1960 Chilean tsunami in Hilo, Hawaii: U.S. Navy, via NOAA NGDC (public domain) - {NK}25.kml',
        f'Midway Island flooded by the 1952 Kamchatka tsunami: U.S. Navy, via NOAA NGDC (public domain) - {NK}35.kml',
        'Operation Tomodachi tsunami damage assessment (B-roll, 22 Mar 2011): video by Staff Sgt. Jeffry Howerton, 374th Airlift Wing, U.S. Air Force (DVIDS, public domain) - https://www.dvidshub.net/video/110643/operation-tomodachi-tsunami-damage-assesment',
        'Village near the coast of Sumatra, 2 Jan 2005: U.S. Navy photos by Petty Officer 2nd Class Philip A. McDaniel (public domain) - https://webarchive.library.unt.edu/eot2008/20090110002337/http://www.defenselink.mil/photoessays/2005-01/p20050103b1.html',
        'Collapse of Fourth Avenue near C Street, Anchorage, 1964: U.S. Army Corps of Engineers, USGS Photographic Library (public domain) - https://www.usgs.gov/media/images/collapse-fourth-avenue-near-c-street-anchorage-due-earthquake-0',
        f'School split by slumping ground, Alaska, 1964: NOAA National Geophysical Data Center (public domain / CC0) - {NK}2.kml',
    ],
    target_duration=TOTAL, caption_min_page=1.2, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_keep=['nine point five', 'nine point zero', 'nine point one', 'nine point two', 'the largest in U.S. history', 'ever recorded', 'Four: Tohoku, Japan, 2011', 'Five: Kamchatka, 1952', 'Three: Sumatra, 2004', 'Two: Alaska, 1964', 'One: Chile, 1960', 'flooded Midway'],
)
open(f'E:/clips-viral/productions/{PID}/cutlist.json', 'w', encoding='utf-8').write(json.dumps(cl, indent=1, ensure_ascii=False))
print('total', TOTAL, S)
