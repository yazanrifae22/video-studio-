#!/bin/bash
S="C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/37604470-a807-4bb9-b604-0dc7c09dcf51/scratchpad"
cd /e/clips-viral
for k in "$@"; do bash scripts/mvb2-build.sh $k > "$S/mvB2-q-$k.log" 2>&1; done
