import fs from 'node:fs';
import path from 'node:path';
import { defineHook } from './types.ts';

/** 71z4_three_lives_peek: three gold life-discs (١–٣) already on the card at frame 0 and bobbing, the round-1 hoodies (grey, as in the question)
 *  sharp behind them and drifting, a slip would crack the third disc (red flash), then «ولا غلطة!» slams down. Claims nothing false:
 *  no life is ever lost. Params: t1, t3, beats, hoodies_img. Reveals nothing (greys only, no answer). */
export default defineHook({
  name: '71z4_three_lives_peek',
  aliases: [],
  about: 'three gold life-discs bob over the sharp grey round-1 hoodies, the third cracks with a red flash, «ولا غلطة!» slams',
  beats: { discs: 0.0, line: 0.45, crack: 0.8, lost: 1.0 },
  tint: 'rgba(29,21,72,.55)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    ...[0, 1, 2].map(k => c('pop', B.discs + k * 0.1, -11)),
    c('hook_riser', B.line, -12),
    c('hook_blink', B.crack, -7),
    c('hook_alarm', B.crack, -10),
    c('hook_slam', B.lost, -5),
  ],
  render({ P, B, esc, pal }) {
    const AR = ['١', '٢', '٣'];
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.45)`;
    const hood = P.hoodies_img ? 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), P.hoodies_img)).toString('base64') : '';
    const L = [95, 355, 615];
    const disc = (i: number) => `<div class="lf-d" id="lf${i}" style="left:${L[i]}px">${AR[i]}</div>`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:150px;color:#fff">${esc(P.t1 ?? '٣ جولات..')}</div>`;
    const body = `
${hood ? `<div class="abs" id="hds" style="left:30px;top:330px;width:839px;height:400px"><img src="${hood}" width="839" height="400"/></div>` : ''}
<div class="abs" id="row" style="left:0;top:70px;width:900px;height:190px">
${disc(0)}${disc(1)}
<div class="lf-d" id="d2a" style="left:${L[2]}px;clip-path:polygon(0 0,82% 0,74% 24%,84% 46%,76% 70%,82% 100%,0 100%)">٣</div>
<div class="lf-d" id="d2b" style="left:${L[2]}px;clip-path:polygon(82% 0,100% 0,100% 100%,82% 100%,76% 70%,84% 46%,74% 24%)">٣</div>
<svg class="abs" id="zig" style="left:${L[2]}px;top:0" width="190" height="190" viewBox="0 0 190 190"><polyline points="156,0 141,46 160,88 144,134 156,190" fill="none" stroke="${pal.red}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/></svg>
</div>
<div class="abs" id="lost" style="left:-60px;right:-60px;top:560px;text-align:center;direction:rtl;font-weight:900;font-size:190px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t3 ?? 'ولا غلطة!')}</div>`;
    const css = `.lf-d{position:absolute;top:0;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE08A,#FFC83D 55%,#F5B800);box-shadow:0 0 0 10px #1D1548,0 14px 30px rgba(0,0,0,.45);color:#1D1548;font-weight:900;font-size:130px;line-height:190px;text-align:center;direction:rtl}
#zig{opacity:0}`;
    const js = `
        var LN=${B.line},CK=${B.crack},LS=${B.lost};
        tl.set('#row div,#row svg',{transformOrigin:'50% 50%'},0);
        tl.set('#zig',{opacity:0},0);
        // frame 0 already shows the discs and the hoodies in place; they keep moving from there
        tl.fromTo('#t1',{scale:1.16},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.fromTo('#hds',{y:0,scale:1},{y:-24,scale:1.04,duration:2,ease:'power1.out'},0);
        [0,1].forEach(function(k){ tl.fromTo('#lf'+k,{y:-22,scale:1.12},{y:0,scale:1,duration:.3,ease:'power4.out'},k*.08); });
        tl.fromTo('#d2a',{y:-22,scale:1.12},{y:0,scale:1,duration:.3,ease:'power4.out'},.16);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,.15) 30%, rgba(255,40,80,.9) 100%)',opacity:0},0);
        tl.to('#lf0,#lf1',{y:-14,duration:.06,yoyo:true,repeat:5,ease:'sine.inOut'},.5);
        tl.set('#zig',{opacity:1},CK);
        tl.fromTo('#zig',{scale:1.6},{scale:1,duration:.14,ease:'power4.out'},CK);
        tl.to('#d2a',{x:-8,y:6,rotation:-5,duration:.34,ease:'power3.out'},CK+.04);
        tl.to('#d2b',{x:6,y:80,rotation:14,duration:.34,ease:'power3.out'},CK+.04);
        tl.to('#d2a,#d2b,#zig',{filter:'saturate(.7) brightness(.92)',duration:.2},CK+.05);
        tl.fromTo('#bgfx',{opacity:.95},{opacity:.4,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},CK);
        shake('#hk-in',CK,18,.4,2);
        tl.fromTo('#lost',{scale:2.8,opacity:0,rotation:-14},{scale:1,opacity:1,rotation:-5,duration:.24,ease:'power4.out'},LS);
        shake('#hk-in',LS,20,.45,2);
        tl.to('#lost',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},LS+.3);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
