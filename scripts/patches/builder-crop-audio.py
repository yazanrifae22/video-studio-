"""One-off patch: auto-crop baked-in borders, manual trims, audio levelling for unmuted segments, fades, tone bed."""
import sys

p = 'packages/occ/src/build.ts'
s = open(p, encoding='utf-8').read()

a = s.index("const LARGE_BYTES = 300e6;")
b = s.index("/* ------------------------------------------------------------------ main */")
NEW = r'''const LARGE_BYTES = 300e6;
interface Crop { w: number; h: number; x: number; y: number }
interface SegMedia { file: string; offset: number; end: number; width: number; height: number; cropped: boolean; leveled: boolean }

/** Active picture area inside baked-in black borders (ffmpeg cropdetect over the used window). null = no meaningful bars. */
async function detectCrop(mezz: string, a: number, b: number, w: number, h: number): Promise<Crop | null> {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-i', mezz, '-t', Math.max(0.5, b - a).toFixed(3), '-vf', 'cropdetect=limit=24:round=2:reset=0', '-an', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const all = [...stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!all.length) return null;
  const [cw, ch, cx, cy] = all[all.length - 1].slice(1).map(Number);
  return cw < w * 0.97 || ch < h * 0.97 ? { w: cw, h: ch, x: cx, y: cy } : null;
}

/** Measured integrated loudness (LUFS) of a source window. */
async function windowLufs(mezz: string, a: number, b: number) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-ss', a.toFixed(3), '-i', mezz, '-t', (b - a).toFixed(3), '-vn', '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 1 << 26 });
  const m = /I:\s+(-?[\d.]+) LUFS/.exec(stderr.slice(stderr.lastIndexOf('Summary:')));
  return m ? Number(m[1]) : null;
}

/**
 * The file to import for a segment. A cached, re-encoded window (2 s handles, frame-accurate) is made when the source is
 * large (OpenChatCut upload limit), has baked-in black borders or a manual edge trim (cropped to the real picture), or
 * keeps its own audio (levelled to -16 LUFS so it sits with narration). Otherwise the whole mezzanine is imported.
 */
async function windowFor(row: any, seg: Segment): Promise<SegMedia> {
  const mezz = row.a.mezzanine as string;
  const W0 = row.a.width ?? 1920, H0 = row.a.height ?? 1080;
  let crop = await detectCrop(mezz, seg.src_in, seg.src_out, W0, H0);
  if (seg.trim) {
    const c = crop ?? { w: W0, h: H0, x: 0, y: 0 };
    const t = { top: 0, bottom: 0, left: 0, right: 0, ...seg.trim };
    crop = { x: c.x + t.left, y: c.y + t.top, w: c.w - t.left - t.right, h: c.h - t.top - t.bottom };
    crop.w -= crop.w % 2; crop.h -= crop.h % 2;
  }
  const lufs = !seg.mute_source ? await windowLufs(mezz, seg.src_in, seg.src_out) : null;
  const level = lufs != null && Math.abs(lufs + 16) > 1.5;
  if (fs.statSync(mezz).size < LARGE_BYTES && !crop && !level) return { file: mezz, offset: 0, end: seg.src_out, width: W0, height: H0, cropped: false, leveled: false };
  const a = Math.max(0, Math.floor((seg.src_in - 2) * 10) / 10), b = Math.min(row.a.duration ?? seg.src_out + 2, Math.ceil((seg.src_out + 2) * 10) / 10);
  const tag = `${crop ? `_c${crop.w}x${crop.h}+${crop.x}+${crop.y}` : ''}${level ? `_l${Math.round(lufs!)}` : ''}`;
  const file = path.join(P.media, 'windows', `${String(row.fingerprint).slice(0, 16)}_${a.toFixed(1)}-${b.toFixed(1)}${tag}.mp4`);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file.replace(/\.mp4$/, '.part.mp4');
    const vf = crop ? ['-vf', `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y}`] : [];
    const af = level ? ['-af', `volume=${(-16 - lufs!).toFixed(2)}dB,alimiter=limit=0.89`] : [];
    await run('ffmpeg', ['-v', 'error', '-y', '-ss', a.toFixed(3), '-i', mezz, '-t', (b - a).toFixed(3), ...vf, ...af, '-c:v', 'h264_nvenc', '-preset', 'p5', '-cq', '18',
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], { maxBuffer: 1 << 26 });
    fs.renameSync(tmp, file);
  }
  return { file, offset: a, end: b, width: crop?.w ?? W0, height: crop?.h ?? H0, cropped: !!crop, leveled: level };
}

/** Original, rights-free ambience bed: soft brown noise + a low two-note drone, about -32 LUFS (fills dead air under muted footage). */
async function toneBed(seconds: number, out: string) {
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await run('ffmpeg', ['-v', 'error', '-y',
    '-f', 'lavfi', '-i', `anoisesrc=color=brown:amplitude=0.05:duration=${seconds.toFixed(2)}`,
    '-f', 'lavfi', '-i', `sine=frequency=55:duration=${seconds.toFixed(2)}`,
    '-f', 'lavfi', '-i', `sine=frequency=82.41:duration=${seconds.toFixed(2)}`,
    '-filter_complex', `[0]lowpass=f=400,volume=0.6[n];[1]volume=0.08[a];[2]volume=0.05[b];[n][a][b]amix=inputs=3:normalize=0,afade=t=in:d=1.5,afade=t=out:st=${Math.max(0, seconds - 2).toFixed(2)}:d=2,loudnorm=I=-32:TP=-6[o]`,
    '-map', '[o]', '-ar', '48000', '-ac', '2', out], { maxBuffer: 1 << 26 });
  return out;
}

'''
s = s[:a] + NEW + s[b:]


