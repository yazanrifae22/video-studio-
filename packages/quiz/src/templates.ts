import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { LineDurations, QuizSpec, Round, Script } from './spec.ts';
import { cdLen, fill, lineOf } from './spec.ts';

/**
 * Round TEMPLATES. Each template has
 *  - plan(): turns line durations into the round's timeline (duration, where each narration line starts, SFX cues,
 *    and the marks the HTML animates against). Runs before TTS (script hints) and again after (measured lines).
 *  - puzzle(): the template-specific HTML/CSS/JS (inside the shared chrome: background, headline, card, countdown,
 *    reveal flash/glow, explanation chip, exit).
 * Coordinates: canvas 1080x1920; the card is the visual-system puzzle stage (x 90-990, y 470-1330 => 900x860).
 */
export interface Cue { name: string; at: number; gain_db?: number; /** keep in later rounds even if it looks like an intro pop */ keep?: boolean; /** keep this cue ≥ 6 dB under the start of that narration line */ under?: string }
export interface Plan {
  duration: number;
  lines: { id: string; at: number; dur: number }[];
  sfx: Cue[];
  heads: { id: string; text: string; at: number; out?: number; kind: 'hook' | 'q' | 'a' | 'cta' }[];
  marks: Record<string, number>;
  cd?: number; reveal?: number; explain?: number; exit?: number; /** open final round: p.reveal = countdown end, nothing revealed */ open?: boolean;
}
export interface Ctx { spec: QuizSpec; script: Script; dur: LineDurations; last: boolean; /** first round: puzzle builds in on screen (later rounds arrive built) */ first?: boolean }

export const GAP = 0.08;
export const r2 = (x: number) => Math.round(x * 100) / 100;
export const d = (ctx: Ctx, id?: string) => (id ? ctx.dur[id] ?? 1.2 : 0);

/** Lines spoken back-to-back from `t`; returns their placements and the end time. */
export function speak(ctx: Ctx, ids: (string | undefined)[], t: number, gap = GAP) {
  const out: Plan['lines'] = [];
  for (const id of ids) { if (!id) continue; out.push({ id, at: r2(t), dur: d(ctx, id) }); t += d(ctx, id) + gap; }
  return { lines: out, end: t - gap };
}

/** Shared tail: question → countdown (timings.cd, default 3 s) (ticks) → reveal (ding) + answer line → explanation chip → exit whoosh. */
/** Reveal mix rules (QA round 1, pilot v2): ding ≈ −12 dB relative to its full-scale file, answer line 0.14 s after its attack. */
export const DING_DB = -12, ANSWER_DELAY = 0.14;
export function tail(ctx: Ctx, r: Round, p: Plan, qAt: number, minCd: number) {
  const q = lineOf(ctx.script, r.q_line)!;
  const a = r.open ? undefined : lineOf(ctx.script, r.a_line)!;
  p.lines.push({ id: q.id, at: r2(qAt), dur: d(ctx, q.id) });
  p.heads.push({ id: 'h-q', text: fill(q.onscreen_ar, ctx.spec), at: r2(qAt - 0.05), kind: 'q' });
  // the ring starts entering only when the question's last word has ended (clip tail pad = 0.12 s, ring entry = 0.15 s),
  // so the question caption can stay up until its last word ends
  const cd = r2(Math.max(qAt + d(ctx, q.id) + 0.03, minCd));
  const L = cdLen(ctx.spec, r), st = L / 3;  // countdown length (default 3 s): ٣ ٢ ١ one beat each
  const rv = r2(cd + L);
  p.heads[p.heads.length - 1].out = r2(rv - 0.2);
  if (!a) {
    // OPEN round: the countdown ends, nothing is revealed (no ding / flip / answer head / explain); finalBeat adds the closing ask.
    // p.reveal stays = countdown end (leak guard samples the question phase up to it); compose.ts strips reveal-time SFX.
    p.cd = cd; p.reveal = rv; p.explain = undefined; p.open = true;
    p.duration = r2(rv + 0.3);
    if (L !== 3) p.marks.cdLen = L;
    p.sfx.push({ name: 'tick', at: cd }, { name: 'tick', at: cd + st }, { name: 'tick_last', at: cd + 2 * st });
    return p;
  }
  p.heads.push({ id: 'h-a', text: fill(a.onscreen_ar, ctx.spec), at: r2(rv + 0.05), kind: 'a' });
  // the answer word starts AFTER the ding's attack (QA: a ding on top of the first word masked it)
  const aAt = rv + ANSWER_DELAY;
  p.lines.push({ id: a.id, at: r2(aAt), dur: d(ctx, a.id) });
  p.cd = cd; p.reveal = rv;
  p.explain = r2(rv + Math.min(1.0, Math.max(0.5, d(ctx, a.id) * 0.35)));
  const end = Math.max(aAt + d(ctx, a.id) + 0.2, (p.explain ?? rv) + 0.95, rv + 1.45) + (r.timings?.hold ?? 0);
  p.duration = r2(end);  // the exit (card slide + whoosh) plays inside the last 0.3 s
  if (L !== 3) p.marks.cdLen = L;
  p.sfx.push({ name: 'tick', at: cd }, { name: 'tick', at: cd + st }, { name: 'tick_last', at: cd + 2 * st }, { name: 'ding', at: rv, gain_db: DING_DB, under: a.id });
  if (r.explanation_ar) p.sfx.push({ name: 'pop', at: p.explain, gain_db: -8 });
  if (!ctx.last) { p.exit = r2(p.duration - 0.3); p.sfx.push({ name: 'whoosh', at: r2(p.duration - 0.36), gain_db: -4 }); }
  return p;
}

/**
 * Final beat of the LAST puzzle round (owner 2026-11-08; fixes "score_cta can't append to the last round's post_lines"):
 *  - post_lines (e.g. the SR3 score ask «كم جبت من ٣؟ اكتبها بالتعليقات») are spoken right after the answer line
 *    (gap timings.post_gap, default GAP; SR7: 0.6 s silent hold → set post_gap so the ask starts ≈ reveal + 0.6), and
 *    without an end_question the first one's onscreen_ar replaces the answer headline as a `cta` head;
 *  - end_question: big on-screen question above the card from reveal + at (default 0.6 s) to the loop zoom, optional
 *    spoken line after everything. The round only grows when the question would be on screen < min_s (default 1.4 s);
 *    the growth is reported in marks.endq_ext.
 * Rounds without post_lines/end_question are untouched (old quiz.json files build unchanged).
 */
