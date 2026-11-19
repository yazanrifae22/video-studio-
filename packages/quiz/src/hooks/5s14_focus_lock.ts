import { defineHook, r2 } from './types.ts';

/** 5s14_focus_lock: camera-style focus brackets hunt wide over the blurred card, tighten, and lock with a ring pulse
 *  as the punch «جاهز؟» slams in. Punch-In / focus mechanism; nothing of any puzzle is shown. */
export default defineHook({
  name: '5s14_focus_lock',
  aliases: [],
  about: 'four focus brackets tighten over the blurred card, jitter, lock with a ring pulse and the punch slams in',
  beats: { hunt: 0.15, lock: 1.5 },
  tint: 'rgba(29,21,72,.5)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('hook_riser', B.hunt, -12), c('hook_lock', B.lock, -6), c('hook_slam', B.lock, -9)],
  render({ P, B, D, esc }) {
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:140px;color:#fff">${esc(P.t1 ?? 'ركّز معي')}</div>`;
    const br = (id: string, rot: number) => `<svg class="abs fb" id="${id}" style="left:375px;top:355px;width:150px;height:150px;transform:rotate(${rot}deg)" viewBox="0 0 150 150" fill="none" stroke-linecap="round"><path d="M10 80 V10 H80" stroke="#1D1548" stroke-width="42"/><path d="M10 80 V10 H80" stroke="#FFC83D" stroke-width="22"/></svg>`;
    const body = `${br('b1', 0)}${br('b2', 90)}${br('b3', 180)}${br('b4', 270)}
<div class="abs" id="ring" style="left:325px;top:305px;width:250px;height:250px;border-radius:50%;border:26px solid #FFC83D;box-shadow:0 0 0 10px #1D1548;opacity:0"></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:665px;font-size:210px;color:#FFC83D;opacity:0">${esc(P.t2 ?? 'جاهز؟')}</div>`;
    const js = `
    var H=${B.hunt},L=${B.lock};
    tl.fromTo('#t1',{scale:1.18,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
    var pos={b1:[-1,-1],b2:[1,-1],b3:[1,1],b4:[-1,1]};
    ['b1','b2','b3','b4'].forEach(function(id){var p=pos[id];
      tl.set('#'+id,{x:p[0]*330,y:p[1]*330,opacity:1,scale:1.1},0);
      tl.to('#'+id,{x:p[0]*190,y:p[1]*200,duration:.5,ease:'power2.inOut'},H);
      tl.to('#'+id,{x:p[0]*260,y:p[1]*120,duration:.4,ease:'power2.inOut'},H+.5);
      tl.to('#'+id,{x:p[0]*105,y:p[1]*105,duration:Math.max(.1,L-(H+.9)),ease:'power3.out'},H+.9);
      tl.to('#'+id,{scale:.9,duration:.1,ease:'power4.in'},L);
      tl.to('#'+id,{opacity:0,duration:.25,ease:'power1.in'},L+.5);});
    tl.fromTo('#ring',{scale:.5,opacity:1},{scale:1.8,opacity:0,duration:.5,ease:'power2.out'},L);
    slam('#t2',L,1.6,.22);
    shake('#hk-in',L,14,.34,1.3);
    tl.to('#t2',{scale:1.06,duration:.22,yoyo:true,repeat:3,ease:'sine.inOut'},L+.3);
    tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);`;
    return { top, body, js };
  },
});
void r2;
