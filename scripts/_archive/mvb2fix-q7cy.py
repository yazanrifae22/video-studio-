import json
P='E:/clips-viral/productions/clip-261024-q7cy/cutlist.json'
cl=json.load(open(P,encoding='utf-8'))
S=cl['segments']
new=[S[0],S[1],S[2],dict(S[3]),dict(S[5]),dict(S[6]),dict(S[7]),dict(S[8]),dict(S[9])]
new[3].update(src_in=1462.03,src_out=1464.47,why='"you know, the Dragon lands in water." (referent kept; "and I think that makes a big difference" cut: QA + retention)')
new[4].update(src_in=1467.42,src_out=1470.25,zoom=1.3,pan_y=14.3,why='join at "It was actually kind of a very soft splash" (setup cut, retention R2)')
new[5].update(zoom=1.55,pan_y=26)
new[6].update(zoom=1.3,pan_y=14.3)
new[7].update(src_in=1478.26,src_out=1481.63,fill='blur',zoom=2.5,pan_x=3.9,pan_y=2.6,why='blur fill: lowers the head so the CTA card sits above the hair (blurred band at the top)')
new[8].update(src_in=1482.03,src_out=1484.55,fill='blur',zoom=3.0,pan_x=4.7,pan_y=9.5,why='merged 1.0/1.2/1.3 s fragments into one piece "very, very benign"; ends on the completed phrase; blur fill keeps CTA off the hair')
for s in new: s.pop('motion',None); s['motion']=None
cl['segments']=new
cl['caption_timing']=[c for c in cl['caption_timing'] if c['word']!='difference.']
t=sum(s['src_out']-s['src_in'] for s in new);d=round(t,2)
for x in cl['texts']:
    if x['role']=='title': x['dur']=round(d-3.0-x['at'],2)
    if x['role']=='credit': x['dur']=round(d-3.0,2)
    if x['role']=='cta': x['at']=round(d-3.0,2)
cl['target_duration']=d
json.dump(cl,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=1);print(d)
