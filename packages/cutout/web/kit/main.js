/* Karto kit - page contract: window.__load(show, opts) -> {cues, lint, marks}, window.__seek(t), window.__ready.
   Builds the stage, runs the film script (show.film, default export build(K)), bakes everything once, then every seek is a
   pure function of t. ?dev=1&show=<path> opens a scrubber. */
import { Timeline, h, arDigits, clamp } from './core.js';
import { LAYOUTS, buildStage, buildBox, Backdrops, Camera, slotRect } from './stage.js';
import { makeCast } from './cast.js';
import { makeProps } from './props.js';
import { buildCaptions } from './captions.js';
import { card, STOCK } from './tex.js';

const FONTS = { en: ["400 60px 'K Display'", "400 60px 'K Marker'"], ar: ["400 60px 'K Display AR'", "700 60px 'K Text AR'", "600 60px 'K Text AR'"] };
let STATE = null;
/* every 2D canvas CPU-backed: GPU canvases become composited layers, and DOM that overlaps them gets promoted too,
   whose raster then depends on seek history (seek determinism). */
const _gc = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, o) { return _gc.call(this, type, type === '2d' ? { willReadFrequently: true, ...(o || {}) } : o); };
/* kit motion names -> packages/cutout/sfx.json keys (the builder's table) */
const SFX_ALIAS = { flap: 'flip', boing: 'tap', swish: 'flip', marker: 'scratch', count: 'riser', pin: 'tap', 'tv-on': 'rewind', confetti: 'rustle', curtain: 'thud' };
window.__ready = false;

function makeK(show, S, L, opts) {
  const lint = [], cues = [], tl = new Timeline();
  const lines = show.lines || [], byId = new Map(lines.map((l) => [l.id, l])), chapters = show.chapters || [];
  const filmUrl = new URL(show.film || '/packages/cutout/films/_demo/film.js', location.href);
  const duration = show.duration || (lines.length ? lines[lines.length - 1].t1 + 1 : 10);
  const digits = (show.strings && show.strings._digits) || (show.lang === 'ar' ? 'arab' : 'latn');
  const K = {
    show, tl, lint, cues, S, L, layout: show.layout || 'wide', lang: show.lang || 'en', dir: show.dir || (show.lang === 'ar' ? 'rtl' : 'ltr'),
    W: L.W, H: L.H, fps: show.fps || 30, duration, chapters, digits, options: { chapterTag: true },
    /** line timing {t0, t1} (unknown ids are linted and give {t0: 0, t1: 0}) */
    line(id) { const l = byId.get(id); if (!l) { lint.push(`unknown line id "${id}"`); return { t0: 0, t1: 0, text: '' }; } return l; },
    lineOf(ref) { const m = /^([^:@]+)/.exec(String(ref)); return m && byId.get(m[1]); },
    /** time at a fraction of a line */
    at(id, frac = 0) { const l = K.line(id); return l.t0 + (l.t1 - l.t0) * frac; },
    chapter(id) { const c = chapters.find((x) => x.id === id); if (!c) { lint.push(`unknown chapter "${id}"`); return { t0: 0, t1: 0, title: '' }; } return c; },
    /** time ref: number | 'l014' (line start) | 'l014:0.5' (fraction) | 'l014:end' | 'c02' (chapter start) | 'c02:end', +offset with '+0.3' */
    T(ref) {
      if (ref == null) return 0; if (typeof ref === 'number') return ref;
      const m = /^([\w-]+)(?:[:@](end|[\d.]+))?(?:([+-][\d.]+))?$/.exec(String(ref).trim());
      if (!m) { lint.push(`bad time ref "${ref}"`); return 0; }
      const off = m[3] ? +m[3] : 0;
      if (byId.has(m[1])) { const l = byId.get(m[1]); return (m[2] === 'end' ? l.t1 : m[2] ? l.t0 + (l.t1 - l.t0) * +m[2] : l.t0) + off; }
      const c = chapters.find((x) => x.id === m[1]); if (c) return (m[2] === 'end' ? c.t1 : m[2] ? c.t0 + (c.t1 - c.t0) * +m[2] : c.t0) + off;
      lint.push(`unknown line/chapter id in time ref "${ref}"`); return 0;
    },
    /** on-screen string (never hard-code words in a film) */
    s(key) { if (show.strings && key in show.strings) return String(show.strings[key]); lint.push(`unknown string key "${key}"`); return '⟨' + key + '⟩'; },
    digit(s) { return digits === 'arab' ? arDigits(s) : String(s); },
    num(v, dec = 0) {
      let s = Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (digits === 'arab') s = arDigits(s).replace(/,/g, '٬').replace(/\./g, '٫');
      return s;
    },
    asset(p) { return /^(https?:|data:|\/)/.test(p) ? p : new URL(p, filmUrl).href; },
    sfx(name, t, o = {}) { if (!(t >= -0.01) || t > duration + 0.5) return; name = SFX_ALIAS[name] || name; cues.push({ name, t: Math.max(0, Math.round(t * 1000) / 1000), ...(o.db != null ? { db: o.db } : {}), ...(o.dur != null ? { dur: o.dur } : {}) }); },
    slot(name) { return slotRect(L, name); },
    opt(o) { Object.assign(K.options, o); },
  };
  K.cam = new Camera(S, L, tl, opts); K.cam.fps = K.fps;
  K.backdrops = new Backdrops(S, L);
  K.cast = makeCast(K);
  K.props = makeProps(K);
  K.scene = makeScene(K);
  return K;
}

