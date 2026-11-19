/* Karto kit - captions: 2-6 word groups from show.lines[].words on a torn paper strip with a speaker-coloured tab.
   Numbers and show.key_words are highlighted. Font size per group is measured once at load. */
import { h, rand, setTf, setOp } from './core.js';

const PUNCT = /[.,!?;:،؟…]$/;
const norm = (s) => String(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[^\p{L}\p{N}]/gu, '');

export function buildCaptions(K) {
  const show = K.show, L = K.L, R = L.captions, ar = K.lang === 'ar';
  const keys = new Set(); for (const k of show.key_words || []) for (const w of String(k).split(/\s+/)) if (norm(w)) keys.add(norm(w));
  const groups = [];
  for (const ln of show.lines || []) {
    const words = ln.words && ln.words.length ? ln.words : (() => { const ws = String(ln.text || '').split(/\s+/).filter(Boolean), d = (ln.t1 - ln.t0) / Math.max(1, ws.length); return ws.map((w, i) => ({ w, t0: ln.t0 + i * d, t1: ln.t0 + (i + 1) * d })); })();
    let cur = [];
    const maxN = ar ? 5 : 6, maxC = ar ? 26 : 30;
    const flush = () => { if (cur.length) groups.push({ who: ln.who, words: cur, t0: cur[0].t0, end: cur[cur.length - 1].t1, line: ln.id }); cur = []; };
    words.forEach((w, i) => {
      cur.push(w);
      const chars = cur.reduce((a, x) => a + String(x.w).length + 1, 0), left = words.length - i - 1;
      if (left === 0) return;
      if ((cur.length >= 2 && PUNCT.test(w.w) && left >= 2) || cur.length >= maxN || (chars >= maxC && cur.length >= 2 && left >= 2)) flush();
    });
    // never leave a single trailing word alone when the previous group can take it
    if (cur.length === 1 && groups.length && groups[groups.length - 1].line === ln.id && groups[groups.length - 1].words.length < 6) { const g = groups[groups.length - 1]; g.words.push(cur[0]); g.end = cur[0].t1; cur = []; }
    flush();
  }
  groups.forEach((g, i) => { const nx = groups[i + 1]; g.t1 = nx ? Math.min(nx.t0, g.end + 0.35) : g.end + 0.35; g.rot = (rand(i * 13 + 7)() - 0.5) * 2.2; });

  const box = h('div', 'caps', K.S.hud); box.style.cssText = `left:${R.x}px;top:${R.y}px;width:${R.w}px;height:${R.h}px`;
  const strip = h('div', 'caps__strip', box); strip.dir = K.dir;
  const tab = h('div', 'caps__tab', strip), txt = h('div', 'caps__txt kt', strip);
  const fill = (g) => {
    txt.innerHTML = '';
    g.words.forEach((w, i) => {
      let s = String(w.w); if (K.digits === 'arab') s = K.digit(s);
      const sp = h('span', 'cw', txt); sp.textContent = s;
      if (/[0-9٠-٩]/.test(s) || keys.has(norm(w.w))) sp.classList.add('cw--key');
      if (i < g.words.length - 1) txt.appendChild(document.createTextNode(' '));
    });
  };
  // measure: largest size (<= max) that keeps the group on <= 2 lines inside the strip box
  const maxF = K.layout === 'tall' ? 56 : 54, minF = 26;
  for (const g of groups) {
    fill(g); let f = maxF;
    for (let i = 0; i < 30; i++) { txt.style.fontSize = f + 'px'; const lh = parseFloat(getComputedStyle(txt).lineHeight) || f * 1.2; if (strip.offsetHeight <= R.h && txt.offsetHeight <= lh * 2 + 2 && strip.offsetWidth <= R.w) break; f *= 0.94; if (f < minF) { f = minF; K.lint.push(`caption too long at ${g.t0.toFixed(2)}s: "${g.words.map((w) => w.w).join(' ')}"`); break; } }
    g.size = f;
  }
  let cur = null;
  const find = (t) => { let lo = 0, hi = groups.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1; if (groups[m].t1 <= t) lo = m + 1; else if (groups[m].t0 > t) hi = m - 1; else return groups[m]; } return null; };
  return {
    groups,
    seek(t) {
      const g = show.captions === false ? null : find(t);
      if (g !== cur) { cur = g; if (g) { fill(g); txt.style.fontSize = g.size + 'px'; strip.className = 'caps__strip caps__strip--' + g.who; } }
      setOp(box, g ? 1 : 0);
      if (g) { const p = Math.min(1, (t - g.t0) / 0.1), s = 0.9 + 0.1 * p; setTf(strip, 0, (1 - p) * 10, g.rot, s, s); }
    },
  };
}
