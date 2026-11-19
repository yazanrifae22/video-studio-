"""Reconcile caption (script) words with the words Whisper heard in the narration take.

Rule (QA, 2026-10-22): show the SCRIPT word, with Whisper's timing, whenever the heard word is a near match —
normalised edit-distance ratio >= 0.5 for one-to-one pairs, or the heard words are a merge of script words (fewer heard
tokens, joined ratio >= 0.5) or an exact split (more heard tokens whose concatenation equals the script word). Show the
HEARD word only when the take clearly says something else (e.g. script «وينها», take «وين هي»): the script line should
then be updated. Every difference is returned as a substitution record so QA can audit it.
Batch-4 polish (2026-10-23): a replaced span with more heard tokens than script words is partitioned word by word, so a
compound Whisper splits («لهالقبعة» heard «لها القبعة»: a doubled letter at the join collapses) keeps the script
spelling even next to a near-miss; a heard number in digits («17») against a script number word («سبعطعش») is a
near-miss; `edge_spill` finds heard words at a line's end that belong to the next line («كم»).
Pure module (no Whisper/numpy) so it can be unit-tested: test_caption_match.py.
"""
import difflib, re, unicodedata

DIAC = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
AR_DIG = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")
NUMS = {"1": "واحد", "2": "اثنين", "3": "ثلاثة", "4": "اربعة", "5": "خمسة", "6": "ستة", "7": "سبعة", "8": "ثمانية", "9": "تسعة"}


def norm(w):
    w = unicodedata.normalize("NFKC", w)
    w = DIAC.sub("", w).translate(AR_DIG)
    w = re.sub(r"[إأآٱ]", "ا", w).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    w = re.sub(r"[^\w]", "", w)
    if w.isdigit() and w in NUMS:
        w = norm(NUMS[w])
    return w


def loose(w):
    """Spelling-insensitive key: tashkeel/tatweel stripped, alef/ya/ta-marbuta unified, hamza dropped."""
    return norm(w.replace("ـ", "")).replace("ء", "").replace("ئ", "ي")


def ratio(a, b):
    return difflib.SequenceMatcher(a=a, b=b).ratio()


# Below this edit ratio the heard word is unrelated to the script word («هلأ» for «ع», «لا» for «هلّق»): the TTS read the
# script, so Whisper misheard it and the script word is shown. Similar-but-different words (≥ this) are the voice's own
# rewording («اللي منقطة» for «المنقّطة», «وين هي» for «وينها») and stay as heard so captions match the audio.
ASR_MISS = 0.4

# Short question words score low on edit ratio («كم» vs «كان» = 0.4) but are never meant to change: keep the script word.
QUESTION_WORDS = {"كم", "شو", "وين", "اي", "مين", "ليش", "قديش", "كيف", "هل", "ايش", "وش", "هلق"}


def near(c, h):
    """One script key vs one heard key: spelling near-miss, a script question word, or Whisper wrote a spoken number
    word as digits."""
    return (ratio(c, h) >= 0.5 or c in QUESTION_WORDS or (h.isdigit() and c and not any(ch.isdigit() for ch in c))
            or (c.isdigit() and h and not any(ch.isdigit() for ch in h)))  # script digits «١٠» spoken as «عشرة»


def joins(keys):
    """Ways a run of heard keys can spell one script word: plain concatenation, and with a doubled letter at each join
    collapsed (Levantine contraction: «لها» + «القبعة» -> «لهالقبعة»)."""
    plain, contracted = "".join(keys), keys[0] if keys else ""
    for k in keys[1:]:
        contracted += k[1:] if contracted and k and contracted[-1] == k[0] else k
    out = {plain, contracted}
    if len(keys) > 1 and keys[0] in ("علي", "عل") and keys[1].startswith("ال"):  # «على الـ» spoken as «عالـ»
        out.add("ع" + "".join(keys[1:]))
    return out


def split_near(c, grp):
    """Whisper broke one script word into pieces that spell it approximately («المنقّط» → «لم نقط», «دعسوقة» → «دا سوءة»).
    A real rewording keeps a whole script word at the front («وينها» → «وين هي»), so that case is excluded."""
    return ratio(c, "".join(grp)) >= 0.6 and not (len(grp[0]) >= 3 and c.startswith(grp[0]))


def partition(ck, hk):
    """Split heard keys hk (len > len(ck)) into consecutive groups, one per script key: a single heard word must be a
    near match, several heard words must spell the script word exactly (joins). Returns group sizes or None."""
    ns, nh = len(ck), len(hk)
    best = {0: []}  # heard tokens consumed -> group sizes so far (first valid partition wins)
    for d in range(ns):
        nxt = {}
        for used, sizes in best.items():
            for size in range(1, nh - used - (ns - d - 1) + 1):
                grp = hk[used:used + size]
                ok = near(ck[d], grp[0]) if size == 1 else (ck[d] in joins(grp) or (  # «عالأباريق» heard «على الأبريء»
                    grp[0] in ("علي", "عل") and grp[1].startswith("ال") and ratio(ck[d], "ع" + "".join(grp[1:])) >= 0.75)
                    or split_near(ck[d], grp))
                if ok and used + size not in nxt:
                    nxt[used + size] = sizes + [size]
        best = nxt
    return best.get(nh)


