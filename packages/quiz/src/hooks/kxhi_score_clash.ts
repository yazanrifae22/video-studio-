import { defineHook, r2 } from './types.ts';

/** kxhi_score_clash: two big score badges («أنت» gold, «صاحبك» teal) sit apart showing «؟/٤», wind back, then crash into each
 *  other like pucks: starburst, screen shake, sparks, and the line «مع صاحبك!» drops under the impact. */
export default defineHook({
  name: 'kxhi_score_clash',
  aliases: [],
  about: 'two score badges (you vs your friend) wind back and crash together in a starburst; the compare line drops',
  beats: { wind: 0.3, crash: 0.62, punch: 1.4 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -9), cue('hook_riser', B.wind, -12), cue('hook_slam', B.crash, -5), cue('ding', B.punch, -8)],
  render({ P, B, esc, pal }) {
    const stroke = `text-shadow:-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 30px rgba(0,0,0,.45)`;
    const badge = (id: string, bg: string, left: number, label: string, rot: number) => `
<div class="abs" id="${id}" style="left:${left}px;top:70px;width:380px;height:380px;transform:rotate(${rot}deg)">
<svg viewBox="0 0 380 380" width="380" height="380"><circle cx="190" cy="190" r="178" fill="${bg}" stroke="#fff" stroke-width="16"/>
<circle cx="190" cy="190" r="140" fill="none" stroke="${pal.ink}" stroke-opacity=".18" stroke-width="10"/></svg>
<div style="position:absolute;left:0;right:0;top:46px;text-align:center;font-weight:900;font-size:104px;line-height:1.1;color:${pal.ink}">${label}</div>
<div style="position:absolute;left:0;right:0;top:170px;text-align:center;direction:ltr;font-weight:900;font-size:130px;line-height:1.1;color:#fff;text-shadow:0 6px 0 ${pal.ink}">؟/٤</div></div>`;
    const spark = Array.from({ length: 10 }, (_, i) => `<div class="abs sp" id="sp${i}" style="left:430px;top:250px;width:40px;height:40px;border-radius:50%;background:${i % 2 ? pal.gold : '#fff'};opacity:0"></div>`).join('');
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:130px;color:#fff">${esc(P.t1 ?? 'قارن نتيجتك')}</div>`;
    const body = `${badge('bL', pal.gold, 20, 'أنت', -4)}${badge('bR', pal.teal, 500, 'صاحبك', 4)}
<div class="abs" id="burst" style="left:200px;top:20px;width:500px;height:500px;opacity:0"><svg viewBox="-100 -100 200 200" width="500" height="500"><polygon fill="#fff" stroke="${pal.gold}" stroke-width="5" stroke-linejoin="round" points="${Array.from({ length: 24 }, (_, i) => { const a = (i * Math.PI) / 12, r = i % 2 ? 52 : 98; return `${r2(Math.cos(a) * r)},${r2(Math.sin(a) * r)}`; }).join(' ')}"/></svg></div>
${spark}
<div class="abs" id="t2" style="left:-70px;right:-70px;top:560px;text-align:center;direction:rtl;font-weight:900;font-size:170px;line-height:1.15;color:${pal.gold};opacity:0;${stroke}">${esc(P.t2 ?? 'مع صاحبك!')}</div>`;
    const css = `#burst svg{display:block}`;
    const js = `
    var BW=${B.wind},BC=${B.crash},BU=${B.punch};
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(106,59,255,.0) 30%, rgba(106,59,255,.7) 100%)',opacity:0},0);
    tl.fromTo('#t1',{scale:1.15},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.to('#bL',{x:-50,rotation:-12,duration:BC-BW,ease:'power2.out'},BW).to('#bR',{x:50,rotation:12,duration:BC-BW,ease:'power2.out'},BW);
    tl.to('#bL',{x:112,rotation:3,duration:.14,ease:'power4.in'},BC).to('#bR',{x:-112,rotation:-3,duration:.14,ease:'power4.in'},BC);
    tl.to('#bL',{x:22,rotation:-5,duration:.34,ease:'elastic.out(1.1,.4)'},BC+.14).to('#bR',{x:-22,rotation:5,duration:.34,ease:'elastic.out(1.1,.4)'},BC+.14);
    tl.fromTo('#burst',{opacity:1,scale:.3,rotation:-10},{opacity:1,scale:1.15,rotation:8,duration:.16,ease:'power4.out',immediateRender:false},BC+.12);
    tl.to('#burst',{opacity:0,scale:1.45,duration:.18,ease:'power1.in'},BC+.28);
    for (var i=0;i<10;i++){var a=i/10*Math.PI*2+.3,d=250+(i%3)*70;
      tl.fromTo('#sp'+i,{x:0,y:0,opacity:1,scale:1.2},{x:Math.cos(a)*d,y:Math.sin(a)*d*.8,opacity:0,scale:.2,duration:.42,ease:'power3.out',immediateRender:false},BC+.12);}
    shake('#hk-in',BC+.12,20,.45,2);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.8,duration:.12,yoyo:true,repeat:1},BC+.12);
    tl.fromTo('#t2',{y:-300,scale:1.5,opacity:0},{y:0,scale:1,opacity:1,rotation:-3,duration:.26,ease:'bounce.out',transformOrigin:'50% 50%'},BU);
    shake('#hk-in',BU+.1,10,.3,1);
    tl.to('#t2',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BU+.3);
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
