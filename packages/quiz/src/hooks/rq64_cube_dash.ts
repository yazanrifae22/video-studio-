import { defineHook } from './types.ts';

/** rq64_cube_dash: six intact glass ice cubes (2 rows x 3, sharp from frame 0) hop in a staggered wave, then the rows
 *  dash past each other (a quick shuffle) with speed streaks. The cubes are plain: no chipped corner, no tray, no colour
 *  of any round, so nothing is pre-answered. Params: t1, t1_px, beats {go}. Pure SVG. */
export default defineHook({
  name: 'rq64_cube_dash',
  aliases: [],
  about: 'six plain ice cubes hop in a wave from frame 0, then the two rows dash past each other with speed streaks',
  beats: { go: 1.0 },
  tint: 'rgba(29,21,72,.97)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('tick', 0.3, -12), c('tick', 0.6, -12), c('whoosh', B.go, -8)],
  render({ P, B, esc }) {
    const top = `<div class="hk-t hk-o" id="t1" style="top:70px;font-size:${P.t1_px ?? 150}px;color:#fff">${esc(P.t1 ?? 'جاهز؟ ركّز!')}</div>`;
    const cube = (i: number) => {
      const x = 40 + (i % 3) * 290, y = i < 3 ? 130 : 470;
      return `<div class="abs cb" id="d${i}" style="left:${x}px;top:${y}px;width:240px;height:240px"><svg viewBox="-70 -70 140 140" width="240" height="240">
<path d="M-44,-60 H44 Q60,-60 60,-44 V44 Q60,60 44,60 H-44 Q-60,60 -60,44 V-44 Q-60,-60 -44,-60 Z" fill="#D4F1FC" stroke="#4E9BC0" stroke-width="6" stroke-linejoin="round"/>
<rect x="-36" y="-36" width="72" height="72" rx="10" fill="none" stroke="#FFFFFF" stroke-width="4" opacity=".85"/>
<path d="M-48,-48 H-16 L-48,-16 Z" fill="#FFFFFF" opacity=".85"/>
<circle cx="${(i * 7) % 20 - 8}" cy="${(i * 11) % 30 - 6}" r="5" fill="#FFFFFF" stroke="#7FB8D4" stroke-width="1.5" opacity=".9"/></svg></div>`;
    };
    const body = [0, 1, 2, 3, 4, 5].map(cube).join('')
      + [0, 1, 2, 3].map(i => `<div class="abs st" id="s${i}" style="left:${i % 2 ? 540 : 100}px;top:${[250, 330, 590, 670][i]}px;width:260px;height:14px;border-radius:7px;background:#fff;opacity:0"></div>`).join('');
    const js = `
    var BG=${B.go};
    tl.set('.cb',{transformOrigin:'50% 100%'},0);
    // frame 0: cubes already settled and sharp; they keep hopping (staggered wave) the whole scene
    for(var i=0;i<6;i++){ tl.fromTo('#d'+i,{y:0,rotation:0,scale:1},{y:-34,rotation:(i%2?3:-3),scale:1.03,duration:.16,yoyo:true,repeat:5,ease:'sine.inOut'},i*.07); }
    shake('#hk-in',.02,10,.25,1);
    // the rows dash past each other
    tl.to(['#d0','#d1','#d2'],{x:70,duration:.12,ease:'power3.in'},BG);
    tl.to(['#d3','#d4','#d5'],{x:-70,duration:.12,ease:'power3.in'},BG);
    tl.fromTo('.st',{opacity:.9,x:70},{opacity:0,x:-160,duration:.3,ease:'power2.out'},BG+.06);
    tl.to('.cb',{x:0,duration:.22,ease:'power2.out'},BG+.14);
    shake('#hk-in',BG+.12,12,.25,1);
    tl.fromTo('#bgfx',{opacity:0},{opacity:0,duration:.01},0);
    tl.to('.hk-tint',{opacity:.3,duration:.25,ease:'power1.in'},Math.max(0.5,X-.25));`;
    return { top, body, js };
  },
});
