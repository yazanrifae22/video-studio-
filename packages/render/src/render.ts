/**
 * Direct ffmpeg compositor for studio timelines (packages/render/src/timeline.ts): one filter_complex pass, RGB
 * compositing (gbrp), h264_nvenc, full-range BT.601 output tagged like the old OpenChatCut/Remotion renders.
 *  - video/image items: contain-fit + transform (static = crop/scale of the visible part, animated = per-frame scale +
 *    overlay expressions), optional blurred background fill, opacity via colorchannelmixer (+ sendcmd when animated)
 *  - text items: PNG cards from text.ts, overlaid in their frame window; pills get their backdrop blur from the picture
 *  - audio: every item trimmed, gained (static, keyframes, fades), delayed to its frame and summed (amix normalize=0)
 */
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { renderCards } from './text.ts';
import { animated, opacityAt, propAt, sampleKeyframes, validateTimeline, type AudioItem, type ImageItem, type Item, type Keyframe, type TextItem, type Timeline, type VideoItem } from './timeline.ts';

const run = promisify(execFile);

export interface RenderOptions {
  /** scratch folder for text cards + the filter script (default: <out dir>/render-work) */
  workDir?: string;
  onProgress?: (fraction: number) => void;
  /** video encoder args (default h264_nvenc, cq 18) */
  videoArgs?: string[];
  /** parallel time chunks (default up to 4, >= 3 s each; 1 = single pass) */
  chunks?: number;
  ffmpeg?: string;
  /** quick preview: canvas scaled by this factor (e.g. 0.5; sizes stay even), fast NVENC preset p1, cq 30, 128k audio */
  preview?: number;
  /** text-safety report (packages/render/src/text-safety.ts): default = vN/qa/text-safety.json when workDir is productions/<id>/vN/render-work; false = skip */
  textSafety?: false | { out?: string; productionId?: string; version?: number; brand?: string | null };
}
export interface RenderResult { out: string; seconds: number; frames: number; inputs: number; cards: number; chunks: number; filterScript: string; /** text cards shrunk to fit the canvas margins (fit < 1) or still clipped */ fitted: { text: string; fit: number; shift: number; clipped: boolean }[]; /** vN/qa/text-safety.json result */ textSafety?: { file: string; pass: boolean; summary: string } }

interface Probe { width: number; height: number; hasAudio: boolean; hasVideo: boolean; alphaVp9: boolean; duration: number }
const probeCache = new Map<string, Probe>();
async function probe(file: string): Promise<Probe> {
  const hit = probeCache.get(file); if (hit) return hit;
  if (!fs.existsSync(file)) throw new Error(`render: media missing: ${file}`);
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height:stream_tags=alpha_mode:format=duration', '-of', 'json', file], { maxBuffer: 1 << 22 });
  const j = JSON.parse(String(stdout));
  const v = (j.streams ?? []).find((s: any) => s.codec_type === 'video');
  const p: Probe = { width: v?.width ?? 0, height: v?.height ?? 0, hasVideo: !!v, hasAudio: (j.streams ?? []).some((s: any) => s.codec_type === 'audio'),
    alphaVp9: !!v && v.codec_name === 'vp9' && String(v.tags?.alpha_mode ?? v.tags?.ALPHA_MODE ?? '') === '1', duration: parseFloat(j.format?.duration ?? '0') || 0 };
  probeCache.set(file, p);
  return p;
}

/** Painted (alpha > 0) box of an image / alpha video over all its frames, in source px [x0,y0,x1,y1]; null = opaque or unknown.
 *  Full-canvas RGBA layers (title, rail, logo) are mostly transparent: overlaying only their painted box is ~10x cheaper. */
