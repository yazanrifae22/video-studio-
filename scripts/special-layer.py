"""Podium Pop LAB layer (owner 2026-11-11): one special, computed graphic layer per video, composited over a finished build.

    python scripts/special-layer.py <production> [--version N] [--spec productions/<id>/special.json]
                                    [--preview 0.5,3.2,...]   (writes vN/qa/special_<t>.jpg at 360 px, no encode)
                                    [--revert]                (restore vN/render.base.mp4)

Reads vN/render.mp4 (mastered), draws the elements of special.json frame by frame (PIL, RGBA, full canvas) and overlays
them with ffmpeg (audio copied, so loudness/true peak stay as mastered). Keeps vN/render.base.mp4 and writes
vN/special.applied.json. Times are seconds in the FINAL video. Text stays inside the safe box x 64-936, y 270-1420.

Elements (all optional keys have defaults):
  stopwatch   {t0, t1, hold=1.0, rate=1.0, cx=540, cy=1180, label="HANG TIME", unit="s", color="yellow", start=0}
              runs from t0 to t1 at `rate` source-seconds per video-second (0.5 inside a x0.5 slow-mo shot), freezes, pops.
  stack       {t0, t1, hold=1.2, x=150, y_bottom, y_top, units=8, label="SURFERS TALL", color="cyan"}
              a ruler that climbs unit by unit between t0 and t1 with a live "xN" counter.
  vote        {t0, dur=1.2, reveal_at, hold=0.9, options=["MAKES IT","MISSES"], answer=1, cy=1150, q="CALL IT"}
              two buttons + a shrinking timer bar; at reveal_at the right one lights, the other dims.
  banner      {t0, dur, text, sub=None, cy=1180, color="lilac", size=64}
              a pill with a pop-in; used for the one special ask or a rule line.
  tap_ring    {t, cx=540, cy=900, r=150, text="DOUBLE-TAP NOW", lead=0.5, hold=0.5}
  hold_bar    {t0, t1, hold=0.6, label="HOLD YOUR BREATH", done_label="BREATHE!", cy=1200, color="cyan"}
              a bar that fills while the viewer holds (no time claim).
  board       {t0, dur, rows=[["#1","VALLEY","1.9 s"],...], cy=900, title="HANG TIME"}   final measured table.
"""
import argparse, json, math, os, re, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_D = os.path.join(ROOT, "data", "brand", "viral-rankings", "fonts", "Anton-Regular.ttf")
FONT_T = os.path.join(ROOT, "data", "brand", "viral-rankings", "fonts", "Montserrat[wght].ttf")
COL = {"ink": (11, 15, 28), "white": (255, 255, 255), "yellow": (255, 214, 10), "red": (255, 59, 71), "mint": (46, 230, 166),
       "orange": (255, 138, 31), "cyan": (25, 211, 255), "magenta": (255, 61, 184), "lilac": (179, 136, 255)}
SAFE = (64, 270, 936, 1420)
_fc = {}


def font(kind, size):
    k = (kind, int(size))
    if k not in _fc:
        f = ImageFont.truetype(FONT_D if kind == "d" else FONT_T, int(size))
        if kind == "t":
            try: f.set_variation_by_axes([800])
            except Exception: pass
        _fc[k] = f
    return _fc[k]


def pop(u):
    """0..1 -> scale with a clear overshoot (bold motion)."""
    u = max(0.0, min(1.0, u))
    return 1 + 0.22 * math.sin(u * math.pi) * (1 - u) if u >= 1 else (u * 1.18 if u < 0.7 else 1.18 - 0.18 * (u - 0.7) / 0.3)


def plate(img, box, fill, alpha=225, radius=28, outline=None, width=0):
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle(box, radius=radius, fill=fill + (alpha,), outline=(outline + (255,)) if outline else None, width=width)
    img.alpha_composite(lay)


def text_c(d, cx, cy, s, f, fill, stroke=0, stroke_fill=COL["ink"]):
    b = d.textbbox((0, 0), s, font=f, stroke_width=stroke)
    d.text((cx - (b[0] + b[2]) / 2, cy - (b[1] + b[3]) / 2), s, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)
    return b[2] - b[0], b[3] - b[1]


