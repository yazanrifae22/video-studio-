import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { P } from '../../shared/src/paths.ts';
import type { LineDurations, QuizSpec, Script } from './spec.ts';
import { bigLines, finalBeat, flashGeom, setArtDir, type Plan } from './templates.ts';
import { TEMPLATES } from './registry.ts';

export const HF = 'hyperframes@0.8.185';
/** npm's npx entry point next to the running node (Windows + Unix layouts). */
export const NPX_CLI = [path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', 'npm', 'bin', 'npx-cli.js'), path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), path.join(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js')].find(f => fs.existsSync(f)) ?? 'npx-cli.js';
const RUNTIME = path.join(P.root, 'packages', 'quiz', 'runtime');
const VENDOR = path.join(P.root, 'packages', 'quiz', 'vendor');
/** Heavy render work dirs live on E: (C: is short on space); override with STUDIO_RENDER_TMP. */
export const WORK = path.join(process.env.STUDIO_RENDER_TMP ?? 'E:\\clips-viral-render-tmp', 'quiz');

export interface Resolved {
  total: number;
  rounds: { id: string; type: string; T0: number; plan: Plan }[];
  lines: { id: string; at: number; dur: number }[];
  sfx: { name: string; at: number; gain_db?: number; under?: string }[];
  reveals: number[];
}

/** Lay the rounds end to end; every time in the result is absolute (seconds from the start of the video), frame-snapped. */
export function resolve(spec: QuizSpec, script: Script, dur: LineDurations): Resolved {
  const fps = spec.fps;
  const snap = (x: number) => Math.round(x * fps) / fps;
  let T = 0;
  /** index of the first real round (a hook_intro before it only shifts everything by its duration) */
  const lead = Math.max(0, spec.rounds.findIndex(r => r.type !== 'hook_intro'));
  const out: Resolved = { total: 0, rounds: [], lines: [], sfx: [], reveals: [] };
  spec.rounds.forEach((r, i) => {
    const tpl = TEMPLATES[r.type];
    if (!tpl) throw new Error(`round ${r.id}: unknown template ${r.type}`);
    const ctx = { spec, script, dur, last: i === spec.rounds.length - 1, first: i === lead };
    const plan = tpl.plan(r, ctx);
    if (r.open) {  // open final round: nothing at/after the countdown end may hint at an answer (SFX, extra reveal time)
      plan.sfx = plan.sfx.filter(s => s.at < plan.reveal! - 0.2);
      plan.duration = plan.reveal! + 0.3; plan.explain = undefined;
    }
    // a closing ask (post_lines / end_question) must stay readable through the LAST frame (viewers pause / loop on it): the
    // loop zoom (clears all text, hard-cuts to frame 0 in the last 3 frames) is skipped for such a final round
    const hasAsk = ctx.last && r.type !== 'score_cta' && r.type !== 'hook_intro' && ((r.post_lines ?? []).filter(Boolean).length > 0 || !!spec.end_question);
    const loopOn = spec.loop === 'zoom' && !hasAsk;
    if (ctx.last && r.type !== 'score_cta' && r.type !== 'hook_intro') finalBeat(r, ctx, plan, loopOn ? LOOP_S : 0);
    plan.duration = snap(plan.duration);
    // quiz.json loop "zoom": the final round's last LOOP_S whip-zoom into a still of frame 0 (chrome.js), under a whoosh
    // that peaks in the zoom and ends with the picture (build.ts trims any SFX tail at the last frame)
    if (loopOn && i === spec.rounds.length - 1) {
      plan.marks.loop = snap(plan.duration - LOOP_S);
      plan.sfx.push({ name: 'whoosh', at: snap(plan.duration - 0.5), gain_db: -6, keep: true });
    }
    // loop seam for a final round that keeps its closing ask: the last SEAM_S cross-fades the round's picture (card, puzzle) to the frame-0 still
    // while the ask (endq / post_lines captions) stays on top, so the last frame = frame 0 + ask
    if (spec.loop === 'zoom' && hasAsk && i === spec.rounds.length - 1) plan.marks.seam = snap(plan.duration - SEAM_S);
    out.rounds.push({ id: r.id, type: r.type, T0: T, plan });
    for (const l of plan.lines) out.lines.push({ id: l.id, at: snap(T + l.at), dur: l.dur });
    // later rounds arrive with the puzzle already built: their intro-pop cues (first 0.2 s) would fire over a static card
    if (i === lead && spec.rounds[lead].hook_banner) {
      const g = spec.rounds[lead].hook_banner.sfx_db ?? -6;
      out.sfx.push({ name: 'whoosh', at: 0, gain_db: g - 4 }, { name: 'pop', at: snap(0.06), gain_db: g });
    }
    for (const s of plan.sfx) if (i === lead || r.type === 'hook_intro' || (s as any).keep || !(s.name === 'pop' && s.at <= 0.2)) out.sfx.push({ ...s, at: snap(T + s.at) });
    if (plan.reveal != null && !r.open) out.reveals.push(T + plan.reveal);
    T = snap(T + plan.duration);
  });
  out.total = T;
  return out;
}

/** loop "zoom": length of the end whip-zoom into frame 0 (s) */
export const LOOP_S = 0.3;
export const SEAM_S = 0.4;

const SHAPES = [
  { x: 70, y: 330, s: 120, k: 'c' }, { x: 900, y: 140, s: 90, k: 'r' }, { x: 40, y: 1080, s: 160, k: 'r' },
  { x: 960, y: 760, s: 140, k: 'c' }, { x: 120, y: 1640, s: 110, k: 's' }, { x: 820, y: 1460, s: 170, k: 'c' },
  { x: 500, y: 1760, s: 90, k: 's' }, { x: 300, y: 90, s: 70, k: 's' }, { x: 980, y: 1180, s: 80, k: 'r' },
];
const SPARK = `<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 0 C54 36 64 46 100 50 C64 54 54 64 50 100 C46 64 36 54 0 50 C36 46 46 36 50 0 Z" fill="#fff"/></svg>`;

