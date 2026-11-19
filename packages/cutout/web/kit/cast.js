/* Karto kit - cast: static cutout actors on sticks. Pose = instant plate swap with a pop; talk bob + mouth swap come
   automatically from show.lines (who === actor id). Everything is a pure function of t. */
import { h, setTf, setOp, clamp } from './core.js';
import { bake, svgImage } from './tex.js';
import { karto, skip, KARTO_POSES, SKIP_POSES } from './art.js';

const ALIAS = { 'talk-open': 'talk', pointL: 'point<', 'point-left': 'point<', pointR: 'point', 'point-right': 'point', annoyed: 'deadpan', 'lean-in': 'whisper', 'mind-blown': 'mindblown', 'about-to-skip': 'skip', comment: 'typing' };

export class Actor {
  constructor(K, id, o) {
    this.K = K; this.id = id; this.art = o.art; this.poses = o.poses; this.home = o.home; this.ev = []; this.used = new Set(['neutral', 'talk']);
    this.v = { x: 0, y: 0, rot: 0, sc: 1, op: 1, lift: 0, fx: 1, sqy: 1, bx: 0, by: 0, bs: 1 };
    const st = K.L.stand[o.home]; this.v.bx = st.x; this.v.by = st.floor; this.v.bs = st.s;
    this.talk = []; this.open = []; this.cache = new Map(); this.cur = null;
  }
  /* ---- API ---- */
  /** pose(name, {at, mirror}) - instant plate swap with a pop. 'pointL' = mirrored point. */
  pose(name, o = {}) {
    let n = ALIAS[name] || name, mirror = !!o.mirror;
    if (n.endsWith('<')) { n = n.slice(0, -1); mirror = true; }
    if (!this.poses[n]) { this.K.lint.push(`${this.id}.pose: unknown pose "${name}" (have ${Object.keys(this.poses).join(', ')})`); n = 'neutral'; }
    const at = this.K.T(o.at);
    this.ev.push({ t: at, pose: n, mirror, i: this.ev.length }); this.used.add(n);
    if (o.sfx !== false && at > 0.05) this.K.sfx(o.sfx || 'pop', at, { db: -14 });
    return this;
  }
  /** enter({from 'left'|'right'|'bottom', at, dur}) - hidden before at */
  enter(o = {}) {
    const at = this.K.T(o.at), dur = o.dur || 0.7, from = o.from || (this.home === 'right' ? 'right' : 'left'), tl = this.K.tl, v = this.v;
    tl.set(v, { op: 0 }, 0); tl.set(v, { op: 1 }, at);
    if (from === 'bottom') { tl.to(v, { y: [700, 0] }, { at, dur, ease: 'back(1.5)' }); }
    else {
      const dx = from === 'left' ? -1200 : 1200;
      tl.to(v, { x: [dx, 0] }, { at, dur, ease: 'outCubic' });
      this._steps(at, dur, 3, 28);
    }
    this.K.sfx('whoosh', at); return this;
  }
  /** exit({to 'left'|'right'|'bottom', at, dur}) */
  exit(o = {}) {
    const at = this.K.T(o.at), dur = o.dur || 0.6, to = o.to || (this.home === 'right' ? 'right' : 'left'), tl = this.K.tl, v = this.v;
    if (to === 'bottom') tl.to(v, { y: 700 }, { at, dur, ease: 'inBack(1.4)' });
    else { tl.to(v, { x: to === 'left' ? -1200 : 1200 }, { at, dur, ease: 'inCubic' }); this._steps(at, dur, 3, 24); }
    tl.set(v, { op: 0 }, at + dur); this.K.sfx('whoosh', at); return this;
  }
  /** hop({at, h 70}) - jump on the stick with a squash on landing */
  hop(o = {}) {
    const at = this.K.T(o.at), hh = o.h || 70, tl = this.K.tl, v = this.v;
    tl.to(v, { sqy: 0.9 }, { at, dur: 0.07, ease: 'outQuad' });
    tl.to(v, { sqy: 1.06 }, { at: at + 0.07, dur: 0.12, ease: 'outQuad' });
    tl.to(v, { lift: hh }, { at: at + 0.07, dur: 0.2, ease: 'outQuad' });
    tl.to(v, { lift: 0 }, { at: at + 0.27, dur: 0.18, ease: 'inQuad' });
    tl.to(v, { sqy: 0.88 }, { at: at + 0.45, dur: 0.05, ease: 'outQuad' });
    tl.to(v, { sqy: 1 }, { at: at + 0.5, dur: 0.22, ease: 'back(2.5)' });
    this.K.sfx(o.sfx || 'boing', at + 0.07, { db: -12 }); return this;
  }
  /** tilt({deg, at, dur}) - lean (stays until the next tilt; tilt({deg: 0}) to straighten) */
  tilt(o = {}) { this.K.tl.to(this.v, { rot: o.deg == null ? 8 : o.deg }, { at: this.K.T(o.at), dur: o.dur || 0.35, ease: 'back(2)' }); return this; }
  /** lookAt('left'|'right'|actor, {at}) - turn the cutout (paper flip through edge-on) */
  lookAt(dir, o = {}) {
    let s = 1;
    if (dir === 'left') s = -1; else if (dir === 'right') s = 1; else if (dir && dir.v) s = dir.v.bx < this.v.bx ? -1 : 1; else if (dir === 'front') s = 1;
    const at = this.K.T(o.at);
    this.K.tl.to(this.v, { fx: s }, { at, dur: o.dur || 0.22, ease: 'inOutCubic' });
    this.K.sfx('swish', at, { db: -16 }); return this;
  }
  /** moveTo(stand slot, {at, dur}) - carried across on the stick in little steps */
  moveTo(slot, o = {}) {
    const st = this.K.L.stand[slot]; if (!st) { this.K.lint.push(`${this.id}.moveTo: unknown slot "${slot}"`); return this; }
    const at = this.K.T(o.at), dur = o.dur || 0.9;
    this.K.tl.to(this.v, { bx: st.x, by: st.floor, bs: st.s }, { at, dur, ease: 'inOutCubic' });
    this._steps(at, dur, Math.max(2, Math.round(dur * 4)), 26); this.K.sfx('slide', at, { db: -14 }); return this;
  }
  nod(o = {}) {
    const at = this.K.T(o.at), tl = this.K.tl, v = this.v;
    for (let i = 0; i < (o.times || 2); i++) { tl.to(v, { y: 16, rot: 3 }, { at: at + i * 0.3, dur: 0.12, ease: 'outQuad' }); tl.to(v, { y: 0, rot: 0 }, { at: at + i * 0.3 + 0.12, dur: 0.16, ease: 'outQuad' }); }
    return this;
  }
  shake(o = {}) {
    const at = this.K.T(o.at), tl = this.K.tl, v = this.v, a = o.deg || 7;
    for (let i = 0; i < (o.times || 3); i++) { tl.to(v, { rot: i % 2 ? a : -a }, { at: at + i * 0.13, dur: 0.13, ease: 'inOutCubic' }); }
    tl.to(v, { rot: 0 }, { at: at + (o.times || 3) * 0.13, dur: 0.14, ease: 'outQuad' }); return this;
  }
  /** scale bump (grow for emphasis) */
  pulse(o = {}) { const at = this.K.T(o.at), tl = this.K.tl; tl.to(this.v, { sc: o.to || 1.12 }, { at, dur: 0.14, ease: 'outQuad' }); tl.to(this.v, { sc: 1 }, { at: at + 0.14, dur: 0.3, ease: 'back(2)' }); return this; }
  _steps(at, dur, n, amp) { const tl = this.K.tl; for (let i = 0; i < n; i++) { const a = at + (dur * i) / n, d = dur / n; tl.to(this.v, { lift: amp }, { at: a, dur: d / 2, ease: 'outQuad' }); tl.to(this.v, { lift: 0 }, { at: a + d / 2, dur: d / 2, ease: 'inQuad' }); } }
  /** current head position in stage px + plane depth (for camera focus and bubbles) */
  center() { const p = this.art('neutral'); const s = this.v.bs; return [this.v.bx + (p.head[0] - p.ax) * s, this.v.by + (p.head[1] - p.ay) * s, 0.92]; }

