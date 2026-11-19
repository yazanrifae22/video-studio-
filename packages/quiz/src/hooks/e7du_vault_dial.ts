import { defineHook, r2 } from './types.ts';

/** e7du_vault_dial: a big navy-and-gold safe door fills the card, its combination dial spins fast one way, then back, and clicks shut
 *  on three gold bolts that slam out of the door; «أثبتها!» stamps across it. Line: «ذاكرتك حديد؟ أثبتها!» (a 3-round memory video).
 *  Params: t1 (top line), t2 (punch), beats. Reveals nothing. */
export default defineHook({
  name: 'e7du_vault_dial',
  aliases: [],
  about: 'a safe-door dial spins hard, reverses, clicks shut with gold bolts slamming out, then a gold «أثبتها!» stamps on the door',
  beats: { spin: 0.1, back: 0.6, lock: 1.15, stamp: 1.3 },
  tint: 'rgba(29,21,72,.8)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -9),
    c('hook_roll', B.spin, -9),
    c('tick_last', B.back, -9),
    c('hook_lock', B.lock, -5),
    c('hook_slam', B.stamp, -5),
  ],
  render({ P, B, D, esc, pal }) {
    const OL = `-10px 0 0 ${pal.ink},10px 0 0 ${pal.ink},0 -10px 0 ${pal.ink},0 10px 0 ${pal.ink},-8px -8px 0 ${pal.ink},8px 8px 0 ${pal.ink},-8px 8px 0 ${pal.ink},8px -8px 0 ${pal.ink},0 22px 40px rgba(0,0,0,.5)`;
    const ticks = Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2, big = i % 6 === 0, r1 = big ? 196 : 212, r2_ = 232;
      return `<line x1="${(300 + Math.cos(a) * r1).toFixed(1)}" y1="${(300 + Math.sin(a) * r1).toFixed(1)}" x2="${(300 + Math.cos(a) * r2_).toFixed(1)}" y2="${(300 + Math.sin(a) * r2_).toFixed(1)}" stroke="${big ? pal.gold : '#fff'}" stroke-width="${big ? 14 : 8}" stroke-linecap="round"/>`;
    }).join('');
    const top = `<div class="hk-t" id="t1" style="top:52px;font-size:141px;color:#fff">${esc(P.t1 ?? 'ذاكرتك حديد؟')}</div>`;
    const bolt = (id: string, y: number) => `<div class="abs vd-bolt" id="${id}" style="top:${y}px"></div>`;
    const body = `
<div class="abs" id="door" style="left:50px;top:60px;width:800px;height:800px;border-radius:120px;background:linear-gradient(145deg,#3a2f8f,${pal.ink} 70%);box-shadow:0 0 0 18px ${pal.gold},0 30px 60px rgba(0,0,0,.5)"></div>
${bolt('b1', 150)}${bolt('b2', 380)}${bolt('b3', 610)}
<div class="abs" id="dial" style="left:150px;top:160px;width:600px;height:600px"><svg viewBox="0 0 600 600" width="600" height="600">
<circle cx="300" cy="300" r="270" fill="#2a2178" stroke="${pal.gold}" stroke-width="18"/>
${ticks}
<circle cx="300" cy="300" r="150" fill="${pal.ink}" stroke="${pal.lilac}" stroke-width="10"/>
<polygon points="300,170 330,300 270,300" fill="${pal.gold}"/><circle cx="300" cy="300" r="34" fill="${pal.gold}"/></svg></div>
<div class="abs" id="pt" style="left:420px;top:100px;width:60px;height:70px"><svg viewBox="0 0 60 70" width="60" height="70"><polygon points="4,4 56,4 30,66" fill="${pal.red}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></svg></div>
<div class="abs" id="ring" style="left:150px;top:160px;width:600px;height:600px;border-radius:50%;border:24px solid ${pal.gold};opacity:0"></div>
<div class="abs" id="t2" style="left:-40px;right:-40px;top:350px;text-align:center;direction:rtl;font-weight:900;font-size:220px;line-height:1.1;color:${pal.gold};opacity:0;text-shadow:${OL}">${esc(P.t2 ?? 'أثبتها!')}</div>`;
    const css = `.vd-bolt{width:70px;height:110px;border-radius:24px;background:linear-gradient(90deg,${pal.lilac},#9a8fd6);box-shadow:0 8px 18px rgba(0,0,0,.45),0 0 0 8px ${pal.ink};left:770px;}`;
    const js = `
        var SP=${B.spin},BK=${B.back},LK=${B.lock},ST=${B.stamp};
        tl.set(['#dial','#door','#ring','#pt'],{transformOrigin:'50% 50%'},0);
        tl.fromTo('#t1',{scale:1.16,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        // door and dial are already settled at frame 0 and keep moving from there
        tl.fromTo('#door',{scale:1},{scale:1.04,duration:.12,yoyo:true,repeat:1,ease:'power2.out'},0.02);
        tl.fromTo('#dial',{rotation:0},{rotation:-560,duration:BK-SP,ease:'power2.in'},SP);
        tl.to('#dial',{rotation:200,duration:LK-BK,ease:'power3.inOut'},BK);
        tl.to('#dial',{rotation:200,duration:.01},LK);
        // red pointer ticks as the dial hunts
        tl.to('#pt',{y:-14,duration:.05,yoyo:true,repeat:7,ease:'sine.inOut'},SP+.1);
        // the bolts: three gold-lilac bolts slam out of the right edge of the door on the lock beat, left-to-right travel
        ['#b1','#b2','#b3'].forEach(function(s,i){
          tl.fromTo(s,{x:90,opacity:0},{x:0,opacity:1,duration:.12,ease:'power4.out'},LK+i*.07);
        });
        tl.set(['#b1','#b2','#b3'],{opacity:0},0);
        shake('#hk-in',LK,16,.3,1.5);
        tl.fromTo('#dial',{scale:1},{scale:.9,duration:.1,yoyo:true,repeat:1,ease:'power3.out'},LK);
        tl.fromTo('#ring',{scale:.5,opacity:.95},{scale:1.5,opacity:0,duration:.5,ease:'power2.out',immediateRender:false},LK);
        tl.set('#ring',{opacity:0},0);
        tl.fromTo('#t2',{scale:2.6,opacity:0,rotation:-16},{scale:1,opacity:1,rotation:-5,duration:.24,ease:'power4.out'},ST);
        shake('#hk-in',ST,22,.5,2.2);
        tl.to('#dial',{opacity:.45,duration:.2},ST);
        tl.to('#t2',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},ST+.3);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,200,61,0) 40%, rgba(255,200,61,.6) 100%)',opacity:0},0);
        tl.fromTo('#bgfx',{opacity:.9},{opacity:.3,duration:.2,yoyo:true,repeat:2},ST);
        tl.to('#bgfx',{opacity:0,duration:.28,ease:'power1.in'},X);
        tl.to('.hk-tint',{opacity:0,duration:.22,ease:'power1.in'},X-.06);
        // the card must leave light (round-change check): dark door, dial and bolts melt away before the slide-out
        tl.to(['#door','#dial','#b1','#b2','#b3','#pt'],{opacity:0,duration:.2,ease:'power1.in'},X-.3);
        tl.to('#t2',{opacity:0,duration:.1,ease:'power1.in'},X-.08);
        void ${r2(D)};`;
    return { top, body, css, js };
  },
});
