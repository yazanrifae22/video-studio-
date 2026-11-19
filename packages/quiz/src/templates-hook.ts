import { hookLineId, lineOf, type Round } from './spec.ts';
import { bigLines, empty, r2, speak, type Cue, type Ctx, type Plan, type Template } from './templates.ts';
import { variantOf } from './hooks/index.ts';
import { PAL, type Beats, type HookCtx } from './hooks/types.ts';

/**
 * hook_intro: a ~2 s full-motion opener placed BEFORE round 1 (owner request 2026-10-26). Own template, no progress chip,
 * no headline/countdown/reveal. Everything lives inside #card (text band above the card, concept art on it) so the
 * normal chrome exit (card slides out left in the last 0.3 s) hands over to round 1's card sliding in from the right.
 *
 * Variants live one per file in ./hooks/ (see hooks/README.md); this file is the shared shell (teaser card, text band,
 * GSAP prelude, closing whoosh) and is not edited to add a variant.
 *
 * params: { variant: hooks/<name>.ts (eye | scoreboard | heat_cards | stopwatch | …), line?: script line id (spoken hook), voice_at?: s (default 0.1),
 *           t1, t2, ... on-screen texts (see each variant), teaser?: production-relative image (blurred round-1 puzzle,
 *           set by the build), beats?: overrides of the variant's beat times }
 * timings: { dur } minimum duration (default 2.0 s; stretches up to 2.5 s to fit the spoken line; up to 4.3 s for a hook_line bank line,
 *           where the variant choreography is time-stretched, see HOOK_MAX_BIG).
 */

/** Brand corner bug «شو شايف؟» (data/brand/quiz-ar/signature/corner-bug.png at canvas x 60 / y 225 → pill x 68-285, y 233-301). Big on-screen text keeps x >= PILL_CLEAR_X
 *  wherever it shares rows with the pill (canvas y 218-318); the lane is PILL_CLEAR_X .. 1020. */
export const PILL_CLEAR_X = 300, PILL_LANE_W = 1020 - PILL_CLEAR_X;
/** big hook line (text-safety top_chrome zone = canvas y < 210; owner-bank lines up to 4 lines): text box y 322-638, the hook card moves down to y 660 */
export const BIG_TOP = 322, BIG_H = 316, BIG_CARD_Y = 660;
/** extra em between stacked big lines: the measured ink box of a Cairo Black line is ~1.25-1.55 em tall (descenders, ؟, ل ascenders) vs a 1.16 em line box, so a 12 px margin overlapped by ~20 px (lnj6 v1, text-safety 19%). Line pitch = 1.16 + this = 1.64 em. */
const BIG_GAP_EM = 0.48;
const BAND_Y = 212;  // canvas y of #hk-top (card top 470 - 258)

/** Variant title lines (`.hk-t` in the text band) that share rows with the pill: estimate the line width (Cairo Black ~0.6 em/letter),
 *  shrink it to the lane when it is wider, and shift it right until its left edge clears PILL_CLEAR_X (padding-left keeps the box centred in the lane). */
export function clearPillBand(top: string): string {
  return top.replace(/(<div class="hk-t[^"]*"[^>]*style=")([^"]*)("[^>]*>)([^<]*)(<\/div>)/g, (m, a, style: string, b, text: string, e) => {
    const t = /(?:^|;)\s*top:\s*(-?[\d.]+)px/.exec(style), f = /font-size:\s*([\d.]+)px/.exec(style);
    if (!t || !f || /<br/.test(text)) return m;
    let px = +f[1];
    const y0 = BAND_Y + +t[1] - 8, y1 = BAND_Y + +t[1] + px * 1.12 + 10;
    if (y1 <= 218 || y0 >= 318) return m;
    const n = Math.max(1, [...text.replace(/[ً-ْٰ]/g, '')].length);
    let w = n * 0.6 * px;
    const half = 540 - (PILL_CLEAR_X + 12);  // centred line clears when w/2 <= half
    if (w / 2 <= half) return m;
    if (w > PILL_LANE_W - 24) { px = Math.floor(px * (PILL_LANE_W - 24) / w); w = n * 0.6 * px; }
    const dx = Math.min(Math.max(0, PILL_CLEAR_X + 12 - (540 - w / 2)), 1020 - (540 + w / 2));
    const st = style.replace(/font-size:\s*[\d.]+px/, `font-size:${px}px`) + `;padding-left:${Math.round(2 * Math.max(0, dx))}px;box-sizing:border-box`;
    return `${a}${st}${b}${text}${e}`;
  });
}

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const beats = (r: Round): Beats => ({ ...variantOf(r.params.variant).beats, ...(r.params.beats ?? {}) });
/** the hook line's texts, captured at plan() time (puzzle() has no script) */
const TEXT = new WeakMap<Plan, { onscreen: string; spoken: string; big?: boolean }>();

