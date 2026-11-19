// End-to-end headless OpenChatCut test: create project → offline auto session → import → timeline → commit.
// Usage: npx tsx scripts/occ-headless-test.ts <mezzanine.mp4>
import { Occ } from '../packages/occ/src/client.ts';

const media = process.argv[2];
const occ = await Occ.get();
const proj = await occ.call('create_project', { name: 'studio-pipeline-test', description: 'Clips Viral Studio headless pipeline test (safe to delete)', compositionWidth: 1080, compositionHeight: 1920, fps: 30 });
console.log('create_project →', JSON.stringify(proj).slice(0, 400));
const projectId = proj?.result?.id ?? proj?.id ?? proj?.projectId ?? proj?.result?.projectId;
console.log('target →', JSON.stringify(await occ.call('target_project', { projectId })).slice(0, 400));
const s = await occ.call('begin_edit_session', { clientName: 'Clips Viral Studio', approvalMode: 'auto', editorProjectId: projectId });
console.log('session →', JSON.stringify(s).slice(0, 400));
const editSessionId = s?.editSessionId ?? s?.result?.editSessionId ?? s?.session?.editSessionId;
const imp = await occ.call('import_assets', { editSessionId, paths: [media] });
console.log('import →', JSON.stringify(imp).slice(0, 600));
const assets = await occ.call('read_project', { editSessionId, view: 'assets' });
console.log('assets →', JSON.stringify(assets).slice(0, 900));
process.stdout.write('\n__JSON__' + JSON.stringify({ projectId, editSessionId }) + '\n');
await occ.client.close();