def edge_spill(cap, heard, next_first):
    """Number of heard words at the END of a line that are really the next line's first word (a short word right after
    the line edge, e.g. «كم», picked up by the previous line's window): the last heard word matches the next line's
    first caption word and this line's caption does not end with it. Returns 0 or 1."""
    if not heard or not next_first or not cap:
        return 0
    h, n, c = loose(heard[-1]), loose(next_first), loose(cap[-1])
    return 1 if h and h == n and c != h else 0


def reconcile(cap, heard):
    """cap: caption tokens (script); heard: Whisper tokens (raw).
    Returns (items, subs). items: [{"w", "src": "script"|"heard", "h": [heard indices for timing] or []}];
    subs: [{"script", "heard", "kind", "shown"}] for every place where the two differ."""
    ck, hk = [loose(c) for c in cap], [loose(h) for h in heard]
    items, subs = [], []
    sm = difflib.SequenceMatcher(a=ck, b=hk, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            items += [{"w": cap[i1 + d], "src": "script", "h": [j1 + d]} for d in range(i2 - i1)]
        elif tag == "replace":
            ns, nh = i2 - i1, j2 - j1
            js, jh = "".join(ck[i1:i2]), "".join(hk[j1:j2])
            parts = partition(ck[i1:i2], hk[j1:j2]) if nh > ns else None
            if ns == nh:
                for d in range(ns):
                    ok = near(ck[i1 + d], hk[j1 + d])
                    miss = not ok and ratio(ck[i1 + d], hk[j1 + d]) < ASR_MISS  # unrelated word: Whisper misheard the take
                    keep = ok or miss
                    items.append({"w": cap[i1 + d] if keep else heard[j1 + d], "src": "script" if keep else "heard", "h": [j1 + d]})
                    subs.append({"script": cap[i1 + d], "heard": heard[j1 + d], "kind": ("near-miss" if ratio(ck[i1 + d], hk[j1 + d]) >= 0.5 else "number") if ok else ("asr-miss" if miss else "different"), "shown": "script" if keep else "heard",
                                 "ratio": round(ratio(ck[i1 + d], hk[j1 + d]), 2)})
            elif parts and ns > 1:  # word-by-word: each script word over its own heard group
                j = j1
                for d, size in enumerate(parts):
                    items.append({"w": cap[i1 + d], "src": "script", "h": list(range(j, j + size))})
                    if size > 1 or ck[i1 + d] != hk[j]:
                        subs.append({"script": cap[i1 + d], "heard": " ".join(heard[j:j + size]), "kind": "split" if size > 1 else "near-miss", "shown": "script",
                                     **({} if size > 1 else {"ratio": round(ratio(ck[i1 + d], hk[j]), 2)})})
                    j += size
            elif (nh < ns and ratio(js, jh) >= 0.5) or (nh > ns and parts):
                kind = "merge" if nh < ns else "split"
                items += [{"w": cap[i1 + d], "src": "script", "h": list(range(j1, j2)), "part": (d, ns)} for d in range(ns)]
                subs.append({"script": " ".join(cap[i1:i2]), "heard": " ".join(heard[j1:j2]), "kind": kind, "shown": "script"})
            elif ns == 1 and nh > 1 and ratio(js, jh) >= 0.6 and not (len(hk[j1]) >= 3 and ck[i1].startswith(hk[j1])):
                # one script word heard as a near-miss split («دعسوقة» → «دا سوءة», «مايلة» → «ما يلي»): Whisper broke the word.
                # A real rewording keeps a whole word of the script at the front («وينها» → «وين هي») and stays as heard.
                items += [{"w": cap[i1], "src": "script", "h": list(range(j1, j2))}]
                subs.append({"script": cap[i1], "heard": " ".join(heard[j1:j2]), "kind": "split-near", "shown": "script", "ratio": round(ratio(js, jh), 2)})
            elif ratio(js, jh) < ASR_MISS:  # nothing alike: a mishearing, keep the script words over the heard span
                items += [{"w": cap[i1 + d], "src": "script", "h": list(range(j1, j2)), "part": (d, ns)} for d in range(ns)]
                subs.append({"script": " ".join(cap[i1:i2]), "heard": " ".join(heard[j1:j2]), "kind": "asr-miss", "shown": "script"})
            else:
                items += [{"w": heard[j1 + d], "src": "heard", "h": [j1 + d]} for d in range(nh)]
                subs.append({"script": " ".join(cap[i1:i2]), "heard": " ".join(heard[j1:j2]), "kind": "different", "shown": "heard"})
        elif tag == "insert":
            if j2 - j1 == 1:  # one stray heard word the script doesn't have (QA mys7: a lone «وين»): Whisper noise, not shown
                subs.append({"script": "", "heard": heard[j1], "kind": "extra-word", "shown": "hidden"})
            else:
                items += [{"w": heard[j1 + d], "src": "heard", "h": [j1 + d]} for d in range(j2 - j1)]
                subs.append({"script": "", "heard": " ".join(heard[j1:j2]), "kind": "extra-word", "shown": "heard"})
        elif tag == "delete":
            items += [{"w": cap[i1 + d], "src": "script", "h": [], "before": j1} for d in range(i2 - i1)]
            subs.append({"script": " ".join(cap[i1:i2]), "heard": "", "kind": "not-heard (kept)", "shown": "script"})
    return items, subs