const alphaCache = new Map<string, [number, number, number, number] | null>();
async function alphaBox(file: string, alphaVideo: boolean, w: number, h: number) {
  const st = fs.statSync(file), key = `${file}|${st.size}|${st.mtimeMs}`;
  if (alphaCache.has(key)) return alphaCache.get(key)!;
  let box: [number, number, number, number] | null = null;
  try {
    const { stderr } = await run('ffmpeg', ['-hide_banner', ...(alphaVideo ? ['-c:v', 'libvpx-vp9'] : []), '-i', file, '-vf', 'format=rgba,alphaextract,cropdetect=limit=0:round=1:reset=0:skip=0', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
    const all = [...String(stderr).matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
    if (all.length) {
      const [cw, ch, cx, cy] = all[all.length - 1].slice(1).map(Number);
      // cropdetect reports a negative/empty box when nothing is painted
      box = cw > 0 && ch > 0 ? [Math.max(0, cx - 2), Math.max(0, cy - 2), Math.min(w, cx + cw + 2), Math.min(h, cy + ch + 2)] : [0, 0, 0, 0];
    }
  } catch { box = null; }
  alphaCache.set(key, box);
  return box;
}

/** Painted (alpha > 0) box of an image / alpha video over all its frames + its size (text-safety layer check); null = opaque/unknown. */
export async function paintedBox(file: string): Promise<{ box: [number, number, number, number]; w: number; h: number } | null> {
  const p = await probe(file);
  if (!p.width || !p.height) return null;
  const isImg = /\.(png|webp|gif)$/i.test(file);
  if (!isImg && !p.alphaVp9) return null;   // opaque video: no painted box to speak of
  const b = await alphaBox(file, p.alphaVp9, p.width, p.height);
  return b ? { box: b, w: p.width, h: p.height } : null;
}

const r6 = (x: number) => +x.toFixed(6);
/** ffmpeg expression for an item-local keyframed value. `f` = expression of the local frame. Exact on integer frames:
 *  linear spans as clipped ramps, eased spans as per-frame steps (the editor sampled once per frame too). */
function kfExpr(k: readonly Keyframe[], f: string): string {
  if (!k.length) return '0';
  const terms: string[] = [String(r6(k[0].value))];
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1], d = b.value - a.value, span = b.frame - a.frame;
    if (Math.abs(d) < 1e-9) continue;
    if (span <= 0) { terms.push(`${r6(d)}*gte(${f},${b.frame})`); continue; }
    if (!a.easing || a.easing === 'linear') { terms.push(`${r6(d)}*clip((${f}-${a.frame})/${span},0,1)`); continue; }
    // ffmpeg's expression parser recurses once per '+' term (limit ~100): eased spans over 60 frames are sampled every 3 frames as
    // linear ramps (<= ~60 terms for 6 s; error far below a pixel) - 2026-11-02, 53wv (96-frame push failed "Invalid chars ')'")
    if (span > 60) {
      let pv = a.value;
      for (let g = a.frame; g < b.frame; g += 3) {
        const g2 = Math.min(b.frame, g + 3), v2 = sampleKeyframes([a, b], g2);
        if (Math.abs(v2 - pv) > 1e-9) terms.push(`${r6(v2 - pv)}*clip((${f}-${g})/${g2 - g},0,1)`);
        pv = v2;
      }
      continue;
    }
    let prev = a.value;
    for (let g = a.frame + 1; g <= b.frame; g++) { const v = sampleKeyframes([a, b], g); if (Math.abs(v - prev) > 1e-9) terms.push(`${r6(v - prev)}*gte(${f},${g})`); prev = v; }
  }
  return terms.join('+');
}

/** OpenChatCut backgroundFill appearance (strength stops 0/25/50/75/100) */
function bgFill(strength: number, W: number, H: number) {
  const S = [[0, 0, 0, 0, 1, 1], [25, 0.02, 14, 40, 0.82, 0.96], [50, 0.035, 24, 64, 0.72, 0.9], [75, 0.05, 34, 84, 0.68, 0.88], [100, 0.065, 44, 108, 0.64, 0.84]];
  const u = Math.max(1, S.findIndex(s => strength <= s[0]) < 0 ? S.length - 1 : S.findIndex(s => strength <= s[0]));
  const lo = S[u - 1], hi = S[u], p = (strength - lo[0]) / (hi[0] - lo[0]), L = (i: number) => lo[i] + (hi[i] - lo[i]) * p;
  const short = Math.min(W, H), blur = Math.max(L(2), Math.min(L(3), Math.round(short * L(1))));
  return { blur, brightness: L(4), saturate: L(5), overscan: 1 + (blur * 4) / short };
}

/** length (s) of the click-guard ramps at every audio item edge */
export const MICRO_FADE = 0.006;
/** Audio-bearing items whose head / tail continue the same file without a jump (same track + file, next item starts where the
 *  previous ended in both timeline and source, same gain): no micro-fade there, the samples are continuous. */
export function seamlessJoins(tl: Timeline) {
  const out = new Map<Item, { head: boolean; tail: boolean }>();
  for (const tr of tl.tracks) {
    const xs = (tr.items.filter(i => i.type === 'audio' || i.type === 'video') as (AudioItem | VideoItem)[]).sort((a, b) => a.fromFrame - b.fromFrame);
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i], b = xs[i + 1];
      const ok = a.src === b.src && a.fromFrame + a.durationInFrames === b.fromFrame && (a.srcStartFrame ?? 0) + a.durationInFrames === (b.srcStartFrame ?? 0)
        && (a.volume ?? 1) === (b.volume ?? 1) && !a.keyframes?.volume?.length && !b.keyframes?.volume?.length;
      if (!ok) continue;
      out.set(a, { head: out.get(a)?.head ?? false, tail: true });
      out.set(b, { head: true, tail: out.get(b)?.tail ?? false });
    }
  }
  return out;
}

