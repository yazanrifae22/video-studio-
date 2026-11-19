import json,subprocess,sys,numpy as np
cl=json.load(open("E:/clips-viral/productions/%s/cutlist.json"%sys.argv[1],encoding="utf-8"))
f="E:/clips-viral/data/media/nasa/src-261024-7t0d.mp4"
def db(a,b):
    raw=subprocess.run(["ffmpeg","-v","error","-ss","%.3f"%a,"-t","%.3f"%(b-a),"-i",f,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
    x=np.frombuffer(raw,dtype=np.float32);return round(20*np.log10(np.sqrt(np.mean(x**2)+1e-12)))
S=cl["segments"];t=0
for i,s in enumerate(S):
    d=s["src_out"]-s["src_in"]
    if i+1<len(S) and abs(S[i+1]["src_in"]-s["src_out"])>0.01:
        n=S[i+1]
        print("join@%.2f out %.2f(%d dB) -> in %.2f(%d dB)"%(t+d,s["src_out"],db(s["src_out"]-0.08,s["src_out"]),n["src_in"],db(n["src_in"],n["src_in"]+0.08)))
    t+=d
print("start in %.2f (%d dB)"%(S[0]["src_in"],db(S[0]["src_in"],S[0]["src_in"]+0.08)),"end out %.2f (%d dB)"%(S[-1]["src_out"],db(S[-1]["src_out"]-0.08,S[-1]["src_out"])))
