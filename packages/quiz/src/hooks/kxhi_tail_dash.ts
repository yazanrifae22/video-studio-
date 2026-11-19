import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from './types.ts';

/** kxhi_tail_dash: four plane tails (round art, no red/orange/pink so nothing of any round is pre-answered) sit SHARP on the card from
 *  frame 0 and hop in a staggered wave; at the «go» beat they dash forward together (speed streaks + a short shake).
 *  Params: t1, tails[] (4 production-relative png paths, 420x420 art with the tail+fuselage in y 96..310), beats {go}. */
export default defineHook({
  name: 'kxhi_tail_dash',
  aliases: [],
  about: 'four plane tails hop in a wave from frame 0, then dash forward together with speed streaks (a race start)',
  beats: { go: 1.0 },
  tint: 'rgba(29,21,72,.97)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.6, -12), c('whoosh', B.go, -8)],
  render({ P, B, esc }) {
    const tails: string[] = (P.tails ?? []).map((f: string) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), f)).toString('base64'));
    const pos = [[10, 150], [455, 150], [10, 450], [455, 450]];
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 150}px;color:#fff">${esc(P.t1 ?? 'مين أسرع؟')}</div>`;
    const body = tails.map((d, i) => `<div class="abs tl" id="d${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;width:435px;height:215px;overflow:hidden"><img src="${d}" width="420" height="420" style="display:block;margin:-96px 0 0 7px"/></div>`).join('')
      + [0, 1, 2, 3].map(i => `<div class="abs st" id="s${i}" style="left:${i % 2 ? 560 : 120}px;top:${[260, 330, 560, 630][i]}px;width:260px;height:14px;border-radius:7px;background:#fff;opacity:0"></div>`).join('');
    const js = `
    var BG=${B.go};
    tl.set('.tl',{transformOrigin:'50% 100%'},0);
    // frame 0: tails already settled and sharp; they keep moving (staggered hop wave) the whole scene
    for(var i=0;i<4;i++){ tl.fromTo('#d'+i,{y:0,rotation:0,scale:1},{y:-30,rotation:(i%2?2.5:-2.5),scale:1.03,duration:.16,yoyo:true,repeat:5,ease:'sine.inOut'},i*.08); }
    shake('#hk-in',.02,10,.25,1);
    tl.to('.tl',{x:60,scale:1.1,duration:.12,ease:'power3.in'},BG);
    tl.fromTo('.st',{opacity:.9,x:70},{opacity:0,x:-160,duration:.3,ease:'power2.out'},BG+.06);
    tl.to('.tl',{x:0,scale:1,duration:.22,ease:'power2.out'},BG+.14);
    shake('#hk-in',BG+.12,12,.25,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:0,duration:.01},0);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