function shapesHtml() {
  return SHAPES.map((s, i) => `<div class="shape ${s.k}" style="left:${s.x - s.s / 2}px;top:${s.y - s.s / 2}px;width:${s.s}px;height:${s.s}px;opacity:${(0.08 + (i % 3) * 0.03).toFixed(2)}">${s.k === 's' ? SPARK : ''}</div>`).join('');
}
const shapeParams = () => SHAPES.map((_, i) => ({ px: 7 + (i * 1.7) % 5, py: 9 + (i * 2.3) % 6, ph: i * 1.3, rot: i % 2 ? 6 : -4 }));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const BASE_CSS = `
@font-face { font-family: "Cairo"; src: url("Cairo-Black.ttf") format("truetype"); font-weight: 800 1000; }
@font-face { font-family: "Cairo"; src: url("Cairo-Bold.ttf") format("truetype"); font-weight: 200 799; }
html, body { margin: 0; background: transparent; }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; font-family: "Cairo"; }
#bg { position: absolute; inset: 0; background: linear-gradient(135deg, #6A3BFF 0%, #2F8CFF 50%, #19D3C5 100%); background-size: 220% 220%; }
.shape { position: absolute; }
.shape.c { border-radius: 50%; background: #fff; }
.shape.r { border-radius: 28%; background: #fff; }
#qarea { position: absolute; left: 90px; right: 90px; top: 318px; height: 150px; direction: rtl; }
.head { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; opacity: 0; }
.head span { display: block; font-weight: 900; font-size: 84px; line-height: 1.18; color: #fff; text-shadow: 0 4px 18px rgba(0,0,0,.25); max-width: 900px; }
.head.hook span { color: #FFC83D; font-size: 88px; }
.head.a span { background: #22D489; border-radius: 999px; padding: 6px 48px 14px; font-size: 80px; box-shadow: 0 14px 40px rgba(29,21,72,.25); }
#chip { position: absolute; right: 90px; top: 246px; padding: 0 24px; height: 58px; border-radius: 999px; background: rgba(255,255,255,.22); color: #fff; font-weight: 900; font-size: 40px; line-height: 58px; direction: rtl; opacity: 0; }
#card { position: absolute; left: 90px; top: 470px; width: 900px; height: 860px; background: #fff; border-radius: 48px; box-shadow: 0 24px 60px rgba(29,21,72,.25); }
#explain { position: absolute; left: 20px; right: 20px; bottom: 34px; display: flex; justify-content: center; opacity: 0; direction: rtl; }
#explain span { display: block; max-width: 860px; box-sizing: border-box; background: #FFC83D; color: #1D1548; font-weight: 700; font-size: 62px; line-height: 1.12; padding: 6px 34px 8px; border-radius: 999px; text-align: center; text-wrap: balance; overflow-wrap: anywhere; box-shadow: 0 10px 24px rgba(29,21,72,.18); }
#cdcue { position: absolute; left: 0; width: 1080px; display: flex; justify-content: center; direction: rtl; opacity: 0; z-index: 12; pointer-events: none; }
#cdcue span { display: block; background: #140E38; border: 5px solid #FFC83D; color: #FFE27A; font-weight: 900; font-size: 52px; max-width: 960px; line-height: 1.2; padding: 2px 34px 10px; border-radius: 999px; white-space: nowrap; box-shadow: 0 10px 24px rgba(29,21,72,.3); }
#cd { position: absolute; left: 430px; top: 1220px; width: 220px; height: 220px; opacity: 0; }
#cd > svg, #cd > .cdn { transform: scale(var(--s, 1)); }
#opts { position: absolute; left: 150px; right: 30px; bottom: 26px; display: flex; justify-content: center; gap: 18px; direction: rtl; opacity: 0; }
#opts span { display: block; background: #F4F1FF; border: 4px solid #E3DCFF; color: #1D1548; font-weight: 700; font-size: 46px; line-height: 1.25; padding: 2px 30px 8px; border-radius: 999px; white-space: nowrap; }
#cd svg { position: absolute; inset: 0; overflow: visible; }
.cdn { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 120px; color: #fff; line-height: 1; padding-bottom: 18px; box-sizing: border-box; opacity: 0; }
#hookb { position: absolute; left: 0; right: 0; top: 60px; height: 160px; display: flex; justify-content: center; align-items: center; direction: rtl; gap: 16px; opacity: 1; z-index: 20; }
#hookb .txt { display: block; background: #1D1548; color: #FFC83D; font-weight: 900; line-height: 1.18; padding: 6px 44px 16px; border-radius: 999px; border: 6px solid #FFC83D; white-space: nowrap; box-shadow: 0 8px 26px rgba(0,0,0,.35); }
#hookb .chp { display: block; background: #fff; color: #1D1548; font-weight: 900; font-size: 64px; line-height: 1.18; padding: 6px 30px 14px; border-radius: 999px; box-shadow: 0 8px 26px rgba(0,0,0,.35); white-space: nowrap; }
#flash { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; }
#endq { position: absolute; left: 300px; right: 60px; top: 216px; height: 250px; display: flex; align-items: center; justify-content: center; direction: rtl; z-index: 22; opacity: 0; }
#seamz { position: absolute; inset: 0; opacity: 0; z-index: 21; pointer-events: none; }
#seamz img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
#endq span { display: block; max-width: 720px; box-sizing: border-box; background: #1D1548; border: 7px solid #FFC83D; border-radius: 44px; padding: 6px 40px 18px; text-align: center; font-weight: 900; line-height: 1.16; color: #fff; box-shadow: 0 14px 40px rgba(0,0,0,.35); }
#endq i { display: block; font-style: normal; white-space: nowrap; }
#endq i.g { color: #FFC83D; }
`;


