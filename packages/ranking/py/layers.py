"""
viral-rankings overlay layers for OpenChatCut (full-canvas RGBA PNG, alpha WebM for short animated cards).
Every file is a 1080x1920 canvas placed 1:1 (no transform) on its own OCC track, like the quiz corner bug.

usage: python -I layers.py spec.json        -> prints JSON {files: [{key, file, kind}]}
spec: {W, H, out_dir, fonts{display,text}, colours{ink,white,yellow}, geometry{title,rail,logo,cta,flashCentre},
       title{words:[{text,color}]}, rail{n, reveal_order, labels{rank:label}}, logo{file|null, text}, flash:[rank..], cta{text,dur}|null}
Layout + style follow docs/brands/viral-rankings/BRAND-GUIDE.md (Anton display, Montserrat ExtraBold, ink outline ~7 %).
"""
import json
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont


def hexrgb(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def font(path, size, weight=None):
    f = ImageFont.truetype(path, size)
    if weight is not None:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def canvas(W, H):
    return Image.new('RGBA', (W, H), (0, 0, 0, 0))


def shadow_under(img, blur=10, offset=(0, 6), alpha=0.75):
    """Soft ink drop shadow from the alpha of `img` (keeps outlined text readable on bright footage)."""
    a = img.split()[3].point(lambda v: int(v * alpha))
    sh = Image.new('RGBA', img.size, (11, 15, 28, 0))
    sh.putalpha(a)
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.alpha_composite(sh, offset)
    out.alpha_composite(img)
    return out


# ------------------------------------------------------------------ title
def wrap_words(words, f, max_w, space):
    lines, cur, w = [], [], 0
    for wd in words:
        ww = f.getlength(wd['text'])
        add = ww if not cur else w + space + ww
        if cur and add > max_w:
            lines.append(cur)
            cur, w = [wd], ww
        else:
            cur.append(wd)
            w = add
    if cur:
        lines.append(cur)
    return lines


def balanced(words, f, max_w, space):
    """Fewest lines, then the most even line widths (no orphan word)."""
    base = wrap_words(words, f, max_w, space)
    n = len(base)
    if n <= 1:
        return base
    best, best_score = base, None
    lo = sum(f.getlength(w['text']) for w in words) / n
    target = lo
    while target <= max_w:
        ls = wrap_words(words, f, target, space)
        if len(ls) == n:
            widths = [sum(f.getlength(w['text']) for w in l) + space * (len(l) - 1) for l in ls]
            score = max(widths) - min(widths)
            if best_score is None or score < best_score:
                best, best_score = ls, score
        target += 8
    return best


def draw_title(spec, out):
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = spec['geometry']['title']
    ink = hexrgb(spec['colours']['ink'])
    words = spec['title']['words']
    size = 112
    while True:
        f = font(spec['fonts']['display'], size)
        space = f.getlength(' ') * 1.1
        lines = balanced(words, f, x1 - x0, space)
        pitch = int(size * 1.2)
        if (len(lines) <= 3 and pitch * len(lines) <= (y1 - y0)) or size <= 60:
            break
        size -= 4
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    stroke = max(4, round(size * 0.075))
    y = y0 + 8
    for line in lines:
        widths = [f.getlength(w['text']) for w in line]
        lw = sum(widths) + space * (len(line) - 1)
        x = (W - lw) / 2
        for w, ww in zip(line, widths):
            d.text((x, y), w['text'], font=f, fill=hexrgb(w['color']), stroke_width=stroke, stroke_fill=ink)
            x += ww + space
        y += pitch
    img = shadow_under(img, blur=12, offset=(0, 7), alpha=0.7)
    img.save(out)
    return {'size': size, 'lines': [' '.join(w['text'] for w in l) for l in lines]}


# ------------------------------------------------------------------ rank rail
def fit_label(text, path, max_w, max_h, start=30, minimum=17):
    """Largest Montserrat ExtraBold size whose word-wrap fits the label box (≤ 3 lines), else ellipsis at the minimum."""
    for size in range(start, minimum - 1, -1):
        f = font(path, size, 800)
        lines, cur = [], ''
        for wd in text.split():
            t = (cur + ' ' + wd).strip()
            if f.getlength(t) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur)
                cur = wd
        if cur:
            lines.append(cur)
        lh = int(size * 1.12)
        if len(lines) <= 3 and lh * len(lines) <= max_h and all(f.getlength(l) <= max_w for l in lines):
            return f, lines, lh
    f = font(path, minimum, 800)
    lh = int(minimum * 1.12)
    t = text
    while t and f.getlength(t + '…') > max_w:
        t = t[:-1]
    return f, [t + '…'], lh


def fit_label2(text, path, max_w, max_h, start=66, minimum=40):
    """Big sublabel (2026-10-31, readable at 360 px): largest Montserrat ExtraBold size (<= start) whose <= 2 line wrap fits max_w x max_h."""
    for size in range(start, minimum - 1, -2):
        f = font(path, size, 800)
        words = text.split()
        best = None
        for cut in range(0, len(words)):                     # cut = 0 -> one line; else split after word cut-1 (balanced two lines)
            lines = [' '.join(words)] if cut == 0 else [' '.join(words[:cut]), ' '.join(words[cut:])]
            if all(f.getlength(l) <= max_w for l in lines):
                w = max(f.getlength(l) for l in lines)
                if best is None or len(lines) < len(best[0]) or (len(lines) == len(best[0]) and w < best[1]):
                    best = (lines, w)
        lh = int(size * 1.06)
        if best and lh * len(best[0]) <= max_h:
            return f, best[0], lh, best[1]
    f = font(path, minimum, 800)
    return f, [text], int(minimum * 1.06), f.getlength(text)


