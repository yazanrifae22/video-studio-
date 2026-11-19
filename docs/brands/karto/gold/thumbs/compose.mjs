// Gold thumbnails: node compose.mjs [A-en,C-ar,...]  (sticker PNGs in work/ come from ../../gta6/thumbs: render-cutouts.mjs + make-sticker.py)
import fs from 'node:fs';
import { createRequire } from 'node:module';
const ROOT = 'E:/clips-viral';
const { chromium } = createRequire(ROOT + '/package.json')('playwright-core');
const HERE = ROOT + '/docs/brands/karto/gold/thumbs';
const REAL = ROOT + '/packages/cutout/films/gold/assets/real';
const u = (p) => 'file:///' + p.replace(/\\/g, '/');
const W = (n) => u(`${HERE}/work/${n}.png`);
const FONT_EN = u(ROOT + '/packages/cutout/web/fonts/LilitaOne-Regular.ttf');
const FONT_AR = u(ROOT + '/data/brand/shu-lab/fonts/Lalezar-Regular.ttf');

const css = (lang) => `
@font-face{font-family:EN;src:url('${FONT_EN}')} @font-face{font-family:AR;src:url('${FONT_AR}')}
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#222}
.c{position:relative;width:1280px;height:720px;overflow:hidden}
.bg{position:absolute;left:0;top:0;width:1280px;height:720px;object-fit:cover}
.abs{position:absolute}
.t{position:absolute;font-family:${lang === 'ar' ? 'AR' : 'EN'};color:#FFD23F;-webkit-text-stroke:18px #1a0b33;paint-order:stroke fill;
 line-height:.9;text-shadow:0 9px 0 #1a0b33,0 14px 22px rgba(10,0,30,.55);white-space:nowrap;direction:${lang === 'ar' ? 'rtl' : 'ltr'};text-align:center}
.t.red{color:#ff2a3a;-webkit-text-stroke:20px #fff;text-shadow:0 10px 0 #5a0710,0 16px 26px rgba(0,0,0,.6)}
img.s{position:absolute;display:block}
`;
const page = (lang, bg, inner, bgcss = '') => `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${css(lang)}</style></head><body><div class="c"><img class="bg" style="${bgcss}" src="${u(REAL + '/' + bg)}">${inner}</div></body></html>`;
const grad = (dir, a, stop) => `<div class="abs" style="inset:0;background:linear-gradient(${dir},rgba(14,6,34,${a}),rgba(14,6,34,0) ${stop})"></div>`;

