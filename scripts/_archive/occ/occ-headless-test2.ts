// Continue the headless test: reuse the draft, add items, commit, verify.
import { Occ } from '../packages/occ/src/client.ts';

const [projectId, assetId] = process.argv.slice(2);
const occ = await Occ.get();
await occ.call('target_project', { projectId });
const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', reuseExisting: true, editorProjectId: projectId });
const editSessionId = s.editSessionId;
console.log('session', s.status, s.resumed, 'ops', s.operationCount);
const add = await occ.call('edit_item', { editSessionId, adds: [
  { type: 'video', assetId, track: 'V1', fromFrame: 0, sourceStartSeconds: 4, sourceEndSeconds: 16 },
  { type: 'text', text: 'FALCON 9 · DEC 8, 2010', name: 'title', track: 'V2', fromFrame: 0, durationInFrames: 90, fontSize: 72, color: '#ffffff', fontWeight: 800, align: 'center' },
] });
console.log('adds →', JSON.stringify(add).slice(0, 900));
const tl = await occ.call('read_timeline', { editSessionId });
console.log('timeline →', JSON.stringify(tl).slice(0, 1500));
process.stdout.write('\n__JSON__' + JSON.stringify({ editSessionId }) + '\n');
await occ.client.close();
