// Writes the demo show files (show.en.json, show.ar.json, show.en.tall.json, show.ar.tall.json) from the hand-written
// lines below. Word times are spread over each line by word length (the real builder takes them from narration).
//   node packages/cutout/films/_demo/make-shows.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));

const L = [ // id, who, t0, t1, en, ar
  ['l001', 'karto', 0.4, 3.2, 'Skip, put the phone down. One minute.', 'سكيب، نزّل التلفون. دقيقة وحدة بس.'],
  ['l002', 'skip', 3.4, 5.6, 'One minute. Then I skip.', 'دقيقة وحدة، وبعدين بقلّب.'],
  ['l003', 'karto', 5.8, 9.4, 'In 1970, three astronauts fixed their ship with tape and cardboard.', 'سنة 1970، تلت رواد فضاء صلّحوا مركبتهم بلزقة وكرتون.'],
  ['l004', 'skip', 9.6, 11.6, 'Wait... what?', 'لحظة... شو؟'],
  ['l005', 'karto', 11.8, 14.0, "Their air filter didn't fit. So they built one.", 'فلتر الهوا ما ركب. فعملوا واحد بإيدهن.'],
  ['l006', 'karto', 15.8, 19.0, 'They were almost 400,000 kilometres from home.', 'كانوا بعاد عن البيت شي 400 ألف كيلومتر.'],
  ['l007', 'skip', 19.2, 21.0, 'That is... far.', 'هاد... بعيد كتير.'],
  ['l008', 'karto', 21.2, 24.4, 'Here is the trip, step by step.', 'هي الرحلة، خطوة بخطوة.'],
  ['l009', 'karto', 24.6, 27.6, 'Air, water, power: everything running low.', 'الهوا، المي، الكهربا: كلشي عم يخلص.'],
  ['l010', 'skip', 27.8, 29.8, 'Okay. I am not skipping.', 'طيب. ما رح قلّب.'],
  ['l011', 'karto', 31.0, 34.0, 'Real footage from space, frame by frame.', 'لقطات حقيقية من الفضاء، كادر بكادر.'],
  ['l012', 'skip', 34.2, 36.4, 'So who wins? Them or the ship?', 'مين بيربح؟ هنن ولا المركبة؟'],
  ['l013', 'karto', 36.6, 39.6, 'They splashed down safe. All three.', 'نزلوا بالبحر سالمين. التلاتة.'],
  ['l014', 'skip', 39.8, 41.6, 'Okay. Mind blown.', 'طيب. انفجر مخي.'],
  ['l015', 'karto', 41.8, 44.6, 'The next story is even crazier. Go.', 'القصة الجاية أجنّ. يلا.'],
];
const chapters = [
  ['c01', 0, 14.3, 'One minute', 'دقيقة وحدة'], ['c02', 14.3, 30.1, 'Far from home', 'بعيد عن البيت'], ['c03', 30.1, 46, 'The way back', 'طريق الرجعة'],
];
const S = {
  cb_patience: ["Skip's patience", 'صبر سكيب'], cap_photo: ['NASA, 1970', 'ناسا، ١٩٧٠'], cr_nasa: ['Photo: NASA', 'صورة: ناسا'],
  lab_tape: ['Tape + cardboard', 'لزقة وكرتون'], sp_what: ['Wait... what?', 'لحظة... شو؟'], sp_tape: ['Tape. Real tape.', 'لزقة. لزقة حقيقية.'],
  unit_km: ['km from home', 'كم عن البيت'], pin_start: ['Launch', 'الإقلاع'], pin_turn: ['Around the Moon', 'حول القمر'], pin_home: ['Home', 'الرجعة'],
  bar_air: ['Air', 'الهوا'], bar_water: ['Water', 'المي'], bar_power: ['Power', 'الكهربا'], unit_pct: ['%', '٪'],
  tl_launch: ['Launch', 'الإقلاع'], tl_bang: ['The bang', 'الانفجار'], tl_moon: ['The Moon', 'القمر'], tl_home: ['Home', 'الرجعة'],
  tl_d1: ['Day 1', 'يوم ١'], tl_d3: ['Day 3', 'يوم ٣'], tl_d5: ['Day 5', 'يوم ٥'], tl_d7: ['Day 7', 'يوم ٧'],
  vs_crew: ['The crew', 'الطاقم'], vs_ship: ['The ship', 'المركبة'], stamp_safe: ['Safe!', 'سالمين!'],
};
const top = {
  en: { hook_text: 'They fixed a spaceship with tape', end_text: 'Watch the next one', key_words: ['tape', 'cardboard', 'safe'], short: { hook_text: 'Tape. In space. Really.', cta_text: 'Full story: tap the video below' } },
  ar: { hook_text: 'صلّحوا مركبة فضاء بلزقة', end_text: 'شوف القصة الجاية', key_words: ['لزقة', 'كرتون', 'سالمين'], short: { hook_text: 'لزقة. بالفضاء. عن جد.', cta_text: 'القصة كاملة: اضغط عالفيديو تحت' } },
};
function words(text, t0, t1) {
  const ws = text.split(/\s+/).filter(Boolean), tot = ws.reduce((a, w) => a + w.length + 2, 0); let t = t0; const out = [];
  for (const w of ws) { const d = ((w.length + 2) / tot) * (t1 - t0); out.push({ w, t0: +t.toFixed(3), t1: +(t + d * 0.92).toFixed(3) }); t += d; }
  return out;
}
for (const lang of ['en', 'ar']) for (const layout of ['wide', 'tall']) {
  const i = lang === 'en' ? 4 : 5;
  const show = {
    schema: 'cutout/1', lang, dir: lang === 'ar' ? 'rtl' : 'ltr', layout, fps: 30,
    width: layout === 'wide' ? 1920 : 1080, height: layout === 'wide' ? 1080 : 1920, duration: 46,
    film: '/packages/cutout/films/_demo/film.js', window: null, tail: 4.4,
    hook_text: top[lang].hook_text, end_text: top[lang].end_text, captions: true, key_words: top[lang].key_words,
    chapters: chapters.map(([id, t0, t1, en, ar]) => ({ id, title: lang === 'en' ? en : ar, t0, t1, mood: 'curious' })),
    lines: L.map((l) => ({ id: l[0], chapter: chapters.find((c) => l[2] >= c[1] && l[2] < c[2])[0], who: l[1], text: l[i], t0: l[2], t1: l[3], words: words(l[i], l[2], l[3]) })),
    strings: Object.fromEntries(Object.entries(S).map(([k, v]) => [k, lang === 'en' ? v[0] : v[1]])),
    short: layout === 'tall' ? { id: 's1', ...top[lang].short, t0: 30.1, t1: 46 } : null,
  };
  const f = path.join(dir, `show.${lang}${layout === 'tall' ? '.tall' : ''}.json`);
  fs.writeFileSync(f, JSON.stringify(show, null, 1), 'utf8');
  console.log('wrote', f);
}
