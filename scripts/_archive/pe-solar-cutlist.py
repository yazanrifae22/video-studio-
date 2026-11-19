"""rank-261028-942s cut list + script + brief generator (hottest planets, NASA Planetary Fact Sheet). Usage: python scripts/pe-solar-cutlist.py
All files UTF-8."""
import json
PID = 'rank-261028-942s'
SEC = [3.1, 4.0, 4.0, 4.0, 4.5, 5.0]   # hook, #5..#1
S = {}; t = 0
for k, d in zip(['hook', 'i5', 'i4', 'i3', 'i2', 'i1'], SEC):
    S[k] = (round(t, 3), round(t + d, 3)); t += d
TOTAL = round(t, 3); R = lambda x: round(x, 3)
A = dict(hook_a='src-261028-fcpy', hook_b='src-261028-ysmi', v1='src-261028-q4b8', end='src-261028-trmr', j1='src-261028-54mf', j2='src-261028-p0ig',
         m1='src-261028-zism', m2='src-261028-8yk0', e1='src-261028-282p', e2='src-261028-j42l', me1='src-261028-04j7', me2='src-261028-ovmc')
def seg(k, dur, item, why):
    return dict(asset_id=A[k], src_in=0, src_out=R(dur), fill='cover', mute_source=True, item=item, why=why)
segments = [
    seg('hook_a', 1.0, 0, 'hook: Maat Mons, Venus (Magellan radar 3-D, NASA/JPL PIA00254), the #1 visual; frame 0 = loop-end crop'),
    seg('hook_b', 2.1, 0, 'hook shot 2 (cut at 1.0 s): Maat Mons from another angle (PIA00106)'),
    seg('j1', 2.0, 5, '#5 Jupiter: Great Red Spot area, Cassini true-colour mosaic (PIA04866)'),
    seg('j2', 2.0, 5, '#5 Jupiter: cloud bands, same mosaic'),
    seg('m1', 2.0, 4, '#4 Mars: Curiosity selfie (PIA24173)'),
    seg('m2', 2.0, 4, '#4 Mars: rocks and horizon, same selfie mosaic'),
    seg('e1', 2.0, 3, '#3 Earth: Apollo 17 Blue Marble, 7 Dec 1972'),
    seg('e2', 2.0, 3, '#3 Earth: Africa close-up, same photo'),
    seg('me1', 2.3, 2, '#2 Mercury: Rachmaninoff basin, MESSENGER (PIA12998)'),
    seg('me2', 2.2, 2, '#2 Mercury: cratered surface, same image'),
    seg('v1', 2.5, 1, '#1 Venus: lava plains in front of Maat Mons (PIA00106)'),
    seg('end', 2.5, 1, 'pull-back ends on the exact frame-0 crop: seamless loop'),
]
def T(text, at, dur, role, **k): return dict(text=text, at=R(at), dur=R(dur), role=role, **k)
a5, b5 = S['i5']; a4, b4 = S['i4']; a3, b3 = S['i3']; a2, b2 = S['i2']; a1, b1 = S['i1']
m = lambda a, b: (a + b) / 2
HOOKFACT = 'VENUS · MAGELLAN RADAR, 3-D VIEW'
texts = [
    T('NOT MERCURY', 0, 3.1, 'title'), T(HOOKFACT, 0, 3.1, 'fact'),
    T('#5 · -110 °C', a5, b5 - a5, 'rank'), T('JUPITER · CASSINI PORTRAIT', a5, 2.0, 'fact'), T('RANKED BY AVERAGE TEMPERATURE', a5 + 2.0, b5 - a5 - 2.0, 'fact'),
    T('Cassini: NASA/JPL/SSI', a5, b5 - a5, 'credit', y=26, font_px=56),
    T('#4 · -65 °C', a4, b4 - a4, 'rank'), T('MARS · CURIOSITY SELFIE', a4, 2.0, 'fact'), T('RANGE: +20 TO -153 °C', a4 + 2.0, b4 - a4 - 2.0, 'fact'),
    T('NASA/JPL-Caltech/MSSS', a4, b4 - a4, 'credit', y=26, font_px=56),
    T('#3 · 15 °C', a3, b3 - a3, 'rank'), T('EARTH · APOLLO 17, 1972', a3, 2.0, 'fact'), T('RECORD HIGH: 56.7 °C', a3 + 2.0, b3 - a3 - 2.0, 'fact'),
    T('Apollo 17: NASA', a3, b3 - a3, 'credit', y=26, font_px=56),
    T('#2 · 167 °C', a2, b2 - a2, 'rank'), T('MERCURY · MESSENGER', a2, 2.3, 'fact'), T('430 °C BY DAY · -180 °C BY NIGHT', a2 + 2.3, b2 - a2 - 2.3, 'fact'),
    T('MESSENGER: NASA/JHUAPL/CIW', a2, b2 - a2, 'credit', y=26, font_px=56),
    T('#1 · 464 °C', a1, 2.5, 'rank'), T('VENUS · HOTTER THAN MERCURY\'S HOTTEST DAY', a1, 2.5, 'fact'),
    T('Magellan: NASA/JPL', a1, 2.5, 'credit', y=26, font_px=56),
    T('NOT MERCURY', a1 + 2.5, b1 - a1 - 2.5, 'title'), T(HOOKFACT, a1 + 2.5, b1 - a1 - 2.5, 'fact'),
]
LINES = [('hook', "The hottest planet isn't Mercury."),
         ('i5', 'Five: Jupiter, minus one hundred ten Celsius.'),
         ('i4', 'Four: Mars, minus sixty-five Celsius.'),
         ('i3', 'Three: Earth, fifteen Celsius.'),
         ('i2', 'Two: Mercury, only one hundred sixty-seven on average.'),
         ('i1', "One: Venus, four hundred sixty-four. Hotter than Mercury's hottest day.")]
