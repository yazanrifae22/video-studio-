import { defineHook, r2 } from './types.ts';


/** eye: an almond eye blinks open, the iris scans left/right, a gold reticle locks on and the punch line slams in. Params: see README.md. Moved verbatim from templates-hook.ts (2026-10-26). */
export default defineHook({
  name: 'eye',
  aliases: [],
  about: 'an almond eye blinks open, the iris scans left/right, a gold reticle locks on and the punch line slams in',
  beats: { open: 0.12, scan: 0.3, lock: 0.8 },
  tint: 'rgba(40,18,110,.68)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('hook_blink', B.open, -8), c('hook_lock', B.lock, -6), c('hook_slam', B.lock, -8)],
  render({ P, B, D, esc }) {
        const rays = Array.from({ length: 28 }, (_, i) => { const a = (i / 28) * Math.PI * 2; return `<line x1="${(390 + Math.cos(a) * 92).toFixed(1)}" y1="${(215 + Math.sin(a) * 92).toFixed(1)}" x2="${(390 + Math.cos(a) * 168).toFixed(1)}" y2="${(215 + Math.sin(a) * 168).toFixed(1)}" stroke="#fff" stroke-opacity=".28" stroke-width="5"/>`; }).join('');
        const AL = 'M10 215 Q390 -150 770 215 Q390 580 10 215 Z';
        const top = `<div class="hk-t" id="t1" style="top:52px;font-size:136px;color:#fff">${esc(P.t1 ?? 'صعب تجيب')}</div>`;
        const body = `
<div class="abs" id="eye" style="left:60px;top:215px;width:780px;height:430px"><svg viewBox="0 0 780 430" width="780" height="430"><defs><clipPath id="alm"><path d="${AL}"/></clipPath>
<radialGradient id="irg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#19D3C5"/><stop offset=".5" stop-color="#2F8CFF"/><stop offset="1" stop-color="#6A3BFF"/></radialGradient>
<linearGradient id="lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D1548" stop-opacity=".45"/><stop offset=".3" stop-color="#1D1548" stop-opacity="0"/><stop offset=".7" stop-color="#1D1548" stop-opacity="0"/><stop offset="1" stop-color="#1D1548" stop-opacity=".35"/></linearGradient></defs>
<path d="${AL}" fill="#fff"/>
<g clip-path="url(#alm)"><g id="iris"><circle cx="390" cy="215" r="178" fill="url(#irg)"/>${rays}<circle cx="390" cy="215" r="178" fill="none" stroke="#1D1548" stroke-width="12"/><circle id="pupil" cx="390" cy="215" r="70" fill="#1D1548"/><circle cx="338" cy="160" r="28" fill="#fff" fill-opacity=".92"/><circle cx="436" cy="262" r="12" fill="#fff" fill-opacity=".8"/></g><rect width="780" height="430" fill="url(#lid)"/></g>
<path d="${AL}" fill="none" stroke="#FFC83D" stroke-width="16" stroke-linejoin="round"/></svg></div>
<div class="abs" id="ret" style="left:130px;top:110px;width:640px;height:640px;opacity:0"><svg viewBox="0 0 640 640" width="640" height="640" fill="none" stroke-linecap="round">
<circle cx="320" cy="320" r="304" stroke="#FFC83D" stroke-width="9" stroke-dasharray="46 28"/><circle cx="320" cy="320" r="262" stroke="#fff" stroke-width="5" stroke-opacity=".85"/>
<path d="M320 4V70M320 570V636M4 320H70M570 320H636" stroke="#FFC83D" stroke-width="14"/></svg></div>
<div class="abs" id="foot" style="left:0;right:0;top:905px;display:flex;justify-content:center;direction:rtl"><span style="display:block;background:#FFC83D;color:#1D1548;font-weight:900;font-size:96px;line-height:1.2;padding:4px 64px 16px;border-radius:999px;box-shadow:0 14px 34px rgba(29,21,72,.3)">${esc(P.foot ?? '٤ جولات')}</span></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:600px;font-size:200px;color:#FFC83D">${esc(P.t2 ?? '٤ من ٤!')}</div>`;
        const js = `
        tl.set('#eye',{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.set('#t2',{opacity:0},0);
        ${P.start_open ? "tl.set('#eye',{scaleX:1,scaleY:1},0);  /* start_open: eye fully open + iris visible at frame 0 (QA T1) */" : `tl.fromTo('#eye',{scaleY:.035},{scaleY:1,duration:.3,ease:'back.out(2.2)'},${B.open});
        tl.fromTo('#eye',{scaleX:.9},{scaleX:1,duration:.3,ease:'back.out(2)'},${B.open});`}
        var S=${B.scan};
        tl.to('#iris',{x:-95,duration:.1,ease:'power2.inOut'},S).to('#iris',{x:95,duration:.2,ease:'power2.inOut'},S+.1).to('#iris',{x:0,duration:.15,ease:'power3.out'},S+.3);
        tl.fromTo('#ret',{scale:2.1,opacity:0,rotation:0},{scale:1.12,opacity:1,duration:.3,ease:'power3.out'},S+.05);
        tl.to('#ret',{rotation:150,duration:${r2(D)},ease:'none'},S+.05);
        var L=${B.lock};
        tl.to('#ret',{scale:.9,duration:.1,ease:'power4.in'},L-.1).to('#ret',{scale:1,duration:.2,ease:'back.out(3)'},L);
        tl.to('#pupil',{scale:.7,transformOrigin:'390px 215px',duration:.12,ease:'power3.out'},L);
        slam('#t2',L,1.5,.22);
        tl.fromTo('#foot',{y:60,opacity:0,scale:.6},{y:0,opacity:1,scale:1,duration:.3,ease:'back.out(2)'},L+.1);
        tl.set('#foot',{opacity:0},0);
        shake('#hk-in',L,12,.34,1.2);
        tl.to('#t2',{scale:1.05,duration:.22,yoyo:true,repeat:3,ease:'sine.inOut'},L+.3);
        tl.to('#pupil',{scale:.82,duration:.25,yoyo:true,repeat:3,ease:'sine.inOut',transformOrigin:'390px 215px'},L+.3);
        tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);  /* the card leaves light (round-change check + continuity) */`;
        return { top, body, js };
  },
});
