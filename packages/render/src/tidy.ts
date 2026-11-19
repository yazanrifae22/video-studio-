/**
 * Overlay hygiene at segment boundaries (2026-11-02, QA: "template flicker at segment boundaries" = blocker, 26 issues).
 * Applied to every recorded timeline (recorder.toTimeline) so all builders get it:
 *  1. snap: an overlay edge (text / image / alpha layer on any video track above the picture) that lands 1-2 frames off a picture
 *     cut moves onto the cut (no 1-frame text lead/lag over the wrong shot);
 *  2. gaps: an overlay followed on the SAME track by the next overlay 1-2 frames later is extended to meet it (no blink).
 * Items with fades / opacity keyframes keep their edges (moving them would shift the fade); video overlays are only ever
 * extended at the end (their source start stays put). Never creates an overlap on a track.
 */
import type { Item, Timeline } from './timeline.ts';

const MAX = 2;

export function pictureCuts(tl: Timeline): number[] {
  const pic = tl.tracks.find(t => t.kind === 'video');
  if (!pic) return [];
  return [...new Set(pic.items.flatMap(i => [i.fromFrame, i.fromFrame + i.durationInFrames]))].sort((a, b) => a - b);
}

export function tidyOverlays(tl: Timeline) {
  const cuts = pictureCuts(tl);
  const log: string[] = [];
  const videoTracks = tl.tracks.filter(t => t.kind === 'video').slice(1);
  const near = (f: number) => cuts.find(c => c !== f && Math.abs(c - f) <= MAX);
  const label = (it: Item) => it.type === 'text' ? `"${it.text.replace(/\s+/g, ' ').slice(0, 24)}"` : (it.name ?? it.id ?? it.type);
  for (const tr of videoTracks) {
    const xs = [...tr.items].sort((a, b) => a.fromFrame - b.fromFrame);
    const fadesIn = (it: Item) => !!it.fadeInFrames || !!it.keyframes && Object.values(it.keyframes).some(k => (k?.length ?? 0) > 0);
    const fadesOut = (it: Item) => !!it.fadeOutFrames || !!it.keyframes?.opacity?.length;
    // pass 1: edges onto nearby picture cuts
    for (let i = 0; i < xs.length; i++) {
      const it = xs[i], prev = xs[i - 1], next = xs[i + 1];
      const c0 = near(it.fromFrame);   // not for video: its source would shift
      if (c0 != null && it.type !== 'video' && !fadesIn(it) && (!prev || prev.fromFrame + prev.durationInFrames <= c0) && it.fromFrame + it.durationInFrames - c0 >= 1) {
        log.push(`${tr.name} ${label(it)}: start ${it.fromFrame} -> cut ${c0}`);
        it.durationInFrames += it.fromFrame - c0; it.fromFrame = c0;
      }
      const e = it.fromFrame + it.durationInFrames, c1 = near(e);
      if (c1 != null && !fadesOut(it) && (c1 > e || it.type !== 'video') && (!next || Math.min(next.fromFrame, near(next.fromFrame) ?? next.fromFrame) >= c1) && c1 - it.fromFrame >= 1) {
        log.push(`${tr.name} ${label(it)}: end ${e} -> cut ${c1}`);
        it.durationInFrames = c1 - it.fromFrame;
      }
    }
    // pass 2: 1-2 frame gaps to the next item on this track
    for (let i = 0; i + 1 < xs.length; i++) {
      const it = xs[i], next = xs[i + 1], e2 = it.fromFrame + it.durationInFrames;
      if (!fadesOut(it) && next.fromFrame - e2 >= 1 && next.fromFrame - e2 <= MAX) {
        log.push(`${tr.name} ${label(it)}: ${next.fromFrame - e2}-frame gap closed (end ${e2} -> ${next.fromFrame})`);
        it.durationInFrames = next.fromFrame - it.fromFrame;
      }
    }
  }
  return log;
}