function hctx(r: Round, D: number, text = { onscreen: '', spoken: '' }): HookCtx {
  const under = r.params.line ? { under: r.params.line } : {};
  return { r, P: r.params, B: beats(r), D, teaser: r.params.teaser, ...text, pal: PAL, esc,
    cue: (name: string, at: number, gain_db: number): Cue => ({ name, at: r2(at), gain_db, keep: true, ...under }) };
}

/** Hook scenes longer than this (bank hook lines, up to HOOK_MAX_BIG s) are the variant's ~2.5 s choreography stretched in time (K = D / 2.5). */
const HOOK_BASE = 2.5, HOOK_MAX = 2.5, HOOK_MAX_BIG = 4.3;  // owner bank lines (hook-bank-owner.md) run 2.5-4.1 s spoken; 4.3 s incl. voice_at + 0.3 tail
const stretchK = (D: number) => Math.max(1, D / HOOK_BASE);

function cues(r: Round, D: number): Cue[] {
  const K = stretchK(D);
  const out: Cue[] = [...variantOf(r.params.variant).sfx(hctx(r, D / K))].map(c => (K > 1 ? { ...c, at: r2(c.at * K) } : c));
  out.push({ name: 'whoosh', at: r2(D - 0.36), gain_db: -4, keep: true, ...(r.params.line ? { under: r.params.line } : {}) });
  return out;
}

const CSS = `
.hk-clip{position:absolute;inset:0;border-radius:48px;overflow:hidden;background:linear-gradient(160deg,#F4F1FF,#DCD3FF)}
.hk-clip img{position:absolute;left:-6%;top:-6%;width:112%;height:112%;object-fit:cover;filter:blur(40px)}
.hk-tint{position:absolute;inset:0}
#hk-in{position:absolute;inset:0}
#hk-top{position:absolute;left:-90px;width:1080px;top:-258px;height:252px;direction:rtl}
.hk-t{position:absolute;left:0;right:0;text-align:center;font-weight:900;line-height:1.08;white-space:nowrap;text-shadow:0 6px 0 rgba(29,21,72,.38),0 12px 30px rgba(0,0,0,.35)}
#bgfx{position:absolute;inset:0;opacity:0;pointer-events:none}
.abs{position:absolute}
.hk-o{text-shadow:-9px 0 0 #1D1548,9px 0 0 #1D1548,0 -9px 0 #1D1548,0 9px 0 #1D1548,-7px -7px 0 #1D1548,7px 7px 0 #1D1548,-7px 7px 0 #1D1548,7px -7px 0 #1D1548,0 20px 36px rgba(0,0,0,.4)}
`;

/**
 * Frame-0 rule (QA 2026-10-27): the first frame of a hook must already show the settled title. Any short tween that starts
 * in the first 0.06 s on an element INSIDE the text band (#hk-top) is replaced by "settled state at t=0" plus a small
 * in-place punch (x1.05, margins stay >= 72 px). Variants keep writing their slam/pop-in as before; elements outside the
 * band (card art, tapes, avatars) are untouched and the variant owns their frame 0 (see README).
 */
const SETTLE = `
        (function(){var top=document.getElementById('hk-top');if(!top)return;
          var KEYS=['scale','scaleX','scaleY','opacity','x','y','rotation'];
          tl.getChildren(false,true,false).slice().forEach(function(tw){
            if(!tw.targets||tw.startTime()>0.06||tw.duration()<=0||tw.duration()>0.5||(tw.repeat&&tw.repeat()))return;
            var tg=tw.targets();if(!tg.length||!tg.every(function(t){return t&&t.nodeType===1&&top.contains(t);}))return;
            var f={};KEYS.forEach(function(k){if(typeof tw.vars[k]==='number')f[k]=tw.vars[k];});
            if(f.opacity===undefined)f.opacity=1;
            tw.kill();gsap.set(tg,f);tl.set(tg,f,0);
            if(f.scale!==undefined)tl.fromTo(tg,{scale:f.scale},{scale:f.scale*1.05,duration:.09,yoyo:true,repeat:1,ease:'power2.out'},0.05);
          });
        })();`;

/**
 * hook_line (owner 2026-11-08, docs/brands/quiz-ar/hook-lines.md): the line's onscreen_ar replaces the variant's title band
 * as HUGE type (balanced 1-3 lines, up to 150 px, canvas y 150-462, 60 px side margins, last line gold). The variant's art
 * keeps all its motion; its own text layers on the card are hidden so the big line is the only text. Frame 0 shows the
 * settled line (SETTLE rule); the lines punch in place, then breathe until the shared fade before the exit.
 */