export function finalBeat(r: Round, ctx: Ctx, p: Plan, loopS: number) {
  const EQ = ctx.spec.end_question;
  const post = (r.post_lines ?? []).filter(Boolean);
  if (!post.length && !EQ) return p;
  if (p.reveal == null) throw new Error(`round ${r.id}: post_lines / end_question need a round with a reveal`);
  const lastEnd = Math.max(p.reveal, ...p.lines.map(l => l.at + l.dur));
  let t = lastEnd + (r.timings?.post_gap ?? (r.open ? 0.25 : GAP));
  const ids = [...post, ...(EQ?.line ? [EQ.line] : [])];
  const s = speak(ctx, ids, t);
  p.lines.push(...s.lines);
  let end = ids.length ? Math.max(p.duration, s.end + (r.open ? 0.7 + loopS : 0.2)) : p.duration;
  if (post.length && !EQ) {
    const o1 = lineOf(ctx.script, post[0])!;
    p.heads.push({ id: 'h-cta', text: fill(o1.onscreen_ar, ctx.spec), at: r2(s.lines[0].at - 0.05), kind: 'cta' });
  }
  if (EQ) {
    const at = r2(p.reveal + (EQ.at ?? 0.6));
    const need = at + (EQ.min_s ?? 1.4) + loopS;  // readable before the loop zoom clears the text
    if (need > end) { p.marks.endq_ext = r2(need - end); end = need; }
    p.marks.endq = at;
  }
  p.duration = r2(end);
  return p;
}

/**
 * Big text block (hook line / end question): balanced word lines (≤ maxLines; a «…»/«..» splits first) and the largest
 * font size ≤ maxPx that fits w x h (Cairo Black ≈ 0.6 em per Arabic letter, tashkeel ignored; line-height 1.16).
 */
export function bigLines(text: string, w: number, h: number, maxPx: number, maxLines = 3, gapEm = 0): { lines: string[]; px: number } {
  const len = (s: string) => Math.max(1, [...s.replace(/[ً-ْٰ]/g, '')].length);
  const W = text.trim().split(/\s+/);
  const cands: string[][] = [];
  const parts = text.split(/(?<=[….؟!])\s+/).map(s => s.trim()).filter(Boolean);  // the writer's breaks: … . ؟ !
  if (parts.length > 1 && parts.length <= maxLines) cands.push(parts);
  for (let n = 1; n <= Math.min(maxLines, W.length); n++) {
    // greedy balance: split W into n lines of ~equal letters
    const tot = len(W.join(' ')), out: string[] = []; let cur: string[] = [];
    for (const wd of W) { cur.push(wd); if (out.length < n - 1 && len(cur.join(' ')) >= tot / n) { out.push(cur.join(' ')); cur = []; } }
    if (cur.length) out.push(cur.join(' '));
    cands.push(out);
  }
  let best = { lines: [text], px: 0 };
  const pxOf = (L: string[]) => Math.floor(Math.min(maxPx, (w - 90) / (Math.max(...L.map(len)) * 0.6), h / (L.length * 1.16 + (L.length - 1) * gapEm + 0.2)));
  for (const L of cands) { const px = pxOf(L); if (px > best.px) best = { lines: L, px }; }
  // the writer's «…» break reads better: keep it when it costs ≤ 15 % of the size
  if (parts.length > 1 && parts.length <= maxLines && pxOf(parts) >= 0.85 * best.px && pxOf(parts) >= 60) best = { lines: parts, px: pxOf(parts) };
  if (best.px < 60) throw new Error(`text «${text}» too long for big type (${best.px} px < 60) — shorten it`);
  return best;
}

export const empty = (): Plan => ({ duration: 0, lines: [], sfx: [], heads: [], marks: {} });

/* ---------- art measurement: small objects auto-scale (batch-4 polish) ---------- */
let ART_DIR = '';
/** Production dir the round's art paths are relative to (compose.writeRound sets it before puzzle()). */
export function setArtDir(dir: string) { ART_DIR = dir; }
/** Notes for quiz:plan (e.g. objects still small after auto-scale); plan.ts drains them per round. */
export const ART_NOTES: string[] = [];
/** Minimum object width on the 1080 canvas: ≈ 45 px on a 360 px phone (QA 5qn3 doors 27 px, 10qg row of 5 ≈ 50 px). */
export const MIN_OBJ_W = 135;
type Ext = { iw: number; ih: number; x: number; y: number; w: number; h: number };
const extCache = new Map<string, Ext | null>();
/** Visible content (alpha > 10 %) of an art file as fractions of the image, plus its pixel size; null if unreadable. */
export function artExtent(rel: string): Ext | null {
  if (!ART_DIR || !rel || rel.startsWith('icon:')) return null;
  const f = path.join(ART_DIR, rel);
  if (!fs.existsSync(f)) return null;
  const key = `${f}:${fs.statSync(f).mtimeMs}`;
  if (extCache.has(key)) return extCache.get(key)!;
  let out: Ext | null = null;
  try {
    const [iw, ih] = String(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f])).trim().split(',').map(Number);
    const W = 160, H = Math.max(1, Math.round((W * ih) / iw));
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', `scale=${W}:${H},format=rgba,alphaextract`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 22 });
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (raw[y * W + x] > 25) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (x1 >= 0) out = { iw, ih, x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H };
  } catch { out = null; }
  extCache.set(key, out);
  return out;
}
export interface Fit { W: number; H: number; cx: number; cy: number; cw: number; ch: number }
/**
 * Auto-scale for small objects: if any of `files` (one shared layout, e.g. a cover and its items) shows < MIN_OBJ_W px of
 * content when drawn `object-fit: contain` in a boxW x boxH box, returns one image size for all of them that scales the
 * union of their visible content up (target ≈ 150 px wide) inside maxW x maxH, never smaller than before; null = keep the
 * current layout. `cx`/`cy`: content centre as fractions of the image; `cw`/`ch`: content size in px.
 */
