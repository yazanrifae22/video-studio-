/**
 * Edit recorder (replaced the OpenChatCut MCP client, retired 2026-11-02; the call shape is the old MCP one): it RECORDS the edit: the builders keep making exactly the calls they made to OpenChatCut (tracks, adds, framing updates, text
 * props, audio levels), and the recorder turns them into a plain studio timeline (timeline.ts) for the ffmpeg
 * compositor. Only the tool subset the studio builders use is implemented; anything else throws.
 * Track semantics follow the editor: a project starts with V1 (video) + A1 (audio); created tracks go on top, so video
 * tracks paint bottom -> top in creation order. Asset ids are the absolute file paths.
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Item, Keyframe, Timeline, Track } from './timeline.ts';
import { tidyOverlays } from './tidy.ts';

const run = promisify(execFile);

interface RTrack { id: string; name: string; alias: string; trackType: 'video' | 'audio' }
interface RItem { id: string; trackId: string; type: string; assetId?: string; fromFrame: number; durationInFrames?: number; sourceStartFrame?: number;
  text?: string; fontSize?: number; fontWeight?: number; color?: string; align?: string;
  volume?: number; backgroundFill?: boolean; backgroundFillStrength?: number; transform?: Record<string, number>; keyframes?: Record<string, Keyframe[]>;
  fadeInSeconds?: number; fadeOutSeconds?: number; props?: Record<string, unknown> }

export class TimelineRecorder {
  tracks: RTrack[] = [{ id: 'track_v1', name: 'V1', alias: 'V1', trackType: 'video' }, { id: 'track_a1', name: 'A1', alias: 'A1', trackType: 'audio' }];
  items: RItem[] = [];
  assets = new Map<string, string>();   // id (= path) -> name
  private seq = 0;
  constructor(public width: number, public height: number, public fps: number) {}
  static readonly isRecorder = true;

  async close() { /* nothing to release */ }

  async call(tool: string, a: any = {}): Promise<any> {
    switch (tool) {
      case 'create_project': return { id: 'recorder' };
      case 'target_project': return { bindingMode: 'recorder' };
      case 'begin_edit_session': return { editSessionId: `rec-${++this.seq}` };
      case 'review_edit_session': return { status: 'applied' };
      case 'discard_edit_session': return { ok: true };
      case 'read_timeline': return { items: this.items.map(i => ({ id: i.id })) };
      case 'clear_timeline': this.items = []; return { ok: true };
      case 'import_assets': {
        const imported = (a.paths as string[]).map(p => { const id = path.resolve(p); this.assets.set(id, path.basename(p)); return { id, name: path.basename(p) }; });
        return { ok: true, imported, errors: [], unsupportedFiles: [] };
      }
      case 'read_project': return { mediaPool: { assets: [...this.assets].map(([id, name]) => ({ id, name })) } };
      case 'edit_track': return this.track(a);
      case 'edit_item': return this.edit(a);
      case 'update_item_props': {
        const it = this.items.find(x => x.id === a.itemId);
        if (!it) throw new Error(`recorder: no item ${a.itemId}`);
        it.props = { ...(it.props ?? {}), ...(a.props ?? {}) };
        return { ok: true };
      }
      default: throw new Error(`recorder: edit call "${tool}" is not supported`);
    }
  }

  private track(a: any) {
    if (a.action === 'list') return { result: this.tracks.map(t => ({ ...t })) };
    if (a.action === 'create') {
      const j = JSON.parse(a.json);
      const n = this.tracks.filter(t => t.trackType === j.trackType).length + 1;
      const t: RTrack = { id: `track_${++this.seq}`, name: j.name ?? `${j.trackType === 'video' ? 'V' : 'A'}${n}`, alias: `${j.trackType === 'video' ? 'V' : 'A'}${n}`, trackType: j.trackType };
      this.tracks.push(t);
      return { created: [{ id: t.id }] };
    }
    const t = this.tracks.find(x => x.id === a.trackId);
    if (!t) throw new Error(`recorder: no track ${a.trackId}`);
    if (a.action === 'update') { Object.assign(t, { name: JSON.parse(a.json).name ?? t.name }); return { ok: true }; }
    if (a.action === 'delete') { this.tracks = this.tracks.filter(x => x !== t); this.items = this.items.filter(i => i.trackId !== t.id); return { ok: true }; }
    throw new Error(`recorder: edit_track action ${a.action}`);
  }

  private edit(a: any) {
    const results: any[] = [];
    for (const add of a.adds ?? []) {
      if (!this.tracks.some(t => t.id === add.trackId)) throw new Error(`recorder: add to unknown track ${add.trackId}`);
      const it: RItem = { id: `item_${++this.seq}`, trackId: add.trackId, type: add.type, assetId: add.assetId, fromFrame: add.fromFrame ?? 0,
        durationInFrames: add.durationInFrames ?? add.sourceDurationInFrames, sourceStartFrame: add.sourceStartFrame,
        text: add.text, fontSize: add.fontSize, fontWeight: add.fontWeight, color: add.color, align: add.align };
      this.items.push(it);
      results.push({ ok: true, placed: { itemId: it.id } });
    }
    for (const u of a.updates ?? []) {
      const it = this.items.find(x => x.id === u.itemId);
      if (!it) { results.push({ ok: false, error: `no item ${u.itemId}` }); continue; }
      for (const k of ['volume', 'backgroundFill', 'backgroundFillStrength', 'fadeInSeconds', 'fadeOutSeconds'] as const) if (u[k] !== undefined) (it as any)[k] = u[k];
      if (u.transform) it.transform = { ...(it.transform ?? {}), ...u.transform };
      if (u.keyframes) it.keyframes = { ...(it.keyframes ?? {}), ...u.keyframes };
      results.push({ ok: true });
    }
    return { ok: true, results };
  }

  /** The recorded edit as a studio timeline (media durations probed for items added without one). */
  async toTimeline(meta: Record<string, unknown> = {}): Promise<Timeline> {
    const fps = this.fps;
    const dur = async (file: string) => {
      const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
      return Math.max(1, Math.ceil(parseFloat(String(stdout).trim()) * fps - 1e-6));
    };
    const tracks: Track[] = [];
    // video tracks paint bottom -> top in their order; audio tracks after
    for (const t of [...this.tracks.filter(x => x.trackType === 'video'), ...this.tracks.filter(x => x.trackType === 'audio')]) {
      const items: Item[] = [];
      for (const r of this.items.filter(i => i.trackId === t.id).sort((x, y) => x.fromFrame - y.fromFrame)) {
        const d = r.durationInFrames ?? (r.assetId ? await dur(r.assetId) : 1);
        const base = { id: r.id, fromFrame: r.fromFrame, durationInFrames: d,
          ...(r.transform ? { transform: r.transform } : {}), ...(r.keyframes ? { keyframes: r.keyframes as any } : {}),
          ...(r.fadeInSeconds ? { fadeInFrames: Math.round(r.fadeInSeconds * fps) } : {}), ...(r.fadeOutSeconds ? { fadeOutFrames: Math.round(r.fadeOutSeconds * fps) } : {}) };
        if (r.type === 'text') {
          items.push({ ...base, type: 'text', name: (r.text ?? '').slice(0, 24), text: r.text ?? '',
            props: { fontSize: r.fontSize, fontWeight: r.fontWeight, color: r.color, align: r.align as any, ...(r.props ?? {}) } });
        } else if (r.type === 'audio') {
          items.push({ ...base, type: 'audio', src: r.assetId!, ...(r.sourceStartFrame ? { srcStartFrame: r.sourceStartFrame } : {}), ...(r.volume !== undefined ? { volume: r.volume } : {}) });
        } else if (r.type === 'image') {
          items.push({ ...base, type: 'image', src: r.assetId! });
        } else {
          items.push({ ...base, type: 'video', src: r.assetId!, ...(r.sourceStartFrame ? { srcStartFrame: r.sourceStartFrame } : {}), ...(r.volume !== undefined ? { volume: r.volume } : {}),
            ...(r.backgroundFill ? { backgroundFill: r.backgroundFillStrength ?? 50 } : {}) });
        }
      }
      tracks.push({ name: t.name, kind: t.trackType, items });
    }
    const end0 = Math.max(1, ...tracks.flatMap(t => t.items.map(i => i.fromFrame + i.durationInFrames)));
    const tl: Timeline = { version: 1, width: this.width, height: this.height, fps, durationInFrames: end0, background: 'black', tracks, meta: { engine: 'ffmpeg', ...meta } };
    // overlays snapped to picture cuts, 1-2 frame gaps closed (QA flicker blockers, 2026-11-02); never past the recorded end
    const tidy = tidyOverlays(tl);
    for (const t of tracks) for (const i of t.items) i.durationInFrames = Math.max(1, Math.min(i.durationInFrames, end0 - i.fromFrame));
    if (tidy.length) tl.meta = { ...tl.meta, overlay_tidy: tidy };
    return tl;
  }
}
