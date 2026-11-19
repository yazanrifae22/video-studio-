"""storyboard.json (master script) -> productions/<id>/film.json for the three channels. Run after every script change:
   python docs/brands/test-3d/fair-game/make-film-json.py
Never edit the three film.json files by hand (except `retake` on a chapter: kept across runs)."""
import json, os

ROOT = 'E:/clips-viral'
SB = json.load(open(f'{ROOT}/docs/brands/test-3d/fair-game/storyboard.json', encoding='utf8'))
STYLE = ("Dry, sharp storyteller explaining a game to one friend across a table. Confident, a little amused, never preachy and never "
         "an announcer. Steady pace, about two and a half words per second. Short sentences land with a small beat after them. "
         "Numbers are said slowly and clearly. Questions sound like real questions. Names of the characters (the Scholar, the Worker, "
         "the Heir, the Fool, the Skeptic) are said the same way every time.")
ARMS = [
    {'id': 'expl-261115-c2fy', 'channel': 'Salt Parable', 'visual': 'Macro', 'voice': 'Algenib', 'view': 'macro'},
    {'id': 'expl-261115-u1h6', 'channel': 'Copper Parable', 'visual': 'Host', 'voice': 'Achird', 'view': 'host', 'end_text_y': -37.5},   # end text at the top: the storyteller's face sits where the other looks put it
    {'id': 'expl-261115-1yab', 'channel': 'Brass Parable', 'visual': 'Neon', 'voice': 'Iapetus', 'view': 'neon',
     'engine': {'bloom': 1.3, 'bloomthr': 0.7, 'dof': 0, 'grain': 0.012, 'vig': 0.2, 'contrast': 1.1, 'sat': 1.2}},
]
for a in ARMS:
    p = f"{ROOT}/productions/{a['id']}/film.json"
    old = json.load(open(p, encoding='utf8')) if os.path.exists(p) else {}
    retakes = {c['id']: c['retake'] for c in old.get('chapters', []) if 'retake' in c}
    film = {
        'id': a['id'], 'brand': 'test-3d', 'long': True, 'title': SB['title'],
        'format': {'width': 1920, 'height': 1080, 'fps': 30},
        'voice': a['voice'], 'style': STYLE, 'pace': old.get('pace', {'max_pause': 0.6, 'tempo': 1.0, 'target_wps': 2.6}),
        'hook_text': SB['hook_text'], 'hook_text_y': 25, 'end_text': SB['end_text'], 'end_text_word': 'which', 'end_text_y': -37.5,   # closing text at the top in every look: the line-up and its names stay free (frame check 2026-11-15)
        'hook_dur': 3.0, 'tail': 3.0, 'chapter_gap': 1.2, 'captions': True,
        'key_words': ['coin', 'coins', 'king', 'Scholar', 'Worker', 'Heir', 'Fool', 'Skeptic', 'fair', 'luck', 'flip', 'flips', 'board'],
        'chapters': [],
        'claims': SB['claims'], 'channel': a['channel'], 'visual': a['visual'], 'view': a['view'],
        'script_round': SB.get('round'), 'script_source': 'docs/brands/test-3d/fair-game/storyboard.json',
    }
    if 'engine' in a: film['engine'] = a['engine']
    if 'end_text_y' in a: film['end_text_y'] = a['end_text_y']
    if 'retake' in old: film['retake'] = old['retake']
    for c in SB['chapters']:
        ch = {'id': c['id'], 'title': c['title'], 'mood': c['mood'], 'lines': []}
        if c['id'] in retakes: ch['retake'] = retakes[c['id']]
        for l in c['lines']:
            ln = {'id': l['id'], 'text': l['text']}
            if l.get('pause_after'): ln['pause_after'] = l['pause_after']
            ch['lines'].append(ln)
        film['chapters'].append(ch)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(film, open(p, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('wrote', p, sum(len(c['lines']) for c in film['chapters']), 'lines')
