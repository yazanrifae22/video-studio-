import subprocess,numpy as np,sys
F,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]);th=float(sys.argv[4]) if len(sys.argv)>4 else -40
raw=subprocess.run(["ffmpeg","-v","error","-ss",str(a),"-t",str(b-a),"-i",F,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,dtype=np.float32);n=320
db=[20*np.log10(np.sqrt(np.mean(x[i:i+n]**2)+1e-12)) for i in range(0,len(x)-n,160)]
cur=db[0]>th;st=0
for i,d in enumerate(db+[None]):
    c=(d>th) if d is not None else None
    if c!=cur:
        if not cur or (i-st)*0.01>=0.04: print("%s %.2f-%.2f (%.2f)"%("S" if cur else "-",a+st*0.01,a+i*0.01,(i-st)*0.01))
        st=i;cur=c
