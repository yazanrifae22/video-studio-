/* =====================================================================================================================
   GOLD film (Karto & Skip ep. 2) - SHARED FILM KIT (F).  Scene authors: read this header + AUTHORING.md, then copy chapters/c00.js / c01.js.
   FILES   film.js wires the chapters (do not edit) - shared.js = this kit - art.js (+ gold.art.js) = SVG art, ART.name(o) -> [vbW, vbH, body]
           chapters/cNN.js = `export default function (K, F) {...}` (ONE author per file) + optional chapters/cNN.art.js for chapter-only drawings.
   TIME    Only line refs and fractions: 'l043', 'l043:0.4', 'l043:end', 'c03+0.2'. F.s('l003', 1) = start of sentence 2 of a line (EN and AR).
   WORDS   Every on-screen word = a key in docs/brands/karto/gold/storyboard.json strings or strings.d/*.json. Numbers: K.num / K.digit / F.money.
   SLOTS   slot + pos + fit (fractions) - same code runs wide and tall. F.Z = media zones (big/top/low/left/right/tvL/tvR/model) for both layouts.
   ---------------------------------------------------------------------------------------------------------------------
   BASE (copied from the GTA 6 film, same API):  F.chapterOpen F.stamp F.cardIn/cardHome F.tapeNote F.counter F.yearSign F.crowd F.cut F.piece F.push F.s F.money
   GOLD:   F.photo(name, o)      real photo assets/real/<name>.jpg, credit string cr_<name> on the print edge, push-in, default slot Z.big
           F.tv(name, o)         real clip folder on the cardboard TV + credit label cr_clip_<name>; returns {p, g} (g = TV geometry px)
           F.pricePath(o)        THE falling price path (8 cardboard columns, one-day cliff): .cols .cliff .label('jan'|'nov') .token(from,to,at)
           F.seesaw(o)           gold lump vs bond: .tilt(deg, at) .coin(i, at)           F.cubeScale(o)  22.6 m cube + seven-storey building
           F.loanBar(bars, o)    [{key,pct,col}] bars growing: .grow(i, at)               F.priceBoard([k0,k1,k2])  cardboard price board
           F.priceSlide(o)       slide + gold bar: .glide(at,dur)   F.goldBar  F.bear  F.bull  F.newspaper(key)  F.tick  F.sign(key,o)
   RESERVED score card = hud plane (wide: top-right corner 340x260; tall: strip between captions and Skip). Stamps: c01 l019 - c02 l032 - c03 l043 - c04 l056 - c05 l069 - c06 l080 - c07 l093
   DO     a new picture/clear change every 3-4 s - entrances 0.25-0.6 s with overshoot - hard cuts on list sentences - K.sfx on visible hits only.
   DON'T  cam zoom > 1.3 - text in tall unsafe zones (bottom 20 %, right 14 %, top 8 %) - faces of private people - logos - Math.random / timers / CSS animation.
   ===================================================================================================================== */
import { Prop, fitText } from '../../web/kit/props.js';
import { h, setTf, setOp, setText, clamp, win, ease } from '../../web/kit/core.js';
import { bake, canvas, svgImage, cloneCanvas, RES } from '../../web/kit/tex.js';
import { ART, COL, HEAD_COLS } from './art.js';

const TAU = Math.PI * 2;
const BAKES = new Map();
function svgDoc(vb, body, w, hh) { return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(hh)}" viewBox="0 0 ${vb[0]} ${vb[1]}">${body}</svg>`; }

