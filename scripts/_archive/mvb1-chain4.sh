#!/bin/bash
cd /e/clips-viral; while [ ! -f data/logs/mvb1-chain3.done ]; do sleep 15; done
export OCC_MCP_URL='http://[::1]:5299/api/external-mcp/mcp'
for id in 8np0; do
  while powershell -NoProfile -Command "if (Get-CimInstance Win32_Process | Where-Object { \$_.Name -match 'node' -and \$_.CommandLine -match 'cli.ts build|quiz:build|occ.* render' -and \$_.CommandLine -notmatch 'clip-261024' }) {exit 1} else {exit 0}"; [ $? -ne 0 ]; do sleep 120; done
  npm run -s cli -- build clip-261024-$id --agent showrunner-mission-voices > data/logs/mvb1-$id-r4.log 2>&1
done
echo done > data/logs/mvb1-chain4.done
