// Channel art for Karto & Skip (EN + AR): node make-art.mjs
// avatar.png 800x800 (shared), banner-en.png / banner-ar.png 2560x1440 (safe area 1546x423 in the centre).
import fs from 'node:fs';
import { createRequire } from 'node:module';
const ROOT = 'E:/clips-viral';
const { chromium } = createRequire(ROOT + '/package.json')('playwright-core');
const HERE = ROOT + '/docs/brands/karto/channels';
const u = (p) => 'file:///' + p.replace(/\\/g, '/');
const W = (n) => u(`${ROOT}/docs/brands/karto/gta6/thumbs/work/${n}.png`);
const FONT_EN = u(ROOT + '/packages/cutout/web/fonts/LilitaOne-Regular.ttf');
const FONT_AR = u(ROOT + '/data/brand/shu-lab/fonts/Lalezar-Regular.ttf');
const base = `@font-face{font-family:EN;src:url('${FONT_EN}')} @font-face{font-family:AR;src:url('${FONT_AR}')}
html,body{margin:0;overflow:hidden} .abs{position:absolute} img{position:absolute;display:block}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,#7a56ff 0%,#4a2bc4 46%,#27125f 100%)}
.dots{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.09) 3px,transparent 4px);background-size:44px 44px}`;

const avatar = `<!doctype html><html><head><meta charset="utf-8"><style>${base}
body{width:800px;height:800px}
</style></head><body><div class="bg" style="background:radial-gradient(circle at 50% 42%,#8a66ff 0%,#5231d6 55%,#2c1570 100%)"></div><div class="dots"></div>
<img src="${W('st_head_shocked')}" style="width:760px;left:20px;top:150px;transform:rotate(-4deg)">
</body></html>`;

const banner = (lang) => {
  const ar = lang === 'ar';
  const title = ar ? 'كرتو وسكيب' : 'KARTO & SKIP';
  const tag = ar ? 'أكبر قصص الإنترنت، محكية بالكرتون' : 'Viral stories, told in cardboard';
  // safe area: x 507..2053, y 508..931
  return `<!doctype html><html lang="${lang}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>${base}
body{width:2560px;height:1440px}
.t{position:absolute;left:${ar ? 770 : 870}px;width:920px;text-align:center;font-family:${ar ? 'AR' : 'EN'};white-space:nowrap}
.h{top:${ar ? 545 : 590}px;font-size:${ar ? 210 : 138}px;line-height:1;color:#FFD23F;-webkit-text-stroke:18px #1a0b33;paint-order:stroke fill;text-shadow:0 10px 0 #1a0b33,0 18px 26px rgba(10,0,30,.5);letter-spacing:${ar ? 0 : '.02em'}}
.s{top:${ar ? 800 : 780}px;font-size:${ar ? 62 : 56}px;line-height:1.1;color:#fff;-webkit-text-stroke:10px #1a0b33;paint-order:stroke fill}
.floor{position:absolute;left:0;right:0;top:1010px;height:430px;background:linear-gradient(180deg,#c99a63,#a97a47);box-shadow:0 -10px 0 #1a0b33}
</style></head><body><div class="bg"></div><div class="dots"></div>
<div class="t h">${title}</div><div class="t s">${tag}</div>
<img src="${W('st_karto_shocked')}" style="height:345px;left:${ar ? 1700 : 510}px;top:548px;transform:rotate(${ar ? 4 : -4}deg)">
<img src="${W('st_skip_skip')}" style="height:320px;left:${ar ? 525 : 1800}px;top:565px;transform:rotate(${ar ? -6 : 6}deg)">
</body></html>`;
};

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((f) => fs.existsSync(f));
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files'] });
fs.mkdirSync(HERE + '/work', { recursive: true });
for (const [name, html, w, h] of [['avatar', avatar, 800, 800], ['banner-en', banner('en'), 2560, 1440], ['banner-ar', banner('ar'), 2560, 1440]]) {
  const f = `${HERE}/work/${name}.html`;
  fs.writeFileSync(f, html, 'utf8');
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(u(f)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  await p.screenshot({ path: `${HERE}/${name}.png`, type: 'png' });
  await p.close(); console.log('ok', name);
}
await browser.close();
