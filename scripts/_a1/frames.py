import sys,subprocess
pid=sys.argv[1];ts=sys.argv[2:]
G='C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/d3cde298-a201-4181-baef-c226a92cbb42/scratchpad/twiwm-A1/'
import glob
v=sorted(glob.glob(f'E:/clips-viral/productions/{pid}/v*/render.mp4'))[-1]
fs=[]
for t in ts:
    f=f'{G}fr_{pid}_{t}.jpg';subprocess.run(['ffmpeg','-v','error','-y','-ss',t,'-i',v,'-frames:v','1','-vf','scale=270:-2',f]);fs.append(f)
subprocess.run(['ffmpeg','-v','error','-y']+sum([['-i',f] for f in fs],[])+['-filter_complex',f"hstack=inputs={len(fs)}",'-frames:v','1',G+f'frames_{pid}.jpg'])