def scaled(draw_fn, img, cx, cy, s, w, h):
    """Draw a w x h element centred on (cx, cy) at scale s (pop-in) via a temp layer."""
    tmp = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw_fn(tmp)
    if abs(s - 1) > 1e-3:
        tmp = tmp.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    x, y = int(cx - tmp.width / 2), int(cy - tmp.height / 2)
    img.alpha_composite(tmp, (max(0, x), max(0, y)), (max(0, -x), max(0, -y), min(tmp.width, img.width - x), min(tmp.height, img.height - y)))


def el_stopwatch(img, e, t):
    t0, t1 = e["t0"], e["t1"]; hold = e.get("hold", 1.0)
    if t < t0 - 0.0 or t > t1 + hold: return
    rate = e.get("rate", 1.0); val = e.get("start", 0) + (min(t, t1) - t0) * rate
    done = t >= t1
    col = COL["mint"] if done else COL[e.get("color", "yellow")]
    s = pop((t - t0) / 0.2) if t < t0 + 0.2 else (1 + 0.16 * math.sin(min(1, (t - t1) / 0.3) * math.pi) if done and t < t1 + 0.3 else 1)
    W, H = 470, 210

    def draw(tmp):
        plate(tmp, (0, 0, W - 1, H - 1), COL["ink"], 232, 34, outline=col, width=6)
        d = ImageDraw.Draw(tmp)
        text_c(d, W / 2, 40, e.get("label", "HANG TIME"), font("t", 30), COL["white"])
        text_c(d, W / 2, 128, f"{val:0.2f}{e.get('unit', 's')}", font("d", 118), col)
    scaled(draw, img, e.get("cx", 540), e.get("cy", 1180), s, W, H)


def el_stack(img, e, t):
    t0, t1 = e["t0"], e["t1"]; hold = e.get("hold", 1.2)
    if t < t0 or t > t1 + hold: return
    n = e.get("units", 8); u = min(1.0, (t - t0) / max(0.01, t1 - t0)); k = min(n, int(u * n) + (1 if u < 1 else 0)); k = n if t >= t1 else max(1, k)
    x, yb, yt = e.get("x", 150), e["y_bottom"], e["y_top"]; col = COL[e.get("color", "cyan")]
    step = (yb - yt) / n; d = ImageDraw.Draw(img)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    ld.rounded_rectangle((x - 30, yt - 14, x + 30, yb + 14), radius=30, fill=COL["ink"] + (170,))
    for i in range(k):
        y1 = yb - i * step; y0 = y1 - step + 6
        fresh = (i == k - 1 and t < t1)
        ld.rounded_rectangle((x - 20 - (6 if fresh else 0), y0, x + 20 + (6 if fresh else 0), y1), radius=10, fill=(COL["white"] if fresh else col) + (255,))
    img.alpha_composite(lay)
    cy = max(SAFE[1] + 60, yb - k * step - 70)
    s = 1 + (0.18 if t >= t1 and t < t1 + 0.25 else 0)
    W, H = 420, 150

    def draw(tmp):
        plate(tmp, (0, 0, W - 1, H - 1), COL["ink"], 232, 30, outline=col, width=5)
        dd = ImageDraw.Draw(tmp)
        text_c(dd, 92, H / 2, f"x{k}", font("d", 96), col)
        lab = e.get("label", "SURFERS TALL").split(" ", 1)
        text_c(dd, 290, H / 2 - 24, lab[0], font("t", 34), COL["white"])
        if len(lab) > 1: text_c(dd, 290, H / 2 + 24, lab[1], font("t", 34), COL["white"])
    pcx = e.get("plate_cx", x + 60 + W / 2); cy = e.get("plate_cy", cy)   # optional fixed counter plate (lab, 2026-11-11)
    scaled(draw, img, min(SAFE[2] - W / 2, max(SAFE[0] + W / 2, pcx)), cy, s, W, H)


