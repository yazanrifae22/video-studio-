import { defineHook } from './types.ts';

/** scoreboard: a navy scoreboard panel reads ٠ / ٤, the zero bumps on the slam, a gold pill and four stars pop in. Params: see README.md. Moved verbatim from templates-hook.ts (2026-10-26). */
export default defineHook({
  name: 'scoreboard',
  aliases: ['score'],
  about: 'a navy scoreboard panel reads ٠ / ٤, the zero bumps on the slam, a gold pill and four stars pop in',
  beats: { roll: 0.12, land: 0.75, pill: 0.95, stars: 1.1 },
  tint: 'rgba(255,255,255,.5)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -10), c('hook_slam', B.land, -8), c('pop', B.pill, -10), ...[0, 1, 2, 3].map(k => c('pop', B.stars + k * 0.1, -14))],
  render({ P, B, D, esc }) {
        const AR = '٠١٢٣٤٥٦٧٨٩';
        // the score starts at ٠ from frame 0 (no roll from ٤). The font's ٠ is a tiny square dot, so the zero is drawn: a big solid disc sized like the ٤ beside it
        const zero = '<svg id="zero" viewBox="0 0 200 330" width="200" height="330"><circle cx="100" cy="165" r="86" fill="#FFC83D"/></svg>';
        const col = `<div style="height:330px;display:flex;justify-content:center;align-items:center">${zero}</div>`;
        const star = '<svg viewBox="0 0 100 100" width="118" height="118"><path d="M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z" fill="#fff" fill-opacity=".85" stroke="#FFC83D" stroke-width="7" stroke-linejoin="round"/></svg>';
        const top = `<div class="hk-t" id="t1" style="top:70px;font-size:100px;color:#fff">${esc(P.t1 ?? 'احسب نقاطك من ٤!')}</div>`;
        const body = `
<div class="abs" id="panel" style="left:70px;top:60px;width:760px;height:470px;border-radius:48px;background:linear-gradient(160deg,#2A1F6B,#1D1548);border:12px solid #FFC83D;box-shadow:0 20px 50px rgba(29,21,72,.45), inset 0 0 60px rgba(106,59,255,.5)">
 <div class="abs" style="left:0;right:0;top:18px;text-align:center;font-weight:900;font-size:46px;color:#FFC83D;opacity:.9;letter-spacing:2px">${esc(P.label ?? 'نقاطك')}</div>
 <div class="abs" style="left:0;right:0;top:80px;height:330px;display:flex;direction:ltr;justify-content:center;align-items:center;gap:10px;font-weight:900;font-size:330px;color:#fff">
  <div style="width:230px;height:330px;overflow:hidden;color:#FFC83D;text-align:center;border-radius:36px;background:rgba(255,200,61,.16);box-shadow:inset 0 0 0 5px rgba(255,200,61,.55)"><div id="col">${col}</div></div>
  <div style="font-size:250px;opacity:.8;margin-top:-20px">/</div><div style="width:230px;text-align:center;height:330px;line-height:330px">${AR[P.max ?? 4]}</div></div></div>
<div class="abs" id="ring" style="left:330px;top:150px;width:240px;height:240px;border-radius:50%;border:16px solid #FFC83D;opacity:0"></div>
<div class="abs" id="pill" style="left:0;right:0;top:580px;display:flex;justify-content:center;direction:rtl"><span style="display:block;background:#FFC83D;color:#1D1548;font-weight:900;font-size:98px;line-height:1.2;padding:4px 56px 18px;border-radius:999px;box-shadow:0 14px 34px rgba(29,21,72,.3)">${esc(P.t2 ?? 'كم رح تجيب؟')}</span></div>
<div class="abs" style="left:0;right:0;top:730px;display:flex;justify-content:center;gap:26px;direction:ltr">${[0, 1, 2, 3].map(k => `<div id="st${k}">${star}</div>`).join('')}</div>`;
        const js = `
        tl.set('#panel',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.fromTo('#panel',{scale:1.18,rotation:-3},{scale:1,rotation:0,duration:.34,ease:'back.out(2)'},0);
        var LD=${B.land};
        tl.set('#zero',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#zero',{scale:1.18},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.to('#zero',{scale:1.28,duration:.09,ease:'power2.out'},LD).to('#zero',{scale:1,duration:.2,ease:'back.out(3)'},LD+.09);
        tl.fromTo('#panel',{scale:1},{scale:1.08,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},LD);
        shake('#hk-in',LD,11,.3,1);
        tl.set('#ring',{opacity:0},0);
        tl.fromTo('#ring',{scale:.5,opacity:1},{scale:3.4,opacity:0,duration:.5,ease:'power2.out',immediateRender:false},LD);
        slam('#pill',${B.pill},.4,.3);
        tl.fromTo('#pill',{rotation:-5},{rotation:0,duration:.35,ease:'elastic.out(1,.4)'},${B.pill});
        for(var k=0;k<4;k++){ tl.set('#st'+k,{opacity:0},0); tl.fromTo('#st'+k,{scale:.2,opacity:0,rotation:-40},{scale:1,opacity:1,rotation:0,duration:.28,ease:'back.out(2.4)'},${B.stars}+k*.1); }`;
        return { top, body, js };
  },
});
