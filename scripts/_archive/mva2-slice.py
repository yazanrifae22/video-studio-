import sys,subprocess,numpy as np
from faster_whisper import WhisperModel
f,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
raw=subprocess.run(["ffmpeg","-v","error","-ss",str(a),"-t",str(b-a),"-i",f,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,dtype=np.float32).copy()
m=WhisperModel("small",device="cuda",compute_type="float16")
seg,_=m.transcribe(x,language="en",word_timestamps=True,vad_filter=False,condition_on_previous_text=False)
print(" ".join("%.2f %s"%(w.start+a,w.word.strip()) for s in seg for w in s.words))
