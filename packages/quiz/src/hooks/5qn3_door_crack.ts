import { defineHook } from './types.ts';

/** 5qn3_door_crack: a big blue door (drawn in SVG/CSS, no round art) swings open a crack on its hinge, a gold light floods out
 *  with a navy «؟» silhouette inside it, the door slams shut with a shake and the punch «لمحة!» slams in. Reveals nothing.
 *  Params: t1, t2, beats {open, shut}. */
export default defineHook({
  name: '5qn3_door_crack',
  aliases: [],
  about: 'a blue door swings open a crack, gold light floods out around a «؟» silhouette, then it slams shut and «لمحة!» slams in',
  beats: { open: 0.3, shut: 1.38 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('whoosh', B.open, -10), c('hook_blink', B.open + 0.1, -11), c('hook_slam', B.shut, -6), c('hook_lock', B.shut + 0.1, -9)],
  render({ P, B, esc, pal }) {
    const outline = `-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 28px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:112px;color:#fff">${esc(P.t1 ?? 'في شي ورا الباب')}</div>`;
    const body = `
<div class="abs" id="frame" style="left:225px;top:70px;width:450px;height:590px;border-radius:30px 30px 0 0;background:${pal.ink};border:14px solid ${pal.gold};box-shadow:0 0 0 10px ${pal.ink},0 22px 40px rgba(0,0,0,.5)"></div>
<div class="abs" id="light" style="left:239px;top:84px;width:422px;height:576px;border-radius:20px 20px 0 0;overflow:hidden;background:radial-gradient(ellipse at 50% 55%,#fff7cf 0%,${pal.gold} 45%,${pal.goldDeep} 100%)">
<div class="abs" id="qm" style="left:0;top:90px;width:422px;text-align:center;font-weight:900;font-size:330px;line-height:360px;color:${pal.ink};direction:rtl">؟</div></div>
<div class="abs" id="beam" style="left:240px;top:560px;width:640px;height:300px;opacity:0;transform-origin:0 0;background:linear-gradient(100deg,rgba(255,200,61,.75),rgba(255,200,61,0));clip-path:polygon(0 0,100% 55%,100% 100%,0 100%)"></div>
<div class="abs" id="pers" style="left:239px;top:84px;width:422px;height:576px;perspective:1100px">
<div class="abs" id="door" style="left:0;top:0;width:422px;height:576px;transform-origin:0% 50%;border-radius:20px 20px 0 0;background:linear-gradient(90deg,#2F8CFF,#1f6fe0);box-shadow:inset 0 0 0 12px rgba(29,21,72,.35)">
<div class="abs" style="left:52px;top:44px;width:318px;height:210px;border-radius:12px;background:rgba(29,21,72,.22);box-shadow:inset 0 6px 14px rgba(0,0,0,.35)"></div>
<div class="abs" style="left:52px;top:308px;width:318px;height:216px;border-radius:12px;background:rgba(29,21,72,.22);box-shadow:inset 0 6px 14px rgba(0,0,0,.35)"></div>
<div class="abs" style="left:350px;top:270px;width:44px;height:44px;border-radius:50%;background:${pal.gold};box-shadow:0 0 0 7px ${pal.ink}"></div></div></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:668px;font-size:230px;color:${pal.gold};opacity:0;text-shadow:${outline}">${esc(P.t2 ?? 'لمحة!')}</div>`;
    const js = `
    var O=${B.open},S=${B.shut};
    tl.fromTo('#t1',{scale:1.18,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.set('#door',{rotationY:0},0);
    tl.to('#door',{rotationY:-62,duration:.42,ease:'power3.out'},O);
    tl.to('#door',{rotationY:-70,duration:S-O-.42,ease:'sine.inOut'},O+.42);
    tl.fromTo('#beam',{opacity:0,scaleX:.2},{opacity:1,scaleX:1,duration:.4,ease:'power2.out'},O);
    tl.fromTo('#qm',{scale:.6,y:30},{scale:1,y:0,duration:.5,ease:'back.out(2.5)'},O+.05);
    tl.to('#qm',{rotation:8,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},O+.5);
    tl.to('#frame',{x:-6,duration:.05,yoyo:true,repeat:5,ease:'sine.inOut'},O+.45);
    tl.to('#door',{rotationY:0,duration:.14,ease:'power4.in'},S);
    tl.to('#beam',{opacity:0,duration:.1,ease:'power2.in'},S);
    shake('#hk-in',S+.12,18,.4,1.6);
    tl.fromTo('#light',{filter:'brightness(1)'},{filter:'brightness(1.5)',duration:.08,yoyo:true,repeat:1},S+.12);
    slam('#t2',S+.02,1.7,.22);  // lands as the door shuts, on «لمحة» (voice ~1.5 s)
    tl.to('#t2',{scale:1.06,duration:.2,yoyo:true,repeat:3,ease:'sine.inOut'},S+.35);
    tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);`;
    return { top, body, js, css: `#door,#frame,#light{will-change:transform}` };
  },
});
