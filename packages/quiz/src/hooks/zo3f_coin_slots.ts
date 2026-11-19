import { defineHook } from './types.ts';

/** zo3f_coin_slots: four empty numbered slots (١ ٢ ٣ ٤) sit in a gold-rimmed tray from frame 0; one gold coin drops into each slot
 *  with a bounce, then the tray glows and the pill «اجمع الأربعة!» slams in. No counter value rolls: every number is static. */
export default defineHook({
  name: 'zo3f_coin_slots',
  aliases: [],
  about: 'four numbered slots in a tray; a gold coin drops into each, one per round, then the collect pill slams in',
  beats: { c1: 0.5, gap: 0.22, pill: 1.38 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -10),
    ...[0, 1, 2, 3].map(k => cue('pop', B.c1 + k * B.gap, -9)),
    cue('ding', B.pill, -8)],
  render({ P, B, esc, pal }) {
    const AR = '١٢٣٤';
    const stroke = `text-shadow:-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 30px rgba(0,0,0,.45)`;
    const W = 190, GAP = 28, X0 = (900 - (4 * W + 3 * GAP)) / 2;
    const slot = (k: number) => `
<div class="abs" style="left:${X0 + k * (W + GAP)}px;top:150px;width:${W}px;height:${W}px">
<svg viewBox="0 0 190 190" width="190" height="190"><circle cx="95" cy="95" r="86" fill="${pal.ink}" fill-opacity=".75" stroke="${pal.gold}" stroke-width="8" stroke-dasharray="22 14"/></svg>
<div style="position:absolute;left:0;right:0;top:22px;text-align:center;font-weight:900;font-size:120px;line-height:1.1;color:#fff;opacity:.45">${AR[k]}</div></div>`;
    const coin = (k: number) => `
<div class="abs" id="co${k}" style="left:${X0 + k * (W + GAP)}px;top:150px;width:${W}px;height:${W}px;opacity:0">
<svg viewBox="0 0 190 190" width="190" height="190"><circle cx="95" cy="95" r="90" fill="${pal.gold}" stroke="#fff" stroke-width="10"/>
<circle cx="95" cy="95" r="68" fill="none" stroke="${pal.goldDeep}" stroke-width="8"/></svg>
<div style="position:absolute;left:0;right:0;top:20px;text-align:center;font-weight:900;font-size:124px;line-height:1.1;color:${pal.ink}">${AR[k]}</div></div>`;
    const top = `<div class="hk-t" id="t1" style="top:80px;font-size:108px;color:#fff">${esc(P.t1 ?? 'كل جولة = نقطة')}</div>`;
    const body = `
<div class="abs" id="tray" style="left:0;top:100px;width:900px;height:290px;border-radius:56px;background:linear-gradient(160deg,#2A1F6B,#1D1548);border:10px solid ${pal.gold};box-shadow:0 20px 50px rgba(29,21,72,.45), inset 0 0 50px rgba(106,59,255,.5)"></div>
${[0, 1, 2, 3].map(slot).join('')}${[0, 1, 2, 3].map(coin).join('')}
<div class="abs" id="glow" style="left:-14px;top:84px;width:928px;height:322px;border-radius:80px;border:14px solid #fff;opacity:0"></div>
<div class="abs" id="t2" style="left:0;right:0;top:500px;display:flex;justify-content:center;direction:rtl"><span style="display:block;background:${pal.gold};color:${pal.ink};font-weight:900;font-size:120px;line-height:1.2;padding:4px 50px 20px;border-radius:999px;box-shadow:0 14px 34px rgba(29,21,72,.3)">${esc(P.t2 ?? 'اجمع الأربعة!')}</span></div>`;
    void stroke;
    const js = `
    var C1=${B.c1},G=${B.gap},BP=${B.pill};
    tl.fromTo('#t1',{scale:1.15},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.fromTo('#tray',{y:-16},{y:0,duration:.3,ease:'back.out(2)'},0);
    for (var k=0;k<4;k++){ var t=C1+k*G;
      tl.fromTo('#co'+k,{y:-420,opacity:0,scale:1.25},{y:0,opacity:1,scale:1,duration:.2,ease:'power3.in',immediateRender:false},t-.2);
      tl.to('#co'+k,{scale:1.18,duration:.07,ease:'power2.out'},t).to('#co'+k,{scale:1,duration:.2,ease:'back.out(3)'},t+.07);
      shake('#hk-in',t,7,.18,.6);
    }
    var E=C1+3*G+.25;
    tl.fromTo('#glow',{opacity:0,scale:.95},{opacity:.85,scale:1,duration:.15,yoyo:true,repeat:1,ease:'power2.out',immediateRender:false},E);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.5,duration:.15,yoyo:true,repeat:1},E);
    tl.set('#t2',{opacity:0},0);
    slam('#t2',BP,.4,.3);
    tl.fromTo('#t2',{rotation:-4},{rotation:0,duration:.35,ease:'elastic.out(1,.4)'},BP);
    shake('#hk-in',BP,10,.3,1);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,200,61,0) 30%, rgba(255,200,61,.55) 100%)'},0);`;
    return { top, body, js };
  },
});
