#!/bin/bash
# usage: mvbk-build.sh <id-suffix>...  builds sequentially, waiting for the studio render slot
cd /e/clips-viral
export OCC_MCP_URL='http://[::1]:5299/api/external-mcp/mcp'
for k in "$@"; do
  while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 3; done
  sleep 3
  while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 3; done
  npm run -s cli -- build clip-261025-$k --agent showrunner-mission-voices > data/mvbk/build-$k.log 2>&1
  echo "done $k $?" >> data/mvbk/build-status.log
done
