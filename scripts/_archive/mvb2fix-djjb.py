import json,copy
P='E:/clips-viral/productions/clip-261024-djjb/cutlist.json'
cl=json.load(open(P,encoding='utf-8'))
S=cl['segments']
def mk(a,b,z,px,py,why):
    s=copy.deepcopy(S[0]);s.pop('audio_fade_in',None)
    s.update(src_in=a,src_out=b,zoom=z,pan_x=px,pan_y=py,why=why);return s
ext='restored "that our workers and our administrators gave to putting equipment together on the ground and then testing it" (src 187.2-198.5; pauses > 0.45 s jump-cut) - fixes the mid-"that" join'
new=S[:4]
new.append(mk(185.53,187.79,1.0,-9.5,0,ext))
new.append(mk(188.19,189.76,1.2,-15.2,6,ext))
new.append(mk(190.07,192.46,1.0,-12.6,0,ext))
new.append(mk(192.95,195.89,1.2,-4.0,6,ext))
new.append(mk(196.29,198.55,1.0,-15.8,0,ext+'; ends on "testing it", joins the masterful passage ("do that")'))
new+= [S[5],S[6],S[7],S[8]]
s10=S[9]; s10['src_out']=222.0; s10['why']+='; ends on "with no link broken." (retention: repeat "Having no link broken" cut)'
new.append(s10)
s12=S[11]; s12.update(src_in=224.22,src_out=226.85,zoom=1.0,pan_x=-15.8,pan_y=0,why='ends on "that to me was the crux of it." (kept "of it" so the sentence is complete); starts in the dip between "broken," and "that"')
new.append(s12)
cl['segments']=new
cl['caption_timing']=[c for c in cl['caption_timing'] if c['word'] not in ('Having',) and not (c['word']=='that' and c['at']==187.22)]
t=sum(s['src_out']-s['src_in'] for s in new);d=round(t,2)
for x in cl['texts']:
    if x['role']=='credit': x['dur']=round(d-3.0-x['at'],2)
    if x['role']=='cta': x['at']=round(d-3.0,2)
cl['target_duration']=d
json.dump(cl,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=1);print(d,len(new))