export type CueLayout = { top: number; x0: number; x1: number; px: number; lines: 1 | 2; style: string; box: Box };
/** Ring max extent half-size (px): the disc radius 110*k, or the digit's 1.6x pop (absolute scale, ~100 px half-box). */
export const ringHalf = (k: number) => Math.max(110 * k, 100);
/** Cue pill layout in canvas px: below the ring (strip under the card) when the ring is high, else a lane beside it (left/right, measured gap),
 *  one line at >= 42 px, else two balanced lines. Lanes stay inside the 60 px side margins and left of the quiz-ar action rail (x 918). */
export function cueLayout(cue: string, cdPos: [number, number], k: number): CueLayout {
  const n = Math.max(1, [...cue].length), GAP = 20, H = ringHalf(k);
  const fit = (w: number, chars: number, max: number) => Math.floor(Math.min(max, (w - 2 * 26 - 2 * 5) / (chars * 0.66)));
  const ringBottom = cdPos[1] + H;
  if (cdPos[1] <= 1250) {  // ring above the strip: centred pill under it (and under the card, bottom 1330)
    const top = Math.min(1396, Math.max(1330, ringBottom) + GAP), px = Math.max(42, Math.floor(Math.min(56, (960 - 68 - 10) / (n * 0.66))));
    return { top, x0: 60, x1: 1020, px, lines: 1, style: `font-size:${px}px;border-width:5px`, box: { x: 60, y: top, w: 960, h: 90 } };
  }
  const lanes: [number, number][] = [[60, cdPos[0] - H - GAP], [cdPos[0] + H + GAP, 918]];
  let best: CueLayout | null = null;
  for (const lines of [1, 2] as const) {
    for (const [x0, x1] of lanes) {
      if (x1 - x0 < 150) continue;
      const px = fit(x1 - x0, lines === 1 ? n : Math.ceil(n / 2) + 1, lines === 1 ? 52 : 48);  // 2 lines at <= 48 px stay above y 1480 (2*1.15*48 + 30 = 140)
      if (px < 42) continue;
      if (!best || px > best.px) { const top = 1338; best = { top, x0, x1, px, lines, style: `font-size:${px}px;padding:2px 26px 8px;border-width:5px${lines === 2 ? ';white-space:normal;text-wrap:balance;line-height:1.15;border-radius:44px;max-width:' + (x1 - x0) + 'px;box-sizing:border-box;text-align:center' : ''}`, box: { x: x0, y: top, w: x1 - x0, h: lines === 1 ? 84 : Math.ceil(2 * 1.15 * px + 30) } }; }
    }
    if (best) break;
  }
  if (!best) throw new Error(`cd_cue «${cue}» does not fit beside the countdown ring at ${cdPos} (k=${k}) — shorten it or set params.cd_pos`);
  return best;
}

/** Frame 0 of a round project with every headline / hook banner hidden (picture only) -> png. Copies the project, renders it once, grabs frame 0. */
export async function renderCleanStill(projDir: string, outPng: string): Promise<void> {
  const cd = projDir + '-clean';
  fs.rmSync(cd, { recursive: true, force: true });
  fs.cpSync(projDir, cd, { recursive: true });
  const f = path.join(cd, 'index.html');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('</style>', '.head,#hookb,#chip,#endq,#hk-top,#hk-big{display:none !important}</style>'));
  const mp4 = path.join(cd, 'clean.mp4');
  await renderHF(cd, mp4);
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-frames:v', '1', outPng]);
  if (r.status !== 0 || !fs.existsSync(outPng)) throw new Error('clean still: ffmpeg failed ' + String(r.stderr ?? '').slice(0, 300));
}

