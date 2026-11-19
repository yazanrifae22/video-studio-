import json
P='E:/clips-viral/productions/clip-261024-h6ei/cutlist.json'
cl=json.load(open(P,encoding='utf-8'))
S=cl['segments']
keep=[S[0],S[1],S[2],S[3],S[4],S[7],S[8]]
Z={1.6:(11.9,28.8),1.9:(14.1,40.7)}
t=0
for i,s in enumerate(keep):
    z=1.6 if i%2==0 else 1.9
    s.update(fill='cover',zoom=z,pan_x=Z[z][0],pan_y=Z[z][1],trim={'left':0,'right':800,'top':0,'bottom':0})
    s['why']='jump-cut piece; face-fill framing (trim right 800, cover zoom %.1f), zoom alternates for R5'%z
    t+=s['src_out']-s['src_in']
S[7]['src_in']=1037.04
cl['segments']=keep
cl['caption_timing']=[c for c in cl['caption_timing'] if c['word']!='tool.']
dur=round(t,2)
for x in cl['texts']:
    if x['role']=='title': x['dur']=round(dur-3.0-x['at'],2)
    if x['role']=='credit': x['dur']=round(dur-3.0,2)
    if x['role']=='cta': x['at']=round(dur-3.0,2)
cl['target_duration']=round(dur,2)
json.dump(cl,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(dur)
