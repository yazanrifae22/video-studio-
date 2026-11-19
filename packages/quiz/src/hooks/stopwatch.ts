import { defineHook } from './types.ts';

/** stopwatch: a stopwatch ticks ٣ → ٢ → ١ with a red vignette pulse, then «بس!» slams over it. Params: see README.md. Moved verbatim from templates-hook.ts (2026-10-26). */
export default defineHook({
  name: 'stopwatch',
  aliases: ['timer'],
  about: 'a stopwatch ticks ٣ → ٢ → ١ with a red vignette pulse, then «بس!» slams over it',
  beats: { ticks: [0.3, 0.7, 1.1], bas: 1.15 },
  tint: 'rgba(255,255,255,.5)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -10), c('tick', B.ticks[0], -6), c('tick', B.ticks[1], -6), c('tick_last', B.ticks[2], -4), c('hook_alarm', B.bas, -9), c('hook_slam', B.bas, -6)],
  render({ P, B, D, esc }) {
        const C = (2 * Math.PI * 262).toFixed(1);
        const marks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${(350 + Math.cos(a) * 296).toFixed(1)}" y1="${(430 + Math.sin(a) * 296).toFixed(1)}" x2="${(350 + Math.cos(a) * (i % 3 === 0 ? 268 : 280)).toFixed(1)}" y2="${(430 + Math.sin(a) * (i % 3 === 0 ? 268 : 280)).toFixed(1)}" stroke="#fff" stroke-opacity="${i % 3 === 0 ? 0.9 : 0.5}" stroke-width="${i % 3 === 0 ? 10 : 6}" stroke-linecap="round"/>`; }).join('');
        const top = `<div class="hk-t" id="t1" style="top:40px;font-size:118px;color:#fff">${esc(P.t1 ?? 'عندك ٣ ثواني')}</div>`;
        const body = `
<div class="abs" id="sw" style="left:100px;top:30px;width:700px;height:780px"><svg viewBox="0 0 700 780" width="700" height="780">
<rect x="290" y="0" width="120" height="70" rx="22" fill="#FFC83D"/><rect x="262" y="48" width="176" height="44" rx="18" fill="#F5B800"/>
<circle cx="350" cy="430" r="330" fill="#1D1548"/><circle cx="350" cy="430" r="330" fill="none" stroke="#FFC83D" stroke-width="14"/>
<circle cx="350" cy="430" r="262" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="34"/>
<circle id="arc" cx="350" cy="430" r="262" fill="none" stroke="#FFC83D" stroke-width="34" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 350 430)"/>
${marks}</svg>
<div class="abs" id="dig" style="left:0;right:0;top:215px;text-align:center;font-weight:900;font-size:380px;line-height:430px;height:430px;color:#fff;direction:rtl">٣</div><div class="abs" id="dig2" style="left:0;right:0;top:215px;text-align:center;font-weight:900;font-size:380px;line-height:430px;height:430px;color:#fff;direction:rtl;opacity:0">٢</div><div class="abs" id="dig1" style="left:0;right:0;top:215px;text-align:center;font-weight:900;font-size:380px;line-height:430px;height:430px;color:#FF8FA3;direction:rtl;opacity:0">١</div></div>
<div class="abs" id="bas" style="left:-60px;right:-60px;top:260px;text-align:center;direction:rtl;font-weight:900;font-size:330px;line-height:1.1;color:#FFC83D;opacity:0;text-shadow:-10px 0 0 #1D1548,10px 0 0 #1D1548,0 -10px 0 #1D1548,0 10px 0 #1D1548,-8px -8px 0 #1D1548,8px 8px 0 #1D1548,-8px 8px 0 #1D1548,8px -8px 0 #1D1548,0 22px 40px rgba(0,0,0,.45)">${esc(P.t2 ?? 'بس!')}</div>`;
        const js = `
        var T=${JSON.stringify(B.ticks)},BS=${B.bas},C=${C};
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,0) 38%, rgba(255,40,80,.78) 100%)',opacity:0},0);
        tl.set('#sw',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.fromTo('#sw',{scale:1.3,rotation:-6},{scale:1,rotation:0,duration:.34,ease:'back.out(2)'},0);
        T.forEach(function(t,i){
          tl.to('#arc',{strokeDashoffset:C*(i+1)/3*.985,duration:.12,ease:'back.out(2)'},t);
          tl.fromTo('#sw',{scale:1},{scale:1.07,duration:.07,yoyo:true,repeat:1,ease:'power2.out'},t);
          var DG=['#dig','#dig2','#dig1'];
          if(i>0){ tl.set(DG[i-1],{opacity:0},t); tl.set(DG[i],{opacity:1},t); }
          tl.fromTo(DG[i],{scale:1.3},{scale:1,duration:.2,ease:'power3.out',transformOrigin:'50% 50%'},t);
          tl.fromTo('#bgfx',{opacity:.15},{opacity:.7,duration:.1,ease:'power2.out'},t).to('#bgfx',{opacity:.2,duration:.22,ease:'power1.in'},t+.1);
        });
        tl.set('#arc',{stroke:'#FF5C7A'},T[2]);
        tl.to('#arc',{opacity:0,duration:.1},T[2]+.14);
        tl.to('#dig1',{scale:.5,opacity:0,duration:.12,ease:'power3.in'},BS-.02);
        tl.fromTo('#bas',{scale:2.4,opacity:0,rotation:-14},{scale:1,opacity:1,rotation:-7,duration:.24,ease:'power4.out'},BS);
        shake('#hk-in',BS,16,.5,2);
        tl.to('#bgfx',{opacity:.78,duration:.12,yoyo:true,repeat:5,ease:'sine.inOut'},BS+.05);
        tl.to('#bas',{scale:1.06,duration:.15,yoyo:true,repeat:3,ease:'sine.inOut'},BS+.3);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
        return { top, body, js };
  },
});