def el_vote(img, e, t):
    t0 = e["t0"]; dur = e.get("dur", 1.2); rv = e.get("reveal_at", t0 + dur); hold = e.get("hold", 0.9)
    if t < t0 or t > rv + hold: return
    cy = e.get("cy", 1150); opts = e.get("options", ["MAKES IT", "MISSES"]); ans = e.get("answer", 1)
    s = pop((t - t0) / 0.2) if t < t0 + 0.2 else 1
    W, H = 860, 300; revealed = t >= rv

    def draw(tmp):
        d = ImageDraw.Draw(tmp)
        plate(tmp, (250, 0, W - 250, 62), COL["ink"], 235, 30)
        text_c(d, W / 2, 31, e.get("q", "CALL IT"), font("t", 34), COL["yellow"])
        for i, o in enumerate(opts[:2]):
            x0 = 0 if i == 0 else W / 2 + 12; x1 = W / 2 - 12 if i == 0 else W - 1
            base = COL["lilac"] if i == 0 else COL["orange"]
            if revealed:
                good = (i == ans); pulse = 1 if not good else 0
                plate(tmp, (x0, 84, x1, 224), COL["mint"] if good else COL["ink"], 255 if good else 150, 36, outline=COL["white"] if good else None, width=6)
                text_c(d, (x0 + x1) / 2, 154, o, font("d", 76), COL["ink"] if good else (150, 150, 160))
            else:
                plate(tmp, (x0, 84, x1, 224), base, 245, 36, outline=COL["white"], width=5)
                text_c(d, (x0 + x1) / 2, 154, o, font("d", 76), COL["ink"])
        if not revealed:
            u = max(0.0, 1 - (t - t0) / max(0.01, rv - t0))
            plate(tmp, (0, 250, W - 1, 280), COL["ink"], 200, 15)
            if u > 0.01: plate(tmp, (4, 254, 4 + (W - 9) * u, 276), COL["red"] if u < 0.34 else COL["yellow"], 255, 11)
    scaled(draw, img, 500, cy, s, W, H)


def el_banner(img, e, t):
    t0, dur = e["t0"], e["dur"]
    if t < t0 or t > t0 + dur: return
    size = e.get("size", 64); f = font("t", size); col = COL[e.get("color", "lilac")]
    lines = e["text"].split("\n"); sub = e.get("sub")
    d0 = ImageDraw.Draw(img)
    tw = max(d0.textbbox((0, 0), ln, font=f)[2] for ln in lines); lh = int(size * 1.18)
    fs = font("t", int(size * 0.55)); sw = d0.textbbox((0, 0), sub, font=fs)[2] if sub else 0
    W = min(SAFE[2] - SAFE[0], max(tw, sw) + 90); H = lh * len(lines) + 56 + (int(size * 0.8) if sub else 0)
    s = pop((t - t0) / 0.22) if t < t0 + 0.22 else (max(0.0, (t0 + dur - t) / 0.12) if t > t0 + dur - 0.12 else 1)
    if s <= 0.02: return
    dark = e.get("color", "lilac") in ("ink",)

    def draw(tmp):
        plate(tmp, (0, 0, W - 1, H - 1), col, 245, 34, outline=COL["white"], width=5)
        d = ImageDraw.Draw(tmp)
        for i, ln in enumerate(lines):
            text_c(d, W / 2, 28 + lh / 2 + i * lh, ln, f, COL["white"] if dark else COL["ink"])
        if sub: text_c(d, W / 2, H - 30 - size * 0.2, sub, fs, COL["ink"] if not dark else COL["yellow"])
    scaled(draw, img, 500, e.get("cy", 1180), s, W, H)


