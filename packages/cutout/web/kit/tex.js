/* Karto kit - textures and the cardboard "bake": every cutout is rasterised ONCE at load into
   face (fibres, flutes, lamp, cut-edge highlight, corrugated edge band) + shadow canvases. Per frame only transforms change. */
import { rand } from './core.js';

export const RES = 1.5; // bake resolution (camera zooms up to ~1.5 without blur)
export const STOCK = {
  kraft: '#C99A62', kraftLight: '#D9B07A', kraftDark: '#A97A45', white: '#F8F3E6', cream: '#EFE4CC', yellow: '#FFD23F',
  vermilion: '#E5401D', blue: '#3D7DB8', sky: '#8EC5E8', green: '#57A05A', night: '#1F2A44', black: '#26211B', pink: '#F4A3B5',
  wood: '#E3C08A', brass: '#C9A23A', tape: 'rgba(236,222,178,0.86)',
};
export const EDGE = { base: '#9C7243', dark: '#6B4A28', light: '#C9A46F' };

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
export const canvas = mk;

/* ---------- tiles ---------- */
let GRAIN = null, GRAIN_W = null, FLUTE = null;
function fibres(ctx, r, n, w, h, rgb, a0, a1, l0, l1) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, ang = r() * Math.PI * 2, len = r.range(l0, l1), bend = r.range(-0.5, 0.5) * len;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    ctx.strokeStyle = `rgba(${rgb},${r.range(a0, a1).toFixed(3)})`; ctx.lineWidth = r.range(0.5, 1.5);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + x2) / 2 + Math.sin(ang) * bend, (y + y2) / 2 - Math.cos(ang) * bend, x2, y2); ctx.stroke();
  }
}
function speckle(ctx, s, r, rgb, aHi, pDark) {
  const id = ctx.getImageData(0, 0, s, s), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = r(); d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = Math.round(255 * (v < pDark ? r.range(aHi, aHi * 3) : r() * aHi)); }
  ctx.putImageData(id, 0, 0);
}
export function grain() {
  if (GRAIN) return GRAIN;
  GRAIN = mk(384, 384); const g = GRAIN.getContext('2d'), r = rand(1107);
  speckle(g, 384, r, [40, 26, 10], 0.035, 0.05);
  fibres(g, r, 220, 384, 384, '60,38,14', 0.05, 0.14, 4, 22);
  fibres(g, r, 160, 384, 384, '255,245,220', 0.10, 0.25, 3, 16);
  for (let i = 0; i < 26; i++) { // darker flecks of recycled pulp
    g.fillStyle = `rgba(70,45,20,${r.range(0.12, 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(r() * 384, r() * 384, r.range(0.6, 2), r.range(0.5, 1.4), r() * 3, 0, 7); g.fill();
  }
  return GRAIN;
}
function grainWhite() { // lighter fibres for paper stocks
  if (GRAIN_W) return GRAIN_W;
  GRAIN_W = mk(384, 384); const g = GRAIN_W.getContext('2d'), r = rand(2213);
  speckle(g, 384, r, [60, 50, 30], 0.02, 0.03); fibres(g, r, 140, 384, 384, '80,60,30', 0.03, 0.08, 4, 18);
  return GRAIN_W;
}
function flutes() { // corrugation flutes seen on a cut edge: alternating ridges
  if (FLUTE) return FLUTE;
  FLUTE = mk(12, 12); const g = FLUTE.getContext('2d');
  g.fillStyle = EDGE.base; g.fillRect(0, 0, 12, 12);
  g.strokeStyle = EDGE.dark; g.lineWidth = 2.2;
  for (let k = -12; k <= 24; k += 6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 12, 12); g.stroke(); }
  g.strokeStyle = 'rgba(232,200,150,0.55)'; g.lineWidth = 1;
  for (let k = -9; k <= 27; k += 6) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 12, 12); g.stroke(); }
  return FLUTE;
}

/* ---------- hand-cut outlines ---------- */
/** rough rectangle polygon (scissor cuts: straight runs with small kinks), coordinates in px */
export function roughRect(w, h, seed, amp = 2.4, corner = 5) {
  const r = rand(seed), pts = [];
  const side = (x0, y0, x1, y1) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / r.range(70, 130)));
    for (let k = 0; k < n; k++) { const f = k / n; pts.push([x0 + (x1 - x0) * f + r.range(-amp, amp), y0 + (y1 - y0) * f + r.range(-amp, amp)]); }
  };
  const c = corner;
  side(c, 0, w - c, 0); pts.push([w, c * r.range(0.6, 1.4)]);
  side(w, c, w, h - c); pts.push([w - c * r.range(0.6, 1.4), h]);
  side(w - c, h, c, h); pts.push([0, h - c * r.range(0.6, 1.4)]);
  side(0, h - c, 0, c); pts.push([c * r.range(0.6, 1.4), 0]);
  return pts;
}
/** rough ellipse / blob */
export function roughEllipse(cx, cy, rx, ry, seed, amp = 0.03, n = 28) {
  const r = rand(seed), ph = r() * 6.28, pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, k = 1 + amp * Math.sin(ph + a * 3) + r.range(-amp, amp) * 0.6; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return pts;
}
export const ptsD = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
export function pathPts(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }

/* ---------- SVG -> image ---------- */
export function svgImage(svg, w, h) {
  const s = svg.startsWith('<svg') ? svg : `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg>`;
  const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  return img.decode().then(() => img);
}

/* ---------- the bake ---------- */
/** src: Image/Canvas drawn at (0,0) size w x h (css px). o: {edge 8 (px thickness, 0 = paper), stock 'kraft'|'paper' (fibre type),
 *  flutes (faint liner ridges), lamp 1, rim (white sticker rim px), blur (shadow blur px), res} -> {face, shadow, pad, w, h} */
export function bake(src, w, h, o = {}) {
  const res = o.res || RES, edge = o.edge == null ? 8 : o.edge, rim = o.rim || 0, blur = o.blur == null ? 10 : o.blur;
  const pad = Math.ceil(edge + rim + blur * 1.6 + 6), W = (w + pad * 2) * res, H = (h + pad * 2) * res, P = pad * res;
  // A = art (with optional white sticker rim behind)
  const A = mk(W, H), a = A.getContext('2d');
  if (rim) {
    const S = mk(W, H), s = S.getContext('2d'); s.drawImage(src, P, P, w * res, h * res); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#FBF8F0'; s.fillRect(0, 0, W, H);
    const n = 16; for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2; a.drawImage(S, Math.cos(an) * rim * res, Math.sin(an) * rim * res); }
  }
  a.drawImage(src, P, P, w * res, h * res);
  // silhouette tinted
  const tint = (col) => { const S = mk(W, H), s = S.getContext('2d'); s.drawImage(A, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = col; s.fillRect(0, 0, W, H); return S; };
  const O = mk(W, H), g = O.getContext('2d');
  if (edge > 0) {
    const band = tint(EDGE.base), steps = Math.ceil(edge * res);
    for (let k = steps; k >= 1; k--) g.drawImage(band, k * 0.55, k);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = g.createPattern(flutes(), 'repeat'); g.fillRect(0, 0, W, H);
    // outer side of the band darker (further from the light)
    const dark = tint('rgba(40,24,8,0.35)'); g.drawImage(dark, steps * 0.55 + 1, steps + 1);
    g.globalCompositeOperation = 'source-over';
  }
  g.drawImage(A, 0, 0);
  // overlays masked to the art
  const masked = (paint, op = 'source-over', alpha = 1) => {
    const T = mk(W, H), t = T.getContext('2d'); paint(t); t.globalCompositeOperation = 'destination-in'; t.drawImage(A, 0, 0);
    g.globalAlpha = alpha; g.globalCompositeOperation = op; g.drawImage(T, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  };
  const gr = o.stock === 'paper' ? grainWhite() : grain();
  masked((t) => { t.scale(res / 1.5, res / 1.5); t.fillStyle = t.createPattern(gr, 'repeat'); t.fillRect(0, 0, W * 2, H * 2); });
  if (o.flutes) masked((t) => { for (let x = 0; x < W; x += 11 * res) { t.fillStyle = 'rgba(255,240,210,0.07)'; t.fillRect(x, 0, 3 * res, H); t.fillStyle = 'rgba(60,35,10,0.06)'; t.fillRect(x + 5 * res, 0, 3 * res, H); } });
  if (o.lamp !== 0) masked((t) => { const lg = t.createLinearGradient(0, 0, W, H); lg.addColorStop(0, 'rgba(255,236,200,0.16)'); lg.addColorStop(0.5, 'rgba(255,236,200,0)'); lg.addColorStop(1, 'rgba(50,25,5,0.14)'); t.fillStyle = lg; t.fillRect(0, 0, W, H); });
  // cut-edge highlight on the lit (upper-left) edges
  { const L = tint('rgba(255,244,220,0.55)'), l = L.getContext('2d'); l.globalCompositeOperation = 'destination-out'; l.drawImage(A, 1.6 * res, 1.6 * res); g.drawImage(L, 0, 0); }
  // shadow
  const SH = mk(W, H), sh = SH.getContext('2d');
  sh.filter = `blur(${(blur * res).toFixed(1)}px)`; sh.drawImage(tint('rgba(28,16,4,0.62)'), 0, 0);
  if (edge > 0) sh.drawImage(tint('rgba(28,16,4,0.2)'), edge * res * 0.55, edge * res);
  return { face: O, shadow: SH, pad, w: w + pad * 2, h: h + pad * 2, res };
}

/** a flat card (rough-cut rectangle or polygon) baked as cardboard / paper. o: {stock colour name|hex, seed, edge, rim, paper, blur, amp} */
export function card(w, h, o = {}) {
  const C = mk(w * RES, h * RES), g = C.getContext('2d'); g.scale(RES, RES);
  g.fillStyle = STOCK[o.stock] || o.stock || STOCK.kraft;
  pathPts(g, o.pts || roughRect(w, h, o.seed || 3, o.amp == null ? 2.2 : o.amp, o.corner == null ? 5 : o.corner)); g.fill();
  if (o.paint) o.paint(g, w, h);
  return bake(C, w, h, { edge: o.edge == null ? 8 : o.edge, rim: o.rim, blur: o.blur, stock: o.paper ? 'paper' : 'kraft', flutes: o.flutes ?? !o.paper });
}

/** piece element from a bake: <div.pc><canvas.pc__sh><canvas.pc__face></div>, sized w x h css px, origin at (ox, oy) of the art */
export function pieceEl(b, cls = '') {
  const el = document.createElement('div'); el.className = 'pc ' + cls;
  const sh = b.shadow, fc = b.face;
  for (const [c, k] of [[sh, 'pc__sh'], [fc, 'pc__face']]) { c.className = k; c.style.width = b.w + 'px'; c.style.height = b.h + 'px'; c.style.left = -b.pad + 'px'; c.style.top = -b.pad + 'px'; el.appendChild(c); }
  el.sh = sh; el.face = fc; el.bk = b;
  return el;
}
export function cloneCanvas(c) { const d = mk(c.width, c.height); d.getContext('2d').drawImage(c, 0, 0); return d; }

/* ---------- backdrops (painted sheets inside the box) ---------- */
const BD = new Map();
export function backdrop(kind, W, H, seed = 5) {
  const key = kind + W + 'x' + H + seed; if (BD.has(key)) return BD.get(key);
  const c = mk(W, H), g = c.getContext('2d'), r = rand(seed);
  const brush = (cols, n, w0, w1, a0 = 0.08, a1 = 0.2) => { // dry brush strokes
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H, len = r.range(W * 0.05, W * 0.25), ang = r.range(-0.15, 0.15);
      g.strokeStyle = r.pick(cols).replace('A', r.range(a0, a1).toFixed(3)); g.lineWidth = r.range(w0, w1); g.lineCap = 'round';
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + len / 2, y + r.range(-20, 20), x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
    }
  };
  const vgrad = (stops) => { const lg = g.createLinearGradient(0, 0, 0, H); stops.forEach(([p, col]) => lg.addColorStop(p, col)); g.fillStyle = lg; g.fillRect(0, 0, W, H); };
  const k = String(kind);
  if (k === 'sky' || k === 'sunset') {
    vgrad(k === 'sky' ? [[0, '#5FA8DC'], [0.65, '#A9D6F0'], [1, '#D8EEF6']] : [[0, '#3B4F8C'], [0.45, '#E4785A'], [1, '#F7C77A']]);
    brush(k === 'sky' ? ['rgba(255,255,255,A)', 'rgba(40,110,170,A)'] : ['rgba(255,220,160,A)', 'rgba(120,50,80,A)'], 260, 14, 40);
  } else if (k === 'night') {
    vgrad([[0, '#121A33'], [0.7, '#24345E'], [1, '#33477A']]);
    brush(['rgba(120,150,220,A)', 'rgba(5,10,25,A)'], 220, 14, 44);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,248,220,${r.range(0.4, 0.95).toFixed(2)})`; const x = r() * W, y = r() * H * 0.8, s = r.range(1.5, 4.5); g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  } else if (k === 'room') {
    g.fillStyle = '#E9D3A8'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 64) { g.fillStyle = 'rgba(190,120,70,0.16)'; g.fillRect(x, 0, 26, H * 0.78); }
    g.fillStyle = '#8B5A35'; g.fillRect(0, H * 0.78, W, H * 0.22);
    for (let x = 0; x < W; x += 150) { g.fillStyle = 'rgba(40,20,5,0.25)'; g.fillRect(x, H * 0.78, 4, H * 0.22); }
    brush(['rgba(120,70,30,A)', 'rgba(255,240,210,A)'], 160, 10, 30, 0.05, 0.12);
  } else if (k === 'map') {
    g.fillStyle = '#E8DDBF'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(90,120,140,0.22)'; g.lineWidth = 2;
    for (let x = 0; x < W; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 90) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    brush(['rgba(150,120,70,A)'], 120, 10, 30, 0.04, 0.1);
  } else if (k === 'stage') {
    g.fillStyle = '#9E2A1A'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 70) { const lg = g.createLinearGradient(x, 0, x + 70, 0); lg.addColorStop(0, 'rgba(0,0,0,0.28)'); lg.addColorStop(0.5, 'rgba(255,120,90,0.12)'); lg.addColorStop(1, 'rgba(0,0,0,0.28)'); g.fillStyle = lg; g.fillRect(x, 0, 70, H); }
  } else { // plain colour: 'plain' or any css colour
    g.fillStyle = k === 'plain' ? '#E7C98F' : k; g.fillRect(0, 0, W, H);
    brush(['rgba(255,255,255,A)', 'rgba(0,0,0,A)'], 200, 16, 46, 0.03, 0.08);
  }
  // paper fibres over the paint + soft lamp light
  g.globalAlpha = 0.7; g.fillStyle = g.createPattern(grain(), 'repeat'); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  const lamp = g.createRadialGradient(W * 0.3, H * 0.15, 40, W * 0.45, H * 0.4, Math.max(W, H) * 0.85);
  lamp.addColorStop(0, 'rgba(255,240,200,0.18)'); lamp.addColorStop(0.5, 'rgba(255,240,200,0)'); lamp.addColorStop(1, 'rgba(30,15,0,0.3)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);
  BD.set(key, c); return c;
}
