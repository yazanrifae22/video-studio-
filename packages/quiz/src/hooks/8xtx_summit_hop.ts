import { defineHook, r2 } from './types.ts';

/** 8xtx_summit_hop: four chunky gold-and-violet steps rise across the card; a red ball hops up them one step per beat (a tick each),
 *  then a gold flag is planted on the top step and «جرّبها!» stamps over the stairs. Line: «بتوصل للقمة؟ جرّبها!» (a 4-round ramp video,
 *  round 4 is the last and hardest). Params: t1 (top line), t2 (punch), beats. Shows nothing of the puzzles. */
export default defineHook({
  name: '8xtx_summit_hop',
  aliases: [],
  about: 'a red ball hops up four steps (one per beat), plants a gold flag on the summit, then «جرّبها!» stamps over the stairs',
  beats: { h1: 0.18, h2: 0.46, h3: 0.74, flag: 1.0, stamp: 1.15 },
  tint: 'rgba(29,21,72,.9)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -9),
    c('tick', B.h1, -10),
    c('tick', B.h2, -10),
    c('tick_last', B.h3, -9),
    c('hook_lock', B.flag, -6),
    c('hook_slam', B.stamp, -6),
  ],
  render({ P, B, D, esc, pal }) {
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.5)`;
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:136px;color:#fff">${esc(P.t1 ?? 'بتوصل للقمة؟')}</div>`;
    // steps: viewer's left to right, rising; ball sits on each top
    const X0 = 70, W = 190, BASE = 800, H = [110, 230, 350, 470];
    const cols = [pal.teal, pal.blue, pal.violet, pal.gold];
    const steps = H.map((h, i) => `<div class="abs sh-step" id="s${i + 1}" style="left:${X0 + i * W}px;top:${BASE - h}px;width:${W}px;height:${h}px;background:linear-gradient(180deg,${cols[i]},${pal.ink} 190%);border-top:14px solid #fff;border-radius:18px 18px 0 0;box-shadow:0 0 0 8px ${pal.ink}"></div>`).join('');
    const bx = (i: number) => X0 + i * W + W / 2 - 50;       // ball left
    const by = (i: number) => BASE - H[i] - 14 - 100 - 6;     // ball top (100 px ball sits on the white lip)
    const body = `
<div class="abs" id="panel" style="left:0;top:0;width:900px;height:860px;border-radius:40px;background:linear-gradient(160deg,#3a2f8f,${pal.ink} 75%)"></div>
${steps}
<div class="abs" id="flag" style="left:${X0 + 3 * W + W / 2 - 8}px;top:${BASE - H[3] - 14 - 190}px;width:150px;height:190px;opacity:0"><svg viewBox="0 0 150 190" width="150" height="190"><rect x="0" y="0" width="16" height="190" rx="8" fill="#fff"/><polygon points="16,6 146,46 16,92" fill="${pal.red}" stroke="#fff" stroke-width="8" stroke-linejoin="round"/></svg></div>
<div class="abs" id="ball" style="left:${bx(0)}px;top:${by(0)}px;width:100px;height:100px"><svg viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="46" fill="${pal.red}" stroke="#fff" stroke-width="8"/><circle cx="34" cy="32" r="12" fill="#fff" fill-opacity=".8"/></svg></div>
<div class="abs" id="ring" style="left:${X0 + 3 * W - 60}px;top:${BASE - H[3] - 230}px;width:300px;height:300px;border-radius:50%;border:20px solid ${pal.gold};opacity:0"></div>
<div class="hk-t hk-o" id="t2" style="left:-120px;right:120px;top:40px;font-size:210px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t2 ?? 'جرّبها!')}</div>`;
    const css = `.sh-step{transform-origin:50% 100%}`;
    const hop = (i: number, at: string) =>
      `tl.to('#ball',{x:${bx(i) - bx(0)},duration:.28,ease:'none'},${at});
        tl.to('#ball',{y:${by(i) - by(0) - 130},duration:.14,ease:'power2.out'},${at}).to('#ball',{y:${by(i) - by(0)},duration:.14,ease:'power2.in'},${at}+.14);
        tl.fromTo('#s${i + 1}',{scaleY:1},{scaleY:.94,duration:.07,yoyo:true,repeat:1,ease:'power2.out'},${at}+.28);`;
    const js = `
        tl.set('#ball',{transformOrigin:'50% 100%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.fromTo('#s1',{scaleY:1},{scaleY:1.06,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},0.02);
        ${hop(1, String(B.h1 - 0.14))}
        ${hop(2, String(B.h2 - 0.14))}
        ${hop(3, String(B.h3 - 0.14))}
        tl.fromTo('#flag',{scale:.2,opacity:0,rotation:-25,transformOrigin:'0% 100%'},{scale:1,opacity:1,rotation:0,duration:.22,ease:'back.out(2.4)'},${B.flag});
        tl.fromTo('#ring',{scale:.4,opacity:.95},{scale:1.4,opacity:0,duration:.5,ease:'power2.out',immediateRender:false},${B.flag});
        tl.set('#ring',{opacity:0},0);
        tl.to('#ball',{rotation:360,duration:.4,ease:'power2.out'},${B.flag});
        shake('#hk-in',${B.flag},12,.3,1);
        tl.fromTo('#t2',{scale:2.4,opacity:0,rotation:-14},{scale:1,opacity:1,rotation:-4,duration:.24,ease:'power4.out'},${B.stamp});
        shake('#hk-in',${B.stamp},20,.45,2);
        tl.to('#t2',{scale:1.05,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},${B.stamp}+.3);
        tl.to('#bgfx',{opacity:0,duration:.2},X);
        tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);
        // the card leaves light: panel, steps and ball melt before the slide-out
        tl.to(['#panel','#s1','#s2','#s3','#s4','#ball','#flag'],{opacity:0,duration:.2,ease:'power1.in'},X-.3);
        tl.to('#t2',{opacity:0,duration:.1,ease:'power1.in'},X-.08);
        void ${r2(D)};`;
    return { top, body, css, js };
  },
});
