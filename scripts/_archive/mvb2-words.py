import json,sys,sqlite3
c=sqlite3.connect("E:/clips-viral/data/studio.db")
fp,tp=c.execute("select fingerprint,transcript_path from sources where asset_id=?",(sys.argv[1],)).fetchone()
import os
p=tp if tp and os.path.exists(tp) else "E:/clips-viral/data/cache/%s/transcript.en.json"%fp
d=json.load(open(p,encoding='utf-8'))
ws=[w for s in d['segments'] for w in s['words']]
for a,b in zip(sys.argv[2::2],sys.argv[3::2]):
    a=float(a);b=float(b)
    print("== %s-%s"%(a,b))
    print(" | ".join("%.2f %s"%(w['s'],w['w'].strip()) for w in ws if a<=w['s']<=b))
