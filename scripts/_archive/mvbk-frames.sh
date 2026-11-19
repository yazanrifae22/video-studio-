#!/bin/bash
# usage: mvbk-frames.sh <suffix> <version> t1 t2 ...  -> data/mvbk/frs-<suffix>.jpg (each frame 240 px wide, hstack)
R=/e/clips-viral/productions/clip-261025-$1/v$2/render.mp4; k=$1; shift 2; ins=""; n=0
for t in "$@"; do ffmpeg -v error -y -ss $t -i $R -frames:v 1 -vf scale=240:-1 /e/clips-viral/data/mvbk/fr-$k-$n.png; ins="$ins -i /e/clips-viral/data/mvbk/fr-$k-$n.png"; n=$((n+1)); done
ffmpeg -v error -y $ins -filter_complex "hstack=inputs=$n" /e/clips-viral/data/mvbk/frs-$k.jpg