export function autoFit(roundId: string, files: string[], boxW: number, boxH: number, maxW: number, maxH: number): Fit | null {
  const ex = files.map(artExtent);
  if (!ex.length || ex.some(e => !e)) return null;
  const E = ex as Ext[], ar = E[0].ih / E[0].iw;
  if (E.some(e => Math.abs(e.ih / e.iw - ar) > 0.02)) return null;  // mixed aspect ratios: no shared layout
  const cur = Math.min(...E.map(e => e.w * e.iw * Math.min(boxW / e.iw, boxH / e.ih)));
  if (cur >= MIN_OBJ_W) return null;
  const ux = Math.min(...E.map(e => e.x)), uy = Math.min(...E.map(e => e.y));
  const uw = Math.max(...E.map(e => e.x + e.w)) - ux, uh = Math.max(...E.map(e => e.y + e.h)) - uy;
  const W0 = Math.min(boxW, boxH / ar);  // current displayed image width
  const minw = Math.min(...E.map(e => e.w));  // the narrowest object sets the target; the union must still fit the box
  const W = Math.max(W0, Math.min(150 / minw, maxW / uw, maxH / (uh * ar)));
  const fit = { W: Math.round(W), H: Math.round(W * ar), cx: ux + uw / 2, cy: uy + uh / 2, cw: Math.round(uw * W), ch: Math.round(uh * W * ar) };
  const after = Math.round(minw * W);
  ART_NOTES.push(`${roundId}: auto-scaled small objects ${Math.round(cur)} → ${after} px wide (narrowest; 1080 canvas, ≈ ${Math.round(after / 3)} px at 360)${after < MIN_OBJ_W ? ' — still under 135 px: crop the art tighter, use wider objects or fewer cells' : ''}`);
  return fit;
}

/** memory_flash grid geometry (card px): 2x2 (4 cells) or 3x3 (9 cells). */
export function flashGeom(n: number) {
  const g = n === 9
    ? { cols: 3, s: 228, pitch: 250, x0: 200, y0: 122, inset: 10, bw: 8, q: 120, rad: 28, tick: 76, toff: -26, img: 0.8 }
    : { cols: 2, s: 310, pitch: 330, x0: 285, y0: 200, inset: 34, bw: 12, q: 170, rad: 36, tick: 100, toff: -36, img: 0.78 };
  const pos = Array.from({ length: n }, (_, i) => [g.x0 + (i % g.cols) * g.pitch, g.y0 + Math.floor(i / g.cols) * g.pitch]);
  return { ...g, pos };
}

export interface Template {
  plan: (r: Round, ctx: Ctx) => Plan;
  /** `leak`: card-px boxes where an answer layer (correct green #22D489) appears at the reveal; the build samples them
   *  from round start to the reveal and fails if that green shows early (answer-leak guard). */
  puzzle: (r: Round, p: Plan) => { html: string; css: string; js: string; files: string[]; leak?: { x: number; y: number; w: number; h: number }[]; /** html placed in the root under the card (full-bleed layers, e.g. hook_intro's colour wash) */ root?: string };
}

/** shell_game arc heights (px) for a swap spanning `span` slots: default 120 up / 60 down; `params.arc: "scaled"` grows
 *  both with the swap distance so long swaps lift the movers clear of the static objects they pass. */
export function shellArc(span: number, scaled: boolean, w = 0): [number, number] {
  if (!scaled || span < 2) return [120, 60];
  return [Math.min(260, Math.max(120 * (1 + 0.45 * (span - 1)), 0.8 * w)), Math.min(240, Math.max(60 * (1 + 1.5 * (span - 1)), 0.8 * w))];
}
/** Simulates every swap (power2.inOut slide, sine.out yoyo arc) and returns the worst crowding: two objects (moving or
 *  static) whose centres come closer than 0.75 x object width overlap by > 25 % of their width. */