def rail_state(spec, k, out, hide_active_label=False):
    """State k: reveal_order[k] is active (yellow, larger, label), reveal_order[:k] revealed (dim card + label), the rest '#N'.
    k = None: empty rail (all N slots dim '#N', nothing lit) for frame 0 (2026-10-31 default)."""
    W, H = spec['W'], spec['H']
    rx0, ry0, rx1, ry1 = spec['geometry']['rail']
    r = spec['rail']
    n = r['n']
    order = r['reveal_order']
    active = order[k] if k is not None else None
    revealed = set(order[:k]) if k is not None else set()
    ink, white, yellow = (spec['colours'][c] for c in ('ink', 'white', 'yellow'))
    small = n > 3
    big = bool(r.get('big_labels'))
    if big:   # 2026-10-31 owner: bigger #N numerals + labels as the shared default (TOP 3 and TOP 5 both inside the rail zone y 600-1205)
        pitch = min((ry1 - ry0) / n, 178)
        ry0 = ry0 + ((ry1 - ry0) - pitch * n) / 2
        ih, ah = (100, 128) if small else (132, 172)
        iw_dim, iw_lab, aw = (130, 238, 170) if small else (170, 238, 200)
        num_i, num_a = (66, 90) if small else (88, 120)
        label_start = 54 if small else 72
    else:
        pitch = (ry1 - ry0) / n
        ih, ah = (84, 108) if small else (118, 150)            # inactive / active card heights (brand guide §6; TOP 5 = 0.8 scale)
        iw_dim, iw_lab, aw = (150, 238, 254) if not small else (128, 238, 254)
        num_i, num_a = (54, 80) if small else (70, 96)
        label_start = 66
    img = canvas(W, H)
    glow = canvas(W, H)
    disp = spec['fonts']['display']
    textf = spec['fonts']['text']
    cards = []
    for rank in range(1, n + 1):
        cy = ry0 + pitch * (rank - 0.5)
        if rank == active:
            cards.append((2, rank, cy, 'active'))
        elif rank in revealed:
            cards.append((1, rank, cy, 'revealed'))
        else:
            cards.append((0, rank, cy, 'hidden'))
    for _, rank, cy, kind in sorted(cards):              # active drawn last (overlaps neighbours on TOP 5)
        layer = canvas(W, H)
        d = ImageDraw.Draw(layer)
        label = r['labels'].get(str(rank), '')
        if kind == 'active':
            w, h = aw, ah
            x0, y0 = rx0, int(cy - h / 2)
            gd = ImageDraw.Draw(glow)
            if big and label and not hide_active_label:      # big sublabel plate joined to the card (right of the rail, 2 lines, ~66 px = 2.4x the old in-card label)
                bf, blines, blh, bw = fit_label2(label.upper(), textf, 330, h - 14, start=label_start, minimum=34)
                px1 = x0 + w + int(bw) + 40
                gd.rounded_rectangle([x0 + w - 30, y0 - 6, px1 + 6, y0 + h + 6], radius=26, fill=hexrgb(yellow, 150))
                d.rounded_rectangle([x0 + w - 30, y0, px1, y0 + h], radius=22, fill=hexrgb(ink, 235), outline=hexrgb(yellow), width=6)
                ty = y0 + (h - blh * len(blines)) / 2 - 4
                for ln in blines:
                    d.text((x0 + w + 18, ty), ln, font=bf, fill=hexrgb(white))
                    ty += blh
            gd.rounded_rectangle([x0 - 6, y0 - 6, x0 + w + 6, y0 + h + 6], radius=26, fill=hexrgb(yellow, 150))
            d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=22, fill=hexrgb(yellow), outline=hexrgb(white), width=6)
            fnum = font(disp, num_a)
            num = f'#{rank}'
            nb = d.textbbox((0, 0), num, font=fnum)
            nx = x0 + 16
            d.text((nx, y0 + (h - (nb[3] - nb[1])) / 2 - nb[1]), num, font=fnum, fill=hexrgb(ink))
            lx = nx + (nb[2] - nb[0]) + 12
            if label and not hide_active_label and not big:
                f, lines, lh = fit_label(label.upper(), textf, x0 + w - 12 - lx, h - 20, start=28)
                ty = y0 + (h - lh * len(lines)) / 2
                for ln in lines:
                    d.text((lx, ty), ln, font=f, fill=hexrgb(ink))
                    ty += lh
        else:
            show_label = kind == 'revealed' and label and not big
            w, h = (iw_lab if show_label else iw_dim), ih
            x0, y0 = rx0, int(cy - h / 2)
            d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=18, fill=hexrgb(ink, 171), outline=(255, 255, 255, 150), width=4)
            fnum = font(disp, num_i)
            num = f'#{rank}'
            nb = d.textbbox((0, 0), num, font=fnum)
            nx = x0 + (14 if show_label else (w - (nb[2] - nb[0])) / 2 - nb[0])
            d.text((nx, y0 + (h - (nb[3] - nb[1])) / 2 - nb[1]), num, font=fnum, fill=(255, 255, 255, 255 if show_label else 190))
            if show_label:
                lx = nx + (nb[2] - nb[0]) + 10
                f, lines, lh = fit_label(label.upper(), textf, x0 + w - 10 - lx, h - 14, start=24 if not small else 20, minimum=15)
                ty = y0 + (h - lh * len(lines)) / 2
                for ln in lines:
                    d.text((lx, ty), ln, font=f, fill=hexrgb(white))
                    ty += lh
        img.alpha_composite(layer)
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    out_img = canvas(W, H)
    out_img.alpha_composite(glow)
    out_img.alpha_composite(shadow_under(img, blur=8, offset=(0, 4), alpha=0.55))
    out_img.save(out)
    bbox = out_img.getbbox()
    return {'active': active, 'revealed': sorted(revealed), 'bbox': bbox}



