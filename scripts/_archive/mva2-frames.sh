#!/bin/bash
# usage: mva2-frames.sh <suffix> <version> t1 t2 t3 ...
S="C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/37604470-a807-4bb9-b604-0dc7c09dcf51/scratchpad"
R=/e/clips-viral/productions/clip-261024-$1/$2/render.mp4; k=$1; shift 2; ins=""; n=0
for t in "$@"; do ffmpeg -v error -y -ss $t -i $R -frames:v 1 -vf scale=300:-1 "$S/mva2-fr-$k-$n.png"; ins="$ins -i $S/mva2-fr-$k-$n.png"; n=$((n+1)); done
ffmpeg -v error -y $ins -filter_complex "hstack=inputs=$n" "$S/mva2-frs-$k.png"
