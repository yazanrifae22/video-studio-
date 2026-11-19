import { fill, lineOf, type Round } from './spec.ts';
import { autoFit, empty, r2, speak, tail, TICK, type Ctx, type Plan, type Template } from './templates.ts';

/**
 * Second template batch (2026-10-22, from the showrunners' template-requests.md): image_reveal, follow_path, sequence,
 * what_changed, spot_difference. Generic and parameterised; every template that can be checked mechanically refuses a
 * spec whose answer does not follow from its own data. Card coordinates (900x860), positions are the viewer's.
 */
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const AR = '٠١٢٣٤٥٦٧٨٩';
const arNum = (n: number) => String(n).replace(/\d/g, d => AR[+d]);
const fromAr = (s: string) => Number(String(s).replace(/[٠-٩]/g, c => String(AR.indexOf(c))));

/** Plan used by most templates: optional pre/set lines while the puzzle builds or acts, then the shared tail. */
function standardPlan(r: Round, ctx: Ctx, p: Plan, opts: { busyUntil?: number; minCd?: number; sting?: boolean } = {}) {
  if (opts.sting) p.sfx.push({ name: 'sting', at: 0.0, gain_db: -3 });
  const pre = speak(ctx, [...(r.pre_lines ?? []), r.set_line], 0.15);
  p.lines.push(...pre.lines);
  const first = r.pre_lines?.[0] ?? r.set_line;
  if (first) p.heads.push({ id: 'h-hook', text: fill(lineOf(ctx.script, first)?.onscreen_ar, ctx.spec), at: 0.0, kind: 'hook' });
  const qAt = Math.max(pre.lines.length ? pre.end + 0.15 : 0.5, opts.busyUntil ?? 0);
  if (first) p.heads[0].out = r2(qAt - 0.25);
  return tail(ctx, r, p, qAt, Math.max(qAt + 0.6, opts.minCd ?? 1.2));
}

/* ---------------- tiny SVG path sampler (M L H V C S Q T Z, absolute + relative) for path fairness checks */
export function samplePath(d: string, step = 4): [number, number][] {
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0;
  const pts: [number, number][] = [];
  const num = () => parseFloat(tok[i++]);
  const line = (x1: number, y1: number) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x, y1 - y) / step)); for (let k = 1; k <= n; k++) pts.push([x + (x1 - x) * k / n, y + (y1 - y) * k / n]); x = x1; y = y1; };
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const n = Math.max(8, Math.ceil((Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2)) / step));
    for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; pts.push([u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3]); }
    cx = x2; cy = y2; x = x3; y = y3;
  };
  const quad = (x1: number, y1: number, x2: number, y2: number) => { cubic(x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y), x2 + 2 / 3 * (x1 - x2), y2 + 2 / 3 * (y1 - y2), x2, y2); cx = x1; cy = y1; };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const rel = cmd === cmd.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': x = num() + ox; y = num() + oy; sx = x; sy = y; pts.push([x, y]); cmd = rel ? 'l' : 'L'; break;
      case 'L': line(num() + ox, num() + oy); break;
      case 'H': line(num() + ox, y); break;
      case 'V': line(x, num() + oy); break;
      case 'C': cubic(num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy); break;
      case 'S': { const x1 = 2 * x - cx, y1 = 2 * y - cy; cubic(x1, y1, num() + ox, num() + oy, num() + ox, num() + oy); break; }
      case 'Q': quad(num() + ox, num() + oy, num() + ox, num() + oy); break;
      case 'T': quad(2 * x - cx, 2 * y - cy, num() + ox, num() + oy); break;
      case 'Z': line(sx, sy); break;
      default: throw new Error(`path command ${cmd} not supported`);
    }
  }
  return pts;
}
function segX(a: number[], b: number[], c: number[], d: number[]) {
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const p1 = o(a, b, c) * o(a, b, d), p2 = o(c, d, a) * o(c, d, b);  // touching at a sample point counts (symmetric paths)
  return p1 <= 0 && p2 <= 0 && !(o(a, b, c) === 0 && o(a, b, d) === 0);
}
/** Paths must end on their declared targets, and come closer than `gap` px only where they actually cross. */
export function checkPaths(paths: Record<string, string>, gap = 40) {
  const S = Object.fromEntries(Object.entries(paths).map(([k, d]) => [k, samplePath(d)]));
  const keys = Object.keys(S);
  const problems: string[] = [];
  for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) {
    const A = S[keys[a]], B = S[keys[b]];
    const near: [number, number][] = [];
    for (let i = 0; i < A.length; i += 2) for (let j = 0; j < B.length; j += 2) if (Math.hypot(A[i][0] - B[j][0], A[i][1] - B[j][1]) < gap) near.push([i, j]);
    // cluster near-points; each cluster must contain a real crossing
    const clusters: [number, number][][] = [];
    for (const n of near) { const c = clusters.find(cl => cl.some(m => Math.abs(m[0] - n[0]) <= 4 && Math.abs(m[1] - n[1]) <= 40)); if (c) c.push(n); else clusters.push([n]); }
    for (const cl of clusters) {
      // search the whole index window the cluster spans (padded) for a real segment intersection
      const i0 = Math.max(1, Math.min(...cl.map(c => c[0])) - 4), i1 = Math.min(A.length - 1, Math.max(...cl.map(c => c[0])) + 4);
      const j0 = Math.max(1, Math.min(...cl.map(c => c[1])) - 4), j1 = Math.min(B.length - 1, Math.max(...cl.map(c => c[1])) + 4);
      let crosses = false;
      for (let i = i0; i <= i1 && !crosses; i++) for (let j = j0; j <= j1; j++) if (segX(A[i - 1], A[i], B[j - 1], B[j])) { crosses = true; break; }
      if (!crosses) problems.push(`paths ${keys[a]} and ${keys[b]} run within ${gap} px of each other near (${A[cl[0][0]].map(Math.round).join(',')}) without crossing`);
    }
  }
  return { ends: Object.fromEntries(keys.map(k => [k, S[k][S[k].length - 1]])), problems };
}

