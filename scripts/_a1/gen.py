import json,sys
P='E:/clips-viral/productions/'
def A(x):return 'src-261025-'+x
def gen(pid,segs,cta,credits,extra_texts=(),cta_id=''):
    t=0;S=[];T=[];acc=[]
    cur=None
    for i,(a,ti,to,chip,*opt) in enumerate(segs):
        d=round(to-ti,3)
        S.append({"asset_id":A(a),"src_in":ti,"src_out":to,"fill":"blur","zoom":1.3,"mute_source":True,"item":i+1,"why":opt[0] if opt else chip or 'continuation'})
        if chip:
            if cur:cur['dur']=round(t-cur['at'],3)
            cur={"text":chip,"at":round(t,3),"dur":d,"role":"title" if i==0 else "fact"};T.append(cur);acc.append(round(t,3))
        elif chip=='':
            if cur:cur['dur']=round(t-cur['at'],3)
            cur=None
        else: cur['dur']=round(t+d-cur['at'],3)
        t+=d
    total=round(t,3)
    if i==0:pass
    # hook title short
    T[0]['dur']=min(T[0]['dur'],2.9 if cta['place']=='S' else 3.0)
    # cta
    if cta['place']=='E':at=round(total-3.0,3);dur=3.0
    elif cta['place']=='S':at=cta['at'];dur=2.0
    else:at=cta['at'];dur=2.5
    # trim/delay facts overlapping cta
    out=[]
    for x in T:
        if x['role']=='title':out.append(x);continue
        s,e=x['at'],round(x['at']+x['dur'],3)
        if s<at+dur and e>at:
            if s>=at-0.01 or s<at+dur and e<=at+dur: # starts inside
                if s>=at-0.01: s=round(at+dur,3)
                else: e=round(at,3)
            else:
                e=round(at,3)
        if e-s>=1.0:x['at']=s;x['dur']=round(e-s,3);out.append(x)
    out.append({"text":cta['text'],"at":at,"dur":dur,"role":"cta"})
    out+=list(extra_texts)
    c={"production_id":pid,"width":1080,"height":1920,"fps":30,"segments":S,"texts":out,"captions":"none","music":None,"bed":"tone","bed_accents":acc,"credits":credits,"target_duration":total}
    json.dump(c,open(P+pid+'/cutlist.json','w'),indent=1)
    print(pid,total,'cta at',at,dur)
    return c
