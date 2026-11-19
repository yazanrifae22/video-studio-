"""Whole-video frame check for the fair-game long-form (real MP4, not snaps).
   python docs/brands/test-3d/fair-game/frame-check.py <production id> [--parts 4]
Newest version with a render.mp4:
  1. machine pass over EVERY frame: black frames, frozen picture (ffmpeg blackdetect / freezedetect)  -> <ver>/qa/frame-check/machine.json
  2. one frame per second from the MP4 -> sheets of 12 (3 x 4, cells 480x270, stamped m:ss + line id)   -> <ver>/qa/frame-check/sheet-NNN.jpg
  3. per part (chapters split into --parts groups): partK.md = which sheets, and for every second the line spoken,
     the burned caption expected, and what the picture must show (storyboard picture / motion / tags)."""
import json, os, re, glob, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = 'E:/clips-viral'; HERE = f'{ROOT}/docs/brands/test-3d/fair-game'
pid = sys.argv[1]
opt = lambda k, d=None: (sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d)
NPARTS = int(opt('--parts', '4'))
vers = sorted((int(os.path.basename(os.path.dirname(p))[1:]), p) for p in glob.glob(f'{ROOT}/productions/{pid}/v*/render.mp4'))
n, mp4 = vers[-1]; vdir = os.path.dirname(mp4).replace('\\', '/'); out = f'{vdir}/qa/frame-check'; os.makedirs(f'{out}/f', exist_ok=True)
score = json.load(open(f'{vdir}/score.json', encoding='utf8')); caps = json.load(open(f'{vdir}/captions.json', encoding='utf8'))
sb = json.load(open(f'{HERE}/storyboard.json', encoding='utf8')); film = json.load(open(f'{ROOT}/productions/{pid}/film.json', encoding='utf8'))
sbl = {l['id']: l for c in sb['chapters'] for l in c['lines']}
mmss = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'

REUSE = '--reuse' in sys.argv and os.path.exists(f'{out}/machine.json') and glob.glob(f'{out}/f/*.jpg')
if REUSE:
    old = json.load(open(f'{out}/machine.json', encoding='utf8')); black, freeze = old['machine']['black'], old['machine']['freeze']; st = {'nb_read_packets': old['frames'], 'r_frame_rate': old['fps'], 'width': old['size'].split('x')[0], 'height': old['size'].split('x')[1]}
