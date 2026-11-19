// Watch-mode demo: bind to the owner's open editor tab and apply visible fixes step by step.
import { Occ } from '../packages/occ/src/client.ts';
import { emit } from '../packages/shared/src/events.ts';

const projectId = process.argv[2];
const occ = await Occ.fresh();
const step = async (label: string, fn: (id: string) => Promise<unknown>) => {
  const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
  const out = await fn(s.editSessionId);
  const r = await occ.call('review_edit_session', { editSessionId: s.editSessionId, summary: label });
  emit({ kind: 'occ.live.step', agent: 'occ-producer', level: r.status === 'applied' ? 'success' : 'warn', message: `${label} → ${r.status}` });
  console.log(label, '→', r.status, JSON.stringify(out).slice(0, 300));
  await new Promise(res => setTimeout(res, 2500));
};
try {
  const t = await occ.call('target_project', { projectId });
  console.log('binding:', t.bindingMode);
  const s0 = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
  const items: any[] = (await occ.call('read_timeline', { editSessionId: s0.editSessionId })).items;  // read-only: nothing to review, session is reused below
  const vids = items.filter(i => i.kind === 'video'), txt = items.find(i => i.kind === 'text');
  await step('Fill the vertical frame (blurred background)', id => occ.call('edit_item', { editSessionId: id, updates: vids.map(v => ({ type: 'video', itemId: v.id, backgroundFill: true, backgroundFillStrength: 70 })) }));
  let v2 = '';
  await step('Add overlay track V2', async id => { const r = await occ.call('edit_track', { editSessionId: id, action: 'create', json: JSON.stringify({ trackType: 'video', name: 'Titles' }) }); v2 = JSON.stringify(r).match(/"(track_[^"]+)"/)?.[1] ?? ''; return r; });
  if (txt && v2) await step('Move title over the opening shot', id => occ.call('edit_item', { editSessionId: id, updates: [{ type: 'text', itemId: txt.id, trackId: v2, startFrame: 0, transform: { y: -32 } }] }));
} finally { await occ.close(); }
