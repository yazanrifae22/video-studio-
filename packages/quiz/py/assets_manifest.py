"""MERGE every build's media into productions/<id>/assets.json (sha256 + origin), never overwriting what is there.

usage: python assets_manifest.py <production_dir> [<version_dir_name>]

- Existing keys are kept as they are (art entries written by showrunners, the `rights` block, notes, inventories).
- Entries are merged by `file`: a file already listed is refreshed (sha256/bytes may change on a re-master), new files
  are appended, entries for files no longer on disk are kept (history) but flagged `"missing": true`.
- Sections written: renders (everything in <version>/: clips, overlays, audio incl. music bed + SFX copies, narration
  lines, render.mp4 / render.occ.mp4), narration (voice/ takes + A/B tests), synthesized (data/brand/quiz-ar/sfx),
  brand (fonts, corner bug, end-cards). If images/generation.json exists (pilot), generated/derived/internal too.
"""
import datetime, hashlib, json, os, sys

pdir = os.path.abspath(sys.argv[1])
ver = sys.argv[2] if len(sys.argv) > 2 else None
root = os.path.abspath(os.path.join(pdir, "..", ".."))


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def rel(p, base=pdir):
    return os.path.relpath(p, base).replace("\\", "/")


def entry(path, base=pdir, **kw):
    return {"file": rel(path, base), "sha256": sha(path), "bytes": os.path.getsize(path), **kw}


fp = os.path.join(pdir, "assets.json")
out = {}
if os.path.exists(fp):
    try:
        out = json.load(open(fp, encoding="utf-8"))
    except Exception as e:
        raise SystemExit(f"assets.json exists but is not valid JSON ({e}); refusing to overwrite it")
if not out and os.path.exists(os.path.join(pdir, "rights-review.json")):
    rr = json.load(open(os.path.join(pdir, "rights-review.json"), encoding="utf-8"))
    if "rights" in rr:
        out["rights"] = rr["rights"]
out.setdefault("production_id", os.path.basename(pdir))


def merge(section, entries):
    cur = out.get(section)
    if not isinstance(cur, list):
        cur = [] if cur is None else [cur]
    by = {e.get("file"): i for i, e in enumerate(cur) if isinstance(e, dict)}
    for e in entries:
        if e["file"] in by:
            old = cur[by[e["file"]]]
            old.update({k: v for k, v in e.items()})
            old.pop("missing", None)
        else:
            cur.append(e)
    for e in cur:
        if isinstance(e, dict) and e.get("file") and not e["file"].startswith(("data/", "../")):
            p = os.path.join(pdir, e["file"])
            if not os.path.exists(p) and not os.path.exists(os.path.join(root, e["file"])):
                e["missing"] = True
    out[section] = cur


gen_path = os.path.join(pdir, "images", "generation.json")
if os.path.exists(gen_path):
    gen_meta = json.load(open(gen_path, encoding="utf-8"))
    gen, der = [], []
    for g in gen_meta["images"]:
        gen.append(entry(os.path.join(pdir, g["file"]), id=g["id"], kind="generated_image", origin="original (generated for this production)",
                         tool=gen_meta["tool"], date=gen_meta["date"], codex_session=g["codex_session"], candidate=g["candidate"], prompt=g["prompt"],
                         provenance="OpenAI C2PA manifest embedded in the *_orig.png (kept unmodified)",
                         third_party_content="none (no reference image attached)"))
        for d in g["derived"]:
            p = os.path.join(pdir, d["file"])
            if os.path.exists(p):
                der.append(entry(p, kind="derived_image", derived_from=g["file"], process=d["process"]))
    merge("generated", gen)
    merge("derived", der)
    listed = {e["file"] for e in gen + der}
    merge("internal", [entry(os.path.join(pdir, "images", f), kind="internal (not rendered)", note="generation record" if f.endswith(".json") else "unused derivative")
                       for f in sorted(os.listdir(os.path.join(pdir, "images"))) if f"images/{f}" not in listed])

sfx = os.path.join(root, "data", "brand", "quiz-ar", "sfx")
if os.path.isdir(sfx):
    merge("synthesized", [entry(os.path.join(sfx, f), base=root, kind="sfx", origin="own/original: numpy synthesis, packages/quiz/py/synth_audio.py sfx (seeded, no samples)")
                          for f in sorted(os.listdir(sfx)) if f.endswith(".wav")])
voice = os.path.join(pdir, "voice")
if os.path.isdir(voice):
    merge("narration", [entry(os.path.join(voice, f), kind="tts_ab_test" if f.startswith("ab_") else "tts",
                              origin="Gemini TTS (packages/voice synthesize, free tier) — synthetic voice, disclose" + ("; tightened copy (pauses <= max_pause, atempo)" if "_p0." in f else ""))
                        for f in sorted(os.listdir(voice)) if f.endswith(".wav")])
