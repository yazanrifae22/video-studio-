/**
 * Builder glue for viral-rankings cut lists (`rank_layers` + `ranking` blocks written by ranking:cutlist).
 * Called from packages/occ/src/build.ts only when those blocks are present (brand-gated there).
 *  - renderRankLayers: full-canvas RGBA PNG / alpha WebM layers via packages/ranking/py/layers.py, timed on the build's frame grid
 *  - zoneCheck: burned-in text heuristic under the rail / caption / title zones (warn-only)
 *  - rankingRightsRecheck + recordBuildUsage: per-moment rights at build time, moment_usage rows per build
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { db } from '../../shared/src/db.ts';
import { P } from '../../shared/src/paths.ts';
import { getMoment, momentRights, recordUsage, rightsCountersign } from './library.ts';
import { placedRect, titleLayout, VR, VR_FULL, VR_V2, vrRailRect, zoneInSource, type Rect } from './layout.ts';
import type { Keyframe } from '../../render/src/timeline.ts';

const run = promisify(execFile);
const PY = path.join(P.root, '.venv-asr', 'Scripts', 'python.exe');
const PYDIR = path.join(P.root, 'packages', 'ranking', 'py');

export interface RankLayers {
  n: number; reveal_order: number[]; labels: Record<string, string>;
  title: { words: { text: string; color: string }[] };
  logo: string | null; brand_text?: string; flash?: boolean;
  cta?: { variant: string; at: number; dur: number; text: string } | null;
  /** timeline seconds per reveal k at which the active card's label appears (card shows only '#N' before); omitted = label from the reveal start */
  label_at?: (number | null)[];
  /** timeline seconds from which the last reveal's rail card is swapped for the empty rail (needs empty_open); for a loop echo / hold that must not carry the last rank's label */
  rail_off_at?: number;
  /** optional (2026-10-31): compact title layout — canvas rect of the title band (default VR.title); the renderer shrinks the font to fit */
  title_layout?: 'standard' | 'compact' | 'tall' | 'full'; title_box?: Rect;
  /** default since 2026-10-31: the rail shows N empty slots from frame 0 and lights the first revealed rank at `first_light_at` s
   *  (the builder passes the spoken "Number N" time when it finds it; fallback 0.3 s) */
  empty_open?: boolean; first_light_at?: number;
  /** opt-in (default ON from ranking:cutlist, 2026-11-01): small animated SUBSCRIBE pill + like button (2.5 s: pop-in, fake tap -> SUBSCRIBED, fade out) at each `at` second;
   *  `x1`/`y0` = top-right anchor of the 332x76 badge (default: subBadgeAnchor - v1 right edge 936 under the title band, v2 centred in the lower blur strip). Off = omit the block. */
  sub_badge?: { at: number[]; x1?: number; y0?: number; pin?: boolean } | null;
  /** style v2 (2026-11-04, written by ranking:cutlist by default): two-line title, compact rail (base + active card + sublabel plate layers, slide-in reveal). Omitted = v1. */
  style?: 'v2';
}
/** build-time extras for renderRankLayers (2026-10-31): first-reveal light frame and the #1 white flash (frame + canvas rect of the footage) */
export interface LayerOpts { firstLightF?: number | null; hit?: { f: number; rect: Rect; durF: number } | null }
export interface LayerItem { key: string; file: string; kind: 'image' | 'video'; track: string; fromF: number; durF: number; keyframes?: Record<string, Keyframe[]>; transform?: { x?: number; y?: number } }
interface GridSeg { item?: number | string; startF: number; durF: number; asset_id: string; src_in: number; src_out: number; fill?: string; fit_box?: Rect | null; trim?: { top?: number; bottom?: number; left?: number; right?: number } }

export const RANK_TRACKS = ['VR Scrim', 'VR Scrim 2', 'VR Title', 'VR Title Chip', 'VR Brand', 'VR Rail', 'VR Rail Plate', 'VR Rail Card', 'VR Flash', 'VR CTA', 'VR Badge', 'VR Hit'] as const;   // paint order bottom -> top
export const SUB_BADGE_DUR = 2.5;   // keep in step with BADGE_DUR in packages/ranking/py/layers.py
export const SUB_BADGE_SIZE = { w: 332, h: 76 };

