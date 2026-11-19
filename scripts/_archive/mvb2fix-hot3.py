import json
P='E:/clips-viral/productions/clip-261024-hot3/cutlist.json'
cl=json.load(open(P,encoding='utf-8'))
base=cl['segments'][0]
A='src-261024-7t0d'
spec=[(2196.99,2199.30,1.15),(2199.50,2201.99,1.4),(2202.46,2206.20,1.15),
      (2212.54,2213.59,1.7),(2214.13,2216.43,2.05),(2216.43,2220.24,1.7),(2220.60,2223.22,2.05),(2224.02,2224.92,1.7),(2226.45,2227.60,2.05)]
PAN={1.15:(-2.8,7.5),1.4:(-3.5,19.9),1.7:(0.0,34.5),2.05:(0.0,51.5)}
segs=[];t=0
for i,(a,b,z) in enumerate(spec):
    s={'asset_id':A,'src_in':a,'src_out':b,'fill':'cover','zoom':z,'pan_x':PAN[z][0],'pan_y':PAN[z][1],'trim':{'left':380,'right':420,'top':0,'bottom':0},
       'motion':None,'mute_source':False,'volume':1.0,
       'why':'face-fill framing (trim 380/420, cover zoom %.2f; close-up camera until src 2212.27, wide camera after, never the NASA logo band)'%z}
    if i==0: s['audio_fade_in']=0.067; s['why']+='; opens on "and we were all thinking, what\'s going on?" (recap + first telling removed for R1/R2 meaning: hook card names Satoshi)'
    if i==3: s['why']+='; skips the retold story 2208.23-2212.4 ("Satoshi had been trying ... tool bag") per retention review'
    segs.append(s);t+=b-a
cl['segments']=segs
d=round(t,2)
for x in cl['texts']:
    if x['role']=='hook': x['text']="Satoshi's Fuji photo got photobombed"
    if x['role']=='title': x['dur']=round(d-3.0-x['at'],2)
    if x['role']=='credit': x['dur']=round(d-3.0,2)
    if x['role']=='cta': x['at']=round(d-3.0,2)
cl['target_duration']=d
json.dump(cl,open(P,'w',encoding='utf-8'),ensure_ascii=False,indent=1);print(d)
