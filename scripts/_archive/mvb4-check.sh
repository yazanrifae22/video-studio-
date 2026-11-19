#!/bin/bash
# usage: mvb4-check.sh <suffix> : latest version techqa summary + captions pages + retention auto + caption/audio alignment
cd /e/clips-viral
pid=clip-261025-$1
v=$(ls -d productions/$pid/v* | sed 's/.*v//' | sort -n | tail -1)
python - <<PY
import json
t=json.load(open('E:/clips-viral/productions/$pid/v$v/qa/techqa.json',encoding='utf-8'))
print('$pid v$v', 'lufs',t['integrated_lufs'],'tp',t['true_peak_dbfs'],'failed',t['failed'],'flash',len(t['flash_frames']),'dur',t['duration'])
s=open('E:/clips-viral/productions/$pid/v$v/captions.srt',encoding='utf-8').read().strip().split('\n\n')
print(' | '.join(' '.join(b.split('\n')[2:]) for b in s))
PY
python scripts/mv-retention-check.py $pid 2>&1 | head -4
