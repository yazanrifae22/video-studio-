/** Text safety (packages/render/src/text-safety.ts): pure evaluation cases + one live Chrome measurement of a small timeline. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluateTextSafety, loadTextSafetyConfig, textSafety, autoTarget, type RawText } from '../packages/render/src/text-safety.ts';
import type { Timeline } from '../packages/render/src/timeline.ts';

let fail = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; if (!c) { fail++; console.error('FAIL', m); } };
const cfg = loadTextSafetyConfig();
const raw = (id: string, box: [number, number, number, number], extra: Partial<RawText> = {}): RawText =>
  ({ id, source: 'timeline', layer: 'Captions', text: id, t_start: 0, t_end: 2, intervals: [[0, 2]], box: { x: box[0], y: box[1], w: box[2], h: box[3] }, cap: 60, ...extra });
const issuesOf = (r: ReturnType<typeof evaluateTextSafety>, id: string) => r.items.find(i => i.id === id)?.issues ?? [];

/* 9:16 1080x1920 */
let r = evaluateTextSafety([raw('ok', [200, 700, 600, 120])], 1080, 1920, 'clipping', cfg);
ok(r.pass && issuesOf(r, 'ok').length === 0, 'centred text passes');
r = evaluateTextSafety([raw('off', [800, 700, 400, 100])], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'off').includes('offcanvas') && issuesOf(r, 'off').includes('clipped') && !r.pass, 'text past the right edge = offcanvas + clipped');
r = evaluateTextSafety([raw('margin', [20, 700, 300, 100])], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'margin').includes('unsafe_margin') && !r.pass, 'inside the 4 % margin');
r = evaluateTextSafety([raw('bottom', [200, 1600, 600, 100])], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'bottom').includes('ui_zone') && r.items[0].details.some(d => d.startsWith('ui_zone:bottom')), 'bottom 20 % = ui_zone');
r = evaluateTextSafety([raw('rail', [700, 1000, 300, 100])], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'rail').includes('ui_zone'), 'right 15 % = ui_zone');
r = evaluateTextSafety([raw('rail', [700, 400, 300, 100])], 1080, 1920, 'quiz-ar', cfg);
ok(!issuesOf(r, 'rail').includes('ui_zone'), 'quiz-ar: right rail only y 800-1700 (visual-system.md)');
r = evaluateTextSafety([raw('small', [200, 700, 600, 50], { cap: 30 })], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'small').includes('too_small'), 'cap 30 px < 2.2 % of 1920');
// roles (owner 2026-11-08): main >= 2.2 %, label >= 1.4 % (builder metadata, else brand roles rule)
r = evaluateTextSafety([raw('lbl', [200, 700, 200, 40], { cap: 30, role: 'label' }), raw('lbl2', [500, 700, 200, 40], { cap: 26, role: 'label' }), raw('main', [200, 900, 600, 60], { cap: 40 })], 1080, 1920, 'quiz-ar', cfg);
ok(!issuesOf(r, 'lbl').includes('too_small') && r.items.find(i => i.id === 'lbl')?.role === 'label', 'label 30 px = 1.56 % >= 1.4 % passes');
ok(issuesOf(r, 'lbl2').includes('too_small'), 'label 26 px = 1.35 % < 1.4 % fails');
ok(issuesOf(r, 'main').includes('too_small') && r.items.find(i => i.id === 'main')?.role === 'main', 'main 40 px = 2.08 % < 2.2 % fails (default role main)');
ok(r.thresholds.min_cap_px_by_role?.label === 26.9, `label threshold px reported (${r.thresholds.min_cap_px_by_role?.label})`);
r = evaluateTextSafety([raw('rl', [100, 400, 100, 400], { source: 'layer', layer: 'VR Rail', cap: undefined })], 1080, 1920, 'viral-rankings', cfg);
ok(r.items[0].role === 'label', 'viral-rankings rail layer = label by the brand roles rule');
r = evaluateTextSafety([raw('a', [200, 700, 600, 120]), raw('b', [300, 720, 500, 120], { intervals: [[1, 3]] })], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'a').includes('overlap') && issuesOf(r, 'b').includes('overlap'), 'two texts on the same spot at the same time overlap');
r = evaluateTextSafety([raw('a', [200, 700, 600, 120]), raw('b', [300, 720, 500, 120], { intervals: [[1.9, 3]] })], 1080, 1920, 'clipping', cfg);
ok(!issuesOf(r, 'a').includes('overlap'), 'a 0.1 s handover is not an overlap');
r = evaluateTextSafety([raw('spill', [200, 700, 600, 120], { spill: true })], 1080, 1920, 'clipping', cfg);
ok(issuesOf(r, 'spill').includes('clipped'), 'a word wider than its box = clipped');
r = evaluateTextSafety([raw('cut', [200, 700, 600, 120], { source: 'html', cut_s: 1.2, cut_by: '.card' })], 1080, 1920, 'quiz-ar', cfg);
ok(issuesOf(r, 'cut').includes('clipped'), 'html text cut by a parent overflow for 1.2 s = clipped');
r = evaluateTextSafety([raw('rtl', [200, 700, 600, 120], { rtl: { dir: 'ltr', problems: ['last character "?" is not at the left end'] } })], 1080, 1920, 'quiz-ar', cfg);
ok(issuesOf(r, 'rtl').includes('rtl') && r.pass, 'rtl is reported but does not block');
r = evaluateTextSafety([raw('title', [40, 262, 1000, 120], { source: 'layer', layer: 'VR Title' })], 1080, 1920, 'viral-rankings', cfg);
ok(issuesOf(r, 'title').length === 0 && (r.items[0].exempt ?? []).length > 0, 'Podium Pop title band exempt from right rail / margin (BRAND-GUIDE)');
r = evaluateTextSafety([raw('lay', [700, 1000, 300, 100], { source: 'layer', layer: 'VR Badge' })], 1080, 1920, 'viral-rankings', cfg);
ok(issuesOf(r, 'lay').includes('ui_zone') && r.pass, 'layer findings warn only');
/* 16:9 kids */
r = evaluateTextSafety([raw('ctl', [300, 1000, 600, 60])], 1920, 1080, 'kids', cfg);
ok(r.aspect === '16:9' && issuesOf(r, 'ctl').includes('ui_zone'), '16:9 player controls zone');
r = evaluateTextSafety([raw('right', [1500, 300, 300, 100])], 1920, 1080, 'kids', cfg);
ok(!issuesOf(r, 'right').includes('ui_zone'), '16:9 has no right action rail');
ok(autoTarget(path.join('E:', 'x', 'productions', 'rank-1', 'v3', 'render-work'))?.out.endsWith(path.join('v3', 'qa', 'text-safety.json')) === true && autoTarget('E:/tmp/w') === null, 'autoTarget = productions/<id>/vN/render-work only');