def rep(old, new):
    global s
    if old not in s:
        sys.exit(f'patch anchor not found: {old[:80]}')
    s = s.replace(old, new)


rep("interface Segment { asset_id: string; src_in: number; src_out: number;",
    "interface Segment { asset_id: string; src_in: number; src_out: number; trim?: { top?: number; bottom?: number; left?: number; right?: number };")
rep("  credits?: string[]; target_duration?: number; caption_clean?: boolean; emphasis?: string[];",
    "  credits?: string[]; target_duration?: number; caption_clean?: boolean; emphasis?: string[]; bed?: 'tone' | null;")
rep("""    const segMedia = await Promise.all(segs.map(s => windowFor(src[s.asset_id], s.src_in, s.src_out)));
    segMedia.forEach((m, i) => { if (m.offset) note(`Segment ${i}: importing a ${(m.end - m.offset).toFixed(1)} s window of a large source`); });
    const media = [...new Set(segMedia.map(m => m.file)), ...narr.map(x => x.file), ...(cl.music ? [src[cl.music.asset_id].a.mezzanine] : [])];""",
    """    const segMedia: SegMedia[] = [];
    for (const s of segs) segMedia.push(await windowFor(src[s.asset_id], s));
    segMedia.forEach((m, i) => {
      if (m.cropped) note(`Segment ${i}: cropped to the real picture (${m.width}x${m.height}), removing baked-in borders`);
      if (m.leveled) note(`Segment ${i}: source audio levelled to -16 LUFS to sit with the narration`);
    });
    const bedFile = cl.bed === 'tone' ? await toneBed(total, path.join(vdir, 'bed_tone.wav')) : null;
    const media = [...new Set(segMedia.map(m => m.file)), ...narr.map(x => x.file), ...(cl.music ? [src[cl.music.asset_id].a.mezzanine] : []), ...(bedFile ? [bedFile] : [])];""")
rep("""      const base = (i: number) => { const s = segs[i]; const sw = src[s.asset_id].a.width ?? 1920, sh = src[s.asset_id].a.height ?? 1080;""",
    """      const base = (i: number) => { const s = segs[i]; const sw = segMedia[i].width, sh = segMedia[i].height;""")
rep("""        return { type: 'video', itemId: ids[i], volume: s.mute_source ? 0 : (s.volume ?? 1),""",
    """        const fades = s.mute_source ? {} : { fadeInSeconds: 0.25, fadeOutSeconds: 0.35 };
        return { type: 'video', itemId: ids[i], volume: s.mute_source ? 0 : (s.volume ?? 1), ...fades,""")
rep("""    if (narr.length || cl.music) await session('Add narration and music', async id => {
      const adds: any[] = narr.map(x => ({ type: 'audio', assetId: pid(x.file), trackId: tracks.Narration, fromFrame: F(x.at, fps) }));""",
    """    if (narr.length || cl.music || bedFile) await session('Add narration, music and ambience', async id => {
      const adds: any[] = narr.map(x => ({ type: 'audio', assetId: pid(x.file), trackId: tracks.Narration, fromFrame: F(x.at, fps) }));
      if (bedFile) adds.push({ type: 'audio', assetId: pid(bedFile), trackId: tracks.Music, fromFrame: 0 });""")
open(p, 'w', encoding='utf-8').write(s)
print('patched')