else:
    # 1. machine pass, every frame
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mp4, '-an', '-vf', 'blackdetect=d=0.05:pix_th=0.08,freezedetect=n=0.002:d=1.5', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf8', errors='replace')
    black = [{'t0': float(a), 't1': float(b)} for a, b in re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', r.stderr)]
    fs = [float(x) for x in re.findall(r'freeze_start: ([\d.]+)', r.stderr)]; fe = [float(x) for x in re.findall(r'freeze_end: ([\d.]+)', r.stderr)]
    freeze = [{'t0': a, 't1': (fe[i] if i < len(fe) else score['duration'])} for i, a in enumerate(fs)]
    p = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets,r_frame_rate,width,height', '-of', 'json', mp4], capture_output=True, text=True)
    st = json.loads(p.stdout)['streams'][0]

    # 2. one frame per second
    for f in glob.glob(f'{out}/f/*.jpg'): os.remove(f)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', mp4, '-an', '-vf', 'fps=1:round=down,scale=480:270:flags=lanczos', '-q:v', '3', f'{out}/f/%04d.jpg'], check=True)
frames = sorted(glob.glob(f'{out}/f/*.jpg')); T = list(range(len(frames)))   # frame k ~ second k

def line_at(t):
    cur = None
    for l in score['lines']:
        if l['t0'] <= t: cur = l
        else: break
    if cur is None: return None, 'before'
    return cur, ('speech' if t <= cur['t1'] else 'pause')
cap_at = lambda t: next((c['text'] for c in caps if c['t0'] <= t < c['t1']), '')
said = lambda l, t: ' '.join(w['w'] for w in l['words'] if t - 1.0 < w['t0'] <= t)   # words that started in the last second

font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 15)
CW, CH, LB, COLS, ROWS = 480, 270, 20, 3, 4; PER = COLS * ROWS   # LB: label strip under each picture (the stamp never covers the picture)
for f in glob.glob(f'{out}/sheet-*.jpg'): os.remove(f)
sheets = []
for si in range(0, len(frames), PER):
    sheet = Image.new('RGB', (CW * COLS, (CH + LB) * ROWS), (0, 0, 0)); d = ImageDraw.Draw(sheet); cells = []
    for k, f in enumerate(frames[si:si + PER]):
        t = T[si + k]; l, ph = line_at(t); x, y = (k % COLS) * CW, (k // COLS) * (CH + LB)
        sheet.paste(Image.open(f).convert('RGB'), (x, y)); lab = f"{mmss(t)} {l['id'] if l else '-'}{'' if ph == 'speech' else ' (pause)'}"
        d.rectangle([x, y + CH, x + CW - 1, y + CH + LB - 1], fill=(40, 40, 46)); d.text((x + 6, y + CH + 1), lab, font=font, fill=(255, 210, 60))
        cells.append({'t': t, 'line': l['id'] if l else None, 'phase': ph, 'said': said(l, t) if l and ph == 'speech' else '', 'caption': cap_at(t)})
    name = f'sheet-{si // PER + 1:03d}.jpg'; sheet.save(f'{out}/{name}', quality=86); sheets.append({'file': name, 't0': T[si], 't1': T[min(si + PER, len(frames)) - 1], 'cells': cells})

# 3. parts by chapter time
chs = score['chapters']; total = score['duration']; per = -(-len(sheets) // NPARTS)   # equal sheet counts; a part = a time window
wins = [(sheets[i]['t0'], sheets[min(i + per, len(sheets)) - 1]['t1'] + 1) for i in range(0, len(sheets), per)]
parts = [[{'id': c['id'], 't0': a, 't1': b} for c in chs if c['t1'] > a and c['t0'] < b] for a, b in wins]
for p_, (a, b) in zip(parts, wins): p_[0] = {**p_[0], 't0': a}; p_[-1] = {**p_[-1], 't1': min(b, total)}
index = {'production': pid, 'version': n, 'mp4': mp4, 'duration': total, 'frames': int(st.get('nb_read_packets', 0)), 'fps': st['r_frame_rate'], 'size': f"{st['width']}x{st['height']}",
         'machine': {'black': black, 'freeze': freeze}, 'seconds_sampled': len(frames), 'sheets': len(sheets), 'parts': []}
for pi, pcs in enumerate(parts, 1):
    t0, t1 = pcs[0]['t0'], pcs[-1]['t1']; mine = [s for s in sheets if s['t1'] >= t0 and s['t0'] < t1]
    L = [f"# {pid} v{n} part {pi}: {mmss(t0)} to {mmss(t1)} (chapters {', '.join(c['id'] for c in pcs)})", '',
         f"Sheets folder: {out}", f"Sheets for this part: {', '.join(s['file'] for s in mine)}", 'Each sheet: 12 cells, left to right then top to bottom, one frame per second; the grey strip UNDER each picture is its m:ss + script line (the strip belongs to the picture above it).',
         f"Burned hook text (big text in the lower third for the first {film.get('hook_dur', 3)} s; no caption under it during that time): {sb['hook_text']} | Closing text (from the word 'which' in the last line to the end): {sb['end_text']}", '',
         '## What each line must show', '']
    for l in score['lines']:
        if l['t1'] < t0 or l['t0'] >= t1: continue
        b = sbl.get(l['id'], {})
        L += [f"### {l['id']}  {mmss(l['t0'])} to {mmss(l['t1'])}", f"SAYS: {l['text']}", f"PICTURE: {b.get('picture', '')}", f"MOTION: {b.get('motion', '')}", f"TAGS (text labels that should appear during the line): {', '.join(b.get('tags', [])) or 'none'}", '']
    L += ['## Second by second (time | line | words just spoken | burned caption expected on screen)', '']
    for s in mine:
        L.append(f"**{s['file']}**")
        for c in s['cells']:
            if t0 - 1 <= c['t'] < t1 + 1: L.append(f"- {mmss(c['t'])} | {c['line'] or '-'}{'' if c['phase'] == 'speech' else ' (pause)'} | {c['said']} | {c['caption']}")
        L.append('')
    open(f'{out}/part{pi}.md', 'w', encoding='utf8').write('\n'.join(L))
    index['parts'].append({'part': pi, 't0': t0, 't1': t1, 'chapters': [c['id'] for c in pcs], 'sheets': [s['file'] for s in mine], 'brief': f'{out}/part{pi}.md'})
json.dump(index, open(f'{out}/machine.json', 'w', encoding='utf8'), indent=1)
print(json.dumps({k: index[k] for k in ('production', 'version', 'duration', 'frames', 'fps', 'seconds_sampled', 'sheets')}), '\nblack', black, '\nfreeze', freeze, '\nparts', [(p_['part'], p_['chapters'], len(p_['sheets'])) for p_ in index['parts']])