/** Frame where each reveal starts = first segment of that rank (segments are in reveal order). */
export function revealStarts(rl: RankLayers, segs: GridSeg[]) {
  return rl.reveal_order.map((rank, k) => {
    const s = segs.find(x => Number(x.item) === rank);
    if (!s) throw new Error(`rank_layers: no segment with item ${rank} (reveal ${k})`);
    return s.startF;
  });
}

/** SUBSCRIBED badge top-right anchor. v1: right edge 936, 20 px under the title band. v2 (2026-11-04, maa1 QA: the v1 spot sat on the
 *  footage's top edge next to the subject): centred in the lower blur strip, 14 px under the footage box (never above y 1440, clear of
 *  the caption pill). Plan `sub_badge.x1/y0` still override. */
export function subBadgeAnchor(rl: RankLayers): { x1: number; y0: number } {
  let x1 = VR.safe[2], y0 = (rl.title_box ?? VR.title)[3] + 20;
  if (rl.style === 'v2') { x1 = Math.round((VR.W + SUB_BADGE_SIZE.w) / 2); y0 = rl.title_layout === 'full' ? VR_FULL.badge_y0 : Math.min(1420 - SUB_BADGE_SIZE.h - 12, titleLayout(rl.title_layout, 'v2').footage[3] + 14); }   // 2026-11-08: stays above the text-safety bottom UI zone (y > 1420), overlay clearance moves it off the subject
  return { x1: rl.sub_badge?.x1 ?? x1, y0: rl.sub_badge?.y0 ?? y0 };
}

