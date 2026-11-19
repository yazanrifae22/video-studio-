// Regression tests for the 2026-11-02 template fixes (QA audit of 747 reviews):
//  audio clicks at joins (micro-fades + click detector), overlay flicker at cuts (tidyOverlays), name-card clipping (text fit),
//  end-card ghost (dissolve after the score card), credit placement (quietest free band).
// usage: npx tsx scripts/test-render-templates.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderTimeline } from '../packages/render/src/render.ts';
import { renderCards } from '../packages/render/src/text.ts';
import { detectClicks } from '../packages/render/src/clicks.ts';
import { tidyOverlays } from '../packages/render/src/tidy.ts';
import type { Timeline } from '../packages/render/src/timeline.ts';
import { cardOpacity, endcardFade } from '../packages/quiz/src/endcard.ts';
import { placeCredit, pickBand } from '../packages/occ/src/safezone.ts';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-tpl-'));
const f = (n: string) => path.join(dir, n);
const ff = (...a: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);

/* 1. clicks: two pieces of one 440 Hz tone joined with a phase jump at 0.5 s */
ff('-f', 'lavfi', '-i', 'sine=f=440:d=3:sample_rate=48000', '-af', 'volume=4', '-c:a', 'pcm_s16le', f('tone.wav'));
ff('-i', f('tone.wav'), '-filter_complex', '[0]atrim=0:0.5,asetpts=N/SR/TB[a];[0]atrim=0.7333:1.2333,asetpts=N/SR/TB[b];[a][b]concat=n=2:v=0:a=1', f('hard.wav'));
const tl: Timeline = { version: 1, width: 360, height: 640, fps: 30, durationInFrames: 30, tracks: [
  { name: 'Picture', kind: 'video', items: [] },
  { name: 'Narration', kind: 'audio', items: [
    { type: 'audio', src: f('tone.wav'), fromFrame: 0, durationInFrames: 15 },
    { type: 'audio', src: f('tone.wav'), fromFrame: 15, durationInFrames: 15, srcStartFrame: 22 },
  ] },
] };
await renderTimeline(tl, f('joins.mp4'), { workDir: f('w1') });
const [hard] = await detectClicks(f('hard.wav'), [0.5]);
const [rend] = await detectClicks(f('joins.mp4'), [0.5]);
ok(hard.click, `detector flags a hard cut with a phase jump (ratio ${hard.ratio})`);
ok(!rend.click, `rendered join with micro-fades has no click (ratio ${rend.ratio}, peak ${rend.peak})`);
const [mid] = await detectClicks(f('joins.mp4'), [0.25]);
ok(!mid.click, `no false click inside a steady tone (ratio ${mid.ratio})`);

/* 2. overlay flicker: caption 1 frame off a cut, 2-frame gap between cards, video overlay start kept */
const t2: Timeline = { version: 1, width: 1080, height: 1920, fps: 30, durationInFrames: 120, tracks: [
  { name: 'Picture', kind: 'video', items: [{ type: 'video', src: 'a.mp4', fromFrame: 0, durationInFrames: 60 }, { type: 'video', src: 'b.mp4', fromFrame: 60, durationInFrames: 60 }] },
  { name: 'Captions', kind: 'video', items: [
    { type: 'text', text: 'ONE', fromFrame: 0, durationInFrames: 59 },          // ends 1 frame before the cut -> 60
    { type: 'text', text: 'TWO', fromFrame: 61, durationInFrames: 20 },         // starts 1 frame after the cut -> 60
    { type: 'text', text: 'THREE', fromFrame: 83, durationInFrames: 10 },       // 2-frame gap after TWO -> TWO ends 83
    { type: 'text', text: 'FADE', fromFrame: 100, durationInFrames: 10, fadeOutFrames: 5 },
  ] },
  { name: 'Inserts', kind: 'video', items: [{ type: 'video', src: 'c.mp4', fromFrame: 62, durationInFrames: 10 }] },
] };
const log = tidyOverlays(t2);
const it = (n: string) => t2.tracks[1].items.find(x => x.type === 'text' && x.text === n)!;
ok(it('ONE').fromFrame + it('ONE').durationInFrames === 60 && it('TWO').fromFrame === 60, `captions snapped to the cut (ONE ends ${it('ONE').fromFrame + it('ONE').durationInFrames}, TWO starts ${it('TWO').fromFrame})`);
ok(it('TWO').fromFrame + it('TWO').durationInFrames === 83, 'a 2-frame gap between cards is closed');
ok(it('FADE').durationInFrames === 10 && t2.tracks[2].items[0].fromFrame === 62, 'fading items and video overlay starts are left alone');
ok(log.length === 3, `tidy log (${log.length}): ${log.join(' | ')}`);

