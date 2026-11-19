import { defineHook } from './types.ts';

/** 5g91_sneaky_tomato: four strawberries stand in a row with a tomato in a fake-glasses-and-nose disguise in the middle;
 *  the tomato hops, seed stickers pop onto it, the strawberries lean away, then a gold ring locks on and «بندورة / دخيلة!» slam.
 *  True for this video: round 2 hides 4 tomato decoys among the strawberries. Reveals no count and no answer. Pure SVG.
 *  Params: t1, t2, t3, beats. */
export default defineHook({
  name: '5g91_sneaky_tomato',
  aliases: [],
  about: 'a disguised tomato (glasses, nose, seed stickers) hops in a row of strawberries; the berries lean away; «بندورة / دخيلة!»',
  beats: { drop: 0.15, stick: 0.5, a: 0.68, b: 1.1 },
  tint: 'rgba(29,21,72,.78)',
  sfx: ({ B, cue: c }) => [c('hook_slam', 0, -9), c('pop', B.drop + 0.12, -12), c('pop', B.stick, -14), c('hook_slam', B.a, -8), c('hook_slam', B.b, -5)],
  render({ P, B, esc, pal }) {
    const ol = `-7px 0 0 ${pal.ink},7px 0 0 ${pal.ink},0 -7px 0 ${pal.ink},0 7px 0 ${pal.ink},-5px -5px 0 ${pal.ink},5px 5px 0 ${pal.ink},-5px 5px 0 ${pal.ink},5px -5px 0 ${pal.ink},0 16px 28px rgba(0,0,0,.45)`;
    const top = `<div class="hk-t" id="t1" style="top:44px;font-size:170px;color:${pal.gold};text-shadow:${ol}">${esc(P.t1 ?? 'انتبه!')}</div>`;
    const W = 150, GAP = 22, X0 = (900 - (5 * W + 4 * GAP)) / 2, Y = 90;
    const sx = (i: number) => Math.round(X0 + i * (W + GAP));
    const pts = [[-14, -30], [14, -30], [-30, -14], [0, -14], [30, -14], [-40, 4], [-14, 4], [14, 4], [40, 4], [-30, 22], [0, 22], [30, 22], [-14, 40], [14, 40]];
    const seeds = (rx: number, ry: number) => pts.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#FFE08A" stroke="#C8962A" stroke-width="1.5"/>`).join('');
    const berry = (id: string, i: number, rot: number) => `<div class="abs" id="${id}" style="left:${sx(i)}px;top:${Y}px;width:${W}px;height:${W + 30}px;transform:rotate(${rot}deg)"><svg viewBox="-75 -75 150 150" width="150" height="150" style="margin-top:20px">
<path d="M0,70 C-60,30 -64,-30 -32,-50 C-10,-60 10,-60 32,-50 C64,-30 60,30 0,70 Z" fill="#D8283C" stroke="#8A1224" stroke-width="5" stroke-linejoin="round"/>${seeds(4.8, 7)}
<path d="M0,-50 L-34,-62 L-14,-48 L-28,-34 L-4,-44 L0,-24 L6,-44 L30,-34 L16,-48 L36,-62 Z" fill="#3E9B4F" stroke="#1F6A30" stroke-width="4" stroke-linejoin="round"/></svg></div>`;
    const tomato = `<div class="abs" id="tm" style="left:${sx(2)}px;top:${Y}px;width:${W}px;height:${W + 30}px"><svg viewBox="-75 -75 150 150" width="150" height="150" style="margin-top:20px;overflow:visible">
<circle r="58" fill="#E5412E" stroke="#9C1F12" stroke-width="6"/><ellipse cx="-22" cy="-26" rx="15" ry="9" fill="#fff" opacity=".55" transform="rotate(-35 -22 -26)"/>
<path d="M0,-58 L-16,-44 L-36,-50 L-24,-35 L-38,-22 L-14,-27 L0,-12 L14,-27 L38,-22 L24,-35 L36,-50 L16,-44 Z" fill="#3E9B4F" stroke="#1F6A30" stroke-width="3" stroke-linejoin="round" transform="translate(0,2) scale(.8)"/>
<g id="stk" opacity="0"><g transform="translate(0,8) scale(.9)">${seeds(5.5, 8)}</g></g>
<g id="dis"><rect x="-44" y="-12" width="88" height="26" rx="8" fill="#1D1548" stroke="#000" stroke-width="3"/><rect x="-38" y="-7" width="32" height="16" rx="5" fill="#2F8CFF" opacity=".55"/><rect x="6" y="-7" width="32" height="16" rx="5" fill="#2F8CFF" opacity=".55"/>
<path d="M-4,18 L0,34 L8,30 Z" fill="#F4B58A" stroke="#B87A52" stroke-width="3" stroke-linejoin="round"/></g></svg></div>`;
    const ring = `<div class="abs" id="rg" style="left:${sx(2) - 20}px;top:${Y - 4}px;width:${W + 40}px;height:${W + 40}px;border-radius:50%;border:14px solid ${pal.gold};box-shadow:0 0 0 6px ${pal.ink},inset 0 0 0 6px ${pal.ink};opacity:0"></div>`;
    const big = (id: string, y: number, size: number, col: string, txt: string) => `<div class="abs" id="${id}" style="left:-40px;right:-40px;top:${y}px;text-align:center;direction:rtl;font-weight:900;font-size:${size}px;line-height:${size + 10}px;color:${col};opacity:0;text-shadow:${ol}">${esc(txt)}</div>`;
    const body = `
${berry('b0', 0, -3)}${berry('b1', 1, 4)}${berry('b3', 3, -4)}${berry('b4', 4, 3)}
${tomato}${ring}
${big('ta', 360, 170, '#fff', P.t2 ?? 'بندورة')}
${big('tb', 560, 150, pal.gold, P.t3 ?? 'دخيلة!')}`;
    const js = `
    var DR=${B.drop},ST=${B.stick},BA=${B.a},BB=${B.b},LEAN=${Math.round(W * 0.28)};
    tl.set(['#b0','#b1','#b3','#b4','#tm','#ta','#tb','#rg'],{transformOrigin:'50% 60%'},0);
    tl.fromTo('#t1',{scale:2.2,opacity:0,rotation:-8},{scale:1,opacity:1,rotation:0,duration:.22,ease:'power4.out'},0);
    tl.to('#tm',{y:-70,duration:.14,yoyo:true,repeat:1,ease:'power2.out'},DR);
    shake('#hk-in',DR+.28,8,.15,.5);
    tl.fromTo('#stk',{opacity:0,scale:1.4},{opacity:1,scale:1,duration:.15,ease:'back.out(2)'},ST);
    tl.to('#dis',{y:-26,duration:.14,ease:'power2.out'},ST+.08);
    tl.to(['#b0','#b1'],{x:-LEAN,duration:.2,ease:'power2.out'},BA-.1);
    tl.to(['#b3','#b4'],{x:LEAN,duration:.2,ease:'power2.out'},BA-.1);
    tl.fromTo('#ta',{scale:2.4,opacity:0,x:260},{scale:1,opacity:1,x:0,duration:.2,ease:'power4.out'},BA);
    shake('#hk-in',BA,10,.25,1);
    tl.fromTo('#rg',{scale:1.7,opacity:0},{scale:1,opacity:1,duration:.18,ease:'back.out(2)'},BA+.05);
    tl.to('#rg',{scale:1.08,duration:.12,yoyo:true,repeat:5,ease:'sine.inOut'},BA+.3);
    tl.fromTo('#tb',{scale:2.6,opacity:0,rotation:-10},{scale:1,opacity:1,rotation:-3,duration:.22,ease:'power4.out'},BB);
    shake('#hk-in',BB,18,.45,2.2);
    tl.to('#tb',{scale:1.06,duration:.14,yoyo:true,repeat:3,ease:'sine.inOut'},BB+.3);`;
    return { top, body, js };
  },
});
