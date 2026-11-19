#!/bin/bash
# usage: twiwm-b1-build.sh <id-suffix>...  (waits until no other studio build/render is running; ids are comp-261025-<suffix>)
cd /e/clips-viral
export OCC_MCP_URL='http://[::1]:5299/api/external-mcp/mcp'
for s in "$@"; do
  while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 20; done
  sleep 5
  while ! powershell -File scripts/mvb2-busy.ps1 >/dev/null; do sleep 20; done
  echo "== build $s $(date +%T)"
  npm run -s cli -- build comp-261025-$s --agent showrunner-way-it-was-made 2>&1 | tail -60
done
echo "== chain done $(date +%T)"