export async function renderRankLayers(rl: RankLayers, segs: GridSeg[], totalF: number, fps: number, outDir: string, W = VR.W, H = VR.H, opts: LayerOpts = {}) {
  if (W !== VR.W || H !== VR.H) throw new Error(`rank_layers need a ${VR.W}x${VR.H} canvas`);
  const starts = revealStarts(rl, segs);
  const full = rl.title_layout === 'full';
  if (full && rl.style !== 'v2') throw new Error('rank_layers: title_layout "full" needs style v2');
  for (let k = 1; k < starts.length; k++) if (starts[k] <= starts[k - 1]) throw new Error('rank_layers: segments must be in reveal order');
  const spec = {
    W, H, out_dir: outDir,
    fonts: { display: path.join(P.root, VR.fonts.display), text: path.join(P.root, VR.fonts.text) },
    colours: VR.colours,
    style: rl.style ?? 'v1',
    geometry: { title: rl.title_box ?? VR.title, rail: rl.style === 'v2' ? vrRailRect(rl.title_layout) : VR.rail, logo: VR.logo, cta: VR.cta, flashCentre: VR.flashCentre },
    ...(rl.style === 'v2' ? { v2: { title_font: VR_V2.title_font, card: VR_V2.rail_card } } : {}),
    title: rl.title,
    rail: { n: rl.n, reveal_order: rl.reveal_order, labels: rl.labels, label_at: rl.label_at ?? null, big_labels: true, empty: !!rl.empty_open },
    logo: { file: rl.logo, text: rl.brand_text ?? 'TOP RANK' },
    flash: rl.flash ? rl.reveal_order.slice(1) : [],   // never on reveal 0: frame 0 = clean action + title
    flash_dur: 0.5,
    cta: rl.cta ?? null,
    sub_badge: rl.sub_badge?.at?.length ? { fps, ...subBadgeAnchor(rl) } : null,
    white_flash: opts.hit ? { rect: opts.hit.rect, dur: +(opts.hit.durF / fps).toFixed(3) } : null,
    ...(full ? { full: { chip: VR_FULL.chip, chip_font: VR_FULL.chip_font, scrim: VR_FULL.scrim } } : {}),
  };
  for (const f of Object.values(spec.fonts)) if (!fs.existsSync(f)) throw new Error(`brand font missing: ${f}`);
  fs.mkdirSync(outDir, { recursive: true });
  const specFile = path.join(outDir, 'vr_layers.spec.json');
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 1), 'utf8');
  const { stdout } = await run(PY, ['-I', path.join(PYDIR, 'layers.py'), specFile], { maxBuffer: 1 << 24, timeout: 600_000 });
  const res = JSON.parse(String(stdout).trim().split('\n').pop()!);
  const file = (key: string) => res.files.find((f: any) => f.key === key);
  const items: LayerItem[] = [];
  // full layout (2026-11-11): title 0 - title_until, then a short visible handover (title lifts + fades, chip drops in with overshoot) to the one-line chip
  const cutF = full ? Math.min(totalF - 2, Math.round(VR_FULL.title_until * fps)) : 0, transF = full ? Math.max(4, Math.round(VR_FULL.trans_s * fps)) : 0;
  if (full) {
    const endF = Math.min(totalF, cutF + transF), fadeOut = (n: number) => ({ opacity: [{ frame: 0, value: 1, easing: 'easeIn' as const }, { frame: n - 1, value: 0 }] });
    items.push({ ...file('scrim_base'), track: 'VR Scrim', fromF: 0, durF: totalF });
    items.push({ ...file('scrim_title'), track: 'VR Scrim 2', fromF: 0, durF: cutF });
    items.push({ ...file('scrim_title'), track: 'VR Scrim 2', fromF: cutF, durF: endF - cutF, keyframes: fadeOut(endF - cutF) });
    items.push({ ...file('title'), track: 'VR Title', fromF: 0, durF: cutF });
    items.push({ ...file('title'), track: 'VR Title', fromF: cutF, durF: endF - cutF, keyframes: { ...fadeOut(endF - cutF), y: [{ frame: 0, value: 0, easing: 'easeIn' }, { frame: endF - cutF - 1, value: -4 }], scale: [{ frame: 0, value: 1, easing: 'easeIn' }, { frame: endF - cutF - 1, value: 0.9 }] } });
    const n = Math.min(transF, totalF - cutF - 1);
    items.push({ ...file('chip'), track: 'VR Title Chip', fromF: cutF, durF: n, keyframes: { opacity: [{ frame: 0, value: 0 }, { frame: Math.max(1, Math.round(n / 2)), value: 1 }], y: [{ frame: 0, value: 5, easing: VR_V2.reveal.ease }, { frame: n - 1, value: 0 }] } });
    items.push({ ...file('chip'), track: 'VR Title Chip', fromF: cutF + n, durF: totalF - cutF - n });
  } else items.push({ ...file('title'), track: 'VR Title', fromF: 0, durF: totalF });
  items.push({ ...file('logo'), track: 'VR Brand', fromF: 0, durF: totalF });
  // empty rail at frame 0 (default since 2026-10-31): N dim slots until the first revealed rank lights
  const end0 = starts.length > 1 ? starts[1] : totalF;
  const light0 = rl.empty_open ? Math.max(1, Math.min(end0 - 1, opts.firstLightF ?? Math.round((rl.first_light_at ?? 0.3) * fps))) : 0;
  if (rl.empty_open) items.push({ ...file('rail_e'), track: 'VR Rail', fromF: 0, durF: light0 });
  /** v2 slide-in: the first `n` frames carry x keyframes (from `fromX` % of W to 0, back-out overshoot), the rest is a static copy */
  const slide = (f: any, track: string, a: number, b: number, n: number, fromX: number) => {
    if (b - a <= n + 1) { items.push({ ...f, track, fromF: a, durF: b - a }); return; }
    items.push({ ...f, track, fromF: a, durF: n, keyframes: { x: [{ frame: 0, value: fromX, easing: VR_V2.reveal.ease }, { frame: n - 1, value: 0 }] } });
    items.push({ ...f, track, fromF: a + n, durF: b - a - n });
  };
  starts.forEach((f0, k) => {
    const offF = rl.empty_open && rl.rail_off_at != null ? Math.round(rl.rail_off_at * fps) : null;
    const f1 = k + 1 < starts.length ? starts[k + 1] : (offF != null && offF > f0 && offF < totalF ? offF : totalF);
    const a = k === 0 ? light0 : f0, la = rl.label_at?.[k] != null ? Math.round(rl.label_at[k]! * fps) : null;
    if (rl.style === 'v2') {   // base rail (other cards) + active card sliding in + its sublabel plate sliding out from under it (at the label beat)
      const R = VR_V2.reveal;
      items.push({ ...file(`rail_${k}b`), track: 'VR Rail', fromF: a, durF: f1 - a });
      const pa = la != null && la > a && la < f1 ? la : a + R.plate_delay;
      if (file(`rail_${k}p`) && pa < f1) slide(file(`rail_${k}p`), 'VR Rail Plate', pa, f1, R.plate_frames, R.plate_from_x);
      {   // text-safety (ppt6 v8): the card (rank badge + label) fades in at x 0 instead of sliding in from off-frame / under the rank plates
        const cf = file(`rail_${k}c`);
        if (f1 - a <= R.card_frames + 1) items.push({ ...cf, track: 'VR Rail Card', fromF: a, durF: f1 - a });
        else {
          items.push({ ...cf, track: 'VR Rail Card', fromF: a, durF: R.card_frames, keyframes: { opacity: [{ frame: 0, value: 0 }, { frame: Math.min(5, R.card_frames - 1), value: 1 }] } });
          items.push({ ...cf, track: 'VR Rail Card', fromF: a + R.card_frames, durF: f1 - a - R.card_frames });
        }
      }
      return;
    }
    if (la != null && la > a && la < f1) {
      items.push({ ...file(`rail_${k}n`), track: 'VR Rail', fromF: a, durF: la - a });
      items.push({ ...file(`rail_${k}`), track: 'VR Rail', fromF: la, durF: f1 - la });
    } else items.push({ ...file(`rail_${k}`), track: 'VR Rail', fromF: a, durF: f1 - a });
  });
  if (rl.empty_open && rl.rail_off_at != null) { const offF = Math.round(rl.rail_off_at * fps); if (offF > 0 && offF < totalF) items.push({ ...file('rail_e'), track: 'VR Rail', fromF: offF, durF: totalF - offF }); }
  if (full) {   // the rail appears with the chip (the full title owns 0 - cutF): rail items before cutF are cut there, the first frames fade in
    const RT = new Set(['VR Rail', 'VR Rail Plate', 'VR Rail Card']);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (!RT.has(it.track) || it.fromF >= cutF + transF) continue;
      const end = it.fromF + it.durF;
      if (end <= cutF) { items.splice(i, 1); continue; }
      if (it.fromF < cutF) { it.durF = end - cutF; it.fromF = cutF; delete it.keyframes; }
      const off = it.fromF - cutF;   // fade in over what is left of the handover (item-local frames)
      if (off < transF && !it.keyframes) it.keyframes = { opacity: [{ frame: 0, value: off / transF }, { frame: Math.max(1, Math.min(it.durF - 1, transF - off)), value: 1 }] };
    }
  }
  for (const [k, rank] of rl.reveal_order.entries()) {
    const f = file(`flash_${rank}`);
    if (f && k > 0) items.push({ ...f, track: 'VR Flash', fromF: starts[k], durF: Math.round(0.5 * fps) });
  }
  if (rl.cta) {
    const at = Math.round(rl.cta.at * fps), durF = Math.min(Math.round(0.8 * fps), Math.round(rl.cta.dur * fps));
    items.push({ ...file('cta'), track: 'VR CTA', fromF: at, durF });
  }
  if (spec.sub_badge) {
    const bf = file('badge'), n = Math.round(SUB_BADGE_DUR * fps);
    for (const at of rl.sub_badge!.at) { const f0 = Math.round(at * fps); if (f0 >= 0 && f0 < totalF) items.push({ ...bf, track: 'VR Badge', fromF: f0, durF: Math.min(n, totalF - f0) }); }
  }
  if (opts.hit) items.push({ ...file('white'), track: 'VR Hit', fromF: opts.hit.f, durF: Math.max(2, Math.min(opts.hit.durF, totalF - opts.hit.f)) });
  // the builder creates the layer tracks in first-appearance order: keep the paint order of RANK_TRACKS (stable sort)
  const ord = (t: string) => (RANK_TRACKS as readonly string[]).indexOf(t);
  items.sort((p, q) => ord(p.track) - ord(q.track));
  return { items, info: res.info, starts, light0 };
}

