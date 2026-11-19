// Dev check for the caption splitter (glue words, orphans, timing).
import { pageWords, type Word } from './captions.ts';
const mk = (line: string, text: string, t: number): Word[] => text.split(' ').map((w, i) => ({ w, t0: t + i * 0.3, t1: t + i * 0.3 + 0.25, line }));
for (const s of ['شو الرقم المخبّى ورا الوردة؟ من ١ لـ ٩', 'كم جبت صح من ٤؟ اكتبها بالتعليقات!', 'كم جواب صح جبت من ٤؟ اكتب نتيجتك بالتعليقات!', 'اللي بالنص! الأصفر أفتح، والخمري أغمق.', 'تحت، على يسارك!'])
  console.log(pageWords(mk('x', s, 0)).map(p => p.words.map(w => w.w).join(' ')).join('  |  '));
