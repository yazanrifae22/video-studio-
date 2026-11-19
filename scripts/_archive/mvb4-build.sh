#!/bin/bash
# usage: mvb4-build.sh <id-suffix>  (waits until no other studio build/render is running; ids are clip-261025-<suffix>)
cd /e/clips-viral
export OCC_MCP_URL='http://[::1]:5299/api/external-mcp/mcp'
while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 20; done
sleep 5
while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 20; done
npm run -s cli -- build clip-261025-$1 --agent showrunner-mission-voices