# ------------------------------------------------------------------ style v2 (owner 2026-11-04): two-line title, compact glass rail
SSV2 = 3   # supersampling for rounded plates


def rrect(w, h, r, fill=None, outline=None, width=0, grad=None, highlight=None):
    """anti-aliased rounded rect patch (w x h): fill or vertical gradient (top, bottom), optional rim and a top inner highlight line"""
    S = SSV2
    size = (w * S, h * S)
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w * S - 1, h * S - 1], radius=r * S, fill=255)
    if grad:
        top, bot = grad
        g = Image.new('RGBA', (1, h * S))
        for y in range(h * S):
            k = y / max(1, h * S - 1)
            g.putpixel((0, y), tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(4)))
        body = g.resize(size)
    else:
        body = Image.new('RGBA', size, fill)
    body.putalpha(Image.composite(body.split()[3], Image.new('L', size, 0), mask))
    d = ImageDraw.Draw(body)
    if highlight:
        m = (width + 2) * S
        d.rounded_rectangle([m, m, w * S - m, int(h * S * 0.55)], radius=max(1, r - 3) * S, outline=highlight, width=2 * S)
        body.putalpha(Image.composite(body.split()[3], Image.new('L', size, 0), mask))
    if outline and width:
        d.rounded_rectangle([0, 0, w * S - 1, h * S - 1], radius=r * S, outline=outline, width=width * S)
    return body.resize((w, h), Image.LANCZOS)


def draw_title_v2(spec, out, full=False):
    """Two centred lines, the accent words are the break: 'TOP 5 W1' / 'W2 MOMENTS' (Anton, start 116 px, never below 84 px).
    full (title_layout full, 2026-11-11): no own scrim (the scrim layers carry it) and the lines are centred in the title box (safe box x 64-936)."""
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = spec['geometry']['title']
    tf = spec['v2']['title_font']
    ink = hexrgb(spec['colours']['ink'])
    words = spec['title']['words']
    if len(words) == 5 and words[0]['text'].upper() == 'TOP' and words[4]['text'].upper() == 'MOMENTS':
        lines = [words[:3], words[3:]]
    else:   # not the format title (the validator reports it): two balanced lines
        f0 = font(spec['fonts']['display'], tf['start'])
        tot = sum(f0.getlength(w['text']) for w in words)
        lines = balanced(words, f0, max(tot * 0.55, max(f0.getlength(w['text']) for w in words)), f0.getlength(' '))[:2]
    size = tf['start']
    while True:
        f = font(spec['fonts']['display'], size)
        space = f.getlength(' ') * 1.05
        cap = f.getbbox('H')
        ch = cap[3] - cap[1]
        gap = int(size * tf['line_gap'])
        widths = [sum(f.getlength(w['text']) for w in l) + space * (len(l) - 1) for l in lines]
        stroke = max(4, round(size * 0.07))
        if (max(widths) + 2 * stroke <= (x1 - x0) and 2 * ch + gap + 2 * stroke <= (y1 - y0)) or size <= tf['min']:
            break
        size -= 2
    # soft ink scrim behind the band (depth + contrast over bright blurred fill), fading out at top and bottom
    scrim = canvas(W, H)
    sd = ImageDraw.Draw(scrim)
    sy0, sy1 = max(0, y0 - 80), y1 + 6
    for y in range(sy0, sy1):
        k = (y - sy0) / max(1, sy1 - sy0)
        a = 110 * min(1.0, k / 0.35) * min(1.0, (1 - k) / 0.2)
        sd.line([(0, y), (W, y)], fill=(11, 15, 28, int(max(0, a))))
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    total_h = 2 * ch + gap
    ty = y0 + ((y1 - y0) - total_h) / 2 - cap[1]
    for line, lw in zip(lines, widths):
        x = ((x0 + x1) - lw) / 2 if full else (W - lw) / 2
        for w in line:
            d.text((x, ty), w['text'], font=f, fill=hexrgb(w['color']), stroke_width=stroke, stroke_fill=ink)
            x += f.getlength(w['text']) + space
        ty += ch + gap
    if full:
        scrim = canvas(W, H)
    scrim.alpha_composite(shadow_under(img, blur=14, offset=(0, 8), alpha=0.75))
    scrim.save(out)
    return {'size': size, 'lines': [' '.join(w['text'] for w in l) for l in lines], 'style': 'v2'}


