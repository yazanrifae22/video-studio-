import { defineHook } from './types.ts';

/** tp3f_scales_duel: a big balance scale. A gold star and a teal star trade the heavy side (tilt left, right, left), then the beam slams level
 *  with a shake and ring, and «مين أشطر؟» drops in a gold pill. Friend challenge: you vs your friend, whoever scores more. */
export default defineHook({
  name: 'tp3f_scales_duel',
  aliases: [],
  about: 'a balance scale tips left, right, left between a gold and a teal star, then slams level and the challenge pill drops',
  beats: { swing: 0.18, swing2: 0.48, level: 0.78, pill: 0.9 },  // pill lands on «مين» (voice_at 0 -> word at 1.0 s)
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue }) => [cue('hook_slam', 0, -9), cue('swap', B.swing, -10), cue('swap', B.swing2, -10), cue('hook_slam', B.level, -5), cue('ding', B.pill + 0.1, -8)],
  render({ P, B, esc, pal }) {
    const star = (c: string) => `<svg viewBox="0 0 100 100" width="150" height="150"><path d="M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z" fill="${c}" stroke="#fff" stroke-width="7" stroke-linejoin="round"/></svg>`;
    const pan = (id: string, c: string, x: number) => `<div id="${id}" style="position:absolute;left:${x - 130}px;top:26px;width:260px;height:300px;transform-origin:130px 0">
<svg viewBox="0 0 260 300" width="260" height="300"><path d="M130 0 L20 190 M130 0 L240 190" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M0 190 H260 Q250 262 130 266 Q10 262 0 190 Z" fill="${c}" stroke="#fff" stroke-width="10" stroke-linejoin="round"/></svg>
<div style="position:absolute;left:55px;top:50px;width:150px;height:150px">${star(c === pal.gold ? pal.gold : pal.teal)}</div></div>`;
    const stroke = `text-shadow:-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink},0 16px 30px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:136px;color:#fff">${esc(P.t1 ?? 'تحدّى صاحبك')}</div>`;
    const body = `
<div class="abs" id="post" style="left:420px;top:230px;width:60px;height:520px;border-radius:30px;background:linear-gradient(90deg,${pal.lilac},#fff 45%,${pal.lilac});border:8px solid ${pal.ink}"></div>
<div class="abs" id="base" style="left:210px;top:730px;width:480px;height:70px;border-radius:40px;background:${pal.gold};border:8px solid ${pal.ink}"></div>
<div class="abs" id="beam" style="left:90px;top:170px;width:720px;height:50px;transform-origin:360px 25px">
 <div style="position:absolute;left:0;top:0;width:720px;height:50px;border-radius:25px;background:${pal.violet};border:8px solid #fff;box-sizing:border-box"></div>
 ${pan('panL', pal.gold, 40)}${pan('panR', pal.teal, 680)}</div>
<div class="abs" id="hub" style="left:410px;top:160px;width:80px;height:80px;border-radius:50%;background:${pal.gold};border:9px solid ${pal.ink}"></div>
<div class="abs" id="ring" style="left:330px;top:100px;width:240px;height:240px;border-radius:50%;border:16px solid ${pal.gold};opacity:0"></div>
<div class="abs" id="t2" style="left:-70px;right:-70px;top:470px;text-align:center;direction:rtl;font-weight:900;font-size:176px;line-height:1.15;color:#fff;opacity:0;${stroke}">${esc(P.t2 ?? 'مين أشطر؟')}</div>`;
    const js = `
    var S1=${B.swing},S2=${B.swing2},LV=${B.level},PL=${B.pill};
    tl.set('#beam,#panL,#panR',{},0);
    tl.set('#panL,#panR',{transformOrigin:'130px 0'},0);
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(25,211,197,0) 30%, rgba(25,211,197,.65) 100%)',opacity:0},0);
    // frame 0: scale already tilted left-heavy and visible; swing to the right, back left, then slam level
    tl.set('#beam',{rotation:-13},0); tl.set('#panL',{rotation:13},0); tl.set('#panR',{rotation:13},0);
    var seg=function(a,t,d,e){tl.to('#beam',{rotation:a,duration:d,ease:e},t);tl.to('#panL,#panR',{rotation:-a,duration:d,ease:e},t);};
    seg(13,S1,.3,'back.out(1.6)');
    seg(-9,S2,.28,'back.out(1.6)');
    seg(0,LV,.16,'power4.in');
    tl.fromTo('#hub',{scale:1},{scale:1.35,duration:.1,yoyo:true,repeat:1},LV);
    shake('#hk-in',LV+.12,18,.45,2);
    tl.fromTo('#ring',{scale:.5,opacity:1},{scale:3.6,opacity:0,duration:.5,ease:'power2.out',immediateRender:false},LV+.12);
    tl.fromTo('#bgfx',{opacity:0},{opacity:.7,duration:.12,yoyo:true,repeat:1},LV+.12);
    tl.fromTo('#panL',{y:0},{y:-14,duration:.09,yoyo:true,repeat:1},LV+.12);
    tl.fromTo('#panR',{y:0},{y:-14,duration:.09,yoyo:true,repeat:1},LV+.12);
    tl.fromTo('#t2',{y:-260,scale:1.5,opacity:0},{y:0,scale:1,opacity:1,rotation:-3,duration:.26,ease:'bounce.out',transformOrigin:'50% 50%'},PL);
    shake('#hk-in',PL+.1,10,.3,1);
    tl.to('#t2',{scale:1.07,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},PL+.3);
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, js };
  },
});
