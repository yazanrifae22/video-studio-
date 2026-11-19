import { defineHook } from './types.ts';

/** four_lives: four gold life-discs (١–٤) slam in for «٤ جولات..», a slip would crack the third disc (the crack runs along its
 *  right edge, the digit stays whole and readable), a red flash, then «ولا غلطة!» slams down as the challenge. Claims nothing false:
 *  no life is ever lost in the video. */
export default defineHook({
  name: '71z4_four_lives',
  aliases: [],
  about: 'four gold life-discs slam in, the third cracks at its edge with a red flash, then «ولا غلطة!» slams down',
  beats: { discs: 0.0, line: 0.45, crack: 0.9, lost: 1.12 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    ...[0, 1, 2, 3].map(k => c('pop', B.discs + k * 0.12, -11)),
    c('hook_riser', B.line, -12),
    c('hook_blink', B.crack, -7),
    c('hook_alarm', B.crack, -10),
    c('hook_slam', B.lost, -5),
  ],
  render({ P, B, esc, pal }) {
    const AR = ['١', '٢', '٣', '٤'];
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.45)`;
    const disc = (i: number, extra = '') => `<div class="lf-d" id="lf${i}" style="left:${i * 236}px;${extra}">${AR[i]}</div>`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:138px;color:#fff">${esc(P.t1 ?? '٤ جولات..')}</div>`;
    const body = `
<div class="abs" id="row" style="left:0;top:90px;width:900px;height:190px">
${disc(0)}${disc(1)}${disc(3)}
<div class="lf-d" id="d2a" style="left:472px;clip-path:polygon(0 0,82% 0,74% 24%,84% 46%,76% 70%,82% 100%,0 100%)">٣</div>
<div class="lf-d" id="d2b" style="left:472px;clip-path:polygon(82% 0,100% 0,100% 100%,82% 100%,76% 70%,84% 46%,74% 24%)">٣</div>
<svg class="abs" id="zig" style="left:472px;top:0" width="190" height="190" viewBox="0 0 190 190"><polyline points="156,0 141,46 160,88 144,134 156,190" fill="none" stroke="${pal.red}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/></svg>
</div>
<div class="abs" id="lost" style="left:-60px;right:-60px;top:420px;text-align:center;direction:rtl;font-weight:900;font-size:190px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t3 ?? 'ولا غلطة!')}</div>`;
    const css = `.lf-d{position:absolute;top:0;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#FFE08A,#FFC83D 55%,#F5B800);box-shadow:0 0 0 10px #1D1548,0 14px 30px rgba(0,0,0,.45);color:#1D1548;font-weight:900;font-size:130px;line-height:190px;text-align:center;direction:rtl}
#d2a,#d2b,#zig{opacity:0}`;
    const js = `
        var DS=${B.discs},LN=${B.line},CK=${B.crack},LS=${B.lost};
        tl.set('#row div,#row svg',{transformOrigin:'50% 50%'},0);
        tl.set('#d2a,#d2b',{opacity:0},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        [0,1,2,3].forEach(function(k){
          var ids=k===2?'#d2a,#d2b':'#lf'+k;
          tl.set(ids,{opacity:0},0);
          tl.fromTo(ids,{scale:2.6,opacity:0,y:-120,rotation:k%2?14:-14},{scale:1,opacity:1,y:0,rotation:0,duration:.22,ease:'power4.out'},DS+k*.12);
          shake('#hk-in',DS+k*.12+.14,5,.12,0);
        });
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,.15) 30%, rgba(255,40,80,.9) 100%)',opacity:0},0);
        tl.to('#lf0,#lf1,#lf3',{y:-14,duration:.06,yoyo:true,repeat:5,ease:'sine.inOut'},DS+.62);
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
