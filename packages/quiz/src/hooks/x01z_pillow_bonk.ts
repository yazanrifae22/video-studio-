import { defineHook, r2 } from './types.ts';

/** x01z_pillow_bonk: a gold and a pink sofa cushion swing in from opposite sides and bonk head-on in the middle (starburst, feathers, shake),
 *  and «N جولات!» sits under them from frame 0 (full hook text readable at 0.0 s), punching on the bonk. Friend challenge. */
export default defineHook({
  name: 'x01z_pillow_bonk',
  aliases: [],
  about: 'two sofa cushions swing in and bonk in the middle, feathers fly, then the round count drops',
  beats: { swing: 0.2, bonk: 0.7, punch: 1.35 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -9), cue('whoosh', B.swing, -12), cue('hook_slam', B.bonk, -6), cue('ding', B.punch, -8)],
  render({ P, B, D, esc, pal }) {
    const cushion = (c: string, d: string, id: string) => `<svg viewBox="0 0 340 340" width="340" height="340">
<path d="M30 40 Q170 12 310 40 Q330 170 310 300 Q170 326 30 300 Q10 170 30 40 Z" fill="${c}" stroke="#fff" stroke-width="12" stroke-linejoin="round"/>
<path d="M62 74 Q170 56 278 74 Q292 170 278 266 Q170 284 62 266 Q48 170 62 74 Z" fill="none" stroke="${d}" stroke-width="7" stroke-dasharray="20 16" stroke-linecap="round"/>
<circle cx="170" cy="170" r="16" fill="${d}"/></svg>`;
    const feather = (i: number) => `<div class="abs fth" id="f${i}" style="left:450px;top:330px;width:46px;height:96px;opacity:0"><svg viewBox="0 0 46 96" width="46" height="96"><path d="M23 2 Q50 40 23 94 Q-4 40 23 2 Z" fill="#fff" stroke="${pal.ink}" stroke-width="5"/></svg></div>`;
    const stroke = `text-shadow:-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 30px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:150px;color:#fff">${esc(P.t1 ?? 'العب مع صاحبك')}</div>`;
    const body = `
<div class="abs" id="cL" style="left:40px;top:150px;width:340px;height:340px">${cushion(pal.gold, pal.goldDeep, 'a')}</div>
<div class="abs" id="cR" style="left:520px;top:150px;width:340px;height:340px">${cushion(pal.pink, pal.red, 'b')}</div>
<div class="abs" id="burst" style="left:300px;top:190px;width:300px;height:300px;opacity:0"><svg viewBox="0 0 300 300" width="300" height="300"><path d="M150 0 L180 100 L280 60 L205 135 L300 170 L200 190 L250 280 L160 215 L120 300 L110 205 L20 250 L85 170 L0 130 L95 110 L60 20 L130 85 Z" fill="${pal.gold}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg></div>
${[0, 1, 2, 3, 4, 5].map(feather).join('')}
<div class="abs" id="t2" style="left:-30px;right:-30px;top:520px;text-align:center;direction:rtl;font-weight:900;font-size:176px;line-height:1.15;color:#fff;${stroke}">${esc(P.t2 ?? '٣ جولات!')}</div>`;
    const js = `
    var SW=${B.swing},BK=${B.bonk},PU=${B.punch};
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,92,122,0) 30%, rgba(255,92,122,.65) 100%)',opacity:0},0);
    tl.fromTo('#t1',{scale:1.15},{scale:1,duration:.3,ease:'power4.out'},0);
    shake('#hk-in',.3,10,.25,1);
    // frame 0: both cushions already visible at the edges, tilted back; wind-up, then swing together
    tl.set('#cL',{rotation:-22,x:0,transformOrigin:'50% 100%'},0);
    tl.set('#cR',{rotation:22,x:0,transformOrigin:'50% 100%'},0);
    tl.to('#cL',{x:-28,rotation:-34,duration:SW-.02,ease:'power2.out'},0.02);
    tl.to('#cR',{x:28,rotation:34,duration:SW-.02,ease:'power2.out'},0.02);
    tl.to('#cL',{x:150,rotation:14,duration:BK-SW,ease:'power3.in'},SW);
    tl.to('#cR',{x:-150,rotation:-14,duration:BK-SW,ease:'power3.in'},SW);
    // bonk: squash, rebound, burst, feathers
    tl.to('#cL',{x:70,rotation:-12,scaleX:.86,duration:.12,ease:'power3.out'},BK);
    tl.to('#cR',{x:-70,rotation:12,scaleX:.86,duration:.12,ease:'power3.out'},BK);
    tl.to('#cL,#cR',{scaleX:1,duration:.2,ease:'elastic.out(1,.4)'},BK+.12);
    tl.fromTo('#burst',{scale:.3,opacity:1,rotation:-10},{scale:1.3,opacity:0,rotation:12,duration:.38,ease:'power2.out',immediateRender:false},BK);
    shake('#hk-in',BK,18,.45,2);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.7,duration:.12,yoyo:true,repeat:1},BK);
    var ang=[-150,-100,-55,-20,25,70],dx=[-300,-190,-90,80,200,320],dy=[-210,-290,-330,-320,-270,-200];
    for(var i=0;i<6;i++){
      tl.fromTo('#f'+i,{x:0,y:0,rotation:0,opacity:1,scale:1},{x:dx[i],y:dy[i]+120,rotation:ang[i]*2,opacity:0,duration:.8,ease:'power2.out',immediateRender:false},BK+.02);
    }
    tl.set('#t2',{rotation:-3,transformOrigin:'50% 50%'},0);
    tl.fromTo('#t2',{scale:1.18},{scale:1,duration:.26,ease:'bounce.out',immediateRender:false},PU);
    shake('#hk-in',PU+.1,10,.3,1);
    tl.to('#t2',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},PU+.3);
    tl.to('#cL',{y:-14,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},PU);
    tl.to('#cR',{y:-14,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},PU+.07);
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, js };
  },
});
