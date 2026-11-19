import json,sys
sha=sys.argv[1]
d=json.load(open("E:/clips-viral/data/cache/%s/transcript.en.json"%sha,encoding='utf-8'))
ws=[w for s in d['segments'] for w in s['words']]
for a,b in zip(sys.argv[2::2],sys.argv[3::2]):
    a=float(a);b=float(b)
    print("== %s-%s"%(a,b))
    print(" | ".join("%.2f %s"%(w['s'],w['w']) if True else "" for w in ws if a<=w['s']<=b))
