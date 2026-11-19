#!/bin/bash
# usage: mvb4-prep.sh <suffix> : spans -> spec -> cutlist -> face-tracked framing -> measured caption timing -> post flags (deflash/compress/captions)
cd /e/clips-viral
k=$1
SHA=dd4bb701828aa01dcb21eb9ca04d028d8b2dc59ca55e2b1b051dab8ed036a04e
python scripts/mvb4-spec.py $k > data/mvb4/prep-$k.log 2>&1
python scripts/mvb3-gen.py data/mvb4/spec-$k.json >> data/mvb4/prep-$k.log 2>&1
python scripts/mvb4-frame.py clip-261025-$k data/mvb4/frame-$k.json > data/mvb4/frame-$k.log 2>&1
.venv-asr/Scripts/python.exe scripts/mvb4-retime.py clip-261025-$k src-261021-mh9v $SHA data/media/nasa/src-261021-mh9v.mp4 >> data/mvb4/prep-$k.log 2>&1
python scripts/mvb4-post.py $k >> data/mvb4/prep-$k.log 2>&1
echo prepared $k >> data/mvb4/prep-$k.log
