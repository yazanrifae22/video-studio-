// Dev helper: show OpenChatCut's import_assets response for a file (e.g. a duplicate), then discard.
import { Occ } from '../../occ/src/client.ts';
const occ = await Occ.fresh();
try {
  await occ.call('target_project', { projectId: process.argv[2] });
  const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', editorProjectId: process.argv[2] });
  console.log(JSON.stringify(await occ.call('import_assets', { editSessionId: s.editSessionId, paths: process.argv.slice(3) }), null, 1).slice(0, 3000));
  await occ.call('discard_edit_session', { editSessionId: s.editSessionId });
} finally { await occ.close(); }
