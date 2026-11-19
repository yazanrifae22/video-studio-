import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from './types.ts';

/** xhao_hazard_peek: hazard slam with the round-1 chairs (grey, as in the question) peeking in behind it from frame 0. hazard-tape bands whip across the card, a gold warning triangle slams in and rattles,
 *  then «جولة ٤» and «فيها فخ!» slam under it with red alarm flashes. Params: t1, t2, t3, beats. Reveals nothing. */
export default defineHook({
  name: 'xhao_hazard_peek',
  aliases: [],
  about: 'hazard tape whips in, a warning triangle slams and rattles, then «جولة ٤ / فيها فخ!» slam with red alarm flashes',
  beats: { tri: 0.05, rattle: 0.4, a: 0.95, b: 1.16 },
  tint: 'rgba(29,21,72,.55)',
  sfx: ({ P, B, cue: c }) => [c('hook_slam', B.tri, -7), c('hook_alarm', B.tri + 0.1, -12), c('tick_last', B.rattle, -8), c('hook_slam', B.a, -7), ...(P.t3 === '' ? [] : [c('hook_slam', B.b, -4), c('hook_alarm', B.b, -9)])],
  render({ P, B, D, esc, pal }) {
    const chairs = P.chairs_img ? 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), P.chairs_img)).toString('base64') : '';
    const outline = `-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 18px 30px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:40px;font-size:${P.t1_px ?? 170}px;color:${pal.gold};text-shadow:${outline}">${esc(P.t1 ?? 'انتبه!')}</div>`;
    const tape = (id: string, y: number) => `<div class="abs" id="${id}" style="left:-80px;width:1060px;top:${y}px;height:64px;background:repeating-linear-gradient(-45deg,${pal.gold} 0 36px,${pal.ink} 36px 72px);box-shadow:0 10px 24px rgba(0,0,0,.4)"></div>`;
    const body = `
${chairs ? `<div class="abs" id="chs" style="left:30px;top:400px;width:839px;height:400px"><img src="${chairs}" width="839" height="400"/></div>` : ''}${tape('tp1', 0)}${tape('tp2', 796)}
<div class="abs" id="tri" style="left:250px;top:76px;width:400px;height:364px"><svg viewBox="0 0 440 400" width="400" height="364">
<polygon points="220,14 424,372 16,372" fill="${pal.ink}" stroke="${pal.gold}" stroke-width="26" stroke-linejoin="round"/>
<polygon points="220,70 372,340 68,340" fill="${pal.gold}"/>
<rect x="200" y="140" width="40" height="110" rx="20" fill="${pal.ink}"/><circle cx="220" cy="288" r="23" fill="${pal.ink}"/></svg></div>
<div class="abs" id="ta" style="left:-40px;right:-40px;top:436px;text-align:center;direction:rtl;font-weight:900;font-size:150px;line-height:160px;color:${pal.red};opacity:0;text-shadow:${outline}">${esc(P.t2 ?? 'جولة ٤')}</div>
${P.t3 === '' ? '' : `<div class="abs" id="tb" style="left:-40px;right:-40px;top:630px;text-align:center;direction:rtl;font-weight:900;font-size:160px;line-height:160px;color:#fff;opacity:0;text-shadow:${outline}">${esc(P.t3 ?? 'فيها فخ!')}</div>`}`;
    const js = `
    var BT=${B.tri},BR=${B.rattle},BA=${B.a},BB=${B.b};
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,0) 35%, rgba(255,40,80,.85) 100%)',opacity:0},0);
    tl.set(['#tri','#ta','#tb'],{transformOrigin:'50% 50%'},0);
    tl.fromTo('#t1',{scale:2.2,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.22,ease:'power4.out'},0);
    // frame 0 already shows the tape and the triangle settled (hook rule: no blank first frame); they keep moving from there
    tl.fromTo('#tp1',{x:0},{x:-36,duration:2,ease:'none'},0);
    tl.fromTo('#tp2',{x:0},{x:36,duration:2,ease:'none'},0);
    tl.fromTo('#chs',{y:0},{y:-28,duration:2,ease:'power1.out'},0);
    tl.fromTo('#tri',{scale:1,opacity:1,rotation:0},{scale:1.1,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},BT+.05);
    shake('#hk-in',BT+.22,16,.35,2);
    tl.fromTo('#bgfx',{opacity:.2},{opacity:.85,duration:.1,yoyo:true,repeat:1,ease:'sine.inOut'},BT+.2);
    tl.to('#tri',{rotation:7,duration:.06,yoyo:true,repeat:5,ease:'sine.inOut'},BR);
    tl.to('#tri',{scale:1.12,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},BR);
    tl.fromTo('#ta',{scale:2.4,opacity:0,x:260},{scale:1,opacity:1,x:0,duration:.2,ease:'power4.out'},BA);
    shake('#hk-in',BA,10,.25,1);
    if(${P.t3 === '' ? 'false' : 'true'}){
    tl.fromTo('#tb',{scale:2.8,opacity:0,rotation:-10},{scale:1,opacity:1,rotation:-3,duration:.22,ease:'power4.out'},BB);
    shake('#hk-in',BB,20,.5,2.5);
    tl.fromTo('#bgfx',{opacity:.3},{opacity:.9,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},BB+.02);
    tl.to('#tb',{scale:1.07,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BB+.3);}
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
