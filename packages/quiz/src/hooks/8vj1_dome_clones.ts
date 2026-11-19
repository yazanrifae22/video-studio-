import { defineHook } from './types.ts';

/** 8vj1_dome_clones: three identical silver serving domes sit in a row, hop over each other in a fast shuffle (the trap:
 *  they are clones), then «القبب» and «شبه بعض!» slam under them while a gold «=» badge pops between each pair.
 *  Params: t1, t2, t3, beats. Pure SVG, reveals nothing about any round's answer. */
export default defineHook({
  name: '8vj1_dome_clones',
  aliases: [],
  about: 'three identical silver domes hop over each other in a shuffle, gold «=» badges pop between them, «القبب / شبه بعض!» slam',
  beats: { s1: 0.2, s2: 0.42, s3: 0.64, eq: 0.82, a: 0.85, b: 1.08 },
  tint: 'rgba(29,21,72,.78)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('swap', B.s1, -12), c('swap', B.s2, -12), c('swap', B.s3, -12), c('pop', B.eq, -9), c('hook_slam', B.a, -8), c('hook_slam', B.b, -5)],
  render({ P, B, D, esc, pal }) {
    const outline = `-7px 0 0 ${pal.ink},7px 0 0 ${pal.ink},0 -7px 0 ${pal.ink},0 7px 0 ${pal.ink},-5px -5px 0 ${pal.ink},5px 5px 0 ${pal.ink},-5px 5px 0 ${pal.ink},5px -5px 0 ${pal.ink},0 16px 28px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:44px;font-size:170px;color:${pal.gold};text-shadow:${outline}">${esc(P.t1 ?? 'انتبه!')}</div>`;
    const dome = (id: string, x: number) => `<div class="abs dm" id="${id}" style="left:${x}px;top:90px;width:270px;height:250px"><svg viewBox="0 0 270 250" width="270" height="250">
<defs><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#8A93A6"/><stop offset=".3" stop-color="#F4F6FA"/><stop offset=".55" stop-color="#C3C9D6"/><stop offset="1" stop-color="#6F788C"/></linearGradient></defs>
<ellipse cx="135" cy="222" rx="128" ry="22" fill="#B9C0CE" stroke="${pal.ink}" stroke-width="8"/>
<path d="M22 214 C22 100 70 44 135 44 C200 44 248 100 248 214 Z" fill="url(#${id}g)" stroke="${pal.ink}" stroke-width="9" stroke-linejoin="round"/>
<ellipse cx="92" cy="110" rx="16" ry="42" fill="#fff" fill-opacity=".6" transform="rotate(24 92 110)"/>
<circle cx="135" cy="30" r="20" fill="#E4E8F0" stroke="${pal.ink}" stroke-width="8"/></svg></div>`;
    const eq = (id: string, x: number) => `<div class="abs" id="${id}" style="left:${x}px;top:150px;width:100px;height:100px;border-radius:50px;background:${pal.gold};border:8px solid ${pal.ink};color:${pal.ink};font-weight:900;font-size:90px;line-height:84px;text-align:center;opacity:0">=</div>`;
    const big = (id: string, y: number, size: number, col: string, extra = '') => `<div class="abs" id="${id}" style="left:-40px;right:-40px;top:${y}px;text-align:center;direction:rtl;font-weight:900;font-size:${size}px;line-height:${size + 10}px;color:${col};opacity:0;text-shadow:${outline};${extra}">`;
    const body = `
${dome('dA', 20)}${dome('dB', 315)}${dome('dC', 610)}
${eq('e1', 205)}${eq('e2', 500)}
${big('ta', 400, 150, '#fff')}${esc(P.t2 ?? 'القبب')}</div>
${big('tb', 590, 160, pal.gold)}${esc(P.t3 ?? 'شبه بعض!')}</div>`;
    const js = `
    var S1=${B.s1},S2=${B.s2},S3=${B.s3},BE=${B.eq},BA=${B.a},BB=${B.b};
    tl.fromTo('#t1',{scale:2.2,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.22,ease:'power4.out'},0);
    tl.set(['#dA','#dB','#dC','#ta','#tb','#e1','#e2'],{transformOrigin:'50% 80%'},0);
    // domes are settled at t=0 (hero visible), then hop over each other: A<->B, B<->C, A<->C (positions swap, arcs alternate)
    var pos={dA:0,dB:1,dC:2},base={dA:0,dB:1,dC:2};
    function hop(a,b,at){
      var pa=pos[a],pb=pos[b];pos[a]=pb;pos[b]=pa;
      tl.to('#'+a,{x:(pb-base[a])*295,duration:.2,ease:'power2.inOut'},at);
      tl.to('#'+b,{x:(pa-base[b])*295,duration:.2,ease:'power2.inOut'},at);
      tl.to('#'+a,{y:-70,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},at);
      tl.to('#'+b,{y:30,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},at);
      shake('#hk-in',at+.12,6,.15,.5);
    }
    tl.fromTo('#dB',{scale:1},{scale:1.1,duration:.12,yoyo:true,repeat:1,ease:'power2.out'},.08);
    hop('dA','dB',S1);
    hop('dA','dC',S2);
    hop('dB','dA',S3);
    tl.fromTo('#e1',{scale:0,opacity:0,rotation:-40},{scale:1,opacity:1,rotation:0,duration:.2,ease:'back.out(2.5)'},BE);
    tl.fromTo('#e2',{scale:0,opacity:0,rotation:40},{scale:1,opacity:1,rotation:0,duration:.2,ease:'back.out(2.5)'},BE+.1);
    tl.to(['#dA','#dB','#dC'],{y:-18,duration:.1,yoyo:true,repeat:1,ease:'sine.out'},BE);
    tl.fromTo('#ta',{scale:2.4,opacity:0,x:260},{scale:1,opacity:1,x:0,duration:.2,ease:'power4.out'},BA);
    shake('#hk-in',BA,10,.25,1);
    tl.fromTo('#tb',{scale:2.8,opacity:0,rotation:-10},{scale:1,opacity:1,rotation:-3,duration:.22,ease:'power4.out'},BB);
    shake('#hk-in',BB,18,.45,2.2);
    tl.to('#tb',{scale:1.07,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BB+.3);
    tl.to(['#e1','#e2'],{rotation:12,duration:.1,yoyo:true,repeat:5,ease:'sine.inOut'},BB+.1);`;
    return { top, body, js };
  },
});
