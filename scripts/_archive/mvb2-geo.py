"""Framing helper for cover-fill cut-list segments (mv-B2fix).
solve(): trim/zoom/face position -> pan_x, pan_y (% of canvas). preview(): ffmpeg frame at 360x640 that mimics the builder.
usage: python scripts/mvb2-geo.py preview <src.mp4> <t> <trim_l> <trim_r> <zoom> <pan_x> <pan_y> <out.png> [sw sh]
       python scripts/mvb2-geo.py solve <face_x> <eye_y> <trim_l> <trim_r> <zoom> <eye_frac> [sw sh]
"""
import subprocess
import sys


def solve(face_x, eye_y, trim_l, trim_r, zoom, eye_frac=0.33, sw=1280, sh=720, face_frac_x=0.5):
    tw, th = sw - trim_l - trim_r, sh
    s = max(1080 / tw, 1920 / th)
    px = ((face_frac_x * 1080) - (540 + (face_x - trim_l - tw / 2) * s * zoom)) / 1080 * 100
    py = ((eye_frac * 1920) - (960 + (eye_y - th / 2) * s * zoom)) / 1920 * 100
    lim_x = (tw * s * zoom / 1080 - 1) * 50
    lim_y = (th * s * zoom / 1920 - 1) * 50
    return dict(pan_x=round(max(-lim_x, min(lim_x, px)), 1), pan_y=round(max(-lim_y, min(lim_y, py)), 1), raw=(round(px, 1), round(py, 1)), lim=(round(lim_x, 1), round(lim_y, 1)))


def preview(src, t, trim_l, trim_r, zoom, pan_x, pan_y, out, sw=1280, sh=720):
    tw, th = sw - trim_l - trim_r, sh
    s = max(1080 / tw, 1920 / th)
    iw, ih = int(tw * s * zoom), int(th * s * zoom)
    ox = int(540 + pan_x * 10.8 - iw / 2)
    oy = int(960 + pan_y * 19.2 - ih / 2)
    vf = (f"crop={tw}:{th}:{trim_l}:0,scale={iw}:{ih}:flags=bicubic,pad=1080:1920:{-ox if False else 0}:0,setsar=1")
    # simpler: scale then crop a window from the (possibly padded) image
    vf = (f"crop={tw}:{th}:{trim_l}:0,scale={iw}:{ih}:flags=bicubic,"
          f"pad={max(iw, 1080) + 2 * abs(ox) + 10}:{max(ih, 1920) + 2 * abs(oy) + 10}:{abs(ox) + 5 + max(ox, 0) * 0}:{abs(oy) + 5}:black,"
          f"crop=1080:1920:{abs(ox) + 5 - ox}:{abs(oy) + 5 - oy},scale=360:640")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t), '-i', src, '-frames:v', '1', '-vf', vf, out], check=True)


if __name__ == '__main__':
    a = sys.argv
    if a[1] == 'solve':
        print(solve(*[float(x) for x in a[2:8]], *[int(x) for x in a[8:10]]))
    else:
        preview(a[2], float(a[3]), int(a[4]), int(a[5]), float(a[6]), float(a[7]), float(a[8]), a[9], *[int(x) for x in a[10:12]])