/* ---------- scenes: backdrop switches + full-screen cardboard transitions ---------- */
function makeScene(K) {
  const changes = [];
  return {
    _changes: changes,
    /** set the backdrop: 'sky'|'sunset'|'night'|'room'|'map'|'stage'|'plain'|any css colour */
    backdrop(kind, o = {}) { K.backdrops.set(kind, K.T(o.at)); return this; },
    /** change({at, style 'flap'|'slide'|'drop', backdrop}) - covers the screen at `at`; props still up are cleared there */
    change(o = {}) {
      const at = Math.round(K.T(o.at) * K.fps) / K.fps, style = o.style || 'flap';
      for (const p of K.props._list) if (p.out == null || p.out > at) { if (p.at < at) { p.out = at; p.cutAt = at; } }
      if (o.backdrop) K.backdrops.set(o.backdrop, at);
      changes.push({ at, style });
      K.sfx(style === 'flap' ? 'flap' : style === 'drop' ? 'thud' : 'whoosh', at - (style === 'drop' ? 0.05 : 0.3));
      return this;
    },
  };
}
function buildCovers(K) {
  const L = K.L, out = [];
  for (const c of K.scene._changes) {
    const g = h('div', 'cov', K.S.cover), parts = [];
    const mk = (w, hh, x, y, seed, stock) => { const b = card(w, hh, { seed, stock, edge: 14, blur: 26, flutes: true, paint: coverPaint(seed) }); const el = h('div', 'pc', g); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = hh + 'px'; for (const [cv, k] of [[b.shadow, 'pc__sh'], [b.face, 'pc__face']]) { cv.className = k; cv.style.width = b.w + 'px'; cv.style.height = b.h + 'px'; cv.style.left = -b.pad + 'px'; cv.style.top = -b.pad + 'px'; el.appendChild(cv); } return el; };
    if (c.style === 'flap') {
      const top = mk(L.W + 80, L.H / 2 + 40, -40, -20, 301, STOCK.kraft), bot = mk(L.W + 80, L.H / 2 + 40, -40, L.H / 2 - 20, 302, STOCK.kraftLight);
      top.style.transformOrigin = '50% 0'; bot.style.transformOrigin = '50% 100%';
      const tp = h('div', 'tape cov__tape', g); tp.style.cssText = `left:${L.W / 2 - 80}px;top:${L.H / 2 - 70}px;width:160px;height:140px`;
      parts.push((t) => { const p = closeP(t, c.at, 0.32, 0.4); setTfS(top, 0, 0, 1, Math.max(0.001, p)); setTfS(bot, 0, 0, 1, Math.max(0.001, p)); tp.style.opacity = p > 0.98 ? '1' : '0'; });
    } else if (c.style === 'slide') {
      const sh = mk(L.W + 200, L.H + 80, -100, -40, 303, STOCK.kraft);
      parts.push((t) => { const a = c.at - 0.35, x = t < c.at ? (1 - ease3((t - a) / 0.35)) * (L.W + 260) : -ease3((t - c.at - 0.08) / 0.4) * (L.W + 260); setTfS(sh, x, 0, 1, 1); });
    } else {
      const sh = mk(L.W + 120, L.H + 80, -60, -40, 304, STOCK.kraftLight);
      parts.push((t) => { const a = c.at - 0.3; const y = t < c.at ? -(1 - bounce((t - a) / 0.3)) * (L.H + 200) : -ease3((t - c.at - 0.12) / 0.4) * (L.H + 200); setTfS(sh, 0, y, 1, 1); });
    }
    out.push({ c, g, parts });
  }
  return (t) => { for (const o of out) { const on = t > o.c.at - 0.5 && t < o.c.at + 0.6; o.g.style.visibility = on ? 'visible' : 'hidden'; if (on) for (const p of o.parts) p(t); } };
}
/* printed box marks + tape on the cover sheets */
function coverPaint(seed) {
  return (g, w, hh) => {
    g.strokeStyle = 'rgba(40,26,12,0.38)'; g.lineWidth = 9; g.lineCap = 'round';
    const ax = seed % 2 ? w * 0.12 : w * 0.8, ay = hh * 0.35;
    for (const dx of [0, 60]) { g.beginPath(); g.moveTo(ax + dx, ay + 90); g.lineTo(ax + dx, ay); g.moveTo(ax + dx - 22, ay + 26); g.lineTo(ax + dx, ay); g.lineTo(ax + dx + 22, ay + 26); g.stroke(); }
    g.strokeRect(ax - 40, ay - 26, 140, 140);
    g.fillStyle = 'rgba(236,222,178,0.9)'; if (seed === 301) g.fillRect(w * 0.42, hh - 30, w * 0.16, 30); else if (seed === 302) g.fillRect(w * 0.42, 0, w * 0.16, 30); else { g.fillRect(0, hh * 0.1, w, 34); g.fillRect(0, hh * 0.86, w, 34); }
    g.strokeStyle = 'rgba(30,20,10,0.5)'; g.lineWidth = 6; g.beginPath(); const cx = seed % 2 ? w * 0.75 : w * 0.25, cy = hh * 0.55;
    for (let k = 0; k < 5; k++) { const a = k * 2.513; g.lineTo(cx + Math.cos(a) * 46, cy + Math.sin(a) * 46); } g.closePath(); g.stroke();
  };
}
const ease3 = (p) => { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const bounce = (p) => { p = clamp(p, 0, 1); const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
function closeP(t, at, inD, outD) { if (t < at) return bounce((t - (at - inD)) / inD); return 1 - ease3((t - at - 0.08) / outD); }
function setTfS(el, x, y, sx, sy) { const s = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)})`; if (el.__tf !== s) { el.__tf = s; el.style.transform = s; } }

/* ---------- chapter tag (wide): masking-tape label top-left with the current chapter title ---------- */
function buildTag(K) {
  const R = K.L.tag; if (!R || !K.options.chapterTag || !K.chapters.length) return () => {};
  const el = h('div', 'ctag', K.S.planes.front); el.style.cssText = `left:${R.x}px;top:${R.y}px;max-width:${R.w}px;height:${R.h}px`;
  const tx = h('div', 'ctag__t kt kt--marker', el); tx.dir = K.dir;
  const sizes = K.chapters.map((c) => { tx.textContent = c.title; let f = 46; tx.style.fontSize = f + 'px'; while (f > 18 && el.scrollWidth > R.w) { f -= 2; tx.style.fontSize = f + 'px'; } tx.style.fontSize = ''; return f; });
  let cur = -2;
  K.chapters.forEach((c) => K.sfx('tape', c.t0 + 0.3, { db: -16 }));
  return (t) => {
    let i = -1; K.chapters.forEach((c, k) => { if (t >= c.t0 + 0.3) i = k; });
    if (i !== cur) { cur = i; if (i >= 0) { tx.textContent = K.chapters[i].title; tx.style.fontSize = sizes[i] + 'px'; } }
    if (i < 0) { el.style.visibility = 'hidden'; return; }
    el.style.visibility = 'visible';
    const p = clamp((t - K.chapters[i].t0 - 0.3) / 0.18, 0, 1), s = 1.5 - 0.5 * p;
    const tf = `rotate(-2deg) scale(${s.toFixed(3)})`; if (el.__tf !== tf) { el.__tf = tf; el.style.transform = tf; }
  };
}

/* ---------- load / seek ---------- */
async function fonts(lang) {
  await Promise.all(FONTS[lang === 'ar' ? 'ar' : 'en'].map((f) => document.fonts.load(f, lang === 'ar' ? 'كرتو ٠١٢٣' : 'Karto 0123')));
  await document.fonts.ready;
}
let SFX_NAMES = null;
async function sfxNames() {
  if (SFX_NAMES !== null) return SFX_NAMES;
  try { const r = await fetch('/packages/cutout/sfx.json'); if (r.ok) { const j = await r.json(); SFX_NAMES = new Set(Array.isArray(j) ? j.map((x) => x.name || x) : Object.keys(j.sfx || j)); } else SFX_NAMES = false; } catch { SFX_NAMES = false; }
  return SFX_NAMES;
}

window.__load = async (show, opts = {}) => {
  window.__ready = false;
  show = { schema: 'cutout/1', lang: 'en', layout: 'wide', fps: 30, captions: true, ...show };
  const L = LAYOUTS[show.layout] || LAYOUTS.wide;
  await fonts(show.lang);
  const root = document.getElementById('stage');
  const S = buildStage(root, L, show);
  const K = makeK(show, S, L, opts);
  window.K = K;
  // run the film script
  try {
    const mod = await import(new URL(show.film || '/packages/cutout/films/_demo/film.js', location.href).href);
    const build = mod.default || mod.build;
    if (typeof build !== 'function') K.lint.push('film has no default export build(K)'); else await build(K);
  } catch (e) { K.lint.push('film script error: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  // automatic pieces
  if (show.short) {
    K.props.hook(show.short.hook_text || show.hook_text || '', { at: show.short.t0, dur: 2.6 });
    if (!K.props._cta) K.props.shortCta({});
  }
  // build: box, backdrops, actors, props (assets + bakes + text fit), captions
  buildBox(S, L, show);
  K.backdrops.build();
  for (const a of Object.values(K.cast)) { a.plan(); await a.build(S.planes.chars); }
  for (const p of K.props._list) { p.schedule(); try { await p.build(); } catch (e) { K.lint.push(`prop build failed: ${e.message}`); } }
  const caps = buildCaptions(K);
  const covers = buildCovers(K);
  const tag = buildTag(K);
  // sfx names known to the builder
  const names = await sfxNames();
  if (names) for (const c of K.cues) if (!names.has(c.name)) K.lint.push(`unknown sfx "${c.name}" (not in packages/cutout/sfx.json)`);
  K.cues.sort((a, b) => a.t - b.t);
  await document.fonts.ready;
  const paint = (t) => {
    K.tl.seek(t);
    K.cam.apply(t); K.backdrops.seek(t);
    for (const a of Object.values(K.cast)) a.seek(t);
    for (const p of K.props._list) p.seek(t);
    caps.seek(t); covers(t); tag(t);
  };
  STATE = { K, paint, errs: 0 };
  paint(0);
  if (opts.warm) { for (let t = 0; t < K.duration; t += Math.max(1, K.duration / 40)) paint(t); paint(0); }
  window.__ready = true;
  const lint = [...new Set(K.lint)];
  return { cues: K.cues, lint, marks: { duration: K.duration, chapters: K.chapters.map((c) => ({ id: c.id, t0: c.t0 })), scenes: K.scene._changes.map((c) => c.at) } };
};
window.__seek = (t) => {
  if (!STATE) return;
  try { STATE.paint(+t || 0); } catch (e) { if (STATE.errs++ < 3) console.error('__seek(' + t + '): ' + (e && e.stack || e)); }
};

/* ---------- dev scrubber: frame.html?dev=1&show=/packages/cutout/films/_demo/show.en.json ---------- */
async function dev() {
  const q = new URLSearchParams(location.search), src = q.get('show') || '/packages/cutout/films/_demo/show.en.json';
  const show = await (await fetch(src)).json();
  const info = await window.__load(show, { drift: q.get('drift') !== '0' });
  document.body.classList.add('dev');
  const st = document.getElementById('stage'), L = LAYOUTS[show.layout] || LAYOUTS.wide;
  const fit = () => { const s = Math.min((innerHeight - 70) / L.H, (innerWidth - 20) / L.W); st.style.transform = `scale(${s})`; st.style.transformOrigin = '0 0'; document.body.style.setProperty('--dev-h', L.H * s + 'px'); };
  fit(); addEventListener('resize', fit);
  const bar = h('div', 'devbar', document.body), btn = h('button', '', bar); btn.textContent = 'pause';
  const rng = h('input', '', bar); rng.type = 'range'; rng.min = 0; rng.max = info.marks.duration; rng.step = 1 / 30;
  const out = h('span', '', bar), lint = h('span', 'devlint', bar); lint.textContent = info.lint.length ? info.lint.length + ' lint: ' + info.lint.slice(0, 3).join(' | ') : 'lint ok';
  let t = 0, playing = true, last = performance.now();
  const show_ = () => { window.__seek(t); rng.value = t; out.textContent = t.toFixed(2) + ' s  f' + Math.round(t * 30); };
  const loop = (now) => { if (playing) { t += (now - last) / 1000; if (t > info.marks.duration) t = 0; show_(); } last = now; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  btn.onclick = () => { playing = !playing; btn.textContent = playing ? 'pause' : 'play'; };
  rng.oninput = () => { playing = false; btn.textContent = 'play'; t = +rng.value; show_(); };
  addEventListener('keydown', (e) => { const s = e.shiftKey ? 1 : 1 / 30; if (e.key === 'ArrowRight') t += s; else if (e.key === 'ArrowLeft') t = Math.max(0, t - s); else if (e.key === ' ') { btn.onclick(); e.preventDefault(); return; } else return; playing = false; btn.textContent = 'play'; show_(); });
  console.log('cues', info.cues.length, 'lint', info.lint);
}
if (/[?&]dev=1/.test(location.search)) dev();
