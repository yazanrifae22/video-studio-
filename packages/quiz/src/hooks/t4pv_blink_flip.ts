import { defineHook } from './types.ts';

/** t4pv_blink_flip: a sailboat sits in a window while a six-bar shutter blinks twice ("blink of an eye"); its sail changes colour behind each blink
 *  (pink -> blue -> gold, none of the colours used in the rounds' answers) and the second line «شو تغيّر؟» punches in after the second blink.
 *  Params: t1, t2, beats {b1, b2, punch}. */
export default defineHook({
  name: 't4pv_blink_flip',
  aliases: ['blink_flip'],
  about: 'a shutter blinks twice over a sailboat whose sail changes colour behind each blink: "blink of an eye, what changed?"',
  beats: { b1: 0.3, b2: 0.72, punch: 1.04 },
  tint: 'rgba(29,21,72,.55)',
  sfx: ({ B, cue: c }) => [
    c('hook_slam', 0, -10),
    c('hook_blink', B.b1 + 0.05, -9), c('hook_blink', B.b2 + 0.05, -8),
    c('hook_slam', B.punch, -6),
  ],
  render({ P, B, esc, pal }) {
    const t1 = P.t1 ?? 'رمشة عين!';
    const t2 = P.t2 ?? 'شو تغيّر؟';
    const top =
      `<div class="hk-t" id="t1" style="top:6px;line-height:1.05;font-size:118px;color:#fff;white-space:nowrap">${esc(t1)}</div>` +
      `<div class="hk-t hk-o" id="t2" style="top:146px;line-height:1.05;font-size:100px;color:${pal.gold};white-space:nowrap">${esc(t2)}</div>`;
    const bars = Array.from({ length: 6 }, () => `<i></i>`).join('');
    const body =
      `<div class="abs" id="win" style="left:110px;top:90px;width:680px;height:680px;border-radius:64px;background:#F4F1FF;border:10px solid #fff;box-shadow:0 18px 40px rgba(29,21,72,.35);overflow:hidden">` +
      `<div class="abs" id="bt" style="left:90px;top:70px;width:500px;height:520px"><svg viewBox="0 0 320 354" width="500" height="520">` +
      `<rect x="156" y="26" width="10" height="260" fill="#2A1F4D"/>` +
      `<polygon id="sail" points="174,38 174,272 298,272" fill="${pal.pink}"/>` +
      `<polygon points="148,82 148,272 56,272" fill="#FFE6A6"/>` +
      `<polygon points="52,286 310,286 272,348 92,348" fill="${pal.ink}"/>` +
      `<polygon points="161,26 161,6 206,16" fill="${pal.gold}"/></svg></div>` +
      `<div class="abs" id="shut" style="left:0;top:0;width:680px;height:680px;z-index:5">${bars}</div></div>`;
    const css = `#shut i{display:block;height:16.7%;width:100%;background:linear-gradient(90deg,#6A3BFF,#2F8CFF,#19D3C5);transform-origin:100% 50%;transform:scaleX(0)}`;
    const js = `
    var b1=${B.b1}, b2=${B.b2}, PU=${B.punch};
    tl.fromTo('#t1',{scale:1.1},{scale:1,duration:.2,ease:'power4.out'},0);
    // the boat bobs the whole time (motion on frame 0)
    tl.fromTo('#bt',{y:10,rotation:-3},{y:-10,rotation:3,duration:.45,ease:'sine.inOut',yoyo:true,repeat:4},0);
    function blink(t,col){
      tl.to('#shut i',{scaleX:1,duration:.14,ease:'power2.in',stagger:.01},t);
      tl.set('#sail',{attr:{fill:col}},t+.2);
      tl.to('#shut i',{scaleX:0,duration:.14,ease:'power2.out',stagger:.01,transformOrigin:'0% 50%'},t+.22);
    }
    // frame 0: the shutter is already half closed and sweeping
    // boat fully visible and bobbing at frame 0; first blink starts at b1
    blink(b1+.02,'${pal.blue}');
    blink(b2,'${pal.gold}');
    tl.fromTo('#t2',{scale:1.18},{scale:1,duration:.22,ease:'power4.out'},PU);
    shake('#win',PU,8,.35,2);
    tl.to(['#t1','#t2'],{opacity:0,duration:.14,ease:'power1.in'},X-.04);`;
    return { top, body, css, js };
  },
});
