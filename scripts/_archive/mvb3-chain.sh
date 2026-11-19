#!/bin/bash
cd /e/clips-viral
for k in "$@"; do bash scripts/mvb3-build.sh $k > data/mvb3/build-$k.log 2>&1; echo "built $k" >> data/mvb3/chain.log; done
