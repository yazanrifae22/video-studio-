import sys,subprocess,numpy as np
from faster_whisper import WhisperModel
f,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
size=sys.argv[4] if len(sys.argv)>4 else "large-v3"
raw=subprocess.run(["ffmpeg","-v","error","-ss",str(a),"-t",str(b-a),"-i",f,"-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
x=np.frombuffer(raw,dtype=np.float32).copy()
m=WhisperModel(size,device="cuda",compute_type="float16")
for beam in (1,5):
  seg,_=m.transcribe(x,language="en",word_timestamps=True,vad_filter=False,condition_on_previous_text=False,beam_size=beam,temperature=0)
  print(size,beam," ".join("%.2f %s"%(w.start+a,w.word.strip()) for s in seg for w in s.words))
