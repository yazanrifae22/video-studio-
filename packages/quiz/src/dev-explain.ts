// Dev check: explanation chip slot per round (fails loudly if a chip would cover an answer region).
import { loadSpec } from './spec.ts';
import { placeExplain } from './compose.ts';
const { spec, dir } = loadSpec(process.argv[2]);
for (const r of spec.rounds) if (r.explanation_ar) { try { const x = placeExplain(r, dir); console.log(r.id, r.type, x.css || 'bottom', x.room ? `room ${x.room}` : ''); } catch (e: any) { console.log(r.id, 'FAIL', e.message); } }
