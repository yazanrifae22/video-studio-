"""rank-261028-4pgk: fit cutlist slots to the measured TTS line durations of a version folder (gap <= GAP s between lines).
Usage: python scripts/pe-trench-retime.py <vdir>"""
import json, subprocess, sys

V = sys.argv[1]; GAP = 0.08; TAIL = 0.45  # line wavs already carry 0.06 s lead + 0.18 s tail -> ~0.32 s acoustic gap
f = 'E:/clips-viral/productions/rank-261028-4pgk/cutlist.json'
c = json.load(open(f, encoding='utf-8'))
fr = lambda x: round(round(x * 30) / 30, 3)
order = ['hook', 'i5', 'i4', 'i3', 'i2', 'i1']
dur = {}
for i, k in enumerate(order):
    p = f'{V}/narr_{i:02d}_{k}.wav'
    dur[k] = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).decode())
slots = {k: dur[k] + GAP for k in order}; slots['hook'] += 0.1; slots['i1'] = dur['i1'] + TAIL
st, t = {}, 0.0
for k in order: st[k] = fr(t); t += slots[k]
total = fr(t); en = {k: (st[order[i + 1]] if i < 5 else total) for i, k in enumerate(order)}
S = c['segments']
S[0]['src_in'], S[0]['src_out'] = 0, 1.0
S[1]['src_in'], S[1]['src_out'] = 0, fr(en['hook'] - 1.0)
for i, k in zip([2, 3, 4, 5], ['i5', 'i4', 'i3', 'i2']): S[i]['src_in'], S[i]['src_out'] = 0, fr(en[k] - st[k])
J, N = (2.2, 1.9) if en['i1'] - st['i1'] > 5.6 else (1.8, 1.4)  # jelly / sonar-map shot lengths in #1
S[6]['src_in'], S[6]['src_out'] = 0, J
S[7]['src_in'], S[7]['src_out'] = 0, N
rest = fr(en['i1'] - st['i1'] - J - N); assert rest <= 2.5, rest
S[8]['src_in'], S[8]['src_out'] = fr(2.5 - rest), 2.5
rank = {'#5': 'i5', '#4': 'i4', '#3': 'i3', '#2': 'i2', '#1': 'i1'}
fact = {'IZU-OGASAWARA · JAPAN': 'i5', 'EMDEN DEEP': 'i4', 'KERMADEC · NZ': 'i3', 'HORIZON DEEP': 'i2'}
for tx in c['texts']:
    s = tx['text']
    if tx['role'] == 'title': tx['at'], tx['dur'] = 0, en['hook']; continue
    k = rank.get(s.split(' ')[0]) or fact.get(s)
    if k: tx['at'], tx['dur'] = st[k], fr(en[k] - st[k]); continue
    if tx['at'] < 5 and tx['role'] in ('fact', 'credit'): tx['at'], tx['dur'] = 1.0, fr(en['hook'] - 1.0); continue
    if s.startswith('NEAR TRENCH') or s.startswith('Video'): tx['at'], tx['dur'] = st['i1'], J
    elif s.startswith('MARIANA') or s.startswith('Map'): tx['at'], tx['dur'] = fr(st['i1'] + J), N
    elif s == 'CHALLENGER DEEP': tx['at'], tx['dur'] = fr(st['i1'] + J + N), fr(total - st['i1'] - J - N)
for l in c['narration']['lines']: l['at'] = 0.1 if l['id'] == 'hook' else st[l['id']]
c['bed_accents'] = [0] + [st[k] for k in order[1:]]
c['target_duration'] = total
json.dump(c, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('durations', {k: round(v, 2) for k, v in dur.items()}); print('starts', st, 'total', total)
