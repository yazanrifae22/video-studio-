import { defineHook } from './types.ts';

/** 6go7_three_steps_live (2026-10-28, derived from 6go7_stair_climb): three rising ink steps (١ ٢ ٣). Frame 0 is already in motion: the gold ball
 *  is mid-air on its way from step ١ to step ٢, then hops onto ٣, bounces there and spins on the punch word. No round content, nothing pre-answered.
 *  Params: t1 (top line, visible from 0.0), t2 (punch line), beats {punch}. Pure SVG/CSS. */
export default defineHook({
  name: '6go7_three_steps_live',
  aliases: [],
  about: 'three rising steps, a gold ball already mid-hop at frame 0 climbs to the tall red third step; the punch line slams on the landing',
  beats: { punch: 0.9 },
  tint: 'rgba(255,255,255,.62)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -10)],  // no cue on the punch word: a pop there masked «بتصعب» in the render ASR
  render({ P, B, D, esc, onscreen, pal }) {
    const H = [160, 310, 460], W = 290, X0 = 15, BASE = 800, R = 48;
    const t1 = P.t1 ?? '٣ جولات..';
    const t2 = P.t2 ?? onscreen;
    const nums = '١٢٣';
    // v10: the FULL line is on screen from frame 0 (white), the punch word turns gold and pops on its beat
    const top =
      `<div class="hk-t hk-o" id="t1" style="top:96px;font-size:94px;color:#fff;white-space:nowrap"><span>${esc(t1)}</span> <span id="t2" style="display:inline-block;margin-right:.22em">${esc(t2)}</span></div>`;
    let body = '';
    H.forEach((h, k) => {
      const bg = k === 2 ? pal.red : pal.ink;
      const fg = k === 2 ? '#fff' : pal.gold;
      body += `<div class="abs" id="st${k}" style="left:${X0 + k * W}px;top:${BASE - h}px;width:${W - 8}px;height:${h}px;background:${bg};border-radius:22px 22px 0 0;box-shadow:inset 0 12px 0 rgba(255,255,255,.18)"><div style="position:absolute;left:0;right:0;top:${k === 2 ? 40 : 24}px;text-align:center;font-weight:900;font-size:${k === 2 ? 190 : 130}px;line-height:1.1;color:${fg}">${nums[k]}</div></div>`;
    });
    const bx = X0 + (W - 8) / 2 - R, by = BASE - H[0] - 2 * R;
    body += `<div class="abs" id="ball" style="left:${bx}px;top:${by}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE08A,${pal.gold} 55%,${pal.goldDeep});border:6px solid ${pal.ink}"></div>`;
    const js = `
    var HS=${JSON.stringify(H)}, W=${W}, PU=${B.punch};
    var d1=-(HS[1]-HS[0]), d2=-(HS[2]-HS[0]);
    // frame 0: ball already mid-air between step 1 and step 2, landing on step 2 at 0.12 s
    tl.fromTo('#ball',{x:W*.3,y:d1-150,immediateRender:true},{x:W,y:d1,duration:.19,ease:'power2.in',immediateRender:true},0);
    tl.fromTo('#st1',{scaleY:1},{scaleY:.95,duration:.06,yoyo:true,repeat:1,ease:'power2.out',transformOrigin:'50% 100%'},.19);
    // hop to step 3
    tl.to('#ball',{x:2*W,duration:.28,ease:'none'},.2);
    tl.to('#ball',{y:d2-120,duration:.14,ease:'power2.out'},.2);
    tl.to('#ball',{y:d2,duration:.14,ease:'power2.in'},.34);
    tl.fromTo('#st2',{scaleY:1},{scaleY:.95,duration:.06,yoyo:true,repeat:1,ease:'power2.out',transformOrigin:'50% 100%'},.48);
    // keeps bouncing on the top step until the punch word
    tl.to('#ball',{y:d2-70,duration:.15,yoyo:true,repeat:3,ease:'sine.out'},.56);
    tl.fromTo('#t1',{scale:1.04},{scale:1,duration:.2,ease:'power4.out'},0);
    tl.set('#t2',{color:'${pal.gold}'},PU);
    tl.fromTo('#t2',{scale:1.3},{scale:1,duration:.24,ease:'back.out(2)',transformOrigin:'50% 60%'},PU);
    shake('#st2',PU,12,.4,1.5);
    tl.to('#ball',{rotation:360,duration:.4,ease:'power1.out'},PU);
    tl.to('#t1',{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    return { top, body, js };
  },
});
