import { defineHook } from './types.ts';

/** eqw1_bulb_flicker: a big bulb on a cord swings like a pendulum over the blurred card, flickers off/on twice (the glow
 *  stutters), then a gold flash pops it and the punch «لحقتها؟» slams in. A navy «؟» sits in the glass. Reveals nothing.
 *  Params: t1, t2, beats {flick, pop}. */
export default defineHook({
  name: 'eqw1_bulb_flicker',
  aliases: [],
  about: 'a cord-hung bulb swings, flickers off and on, then flashes and the punch «لحقتها؟» slams in',
  beats: { flick: 0.7, pop: 1.5 },
  tint: 'rgba(29,21,72,.66)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('hook_blink', B.flick, -10), c('hook_blink', B.flick + 0.28, -10), c('hook_slam', B.pop, -7), c('shimmer', B.pop + 0.05, -12)],
  render({ P, B, esc, pal }) {
    const outline = `-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 28px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t hk-o" id="t1" style="top:60px;font-size:122px;color:#fff">${esc(P.t1 ?? 'لمبة رح تتبدّل')}</div>`;
    const body = `
<div class="abs" id="pend" style="left:200px;top:-10px;width:500px;height:760px;transform-origin:250px 0px">
<div class="abs" id="glow" style="left:-70px;top:190px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,rgba(255,200,61,.95) 0%,rgba(255,200,61,.45) 38%,rgba(255,200,61,0) 70%)"></div>
<svg class="abs" viewBox="0 0 500 760" width="500" height="760" style="left:0;top:0" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M250 0 L250 250" stroke="${pal.ink}" stroke-width="22"/><path d="M250 0 L250 250" stroke="${pal.lilac}" stroke-width="9"/>
<rect x="170" y="240" width="160" height="100" rx="18" fill="${pal.ink}"/><rect x="182" y="252" width="136" height="76" rx="12" fill="${pal.blue}"/>
<path d="M182 290 H318 M182 310 H318" stroke="${pal.ink}" stroke-width="8"/>
<path d="M185 335 C60 400 40 520 110 600 C160 655 200 690 250 690 C300 690 340 655 390 600 C460 520 440 400 315 335 Z" fill="#fff4cf" stroke="${pal.ink}" stroke-width="22"/>
<path d="M185 335 C60 400 40 520 110 600 C160 655 200 690 250 690 C300 690 340 655 390 600 C460 520 440 400 315 335 Z" id="lit" fill="${pal.gold}" stroke="none"/>
<path d="M120 440 C110 500 130 550 160 580" stroke="#fff" stroke-width="18" stroke-opacity=".8"/>
<path d="M215 345 V440 M285 345 V440 M215 440 Q250 480 285 440" stroke="${pal.ink}" stroke-width="10"/></svg>
<div class="abs" id="qm" style="left:0;top:445px;width:500px;text-align:center;font-weight:900;font-size:170px;line-height:190px;color:${pal.ink};direction:rtl">؟</div></div>
<div class="abs" id="flash" style="left:0;top:0;width:900px;height:860px;opacity:0;background:radial-gradient(circle at 50% 55%,#fff 0%,rgba(255,200,61,.8) 40%,rgba(255,200,61,0) 75%)"></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:640px;font-size:200px;color:${pal.gold};opacity:0;text-shadow:${outline}">${esc(P.t2 ?? 'لحقتها؟')}</div>`;
    const js = `
    var F=${B.flick},N=${B.pop};
    tl.fromTo('#t1',{scale:1.18,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.set('#pend',{rotation:-9},0);
    tl.to('#pend',{rotation:12,duration:.38,ease:'sine.inOut'},.05);
    tl.to('#pend',{rotation:-8,duration:.4,ease:'sine.inOut'},.43);
    tl.to('#pend',{rotation:0,duration:.3,ease:'sine.out'},.83);
    tl.set('#glow',{opacity:1},0);
    tl.set('#lit',{opacity:1},0);
    tl.set(['#glow','#lit'],{opacity:0},F);
    tl.set(['#glow','#lit'],{opacity:1},F+.12);
    tl.set(['#glow','#lit'],{opacity:0},F+.28);
    tl.set(['#glow','#lit'],{opacity:1},F+.42);
    tl.to('#qm',{rotation:10,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},F+.45);
    tl.to('#pend',{scale:1.3,y:30,duration:.16,ease:'power4.in',transformOrigin:'250px 400px'},N-.14);
    // flash capped (QA eqw1 v3: luma 250 for 0.17 s): peak opacity .62, 4-frame ramp up + 3-frame decay (~.24 s total), text sits above it
    tl.fromTo('#flash',{opacity:0},{opacity:.62,duration:.14,ease:'none'},N-.08);
    tl.to('#flash',{opacity:0,duration:.1,ease:'none'},N+.06);
    tl.to('#pend',{scale:1,y:-30,opacity:0.0,duration:.25,ease:'power2.in'},N+.1);
    tl.fromTo('#t2',{scale:1.6,opacity:0},{scale:1,opacity:1,duration:.14,ease:'power4.out'},N-.04);
    shake('#hk-in',N,16,.36,1.4);
    tl.to('#t2',{scale:1.06,duration:.2,yoyo:true,repeat:3,ease:'sine.inOut'},N+.3);
    tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);`;
    return { top, body, js, css: `#pend{will-change:transform}` };
  },
});