interface Graph { inputs: string[][]; fc: string[]; cards: number }
/** One filter graph for `tl`: mode 'v' = picture only ([vout]), 'a' = sound only ([aout]), 'av' = both. */
async function buildGraph(tl: Timeline, work: string, mode: 'av' | 'v' | 'a'): Promise<Graph> {
  const { width: W, height: H, fps } = tl;
  const N = tl.durationInFrames, T = N / fps;
  const wantV = mode !== 'a', wantA = mode !== 'v';
  const inputs: string[][] = [];
  const addInput = (args: string[]) => { inputs.push(args); return inputs.length - 1; };
  const fc: string[] = [];
  let lbl = 0;
  const L = (p: string) => `${p}${lbl++}`;
  const enable = (from: number, dur: number) => `enable='between(n,${from},${from + dur - 1})'`;
  const sec = (f: number) => (f / fps).toFixed(6);
  const seamless = seamlessJoins(tl);

  /* ---------------------------------------------------------------- text cards (one Chrome session) */
  const texts = wantV ? tl.tracks.flatMap(t => t.items).filter((x): x is TextItem => x.type === 'text' && x.fromFrame < N) : [];
  const cards = texts.length ? await renderCards(texts, W, H, path.join(work, 'text')) : [];
  const cardOf = new Map(texts.map((t, i) => [t, cards[i]]));

  /* ---------------------------------------------------------------- picture */
  if (wantV) fc.push(`color=c=${tl.background ?? 'black'}:s=${W}x${H}:r=${fps}:d=${T.toFixed(6)},format=gbrp,trim=end_frame=${N}[base]`);
  let cur = 'base';
  const audioLabels: string[] = [];
  const videoTracks = tl.tracks.filter(t => t.kind === 'video');
  /** per-frame opacity of an item: null = fully opaque, number = constant, string = filter fragment */
  const opacityFilter = (it: Item) => {
    const vals = Array.from({ length: it.durationInFrames }, (_, f) => +opacityAt(it, f).toFixed(4));
    if (vals.every(v => v >= 0.9999)) return '';
    if (vals.every(v => v === vals[0])) return `,colorchannelmixer=aa=${vals[0]}`;
    const name = L('op');
    const cmds: string[] = [];
    vals.forEach((v, f) => { if (f === 0 || v !== vals[f - 1]) cmds.push(`${sec(it.fromFrame + f)} colorchannelmixer@${name} aa ${v}`); });
    return `,sendcmd=c='${cmds.join(';')}',colorchannelmixer@${name}=aa=${vals[0]}`;
  };
  const place = (mw: number, mh: number) => {
    const k = Math.min(W / mw, H / mh), rw = Math.round(mw * k), rh = Math.round(mh * k);
    return { rw, rh, rx: Math.round((W - rw) / 2), ry: Math.round((H - rh) / 2) };
  };
  const overlayOn = (src: string, x: number | string, y: number | string, it: Item) => {
    const o = L('v');
    fc.push(`[${cur}][${src}]overlay=x=${x}:y=${y}:format=gbrp:${enable(it.fromFrame, it.durationInFrames)}[${o}]`);
    cur = o;
  };

  const plated = texts.filter(t => cardOf.get(t)!.plate && t.fromFrame < N).length;
  let platesDone = 0;
  const plateTaps: string[] = [];
  for (const [ti, tr] of videoTracks.entries()) {
    const bottom = ti === 0;
    for (const it of [...tr.items].sort((a, b) => a.fromFrame - b.fromFrame)) {
      if (it.fromFrame >= N) continue;
      const dur = Math.min(it.durationInFrames, N - it.fromFrame);
      const item = { ...it, durationInFrames: dur } as Item;
      if (!wantV && !(item.type === 'video' && ((item as VideoItem).volume ?? 1) > 0)) continue;
      if (item.type === 'text') {
        const c = cardOf.get(it as TextItem)!;
        if (c.plate) {
          // pill backdrop blur: the picture under the pill, blurred and cut to the pill's shape. ONE split of the composite
          // feeds every pill (taken where the first pill is drawn): a split per pill made each later overlay copy the whole
          // frame and stalled long timelines. Branches are never trimmed (a trimmed branch makes its sibling queue frames).
          if (!plateTaps.length) {
            const n = plated - platesDone, a = L('s'), taps = Array.from({ length: n }, () => L('p'));
            fc.push(`[${cur}]split=${n + 1}[${a}]${taps.map(x => `[${x}]`).join('')}`);
            plateTaps.push(...taps); cur = a;
          }
          const b = plateTaps.shift()!; platesDone++;
          const m = addInput(['-i', c.plate.png]);   // one frame: alphamerge repeats it
          const bl = L('bl'), mk = L('mk'), ab = L('ab');
          fc.push(`[${b}]crop=${c.plate.w}:${c.plate.h}:${c.plate.x}:${c.plate.y},gblur=sigma=${c.plate.blur.toFixed(2)}:${enable(item.fromFrame, dur)},format=gbrap[${bl}]`);
          fc.push(`[${m}:v]format=rgba,alphaextract,setpts=PTS-STARTPTS[${mk}]`);
          fc.push(`[${bl}][${mk}]alphamerge[${ab}]`);
          overlayOn(ab, c.plate.x, c.plate.y, item);
        }
        const k = addInput(['-i', c.png]);
        const s = L('t');
        fc.push(`[${k}:v]format=gbrap,setpts=PTS-STARTPTS+${item.fromFrame}/(${fps}*TB)${opacityFilter(item)}[${s}]`);
        overlayOn(s, c.x, c.y, item);
        continue;
      }
      if (item.type === 'audio') continue;
      const media = item as VideoItem | ImageItem;
      const pr = await probe(media.src);
      const mw = pr.width || media.width || W, mh = pr.height || media.height || H;
      const isVideo = media.type === 'video' && !/\.(png|jpe?g|webp|bmp)$/i.test(media.src);
      if (!wantV && (!isVideo || !pr.hasAudio)) continue;
      const op = opacityFilter(item);
      const anim = animated(item, 'scale') || animated(item, 'x') || animated(item, 'y');
      let k: number;
      let head: string;
      if (isVideo) {
        const ss = ((media as VideoItem).srcStartFrame ?? 0) / fps;
        k = addInput([...(ss > 0 ? ['-ss', ss.toFixed(6)] : []), '-t', (dur / fps + 1).toFixed(6), ...(pr.alphaVp9 ? ['-c:v', 'libvpx-vp9'] : []), '-i', media.src]);
        // exactly `dur` frames at the timeline rate from the source start (last frame held if the file runs short)
        head = `[${k}:v]setpts=PTS-STARTPTS,fps=${fps},tpad=stop_mode=clone:stop=${dur},trim=end_frame=${dur},setpts=N/(${fps}*TB)+${item.fromFrame}/(${fps}*TB)${pr.alphaVp9 || op ? ',format=gbrap' : ''}`;
        const vol = (media as VideoItem).volume ?? 1;
        if (wantA && pr.hasAudio && (vol > 0 || item.keyframes?.volume?.length)) audioLabels.push(audioChain(k, item as VideoItem, ss));
        if (!wantV) continue;
      } else {
        const loop = !!op && op.includes('sendcmd');
        k = addInput(loop ? ['-loop', '1', '-framerate', String(fps), '-t', sec(dur), '-i', media.src] : ['-i', media.src]);
        head = `[${k}:v]setpts=PTS-STARTPTS+${item.fromFrame}/(${fps}*TB),format=gbrap`;
      }
      const vf = media.type === 'video' ? (media as VideoItem).backgroundFill : null;
      let srcL = L('m');
      if (bottom && vf != null && vf > 0) {
        const g = bgFill(vf, W, H), q = 4, qw = Math.round(W / q), qh = Math.round(H / q), b = g.brightness, s = g.saturate;
        const mx = [[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]].map(r => r.map(v => r6(v * b)));
        const bgL = L('bg'), fgL = L('fg'), bo = L('bo');
        fc.push(`${head}${op},split[${bgL}][${fgL}]`);
        // cover at quarter size -> blur -> CSS brightness/saturate matrix -> centre crop of 1/overscan -> canvas (blur is resolution-free, so cheap scalers are fine)
        const cw = Math.round(qw / g.overscan), ch = Math.round(qh / g.overscan);
        fc.push(`[${bgL}]scale=${qw}:${qh}:force_original_aspect_ratio=increase:flags=area,crop=${qw}:${qh},format=gbrp,gblur=sigma=${(g.blur / q).toFixed(3)}:steps=2,colorchannelmixer=rr=${mx[0][0]}:rg=${mx[0][1]}:rb=${mx[0][2]}:gr=${mx[1][0]}:gg=${mx[1][1]}:gb=${mx[1][2]}:br=${mx[2][0]}:bg=${mx[2][1]}:bb=${mx[2][2]},crop=${cw}:${ch},scale=${W}:${H}:flags=bilinear[${bo}]`);
        overlayOn(bo, 0, 0, item);
        srcL = fgL;
      } else fc.push(`${head}${op}[${srcL}]`);
      const pl = place(mw, mh);
      if (!anim) {
        const s = propAt(item, 'scale', 0), tx = propAt(item, 'x', 0) * W / 100, ty = propAt(item, 'y', 0) * H / 100;
        const rw = pl.rw * s, rh = pl.rh * s, rx = W / 2 + (pl.rx - W / 2) * s + tx, ry = H / 2 + (pl.ry - H / 2) * s + ty;
        const vx0 = Math.max(0, rx), vy0 = Math.max(0, ry), vx1 = Math.min(W, rx + rw), vy1 = Math.min(H, ry + rh);
        if (vx1 - vx0 < 1 || vy1 - vy0 < 1) { fc.push(`[${srcL}]nullsink`); continue; }
        // crop the source to the visible part (whole source pixels; only its painted box for alpha media), scale it to its canvas size, place it
        const ab = !isVideo || pr.alphaVp9 ? await alphaBox(media.src, isVideo && pr.alphaVp9, mw, mh) : null;
        const sx0 = Math.max(0, ab?.[0] ?? 0, Math.floor((vx0 - rx) * mw / rw)), sy0 = Math.max(0, ab?.[1] ?? 0, Math.floor((vy0 - ry) * mh / rh));
        const sx1 = Math.min(mw, ab?.[2] ?? mw, Math.ceil((vx1 - rx) * mw / rw)), sy1 = Math.min(mh, ab?.[3] ?? mh, Math.ceil((vy1 - ry) * mh / rh));
        if (sx1 - sx0 < 1 || sy1 - sy0 < 1) { fc.push(`[${srcL}]nullsink`); continue; }
        const ox = rx + sx0 * rw / mw, oy = ry + sy0 * rh / mh, ow = Math.max(1, Math.round((sx1 - sx0) * rw / mw)), oh = Math.max(1, Math.round((sy1 - sy0) * rh / mh));
        const whole = sx0 === 0 && sy0 === 0 && sx1 === mw && sy1 === mh;
        const geo = L('g');
        // crop on subsampled YUV rounds odd offsets DOWN to even (1 source px = ~3 canvas px at 3x zoom, parity 7y9l 2026-11-02):
        // odd offsets crop in RGB instead (head already ends in gbrap for alpha/opacity media)
        const rgb = /format=gbrap/.test(head + op) ? '' : 'format=gbrp,';
        const odd = (sx0 % 2) === 1 || (sy0 % 2) === 1;
        const chain = [whole ? '' : `${odd ? rgb : ''}crop=${sx1 - sx0}:${sy1 - sy0}:${sx0}:${sy0}:exact=1`, ow === sx1 - sx0 && oh === sy1 - sy0 ? '' : `scale=${ow}:${oh}:flags=bicubic`].filter(Boolean).join(',');
        fc.push(`[${srcL}]${chain || 'null'}[${geo}]`);
        overlayOn(geo, Math.round(ox), Math.round(oy), item);
      } else {
        // animated framing: per-frame scale of the contain rect, per-frame position (editor transform semantics)
        const fl = `(round(t*${fps})-${item.fromFrame})`;
        const S = item.keyframes?.scale?.length ? `(${kfExpr(item.keyframes.scale, fl)})` : String(propAt(item, 'scale', 0));
        const X = item.keyframes?.x?.length ? `(${kfExpr(item.keyframes.x, fl)})` : String(propAt(item, 'x', 0));
        const Y = item.keyframes?.y?.length ? `(${kfExpr(item.keyframes.y, fl)})` : String(propAt(item, 'y', 0));
        const geo = L('g');
        fc.push(`[${srcL}]scale=w='max(1,round(${pl.rw}*${S}))':h='max(1,round(${pl.rh}*${S}))':eval=frame:flags=bicubic[${geo}]`);
        const o = L('v');
        fc.push(`[${cur}][${geo}]overlay=x='round(${W / 2}+(${pl.rx}-${W / 2})*${S}+${X}*${W / 100})':y='round(${H / 2}+(${pl.ry}-${H / 2})*${S}+${Y}*${H / 100})':eval=frame:format=gbrp:${enable(item.fromFrame, dur)}[${o}]`);
        cur = o;
      }
    }
  }

  /* ---------------------------------------------------------------- sound */
  function audioChain(k: number, it: AudioItem | VideoItem, _ss: number) {
    const o = L('a');
    const dur = Math.min(it.durationInFrames, N - it.fromFrame);
    // micro-fades at every audio cut (2026-11-02, QA: clicks at segment joins = blockers): a hard start/end of a non-zero sample is a
    // click, so each item ramps in/out over MICRO_FADE s, except where it continues the same file seamlessly (contiguous split)
    const mf = Math.min(MICRO_FADE, dur / fps / 4);
    const cont = seamless.get(it) ?? { head: false, tail: false };
    const micro = [!cont.head && !(it.fadeInFrames ?? 0) ? `afade=t=in:st=0:d=${mf.toFixed(4)}` : '', !cont.tail && !(it.fadeOutFrames ?? 0) ? `afade=t=out:st=${Math.max(0, dur / fps - mf).toFixed(6)}:d=${mf.toFixed(4)}` : ''].filter(Boolean).map(x => `,${x}`).join('');
    const kv = it.keyframes?.volume;
    const fl = `(t*${fps})`;
    let vol: string;
    const hasFade = (it.fadeInFrames ?? 0) > 0 || (it.fadeOutFrames ?? 0) > 0;
    if (kv?.length || hasFade) {
      const base = kv?.length ? `min(2,max(0,${kfExpr(kv, fl)}))` : String(it.volume ?? 1);
      const fi = it.fadeInFrames ?? 0, fo = it.fadeOutFrames ?? 0;
      const fade = hasFade ? `*max(0,min(1,${[fi > 0 ? `${fl}/${fi}` : '', fo > 0 ? `(${dur}-${fl})/${fo}` : ''].filter(Boolean).map(x => `min(1,${x})`).join('*') || '1'}))` : '';
      vol = `volume=volume='${base}${fade}':eval=frame`;
    } else vol = `volume=${r6(it.volume ?? 1)}`;
    const delay = Math.round((it.fromFrame / fps) * 48000);
    fc.push(`[${k}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,atrim=end=${sec(dur)},asetpts=PTS-STARTPTS${micro},${vol}${delay > 0 ? `,adelay=delays=${delay}S:all=1` : ''}[${o}]`);
    return o;
  }
  if (wantA) for (const tr of tl.tracks.filter(t => t.kind === 'audio')) for (const it of tr.items as AudioItem[]) {
    if (it.fromFrame >= N) continue;
    const pr = await probe(it.src);
    if (!pr.hasAudio) continue;
    if ((it.volume ?? 1) <= 0 && !it.keyframes?.volume?.length) continue;
    const ss = (it.srcStartFrame ?? 0) / fps;
    const dur = Math.min(it.durationInFrames, N - it.fromFrame);
    const k = addInput([...(ss > 0 ? ['-ss', ss.toFixed(6)] : []), '-t', (dur / fps + 0.5).toFixed(6), '-i', it.src]);
    audioLabels.push(audioChain(k, it, ss));
  }
  if (wantV) fc.push(`[${cur}]scale=out_color_matrix=bt601:out_range=full,format=yuv420p[vout]`);
  if (wantA) {
    // a silent bed from t=0 is always amix input 0 (2026-11-04, maa1 v5): when the first-listed input started late (a leading run of muted
    // Picture items, its audio delayed 6 s) the mix began at that input's first pts, the wav dropped the lead and every sound landed 6 s early
    if (audioLabels.length) { const z = L('a'); fc.push(`anullsrc=r=48000:cl=stereo,atrim=end=${T.toFixed(6)}[${z}]`);
      fc.push(`[${z}]${audioLabels.map(a => `[${a}]`).join('')}amix=inputs=${audioLabels.length + 1}:normalize=0:dropout_transition=0:duration=longest,apad=whole_dur=${T.toFixed(6)},atrim=end=${T.toFixed(6)}[aout]`); }
    else fc.push(`anullsrc=r=48000:cl=stereo,atrim=end=${T.toFixed(6)}[aout]`);
  }
  return { inputs, fc, cards: new Set(cards.map(c => c.png)).size };
}