/** Layer offset in % of the canvas; slide-in keyframes on x are shifted with it (keyframes win over the static transform). */
function moveLayer(it: LayerItem, dx: number, dy: number) {
  const px = dx / VR.W * 100, py = dy / VR.H * 100;
  it.transform = { x: px, y: py };
  if (it.keyframes?.x) it.keyframes = { ...it.keyframes, x: it.keyframes.x.map(k => ({ ...k, value: k.value + px })) };
}

interface ClearanceOpts {
  timeline: unknown; outDir: string; fps: number; rl: RankLayers;
  cfg: { caption_pin?: number[]; plate_xy?: Record<string, [number, number]> };
  items: LayerItem[]; railInfo: { plate?: Rect }[];
  ranges: { from: number; to: number; y: number }[];
  pages: { text: string; t0: number; t1: number }[];
  fontPx: number; maxChars: number; captionX: number; wrap: (t: string, n: number) => string;
  texts: { at: number; dur: number; y?: number; role?: string }[]; payoffs: number[];
}

/**
 * Overlay clearance (owner 2026-11-08: "the rating boxes and captions cover the action"). Per entry the caption band (one y for the whole entry) and
 * the active rail plate, and per occurrence the subscribe badge, go to the candidate that hides the least subject evidence (packages/ranking/py/clearance.py).
 * Candidates stay inside the union text-safe box (VR.safe, config/text-safety.json): captions between the rail and y 1420, plates on the footage beside the
 * rail chips, the badge anywhere clear of rail chips. The default position is candidate 0 and wins ties. Writes qa/overlay-clearance.json.
 */
