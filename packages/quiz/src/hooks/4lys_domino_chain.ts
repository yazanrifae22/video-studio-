import { defineHook } from './types.ts';

/** domino_chain: four tall dominoes numbered ١..٤ stand right to left (reading order). They topple in a chain, the fourth hits a checkered finish flag that unfurls, and the punch line slams. Params: t1, t2, beats {fall:[t1..t4], punch}. */
export default defineHook({
  name: '4lys_domino_chain',
  aliases: ['domino_chain'],
  about: 'four numbered dominoes topple in a chain right to left and the last one unfurls a finish flag; reach-the-end framing, no difficulty claim',
  beats: { fall: [0.3, 0.5, 0.7, 0.9], punch: 1.1 },
  tint: 'rgba(255,255,255,.62)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    // clacks only after the spoken «جولات» (ends ~0.8 s); the early dominoes fall silently under the word
    ...B.fall.map((t: number, k: number) => ({ t, k })).filter(({ t }: { t: number; k: number }) => t + 0.2 > 0.95).map(({ t, k }: { t: number; k: number }) => c('pop', t + 0.2, -9 + k)),
    c('hook_slam', B.punch, -6),
  ],
  render({ P, B, esc, onscreen, pal }) {
    const DW = 120, DH = 190, GAP = 175, BASE = 735;
    const X0 = 760; // domino ١ (rightmost) left edge; the others follow to the left
    const t1 = P.t1 ?? '٤ جولات';
    const t2 = P.t2 ?? onscreen;
    const nums = '١٢٣٤';
    const top =
      `<div class="hk-t" id="t1" style="top:56px;font-size:130px;color:#fff;white-space:nowrap">${esc(t1)}</div>` +
      `<div class="hk-t hk-o" id="t2" style="top:70px;font-size:116px;color:${pal.gold};opacity:0;white-space:nowrap">${esc(t2)}</div>`;
    let body = `<div class="abs" style="left:30px;right:30px;top:${BASE}px;height:16px;border-radius:8px;background:#EDEDF1"></div>`;
    // finish flag at the far left: pole + checkered cloth that unfurls from the pole
    const cells: string[] = [];
    for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) cells.push(`<rect x="${q * 30}" y="${r * 30}" width="30" height="30" fill="${(r + q) % 2 ? pal.ink : '#fff'}"/>`);
    body += `<div class="abs" style="left:48px;top:${BASE - 330}px;width:14px;height:340px;background:${pal.ink};border-radius:7px"></div>`;
    body += `<div class="abs" id="flag" style="left:62px;top:${BASE - 330}px;width:120px;height:90px;transform-origin:0 50%;transform:scaleX(0.001)"><svg viewBox="0 0 120 90" width="120" height="90" style="border:5px solid ${pal.ink};box-sizing:content-box;margin:-5px">${cells.join('')}</svg></div>`;
    for (let k = 0; k < 4; k++) {
      const bg = k === 3 ? pal.red : pal.ink;
      const fg = k === 3 ? '#fff' : pal.gold;
      body += `<div class="abs" id="dm${k}" style="left:${X0 - k * GAP}px;top:${BASE - DH}px;width:${DW}px;height:${DH}px;background:${bg};border-radius:18px;transform-origin:0% 100%;box-shadow:inset 0 0 0 6px rgba(255,255,255,.2)">` +
        `<div style="position:absolute;left:0;right:0;top:10px;text-align:center;font-weight:900;font-size:110px;line-height:1.1;color:${fg}">${nums[k]}</div>` +
        `<div style="position:absolute;left:14px;right:14px;top:${DH / 2 + 20}px;height:8px;background:${fg};opacity:.7;border-radius:4px"></div></div>`;
    }
    const js = `
    var FL=${JSON.stringify(B.fall)}, PU=${B.punch};
    tl.fromTo('#t1',{scale:1.12},{scale:1,duration:.25,ease:'power4.out'},0);
    FL.forEach(function(t,k){
      tl.to('#dm'+k,{rotation:-82,duration:.34,ease:'power2.in'},t);
      tl.fromTo('#dm'+k,{y:0},{y:0,duration:.01},t);
    });
    tl.to('#flag',{scaleX:1,duration:.22,ease:'back.out(2)'},FL[3]+.2);
    tl.set('#t1',{opacity:0},PU);
    tl.set('#t2',{opacity:1,transformOrigin:'50% 50%'},PU);
    tl.fromTo('#t2',{scale:1.18},{scale:1,duration:.22,ease:'power4.out'},PU);
    shake('#flag',PU,10,.4,3);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    return { top, body, js };
  },
});
