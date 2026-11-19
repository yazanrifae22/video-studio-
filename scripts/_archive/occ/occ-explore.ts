// Exploratory: learn edit_item add/update result shapes in one connection. Usage: npx tsx scripts/occ-explore.ts <media>
import { Occ } from '../packages/occ/src/client.ts';

const media = process.argv[2];
const occ = await Occ.fresh();
const log = (k: string, v: unknown) => console.log(`--- ${k}\n${JSON.stringify(v, null, 1).slice(0, 2500)}`);
try {
  const proj = await occ.call('create_project', { name: 'studio-explore', description: 'studio adapter exploration (safe to delete)', compositionWidth: 1080, compositionHeight: 1920, fps: 30 });
  const projectId = proj.id;
  await occ.call('target_project', { projectId });
  const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', editorProjectId: projectId });
  const editSessionId = s.editSessionId;
  const imp = await occ.call('import_assets', { editSessionId, paths: [media] });
  const assetId = imp.imported[0].id;
  const add = await occ.call('edit_item', { editSessionId, adds: [
    { type: 'video', assetId, track: 'V1', fromFrame: 0, sourceStartSeconds: 4, sourceEndSeconds: 10 },
    { type: 'video', assetId, track: 'V1', fromFrame: 180, sourceStartSeconds: 20, sourceEndSeconds: 26 },
    { type: 'text', text: 'FALCON 9 · DEC 8, 2010', name: 'title', track: 'V2', fromFrame: 0, durationInFrames: 90, fontSize: 80, color: '#ffffff', fontWeight: 800, align: 'center' },
  ] });
  log('adds', add);
  const tl = await occ.call('read_timeline', { editSessionId });
  log('timeline', tl);
  const ids = JSON.stringify(add).match(/"(?:itemId|id)":"([^"]+)"/g);
  log('ids', ids);
  const vid = add?.results?.[0]?.itemId ?? add?.added?.[0]?.id ?? add?.items?.[0]?.id;
  const txt = add?.results?.[2]?.itemId ?? add?.added?.[2]?.id ?? add?.items?.[2]?.id;
  if (vid && txt) {
    const up = await occ.call('edit_item', { editSessionId, updates: [
      { type: 'video', itemId: vid, backgroundFill: true, backgroundFillStrength: 60 },
      { type: 'text', itemId: txt, transform: { y: -30 } },
    ] });
    log('updates', up);
  }
  const rev = await occ.call('review_edit_session', { editSessionId, summary: 'explore' });
  log('review', rev);
  log('session', await occ.call('get_edit_session', { editSessionId }));
  process.stdout.write(`\n__PROJECT__${projectId}\n`);
} finally { await occ.close(); }
