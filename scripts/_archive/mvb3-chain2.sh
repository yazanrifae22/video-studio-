#!/bin/bash
cd /e/clips-viral
# wait for chain 1 to finish
while ! grep -q "built xfmp" data/mvb3/chain.log; do sleep 10; done
for k in "$@"; do bash scripts/mvb3-build.sh $k > data/mvb3/build2-$k.log 2>&1; echo "rebuilt $k" >> data/mvb3/chain.log; done
