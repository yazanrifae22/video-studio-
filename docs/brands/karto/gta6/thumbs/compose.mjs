// Composes the 6 thumbnails: node compose.mjs  (needs work/st_*.png from render-cutouts.mjs + make-sticker.py)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const ROOT = 'E:/clips-viral';
const { chromium } = createRequire(ROOT + '/package.json')('playwright-core');
const HERE = ROOT + '/docs/brands/karto/gta6/thumbs';
const REAL = ROOT + '/packages/cutout/films/gta6/assets/real';
const u = (p) => 'file:///' + p.replace(/\\/g, '/');
const W = (n) => u(`${HERE}/work/${n}.png`);
const FONT_EN = u(ROOT + '/packages/cutout/web/fonts/LilitaOne-Regular.ttf');
const FONT_AR = u(ROOT + '/data/brand/shu-lab/fonts/Lalezar-Regular.ttf');

const css = (lang) => `
@font-face{font-family:EN;src:url('${FONT_EN}')} @font-face{font-family:AR;src:url('${FONT_AR}')}
html,body{margin:0;width:1280px;height:720px;overflow:hidden;background:#222}
.c{position:relative;width:1280px;height:720px;overflow:hidden}
.bg{position:absolute;left:0;top:0;width:1280px;height:720px}
.abs{position:absolute}
.t{position:absolute;font-family:${lang === 'ar' ? 'AR' : 'EN'};color:#FFD23F;-webkit-text-stroke:18px #1a0b33;paint-order:stroke fill;
 line-height:.9;text-shadow:0 9px 0 #1a0b33,0 14px 22px rgba(10,0,30,.55);white-space:nowrap;letter-spacing:${lang === 'ar' ? '0' : '.01em'};direction:${lang === 'ar' ? 'rtl' : 'ltr'}}
.t.w{color:#fff}
img.s{position:absolute;display:block}
`;
const page = (lang, bg, inner, extraCss = '') => `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${css(lang)}${extraCss}</style></head><body><div class="c"><img class="bg" src="${u(REAL + '/' + bg)}">${inner}</div></body></html>`;
const grad = (dir, a, stop = '55%') => `<div class="abs" style="inset:0;background:linear-gradient(${dir},rgba(18,6,48,${a}),rgba(18,6,48,0) ${stop})"></div>`;

const build = {
  A: (lang) => {
    const ar = lang === 'ar';
    const txt = ar
      ? `<div class="t" style="left:20px;top:150px;width:370px;text-align:center;font-size:330px">١٣</div><div class="t" style="left:20px;top:420px;width:370px;text-align:center;font-size:190px">سنة</div>`
      : `<div class="t" style="left:28px;top:150px;font-size:290px">13</div><div class="t" style="left:30px;top:405px;font-size:130px">YEARS</div>`;
    return page(lang, 'keyart3.jpg', grad('90deg', 0.5, '50%') +
      txt +
      `<img class="s" src="${W('st_head_deadpan')}" style="width:262px;left:372px;top:-24px;transform:rotate(-6deg)">` +
      `<img class="s" src="${W('st_skip_skip')}" style="width:215px;right:-10px;top:-18px;transform:rotate(10deg)">`);
  },
  B: (lang) => {
    const ar = lang === 'ar';
    const txt = ar
      ? `<div class="t" style="left:10px;top:20px;width:360px;text-align:center;font-size:330px">١٣</div><div class="t" style="left:10px;top:285px;width:360px;text-align:center;font-size:200px">سنة</div>`
      : `<div class="t" style="left:26px;top:14px;font-size:290px">13</div><div class="t" style="left:28px;top:268px;font-size:128px">YEARS</div>`;
    return page(lang, 'keyart2.jpg', grad('90deg', 0.55, '48%') + txt +
      `<img class="s" src="${W('st_karto_shocked')}" style="height:520px;right:-14px;bottom:-96px">`);
  },
  C: (lang) => {
    const ar = lang === 'ar';
    const txt = ar
      ? `<div class="t" style="left:470px;top:578px;width:520px;text-align:center;font-size:170px">١٣ سنة</div>`
      : `<div class="t" style="left:455px;top:588px;font-size:124px">13 YEARS</div>`;
    const tape = (l, t, w, r) => `<div class="abs" style="left:${l}px;top:${t}px;width:${w}px;height:38px;transform:rotate(${r}deg);background:linear-gradient(180deg,rgba(240,228,186,.92),rgba(222,206,158,.9));box-shadow:0 3px 8px rgba(0,0,0,.35);clip-path:polygon(0 0,2% 25%,0 50%,2% 75%,0 100%,100% 100%,98% 75%,100% 50%,98% 25%,100% 0)"></div>`;
    return page(lang, 'keyart.jpg', grad('0deg', 0.5, '30%') + txt +
      `<img class="s" src="${W('st_head_deadpan')}" style="width:330px;left:118px;top:408px;transform:rotate(-4deg)">` +
      tape(122, 462, 96, -42) + tape(352, 584, 96, -42));
  },
};

fs.mkdirSync(HERE + '/work/html', { recursive: true });
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((f) => fs.existsSync(f));
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
