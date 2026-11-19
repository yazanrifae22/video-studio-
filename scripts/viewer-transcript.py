"""Write <version>/qa/viewer-transcript.txt from captions.json, for the zero-context reviewers.
Usage: python scripts/viewer-transcript.py productions/<id>/v<N>
"""
import json, os, re, subprocess, sys

v = sys.argv[1]
pid = os.path.basename(os.path.dirname(os.path.abspath(v)))
with open(os.path.join(v, "captions.json"), encoding="utf8") as f:
    pages = json.load(f)
with open(os.path.join("productions", pid, "cutlist.json"), encoding="utf8") as f:
    cut = json.load(f)
def spans(x):
    if isinstance(x, str):
        return [x]
    if isinstance(x, dict):
        return spans(x.get("text") or x.get("words") or x.get("spans") or x.get("lines") or "")
    return [s for i in (x or []) for s in spans(i)]
title = " ".join(" ".join(spans(cut.get("rank_layers", {}).get("title"))).split())
dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(v, "render.mp4")], capture_output=True, text=True).stdout.strip()
out = [f"Title under the video: {title}".rstrip(), f"Length: about {round(float(dur))} s", ""]
out += [f"{p['t0']:6.1f}s  VOICE: {re.sub(r'\s+', ' ', p['text'])}" for p in pages]
with open(os.path.join(v, "qa", "viewer-transcript.txt"), "w", encoding="utf8", newline="\n") as f:
    f.write("\n".join(out) + "\n")
print(len(pages), "pages", title)
