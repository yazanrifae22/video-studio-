"""One-off patch (QA blockers): no video fades at joins, audio fades baked only at real source changes,
black background track under the picture, tracks by name from edit_track list.result, validated edit results."""
import sys

p = 'packages/occ/src/build.ts'
s = open(p, encoding='utf-8').read()


def rep(old, new, count=1):
    global s
    if s.count(old) != count:
        sys.exit(f'anchor count {s.count(old)} != {count}: {old[:90]}')
    s = s.replace(old, new)


# 1) windowFor: bake audio fades (only where requested) into the window; never touch the picture
rep("async function windowFor(row: any, seg: Segment): Promise<SegMedia> {",
    "async function windowFor(row: any, seg: Segment, fade: { in: boolean; out: boolean } = { in: false, out: false }): Promise<SegMedia> {")
rep("  if (fs.statSync(mezz).size < LARGE_BYTES && !crop && !level) return",
    "  const fades = !seg.mute_source && (fade.in || fade.out);\n  if (fs.statSync(mezz).size < LARGE_BYTES && !crop && !level && !fades) return")
rep("  const tag = `${crop ? `_c${crop.w}x${crop.h}+${crop.x}+${crop.y}` : ''}${level ? `_l${Math.round(lufs!)}` : ''}`;",
    "  const tag = `${crop ? `_c${crop.w}x${crop.h}+${crop.x}+${crop.y}` : ''}${level ? `_l${Math.round(lufs!)}` : ''}${fades ? `_f${fade.in ? 'i' : ''}${fade.out ? 'o' : ''}${seg.src_in.toFixed(2)}-${seg.src_out.toFixed(2)}` : ''}`;")
rep("    const af = level ? ['-af', `volume=${(-16 - lufs!).toFixed(2)}dB,alimiter=limit=0.89`] : [];",
    """    // Audio-only fades at the exact used in/out points (relative to the window start); picture is never faded.
    const afx = [
      ...(level ? [`volume=${(-16 - lufs!).toFixed(2)}dB`, 'alimiter=limit=0.89'] : []),
      ...(fades && fade.in ? [`afade=t=in:st=${(seg.src_in - a).toFixed(3)}:d=0.12`] : []),
      ...(fades && fade.out ? [`afade=t=out:st=${Math.max(0, seg.src_out - a - 0.18).toFixed(3)}:d=0.18`] : []),
    ];
    const af = afx.length ? ['-af', afx.join(',')] : [];""")

# 2) segment media: fades only where the audio genuinely changes (different source or non-contiguous time)
rep("    for (const s of segs) segMedia.push(await windowFor(src[s.asset_id], s));",
    """    const contiguous = (a?: Segment, b?: Segment) => !!a && !!b && a.asset_id === b.asset_id && !a.mute_source && !b.mute_source && Math.abs(a.src_out - b.src_in) < 0.05;
    for (const [i, s] of segs.entries()) segMedia.push(await windowFor(src[s.asset_id], s, { in: i > 0 && !contiguous(segs[i - 1], s), out: i < segs.length - 1 && !contiguous(s, segs[i + 1]) }));""")

# 3) no item-level fades on video (OpenChatCut fades opacity too -> transparent dips at joins)
rep("""        const fades = s.mute_source ? {} : { fadeInSeconds: 0.25, fadeOutSeconds: 0.35 };
        return { type: 'video', itemId: ids[i], volume: s.mute_source ? 0 : (s.volume ?? 1), ...fades,""",
    """        return { type: 'video', itemId: ids[i], volume: s.mute_source ? 0 : (s.volume ?? 1),""")

