import { defineHook } from './types.ts';

/** heat_cards: four round cards (١..٤) flash in with a cold-to-hot background, a heat bar fills and the last card burns. Params: see README.md. Moved verbatim from templates-hook.ts (2026-10-26). */
export default defineHook({
  name: 'heat_cards',
  aliases: ['heat'],
  about: 'four round cards (١..٤) flash in with a cold-to-hot background, a heat bar fills and the last card burns',
  beats: { b: [0, 0.35, 0.7, 1.05] },
  tint: 'rgba(255,255,255,.64)',
  sfx: ({ B, cue: c }) => [...B.b.map((t: number, k: number) => c(k < 3 ? 'pop' : 'hook_slam', t, k < 3 ? -10 + 2 * k : -6)), c('hook_alarm', B.b[3], -9)],
  render({ P, B, D, esc }) {
        const words: string[] = P.words ?? ['سهلة', 'عادية', 'صعبة', 'للأذكيا بس!'];
        const nums = '١٢٣٤';
        const bgs = ['linear-gradient(160deg,#22D489,#19D3C5)', 'linear-gradient(160deg,#FFC83D,#FFE08A)', 'linear-gradient(160deg,#FF9F43,#FF7A2F)', 'linear-gradient(160deg,#FF3355,#FF5C7A)'];
        const heat = ['#22D489', '#F5B800', '#FF8A1F', '#FF3355'], topc = ['#fff', '#1D1548', '#1D1548', '#fff'];
        const flame = '<svg viewBox="0 0 100 120" width="150" height="180"><path d="M50 4 C62 34 90 48 84 80 C80 104 62 116 50 116 C36 116 16 104 16 78 C16 54 36 46 38 22 C48 30 52 40 50 4 Z" fill="#FF3355"/><path d="M50 52 C58 68 70 74 66 92 C64 104 56 110 50 110 C42 110 34 104 34 90 C34 76 46 70 50 52 Z" fill="#FFC83D"/></svg>';
        let top = '', html = '';
        words.forEach((w, k) => {
          top += `<div class="hk-t" id="tp${k}" style="top:46px;font-size:130px;color:${topc[k]};opacity:0">جولة ${nums[k]}</div>`;
        });
        words.forEach((w, k) => {
          html += `<div class="abs hk-c" id="c${k}" style="inset:0;opacity:0"><div class="abs" style="left:0;right:0;top:10px;text-align:center;font-weight:900;font-size:520px;line-height:1.05;color:${heat[k]};text-shadow:0 14px 0 rgba(29,21,72,.12)">${nums[k]}</div>${k === 3 ? `<div class="abs" id="fl" style="left:600px;top:20px">${flame}</div>` : ''}<div class="abs" style="left:0;right:0;top:545px;text-align:center;direction:rtl;font-weight:900;font-size:${k === 3 ? 122 : 150}px;line-height:1.1;color:#1D1548;white-space:nowrap">${esc(w)}</div></div>`;
        });
        html += `<div class="abs" style="left:30px;right:30px;top:740px;height:70px;display:flex;gap:14px;direction:ltr">${heat.map((c, k) => `<div style="flex:1;border-radius:35px;background:rgba(29,21,72,.14);overflow:hidden"><div id="th${k}" style="width:100%;height:100%;background:${c};transform-origin:0 50%;transform:scaleX(0)"></div></div>`).join('')}</div>`;
        const body = html;
        const js = `
        var b=${JSON.stringify(B.b)},bgs=${JSON.stringify(bgs)};
        tl.set('#bgfx',{opacity:1,backgroundImage:bgs[0]},0);
        for(var k=0;k<4;k++){
          var t=b[k], nx=k<3?b[k+1]:null;
          if(k>0) tl.set('#bgfx',{backgroundImage:bgs[k]},t);
          tl.set('#c'+k,{opacity:1,transformOrigin:'50% 50%'},t); if(nx!=null) tl.set('#c'+k,{opacity:0},nx);
          tl.set('#tp'+k,{opacity:1,transformOrigin:'50% 50%'},t); if(nx!=null) tl.set('#tp'+k,{opacity:0},nx);
          tl.fromTo('#c'+k,{scale:1.5,rotation:k%2?-6:6},{scale:1,rotation:0,duration:.2,ease:'power4.out'},t);
          tl.fromTo('#tp'+k,{scale:1.4},{scale:1,duration:.2,ease:'power4.out'},t);
          for(var j=0;j<=k;j++) tl.fromTo('#th'+j,{scaleX:j<k?1:0},{scaleX:1,duration:j<k?.001:.2,ease:'power2.out'},t);
        }
        var L=b[3];
        shake('#hk-in',L,18,.6,2.4);
        tl.fromTo('#fl',{scale:.6,y:30},{scale:1.1,y:0,duration:.2,ease:'back.out(3)',transformOrigin:'50% 100%'},L);
        tl.to('#fl',{scale:.92,duration:.12,yoyo:true,repeat:5,ease:'sine.inOut',transformOrigin:'50% 100%'},L+.2);
        tl.to('#bgfx',{opacity:.82,duration:.1,yoyo:true,repeat:5,ease:'sine.inOut'},L+.1);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
        return { top, body, js };
  },
});
