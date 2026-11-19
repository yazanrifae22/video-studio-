"""Turns work/*.png cutouts into sticker versions (white paper rim + soft shadow) in work/st_*.png, and a check montage."""
import os
from PIL import Image, ImageFilter, ImageChops

W = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work")


def sticker(src, dst, rim=14, shadow=(10, 16, 18), keep_shadow=True, crop=1.0):
    im = Image.open(os.path.join(W, src)).convert("RGBA")
    im = im.crop((0, 0, im.width, int(im.height * crop)))
    bb = im.getbbox()
    im = im.crop(bb)
    pad = 90
    canvas = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad))
    a = canvas.split()[3].point(lambda v: 255 if v > 40 else 0)
    # rim: dilate alpha, soften edge slightly for clean antialiasing
    k = rim * 2 + 1
    rim_a = a.filter(ImageFilter.MaxFilter(k if k % 2 else k + 1)).filter(ImageFilter.GaussianBlur(1.6))
    white = Image.new("RGBA", canvas.size, (250, 247, 238, 255))
    white.putalpha(rim_a)
    out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    if keep_shadow:
        sh = rim_a.filter(ImageFilter.GaussianBlur(shadow[2]))
        sh = sh.point(lambda v: int(v * 0.55))
        shim = Image.new("RGBA", canvas.size, (10, 6, 30, 0))
        shim.putalpha(sh)
        off = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        off.paste(shim, (shadow[0], shadow[1]))
        out = Image.alpha_composite(out, off)
    out = Image.alpha_composite(out, white)
    out = Image.alpha_composite(out, canvas)
    out.save(os.path.join(W, dst))
    return out.size


for s, d, r in [("karto_shocked.png", "st_karto_shocked.png", 14), ("karto_deadpan.png", "st_karto_deadpan.png", 14),
                ("head_shocked.png", "st_head_shocked.png", 12), ("head_deadpan.png", "st_head_deadpan.png", 12),
                ("skip_skip.png", "st_skip_skip.png", 10), ("skip_shocked.png", "st_skip_shocked.png", 10)]:
    print(d, sticker(s, d, r, crop=0.83 if "skip" in s else 1.0))

names = ["st_karto_shocked", "st_head_deadpan", "st_head_shocked", "st_skip_skip"]
m = Image.new("RGB", (1600, 520), (90, 80, 140))
x = 0
for n in names:
    i = Image.open(os.path.join(W, n + ".png"))
    i.thumbnail((400, 500))
    m.paste(i, (x, 10), i)
    x += 400
m.save(os.path.join(W, "montage.jpg"))
