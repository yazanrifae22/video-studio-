import { defineHook } from './types.ts';

/** rq64_marble_mixup: a row of five ice cubes with two blue marbles hiding among them (the real decoys of the ice-cube
 *  counting round). The marbles hop along the row, red alarm rings lock onto them, then «كرات» and «بين المكعبات!» slam
 *  under the row. Params: t1, t2, t3, beats. Reveals no count and no answer. Pure SVG. */
export default defineHook({
  name: 'rq64_marble_mixup',
  aliases: [],
  about: 'five ice cubes with two blue marbles hiding in the row; the marbles hop, red rings lock on, «كرات / بين المكعبات!» slam',
  beats: { hop1: 0.2, hop2: 0.45, ring: 0.55, a: 0.83, b: 1.24 },
  tint: 'rgba(29,21,72,.78)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('swap', B.hop1, -12), c('swap', B.hop2, -12), c('hook_alarm', B.ring, -13), c('hook_slam', B.a, -8), c('hook_slam', B.b, -5)],
  render({ P, B, D, esc, pal }) {
    const outline = `-7px 0 0 ${pal.ink},7px 0 0 ${pal.ink},0 -7px 0 ${pal.ink},0 7px 0 ${pal.ink},-5px -5px 0 ${pal.ink},5px 5px 0 ${pal.ink},-5px 5px 0 ${pal.ink},5px -5px 0 ${pal.ink},0 16px 28px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:44px;font-size:170px;color:${pal.gold};text-shadow:${outline}">${esc(P.t1 ?? 'انتبه!')}</div>`;
    const W = 150, GAP = 22, X0 = (900 - (5 * W + 4 * GAP)) / 2; // 5 slots
    const sx = (i: number) => Math.round(X0 + i * (W + GAP));
    const cube = (id: string, i: number, rot: number) => `<div class="abs" id="${id}" style="left:${sx(i)}px;top:120px;width:${W}px;height:${W}px;transform:rotate(${rot}deg)"><svg viewBox="0 0 150 150" width="150" height="150">
<rect x="8" y="8" width="134" height="134" rx="22" fill="#D6F1FC" stroke="#4A9DBF" stroke-width="9"/>
<rect x="36" y="36" width="78" height="78" rx="12" fill="#EAF9FF" stroke="#fff" stroke-width="7"/>
<polygon points="20,20 60,20 20,60" fill="#fff" fill-opacity=".8"/><circle cx="100" cy="98" r="7" fill="#fff" stroke="#8CC3DA" stroke-width="2"/></svg></div>`;
    const ball = (id: string, i: number) => `<div class="abs" id="${id}" style="left:${sx(i)}px;top:120px;width:${W}px;height:${W}px"><svg viewBox="0 0 150 150" width="150" height="150">
<circle cx="75" cy="75" r="62" fill="#ACD1F7" stroke="#2D69B3" stroke-width="10"/>
<circle cx="75" cy="75" r="40" fill="none" stroke="#E4F1FF" stroke-width="7"/>
<ellipse cx="50" cy="48" rx="14" ry="9" fill="#fff" transform="rotate(-35 50 48)"/></svg></div>`;
    const ring = (id: string, i: number) => `<div class="abs" id="${id}" style="left:${sx(i) - 14}px;top:106px;width:${W + 28}px;height:${W + 28}px;border-radius:50%;border:14px solid ${pal.red};box-shadow:0 0 0 6px ${pal.ink},inset 0 0 0 6px ${pal.ink};opacity:0"></div>`;
    const big = (id: string, y: number, size: number, col: string, txt: string) => `<div class="abs" id="${id}" style="left:-40px;right:-40px;top:${y}px;text-align:center;direction:rtl;font-weight:900;font-size:${size}px;line-height:${size + 10}px;color:${col};opacity:0;text-shadow:${outline}">${esc(txt)}</div>`;
    // slots 0..4: cube, ball, cube, ball, cube at t=0. Marbles hop one slot at a time (swapping with a neighbouring cube).
    const body = `
${cube('c0', 0, -3)}${cube('c1', 2, 4)}${cube('c2', 4, -2)}${ball('m1', 1)}${ball('m2', 3)}
${ring('r1', 1)}${ring('r2', 3)}
${big('ta', 360, 160, '#fff', P.t2 ?? 'كرات')}
${big('tb', 560, 118, pal.gold, P.t3 ?? 'بين المكعبات!')}`;
    const js = `
    var H1=${B.hop1},H2=${B.hop2},BR=${B.ring},BA=${B.a},BB=${B.b},STEP=${W + GAP};
    tl.set(['#c0','#c1','#c2','#m1','#m2','#ta','#tb','#r1','#r2'],{transformOrigin:'50% 50%'},0);
    tl.fromTo('#t1',{scale:2.2,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.22,ease:'power4.out'},0);
    // hop 1: m1 <-> c0 (m1 goes left, c0 right), m2 <-> c2 (m2 goes right, c2 left). Marbles roll as they move.
    tl.to('#m1',{x:-STEP,rotation:-360,duration:.22,ease:'power2.inOut'},H1);
    tl.to('#c0',{x:STEP,duration:.22,ease:'power2.inOut'},H1);
    tl.to('#m2',{x:STEP,rotation:360,duration:.22,ease:'power2.inOut'},H1);
    tl.to('#c2',{x:-STEP,duration:.22,ease:'power2.inOut'},H1);
    tl.to(['#m1','#m2'],{y:-60,duration:.11,yoyo:true,repeat:1,ease:'power2.out'},H1);
    // hop 2: m1 (slot 0) <-> c0 (slot 1) back one step, m2 (slot 4) <-> c2 (slot 3) back one step: marbles end in the middle of the cubes again
    tl.to('#m1',{x:0,rotation:-720,duration:.22,ease:'power2.inOut'},H2);
    tl.to('#c0',{x:0,duration:.22,ease:'power2.inOut'},H2);
    tl.to('#m2',{x:0,rotation:720,duration:.22,ease:'power2.inOut'},H2);
    tl.to('#c2',{x:0,duration:.22,ease:'power2.inOut'},H2);
    tl.to(['#m1','#m2'],{y:-60,duration:.11,yoyo:true,repeat:1,ease:'power2.out'},H2);
    shake('#hk-in',H1+.15,6,.15,.5); shake('#hk-in',H2+.15,6,.15,.5);
    // red rings lock onto the marbles
    tl.fromTo(['#r1','#r2'],{scale:1.7,opacity:0},{scale:1,opacity:1,duration:.18,ease:'back.out(2)',stagger:.08},BR);
    tl.to(['#r1','#r2'],{scale:1.1,duration:.12,yoyo:true,repeat:5,ease:'sine.inOut'},BR+.3);
    tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,0) 35%, rgba(255,40,80,.8) 100%)',opacity:0},0);
    tl.fromTo('#bgfx',{opacity:.2},{opacity:.7,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},BR);
    tl.fromTo('#ta',{scale:2.4,opacity:0,x:260},{scale:1,opacity:1,x:0,duration:.2,ease:'power4.out'},BA);
    shake('#hk-in',BA,10,.25,1);
    tl.fromTo('#tb',{scale:1.12,opacity:0,rotation:-6},{scale:1,opacity:1,rotation:-3,duration:.22,ease:'power2.out'},BB);
    shake('#hk-in',BB,18,.45,2.2);
    tl.to('#tb',{scale:1.04,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BB+.3);
    // lines fade out inside the card before the slide-out, so no text rides the card over the screen edge / badge
    tl.to(['#t1','#ta','#tb'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);
    tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, js };
  },
});
