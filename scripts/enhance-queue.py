"""Ask-Studio enhancement queue: every scheduled YouTube video, per brand, in slot order.

data/enhance-queue.json is the orchestrator's tracker (status: todo | building | qa | approved | replaced | skipped).
`python scripts/enhance-queue.py sync` adds newly scheduled videos and marks too-close slots; `next <brand>` prints the
next todo item; `set <pid> <status> [note]` updates one row; `show` prints counts.
"""
import datetime as D, json, sqlite3, sys
from pathlib import Path

R = Path(__file__).resolve().parents[1]
Q = R / 'data' / 'enhance-queue.json'
MIN_LEAD_H = 8  # a rebuild + QA round needs this much time before the slot


def load():
    return json.loads(Q.read_text(encoding='utf8')) if Q.exists() else []


def save(rows):
    Q.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf8')


def when(t):
    d = D.datetime.fromisoformat(t.replace('Z', '+00:00'))
    return d if d.tzinfo else d.replace(tzinfo=D.timezone.utc)


def sync():
    rows, now = load(), D.datetime.now(D.timezone.utc)
    known = {r['production_id'] for r in rows}
    db = sqlite3.connect(R / 'data' / 'studio.db')
    for brand, pid, t, vid in db.execute("SELECT account_id, production_id, scheduled_time, external_post_id FROM publishing "
                                         "WHERE platform='youtube' AND publication_status='scheduled'"):
        if pid in known or when(t) <= now:
            continue
        title = (db.execute('SELECT title FROM productions WHERE production_id=?', (pid,)).fetchone() or [''])[0]
        rows.append({'brand': brand, 'production_id': pid, 'title': title, 'slot': when(t).isoformat(), 'youtube_id': vid, 'status': 'todo', 'note': ''})
    for r in rows:
        if r['status'] == 'todo' and when(r['slot']) < now + D.timedelta(hours=MIN_LEAD_H):
            r['status'], r['note'] = 'skipped', f'slot within {MIN_LEAD_H} h; old upload publishes'
    rows.sort(key=lambda r: (r['brand'], r['slot']))
    save(rows)
    show(rows)


def show(rows=None):
    rows = rows if rows is not None else load()
    by = {}
    for r in rows:
        by.setdefault(r['brand'], {}).setdefault(r['status'], 0)
        by[r['brand']][r['status']] += 1
    print(json.dumps(by))


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'show'
    if cmd == 'sync':
        sync()
    elif cmd == 'next':
        r = next((r for r in load() if r['brand'] == sys.argv[2] and r['status'] == 'todo'), None)
        print(json.dumps(r, ensure_ascii=False) if r else 'none')
    elif cmd == 'set':
        rows = load()
        for r in rows:
            if r['production_id'] == sys.argv[2]:
                r['status'] = sys.argv[3]
                r['note'] = ' '.join(sys.argv[4:]) or r['note']
        save(rows)
    else:
        show()
