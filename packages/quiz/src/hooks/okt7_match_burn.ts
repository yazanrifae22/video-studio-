import { defineHook } from './types.ts';

/** okt7_match_burn: a big matchstick burns down from the head while a digit counts ٣ → ٢ → ١ beside it; at ١ the flame
 *  snaps out in a puff of smoke and the stick glows red. True for a video whose every round has a 3 s answer countdown. */
export default defineHook({
  name: 'okt7_match_burn',
  aliases: [],
  about: 'a matchstick burns down (flame travels, wood chars) while ٣ ٢ ١ ticks, then the flame snaps out',
  beats: { ticks: [0.3, 0.65, 1.0], out: 1.4, t2: 1.09 },
  tint: 'rgba(29,21,72,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('tick', B.ticks[0], -7), c('tick', B.ticks[1], -7), c('tick_last', B.ticks[2], -5),
    c('hook_blink', B.out, -9),
  ],
  render({ P, B, esc, pal }) {
    const OL = `-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink}`;
    const top = `<div class="hk-t" id="t1" style="top:22px;font-size:106px;color:#fff">${esc(P.t1 ?? '٣ ثواني')}</div>
<div class="hk-t" id="t2" style="top:120px;font-size:96px;color:${pal.gold}">${esc(P.t2 ?? 'قبل ما تنطفي!')}</div>`;
    const dig = (id: string, ch: string, col: string, op: number) =>
      `<div class="abs mb-d" id="${id}" style="opacity:${op};color:${col}">${ch}</div>`;
    const body = `
<div class="abs" id="mb" style="left:0;top:20px;width:900px;height:860px"><svg viewBox="0 0 900 860" width="900" height="860">
<defs><clipPath id="mbc"><rect x="170" y="250" width="64" height="560" rx="18"/></clipPath></defs>
<rect x="170" y="250" width="64" height="560" rx="18" fill="#E8B26A"/>
<rect x="170" y="250" width="22" height="560" fill="#fff" opacity=".18" clip-path="url(#mbc)"/>
<g clip-path="url(#mbc)"><rect id="mbchar" x="160" y="250" width="84" height="40" fill="#2A1F1A"/>
<rect id="mbglow" x="160" y="250" width="84" height="40" fill="${pal.red}" opacity="0"/></g>
<g id="mbflame" transform="translate(202 290)">
<ellipse cx="0" cy="-70" rx="78" ry="110" fill="${pal.orange}" opacity=".28"/>
<path d="M0 -190 C 52 -130 70 -80 40 -30 C 28 -10 -28 -10 -40 -30 C -70 -80 -48 -130 0 -190 Z" fill="${pal.orange}"/>
<path d="M0 -140 C 32 -100 40 -66 22 -32 C 14 -20 -14 -20 -22 -32 C -40 -66 -26 -100 0 -140 Z" fill="${pal.gold}"/>
<ellipse cx="0" cy="-8" rx="46" ry="30" fill="${pal.red}"/></g>
<g id="mbsmoke" opacity="0"><circle cx="202" cy="540" r="40" fill="${pal.lilac}" opacity=".7"/><circle cx="226" cy="470" r="56" fill="${pal.lilac}" opacity=".55"/><circle cx="190" cy="390" r="70" fill="${pal.lilac}" opacity=".4"/></g>
</svg></div>
${dig('mbd3', '٣', '#fff', 1)}${dig('mbd2', '٢', '#fff', 0)}${dig('mbd1', '١', pal.pink, 0)}`;
    const css = `.mb-d{left:330px;width:520px;top:150px;height:560px;line-height:560px;text-align:center;direction:rtl;font-weight:900;font-size:470px;text-shadow:${OL}}`;
    const js = `
        var T=${JSON.stringify(B.ticks)},OUT=${B.out},DG=['#mbd3','#mbd2','#mbd1'];
        // flame + char travel 560px of stick over the 3 ticks (visual, slightly front-loaded)
        tl.set("#mb",{scale:.94,transformOrigin:"50% 860px"},0);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,159,67,0) 40%, rgba(255,120,40,.6) 100%)',opacity:0},0);
        tl.fromTo('#t1',{scale:1.12,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        tl.fromTo('#t2',{scale:1.12,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0.05);
        T.forEach(function(t,i){
          var y=(i+1)*160;
          tl.to('#mbflame',{y:y,duration:.32,ease:'power2.out'},t-.04);
          tl.to('#mbchar',{attr:{height:40+y},duration:.32,ease:'power2.out'},t-.04);
          if(i>0){ tl.set(DG[i-1],{opacity:0},t); tl.set(DG[i],{opacity:1},t); }
          tl.fromTo(DG[i],{scale:1.28},{scale:1,duration:.2,ease:'power3.out',transformOrigin:'50% 50%'},t);
          tl.fromTo('#bgfx',{opacity:.15},{opacity:.5,duration:.1,ease:'power2.out'},t).to('#bgfx',{opacity:.15,duration:.22,ease:'power1.in'},t+.1);
        });
        tl.fromTo('#t2',{scale:1},{scale:1.1,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},${B.t2});
        tl.to('#mbflame',{scale:.1,opacity:0,transformOrigin:'0 0',duration:.12,ease:'power3.in'},OUT);
        tl.to('#mbglow',{opacity:.9,attr:{y:250+380,height:90},duration:.1},OUT);
        tl.to('#mbsmoke',{opacity:1,y:-50,duration:.3,ease:'power1.out'},OUT);
        tl.to('#mbsmoke',{opacity:0,duration:.2},OUT+.3);
        tl.to('#mbd1',{scale:.5,opacity:0,duration:.12,ease:'power3.in'},OUT-.02);
        shake('#hk-in',OUT,12,.35,1.5);
        tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
