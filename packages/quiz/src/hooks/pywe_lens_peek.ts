import { defineHook, r2 } from './types.ts';

/** pywe_lens_peek: a giant magnifier swings across the blurred round-1 card hunting, wobbles, then snaps to the centre
 *  (zoom + shake) as the punch «شفتو؟» slams in. A gold «؟» rides inside the lens; nothing of the puzzle is revealed. */
export default defineHook({
  name: 'pywe_lens_peek',
  aliases: [],
  about: 'a giant magnifier hunts across the blurred card, snaps to the centre and the punch «شفتو؟» slams in',
  beats: { sweep: 0.1, snap: 1.62 },
  tint: 'rgba(29,21,72,.55)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('whoosh', B.sweep, -10), c('hook_blink', B.sweep + 0.4, -10), c('hook_lock', B.snap, -6), c('hook_slam', B.snap, -8)],
  render({ P, B, D, esc }) {
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:140px;color:#fff">${esc(P.t1 ?? 'في شي مخبّى')}</div>`;
    const body = `
<div class="abs" id="lens" style="left:130px;top:150px;width:640px;height:640px;opacity:0"><svg viewBox="0 0 640 640" width="640" height="640" fill="none" stroke-linecap="round">
<path d="M470 470 L610 610" stroke="#1D1548" stroke-width="86"/><path d="M470 470 L610 610" stroke="#FFC83D" stroke-width="54"/>
<circle cx="300" cy="300" r="250" fill="#fff" fill-opacity=".22"/>
<circle cx="300" cy="300" r="250" stroke="#1D1548" stroke-width="64"/><circle cx="300" cy="300" r="250" stroke="#FFC83D" stroke-width="36"/>
<path d="M130 220 A190 190 0 0 1 230 130" stroke="#fff" stroke-width="22" stroke-opacity=".85"/></svg>
<div class="abs" id="q" style="left:0;top:0;width:600px;height:600px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:300px;color:#FFC83D;direction:rtl;text-shadow:-8px 0 0 #1D1548,8px 0 0 #1D1548,0 -8px 0 #1D1548,0 8px 0 #1D1548">؟</div></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:665px;font-size:210px;color:#FFC83D;opacity:0">${esc(P.t2 ?? 'شفتو؟')}</div>`;
    const js = `
    var S=${B.sweep},N=${B.snap};
    tl.fromTo('#t1',{scale:1.18,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.set('#lens',{transformOrigin:'300px 300px',x:-760,y:-60,rotation:-18,scale:.8,opacity:1},0);
    tl.to('#lens',{x:230,y:-120,rotation:10,scale:.95,duration:.5,ease:'power2.inOut'},S);
    tl.to('#lens',{x:-200,y:150,rotation:-12,scale:.9,duration:.45,ease:'power2.inOut'},S+.5);
    tl.to('#lens',{x:0,y:20,rotation:0,scale:1.05,duration:N-(S+.95)>.1?N-(S+.95):.1,ease:'power3.out'},S+.95);
    tl.to('#q',{rotation:14,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},S+.3);
    tl.to('#lens',{scale:1.25,y:-110,duration:.16,ease:'power4.in'},N-.04);
    tl.to('#lens',{scale:.95,y:-190,duration:.22,ease:'back.out(3)'},N+.12);
    tl.to('#q',{scale:.01,opacity:0,duration:.1,ease:'power2.in'},N);
    slam('#t2',N,1.6,.22);
    shake('#hk-in',N,14,.34,1.3);
    tl.to('#t2',{scale:1.06,duration:.22,yoyo:true,repeat:3,ease:'sine.inOut'},N+.3);
    tl.to('#lens',{opacity:.0,duration:.25,ease:'power1.in'},N+.5);
    tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);`;
    return { top, body, js };
  },
});
void r2;
