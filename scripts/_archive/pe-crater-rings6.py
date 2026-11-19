"""(v4 rev: crater-rim ring overlays, see OV) rank-261028-jdml (largest impact craters): NASA Earth Observatory PD stills -> 1080x1920 slow-push clips (full-frame cover).
Usage: python scripts/pe-crater-still2clip.py <outdir> [name ...] [still]  ('still' writes first/last PNG previews only)
Specs: file, box (fractions of the usable image), cx (x0,x1 focal fraction of the box), cy, z (zoom start,end), dur."""
import subprocess, sys, os, math
from PIL import Image, ImageFilter, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS = None
RAW = r'E:\clips-viral\data\pe-crater\raw'
args = sys.argv[1:]; OUT = args[0]; os.makedirs(OUT, exist_ok=True)
only = [a for a in args[1:] if a != 'still']; STILL = 'still' in args
FPS = 30
V = 'vredefort_oli_2018178_lrg.jpg'; A = 'acraman_tmo_2010049_lrg.jpg'; P = 'popigai_ast_2021_lrg.jpg'
SR = 'sudbury_srtm_2000_lrg.jpg'; SO = 'sudbury_oli_2020255_lrg.jpg'; C = 'PIA03379_lrg.jpg'
FULL = (0, 0, 1, 1)
# r6 (2026-10-28 fix round): whole rings inside the frame. pad = (left, top, right, bottom) fractions of the original, fill colour; durations lengthened to 4-5 s entries.
PADS = dict(s1=((0.0, 0.10, 0.0, 0.0), (0, 0, 0)), s2=((0.0, 0.10, 0.0, 0.0), (0, 0, 0)), c1=((0.0, 0.08, 0.0, 0.0), (255, 255, 255)))
SPECS = {
    'v_hook1': dict(f=V, box=FULL, cx=(.17, .18), cy=.80, z=(1.30, 1.40), dur=1.0),
    'v_hook2': dict(f=V, box=FULL, cx=(.36, .40), cy=.5, z=(1.0, 1.1), dur=1.4),
    'a1': dict(f=A, box=FULL, cx=(.57, .57), cy=.50, z=(1.0, 1.1), dur=2.1),
    'a2': dict(f=A, box=FULL, cx=(.57, .57), cy=.50, z=(2.0, 2.4), dur=2.1),
    'p1': dict(f=P, box=(.12, .14, .85, .80), cx=(.5818, .5818), cy=.477, z=(1.0, 1.04), dur=2.1),
    'p2': dict(f=P, box=(.12, .14, .85, .80), cx=(.5818, .5818), cy=.477, z=(1.04, 1.08), dur=2.1),
    's1': dict(f=SR, box=FULL, cx=(.324, .324), cy=.30, z=(1.0, 1.05), dur=2.2),
    's2': dict(f=SO, box=FULL, cx=(.324, .324), cy=.30, z=(1.0, 1.05), dur=2.2),
    'c1': dict(f=C, box=FULL, cx=(.321, .321), cy=.30, z=(1.0, 1.06), dur=3.2),
    'v1': dict(f=V, box=FULL, cx=(.62, .55), cy=.5, z=(1.15, 1.0), dur=2.2),
    'v_end': dict(f=V, box=FULL, cx=(.17, .17), cy=.80, z=(1.45, 1.30), dur=2.2),
}
FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'brand', 'quiz-ar', 'fonts')   # Cairo, SIL OFL 1.1
AMBER = (251, 191, 36); DARK = (30, 12, 6)
# Ring overlays (v4): cx, cy = fractions of the full image (W, H); r / rx / ry = fractions of the image width; rot in degrees.
#   vredefort : NASA EO: visible Vredefort Dome ring of hills, ~90 km across (circle fitted to the ridge crests)
#   acraman   : EID centre (lake Acraman) with the EID 90 km diameter; scale checked on the MODIS frame (Lake Acraman -> Port Lincoln = 301 km)
#   popigai   : outline traced on the visible circular depression (ellipse because the view is oblique 3D), NASA: nearly 100 km, EID 90 km
#   sudbury   : EID 130 km diameter centred ~46.6N 81.2W; scale from Sudbury-Wanapitei (4.4 px/km on the 1018 px preview), image is north-up
#   chicx     : trough of the buried crater rim visible on the SRTM relief (R 490 px = 75 km at ~6.5 px/km, Mercator), centre at the coast near Chicxulub Puerto
OV = {
    'vredefort': dict(kind='circle', cx=.37, cy=.56, r=.242),
    'acraman': dict(kind='circle', cx=.570, cy=.500, r=.068),
    'popigai': dict(kind='ellipse', cx=.5447, cy=.4551, rx=.103, ry=.0864, rot=-10),
    'sudbury': dict(kind='circle', cx=.324, cy=.234, r=.281),
    'chicx': dict(kind='circle', cx=950 / 2960, cy=490 / 2033 * 0 + 490 / 2033, r=490 / 2960, label='BURIED · 150 KM RING'),
}
SHOT_OV = dict(v_hook1='vredefort', v_hook2='vredefort', v1='vredefort', v_end='vredefort', a1='acraman', a2='acraman',
               p1='popigai', p2='popigai', s1='sudbury', s2='sudbury', c1='chicx')
