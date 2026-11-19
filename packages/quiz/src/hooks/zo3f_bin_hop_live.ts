import { defineHook } from './types.ts';

/** zo3f_bin_hop_live (v7: motion already running at frame 0; derived from zo3f_bin_hop): three plain slate-blue rubbish bins (closed lids, one row, sharp from frame 0) hop in a staggered wave,
 *  then swap places in a quick cycle with speed streaks. No bin colour of any round, no open lid, no brick: nothing is
 *  pre-answered. Params: t1, t1_px, beats {go}. Pure SVG/CSS. */
export default defineHook({
  name: 'zo3f_bin_hop_live',
  aliases: [],
  about: 'three plain bins hop in a wave from frame 0, then rotate places in a quick dash with speed streaks',
  beats: { go: 0.9 },
  tint: 'rgba(29,21,72,.97)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.55, -12), c('whoosh', B.go, -8)],
  render({ P, B, esc }) {
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 140}px;color:#fff">${esc(P.t1 ?? 'يلا! ٣ جولات!')}</div>`;
    const X0 = [40, 330, 620];
    const bin = (i: number) => `<div class="abs bn" id="d${i}" style="left:${X0[i]}px;top:230px;width:240px;height:330px"><svg viewBox="-62 -86 124 160" width="240" height="330">
<path d="M-44,-46 L44,-46 L36,62 Q35,66 31,66 L-31,66 Q-35,66 -36,62 Z" fill="#C9D1E6" stroke="#6C77A0" stroke-width="5" stroke-linejoin="round"/>
<path d="M-20,-34 L-17,54 M0,-34 L0,54 M20,-34 L17,54" stroke="#6C77A0" stroke-width="4" opacity=".6"/>
<rect x="-50" y="-66" width="100" height="18" rx="9" fill="#9AA6CC" stroke="#6C77A0" stroke-width="5"/>
<rect x="-13" y="-77" width="26" height="12" rx="6" fill="#9AA6CC" stroke="#6C77A0" stroke-width="4"/></svg></div>`;
    const body = [0, 1, 2].map(bin).join('')
      + [0, 1, 2].map(i => `<div class="abs st" id="s${i}" style="left:${X0[i] + 10}px;top:${300 + i * 70}px;width:260px;height:14px;border-radius:7px;background:#fff;opacity:0"></div>`).join('');
    const js = `
    var BG=${B.go};
    var X0=${JSON.stringify(X0)};
    tl.set('.bn',{transformOrigin:'50% 100%'},0);
    // frame 0: bins already settled and sharp; they keep hopping (staggered wave) until the dash
    // v7: the wave is already mid-air at t=0 (each bin at a different phase of its hop) and keeps going, so frame 0 is never a static slate
    var Y0=[-30,-14,-24], R0=[-2.6,1.2,-1.8];
    for(var i=0;i<3;i++){ tl.fromTo('#d'+i,{y:Y0[i],rotation:R0[i],scale:1.03},{y:i==1?-34:0,rotation:(i%2?3:-3)*(i==1?1:0.2),scale:1.01,duration:.12+i*.02,ease:'sine.inOut',immediateRender:true},0);
      tl.to('#d'+i,{y:-34,rotation:(i%2?3:-3),scale:1.03,duration:.16,yoyo:true,repeat:3,ease:'sine.inOut'},.12+i*.02); }
    shake('#hk-in',.02,10,.25,1);
    // rotate places: 0 -> 1 -> 2 -> 0, then straight back
    for(var j=0;j<3;j++){ var n=(j+1)%3; tl.to('#d'+j,{x:X0[n]-X0[j],duration:.2,ease:'power3.inOut'},BG); }
    tl.set('.st',{opacity:0},0); tl.fromTo('.st',{opacity:.9,x:60},{opacity:0,x:-140,duration:.3,ease:'power2.out',immediateRender:false},BG+.05);
    for(var k=0;k<3;k++){ tl.to('#d'+k,{x:0,duration:.2,ease:'power3.inOut'},BG+.26); }
    shake('#hk-in',BG+.18,12,.25,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:0,duration:.01},0);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
