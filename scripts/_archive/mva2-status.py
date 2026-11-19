import json, glob, re, sys
for k in sys.argv[1:]:
    ds = [d.replace("\\", "/") for d in glob.glob("E:/clips-viral/productions/clip-261024-%s/v*/qa/techqa.json" % k)]
    ds.sort(key=lambda x: int(re.search(r"/v(\d+)/", x).group(1)))
    if not ds:
        print(k, "none")
        continue
    j = json.load(open(ds[-1]))
    print(k, re.search(r"/(v\d+)/", ds[-1]).group(1), j["pass"], j["failed"], j["audio_dropouts"], j["duration"])
