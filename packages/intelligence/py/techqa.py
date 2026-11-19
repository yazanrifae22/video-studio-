"""Automated technical QA of a rendered MP4 (mirrors OpenChatCut's browser-only verify_export).

usage: python techqa.py <video.mp4> <outdir> [--expect-duration S] [--end-hold S] [--size WxH (default 1080x1920)]
Writes <outdir>/techqa.json and <outdir>/contact_sheet.jpg (frame every ~1.5 s, timestamped) + frames/ at 1 fps.
Checks: streams/codec/size/fps, duration, black frames, frozen frames, long silences, integrated loudness, true peak.
--end-hold S: the last S seconds are an intended held frame over room tone (cut list `end_hold`); freeze/silence/blank-tail checks exempt that tail.
--sheet-step S: contact-sheet spacing (default 1.5 s; long-form quiz-long passes 10 so a 10-min render gets ~60 tiles, not 400 seeks).
--freeze-min S: shortest frozen run that fails no_freeze (default 1.2 s; quiz-long passes 6: a learn line may hold a still card 3-4 s by design).
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

video, outdir = sys.argv[1], sys.argv[2]
expect = float(sys.argv[sys.argv.index("--expect-duration") + 1]) if "--expect-duration" in sys.argv else None
hold = float(sys.argv[sys.argv.index("--end-hold") + 1]) if "--end-hold" in sys.argv else 0.0
size = tuple(int(x) for x in sys.argv[sys.argv.index("--size") + 1].split("x")) if "--size" in sys.argv else (1080, 1920)   # WxH; 16:9 long-form passes --size 1920x1080 (kids3d, 2026-11-02)
sheet_step = float(sys.argv[sys.argv.index("--sheet-step") + 1]) if "--sheet-step" in sys.argv else 1.5
freeze_min = float(sys.argv[sys.argv.index("--freeze-min") + 1]) if "--freeze-min" in sys.argv else 1.2
os.makedirs(os.path.join(outdir, "frames"), exist_ok=True)

p = json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", video], capture_output=True, text=True, check=True).stdout)
v = next((s for s in p["streams"] if s["codec_type"] == "video"), {})
a = next((s for s in p["streams"] if s["codec_type"] == "audio"), None)
dur = float(p["format"]["duration"])
n, d = (v.get("r_frame_rate") or "0/1").split("/")
fps = round(int(n) / max(int(d), 1), 2)

err = subprocess.run(["ffmpeg", "-hide_banner", "-i", video,
                      "-vf", f"blackdetect=d=0.4:pix_th=0.08,freezedetect=n=0.002:d={freeze_min}",
                      "-af", "silencedetect=n=-45dB:d=1.2,ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
black = [{"start": float(m[0]), "end": float(m[1])} for m in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", err)]
fz_s = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", err)]
fz_e = [float(x) for x in re.findall(r"freeze_end: ([\d.]+)", err)]
freezes = [{"start": s, "end": (fz_e[i] if i < len(fz_e) else dur)} for i, s in enumerate(fz_s)]
sil_s = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", err)]
sil_e = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
silences = [{"start": max(s, 0), "end": (sil_e[i] if i < len(sil_e) else dur)} for i, s in enumerate(sil_s)]
summ = err[err.rfind("Summary:"):] if "Summary:" in err else ""
lufs = re.search(r"I:\s+(-?[\d.]+) LUFS", summ)
tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", summ)
lufs = float(lufs.group(1)) if lufs else None
tp = float(tp.group(1)) if tp else None

# frames at 1 fps (for reviewers) and a timestamped contact sheet every ~1.5 s
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf", "fps=1,scale=360:-2", os.path.join(outdir, "frames", "f%03d.jpg")], check=True)
times = [round(t * sheet_step, 2) for t in range(int(dur / sheet_step) + 1) if t * sheet_step < dur - 0.05]
tiles = []
for t in times:
    f = os.path.join(outdir, "frames", f"cs_{t:06.2f}.jpg")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", video, "-frames:v", "1", "-vf", "scale=216:-2", f], check=True)
    if os.path.exists(f):
        tiles.append((t, f))
try:
    font = ImageFont.truetype("arial.ttf", 16)
except OSError:
    font = ImageFont.load_default()
sheet_path = None
if tiles:
    ims = [Image.open(f) for _, f in tiles]
    tw, th = ims[0].size
    cols = 8
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 20)), (14, 14, 14))
    dr = ImageDraw.Draw(sheet)
    for i, ((t, _), im) in enumerate(zip(tiles, ims)):
        x, y = (i % cols) * tw, (i // cols) * (th + 20)
        sheet.paste(im, (x, y + 20))
        dr.text((x + 4, y + 2), f"{int(t // 60):02d}:{t % 60:05.2f}", fill=(255, 220, 0), font=font)
    sheet_path = os.path.join(outdir, "contact_sheet.jpg")
    sheet.save(sheet_path, quality=85)

# Single-frame defects the duration-based detectors miss: a frame whose brightness jumps away from BOTH neighbours
# (which agree with each other) = flash / transparent frame; a 10 ms audio window ≥ 40 dB below its surroundings = click/hole.
import numpy as np  # noqa: E402
ys = [float(x) for x in re.findall(r"lavfi\.signalstats\.YAVG=([\d.]+)", subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", video, "-an", "-vf", "signalstats,metadata=print:key=lavfi.signalstats.YAVG", "-f", "null", "-"],
    capture_output=True, text=True).stderr)]
flash_frames = [{"frame": i, "t": round(i / fps, 3) if fps else None, "y": round(ys[i], 1), "neighbours": [round(ys[i - 1], 1), round(ys[i + 1], 1)]}
                for i in range(1, len(ys) - 1)
                if abs(ys[i - 1] - ys[i + 1]) < 10 and abs(ys[i] - (ys[i - 1] + ys[i + 1]) / 2) > 25]
# Blank tail: an audio track longer than the picture makes the editor extend the timeline with empty frames (too short
# for blackdetect's 0.4 s minimum or freezedetect's 1.2 s). They render as a flat canvas: a run of ≥3 identical-brightness
# final frames that jumps away from the picture before it.
run = 0
while run < len(ys) - 1 and abs(ys[-1 - run] - ys[-1]) < 0.01:
    run += 1
tail_blank = len(ys) > 10 and run >= 3 and abs(ys[-1 - run] - ys[-1]) > 20
# an intended end hold is a frozen run of (at most) the hold's frames: not a blank canvas
if hold and run <= round(hold * fps) + 2:
    tail_blank = False


def in_hold(ev, min_d):
    """Event runs to the end and starts inside the hold, or so shortly before it that the pre-hold part alone would not trip the detector (< min_d)."""
    # freezedetect closes a few frames before EOF (seen 0.13–0.2 s on 2026-10-25 renders), so allow 0.35 s
    return hold > 0 and ev["end"] >= dur - 0.35 and ev["start"] >= dur - hold - min_d


held_freezes = [f for f in freezes if not in_hold(f, freeze_min)]
held_silences = [s for s in silences if not in_hold(s, 2.0)]
dropouts = []
if a:
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    x = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    n = len(x) // 160
    if n > 10:
        env = 20 * np.log10(np.sqrt(np.mean(x[: n * 160].reshape(n, 160) ** 2, axis=1)) + 1e-12)
        for i in range(5, n - 5):
            around = np.concatenate([env[i - 5:i - 1], env[i + 2:i + 6]])
            if env[i] < -60 and np.median(around) > -40 and 0.3 < i / 100 < dur - 0.3:
                if not dropouts or i / 100 - dropouts[-1]["t"] > 0.1:
                    dropouts.append({"t": round(i / 100, 2), "db": round(float(env[i]), 1), "around_db": round(float(np.median(around)), 1)})

checks = {
    "no_flash_frames": not flash_frames,
    "no_blank_tail": not tail_blank,
    # decoded samples, not container durations (those hide ~0.1 s of missing audio at the end)
    "av_length_match": bool(a) and abs(len(x) / 16000.0 - float(v.get("duration") or dur)) <= 0.05,
    "no_audio_dropouts": not dropouts,
    "opens": True,
    "h264": v.get("codec_name") == "h264",
    "aac": bool(a) and a.get("codec_name") == "aac",
    f"size_{size[0]}x{size[1]}": (v.get("width"), v.get("height")) == size,
    "fps_ok": fps in (24, 25, 29.97, 30, 50, 59.94, 60),
    "duration_ok": dur >= 5 and (expect is None or abs(dur - expect) <= 1.0),
    "no_black": not [b for b in black if b["start"] > 0.05 and b["end"] < dur - 0.3],
    "no_freeze": not held_freezes,
    "no_long_silence": not [s for s in held_silences if s["end"] - s["start"] > 2.0],
    "loudness_ok": lufs is not None and -16.5 <= lufs <= -11.5,
    "true_peak_ok": tp is not None and tp <= -1.5,  # masters target -2 dBTP; > -1.5 means the limiter path was skipped
}
out = {"file": video, "duration": round(dur, 3), "width": v.get("width"), "height": v.get("height"), "fps": fps, "vcodec": v.get("codec_name"),
       "acodec": a and a.get("codec_name"), "bytes": int(p["format"].get("size", 0)), "black": black, "freezes": freezes, "silences": silences,
       "end_hold": hold, "integrated_lufs": lufs, "true_peak_dbfs": tp, "flash_frames": flash_frames[:20], "audio_dropouts": dropouts[:20], "contact_sheet": sheet_path, "checks": checks,
       "pass": all(checks.values()), "failed": [k for k, ok in checks.items() if not ok]}
json.dump(out, open(os.path.join(outdir, "techqa.json"), "w"), indent=1)
print(json.dumps({"pass": out["pass"], "failed": out["failed"], "lufs": lufs, "tp": tp, "duration": dur}))
