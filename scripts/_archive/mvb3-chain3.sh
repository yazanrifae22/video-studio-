#!/bin/bash
cd /e/clips-viral
while ! grep -q "rebuilt xmsi" data/mvb3/chain.log; do sleep 10; done
while ! grep -q "done xfmp" data/mvb3/prep-all2.log; do sleep 10; done
bash scripts/mvb3-build.sh xfmp > data/mvb3/build3-xfmp.log 2>&1; echo "rebuilt xfmp" >> data/mvb3/chain.log