  /* ---- build ---- */
  plan() {
    this.ev.sort((a, b) => a.t - b.t || a.i - b.i);
    // talk windows + mouth-open intervals from the line word times
    for (const ln of this.K.show.lines || []) {
      if (ln.who !== this.id) continue;
      this.talk.push([ln.t0, ln.t1]);
      const words = ln.words && ln.words.length ? ln.words : [{ w: ln.text || '', t0: ln.t0, t1: ln.t1 }];
      for (const w of words) {
        const letters = String(w.w).replace(/[^\p{L}\p{N}]/gu, '').length;
        const syl = Math.max(1, Math.round(letters / (/[؀-ۿ]/.test(w.w) ? 2.6 : 3)));
        const d = (w.t1 - w.t0) / syl;
        for (let k = 0; k < syl; k++) this.open.push([w.t0 + k * d, w.t0 + k * d + d * 0.58]);
      }
    }
    this.open.sort((a, b) => a[0] - b[0]);
  }
  async build(parent) {
    const poses = [...this.used].filter((p) => this.poses[p]);
    for (const p of poses) for (const op of [false, true]) {
      const key = p + (op ? '+' : '');
      const a = this.art(p, op), img = await svgImage(a.svg);
      const b = bake(img, a.w, a.h, { edge: 8, blur: 12, stock: this.id === 'skip' ? 'paper' : 'kraft', flutes: this.id !== 'skip' });
      this.cache.set(key, { b, a });
    }
    const any = this.cache.get('neutral').b, a0 = this.cache.get('neutral').a;
    this.el = h('div', 'actor actor--' + this.id, parent);
    this.inner = h('div', 'actor__in', this.el);
    this.shc = h('canvas', 'actor__sh', this.inner); this.fc = h('canvas', 'actor__face', this.inner);
    for (const c of [this.shc, this.fc]) { c.width = any.face.width; c.height = any.face.height; c.style.width = any.w + 'px'; c.style.height = any.h + 'px'; c.style.left = -(any.pad + a0.ax) + 'px'; c.style.top = -(any.pad + a0.ay) + 'px'; }
    this.fctx = this.fc.getContext('2d'); this.sctx = this.shc.getContext('2d');
  }
  _poseAt(t) { let e = null; for (const x of this.ev) { if (x.t <= t) e = x; else break; } return e; }
  _isOpen(t) { const o = this.open; let lo = 0, hi = o.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (o[m][1] <= t) lo = m + 1; else if (o[m][0] > t) hi = m - 1; else return true; } return false; }
  _talkAmt(t) { for (const [a, b] of this.talk) if (t >= a - 0.1 && t <= b + 0.15) return clamp(Math.min((t - a + 0.1) / 0.12, (b + 0.15 - t) / 0.15), 0, 1); return 0; }
  seek(t) {
    if (!this.el) return;
    const v = this.v, e = this._poseAt(t), pose = e ? e.pose : 'neutral', mirror = e ? e.mirror : false;
    const talking = this._talkAmt(t), open = pose === 'talk' || (talking > 0 && this._isOpen(t));
    const plate = pose === 'neutral' && open ? 'talk' : pose, key = plate + (open && plate !== 'talk' ? '+' : '');
    const c = this.cache.get(key) || this.cache.get(plate) || this.cache.get('neutral');
    if (this.cur !== key) {
      this.cur = key;
      this.fctx.clearRect(0, 0, this.fc.width, this.fc.height); this.fctx.drawImage(c.b.face, 0, 0);
      this.sctx.clearRect(0, 0, this.shc.width, this.shc.height); this.sctx.drawImage(c.b.shadow, 0, 0);
    }
    // pop on pose change: overshoot + tiny kick
    let pop = 1, kick = 0;
    if (e && t - e.t < 0.32 && e.t > 0.05) { const p = (t - e.t) / 0.32; pop = 1 + 0.16 * Math.sin(p * Math.PI) * (1 - p) * 1.6; kick = Math.sin(p * Math.PI * 2) * (1 - p) * 4; }
    const bob = talking ? -Math.abs(Math.sin(t * Math.PI * 2.4)) * 7 * talking : 0;
    const wob = talking ? Math.sin(t * Math.PI * 2 * 1.3) * 1.8 * talking : 0;
    const s = v.bs * v.sc * pop, fx = v.fx * (mirror ? -1 : 1);
    setOp(this.el, v.op);
    setTf(this.el, v.bx + v.x, v.by + v.y - v.lift + bob, v.rot + wob + kick, s * fx * (1 + (1 - v.sqy) * 0.6), s * v.sqy);
    // shadow falls further back to the lower right when lifted
    const sl = (18 + v.lift * 0.35) * (fx < 0 ? -1 : 1), sd = 14 + v.lift * 0.45;
    const st = `translate(${sl.toFixed(1)}px,${sd.toFixed(1)}px)`;
    if (this.shc.__t !== st) { this.shc.__t = st; this.shc.style.transform = st; this.shc.style.opacity = String(clamp(1 - v.lift / 260, 0.4, 1).toFixed(2)); }
  }
}

export function makeCast(K) {
  return {
    karto: new Actor(K, 'karto', { art: karto, poses: KARTO_POSES, home: 'left' }),
    skip: new Actor(K, 'skip', { art: skip, poses: SKIP_POSES, home: 'right' }),
  };
}