# 4) tracks: list is {result:[...]}; name the picture track; black background track at the bottom (order 0)
a = s.index("      // read_timeline omits track names; edit_track list has them.")
b = s.index("      await occ.call('import_assets'") if "      await occ.call('import_assets'" in s else s.index("      const imp = await occ.call('import_assets'")
s = s[:a] + """      // read_timeline omits track names; edit_track list has them ({result:[...]}). Aliases renumber when tracks are
      // inserted, so tracks are always addressed by name/id: "Picture" (the original V1), "Background" under it, overlays above.
      const list = async () => { const l = await occ.call('edit_track', { editSessionId: id, action: 'list' }); return (l?.result ?? l?.tracks ?? []) as any[]; };
      let allTracks = await list();
      const byName = (n: string) => allTracks.find(tr => tr.name === n)?.id as string | undefined;
      if (!byName('Picture')) {
        const v1 = allTracks.find(tr => tr.alias === 'V1' && tr.trackType === 'video') ?? allTracks.find(tr => tr.id === 'track_v1');
        if (!v1) throw new Error('no V1 video track to use as the picture track');
        await occ.call('edit_track', { editSessionId: id, action: 'update', trackId: v1.id, json: JSON.stringify({ name: 'Picture' }) });
      }
      if (!byName('Background')) await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: 'video', name: 'Background', order: 0 }) });
      allTracks = await list();
      tracks.V1 = byName('Picture')!;
      tracks.Background = byName('Background')!;
      const want: [string, 'video' | 'audio'][] = [...overlayLanes.map((_, k) => [`Overlays ${k + 1}`, 'video'] as [string, 'video']), ['Captions', 'video'], ['Narration', 'audio'], ['Music', 'audio']];
      for (const [name, type] of want) {
        const have = byName(name);
        if (have) { tracks[name] = have; continue; }
        const r = await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: type, name }) });
        tracks[name] = r.created?.[0]?.id;
      }
      if (!tracks.V1 || !tracks.Background) throw new Error('track setup failed (Picture/Background missing)');
""" + s[b:]

# 5) black solid under everything + validated picture edits
rep("""      const ids: string[] = r.results.map((x: any) => x.placed?.itemId);
      const base = (i: number) =>""",
    """      checked(r, 'picture adds');
      const ids: string[] = r.results.map((x: any) => x.placed?.itemId);
      // A full-length black solid on the Background track, so transparency (checkerboard) can never show.
      checked(await occ.call('edit_item', { editSessionId: id, adds: [{ type: 'solid', color: '#000000', name: 'Background', trackId: tracks.Background, fromFrame: 0, durationInFrames: F(total, fps) }] }), 'background solid');
      const base = (i: number) =>""")
rep("      await occ.call('edit_item', { editSessionId: id, updates });",
    "      checked(await occ.call('edit_item', { editSessionId: id, updates }), 'picture framing updates');")

# 6) helper + pan validation
rep("/* ------------------------------------------------------------------ main */",
    """/** edit_item is atomic and reports problems in its body, not as a tool error: fail loudly instead of silently losing edits. */
function checked(r: any, what: string) {
  const bad = (r?.results ?? []).map((x: any, i: number) => ({ i, x })).filter(({ x }: any) => x?.ok === false);
  if (r?.ok === false || bad.length) throw new Error(`OpenChatCut rejected ${what}: ${JSON.stringify(bad.length ? bad.slice(0, 3) : r).slice(0, 600)}`);
  return r;
}

/* ------------------------------------------------------------------ main */""")
rep("    if (s.src_out - s.src_in < 0.8) throw new Error(`segment ${i}: shorter than 0.8 s`);",
    """    if (s.src_out - s.src_in < 0.8) throw new Error(`segment ${i}: shorter than 0.8 s`);
    for (const k of ['pan_x', 'pan_y'] as const) if (s[k] != null && Math.abs(s[k]!) > 100) throw new Error(`segment ${i}: ${k}=${s[k]} — pan is in % of the canvas (−100…100)`);
    if (s.zoom != null && (s.zoom < 0.5 || s.zoom > 4)) throw new Error(`segment ${i}: zoom ${s.zoom} out of range 0.5–4`);""")
open(p, 'w', encoding='utf-8').write(s)
print('patched')
