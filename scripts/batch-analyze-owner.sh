#!/usr/bin/env bash
# Serial owner-clip analysis (one GPU job at a time; parallel large-v3 runs hung the GPU on 2026-10-31).
# Writes <clip>.analysis.json sidecars via scripts/video-analyze.sh; skips clips that already have one.
# Usage: bash scripts/batch-analyze-owner.sh <folder> [<folder> ...]   (folders relative to data/media/owner-supplied)
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export VIDEO_ANALYZE_WHISPER_MODEL="${VIDEO_ANALYZE_WHISPER_MODEL:-small}"
for f in "$@"; do
  for v in "$ROOT/data/media/owner-supplied/$f"/*.mp4; do
    [[ -f "${v%.*}.analysis.json" ]] && continue
    echo "$(date +%H:%M:%S) $f/$(basename "$v")"
    timeout 600 bash "$ROOT/scripts/video-analyze.sh" "$v" --fidelity low --max-frames 12 >/dev/null 2>&1 || echo "  FAILED $v"
  done
  echo "$(date +%H:%M:%S) DONE $f"
done
