import { defineHook } from './types.ts';

/** cup_speedup: three purple cups swap places three times, each swap faster than the last (0.42 s, 0.28 s, 0.18 s), with chevron speed marks piling up; punch line slams after the swaps. Params: t1, t2, beats {s1,s2,s3,punch}. */
export default defineHook({
  name: 'onwb_cup_speedup',
  aliases: ['cup_speedup'],
  about: 'three cups swap faster and faster with chevron speed marks; the line promises each round is faster (true: swaps 0.45/0.4/0.35 s and more cups)',
  beats: { s1: 0.0, s2: 0.45, s3: 0.8, punch: 1.05 },
  tint: 'rgba(255,255,255,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('swap', B.s2 + 0.02, -10), c('swap', B.s3 + 0.02, -9),
    c('hook_slam', B.punch, -6),
  ],
  render({ P, B, esc, onscreen, pal }) {
    const t1 = P.t1 ?? '٣ جولات..';
    const t2 = P.t2 ?? 'أسرع!';
    // both halves of the title are on screen from frame 0 (t2 pops again on the spoken word)
    const top =
      `<div class="hk-t" id="t1" style="top:18px;line-height:1;font-size:104px;color:#fff;white-space:nowrap">${esc(t1)}</div>` +
      `<div class="hk-t hk-o" id="t2" style="top:132px;line-height:1;font-size:104px;color:${pal.gold};white-space:nowrap">${esc(t2)}</div>`;
    const cup = (id: string, x: number) =>
      `<div class="abs" id="${id}" style="left:${x}px;top:270px;width:240px;height:278px"><svg viewBox="0 0 250 290" width="240" height="278">` +
      `<defs><linearGradient id="g${id}" x1="0" x2="1"><stop offset="0" stop-color="#5A2EE8"/><stop offset=".45" stop-color="#8B66FF"/><stop offset="1" stop-color="#4B22CF"/></linearGradient></defs>` +
      `<path d="M45 18 Q125 2 205 18 L238 262 Q125 292 12 262 Z" fill="url(#g${id})"/><path d="M12 262 Q125 292 238 262 L236 248 Q125 276 14 248 Z" fill="#3A17B0"/></svg></div>`;
    let body = `<div class="abs" style="left:40px;right:40px;top:560px;height:16px;border-radius:8px;background:#EDEDF1"></div>`;
    body += cup('cA', 50) + cup('cB', 330) + cup('cC', 610);
    const chev = (n: number, x: number) =>
      `<div class="abs" id="ch${n}" style="left:${x}px;top:630px;width:240px;height:130px;opacity:0;display:flex;direction:ltr;justify-content:center;gap:6px">` +
      Array.from({ length: n }, () => `<svg viewBox="0 0 60 90" width="70" height="105"><path d="M10 10 L50 45 L10 80" fill="none" stroke="${pal.red}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/></svg>`).join('') +
      `</div>`;
    body += chev(1, 50) + chev(2, 330) + chev(3, 610);
    const js = `
    var S1=${B.s1}, S2=${B.s2}, S3=${B.s3}, PU=${B.punch};
    tl.fromTo('#t1',{scale:1.1},{scale:1,duration:.2,ease:'power4.out'},0);
    // positions: A=50 B=330 C=610. swap 1 A<->B (0.40 s), swap 2 A(330)<->C (0.28 s), swap 3 B(50)<->C(330) (0.18 s)
    tl.to('#cA',{left:330,duration:.40,ease:'power2.inOut'},S1); tl.to('#cA',{y:-80,duration:.2,ease:'sine.out',yoyo:true,repeat:1},S1);
    tl.to('#cB',{left:50,duration:.40,ease:'power2.inOut'},S1); tl.to('#cB',{y:45,duration:.2,ease:'sine.out',yoyo:true,repeat:1},S1);
    tl.to('#ch1',{opacity:1,duration:.1},0.05);
    tl.to('#cA',{left:610,duration:.28,ease:'power2.inOut'},S2); tl.to('#cA',{y:-80,duration:.14,ease:'sine.out',yoyo:true,repeat:1},S2);
    tl.to('#cC',{left:330,duration:.28,ease:'power2.inOut'},S2); tl.to('#cC',{y:45,duration:.14,ease:'sine.out',yoyo:true,repeat:1},S2);
    tl.to('#ch2',{opacity:1,duration:.1},0.15);
    tl.to('#cB',{left:330,duration:.18,ease:'power2.inOut'},S3); tl.to('#cB',{y:-80,duration:.09,ease:'sine.out',yoyo:true,repeat:1},S3);
    tl.to('#cC',{left:50,duration:.18,ease:'power2.inOut'},S3); tl.to('#cC',{y:45,duration:.09,ease:'sine.out',yoyo:true,repeat:1},S3);
    tl.to('#ch3',{opacity:1,duration:.1},0.25);
    tl.fromTo('#t2',{scale:1.18},{scale:1,duration:.22,ease:'power4.out'},PU);
    shake('#ch3',PU,8,.35,2);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    return { top, body, js };
  },
});
