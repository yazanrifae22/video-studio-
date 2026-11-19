/* =====================================================================================================================
   GTA 6 film - SHARED FILM KIT (F).  Authoring guide for the chapter authors - read this header, then copy c00.js / c03.js.
   ---------------------------------------------------------------------------------------------------------------------
   FILES   film.js wires everything (do not edit) · shared.js = this kit · art.js = SVG art (ART.name(o) -> [vbW, vbH, body])
           chapters/cNN.js = `export default function (K, F) {...}` - ONE file per author, never touch another chapter.
   TIME    Only line refs and fractions: 'l043', 'l043:0.4', 'l043:end', 'c03+0.2'. Sentences inside a line:
           F.s('l003', 1) = start of the 2nd sentence (from the word times, works in EN and AR; same sentence count in both).
           F.s('l003', 1, 0.5) = half way through the 2nd sentence. Never absolute seconds, never word text/indexes.
   WORDS   Every on-screen word = a key in docs/brands/karto/gta6/storyboard.json -> strings (then make-film-json + build
           --draft both ids). Numbers: K.num(v) / K.digit('2013') / F.money(v) give the right digits per language.
   SLOTS   Place things with slot + pos (fractions) + fit (fraction of the slot), never raw px: the same code runs wide and
           tall. F.tall / F.rtl when a layout really must differ. Board = the main picture; one main thing at a time.
   ---------------------------------------------------------------------------------------------------------------------
   F HELPERS (all return a handle; every maker takes the prop options slot, pos, fit, at, out, enter, exit, tilt, idle)
     F.chapterOpen('c04')                         flap + mood backdrop + chapter title + both actors back to neutral
     F.stamp(4, 'l060:0.6')                        score card flies to centre, stamp 4 slams (shake + sfx), card flies home
     F.tapeNote(sackHandle, 'guess', 'l033:0.3')   masking-tape strip slapped across a prop (Karto's honesty gag)
     F.counter(800000000, {money:true, unit:'day1', at:'l022:0.3'})   counting sign ($ / دولار handled per language)
     F.yearSign(2023, {at:'l047'})                 wooden sign on a stick with the year
     F.crowd({rows:2, cols:6, expr:'shout', look:1, at})    paper heads (expr wow|shout|happy|press|calm|mixed), bobbing
     F.cut('hourglass', {slot:'right', fit:.6, at})          any ART entry as one baked cardboard piece (stick:true = on a stick)
     F.piece({w, h, layers:[...]})                 composite: layers of art / text / stamp / dom, each animatable:
        p.L('id').pop(at) .show(at) .hide(at) .slam(at) .drop(at) .slideIn(at,{dx,dy}) .to({x,y,rot,sc,op},{at,dur,ease}) .wiggle(at)
        p.spot(fx, fy) -> camera target · p.pt(fx, fy) -> arrow point · p.lpt('id', fx, fy) -> point on a layer
     Makers (final = used in c00/c03, v1 = first version, refine in your chapter or here with a note):
       final: F.tower F.gameBox(n) F.skipButton F.skipAttempt F.hoodie F.door F.hotelTV F.stick F.phone F.sack F.clapper
              F.calPage F.calendar F.nightTitle F.icons F.forum F.clipRain F.office F.chat F.timer24 F.spy F.ukMap
              F.laptopBag F.hotelRoom F.vaultMap F.bench F.bill F.clocks F.hospital F.courthouse F.shopWindow F.dim
       v1:    F.coins F.priceTag F.filmCan F.player F.timelineStrip F.delayedStamp F.shop F.console F.parliament
              F.newspaper F.newsSet F.volcano F.lemonade F.flipBook F.mum F.match F.padlock F.scaleProp F.register F.bin
   RESERVED  score card (F.card, plane hud): wide home = top-right corner, tall home = between captions and Skip's head.
             Keep the top-right 340x260 (wide) and that tall strip free. Stamps: c01 l021 · c02 l034 · c03 l049 · c04 l060 ·
             c05 l069 · c06 l079 · c07 l092 (already in the stubs; keep the line, move the fraction if you need).
             The SKIP button sits bottom-right of the board (F.skipAttempt) - running gag l002 (c00) and l065 (c05).
   DO     a new picture or a clear change every 3-4 s · entrances 0.25-0.6 s with overshoot · hard cuts on list sentences ·
          poses that match the line (storyboard `picture`) · K.sfx on visible hits only · idle:{rot,y,f} on held props.
   DON'T  cam zoom > 1.3 · text in tall unsafe zones (bottom 20 %, right 14 %, top 8 %) · faces on real people · logos ·
          Math.random / timers / CSS animation · lookAt('left') together with 'pointL'.
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
  F.MOOD = { c00: 'sunset', c01: 'room', c02: 'sky', c03: 'night', c04: 'stage', c05: '#3B3350', c06: 'sunset', c07: 'map', c08: 'stage' };
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
    { id: 'title', key: 'score_title', x: 40, y: 8, w: 880, h: 62, max: K.lang === 'ar' ? 54 : 46, color: COL.yel }];
  for (let i = 0; i < 7; i++) {
    const cx = 72 + order(i) * 136;
    cardLayers.push({ id: 'ring' + (i + 1), art: 'ring', x: cx - 62, y: 104, w: 124, h: 124, flat: true });
    cardLayers.push({ id: 'num' + (i + 1), text: K.digit(String(i + 1)), x: cx - 40, y: 124, w: 80, h: 84, max: 70, color: 'rgba(30,23,18,0.28)' });
    cardLayers.push({ id: 'lab' + (i + 1), key: 'p' + (i + 1), x: cx - 64, y: 246, w: 128, h: 134, max: K.lang === 'ar' ? 46 : 33, min: 14, lines: 2, hidden: true });
    cardLayers.push({ id: 'ghost' + (i + 1), art: 'inkStamp', x: cx - 75, y: 91, w: 150, h: 150, flat: true, hidden: true });
    cardLayers.push({ id: 'st' + (i + 1), art: 'inkStamp', x: cx - 75, y: 91, w: 150, h: 150, flat: true, hidden: true, rot: -12 + ((i * 37) % 24) });
  }
  let card = null;
  /** l007: the card swings in at the centre; labels pop on the sentence starts of `lid` (sentence 2..8) */
  F.cardIn = (lid) => {
    card = new Piece(K, { plane: 'hud', slot: { x: CENTER.x - 1, y: CENTER.y - 1, w: 2, h: 2 }, w: 960, h: 410, k: 1, at: lid, enter: 'none', layers: cardLayers });
    card.v.sc = CENTER.k; const a = T(lid);
    K.tl.set(card.v, { op: 1 }, a);
    K.tl.to(card.v, { y: [-900, 0], rot: [-16, 0] }, { at: a, dur: 0.7, ease: 'back(1.6)' });
    K.sfx('whoosh', a); K.sfx('thud', a + 0.5, { db: -8 });
    for (let i = 0; i < 7; i++) card.L('lab' + (i + 1)).pop(F.s(lid, i + 1, 0.05), { sfx: 'pop', db: -12 });
    F.card = card; return card;
  };
  /** fly the card to its corner home */
  F.cardHome = (at, dur = 0.7) => { const a = T(at); K.tl.to(card.v, { x: HOME.x - CENTER.x, y: HOME.y - CENTER.y, sc: HOME.k, rot: 3 }, { at: a, dur, ease: 'inOutCubic' }); K.sfx('slide', a, { db: -10 }); };
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

  /* =============== topic makers (final quality) =============== */
  /** leaning tower of calendar blocks first..last with the game box on top. Wobbles (idle). Layers: b0..bN, box, six */
  F.tower = (o = {}) => {
    const y0 = o.from || 2013, y1 = o.to || 2026, n = y1 - y0 + 1, bh = 58, W = 420, H = n * bh + 300, layers = [], bands = [COL.verm, COL.blue, COL.green, COL.yel, COL.pink];
    for (let i = 0; i < n; i++) {
      const y = H - (i + 1) * bh, x = 70 + i * (o.lean ?? 9);
      layers.push({ id: 'b' + i, art: 'calBlock', ao: { band: bands[i % 5] }, x, y: y - 6, w: 240, h: 66, edge: 5, rot: (i % 3 - 1) * 1.6, origin: '50% 100%', idle: { rot: 0.5 + i * 0.18, f: 0.55, ph: -i * 0.22 } });
      layers.push({ id: 'y' + i, text: K.digit(String(y0 + i)), x: x + 20, y: y + 14, w: 200, h: 44, max: 40, rot: (i % 3 - 1) * 1.6, origin: '50% 100%', idle: { rot: 0.5 + i * 0.18, f: 0.55, ph: -i * 0.22 } });
    }
    const tx = 70 + n * (o.lean ?? 9) + 20, ty = H - n * bh - 262;
    layers.push(...F._boxLayers(K.digit(String(o.numeral || '6')), tx, ty, 200, 258, { pal: o.pal || 'six', idle: { rot: 2.6 + n * 0.2, f: 0.55, ph: -n * 0.22 }, origin: '50% 100%', rot: 4 }));
    return F.piece(fitIn(o, { w: W + n * 9, h: H, layers }));
  };
  /** box layers (art + numeral text with neon glow), shared by gameBox / tower / vault */
  F._boxLayers = (numeral, x, y, w, hh, o = {}) => {
    const s = w / 210;
    const glow = o.pal === 'five' ? '#7CFFB2' : o.pal === 'seven' ? '#FFFDF6' : COL.neon;
    return [
      { id: 'box', art: 'box', ao: { pal: o.pal }, x, y, w, h: hh, edge: 8, rot: o.rot || 0, origin: o.origin, idle: o.idle },
      { id: 'six', text: numeral, x: x + 10 * s, y: y + 24 * s, w: 170 * s, h: 170 * s, max: 190 * s, color: '#FFFDF6', rot: o.rot || 0, origin: o.origin, idle: o.idle,
        tcss: { textShadow: `0 0 ${10 * s}px ${glow}, 0 0 ${26 * s}px ${glow}, ${4 * s}px ${5 * s}px 0 #1A1030` } },
    ];
  };
  /** the game box with a big numeral ('6', '5', '7?'). o.pal six|five|seven */
  F.gameBox = (numeral = '6', o = {}) => F.piece(fitIn(o, { w: 210, h: 270, enter: 'drop', layers: F._boxLayers(K.digit(String(numeral)), 0, 0, 210, 270, { pal: o.pal || (String(numeral) === '5' ? 'five' : String(numeral).startsWith('7') ? 'seven' : 'six') }) }));
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
  F.hoodie = (o = {}) => F.cut('hoodie', fitIn(o, { fit: 0.8, edge: 6, idle: { rot: 0.8, y: 3, f: 0.35 } }));
  F.door = (o = {}) => F.piece(fitIn(o, { w: 300, h: 440, enter: 'pop', layers: [
    { id: 'door', art: 'door', x: 0, y: 0, w: 280, h: 440, edge: 8 },
    { id: 'num', text: K.digit(o.number || '418'), x: 96, y: 56, w: 88, h: 46, max: 40, color: '#3B2A18' },
    { id: 'dnd', art: 'dnd', x: 160, y: 238, w: 140, h: 215, edge: 3, paper: true, origin: '50% 19%', idle: { rot: 4, f: 0.7 } },
    { id: 'dndT', key: 'dnd', x: 170, y: 296, w: 120, h: 146, font: 'display', max: 26, min: 11, lines: 3, origin: '50% -10%', idle: { rot: 4, f: 0.7 } },
  ] }));
  /** hotel TV: layers tv, off, on (green code screen, hidden unless o.on), stick (hidden unless o.stick) */
  F.hotelTV = (o = {}) => F.piece(fitIn(o, { w: 600, h: 400, enter: 'drop', layers: [
    { id: 'tv', art: 'tv', x: 0, y: 0, w: 560, h: 400, edge: 8 },
    { id: 'off', art: 'screenOff', x: 32, y: 30, w: 496, h: 280, flat: true },
    { id: 'on', x: 32, y: 30, w: 496, h: 280, hidden: !o.on, dom: codeScreen },
    { id: 'stick', art: 'stick', x: 548, y: 168, w: 52, h: 18, edge: 3, hidden: !o.stick },
  ] }));
  F.stick = (o = {}) => F.cut('stick', fitIn(o, { fit: 0.4, edge: 4 }));
  F.phone = (o = {}) => F.cut('phone', fitIn(o, { fit: 0.5, edge: 5 }));
  F.sack = (o = {}) => F.cut('sack', fitIn(o, { fit: 0.8, enter: 'drop', idle: { rot: 1, f: 0.5 } }));
  F.clapper = (o = {}) => F.cut('clapper', fitIn(o, { fit: 0.4, enter: 'drop' }));
  /** small calendar page (month key + year optional) with the given band */
  F.calPage = (o = {}) => F.piece(fitIn(o, { w: 230, h: 250, enter: 'drop', layers: [{ id: 'page', art: 'calPage', ao: { band: o.band }, x: 0, y: 0, w: 230, h: 250, paper: true, edge: 3 },
    ...(o.month ? [{ id: 'm', key: o.month, x: 14, y: 14, w: 200, h: 34, max: 30, color: '#FFFDF6' }] : []), ...(o.year ? [{ id: 'yr', text: K.digit(String(o.year)), x: 14, y: 44, w: 200, h: 34, max: 30, color: '#FFFDF6' }] : [])] }));
  /** big month calendar: o = {month:'month_sep', year:2022, first:4 (weekday of the 1st, 0 = Sunday), days:30, circle:18, marks:{16:'courthouse'}}
   *  layers: page, head, grid, circle (marker draw, F.drawOn), mark<day> (art, hidden: pop them) */
  F.calendar = (o = {}) => {
    const first = o.first || 0, days = o.days || 30, cw = 74, ch = 64, gx = 41, gy = 140;
    const cell = (d) => { const i = d - 1 + first, c = i % 7, r = Math.floor(i / 7); return { x: gx + (rtl ? 6 - c : c) * cw, y: gy + r * ch }; };
    const layers = [{ id: 'page', art: 'calBig', ao: { band: o.band }, x: 0, y: 0, w: 600, h: 560, paper: true, edge: 4 },
      { id: 'head', text: K.s(o.month) + '  ' + K.digit(String(o.year)), x: 30, y: 26, w: 540, h: 80, max: 64, color: '#FFFDF6' },
      { id: 'grid', x: 0, y: 0, w: 600, h: 560, dom: (el, K_, k) => { for (let d = 1; d <= days; d++) { const p = cell(d), dv = h('div', 'kt kt--display center', el); dv.textContent = K.digit(String(d)); dv.style.cssText = `position:absolute;left:${p.x * k}px;top:${p.y * k}px;width:${cw * k}px;height:${ch * k}px;font-size:${34 * k}px;line-height:${ch * k}px;color:${(d - 1 + first) % 7 === 0 ? '#C0391B' : '#3B2A18'};border:${Math.max(1, 1.5 * k)}px solid rgba(60,40,20,0.18)`; } } }];
    if (o.circle) { const p = cell(o.circle); layers.push({ id: 'circle', x: p.x - 10, y: p.y - 8, w: cw + 20, h: ch + 16, dom: markerRing, hidden: true }); }
    for (const [d, art] of Object.entries(o.marks || {})) {
      const p = cell(+d), mw = art === 'box' ? 58 : 84, mh = art === 'box' ? 74 : 73, mx = p.x + (cw - mw) / 2, my = p.y + ch - mh + 4;
      layers.push({ id: 'mark' + d, art, ao: art === 'box' ? { pal: 'six' } : {}, x: mx, y: my, w: mw, h: mh, edge: 3, hidden: true });
      if (art === 'box') layers.push({ id: 'markT' + d, text: K.digit('6'), x: mx + 4, y: my + 8, w: mw - 12, h: mw - 12, max: 52, color: '#FFFDF6', hidden: true, tcss: { textShadow: `0 0 6px ${COL.neon}` } });
    }
    const pc = F.piece(fitIn(o, { w: 600, h: 560, enter: 'drop', layers }));
    pc.cell = (d) => { const p = cell(d); return pc.lpt('page', (p.x + cw / 2) / 600, (p.y + ch / 2) / 560); };
    pc.mark = (d, at) => { pc.L('mark' + d).pop(at, { sfx: 'tap' }); if (pc.ids['markT' + d]) pc.L('markT' + d).pop(at, { sfx: false }); return pc; };
    return pc;
  };
  /** draw a marker ring layer (made by F.calendar circle) on at `at` */
  F.drawOn = (piece, id, at, dur = 0.6) => { const L = piece.ids[id]; if (!L) return; L.drawAt = T(at); L.drawDur = dur; L.v.op = 0; K.tl.set(L.v, { op: 1 }, T(at)); K.sfx('scratch', T(at), { db: -10 }); };
  /** night city with palms + title card (kicker + title) */
  F.nightTitle = (o = {}) => F.piece(fitIn(o, { w: 940, h: 520, enter: 'flap', layers: [
    { id: 'city', art: 'nightCity', x: 0, y: 0, w: 940, h: 520, edge: 8, flutes: true },
    { id: 'card', x: 150, y: 70, w: 640, h: 210, dom: (el, K_, k) => { el.style.background = '#FFFDF6'; el.style.boxShadow = '6px 8px 0 rgba(20,10,30,0.55)'; el.style.clipPath = 'polygon(1% 3%, 99% 0, 100% 96%, 0 100%)'; } },
    { id: 'kicker', key: 'title_kicker', x: 170, y: 82, w: 600, h: 80, max: 76, color: COL.verm },
    { id: 'title', key: 'title_main', x: 170, y: 160, w: 600, h: 100, max: 70, color: '#1E1712' },
  ] }));
  /** three icons (hourglass, coin, tv) that light up: layers d<i> (dim) and i<i> (lit, hidden): F.lightIcon(p, i, at) */
  F.icons = (names = ['hourglass', 'coin', 'tvIcon'], o = {}) => {
    const layers = []; names.forEach((n, i) => { const x = 20 + i * 220; layers.push({ id: 'd' + i, art: n, x, y: 10, w: 180, h: 180, edge: 5, css: { filter: 'grayscale(1) brightness(0.55)' } }, { id: 'i' + i, art: n, x, y: 10, w: 180, h: 180, edge: 5, hidden: true, idle: { y: 4, f: 0.8, ph: i } }); });
    const p = F.piece(fitIn(o, { w: names.length * 220, h: 200, layers }));
    p.light = (i, at) => { p.L('i' + i).pop(at, { from: 0.6, sfx: 'chime', db: -14 }); p.L('d' + i).hide(T(at) + 0.05); return p; };
    return p;
  };
  /* ---- c03 ---- */
  F.forum = (o = {}) => F.piece(fitIn(o, { w: 600, h: 540, enter: 'drop', layers: [{ id: 'page', art: 'forum', x: 0, y: 0, w: 600, h: 540, paper: true, edge: 5 }, { id: 'title', key: 'forum', x: 30, y: 58, w: 540, h: 58, max: 46, color: '#FFFDF6' }] }));
  /** clip cards raining onto a pile between at and at+dur (n cards), layers c0..c(n-1) */
  F.clipRain = (n, at, dur, o = {}) => {
    const W = 560, H = 420, layers = [];
    for (let i = 0; i < n; i++) { const col = i % 5, row = Math.floor(i / 5); layers.push({ id: 'c' + i, art: 'clipCard', ao: { v: i }, x: 20 + col * 104 + (row % 2) * 30 - (row > 2 ? 20 : 0), y: H - 110 - row * 58 - (col % 2) * 10, w: 140, h: 100, edge: 3, hidden: true, rot: ((i * 47) % 30) - 15 }); }
    const p = F.piece(fitIn(o, { w: W, h: H, enter: 'none', layers }));
    const a = T(at); for (let i = 0; i < n; i++) { const t = a + (dur * i) / n; p.L('c' + i).drop(t, { dy: 700, dur: 0.45, sfx: i % 3 === 0 ? 'flip' : false, db: -16 }); }
    return p;
  };
  /** office: desks row + 4 workers (w<i> calm, x<i> shocked: F.officeShock(p, at)) */
  F.office = (o = {}) => {
    const layers = []; for (let i = 0; i < 4; i++) { const x = 40 + i * 220; layers.push({ id: 'w' + i, art: 'worker', ao: { i }, x, y: 20, w: 140, h: 172, paper: true, edge: 3, idle: { y: 2, f: 0.7, ph: i } }, { id: 'x' + i, art: 'worker', ao: { i, shocked: true }, x, y: 20, w: 140, h: 172, paper: true, edge: 3, hidden: true, idle: { y: 3, rot: 2, f: 1.4, ph: i } }); }
    layers.push({ id: 'desks', art: 'desks', x: 0, y: 130, w: 900, h: 180, edge: 6 });
    const p = F.piece(fitIn(o, { w: 900, h: 310, layers }));
    p.shock = (at) => { for (let i = 0; i < 4; i++) { const t = T(at) + i * 0.12; p.L('w' + i).hide(t); p.L('x' + i).pop(t, { from: 0.8, sfx: i === 0 ? 'pop' : false }); p.L('x' + i).to({ y: -14 }, { at: t, dur: 0.12, ease: 'outQuad' }).to({ y: 0 }, { at: t + 0.12, dur: 0.2, ease: 'bounce' }); } return p; };
    return p;
  };
  F.chat = (o = {}) => F.piece(fitIn(o, { w: 660, h: 300, enter: 'drop', layers: [{ id: 'bub', art: 'bubble', x: 0, y: 0, w: 660, h: 300, paper: true, edge: 4 },
    { id: 'hd', key: 'staff_chat', x: 70, y: 14, w: 540, h: 48, max: 34, color: '#FFFDF6', align: 'start' }, { id: 'msg', key: 'thief_msg', x: 40, y: 80, w: 580, h: 160, font: 'display', max: 54, lines: 3, color: '#B5260E' }] }));
  /** 24:00:00 timer counting down (fast) from `at` */
  F.timer24 = (o = {}) => { const a = T(o.start || o.at), rate = o.rate || 700; return F.piece(fitIn(o, { w: 340, h: 140, enter: 'slam', layers: [{ id: 'body', art: 'timer', x: 0, y: 0, w: 340, h: 140, edge: 6 },
    { id: 'd', text: K.digit('24:00:00'), x: 26, y: 26, w: 288, h: 88, max: 70, color: '#FF5A3C', tcss: { textShadow: '0 0 12px rgba(255,60,30,0.8)', direction: 'ltr' },
      textAt: (t) => { const s = Math.max(0, 86400 - Math.max(0, t - a) * rate), hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = Math.floor(s % 60); return K.digit(`${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`); } }] })); };
  F.spy = (o = {}) => F.piece(fitIn(o, { w: 380, h: 440, enter: 'rise', layers: [{ id: 'spy', art: 'spy', x: 0, y: 0, w: 280, h: 440, edge: 7, idle: { rot: 1.5, f: 0.5 } }, { id: 'q', art: 'qmark', x: 240, y: 10, w: 140, h: 200, edge: 4, hidden: true, idle: { rot: 6, f: 0.9 } }] }));
  /** UK map (original drawing) with a pin on England: P.map with an inline SVG */
  F.ukMap = (o = {}) => { const [w, hh, body] = ART.ukMap(); return P.map('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgDoc([w, hh], body, w * 2, hh * 2)), [{ x: 0.66, y: 0.75, key: 'england', at: o.pinAt || o.at }], { slot: o.slot || 'right', at: o.at, out: o.out, size: o.size || 0.9, pos: o.pos }); };
  /** laptop + evidence bag: F.bagIt(p, at) drops the laptop into the bag, then the label stamps */
  F.laptopBag = (o = {}) => {
    const p = F.piece(fitIn(o, { w: 400, h: 560, layers: [
      { id: 'bag', art: 'bag', x: 10, y: 220, w: 380, h: 330, edge: 3, paper: true },
      { id: 'lab', key: 'police', x: 60, y: 420, w: 280, h: 90, max: 44, lines: 2, color: '#B5260E', hidden: true },
      { id: 'lap', art: 'laptop', x: 40, y: 0, w: 320, h: 220, edge: 5 },
      { id: 'front', art: 'bagFront', x: 10, y: 220, w: 380, h: 330, flat: true },
    ] }));
    p.bagIt = (at) => { const a = T(at); p.L('lap').to({ y: 196, rot: -6, sc: 0.8 }, { at: a, dur: 0.5, ease: 'inBack(1.2)' }); K.sfx('rustle', a + 0.4, { db: -10 }); p.L('lab').slam(a + 0.7, { sfx: 'stamp', amp: 5 }); return p; };
    return p;
  };
  /** hotel room: layers room, tv (art), tvOn (hidden), glow, nopc (hidden) */
  F.hotelRoom = (o = {}) => F.piece(fitIn(o, { w: 940, h: 640, enter: 'none', layers: [
    { id: 'room', art: 'room', x: 0, y: 0, w: 940, h: 640, edge: 6, flutes: true },
    { id: 'glow', art: 'glow', x: 370, y: 230, w: 300, h: 300, flat: true, idle: { sc: 0.04, f: 0.3 } },
    { id: 'tv', art: 'tv', x: 60, y: 120, w: 392, h: 280, edge: 6 },
    { id: 'tvOff', art: 'screenOff', x: 82, y: 141, w: 347, h: 196, flat: true },
    { id: 'tvOn', x: 82, y: 141, w: 347, h: 196, hidden: true, dom: codeScreen },
    { id: 'nopc', art: 'noPC', x: 120, y: 430, w: 170, h: 170, edge: 4, hidden: true, idle: { rot: 3, f: 0.6 } },
  ] }));
  /** map with the green TV on the left, dotted route, the '6' vault box on the right (lid pops: F.vaultOpen) */
  F.vaultMap = (o = {}) => {
    const route = [[190, 360], [330, 250], [470, 330], [600, 230], [690, 300]], dots = [];
    for (let i = 0; i < route.length - 1; i++) for (let s = 0; s < 6; s++) { const p = s / 6; dots.push([route[i][0] + (route[i + 1][0] - route[i][0]) * p, route[i][1] + (route[i + 1][1] - route[i][1]) * p]); }
    const p = F.piece(fitIn(o, { w: 940, h: 560, enter: 'none', layers: [
      { id: 'map', art: 'mapPaper', x: 0, y: 0, w: 940, h: 560, paper: true, edge: 5 },
      { id: 'dots', x: 0, y: 0, w: 940, h: 560, dom: (el, K_, k, L) => { L.dots = dots.map(([x, y]) => { const d = h('div', '', el); d.style.cssText = `position:absolute;left:${(x - 7) * k}px;top:${(y - 7) * k}px;width:${14 * k}px;height:${14 * k}px;border-radius:50%;background:${COL.verm};box-shadow:1px 2px 0 rgba(0,0,0,0.3)`; return d; }); },
        paint: (t, L) => { if (!L.dots || L.drawAt == null) return; const n = L.dots.length; L.dots.forEach((d, i) => setOp(d, t >= L.drawAt + (L.drawDur * i) / n ? 1 : 0)); } },
      { id: 'tv', art: 'tvIcon', x: 60, y: 290, w: 170, h: 152, edge: 5, idle: { sc: 0.03, f: 1.2 } },
      ...F._boxLayers(K.digit('6'), 680, 150, 210, 270, { pal: 'six' }),
      { id: 'dial', art: 'dial', x: 740, y: 330, w: 90, h: 90, edge: 3 },
      { id: 'lid', art: 'lid', x: 678, y: 92, w: 214, h: 70, edge: 4, origin: '4% 92%' },
      { id: 'burst', art: 'burst', x: 700, y: 20, w: 180, h: 160, edge: 4, hidden: true },
    ] }));
    p.route = (at, dur = 2) => { const L = p.ids.dots; L.drawAt = T(at); L.drawDur = dur; K.sfx('scratch', T(at), { dur, db: -12 }); return p; };
    p.open = (at) => { const a = T(at); p.L('lid').to({ rot: -62, y: -20, x: -10 }, { at: a, dur: 0.35, ease: 'back(2.2)' }); p.L('dial').to({ rot: 270 }, { at: a - 0.5, dur: 0.5, ease: 'inOutCubic' }); p.L('burst').pop(a + 0.05, { sfx: 'hit', db: -6 }); K.cam.shake(a + 0.05, { amp: 12, dur: 0.4 }); K.sfx('sting', a, { db: -10 }); return p; };
    return p;
  };
  /** court bench (layers bench, plate text, gavel: F.gavelTap) */
  F.bench = (o = {}) => { const p = F.piece(fitIn(o, { w: 780, h: 400, enter: 'rise', layers: [{ id: 'bench', art: 'bench', x: 0, y: 0, w: 780, h: 400, edge: 8, flutes: true }, { id: 'plate', key: 'court', x: 296, y: 186, w: 188, h: 58, max: 44, color: '#3B2A18' },
    { id: 'gavel', art: 'gavel', x: 470, y: 10, w: 180, h: 100, edge: 4, origin: '85% 60%' }] }));
    p.tap = (at, n = 1) => { for (let i = 0; i < n; i++) { const a = T(at) + i * 0.5; p.L('gavel').to({ rot: -28 }, { at: a, dur: 0.18, ease: 'outQuad' }).to({ rot: 0 }, { at: a + 0.18, dur: 0.1, ease: 'inQuad' }); K.sfx('thud', a + 0.27, { db: -8 }); } return p; };
    return p; };
  /** receipt that prints out (grows down) with an amount + a line label */
  F.bill = (o = {}) => F.piece(fitIn(o, { w: 280, h: 400, enter: 'grow', layers: [{ id: 'paper', art: 'bill', x: 0, y: 0, w: 280, h: 400, paper: true, edge: 2 },
    { id: 'amt', text: o.amount, x: 20, y: 40, w: 240, h: 100, max: 54, color: '#B5260E' }, ...(o.label ? [{ id: 'lab', key: o.label, x: 20, y: 170, w: 240, h: 110, max: 40, lines: 2, color: '#3B2A18' }] : [])] }));
  /** stack of clock faces popping in one by one: layers k0..k(n-1), F.clocks(...).stack(at, gap) */
  F.clocks = (n = 6, o = {}) => { const layers = []; for (let i = 0; i < n; i++) layers.push({ id: 'k' + i, art: 'clock', x: 20 + (i % 2) * 40, y: 30 + (n - 1 - i) * 62, w: 110, h: 110, edge: 4, hidden: true, rot: (i % 3 - 1) * 8, idle: { rot: 2, f: 0.8, ph: i } });
    const p = F.piece(fitIn(o, { w: 180, h: n * 62 + 100, enter: 'none', layers })); p.stack = (at, gap = 0.22) => { for (let i = 0; i < n; i++) p.L('k' + i).pop(T(at) + i * gap, { sfx: i % 2 ? false : 'tick', db: -10 }); return p; }; return p; };
  /** hospital with a gate (F.hospital(...).openGate(at)) - calm, no faces */
  F.hospital = (o = {}) => { const p = F.piece(fitIn(o, { w: 600, h: 444, enter: 'rise', layers: [{ id: 'bld', art: 'hospital', x: 0, y: 0, w: 600, h: 444, edge: 8, flutes: true }, { id: 'sign', key: 'hospital', x: 220, y: 274, w: 160, h: 32, max: 28, color: '#2E5E4A' },
    { id: 'gL', art: 'gate', x: 224, y: 320, w: 76, h: 122, edge: 3 }, { id: 'gR', art: 'gate', x: 300, y: 320, w: 76, h: 122, edge: 3 }] }));
    p.openGate = (at, dur = 1.4) => { p.L('gL').to({ x: -70 }, { at, dur, ease: 'inOutSine' }); p.L('gR').to({ x: 70 }, { at, dur, ease: 'inOutSine' }); K.sfx('slide-long', T(at), { db: -16 }); return p; };
    return p; };
  F.courthouse = (o = {}) => F.cut('courthouse', fitIn(o, { fit: 0.6 }));
  /** shop window seen from inside: crowd heads pressed on the glass, the '6' box on a stand in front */
  F.shopWindow = (o = {}) => {
    const layers = [{ id: 'wall', art: 'window', x: 0, y: 0, w: 900, h: 580, edge: 6, flutes: true }];
    for (let i = 0; i < 9; i++) { const x = 60 + (i % 5) * 160 + (i >= 5 ? 80 : 0), y = i >= 5 ? 300 : 190; layers.push({ id: 'h' + i, art: 'head', ao: { expr: 'press', col: HEAD_COLS[(i * 3) % HEAD_COLS.length] }, x, y, w: 150, h: 180, paper: true, edge: 3, hidden: true, idle: { y: 4, x: 3, f: 1.1 + (i % 3) * 0.2, ph: i } }); }
    layers.push({ id: 'glass', art: 'glass', x: 50, y: 130, w: 800, h: 400, flat: true }, { id: 'frame', art: 'windowFrame', x: 0, y: 0, w: 900, h: 580, edge: 6 },
      { id: 'stand', art: 'stand', x: 270, y: 480, w: 360, h: 120, edge: 6 }, ...F._boxLayers(K.digit('6'), 370, 260, 160, 206, { pal: 'six' }));
    const p = F.piece(fitIn(o, { w: 900, h: 600, layers }));
    p.press = (at, gap = 0.1) => { for (let i = 0; i < 9; i++) p.L('h' + i).pop(T(at) + i * gap, { from: 0.5, sfx: i % 3 ? false : 'tap', db: -12 }); return p; };
    return p;
  };
  /** full-stage dim (hud, below the captions): F.dim(at, to, dur) */
  let dimP = null;
  F.dim = (at, to = 0.45, dur = 0.8) => {
    if (!dimP) { dimP = new Piece(K, { plane: 'hud', slot: { x: K.W / 2 - 1, y: K.H / 2 - 1, w: 2, h: 2 }, w: K.W, h: K.H, k: 1, at: 0, enter: 'none', layers: [{ id: 'd', x: 0, y: 0, w: K.W, h: K.H, op: 0, dom: (el) => { el.style.background = 'radial-gradient(ellipse at 50% 40%, rgba(5,8,20,0.55), rgba(2,3,10,0.95))'; } }] }); dimP.v.op = 1; F._dim = dimP; }
    dimP.L('d').to({ op: to }, { at, dur, ease: 'inOutSine' }); return dimP;
  };

  /* =============== v1 makers (first versions: refine where your chapter needs it) =============== */
  F.coins = (o = {}) => F.cut('coins', fitIn(o, { ao: { n: o.n || 6 }, fit: 0.5, enter: 'grow' }));
  F.priceTag = (str, o = {}) => F.piece(fitIn(o, { w: 300, h: 170, enter: 'drop', idle: { rot: 3, f: 0.6 }, layers: [{ id: 'tag', art: 'priceTag', x: 0, y: 0, w: 300, h: 170, paper: true, edge: 3 }, { id: 't', text: str, x: 70, y: 22, w: 210, h: 126, max: 80, color: '#B5260E' }] }));
  F.filmCan = (key, o = {}) => F.piece(fitIn(o, { w: 260, h: 330, layers: [{ id: 'can', art: 'filmCan', x: 0, y: 0, w: 260, h: 260, edge: 6 }, ...(key ? [{ id: 'lab', key, x: 10, y: 262, w: 240, h: 64, max: 44, color: '#FFFDF6', tcss: { textShadow: '2px 3px 0 #1E1712' } }] : [])] }));
  /** video player frame with an original sunset-beach picture and a progress bar (F.player(...).play(at, dur)) */
  F.player = (o = {}) => { const p = F.piece(fitIn(o, { w: 900, h: 560, enter: 'drop', layers: [{ id: 'frame', art: 'player', x: 0, y: 0, w: 900, h: 560, edge: 8 }, { id: 'pic', art: 'beach', x: 30, y: 30, w: 840, h: 440, flat: true },
    { id: 'bar', x: 30, y: 500, w: 840, h: 14, dom: (el) => { el.style.background = COL.verm; el.style.borderRadius = '7px'; el.style.transformOrigin = '0 50%'; }, origin: '0% 50%' }] }));
    p.ids.bar.v.sx = 0.001; p.play = (at, dur) => { K.tl.to(p.ids.bar.v, { sx: [0.001, 1] }, { at: T(at), dur, ease: 'linear' }); return p; }; return p; };
  /** timeline strip with year/date ticks (string keys) and a flag pin: F.timelineStrip({keys:['tl_a','tl_b']}).plant(i, at) */
  F.timelineStrip = (o = {}) => { const keys = o.keys || [], n = Math.max(1, keys.length), layers = [{ id: 'strip', x: 0, y: 150, w: 900, h: 60, dom: (el) => { el.style.background = COL.paper; el.style.boxShadow = '3px 5px 0 rgba(60,35,10,0.35)'; } }];
    keys.forEach((k, i) => { const x = (rtl ? n - 1 - i : i) * (840 / Math.max(1, n - 1 || 1)) + 30; layers.push({ id: 'k' + i, key: k, x: x - 90, y: 220, w: 180, h: 70, max: 34, lines: 2 }); });
    layers.push({ id: 'flag', art: 'flag', x: 0, y: 20, w: 90, h: 150, edge: 3 });
    const p = F.piece(fitIn(o, { w: 900, h: 300, enter: 'slide', layers }));
    p.plant = (i, at) => { const x = (rtl ? n - 1 - i : i) * (840 / Math.max(1, n - 1 || 1)) + 30 - 14; p.L('flag').to({ y: -60 }, { at: T(at) - 0.3, dur: 0.15 }).to({ x }, { at: T(at) - 0.15, dur: 0.3 }).to({ y: 0 }, { at: T(at) + 0.15, dur: 0.15, ease: 'inQuad' }); K.sfx('tap', T(at) + 0.3, { db: -10 }); return p; };
    return p; };
  F.delayedStamp = (o = {}) => P.stamp('delayed', { big: o.big, slot: o.slot || 'board', pos: o.pos || [0.5, 0.5], at: o.at, out: o.out, tilt: o.tilt });
  /** shop front with a shelf: layers wall + shelf + optional box numeral ('5') */
  F.shop = (o = {}) => F.piece(fitIn(o, { w: 900, h: 600, layers: [{ id: 'wall', art: 'window', x: 0, y: 0, w: 900, h: 580, edge: 6, flutes: true }, { id: 'shelf', x: 120, y: 420, w: 660, h: 26, dom: (el) => { el.style.background = '#8B5A35'; el.style.boxShadow = '0 6px 0 #5A3A22'; } },
    ...(o.numeral ? F._boxLayers(K.digit(String(o.numeral)), 360, 200, 170, 220, { pal: String(o.numeral) === '5' ? 'five' : 'six' }) : []), { id: 'frame', art: 'windowFrame', x: 0, y: 0, w: 900, h: 580, edge: 6 }] }));
  F.console = (o = {}) => F.cut('console', fitIn(o, { ao: { col: o.col }, fit: 0.4 }));
  F.parliament = (o = {}) => F.cut('parliament', fitIn(o, { fit: 0.8 }));
  F.newspaper = (key, o = {}) => F.piece(fitIn(o, { w: 460, h: 580, enter: 'drop', layers: [{ id: 'np', art: 'newspaper', x: 0, y: 0, w: 460, h: 580, paper: true, edge: 3 }, { id: 'hl', key, x: 26, y: 20, w: 408, h: 96, max: 64, lines: 2 }] }));
  F.newsSet = (key, o = {}) => F.piece(fitIn(o, { w: 800, h: 460, layers: [{ id: 'desk', art: 'newsDesk', x: 0, y: 40, w: 800, h: 420, edge: 7 }, { id: 'host', art: 'presenter', x: 300, y: 0, w: 200, h: 260, edge: 5, idle: { y: 3, f: 0.8 } }, ...(key ? [{ id: 'tick', key, x: 70, y: 264, w: 660, h: 50, max: 40, color: '#FFFDF6' }] : [])] }));
  F.volcano = (o = {}) => F.cut('volcano', fitIn(o, { fit: 0.8 }));
  F.lemonade = (o = {}) => F.cut('lemonade', fitIn(o, { fit: 0.4 }));
  F.flipBook = (o = {}) => F.piece(fitIn(o, { w: 260, h: 200, layers: [{ id: 'book', art: 'flipBook', x: 0, y: 0, w: 260, h: 200, paper: true, edge: 3 }, { id: 'car', art: 'car', x: 50, y: 70, w: 160, h: 90, edge: 2, paint: (t, L) => { const fps = o.fps || 6, x = ((Math.floor(t * fps) % 6) - 2.5) * 14; L.el.style.transform = `translate(${x}px,0)`; } }] }));
  F.mum = (o = {}) => F.cut('mum', fitIn(o, { fit: 0.8, idle: { rot: 1, f: 0.4 } }));
  F.match = (o = {}) => F.cut('match', fitIn(o, { fit: 0.5 }));
  F.padlock = (o = {}) => F.cut('padlock', fitIn(o, { fit: 0.4 }));
  F.scaleProp = (o = {}) => F.cut('scale', fitIn(o, { fit: 0.7 }));
  F.register = (o = {}) => F.cut('register', fitIn(o, { fit: 0.7 }));
  F.bin = (o = {}) => F.cut('bin', fitIn(o, { fit: 0.4 }));
  return F;
}

/* ---------- small DOM painters ---------- */
/** green code screen: scrolling bars, deterministic from t */
function codeScreen(el, K, k, L) {
  el.style.background = '#06200F'; el.style.overflow = 'hidden'; el.style.borderRadius = 6 * k + 'px'; el.style.boxShadow = `inset 0 0 ${30 * k}px rgba(76,255,122,0.35)`;
  const inner = h('div', '', el); inner.style.cssText = 'position:absolute;left:0;top:0;width:100%';
  const lw = L.w * k, rows = 40;
  for (let i = 0; i < rows; i++) { const b = h('div', '', inner); const w = 18 + ((i * 53) % 70); b.style.cssText = `position:absolute;left:${(8 + (i % 4) * 5) * k}px;top:${i * 22 * k}px;width:${(w / 100) * lw * 0.85}px;height:${9 * k}px;border-radius:${4 * k}px;background:${i % 7 === 3 ? '#B8FFCB' : '#4CFF7A'};opacity:${0.55 + (i % 3) * 0.2}`; }
  L.paint = (t) => { const y = -((t * 60 * k) % (20 * 22 * k)); const s = `translate(0px,${y.toFixed(1)}px)`; if (inner.__t !== s) { inner.__t = s; inner.style.transform = s; } };
}
/** marker ring drawn on (F.drawOn sets drawAt/drawDur) */
function markerRing(el, K, k, L) {
  const ns = 'http://www.w3.org/2000/svg', w = L.w * k, hh = L.h * k, svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', w); svg.setAttribute('height', hh); svg.setAttribute('class', 'marker'); el.appendChild(svg);
  const p = document.createElementNS(ns, 'path'); p.setAttribute('d', `M${w * 0.55} ${hh * 0.06} C${w * 1.02} ${hh * 0.02} ${w * 1.04} ${hh * 0.95} ${w * 0.5} ${hh * 0.96} C${-w * 0.04} ${hh * 0.97} ${-w * 0.02} ${hh * 0.08} ${w * 0.62} ${hh * 0.12}`);
  p.setAttribute('pathLength', '1'); p.style.stroke = '#D2361A'; p.style.strokeWidth = Math.max(4, 7 * k); p.style.strokeDasharray = '1 1'; p.style.strokeDashoffset = '1'; svg.appendChild(p);
  L.paint = (t) => { const a = L.drawAt == null ? -1 : L.drawAt, d = L.drawDur || 0.6, s = (1 - ease('inOutCubic')(win(t, a, a + d))).toFixed(3); if (p.__d !== s) { p.__d = s; p.style.strokeDashoffset = s; } };
}