function bigHook(text: string, sc: { top: string; body: string; css?: string; js: string }) {
  const b = bigLines(text, 1030, BIG_H - 36, 150, 4, BIG_GAP_EM);  // y >= 322 clears the brand pill (canvas x 68-285, y 233-301): full width x 60-1020
  const top = `<div id="hk-big"><div class="hk-bl" style="font-size:${b.px}px">${b.lines.map((l, k) => `<i id="hkb${k}" class="${k === b.lines.length - 1 && b.lines.length > 1 ? 'g' : ''}">${esc(l)}</i>`).join('')}</div></div>`;
  const css = `${sc.css ?? ''}
#card{top:${BIG_CARD_Y}px!important;height:${1460 - BIG_CARD_Y}px!important}
#hk-top{top:-${BIG_CARD_Y - BIG_TOP}px!important;height:${BIG_H}px!important}
#hk-big{position:absolute;left:60px;right:60px;top:0;bottom:0;display:flex;align-items:center;justify-content:center}
.hk-bl{text-align:center;font-weight:900;line-height:1.16;color:#fff}
.hk-bl i{display:block;font-style:normal;white-space:nowrap;text-shadow:-8px 0 0 #1D1548,8px 0 0 #1D1548,0 -8px 0 #1D1548,0 8px 0 #1D1548,-6px -6px 0 #1D1548,6px 6px 0 #1D1548,-6px 6px 0 #1D1548,6px -6px 0 #1D1548,0 18px 34px rgba(0,0,0,.45)}
.hk-bl i+i{margin-top:${BIG_GAP_EM}em}  /* ink boxes of neighbouring lines must not overlap (text-safety overlap, 5s14; lnj6 19%) */
.hk-bl i.g{color:#FFC83D}`;
  const js = `${sc.js}
        (function(){var root=document.getElementById('hk-in');if(!root)return;root.querySelectorAll('*').forEach(function(e){
          if(e.closest('#hk-top'))return;for(var n=e.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.nodeValue.trim()){e.style.visibility='hidden';break;}});})();
        var BL=document.querySelectorAll('#hk-big i');
        for(var bi=0;bi<BL.length;bi++){tl.set(BL[bi],{opacity:1,scale:1,transformOrigin:'50% 60%'},0);
          tl.fromTo(BL[bi],{scale:1},{scale:1.07,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},.05+bi*.18);
          tl.to(BL[bi],{scale:1.03,duration:.3,yoyo:true,repeat:Math.max(2,Math.ceil((X-.5-bi*.12)/.3)-1),ease:'sine.inOut'},.5+bi*.12);}  /* keeps breathing until the exit: no static stretch on long bank lines */`;
  return { top, css, js };
}

