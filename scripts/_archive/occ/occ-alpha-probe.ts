// Probe: does OpenChatCut import + render WebM-alpha video and RGBA PNG overlays correctly? (one-off, keeps a scratch project)
import path from 'node:path';
import { Occ } from '../../occ/src/client.ts';
import { renderProject } from '../../occ/src/build.ts';
const dir = path.resolve(process.argv[2]);
const occ = await Occ.fresh();
let projectId = '';
try {
  projectId = (await occ.call('create_project', { name: 'zz quiz alpha probe', description: 'scratch: alpha overlay probe', compositionWidth: 1080, compositionHeight: 1920, fps: 30 })).id;
  await occ.call('target_project', { projectId });
  const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', editorProjectId: projectId });
  const id = s.editSessionId;
  const v2 = (await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: 'video', name: 'Captions' }) })).created?.[0]?.id;
  const v3 = (await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: 'video', name: 'Brand' }) })).created?.[0]?.id;
  const tracks = (await occ.call('edit_track', { editSessionId: id, action: 'list' })).result;
  const v1 = tracks.find((t: any) => t.alias === 'V1')?.id ?? 'track_v1';
  const imp = await occ.call('import_assets', { editSessionId: id, paths: ['bg.mp4', 'cap.webm', 'box.png'].map(f => path.join(dir, f)) });
  console.log('import', JSON.stringify(imp).slice(0, 800));
  const pool = await occ.call('read_project', { editSessionId: id, view: 'assets' });
  const pid: Record<string, string> = {};
  for (const a of pool.mediaPool?.assets ?? []) pid[a.name] = a.id;
  const r = await occ.call('edit_item', { editSessionId: id, adds: [
    { type: 'video', assetId: pid['bg.mp4'], trackId: v1, fromFrame: 0 },
    { type: 'video', assetId: pid['cap.webm'], trackId: v2, fromFrame: 0 },
    { type: 'image', assetId: pid['box.png'], trackId: v3, fromFrame: 0, durationInFrames: 60 },
  ] });
  console.log('adds', JSON.stringify(r).slice(0, 1200));
  const rv = await occ.call('review_edit_session', { editSessionId: id, summary: 'alpha probe' });
  console.log('review', rv.status);
  const tl = await occ.call('read_timeline', {});
  console.log('timeline', JSON.stringify(tl).slice(0, 1500));
} finally { await occ.close(); }
const out = path.join(dir, 'probe.mp4');
await renderProject(projectId, out);
console.log('rendered', projectId, out);
