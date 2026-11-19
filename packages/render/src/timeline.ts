/**
 * Plain, editable timeline JSON for the studio's ffmpeg compositor (replaces OpenChatCut renders, owner 2026-11-02).
 * Semantics mirror what OpenChatCut (Remotion) did with the same items, so a timeline written from the same build data
 * renders the same picture:
 *  - tracks[] are painted bottom -> top in array order (video tracks); audio tracks are summed.
 *  - visual media is contain-fit into the canvas (rounded rect), then the item transform applies around the canvas
 *    centre: translate(x % of W, y % of H) then scale.
 *  - text items render in a 1920x1080 design box scaled to the canvas (x0.5625 on 1080x1920), centred, 96 px side
 *    padding, CSS text props (textShadow, lineHeight, optional pill: bgColor/bgRadius/bgPadding, backdrop blur 20 px).
 *  - keyframes are item-local frames; easing on the LEFT keyframe (linear | easeIn | easeOut | easeInOut | [x1,y1,x2,y2]);
 *    volume keyframes override the static volume; fades are linear in frames.
 *  - backgroundFill (strength 0-100) = blurred, dimmed cover copy of the same media under the picture (bottom track only).
 */
export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | [number, number, number, number];
export interface Keyframe { frame: number; value: number; easing?: Easing }
export type KeyProp = 'opacity' | 'scale' | 'x' | 'y' | 'volume';
export interface Transform { x?: number; y?: number; scale?: number; opacity?: number }

interface Base {
  id?: string; name?: string;
  fromFrame: number; durationInFrames: number;
  transform?: Transform;
  keyframes?: Partial<Record<KeyProp, Keyframe[]>>;
  fadeInFrames?: number; fadeOutFrames?: number;
}
export interface VideoItem extends Base {
  type: 'video'; src: string;
  /** first source frame (at the timeline fps) */
  srcStartFrame?: number;
  /** media size as the editor saw it; probed when omitted */
  width?: number; height?: number;
  /** linear gain of the media's own audio (0 = muted); default 1 */
  volume?: number;
  /** blurred cover fill under the picture, strength 0-100 (OpenChatCut backgroundFillStrength) */
  backgroundFill?: number | null;
}
export interface ImageItem extends Base { type: 'image'; src: string; width?: number; height?: number }
export interface TextProps {
  fontSize?: number; fontWeight?: number; color?: string; align?: 'left' | 'center' | 'right'; fontFamily?: string; fontStyle?: string;
  letterSpacing?: number | string; lineHeight?: number; textShadow?: string;
  bgEnabled?: boolean; bgColor?: string; bgRadius?: number; bgPaddingX?: number; bgPaddingY?: number; bgBorder?: string; bgBlur?: number; bgShadow?: string; accent?: Record<string, string>;
}
export interface TextItem extends Base {
  type: 'text'; text: string; props?: TextProps; width?: number; height?: number;
  /** text-safety role (owner 2026-11-08): 'main' (default, min cap 2.2 %) | 'label' (round counters, rail sublabels, badges, chips: 1.4 %); config/text-safety.json */
  role?: 'main' | 'label';
}
export interface AudioItem extends Base { type: 'audio'; src: string; srcStartFrame?: number; volume?: number }
export type Item = VideoItem | ImageItem | TextItem | AudioItem;
export interface Track { name: string; kind: 'video' | 'audio'; items: Item[] }
export interface Timeline {
  version: 1; width: number; height: number; fps: number; durationInFrames: number;
  background?: string;
  tracks: Track[];
  /** free-form provenance (production, version, builder) */
  meta?: Record<string, unknown>;
}

