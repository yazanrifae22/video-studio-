import { defineHook } from './types.ts';

/** h10t_four_clocks: four round clocks (one per round, tagged ١ ٢ ٣ ٤) sit in a 2x2 grid, each with a full gold "3 seconds" pie.
 *  One after the other the pies drain clockwise in 0.3 s (the digit ٣ stays), each clock snapping and flashing pink as it empties,
 *  then all four pulse together. True for a 4-round video whose every round has a 3 s answer countdown. */
export default defineHook({
  name: 'h10t_four_clocks',
  aliases: [],
  about: 'four numbered 3-second pie clocks drain one after another (one per round), then all four pulse',
  beats: { drains: [0.2, 0.5, 0.8, 1.1], dur: 0.32, end: 1.45 },
  tint: 'rgba(29,21,72,.6)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    ...B.drains.map((t: number, i: number) => c(i === 3 ? 'tick_last' : 'tick', t, -7)),
    c('hook_alarm', B.end, -11),
    c('hook_slam', B.end, -7),
  ],
  render({ P, B, esc, pal }) {
    const AR = ['١', '٢', '٣', '٤'];
    const C = +(2 * Math.PI * 75).toFixed(1);
    const pos = [[460, 40], [40, 40], [460, 470], [40, 470]]; // RTL reading: ١ top-right, ٢ top-left, ٣ bottom-right, ٤ bottom-left
    const OL = `-8px 0 0 ${pal.ink},8px 0 0 ${pal.ink},0 -8px 0 ${pal.ink},0 8px 0 ${pal.ink},-6px -6px 0 ${pal.ink},6px 6px 0 ${pal.ink},-6px 6px 0 ${pal.ink},6px -6px 0 ${pal.ink}`;
    const clock = (i: number) => `<div class="fc" id="fc${i}" style="left:${pos[i][0]}px;top:${pos[i][1]}px">
<svg viewBox="0 0 400 400" width="400" height="400"><circle cx="200" cy="200" r="190" fill="${pal.ink}" stroke="${pal.gold}" stroke-width="14"/>
<circle cx="200" cy="200" r="150" fill="rgba(255,255,255,.14)"/>
<circle id="pie${i}" cx="200" cy="200" r="75" fill="none" stroke="${pal.gold}" stroke-width="150" stroke-dasharray="${C}" stroke-dashoffset="0" transform="rotate(-90 200 200)"/></svg>
<div class="fd" id="fd${i}">٣</div><div class="fn" id="fn${i}">${AR[i]}</div></div>`;
    const top = `<div class="hk-t" id="t1" style="top:56px;font-size:122px;color:#fff">${esc(P.t1 ?? '٣ ثواني بكل جولة')}</div>`;
    const body = [0, 1, 2, 3].map(clock).join('');
    const css = `.fc{position:absolute;width:400px;height:400px}
.fc svg{display:block;position:absolute;left:0;top:0}
.fd{position:absolute;left:0;right:0;top:0;height:400px;line-height:400px;text-align:center;direction:rtl;font-weight:900;font-size:230px;color:#fff;text-shadow:${OL}}
.fn{position:absolute;left:-14px;top:-14px;width:112px;height:112px;border-radius:50%;background:${pal.teal};color:${pal.ink};text-align:center;direction:rtl;font-weight:900;font-size:90px;line-height:112px;box-shadow:0 0 0 8px ${pal.ink}}`;
    const js = `
        var DR=${JSON.stringify(B.drains)},DU=${B.dur},EN=${B.end},C=${C};
        tl.set('.fc',{transformOrigin:'50% 50%'},0);
        tl.set('#bgfx',{backgroundImage:'radial-gradient(ellipse at center, rgba(255,51,85,0) 40%, rgba(255,60,95,.7) 100%)',opacity:0},0);
        tl.fromTo('#t1',{scale:1.14,opacity:1},{scale:1,duration:.3,ease:'power4.out'},0);
        DR.forEach(function(t,i){
          tl.to('#pie'+i,{strokeDashoffset:C,duration:DU,ease:'none'},t);
          tl.fromTo('#fc'+i,{scale:1},{scale:1.1,duration:.1,yoyo:true,repeat:1,ease:'power2.out'},t);
          tl.to('#fd'+i,{color:'${pal.pink}',duration:.05},t+DU);
          tl.fromTo('#fc'+i,{rotation:0},{rotation:i%2?-5:5,duration:.06,yoyo:true,repeat:3,ease:'sine.inOut'},t+DU);
          tl.fromTo('#bgfx',{opacity:.2},{opacity:.55,duration:.08,ease:'power2.out'},t+DU).to('#bgfx',{opacity:0,duration:.2},t+DU+.08);
        });
        tl.fromTo('.fc',{scale:1},{scale:1.08,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},EN);
        tl.to('.fn',{backgroundColor:'${pal.gold}',duration:.05},EN);
        shake('#hk-in',EN,14,.45,2);
        tl.to('#bgfx',{opacity:.7,duration:.12,yoyo:true,repeat:3,ease:'sine.inOut'},EN+.02);
        tl.to('#bgfx',{opacity:0,duration:.25,ease:'power1.in'},X);`;
    return { top, body, css, js };
  },
});
