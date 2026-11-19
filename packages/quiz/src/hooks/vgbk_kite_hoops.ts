import { defineHook } from './types.ts';

/** kite_hoops: a gold kite swoops through four gold hoops (one per round) in a wavy line; every hoop it clears turns green and pulses.
 *  After the fourth the kite hovers and a gold ribbon «بلا غلطة؟» sweeps across with a green glow.
 *  Framing: "all right / no slip" as a challenge question. Nothing is lost on a miss; the line only names the goal. True for the 4-round vgbk. */
export default defineHook({
  name: 'vgbk_kite_hoops',
  aliases: [],
  about: 'a gold kite flies through four hoops in a wave, each hoop turning green as it clears, then a gold ribbon «بلا غلطة؟» sweeps in',
  beats: { hoops: [0.25, 0.5, 0.75, 1.0], word: 1.15 },
  tint: 'rgba(29,21,72,.6)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('whoosh', 0.04, -14),
    c('pop', B.hoops[0], -9), c('pop', B.hoops[1], -8), c('pop', B.hoops[2], -7), c('pop', B.hoops[3], -6),
    c('ding', B.word - 0.02, -9),
    c('hook_slam', B.word, -6),
  ],
  render({ P, B, esc, pal }) {
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.45)`;
    // hoop centres in card px, right -> left (RTL reading order), wavy
    const HX = [740, 540, 340, 140];
    const HY = [330, 190, 330, 190];
    const hoop = (i: number) => `<div class="kh-h" id="h${i}" style="left:${HX[i] - 95}px;top:${HY[i] - 95}px"></div>`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:138px;color:#fff">${esc(P.t1 ?? '٤ جولات..')}</div>`;
    const kite = `<svg viewBox="0 0 120 230" width="120" height="230">
<path d="M60 168 C40 190 80 200 58 222" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
<path d="M44 190 l-16 -9 l0 18 z M74 205 l17 -9 l0 18 z" fill="${pal.pink}" stroke="${pal.ink}" stroke-width="4" stroke-linejoin="round"/>
<path d="M60 4 L116 70 L60 168 L4 70 Z" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="8" stroke-linejoin="round"/>
<path d="M60 4 L60 168 M4 70 L116 70" stroke="${pal.ink}" stroke-width="6" fill="none"/>
<path d="M60 70 L116 70 L60 168 Z" fill="${pal.goldDeep}" stroke="${pal.ink}" stroke-width="6" stroke-linejoin="round"/>
</svg>`;
    const body = `
${hoop(0)}${hoop(1)}${hoop(2)}${hoop(3)}
<div class="abs" id="kite" style="left:0;top:0;width:120px;height:230px">${kite}</div>
<div class="abs" id="rib" style="left:40px;right:40px;top:560px;height:230px;opacity:0;direction:rtl;text-align:center;font-weight:900;font-size:172px;line-height:230px;color:${pal.ink};background:${pal.gold};border-radius:40px;box-shadow:0 0 0 10px ${pal.ink},0 24px 40px rgba(0,0,0,.45)">${esc(P.t3 ?? 'بلا غلطة؟')}</div>`;
    const css = `.kh-h{position:absolute;width:190px;height:190px;border-radius:50%;border:24px solid ${pal.gold};box-sizing:border-box;box-shadow:0 0 0 8px ${pal.ink},inset 0 0 0 8px ${pal.ink},0 14px 28px rgba(0,0,0,.4)}`;
    const js = `
        var HP=${JSON.stringify(B.hoops)},WD=${B.word},HX=${JSON.stringify(HX)},HY=${JSON.stringify(HY)};
        tl.set('#kite',{x:810-60,y:560-115,rotation:-14,transformOrigin:'50% 50%'},0);
        tl.set('#h0,#h1,#h2,#h3',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        HP.forEach(function(t,i){
          var rot=(HY[i]<260)?-18:18;
          tl.to('#kite',{x:HX[i]-60,y:HY[i]-115,rotation:rot,duration:.22,ease:'sine.inOut'},t-.22);
          tl.to('#h'+i,{borderColor:'${pal.green}',duration:.08},t-.02);
          tl.fromTo('#h'+i,{scale:1},{scale:1.28,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},t-.02);
          shake('#hk-in',t,6,.14,0);
        });
        tl.to('#kite',{x:HX[3]-60-40,y:150-115-30,rotation:-6,duration:.22,ease:'sine.out'},HP[3]+.02);
        tl.to('#kite',{y:'-=26',duration:.2,yoyo:true,repeat:3,ease:'sine.inOut'},HP[3]+.26);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(34,212,137,0) 40%, rgba(34,212,137,.5) 100%)',opacity:0},0);
        tl.fromTo('#rib',{x:-1100,opacity:1,rotation:-9},{x:0,opacity:1,rotation:-4,duration:.26,ease:'power4.out'},WD);
        shake('#hk-in',WD+.12,16,.4,2);
        tl.fromTo('#bgfx',{opacity:.8},{opacity:.25,duration:.2,yoyo:true,repeat:2},WD);
        tl.to('#rib',{scale:1.04,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},WD+.34);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
