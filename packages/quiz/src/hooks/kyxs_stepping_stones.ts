import { defineHook } from './types.ts';

/** stepping_stones: four ink slabs (١ ٢ ٣ ٤, one per round) climb diagonally across the card. A gold ball sits on the first slab and
 *  hops up the stairs; every slab it lands on turns green and stays steady. At the top the ball bounces and a gold «كلها صح؟»
 *  plate stamps in. Framing: "all right / no slip". Nothing is lost on a miss, the line only names the goal. */
export default defineHook({
  name: 'kyxs_stepping_stones',
  aliases: [],
  about: 'a gold ball hops up four numbered stone slabs, each turning green as it lands, then «كلها صح؟» stamps in',
  beats: { hops: [0.3, 0.58, 0.86], word: 1.2 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('pop', B.hops[0], -9), c('pop', B.hops[1], -8), c('pop', B.hops[2], -7),
    c('ding', B.word - 0.02, -9),
    c('hook_slam', B.word, -6),
  ],
  render({ P, B, esc, pal }) {
    const AR = ['١', '٢', '٣', '٤'];
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.45)`;
    // slabs climb right -> left (RTL reading order); slab centre x and top y in card px
    const SX = [690, 470, 250, 30];
    const SY = [440, 320, 200, 80];
    const slab = (i: number) => `<div class="ss-s" id="s${i}" style="left:${SX[i]}px;top:${SY[i]}px">${AR[i]}</div>`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:138px;color:#fff">${esc(P.t1 ?? '٤ جولات..')}</div>`;
    const body = `
${slab(0)}${slab(1)}${slab(2)}${slab(3)}
<div class="abs ss-b" id="ball" style="left:${SX[0] + 50}px;top:${SY[0] - 100}px"></div>
<div class="abs" id="word" style="left:-40px;right:-40px;top:610px;text-align:center;direction:rtl;font-weight:900;font-size:175px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t3 ?? 'كلها صح؟')}</div>`;
    const css = `.ss-s{position:absolute;width:190px;height:130px;border-radius:26px;background:${pal.ink};box-shadow:0 0 0 10px ${pal.gold},0 16px 30px rgba(0,0,0,.45);color:#fff;font-weight:900;font-size:100px;line-height:130px;text-align:center;direction:rtl}
.ss-b{width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE08A,#FFC83D 55%,#F5B800);box-shadow:0 0 0 7px ${pal.ink},0 12px 22px rgba(0,0,0,.45)}`;
    const js = `
        var HP=${JSON.stringify(B.hops)},WD=${B.word},SX=${JSON.stringify(SX)},SY=${JSON.stringify(SY)};
        tl.set('#s0,#s1,#s2,#s3,#ball',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.to('#s0',{backgroundColor:'${pal.green}',color:'${pal.ink}',duration:.08},.12);
        HP.forEach(function(t,i){
          var dx=SX[i+1]-SX[0], dy=SY[i+1]-SY[0], pdx=SX[i]-SX[0], pdy=SY[i]-SY[0];
          tl.to('#ball',{x:(dx+pdx)/2,y:(dy+pdy)/2-110,duration:.14,ease:'power2.out'},t-.14);
          tl.to('#ball',{x:dx,y:dy,duration:.14,ease:'power2.in'},t);
          tl.to('#s'+(i+1),{backgroundColor:'${pal.green}',color:'${pal.ink}',duration:.08},t+.14);
          tl.fromTo('#s'+(i+1),{scale:1},{scale:1.12,duration:.08,yoyo:true,repeat:1,ease:'power2.out'},t+.14);
          shake('#hk-in',t+.14,6,.14,0);
        });
        tl.to('#ball',{y:'+=0',scale:1.15,duration:.1,yoyo:true,repeat:5,ease:'sine.inOut'},HP[2]+.3);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(34,212,137,0) 40%, rgba(34,212,137,.5) 100%)',opacity:0},0);
        tl.fromTo('#word',{scale:2.6,opacity:0,rotation:-12},{scale:1,opacity:1,rotation:-4,duration:.24,ease:'power4.out'},WD);
        shake('#hk-in',WD,18,.4,2);
        tl.fromTo('#bgfx',{opacity:.8},{opacity:.25,duration:.2,yoyo:true,repeat:2},WD);
        tl.to('#word',{scale:1.05,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},WD+.3);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
