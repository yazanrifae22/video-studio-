import json,subprocess,sys,os
pid=sys.argv[1];G='C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/d3cde298-a201-4181-baef-c226a92cbb42/scratchpad/twiwm-A1/'
c=json.load(open(f'E:/clips-viral/productions/{pid}/cutlist.json'))
fs=[]
for i,s in enumerate(c['segments']):
    for k,tt in enumerate([s['src_in']+0.1,(s['src_in']+s['src_out'])/2,s['src_out']-0.1]):
        f=f'{G}f_{pid}_{i}_{k}.jpg'
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(tt),'-i',f"E:/clips-viral/data/media/nasa/{s['asset_id']}.mp4",'-frames:v','1','-vf','scale=200:-2',f])
        fs.append(f)
n=len(c['segments'])
open(G+'list.txt','w').write('')
subprocess.run(['ffmpeg','-v','error','-y']+sum([['-i',f] for f in fs],[])+['-filter_complex',f"xstack=inputs={len(fs)}:layout="+'|'.join(f"{(j%3)*200}_{(j//3)*113}" for j in range(len(fs))),'-frames:v','1',G+f'strip_{pid}.jpg'])