def el_tap_ring(img, e, t):
    tt = e["t"]; lead = e.get("lead", 0.5); hold = e.get("hold", 0.5)
    if t < tt - lead or t > tt + hold: return
    cx, cy, r = e.get("cx", 540), e.get("cy", 900), e.get("r", 150)
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    if t < tt:
        u = (t - (tt - lead)) / lead; rr = r * (2.2 - 1.2 * u)
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=COL["white"] + (230,), width=10)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=COL["yellow"] + (255,), width=12)
    else:
        u = (t - tt) / hold; rr = r * (1 + 0.5 * u)
        d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=COL["mint"] + (int(255 * (1 - u)),), width=16)
    img.alpha_composite(lay)
    if not e.get("text", "DOUBLE-TAP NOW"): return
    f = font("t", 44); dd = ImageDraw.Draw(img); ty = min(SAFE[3] - 50, cy + r + 70)
    b = dd.textbbox((0, 0), e.get("text", "DOUBLE-TAP NOW"), font=f); w = b[2] - b[0] + 60
    plate(img, (cx - w / 2, ty - 38, cx + w / 2, ty + 38), COL["ink"], 235, 30)
    text_c(ImageDraw.Draw(img), cx, ty, e.get("text", "DOUBLE-TAP NOW"), f, COL["yellow"] if t < tt else COL["mint"])


def el_board(img, e, t):
    t0, dur = e["t0"], e["dur"]
    if t < t0 or t > t0 + dur: return
    rows = e["rows"]; rh = 92; W = 760; H = 96 + rh * len(rows) + 24; cy = e.get("cy", 900)
    s = pop((t - t0) / 0.22) if t < t0 + 0.22 else 1

    def draw(tmp):
        plate(tmp, (0, 0, W - 1, H - 1), COL["ink"], 238, 36, outline=COL["yellow"], width=5)
        d = ImageDraw.Draw(tmp)
        text_c(d, W / 2, 50, e.get("title", "HANG TIME"), font("t", 40), COL["yellow"])
        for i, r in enumerate(rows):
            shown = t >= t0 + 0.15 + i * e.get("stagger", 0.18)
            if not shown: continue
            y = 96 + i * rh + rh / 2; top = (i == 0)
            if top: plate(tmp, (16, y - rh / 2 + 6, W - 17, y + rh / 2 - 6), COL["yellow"], 255, 22)
            c = COL["ink"] if top else COL["white"]
            text_c(d, 80, y, r[0], font("d", 60), c)
            d.text((150, y - 24), r[1], font=font("t", 40), fill=c)
            b = d.textbbox((0, 0), r[2], font=font("d", 60)); d.text((W - 40 - b[2], y - (b[1] + b[3]) / 2), r[2], font=font("d", 60), fill=c)
    scaled(draw, img, 500, cy, s, W, H)


def el_hold_bar(img, e, t):
    t0, t1 = e["t0"], e["t1"]; hold = e.get("hold", 0.6)
    if t < t0 or t > t1 + hold: return
    done = t >= t1; u = min(1.0, (t - t0) / max(0.01, t1 - t0)); col = COL["mint"] if done else COL[e.get("color", "cyan")]
    s = pop((t - t0) / 0.2) if t < t0 + 0.2 else (1 + 0.2 * math.sin(min(1, (t - t1) / 0.3) * math.pi) if done else 1)
    W, H = 760, 120

    def draw(tmp):
        plate(tmp, (0, 0, W - 1, H - 1), COL["ink"], 235, 34, outline=col, width=5)
        d = ImageDraw.Draw(tmp)
        text_c(d, W / 2, 36, e.get("done_label", "BREATHE!") if done else e.get("label", "HOLD YOUR BREATH"), font("t", 36), col if done else COL["white"])
        plate(tmp, (26, 70, W - 27, 98), (60, 66, 90), 255, 14)
        if u > 0.02: plate(tmp, (26, 70, 26 + (W - 53) * u, 98), col, 255, 14)
    scaled(draw, img, 500, e.get("cy", 1200), s, W, H)


DRAW = {"stopwatch": el_stopwatch, "stack": el_stack, "vote": el_vote, "banner": el_banner, "tap_ring": el_tap_ring, "board": el_board, "hold_bar": el_hold_bar}


def span(e):
    ty = e["type"]
    if ty == "hold_bar": return e["t0"], e["t1"] + e.get("hold", 0.6)
    if ty == "stopwatch": return e["t0"], e["t1"] + e.get("hold", 1.0)
    if ty == "stack": return e["t0"], e["t1"] + e.get("hold", 1.2)
    if ty == "vote": return e["t0"], e.get("reveal_at", e["t0"] + e.get("dur", 1.2)) + e.get("hold", 0.9)
    if ty == "tap_ring": return e["t"] - e.get("lead", 0.5), e["t"] + e.get("hold", 0.5)
    return e["t0"], e["t0"] + e["dur"]