/* live: Chrome lays the texts out (English off the edge, a tiny label, two overlapping, Arabic with an ASCII "?" at the end) */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-test-'));
const T = (id: string, text: string, from: number, dur: number, x: number, y: number, fontSize: number) => ({ id, type: 'text' as const, text, fromFrame: from, durationInFrames: dur, transform: { x, y }, props: { fontSize, fontWeight: 900 } });
const tl: Timeline = { version: 1, width: 1080, height: 1920, fps: 30, durationInFrames: 90, tracks: [{ name: 'Overlays', kind: 'video', items: [
  T('edge', 'EDGE', 0, 90, 42, 0, 150), T('tiny', 'tiny label', 0, 90, 0, -30, 40), { ...T('lab', 'LABEL 1/3', 0, 90, 0, -40, 80), role: 'label' as const }, T('a', 'FIRST LINE', 0, 90, 0, 10, 110), T('b', 'SECOND LINE', 30, 60, 0, 11, 110), T('ar', 'هل شفت الحوت?', 0, 90, 0, -10, 110),
] }] };
const live = await textSafety(tl, { brand: 'clipping', workDir: tmp });
const li = (id: string) => live.items.find(i => i.id === id)?.issues ?? [];
ok(!live.error, `no error (${live.error ?? ''})`);
ok(li('edge').some(x => x === 'unsafe_margin' || x === 'offcanvas' || x === 'clipped' || x === 'ui_zone'), `edge text flagged (${li('edge')})`);
ok(li('tiny').includes('too_small'), `tiny text flagged (${li('tiny')})`);
ok(!li('lab').includes('too_small') && live.items.find(i => i.id === 'lab')?.role === 'label', `timeline text role label: 80 -> ${live.items.find(i => i.id === 'lab')?.cap_pct}% passes 1.4 % (${li('lab')})`);
ok(li('a').includes('overlap') && li('b').includes('overlap'), `overlap flagged (${li('a')} / ${li('b')})`);
ok(li('ar').includes('rtl'), `Arabic with an ASCII "?" flagged rtl (${li('ar')})`);
ok(!live.pass, 'live report fails');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`test-text-safety: ${n - fail}/${n} ok`);
if (fail) process.exit(1);
