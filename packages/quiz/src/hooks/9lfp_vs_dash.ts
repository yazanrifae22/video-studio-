import { defineHook, r2 } from './types.ts';

/** 9lfp_vs_dash: two friend avatars slam in from opposite edges, a paper plane flies from one to the other (the "send"),
 *  the receiver bounces, then a huge «VS» slams with a screen shake and «مين أسرع؟» drops under it. */
export default defineHook({
  name: '9lfp_vs_dash',
  aliases: [],
  about: 'two friends slam in from the edges, a paper plane is sent across, VS slams and the challenge line drops',
  beats: { plane: 0.0, land: 0.7, vs: 0.85, punch: 1.05 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -9), cue('pop', B.land + 0.1, -9), cue('hook_slam', B.vs, -5), cue('ding', B.punch, -8)],
  render({ P, B, D, esc, pal }) {
    const face = (bg: string, id: string) => `<svg viewBox="0 0 300 300" width="300" height="300"><circle cx="150" cy="150" r="140" fill="${bg}" stroke="#fff" stroke-width="14"/>
<ellipse cx="105" cy="125" rx="17" ry="24" fill="${pal.ink}"/><ellipse cx="195" cy="125" rx="17" ry="24" fill="${pal.ink}"/>
<circle cx="111" cy="115" r="6" fill="#fff"/><circle cx="201" cy="115" r="6" fill="#fff"/>
<path id="${id}" d="M92 190 Q150 245 208 190" fill="none" stroke="${pal.ink}" stroke-width="16" stroke-linecap="round"/></svg>`;
    const stroke = `text-shadow:-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 30px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:128px;color:#fff">${esc(P.t1 ?? 'ابعتها لصاحبك')}</div>`;
    const body = `
<div class="abs" id="pnl" style="left:0;top:0;width:900px;height:860px;border-radius:48px;background:linear-gradient(160deg,#FFFFFF 0%,#EEEAFB 55%,#D9D3F2 100%)"></div>
<div class="abs" id="avL" style="left:20px;top:150px;width:300px;height:300px">${face(pal.gold, 'mL')}</div>
<div class="abs" id="avR" style="left:580px;top:150px;width:300px;height:300px">${face(pal.teal, 'mR')}</div>
<div class="abs" id="plane" style="left:130px;top:60px;width:150px;height:130px;opacity:0"><svg viewBox="0 0 150 130" width="150" height="130"><path d="M4 62 L146 6 L102 124 L70 84 Z" fill="#fff" stroke="${pal.ink}" stroke-width="8" stroke-linejoin="round"/><path d="M70 84 L146 6" fill="none" stroke="${pal.ink}" stroke-width="8"/></svg></div>
<div class="abs" id="vs" style="left:0;right:0;top:300px;text-align:center;direction:ltr;font-weight:900;font-size:260px;line-height:1;color:${pal.gold};opacity:1;transform:rotate(-6deg);${stroke}">VS</div>
<div class="abs" id="t2" style="left:-70px;right:-70px;top:600px;text-align:center;direction:rtl;font-weight:900;font-size:171px;line-height:1.15;color:#fff;opacity:0;${stroke}">${esc(P.t2 ?? 'مين أسرع؟')}</div>`;
    const js = `
    var BP=${B.plane},BL=${B.land},BV=${B.vs},BU=${B.punch};
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(106,59,255,.0) 30%, rgba(106,59,255,.7) 100%)',opacity:0},0);
    tl.fromTo('#hk-in',{scale:1.07},{scale:1,duration:.2,ease:'power3.out'},0);
    tl.fromTo('#t1',{scale:1.18},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.set('#avL',{x:0,rotation:-6},0); tl.fromTo('#avL',{scale:1.18},{scale:1,duration:.3,ease:'back.out(2)'},0);
    tl.set('#avR',{x:0,rotation:6},0); tl.fromTo('#avR',{scale:1.18},{scale:1,duration:.3,ease:'back.out(2)'},0);
    tl.fromTo('#vs',{scale:1.3},{scale:1,duration:.25,ease:'back.out(2)'},0);
    shake('#hk-in',.3,10,.25,1);
    tl.set('#plane',{opacity:1,x:60,y:130,rotation:-10,scale:.8},0);
    tl.to('#plane',{x:560,y:-10,rotation:12,scale:1.25,duration:BL-BP,ease:'power2.in'},BP);
    tl.to('#plane',{x:640,y:90,scale:.2,opacity:0,duration:.14,ease:'power2.in'},BL);
    tl.fromTo('#avL',{scale:1.0},{scale:1.1,duration:.08,yoyo:true,repeat:1},BP+.1);
    tl.fromTo('#avR',{scale:1},{scale:1.28,duration:.12,yoyo:true,repeat:1,ease:'power3.out'},BL);
    tl.to('#mR',{attr:{d:'M80 178 Q150 270 220 178'},duration:.1},BL);
    tl.fromTo('#vs',{scale:1.7,rotation:-14},{scale:1,rotation:-6,duration:.22,ease:'power4.out',transformOrigin:'50% 50%'},BV);
    shake('#hk-in',BV,18,.45,2);
    tl.to('#avL',{x:-24,duration:.1,ease:'power2.out'},BV).to('#avR',{x:24,duration:.1,ease:'power2.out'},BV);
    tl.fromTo('#t2',{y:-260,scale:1.5,opacity:0},{y:0,scale:1,opacity:1,rotation:3,duration:.26,ease:'bounce.out',transformOrigin:'50% 50%'},BU);
    shake('#hk-in',BU+.1,10,.3,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.75,duration:.12,yoyo:true,repeat:1},BV);
    tl.to('#vs',{scale:1.08,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BU);
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, js };
  },
});
