#!/bin/bash
# usage: mvb2-build.sh <suffix>  (waits for a gap with no other studio build/render; polls every 3 s)
cd /e/clips-viral
export OCC_MCP_URL='http://[::1]:5299/api/external-mcp/mcp'
while true; do
  if powershell -File scripts/mvb2-busy.ps1 >/dev/null; then sleep 4; if powershell -File scripts/mvb2-busy.ps1 >/dev/null; then break; fi; fi
  sleep 3
done
npm run -s cli -- build clip-261024-$1 --agent showrunner-mission-voices