export function shellCrowding(X: number[], swaps: number[][], w: number, scaled: boolean) {
  const at = X.map((_, i) => i), bad: string[] = [];
  const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const arc = (u: number) => Math.sin((u < 0.5 ? u * 2 : (1 - u) * 2) * Math.PI / 2);
  swaps.forEach((s, k) => {
    const A = at.indexOf(s[0]), B = at.indexOf(s[1]);
    const [up, down] = shellArc(Math.abs(s[1] - s[0]), scaled, w);
    let worst = Infinity, pair = '';
    for (let j = 1; j < 24; j++) {
      const u = j / 24, e = ease(u), y = arc(u);
      const pos = at.map((slot, c) => c === A ? [X[s[0]] + (X[s[1]] - X[s[0]]) * e, -up * y] : c === B ? [X[s[1]] + (X[s[0]] - X[s[1]]) * e, down * y] : [X[slot], 0]);
      for (let a = 0; a < pos.length; a++) for (let b = a + 1; b < pos.length; b++) {
        const dd = Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);
        if (dd < worst) { worst = dd; pair = `objects ${a}/${b} at ${(u * 100).toFixed(0)} %`; }
      }
    }
    if (worst < 0.75 * w) bad.push(`swap ${k + 1} [${s}]: ${pair} overlap ${(100 * (1 - worst / w)).toFixed(0)} % of their width`);
    at[A] = s[1]; at[B] = s[0];
  });
  return bad;
}
/** First batch (pilot). templates-more.ts holds the second batch; registry.ts merges both. */
export const TEMPLATES: Record<string, Template> = {
  /* ------------------------------------------------------------ colour_reveal
     N grayscale objects → which one is <colour>? Reveal swaps to colour. Fair because luminance differs (art check:
     params.items[].luma must be distinct by ≥ 0.1). */
  colour_reveal: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'pop', at: 0.12, gain_db: -6 });
      let t = 0.1;
      if (r.pre_lines?.length) {
        const s = speak(ctx, r.pre_lines, t);
        p.lines.push(...s.lines);
        const h = lineOf(ctx.script, r.pre_lines[0])!;
        p.heads.push({ id: 'h-hook', text: fill(h.onscreen_ar, ctx.spec), at: 0.0, out: r2(Math.max(s.end + 0.02, s.end + 0.25 - 0.25)), kind: 'hook' });
        t = s.end + 0.08;
      }
      // no hook line: the question is spoken from the first frames (the puzzle is on screen from frame 1)
      return tail(ctx, r, p, r.pre_lines?.length ? Math.max(t, 0.5) : 0.12, 1.2);
    },
    puzzle(r, p) {
      const items: any[] = r.params.items;
      const col = r.params.layout === 'column';  // stacked rows (viewer's top = index 0) for wide objects
      const n = items.length, w = Math.min(280, 840 / n);  // centres kept inside x 950 (action rail)
      const rowH = Math.min(260, 720 / n), iw = r.params.item_w ?? 640;
      const pos = (i: number) => col ? `left:${40 + iw / 2}px;top:${(30 + i * rowH).toFixed(0)}px` : `left:${(450 + (i - (n - 1) / 2) * w).toFixed(0)}px`;
      const html = items.map((it, i) => `<div class="obj" id="obj${i}" style="${pos(i)}">
          <img class="g" src="${it.gray}" /><img class="c" id="col${i}" src="${it.color}" />
          ${i === r.params.answer ? '<div id="glow"></div><div id="tick">' + TICK + '</div>' : ''}
          <div class="lum" id="lum${i}"><span style="background:${it.swatch}"></span></div></div>`).join('');
      const css = `.obj{position:absolute;top:70px;isolation:isolate;width:${w - 8}px;height:480px;margin-left:-${((w - 8) / 2).toFixed(0)}px;display:flex;align-items:flex-end;justify-content:center}
        .obj img{position:absolute;bottom:0;left:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%}
        .obj .c{opacity:0}
        #glow{position:absolute;left:-40px;right:-40px;bottom:-40px;height:380px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,212,137,.55),rgba(34,212,137,0));z-index:-1}
        #tick{position:absolute;top:-10px;right:-10px;width:110px;height:110px}
        .lum{position:absolute;bottom:-125px;left:50%;margin-left:-45px;width:90px;height:90px;opacity:0}
        .lum span{display:block;width:100%;height:100%;border-radius:50%;border:6px solid #fff;box-shadow:0 8px 24px rgba(29,21,72,.25)}
        ${col ? `.obj{top:auto;width:${iw}px;height:${rowH - 16}px;margin-left:-${iw / 2}px;align-items:center}
        .obj img{object-position:50% 50%}
        #glow{left:-20px;right:-20px;top:-10px;bottom:-10px;height:auto}
        #tick{top:0;right:-20px;width:90px;height:90px}
        .lum{bottom:auto;top:50%;left:auto;right:-${(860 - iw - 40 - 80) / 2 + 45}px;margin:-45px 0 0 0}` : ''}`;
      const js = `window.buildPuzzle=function(tl,Q){
        for(var i=0;i<${n};i++){ Q.intro(tl,'#obj'+i,{y:Q.T0===0?0:80,opacity:Q.T0===0?1:0,scale:Q.T0===0?.9:.7},{y:0,opacity:1,scale:1,duration:.5,ease:'back.out(1.6)'},(Q.T0===0?0:.15)+i*.08); }
        for(var i=0;i<${n};i++){ tl.fromTo('#col'+i,{opacity:0},{opacity:1,duration:.25,ease:'power1.out'},Q.reveal+.02); }
        tl.fromTo('#obj${r.params.answer}',{scale:1},{scale:1.12,duration:.18,ease:'power2.out',yoyo:true,repeat:1},Q.reveal+.02);
        for(var i=0;i<${n};i++){ tl.fromTo('#lum'+i,{y:20,opacity:0},{y:0,opacity:1,duration:.35,ease:'back.out(1.6)'},Q.explain-.3+i*.12); }
      };`;
      return { html, css, js, files: items.flatMap(it => [it.gray, it.color]) };
    },
  },

  /* ------------------------------------------------------------ shell_game
     Object placed under one of 3 cups, `swaps` pairs of SLOTS exchanged with eased arcs; fair because every swap is
     visible and slow (≥0.75 s). The generator simulates the swaps and refuses a spec whose final slot ≠ answer. */
  shell_game: {
    plan(r, ctx) {
      const p = empty();
      const P = r.params, fade = Array.isArray(P.items);
      const sw = r.timings?.swap ?? 0.8, gap = 0.12, swaps: number[][] = P.swaps;
      const set = speak(ctx, [r.set_line], 0.15);
      p.lines.push(...set.lines);
      if (r.set_line) p.heads.push({ id: 'h-set', text: fill(lineOf(ctx.script, r.set_line)?.onscreen_ar, ctx.spec), at: 0.05, kind: 'hook' });
      if (fade) {  // objects shown in colour, then all fade to one identical cover image, then shuffle
        const show = r.timings?.show ?? 1.1;
        p.marks.place = 0.15; p.marks.cover = r2(0.5 + show); p.marks.swap0 = r2(p.marks.cover + 0.45);
        p.sfx.push({ name: 'pop', at: 0.2, gain_db: -6 }, { name: 'shimmer', at: p.marks.cover, gain_db: -8 });
      } else {
        p.marks.place = 0.25; p.marks.cover = 0.7; p.marks.swap0 = 1.15;
        p.sfx.push({ name: 'pop', at: 0.35, gain_db: -6 });
      }
      swaps.forEach((_, k) => p.sfx.push({ name: 'swap', at: r2(p.marks.swap0 + k * (sw + gap)), gain_db: -8 }));
      const swapsEnd = p.marks.swap0 + swaps.length * (sw + gap) - gap;
      p.marks.swapDur = sw; p.marks.swapGap = gap;
      const qAt = Math.max(set.end + 0.15, swapsEnd + 0.05);  // never ask while a cup is still moving
      if (p.heads[0]) p.heads[0].out = r2(qAt - 0.25);
      return tail(ctx, r, p, qAt, swapsEnd + 0.25);
    },
    puzzle(r, p) {
      const P = r.params, fade = Array.isArray(P.items);
      const n: number = fade ? P.items.length : (P.cups ?? 3);
      const swaps: number[][] = P.swaps;
      const start: number = fade ? P.target : P.start;
      if (n < 2 || n > 5) throw new Error(`shell_game ${r.id}: ${n} cups/items (2-5 supported)`);
      for (const s of swaps) if (s.length !== 2 || s[0] === s[1] || s.some(x => x < 0 || x >= n)) throw new Error(`shell_game ${r.id}: bad swap ${JSON.stringify(s)}`);
      if (fade) {  // the swaps track `target`, so the drawn object must sit there (QA h10t: fish drawn at items[2], target 1)
        const odd = P.items.map((it: string, i: number) => (it !== P.cover ? i : -1)).filter((i: number) => i >= 0);
        if (P.items[start] === P.cover || (odd.length === 1 && odd[0] !== start))
          throw new Error(`shell_game ${r.id}: target ${start} is not the object slot (object at items[${odd.join(',')}])`);
      }
      let slot = start;
      for (const [a, b] of swaps) slot = slot === a ? b : slot === b ? a : slot;
      if (slot !== P.answer) throw new Error(`shell_game ${r.id}: swaps end at slot ${slot}, answer is ${P.answer}`);
      const sp = Math.min(280, 840 / n);                       // slot spacing; outer slots stay left of x 950
      const X = Array.from({ length: n }, (_, i) => Math.round(450 + (i - (n - 1) / 2) * sp));
      const cw = Math.round(Math.min(250, sp * 0.85)), ch = Math.round(cw * 290 / 250);
      const oh = P.object_h ?? Math.round(cw * 0.6);
      // fade mode: small objects (< 135 px of visible content at 1080) scale up to ≈ 150 px wide inside the slot
      // spacing / 320 px height, and the row is centred in the card (QA 5qn3: doors 27 px at 360, sat low)
      const fit = fade && P.auto_scale !== false ? autoFit(r.id, [...P.items, P.cover], cw, cw, Math.round(sp * 0.92), 320) : null;
      const objW = fit ? Math.max(cw, fit.cw) : cw;
      // crowding check (QA 60tv/ux4u/3uyp): swaps between non-adjacent slots carry movers over static objects
      const crowd = shellCrowding(X, swaps, objW, P.arc === 'scaled');
      if (crowd.length) throw new Error(`shell_game ${r.id}: objects clump — ${crowd.join('; ')} (use adjacent swaps or params.arc: "scaled")`);
      const arcs = swaps.map(s => shellArc(Math.abs(s[1] - s[0]), P.arc === 'scaled', objW));
      const mover = (c: number) => fade
        ? `<img class="it" src="${P.items[c]}" /><img class="cv" id="cv${c}" src="${P.cover}" />`
        : `${c === start ? `<img class="obj" id="obj" src="${P.object}" />` : ''}<div class="cg" id="cg${c}">${CUP}</div>`;
      const html = X.map((x, c) => `<div class="cup" id="cup${c}" style="left:${x}px">${c === start ? '<div id="glow"></div><div id="tick">' + TICK + '</div>' : ''}${mover(c)}</div>`).join('') + '<div id="table"></div>';
      // table line: the cup row sits centred in the card, with room for the arcs above/below; an auto-scaled row puts
      // its content centre at y 410 (centre of the band the arcs sweep above the countdown ring)
      const BASE = P.base_y ?? (fit ? Math.round(410 + 20 + fit.ch / 2) : 560);
      const boxH = fit ? fit.ch + 40 : fade ? cw + 40 : ch + 130;
      const fitCss = fit ? `.it,.cv{width:${fit.W}px;height:${fit.H}px;left:${Math.round(cw / 2 - fit.cx * fit.W)}px;top:${Math.round(boxH - 20 - fit.ch / 2 - fit.cy * fit.H)}px;bottom:auto;object-fit:fill}` : '';
      const css = `.cup{position:absolute;top:${BASE - boxH}px;isolation:isolate;width:${cw}px;height:${boxH}px;margin-left:-${cw / 2}px}
        .cg{position:absolute;left:0;bottom:0;width:${cw}px;height:${ch}px}
        .cg svg{width:100%;height:100%;overflow:visible}
        .obj{position:absolute;left:50%;bottom:${Math.round(ch * 0.12)}px;height:${oh}px;width:${Math.round(cw * 0.75)}px;margin-left:-${Math.round(cw * 0.375)}px;object-fit:contain;object-position:50% 100%}
        .it,.cv{position:absolute;left:0;bottom:20px;width:${cw}px;height:${cw}px;object-fit:contain}
        .cv{opacity:0}
        #glow{position:absolute;left:-30px;right:-30px;bottom:-40px;height:${Math.round(ch * 0.9)}px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,212,137,.6),rgba(34,212,137,0));z-index:-1}
        #tick{position:absolute;top:${fade ? -10 : 60}px;right:-10px;width:${Math.round(Math.min(100, cw * 0.45))}px;height:${Math.round(Math.min(100, cw * 0.45))}px;z-index:4}
        #table{position:absolute;left:40px;right:40px;top:${BASE + 6}px;height:16px;border-radius:8px;background:rgba(29,21,72,.08)}
        ${fitCss}`;
      const js = `window.buildPuzzle=function(tl,Q){
        var M=Q.marks, X=${JSON.stringify(X)}, n=${n}, at=X.map(function(_,i){return i}), swaps=${JSON.stringify(swaps)}, arcs=${JSON.stringify(arcs)}, fade=${fade}, ch=${ch};
        for(var c=0;c<n;c++){ Q.intro(tl,'#cup'+c,{y:60,opacity:0},{y:0,opacity:1,duration:.4,ease:'back.out(1.6)'},.1+c*.07); }
        if(fade){
          for(var c=0;c<n;c++){ tl.fromTo('#cv'+c,{opacity:0},{opacity:1,duration:.3,ease:'power1.inOut'},M.cover); }
        } else {
          for(var c=0;c<n;c++){ tl.set('#cg'+c,{y:-(ch+10)},0); }
          tl.fromTo('#obj',{scale:0,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(2)'},M.place);
          for(var c=0;c<n;c++){ tl.to('#cg'+c,{y:0,duration:.45,ease:'power3.inOut'},M.cover+c*.06); }
        }
        swaps.forEach(function(s,k){
          var t=M.swap0+k*(M.swapDur+M.swapGap), A=at.indexOf(s[0]), B=at.indexOf(s[1]);
          tl.set('#cup'+A,{zIndex:1},t); tl.set('#cup'+B,{zIndex:3},t);
          tl.to('#cup'+A,{left:X[s[1]],duration:M.swapDur,ease:'power2.inOut'},t);
          tl.to('#cup'+A,{y:-arcs[k][0],duration:M.swapDur/2,ease:'sine.out',yoyo:true,repeat:1},t);  // A above, B below: 180 px apart mid-swap (default)
          tl.to('#cup'+B,{left:X[s[0]],duration:M.swapDur,ease:'power2.inOut'},t);
          tl.to('#cup'+B,{y:arcs[k][1],scale:1.06,duration:M.swapDur/2,ease:'sine.out',yoyo:true,repeat:1},t);
          at[A]=s[1]; at[B]=s[0];
        });
        tl.set('#cup${start}',{zIndex:5},Q.reveal);
        if(fade){
          for(var c=0;c<n;c++){ tl.to('#cv'+c,{opacity:0,duration:.3,ease:'power1.inOut'},Q.reveal); }
          tl.fromTo('#cup${start}',{scale:1},{scale:1.15,duration:.18,ease:'power2.out',yoyo:true,repeat:1},Q.reveal+.15);
        } else {
          tl.to('#cg${start}',{y:-(ch+40),rotation:8,duration:.45,ease:'power3.out'},Q.reveal);
          tl.fromTo('#obj',{scale:1},{scale:1.18,duration:.18,ease:'power2.out',yoyo:true,repeat:1},Q.reveal+.15);
        }
      };`;
      return { html, css, js, files: fade ? [...P.items, P.cover] : [P.object] };
    },
  },

  /* ------------------------------------------------------------ memory_flash
     2x2 (4 cells) or 3x3 (9 cells) cards, face-up from frame 0 for `flash` s (default 1.5 / 1.1), then flipped; which card
     hid the object? Fair: it is shown. The answer card flips back and lies flat >= 2 frames before its ring + tick. */
  memory_flash: {
    plan(r, ctx) {
      const p = empty();
      const n = (r.params.cells ?? []).length;
      const flash = r.timings?.flash ?? (n === 9 ? 1.1 : 1.5);
      const set = speak(ctx, [r.set_line], 0.15);
      p.lines.push(...set.lines);
      p.heads.push({ id: 'h-set', text: fill(lineOf(ctx.script, r.set_line)?.onscreen_ar, ctx.spec), at: 0.05, kind: 'hook' });
      p.marks.up = r.timings?.intro ?? 0.05; p.marks.flip = r2(p.marks.up + flash);  // grid is face-up from frame 0 (timings.intro shifts it)
      p.sfx.push({ name: 'pop', at: 0.2, gain_db: -6 }, { name: 'flip', at: p.marks.flip, gain_db: -4 });
      const settle = n === 9 ? 0.15 : 0;  // the 3x3 flip wave lasts 0.2 s longer
      const qAt = Math.max(set.end + 0.15, p.marks.flip + 0.35 + settle);
      p.heads[0].out = r2(qAt - 0.25);
      tail(ctx, r, p, qAt, p.marks.flip + 0.6 + settle);
      p.sfx.push({ name: 'flip', at: p.reveal!, gain_db: -4 });
      return p;
    },
    puzzle(r, p) {
      const cells: string[] = r.params.cells; // 4 or 9 entries, row-major from viewer's top-left: image path or icon:<name>
      const n = cells?.length, a: number = r.params.answer;
      if (n !== 4 && n !== 9) throw new Error(`memory_flash ${r.id}: ${n} cells (4 = 2x2 or 9 = 3x3 supported)`);
      if (!Number.isInteger(a) || a < 0 || a >= n) throw new Error(`memory_flash ${r.id}: answer ${a} is not a cell index 0-${n - 1}`);
      if (cells.filter(c => c === cells[a]).length > 1) throw new Error(`memory_flash ${r.id}: the answer object appears in more than one cell (the question names it)`);
      if (n === 9 && new Set(cells).size < 4) throw new Error(`memory_flash ${r.id}: a 3x3 grid needs >= 4 different objects (Difficulty rules v2)`);
      const G = flashGeom(n), pos = G.pos;
      // small objects scale up (>= 135 px of content at 1080) inside the card face
      const imgs = cells.filter(c => !c.startsWith('icon:'));
      const inner = G.s - 12, box = Math.round(inner * G.img);
      const fit = imgs.length === n && r.params.auto_scale !== false ? autoFit(r.id, [...new Set(imgs)], box, box, Math.round(inner * 0.92), Math.round(inner * 0.92)) : null;
      const face = (c: string) => c.startsWith('icon:') ? ICONS[c.slice(5)] : `<img src="${c}" />`;
      const html = cells.map((c, i) => `<div class="mc" id="mc${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px"><div class="mi" id="mi${i}">
          <div class="fr">${face(c)}</div><div class="bk"><span>؟</span></div></div>
          ${i === a ? '<div id="mglow"></div><div id="mtick">' + TICK + '</div>' : ''}</div>`).join('');
      const css = `.mc{position:absolute;isolation:isolate;width:${G.s}px;height:${G.s}px;margin:-${G.s / 2}px 0 0 -${G.s / 2}px;perspective:1400px}
        .mi{position:absolute;inset:0;transform-style:preserve-3d}
        .fr,.bk{position:absolute;inset:0;border-radius:${G.rad}px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px rgba(29,21,72,.18)}
        .fr{background:#F4F1FF;border:6px solid #E3DCFF}
        .fr img{width:${Math.round(G.img * 100)}%;height:${Math.round(G.img * 100)}%;object-fit:contain}
        .fr svg{width:62%;height:62%}
        .bk{transform:rotateY(180deg);background:linear-gradient(135deg,#6A3BFF,#2F8CFF 60%,#19D3C5)}
        .bk span{font-weight:900;font-size:${G.q}px;color:#fff;line-height:1;text-shadow:0 6px 18px rgba(0,0,0,.25)}
        #mglow{position:absolute;inset:-${G.inset}px;border-radius:${Math.round(G.rad + G.inset * 0.6)}px;border:${G.bw}px solid #22D489;box-shadow:0 0 ${n === 9 ? 24 : 50}px rgba(34,212,137,.9);z-index:-1;opacity:0}
        #mtick{position:absolute;top:${G.toff}px;right:${G.toff}px;width:${G.tick}px;height:${G.tick}px;z-index:3}
        ${fit ? `.fr img{position:absolute;width:${fit.W}px;height:${fit.H}px;left:${Math.round(inner / 2 - fit.cx * fit.W)}px;top:${Math.round(inner / 2 - fit.cy * fit.H)}px;object-fit:fill}` : ''}`;
      const js = `window.buildPuzzle=function(tl,Q){
        var M=Q.marks, n=${n}, st=${n === 9 ? 0.025 : 0.04};
        for(var i=0;i<n;i++){ Q.intro(tl,'#mc'+i,{scale:.4,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.7)'},.15+i*.08); }
        for(var i=0;i<n;i++){ tl.to('#mi'+i,{rotationY:180,duration:.4,ease:'power2.inOut'},M.flip+i*st); }
        tl.to('#mi${a}',{rotationY:360,duration:.4,ease:'power2.inOut'},Q.reveal);
        // the answer card lies flat from reveal + 0.4 s; ring, tick and pulse wait 3 frames (QA eqw1: no ring on a tilted card)
        var flat=Q.reveal+.4+3/30;
        tl.fromTo('#mglow',{scale:.6,opacity:0},{scale:1,opacity:1,duration:.35,ease:'back.out(1.8)'},flat);
        tl.fromTo('#mtick',{scale:0,rotation:-30},{scale:1,rotation:0,duration:.4,ease:'back.out(2.2)'},flat+.1);
        tl.fromTo('#mc${a}',{scale:1},{scale:1.1,duration:.18,ease:'power2.out',yoyo:true,repeat:1},flat);
      };`;
      // answer-leak guard: the ring's band around the answer card (outside its face, so green art on a card never trips it)
      const [cx, cy] = pos[a], h = G.s / 2, I = G.inset, t = I - 2;
      const leak = [{ x: cx - h - I, y: cy - h - I, w: G.s + 2 * I, h: t }, { x: cx - h - I, y: cy + h + 2, w: G.s + 2 * I, h: t },
        { x: cx - h - I, y: cy - h, w: t, h: G.s }, { x: cx + h + 2, y: cy - h, w: t, h: G.s }];
      return { html, css, js, files: imgs, leak };
    },
  },

  /* ------------------------------------------------------------ peek_number
     A glyph hidden behind an object with only a distinctive part showing (e.g. the flat-top corner of a 7). Fair
     only if the visible part identifies the glyph uniquely in the stated range — say why in explanation_ar. */
  peek_number: {
    plan(r, ctx) {
      const p = empty();
      p.sfx.push({ name: 'sting', at: 0.0, gain_db: -3 });
      const pre = speak(ctx, r.pre_lines ?? [], 0.05);
      p.lines.push(...pre.lines);
      if (r.pre_lines?.length) p.heads.push({ id: 'h-hook', text: fill(lineOf(ctx.script, r.pre_lines[0])!.onscreen_ar, ctx.spec), at: 0.0, out: r2(pre.end + 0.05), kind: 'hook' });
      p.marks.zoom = 0.0;
      const qAt = Math.max(pre.end + 0.12, 0.6);
      tail(ctx, r, p, qAt, qAt + 1.0);
      p.sfx.push({ name: 'whoosh', at: r2(p.reveal! - 0.05), gain_db: -10 });
      return p;
    },
    puzzle(r, p) {
      const P = r.params;
      const html = `<div id="digit">${P.glyph}</div><div id="peek"></div><img id="cover" src="${P.cover}" />
        <div id="range">${P.range_ar ?? ''}</div><div id="glow"></div><div id="tick">${TICK}</div>`;
      const css = `#digit{position:absolute;left:0;right:0;top:${P.digit_top ?? 40}px;text-align:center;font-family:'Cairo';font-weight:900;font-size:${P.digit_px ?? 640}px;line-height:1;color:#1D1548;direction:ltr}
        #cover{position:absolute;left:${P.cover_left ?? 150}px;top:${P.cover_top ?? 130}px;width:${P.cover_w ?? 600}px${P.cover_clip ? `;clip-path:${P.cover_clip}` : ''}}
        #peek{position:absolute;left:${P.peek[0]}px;top:${P.peek[1]}px;width:${P.peek[2]}px;height:${P.peek[2]}px;margin:-${P.peek[2] / 2}px 0 0 -${P.peek[2] / 2}px;border-radius:50%;border:10px dashed #FFC83D;opacity:0}
        #range{position:absolute;${P.range_right != null ? `right:${P.range_right}px` : 'left:50%;transform:translateX(-50%)'};top:${P.range_top ?? 650}px;padding:4px 34px 10px;border-radius:999px;background:#F4F1FF;border:4px solid #E3DCFF;color:#1D1548;font-weight:900;font-size:${P.range_px ?? 60}px;white-space:nowrap;direction:rtl}
        #glow{position:absolute;left:250px;top:${(P.digit_top ?? 40) + 40}px;width:400px;height:560px;border-radius:50%;background:radial-gradient(closest-side,rgba(34,212,137,.45),rgba(34,212,137,0));z-index:-1}
        #tick{position:absolute;top:120px;right:150px;width:110px;height:110px}`;
      const js = `window.buildPuzzle=function(tl,Q){
        // the cover is opaque from the first frame and the glyph only appears once it is fully covered (no leak)
        tl.fromTo('#digit',{opacity:0},{opacity:1,duration:.01},.3);
        tl.fromTo('#cover',{scale:.9,rotation:-4},{scale:1,rotation:0,duration:.5,ease:'back.out(1.6)'},0);
        // gentle sway until the reveal (keeps the frame alive while the question is read; tip stays covered/uncovered the same)
        tl.fromTo('#cover',{rotation:0},{rotation:1.2,duration:1,ease:'sine.inOut',yoyo:true,repeat:Math.max(0,Math.floor((Q.reveal-.7)/1)-1)},.6);
        tl.fromTo('#range',{y:-20,opacity:0},{y:0,opacity:1,duration:.35,ease:'back.out(1.6)'},Q.heads.filter(function(h){return h.kind==='q'})[0].at+.2);
        tl.fromTo('#card',{scale:1},{scale:1.04,duration:1.2,ease:'power2.inOut'},.2);
        tl.to('#cover',{x:1150,y:600,rotation:30,duration:.55,ease:'power3.in'},Q.reveal-.05);
        tl.set('#cover',{opacity:0},Q.reveal+.55);  // gone once off the card (no fragment when the card slides out)
        tl.to('#range',{opacity:0,duration:.2},Q.reveal);
        tl.fromTo('#peek',{scale:1.6,opacity:0},{scale:1,opacity:1,duration:.4,ease:'back.out(1.6)'},Q.explain-.2);
        tl.fromTo('#digit',{scale:1},{scale:1.08,duration:.18,ease:'power2.out',yoyo:true,repeat:1},Q.reveal+.4);
      };`;
      return { html, css, js, files: [P.cover] };
    },
  },

  /* ------------------------------------------------------------ score_cta (outro)
     Self-score tiles (٠..N /N) + comment CTA, then a brand end slate (the designer's animated end-card is laid over it
     in the editor when present). */
  score_cta: {
    plan(r, ctx) {
      const p = empty();
      const s = speak(ctx, r.post_lines ?? [], 0.25, 0.15);
      p.lines.push(...s.lines);
      const o1 = lineOf(ctx.script, r.post_lines?.[0])!;
      p.heads.push({ id: 'h-cta', text: fill(o1.onscreen_ar, ctx.spec), at: 0.05, kind: 'cta' });
      const n = r.params.max ?? 4;
      // score tiles always pop in (CTA content, not puzzle): one pop SFX per tile, on the tile's own animation
      // tiles arrive pre-built on the sliding card (no empty card) and pulse one by one, one pop each, after it lands
      for (let k = 0; k <= n; k++) p.sfx.push({ name: 'pop', at: r2(0.4 + k * 0.1), gain_db: -10, keep: true } as Cue);
      // the brand end-card starts after the last spoken line has finished (no caption cut mid-voice)
      const endcard = r.timings?.endcard ?? 1.3; // 1.4 s held as a still trips techqa no_freeze (1.2 s detector)
      const ecAt = Math.max(s.end + 0.15, 1.6);
      const end = ecAt + endcard;
      p.marks.endcard = r2(ecAt);
      p.heads[0].out = r2(p.marks.endcard - 0.1);
      p.sfx.push({ name: 'shimmer', at: p.marks.endcard, gain_db: -6 });
      p.duration = r2(end);
      return p;
    },
    puzzle(r, p) {
      const n = r.params.max ?? 4;
      const AR = '٠١٢٣٤٥٦٧٨٩';
      const tiles = Array.from({ length: n + 1 }, (_, k) => `<div class="tile" id="tile${k}"><b>${AR[k]}</b><i>من ${AR[n]}</i></div>`).join('');
      const html = `<div id="tiles">${tiles}</div><div id="ctaline">${CHAT}<span>${r.params.cta_ar}</span></div>`;
      const css = `#tiles{position:absolute;left:30px;right:30px;top:150px;display:flex;flex-direction:row;direction:rtl;justify-content:center;gap:22px}
        .tile{width:150px;height:200px;border-radius:32px;background:#F4F1FF;border:6px solid #E3DCFF;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#1D1548}
        .tile b{font-weight:900;font-size:110px;line-height:1}
        .tile i{font-style:normal;font-weight:700;font-size:40px;opacity:.6;line-height:1}
        #tile${n}{background:#FFC83D;border-color:#FFB300}
        #ctaline{position:absolute;left:40px;right:40px;top:470px;display:flex;align-items:center;justify-content:center;gap:24px;color:#1D1548;font-weight:900;font-size:56px;direction:rtl}
        #ctaline svg{width:90px;height:90px;flex:none}
        #endslate{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;opacity:0;background:linear-gradient(160deg,#6A3BFF,#2F8CFF 55%,#19D3C5)}
        #endslate .name{font-weight:900;font-size:150px;color:#fff;text-shadow:0 8px 30px rgba(0,0,0,.25);line-height:1.2}
        #endslate .sub{font-weight:700;font-size:58px;color:#fff;opacity:.95}
        #endslate .handle{font-weight:700;font-size:46px;color:#1D1548;background:#FFC83D;border-radius:999px;padding:8px 36px;direction:ltr}`;
      const js = `window.buildPuzzle=function(tl,Q){
        var M=Q.marks;
        for(var k=0;k<=${n};k++){ Q.intro(tl,'#tile'+k,{y:60,scale:.5,opacity:0},{y:0,scale:1,opacity:1,duration:.35,ease:'back.out(1.8)'},.12+k*.1); tl.fromTo('#tile'+k,{scale:1},{scale:1.16,duration:.1,ease:'power2.out',yoyo:true,repeat:1},.4+k*.1); }
        tl.fromTo('#tile${n}',{rotation:0},{rotation:-6,duration:.15,yoyo:true,repeat:3,ease:'sine.inOut'},.35+${n}*.14+.45);
        tl.fromTo('#ctaline',{y:30,opacity:0},{y:0,opacity:1,duration:.4,ease:'back.out(1.6)'},1.2);
        tl.to('#card, #qarea',{opacity:0,duration:.3,ease:'power1.in'},Math.max(0,M.endcard-.15));  // cross-fades under the end-card's logo as it grows (its first frames are nearly empty)
        if(Q.endslate){ tl.fromTo('#endslate',{opacity:0},{opacity:1,duration:.3,ease:'power2.out'},M.endcard);
        tl.fromTo('#endslate .name',{scale:.6},{scale:1,duration:.5,ease:'back.out(1.8)'},M.endcard);
        tl.fromTo('#endslate .sub, #endslate .handle',{y:30,opacity:0},{y:0,opacity:1,duration:.35,ease:'back.out(1.6)',stagger:.1},M.endcard+.2); }
      };`;
      return { html, css, js, files: [] };
    },
  },
};