export async function overlayClearance(o: ClearanceOpts) {
  const railR = vrRailRect(o.rl.title_layout), [sx0, , sx1, sy1] = VR.safe, railBottom = railR[3], chipRight = 150;
  const boxTop = o.rl.title_layout === 'full' ? railR[1] : titleLayout(o.rl.title_layout, 'v2').footage[1];   // full: nothing above the rail top (chip)
  fs.mkdirSync(o.outDir, { recursive: true });
  const queries: any[] = [], capIdx: number[] = [];
  const hit = (a: Rect, b: Rect) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  o.ranges.forEach((r, k) => {
    const pages = o.pages.filter(p => p.t1 - 0.01 >= r.from && p.t1 - 0.01 < r.to);   // same rule as the builder: a page running across a cut belongs to the entry it ends in
    if (!pages.length) return;
    const wrapped = pages.map(p => o.wrap(p.text, o.maxChars).split('\n'));
    const w = Math.max(...wrapped.flat().map(l => l.length)) * o.fontPx * 0.62 + 70, h = Math.max(...wrapped.map(l => l.length)) * o.fontPx * 1.08 + 36;
    const cx = VR.W / 2 + o.captionX / 100 * VR.W, base = VR.H / 2 + r.y / 100 * VR.H;
    const rect = (cy: number): Rect => [Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(cx + w / 2), Math.round(cy + h / 2)];
    const grid: number[] = [];
    for (let cy = 1000; cy <= 1360; cy += 40) if (cy - h / 2 >= railBottom + 8 && cy + h / 2 <= sy1) grid.push(cy);
    const cys = [base, ...grid.filter(c => Math.abs(c - base) >= 20).sort((a, b) => Math.abs(a - base) - Math.abs(b - base))];
    const spans = pages.map(p => [p.t0, p.t1]);
    const blockers = o.texts.filter(t => t.y != null && t.role !== 'credit').map(t => { const c = VR.H / 2 + t.y! / 100 * VR.H; return [0, c - 130, VR.W, c + 130, t.at, t.at + t.dur]; });
    capIdx.push(k);
    queries.push({ id: `caption_${k}`, kind: 'caption', pin: o.cfg.caption_pin?.includes(k) ?? false, spans, candidates: cys.map(rect), blockers });
  });
  const plates = new Map<number, LayerItem[]>();
  for (const it of o.items) if (it.track === 'VR Rail Plate') { const k = Number(/rail_(\d+)p/.exec(it.key)?.[1]); plates.set(k, [...(plates.get(k) ?? []), it]); }
  for (const [k, its] of plates) {
    const b = o.railInfo[k]?.plate;
    if (!b) continue;
    const pw = b[2] - b[0], ph = b[3] - b[1], pitch = (railR[3] - railR[1]) / 5, side = sx1 - pw;
    const ys = [b[1]];
    for (let n = 1; n <= 5; n++) for (const s of [1, -1]) { const y = b[1] + s * n * pitch; if (y >= boxTop + 8 && y + ph <= railBottom + 6) ys.push(y); }
    const cands: Rect[] = [];
    for (const y of ys) { cands.push([b[0], y, b[2], y + ph]); if (side > b[0] + 40) cands.push([side, y, side + pw, y + ph]); }
    const pin = o.cfg.plate_xy?.[String(k)];
    queries.push({ id: `plate_${k}`, kind: 'plate', pin: !!pin, spans: its.map(i => [i.fromF / o.fps, (i.fromF + i.durF) / o.fps]), candidates: pin ? [[pin[0], pin[1], pin[0] + pw, pin[1] + ph]] : cands });
  }
  const badge = o.items.filter(i => i.track === 'VR Badge');
  const a = subBadgeAnchor(o.rl), bw = SUB_BADGE_SIZE.w, bh = SUB_BADGE_SIZE.h;
  const chips: Rect = [0, railR[1] - 8, chipRight, railBottom + 8];
  badge.forEach((it, n) => {
    const base: Rect = [a.x1 - bw, a.y0, a.x1, a.y0 + bh], cands: Rect[] = [base];
    for (const x1 of [sx1, Math.round((VR.W + bw) / 2), chipRight + 20 + bw])
      for (let y0 = boxTop + 10; y0 + bh <= sy1; y0 += 60) { const c: Rect = [x1 - bw, y0, x1, y0 + bh]; if (!hit(c, chips)) cands.push(c); }
    queries.push({ id: `badge_${n}`, kind: 'badge', pin: !!o.rl.sub_badge?.pin, spans: [[it.fromF / o.fps, (it.fromF + it.durF) / o.fps]], candidates: cands });
  });
  const tlFile = path.join(o.outDir, 'clearance.timeline.json'), specFile = path.join(o.outDir, 'clearance.spec.json'), outFile = path.join(o.outDir, 'overlay-clearance.json');
  fs.writeFileSync(tlFile, JSON.stringify(o.timeline), 'utf8');
  fs.writeFileSync(specFile, JSON.stringify({ timeline: tlFile, queries, payoffs: o.payoffs }, null, 1), 'utf8');
  await run(PY, ['-I', path.join(PYDIR, 'clearance.py'), specFile, outFile], { maxBuffer: 1 << 24, timeout: 600_000 });
  const res = JSON.parse(fs.readFileSync(outFile, 'utf8')) as { results: { id: string; kind: string; pin: boolean; moved: boolean; rect: Rect; covered_pct: number | null; default_covered_pct: number | null; note: string | null }[] };
  const notes: string[] = [], ranges = o.ranges.map(r => ({ ...r }));
  for (const r of res.results) {
    const n = Number(r.id.split('_')[1]);
    if (r.kind === 'caption') ranges[n].y = +(((r.rect[1] + r.rect[3]) / 2 - VR.H / 2) / VR.H * 100).toFixed(2);
    else if (r.kind === 'plate') { const b = o.railInfo[n].plate!; for (const it of plates.get(n)!) moveLayer(it, r.rect[0] - b[0], r.rect[1] - b[1]); }
    else if (r.moved) moveLayer(badge[n], r.rect[2] - a.x1, r.rect[1] - a.y0);
    if (r.moved || r.note) notes.push(`Overlay clearance ${r.id}: ${r.moved ? `moved to [${r.rect.join(',')}], hides ${r.covered_pct}% of the subject evidence (default ${r.default_covered_pct}%)` : ''}${r.note ? ` ${r.note}` : ''}`);
  }
  notes.push(`Overlay clearance: ${res.results.filter(r => r.moved).length}/${res.results.length} overlays moved (heuristic, qa/overlay-clearance.json)`);
  return { ranges, notes };
}

