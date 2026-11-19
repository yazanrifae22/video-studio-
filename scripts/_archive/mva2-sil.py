import subprocess,sys,re
f,a,b=sys.argv[1],float(sys.argv[2]),float(sys.argv[3])
db=sys.argv[4] if len(sys.argv)>4 else "-38"
r=subprocess.run(["ffmpeg","-hide_banner","-nostats","-ss",str(a),"-t",str(b-a),"-i",f,"-vn","-af","silencedetect=n=%sdB:d=0.08"%db,"-f","null","-"],capture_output=True,text=True)
st=[float(x)+a for x in re.findall(r"silence_start: (-?[\d.]+)",r.stderr)]
en=[float(x)+a for x in re.findall(r"silence_end: ([\d.]+)",r.stderr)]
print(" ".join("(%.2f-%.2f)"%(s,e) for s,e in zip(st,en)))
