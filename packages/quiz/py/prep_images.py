"""Trim cut-out PNGs to their alpha bbox, resize to max side, write grayscale (luma) twins, report mean luma of the body.
usage: prep_images.py <dir> <name> [<name>...]   (reads <name>.png, writes <name>_c.png and <name>_g.png)"""
import sys, json, os
import numpy as np
from PIL import Image
d = sys.argv[1]; out = {}
for name in sys.argv[2:]:
    im = Image.open(os.path.join(d, name + '.png')).convert('RGBA')
    a = np.array(im)
    ys, xs = np.where(a[:, :, 3] > 16)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    im.thumbnail((640, 640), Image.LANCZOS)
    im.save(os.path.join(d, name + '_c.png'))
    arr = np.array(im).astype(np.float32)
    luma = 0.2126 * arr[:, :, 0] + 0.7152 * arr[:, :, 1] + 0.0722 * arr[:, :, 2]
    # optional monotonic tone curve (keeps the luminance ORDER, spreads the darks so phones show the difference)
    gam = float(os.environ.get('QUIZ_GRAY_GAMMA', '1'))
    shown = 255 * (luma / 255) ** gam
    g = np.dstack([shown, shown, shown, arr[:, :, 3]]).clip(0, 255).astype(np.uint8)
    Image.fromarray(g, 'RGBA').save(os.path.join(d, name + '_g.png'))
    # body = opaque pixels in the lower 60% (excludes stem/leaf for cherries)
    h = arr.shape[0]; m = arr[:, :, 3] > 200; m[: int(h * 0.4)] = False
    sm = float(shown[m].mean())
    out[name] = {'size': im.size, 'body_luma_mean': round(float(luma[m].mean()) / 255, 3), 'shown_gray_mean': round(sm / 255, 3), 'swatch': '#%02X%02X%02X' % ((int(sm),) * 3)}
print(json.dumps(out))