brand = []
for sub, names, kind, extra in (("fonts", ("Cairo-Black.ttf", "Cairo-Bold.ttf", "OFL.txt"), "font", {"licence": "SIL OFL 1.1"}),
                                ("signature", ("corner-bug.png", "endcard.mp4", "endcard-alpha.webm"), "brand_signature", {"origin": "own/original (brand designer)"})):
    for n in names:
        p = os.path.join(root, "data", "brand", "quiz-ar", sub, n)
        if os.path.exists(p):
            brand.append(entry(p, base=root, kind=kind, **extra))
merge("brand", brand)

if ver:
    vd = os.path.join(pdir, ver)
    ents = []
    origin_of = {"clips": "round clip (HyperFrames render of the quiz templates)", "overlays": "overlay (captions WebM / corner bug / end-card copy)",
                 "audio": "audio (original synthesized music bed / SFX copies)", "narration": "narration line clip cut from the TTS take"}
    for sub, what in origin_of.items():
        d = os.path.join(vd, sub)
        if not os.path.isdir(d):
            continue
        for dp, _, fs in os.walk(d):
            for f in sorted(fs):
                ents.append(entry(os.path.join(dp, f), kind=what.split(" (")[0], version=ver, origin="own/original (built by packages/quiz) — " + what))
    ff = os.path.exists(os.path.join(vd, "render.raw.mp4"))   # 2026-11-02: studio ffmpeg compositor (packages/render) replaced OpenChatCut renders
    for f, k in (("render.mp4", "final_render"), ("render.occ.mp4", "occ_raw_render"), ("render.raw.mp4", "raw_render")):
        p = os.path.join(vd, f)
        if os.path.exists(p):
            src = "studio ffmpeg compositor render of render.timeline.json" if (ff and f != "render.occ.mp4") else "OpenChatCut headless render of the project in occ.json"
            ents.append(entry(p, kind=k, version=ver, origin=src + ("; mastered to -14 LUFS" if k == "final_render" else "")))
    merge("renders", ents)
# re-hash EVERY listed file (any section, any shape: dicts with a "file"), so regenerated art can't keep a stale sha256;
# the previous value is kept in sha256_history
def rehash(node):
    if isinstance(node, dict):
        f = node.get("file")
        if isinstance(f, str):
            for cand in (os.path.join(pdir, f), os.path.join(pdir, "art", f), os.path.join(root, f)):
                if os.path.isfile(cand):
                    h = sha(cand)
                    now = datetime.datetime.now().isoformat(timespec="seconds")
                    if node.get("sha256") and node["sha256"] != h:
                        node.setdefault("sha256_history", []).append({"sha256": node["sha256"], "replaced": now})
                    if node.get("sha256_16") and node["sha256_16"] != h[:16]:  # showrunner shape: truncated hash
                        node.setdefault("sha256_history", []).append({"sha256_16": node["sha256_16"], "replaced": now})
                        node["sha256_16"] = h[:16]
                    node["sha256"] = h; node["bytes"] = os.path.getsize(cand); node.pop("missing", None)
                    break
        for k, v in node.items():
            if k not in ("rights", "sha256_history"):
                rehash(v)
    elif isinstance(node, list):
        for v in node:
            rehash(v)


rehash({k: v for k, v in out.items() if k != "rights"})
# art referenced by quiz.json (images, covers, panels…): listed + hashed at every build
qj = os.path.join(pdir, "quiz.json")
if os.path.exists(qj):
    refs = set()
    def walk(v):
        if isinstance(v, dict):
            for x in v.values(): walk(x)
        elif isinstance(v, list):
            for x in v: walk(x)
        elif isinstance(v, str) and v.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif")) and os.path.isfile(os.path.join(pdir, v)):
            refs.add(v)
    walk(json.load(open(qj, encoding="utf-8")).get("rounds", []))
    merge("art_used", [entry(os.path.join(pdir, f), kind="art referenced by quiz.json", origin="see the art/generated entries for provenance") for f in sorted(refs)])
out.setdefault("excluded", {"_probe/": "OCC alpha probe files — never imported into a production project, never rendered or published",
                            "quiz.json reference fields": "research pointers only — never rendered or published"})
out["updated"] = datetime.datetime.now().isoformat(timespec="seconds")
tmp = fp + ".tmp"
json.dump(out, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
os.replace(tmp, fp)
print(json.dumps({k: len(v) for k, v in out.items() if isinstance(v, list)}))
