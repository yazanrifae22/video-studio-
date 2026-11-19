"""Write cutlist.json + script.json + enhancements.json for comp-261102-53wv. Usage: python scripts/twiwm-53wv-cutlist.py"""
import json, os
P = r'E:\clips-viral\productions\comp-261102-53wv'
os.makedirs(P, exist_ok=True)
A = lambda k: f'src-261102-{k}'
KHJI = 'src-261021-khji'
# (asset, in, out, zoom, motion, why)
S = [
    (A('fvw2'), 0, 3.2, 1.0, 'push', 'frame 0: folded LRV No. 2, front (7021093)'),
    (A('cw8t'), 0, 3.2, 1.0, 'push', 'Marshall 1966 test vehicle (6640863)'),
    (A('47oa'), 0, 3.2, 1.05, 'push', 'astronauts and LRV qualification unit at MSFC, Nov 1971 (7025449)'),
    (A('yj90'), 0, 4.2, 1.0, 'push', 'flight LRV on the Moon, Apollo 15 (as15-88-11901)'),
    (A('p3rp'), 0, 2.2, 1.0, 'pull', 'folded LRV No. 2, rear (7021092)'),
    (A('fvw2'), 2.0, 4.0, 1.5, 'push', 'punch-in on the tucked wheels (7021093)'),
    (KHJI, 48.0, 51.9, 1.0, 'push', 'Apollo 15 rover on the Moon, NASA film still shot'),
    (A('qht6'), 0, 3.0, 1.0, 'push', 'Cernan drives the LRV, Apollo 17 (as17-147-22527)'),
    (A('esmq'), 0, 2.5, 1.0, 'pull', 'Apollo 17 LRV, repaired rear fender (as17-137-20979)'),
    (A('esmq'), 2.4, 6.0, 1.5, 'push', 'punch-in on the maps-and-clamps fender repair'),
    (KHJI, 86.0, 87.6, 1.0, 'push', "plaque 'Man's first wheels on the Moon' (NASA film)"),
    (A('fvw2'), 0, 1.6, 1.0, 'pull', 'loop: frame 0 image'),
]
item = [1, 2, 2, 3, 4, 4, 5, 6, 7, 7, 8, 8]
segs = [dict(asset_id=a, src_in=i, src_out=o, fill='blur', zoom=z, mute_source=True, item=item[n], why=w, motion=m) for n, (a, i, o, z, m, w) in enumerate(S)]
total = round(sum(o - i for _, i, o, *_ in S), 2)
CTA = {"id": "C30", "family": "comment-opinion", "placement": "M", "text": "Would you ride it? Comment", "at": 14.0}
texts = [
    {"text": "THE MOON CAR THAT FOLDS", "at": 0.0, "dur": 3.0, "role": "title"},
    {"text": "MARSHALL TEST VEHICLE · 1966", "at": 3.4, "dur": 3.0, "role": "fact"},
    {"text": "ROVER DEPLOY TESTS · 1971", "at": 6.6, "dur": 3.0, "role": "fact"},
    {"text": "APOLLO 15 · 1971", "at": 9.8, "dur": 3.4, "role": "fact"},
    {"text": CTA["text"], "at": CTA["at"], "dur": 2.5, "role": "cta"},
    {"text": "FOLDED ROVER · 1971", "at": 16.6, "dur": 1.4, "role": "fact"},
    {"text": "APOLLO 15 · HADLEY", "at": 18.2, "dur": 3.4, "role": "fact"},
    {"text": "APOLLO 17 · 1972", "at": 22.2, "dur": 2.7, "role": "fact"},
    {"text": "APOLLO 17 · FENDER REPAIR", "at": 25.2, "dur": 3.2, "role": "fact"},
    {"text": "Images: NASA", "at": 29.0, "dur": 2.4, "role": "credit"},
]
lines = [
    ("hook", "How do you carry a car to the Moon?", 0.1),
    ("marshall", "NASA's Marshall center directed it. Its boss, Wernher von Braun, test drove an early prototype.", 3.6),
    ("boeing", "Boeing built the flight rover: collapsible, about ten feet long.", 9.6),
    ("folded", "NASA photographed it folded, wheels tucked against the frame.", 13.8),
    ("deploy", "On the Moon, the Apollo 15 crew deployed the first one.", 18.0),
    ("speed", "Top speed, about nine miles an hour.", 22.1),
    ("fender", "On Apollo 17, a hammer knocked off part of a fender. The fix: lunar maps and clamps.", 25.0),
    ("payoff", "You fold it.", 31.2),
]
credits = [
    "NASA/MSFC (7021093, 7021092, 6640863, 7025449), NASA/JSC (as15-88-11901, as17-147-22527, as17-137-20979) - https://images.nasa.gov/details/<id>; NASA HQ: Apollo 15: \"Never Been on a Ride like this Before\" - https://images.nasa.gov/details/Apollo%2015%20Never%20Been%20on%20a%20Ride%20like%20this%20Before",
    "NASA does not endorse this video.",
]
cut = dict(production_id='comp-261102-53wv', width=1080, height=1920, fps=30, segments=segs, texts=texts,
           narration=dict(voice='Charon', style='Warm documentary storyteller, curious and unhurried, specific; clear diction, no hype.',
                          lines=[dict(id=i, text=t, at=a) for i, t, a in lines]),
           captions='narration', caption_bg=True, caption_min_page=0.75, caption_max_chars=20, music=None, bed='tone', credits=credits, target_duration=total,
           caption_y_ranges=[dict(**{'from': 0, 'to': 99, 'y': 19})])
