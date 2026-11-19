"""small/*-320.jpg and small/check.jpg (all six at 320 px wide in one sheet)."""
import os
from PIL import Image

H = os.path.dirname(os.path.abspath(__file__))
os.makedirs(H + "/small", exist_ok=True)
names = [f"{k}-{l}" for k in "ABC" for l in ("en", "ar")]
sheet = Image.new("RGB", (640, 3 * 180), "#222")
for i, n in enumerate(names):
    im = Image.open(f"{H}/{n}.jpg").convert("RGB")
    sm = im.resize((320, 180), Image.LANCZOS)
    sm.save(f"{H}/small/{n}-320.jpg", quality=88)
    sheet.paste(sm, ((i % 2) * 320, (i // 2) * 180))
sheet.save(f"{H}/small/check.jpg", quality=88)
