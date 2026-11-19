"""Owner review page for the Karto GTA 6 video: characters (EN + AR), format, script side by side, shorts, facts, open decisions.
python docs/brands/karto/gta6/make-review.py  ->  docs/brands/karto/gta6/review.html (self-contained, images inlined)"""
import base64, html, io, json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
BRAND = os.path.dirname(ROOT)
d = json.load(open(os.path.join(ROOT, 'storyboard.json'), encoding='utf8'))
e = html.escape


def img(name):
    p = os.path.join(BRAND, name)
    if not os.path.exists(p):
        return ''
    return 'data:image/jpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()


CAST = [
 {"key": "karto", "img": "karto.jpg", "en_name": "Karto", "ar_name": "كرتو", "role_en": "The host", "role_ar": "الراوي",
  "en": ["A cardboard box that decided to explain the world. Curious, a little dramatic, proud of his cheap cardboard props.",
         "Voice: warm, quick storyteller. Short sentences. Explains with objects, never with jargon.",
         "Honest: when something is only a guess he says so and sticks tape on it.",
         "Comedy engine: he over-prepares. He built a cardboard model for everything and is hurt when Skip is not impressed.",
         "Never: lectures, begs for likes, says \"in this video\", insults the viewer."],
  "ar": ["كرتونة قررت تشرح العالم. فضولي، درامي شوي، وفخور بأغراضه الكرتون الرخيصة.",
         "الصوت: حكواتي دافي وسريع. جمل قصيرة. بيشرح بالأغراض، مو بالمصطلحات.",
         "صادق: إذا المعلومة تخمين، بيقولها وبيلزّق عليها شريط.",
         "مصدر الضحك: بيحضّر زيادة عن اللزوم. عامل مجسّم كرتون لكل شي، وبينجرح إذا سكيب ما انبهر.",
         "ممنوع: يحاضر، يشحد لايكات، يقول «بهالفيديو»، يهين المشاهد."]},
 {"key": "skip", "img": "skip.jpg", "en_name": "Skip", "ar_name": "سكيب", "role_en": "The viewer, on screen", "role_ar": "المشاهد، جوّا الفيديو",
  "en": ["A small yellow sticky note with a phone. He is YOU: bored fast, doubts everything, asks the question the viewer is thinking.",
         "Voice: dry, fast, teasing. One-liners. He is never stupid: his questions are the smart objections.",
         "His thumb is always over the skip button. Once per video he tries to skip at the slowest moment, and Karto answers with the strongest fact.",
         "Arc: starts ready to skip, gets pulled in, and ends by asking the next question himself.",
         "Never: explains (that is Karto's job), agrees too early, talks for more than two lines in a row."],
  "ar": ["ورقة ملاحظات صفرا صغيرة ومعها موبايل. هو إنت: بيمل بسرعة، بيشك بكل شي، وبيسأل السؤال يلي ببال المشاهد.",
         "الصوت: ناشف، سريع، ومناكف. جملة وحدة وبتخلص. مو غبي أبداً: أسئلته هي الاعتراضات الذكية.",
         "إصبعه دايماً فوق زر التخطّي. مرة بكل فيديو بيحاول يعمل سكيب بأبطأ لحظة، وكرتو بيرد عليه بأقوى معلومة.",
         "الرحلة: بيبلش جاهز يعمل سكيب، بينسحب للقصة، وبالآخر هو يلي بيسأل السؤال الجاي.",
         "ممنوع: يشرح (هي شغلة كرتو)، يوافق بكّير، يحكي أكتر من سطرين ورا بعض."]},
]

n_lines = sum(len(c['lines']) for c in d['chapters'])
w_en = sum(len(l['en'].split()) for c in d['chapters'] for l in c['lines'])
w_ar = sum(len(l['ar'].split()) for c in d['chapters'] for l in c['lines'])
ids = [l['id'] for c in d['chapters'] for l in c['lines']]
LINES = {l['id']: l for c in d['chapters'] for l in c['lines']}