export const MORE: Record<string, Template> = {
  /* ------------------------------------------------------------ image_reveal
     Generic stage-image round: a 900x860 puzzle PNG → countdown → reveal overlay / replacement, with optional grid build,
     focus box, measured slide, faded surround layer, numbered stagger reveal. Fairness: the puzzle is drawn at exactly
     100 % (a grid build hands over to the untouched full image as soon as it settles; no tint before the reveal). */
  image_reveal: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'pop', at: 0.15, gain_db: -8 });
      const P = r.params;
      const buildEnd = P.build === 'grid' ? 0.2 + (P.grid[0] * P.grid[1]) * 0.04 + 0.4 : 0.6;
      p.marks.buildEnd = r2(buildEnd);
      standardPlan(r, ctx, p, { busyUntil: 0.4, minCd: buildEnd + 0.3, sting: !!P.sting });
      (P.stagger_reveal ?? []).forEach((_: any, k: number) => p.sfx.push({ name: 'pop', at: r2(p.reveal! + 0.15 + k * 0.2), gain_db: -10 }));
      if (P.slide) p.sfx.push({ name: 'swap', at: r2(p.reveal! + 0.6), gain_db: -8 });
      const extra = Math.max(P.stagger_reveal ? 0.35 + P.stagger_reveal.length * 0.2 : 0, P.slide ? 1.4 : 0);
      if (p.reveal! + extra + 0.8 > p.duration) { const add = p.reveal! + extra + 0.8 - p.duration; p.duration = r2(p.duration + add); if (p.exit != null) p.exit = r2(p.exit + add); for (const s of p.sfx) if (s.name === 'whoosh') s.at = r2(s.at + add); }
      return p;
    },
    puzzle(r) {
      const P = r.params;
      // odd one out by tilt: the decoys' random jitter must stay within ±jitter_max (default 2.5°) and well under the odd
      // item's tilt (>= 3x), so no decoy rivals it (x5iz bowlers: ±3° decoys vs a 9° brim)
      if (P.odd) {
        const jm = P.jitter_max ?? 2.5, tilt = Math.abs(P.odd.tilt ?? 0), jit = Math.abs(P.odd.jitter ?? 0);
        if (jit > jm) throw new Error(`image_reveal ${r.id}: decoy jitter ±${jit}° exceeds jitter_max ±${jm}° (redraw the art with smaller jitter)`);
        if (tilt < 3 * jit || tilt <= jm) throw new Error(`image_reveal ${r.id}: odd tilt ${tilt}° is too close to the decoy jitter ±${jit}° (needs >= 3x the jitter and > jitter_max ${jm}°)`);
      }
      const layers: { surround?: string; targets?: string } | undefined = P.layers;
      const base = layers ? `<img class="st" id="surround" src="${layers.surround}" /><img class="st" id="targets" src="${layers.targets}" />` : `<img class="st" id="pz" src="${P.puzzle}" />`;
      let cells = '';
      if (P.build === 'grid') {
        const [rows, cols] = P.grid as [number, number];
        const w = 900 / cols, h = 860 / rows;
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) cells += `<div class="cell" style="left:${j * w}px;top:${i * h}px;width:${w}px;height:${h}px;background-image:url('${P.puzzle}');background-position:-${j * w}px -${i * h}px"></div>`;
      }
      const ov = P.reveal ? `<img class="st" id="rv" src="${P.reveal}" />` : '';
      const focus = P.focus ? `<div id="dim" style="left:${P.focus.x}px;top:${P.focus.y}px;width:${P.focus.w}px;height:${P.focus.h}px"></div><div id="fx" style="left:${P.focus.x}px;top:${P.focus.y}px;width:${P.focus.w}px;height:${P.focus.h}px;background-image:url('${P.reveal && P.mode !== 'replace' ? P.puzzle : P.puzzle}');background-position:-${P.focus.x}px -${P.focus.y}px"></div><div id="ftick" style="left:${P.focus.x + P.focus.w - 50}px;top:${P.focus.y - 40}px">${TICK}</div>` : '';
      const slideSrc = layers?.targets ?? P.puzzle;
      const slide = P.slide ? `<div id="erase" style="left:${P.slide.x}px;top:${P.slide.y}px;width:${P.slide.w}px;height:${P.slide.h}px"></div><div id="sl" style="left:${P.slide.x}px;top:${P.slide.y}px;width:${P.slide.w}px;height:${P.slide.h}px;background-image:url('${slideSrc}');background-position:-${P.slide.x}px -${P.slide.y}px"></div>` : '';
      const stag = (P.stagger_reveal ?? []).map((b: any, k: number) => `<div class="sb" id="sb${k}" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;background-image:url('${P.reveal}');background-position:-${b.x}px -${b.y}px"></div>`).join('');
      // paint order: puzzle → slide → dim + highlight clone → reveal overlays (rings/marks) → tick, so the answer marks
      // are never under the highlight box or the dimming layer (z5hx v5 QA)
      const tick = focus ? focus.slice(focus.indexOf('<div id="ftick"')) : '';
      const dimfx = focus ? focus.slice(0, focus.indexOf('<div id="ftick"')) : '';
      const html = `<div id="stage">${base}${cells}${slide}${dimfx}${P.stagger_reveal ? '' : ov}${stag}${tick}</div>`;
      const css = `#stage{position:absolute;inset:0;border-radius:48px;overflow:hidden}
        .st{position:absolute;left:0;top:0;width:900px;height:860px}
        .cell,#fx,#sl,.sb{position:absolute;background-size:900px 860px;background-repeat:no-repeat}
        #rv{opacity:0} .sb{opacity:0}
        #dim{position:absolute;box-shadow:0 0 0 2000px ${P.dim_color ?? 'rgba(29,21,72,.45)'};opacity:0;border-radius:18px}  /* darken non-answers (never lighten) */
        #fx{opacity:0;border-radius:18px} #ftick{position:absolute;width:90px;height:90px;opacity:0;z-index:5}
        #erase{position:absolute;background:#fff;opacity:0} #sl{opacity:0}`;
      const js = `window.buildPuzzle=function(tl,Q){
        var P=${JSON.stringify({ grid: P.build === 'grid', mode: P.mode ?? 'overlay', fade: P.fade_puzzle ?? null, focus: !!P.focus, slide: P.slide ?? null, stag: (P.stagger_reveal ?? []).length, layers: !!layers, draw: !!P.draw_on })}, M=Q.marks;
        if(P.grid){
          tl.set('#pz',{opacity:0},0);
          Q.intro(tl,'.cell',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.6)',stagger:.04},.2);
          tl.set('#pz',{opacity:1},M.buildEnd); tl.set('.cell',{opacity:0},M.buildEnd);  // untouched full image from here on
        } else {
          Q.intro(tl,'.st:not(#rv)',{scale:.85,opacity:0},{scale:1,opacity:1,duration:.5,ease:'back.out(1.6)'},.1);
        }
        var R=Q.reveal;
        if(P.mode==='replace'){ tl.to('#pz',{opacity:0,duration:.35},R); tl.fromTo('#rv',{opacity:0},{opacity:1,duration:.35},R); }
        else if(!P.stag){ tl.fromTo('#rv',{opacity:0},{opacity:1,duration:.25},R+.05); }
        if(P.fade!=null) tl.to('#pz',{opacity:P.fade,duration:.3},R);
        if(P.layers) tl.to('#surround',{opacity:.15,duration:.3},R);
        if(P.focus){ tl.fromTo('#dim',{opacity:0},{opacity:1,duration:.3},R+.05); tl.set('#fx',{opacity:1},R+.05);
          tl.fromTo('#fx',{scale:1},{scale:1.06,duration:.2,yoyo:true,repeat:1,ease:'power2.out'},R+.1);
          tl.fromTo('#ftick',{scale:0,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(2.2)'},R+.2); }
        if(P.stag){ for(var k=0;k<P.stag;k++){ tl.fromTo('#sb'+k,{scale:.5,opacity:0},{scale:1,opacity:1,duration:.3,ease:'back.out(2)'},R+.15+k*.2); } }
        if(P.slide){ tl.set('#erase',{opacity:1},R+.6); tl.set('#sl',{opacity:1},R+.6);
          tl.to('#sl',{x:P.slide.dx,y:P.slide.dy,duration:.6,ease:'power3.inOut'},R+.6); }
      };`;
      const files = [P.puzzle, P.reveal, layers?.surround, layers?.targets].filter(Boolean);
      return { html, css, js, files };
    },
  },

  /* ------------------------------------------------------------ follow_path
     Tangled lines: which start reaches the target? All lines one ink colour (colouring would give it away). The generator
     samples every path: each must end on a declared end, only the answer may end on target_end, and lines may come within
     40 px of each other only where they really cross. */
  follow_path: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'pop', at: 0.15, gain_db: -8 });
      standardPlan(r, ctx, p, { busyUntil: 0.5, minCd: 1.2 });
      p.sfx.push({ name: 'swap', at: r2(p.reveal! + 0.05), gain_db: -10 });
      if (p.reveal! + 1.2 + 0.6 > p.duration) { const add = p.reveal! + 1.8 - p.duration; p.duration = r2(p.duration + add); if (p.exit != null) p.exit = r2(p.exit + add); for (const s of p.sfx) if (s.name === 'whoosh') s.at = r2(s.at + add); }
      return p;
    },
    puzzle(r) {
      const P = r.params;
      const chk = checkPaths(P.paths, P.min_gap ?? 40);
      const ends: { img: string; x: number }[] = P.ends;
      for (const [k, e] of Object.entries(chk.ends)) if (!ends.some(en => Math.abs(en.x - e[0]) <= 4)) throw new Error(`follow_path ${r.id}: path ${k} ends at x ${e[0].toFixed(0)}, which is not an end`);
      const hitters = Object.entries(chk.ends).filter(([, e]) => Math.abs(e[0] - P.target_end) <= 4).map(([k]) => k);
      if (hitters.length !== 1 || hitters[0] !== String(P.answer)) throw new Error(`follow_path ${r.id}: paths reaching target_end = [${hitters}], answer = ${P.answer}`);
      if (chk.problems.length) throw new Error(`follow_path ${r.id}: ${chk.problems.join('; ')}`);
      const sw = P.stroke ?? 16;
      const paths = Object.entries(P.paths as Record<string, string>).map(([k, d]) => `<path class="ln" id="ln${k}" d="${d}" pathLength="1" />`).join('');
      const ans = `<path id="lnA" d="${P.paths[P.answer]}" pathLength="1" />`;
      const labels = (P.labels as any[]).map((l, i) => `<div class="lb" id="lb${i}" style="left:${l.x - 48}px;top:${(l.y ?? 70) - 48}px">${esc(l.text)}</div>`).join('');
      const endsHtml = ends.map((e, i) => `<div class="en" id="en${i}" style="left:${e.x - 85}px;top:${P.end_top ?? 690}px"><img src="${e.img}" />${Math.abs(e.x - P.target_end) <= 4 ? `<div id="ptick">${TICK}</div>` : ''}</div>`).join('');
      const html = `<svg id="paths" viewBox="0 0 900 860">${paths}${ans}</svg>${labels}${endsHtml}`;
      const css = `#paths{position:absolute;left:0;top:0;width:900px;height:860px;overflow:visible}
        .ln{fill:none;stroke:#1D1548;stroke-width:${sw};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1}
        #lnA{opacity:0;fill:none;stroke:#22D489;stroke-width:${sw + 6};stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1 1;stroke-dashoffset:1}
        .lb{position:absolute;width:96px;height:96px;border-radius:50%;background:#1D1548;color:#fff;font-weight:900;font-size:66px;line-height:96px;text-align:center}
        .en{position:absolute;width:170px;height:${P.end_h ?? 150}px;display:flex;justify-content:center}
        .en img{height:100%;width:100%;object-fit:contain}
        #ptick{position:absolute;top:-20px;right:-10px;width:80px;height:80px;opacity:0}`;
      const js = `window.buildPuzzle=function(tl,Q){
        Q.intro(tl,'.lb, .en',{scale:.5,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.8)',stagger:.04},.1);
        Q.intro(tl,'.ln',{strokeDashoffset:1},{strokeDashoffset:0,duration:.7,ease:'power2.inOut'},.3);
        tl.to('.ln',{opacity:.35,duration:.3},Q.reveal);
        tl.set('#lnA',{opacity:1},Q.reveal); tl.fromTo('#lnA',{strokeDashoffset:1},{strokeDashoffset:0,duration:1.2,ease:'power1.inOut'},Q.reveal);
        tl.fromTo('#ptick',{scale:0,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(2.2)'},Q.reveal+1.2);
        tl.fromTo('#ptick',{y:0},{y:0},Q.reveal+1.2);
      };`;
      return { html, css, js, files: ends.map(e => e.img) };
    },
  },

  /* ------------------------------------------------------------ sequence
     Pattern / next item. Items laid out right-to-left (item 0 at the viewer's right) as stacks (`count` copies of `unit`
     on `base`) or single images; the missing item is count:null. `rule` is checked: arithmetic | diff_increasing |
     geometric. Options come from options_ar (shared options row). */
  sequence: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'pop', at: 0.15, gain_db: -8 });
      standardPlan(r, ctx, p, { busyUntil: 0.5, minCd: 1.4, sting: !!r.params.sting });
      (r.params.steps_ar ?? []).forEach((_: any, k: number) => p.sfx.push({ name: 'pop', at: r2(p.reveal! + 0.4 + k * 0.15), gain_db: -12 }));
      return p;
    },
    puzzle(r) {
      const P = r.params;
      const items: { count?: number | null; img?: string; label?: string }[] = P.items;
      const known = items.map(i => i.count).filter((c): c is number => c != null);
      const ans = fromAr(P.answer);
      if (P.rule) {
        const df = known.slice(1).map((c, i) => c - known[i]);
        let next: number | null = null;
        if (P.rule === 'arithmetic' && df.every(x => x === df[0])) next = known[known.length - 1] + df[0];
        if (P.rule === 'diff_increasing') { const dd = df.slice(1).map((x, i) => x - df[i]); if (dd.every(x => x === dd[0])) next = known[known.length - 1] + df[df.length - 1] + dd[0]; }
        if (P.rule === 'geometric') { const q = known[1] / known[0]; if (known.every((c, i) => i === 0 || c === known[i - 1] * q)) next = known[known.length - 1] * q; }
        if (next !== ans) throw new Error(`sequence ${r.id}: rule ${P.rule} gives ${next}, answer is ${ans}`);
      }
      const n = items.length, sp = Math.min(190, 860 / n);
      const X = items.map((_, i) => 450 + ((n - 1) / 2 - i) * sp);     // RTL: item 0 at the viewer's right
      const unitW = P.unit_w ?? 100, baseW = P.base_w ?? 95, baseH = P.base_h ?? 180, step = P.step ?? 40, bottom = P.row_bottom ?? (P.steps_ar ? 570 : 600);
      const stack = (it: any, i: number) => {
        if (it.img) return `<img class="si" src="${it.img}" style="left:${X[i] - sp / 2 + 6}px;width:${sp - 12}px;top:${bottom - 300}px;height:300px" />`;
        const units = Array.from({ length: it.count ?? 0 }, (_, k) => `<img class="un" src="${P.unit}" style="left:${X[i] - unitW / 2}px;top:${bottom - baseH - step * (k + 1) - unitW * 0.3}px;width:${unitW}px;z-index:${10 + k}" />`).join('');
        let q = it.count == null ? `<div class="qm" style="left:${X[i] - 60}px;top:${bottom - baseH - 150}px">؟</div>` : '';
        if (it.count == null && P.reveal_stack) {
          // answer stack built on the answer slot at the reveal, same spacing, scaled down to fit the card if needed;
          // without a unit image (image items) a big green answer replaces «؟»
          if (P.unit) {
            const need = step * ans + unitW * 0.7, room = bottom - baseH - 20, k = Math.min(1, room / need);
            q += `<div id="rs" style="position:absolute;left:0;top:0;width:900px;height:860px;transform-origin:${X[i]}px ${bottom - baseH}px;transform:scale(${k.toFixed(3)})">` +
              Array.from({ length: ans }, (_, j) => `<img class="un rsu" src="${P.unit}" style="left:${X[i] - unitW / 2}px;top:${bottom - baseH - step * (j + 1) - unitW * 0.3}px;width:${unitW}px;z-index:${10 + j};opacity:0" />`).join('') + '</div>';
          } else q += `<div class="qa" style="left:${X[i] - 90}px;top:${bottom - baseH - 170}px">${esc(P.answer)}</div>`;
        }
        return `<img class="bs" src="${P.base}" style="left:${X[i] - baseW / 2}px;top:${bottom - baseH}px;width:${baseW}px;height:${baseH}px" />${units}${q}`;
      };
      const chW = Math.round(Math.min(120, sp - 16)), chH = 88, chFont = 66;   // cap height ~47 px (>= 2.2% of 1920 for role main)
      const chips = items.map((it, i) => `<div class="ch${it.count == null ? ' miss' : ''}" id="ch${i}" style="left:${X[i] - chW / 2}px;top:${bottom + 14}px;width:${chW}px"><span class="a">${esc(it.label ?? (it.count == null ? '؟' : arNum(it.count)))}</span>${it.count == null ? `<span class="b">${esc(P.answer)}</span>` : ''}</div>`).join('');
      const steps = (P.steps_ar ?? []).map((s: string, k: number) => `<div class="stp" id="stp${k}" style="left:${(X[k] + X[k + 1]) / 2 - 40}px;top:${bottom + 14 + chH + 8}px">${esc(s)}</div>`).join('');
      const html = `<div id="seq">${items.map((it, i) => `<div class="grp" id="g${i}" style="position:absolute;left:0;top:0;width:900px;height:860px;transform-origin:${X[i]}px ${bottom}px">${stack(it, i)}</div>`).join('')}</div>${P.chips === false ? '' : chips}${steps}`;
      const css = `#seq .bs,#seq .un,#seq .si{position:absolute;object-fit:contain}
        .qa{position:absolute;width:180px;text-align:center;font-weight:900;font-size:150px;line-height:1;color:#22D489;opacity:0}
        .qm{position:absolute;width:120px;text-align:center;font-weight:900;font-size:140px;line-height:1;color:#6A3BFF}
        .ch{position:absolute;width:90px;height:${chH}px;border-radius:999px;background:#1D1548;color:#fff;font-weight:900;font-size:${chFont}px;line-height:${chH - 4}px;text-align:center;overflow:hidden}
        .ch.miss{background:#6A3BFF} .ch span{position:absolute;left:0;right:0} .ch .b{opacity:0;background:#22D489}
        .stp{position:absolute;width:80px;text-align:center;font-weight:900;font-size:${P.steps_px ?? 44}px;color:#FF5C7A;background:#fff;border:4px solid #FF5C7A;border-radius:999px;line-height:1.2;opacity:0;direction:ltr}`;
      const pulse = P.pulse ?? !!r.open;
      const ansIdx = (P.options_ar ?? []).findIndex((o: string) => fromAr(o) === ans);
      const js = `window.buildPuzzle=function(tl,Q){
        // answer layers (.qa digit, #rs answer stack) are NOT intro targets: the intro collapses to opacity 1 at t = 0, which
        // showed the green answer under «؟» for the whole question phase (aecz v4 R1, 3uyp v3 R2)
        Q.intro(tl,'#seq .grp > .bs, #seq .grp > .un, #seq .grp > .si, #seq .grp > .qm',{y:40,opacity:0},{y:0,opacity:1,duration:.35,ease:'back.out(1.6)',stagger:.02},.1);
        tl.set('.qa, #rs, .ch.miss .b',{visibility:'hidden'},0); tl.set('.qa, #rs, .ch.miss .b',{visibility:'visible'},Q.reveal);
        Q.intro(tl,'.ch',{scale:.5,opacity:0},{scale:1,opacity:1,duration:.3,ease:'back.out(2)',stagger:.05},.5);
        tl.to('.ch.miss .a',{y:-100,duration:.25,ease:'power2.in'},Q.reveal);
        if (document.querySelector('.rsu')) { tl.to('.qm',{opacity:0,duration:.15},Q.reveal); tl.fromTo('.rsu',{y:-40,opacity:0},{y:0,opacity:1,duration:.2,ease:'back.out(1.6)',stagger:.05},Q.reveal+.1); }
        if (document.querySelector('.qa')) { tl.to('.qm',{opacity:0,duration:.15},Q.reveal); tl.fromTo('.qa',{scale:.4,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(2)'},Q.reveal+.05); }
        tl.fromTo('.ch.miss .b',{y:100,opacity:0},{y:0,opacity:1,duration:.3,ease:'back.out(2)'},Q.reveal+.1);
        ${ansIdx >= 0 ? `tl.set('#opt${ansIdx}',{backgroundColor:'#22D489',borderColor:'#16B574',color:'#fff'},Q.reveal); tl.fromTo('#opt${ansIdx}',{scale:1},{scale:1.15,duration:.18,yoyo:true,repeat:1},Q.reveal);` : ''}
        tl.fromTo('.stp',{y:10,opacity:0},{y:0,opacity:1,duration:.3,ease:'back.out(2)',stagger:.15},Q.reveal+.4);
        ${pulse ? `// non-revealing motion beat: every item (stack + chip, the missing slot and its «؟» included) gets the same gentle 1.04x pulse in turn
        { var pn=${n}, pEnd=(Q.open?Q.D:Q.reveal)-.3, pk=0, pStart=.9;
          for (var pt=pStart; pt<pEnd-.3; pt+=.34, pk++) { var pi=pk%pn; tl.to('#g'+pi+', #ch'+pi,{scale:1.04,duration:.17,yoyo:true,repeat:1,ease:'sine.inOut',overwrite:false},pt); } }` : ''}
      };`;
      // answer-leak guard: the green answer digit / stack slot and the missing chip's green answer face
      const mi = items.findIndex(it => it.count == null);
      const leak = mi < 0 ? [] : [{ x: X[mi] - 90, y: bottom - baseH - 170, w: 180, h: 150 }, ...(P.chips === false ? [] : [{ x: X[mi] - chW / 2, y: bottom + 14, w: chW, h: chH }])];
      return { html, css, js, files: [P.unit, P.base, ...items.map(i => i.img)].filter(Boolean) as string[], leak };
    },
  },

  /* ------------------------------------------------------------ what_changed
     Before/after memory on a grid: look → shutter blink → what changed? mode "colour" (one cell changes) or "swap" (two
     cells exchange). Checked: the differing indices equal `answer`; swap = same multiset, exactly 2 differ. */
  what_changed: {
    plan(r, ctx) {
      const p = empty();
      const look = r.timings?.look ?? 1.8;
      p.marks.blink = r2(0.5 + look);
      p.sfx.push({ name: 'pop', at: 0.15, gain_db: -8 }, { name: 'whoosh', at: p.marks.blink, gain_db: -8 });
      standardPlan(r, ctx, p, { busyUntil: p.marks.blink + 0.45, minCd: p.marks.blink + 0.9 });
      return p;
    },
    puzzle(r) {
      const P = r.params;
      const [cols, rows] = P.grid as [number, number];
      const B: string[] = P.before, A: string[] = P.after;
      if (B.length !== cols * rows || A.length !== B.length) throw new Error(`what_changed ${r.id}: grid ${cols}x${rows} needs ${cols * rows} before/after images`);
      const diff = B.map((b, i) => (b !== A[i] ? i : -1)).filter(i => i >= 0);
      const want = [...P.answer].sort((a: number, b: number) => a - b);
      if (JSON.stringify(diff) !== JSON.stringify(want)) throw new Error(`what_changed ${r.id}: cells that differ = [${diff}], answer = [${want}]`);
      if (P.mode === 'swap' && (diff.length !== 2 || [...B].sort().join() !== [...A].sort().join())) throw new Error(`what_changed ${r.id}: swap mode needs exactly two exchanged cells`);
      const sx = Math.min(270, 860 / cols), sy = Math.min(300, 720 / rows), pitch = Math.min(sx, sy);
      let g = Math.round(pitch * (P.item_scale ?? 0.78));
      // small objects (< 135 px of content at 1080; QA 10qg row of 5 ≈ 50 px at 360): before/after art scales together,
      // content-fitted, up to 94 % of the cell pitch
      const fit = P.auto_scale !== false ? autoFit(r.id, [...new Set([...B, ...A])], g, g, Math.round(pitch * 0.94), Math.round(pitch * 0.94)) : null;
      if (fit) g = Math.max(g, Math.round(pitch * 0.94));
      // rings/slots/ghosts never reach into a neighbour's cell (QA 5qn3 r2: the ghost door overlapped the next cell)
      const free = Math.max(0, (pitch - g) / 2 - 2), slotIn = Math.round(Math.min(14, free)), glowIn = Math.round(Math.min(26, Math.max(free, 4)));
      const C = B.map((_, i) => [450 + ((i % cols) - (cols - 1) / 2) * sx, 380 + (Math.floor(i / cols) - (rows - 1) / 2) * sy]);
      const cells = B.map((b, i) => `<div class="wc" id="wc${i}" style="left:${C[i][0] - g / 2}px;top:${C[i][1] - g / 2}px;width:${g}px;height:${g}px">
          <div class="slot"></div><img class="bf" src="${b}" /><img class="af" src="${A[i]}" />${diff.includes(i) ? `<div class="wglow"></div><div class="wtick">${TICK}</div>` : ''}</div>`).join('');
      const ghosts = P.mode === 'swap'
        ? diff.map(i => `<div class="gh dash" style="left:${C[i][0] - g / 2 - 10}px;top:${C[i][1] - g / 2 - 10}px;width:${g + 20}px;height:${g + 20}px"></div>`).join('') +
          `<svg id="arrows" viewBox="0 0 900 860">${(() => {
            // two arcs bowing to opposite sides of the a→b line (works for horizontal, vertical and diagonal pairs)
            const [a, b] = diff.map(i => C[i]); const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
            const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, k = g * 0.75, e = g * 0.55;
            const A1 = [a[0] + ux * e + nx * e * 0.6, a[1] + uy * e + ny * e * 0.6], B1 = [b[0] - ux * e + nx * e * 0.6, b[1] - uy * e + ny * e * 0.6];
            const A2 = [a[0] + ux * e - nx * e * 0.6, a[1] + uy * e - ny * e * 0.6], B2 = [b[0] - ux * e - nx * e * 0.6, b[1] - uy * e - ny * e * 0.6];
            const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            const f = (v: number) => v.toFixed(1);
            return `<path d="M${f(A1[0])} ${f(A1[1])} Q${f(m[0] + nx * k)} ${f(m[1] + ny * k)} ${f(B1[0])} ${f(B1[1])}" /><path d="M${f(B2[0])} ${f(B2[1])} Q${f(m[0] - nx * k)} ${f(m[1] - ny * k)} ${f(A2[0])} ${f(A2[1])}" />`; })()}</svg>`
        // colour mode: single row → the old item floats above its cell; multi-row → anchored on its own cell's top-left
        // corner (above would land on the cell of the row above)
        : diff.map(i => rows > 1
          ? `<div class="gh badge" style="left:${Math.max(C[i][0] - g * 0.68, C[i][0] - sx / 2 + 4)}px;top:${Math.max(C[i][1] - g * 0.68, C[i][1] - sy / 2 + 4)}px;width:${g * 0.5}px;height:${g * 0.5}px"><img src="${B[i]}" /></div>`
          : `<div class="gh" style="left:${C[i][0] - g * 0.3}px;top:${C[i][1] - g * 1.25}px;width:${g * 0.6}px;height:${g * 0.6}px"><img src="${B[i]}" /></div>`).join('');
      const html = `<div id="shut"><i></i><i></i><i></i><i></i><i></i><i></i></div>${cells}${ghosts}`;
      const css = `.wc{position:absolute}
        .wc .slot{position:absolute;inset:-${slotIn}px;border-radius:50%;background:#F4F1FF;border:6px solid #E3DCFF}
        .wc img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain} .wc .af{opacity:0}
        ${fit ? `.wc img{inset:auto;width:${fit.W}px;height:${fit.H}px;left:${Math.round(g / 2 - fit.cx * fit.W)}px;top:${Math.round(g / 2 - fit.cy * fit.H)}px;object-fit:fill}` : ''}
        .wglow{position:absolute;inset:-${glowIn}px;border-radius:50%;border:10px solid #22D489;box-shadow:0 0 ${glowIn < 26 ? 20 : 40}px rgba(34,212,137,.8);opacity:0}
        .wtick{position:absolute;top:-${Math.min(30, glowIn + 4)}px;right:-${Math.min(30, glowIn + 4)}px;width:80px;height:80px;opacity:0;z-index:3}
        .gh{position:absolute;opacity:0} .gh img{width:100%;height:100%;object-fit:contain;opacity:.5}
        .gh.dash{border:6px dashed #FFC83D;border-radius:50%}
        .gh.badge{background:#fff;border:5px solid #FFC83D;border-radius:24%;box-shadow:0 8px 20px rgba(29,21,72,.25);z-index:4}
        .gh.badge img{position:absolute;left:10%;top:10%;width:80%;height:80%;opacity:1}
        #arrows{position:absolute;inset:0;width:900px;height:860px;overflow:visible;opacity:0}
        #arrows path{fill:none;stroke:#FFC83D;stroke-width:10;stroke-linecap:round}
        #shut{position:absolute;inset:0;border-radius:48px;overflow:hidden;z-index:20;pointer-events:none}
        #shut i{display:block;height:16.7%;width:100%;background:linear-gradient(90deg,#6A3BFF,#2F8CFF,#19D3C5);transform-origin:100% 50%;transform:scaleX(0)}`;
      const js = `window.buildPuzzle=function(tl,Q){
        var M=Q.marks;
        Q.intro(tl,'.wc',{scale:.4,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.7)',stagger:.06},.15);
        tl.to('#shut i',{scaleX:1,duration:.17,ease:'power2.in',stagger:.01},M.blink);
        tl.set('.wc .bf',{opacity:0},M.blink+.22); tl.set('.wc .af',{opacity:1},M.blink+.22);
        tl.to('#shut i',{scaleX:0,duration:.17,ease:'power2.out',stagger:.01,transformOrigin:'0% 50%'},M.blink+.24);
        tl.fromTo('.gh',{scale:.5,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(1.8)'},Q.reveal+.05);
        tl.fromTo('#arrows',{opacity:0},{opacity:1,duration:.3},Q.reveal+.15);
        tl.fromTo('.wglow',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(1.8)'},Q.reveal+.05);
        tl.fromTo('.wtick',{scale:0,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(2.2)'},Q.reveal+.2);
      };`;
      return { html, css, js, files: [...new Set([...B, ...A])] };
    },
  },

  /* ------------------------------------------------------------ spot_difference
     Two panels (original on top, copy below); count the differences. Checked: number of `differences` = answer.
     The countdown ring moves to the left edge between the panels so it never covers a difference. */
  spot_difference: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'pop', at: 0.15, gain_db: -8 });
      standardPlan(r, ctx, p, { busyUntil: 0.5, minCd: r.timings?.look_min ?? 1.2 });
      const nd = (r.params.differences ?? []).length;
      for (let k = 0; k < nd; k++) p.sfx.push({ name: 'pop', at: r2(p.reveal! + 0.15 + k * 0.35), gain_db: -8 });
      const need = p.reveal! + 0.15 + nd * 0.35 + 0.8;
      if (need > p.duration) { const add = need - p.duration; p.duration = r2(p.duration + add); if (p.exit != null) p.exit = r2(p.exit + add); for (const s of p.sfx) if (s.name === 'whoosh') s.at = r2(s.at + add); }
      return p;
    },
    puzzle(r) {
      const P = r.params;
      if (P.answer != null && fromAr(P.answer) !== P.differences.length) throw new Error(`spot_difference ${r.id}: ${P.differences.length} differences listed, answer is ${P.answer}`);
      const sc = P.panel_scale ?? 0.98, pw = P.panel_w ?? 820, ph = P.panel_h ?? 420, iw = P.item_w ?? 130;
      const pos = [{ x: P.panel_x ?? 40, y: P.top_y ?? 5 }, { x: P.panel_x ?? 40, y: P.bottom_y ?? 435 }];
      // panel tags never sit under a reveal ring: top-right unless a difference ring reaches that corner, else top-left
      const tagSide = (k: number) => {
        if (k !== 1) return '';
        const right = { x: pw - 300, y: 0, w: 300, h: 130 };
        const clash = (P.differences ?? []).some((d: any) => d.x + d.r + 130 > right.x && d.y - d.r < right.y + right.h);
        return clash ? 'right:auto;left:18px' : '';
      };
      const panel = (pn: any, k: number) => `<div class="pn" id="pn${k}" style="left:${pos[k].x}px;top:${pos[k].y}px;width:${pw}px;height:${ph}px;transform:scale(${sc})">
          <img class="pbg" src="${pn.bg}" />${(pn.items ?? []).map((it: any) => `<img class="pit" src="${it.img}" style="left:${it.x - iw / 2}px;top:${it.y - iw / 2}px;width:${iw}px;height:${iw}px" />`).join('')}
          <div class="ptag" dir="rtl" style="${tagSide(k)}">${esc(k === 0 ? (P.top_label ?? 'الأصل') : (P.bottom_label ?? 'النسخة'))}</div>
          ${k === 1 ? P.differences.map((d: any, j: number) => `<div class="ring" id="ring${j}" style="left:${d.x - d.r}px;top:${d.y - d.r}px;width:${2 * d.r}px;height:${2 * d.r}px">${d.label ? `<span>${esc(d.label)}</span>` : ''}</div>`).join('') : ''}</div>`;
      // panels in #stage: when the explanation chip has no free slot outside the panels, the stage makes room (scales from
      // its top edge as the chip arrives, chrome.js) instead of covering panel evidence (j5qw request)
      const html = `<div id="stage">${panel(P.top, 0) + panel(P.bottom, 1)}</div>`;
      const css = `#stage{position:absolute;inset:0} .pn{position:absolute;transform-origin:0 0}
        .pbg{position:absolute;inset:0;width:100%;height:100%}
        .pit{position:absolute;object-fit:contain}
        .ptag{position:absolute;top:14px;right:18px;padding:0 26px 10px;border-radius:999px;background:#1D1548;color:#fff;font-weight:700;font-size:68px;line-height:1.25;direction:rtl}
        .ring{position:absolute;border-radius:50%;border:10px solid #22D489;box-shadow:0 0 30px rgba(34,212,137,.7);opacity:0;box-sizing:border-box}
        .ring span{position:absolute;left:calc(100% + 4px);top:50%;transform:translateY(-50%);background:#22D489;color:#fff;font-weight:700;font-size:28px;padding:0 14px 4px;border-radius:999px;white-space:nowrap;direction:rtl}`;
      const js = `window.buildPuzzle=function(tl,Q){
        Q.intro(tl,'.pn',{opacity:0,y:30},{opacity:1,y:0,duration:.4,ease:'back.out(1.6)'},.1);
        for(var j=0;j<${P.differences.length};j++){ tl.fromTo('#ring'+j,{scale:.4,opacity:0},{scale:1,opacity:1,duration:.3,ease:'back.out(2)'},Q.reveal+.15+j*.35); }
      };`;
      const files = [P.top.bg, P.bottom.bg, ...(P.top.items ?? []).map((i: any) => i.img), ...(P.bottom.items ?? []).map((i: any) => i.img)].filter(Boolean);
      return { html, css, js, files: [...new Set(files as string[])] };
    },
  },
};
