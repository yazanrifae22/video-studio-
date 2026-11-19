#!/bin/bash
cd /e/clips-viral
while ! grep -q "rebuilt2 4tev" data/mvb3/chain.log; do sleep 10; done
bash scripts/mvb3-build.sh xfmp > data/mvb3/build5-xfmp.log 2>&1; echo "rebuilt2 xfmp" >> data/mvb3/chain.log
