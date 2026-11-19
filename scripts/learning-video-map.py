"""Map every published YouTube video of a brand to its production, hook, rounds, mechanics, length and ending.

Usage: python scripts/learning-video-map.py <brand> [snapshot.json]
Writes docs/youtube-intelligence/channels/<brand>/learning/video-map.json (used to join Studio stayed-% reads to
production features: best/worst hook, mechanic ranking, length, end CTA). Read-only on the DB.
"""
import json, os, sqlite3, sys, glob

brand = sys.argv[1]
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
snap = sys.argv[2] if len(sys.argv) > 2 else sorted(glob.glob(os.path.join(root, 'docs/youtube-intelligence/snapshots/*', f'{brand}.json')))[-1]
S = json.load(open(snap, encoding='utf8'))
pv = {x['video']: x for x in S.get('perVideo90d', [])}
db = sqlite3.connect(os.path.join(root, 'data/studio.db')); db.row_factory = sqlite3.Row
pub = {r['external_post_id']: r['production_id'] for r in db.execute(
    "select external_post_id, production_id from publishing where platform='youtube' and account_id=? and external_post_id is not null", (brand,))}


def spec(pid):
    for name in ('quiz.json', 'script.json', 'episode.json'):
        f = os.path.join(root, 'productions', pid, name)
        if os.path.exists(f):
            try:
                return name, json.load(open(f, encoding='utf8'))
            except Exception:
                pass
    return None, {}


out, seen = [], set()
for u in S['uploads']:
    if u['privacyStatus'] != 'public' or u['videoId'] in seen or not u.get('durationSec'):
        continue
    seen.add(u['videoId'])
    pid = pub.get(u['videoId'])
    name, q = spec(pid) if pid else (None, {})
    rounds = q.get('rounds') or []
    real = [r for r in rounds if isinstance(r, dict) and r.get('type') not in ('hook_intro', 'intro', 'outro')]
    hook = q.get('hook') or {}
    has_intro = any(isinstance(r, dict) and r.get('type') == 'hook_intro' for r in rounds) or bool(hook)
    end = q.get('outro') or q.get('cta') or q.get('end_cta') or None
    p = pv.get(u['videoId'], {})
    out.append({
        'videoId': u['videoId'], 'title': u['title'], 'published': u['publishedAt'], 'duration_s': u['durationSec'],
        'views': u['views'], 'likes': u['likes'], 'comments': u['comments'],
        'apv': p.get('averageViewPercentage'), 'subs': p.get('subscribersGained'), 'shares': p.get('shares'),
        'production_id': pid, 'spec': name, 'hook_category': hook.get('category'), 'hook_line': hook.get('line_ar'),
        'hook_intro': has_intro, 'rounds': len(real), 'mechanics': [r.get('type') or r.get('template') for r in real],
        'no_endcard': q.get('no_endcard'), 'end_cta': end if isinstance(end, (str, type(None))) else json.dumps(end, ensure_ascii=False)[:160],
    })

dst = os.path.join(root, 'docs/youtube-intelligence/channels', brand, 'learning', 'video-map.json')
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump({'brand': brand, 'snapshot': os.path.relpath(snap, root), 'videos': out}, open(dst, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(f'{len(out)} videos, {sum(1 for v in out if v["production_id"])} mapped -> {dst}')