/* ---------- drawn (SVG) assets: no generated images for cups, icons, ticks ---------- */
export const TICK = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#22D489" stroke="#fff" stroke-width="7"/><path d="M28 52 L44 67 L73 35" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CUP = `<svg viewBox="0 0 250 290"><defs><linearGradient id="cupg" x1="0" x2="1"><stop offset="0" stop-color="#5A2EE8"/><stop offset=".45" stop-color="#8B66FF"/><stop offset="1" stop-color="#4B22CF"/></linearGradient></defs>
  <path d="M45 18 Q125 2 205 18 L238 262 Q125 292 12 262 Z" fill="url(#cupg)"/><path d="M12 262 Q125 292 238 262 L236 248 Q125 276 14 248 Z" fill="#3A17B0"/>
  <ellipse cx="125" cy="18" rx="80" ry="12" fill="#A88BFF"/><path d="M70 50 Q60 150 52 240" stroke="#fff" stroke-opacity=".35" stroke-width="14" stroke-linecap="round" fill="none"/></svg>`;
export const ICONS: Record<string, string> = {
  star: `<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z" fill="#FFC83D" stroke="#F0A800" stroke-width="4" stroke-linejoin="round"/></svg>`,
  ball: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="#2F8CFF"/><path d="M12 42 Q50 60 88 42" stroke="#fff" stroke-width="7" fill="none"/><circle cx="36" cy="32" r="9" fill="#fff" opacity=".5"/></svg>`,
  leaf: `<svg viewBox="0 0 100 100"><path d="M18 84 Q10 22 84 14 Q90 80 18 84 Z" fill="#22D489"/><path d="M22 80 Q45 50 76 22" stroke="#0E9F62" stroke-width="6" fill="none" stroke-linecap="round"/></svg>`,
};
const CHAT = `<svg viewBox="0 0 100 100"><path d="M14 20 Q14 10 24 10 L76 10 Q86 10 86 20 L86 60 Q86 70 76 70 L42 70 L24 88 L26 70 L24 70 Q14 70 14 60 Z" fill="#6A3BFF"/><circle cx="34" cy="40" r="6" fill="#fff"/><circle cx="50" cy="40" r="6" fill="#fff"/><circle cx="66" cy="40" r="6" fill="#fff"/></svg>`;
