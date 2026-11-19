#!/bin/bash
# usage: mvb3-prep.sh <k>...  spans -> spec -> cutlist -> face-tracked framing
cd /e/clips-viral
for k in "$@"; do
  python scripts/mvb3-spec.py $k > data/mvb3/prep-$k.log 2>&1
  python scripts/mvb3-gen.py data/mvb3/spec-$k.json >> data/mvb3/prep-$k.log 2>&1
  python scripts/mvb3-frame.py clip-261025-$k data/mvb3/frame-$k.json >> data/mvb3/prep-$k.log 2>&1
  echo done $k
done
