"""Viewer pack of the fair-game long-form for fresh-eyes V / audience-panel V (12 frames at 360 px + transcript).
   python docs/brands/test-3d/fair-game/viewpack.py <production id>   ->  <newest vN with render.mp4>/qa/view/
Frames sit on the same story beats in the three looks (times from that look's own score.json)."""
import json, os, glob, subprocess, sys

ROOT = 'E:/clips-viral'; pid = sys.argv[1]
vers = sorted((int(os.path.basename(os.path.dirname(p))[1:]), p) for p in glob.glob(f'{ROOT}/productions/{pid}/v*/render.mp4'))
n, mp4 = vers[-1]; v = os.path.dirname(mp4).replace('\\', '/'); out = f'{v}/qa/view'; os.makedirs(out, exist_ok=True)
score = json.load(open(f'{v}/score.json', encoding='utf8')); film = json.load(open(f'{ROOT}/productions/{pid}/film.json', encoding='utf8'))
L = {l['id']: l for l in score['lines']}; dur = score['duration']
def W(line, w, k=0):
    xs = [x for x in L[line]['words'] if ''.join(c for c in x['w'].lower() if c.isalnum() or c == '-') == w]
    return xs[min(k, len(xs) - 1)] if xs else {'t0': L[line]['t0'], 't1': L[line]['t1']}
times = [
    ('first frame (hook text)', 0.5),
    ('l01 nobody cheated', L['l01']['t1'] - 0.2),
    ('l03 one percent, a third of all wealth', W('l03', 'third')['t1'] + 0.6),
    ('l04 the four with their advantages', L['l04']['t1'] - 0.2),
    ('l05 pick your winner', W('l05', 'winner')['t1'] + 0.4),
    ('l09 the first flip decided', L['l09']['t1'] - 0.3),
    ('l22 one player holds ninety percent', W('l22', 'ninety')['t1'] + 0.8),
    ('l38 the ugly part (tally)', L['l38']['t1'] - 0.3),
    ('l45a our board against the real one', L['l45a']['t0'] + 3.0),
    ('l51 one stack holds 71 percent', L['l51']['t1'] - 0.3),
    ('l59 the new rule, sorted towers', (L['l59']['t0'] + L['l59']['t1']) / 2),
    ('l65 closing question (last frame)', dur - 1.0),
]
for f in glob.glob(f'{out}/f*.jpg'): os.remove(f)
files = []
for i, (label, t) in enumerate(times, 1):
    fp = f'{out}/f{i:02d}_{t:06.1f}.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', '-vf', 'scale=360:-2', '-q:v', '3', fp], check=True); files.append((fp, label, t))
mm = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'
with open(f'{out}/transcript.txt', 'w', encoding='utf8') as f:
    f.write(f"YouTube video, 16:9, {mm(dur)} long. Title: {film.get('title', '')}\n")
    f.write(f"Big text on screen for the first 3 s: {film['hook_text']}\nBig text on screen during the last question: {film['end_text'].upper()}\n\nSpoken (burned captions show the same words):\n")
    ch = {c['t0']: c['title'] for c in score.get('chapters', [])}
    for l in score['lines']:
        for t0, title in ch.items():
            if abs(t0 - l['t0']) < 2.5 or (t0 <= l['t0'] and t0 > l['t0'] - 2.5): f.write(f"\n-- chapter: {title} --\n"); ch.pop(t0); break
        f.write(f"[{mm(l['t0'])}] {l['text']}\n")
    f.write('\nFrames (360 px wide):\n')
    for fp, label, t in files: f.write(f"{os.path.basename(fp)}  {mm(t)}  {label}\n")
lst = f'{out}/sheet.txt'
open(lst, 'w', encoding='utf8').write(''.join(f"file '{fp}'\nduration 1\n" for fp, _, _ in files))
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', 'scale=360:-2,tile=4x3', '-frames:v', '1', '-q:v', '3', f'{out}/sheet.jpg'], check=True); os.remove(lst)
print(json.dumps({'view': out, 'version': n, 'frames': len(files), 'times': [round(t, 1) for _, _, t in files]}))
