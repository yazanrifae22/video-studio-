import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from './types.ts';

/** eqw1_bulb_blink: four SWITCHED-OFF bulbs (round art) sit sharp on the card from frame 0 and hop from frame 1; at the «ترمش» beat two
 *  navy eyelids snap shut and open (an eye blink). Reveals nothing: no lit bulb, no changed bulb, no shuffle.
 *  Params: t1, t1_px, bulbs[] (4 production-relative png paths), beats {blink}. */
export default defineHook({
  name: 'eqw1_bulb_blink',
  aliases: [],
  about: 'four switched-off bulbs hop from frame 1, then two eyelids snap shut and open on «ترمش»',
  beats: { blink: 1.0 },
  tint: 'rgba(29,21,72,.8)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.6, -12), c('hook_blink', B.blink, -8)],
  render({ P, B, D, esc, pal }) {
    const bulbs: string[] = (P.bulbs ?? []).map((f: string) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), f)).toString('base64'));
    const pos = [[10, 30], [450, 30], [10, 440], [450, 440]];
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 120}px;color:#fff">${esc(P.t1 ?? 'انتبه.. لا ترمش!')}</div>`;
    const body = bulbs.map((d, i) => `<div class="abs bb" id="b${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;width:440px;height:410px"><img src="${d}" width="380" height="380" style="display:block;margin:0 auto"/></div>`).join('')
      + `<div class="abs" style="left:0;top:0;width:900px;height:860px;overflow:hidden;border-radius:26px"><div class="abs" id="lidT" style="left:0;top:-440px;width:900px;height:440px;background:${pal.ink};border-radius:0 0 60px 60px"></div>`
      + `<div class="abs" id="lidB" style="left:0;top:860px;width:900px;height:440px;background:${pal.ink};border-radius:60px 60px 0 0"></div></div>`;
    const js = `
    var BL=${B.blink};
    tl.set('.bb',{transformOrigin:'50% 100%'},0);
    // frame 0: bulbs settled and sharp; they hop from the first frame (no stagger on the first one), the whole scene
    for(var i=0;i<4;i++){ tl.fromTo('#b'+i,{y:0,rotation:0,scale:1},{y:-34,rotation:(i%2?3:-3),scale:1.04,duration:.16,yoyo:true,repeat:5,ease:'power1.out'},i*.05); }
    shake('#hk-in',.02,10,.25,1);
    // eye blink: lids meet at the card middle, hold 2 frames, open
    tl.to('#lidT',{top:-10,duration:.09,ease:'power2.in'},BL);
    tl.to('#lidB',{top:430,duration:.09,ease:'power2.in'},BL);
    tl.to('#lidT',{top:-440,duration:.16,ease:'power2.out'},BL+.16);
    tl.to('#lidB',{top:860,duration:.16,ease:'power2.out'},BL+.16);
    tl.to('.bb',{scale:1.08,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},BL+.2);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
