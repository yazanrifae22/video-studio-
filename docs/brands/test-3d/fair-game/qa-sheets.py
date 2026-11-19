"""Line-by-line picture check sheets for the fair-game long-form.
   python docs/brands/test-3d/fair-game/qa-sheets.py <production id> <version N|draft> [--chapters c03,c04] [--sub 2] [--tag r1]
For every storyboard line: one still at 60 % of the spoken line (tags are up by then), plus one near the end of the silence after it
when pause_after >= 1.5 s (the result of a time-lapse / drop). Stills -> <ver>/qa-sheets/<tag>/stills, one labelled contact sheet per
chapter -> <ver>/qa-sheets/<tag>/<chapter>.jpg (cells 640x360, 3 per row) + index.json (what each cell must show)."""
import json, os, subprocess, sys, glob, shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = 'E:/clips-viral'
pid, ver = sys.argv[1], sys.argv[2]
opt = lambda k, d=None: (sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d)
only = set(opt('--chapters', '').split(',')) - {''}
sub, tag = opt('--sub', '2'), opt('--tag', 'r1')
vdir = f'{ROOT}/productions/{pid}/' + ('draft' if ver == 'draft' else f'v{ver}')
score = json.load(open(f'{vdir}/score.json', encoding='utf8'))
sb = json.load(open(f'{ROOT}/docs/brands/test-3d/fair-game/storyboard.json', encoding='utf8'))
L = {l['id']: l for l in score['lines']}
order = [l['id'] for l in score['lines']]
cells = []
for c in sb['chapters']:
    if only and c['id'] not in only: continue
    for l in c['lines']:
        s = L[l['id']]; nxt = order.index(l['id']) + 1
        t_next = score['lines'][nxt]['t0'] if nxt < len(order) else score['duration']
        cells.append({'chapter': c['id'], 'line': l['id'], 'kind': 'say', 't': round(s['t0'] + 0.6 * (s['t1'] - s['t0']), 2), 'text': l['text'], 'picture': l['picture'], 'motion': l['motion'], 'tags': l['tags']})
        if l.get('pause_after', 0) >= 1.5 or t_next - s['t1'] >= 1.8:
            cells.append({'chapter': c['id'], 'line': l['id'], 'kind': 'after', 't': round(t_next - 0.35, 2), 'text': '(silence after) ' + l['text'], 'picture': l['picture'], 'motion': l['motion'], 'tags': l['tags']})
out = f'{vdir}/qa-sheets/{tag}'; os.makedirs(f'{out}/stills', exist_ok=True)
times = ','.join(str(c['t']) for c in cells)
r = subprocess.run(f'npx tsx packages/test3d/src/cli.ts snap {pid} --times {times} --version {ver} --width 640 --sub {sub} --agent orchestrator', cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf8', errors='replace')
if r.returncode: print(r.stdout[-1500:], r.stderr[-1500:]); sys.exit(1)
import re as _re
m = _re.search(r'(?m)^\[\s*$', r.stdout)
files = json.loads(r.stdout[m.start():r.stdout.rindex(']') + 1]) if m else []
if len(files) != len(cells):   # fall back: newest stills in the version's stills folder, by time in the name
    print('snap output not parsed, files', len(files), 'cells', len(cells), r.stdout[-600:]); sys.exit(1)
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 17); small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
CW, CH, COLS = 640, 360, 3
for ch in dict.fromkeys(c['chapter'] for c in cells):
    cc = [(c, f) for c, f in zip(cells, files) if c['chapter'] == ch]
    rows = (len(cc) + COLS - 1) // COLS
    sheet = Image.new('RGB', (CW * COLS, (CH + 46) * rows), (18, 18, 18)); d = ImageDraw.Draw(sheet)
    for k, (c, f) in enumerate(cc):
        x, y = (k % COLS) * CW, (k // COLS) * (CH + 46)
        im = Image.open(f).convert('RGB').resize((CW, CH)); sheet.paste(im, (x, y))
        shutil.copy(f, f"{out}/stills/{c['line']}-{c['kind']}.jpg")
        d.text((x + 6, y + CH + 3), f"{c['line']} {'[after]' if c['kind'] == 'after' else ''} t={c['t']}", font=font, fill=(255, 210, 60))
        d.text((x + 6, y + CH + 24), c['text'].replace('(silence after) ', '')[:84], font=small, fill=(220, 220, 220))
        c['cell'] = k + 1
    sheet.save(f'{out}/{ch}.jpg', quality=82)
    print(ch, len(cc), 'cells ->', f'{out}/{ch}.jpg', sheet.size)
json.dump(cells, open(f'{out}/index.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
