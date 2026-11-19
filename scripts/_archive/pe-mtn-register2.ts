/** rank-261028-kb5h (tallest mountains): NASA/JPL still clips + original height-bar graphic sources. Usage: npx tsx scripts/pe-mtn-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const PJ = 'https://photojournal.jpl.nasa.gov/catalog/';
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-mtn-scale.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic data graphic drawn with PIL from numbers only (published peak heights; bar length proportional to height, one constant scale); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1 (Copyright 2009 The Cairo Project Authors; data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const VK = ['https://science.nasa.gov/resource/viking-1-orbiter-image-olympus-mons/', 'NASA/JPL-Caltech/USGS'];
const found: Found[] = [
  own('pe7b-g-hookb', 'Height bars: Everest vs the five tallest, one scale (lineup)'),
  own('pe7b-g-c5', 'Height bar: Maxwell Montes 11 km vs Everest 8.85 km'),
  own('pe7b-g-c4', 'Height bar: Iapetus equatorial ridge 13 km vs Everest'),
  own('pe7b-g-c3', 'Height bar: Boosaule Montes 17.5 km vs Everest'),
  own('pe7b-g-c2', 'Height bar: Rheasilvia central complex 20 km vs Everest'),
  own('pe7b-g-lead', 'Height bars: Olympus Mons 21.3 vs Vesta 20 vs Everest'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe7b scope-footer graphics', agent: 'showrunner-planet-extremes' })));
