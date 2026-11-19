// packages/render smoke test: keyframe math (editor curves) + a 2 s synthetic timeline (picture with blur fill, punch-in,
// RGBA layer, text pill, audio with volume keyframes) rendered with ffmpeg; checks length, layer order and text placement.
// usage: npx tsx scripts/test-render.ts
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renderTimeline } from '../packages/render/src/render.ts';
import { easeProgress, sampleKeyframes, type Timeline } from '../packages/render/src/timeline.ts';

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

ok(Math.abs(easeProgress(0.5, 'easeInOut') - 0.5) < 1e-6 && easeProgress(0.25, 'easeOut') > 0.25 && easeProgress(0.25, 'easeIn') < 0.25, 'easing curves (CSS beziers)');
ok(sampleKeyframes([{ frame: 0, value: 1 }, { frame: 10, value: 2 }], 5) === 1.5 && sampleKeyframes([{ frame: 5, value: 3 }], 0) === 3, 'keyframe sampling holds ends, interpolates linearly');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-test-'));
const f = (n: string) => path.join(dir, n);
const ff = (...a: string[]) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
ff('-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=30:d=3', '-f', 'lavfi', '-i', 'sine=f=440:d=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', f('src.mp4'));
ff('-f', 'lavfi', '-i', 'color=c=red@1:s=200x100,format=rgba', '-f', 'lavfi', '-i', 'color=c=black@0:s=1080x1920,format=rgba', '-filter_complex', '[1][0]overlay=40:40', '-frames:v', '1', f('layer.png'));
const tl: Timeline = { version: 1, width: 1080, height: 1920, fps: 30, durationInFrames: 60, tracks: [
  { name: 'Picture', kind: 'video', items: [{ type: 'video', src: f('src.mp4'), fromFrame: 0, durationInFrames: 60, srcStartFrame: 15, volume: 0.5, backgroundFill: 70,
    transform: { scale: 0.9, y: -5 }, keyframes: { scale: [{ frame: 0, value: 0.9, easing: 'easeInOut' }, { frame: 30, value: 1.1 }] } }] },
  { name: 'Layer', kind: 'video', items: [{ type: 'image', src: f('layer.png'), fromFrame: 30, durationInFrames: 30, keyframes: { opacity: [{ frame: 0, value: 0, easing: 'easeOut' }, { frame: 7, value: 1 }] } }] },
  { name: 'Captions', kind: 'video', items: [{ type: 'text', text: 'HELLO TEST', fromFrame: 0, durationInFrames: 60, transform: { y: 20 },
    props: { fontSize: 150, fontWeight: 900, color: '#ffff00', align: 'center', bgEnabled: true, bgColor: 'rgba(0,0,0,0.8)', bgRadius: 18, bgPaddingX: 28, bgPaddingY: 8, bgBorder: 'none' } }] },
  // regression (rank-261102-91sf, 2026-11-02): a hook card from frame 0 next to a caption that also starts at frame 0 must be on frame 0
  { name: 'Overlays 1', kind: 'video', items: [{ type: 'text', text: 'HOOK', fromFrame: 0, durationInFrames: 27, transform: { y: -30 },
    props: { fontSize: 200, fontWeight: 900, color: '#00ff00', align: 'center' } }] },
  { name: 'Music', kind: 'audio', items: [{ type: 'audio', src: f('src.mp4'), fromFrame: 6, durationInFrames: 40, keyframes: { volume: [{ frame: 0, value: 0 }, { frame: 10, value: 1, easing: 'easeOut' }, { frame: 20, value: 0.5 }] }, fadeOutFrames: 6 }] },
] };
const r = await renderTimeline(tl, f('out.mp4'), { workDir: f('work') });
const probe = JSON.parse(String(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_entries', 'stream=codec_type,nb_read_frames,width,height,color_range', '-of', 'json', f('out.mp4')])));
const v = probe.streams.find((s: any) => s.codec_type === 'video');
ok(+v.nb_read_frames === 60 && v.width === 1080 && v.height === 1920, `60 frames 1080x1920 (${v.nb_read_frames} ${v.width}x${v.height}, ${r.seconds.toFixed(1)} s)`);
ok(v.color_range === 'pc' && probe.streams.some((s: any) => s.codec_type === 'audio'), 'full-range BT.601 tag (as OpenChatCut) + audio stream');
const px = (t: number, x: number, y: number) => [...execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', f('out.mp4'), '-frames:v', '1', '-vf', `crop=1:1:${x}:${y},format=rgb24`, '-f', 'rawvideo', '-'])];
const red = px(1.5, 120, 80), noRed = px(0.5, 120, 80);
const half = px(31 / 30 + 0.001, 120, 80);
ok(half[0] < red[0] - 20 && half[0] > noRed[0] - 60, `opacity keyframes (sendcmd dissolve) frame 1 of 7 is partial (${half})`);
ok(red[0] > 200 && red[1] < 60 && (noRed[0] < 200 || noRed[1] > 60), `RGBA layer only inside its window, above the picture (t1.5 ${red} / t0.5 ${noRed})`);
const cards = fs.readdirSync(path.join(f('work'), 'text')).filter(n => n.endsWith('.json')).map(n => JSON.parse(fs.readFileSync(path.join(f('work'), 'text', n), 'utf8')));
const card = cards.find(c => c.plate) ?? cards[0], hook = cards.find(c => !c.plate);
// hook card: centre y = 960 - 576 = 384; frame 0 shows it (green), frame 40 (after its 27 frames) does not
const hookPx = (fr: number) => [...execFileSync('ffmpeg', ['-v', 'error', '-i', f('out.mp4'), '-vf', `select=eq(n\\,${fr}),crop=${hook.w}:${hook.h}:${hook.x}:${hook.y},scale=1:1:flags=area,format=rgb24`, '-fps_mode', 'passthrough', '-frames:v', '1', '-f', 'rawvideo', '-'])];
const h0 = hookPx(0), h40 = hookPx(40);
ok(!!hook && Math.abs(hook.y + hook.h / 2 - 384) < 40 && h0[1] - h40[1] > 15, `hook text from frame 0 is on frame 0 (box mean g ${h0[1]} at f0 vs ${h40[1]} at f40)`);
// y = 20 % from centre -> centre near 960 + 384 = 1344
ok(Math.abs(card.y + card.h / 2 - 1344) < 30 && Math.abs(card.x + card.w / 2 - 540) < 30 && !!card.plate, `text card centred at transform y (box ${card.x},${card.y} ${card.w}x${card.h}, pill mask ${!!card.plate})`);
const yel = px(0.5, card.x + Math.round(card.w / 2), card.y + Math.round(card.h / 2));
ok(card.w > 300 && card.h > 60, `text card has a painted size (${card.w}x${card.h}), centre pixel ${yel}`);
fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? `\n${fails} failed` : '\nall passed');
process.exit(fails ? 1 : 0);
