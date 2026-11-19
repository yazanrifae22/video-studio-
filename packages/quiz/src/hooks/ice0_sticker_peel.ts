import { defineHook, r2 } from './types.ts';

/** ice0_sticker_peel: a gold «؟» sticker covers the whole blurred card. Its bottom-right corner peels back (a darker flap folds over),
 *  holds half-open as a tease, then rips off to the top-left as the punch «بتلاحظها؟» slams in. Pure SVG, no round art, reveals nothing
 *  (only the blurred neutral teaser shows underneath). Params: t1, t2, beats {peek, rip}. */
export default defineHook({
  name: 'ice0_sticker_peel',
  aliases: [],
  about: 'a gold «؟» sticker peels from its corner, holds half-open, then rips away as the punch slams in',
  beats: { peek: 0.3, rip: 1.1 },
  tint: 'rgba(29,21,72,.55)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -8), c('whoosh', B.peek, -12), c('hook_blink', B.peek + 0.1, -12), c('whoosh', B.rip, -8), c('hook_lock', B.rip + 0.2, -7)],
  render({ P, B, D, esc }) {
    const outline = '-8px 0 0 #1D1548,8px 0 0 #1D1548,0 -8px 0 #1D1548,0 8px 0 #1D1548,-6px -6px 0 #1D1548,6px 6px 0 #1D1548,-6px 6px 0 #1D1548,6px -6px 0 #1D1548,0 14px 26px rgba(0,0,0,.45)';
    const top = `<div class="hk-t" id="t1" style="top:60px;font-size:128px;color:#fff">${esc(P.t1 ?? 'تفصيلة صغيرة')}</div>`;
    const body = `
<div class="abs" id="stk" style="left:0;top:0;width:900px;height:860px"><svg viewBox="0 0 900 860" width="900" height="860">
<defs><clipPath id="pc"><polygon id="pcp" points="0,0 900,0 900,860 0,860"/></clipPath>
<linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F5B800"/><stop offset="1" stop-color="#b87f00"/></linearGradient></defs>
<g clip-path="url(#pc)"><rect width="900" height="860" fill="#FFC83D"/><rect x="34" y="34" width="832" height="792" rx="40" fill="none" stroke="#1D1548" stroke-width="14" stroke-dasharray="46 30"/>
<text x="450" y="600" text-anchor="middle" font-family="Cairo,Tajawal,sans-serif" font-weight="900" font-size="620" fill="#1D1548">؟</text></g>
<polygon id="flp" points="0,0" fill="url(#fg)" stroke="#1D1548" stroke-width="8" stroke-linejoin="round"/></svg></div>
<div class="hk-t hk-o" id="t2" style="left:0;right:0;top:560px;font-size:170px;color:#FFC83D;opacity:0;text-shadow:${outline}">${esc(P.t2 ?? 'بتلاحظها؟')}</div>`;
    const js = `
    var W=900,H=860,pcp=document.getElementById('pcp'),flp=document.getElementById('flp'),o={s:W+H,fx:0,fy:0};
    function clip(poly,s,keepLow){var out=[];for(var i=0;i<poly.length;i++){var a=poly[i],b=poly[(i+1)%poly.length],fa=a[0]+a[1]-s,fb=b[0]+b[1]-s;if(!keepLow){fa=-fa;fb=-fb;}
      if(fa<=0)out.push(a);if((fa<0&&fb>0)||(fa>0&&fb<0)){var t=fa/(fa-fb);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}return out;}
    function str(p){return p.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1);}).join(' ');}
    function draw(){var R=[[0,0],[W,0],[W,H],[0,H]],s=o.s,keep=clip(R,s,true),gone=clip(R,s,false);
      pcp.setAttribute('points',keep.length?str(keep):'0,0');
      var fl=gone.map(function(q){return [s-q[1]+o.fx,s-q[0]+o.fy];});flp.setAttribute('points',fl.length>2?str(fl):'0,0');}
    draw();
    var K=${B.peek},Rp=${B.rip};
    tl.fromTo('#t1',{scale:1.15,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
    tl.to(o,{s:1180,duration:Rp-K-.15,ease:'power2.inOut',onUpdate:draw},K);
    tl.to(o,{s:1130,duration:.15,ease:'sine.inOut',onUpdate:draw,yoyo:true,repeat:1},Rp-.15);
    tl.to(o,{s:-40,fx:-1000,fy:-1000,duration:.42,ease:'power3.in',onUpdate:draw},Rp+.12);
    slam('#t2',Rp+.3,1.5,.22);
    shake('#hk-in',Rp+.3,12,.3,1);
    tl.to('#t2',{scale:1.05,duration:.2,yoyo:true,repeat:3,ease:'sine.inOut'},Rp+.55);
    tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);`;
    return { top, body, js };
  },
});
void r2;
