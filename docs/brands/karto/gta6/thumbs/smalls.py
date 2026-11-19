"""320/160 px copies in small/, plus one contact sheet (check.jpg) of all 6 at 320 px."""
import os, sys
from PIL import Image
H = os.path.dirname(os.path.abspath(__file__))
os.makedirs(os.path.join(H, "small"), exist_ok=True)
names = [f"{k}-{l}" for k in "ABC" for l in ("en", "ar")]
sheet = Image.new("RGB", (640 + 10, 3 * 180 + 20), (30, 30, 30))
for i, n in enumerate(names):
    im = Image.open(os.path.join(H, n + ".jpg")).convert("RGB")
    for w in (320, 160):
        im.resize((w, w * 9 // 16), Image.LANCZOS).save(os.path.join(H, "small", f"{n}-{w}.jpg"), quality=88)
    sheet.paste(im.resize((320, 180), Image.LANCZOS), ((i % 2) * 330, (i // 2) * 190))
sheet.save(os.path.join(H, "small", "check.jpg"), quality=90)
print([round(os.path.getsize(os.path.join(H, n + ".jpg")) / 1024) for n in names])
