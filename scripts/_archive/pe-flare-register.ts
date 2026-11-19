/** rank-261028-xkgv (top-5 solar flares): NASA SVS 2959 SOHO/EIT still+time-lapse clips and original X-class bar graphics. Usage: npx tsx scripts/pe-flare-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const SVS = 'https://svs.gsfc.nasa.gov/2959';
const mk = (id: string, title: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: SVS, title, creator: 'NASA/ESA, NASA/Goddard Space Flight Center Scientific Visualization Studio (animator Tom Bridgman; SOHO/EIT data collected by NASA and ESA)',
  description: null, published_at: '2004-07-08T00:00:00Z', duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)', license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-flare-gfx.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic data graphic drawn with PIL from numbers only (peak GOES soft X-ray class, NOAA original scale; bar length proportional to class, one constant scale); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1 (data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  mk('pe9-hook_a', 'SOHO/EIT 195 A, 4 Nov 2003 19:48 UT flare (SVS 2959 frame 1300), hook push-in'),
  mk('pe9-end', 'SOHO/EIT 195 A, 4 Nov 2003 19:48 UT flare (SVS 2959 frame 1300), loop-end pull-out'),
  mk('pe9-e1_a', 'SOHO/EIT 195 A time-lapse around 4 Nov 2003 flare (SVS 2959 movie)'),
  mk('pe9-e4_a', 'SOHO/EIT 195 A time-lapse around 28 Oct 2003 flare (SVS 2959 movie)'),
  mk('pe9-e4_b', 'SOHO/EIT 195 A, 28 Oct 2003 11:12 UT flare (SVS 2959 frame 417)'),
  own('pe9-g-hook_b', 'X-class bars: five strongest flares, one scale (lineup)'),
  own('pe9-g-c5a', 'X-class bar: 7 Sep 2005 X17.0'),
  own('pe9-g-c5b', 'X-class bars: ladder, #5 highlighted'),
  own('pe9-g-c3a', 'X-class bar: 16 Aug 1989 X20.0'),
  own('pe9-g-c3b', 'X-class bars: ladder, #3 highlighted'),
  own('pe9-g-c2a', 'X-class bar: 2 Apr 2001 X20.0'),
  own('pe9-g-c2b', 'X-class bars: ladder, #2 highlighted'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe9 solar flares stills + graphics', agent: 'showrunner-planet-extremes' })));
