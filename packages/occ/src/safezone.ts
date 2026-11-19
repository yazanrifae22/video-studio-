/**
 * Credit plate placement (2026-11-02, QA: credit overlays sat on hair / foreheads / the subject). A credit without an explicit y
 * goes to the free band: candidate bands in the top safe area are scored by edge density of the picture under them (sampled
 * frames framed like the build: cover = centre crop, blur = contained picture with a quiet fill), bands colliding with other
 * overlay texts at the same time are excluded, and the quietest band wins (ties -> the higher band).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
/** candidate credit centres, % of canvas height from centre (top safe area: below the ~14 % platform UI, above the face zone) */
export const CREDIT_BANDS = [-33, -30, -27, -24, -21];
export const GW = 108, GH = 192;   // edge map size (1/10 of 1080x1920)

/** Edge map (GW x GH, 0-255) of one frame as it sits on a W x H canvas. */
export async function edgeMap(file: string, t: number, fill: 'cover' | 'blur', W = 1080, H = 1920): Promise<Uint8Array> {
  const fit = fill === 'cover' ? `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`
    : `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`;
  const { stdout } = await run('ffmpeg', ['-v', 'error', '-ss', Math.max(0, t).toFixed(3), '-i', file, '-frames:v', '1', '-vf', `${fit},format=gray,edgedetect=low=0.08:high=0.25,scale=${GW}:${GH}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { encoding: 'buffer', maxBuffer: 1 << 22 }) as any;
  const b = stdout as Buffer;
  return new Uint8Array(b.buffer, b.byteOffset, Math.min(b.length, GW * GH));
}

/** Mean edge level of the canvas rows [y0, y1) px (canvas height H) over the middle 80 % of the width. */
export function bandEnergy(map: Uint8Array, y0: number, y1: number, H = 1920) {
  const r0 = Math.max(0, Math.floor(y0 / H * GH)), r1 = Math.min(GH, Math.ceil(y1 / H * GH));
  const c0 = Math.round(GW * 0.1), c1 = Math.round(GW * 0.9);
  let s = 0, n = 0;
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) { s += map[r * GW + c] ?? 0; n++; }
  return n ? s / n : 0;
}

export interface Box { y0: number; y1: number }
/** Pick the quietest candidate band. `energy[k]` = summed energy of band k (Infinity = blocked). Ties (within 15 %) -> lowest index. */
export function pickBand(energy: number[]) {
  const ok = energy.map((e, k) => [e, k] as const).filter(([e]) => Number.isFinite(e));
  if (!ok.length) return -1;
  const min = Math.min(...ok.map(([e]) => e));
  return ok.find(([e]) => e <= min * 1.15 + 0.05)![1];
}

/** y (% from centre) of the credit's band; null when every band is blocked. */
export async function placeCredit(o: { heightPx: number; frames: { file: string; t: number; fill: 'cover' | 'blur' }[]; blocked: Box[]; W?: number; H?: number }) {
  const H = o.H ?? 1920, W = o.W ?? 1080;
  const maps = await Promise.all(o.frames.map(f => edgeMap(f.file, f.t, f.fill, W, H).catch(() => null)));
  const energy = CREDIT_BANDS.map(y => {
    const cy = H / 2 + y / 100 * H, b = { y0: cy - o.heightPx / 2 - 8, y1: cy + o.heightPx / 2 + 8 };
    if (o.blocked.some(x => x.y0 < b.y1 && b.y0 < x.y1)) return Infinity;
    return maps.reduce((s, m) => s + (m ? bandEnergy(m, b.y0, b.y1, H) : 0), 0);
  });
  const k = pickBand(energy);
  return { y: k < 0 ? null : CREDIT_BANDS[k], energy: energy.map(e => Number.isFinite(e) ? +e.toFixed(1) : null) };
}
