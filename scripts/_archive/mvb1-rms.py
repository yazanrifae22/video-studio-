import sys, subprocess, numpy as np
# usage: mvb1-rms.py t1 t2 ...  -> 20 ms RMS dB profile +-0.35 s around each time (source o7kw)
SRC = 'E:/clips-viral/data/media/nasa/src-261021-o7kw.mp4'
for t in map(float, sys.argv[1:]):
    a = t - 0.35
    r = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(a), '-t', '0.7', '-i', SRC, '-vn', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.int16).astype(float) / 32768
    n = 320
    out = []
    for i in range(0, len(x) - n + 1, n):
        rms = np.sqrt(np.mean(x[i:i + n] ** 2)) + 1e-9
        out.append('%.2f:%d' % (a + i / 16000, round(20 * np.log10(rms))))
    print('== %.2f' % t)
    print(' '.join(out))
