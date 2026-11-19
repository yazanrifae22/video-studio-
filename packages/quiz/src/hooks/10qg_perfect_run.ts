import { defineHook } from './types.ts';

/** perfect_run: three empty navy medallions (١ ٢ ٣, one per round) sit on a gold wire. They light green with a white check, one after
 *  the other, the wire charging gold behind them; then a big gold seal «ولا غلطة!» stamps down with a shockwave ring.
 *  True for any 3-round video: nothing is lost on a miss, the seal only names the "all right / no slip" goal. */
export default defineHook({
  name: '10qg_perfect_run',
  aliases: [],
  about: 'three numbered medallions on a wire turn green with checks in a row, then a gold «ولا غلطة!» seal stamps down with a shockwave',
  beats: { checks: [0.3, 0.6, 0.9], seal: 1.1 },
  tint: 'rgba(29,21,72,.6)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('ding', B.checks[0], -9), c('ding', B.checks[1], -8), c('ding', B.checks[2], -7),
    c('hook_blink', B.seal - 0.04, -9),
    c('hook_slam', B.seal, -5),
  ],
  render({ P, B, esc, pal }) {
    const AR = ['١', '٢', '٣'];
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.45)`;
    const med = (i: number) => `<div class="pr-m" id="m${i}" style="left:${i * 325}px"><div class="pr-n" id="n${i}">${AR[i]}</div>
<svg class="pr-c" id="c${i}" viewBox="0 0 100 100" width="170" height="170"><polyline points="20,54 42,76 82,28" fill="none" stroke="#fff" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg></div>`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:138px;color:#fff">${esc(P.t1 ?? '٣ جولات..')}</div>`;
    const body = `
<div class="abs" id="wire0" style="left:125px;top:210px;width:650px;height:20px;border-radius:10px;background:rgba(255,255,255,.3)"></div>
<div class="abs" id="wire" style="left:125px;top:210px;width:650px;height:20px;border-radius:10px;background:${pal.gold};transform-origin:0 50%;transform:scaleX(0)"></div>
<div class="abs" id="row" style="left:0;top:100px;width:900px;height:250px">${med(0)}${med(1)}${med(2)}</div>
<div class="abs" id="ring" style="left:150px;top:380px;width:600px;height:600px;border-radius:50%;border:26px solid ${pal.gold};opacity:0"></div>
<div class="abs" id="seal" style="left:-40px;right:-40px;top:470px;text-align:center;direction:rtl;font-weight:900;font-size:200px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t3 ?? 'ولا غلطة!')}</div>`;
    const css = `.pr-m{position:absolute;top:0;width:250px;height:250px;border-radius:50%;background:${pal.ink};box-shadow:0 0 0 12px ${pal.gold},0 16px 34px rgba(0,0,0,.45)}
.pr-n{position:absolute;inset:0;text-align:center;direction:rtl;font-weight:900;font-size:150px;line-height:250px;color:#fff}
.pr-c{position:absolute;left:40px;top:40px;opacity:0}`;
    const js = `
        var CK=${JSON.stringify(B.checks)},SL=${B.seal};
        tl.set('#row div',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        CK.forEach(function(t,i){
          tl.to('#m'+i,{backgroundColor:'${pal.green}',duration:.08},t);
          tl.fromTo('#m'+i,{scale:1},{scale:1.22,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},t);
          tl.set('#n'+i,{opacity:0},t);
          tl.set('#c'+i,{opacity:1},t);
          tl.to('#c'+i+' polyline',{strokeDashoffset:0,duration:.16,ease:'power2.out'},t);
          tl.to('#wire',{scaleX:(i+1)/3,duration:.22,ease:'power2.out'},t);
          shake('#hk-in',t+.02,6,.14,0);
        });
        tl.to('#m0,#m1,#m2',{y:-16,duration:.07,yoyo:true,repeat:3,ease:'sine.inOut'},CK[2]+.18);
        tl.fromTo('#seal',{scale:2.8,opacity:0,rotation:-16},{scale:1,opacity:1,rotation:-6,duration:.24,ease:'power4.out'},SL);
        tl.set('#ring',{opacity:0},0);
        tl.fromTo('#ring',{scale:.3,opacity:.9},{scale:1.7,opacity:0,duration:.5,ease:'power2.out',immediateRender:false},SL);
        shake('#hk-in',SL,20,.45,2);
        tl.to('#seal',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},SL+.3);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(34,212,137,0) 40%, rgba(34,212,137,.55) 100%)',opacity:0},0);
        tl.fromTo('#bgfx',{opacity:.8},{opacity:.25,duration:.2,yoyo:true,repeat:2},SL);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
