"""Strip AI-generation disclosure text from YouTube descriptions (owner rule 2026-10-28).
Mirrored in scripts/youtube.ts (stripAi). Keep both in sync."""
import re, json, glob, sys, os

AI = re.compile(r"\bAI\b|AI-generated|synthetic (?:voice|narration|media|speech)|Gemini|\bTTS\b|text-to-speech|اصطناع|بالذكاء", re.I)
SENT_END = re.compile(r"(?<=[.!؟?])\s+")
SEP = re.compile(r"(;\s+|،\s*)")


def _split_top(s):
    """split into [clause, sep, clause, ...] on ; or ، outside parentheses"""
    out, depth, cur, i = [], 0, "", 0
    while i < len(s):
        ch = s[i]
        if ch in "([": depth += 1
        elif ch in ")]": depth = max(0, depth - 1)
        if depth == 0 and (ch == ";" or ch == "،"):
            j = i + 1
            while j < len(s) and s[j] in " \t": j += 1
            out += [cur, s[i:j]]; cur = ""; i = j; continue
        cur += ch; i += 1
    out.append(cur)
    return out


def _clean_sentence(sent):
    m = re.match(r"^(.*?)([.!؟?]*)$", sent, re.S)
    body, term = m.group(1), m.group(2)
    if not AI.search(body): return sent
    parts = _split_top(body)
    clauses, seps = parts[0::2], parts[1::2]
    keep = [(c, seps[i] if i < len(seps) else "") for i, c in enumerate(clauses) if not AI.search(c)]
    if not keep: return ""
    out = ""
    for k, (c, sp) in enumerate(keep):
        c = c.strip()
        if k == 0 and AI.search(clauses[0]):
            # leading clause was dropped: Arabic conjunction waw / lowercase English start
            if re.match(r"^و[ء-ي]", c): c = c[1:]
            elif c[:1].islower(): c = c[0].upper() + c[1:]
        out += c + (sp if k < len(keep) - 1 else "")
    return out.rstrip(" ;،") + (term or ".")


def strip_ai(text):
    if not isinstance(text, str) or not AI.search(text): return text
    t = text.replace("U.S.", "U\u0001S\u0001")
    t = re.sub(r"no AI image generation,\s*", "", t)
    lines = []
    for line in t.split("\n"):
        if not AI.search(line): lines.append(line); continue
        sents = SENT_END.split(line)
        res = [c for c in (_clean_sentence(s) for s in sents) if c.strip()]
        if res: lines.append(" ".join(res))
    # remove emptied lines that were AI-only (keep original blank structure, then collapse)
    t = "\n".join(lines).replace("U\u0001S\u0001", "U.S.")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.lstrip("\n") if text[:1] != "\n" else t


KEYS = ("description", "description_ar", "attribution_block")

if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "test":
        tests = [
            "Narration is AI-generated (Gemini TTS, voice Charon).",
            "Narration: AI-generated voice (Gemini TTS).",
            "Narration is AI-generated (Gemini TTS, voice Charon); the archive picture is real footage with its original audio removed.",
            "Narration is AI-generated (Gemini TTS, voice Charon); the picture is real U.S. Navy footage.",
            "Original puzzles by شو شايف؟ (@shoshayef); images AI-generated; synthetic narration. No third-party footage used.",
            "Original puzzles by شو شايف؟ (@shoshayef); all art original vector (SVG); synthetic narration. No third-party footage used.",
            "التعليق الصوتي في هذا الفيديو صوت اصطناعي (مولّد بالذكاء الاصطناعي)، والرسومات أصلية من تصميم القناة.",
            "الرسومات أصلية من إنتاج القناة، والتعليق الصوتي صوت اصطناعي.",
            "التعليق الصوتي صوت اصطناعي، والرسومات أصلية رسمناها للفيديو.",
            "الصور في هذا الفيديو مولّدة بالذكاء الاصطناعي، والتعليق الصوتي صوت اصطناعي.",
            "Original vector art (cans) drawn in code by the studio; no AI image generation, no third-party art.",
            "Hook?\n\nNarration is AI-generated (Gemini TTS, voice Charon).\n\nBody text.\n\n#tag",
            "A: x\nImages and narration in this video are AI-generated (synthetic voice).\nB: y",
        ]
        for x in tests: print(repr(strip_ai(x)))
