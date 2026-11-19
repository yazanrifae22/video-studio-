import subprocess,sys,numpy as np
f,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
raw=subprocess.run(["ffmpeg","-v","error","-ss",str(a),"-t",str(b-a),"-i",f,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,dtype=np.float32);n=160*2
out=[]
for i in range(0,len(x)-n,160):
    r=np.sqrt(np.mean(x[i:i+n]**2)+1e-12);out.append("%.2f:%d"%(a+i/16000,round(20*np.log10(r))))
print(" ".join(out))
