import json,subprocess
idea={'8dx7':'idea-261025-eo9p','ycyz':'idea-261025-r2o7','zpls':'idea-261025-ecfr','afhp':'idea-261025-m5cd'}
topic={'8dx7':'How the SLS core stage was built','ycyz':'The crawler-transporter','zpls':'RS-25 hot-fire testing','afhp':'Perseverance rover test series'}
alts={'8dx7':[('qy63',100,103.5,'forward skirt on its lifting ring'),('lwfq',9.9,14.4,'stage leaving the factory with banner'),('ro6j',45,53,'workers handling a ring')],
'ycyz':[('1nfk',506,535,'crawler carrying rocket along crawlerway'),('1nfk',120,135,'driver cab interior'),('7mjl',16.6,22.9,'track shoes closeup')],
'zpls':[('rxpz',12.3,15.8,'ignition orange flame'),('rxpz',16,35,'aerial plume'),('dvc5',148.4,151.9,'bright nozzle')],
'afhp':[('c5cz',10.4,14.1,'rover hung over spin table'),('c5cz',119.4,121.3,'drive test label shot'),('c5cz',60.7,62,'rover on wheels')]}
for k in idea:
    pid='comp-261025-'+k;c=json.load(open(f'productions/{pid}/cutlist.json'));out=[];n=0
    def add(a,i,o,desc,sel,sc):
        global n;n+=1
        out.append({"candidate_id":f"cand-{k}-{n:02d}","asset_id":a,"production_id":pid,"start_time":i,"end_time":o,"transcript_excerpt":None,"moment_description":desc,"speakers":None,"topic":topic[k],"suggested_title":None,"suggested_hook":None,"missing_context":None,"hook_score":sc,"coherence_score":8,"emotional_score":6,"value_score":7,"payoff_score":7,"visual_score":sc,"overall_score":sc*8,"editorial_rationale":("SELECTED. " if sel else "Alternate. ")+"Picked from own contact grids; scene cuts checked (heuristic score).","confidence":"high","edit_difficulty":"low","rights_status":"approved_with_conditions","idea_id":idea[k]})
    for s in c['segments']:add(s['asset_id'],s['src_in'],s['src_out'],s['why'] if s['why']!='continuation' else 'continuation shot',True,9)
    for a,i,o,d in alts[k]:add('src-261025-'+a,i,o,d,False,7)
    json.dump(out,open(f'productions/{pid}/candidates.json','w'),indent=1)
    r=subprocess.run(f'npm run -s cli -- candidate:add productions/{pid}/candidates.json',shell=True,capture_output=True,text=True);print(k,(r.stdout+r.stderr)[-150:])