/** The part of a timeline inside frames [a, b), re-based to frame 0. Items cut at the edges keep their source sync and
 *  keyframes; a cut item's fades/opacity are baked into per-frame opacity keyframes. */
export function sliceTimeline(tl: Timeline, a: number, b: number): Timeline {
  const tracks = tl.tracks.map(tr => ({ ...tr, items: tr.items.flatMap(it => {
    const s = Math.max(a, it.fromFrame), e = Math.min(b, it.fromFrame + it.durationInFrames);
    if (e <= s) return [];
    const cut = s - it.fromFrame;
    const x: any = { ...it, fromFrame: s - a, durationInFrames: e - s };
    if (cut > 0 && (it.type === 'video' || it.type === 'audio')) x.srcStartFrame = ((it as VideoItem).srcStartFrame ?? 0) + cut;
    if (it.keyframes) x.keyframes = Object.fromEntries(Object.entries(it.keyframes).map(([k, ks]) => [k, (ks ?? []).map(q => ({ ...q, frame: q.frame - cut }))]));
    if ((it.fadeInFrames || it.fadeOutFrames) && it.type !== 'audio' && (cut > 0 || e - s < it.durationInFrames)) {
      x.keyframes = { ...(x.keyframes ?? {}), opacity: Array.from({ length: e - s }, (_, f) => ({ frame: f, value: +opacityAt(it, f + cut).toFixed(4) })) };
      delete x.fadeInFrames; delete x.fadeOutFrames;
      if (x.transform) { x.transform = { ...x.transform }; delete x.transform.opacity; }
    }
    return [x as Item];
  }) }));
  return { ...tl, durationInFrames: b - a, tracks };
}

