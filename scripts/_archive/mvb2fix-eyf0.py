import json
P='E:/clips-viral/productions/clip-261024-eyf0/cutlist.json'
cl=json.load(open(P,encoding='utf-8'))
S=cl['segments']
keep=[S[0],S[1],S[3],S[4],S[5],S[6],S[7],S[8]]
keep[1]['src_out']=287.18
keep[2]['src_in']=291.16
keep[-1]['src_out']=307.70
Z={1.7:(4.2,28.1),2.05:(5.1,34.4)}
t=0
for i,s in enumerate(keep):
    z=1.7 if i%2==0 else 2.05
    s.update(fill='cover',zoom=z,pan_x=Z[z][0],pan_y=Z[z][1],trim={'left':0,'right':800,'top':0,'bottom':0})
    s['why']='face-fill framing (trim right 800, cover zoom %.2f), zoom alternates for R5'%z
    t+=s['src_out']-s['src_in']
keep[0]['why']+='. Caption check "MY GIRLS STILL ASK": 10 ms RMS + spectrogram show a ~0.28 s voiceless /s/ (284.12-284.40) between "girl" and "still" with a pause = a merged "girls"+"still" /s#s/, not one /s/; large-v3 on the 2 s span (beam 1 and 5) = "My girls still ask me" (small.en/medium.en: "girl ... ask/asks", tiny/base: "girl ... asked"); she has two daughters. ASK vs ASKED: no audible final /t/ burst before "me". Rights re-check: audio 283.7-285.3.'
S0=keep
cl['segments']=keep
cl['caption_fixes']=[c for c in cl['caption_fixes'] if c['at'] not in (290.95,)]  # uh stays deleted below
cl['caption_fixes'].append({'asset_id':'src-261024-7t0d','at':290.95,'from':'uh','to':''})
cl['caption_timing']=[{'asset_id':'src-261024-7t0d','at':307.59,'word':'head','start':307.57,'end':307.66}]
dur=round(t,2)
for x in cl['texts']:
    if x['role']=='title': x['dur']=round(dur-3.0-x['at'],2)
    if x['role']=='credit': x['dur']=round(dur-3.0,2)
    if x['role']=='cta': x['at']=round(dur-3.0,2)
cl['target_duration']=dur
json.dump(cl,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(dur,[c for c in cl['caption_fixes']])