STATIC = {'v_hook1', 'v_hook2', 'v1', 'v_end'}   # frame 0 / loop frames carry the full ring from the first frame
def crop(im, s, t):
    W, H = im.size; x0, y0, x1, y1 = s['box']
    bx0, by0, bx1, by1 = x0 * W, y0 * H, x1 * W, y1 * H; bw, bh = bx1 - bx0, by1 - by0
    t = t * t * (3 - 2 * t)
    z = s['z'][0] + (s['z'][1] - s['z'][0]) * t
    vh = bh / z; vw = vh * 9 / 16
    if vw > bw: vw = bw; vh = vw * 16 / 9
    cx = bx0 + bw * (s['cx'][0] + (s['cx'][1] - s['cx'][0]) * t); cy = by0 + bh * s['cy']
    l = min(max(cx - vw / 2, bx0), bx1 - vw); tp = min(max(cy - vh / 2, by0), by1 - vh)
    fr = im.resize((1080, 1920), Image.LANCZOS, box=(l, tp, l + vw, tp + vh))
    fr = fr.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2)) if vw < 1500 else fr
    return fr, (l, tp, vw, vh, W, H)
def ring_pts(o, geo, a_end):
    l, tp, vw, vh, W, H = geo; k = 1080 / vw; W0, H0, pl, pt = ORIG
    pts = []; n = 360
    for i in range(int(n * a_end) + 1):
        a = 2 * math.pi * i / n - math.pi / 2          # start at 12 o'clock, clockwise
        if o['kind'] == 'circle': dx = dy = None; ex = ey = o['r'] * W0
        else: ex, ey = o['rx'] * W0, o['ry'] * W0
        px, py = ex * math.cos(a), ey * math.sin(a)
        if o['kind'] == 'ellipse':
            rr = math.radians(o['rot']); px, py = px * math.cos(rr) - py * math.sin(rr), px * math.sin(rr) + py * math.cos(rr)
        pts.append(((o['cx'] * W0 + pl + px - l) * k, (o['cy'] * H0 + pt + py - tp) * k))
    return pts
def overlay(fr, name, tsec, dur, geo):
    o = OV[SHOT_OV[name]]
    a_end = 1.0 if name in STATIC else min(1.0, max(0.02, tsec / 0.55))
    a_end = 1 - (1 - a_end) ** 3
    pts = ring_pts(o, geo, a_end)
    glow = 0.5 - 0.5 * math.cos(2 * math.pi * tsec / dur)          # 0 at both ends (loop-safe)
    SS = 2; lay = Image.new('RGBA', (1080 * SS, 1920 * SS), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    P = [(x * SS, y * SS) for x, y in pts]
    if len(P) > 1:
        d.line(P, fill=DARK + (200,), width=int(13 * SS), joint='curve')
        d.line(P, fill=AMBER + (255,), width=int((7 + 1.5 * glow) * SS), joint='curve')
        if a_end < 1: x, y = P[-1]; d.ellipse([x - 9 * SS, y - 9 * SS, x + 9 * SS, y + 9 * SS], fill=(255, 255, 255, 255), outline=DARK + (200,), width=2 * SS)
    lay = lay.resize((1080, 1920), Image.LANCZOS)
    out = fr.convert('RGBA'); out.alpha_composite(lay)
    if o.get('label') and tsec > 0.45:
        f = ImageFont.truetype(os.path.join(FONTS, 'Cairo-Black.ttf'), 58); d2 = ImageDraw.Draw(out)
        al = min(1, (tsec - 0.45) / 0.25)
        t = o['label']; w = d2.textlength(t, font=f); bx, by = 540, 830
        pill = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); pd = ImageDraw.Draw(pill)
        pd.rounded_rectangle([bx - w / 2 - 26, by - 48, bx + w / 2 + 26, by + 48], 22, fill=(30, 12, 6, int(215 * al)))
        pd.text((bx, by), t, font=f, fill=AMBER + (int(255 * al),), anchor='mm'); out.alpha_composite(pill)
    return out.convert('RGB')
ORIG = None
for name, s in SPECS.items():
    if only and name not in only: continue
    im = Image.open(os.path.join(RAW, s['f'])).convert('RGB')
    if im.width * im.height > 30e6: im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    W0, H0 = im.size; pl = pt = 0
    if name in PADS:
        (fl, ft, fr_, fb), col = PADS[name]; pl, pt = int(fl * W0), int(ft * H0)
        pr, pb = int(fr_ * W0), int(fb * H0)
        if name == 'c1': im = im.crop((0, 6, W0, H0)); H0 -= 6   # drop the 1-5 px grey edge row before padding with the white of the image margin
        canvas = Image.new('RGB', (W0 + pl + pr, H0 + pt + pb), col); canvas.paste(im, (pl, pt)); im = canvas
    ORIG = (W0, H0, pl, pt)
    n = max(2, int(round(s['dur'] * FPS)))
    if STILL:
        for tag, i in (('0', 0), ('m', n // 2), ('1', n - 1)):
            fr, geo = crop(im, s, i / (n - 1)); overlay(fr, name, i / FPS, s['dur'], geo).save(os.path.join(OUT, f'{name}_{tag}.png'))
        continue
    out = os.path.join(OUT, name + '.mp4')
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for i in range(n):
        fr, geo = crop(im, s, i / (n - 1)); p.stdin.write(overlay(fr, name, i / FPS, s['dur'], geo).tobytes())
    p.stdin.close(); p.wait(); print(name, out)