/** Burned-in text heuristic for every segment under the rail / caption / title zones (warn-only). */
export async function zoneCheck(segs: GridSeg[], src: Record<string, any>, outFile: string, titleBox?: Rect | null, railBox?: Rect | null) {
  const zones: Record<string, Rect> = { rail: railBox ?? VR.rail, caption: VR.caption, title: titleBox ?? VR.title };
  const spec = {
    samples: 5,
    segments: segs.map((s, i) => {
      const a = src[s.asset_id].a;
      const sw = a.width ?? 1920, sh = a.height ?? 1080;
      // manual trim (2026-10-31): the picture on the canvas is the trimmed crop, so map the zones into the crop and shift back by its origin
      const t = s.trim ?? {}, ox = t.left ?? 0, oy = t.top ?? 0, cw = sw - ox - (t.right ?? 0), ch = sh - oy - (t.bottom ?? 0);
      const placed = placedRect(cw, ch, { fit_box: s.fit_box ?? null, fill: s.fill ?? (sw > sh ? 'blur' : 'cover') });
      const shift = (r: Rect | null): Rect | null => r ? [r[0] + ox, r[1] + oy, r[2] + ox, r[3] + oy] : null;
      return { i, asset_id: s.asset_id, mezz: a.mezzanine, src_in: s.src_in, src_out: s.src_out, sw, sh,
        zones: Object.fromEntries(Object.entries(zones).map(([k, z]) => [k, shift(zoneInSource(z, placed, cw, ch))])) };
    }),
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const specFile = outFile.replace(/\.json$/, '.spec.json');
  fs.writeFileSync(specFile, JSON.stringify(spec, null, 1), 'utf8');
  const { stdout } = await run(PY, ['-I', path.join(PYDIR, 'zone_check.py'), specFile, outFile], { maxBuffer: 1 << 24, timeout: 900_000 });
  return JSON.parse(String(stdout).trim().split('\n').pop()!) as { pass: boolean; warnings: string[] };
}

/** Build-time per-moment rights recheck (the converter already gated; rights can change between convert and build). */
export function rankingRightsRecheck(entries: { moment_id: string; rank_position: number }[]) {
  const blockers: string[] = [];
  for (const e of entries) {
    const m = getMoment(e.moment_id);
    if (!m) { blockers.push(`#${e.rank_position}: moment ${e.moment_id} not found`); continue; }
    const r = momentRights(m);
    if (!r.publishable) blockers.push(`#${e.rank_position} ${e.moment_id}: ${r.reasons.join('; ')}`);
    else { const cs = rightsCountersign(m); if (!cs.countersigned) blockers.push(`#${e.rank_position} ${e.moment_id}: ${cs.reasons.join('; ')}`); }
  }
  if (blockers.length) throw new Error(`ranking rights gate failed at build time: ${blockers.join(' | ')}`);
}

/** One moment_usage row per entry per build (status in_draft) + moment creative_status used_in_draft (reservation kept). */
export function recordBuildUsage(productionId: string, version: number, entries: any[], segs: GridSeg[], fps: number) {
  const ids: number[] = [];
  for (const e of entries) {
    const s = segs[e.segment];
    ids.push(recordUsage({ production_id: productionId, version, moment_id: e.moment_id, in_ms: e.in_ms, out_ms: e.out_ms,
      timeline_start_ms: s ? Math.round(s.startF / fps * 1000) : null, rank_position: e.rank_position, reveal_index: e.reveal_index,
      transformation: { left_label: e.left_label, built: true }, status: 'in_draft' }));
    db().prepare(`UPDATE moments SET creative_status='used_in_draft', updated_at=datetime('now') WHERE moment_id=? AND creative_status IN ('usable','reserved','analyzed','metadata_verified','discovered')`).run(e.moment_id);
  }
  return ids;
}
