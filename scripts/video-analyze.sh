#!/usr/bin/env bash
# Wrapper for the video-analyze skill (~/.claude/skills/video-analyze) on this Windows box (pipeline-engineer, 2026-10-31).
#
# Why: the skill's scripts call `python3`, which on this machine resolves to the Microsoft Store stub and hangs the shell
# (CLAUDE.md lesson, QA group G 2026-10-23). This wrapper puts a temporary `python3` shim first on PATH that execs a real
# Python (the studio .venv-asr, which has Pillow; else global `python`), then runs the unmodified skill.
# Studio rules enforced here: YouTube URLs are refused (discovery-only, never downloaded), output defaults to
# data/cache/research/video-analyze/<ts> (research_only material, never in a cut list).
#
# Usage (Git Bash):  bash scripts/video-analyze.sh <url | local file> [run.sh flags...]
#   e.g.            bash scripts/video-analyze.sh https://example.org/clip.mp4 --fidelity low --max-frames 12
#                   bash scripts/video-analyze.sh productions/<id>/v3/render.mp4      (local path -> file:/// URL internally)
#   check only:     bash scripts/video-analyze.sh --check      (prints the python the shim uses + runs the skill's setup check)
# Transcript (2026-10-31): without OPENAI_API_KEY the skill's Whisper-API step is replaced by local faster-whisper (.venv-asr, GPU,
#   packages/intelligence/py/transcribe.py; model VIDEO_ANALYZE_WHISPER_MODEL, default large-v3) so the transcript is never skipped.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="${VIDEO_ANALYZE_SKILL:-$HOME/.claude/skills/video-analyze}"
[[ -x "$SKILL/scripts/run.sh" || -f "$SKILL/scripts/run.sh" ]] || { echo "video-analyze skill not found at $SKILL" >&2; exit 2; }

# pick a real interpreter (never the WindowsApps stub)
REALPY=""
for c in "$ROOT/.venv-asr/Scripts/python.exe" "$(command -v python 2>/dev/null || true)"; do
  [[ -n "$c" && "$c" != *WindowsApps* && -e "$c" ]] && { REALPY="$c"; break; }
done
[[ -n "$REALPY" ]] || { echo "no real python found (.venv-asr or global python)" >&2; exit 2; }

SHIM="$(mktemp -d)"
trap 'rm -rf "$SHIM"' EXIT
for n in python3 python3.11 python3.12; do
  printf '#!/usr/bin/env bash\nexec "%s" "$@"\n' "$REALPY" > "$SHIM/$n"
  chmod +x "$SHIM/$n"
done
export PATH="$SHIM:$PATH"
export PYTHONIOENCODING=utf-8 PYTHONUTF8=1   # utf8 everywhere (cp1252 default caused mojibake before)

if [[ "${1:-}" == "--check" ]]; then
  echo "python3 -> $(command -v python3) -> $REALPY ($(python3 -c 'import sys,PIL;print(sys.version.split()[0],"Pillow",PIL.__version__)'))"
  exec bash "$SKILL/scripts/setup.sh" check
fi

URL="${1:-}"
[[ -n "$URL" ]] || { sed -n 2,16p "${BASH_SOURCE[0]}"; exit 2; }
shift
# --force re-runs even when a saved analysis exists (stripped before the skill sees the args)
FORCE=0; ARGS=(); for a in "$@"; do [[ "$a" == "--force" ]] && FORCE=1 || ARGS+=("$a"); done; set -- "${ARGS[@]+"${ARGS[@]}"}"
# local file -> file:/// URL (the skill's generic branch fetches it with curl); spaces etc. percent-encoded
LOCAL=""
if [[ -f "$URL" ]]; then
  LOCAL="$URL"
  ABS="$(cd "$(dirname "$URL")" && pwd)/$(basename "$URL")"
  command -v cygpath >/dev/null 2>&1 && ABS="$(cygpath -m "$ABS")"
  URL="file:///$("$REALPY" -I -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1].lstrip("/"), safe="/:"))' "$ABS")"
  echo "local file -> $URL" >&2
fi
if [[ "$URL" =~ (youtube\.com|youtu\.be) ]]; then
  echo "refused: YouTube is discovery-only in this studio (ToS forbids downloading, even CC). Use metadata only." >&2; exit 3
fi
HAS_OUT=0; for a in "$@"; do [[ "$a" == "--out-dir" ]] && HAS_OUT=1; done
if [[ $HAS_OUT -eq 0 ]]; then
  OUT="$ROOT/data/cache/research/video-analyze/$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$OUT"; set -- "$@" --out-dir "$OUT"
