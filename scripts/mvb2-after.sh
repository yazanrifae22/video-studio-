#!/bin/bash
# usage: mvb2-after.sh <log-to-wait-on> <suffix>
S="C:/Users/YAZANA~1/AppData/Local/Temp/claude/E--clips-viral/37604470-a807-4bb9-b604-0dc7c09dcf51/scratchpad"
until grep -qE 'rendered|Error|failed' "$S/mvB2-q-$1.log" 2>/dev/null; do sleep 5; done
cd /e/clips-viral; bash scripts/mvb2-build.sh $2 > "$S/mvB2-r-$2.log" 2>&1
