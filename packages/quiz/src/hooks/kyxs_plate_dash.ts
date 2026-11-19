import { defineHook } from './types.ts';

/** kyxs_plate_dash: four plain, colourless ceramic plates (2 x 2, sharp from frame 0) hop in a staggered wave, then dash
 *  clockwise round the four corners (a quick shuffle) with speed streaks. Rims are a neutral slate and carry no symbol,
 *  so no round's colour/answer is shown. Params: t1, t1_px, beats {go}. Pure HTML/CSS. */
export default defineHook({
  name: 'kyxs_plate_dash',
  aliases: [],
  about: 'four plain colourless plates hop in a wave from frame 0, then dash clockwise round the corners with speed streaks',
  beats: { go: 0.9 },
  tint: 'rgba(29,21,72,.97)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.55, -12), c('whoosh', B.go, -8)],
  render({ P, B, esc }) {
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 125}px;color:#fff">${esc(P.t1 ?? 'جاهز؟ ٣ جولات!')}</div>`;
    const POS = [[110, 110], [490, 110], [490, 470], [110, 470]]; // clockwise from top-left (viewer side)
    const plate = (i: number) => `<div class="abs pd" id="d${i}" style="left:${POS[i][0]}px;top:${POS[i][1]}px;width:300px;height:300px">`
      + `<div style="position:absolute;inset:0;border-radius:50%;background:#C9D1E6;box-shadow:0 10px 0 #8E98B8,0 0 0 6px #FFFFFF"></div>`
      + `<div style="position:absolute;inset:34px;border-radius:50%;background:#F3F4FA;box-shadow:inset 0 0 0 5px #DDE2F0"></div></div>`;
    const body = [0, 1, 2, 3].map(plate).join('')
      + [0, 1, 2, 3].map(i => `<div class="abs st" id="s${i}" style="left:${[120, 480, 480, 120][i]}px;top:${[250, 250, 640, 640][i]}px;width:300px;height:14px;border-radius:7px;background:#fff;opacity:0"></div>`).join('');
    const js = `
    var BG=${B.go};
    var POS=${JSON.stringify(POS)};
    tl.set('.pd',{transformOrigin:'50% 100%'},0);
    // frame 0: plates already settled and sharp; they keep hopping (staggered wave) until the dash
    for(var i=0;i<4;i++){ tl.fromTo('#d'+i,{y:0,rotation:0,scale:1},{y:-30,rotation:(i%2?3:-3),scale:1.03,duration:.16,yoyo:true,repeat:3,ease:'sine.inOut'},i*.08); }
    shake('#hk-in',.02,10,.25,1);
    // clockwise dash: every plate moves to the next corner and back to its own (two quick legs)
    for(var j=0;j<4;j++){ var n=(j+1)%4; tl.to('#d'+j,{x:POS[n][0]-POS[j][0],y:POS[n][1]-POS[j][1],duration:.2,ease:'power3.inOut'},BG); }
    tl.set('.st',{opacity:0},0); tl.fromTo('.st',{opacity:.9,x:60},{opacity:0,x:-140,duration:.3,ease:'power2.out',immediateRender:false},BG+.05);
    for(var k=0;k<4;k++){ var m=(k+1)%4; tl.to('#d'+k,{x:0,y:0,duration:.2,ease:'power3.inOut'},BG+.26); }
    shake('#hk-in',BG+.18,12,.25,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:0,duration:.01},0);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
