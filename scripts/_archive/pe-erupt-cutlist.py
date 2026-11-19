"""rank-261028-dhcd cut list generator (largest eruptions, USGS volumes). Usage: python scripts/pe-erupt-cutlist.py"""
import json
PID = 'rank-261028-dhcd'
SEC = [3.0, 4.2, 4.2, 4.2, 4.4, 5.0]   # hook, #5..#1
S = {}; t = 0
for k, d in zip(['hook', 'i5', 'i4', 'i3', 'i2', 'i1'], SEC):
    S[k] = (round(t, 3), round(t + d, 3)); t += d
TOTAL = round(t, 3); R = lambda x: round(x, 3)
A = dict(toba='src-261028-1euv', yell='src-261028-e7xh', snake='src-261028-o4u7', creede='src-261028-0lka', hook_a='src-261028-dtd8', hook_b='src-261028-y8ny',
         c5='src-261028-zu0b', c4='src-261028-013o', c3='src-261028-tfmg', c2='src-261028-tg02', lead='src-261028-w46k', end='src-261028-98ui')
def seg(k, dur, item, why):
    return dict(asset_id=A[k], src_in=0, src_out=R(dur), fill='cover', mute_source=True, item=item, why=why)
segments = [
    seg('hook_a', 1.0, 0, 'hook: ORIGINAL volume-cube graphic, #1 Wah Wah Springs 5,900 km3 vs tiny Pinatubo 5 km3; frame 0 = loop-end crop'),
    seg('hook_b', 2.0, 0, 'hook shot 2 (cut at 1.0 s): all five eruptions + Pinatubo at one scale'),
    seg('yell', 2.1, 5, '#5 Huckleberry Ridge: Yellowstone region, Landsat 8 over ASTER DEM (NASA EO, J. Stevens)'),
    seg('c5', 2.1, 5, '#5 original cube graphic: 2,450 km3 vs Pinatubo'),
    seg('snake', 2.1, 4, "#4 Grey's Landing: Snake River Plain, MODIS 2008 (NASA)"),
    seg('c4', 2.1, 4, "#4 original cube graphic: 2,800+ km3 vs Pinatubo"),
    seg('creede', 2.1, 3, '#3 La Garita field: Creede Caldera, ASTER 2007 (NASA EO, J. Allen)'),
    seg('c3', 2.1, 3, '#3 original cube graphic: 5,000 km3 vs Pinatubo'),
    seg('toba', 2.2, 2, '#2 Toba caldera, ASTER 2006 (NASA)'),
    seg('c2', 2.2, 2, '#2 original cube graphic: 5,300 km3 vs Pinatubo'),
    seg('lead', 2.5, 1, '#1 original graphic: 5,900 vs 5,300 vs 5,000 outlines (how close the top three are)'),
    seg('end', 2.5, 1, 'push-out ends on the exact frame-0 crop: seamless loop'),
]
def T(text, at, dur, role, **k): return dict(text=text, at=R(at), dur=R(dur), role=role, **k)
a5, b5 = S['i5']; a4, b4 = S['i4']; a3, b3 = S['i3']; a2, b2 = S['i2']; a1, b1 = S['i1']
m = lambda a, b: (a + b) / 2
texts = [
    T('PINATUBO? SMALL', 0, 3.0, 'title'),
    T('#5 · 2,450 KM³', a5, b5 - a5, 'rank'), T('HUCKLEBERRY RIDGE', a5, m(a5, b5) - a5, 'fact'), T('2.1 MILLION YEARS AGO', m(a5, b5), b5 - m(a5, b5), 'fact'),
    T('#4 · 2,800+ KM³', a4, b4 - a4, 'rank'), T("GREY'S LANDING · IDAHO", a4, m(a4, b4) - a4, 'fact'), T('8.7 MILLION YEARS AGO', m(a4, b4), b4 - m(a4, b4), 'fact'),
    T('#3 · 5,000 KM³', a3, b3 - a3, 'rank'), T('LA GARITA · CREEDE SHOWN', a3, m(a3, b3) - a3, 'fact'), T('27.8 MILLION YEARS AGO', m(a3, b3), b3 - m(a3, b3), 'fact'),
    T('#2 · 5,300 KM³', a2, b2 - a2, 'rank'), T('TOBA · SUMATRA, INDONESIA', a2, m(a2, b2) - a2, 'fact'), T('74,000 YEARS AGO', m(a2, b2), b2 - m(a2, b2), 'fact'),
    T('#1 · 5,900 KM³', a1, b1 - a1, 'rank'), T('WAH WAH SPRINGS · UTAH', a1, 2.5, 'fact'), T('~30 MILLION YEARS AGO', a1 + 2.5, b1 - a1 - 2.5, 'fact'),
    T('Images: NASA · Volumes: USGS', a1, b1 - a1, 'credit', y=26, font_px=56),
]
LINES = [('hook', 'Pinatubo cooled Earth. These dwarf it.'),
         ('i5', 'Five: Yellowstone, twenty-four fifty cubic kilometres.'),
         ('i4', 'Four: Idaho, over twenty-eight hundred.'),
         ('i3', 'Three: Colorado, five thousand cubic kilometres.'),
         ('i2', 'Two: Toba, Indonesia, fifty-three hundred.'),
         ('i1', 'One: Utah, fifty-nine hundred cubic kilometres.')]
lines = [dict(id=k, text=x, at=R(S[k][0] + (0.1 if k == 'hook' else 0.08))) for k, x in LINES]
EO = 'https://science.nasa.gov/earth/earth-observatory/'
cl = dict(
    production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=texts,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath (twenty-four fifty, fifty-nine hundred); no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=lines),
    captions='narration', music=None, bed='tone', bed_accents=[0, R(a5), R(a4), R(a3), R(a2), R(a1)],
    credits=[
        'Toba Caldera, ASTER, 28 Jan 2006: Image courtesy of NASA/GSFC/MITI/ERSDAC/JAROS, and the U.S./Japan ASTER Science Team (NASA, public domain) - https://earthobservatory.nasa.gov/images/7380/toba-caldera',
        'Yellowstone National Park, Landsat 8 (9 Jun 2013) over an ASTER elevation model: NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey and ASTER GDEM data from NASA/GSFC/METI/ERSDAC/JAROS, and U.S./Japan ASTER Science Team (public domain) - ' + EO + 'yellowstone-national-park-87881/',
        'Snake River Plain, Idaho, MODIS, 29 Aug 2008: image courtesy the MODIS Rapid Response Team at NASA GSFC (public domain) - ' + EO + 'snake-river-plain-idaho-35549/',
        'Creede Caldera region, Colorado, ASTER, 3 Nov 2007: NASA image created by Jesse Allen, using data provided courtesy of NASA/GSFC/METI/ERSDAC/JAROS, and U.S./Japan ASTER Science Team (public domain) - ' + EO + 'volcanic-rocks-southwestern-colorado-8720/',
        'Volume-cube graphics: original studio graphics drawn from the USGS-published volumes (no third-party imagery; font Cairo, SIL Open Font License 1.1)',
    ],
    target_duration=TOTAL, caption_min_page=1.5, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_keep=['twenty-four fifty', 'cubic kilometres', 'over twenty-eight hundred', 'fifty-nine hundred', 'fifty-three hundred', 'five thousand', 'Pinatubo cooled Earth', 'Toba, Indonesia', 'Yellowstone', 'Colorado', 'Utah'],
)
open(f'E:/clips-viral/productions/{PID}/cutlist.json', 'w', encoding='utf-8').write(json.dumps(cl, indent=1, ensure_ascii=False))
print('total', TOTAL, S)