lines = [dict(id=k, text=x, at=R(S[k][0] + (0.1 if k == 'hook' else 0.08))) for k, x in LINES]
PJ = 'https://science.nasa.gov/photojournal/'
credits = [
    'Venus, Maat Mons - 3-D perspective views built from Magellan radar data with simulated colour: NASA/JPL (PIA00254, PIA00106; page states no copyright notice) - ' + PJ + 'venus-3-d-perspective-view-of-maat-mons-2/ and ' + PJ + 'venus-3-d-perspective-view-of-maat-mons/',
    'Cassini Jupiter Portrait, true-colour mosaic: NASA/JPL/Space Science Institute (PIA04866; page states no copyright notice) - ' + PJ + 'cassini-jupiter-portrait/',
    "Curiosity's selfie at the 'Mary Anning' location on Mars: NASA/JPL-Caltech/MSSS (PIA24173; page states no copyright notice) - " + PJ + 'curiositys-selfie-at-the-mary-anning-location-on-mars/',
    'The Blue Marble: the view from Apollo 17, 7 Dec 1972: NASA (page states no copyright notice) - https://www.nasa.gov/image-article/blue-marble-view-from-apollo-17/',
    'Rachmaninoff basin, Mercury, MESSENGER 29 Sep 2009: NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington (PIA12998; page states no copyright notice) - ' + PJ + 'rachmaninoff-in-concert-with-recently-named-craters-on-mercury/',
]
cl = dict(
    production_id=PID, width=1080, height=1920, fps=30, segments=segments, texts=texts,
    narration=dict(voice='Charon', style='Brisk, continuous documentary read: confident and quick, almost no pause inside or between phrases, every number said crisply in one breath (minus one hundred ten, four hundred sixty-four); no hype. Read only the transcript, nothing else.',
                   max_pause=0.28, lines=lines),
    captions='narration', music=None, bed='tone', bed_accents=[0, R(a5), R(a4), R(a3), R(a2), R(a1)], credits=credits,
    target_duration=TOTAL, caption_min_page=1.6, caption_per_line=True, caption_bg=True, caption_bg_alpha=0.8,
    caption_keep=['minus one hundred ten Celsius', 'minus sixty-five Celsius', 'fifteen Celsius', 'one hundred sixty-seven on average', 'four hundred sixty-four', "isn't Mercury",
                  'Five: Jupiter', 'Four: Mars', 'Three: Earth', 'Two: Mercury', 'One: Venus', "Hotter than Mercury's hottest day", 'the hottest planet'],
)
open(f'E:/clips-viral/productions/{PID}/cutlist.json', 'w', encoding='utf-8').write(json.dumps(cl, indent=1, ensure_ascii=False))

