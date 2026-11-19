import fs from 'node:fs';
import path from 'node:path';
import { P } from '../packages/shared/src/paths.ts';
import { loadSpec } from '../packages/quiz/src/spec.ts';
import { explainLayout, objectBoxes, placeExplain } from '../packages/quiz/src/compose.ts';
const hit = (a: any, b: any) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function oldPlace(r: any, dir: string) {
  const slots: any = { bottom: 746, top: 14, middle: 372 };
  const order: string[] = r.params.explain_slots ?? (r.type === 'spot_difference' ? ['middle', 'top', 'bottom'] : r.type === 'follow_path' ? ['top', 'bottom', 'middle'] : ['bottom', 'top', 'middle']);
  const boxes = objectBoxes(r, dir);
  if (r.type === 'spot_difference') { const sc = r.params.panel_scale ?? 0.98, pw = (r.params.panel_w ?? 820) * sc, ph = (r.params.panel_h ?? 420) * sc, px = r.params.panel_x ?? 40; boxes.push({ x: px, y: r.params.top_y ?? 5, w: pw, h: ph }, { x: px, y: r.params.bottom_y ?? 435, w: pw, h: ph }); }
  const w = Math.min(820, [...(r.explanation_ar ?? '')].length * 0.5 * 44 + 68);
  for (const k of order) if (!boxes.some(b => hit({ x: 450 - w / 2, y: slots[k], w, h: 84 }, b))) return k;
  if ((r.type === 'image_reveal' || r.type === 'spot_difference') && r.params.explain_room !== false) { const room = Math.min(1, (slots.bottom - 12) / Math.max(...boxes.map((b: any) => b.y + b.h))); if (room >= 0.8) return 'room'; }
  return 'FAIL';
}
let oldFail = 0, newFail = 0, both = 0, regress: string[] = [], n = 0;
for (const id of fs.readdirSync(P.productions).filter(x => x.startsWith('quiz-')).sort()) {
  if (!fs.existsSync(path.join(P.productions, id, 'quiz.json'))) continue;
  let spec; try { ({ spec } = loadSpec(id)); } catch { continue; }
  const dir = path.join(P.productions, id);
  for (const r of spec.rounds) if (r.explanation_ar) {
    n++;
    const o = oldPlace(r, dir) === 'FAIL';
    let nf = false; try { placeExplain(r, dir); } catch { nf = true; }
    if (o) oldFail++; if (nf) newFail++; if (o && nf) both++;
    if (nf && !o) regress.push(`${id} ${r.id} ${r.type} "${r.explanation_ar}" L=${JSON.stringify(explainLayout(r.explanation_ar))}`);
  }
}
console.log(JSON.stringify({ n, oldFail, newFail, both, regress: regress.length }));
console.log(regress.slice(0, 12).join('\n'));
