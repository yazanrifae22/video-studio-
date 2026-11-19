import { defineHook, r2 } from './types.ts';

/** monster_hop: a green monster hops across three stones, each hop faster; two big eyes under the stones follow it, then it dives under the middle stone and a «؟» pops on it. Params: t1 (title, one line), beats {h1,h2,h3,dive}. */
export default defineHook({
  name: 'eove_monster_hop',
  aliases: ['monster_hop'],
  about: 'a green monster hops across three stones faster and faster while two big eyes track it, then it vanishes under the middle stone (true: every round hides a monster under identical stones)',
  beats: { h1: 0.0, h2: 0.4, h3: 0.7, dive: 1.0 },
  tint: 'rgba(255,255,255,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('swap', B.h2 + 0.02, -10), c('swap', B.h3 + 0.02, -9),
    c('hook_lock', B.dive, -6),
  ],
  render({ P, B, D, esc, pal }) {
    const t1 = P.t1 ?? 'عينك بتلحق؟';
    const words = t1.split(' ');
    const head = words.slice(0, -1).join(' ');
    const last = words[words.length - 1];
    const top = `<div class="hk-t hk-o" id="t1" style="top:56px;line-height:1.1;font-size:140px;color:#fff;white-space:nowrap">${head ? esc(head) + ' ' : ''}<span style="color:${pal.gold}">${esc(last)}</span></div>`;
    const stone = (id: string, x: number) =>
      `<div class="abs" id="${id}" style="left:${x - 125}px;top:395px;width:250px;height:190px"><svg viewBox="0 0 250 190" width="250" height="190">` +
      `<ellipse cx="125" cy="104" rx="120" ry="84" fill="#6E7491"/><ellipse cx="125" cy="98" rx="118" ry="82" fill="#9AA0BC"/><ellipse cx="125" cy="92" rx="88" ry="60" fill="#AEB4CE"/>` +
      `<ellipse cx="82" cy="62" rx="26" ry="12" fill="#C9CEE2"/><path d="M140 30 L152 62 L138 90" fill="none" stroke="#767C99" stroke-width="5" stroke-linecap="round"/></svg></div>`;
    const mon =
      `<div class="abs" id="mon" style="left:${150 - 80}px;top:225px;width:160px;height:170px"><svg viewBox="0 0 160 170" width="160" height="170">` +
      `<ellipse cx="50" cy="156" rx="24" ry="12" fill="#2E9C57"/><ellipse cx="110" cy="156" rx="24" ry="12" fill="#2E9C57"/>` +
      `<rect x="20" y="22" width="120" height="134" rx="34" fill="#2E9C57"/><rect x="20" y="16" width="120" height="134" rx="34" fill="#3BC96B"/><rect x="42" y="92" width="76" height="52" rx="22" fill="#A5EDBE"/>` +
      `<ellipse cx="18" cy="42" rx="12" ry="14" fill="#3BC96B"/><ellipse cx="142" cy="42" rx="12" ry="14" fill="#3BC96B"/>` +
      `<ellipse cx="56" cy="62" rx="19" ry="21" fill="#fff" stroke="#2A1F4D" stroke-width="4"/><ellipse cx="104" cy="62" rx="19" ry="21" fill="#fff" stroke="#2A1F4D" stroke-width="4"/>` +
      `<ellipse cx="54" cy="66" rx="9" ry="11" fill="#2A1F4D"/><ellipse cx="106" cy="66" rx="9" ry="11" fill="#2A1F4D"/><circle cx="58" cy="60" r="3.5" fill="#fff"/><circle cx="110" cy="60" r="3.5" fill="#fff"/>` +
      `<path d="M58 100 Q80 114 102 100" fill="none" stroke="#2A1F4D" stroke-width="5" stroke-linecap="round"/></svg></div>`;
    const eye = (id: string, x: number) =>
      `<div class="abs" style="left:${x - 85}px;top:640px;width:170px;height:190px"><svg viewBox="0 0 170 190" width="170" height="190">` +
      `<ellipse cx="85" cy="95" rx="78" ry="86" fill="#fff" stroke="#1D1548" stroke-width="9"/><g id="${id}"><ellipse cx="85" cy="100" rx="38" ry="42" fill="#1D1548"/><circle cx="98" cy="84" r="12" fill="#fff"/></g></svg></div>`;
    const q = `<div class="abs" id="qm" style="z-index:6;left:${450 - 60}px;top:360px;width:120px;height:120px;opacity:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:${pal.gold};color:${pal.ink};font-weight:900;font-size:96px;line-height:1;box-shadow:0 10px 24px rgba(29,21,72,.3)">؟</div>`;
    const body = stone('sA', 150) + stone('sB', 450) + stone('sC', 750) + mon + q + eye('pL', 330) + eye('pR', 570);
    const js = `
    var H1=${B.h1}, H2=${B.h2}, H3=${B.h3}, DV=${B.dive};
    tl.fromTo('#t1',{scale:1.08},{scale:1,duration:.2,ease:'power4.out'},0);
    // pupils follow the monster: left stone -> right stone -> middle stone
    tl.set('#pL,#pR',{x:-26,y:6},0);
    tl.to('#pL,#pR',{x:26,duration:.34,ease:'power2.inOut'},H1+.0).to('#pL,#pR',{x:0,y:-2,duration:.2,ease:'power2.inOut'},H3+.04);
    tl.to('#mon',{left:450-80,duration:.34,ease:'power2.inOut'},H1);
    tl.to('#mon',{y:-120,duration:.17,ease:'sine.out',yoyo:true,repeat:1},H1);
    tl.to('#mon',{left:750-80,duration:.26,ease:'power2.inOut'},H2);
    tl.to('#mon',{y:-110,duration:.13,ease:'sine.out',yoyo:true,repeat:1},H2);
    tl.to('#mon',{left:450-80,duration:.2,ease:'power2.inOut'},H3);
    tl.to('#mon',{y:-100,duration:.1,ease:'sine.out',yoyo:true,repeat:1},H3);
    tl.set('#sB',{transformOrigin:'50% 100%'},0); tl.set('#sB',{zIndex:3},DV);
    tl.to('#mon',{y:60,scaleY:.05,duration:.18,ease:'power3.in',transformOrigin:'50% 100%'},DV);
    tl.to('#sB',{scale:1.08,duration:.12,yoyo:true,repeat:1,ease:'sine.inOut'},DV+.12);
    tl.fromTo('#qm',{scale:0,opacity:0},{scale:1,opacity:1,duration:.25,ease:'back.out(2.4)'},DV+.14);
    tl.to('#qm',{scale:1.12,duration:.22,yoyo:true,repeat:2,ease:'sine.inOut'},DV+.4);
    tl.to('#pL,#pR',{scale:.85,transformOrigin:'85px 100px',duration:.12,ease:'power3.out'},DV+.1);
    shake('#hk-in',DV+.1,10,.3,1);
    tl.to('#t1',{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    void D; void r2;
    return { top, body, js };
  },
});