FS = 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/'
TP = 'https://science.nasa.gov/solar-system/temperatures-across-our-solar-system/'
src = lambda extra='': [f'NASA Planetary Fact Sheet, row "Mean Temperature (C)" (checked 2026-10-28): {FS}', f'NASA Science, Temperatures Across Our Solar System: {TP}'] + ([extra] if extra else [])
narr = [
    dict(id='hook', text=LINES[0][1], sources=src('NASA: "Venus - not Mercury - is the hottest planet in our solar system."')),
    dict(id='i5', text=LINES[1][1], sources=src('Jupiter: mean temperature -110 C (-166 F); gas giant, no solid surface')),
    dict(id='i4', text=LINES[2][1], sources=src('Mars: median surface temperature -65 C; range from the 20s C down to -153 C (chip)')),
    dict(id='i3', text=LINES[3][1], sources=src('Earth: mean surface temperature 15 C; record high 56.7 C at Death Valley (chip)')),
    dict(id='i2', text=LINES[4][1], sources=src('Mercury: mean surface temperature 167 C; daytime highs 430 C, nighttime lows -180 C (chip)')),
    dict(id='i1', text=LINES[5][1], sources=src('Venus: mean surface temperature 464 C; Mercury daytime highs 430 C')),
]
desc = (
    "The hottest planet is not the closest one. The planets of our solar system ranked by average (mean) temperature, from the NASA Planetary Fact Sheet and NASA Science (checked 28 Oct 2026):\n\n"
    "5. Jupiter: -110 C\n4. Mars: -65 C (median surface temperature)\n3. Earth: 15 C\n2. Mercury: 167 C on average (daytime highs reach 430 C, night lows -180 C)\n"
    "1. Venus: 464 C - hotter than Mercury's daytime highs\n\n"
    "How to read it: the criterion is average temperature as published by NASA. Jupiter has no solid surface, so its value is NASA's mean temperature for the planet; estimates vary with the depth and place measured. "
    "Not ranked: Saturn (-140 C), Uranus (-195 C), Neptune (-200 C); the Sun is a star, Pluto (-225 C) is a dwarf planet, and exoplanets are outside this list. "
    "The Venus images are 3-D perspective views built from Magellan radar data with simulated colour (based on Soviet Venera lander images), not photographs of the surface; "
    "the Jupiter, Mars, Earth and Mercury pictures are spacecraft images.\n\n"
    "Narration is AI-generated (Gemini TTS, voice Charon).\n\nSources and credits:\n"
    f"- Mean temperatures: NASA Planetary Fact Sheet - {FS}\n- NASA Science, Temperatures Across Our Solar System - {TP}\n"
    + ''.join(f'- {c}\n' for c in credits) + 'NASA, JPL, MESSENGER and Cassini teams, MSSS and SSI do not endorse this video.')
sc = dict(
    production_id=PID, language='en', hook_text='NOT MERCURY',
    title_proposed="The Hottest Planet Is Not Mercury", title="The Hottest Planet Is Not Mercury",
    description=desc, hashtags=['#Venus', '#Mercury', '#SolarSystem', '#PlanetExtremes', '#Space'], narration=narr,
    on_screen=[dict(t=x['at'], dur=x['dur'], text=x['text']) for x in texts],
    pacing_note=f'{TOTAL} s: hook 3.1 (Maat Mons, Venus + NOT MERCURY chip at 0 s, first cut 1.0 s), #5 4.0, #4 4.0, #3 4.0, #2 4.5, #1 5.0. No spoken outro; the last line loops to the hook; last frame = frame 0 crop with the same chips.',
    comparator="Venus 464 C vs Mercury daytime highs 430 C (NASA)",
    synthetic_media_disclosure=True, disclosure_note='Narration is AI-generated (Gemini TTS, voice Charon)',
    attribution_block=desc.split('Sources and credits:\n', 1)[1],
    value_checks=dict(source=FS, page=TP, checked='2026-10-28',
        note='Plan n=8 (Earth air record / Moon / Mercury / Venus / Io lava) mixed metrics and was incomplete (Earth lava ~1,170 C beats Venus; Sun, Phaethon, Moon 117 vs 127 C unresolved). Replaced by ONE metric on ONE NASA table: mean temperature of all 8 planets; top 5 = Venus 464, Mercury 167, Earth 15, Mars -65, Jupiter -110; next Saturn -140. Chips: Mercury highs 430 / lows -180, Earth record 56.7, Mars range 20s to -153 (NASA Temperatures page).'))
open(f'E:/clips-viral/productions/{PID}/script.json', 'w', encoding='utf-8').write(json.dumps(sc, indent=1, ensure_ascii=False))
brief = dict(production_id=PID, brand='rankings', criterion='Mean (average) temperature of the eight planets, NASA Planetary Fact Sheet "Mean Temperature (C)"',
    primary_list=FS, catalogue_check=TP, checked='2026-10-28',
    ranking=[dict(rank=1, name='Venus', value='464 C'), dict(rank=2, name='Mercury', value='167 C'), dict(rank=3, name='Earth', value='15 C'), dict(rank=4, name='Mars', value='-65 C'), dict(rank=5, name='Jupiter', value='-110 C')],
    excluded=['Saturn -140 C', 'Uranus -195 C', 'Neptune -200 C', 'Sun (star)', 'Pluto -225 C (dwarf planet)', 'exoplanets', 'moons (Io lava, Moon daytime) and record extremes (mixed metric)'],
    ranking_change='YES: plan n=8 (record/peak/lava mix: Earth 56.7, Moon ~120, Mercury 430, Venus 464, Io lava >=1340) replaced by a single-metric all-planets ranking; reasons in script.json value_checks')
open(f'E:/clips-viral/productions/{PID}/brief.json', 'w', encoding='utf-8').write(json.dumps(brief, indent=1, ensure_ascii=False))
print('total', TOTAL, S)
