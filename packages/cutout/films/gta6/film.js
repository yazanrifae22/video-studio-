// GTA 6 (Karto & Skip ep. 1): wiring only. One module per chapter (chapters/cNN.js), shared kit in shared.js (read its header).
// A chapter that throws is reported in lint and skipped, so one author's bug never blanks the whole film.
import { makeF } from './shared.js';
import c00 from './chapters/c00.js';
import c01 from './chapters/c01.js';
import c02 from './chapters/c02.js';
import c03 from './chapters/c03.js';
import c04 from './chapters/c04.js';
import c05 from './chapters/c05.js';
import c06 from './chapters/c06.js';
import c07 from './chapters/c07.js';
import c08 from './chapters/c08.js';

const CHAPTERS = { c00, c01, c02, c03, c04, c05, c06, c07, c08 };

export default function build(K) {
  const F = makeF(K);
  for (const [id, fn] of Object.entries(CHAPTERS)) {
    try { fn(K, F); } catch (e) { K.lint.push(`chapter ${id} failed: ${e && e.stack ? e.stack.split('\n').slice(0, 2).join(' | ') : e}`); }
  }
  F.finish();
}
