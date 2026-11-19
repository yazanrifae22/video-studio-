import json, sys, subprocess, re
H = '8e437aa4551d53383b835b2af5585f1b26b5299f2ee48a52d7a1412848e05fe7'
a, b = float(sys.argv[1]), float(sys.argv[2])
t = json.load(open('E:/clips-viral/data/cache/%s/transcript.en.json' % H, encoding='utf-8'))
an = json.load(open('E:/clips-viral/data/cache/%s/analysis.json' % H, encoding='utf-8'))
print('SCENE CUTS:', [s['start'] for s in an['scenes'] if a - 2 <= s['start'] <= b + 2])
line = ''
for s in t['segments']:
    for w in s['words']:
        if a <= w['s'] <= b:
            line += '%s[%.2f-%.2f] ' % (w['w'].strip(), w['s'], w['e'])
print(line)
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-ss', str(a), '-t', str(b - a), '-i', 'E:/clips-viral/data/media/nasa/src-261021-o7kw.mp4',
                    '-vn', '-af', 'silencedetect=n=-38dB:d=0.12', '-f', 'null', '-'], capture_output=True, text=True)
st = re.findall(r'silence_start: ([\d.]+)', r.stderr)
en = re.findall(r'silence_end: ([\d.]+)', r.stderr)
print('SILENCES:', [(round(float(x) + a, 2), round(float(y) + a, 2)) for x, y in zip(st, en)])
