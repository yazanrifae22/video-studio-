import sys, subprocess
# usage: sheet.py key start end step [cols]
k, a, b, st = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 8
G = 'C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/d3cde298-a201-4181-baef-c226a92cbb42/scratchpad/twiwm-A1/'
src = f'E:/clips-viral/data/media/nasa/src-261025-{k}.mp4'
n = int((b - a) / st) + 1
out = G + f'sheet_{k}_{int(a)}_{int(b)}.jpg'
vf = f"fps=1/{st},scale=240:-2,drawtext=text='%{{pts\\:hms}}':fontcolor=yellow:fontsize=18:box=1:boxcolor=black@0.6,tile={cols}x{(n + cols - 1) // cols}"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-t', str(b - a + 0.1), '-i', src, '-vf', vf, '-frames:v', '1', out])
print(out)
