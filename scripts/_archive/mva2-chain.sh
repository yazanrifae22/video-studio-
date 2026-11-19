#!/bin/bash
# usage: mva2-chain.sh id1 id2 ... (suffixes); regenerates cutlist and builds sequentially
cd /e/clips-viral
export OCC_MCP_URL="http://[::1]:5299/api/external-mcp/mcp"
for k in "$@"; do
  .venv-asr/Scripts/python.exe -I scripts/mva2-gen.py data/mva2/spec-$k.json > data/logs/mva2-gen-$k.log 2>&1
  npm run -s cli -- build clip-261024-$k --agent showrunner-mission-voices > data/logs/mva2-b-$k.log 2>&1
  echo done $k >> data/logs/mva2-chain.log
done