/* ---------- Piece: a composite cardboard prop made of animatable layers ---------- */
export class Piece extends Prop {
  constructor(K, o = {}) {
    super(K, o);
    this.enterStyle = o.enter || 'pop'; this.exitStyle = o.exit || 'fly';
    this.W = o.w || 300; this.H = o.h || 300;
    const fit = o.fit == null && o.k == null && o.hpx == null ? 0.8 : o.fit;
    this.k = o.k != null ? o.k : o.hpx != null ? o.hpx / this.H : Math.min((this.rect.w * fit) / this.W, (this.rect.h * fit) / this.H);
    if (o.maxK) this.k = Math.min(this.k, o.maxK);
    this.w = this.W * this.k; this.h = this.H * this.k;
    this.layers = []; this.ids = {};
    for (const l of o.layers || []) this.add(l);
  }
  /** add a layer: {id, x, y, w, h (design units), art:'name'|ao, svg:[vw,vh,body], text|key, stamp:key, dom(el,K,k,L), paint(t,L,P),
   *  hidden, flat, edge, rim, paper, shadow:[dx,dy], font, max, min, lines, color, css, origin, rot, idle:{rot,y,x,sc,f,ph}} */
  add(l) {
    const L = { ...l, v: { x: 0, y: 0, rot: l.rot || 0, sc: l.sc || 1, sx: 1, sy: 1, op: l.hidden ? 0 : l.op != null ? l.op : 1 } };
    this.layers.push(L); if (l.id) this.ids[l.id] = L; return this;
  }
  /** layer handle */
  L(id) {
    const L = this.ids[id], K = this.K, tl = K.tl, P = this;
    if (!L) { K.lint.push(`piece: no layer "${id}"`); const nop = () => H; const H = { pop: nop, show: nop, hide: nop, slam: nop, drop: nop, slideIn: nop, slideOut: nop, to: nop, wiggle: nop, fade: nop, set: nop }; return H; }
    const v = L.v, T = (a) => K.T(a);
    const H = {
      layer: L,
      to(p, o = {}) { tl.to(v, p, { at: T(o.at), dur: o.dur == null ? 0.5 : o.dur, ease: o.ease || 'inOutCubic' }); return H; },
      set(p, at) { tl.set(v, p, T(at)); return H; },
      show(at, o = {}) { tl.set(v, { op: o.op == null ? 1 : o.op }, T(at)); return H; },
      hide(at) { tl.set(v, { op: 0 }, T(at)); return H; },
      fade(at, o = {}) { tl.to(v, { op: o.to == null ? 1 : o.to }, { at: T(at), dur: o.dur || 0.4, ease: 'linear' }); return H; },
      pop(at, o = {}) { const a = T(at); tl.set(v, { op: o.op == null ? 1 : o.op }, a); tl.to(v, { sc: [o.from || 0.15, o.sc || 1] }, { at: a, dur: o.dur || 0.38, ease: 'back(2.4)' }); if (o.sfx !== false) K.sfx(o.sfx || 'pop', a, { db: o.db == null ? -13 : o.db }); return H; },
      slam(at, o = {}) { const a = T(at), r0 = v.rot; tl.set(v, { op: o.op == null ? 1 : o.op }, a); tl.to(v, { sc: [2.2, 1] }, { at: a, dur: 0.17, ease: 'slam' }); tl.to(v, { rot: [r0 - 7, r0] }, { at: a, dur: 0.17, ease: 'outQuad' }); if (o.sfx !== false) K.sfx(o.sfx || 'stamp', a, { db: o.db == null ? -8 : o.db }); if (o.shake !== false) K.cam.shake(a + 0.15, { amp: o.amp || 7, dur: 0.25 }); return H; },
      drop(at, o = {}) { const a = T(at); tl.set(v, { op: 1 }, a); tl.to(v, { y: [-(o.dy || 500), 0], rot: [v.rot + 8, v.rot] }, { at: a, dur: o.dur || 0.5, ease: 'bounce' }); if (o.sfx !== false) K.sfx(o.sfx || 'thud', a + 0.18, { db: o.db == null ? -10 : o.db }); return H; },
      slideIn(at, o = {}) { const a = T(at); tl.set(v, { op: 1 }, a); tl.to(v, { x: [o.dx || 0, 0], y: [o.dy || 0, 0] }, { at: a, dur: o.dur || 0.45, ease: o.ease || 'back(1.4)' }); if (o.sfx !== false) K.sfx(o.sfx || 'slide', a, { db: o.db == null ? -12 : o.db }); return H; },
      slideOut(at, o = {}) { const a = T(at); tl.to(v, { x: o.dx || 0, y: o.dy || 0 }, { at: a, dur: o.dur || 0.4, ease: 'inCubic' }); tl.set(v, { op: 0 }, a + (o.dur || 0.4)); if (o.sfx) K.sfx(o.sfx, a); return H; },
      wiggle(at, o = {}) { const a = T(at), r0 = L.rot || 0, amp = o.deg || 6; for (let i = 0; i < 4; i++) tl.to(v, { rot: r0 + (i % 2 ? amp : -amp) * (1 - i / 4) }, { at: a + i * 0.08, dur: 0.08 }); tl.to(v, { rot: r0 }, { at: a + 0.32, dur: 0.1 }); return H; },
    };
    return H;
  }
  /** camera target at fractions of the piece (rest position) */
  spot(fx = 0.5, fy = 0.5) { const p = this.K.S.planes[this.plane]; return { center: () => [this.cx - this.w / 2 + fx * this.w, this.cy - this.h / 2 + fy * this.h, p ? p.depth : 1] }; }
  pt(fx = 0.5, fy = 0.5) { return { x: this.cx - this.w / 2 + fx * this.w, y: this.cy - this.h / 2 + fy * this.h }; }
  lpt(id, fx = 0.5, fy = 0.5) { const L = this.ids[id]; if (!L) return this.pt(); return { x: this.cx - this.w / 2 + (L.x + fx * L.w) * this.k, y: this.cy - this.h / 2 + (L.y + fy * L.h) * this.k }; }
  lspot(id, fx = 0.5, fy = 0.5) { const q = this.lpt(id, fx, fy), p = this.K.S.planes[this.plane]; return { center: () => [q.x, q.y, p ? p.depth : 1] }; }
  async build() {
    const K = this.K, k = this.k, box = this.mount(); this.size(this.W * k, this.H * k);
    for (const L of this.layers) {
      const el = h('div', 'grp', box); L.el = el;
      el.style.left = L.x * k + 'px'; el.style.top = L.y * k + 'px'; el.style.width = L.w * k + 'px'; el.style.height = L.h * k + 'px';
      el.style.transformOrigin = L.origin || '50% 50%';
      if (L.art || L.svg) await this._art(L, el);
      if (L.text != null || L.key) this._text(L, el);
      if (L.stamp) this._stamp(L, el);
      if (L.dom) L.dom(el, K, k, L, this);
      if (L.css) Object.assign(el.style, L.css);
      setOp(el, L.v.op);
    }
  }
  async _art(L, el) {
    const k = this.k, w = L.w * k, hh = L.h * k;
    const spec = L.svg || (typeof L.art === 'string' ? ART[L.art](L.ao || {}) : L.art);
    if (!spec) { this.K.lint.push(`piece: unknown art "${L.art}"`); return; }
    const doc = svgDoc([spec[0], spec[1]], spec[2], w * RES, hh * RES);
    if (L.flat) {
      const img = await svgImage(doc), c = canvas(w * RES, hh * RES); c.getContext('2d').drawImage(img, 0, 0, w * RES, hh * RES);
      c.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${hh}px`; el.appendChild(c); return;
    }
    const key = doc + '|' + (L.edge ?? 6) + (L.rim || 0) + (L.paper ? 'p' : 'k');
    let b = BAKES.get(key);
    if (!b) {
      const img = await svgImage(doc), c = canvas(w * RES, hh * RES); c.getContext('2d').drawImage(img, 0, 0, w * RES, hh * RES);
      b = bake(c, w, hh, { edge: L.edge ?? 6, rim: L.rim || 0, blur: L.blur ?? 10, stock: L.paper ? 'paper' : 'kraft', flutes: !!L.flutes });
      BAKES.set(key, b); b.used = 0;
    }
    const face = b.used++ ? cloneCanvas(b.face) : b.face, sh = b.used > 1 ? cloneCanvas(b.shadow) : b.shadow;
    const [dx, dy] = L.shadow || [5, 7];
    for (const [c, cls] of [[sh, 'pc__sh'], [face, 'pc__face']]) { c.className = cls; c.style.position = 'absolute'; c.style.width = b.w + 'px'; c.style.height = b.h + 'px'; c.style.left = -b.pad + 'px'; c.style.top = -b.pad + 'px'; el.appendChild(c); }
    sh.style.transform = `translate(${dx}px,${dy}px)`;
    if (L.noShadow) sh.style.display = 'none';
  }
  _text(L, el) {
    const K = this.K, k = this.k, w = L.w * k, hh = L.h * k;
    const str = L.text != null ? String(L.text) : K.s(L.key);
    const t = h('div', 'kt kt--' + (L.font || 'display') + (L.align === 'start' ? '' : ' center'), el); t.dir = K.dir; t.textContent = str;
    if (L.color) t.style.color = L.color;
    if (L.tcss) Object.assign(t.style, L.tcss);
    t.style.position = 'absolute'; t.style.left = '0px';
    const size = fitText(t, w, hh, (L.max || 60) * k, Math.max(11, (L.min || 14) * k), L.lines || 1, K, L.what || 'piece text');
    if (L.textAt) { t.style.whiteSpace = 'nowrap'; L.textEl = t; }
    t.style.top = Math.max(0, (hh - t.scrollHeight) / 2) + 'px'; L.fs = size;
  }
  _stamp(L, el) {
    const K = this.K, k = this.k, w = L.w * k, hh = L.h * k;
    const wrap = h('div', '', el); wrap.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${hh}px;display:flex;align-items:center;justify-content:center`;
    const st = h('div', 'stamp', wrap); if (L.color) st.style.setProperty('--ink', L.color);
    st.style.borderWidth = Math.max(4, 9 * k * (L.bw || 1)) + 'px';
    const t = h('div', 'kt kt--display', st); t.dir = K.dir; t.textContent = K.s(L.stamp);
    fitText(t, w * 0.78, hh * 0.7, (L.max || 80) * k, Math.max(12, 16 * k), L.lines || 1, K, 'stamp ' + L.stamp);
    t.style.width = 'max-content';
  }
  seek(t) {
    if (!this.el) return;
    const v = this.v; setOp(this.el, v.op); if (v.op <= 0) return;
    let dy = 0; if (this.hinge === 'top') dy = (this.h / 2) * (v.sy - 1); else if (this.hinge === 'bottom') dy = -(this.h / 2) * (v.sy - 1);
    const I = this.o.idle; let ix = 0, iy = 0, ir = 0;
    if (I) { const w = TAU * (I.f || 0.5), ph = I.ph || 0; ir = (I.rot || 0) * Math.sin(t * w + ph); iy = (I.y || 0) * Math.sin(t * w * 1.3 + ph + 1); ix = (I.x || 0) * Math.sin(t * w * 0.7 + ph + 2); }
    setTf(this.el, this.cx + v.x + ix, this.cy + v.y - v.lift + dy + iy, v.rot + ir, v.sc, v.sc * v.sy);
    const k = this.k;
    for (const L of this.layers) {
      if (!L.el) continue;
      const lv = L.v; setOp(L.el, lv.op); if (lv.op <= 0) continue;
      let lx = 0, ly = 0, lr = 0, ls = 0; const J = L.idle;
      if (J) { const w = TAU * (J.f || 0.6), ph = J.ph || 0; lr = (J.rot || 0) * Math.sin(t * w + ph); ly = (J.y || 0) * Math.sin(t * w * 1.2 + ph + 0.7); lx = (J.x || 0) * Math.sin(t * w * 0.8 + ph + 1.9); ls = (J.sc || 0) * Math.sin(t * w * 1.6 + ph); }
      setTf(L.el, (lv.x + lx) * k, (lv.y + ly) * k, lv.rot + lr, (lv.sc + ls) * lv.sx, (lv.sc + ls) * lv.sy);
      if (L.textAt && L.textEl) setText(L.textEl, L.textAt(t));
      if (L.paint) L.paint(t, L, this);
    }
    for (const f of this.seekers) f(t);
  }
}

/* ---------- the shared context ---------- */
export function makeF(K) {
  const { cast: { karto, skip }, props: P, cam, scene } = K;
  const tall = K.layout === 'tall', rtl = K.dir === 'rtl';
  const T = (r) => K.T(r);
  const F = { K, P, cam, scene, karto, skip, tall, rtl, lang: K.lang, T, ART, COL };
  // kit camera takes numbers only (a string ref became t = 0): resolve refs here so 'l044:0.5' works on cam.to/cut/focus/reset/shake
  if (!cam.__refs) {
    const to0 = cam.to.bind(cam), cut0 = cam.cut.bind(cam), shake0 = cam.shake.bind(cam);
    cam.to = (p, o = {}) => to0(p, { ...o, at: T(o.at) }); cam.cut = (p, o = {}) => cut0(p, { ...o, at: T(o.at) }); cam.shake = (at, o) => shake0(T(at), o); cam.__refs = true;
  }

  /* ---- time ---- */
  const SENT = new Map();
  /** sentence start times of a line (first = line start), from the word punctuation */
  F.sents = (id) => {
    if (SENT.has(id)) return SENT.get(id);
    const l = K.line(id), ws = l.words || [], out = [l.t0];
    ws.forEach((w, i) => { if (i < ws.length - 1 && /[.!?؟…]["»”')]*$/.test(w.w)) out.push(ws[i + 1].t0); });
    SENT.set(id, out); return out;
  };
  /** time inside sentence i (0-based) of a line at a fraction of that sentence */
  F.s = (id, i, frac = 0) => {
    const st = F.sents(id), l = K.line(id);
    if (i >= st.length) { K.lint.push(`F.s: ${id} has ${st.length} sentences, asked for #${i + 1}`); return K.at(id, Math.min(0.95, 0.5 + i * 0.05)); }
    const a = st[i], b = i + 1 < st.length ? st[i + 1] : l.t1; return a + (b - a) * frac;
  };
  /** camera push onto a slot / prop / F spot, offset clamped so the box frame never fills the top of the picture.
   *  o: {zoom 1.15, at, dur 0.7, cut, maxY 80, maxX 220} - use this instead of cam.focus */
  F.push = (target, o = {}) => {
    let cx, cy, d = 0.82;
    if (target && target.center) { const c = target.center(); cx = c[0]; cy = c[1]; d = c[2] || d; } else { const r = K.slot(target || 'board'); cx = r.x + r.w / 2; cy = r.y + r.h / 2; }
    const mx = o.maxX ?? (tall ? 120 : 220), my = o.maxY ?? (tall ? 160 : 80);
    const p = { x: clamp((cx - K.W / 2) / d, -mx, mx), y: clamp((cy - K.H / 2) / d, -my, my), zoom: o.zoom || 1.15 };
    return o.cut ? cam.cut(p, { at: o.at }) : cam.to(p, { at: o.at, dur: o.dur ?? 0.7, ease: o.ease });
  };
  F.money = (v, dec = 0) => (K.lang === 'ar' ? K.num(v, dec) + ' ' + K.s('usd') : K.s('usd') + K.num(v, dec));

  /* ---- generic makers ---- */
  F.piece = (o) => new Piece(K, o);
  /** one ART entry as a baked cardboard piece. o.ao = art options, o.stick = on a wooden stick, o.paper = paper fibres */
  F.cut = (name, o = {}) => {
    const spec = ART[name] ? ART[name](o.ao || {}) : null; if (!spec) { K.lint.push(`F.cut: unknown art "${name}"`); return F.piece({ ...o, layers: [] }); }
    const [vw, vh] = spec, st = o.stick ? Math.round(vh * 0.4) : 0, layers = [];
    if (st) layers.push({ id: 'stick', svg: [30, st + 40, `<rect x="4" y="0" width="22" height="${st + 36}" rx="10" fill="#E3C08A" stroke="#8C6A3C" stroke-width="3"/>`], x: vw / 2 - 15, y: vh - 40, w: 30, h: st + 40, edge: 2 });
    layers.push({ id: 'art', svg: spec, x: 0, y: 0, w: vw, h: vh, edge: o.edge ?? 7, rim: o.rim ?? 0, paper: o.paper });
    return F.piece({ enter: 'rise', ...o, w: vw, h: vh + st, layers: [...layers, ...(o.layers || [])] });
  };
  const fitIn = (o, d) => ({ ...d, ...o });

  /* ---- chapters ---- */
  F.MOOD = { c00: 'sunset', c01: 'room', c02: 'night', c03: 'sky', c04: 'stage', c05: 'sunset', c06: 'map', c07: 'sky', c08: 'stage' };
  /** chapter opener: cardboard flap at the chapter start, mood backdrop, chapter title card, actors reset */
  F.chapterOpen = (cid, o = {}) => {
    scene.change({ at: cid, style: o.style || 'flap', backdrop: o.backdrop || F.MOOD[cid] || 'plain' });
    // c00 is the cold open, so the kit's index+1 numbering is off by one: piece number = the id's own digits
    if (o.title !== false) P.title(cid, { at: cid + '+0.15', dur: o.dur || 1.7, num: parseInt(cid.replace(/\D/g, ''), 10) }); // title:false = no card (c08: the score card is the title)
    for (const a of [karto, skip]) { a.pose('neutral', { at: cid, sfx: false }); a.tilt({ deg: 0, at: cid, dur: 0.01 }); K.tl.set(a.v, { fx: 1 }, T(cid)); }
  };

  /* ---- the score card (hud plane, lives the whole film) ---- */
  const HOME = tall ? { x: 780, y: 1196, k: 0.29 } : { x: 1694, y: 150, k: 0.37 };
  const CENTER = tall ? { x: 490, y: 560, k: 0.88 } : { x: 1070, y: 440, k: 0.97 };
  const order = (i) => (rtl ? 6 - i : i); // piece 1 starts at the reading start
  const cardLayers = [{ id: 'base', art: 'scoreBase', x: 0, y: 0, w: 960, h: 410, edge: 9, flutes: true },
    { id: 'title', key: 'scorecard', x: 40, y: 8, w: 880, h: 62, max: K.lang === 'ar' ? 54 : 46, color: COL.yel }];
  for (let i = 0; i < 7; i++) {
    const cx = 72 + order(i) * 136;
    cardLayers.push({ id: 'ring' + (i + 1), art: 'ring', x: cx - 62, y: 104, w: 124, h: 124, flat: true });
    cardLayers.push({ id: 'num' + (i + 1), text: K.digit(String(i + 1)), x: cx - 40, y: 124, w: 80, h: 84, max: 70, color: 'rgba(30,23,18,0.28)' });
    cardLayers.push({ id: 'lab' + (i + 1), key: 'p' + (i + 1), x: cx - 64, y: 246, w: 128, h: 134, max: K.lang === 'ar' ? 46 : 33, min: 14, lines: 2, hidden: true });
    cardLayers.push({ id: 'ghost' + (i + 1), art: 'inkStamp', x: cx - 75, y: 91, w: 150, h: 150, flat: true, hidden: true });
    cardLayers.push({ id: 'st' + (i + 1), art: 'inkStamp', x: cx - 75, y: 91, w: 150, h: 150, flat: true, hidden: true, rot: -12 + ((i * 37) % 24) });
  }
  let card = null;
  /** l007: the card swings in at the centre; the 7 piece labels pop one after another over the second half of line `lid` */
  F.cardIn = (lid) => {
    card = new Piece(K, { plane: 'hud', slot: { x: CENTER.x - 1, y: CENTER.y - 1, w: 2, h: 2 }, w: 960, h: 410, k: 1, at: lid, enter: 'none', layers: cardLayers });
    card.v.sc = CENTER.k; const a = T(lid);
    K.tl.set(card.v, { op: 1 }, a);
    K.tl.to(card.v, { y: [-900, 0], rot: [-16, 0] }, { at: a, dur: 0.7, ease: 'back(1.6)' });
    K.sfx('whoosh', a); K.sfx('thud', a + 0.5, { db: -8 });
    for (let i = 0; i < 7; i++) card.L('lab' + (i + 1)).pop(K.at(lid, 0.45 + i * 0.07), { sfx: 'pop', db: -12 });
    F.card = card; return card;
  };
  /** fly the card to its corner home */
  F.cardHome = (at, dur = 0.7) => { const a = T(at); K.tl.to(card.v, { x: HOME.x - CENTER.x, y: HOME.y - CENTER.y, sc: HOME.k, rot: 3 }, { at: a, dur, ease: 'inOutCubic' }); K.sfx('slide', a, { db: -10 }); };
  /** fly the card from its corner to the centre (c08 score reveal) */
  F.cardCenter = (at, dur = 0.6) => { const a = T(at); K.tl.to(card.v, { x: 0, y: 0, sc: CENTER.k, rot: 0 }, { at: a, dur, ease: 'back(1.2)' }); K.sfx('whoosh', a, { db: -10 }); };
  /** demo stamp: slams on circle n, lifts off, leaves a ghost */
  F.demoStamp = (n, at) => {
    const a = T(at); card.L('st' + n).slam(a, { shake: false }); card.L('st' + n).to({ y: -60, op: 0 }, { at: a + 0.75, dur: 0.35, ease: 'inQuad' });
    card.L('ghost' + n).show(a + 0.8, { op: 0.22 }); card.wiggle({ at: a + 0.12 });
  };
  /** STAMP n: card flies from home to the centre, stamp slams with shake + sfx, card flies back home (~2 s) */
  F.stamp = (n, at) => {
    if (!card) { K.lint.push('F.stamp before F.cardIn'); return; }
    const a = T(at), tl = K.tl, v = card.v;
    tl.to(v, { x: 0, y: 0, sc: CENTER.k, rot: 0 }, { at: a, dur: 0.45, ease: 'back(1.2)' }); K.sfx('whoosh', a, { db: -10 });
    card.L('ghost' + n).hide(a + 0.55);
    card.L('st' + n).set({ y: 0 }, a + 0.5); card.L('st' + n).slam(a + 0.55, { amp: 10 }); card.L('ring' + n).wiggle(a + 0.6);
    tl.to(v, { sc: CENTER.k * 1.06 }, { at: a + 0.6, dur: 0.1, ease: 'outQuad' }); tl.to(v, { sc: CENTER.k }, { at: a + 0.7, dur: 0.3, ease: 'back(2)' });
    K.sfx('ding', a + 0.75, { db: -14 });
    tl.to(v, { x: HOME.x - CENTER.x, y: HOME.y - CENTER.y, sc: HOME.k, rot: 3 }, { at: a + 1.55, dur: 0.5, ease: 'inOutCubic' }); K.sfx('slide', a + 1.55, { db: -12 });
  };
  /** at the end of the film: the card must survive every scene.change */
  F.finish = () => { for (const p of [card, F._dim]) if (p) { p.out = null; p.cutAt = null; } };

  /* ---- tape note (honesty gag) ---- */
  /** masking-tape strip across a prop: target = handle | [handle, fx, fy] | {x,y}; key = 'guess' | 'estimate' | 'company_count' ... */
  F.tapeNote = (target, key, at, o = {}) => {
    let x, y;
    if (Array.isArray(target)) { const q = target[0].pt ? target[0].pt(target[1], target[2]) : { x: target[0].point(target[1], target[2])[0], y: target[0].point(target[1], target[2])[1] }; x = q.x; y = q.y; }
    else if (target && target.pt) { const q = target.pt(0.5, o.fy ?? 0.32); x = q.x; y = q.y; }
    else if (target && target.point) { const q = target.point(0.5, o.fy ?? 0.32); x = q[0]; y = q[1]; } else { x = target.x; y = target.y; }
    const W = o.w || 380, H = 78;
    const p = new Piece(K, { plane: o.plane || 'front', slot: { x: x - 1, y: y - 1, w: 2, h: 2 }, w: W, h: H, k: o.k || (tall ? 0.95 : 1), at, out: o.out, enter: 'slap', exit: o.exit || 'fade', tilt: o.tilt ?? -7, sfx: false,
      layers: [{ id: 'tape', x: 0, y: 0, w: W, h: H, dom: (el) => { el.className = 'grp tape'; el.style.height = H * p.k + 'px'; el.style.background = 'rgba(236,222,178,0.94)'; } },
        { id: 't', key, x: 18, y: 4, w: W - 36, h: H - 8, font: 'marker', max: 50, color: '#2B2015' }] });
    K.sfx('rip', T(at) - 0.12, { db: -12 }); K.sfx('tape', T(at) + 0.05, { db: -8 });
    return p;
  };

  /* ---- counters, signs, crowds ---- */
  /** counting sign. o: {money, unit (string key), from, dur, at, out, slot, pos, stock} */
  F.counter = (value, o = {}) => {
    const money = o.money, ar = K.lang === 'ar';
    return P.bigNumber(value, { slot: o.slot || 'right', pos: o.pos, at: o.at, out: o.out, unit: o.unit, countFrom: o.from || 0, dur: o.dur || 1.6, stock: o.stock || 'yellow', size: o.size,
      prefix: money && !ar ? 'usd' : o.prefix, suffix: money && ar ? 'usd_sp' : o.suffix, decimals: o.decimals, enter: o.enter, exit: o.exit });
  };
  /** wooden year sign on a stick */
  F.yearSign = (year, o = {}) => F.piece(fitIn(o, { slot: 'left', fit: 0.6, w: 320, h: 240, enter: 'rise', idle: { rot: 1.2, f: 0.4 },
    layers: [{ id: 'sign', art: 'sign', x: 0, y: 0, w: 320, h: 240 }, { id: 'y', text: K.digit(String(year)), x: 30, y: 24, w: 260, h: 104, max: 96, color: '#3B2A18' }] }));
  /** rows of paper heads. o: {rows, cols, expr 'wow'|'shout'|'happy'|'press'|'calm'|'mixed', look -1|0|1, seed} */
  F.crowd = (o = {}) => {
    const rows = o.rows || 2, cols = o.cols || 6, layers = [], W = cols * 74 + 40, H = rows * 70 + 60;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c, s = (o.seed || 0) + i, ex = o.expr === 'mixed' ? ['wow', 'happy', 'shout'][s % 3] : o.expr || 'wow';
      layers.push({ id: 'h' + i, art: 'head', ao: { expr: ex, col: HEAD_COLS[(s * 5) % HEAD_COLS.length], look: o.look || 0 }, x: 10 + c * 74 + (r % 2) * 30, y: H - 118 - r * 62, w: 90, h: 108, paper: true, edge: 3, idle: { y: 3, rot: 3, f: 0.9 + (s % 4) * 0.13, ph: s * 1.7 } });
    }
    layers.reverse(); // back rows first
    return F.piece(fitIn(o, { w: W, h: H, layers }));
  };


  /* ---- the SKIP button gag (copied from the GTA 6 film) ---- */
  /** the big SKIP button (front plane, bottom-right of the board) */
  F.skipButton = (o = {}) => F.piece(fitIn(o, { plane: 'front', slot: tall ? { in: 'board', x: 0.5, y: 0.78, w: 0.5, h: 0.22 } : { in: 'board', x: 0.56, y: 0.76, w: 0.46, h: 0.24 }, fit: 0.98, w: 540, h: 200, enter: 'none', exit: 'drop',
    layers: [{ id: 'btn', art: 'skipBtn', x: 0, y: 0, w: 540, h: 200, edge: 10, flutes: true }, { id: 't', key: 'skip_btn', x: 200, y: 30, w: 310, h: 130, max: 110, color: '#FFFDF6', tcss: { textShadow: '3px 4px 0 rgba(60,10,0,0.55)' } }] }));
  /** Skip tries to skip: pose 'skip' + the big button slides in from the right and creeps toward the centre until `stopAt` */
  F.skipAttempt = (at, o = {}) => {
    const a = T(at), b = F.skipButton({ at: a, out: o.out, exit: o.exit || 'drop' });
    K.tl.set(b.v, { op: 1 }, a); K.tl.to(b.v, { x: [K.W * 0.6, 160], rot: [12, -3] }, { at: a, dur: 0.5, ease: 'back(1.3)' });
    if (o.stopAt) K.tl.to(b.v, { x: 0, rot: 0 }, { at: a + 0.5, dur: Math.max(0.4, T(o.stopAt) - a - 0.5), ease: 'linear' });
    K.sfx('slide-long', a, { db: -8 });
    skip.pose('skip', { at: a }); skip.tilt({ deg: -6, at: a + 0.1 });
    return b;
  };

  /* =============== GOLD film makers =============== */
  /** board fractions helper */
  F.B = (x, y, w, h) => ({ in: 'board', x, y, w, h });
  /** media zones. Wide: photos/TVs may reach beyond the board (x 560-1560) because they are BIG on purpose; the cast stands at x<500 and x>1600.
   *  Tall: board = top 840 px; media gets the upper part, the lower part is for a second item / models. */
  F.Z = tall ? {
    big: F.B(0, 0, 1, 0.98), top: F.B(0, 0, 1, 0.64), low: F.B(0, 0.62, 1, 0.38), left: F.B(0, 0, 1, 0.58), right: F.B(0, 0.58, 1, 0.42), tvL: F.B(0, 0, 0.62, 1), tvR: F.B(0.38, 0, 0.62, 1), model: F.B(0, 0.5, 1, 0.5),
  } : {
    big: { x: 540, y: 40, w: 940, h: 770 }, top: { x: 540, y: 40, w: 940, h: 400 }, low: { x: 540, y: 430, w: 940, h: 380 }, left: { x: 540, y: 60, w: 560, h: 730 }, right: { x: 1090, y: 60, w: 410, h: 730 },
    tvL: { x: 540, y: 10, w: 520, h: 820 }, tvR: { x: 1060, y: 10, w: 520, h: 820 }, model: { x: 1040, y: 70, w: 460, h: 720 },
  };
  /** real photo (assets/real/<name>.jpg) with the credit string cr_<name> on its print edge. o: slot (default Z.big), caption, size, push, at, out, enter, exit, tilt */
  F.photo = (name, o = {}) => P.photo(`assets/real/${name}.jpg`, { slot: F.Z.big, size: 1, push: 1.07, credit: 'cr_' + name, enter: 'drop', exit: 'fly', ...o });
  /** frame sizes of the prepared clip folders (assets/real/<name>/0001.jpg, 15 fps) */
  const CLIPS = { bars_hands: [480, 854], pour: [480, 854], pour_b: [480, 854], souk_bangles: [480, 854], souk_clip: [480, 854], shop_counter: [480, 854], jeweller_chains: [480, 700], wedding_hand: [480, 854], coin_bracelet: [480, 666], shop_crowd: [480, 630] };
  /** clip on the cardboard TV + small credit label (cr_clip_<name>) on the TV chin. o: {slot, at, t0, out, enter, size, loop}. Returns {p, g} (g = TV geometry in stage px) */
  F.tv = (name, o = {}) => {
    const [FW, FH] = CLIPS[name] || [480, 854], slot = o.slot || F.Z.tvL, size = o.size || 1;
    const r = K.slot(slot); let W = r.w * size; const maxH = r.h * size - 60, bw = 0.075, chin = 0.13;
    let sw = W * (1 - bw * 2), sh = (sw * FH) / FW, H = sh + W * (bw + chin);
    if (H > maxH) { const k = maxH / H; W *= k; sw *= k; sh *= k; H = maxH; }
    W = Math.round(W); H = Math.round(H); sw = Math.round(sw); sh = Math.round(sh);
    const ant = 60, cx = r.x + r.w / 2, cy = r.y + r.h / 2, top = cy - (H + ant) / 2;
    const g = { W, H, cx, cy, sw, sh, left: cx - W / 2, scrX: cx - sw / 2, scrY: top + ant + Math.round(W * bw), bottom: top + ant + H, chinH: W * chin, top };
    const at = o.at == null ? 0 : o.at;
    const p = P.clip(`assets/real/${name}`, { slot, size, at, t0: o.t0 == null ? at : o.t0, out: o.out, enter: o.enter || 'drop', exit: 'cut', loop: !!o.loop });
    if (o.credit !== false) P.label('cr_clip_' + name, { slot: { x: g.left + g.W * 0.06, y: g.bottom - g.chinH * 0.95, w: g.W * 0.62, h: g.chinH * 0.8 }, size: 's', stock: 'white', at: T(at) + 0.65, out: o.out, enter: 'pop', exit: 'cut', tilt: -2 });
    return { p, g };
  };
  /** cardboard newspaper (headline = string key) */
  F.newspaper = (key, o = {}) => F.piece(fitIn(o, { w: 460, h: 580, enter: 'drop', layers: [{ id: 'np', art: 'newspaper', x: 0, y: 0, w: 460, h: 580, paper: true, edge: 3 }, { id: 'hl', key, x: 26, y: 20, w: 408, h: 96, max: 64, lines: 2 }] }));
  /** cardboard price board: three paper strips, text from string keys [title, row2, row3] (empty string = blank strip). layers r0..r2 (hidden until .pop) */
  F.priceBoard = (keys, o = {}) => F.piece(fitIn(o, { w: 560, h: 100 + keys.length * 106, enter: 'drop', idle: { rot: 0.8, f: 0.4 }, layers: [{ id: 'b', art: 'priceBoard', ao: { rows: keys.length }, x: 0, y: 0, w: 560, h: 100 + keys.length * 106, edge: 8 },
    ...keys.map((k, i) => (k ? { id: 'r' + i, key: k, x: 62, y: 56 + i * 106, w: 436, h: 78, max: 66, color: i === 0 ? '#2B2015' : '#C0391B', hidden: !!o.hideRows } : null)).filter(Boolean)] }));
  /** gold bar piece (foil card), optionally on a stick */
  F.goldBar = (o = {}) => F.cut('goldBar', fitIn(o, { fit: 0.5, edge: 6, idle: { rot: 1, f: 0.5 } }));
  /** falling-price slide (piece 520x700): a gold bar (layer 'bar') rides the ramp. p.pos(0..3, at) = bar placed on the ramp (0 top, 3 foot, shrunk). p.glide(at, dur) = bold glide to the foot. p.SL = the 4 positions */
  const SL = [{ x: -20, y: -38, sc: 1, rot: 0 }, { x: 152, y: 123, sc: 0.85, rot: 25 }, { x: 264, y: 284, sc: 0.72, rot: 25 }, { x: 330, y: 400, sc: 0.62, rot: 0 }];
  F.priceSlide = (o = {}) => {
    const p = F.piece(fitIn(o, { w: 520, h: 700, enter: 'rise', layers: [{ id: 'slide', art: 'priceSlide', x: 10, y: 40, w: 500, h: 640, edge: 8, flutes: true }, { id: 'bar', art: 'goldBar', x: 10, y: 0, w: 240, h: 138, edge: 6, origin: '50% 100%' }] }));
    p.SL = SL; p.pos = (i, at) => { p.L('bar').set(SL[i], at); return p; };
    p.glide = (at, dur = 1.3) => { const a = T(at); p.L('bar').to(SL[3], { at: a, dur, ease: 'inQuad' }); K.sfx('slide-long', a, { db: -8 }); K.sfx('thud', a + dur, { db: -9 }); return p; };
    return p;
  };
  /** THE PRICE PATH (recurring model): 8 cut-cardboard columns, tops = 5500 5500 5000 4800 4500 4200 4000 3800 (scaled), the one-day cliff between col 1 and 2.
   *  Layers: base, c0..c7 (hidden), tok (gold bar token), lbl_jan / lbl_nov (string keys st_jan st_nov, hidden), cliff (key one_day_nine, hidden).
   *  p.cols(at, step=0.25, upTo=7): columns pop left to right · p.cliff(at) · p.label('jan'|'nov', at) · p.token(fromCol, toCol, at, dur): the bar rides the path. o.upTo = last column kept (0-7). */
  F.pricePath = (o = {}) => {
    const tops = [5500, 5500, 5000, 4800, 4500, 4200, 4000, 3800], W = 900, H = 600, cw = 100, gap = 4, base = 560, k = 400 / 5500, layers = [];
    layers.push({ id: 'base', art: 'stepCol', ao: { w: 880, h: 40, col: '#A97A45' }, x: 10, y: base, w: 880, h: 40, edge: 5 });
    tops.forEach((v, i) => { const h = Math.round(v * k) + 20; layers.push({ id: 'c' + i, art: 'stepCol', ao: { w: cw, h, col: i === 2 ? '#E27A55' : i < 2 ? '#F2B824' : '#C99A62' }, x: 10 + i * (cw + gap), y: base - h, w: cw, h, edge: 5, hidden: true, origin: '50% 100%' }); });
    layers.push({ id: 'tok', art: 'goldBar', x: 10, y: base - Math.round(5500 * k) - 100, w: 120, h: 70, edge: 4, hidden: true });
    layers.push({ id: 'lbl_jan', key: 'st_jan', x: 0, y: 0, w: 430, h: 70, max: 52, color: '#1E1712', hidden: true });
    layers.push({ id: 'lbl_nov', key: 'st_nov', x: 520, y: base - 190, w: 360, h: 120, max: 54, lines: 2, color: '#1E1712', hidden: true }); // sits on the columns, under the measuring arrow
    layers.push({ id: 'cliff', key: 'one_day_nine', x: 70, y: 150, w: 300, h: 70, max: 40, color: '#FFFDF6', hidden: true, css: { background: '#D2361A', transform: 'rotate(-4deg)' } });
    const p = F.piece(fitIn(o, { w: W, h: H, enter: 'rise', layers }));
    const colX = (i) => 10 + i * (cw + gap) + 20;
    p.cols = (at, step = 0.25, upTo = 7) => { for (let i = 0; i <= upTo; i++) p.L('c' + i).pop(T(at) + i * step, { from: 0.1, sfx: i % 2 ? false : 'pop', dur: 0.3 }); return p; };
    p.cliff = (at) => { p.L('cliff').slam(at, { amp: 8 }); return p; };
    p.label = (w, at) => { p.L('lbl_' + w).pop(at, { sfx: 'tape' }); return p; };
    p.token = (from, to, at, dur = 1.2) => { const a = T(at); p.L('tok').set({ x: colX(from) - 60, y: 0 }, a).show(a); p.L('tok').to({ x: colX(to) - 60, y: Math.round((tops[from] - tops[to]) * k) }, { at: a, dur, ease: 'inOutCubic' }); return p; };
    return p;
  };
  /** SEESAW: gold lump (left) vs a government bond (right); p.tilt(deg, at, dur): + = right end down. Interest coins slide along (p.coin(i, at, side)). layers tri, plank, k0..k4 (coins, hidden) */
  F.seesaw = (o = {}) => {
    const layers = [{ id: 'tri', art: 'seesawTri', x: 270, y: 300, w: 220, h: 200, edge: 7 }, { id: 'plank', art: 'seesawPlank', x: 0, y: 125, w: 760, h: 260, edge: 7, origin: '50% 71.2%' }];
    for (let i = 0; i < 5; i++) layers.push({ id: 'k' + i, art: 'coin', x: 560 + (i % 3) * 36, y: 40 - Math.floor(i / 3) * 40, w: 56, h: 56, edge: 3, hidden: true, flat: false });
    const p = F.piece(fitIn(o, { w: 760, h: 520, enter: 'rise', layers }));
    p.tilt = (deg, at, dur = 0.7) => { p.L('plank').to({ rot: deg }, { at, dur, ease: 'back(1.3)' }); K.sfx('thud', T(at) + dur * 0.8, { db: -12 }); return p; };
    p.coin = (i, at, o2 = {}) => { const L = p.L('k' + i); L.drop(at, { dy: 260, sfx: 'coin', db: -14 }); if (o2.slide) L.to({ x: o2.slide, y: 40 }, { at: T(at) + 0.5, dur: 0.6 }); return p; };
    return p;
  };
  /** CUBE of all gold ever mined with the seven-storey building beside it for scale (layers cube, bld) */
  F.cubeScale = (o = {}) => F.piece(fitIn(o, { w: 700, h: 480, enter: 'rise', layers: [{ id: 'cube', art: 'cube', x: 230, y: 40, w: 420, h: 420, edge: 8 }, { id: 'bld', art: 'building', ao: { floors: 7 }, x: 40, y: 98, w: 150, h: 362, edge: 6 }] }));
  F.bear = (o = {}) => F.cut('bear', fitIn(o, { fit: 0.8, edge: 6, idle: { rot: 1.4, f: 0.5 } }));
  F.bull = (o = {}) => F.cut('bull', fitIn(o, { fit: 0.8, edge: 6, idle: { rot: 1.4, f: 0.5 } }));
  /** LOAN BAR: bars [{key, pct (0-1.2), col}] side by side on a base; each bar layer b<i> grows from the base (hidden: .grow(i, at)) */
  F.loanBar = (bars, o = {}) => {
    const W = o.W || 760, H = o.H || 560, base = H - 60, bw = o.bw || 170, gap = o.gap || 36, mh = o.maxH || H - 160, layers = [{ id: 'base', art: 'barBlock', ao: { w: W - 20, h: 34, col: '#A97A45' }, x: 10, y: base, w: W - 20, h: 34, edge: 5 }];
    bars.forEach((b, i) => { const h = Math.round(mh * b.pct), x = (o.x0 ?? 30) + i * (bw + gap); layers.push({ id: 'b' + i, art: 'barBlock', ao: { w: bw, h, col: b.col || '#3D7DB8' }, x, y: base - h, w: bw, h, edge: 6, origin: '50% 100%', hidden: true }, { id: 't' + i, key: b.key, x: x - 10, y: base - h + 14, w: bw + 20, h: Math.min(h - 20, 130), max: 44, min: 16, lines: 2, color: '#FFFDF6', hidden: true, tcss: { textShadow: '3px 4px 0 #1E1712' } }); });
    const p = F.piece(fitIn(o, { w: W, h: H, enter: 'rise', layers }));
    p.grow = (i, at, dur = 0.7) => { const a = T(at); p.L('b' + i).show(a).to({ sy: [0.03, 1] }, { at: a, dur, ease: 'outCubic' }); p.L('t' + i).pop(a + dur * 0.8, { sfx: false }); K.sfx('riser', a, { dur, db: -12 }); return p; };
    return p;
  };
  /** green marker tick drawn on (layer 'tk' appears with a scratch) - returns a piece to place next to a sign */
  F.tick = (o = {}) => F.piece(fitIn(o, { w: 140, h: 140, enter: 'pop', layers: [{ id: 'tk', svg: [140, 140, `<path d="M18 74 L56 114 L124 24" fill="none" stroke="#1E1712" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 74 L56 114 L124 24" fill="none" stroke="#57A05A" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>`], x: 0, y: 0, w: 140, h: 140, flat: true }] }));
  /** a paper sign with a text key, on tape (stock white/yellow/black): label wrapper with the kit defaults used in this film */
  F.sign = (key, o = {}) => P.label(key, { size: 'l', stock: 'white', tape: true, enter: 'slap', ...o });

  return F;
}
