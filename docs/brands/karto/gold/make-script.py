"""Export docs/brands/karto/gold/storyboard.json -> script.en.txt + script.ar.txt (line ids shown)."""
import json, re, os

HERE = os.path.dirname(os.path.abspath(__file__))
doc = json.load(open(os.path.join(HERE, "storyboard.json"), encoding="utf8"))
S = doc["strings"]

for lang in ("en", "ar"):
    out = [doc["title"][lang], "HOOK: " + doc["hook_text"][lang], "END: " + doc["end_text"][lang], ""]
    for ch in doc["chapters"]:
        out.append("== [%s] %s ==" % (ch["id"], ch["title"][lang]))
        used = []
        for l in ch["lines"]:
            for m in re.findall(r"\[s:([a-z0-9_]+)\]", l["picture"]):
                if m not in used:
                    used.append(m)
        if used:
            out.append("On-screen: " + " | ".join("%s = %s" % (u, S[u][lang]) for u in used))
        for l in ch["lines"]:
            out.append("[%s %s] %s: %s" % (ch["id"], l["id"], l["who"].upper(), l[lang]))
        out.append("")
    out.append("== SHORTS ==")
    for s in doc["shorts"]:
        out.append("%s (%s..%s): hook = %s | CTA = %s" % (s["id"], s["from"], s["to"], s["hook_text"][lang], s["cta"]["text"][lang]))
    open(os.path.join(HERE, "script.%s.txt" % lang), "w", encoding="utf8").write("\n".join(out) + "\n")
print("exported", sum(len(c["lines"]) for c in doc["chapters"]), "lines")
