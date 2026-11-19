import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from './types.ts';

/** 5qn3_door_blink: four CLOSED doors (round art) sit sharp on the card from frame 0 and hop in a knocking wave; a white camera blink
 *  flashes at the «لمحة» beat. Reveals nothing (no open door, no star). Params: t1, doors[] (4 production-relative png paths), beats {blink}. */
export default defineHook({
  name: '5qn3_door_blink',
  aliases: [],
  about: 'four closed round-art doors hop in a knocking wave from frame 0, then a camera-blink flash lands on «لمحة»',
  beats: { blink: 1.0 },
  tint: 'rgba(29,21,72,.97)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.55, -12), c('hook_blink', B.blink, -8)],
  render({ P, B, D, esc, pal }) {
    const doors: string[] = (P.doors ?? []).map((f: string) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), f)).toString('base64'));
    const pos = [[10, 30], [450, 30], [10, 440], [450, 440]];
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 118}px;color:#fff">${esc(P.t1 ?? 'ركّز.. لمحة وبس!')}</div>`;
    const body = doors.map((d, i) => `<div class="abs dr" id="d${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;width:440px;height:410px"><img src="${d}" width="380" height="380" style="display:block;margin:0 auto"/></div>`).join('')
      + `<div class="abs" id="blink" style="left:0;top:0;width:900px;height:860px;background:#fff;opacity:0;border-radius:26px"></div>`;
    const js = `
    var BL=${B.blink};
    tl.set('.dr',{transformOrigin:'50% 100%'},0);
    // frame 0: doors already settled and sharp; they keep moving (knocking wave, staggered) the whole scene
    for(var i=0;i<4;i++){ tl.fromTo('#d'+i,{y:0,rotation:0,scale:1},{y:-34,rotation:(i%2?3:-3),scale:1.04,duration:.16,yoyo:true,repeat:5,ease:'sine.inOut'},i*.09); }
    shake('#hk-in',.02,10,.25,1);
    tl.fromTo('#blink',{opacity:0},{opacity:.95,duration:.06,ease:'power1.out'},BL);
    tl.to('#blink',{opacity:0,duration:.22,ease:'power2.in'},BL+.06);
    tl.fromTo('#bgfx',{opacity:0},{opacity:0,duration:.01},0);
    tl.to('.dr',{scale:1.08,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},BL+.04);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