def draw_chip(spec, out):
    """title_layout full: compact title chip 'TOP 5 W1 W2 MOMENTS' on an ink glass plate at the top of the safe box, accent colours kept.
    One line at the largest Anton size in chip_font start..min (min = cap >= 2.2 % of the canvas), else two lines split at the accent break."""
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = spec['full']['chip']
    cf = spec['full']['chip_font']
    ink = hexrgb(spec['colours']['ink'])
    words = spec['title']['words']
    padx, pady = 26, 14
    def measure(lines, size):
        f = font(spec['fonts']['display'], size)
        sp = f.getlength(' ') * 1.05
        return f, sp, [sum(f.getlength(w['text']) for w in l) + sp * (len(l) - 1) for l in lines]
    lines, size = [words], None
    for sz in range(cf['start'], cf['min'] - 1, -2):
        f, sp, ws = measure(lines, sz)
        if ws[0] + 2 * padx + 6 <= (x1 - x0):
            size = sz
            break
    if size is None:   # two short lines (accent break like the big title)
        lines = [words[:3], words[3:]] if len(words) == 5 else [words[:(len(words) + 1) // 2], words[(len(words) + 1) // 2:]]
        size = cf['start']
        while size > cf['min']:
            f, sp, ws = measure(lines, size)
            if max(ws) + 2 * padx + 6 <= (x1 - x0):
                break
            size -= 2
    f, sp, ws = measure(lines, size)
    cap = f.getbbox('H')
    ch = cap[3] - cap[1]
    gap = int(size * 0.16)
    stroke = max(2, round(size * 0.05))
    pw = int(max(ws) + 2 * padx + 2 * stroke)
    ph = int(ch * len(lines) + gap * (len(lines) - 1) + 2 * pady + 2 * stroke)
    plate = rrect(pw, ph, 20, fill=(11, 15, 28, 205), outline=(255, 255, 255, 80), width=2, highlight=(255, 255, 255, 30))
    pd = ImageDraw.Draw(plate)
    ty = pady + stroke - cap[1]
    for line, lw in zip(lines, ws):
        x = (pw - lw) / 2
        for w in line:
            pd.text((x, ty), w['text'], font=f, fill=hexrgb(w['color']), stroke_width=stroke, stroke_fill=ink)
            x += f.getlength(w['text']) + sp
        ty += ch + gap
    img = canvas(W, H)
    px = int(round((x0 + x1 - pw) / 2))
    img.alpha_composite(plate, (px, y0))
    shadow_under(img, blur=10, offset=(0, 6), alpha=0.6).save(out)
    return {'size': size, 'cap_px': ch, 'lines': [' '.join(w['text'] for w in l) for l in lines], 'rect': [px, y0, px + pw, y0 + ph]}


def draw_scrim(spec, out, bands):
    """full-width ink gradient bands [(y_dark, y_clear, alpha_max)]: alpha_max at y_dark easing to 0 at y_clear (y_dark > y_clear fades upward)"""
    W, H = spec['W'], spec['H']
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    for yd, yc, amax in bands:
        for y in range(max(0, min(yd, yc)), min(H, max(yd, yc))):
            k = abs(y - yd) / max(1, abs(yc - yd))   # 0 at the dark edge -> 1 at the clear edge
            d.line([(0, y), (W, y)], fill=(11, 15, 28, int(amax * (1 - k) ** 1.6)))
    img.save(out)


def rail_v2(spec, k, out_base, out_card=None, out_plate=None):
    """State k as three layers: base (every card but the active one), the active card, its sublabel plate. k None = empty rail."""
    W, H = spec['W'], spec['H']
    rx0, ry0, rx1, ry1 = spec['geometry']['rail']
    c = spec['v2']['card']
    r = spec['rail']
    n = r['n']
    order = r['reveal_order']
    active = order[k] if k is not None else None
    revealed = set(order[:k]) if k is not None else set()
    col = spec['colours']
    yellow, ink = hexrgb(col['yellow']), hexrgb(col['ink'])
    pitch = (ry1 - ry0) / n
    iw, ih = c['inactive']
    aw, ah = c['active']
    disp, textf = spec['fonts']['display'], spec['fonts']['text']
    base = canvas(W, H)
    info = {'active': active, 'revealed': sorted(revealed)}
    for rank in range(1, n + 1):
        # the active rank keeps a dim slot in the base layer (2026-11-04, maa1 QA): the card slides in OVER it, so the slot is never
        # blank on the cut frame while the card is still off-screen
        cy = ry0 + pitch * (rank - 0.5)
        x0, y0 = rx0, int(round(cy - ih / 2))
        rev = rank in revealed
        patch = rrect(iw, ih, c['radius'], fill=(11, 15, 28, 215 if rev else 150), outline=(255, 255, 255, 125 if rev else 75), width=2,
                      highlight=(255, 255, 255, 38))
        pd = ImageDraw.Draw(patch)
        if rev:   # already shown: yellow accent bar on the left
            pd.rounded_rectangle([7, 15, 12, ih - 16], radius=3, fill=yellow)
        fnum = font(disp, c['num'][0])
        num = f'#{rank}'
        nb = pd.textbbox((0, 0), num, font=fnum)
        nx = (iw - (nb[2] - nb[0])) / 2 - nb[0] + (4 if rev else 0)
        pd.text((nx, (ih - (nb[3] - nb[1])) / 2 - nb[1]), num, font=fnum, fill=(255, 255, 255, 255 if rev else 180))
        base.alpha_composite(patch, (x0, y0))
    base = shadow_under(base, blur=8, offset=(0, 4), alpha=0.5)
    base.save(out_base)
    info['bbox'] = base.getbbox()
    if active is None:
        return info
    cy = ry0 + pitch * (active - 0.5)
    x0, y0 = rx0, int(round(cy - ah / 2))
    # active card: brand-yellow gradient, white rim + inner highlight, soft yellow glow, drop shadow
    patch = rrect(aw, ah, c['radius'] + 4, grad=((255, 228, 80, 255), (255, 182, 0, 255)), outline=(255, 255, 255, 240), width=3,
                  highlight=(255, 255, 255, 55))
    pd = ImageDraw.Draw(patch)
    fnum = font(disp, c['num'][1])
    num = f'#{active}'
    nb = pd.textbbox((0, 0), num, font=fnum)
    pd.text(((aw - (nb[2] - nb[0])) / 2 - nb[0], (ah - (nb[3] - nb[1])) / 2 - nb[1]), num, font=fnum, fill=ink)
    card = canvas(W, H)
    card.alpha_composite(patch, (x0, y0))
    glow = canvas(W, H)
    ImageDraw.Draw(glow).rounded_rectangle([x0 - 8, y0 - 8, x0 + aw + 8, y0 + ah + 8], radius=28, fill=hexrgb(col['yellow'], 130))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    glow.alpha_composite(shadow_under(card, blur=10, offset=(0, 6), alpha=0.6))
    glow.save(out_card)
    info['card'] = [x0, y0, x0 + aw, y0 + ah]
    label = r['labels'].get(str(active), '')
    if out_plate and label:
        # readable at 360 px (2026-11-04 QA: 36 px = ~8.7 px cap at 360 failed): Montserrat ExtraBold label_start..label_min
        # (52 px = 37 px cap at 1080 = 12.3 px at 360). One line at the largest size that fits, else two balanced lines;
        # a label that needs 3 lines at label_min is an error (shorten left_label), never a silent shrink.
        L, maxw = label.upper(), c['plate_max_w'] - 60
        bf = blines = None
        for size in range(c['label_start'], c['label_min'] - 1, -2):
            f1 = font(textf, size, 800)
            if f1.getlength(L) <= maxw:
                bf, blines, blh, bw = f1, [L], int(size * 1.06), f1.getlength(L)
                break
        if bf is None:
            bf, blines, blh, bw = fit_label2(L, textf, maxw, 999, start=c['label_start'], minimum=c['label_min'])
            if len(blines) > 2 or bw > maxw + 0.5:
                raise ValueError(f'rail label "{label}" does not fit 2 lines of {maxw} px at {c["label_min"]} px (style v2): shorten left_label for #{active}')
        ph = max(ah - 8, blh * len(blines) + 18)
        px0 = x0 + aw - 24
        pw = int(24 + 16 + bw + 24)
        pp = rrect(pw, ph, 18, fill=(11, 15, 28, 232), outline=(255, 255, 255, 70), width=2, highlight=(255, 255, 255, 30))
        pdd = ImageDraw.Draw(pp)
        ty = (ph - blh * len(blines)) / 2 - 3
        for ln in blines:
            pdd.text((24 + 14, ty), ln, font=bf, fill=(255, 255, 255, 255))
            ty += blh
        plate = canvas(W, H)
        plate.alpha_composite(pp, (px0, int(round(cy - ph / 2))))
        shadow_under(plate, blur=10, offset=(0, 6), alpha=0.6).save(out_plate)
        info['plate'] = [px0, int(round(cy - ph / 2)), px0 + pw, int(round(cy + ph / 2))]
        info['label_px'] = bf.size
    return info

# ------------------------------------------------------------------ brand mark
def draw_logo(spec, out):
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = spec['geometry']['logo']
    img = canvas(W, H)
    lf = spec['logo'].get('file')
    if lf and os.path.exists(lf):
        mark = Image.open(lf).convert('RGBA')
        s = min((x1 - x0) / mark.width, (y1 - y0) / mark.height)
        mark = mark.resize((max(1, round(mark.width * s)), max(1, round(mark.height * s))), Image.LANCZOS)
        a = mark.split()[3].point(lambda v: int(v * 0.85))
        mark.putalpha(a)
        img.alpha_composite(mark, (x0, y0 + ((y1 - y0) - mark.height) // 2))
        kind = 'file'
    else:
        d = ImageDraw.Draw(img)
        f = font(spec['fonts']['display'], 44)
        d.text((x0, y0 + 14), spec['logo'].get('text') or 'TOP RANK', font=f, fill=(255, 255, 255, 215),
               stroke_width=3, stroke_fill=hexrgb(spec['colours']['ink']))
        kind = 'text'
    img.save(out)
    return {'kind': kind}


# ------------------------------------------------------------------ flash + CTA (alpha WebM)
def to_webm(png, out, dur, fade_in=0.07, fade_out=0.2):
    vf = f"format=rgba,fade=t=in:st=0:d={fade_in}:alpha=1,fade=t=out:st={max(0.0, dur - fade_out):.3f}:d={fade_out}:alpha=1"
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-loop', '1', '-framerate', '30', '-i', png, '-t', f'{dur:.3f}', '-vf', vf,
                    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '30', '-deadline', 'realtime', '-cpu-used', '8', out], check=True)


def draw_flash(spec, rank, out_png):
    W, H = spec['W'], spec['H']
    cx, cy = spec['geometry']['flashCentre']
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    f = font(spec['fonts']['display'], 340)
    t = f'#{rank}'
    b = d.textbbox((0, 0), t, font=f, stroke_width=20)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), t, font=f, fill=hexrgb(spec['colours']['yellow']),
           stroke_width=20, stroke_fill=hexrgb(spec['colours']['ink']))
    shadow_under(img, blur=16, offset=(0, 10), alpha=0.8).save(out_png)