/* ---------------------------------------------------------------- keyframe math (same curves as the editor) */
const NAMED: Record<string, [number, number, number, number]> = { easeIn: [0.42, 0, 1, 1], easeOut: [0, 0, 0.58, 1], easeInOut: [0.42, 0, 0.58, 1] };
const bez = (c1: number, c2: number, t: number) => { const u = 1 - t; return 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t; };
const bezSlope = (c1: number, c2: number, t: number) => { const u = 1 - t; return 3 * u * u * c1 + 6 * u * t * (c2 - c1) + 3 * t * t * (1 - c2); };
function solveT(x: number, x1: number, x2: number) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) { const e = bez(x1, x2, t) - x; if (Math.abs(e) < 1e-9) return t; const s = bezSlope(x1, x2, t); if (Math.abs(s) < 1e-6) break; t = Math.min(1, Math.max(0, t - e / s)); }
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { t = (lo + hi) / 2; if (bez(x1, x2, t) < x) lo = t; else hi = t; }
  return t;
}
export function easeProgress(p: number, e?: Easing) {
  const c = Math.max(0, Math.min(1, p));
  const cp = !e || e === 'linear' ? null : Array.isArray(e) ? e : NAMED[e] ?? null;
  return cp ? bez(cp[1], cp[3], solveT(c, cp[0], cp[2])) : c;
}
export function sampleKeyframes(k: readonly Keyframe[], f: number) {
  if (!k.length) return 0;
  if (f <= k[0].frame) return k[0].value;
  const last = k[k.length - 1];
  if (f >= last.frame) return last.value;
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (f <= b.frame) { const span = b.frame - a.frame; return span <= 0 ? b.value : a.value + easeProgress((f - a.frame) / span, a.easing) * (b.value - a.value); }
  }
  return last.value;
}
export const fadeFactor = (f: number, dur: number, fin = 0, fout = 0) => {
  let x = 1;
  if (fin > 0) x = Math.min(x, f / fin);
  if (fout > 0) x = Math.min(x, (dur - f) / fout);
  return Math.max(0, Math.min(1, x));
};
/** item-local value of a transform prop (keyframes win over the static transform) */
export function propAt(it: Item, p: 'scale' | 'x' | 'y', f: number) {
  const k = it.keyframes?.[p];
  return k?.length ? sampleKeyframes(k, f) : (it.transform?.[p] ?? (p === 'scale' ? 1 : 0));
}
export function opacityAt(it: Item, f: number) {
  const k = it.keyframes?.opacity;
  const o = k?.length ? sampleKeyframes(k, f) : it.transform?.opacity ?? 1;
  return fadeFactor(f, it.durationInFrames, it.fadeInFrames, it.fadeOutFrames) * Math.max(0, Math.min(1, o));
}
export function volumeAt(it: AudioItem | VideoItem, f: number) {
  const k = it.keyframes?.volume;
  const v = k?.length ? Math.min(2, Math.max(0, sampleKeyframes(k, f))) : it.volume ?? 1;
  return v * fadeFactor(f, it.durationInFrames, it.fadeInFrames, it.fadeOutFrames);
}
export const animated = (it: Item, p: KeyProp) => (it.keyframes?.[p]?.length ?? 0) > 1 && new Set(it.keyframes![p]!.map(k => k.value)).size > 1;

export function validateTimeline(tl: Timeline) {
  const errs: string[] = [];
  if (tl.version !== 1) errs.push(`version ${tl.version} (expected 1)`);
  if (!(tl.width > 0 && tl.height > 0 && tl.fps > 0 && tl.durationInFrames > 0)) errs.push('width/height/fps/durationInFrames must be > 0');
  for (const tr of tl.tracks) for (const it of tr.items) {
    const where = `${tr.name}/${it.name ?? it.id ?? it.type}@${it.fromFrame}`;
    if (!Number.isInteger(it.fromFrame) || !Number.isInteger(it.durationInFrames) || it.durationInFrames < 1) errs.push(`${where}: fromFrame/durationInFrames must be integers, duration >= 1`);
    if ((tr.kind === 'audio') !== (it.type === 'audio')) errs.push(`${where}: ${it.type} item on a ${tr.kind} track`);
    if (it.type === 'text' && !it.text) errs.push(`${where}: empty text`);
  }
  if (errs.length) throw new Error(`invalid timeline: ${errs.slice(0, 6).join('; ')}`);
}
