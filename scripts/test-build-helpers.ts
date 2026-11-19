// Unit checks for the caption cleaner (run: npx tsx scripts/test-build-helpers.ts). Exits non-zero on failure.
import { cleanWords, ctaFontPx, ctaMaxChars, CTA_MIN_FONT_PX, pageCaptions, placeEndCta } from '../packages/occ/src/build.ts';
import { coldOpenPlan } from '../packages/kids3d/src/build.ts';
const mk = (s: string) => s.split(' ').map((w, i) => ({ w, t0: i * 0.3, t1: i * 0.3 + 0.25 }));
const cases: [string, string][] = [
  ['the on the ship um I am not a I am not really', 'on the ship I am not really'],
  ['and I just I broke down in tears', 'and I just broke down in tears'],
  ['I said I don\'t think so', 'I said I don\'t think so'],
  ['it was otherworldly it was amazing', 'it was otherworldly it was amazing'],
  ['saw the cross on his on his collar', 'saw the cross on his collar'],
  ['to to explain', 'to explain'],
  ['in in these short', 'in these short'],
];
let fail = 0;
for (const [input, want] of cases) {
  const got = cleanWords(mk(input)).map(w => w.w).join(' ');
  console.log(got === want ? 'ok  ' : 'FAIL', JSON.stringify(input), '→', JSON.stringify(got), got === want ? '' : `(want ${JSON.stringify(want)})`);
  if (got !== want) fail++;
}
{
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('then', 0, 0.15), W('the', 0.15, 0.3), W('concrete', 0.3, 0.8), W('went', 2, 2.3), W('in', 2.3, 2.6)];
  const base = pageCaptions(ws, 1);
  const mp = pageCaptions(ws, 1, 16, 0.6);
  const okm = mp.length < base.length && mp[0].text === 'THEN THE CONCRETE' && pageCaptions(ws, 1).length === base.length && mp.some(p => p.text === 'WENT IN');
  console.log(okm ? 'ok  ' : 'FAIL', 'caption_min_page merge', JSON.stringify(mp.map(p => p.text)));
  if (!okm) fail++;
}
{
  // a one-word page under min_page bridges a 0.5 s pause to its neighbour, but stays alone when truly isolated (>0.6 s)
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('crawler', 0, 0.5), W('carries', 0.5, 0.9), W('slowly,', 1.4, 1.8), W('on', 3.0, 3.2), W('tracks', 3.2, 3.6), W('end', 6, 6.2)];
  const base = pageCaptions(ws, 3, 16, 0).map(p => p.text);
  const mp = pageCaptions(ws, 3, 16, 0.6).map(p => p.text);
  const okp = base.includes('SLOWLY') && !mp.includes('SLOWLY') && mp[0] === 'CRAWLER CARRIES SLOWLY' && mp.includes('END');
  console.log(okp ? 'ok  ' : 'FAIL', 'caption_min_page single-word bridge', JSON.stringify(mp));
  if (!okp) fail++;
}
{
  // a merge that would wrap to three lines (A MASS / SPECTROMETER / FOLLOWS) is refused
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('a', 0, 0.1), W('mass', 0.1, 0.3), W('spectrometer', 0.8, 1.4), W('follows', 1.5, 1.9)];
  const mp = pageCaptions(ws, 3, 16, 0.6).map(p => p.text);
  const ok3 = mp.every(t => t.split(' ').length < 3 || t.length <= 32) && !mp.includes('A MASS SPECTROMETER FOLLOWS');
  console.log(ok3 ? 'ok  ' : 'FAIL', 'caption_min_page keeps pages to 2 lines', JSON.stringify(mp));
  if (!ok3) fail++;
}
{
  // a sentence-final one-word page joins its own sentence, never the next sentence (FLEW AROUND THE MOON / STACKING ...)
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('four', 0, 0.4), W('astronauts', 0.4, 1.0), W('flew', 1.4, 1.7), W('around', 1.7, 2.0), W('the', 2.0, 2.1), W('Moon.', 2.1, 2.4), W('stacking', 3.0, 3.5), W('rocket', 3.5, 4.0)];
  const mp = pageCaptions(ws, 3, 16, 0.6).map(p => p.text);
  const oks = mp.includes('FLEW AROUND THE MOON') && !mp.some(t => t.includes('MOON STACKING'));
  console.log(oks ? 'ok  ' : 'FAIL', 'caption_min_page sentence-final word stays in its sentence', JSON.stringify(mp));
  if (!oks) fail++;
}
{
  // 'Florida.' (short, sentence-final) joins 'flown to' even when the next sentence starts only 0.3 s later
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('flown', 0, 0.3), W('to', 0.3, 0.45), W('Florida.', 0.55, 0.95), W('seven', 1.25, 1.6), W('thousand', 1.6, 2.0), W('pounds', 2.0, 2.4)];
  const mp = pageCaptions(ws, 3, 16, 0.6).map(p => p.text);
  const okf = mp[0] === 'FLOWN TO FLORIDA' && !mp.some(t => t.startsWith('FLORIDA'));
  console.log(okf ? 'ok  ' : 'FAIL', 'caption_min_page prefers the previous page at a sentence end', JSON.stringify(mp));
  if (!okf) fail++;
}
{
  // caption_keep: a spoken number is never split across pages, even after a pause inside it
  const W = (w: string, t0: number, t1: number) => ({ w, t0, t1 }) as any;
  const ws = [W('Five:', 0, 0.3), W('A-23,', 0.4, 0.8), W('1986,', 0.9, 1.4), W('fifty-nine', 1.45, 1.9), W('hundred.', 2.6, 2.9)];
  const base = pageCaptions(ws, 3, 16, 0).map(p => p.text);
  const kp = pageCaptions(ws, 3, 16, 0, ['fifty-nine hundred']).map(p => p.text);
  const okk = base.includes('HUNDRED') && kp.includes('FIFTY-NINE HUNDRED') && !kp.includes('HUNDRED');
  console.log(okk ? 'ok  ' : 'FAIL', 'caption_keep fuses a number phrase', JSON.stringify(kp));
  if (!okk) fail++;
}
{
  // end CTA overlay (O-B1 2026-11-08): "end" = last dur s on the frame grid, numeric at clamped to the end, title card trimmed, dur 1.5-2.0 enforced
  const texts: any[] = [{ text: 'TITLE', at: 0, dur: 30, role: 'title' }, { text: 'credit', at: 0, dur: 30, role: 'credit' }];
  const e = placeEndCta({ text: 'Pick a side: why?', at: 'end', dur: 1.8 }, 24.4, 30, texts);
  const n = placeEndCta({ text: 'x', at: 23.5, dur: 2.0 }, 24.4, 30, []);
  const ok1 = e.item.role === 'cta' && Math.abs(e.item.at - 22.6) < 1e-6 && Math.abs(e.item.at + e.item.dur - 24.4) < 1e-6 && Math.abs(texts[0].dur - 22.6) < 1e-6 && texts[1].dur === 30;
  const ok2 = Math.abs(n.item.at - 22.4) < 1e-6 && n.notes.some(m => /moved/.test(m));
  let ok3 = false; try { placeEndCta({ text: 'x', at: 'end', dur: 3.0 }, 24.4, 30, []); } catch { ok3 = true; }
  const okc = ok1 && ok2 && ok3;
  console.log(okc ? 'ok  ' : 'FAIL', 'end CTA overlay placement', JSON.stringify({ e: e.item, title: texts[0].dur, n: n.item }));
  if (!okc) fail++;
}
{
  // CTA type size (owner 2026-11-08: main text >= 2.2 % cap height): default 63 px, cut-list font_px raised to the floor, max_chars capped to fit
  const s = placeEndCta({ text: 'Which one is #1? Comment', at: 'end', dur: 2.0, font_px: 48, max_chars: 30 }, 24.4, 30, []);
  const okt = ctaFontPx() >= CTA_MIN_FONT_PX && ctaFontPx() * 0.70 / 1920 * 100 >= 2.2 && s.item.font_px === CTA_MIN_FONT_PX && s.item.max_chars === ctaMaxChars(CTA_MIN_FONT_PX, 30) && ctaMaxChars(63) <= 23
    && s.notes.some(m => /raised to 62/.test(m)) && s.notes.some(m => /capped/.test(m));
  console.log(okt ? 'ok  ' : 'FAIL', 'end CTA type size floor', JSON.stringify({ def: ctaFontPx(), item: s.item, mc63: ctaMaxChars(63) }));
  if (!okt) fail++;
}
{
  // Sunny Hill cold open (O5/O-C3 2026-11-08): <= 3 s window snapped to frames, inside the episode; absent/false = none
  const sc = { fps: 30, duration: 140 };
  const c = coldOpenPlan({ cold_open: { from: 12.34, dur: 2.5 } }, sc);
  let bad = 0; for (const co of [{ from: 1, dur: 3.5 }, { from: 139, dur: 2 }]) { try { coldOpenPlan({ cold_open: co }, sc); } catch { bad++; } }
  const okk3 = !!c && Math.abs(c.from * 30 - Math.round(c.from * 30)) < 1e-9 && c.dur === 2.5 && coldOpenPlan({}, sc) === null && coldOpenPlan({ cold_open: false }, sc) === null && bad === 2;
  console.log(okk3 ? 'ok  ' : 'FAIL', 'kids cold open plan', JSON.stringify(c));
  if (!okk3) fail++;
}
// viral-rankings pagination (2026-11-08): no page joins two sentences; a join across the script's colon keeps the colon
{
  const w = (words: string[]) => words.map((x, i) => ({ w: x, t0: i * 0.3, t1: i * 0.3 + 0.25 })) as any;
  const a = pageCaptions(w(['Number', 'one.', 'Two', 'rises,', 'fast.']), 3, 17, 1.2, [], true).map(p => p.text);
  if (a.some(t => t.includes('ONE TWO'))) { console.log('FAIL pagination joined two sentences', a); fail++; } else console.log('ok   pagination keeps sentences apart', a);
  const b = pageCaptions(w(['Four:', 'more', 'air.']), 3, 17, 1.2, [], true).map(p => p.text);
  if (b.join(' ') !== 'FOUR: MORE AIR') { console.log('FAIL colon join', b); fail++; } else console.log('ok   colon kept across a join', b);
}

process.exit(fail ? 1 : 0);