json.dump(cut, open(os.path.join(P, 'cutlist.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)

R = lambda i: f'https://images.nasa.gov/details/{i}'
claims = [
    ("NASA's Marshall center directed the rover's development",
     f"{R('7021093')}: 'built by the Boeing Company under the direction of the Marshall Space Flight Center'; {R('0101294')}: 'designed, developed, and tested by the Marshall Space Flight Center'"),
    ("Wernher von Braun test drove an early prototype",
     f"{R('6640863')}: 'June, 1966 ... Marshall Space Flight Center Director, Dr. Wernher von Braun test drives the Mobility Test Article'"),
    ("Boeing built the flight rover, collapsible, about ten feet long",
     f"{R('7021093')}: 'open-space and collapsible vehicle about 10 feet long ... built by the Boeing Company'; {R('0101294')}: 'built by the Boeing Plant in Kent, Washington'"),
    ("NASA photographed it folded, wheels tucked against the frame",
     f"{R('7021093')} / {R('7021092')}: 'a folded configuration of the Lunar Roving Vehicle (LRV) No. 2' (wheels visible folded against the chassis in the pictures)"),
    ("The Apollo 15 crew deployed the first one on the Moon",
     "https://www.nasa.gov/image-article/this-week-nasa-history-apollo-15-astronauts-deploy-first-lunar-roving-vehicle-july-31-1971/: 'Apollo 15 astronauts Jim Irwin and David Scott deployed the first Lunar Roving Vehicle on the moon'"),
    ("Top speed about nine miles an hour",
     f"{R('0101294')}: 'Its speed limit was about 9 miles (14 kilometers) per hour'"),
    ("On Apollo 17 a hammer knocked off part of a fender; the fix was lunar maps and clamps",
     f"{R('as17-137-20979')}: 'a hammer got underneath the fender ... repaired the fender early in EVA-2 using lunar maps and clamps from the optical alignment telescope lamp'"),
    ("You fold it (payoff)", "Restates the collapsible/folded evidence above; loops to frame 0 (folded LRV)"),
    ("THE MOON CAR THAT FOLDS (hook card)", f"{R('7021093')}: 'collapsible', 'folded configuration'"),
    ("MARSHALL TEST VEHICLE · 1966", f"{R('6640863')}: June 1966, Bendix-built Mobility Test Article at Marshall"),
    ("ROVER DEPLOY TESTS · 1971", f"{R('7025449')}: November 1971, astronauts await deployment tests of the LRV qualification test unit, MSFC building 4649"),
    ("APOLLO 15 · 1971 / APOLLO 15 · HADLEY", f"{R('as15-88-11901')}: 'Apollo 15 ... Hadley-Apennine landing site', 31 July-2 Aug 1971"),
    ("APOLLO 17 · 1972", f"{R('as17-147-22527')}: 11 Dec 1972, Apollo 17, Cernan drives the LRV"),
    ("FOLDED ROVER · 1971", f"{R('7021092')}: dated 1971-07-01"),
]
script = dict(
    production_id='comp-261102-53wv', language='en', hook_text='THE MOON CAR THAT FOLDS',
    narration=[dict(id=i, text=t, words=len(t.split()), slot_s=round(len(t.split()) / 2.6, 1)) for i, t, a in lines],
    claims=[dict(claim=c, evidence=e) for c, e in claims],
    open_loop="Hook asks how you carry a car to the Moon; payoff 'You fold it.' lands on the folded rover, the same image as frame 0.",
    on_screen=[dict(t=x['at'], text=x['text']) for x in texts if x['role'] != 'cta'],
    title="The Moon Car That Folds: NASA's Lunar Roving Vehicle",
    description=("Would you ride it? Comment below.\n\n"
                 "NASA's Marshall Space Flight Center directed the Lunar Roving Vehicle, a collapsible electric car about 10 feet long, built by Boeing. "
                 "NASA photographed it folded; the Apollo 15 crew deployed the first one on the Moon in July 1971. Top speed: about 9 miles an hour. "
                 "On Apollo 17 a hammer knocked off part of a fender, and the crew fixed it with lunar maps and clamps.\n\n"
                 "Images and film courtesy of NASA/MSFC, NASA/JSC and NASA HQ (NASA media is generally not copyrighted; see nasa.gov media guidelines). Original archive audio removed.\n"
                 "- 7021093, 7021092, 6640863, 7025449 (NASA/MSFC): https://images.nasa.gov/details/<id>\n"
                 "- as15-88-11901, as17-147-22527, as17-137-20979 (NASA/JSC): https://images.nasa.gov/details/<id>\n"
                 "- Apollo 15: \"Never Been on a Ride like this Before\" (NASA HQ): https://images.nasa.gov/details/Apollo%2015%20Never%20Been%20on%20a%20Ride%20like%20this%20Before\n"
                 "NASA does not endorse this video."),
    hashtags=['#Apollo', '#LunarRover', '#NASA', '#Apollo15', '#SpaceHistory', '#TheWayItWasMade'],
    cta=CTA, synthetic_media_disclosure=True,
    credits=credits)
json.dump(script, open(os.path.join(P, 'script.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)

cum = [round(sum(o - i for _, i, o, *_ in S[:n + 1]), 2) for n in range(len(S))]
enh = dict(ruleset='twiwm-cta-v1', production_id='comp-261102-53wv', date='2026-11-02', duration_s=total, shots=len(S),
           avg_shot_s=round(total / len(S), 2), shot_lengths=[round(o - i, 2) for _, i, o, *_ in S],
           hook=dict(text='THE MOON CAR THAT FOLDS', at=0, dur=3.0),
           cta=dict(**CTA, dur=2.5, pct_of_runtime=round(100 * CTA['at'] / total)),
           loop='Hook: folded rover No. 2 (7021093); closing: same image after "You fold it."', narration=True,
           narration_voice='Charon', payoff_at=31.2, payoff_pct=round(100 * 31.2 / total), results=None,
           note='C27 taken by comp-261102-x7my; C30 chosen to avoid sibling collisions (family comment-opinion, placement M)')
json.dump(enh, open(os.path.join(P, 'enhancements.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)
print(total, cum)
