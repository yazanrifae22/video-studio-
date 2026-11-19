"""Local review page for the fair-game long-form (three looks, one script). Nothing is uploaded.
   python docs/brands/test-3d/fair-game/make-review.py   ->  docs/brands/test-3d/fair-game/review.html
Reads the newest version with a render.mp4 of each production, its build.json / chapters.txt, the thumbnails and publish-kit.md."""
import json, os, re, glob, html

ROOT = 'E:/clips-viral'
HERE = f'{ROOT}/docs/brands/test-3d/fair-game'
ARMS = [('expl-261115-c2fy', 'Salt Parable', '@SaltParable', 'Macro', 'Algenib'),
        ('expl-261115-u1h6', 'Copper Parable', '@CopperParable', 'Host', 'Achird'),
        ('expl-261115-1yab', 'Brass Parable', '@BrassParable', 'Neon', 'Iapetus')]
kit = open(f'{HERE}/publish-kit.md', encoding='utf8').read()
title = re.search(r'## Title\s*`([^`]+)`', kit).group(1)
desc = re.search(r'## Description\s*```\n(.*?)```', kit, re.S).group(1).strip()
pinned = re.search(r'## Pinned comment[^\n]*\n`([^`]+)`', kit).group(1)
sb = json.load(open(f'{HERE}/storyboard.json', encoding='utf8'))
qa = json.load(open(f'{HERE}/final-qa.json', encoding='utf8')) if os.path.exists(f'{HERE}/final-qa.json') else {}
e = html.escape
rel = lambda p: os.path.relpath(p, HERE).replace('\\', '/')
mmss = lambda s: f'{int(s // 60)}:{int(s % 60):02d}'

cards = []
for pid, channel, handle, look, voice in ARMS:
    vers = sorted((int(os.path.basename(os.path.dirname(p))[1:]), p) for p in glob.glob(f'{ROOT}/productions/{pid}/v*/render.mp4'))
    if not vers:
        cards.append(f'<section class="card"><h2>{e(channel)} <span>{e(look)}</span></h2><p class="bad">No finished render yet.</p></section>'); continue
    n, mp4 = vers[-1]; vdir = os.path.dirname(mp4)
    b = json.load(open(f'{vdir}/build.json', encoding='utf8'))
    t = b.get('techqa', {}); mix = b.get('mix', {})
    chapters = open(f'{vdir}/chapters.txt', encoding='utf8').read().strip()
    thumb = f'{HERE}/thumbs/{look.lower()}.jpg'
    q = qa.get(pid, {})
    rows = [('Length', mmss(b['duration'])), ('Size', f"{t.get('bytes', 0) / 1e9:.2f} GB, {b['picture']['width']}x{b['picture']['height']} @ {b['picture']['fps']}"),
            ('Loudness', f"{t.get('integrated_lufs')} LUFS, peak {t.get('true_peak_dbfs')} dBTP"), ('Voice over music', f"{mix.get('voice_over_music_under_speech_db')} dB"),
            ('Voice', f"{voice}, {b.get('words_per_s')} words/s"), ('Technical check', 'passed' if t.get('pass') else 'FAILED: ' + ', '.join(t.get('failed', []))),
            ('Captions', f"{b.get('captions')} burned lines + captions.srt")]
    if q: rows.append(('Picture check', q.get('summary', '')))
    cards.append(f'''<section class="card">
<h2>{e(channel)} <span>{e(handle)} · {e(look)} look · v{n}</span></h2>
<video controls preload="metadata" {'poster="' + rel(thumb) + '"' if os.path.exists(thumb) else ''} src="{rel(mp4)}"></video>
<table>{''.join(f'<tr><th>{e(k)}</th><td>{e(str(v))}</td></tr>' for k, v in rows)}</table>
{'<p class="note">' + e(q['open']) + '</p>' if q.get('open') else ''}
<details><summary>Chapters (paste into the description)</summary><pre>{e(chapters)}</pre></details>
<p class="path">{e(mp4)}</p>
{'<a class="thumb" href="' + rel(thumb) + '"><img src="' + rel(thumb) + '" alt="thumbnail"></a>' if os.path.exists(thumb) else ''}
</section>''')

words = sum(len(l['text'].split()) for c in sb['chapters'] for l in c['lines'])
script = ''.join(f"<h4>{e(c['title'])}</h4><p>{' '.join(e(l['text']) for l in c['lines'])}</p>" for c in sb['chapters'])
page = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fair game: review</title><style>
:root{{--bg:#0f1114;--card:#181b20;--line:#2a2f37;--ink:#e9e6df;--mut:#9a9fa8;--gold:#e9b949;--bad:#ff7a6b}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:14px/1.45 "Segoe UI",system-ui,sans-serif}}
header{{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;gap:18px;align-items:baseline;flex-wrap:wrap}}
h1{{margin:0;font-size:20px}}h1 b{{color:var(--gold)}}header span{{color:var(--mut)}}
.grid{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:12px 18px}}
.card{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px;min-width:0}}
h2{{margin:0 0 8px;font-size:16px;color:var(--gold)}}h2 span{{color:var(--mut);font-weight:400;font-size:12px;margin-left:6px}}
video,.thumb img{{width:100%;display:block;border-radius:6px;background:#000}}.thumb{{display:block;margin-top:8px}}
table{{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px}}th{{text-align:left;color:var(--mut);font-weight:400;width:38%;padding:2px 6px 2px 0;vertical-align:top}}td{{padding:2px 0}}
.path{{color:var(--mut);font:11px Consolas,monospace;word-break:break-all;margin:6px 0 0}}.note{{color:#ffd58a;margin:4px 0}}.bad{{color:var(--bad)}}
pre{{white-space:pre-wrap;background:#101216;border:1px solid var(--line);border-radius:6px;padding:8px;margin:6px 0;font:12px/1.45 Consolas,monospace}}
.cols{{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 18px 18px}}.cols h3{{margin:0 0 6px;font-size:14px;color:var(--gold)}}
.cols h4{{margin:10px 0 2px;font-size:12px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}}.cols p{{margin:0 0 6px}}
summary{{cursor:pointer;color:var(--mut)}}summary:hover{{color:var(--gold)}}
@media(max-width:1100px){{.grid,.cols{{grid-template-columns:1fr}}}}
</style></head><body>
<header><h1><b>{e(title)}</b></h1><span>one script, three looks and voices · {words} words · scheduled 2026-11-17 17:00 local (15:00 UTC) on the three channels</span></header>
<div class="grid">{''.join(cards)}</div>
<div class="cols">
<section class="card"><h3>Title</h3><pre>{e(title)}</pre><h3>Description (same on the three channels; chapters from each card)</h3><pre>{e(desc)}</pre><h3>Pinned comment</h3><pre>{e(pinned)}</pre></section>
<section class="card"><h3>Script</h3>{script}</section>
</div></body></html>'''
open(f'{HERE}/review.html', 'w', encoding='utf8').write(page)
print(f'{HERE}/review.html', len(page), 'bytes')