export const HOOK: Record<string, Template> = {
  hook_intro: {
    plan(r, ctx: Ctx) {
      const p: Plan = empty();
      const id = r.params.line as string | undefined;
      let D = r.timings?.dur ?? 2.0;
      if (id) {
        const ln = lineOf(ctx.script, id);
        TEXT.set(p, { onscreen: ln?.onscreen_ar ?? '', spoken: ln?.narration_ar ?? '', big: !!ctx.spec.hook_line && hookLineId(ctx.spec) === id });
        const s = speak(ctx, [id], r.params.voice_at ?? 0.1);
        p.lines.push(...s.lines);
        D = Math.max(D, s.end + 0.3);
        const cap = TEXT.get(p)!.big ? HOOK_MAX_BIG : HOOK_MAX;  // owner 2026-11-08: bank hook lines (HL26-HL32 are 3-4 s spoken) may run to 4.0 s
        if (D > cap) throw new Error(`round ${r.id}: hook line "${id}" needs ${D.toFixed(2)} s (> ${cap} s) — shorten the spoken hook`);
      }
      p.duration = r2(D);
      // params.exit_lead: how long before the end the card starts sliding out (shorter = less empty hand-off to round 1)
      p.exit = r2(p.duration - (r.params.exit_lead ?? 0.3));
      p.marks.exit = p.exit;
      p.sfx.push(...cues(r, p.duration));
      return p;
    },
    puzzle(r, p) {
      const V = variantOf(r.params.variant);
      const T = TEXT.get(p);
      const K = stretchK(p.duration);
      const c = hctx(r, p.duration / K, T && { onscreen: T.onscreen, spoken: T.spoken });
      const teaser = c.teaser;
      const sc = V.render(c);
      if (sc.top) sc.top = clearPillBand(sc.top);
      if (T?.big) Object.assign(sc, bigHook(T.onscreen, sc));
      // params.t_top: canvas y of the text band's top (default BAND_Y 212 = unchanged), clamped inside the safe lane (below the 210 px top zone, band bottom above the 1420 bottom zone); not used by the big hook_line layout
      const tTop = r.params.t_top != null && !T?.big ? Math.round(Math.min(1420 - 252, Math.max(BAND_Y, Number(r.params.t_top)))) : null;
      if (tTop != null && tTop !== BAND_Y) sc.css = `${sc.css ?? ''}
#hk-top{top:${tTop - 470}px!important}`;
      // params.teaser_sharp: the round-1 object art stays sharp (no CSS blur) so a real object is readable in 0-1 s
      const sharp = !!r.params.teaser_sharp;
      if (sharp) sc.css = `${sc.css ?? ''}
.hk-clip img{filter:none!important}`;
      const html = `<div id="hk-in"><div class="hk-clip">${teaser ? `<img id="hk-img" src="${esc(teaser)}"/>` : ''}<div class="hk-tint" style="background:${V.tint}"></div><div id="hk-wash" style="position:absolute;inset:0;background:#F4F1FF;opacity:0"></div></div><div id="hk-top">${sc.top}</div>${sc.body}</div>`;
      const common = `
        var HK_K=${K.toFixed(4)},X=Q.exit/HK_K,PRE=tl.getChildren(false,true,false).slice();
        function shake(sel,at,amp,dur,rot){var n=Math.max(2,Math.round(dur*30/1.5));for(var i=0;i<n;i++){var k=1-i/n,s=i%2?1:-1;tl.to(sel,{x:s*amp*k,y:-s*amp*.45*k,rotation:(rot||0)*s*k,duration:dur/n,ease:'none'},at+i*dur/n);}tl.to(sel,{x:0,y:0,rotation:0,duration:.04,ease:'none'},at+dur);}
        function slam(sel,at,from,dur){tl.fromTo(sel,{scale:from,opacity:0},{scale:1,opacity:1,duration:dur||.22,ease:'power4.out'},at);}
        ${teaser && !sharp ? `tl.fromTo('#hk-img',{filter:'blur(44px)'},{filter:'blur(24px)',duration:1.6,ease:'power1.out'},0);` : ''}
      `;
      // K > 1 (long bank hook line): every variant tween is stretched K x in start and length (no dead frames; the variant's own
      // exit/fade times were built against X = Q.exit / K and land on Q.exit). Applied before SETTLE so frame 0 is untouched.
      // The shell's factor is HK_K (variants declare their own `var K`, which silently replaced it: ice0 stretched by 0.3 instead of 1.56).
      // Only the variant's own tweens stretch: chrome.js's tweens (the card slide-out at Q.D - 0.33 s, qarea fade) already sit on real
      // times and are skipped via PRE (stretching them moved the card off canvas from ~1.2 s on a 3.9 s hook, zp9c v1).
      const stretch = K > 1 ? `(function(){tl.getChildren(false,true,false).slice().forEach(function(tw){if(PRE.indexOf(tw)>=0)return;var d=tw.duration();tw.startTime(tw.startTime()*HK_K);if(d>0.02)tw.duration(d*HK_K);});})();` : '';
      // QA 2026-10-27: all hook text (title band + any text a variant puts on the card) fades out just before the card
      // slides, so no text ever crosses the 60 px margin during the exit
      const fadeTop = `(function(){var root=document.getElementById('hk-in');if(!root)return;
          var els=[document.getElementById('hk-top')];root.querySelectorAll('*').forEach(function(e){
            if(e.closest('#hk-top'))return;for(var n=e.firstChild;n;n=n.nextSibling)if(n.nodeType===3&&n.nodeValue.trim()){els.push(e);break;}});
          tl.to(els.filter(Boolean),{opacity:0,duration:.1,ease:'power1.in'},Math.max(0,X));})();`;  /* hand-off (1fva v5): text stays until the slide starts (the card is still within 8 px of home 0.1 s in: power2.in), no empty band before round 1 */
      // hand-off (techqa card_on_every_round_change, 9olr v2): the blurred teaser is saturated, so as it slid out the next round's
      // white card had not arrived and the frames read as empty. The card washes to the plain lilac card surface just before it slides.
      // continuous slow push-in on the teaser for the whole scene (freezedetect: no 1 s+ static stretch whatever the variant does or the hook length)
      const drift = teaser ? `tl.fromTo('#hk-img',{scale:1},{scale:1.1,duration:Q.exit,ease:'none'},0);` : '';
      const wash = `tl.to('#hk-wash',{opacity:1,duration:.2,ease:'power1.in'},Math.max(0,Q.exit-0.12));`;
      return { html, css: CSS + (sc.css ?? ''), js: `window.buildPuzzle=function(tl,Q){${common}${sc.js}${stretch}X=Q.exit;${SETTLE}${fadeTop}${drift}${wash}};`, files: teaser ? [teaser] : [], root: sc.root ?? '<div id="bgfx"></div>' };
    },
  },
};