/* 3. name card / label fit: a long label pushed to the right edge must shrink inside the 4 % margin */
const W = 1080, H = 1920, M = Math.round(W * 0.04);
const cards = await renderCards([
  { type: 'text', text: 'ALEXANDROVICH-KOWALCZYKOWSKI', fromFrame: 0, durationInFrames: 10, transform: { x: 20, y: -17 }, props: { fontSize: 120, fontWeight: 900, bgEnabled: true, bgColor: 'rgba(124,92,255,0.92)', bgPaddingX: 40 } },
  { type: 'text', text: 'SHORT', fromFrame: 0, durationInFrames: 10, transform: { y: -17 }, props: { fontSize: 120, fontWeight: 900 } },
], W, H, f('cards'));
const [long, short] = cards;
const pl = long.plate ?? long;
ok(((long.fit ?? 1) < 1 || (long.shift ?? 0) > 0) && !long.clipped && pl.x >= M - 1 && pl.x + pl.w <= W - M + 1, `long off-centre label fitted (size ${Math.round((long.fit ?? 1) * 100)} %, moved ${long.shift ?? 0} px), pill ${pl.x}-${pl.x + pl.w} inside ${M}-${W - M}`);
ok(short.fit == null && short.shift == null, 'a label that fits keeps its authored size');

/* 4. end-card: the lockup only dissolves in once the score card is <= 10 % */
const abs = 38.6, endStart = 38.4;   // marks.endcard (abs) and end-card item start (2 frames + 1.4 s before the end)
const fd = endcardFade(abs, endStart, 1.47);
ok(cardOpacity(endStart + fd.st, abs) <= 0.1 + 1e-6, `score card ${cardOpacity(endStart + fd.st, abs).toFixed(2)} opaque when the lockup starts (+${fd.st} s)`);
ok(cardOpacity(endStart, abs) > 0.5, `old timing overlapped: card ${cardOpacity(endStart, abs).toFixed(2)} at the old dissolve start`);
ok(fd.st + fd.d <= 0.7, `lockup fully in by +${(fd.st + fd.d).toFixed(2)} s (holds >= 0.75 s)`);

/* 5. credit placement: busy texture (hair/face) in the top bands, calm sky lower -> the calm band wins; blocked bands skipped */
ff('-f', 'lavfi', '-i', 'color=c=0x6688aa:s=1080x1920', '-f', 'lavfi', '-i', 'testsrc2=s=1080x300', '-filter_complex', '[0][1]overlay=0:220', '-frames:v', '1', f('busy.png'));
const pc = await placeCredit({ heightPx: 50, frames: [{ file: f('busy.png'), t: 0, fill: 'cover' }], blocked: [] });
ok(pc.y === -21, `credit goes to the quiet band (y ${pc.y}, energy ${pc.energy.join('/')})`);
const pb = await placeCredit({ heightPx: 50, frames: [{ file: f('busy.png'), t: 0, fill: 'cover' }], blocked: [{ y0: 500, y1: 600 }] });
ok(pb.y !== -21 && pb.y != null, `a band taken by another text is skipped (y ${pb.y})`);
ok(pickBand([5, 5.5, 9]) === 0 && pickBand([3, 1.5, 1]) === 2 && pickBand([Infinity, Infinity]) === -1, 'ties prefer the higher band; all blocked -> -1');

/* 6. quiz-ar cd_cue pill never overlaps the countdown ring max box (ring + 1.6x digit pop), inside margins, above the bottom zone */
const { cueLayout, ringHalf } = await import('../packages/quiz/src/compose.ts');
let cueN = 0;
for (const cue of ['ركّز على مكانها', 'تابع الأصفر', 'قارن الهلالات', 'كلهم صاروا رمادي!', 'الجاي أصعب!', 'قارن الدرجات', 'ابتسم']) {
  for (const [pos, k] of [[[540, 1330], 1], [[540, 1418], 0.8], [[175, 1335], 0.78], [[860, 1335], 0.7], [[100, 895], 0.65], [[175, 560], 0.7], [[540, 1330], 0.8]] as [[number, number], number][]) {
    const cl = cueLayout(cue, pos, k), h = ringHalf(k), ring = { x: pos[0] - h, y: pos[1] - h, w: 2 * h, h: 2 * h };
    const inter = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    // measured pill width (<= lane), not the lane: 0.66 em per glyph + 62 px padding/border, two lines when lines = 2
    const chars = cl.lines === 1 ? [...cue].length : Math.ceil([...cue].length / 2) + 1, pw = Math.min(cl.x1 - cl.x0, chars * 0.66 * cl.px + 62), px0 = (cl.x0 + cl.x1) / 2 - pw / 2;
    const pill = { x: px0, y: cl.box.y, w: pw, h: cl.box.h };
    cueN++;
    ok(!inter(pill, ring) && !inter(cl.box, ring), `cue «${cue}» @${pos} k${k}: pill ${Math.round(pill.x)}-${Math.round(pill.x + pill.w)} y${pill.y}+${pill.h} clear of ring ${ring.x}-${ring.x + ring.w}`);
    ok(cl.x0 >= 60 && cl.x1 <= 1020 && cl.px >= 42 && pill.y + pill.h <= 1480, `cue «${cue}» @${pos}: inside margins, px ${cl.px}, bottom ${pill.y + pill.h} <= 1480`);
  }
}
console.log(`cue lanes checked: ${cueN}`);

fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
