import glob,re,sys
for k in sys.argv[1:]:
    ds=[d.replace("\\","/") for d in glob.glob("E:/clips-viral/productions/clip-261024-%s/v*/captions.srt"%k)]
    ds.sort(key=lambda x:int(re.search(r"/v(\d+)/",x).group(1)))
    t=open(ds[-1],encoding="utf-8").read()
    print(k,re.search(r"/(v\d+)/",ds[-1]).group(1));print(" / ".join(b.split("\n")[2] for b in t.strip().split("\n\n")))