def frame(els, t, W, H):
    act = [e for e in els if span(e)[0] - 1e-6 <= t <= span(e)[1] + 1e-6]
    if not act: return None
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for e in act: DRAW[e["type"]](img, e, t)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("production"); ap.add_argument("--version", type=int); ap.add_argument("--spec")
    ap.add_argument("--preview"); ap.add_argument("--revert", action="store_true")
    a = ap.parse_args()
    pdir = os.path.join(ROOT, "productions", a.production)
    vs = sorted([d for d in os.listdir(pdir) if re.fullmatch(r"v\d+", d)], key=lambda x: int(x[1:]))
    vdir = os.path.join(pdir, f"v{a.version}" if a.version else vs[-1])
    render, base = os.path.join(vdir, "render.mp4"), os.path.join(vdir, "render.base.mp4")
    if a.revert:
        if os.path.exists(base): shutil.copyfile(base, render); print("reverted to render.base.mp4")
        return
    spec = json.load(open(a.spec or os.path.join(pdir, "special.json"), encoding="utf8"))
    els = spec["elements"]
    for e in els:
        if e["type"] not in DRAW: sys.exit(f"unknown element type {e['type']}")
    src = base if os.path.exists(base) else render
    pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames,bit_rate", "-show_entries", "format=duration", "-of", "json", src]))
    st = pr["streams"][0]; W, H = st["width"], st["height"]; n, dn = st["r_frame_rate"].split("/"); fps = float(n) / float(dn)
    dur = float(pr["format"]["duration"]); N = int(st.get("nb_frames") or round(dur * fps))
    late = [e for e in els if span(e)[1] > dur + 0.05]
    if late: sys.exit(f"element(s) end after the video ({dur:.2f} s): {[e['type'] for e in late]}")
    if a.preview:
        os.makedirs(os.path.join(vdir, "qa"), exist_ok=True)
        for ts in a.preview.split(","):
            t = float(ts); out = os.path.join(vdir, "qa", f"special_{t:05.2f}.jpg")
            raw = subprocess.check_output(["ffmpeg", "-v", "error", "-ss", f"{t}", "-i", src, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"])
            import io
            bg = Image.open(io.BytesIO(raw)).convert("RGBA"); fr = frame(els, t, W, H)
            if fr: bg.alpha_composite(fr)
            bg.convert("RGB").resize((360, int(360 * H / W)), Image.LANCZOS).save(out, quality=88); print(out)
        return
    if not os.path.exists(base): shutil.copyfile(render, base)
    out = os.path.join(vdir, "render.special.mp4"); blank = bytes(W * H * 4)
    br = int(st.get("bit_rate") or 12_000_000)
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", base, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", f"{n}/{dn}", "-i", "-",
           "-filter_complex", "[0:v][1:v]overlay=format=auto:shortest=0:eof_action=pass,format=yuv420p[v]", "-map", "[v]", "-map", "0:a?", "-c:a", "copy",
           "-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "19", "-b:v", "0", "-maxrate", str(max(br * 2, 16_000_000)), "-movflags", "+faststart", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    drawn = 0
    for i in range(N):
        fr = frame(els, i / fps, W, H)
        if fr is None: p.stdin.write(blank)
        else: p.stdin.write(fr.tobytes()); drawn += 1
    p.stdin.close()
    if p.wait() != 0: sys.exit("ffmpeg failed")
    os.replace(out, render)
    json.dump({"spec": spec, "frames_drawn": drawn, "frames": N, "base": "render.base.mp4"}, open(os.path.join(vdir, "special.applied.json"), "w", encoding="utf8"), indent=1)
    print(f"special layer applied: {drawn}/{N} frames drawn -> {render} (base kept as render.base.mp4)")


if __name__ == "__main__":
    main()