def draw_cta(spec, out_png):
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = spec['geometry']['cta']
    img = canvas(W, H)
    d = ImageDraw.Draw(img)
    text = spec['cta']['text']
    f = font(spec['fonts']['text'], 54, 900)
    b = d.textbbox((0, 0), text, font=f)
    tw, th = b[2] - b[0], b[3] - b[1]
    pw, ph = tw + 80, 96
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    d.rounded_rectangle([cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2], radius=48, fill=hexrgb(spec['colours'].get('red', '#FF3B47')),
                        outline=(255, 255, 255, 255), width=5)
    d.text((cx - tw / 2 - b[0], cy - th / 2 - b[1]), text, font=f, fill=(255, 255, 255, 255))
    shadow_under(img, blur=10, offset=(0, 6), alpha=0.6).save(out_png)


# ------------------------------------------------------------------ subscribe / like badge (frame-accurate RGBA sequence -> alpha WebM)
BADGE_DUR = 2.5      # s: pop-in 0.25, fake tap at 1.05, SUBSCRIBED hold, fade out 0.3
BADGE_TAP = 1.05
BADGE_W, BADGE_H = 332, 76
SS = 3               # supersampling


def _ease_back(x, c1=2.6):
    x = max(0.0, min(1.0, x))
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def _badge_scale(t):
    """whole-badge scale: pop-in overshoot 0-0.25 s, press-down at the tap, spring back with overshoot"""
    if t < 0.25:
        return _ease_back(t / 0.25)
    if BADGE_TAP <= t < BADGE_TAP + 0.1:
        return 1 - 0.10 * (t - BADGE_TAP) / 0.1
    if BADGE_TAP + 0.1 <= t < BADGE_TAP + 0.3:
        return 0.90 + 0.10 * _ease_back((t - BADGE_TAP - 0.1) / 0.2, 3.2)
    return 1.0


