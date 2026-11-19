import { defineHook, r2 } from './types.ts';

/** stair_climb: four ink steps (١..٤) rise left to right; a gold ball hops up them, lands on the tall red ٤ and slams the punch line. Params: t1, t2, beats {hop:[t2,t3,t4], punch}. */
export default defineHook({
  name: '6go7_stair_climb',
  aliases: ['stair_climb'],
  about: 'four rising steps, a gold ball hops up to the tall red fourth step and the punch line slams',
  beats: { hop: [0.4, 0.7, 1.0], punch: 1.1 },
  tint: 'rgba(255,255,255,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    // pops only after the spoken «جولات» (ends ~0.8 s): nothing under the word (2026-10-27 ASR fix)
    ...B.hop.map((t: number, k: number) => ({ t, k })).filter(({ t }: { t: number; k: number }) => t + 0.2 > 0.95).map(({ t, k }: { t: number; k: number }) => c('pop', t + 0.2, -9 + 2 * k)),
    c('hook_slam', B.punch, -6),
  ],
  render({ P, B, D, esc, onscreen, pal }) {
    const H = [140, 270, 400, 530], W = 200, X0 = 50, BASE = 800, R = 45;
    const t1 = P.t1 ?? '٤ جولات';
    const t2 = P.t2 ?? onscreen;
    const nums = '١٢٣٤';
    const top =
      `<div class="hk-t" id="t1" style="top:56px;font-size:130px;color:#fff;white-space:nowrap">${esc(t1)}</div>` +
      `<div class="hk-t hk-o" id="t2" style="top:70px;font-size:112px;color:${pal.gold};opacity:0;white-space:nowrap">${esc(t2)}</div>`;
    let body = '';
    H.forEach((h, k) => {
      const bg = k === 3 ? pal.red : pal.ink;
      const fg = k === 3 ? '#fff' : pal.gold;
      body += `<div class="abs" id="st${k}" style="left:${X0 + k * W}px;top:${BASE - h}px;width:${W - 8}px;height:${h}px;background:${bg};border-radius:22px 22px 0 0;box-shadow:inset 0 12px 0 rgba(255,255,255,.18)"><div style="position:absolute;left:0;right:0;top:${k === 3 ? 40 : 24}px;text-align:center;font-weight:900;font-size:${k === 3 ? 170 : 120}px;line-height:1.1;color:${fg}">${nums[k]}</div></div>`;
    });
    const bx = X0 + (W - 8) / 2 - R, by = BASE - H[0] - 2 * R;
    body += `<div class="abs" id="ball" style="left:${bx}px;top:${by}px;width:${2 * R}px;height:${2 * R}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE08A,${pal.gold} 55%,${pal.goldDeep});border:6px solid ${pal.ink}"></div>`;
    const js = `
    var HP=${JSON.stringify(B.hop)}, HS=${JSON.stringify(H)}, PU=${B.punch}, W=${W};
    tl.fromTo('#t1',{scale:1.12},{scale:1,duration:.25,ease:'power4.out'},0);
    HP.forEach(function(t,i){
      var dx=(i+1)*W, dy=-(HS[i+1]-HS[0]), prev=-(HS[i]-HS[0]);
      tl.to('#ball',{x:dx,duration:.24,ease:'none'},t);
      tl.to('#ball',{y:dy-110,duration:.12,ease:'power2.out'},t);
      tl.to('#ball',{y:dy,duration:.12,ease:'power2.in'},t+.12);
      tl.fromTo('#st'+(i+1),{scaleY:1},{scaleY:.95,duration:.06,yoyo:true,repeat:1,ease:'power2.out',transformOrigin:'50% 100%'},t+.24);
    });
    tl.set('#t1',{opacity:0},PU);
    tl.set('#t2',{opacity:1,transformOrigin:'50% 50%'},PU);
    tl.fromTo('#t2',{scale:1.18},{scale:1,duration:.22,ease:'power4.out'},PU);
    shake('#st3',PU,12,.4,1.5);
    tl.to('#ball',{rotation:360,duration:.4,ease:'power1.out'},PU);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    return { top, body, js };
  },
});
