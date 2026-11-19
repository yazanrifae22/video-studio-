"""Motion check: a strip of stills through a time window.
   python docs/brands/test-3d/fair-game/motion-strip.py <production id> <version N|draft> <line id | t0,t1> [--n 12] [--sub 2] [--out name]
A line id covers that line and the silence after it. -> <ver>/qa-sheets/motion/<name>.jpg (cells 480x270, 4 per row, time stamped)."""
import json, os, subprocess, sys, re
from PIL import Image, ImageDraw, ImageFont
ROOT = 'E:/clips-viral'
pid, ver, what = sys.argv[1], sys.argv[2], sys.argv[3]
opt = lambda k, d=None: (sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d)
n, sub = int(opt('--n', '12')), opt('--sub', '2')
vdir = f'{ROOT}/productions/{pid}/' + ('draft' if ver == 'draft' else f'v{ver}')
score = json.load(open(f'{vdir}/score.json', encoding='utf8'))
if ',' in what: t0, t1 = map(float, what.split(',')); name = opt('--out', f'{t0:.0f}-{t1:.0f}')
else:
    ids = [l['id'] for l in score['lines']]; i = ids.index(what); t0 = score['lines'][i]['t0'] - 0.2
    t1 = score['lines'][i + 1]['t0'] if i + 1 < len(ids) else score['duration']; name = opt('--out', what)
times = [round(t0 + (t1 - t0) * k / (n - 1), 2) for k in range(n)]
r = subprocess.run(f"npx tsx packages/test3d/src/cli.ts snap {pid} --times {','.join(map(str, times))} --version {ver} --width 480 --sub {sub} --agent orchestrator", cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf8', errors='replace')
m = re.search(r'(?m)^\[\s*$', r.stdout)
if r.returncode or not m: print(r.stdout[-800:], r.stderr[-800:]); sys.exit(1)
files = json.loads(r.stdout[m.start():r.stdout.rindex(']') + 1])
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 16)
CW, CH, COLS = 480, 270, 4; rows = (len(files) + COLS - 1) // COLS
sheet = Image.new('RGB', (CW * COLS, CH * rows), (0, 0, 0)); d = ImageDraw.Draw(sheet)
for k, f in enumerate(files):
    x, y = (k % COLS) * CW, (k // COLS) * CH
    sheet.paste(Image.open(f).convert('RGB').resize((CW, CH)), (x, y)); d.rectangle([x + 4, y + 4, x + 74, y + 26], fill=(0, 0, 0)); d.text((x + 8, y + 6), f'{times[k]:.2f}', font=font, fill=(255, 210, 60))
out = f'{vdir}/qa-sheets/motion'; os.makedirs(out, exist_ok=True); sheet.save(f'{out}/{name}.jpg', quality=84); print(f'{out}/{name}.jpg')