def _bell(cx, cy, s, ang, fill):
    """white bell glyph rotated about its top; returns (image, paste_xy) with the bell's visual centre at (cx, cy)"""
    n = int(s * 2.4)
    g = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    c = n / 2
    top = c - s * 0.5
    gd.ellipse([c - s * 0.40, top + s * 0.06, c + s * 0.40, top + s * 0.86], fill=fill)
    gd.polygon([(c - s * 0.40, top + s * 0.50), (c + s * 0.40, top + s * 0.50), (c + s * 0.54, top + s * 0.80), (c - s * 0.54, top + s * 0.80)], fill=fill)
    gd.rounded_rectangle([c - s * 0.54, top + s * 0.74, c + s * 0.54, top + s * 0.84], radius=s * 0.05, fill=fill)
    gd.ellipse([c - s * 0.11, top + s * 0.84, c + s * 0.11, top + s * 1.06], fill=fill)
    gd.rounded_rectangle([c - s * 0.05, top - s * 0.02, c + s * 0.05, top + s * 0.12], radius=s * 0.04, fill=fill)
    g = g.rotate(ang, resample=Image.BICUBIC, center=(c, top))
    return g, (int(cx - n / 2), int(cy - (top + s * 0.5)))


def _thumb(d, cx, cy, s, fill, outline=None, ow=0):
    """thumbs-up glyph (cuff + hand + raised thumb) in a box of side s centred on (cx, cy); outline-only when fill is transparent"""
    x0, y0 = cx - s / 2, cy - s / 2
    P = lambda u, v: (x0 + u * s, y0 + v * s)
    d.rounded_rectangle([x0 + 0.02 * s, y0 + 0.44 * s, x0 + 0.22 * s, y0 + 0.94 * s], radius=0.05 * s, fill=fill, outline=outline, width=ow)
    hand = [P(0.30, 0.44), P(0.46, 0.44), P(0.60, 0.10), P(0.70, 0.10), P(0.72, 0.22), P(0.64, 0.44), P(0.90, 0.44), P(0.98, 0.52), P(0.98, 0.62),
            P(0.92, 0.88), P(0.84, 0.94), P(0.30, 0.94)]
    d.polygon(hand, fill=fill)
    if outline:
        d.line(hand + [hand[0]], fill=outline, width=ow, joint='curve')


