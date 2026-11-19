#!/bin/bash
cd /e/clips-viral
while ! grep -q "rebuilt xfmp" data/mvb3/chain.log; do sleep 10; done
bash scripts/mvb3-build.sh 4tev > data/mvb3/build4-4tev.log 2>&1; echo "rebuilt2 4tev" >> data/mvb3/chain.log
