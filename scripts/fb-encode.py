"""Make <10 MB copies of the Facebook plan's videos (the browser upload tool caps files at 10 MB).

usage: python scripts/fb-encode.py [--brand quiz-ar] [--limit N]
Writes data/cache/fb/<production_id>.mp4 (1080x1920 H.264 2-pass sized to ~9.3 MB, AAC 128k) (read by scripts/fb-mark.py --next; never writes the plan).
"""
import json, os, subprocess, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(R, "data", "cache", "fb")
os.makedirs(OUT, exist_ok=True)
brand = sys.argv[sys.argv.index("--brand") + 1] if "--brand" in sys.argv else None
limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
plan_path = os.path.join(R, "data", "fb-plan.json")
plan = json.load(open(plan_path, encoding="utf-8"))
TARGET = 9.3 * 1024 * 1024 * 8  # bits

done = 0
for p in plan:
    if brand and p["brand"] != brand:
        continue
    if limit is not None and done >= limit:
        break
    dst = os.path.join(OUT, f"{p['production_id']}.mp4")
    if not (os.path.exists(dst) and os.path.getsize(dst) < 10 * 1024 * 1024):
        dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p["file"]]))
        vbit = int(TARGET / dur - 128_000)
        log = os.path.join(OUT, f"{p['production_id']}-2pass")
        base = ["ffmpeg", "-y", "-v", "error", "-i", p["file"], "-c:v", "libx264", "-preset", "slow", "-b:v", str(vbit),
                "-pix_fmt", "yuv420p", "-passlogfile", log]
        subprocess.run(base + ["-pass", "1", "-an", "-f", "mp4", os.devnull], check=True)
        tmp = dst[:-4] + ".tmp.mp4"  # rename when complete so a killed run never leaves a half file
        subprocess.run(base + ["-pass", "2", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", tmp], check=True)
        os.replace(tmp, dst)
        for f in os.listdir(OUT):
            if f.startswith(os.path.basename(log)):
                os.remove(os.path.join(OUT, f))
    done += 1
    print(p["production_id"], round(os.path.getsize(dst) / 1048576, 2), "MB", flush=True)
