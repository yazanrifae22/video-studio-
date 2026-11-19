"""Thumbnails for the fair-game long-form, one per look, from that look's own picture (the king on the great tower, end of l23).
   python docs/brands/test-3d/fair-game/make-thumbs.py [--dt 0.4] [--only macro,host,neon]   ->  docs/brands/test-3d/fair-game/thumbs/{macro,host,neon}.jpg (1280x720)
Text: FAIR GAME? (publish-kit.md). Uses the newest version of each production that has a render.mp4."""
import json, os, re, glob, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = 'E:/clips-viral'; HERE = f'{ROOT}/docs/brands/test-3d/fair-game'
ARMS = [('expl-261115-c2fy', 'macro'), ('expl-261115-u1h6', 'host'), ('expl-261115-1yab', 'neon')]
dt = float(sys.argv[sys.argv.index('--dt') + 1]) if '--dt' in sys.argv else 0.4
os.makedirs(f'{HERE}/thumbs', exist_ok=True)
only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
for pid, look in ARMS:
    if only and look not in only: continue
    vers = sorted(int(os.path.basename(os.path.dirname(p))[1:]) for p in glob.glob(f'{ROOT}/productions/{pid}/v*/render.mp4'))
    n = vers[-1]; score = json.load(open(f'{ROOT}/productions/{pid}/v{n}/score.json', encoding='utf8'))
    ids = [l['id'] for l in score['lines']]; t = round(score['lines'][ids.index('l24')]['t0'] - dt, 2)
    r = subprocess.run(f'npx tsx packages/test3d/src/cli.ts snap {pid} --times {t} --version {n} --width 1920 --sub 8 --agent orchestrator', cwd=ROOT, shell=True, capture_output=True, text=True, encoding='utf8', errors='replace')
    m = re.search(r'(?m)^\[\s*$', r.stdout)
    if r.returncode or not m: print(look, 'snap failed', r.stdout[-400:], r.stderr[-400:]); continue
    f = json.loads(r.stdout[m.start():r.stdout.rindex(']') + 1])[0]
    im = Image.open(f).convert('RGB').resize((1280, 720), Image.LANCZOS)
    # dark wedge behind the words (top left), then the two words
    y0 = 392 if look == 'host' else 26   # Host: the storyteller's face is top left, so the words sit bottom left (over the table)
    shade = Image.new('L', im.size, 0); sd = ImageDraw.Draw(shade)
    for k in range(60): sd.rectangle([0, max(0, y0 - 26 + k * 3 * (y0 > 26)), 640 - k * 5, min(720, y0 + 304 - k * 3 * (y0 <= 26))], fill=min(255, 6 + k * 4))
    im = Image.composite(Image.new('RGB', im.size, (6, 6, 8)), im, shade.point(lambda v: int(v * 0.72)))
    d = ImageDraw.Draw(im); font = ImageFont.truetype('C:/Windows/Fonts/impact.ttf', 150)
    d.text((44, y0), 'FAIR', font=font, fill=(255, 255, 255), stroke_width=8, stroke_fill=(0, 0, 0))
    d.text((44, y0 + 150), 'GAME?', font=font, fill=(244, 190, 60), stroke_width=8, stroke_fill=(0, 0, 0))
    im.save(f'{HERE}/thumbs/{look}.jpg', quality=92); print(look, f'v{n} t={t}', f'{HERE}/thumbs/{look}.jpg')