out = io.StringIO()
w = out.write
w('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Karto & Skip Review</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;600&family=Lalezar&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
/* layout: one dense column of cardboard "boards"; cast as two paper cards; script as a 3-track table (who | English | Arabic) that stacks on phones */
:root{--bg:#e9dcc6;--board:#fbf8f1;--ink:#231a12;--muted:#6d5b47;--line:#d6c4a6;--kraft:#b98a55;--karto:#d9401f;--skip:#f2c21a;--skipink:#5a4500;--ok:#2f7d4f;--warn:#b25a00;
 --display:"Lilita One","Lalezar","Arial Black",sans-serif;--body:"Atkinson Hyperlegible","IBM Plex Sans Arabic","Segoe UI",sans-serif;--ar:"IBM Plex Sans Arabic","Segoe UI",Tahoma,sans-serif;--ardisplay:"Lalezar","IBM Plex Sans Arabic",sans-serif;--mono:"JetBrains Mono",Consolas,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1d1610;--board:#2a2018;--ink:#f3e9d8;--muted:#b9a78d;--line:#463726;--kraft:#8a6238;--karto:#ff6a45;--skip:#f6cf3c;--skipink:#2a2000;--ok:#6fcf97;--warn:#ffb059;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#1d1610;--board:#2a2018;--ink:#f3e9d8;--muted:#b9a78d;--line:#463726;--kraft:#8a6238;--karto:#ff6a45;--skip:#f6cf3c;--skipink:#2a2000;--ok:#6fcf97;--warn:#ffb059;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5}
.wrap{max-width:1180px;margin:0 auto;padding-block:20px 48px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:flex;flex-direction:column;gap:18px}
h1{font-family:var(--display);font-weight:400;font-size:clamp(28px,5vw,46px);line-height:1.05;margin:0;text-wrap:balance}
h2{font-family:var(--display);font-weight:400;font-size:24px;margin:0 0 10px;text-wrap:balance}
h3{font-family:var(--display);font-weight:400;font-size:19px;margin:0}
.ar{font-family:var(--ar);direction:rtl;text-align:right}
.ar h3,.ardisp{font-family:var(--ardisplay)}
.board{background:var(--board);border:1px solid var(--line);border-bottom:5px solid var(--kraft);padding:16px}
.top{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;justify-content:space-between}
.top p{margin:6px 0 0;color:var(--muted);max-width:70ch}
.facts{display:flex;flex-wrap:wrap;gap:8px;font-family:var(--mono);font-size:12px}
.facts span{border:1px solid var(--line);padding:3px 8px;background:var(--bg)}
.status{font-family:var(--mono);font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:var(--ok)}
.cast{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}
.char{display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:start}
.char img{width:150px;aspect-ratio:1;object-fit:cover;border:1px solid var(--line)}
.char .names{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline}
.char .names b{font-family:var(--display);font-weight:400;font-size:30px}
.char .names b.arn{font-family:var(--ardisplay);font-size:32px}
.role{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:10px}
.cols>div{min-width:0}
.cols ul{margin:0;padding-inline-start:18px;display:flex;flex-direction:column;gap:5px}
.chip{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:600;padding:1px 7px;border-radius:2px;letter-spacing:.03em}
.chip.karto{background:var(--karto);color:#fff}.chip.skip{background:var(--skip);color:var(--skipink)}
.sheet img{width:100%;border:1px solid var(--line)}
.look{display:grid;grid-template-columns:2.4fr 1fr;gap:14px;align-items:start}.look figure{margin:0;min-width:0}.look img{width:100%;border:1px solid var(--line)}.look figcaption{font-size:12.5px;color:var(--muted);margin-top:4px}
@media (max-width:760px){.look{grid-template-columns:1fr}}
.game ol,.need ol{margin:0;padding-inline-start:20px;display:flex;flex-direction:column;gap:6px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:18px}.two>div{min-width:0}
.chap{margin-top:14px}
.chaphead{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--ink);padding-bottom:4px;margin-bottom:2px}
.chaphead .n{font-family:var(--mono);font-size:11px;color:var(--muted)}
.row{display:grid;grid-template-columns:86px 1fr 1fr;gap:12px;padding:8px 0;border-bottom:1px solid var(--line)}
.row>div{min-width:0}
.row .id{font-family:var(--mono);font-size:11px;color:var(--muted);display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.row .pic{grid-column:2/4;font-size:12.5px;color:var(--muted);border-inline-start:3px solid var(--kraft);padding-inline-start:8px}
.row.skip .en,.row.skip .arline{font-style:normal}
.arline{font-family:var(--ar);direction:rtl;text-align:right;font-size:16px;line-height:1.7}
.tbl{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:start;padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
td.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap}
.note{color:var(--muted);font-size:13px}
.need li b{color:var(--warn)}
@media (max-width:760px){.char{grid-template-columns:96px 1fr}.char img{width:96px}.cols,.two{grid-template-columns:1fr}.row{grid-template-columns:1fr}.row .id{flex-direction:row}.row .pic{grid-column:1}}
</style></head><body style="margin:0">
<div class="wrap">
''')
w(f'''<header class="board top"><div>
<div class="status">Script passed checks · waiting for your OK · nothing voiced or rendered yet</div>
<h1>{e(d["title"]["en"])}</h1>
<h1 class="ar ardisp" style="margin-top:6px">{e(d["title"]["ar"])}</h1>
<p>New channel: a cardboard puppet show that tells the real story behind what the whole internet is talking about this week. Same picture, two languages, two characters.</p></div>
<div class="facts"><span>16:9 · about 10 min</span><span>{n_lines} lines · 7 pieces</span><span>EN {w_en} words</span><span>AR {w_ar} words</span><span>6-7 Shorts</span><span>script check 87 / gate 85</span></div>
</header>
<section class="cast">''')
for c in CAST:
    src = img(c['img'])
    w(f'''<article class="board"><div class="char">{'<img alt="%s" src="%s">' % (c['en_name'], src) if src else '<div></div>'}
<div><div class="names"><b>{c['en_name']}</b><b class="arn">{c['ar_name']}</b></div><div class="role">{c['role_en']} · <span class="ar">{c['role_ar']}</span></div></div></div>
<div class="cols"><div><ul>{''.join('<li>%s</li>' % e(x) for x in c['en'])}</ul></div><div class="ar"><ul>{''.join('<li>%s</li>' % e(x) for x in c['ar'])}</ul></div></div></article>''')
w('</section>')
ps = img('pose-sheet.jpg')
if ps:
    w(f'<section class="board sheet"><h2>Pose plates (static cutouts on sticks: they act by swapping plates, hopping, tilting)</h2><img alt="Pose sheet of Karto and Skip" src="{ps}"></section>')
DEMO = os.path.join(BRAND, '..', '..', '..', 'packages', 'cutout', 'films', '_demo', 'stills')
dw, dt = img(os.path.join(DEMO, 'wide-en', 't26.8.jpg')), img(os.path.join(DEMO, 'tall-ar', 't8.6.jpg'))
if dw and dt:
    w(f'<section class="board"><h2>How the stage looks (test frames from the look kit, not this video)</h2><div class="look"><figure><img alt="Wide English test frame" src="{dw}"><figcaption>Long video, 16:9, English: cardboard box theatre, painted backdrop, props taped to a board, caption strip.</figcaption></figure><figure><img alt="Tall Arabic test frame" src="{dt}"><figcaption>Short, 9:16, Arabic: same film re-laid, board on top, characters below.</figcaption></figure></div></section>')
w('''<section class="board game two"><div><h2>The game that ties the video to the Shorts</h2><ol>
<li>The story is cut into 7 numbered pieces. Each piece ends on a small answer and a bigger question.</li>
<li>A score card hangs on the stage. Every piece Skip survives without skipping gets a stamp.</li>
<li>Each Short is exactly one piece and ends: "That was piece 3 of seven. All seven are in the full video."</li>
<li>The long video ends: "How many of the seven did you guess before Karto said it? Write your score out of seven."</li>
<li>Opening: no greeting. Result first, Skip tries to skip, the hotel TV stops him, the seven pieces are named by about 35 s.</li></ol></div>
<div class="ar"><h2 class="ardisp">اللعبة يلي بتربط الفيديو بالشورتس</h2><ol>
<li>القصة مقسومة لسبع قطع مرقّمة. كل قطعة بتخلص بجواب صغير وسؤال أكبر.</li>
<li>في كرت نتيجة معلّق عالمسرح. كل قطعة بيكمّلها سكيب بلا ما يعمل سكيب، بياخد عليها ختم.</li>
<li>كل شورت هو قطعة وحدة بالضبط وبيخلص: «هي القطعة ٣ من سبعة. والسبعة كلهم بالفيديو الكامل.»</li>
<li>الفيديو الطويل بيخلص: «كم قطعة من السبعة حزرتها قبل ما يقولها كرتو؟ اكتب نتيجتك من سبعة.»</li>
<li>البداية: بلا ترحيب. النتيجة أول شي، سكيب بيحاول يعمل سكيب، تلفزيون الفندق بيوقفه، والقطع السبعة بتنذكر بحدود الثانية ٣٥.</li></ol></div></section>''')

w('<section class="board need"><h2>What I need from you</h2><ol>')
for t in [
 "<b>Characters:</b> approve Karto and Skip (look, names, personality) or say what to change.",
 "<b>Topic and script:</b> approve the GTA 6 story below, or mark lines to change (give the line id, e.g. l043).",
 "<b>Arabic wording:</b> it is Syrian-leaning, but an Arabic editor swapped a few words so Egypt, the Gulf and the Maghreb also understand: الفلوس (not المصاري), يتفرّج (not يحضر), مستشفى, ماما, التريلر. Keep this, or go back to pure Syrian?",
 "<b>The hacker part:</b> his name is left out on purpose and the tone is calm. The line about his guilty plea this month comes from Wikipedia quoting a BBC story of 16 Nov 2026; I will read the BBC story itself before publishing. He is due to be sentenced on 23 Nov, so the pinned comment can carry the result.",
 "<b>Channel name:</b> not chosen yet. Working names: \"Karto & Skip\" (English) and «كرتو وسكيب» (Arabic). One channel per language is my assumption.",
]:
    w(f'<li>{t}</li>')
w('</ol></section>')

w(f'<section class="board"><h2>Script, line by line</h2><p class="note">On-screen opening text: <b>{e(d["hook_text"]["en"])}</b> · <span class="ar">{e(d["hook_text"]["ar"])}</span>. Numbers are spelled out because a voice reads them. Under each line: what is on screen while it is spoken.</p>')
for c in d['chapters']:
    we = sum(len(l['en'].split()) for l in c['lines'])
    w(f'<div class="chap"><div class="chaphead"><h3>{e(c["title"]["en"])}</h3><span class="n">{c["id"]} · {len(c["lines"])} lines · about {round(we / 2.5 + 0.4 * len(c["lines"]))} s</span><h3 class="ar ardisp">{e(c["title"]["ar"])}</h3></div>')
    for l in c['lines']:
        who = l['who']
        w(f'<div class="row {who}"><div class="id"><span class="chip {who}">{"KARTO" if who == "karto" else "SKIP"}</span><span>{l["id"]}</span></div><div class="en">{e(l["en"])}</div><div class="arline">{e(l["ar"])}</div><div class="pic">{e(l["picture"])}</div></div>')
    w('</div>')
w('</section>')

w('<section class="board"><h2>Shorts cut from it</h2><div class="tbl"><table><tr><th>Short</th><th>Piece</th><th>Lines</th><th>About</th><th>Text on screen</th><th class="ar">بالعربي</th></tr>')
for s in d['shorts_plan']:
    a, b = ids.index(s['from']), ids.index(s['to'])
    ws = sum(len(LINES[i]['en'].split()) for i in ids[a:b + 1])
    w(f'<tr><td class="num">{s["id"]}</td><td class="num">{s["piece"]}</td><td class="num">{s["from"]} to {s["to"]}</td><td class="num">{round(ws / 2.5 + 0.4 * (b - a + 1) + 4)} s</td><td>{e(s["hook"]["en"])}{" (optional)" if s.get("note") else ""}</td><td class="ar">{e(s["hook"]["ar"])}</td></tr>')
w(f'</table></div><p class="note">Every Short ends with Karto: "{e(d["short_cta"]["en"].replace("{n}", "N"))}" · <span class="ar">{e(d["short_cta"]["ar"].replace("{n}", "N"))}</span></p></section>')

w('<section class="board"><h2>Where the facts stand</h2><ul>')
for f in d['fact_notes']:
    w(f'<li>{e(f)}</li>')
w('</ul><p class="note">No game footage, logos or real faces are used: everything is rebuilt in cardboard, so there is nothing for the game publisher to claim.</p></section>')
w('</div></body></html>')
open(os.path.join(ROOT, 'review.html'), 'w', encoding='utf8').write(out.getvalue())
print('review.html', round(len(out.getvalue()) / 1024), 'KB')