/** Write one round as a standalone HyperFrames project (copies its fonts/images/runtime next to index.html). */
export function writeRound(spec: QuizSpec, prodDir: string, r: QuizSpec['rounds'][number], plan: Plan, T0: number, projDir: string) {
  fs.mkdirSync(projDir, { recursive: true });
  const tpl = TEMPLATES[r.type];
  setArtDir(prodDir);  // art measurement (small-object auto-scale) reads the production's files
  const pz = tpl.puzzle(r, plan);
  for (const f of pz.files) {
    const dst = path.join(projDir, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(prodDir, f), dst);
  }
  fs.copyFileSync(path.join(VENDOR, 'gsap.min.js'), path.join(projDir, 'gsap.min.js'));
  for (const f of ['Cairo-Black.ttf', 'Cairo-Bold.ttf']) fs.copyFileSync(path.join(FONTS, f), path.join(projDir, f));
  const C = 2 * Math.PI * 95;
  // options row (named choices) under the puzzle; the countdown ring then moves to the card's bottom-left corner
  const opts: string[] = r.params.options_ar ?? [];
  const ex = r.explanation_ar ? placeExplain(r, prodDir) : { css: '', room: null };
  const exL = r.explanation_ar ? (ex as ReturnType<typeof placeExplain>).layout : null;
  const explainCss = ex.css + (exL ? `#explain span{font-size:${exL.px}px${exL.lines > 1 ? ';border-radius:40px' : ''}}` : '');
  // ring placement: never over puzzle content the viewer must inspect during the countdown
  //  - full-stage images (image_reveal): below the card, in the (empty during countdowns) caption band
  //  - two-panel spot_difference: left edge between the panels
  //  - options row present: card's bottom-left corner
  const defPos: [number, number] = r.type === 'image_reveal' ? [540, 1418] : r.type === 'spot_difference' ? [100, 895] : opts.length ? [175, 1335] : [540, 1330];
  const defScale = r.type === 'image_reveal' ? 0.8 : r.type === 'spot_difference' ? 0.65 : opts.length ? 0.78 : 1;
  let cdPos: [number, number] = r.params.cd_pos ?? (r.type === 'image_reveal' && opts.length ? [175, 1335] : defPos);
  let cdScale: number = r.params.cd_scale ?? (r.type === 'image_reveal' && opts.length ? 0.78 : defScale);
  // the ٣/٢/١ digit pops in at 1.6x (box ~ 96 px per unit scale, half-width ~ 89*k): keep it >= 50 px from both canvas edges (43 px text-safe margin)
  const clampCx = (c: [number, number], k: number): [number, number] => [Math.round(Math.min(1080 - 50 - 96 * k, Math.max(50 + 96 * k, c[0]))), c[1]];
  cdPos = clampCx(cdPos, cdScale);
  // the ring must not sit on a declared answer region either (same rule as the explanation chip): try the default,
  // then free corners of the card (canvas px; right corner stays left of the x 950 action rail)
  // ...nor on a puzzle object, and it keeps >= 24 px from the chips on screen during the countdown (range chip, pills)
  const ringBox = (c: [number, number], k: number): Box => ({ x: c[0] - 110 * k - 90, y: c[1] - 110 * k - 470, w: 220 * k, h: 220 * k });  // → card px
  if (!r.params.cd_pos && plan.cd != null) {
    const boxes = [...objectBoxes(r, prodDir), ...(r.type === 'follow_path' ? (r.params.labels ?? []).map((l: any) => ({ x: l.x - 48, y: (l.y ?? 70) - 48, w: 96, h: 96 })) : [])], chips = chipBoxes(r).map(b => grow(b, CHIP_GAP));
    const cands: [[number, number], number][] = [[cdPos, cdScale], [[175, 1335], 0.78], [[860, 1335], 0.7], [[175, 560], 0.7], [[860, 560], 0.7], [[540, 1418], 0.8]];
    for (const cd of cands) cd[0] = clampCx(cd[0], cd[1]);
    const free = cands.find(([c, k]) => ![...boxes, ...chips].some(b => hit(ringBox(c, k), b)));
    if (!free) throw new Error(`round ${r.id}: no free position for the countdown ring (every slot overlaps a puzzle object or sits < ${CHIP_GAP} px from a chip) — set params.cd_pos`);
    [cdPos, cdScale] = free;
  } else if (plan.cd != null && chipBoxes(r).some(b => hit(ringBox(cdPos, cdScale), grow(b, CHIP_GAP)))) {
    throw new Error(`round ${r.id}: params.cd_pos puts the countdown ring < ${CHIP_GAP} px from the range chip / options pills`);
  }
  // countdown cue pill (params.cd_cue): own lane, never overlapping the ring's max box (ring + the 1.6x digit pop), see cueLayout()
  const cl = plan.cd != null && r.params.cd_cue ? cueLayout(String(r.params.cd_cue), cdPos, cdScale) : null;
  const cueHtml = cl ? `<div id="cdcue" dir="rtl" data-ts-role="label" style="top:${cl.top}px;left:${cl.x0}px;width:${cl.x1 - cl.x0}px"><span style="${cl.style}">${esc(r.params.cd_cue)}</span></div>` : '';
  // loop "zoom" (final round): a still of the video's frame 0 (build.ts passes params.loop_img), else the frame-0 background
  const loop = plan.marks.loop != null;
  if (loop && r.params.loop_img) fs.copyFileSync(path.join(prodDir, r.params.loop_img), path.join(projDir, 'loop0.png'));
  const seam = plan.marks.seam != null && !!r.params.loop_img;
  // the seam still is the frame-0 PICTURE without its headline (loop_clean_img, rendered with the hook text hidden): the closing ask is the only text on the last frame
  const seamImg = seam ? (r.params.loop_clean_img && fs.existsSync(path.join(prodDir, r.params.loop_clean_img)) ? r.params.loop_clean_img : r.params.loop_img) : '';
  if (seam) fs.copyFileSync(path.join(prodDir, seamImg), path.join(projDir, 'loop0s.png'));
  const seamPlate = seam ? '<div id="seamz"><img src="loop0s.png" /></div>' : '';
  // the ask (#qarea h-cta / #endq) renders ABOVE the seam still and gets a dark plate there
  const seamCss = seam ? '#qarea{z-index:23}#h-cta span{padding:6px 40px 16px;border-radius:44px;border:6px solid transparent}' : '';
  const loopPlate = loop ? `<div id="loopz">${r.params.loop_img ? '<img src="loop0.png" />' : '<div class="lbg"></div>'}</div>` : '';
  const loopCss = loop ? `#scene{position:absolute;inset:0}#loopz{position:absolute;inset:0;opacity:0;z-index:30}#loopz img,#loopz .lbg{position:absolute;inset:0;width:100%;height:100%;display:block}#loopz .lbg{background:linear-gradient(135deg,#6A3BFF 0%,#2F8CFF 50%,#19D3C5 100%);background-size:220% 220%;background-position:50% 95%}` : '';
  // empty headline texts (a set_line without on-screen text) render nothing; in a round that follows another one, the first (question) headline enters
  // at once so the hand-off never shows a bare band while the set line is still being voiced (1fva v5, 3.2-4.5 s)
  plan.heads = plan.heads.filter(h => String(h.text ?? '').trim());
  if (T0 > 0 && plan.heads.length && plan.heads[0].kind === 'q' && plan.heads[0].at > 0.08) plan.heads[0].at = 0.08;
  const heads = plan.heads.map(h => { const hf = headFit(h.text, h.kind, r.id); return `<div class="head ${h.kind}" id="${h.id}"><span style="font-size:${hf.px}px${hf.two ? ';line-height:1.06;padding-top:4px;padding-bottom:8px;border-radius:44px' : ''}">${esc(h.text)}</span></div>`; }).join('');
  const hb = T0 === 0 ? r.hook_banner : undefined;
  const hbPx = hb ? Math.min(96, Math.floor((hb.chip ? 760 : 940) / ([...hb.text].length * 0.62))) : 0;
  if (hb && hbPx < 44) throw new Error(`round ${r.id}: hook_banner «${hb.text}» too long for one line (> 44 px) — shorten it`);
  const hookb = hb ? `<div id="hookb"><span class="txt" style="font-size:${hbPx}px">${esc(hb.text)}</span>${hb.chip ? `<span class="chp">${esc(hb.chip)}</span>` : ''}</div>` : '';
  // end_question (owner 2026-11-08): big open question above the card in the final beat (chrome.js animates marks.endq)
  const eq = plan.marks.endq != null && spec.end_question ? bigLines(spec.end_question.text_ar, 700, 208, 104, 3)  /* box y 216-466: below the top-UI zone (< 210), lane x >= 300 clear of the brand pill, above the card (470) */ : null;
  const endq = eq ? `<div id="endq"><span style="font-size:${eq.px}px">${eq.lines.map((l, k) => `<i class="${k === eq.lines.length - 1 && eq.lines.length > 1 ? 'g' : ''}">${esc(l)}</i>`).join('')}</span></div>` : '';
  const endslate = r.type === 'score_cta' ? `<div id="endslate"><div class="name">${esc(spec.channel_name)}</div><div class="sub">تابعنا لتحديات أكثر</div><div class="handle">@shoshayef</div></div>` : '';
  const html = `<!doctype html>
<html lang="ar">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=${spec.width}, height=${spec.height}" />
<script src="gsap.min.js"></script>
<style>${BASE_CSS}
${pz.css}
${explainCss}${loopCss}${seamCss}</style>
</head>
<body>
<div id="root" data-composition-id="${r.id}" data-start="0" data-width="${spec.width}" data-height="${spec.height}" data-duration="${plan.duration}">
  ${loop ? '<div id="scene">' : ''}<div id="bg"></div>
  ${shapesHtml()}
  ${pz.root ?? ''}
  <div id="qarea">${heads}</div>
  ${r.progress ? `<div id="chip" dir="rtl" data-ts-role="label">${esc(r.progress)}</div>` : ''}
  <div id="card">${pz.html}${opts.length ? `<div id="opts">${opts.map((o, k) => `<span id="opt${k}">${esc(o)}</span>`).join('')}</div>` : ''}${r.explanation_ar && !r.open ? `<div id="explain"><span>${esc(r.explanation_ar)}</span></div>` : ''}</div>
  ${seamPlate}${endslate}${endq}
  ${cueHtml}
  ${plan.cd != null ? `<div id="cd" style="left:${cdPos[0] - 110}px;top:${cdPos[1] - 110}px;--s:${cdScale}"><svg viewBox="0 0 220 220"><circle id="cd-disc" cx="110" cy="110" r="104" fill="#1D1548" fill-opacity=".88"/><circle cx="110" cy="110" r="95" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="14"/><circle id="cd-arc" cx="110" cy="110" r="95" fill="none" stroke="#FFC83D" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C.toFixed(2)}" transform="rotate(-90 110 110)"/></svg><div class="cdn" id="cd3">٣</div><div class="cdn" id="cd2">٢</div><div class="cdn" id="cd1">١</div></div>` : ''}
  ${hookb}
  <div id="flash"></div>${loop ? `</div>${loopPlate}` : ''}
