import fs from 'node:fs';
import path from 'node:path';
import { defineHook, r2 } from './types.ts';

/** flamingo_sway: three GREY flamingos (the round-1 art, no colour, nothing revealed) sit sharp on the card from frame 0 and hop in a wave, each hop quicker; a «؟» pops on the card at the last beat.
 *  Params: t1 (title, one line), items[] (3 production-relative grey png paths, viewer-left first), beats {h1,h2,h3,q}. */
export default defineHook({
  name: '3f7v_flamingo_sway',
  aliases: ['flamingo_sway'],
  about: 'three grey flamingos sway in a wave, each hop faster, then a gold «؟» pops (true: round 1 asks which grey flamingo is the pink one)',
  beats: { h1: 0.0, h2: 0.3, h3: 0.6, q: 1.1 },
  tint: 'rgba(255,255,255,.93)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -10), c('swap', B.h2 + 0.02, -11), c('swap', B.h3 + 0.02, -10), c('hook_lock', B.q, -7)],
  render({ P, B, D, esc, pal }) {
    const items: string[] = (P.items ?? []).map((f: string) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(process.cwd(), f)).toString('base64'));
    const t1 = P.t1 ?? 'وين الأخضر؟';
    const words = t1.split(' ');
    const head = words.slice(0, -1).join(' ');
    const last = words[words.length - 1];
    const top = `<div class="hk-t hk-o" id="t1" style="top:56px;line-height:1.1;font-size:96px;color:#fff;white-space:nowrap">${head ? esc(head) + ' ' : ''}<span style="color:${pal.gold}">${esc(last)}</span></div>`;
    const ih = Number(P.item_h ?? 250), bw = Math.round(ih * 1.08);
    const xs = [150, 450, 750];
    const body = items.map((src, i) => `<div class="abs" id="m${i}" style="left:${xs[i] - Math.round(bw / 2)}px;top:${Math.max(250, 590 - ih - 10)}px;width:${bw}px;height:${ih + 10}px;display:flex;align-items:flex-end;justify-content:center"><img src="${src}" style="height:${ih}px;width:auto;display:block"/></div>`).join('') +
      `<div class="abs" id="qm" style="z-index:6;left:${450 - 60}px;top:150px;width:120px;height:120px;opacity:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${pal.gold};color:${pal.ink};font-weight:900;font-size:96px;line-height:1;box-shadow:0 10px 24px rgba(29,21,72,.3)">؟</div>`;
    const js = `
    var H=[${B.h1},${B.h2},${B.h3}], QB=${B.q};
    tl.fromTo('#t1',{scale:1.08},{scale:1,duration:.2,ease:'power4.out'},0);
    [0,1,2].forEach(function(i){
      tl.to('#m'+i,{y:-(150-i*20),duration:.18-i*.02,ease:'sine.out',yoyo:true,repeat:1},H[i]);
      tl.to('#m'+i,{y:-40,duration:.14,ease:'sine.out',yoyo:true,repeat:1},QB-.15+i*.1);
    });
    tl.fromTo('#qm',{scale:0,opacity:0},{scale:1,opacity:1,duration:.25,ease:'back.out(2.4)'},QB);
    tl.to('#qm',{scale:1.12,duration:.22,yoyo:true,repeat:2,ease:'sine.inOut'},QB+.3);
    shake('#hk-in',QB,8,.25,1);
    tl.to('#t1',{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    void D; void r2;
    return { top, body, js };
  },
});