fi
# run a private copy of the skill's scripts (the skill itself stays unmodified); without OPENAI_API_KEY its transcribe.sh is
# swapped for a local faster-whisper step that writes the same transcript.json shape ({text, segments:[{start,end,text}]})
SCRIPTS="$SHIM/scripts"
cp -r "$SKILL/scripts" "$SCRIPTS"
if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  ASR_PY="$ROOT/.venv-asr/Scripts/python.exe"
  cat > "$SCRIPTS/transcribe.sh" <<SH
#!/usr/bin/env bash
# studio replacement (no OPENAI_API_KEY): local faster-whisper via packages/intelligence/py/transcribe.py
set -uo pipefail
OUT_DIR="\$1"; AUDIO="\$OUT_DIR/audio.mp3"; [[ -f "\$AUDIO" ]] || AUDIO="\$OUT_DIR/video.mp4"
TRANSCRIPT="\$OUT_DIR/transcript.json"
echo "  OPENAI_API_KEY not set: transcribing locally with faster-whisper (${VIDEO_ANALYZE_WHISPER_MODEL:-large-v3})..." >&2
if "$ASR_PY" -I "$ROOT/packages/intelligence/py/transcribe.py" "\$AUDIO" "\$OUT_DIR/transcript.fw.json" --lang auto --model "${VIDEO_ANALYZE_WHISPER_MODEL:-large-v3}" >&2; then
  "$ASR_PY" -I -c 'import json,sys
d=json.load(open(sys.argv[1],encoding="utf8"))
segs=[{"start":s["start"],"end":s["end"],"text":s["text"]} for s in d.get("segments",[])]
json.dump({"text":" ".join(s["text"].strip() for s in segs),"language":d.get("language"),"segments":segs,"engine":"faster-whisper "+str(d.get("model"))},open(sys.argv[2],"w",encoding="utf8"))
print("  Transcription done: %d segments (faster-whisper)." % len(segs), file=sys.stderr)' "\$OUT_DIR/transcript.fw.json" "\$TRANSCRIPT"
else
  echo "  faster-whisper failed; transcript empty." >&2
  echo '{"error":"faster-whisper failed","text":"","segments":[]}' > "\$TRANSCRIPT"
fi
exit 0
SH
fi
# Saved analysis (owner 2026-10-31: "never do analytics twice"): every run writes <video-name>.analysis.json next to a local
# video (URLs: data/cache/research/video-analyze/by-url/<sha1(url)>.analysis.json). If it exists and the video's sha256 still
# matches, the run is skipped and the saved file path is printed instead. --force re-runs.
if [[ -n "$LOCAL" ]]; then SIDECAR="${LOCAL%.*}.analysis.json"
else mkdir -p "$ROOT/data/cache/research/video-analyze/by-url"
  SIDECAR="$ROOT/data/cache/research/video-analyze/by-url/$("$REALPY" -I -c 'import sys,hashlib;print(hashlib.sha1(sys.argv[1].encode()).hexdigest())' "$URL").analysis.json"; fi
SHA=""; [[ -n "$LOCAL" ]] && SHA="$(sha256sum "$LOCAL" | cut -d' ' -f1)"
if [[ $FORCE -eq 0 && -s "$SIDECAR" ]] && "$REALPY" -I -c 'import json,sys;d=json.load(open(sys.argv[1],encoding="utf8"));sys.exit(0 if d.get("sha256","")==sys.argv[2] else 1)' "$SIDECAR" "$SHA"; then
  echo "already analysed -> $SIDECAR (use --force to re-run)" >&2; echo "$SIDECAR"; exit 0
fi
MANIFEST="$(bash "$SCRIPTS/run.sh" "$URL" "$@")"
"$REALPY" -I - "$MANIFEST" "$SIDECAR" "${LOCAL:-$URL}" "$SHA" <<'PY'
import json, os, sys, datetime
man, side, src, sha = sys.argv[1:5]
out = os.path.dirname(man)
def load(p):
    try: return json.load(open(p, encoding="utf8"))
    except Exception: return None
rec = {"video": src, "video_name": os.path.basename(src), "sha256": sha,
       "analyzed_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
       "out_dir": out, "manifest": load(man), "transcript": load(os.path.join(out, "transcript.json")),
       "grids": sorted(os.path.join(out, "grids", f) for f in os.listdir(os.path.join(out, "grids"))) if os.path.isdir(os.path.join(out, "grids")) else []}
json.dump(rec, open(side, "w", encoding="utf8"), ensure_ascii=False, indent=1)
print("saved analysis -> " + side, file=sys.stderr)
PY
echo "$MANIFEST"