</div>
<script>window.QUIZ = ${JSON.stringify({ id: r.id, T0, D: plan.duration, heads: plan.heads, marks: plan.marks, cd: plan.cd ?? null, open: !!r.open, reveal: r.open ? plan.duration + 8 : plan.reveal ?? null, explain: r.open ? plan.duration + 8 : r.explanation_ar ? plan.explain : null, room: ex.room, exit: plan.exit ?? null, opts: opts.length, endslate: !!r.params.fallback_endslate, flashPeak: flashPeak(r, prodDir), hookb: hb ? { dur: hb.dur ?? 2.0 } : null, shapes: shapeParams() })};</script>
<script>${pz.js}</script>
<script>${fs.readFileSync(path.join(RUNTIME, "chrome.js"), "utf8")}</script>
</body>
</html>`;
  fs.writeFileSync(path.join(projDir, 'index.html'), html);
  // answer-leak guard input (build.ts samples these boxes from round start to the reveal): template answer layers + the
  // options pills (the correct pill turns green at the reveal)
  const optBox = opts.length ? chipBoxes(r) : [];
  fs.writeFileSync(path.join(projDir, 'leak.json'), JSON.stringify({ reveal: plan.reveal ?? null, boxes: plan.reveal != null ? [...(pz.leak ?? []), ...optBox] : [] }));
  return projDir;
}

/**
 * Headline size: one line in the question band (x 90-990, 150 px high) — shrinks from the kind's size down to 56 px
 * (Cairo ≈ 0.5 em per char, the pill estimate), then two lines at <= 60 px (answer pill <= 54 px); longer fails the plan.
 */
export const HEAD_MIN_PX = 62;  // text-safety floor: cap height ~0.71 em must stay >= 2.2 % of 1920 (= 42.2 px) -> >= 60 px; 62 keeps a margin
export function headFit(text: string, kind: string, roundId = ''): { px: number; two: boolean } {
  const n = Math.max(1, [...text].length), base = kind === 'hook' ? 88 : kind === 'a' ? 80 : 84;
  const avail = 900 - (kind === 'a' ? 96 : 0), fit = (lines: number) => Math.floor((lines * avail * (lines > 1 ? 0.9 : 1)) / (n * 0.62));  // Cairo Black measures ~0.58 em per Arabic char (0.5 let a 22-char line wrap and clip: a6q2)
  const one = Math.min(base, fit(1));
  if (one >= HEAD_MIN_PX) return { px: one, two: false };
  // long headlines WRAP to two lines at the floor size instead of shrinking below it (text-safety too_small, 5s14 «رجعت لمكانها…»)
  const two = Math.min(kind === 'a' ? 64 : 66, fit(2));
  if (two >= HEAD_MIN_PX) return { px: two, two: true };
  throw new Error(`round ${roundId}: headline «${text}» (${n} chars) does not fit the question band at ${HEAD_MIN_PX} px even on two lines — shorten its onscreen_ar`);
}
export const headPx = (text: string, kind: string, roundId = '') => headFit(text, kind, roundId).px;

export function fontFile() {
  const dir = path.join(P.data, 'brand', 'quiz-ar', 'fonts');
  const f = fs.existsSync(dir) ? fs.readdirSync(dir).find(x => /^Cairo.*\.ttf$/i.test(x)) : undefined;
  if (!f) throw new Error(`Cairo font not found in ${dir}`);
  return path.join(dir, f);
}

/**
 * Run `npx hyperframes render`; resolves with the CLI's summary tail. A render sometimes hangs with its headless Chrome
 * idle (seen 2026-10-23 with three rounds rendering in parallel; the same composition renders alone in ~30 s), so each
 * attempt has a watchdog (default 200 s for a round, 180 s for the caption WebM (it hung after all rounds in batch 11)) that kills the process tree, and a
 * hung or crashed attempt is retried once.
 */
export async function renderHF(projDir: string, out: string, opts: { format?: 'mp4' | 'webm'; quality?: string; onLine?: (s: string) => void; timeoutS?: number } = {}): Promise<string> {
  const limit = (opts.timeoutS ?? (opts.format === 'webm' ? 240 : 300)) * 1000;
  try { return await renderHFOnce(projDir, out, opts, limit); }
  catch (e: any) {
    if (!/timed out|failed \(3221226505\)|failed \(null\)|ERR_CONNECTION_RESET|Capture failed|ECONNRESET/.test(String(e?.message))) throw e;
    opts.onLine?.(`[hyperframes] ${path.basename(projDir)}: ${String(e.message).slice(0, 80)}; retrying once\n`);
    return renderHFOnce(projDir, out, opts, limit);
  }
}

function renderHFOnce(projDir: string, out: string, opts: { format?: 'mp4' | 'webm'; quality?: string; onLine?: (s: string) => void }, limit: number): Promise<string> {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  return new Promise((resolve, reject) => {
    const args = [NPX_CLI, '-y', HF, 'render', projDir, '--output', out, '--fps', '30', '--workers', '2', '--quality', opts.quality ?? 'standard', ...(opts.format === 'webm' ? ['--format', 'webm'] : [])];
    // node + npx-cli.js directly: no shell, so paths with spaces stay single arguments
    const p = spawn(process.execPath, args, { cwd: projDir, env: { ...process.env, TEMP: path.dirname(WORK), TMP: path.dirname(WORK) } });
    let tailBuf = '';
    const on = (b: Buffer) => { const s = b.toString(); tailBuf = (tailBuf + s).slice(-3000); opts.onLine?.(s); };
    p.stdout.on('data', on); p.stderr.on('data', on);
    let timedOut = false;
    const dog = setTimeout(() => {
      timedOut = true;
      try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F']); else p.kill('SIGKILL'); } catch { /* already gone */ }
    }, limit);
    p.on('close', code => {
      clearTimeout(dog);
      if (timedOut) return reject(new Error(`hyperframes render timed out after ${limit / 1000} s (${path.basename(projDir)})`));
      code === 0 && fs.existsSync(out) ? resolve(tailBuf.slice(-600)) : reject(new Error(`hyperframes render failed (${code}): ${tailBuf.slice(-1200)}`));
    });
  });
}

/**
 * Reveal-flash peak opacity from the puzzle's brightness: the white card itself is bright, but full-stage puzzle art
 * (image_reveal, spot_difference panels) can be dark, where a white flash is a big luma jump. Mean luma of the main
 * puzzle image (PNG/JPEG via a tiny ffmpeg probe) → 0.2 (dark) … 0.45 (light). params.flash_peak overrides.
 */
export function flashPeak(r: QuizSpec['rounds'][number], prodDir: string): number {
  if (r.params.flash_peak != null) return r.params.flash_peak;
  const img = r.params.puzzle ?? r.params.top?.bg ?? r.params.layers?.surround;
  if (!img || !/\.(png|jpe?g|webp)$/i.test(img)) return r.type === 'spot_difference' ? 0.3 : 0.45;  // vector panels (e.g. dark trays): conservative
  try {
    // composited over white (transparent areas sit on the white card)
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path.join(prodDir, img), '-filter_complex', 'color=white:s=32x32[b];[0]scale=32:32[f];[b][f]overlay=format=auto,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
    const mean = raw.reduce((a, b) => a + b, 0) / raw.length / 255;
    return +(0.2 + 0.25 * Math.max(0, Math.min(1, mean))).toFixed(2);
  } catch { return 0.45; }
}

type Box = { x: number; y: number; w: number; h: number };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Answer regions of a round (card px): declared `params.answer_boxes`, plus what the template knows is an answer. */
export function answerBoxes(r: QuizSpec['rounds'][number]): Box[] {
  const P = r.params, out: Box[] = [...(P.answer_boxes ?? [])];
  if (r.type === 'spot_difference') {
    const sc = P.panel_scale ?? 0.98, px = P.panel_x ?? 40, py = P.bottom_y ?? 435;
    for (const d of P.differences ?? []) out.push({ x: px + (d.x - d.r) * sc, y: py + (d.y - d.r) * sc, w: 2 * d.r * sc + 120, h: 2 * d.r * sc });  // + label beside the ring
  }
  if (r.type === 'image_reveal') { if (P.focus) out.push(P.focus); for (const b of P.stagger_reveal ?? []) out.push(b); if (P.slide) out.push({ x: P.slide.x + Math.min(0, P.slide.dx), y: P.slide.y + Math.min(0, P.slide.dy), w: P.slide.w + Math.abs(P.slide.dx), h: P.slide.h + Math.abs(P.slide.dy) }); }
  if (r.type === 'follow_path') for (const e of P.ends ?? []) if (Math.abs(e.x - P.target_end) <= 4) out.push({ x: e.x - 85, y: P.end_top ?? 690, w: 170, h: P.end_h ?? 150 });
  if (r.type === 'memory_flash' && Number.isInteger(P.answer) && [4, 9].includes(P.cells?.length)) {
    const G = flashGeom(P.cells.length), [x, y] = G.pos[P.answer];
    out.push({ x: x - G.s / 2 - G.inset, y: y - G.s / 2 - G.inset, w: G.s + 2 * G.inset, h: G.s + 2 * G.inset });
  }
  if (r.type === 'peek_number' && P.peek) out.push({ x: P.peek[0] - P.peek[2] / 2, y: P.peek[1] - P.peek[2] / 2, w: P.peek[2], h: P.peek[2] });
  return out;
}

/** Overlay clearance from the countdown ring to the range chip / options pills (px). */
export const CHIP_GAP = 24;
const grow = (b: Box, g: number): Box => ({ x: b.x - g, y: b.y - g, w: b.w + 2 * g, h: b.h + 2 * g });
/** Rough rendered width of a Cairo pill (Arabic ≈ 0.5 em per char, on the safe side) + padding/border. */
const pillW = (text: string, px: number, pad: number) => [...text].length * 0.5 * px + pad;

const artCache = new Map<string, Box[]>();
/** Content of full-card art (900x860 stage image): 20 px cells (>= half their pixels) pixels differ from the art's border colour. */
function artBoxes(file: string): Box[] {
  if (artCache.has(file)) return artCache.get(file)!;
  const out: Box[] = [];
  try {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-filter_complex', 'color=white:s=90x86[b];[0]scale=90:86[f];[b][f]overlay=format=auto,format=gray', '-frames:v', '1', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 20 });
    const at = (x: number, y: number) => raw[y * 90 + x];
    const border: number[] = [];
    for (let x = 0; x < 90; x++) border.push(at(x, 0), at(x, 85));
    for (let y = 0; y < 86; y++) border.push(at(0, y), at(89, y));
    border.sort((a, b) => a - b);
    const bg = border[border.length >> 1];
    for (let cy = 0; cy < 86; cy += 2) for (let cx = 0; cx < 90; cx += 2) {
      let n = 0;
      for (let y = cy; y < cy + 2; y++) for (let x = cx; x < cx + 2; x++) if (Math.abs(at(x, y) - bg) > 24) n++;
      if (n >= 2) out.push({ x: cx * 10, y: cy * 10, w: 20, h: 20 });
    }
  } catch { /* unreadable art: no measured boxes (answer boxes still apply) */ }
  artCache.set(file, out);
  return out;
}

/** Everything the viewer must see (card px): answer regions, declared `params.object_boxes`, and the measured content of
 *  full-card art (image_reveal puzzle / reveal / layers). */
export function objectBoxes(r: QuizSpec['rounds'][number], prodDir?: string): Box[] {
  const P = r.params, out: Box[] = [...answerBoxes(r), ...(P.object_boxes ?? [])];
  // follow_path: every end image must stay readable (the ring also avoids the start labels) (7wti R3: the ring covered the rock end)
  if (r.type === 'follow_path') {
    for (const e of P.ends ?? []) out.push({ x: e.x - 85, y: P.end_top ?? 690, w: 170, h: P.end_h ?? 150 });
  }
  // colour_reveal (row layout): every object + its luminance swatch below it (templates.ts: .obj top 70, 480 high; .lum 90 px, bottom -125)
  if (r.type === 'colour_reveal' && r.params.layout !== 'column' && Array.isArray(P.items) && P.items.length) {
    const n = P.items.length, w = Math.min(280, 840 / n);
    for (let i = 0; i < n; i++) out.push({ x: 450 + (i - (n - 1) / 2) * w - (w - 8) / 2, y: 70, w: w - 8, h: 480 + 125 + 8 });
  }
  // memory_flash: every card must stay readable during the flash (3x3 fills the card down to y 736)
  if (r.type === 'memory_flash' && [4, 9].includes(P.cells?.length)) {
    const G = flashGeom(P.cells.length);
    for (const [x, y] of G.pos) out.push({ x: x - G.s / 2, y: y - G.s / 2, w: G.s, h: G.s });
  }
  if (prodDir && r.type === 'image_reveal') for (const f of [P.puzzle, P.reveal, P.layers?.surround, P.layers?.targets]) if (typeof f === 'string' && /\.(png|jpe?g|webp)$/i.test(f)) out.push(...artBoxes(path.join(prodDir, f)));
  return out;
}

/** Chips on screen during the countdown (card px): the peek_number range chip and the options pills. */
export function chipBoxes(r: QuizSpec['rounds'][number]): Box[] {
  const P = r.params, out: Box[] = [];
  if (r.type === 'peek_number' && P.range_ar) {
    const px = P.range_px ?? 60, w = pillW(P.range_ar, px, 76), h = px * 1.25 + 22;
    out.push({ x: P.range_right != null ? 900 - P.range_right - w : 450 - w / 2, y: P.range_top ?? 650, w, h });
  }
  const opts: string[] = P.options_ar ?? [];
  if (opts.length) {
    const w = opts.reduce((a, o) => a + pillW(o, 46, 68), 0) + 18 * (opts.length - 1), h = 46 * 1.25 + 18;
    out.push({ x: 510 - w / 2, y: 860 - 26 - h, w, h });  // #opts: x 150-870, centred (overflow spills both ways)
  }
  return out;
}

/**
 * Explanation chip type size (owner 2026-11-08: main text >= 2.2 % cap height = 42 px on 1920; Cairo Bold cap ~0.73 em ->
 * >= 60 px measured). Candidates in order: 62 px one line, 60 px (floor) one line, 62 px two lines, 60 px two lines inside the
 * 860 px chip; placeExplain takes the first one that fits a free slot. Longer than 2 lines at the floor = plan error
 * (shorten the line). Width estimate = EXPLAIN_EM per letter (Cairo Bold Arabic ink measured 0.45-0.48 em on hvwp v5).
 */
export const EXPLAIN_PX = 62, EXPLAIN_PX_MIN = 60, EXPLAIN_MAX_W = 860, EXPLAIN_PAD = 68, EXPLAIN_MAX_LINES = 2;
/** Cairo Bold Arabic advance per letter incl. spaces (ink width measured 0.45-0.48 em on hvwp v5) */
export const EXPLAIN_EM = 0.5;
/** line-height of #explain span (a 1-line chip stays ~84 px tall, as the old 44 px chip) */
export const EXPLAIN_LH = 1.12;
export interface ExplainLayout { px: number; lines: number; w: number; h: number }
export function explainCandidates(text: string): ExplainLayout[] {
  const inner = EXPLAIN_MAX_W - EXPLAIN_PAD;
  const at = (px: number): ExplainLayout => { const one = [...text].length * EXPLAIN_EM * px, lines = Math.max(1, Math.ceil(one / inner)); return { px, lines, w: Math.round(Math.min(EXPLAIN_MAX_W, one + EXPLAIN_PAD)), h: Math.round(lines * px * EXPLAIN_LH + 14) }; };
  const all = [at(EXPLAIN_PX), at(EXPLAIN_PX_MIN)];
  const out = [...all.filter(c => c.lines === 1), ...all.filter(c => c.lines > 1 && c.lines <= EXPLAIN_MAX_LINES)];
  if (!out.length) throw new Error(`explanation_ar "${text}" is too long for ${EXPLAIN_MAX_LINES} lines at ${EXPLAIN_PX_MIN} px (owner min text size 2.2 %): shorten it to <= ${Math.floor((EXPLAIN_MAX_LINES * inner) / (EXPLAIN_EM * EXPLAIN_PX_MIN))} letters`);
  return out;
}
/** Preferred layout (first candidate), for checks that do not place the chip. */
export const explainLayout = (text: string): ExplainLayout => explainCandidates(text)[0];

/**
 * Pick a slot and a type size for the explanation chip that overlaps no answer region or puzzle object. Full-card art
 * with no free slot makes room instead (`room`: the stage scales down from its top edge as the chip arrives, >= 0.8);
 * otherwise the plan fails.
 */
export function placeExplain(r: QuizSpec['rounds'][number], prodDir?: string): { css: string; room: number | null; layout: ExplainLayout } {
  const slots: Record<string, number> = { bottom: 746, top: 14, middle: 372 };
  const order: string[] = r.params.explain_slots ?? (r.type === 'spot_difference' ? ['middle', 'top', 'bottom'] : r.type === 'follow_path' ? ['top', 'bottom', 'middle'] : ['bottom', 'top', 'middle']);
  const boxes = objectBoxes(r, prodDir);
  // spot_difference: the chip never sits on a panel (j5qw: the between-panels chip hid difference evidence)
  if (r.type === 'spot_difference') {
    const sc = r.params.panel_scale ?? 0.98, pw = (r.params.panel_w ?? 820) * sc, ph = (r.params.panel_h ?? 420) * sc, px = r.params.panel_x ?? 40;
    boxes.push({ x: px, y: r.params.top_y ?? 5, w: pw, h: ph }, { x: px, y: r.params.bottom_y ?? 435, w: pw, h: ph });
  }
  const cands = explainCandidates(r.explanation_ar ?? '');
  // bottom slot is anchored at bottom: 34px (a 2-line chip grows upward); top/middle are anchored at their top
  // last resort before room/fail: 'low' = the bottom slot pushed to 12 px above the card edge (a taller 2-line chip)
  const chipAt = (L: ExplainLayout, k: string): Box => ({ x: 450 - L.w / 2, y: k === 'bottom' ? 860 - 34 - L.h : k === 'low' ? 860 - 12 - L.h : slots[k], w: L.w, h: L.h });
  const cssOf = (k: string) => k === 'bottom' ? '' : k === 'low' ? '#explain{bottom:12px}' : `#explain{top:${slots[k]}px;bottom:auto}`;
  for (const L of cands) for (const k of [...order, 'low']) if (!boxes.some(b => hit(chipAt(L, k), b))) return { css: cssOf(k), room: null, layout: L };
  if ((r.type === 'image_reveal' || r.type === 'spot_difference') && r.params.explain_room !== false) {
    for (const L of cands) {
      const room = +Math.min(1, (860 - 34 - L.h - 12) / Math.max(...boxes.map(b => b.y + b.h))).toFixed(3);
      if (room >= 0.8) return { css: '', room, layout: L };
    }
  }
  throw new Error(`round ${r.id}: no free slot for the explanation chip at >= ${EXPLAIN_PX_MIN} px (every slot overlaps a puzzle object; owner min text size 2.2 %) — shorten it, move the art or set params.explain_slots`);
}

/** Run up to `n` async jobs at a time. */
export async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => { while (q.length) await fn(q.shift()!); }));
}

export const FONTS = path.join(P.data, 'brand', 'quiz-ar', 'fonts');
