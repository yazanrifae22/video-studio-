import { defineHook, r2 } from './types.ts';

/** 86jc_score_dial: a half-circle dial with five round badges (zero, 1, 2, 3, 4) sits settled from frame 0, the needle rests on the zero badge
 *  (a big drawn ring, never the font's dot). The needle sweeps to the right, lighting each badge gold as it passes, then the pill «من ٤!» slams in. */
export default defineHook({
  name: '86jc_score_dial',
  aliases: [],
  about: 'a half-circle score dial: needle sweeps from a big zero to 4, lighting each badge; the "of 4" pill slams in',
  beats: { sweep: 0.3, span: 0.9, pill: 1.3 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -10), cue('hook_riser', B.sweep, -14),
    ...[1, 2, 3, 4].map(k => cue('pop', B.sweep + (B.span * k) / 4, -10)),
    cue('ding', B.pill, -8)],
  render({ P, B, esc, pal }) {
    const AR = '٠١٢٣٤';
    const CX = 450, CY = 500, R = 330;
    const pos = (k: number) => { const a = Math.PI - (k * Math.PI) / 4; return [CX + R * Math.cos(a), CY - R * Math.sin(a)]; };
    const badge = (k: number) => {
      const [x, y] = pos(k);
      const S = k === 0 ? 190 : 150;
      const inner = k === 0
        // a big drawn zero: tall ring, never the font's tiny dot
        ? `<svg viewBox="0 0 190 190" width="190" height="190" style="position:absolute;left:0;top:0"><ellipse id="zr" cx="95" cy="95" rx="40" ry="62" fill="none" stroke="#fff" stroke-width="22"/></svg>`
        : `<div style="position:absolute;left:0;right:0;top:${S * 0.06}px;text-align:center;font-weight:900;font-size:${S * 0.8}px;line-height:1.1;color:#fff">${AR[k]}</div>`;
      return `<div class="abs" id="bd${k}" style="left:${x - S / 2}px;top:${y - S / 2}px;width:${S}px;height:${S}px">
<div id="bg${k}" style="position:absolute;inset:0;border-radius:50%;background:${pal.ink};border:10px solid ${pal.gold};box-shadow:0 10px 26px rgba(29,21,72,.5)"></div>
<div id="fg${k}" style="position:absolute;inset:0">${inner}</div></div>`;
    };
    const arc = `<svg class="abs" style="left:0;top:0" viewBox="0 0 900 860" width="900" height="860"><path d="M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}" fill="none" stroke="${pal.lilac}" stroke-opacity=".55" stroke-width="26" stroke-linecap="round"/>
<path id="prog" d="M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}" fill="none" stroke="${pal.gold}" stroke-width="26" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
    const needle = `<div class="abs" id="needle" style="left:${CX - 300}px;top:${CY - 20}px;width:600px;height:40px;transform-origin:300px 20px">
<svg viewBox="0 0 600 40" width="600" height="40"><polygon points="20,20 300,2 300,38" fill="#fff" stroke="${pal.ink}" stroke-width="5" stroke-linejoin="round"/></svg></div>
<div class="abs" style="left:${CX - 46}px;top:${CY - 46}px;width:92px;height:92px;border-radius:50%;background:${pal.gold};border:12px solid ${pal.ink}"></div>`;
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:150px;color:#fff">${esc(P.t1 ?? 'كم نقطة؟')}</div>`;
    const body = `${arc}${[0, 1, 2, 3, 4].map(badge).join('')}${needle}
<div class="abs" id="t2" style="left:0;right:0;top:650px;display:flex;justify-content:center;direction:rtl"><span style="display:block;background:${pal.gold};color:${pal.ink};font-weight:900;font-size:150px;line-height:1.2;padding:4px 64px 22px;border-radius:999px;box-shadow:0 14px 34px rgba(29,21,72,.3)">${esc(P.t2 ?? 'من ٤!')}</span></div>`;
    const js = `
    var S0=${B.sweep},SP=${B.span},BP=${B.pill};
    tl.fromTo('#t1',{scale:1.12},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.fromTo('#needle',{rotation:0},{rotation:180,duration:SP,ease:'none',immediateRender:false},S0);
    tl.fromTo('#prog',{strokeDashoffset:100},{strokeDashoffset:0,duration:SP,ease:'none',immediateRender:false},S0);
    for (var k=0;k<5;k++){ var t=S0+SP*k/4;
      tl.set('#bd'+k,{transformOrigin:'50% 50%'},0);
      tl.to('#bg'+k,{backgroundColor:'${pal.gold}',duration:.05},t);
      if(k>0) tl.to('#fg'+k+' div',{color:'${pal.ink}',duration:.05},t); else tl.to('#zr',{stroke:'${pal.ink}',duration:.05},t);
      tl.to('#bd'+k,{scale:1.22,duration:.07,ease:'power2.out'},t).to('#bd'+k,{scale:1,duration:.2,ease:'back.out(3)'},t+.07);
      if(k>0) shake('#hk-in',t,6,.16,.5); }
    tl.set('#t2',{opacity:0},0);
    slam('#t2',BP,.4,.3);
    tl.fromTo('#t2',{rotation:-4},{rotation:0,duration:.35,ease:'elastic.out(1,.4)'},BP);
    shake('#hk-in',BP,10,.3,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.5,duration:.15,yoyo:true,repeat:1},BP);
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,200,61,0) 30%, rgba(255,200,61,.55) 100%)'},0);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    void r2;
    return { top, body, js };
  },
});