def draw_badge_frame(spec, t, region):
    """one frame of the badge on a transparent `region` (w, h) canvas (supersampled), returned at 1x"""
    rw, rh = region
    S = SS
    scale = _badge_scale(t)
    fade = 1.0 if t < BADGE_DUR - 0.3 else max(0.0, (BADGE_DUR - t) / 0.3)
    if scale <= 0.001 or fade <= 0:
        return Image.new('RGBA', (rw, rh), (0, 0, 0, 0))
    tapped = t >= BADGE_TAP + 0.06
    u = max(0.0, t - BADGE_TAP - 0.06)
    layer = Image.new('RGBA', (rw * S, rh * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    THW, GAP, PW, H = 68, 8, 256, BADGE_H
    ox, oy = (rw - BADGE_W) / 2, (rh - H) / 2
    colours = spec['colours']
    ink = hexrgb(colours['ink'])
    white = (255, 255, 255, 255)
    # thumb button: dark disc + white outline icon -> after the tap a yellow disc + filled ink icon that bounces
    tb = 1 + 0.38 * math.sin(min(1.0, u / 0.36) * math.pi) * (1 - 0.3 * min(1.0, u / 0.36)) if tapped else 1.0
    tcx, tcy = (ox + THW / 2) * S, (oy + H / 2) * S
    r = THW / 2 * S * tb
    if tapped:
        d.ellipse([tcx - r, tcy - r, tcx + r, tcy + r], fill=hexrgb(colours['yellow']), outline=white, width=2 * S)
        _thumb(d, tcx, tcy - S, 40 * S * tb, ink)
    else:
        d.ellipse([tcx - r, tcy - r, tcx + r, tcy + r], fill=hexrgb(colours['ink'], 235), outline=white, width=2 * S)
        _thumb(d, tcx, tcy - S, 40 * S, (0, 0, 0, 0), outline=white, ow=3 * S)
    # pill
    px0, py0 = (ox + THW + GAP) * S, oy * S
    px1, py1 = px0 + PW * S, py0 + H * S
    d.rounded_rectangle([px0, py0, px1, py1], radius=H * S / 2, fill=hexrgb('#4A4F5C') if tapped else hexrgb('#F01818'), outline=white, width=2 * S)
    label = 'SUBSCRIBED' if tapped else 'SUBSCRIBE'
    fs = 26
    while True:                                                # fit the label between the bell and the right end of the pill
        f = font(spec['fonts']['text'], fs * S, 900)
        b = d.textbbox((0, 0), label, font=f)
        if (b[2] - b[0]) / S <= PW - 70 - 24 or fs <= 16:
            break
        fs -= 1
    if BADGE_TAP <= t < BADGE_TAP + 0.4:                       # tap ripple
        k = (t - BADGE_TAP) / 0.4
        rr = (20 + 70 * k) * S
        rcx, rcy = (px0 + px1) / 2 + 20 * S, (py0 + py1) / 2
        d.ellipse([rcx - rr, rcy - rr, rcx + rr, rcy + rr], outline=(255, 255, 255, int(150 * (1 - k))), width=4 * S)
    ang = 28 * math.sin(u * 34) * math.exp(-u * 5.0) if tapped else 0.0
    bell, bxy = _bell(px0 + 38 * S, py0 + H * S / 2, 34 * S, ang, white)
    layer.alpha_composite(bell, bxy)
    d = ImageDraw.Draw(layer)
    d.text((px0 + 70 * S - b[0], py0 + H * S / 2 - (b[1] + b[3]) / 2), label, font=f, fill=white)
    if abs(scale - 1) > 1e-3:                                  # whole-badge scale about its centre
        w, h = layer.size
        sc = layer.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
        if scale <= 1:
            out.alpha_composite(sc, ((w - sc.width) // 2, (h - sc.height) // 2))
        else:
            cx0, cy0 = (sc.width - w) // 2, (sc.height - h) // 2
            out = sc.crop((cx0, cy0, cx0 + w, cy0 + h))
        layer = out
    layer = layer.resize((rw, rh), Image.LANCZOS)
    layer = shadow_under(layer, blur=7, offset=(0, 5), alpha=0.55)
    if fade < 1:
        layer.putalpha(layer.split()[3].point(lambda v: int(v * fade)))
    return layer


def badge_rect(spec):
    """canvas rect of the badge region (x0, y0, x1, y1); the 332x76 badge hangs from the top-right anchor (x1, y0)"""
    region = (460, 170)
    cx, cy = spec['sub_badge']['x1'] - BADGE_W / 2, spec['sub_badge']['y0'] + BADGE_H / 2
    rx, ry = int(round(cx - region[0] / 2)), int(round(cy - region[1] / 2))
    return region, rx, ry


def render_badge(spec, od):
    """vr_badge.webm: BADGE_DUR s full-canvas transparent sequence, one frame per build frame (exact on fps)"""
    W, H = spec['W'], spec['H']
    fps = int(spec['sub_badge'].get('fps') or 30)
    region, rx, ry = badge_rect(spec)
    fdir = os.path.join(od, 'badge_frames')
    os.makedirs(fdir, exist_ok=True)
    n = int(round(BADGE_DUR * fps))
    for k in range(n):
        full = canvas(W, H)
        full.alpha_composite(draw_badge_frame(spec, k / fps, region), (rx, ry))
        full.save(os.path.join(fdir, f'b_{k:03d}.png'))
    wb = os.path.join(od, 'vr_badge.webm')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(fps), '-i', os.path.join(fdir, 'b_%03d.png'), '-vf', 'format=rgba',
                    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '18', '-deadline', 'good', '-cpu-used', '4', wb], check=True)
    return {'key': 'badge', 'file': wb, 'kind': 'video', 'dur': BADGE_DUR, 'rect': [rx, ry, rx + region[0], ry + region[1]]}


def draw_white(spec, out_png):
    """#1 hit flash (2026-10-31): white plate over the footage rect, 92 % alpha at its peak (fades are applied in the WebM)."""
    W, H = spec['W'], spec['H']
    x0, y0, x1, y1 = [int(round(v)) for v in spec['white_flash']['rect']]
    img = canvas(W, H)
    ImageDraw.Draw(img).rectangle([max(0, x0), max(0, y0), min(W, x1) - 1, min(H, y1) - 1], fill=(255, 255, 255, 235))
    img.save(out_png)


def main():
    spec = json.load(open(sys.argv[1], encoding='utf8'))
    od = spec['out_dir']
    os.makedirs(od, exist_ok=True)
    files, info = [], {}
    v2 = spec.get('style') == 'v2'
    p = os.path.join(od, 'vr_title.png')
    full = v2 and bool(spec.get('full'))
    info['title'] = draw_title_v2(spec, p, full=full) if v2 else draw_title(spec, p)
    files.append({'key': 'title', 'file': p, 'kind': 'image'})
    if full:   # title_layout full (2026-11-11): chip + scrims (top behind the title / the chip, bottom under the caption band)
        p = os.path.join(od, 'vr_chip.png')
        info['chip'] = draw_chip(spec, p)
        files.append({'key': 'chip', 'file': p, 'kind': 'image'})
        sc = spec['full']['scrim']
        p = os.path.join(od, 'vr_scrim_title.png')
        draw_scrim(spec, p, [tuple(sc['title'])])
        files.append({'key': 'scrim_title', 'file': p, 'kind': 'image'})
        p = os.path.join(od, 'vr_scrim_base.png')
        b = sc['bottom']
        draw_scrim(spec, p, [tuple(sc['chip']), (b[1], b[0], b[2])])
        files.append({'key': 'scrim_base', 'file': p, 'kind': 'image'})
    info['rail'] = []
    for k in range(spec['rail']['n'] if v2 else 0):           # style v2: base / active card / sublabel plate per state
        pb, pc, pp = (os.path.join(od, f'vr_rail_{k}{x}.png') for x in 'bcp')
        ri = rail_v2(spec, k, pb, pc, pp)
        info['rail'].append(ri)
        files += [{'key': f'rail_{k}b', 'file': pb, 'kind': 'image'}, {'key': f'rail_{k}c', 'file': pc, 'kind': 'image'}]
        if 'plate' in ri:
            files.append({'key': f'rail_{k}p', 'file': pp, 'kind': 'image'})
    if v2 and spec['rail'].get('empty'):
        p = os.path.join(od, 'vr_rail_e.png')
        info['rail_empty'] = rail_v2(spec, None, p)
        files.append({'key': 'rail_e', 'file': p, 'kind': 'image'})
    for k in range(0 if v2 else spec['rail']['n']):
        p = os.path.join(od, f'vr_rail_{k}.png')
        info['rail'].append(rail_state(spec, k, p))
        files.append({'key': f'rail_{k}', 'file': p, 'kind': 'image'})
        if spec['rail'].get('label_at'):                      # delayed label (2026-10-31): the active card shows only '#N' until the payoff beat
            pn = os.path.join(od, f'vr_rail_{k}n.png')
            rail_state(spec, k, pn, hide_active_label=True)
            files.append({'key': f'rail_{k}n', 'file': pn, 'kind': 'image'})
    if not v2 and spec['rail'].get('empty'):                   # empty rail for frame 0 (nothing lit before the first reveal)
        p = os.path.join(od, 'vr_rail_e.png')
        info['rail_empty'] = rail_state(spec, None, p)
        files.append({'key': 'rail_e', 'file': p, 'kind': 'image'})
    p = os.path.join(od, 'vr_logo.png')
    info['logo'] = draw_logo(spec, p)
    files.append({'key': 'logo', 'file': p, 'kind': 'image'})
    for rank in spec.get('flash') or []:
        png = os.path.join(od, f'vr_flash_{rank}.png')
        draw_flash(spec, rank, png)
        wb = os.path.join(od, f'vr_flash_{rank}.webm')
        to_webm(png, wb, spec.get('flash_dur', 0.5))
        files.append({'key': f'flash_{rank}', 'file': wb, 'kind': 'video'})
    if spec.get('cta'):
        png = os.path.join(od, 'vr_cta.png')
        draw_cta(spec, png)
        wb = os.path.join(od, 'vr_cta.webm')
        to_webm(png, wb, spec['cta']['dur'], fade_in=0.08, fade_out=0.15)
        files.append({'key': 'cta', 'file': wb, 'kind': 'video'})
    if spec.get('sub_badge'):
        files.append(render_badge(spec, od))
    if spec.get('white_flash'):
        png = os.path.join(od, 'vr_white.png')
        draw_white(spec, png)
        wb = os.path.join(od, 'vr_white.webm')
        d = float(spec['white_flash'].get('dur', 0.4))
        to_webm(png, wb, d, fade_in=0.04, fade_out=max(0.1, d - 0.06))   # ~1 frame up, then a long fade (not a single-frame spike: techqa flash check)
        files.append({'key': 'white', 'file': wb, 'kind': 'video'})
    print(json.dumps({'files': files, 'info': info}))


if __name__ == '__main__':
    main()
