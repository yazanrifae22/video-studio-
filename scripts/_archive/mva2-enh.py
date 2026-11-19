import json,sys
pid=sys.argv[1]
base="E:/clips-viral/productions/"+pid
cl=json.load(open(base+"/cutlist.json",encoding="utf-8"));sj=json.load(open(base+"/script.json",encoding="utf-8"))
meta=json.load(open("E:/clips-viral/data/mva2/enh-%s.json"%pid.split("-")[-1],encoding="utf-8"))
S=cl["segments"];d=[s["src_out"]-s["src_in"] for s in S];dur=sum(d)
trim=0;dead=0.0;jumps=0
for a,b in zip(S,S[1:]):
    g=b["src_in"]-a["src_out"]
    if abs(g)<0.01: continue
    if 0<g<2.5: trim+=1;dead+=g
    else: jumps+=1
hook=[t for t in cl["texts"] if t["role"]=="hook"][0];cta=[t for t in cl["texts"] if t["role"]=="cta"][0]
rules=[{"id":r,"applied":v[0],"how":v[1]} for r,v in meta["rules"].items()]
out={"production_id":pid,"ruleset":"retention-v1","duration_s":round(dur,1),"shots":len(d),"max_shot_s":round(max(d),2),"avg_shot_s":round(dur/len(d),2),
 "pauses_trimmed":trim,"dead_air_removed_s":round(dead,1),"passages_skipped":jumps,"rules":rules,
 "hook":{"text":hook["text"],"at":hook["at"],"dur":hook["dur"]},"cta":{"id":sj["cta"]["id"],"text":sj["cta"]["text"],"at":cta["at"]},
 "emphasis":cl["emphasis"],"loop":meta["loop"],"results":None}
json.dump(out,open(base+"/enhancements.json","w",encoding="utf-8"),ensure_ascii=False,indent=1)
print(pid,out["duration_s"],out["shots"],out["max_shot_s"],trim,out["dead_air_removed_s"],jumps)