const build = {
  // A: giant red -30% over the bars + a falling arrow, Karto shocked
  A: (lang) => {
    const ar = lang === 'ar';
    const arrow = `<svg class="abs" style="left:0;top:0;opacity:${ar ? 0.4 : 1}" width="1280" height="720" viewBox="0 0 1280 720">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M40 90 L300 230 L250 290 L560 440 L520 500 L760 640" stroke="#fff" stroke-width="58"/>
      <path d="M40 90 L300 230 L250 290 L560 440 L520 500 L760 640" stroke="#ff2a3a" stroke-width="36"/></g>
      <polygon points="800 690 690 600 830 570" fill="#ff2a3a" stroke="#fff" stroke-width="14" stroke-linejoin="round"/></svg>`;
    const txt = ar
      ? `<div class="t" style="left:20px;top:40px;width:700px;font-size:200px">نزل</div><div class="t red" style="left:20px;top:215px;width:700px;font-size:360px;transform:rotate(-5deg)"><span dir="ltr">٣٠٪</span></div><div class="t" style="left:40px;top:590px;width:700px;font-size:84px;-webkit-text-stroke:14px #1a0b33">من أعلى سعر</div>`
      : `<div class="t red" style="left:10px;top:80px;width:760px;font-size:400px;transform:rotate(-5deg)">-30%</div><div class="t" style="left:30px;top:540px;width:720px;font-size:68px;-webkit-text-stroke:13px #1a0b33">FROM THE JAN RECORD</div>`;
    return page(lang, 'bars_vault.jpg', grad('90deg', 0.6, '62%') + arrow + txt +
      `<img class="s" src="${W('st_karto_shocked')}" style="height:540px;right:-50px;bottom:-100px;transform:rotate(3deg)">`);
  },
  // B: cardboard staircase going down slowly = "not in one day"
  B: (lang) => {
    const ar = lang === 'ar';
    const steps = [0, 1, 2, 3, 4, 5, 6].map((i) => `<div class="abs" style="left:${28 + i * 78}px;top:${420 + i * 30}px;width:80px;height:${300 - i * 30}px;background:linear-gradient(180deg,#d6a86c,#b88347);border:5px solid #6b4520;border-bottom:0;box-sizing:border-box;box-shadow:6px 0 0 rgba(0,0,0,.18)"></div><div class="abs" style="left:${28 + i * 78}px;top:${420 + i * 30}px;width:80px;height:14px;background:#e9c88f;border:5px solid #6b4520;box-sizing:border-box"></div>`).join('');
    const dot = `<div class="abs" style="left:34px;top:344px;width:70px;height:70px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3a0,#f2b705 60%,#a87400);border:5px solid #1a0b33"></div>`;
    const txt = ar
      ? `<div class="t" style="left:10px;top:30px;width:720px;font-size:215px">مو بيوم</div><div class="t" style="left:10px;top:225px;width:720px;font-size:215px">واحد</div>`
      : `<div class="t" style="left:20px;top:30px;width:720px;font-size:205px">NOT IN</div><div class="t" style="left:20px;top:225px;width:720px;font-size:205px">ONE DAY</div>`;
    return page(lang, 'boe_bars.jpg', grad('90deg', 0.62, '64%') + txt + dot + steps +
      `<div class="t red" style="left:395px;top:580px;width:300px;font-size:120px;-webkit-text-stroke:14px #fff;transform:rotate(-4deg)">${ar ? '<span dir="ltr">٣٠٪</span>' : '-30%'}</div>` +
      `<img class="s" src="${W('st_karto_shocked')}" style="height:540px;right:-50px;bottom:-95px">`, 'object-position:30% 50%');
  },
  // C: a queue of cardboard figures (Skip = the crowd) in the gold souk, Karto asks who sold
  C: (lang) => {
    const ar = lang === 'ar';
    const q = [0, 1, 2, 3, 4].map((i) => `<img class="s" src="${W(i % 2 ? 'st_skip_shocked' : 'st_skip_skip')}" style="height:${300 - i * 28}px;left:${10 + i * 150}px;bottom:${-10 + i * 18}px;transform:rotate(${i % 2 ? 5 : -5}deg)">`).join('');
    const txt = ar
      ? `<div class="t" style="left:0px;top:50px;width:780px;font-size:250px">مين باع؟</div>`
      : `<div class="t" style="left:0px;top:70px;width:780px;font-size:215px">WHO SOLD?</div>`;
    return page(lang, 'souk_windows.jpg', grad('90deg', 0.55, '60%') + grad('0deg', 0.45, '35%') + txt + q +
      `<img class="s" src="${W('st_karto_shocked')}" style="height:540px;right:-50px;bottom:-95px">`);
  },
};

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((f) => fs.existsSync(f));
fs.mkdirSync(HERE + '/work/html', { recursive: true });
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files'] });
const only = process.argv[2];
for (const k of Object.keys(build)) for (const lang of ['en', 'ar']) {
  const name = `${k}-${lang}`;
  if (only && !only.split(',').includes(name)) continue;
  const f = `${HERE}/work/html/${name}.html`;
  fs.writeFileSync(f, build[k](lang), 'utf8');
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await p.goto(u(f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: `${HERE}/${name}.jpg`, type: 'jpeg', quality: 90 });
  await p.close(); console.log('ok', name);
}
await browser.close();