function ffmpegRun(args: string[], ff: string, onTime?: (sec: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(ff, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stdout.on('data', (b: Buffer) => {
      const m = /out_time_us=(\d+)/g; let x: RegExpExecArray | null, us = -1;
      while ((x = m.exec(b.toString()))) us = +x[1];
      if (us >= 0) onTime?.(us / 1e6);
    });
    p.stderr.on('data', (b: Buffer) => { err = (err + b.toString()).slice(-4000); });
    p.on('error', reject);
    p.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg render failed (${code}): ${err.slice(-1500)}`)));
  });
}

/**
 * Render a timeline to an MP4 (h264_nvenc, AAC). An ffmpeg filter graph runs on about one core, so the picture is cut
 * into up to `chunks` time ranges rendered side by side and joined by stream copy (each part starts on an IDR frame);
 * the sound is mixed once over the whole timeline.
 */
export async function renderTimeline(tl: Timeline, out: string, opts: RenderOptions = {}): Promise<RenderResult> {
  const res = await renderTimelineCore(tl, out, opts);
  // text safety (owner 2026-11-08): every build writes vN/qa/text-safety.json (work dir productions/<id>/vN/render-work) or opts.textSafety.out
  if (!opts.preview && opts.textSafety !== false) {
    const { autoTarget, textSafety, textSafetySummary } = await import('./text-safety.ts');
    const auto = opts.workDir ? autoTarget(opts.workDir) : null;
    const o = typeof opts.textSafety === 'object' ? opts.textSafety : {};
    const outFile = o.out ?? auto?.out;
    if (outFile) {
      const work = opts.workDir ?? path.join(path.dirname(out), 'render-work');
      const r = await textSafety(tl, { productionId: o.productionId ?? auto?.productionId, version: o.version ?? auto?.version, brand: o.brand, out: outFile, workDir: work });
      res.textSafety = { file: outFile, pass: r.pass, summary: textSafetySummary(r) };
    }
  }
  return res;
}
async function renderTimelineCore(tl: Timeline, out: string, opts: RenderOptions = {}): Promise<RenderResult> {
  if (opts.preview && opts.preview > 0 && opts.preview < 1) {
    const ev = (n: number) => Math.max(2, Math.round((n * opts.preview!) / 2) * 2);
    tl = { ...tl, width: ev(tl.width), height: ev(tl.height) };
    opts = { ...opts, videoArgs: opts.videoArgs ?? ['-c:v', 'h264_nvenc', '-preset', 'p1', '-rc', 'vbr', '-cq', '30', '-b:v', '0', '-profile:v', 'high', '-g', String(tl.fps * 2)] };
  }
  validateTimeline(tl);
  const t0 = Date.now();
  const { fps } = tl, N = tl.durationInFrames, T = N / fps;
  const work = opts.workDir ?? path.join(path.dirname(out), 'render-work');
  fs.mkdirSync(work, { recursive: true });
  const ff = opts.ffmpeg ?? 'ffmpeg';
  const venc = opts.videoArgs ?? ['-c:v', 'h264_nvenc', '-preset', 'p5', '-tune', 'hq', '-rc', 'vbr', '-cq', '18', '-b:v', '0', '-maxrate', '30M', '-bufsize', '60M', '-profile:v', 'high', '-g', String(fps * 2)];
  const vtags = ['-color_range', 'pc', '-colorspace', 'bt470bg', '-r', String(fps)];
  const chunks = Math.max(1, Math.min(opts.chunks ?? 4, Math.floor(N / (fps * 3))));
  // text cards once for the whole timeline (one Chrome session); chunk graphs hit the card cache
  const texts = tl.tracks.flatMap(t => t.items).filter((x): x is TextItem => x.type === 'text');
  const allCards = texts.length ? await renderCards(texts, tl.width, tl.height, path.join(work, 'text')) : [];
  const fitted = [...new Map(texts.map((t, i) => [t.text, allCards[i]] as const).filter(([, c]) => (c.fit ?? 1) < 1 || !!c.shift || c.clipped).map(([t, c]) => [t, { text: t, fit: c.fit ?? 1, shift: c.shift ?? 0, clipped: !!c.clipped }])).values()];
  const write = (name: string, g: Graph) => { const f = path.join(work, name); fs.writeFileSync(f, g.fc.join(';\n'), 'utf8'); return f; };
  const progress = new Array(chunks + 1).fill(0);
  let lastP = -1;
  const tick = (i: number, sec: number, of: number) => {
    progress[i] = Math.min(1, sec / of);
    const fr = progress.reduce((a, b) => a + b, 0) / progress.length;
    if (opts.onProgress && fr - lastP >= 0.05) { lastP = fr; opts.onProgress(fr); }
  };
  const head = ['-hide_banner', '-v', 'error', '-y', '-nostats', '-progress', 'pipe:1'];
  if (chunks === 1) {
    const g = await buildGraph(tl, work, 'av');
    const script = write('filter_complex.txt', g);
    const args = [...head, ...g.inputs.flat(), '-/filter_complex', script, '-map', '[vout]', '-map', '[aout]',
      ...venc, ...vtags, '-frames:v', String(N), '-c:a', 'aac', '-b:a', opts.preview ? '128k' : '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out];
    fs.writeFileSync(path.join(work, 'ffmpeg.args.json'), JSON.stringify([args], null, 1), 'utf8');
    await ffmpegRun(args, ff, s => tick(0, s, T));
    return { out, seconds: (Date.now() - t0) / 1000, frames: N, inputs: g.inputs.length, cards: g.cards, chunks, filterScript: script, fitted };
  }
  const cutAt = Array.from({ length: chunks + 1 }, (_, i) => (i === chunks ? N : Math.round((N * i) / chunks)));
  const jobs: { args: string[]; i: number; of: number }[] = [];
  const parts: string[] = [];
  let inputs = 0;
  const cards = new Set(allCards.map(c => c.png)).size;
  for (let i = 0; i < chunks; i++) {
    const g = await buildGraph(sliceTimeline(tl, cutAt[i], cutAt[i + 1]), work, 'v');
    const part = path.join(work, `part${i}.mp4`); parts.push(part);
    const script = write(`filter_complex.part${i}.txt`, g);
    inputs += g.inputs.length;
    jobs.push({ i, of: (cutAt[i + 1] - cutAt[i]) / fps, args: [...head, ...g.inputs.flat(), '-/filter_complex', script, '-map', '[vout]', ...venc, ...vtags, '-frames:v', String(cutAt[i + 1] - cutAt[i]), '-an', part] });
  }
  const ga = await buildGraph(tl, work, 'a');
  const wav = path.join(work, 'mix.wav');
  jobs.push({ i: chunks, of: T, args: [...head, ...ga.inputs.flat(), '-/filter_complex', write('filter_complex.audio.txt', ga), '-map', '[aout]', '-t', T.toFixed(6), '-c:a', 'pcm_f32le', wav] });
  fs.writeFileSync(path.join(work, 'ffmpeg.args.json'), JSON.stringify(jobs.map(j => j.args), null, 1), 'utf8');
  await Promise.all(jobs.map(j => ffmpegRun(j.args, ff, s => tick(j.i, s, j.of))));
  const list = path.join(work, 'parts.txt');
  fs.writeFileSync(list, parts.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
  await ffmpegRun(['-hide_banner', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-color_range', 'pc', '-colorspace', 'bt470bg',
    '-c:a', 'aac', '-b:a', opts.preview ? '128k' : '256k', '-ar', '48000', '-ac', '2', '-t', T.toFixed(6), '-movflags', '+faststart', out], ff);
  for (const p of [...parts, wav]) fs.rmSync(p, { force: true });
  return { out, seconds: (Date.now() - t0) / 1000, frames: N, inputs, cards, chunks, filterScript: path.join(work, 'filter_complex.part0.txt'), fitted };
}

export async function renderTimelineFile(file: string, out: string, opts: RenderOptions = {}) {
  const tl = JSON.parse(fs.readFileSync(file, 'utf8')) as Timeline;
  // relative media paths resolve against the timeline's folder
  for (const tr of tl.tracks) for (const it of tr.items) if ('src' in it && !path.isAbsolute(it.src)) it.src = path.resolve(path.dirname(file), it.src);
  return renderTimeline(tl, out, opts);
}
