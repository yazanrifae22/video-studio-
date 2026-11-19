/** rank-261028-dhcd (largest eruptions): NASA EO still clips + original volume-cube graphic sources. Usage: npx tsx scripts/pe-erupt-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const EO = 'https://science.nasa.gov/earth/earth-observatory/';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const TO = ['https://earthobservatory.nasa.gov/images/7380/toba-caldera', 'Image courtesy of NASA/GSFC/MITI/ERSDAC/JAROS, and the U.S./Japan ASTER Science Team'];
const YE = [EO + 'yellowstone-national-park-87881/', 'NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey and ASTER GDEM data from NASA/GSFC/METI/ERSDAC/JAROS, and U.S./Japan ASTER Science Team'];
const SN = [EO + 'snake-river-plain-idaho-35549/', 'Image courtesy the MODIS Rapid Response Team at NASA GSFC'];
const CR = [EO + 'volcanic-rocks-southwestern-colorado-8720/', 'NASA image created by Jesse Allen, using data provided courtesy of NASA/GSFC/METI/ERSDAC/JAROS, and U.S./Japan ASTER Science Team'];
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-erupt-scale.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic data graphic drawn with PIL from numbers only (USGS-published eruption volumes; cube volume proportional to erupted volume, one constant scale); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1 (Copyright 2009 The Cairo Project Authors; data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  mk('pe6-toba', TO[0], 'Toba Caldera, Sumatra, ASTER 28 Jan 2006 (Lake Toba and Samosir resurgent dome)', TO[1]),
  mk('pe6-yell', YE[0], 'Yellowstone National Park, Landsat 8 (9 Jun 2013) over ASTER elevation model (Yellowstone Lake)', YE[1]),
  mk('pe6-snake', SN[0], 'Snake River Plain, Idaho, MODIS 29 Aug 2008 (also Great Salt Lake)', SN[1]),
  mk('pe6-creede', CR[0], 'Creede Caldera region, San Juan Mountains, Colorado, ASTER 3 Nov 2007', CR[1]),
  own('pe6-g-hooka', 'Volume cubes: #1 Wah Wah Springs 5,900 km3 vs Pinatubo 5 km3 (frame 0 crop)'),
  own('pe6-g-hookb', 'Volume cubes: all five eruptions vs Pinatubo, one scale'),
  own('pe6-g-c5', 'Volume cubes: Huckleberry Ridge 2,450 km3 vs Pinatubo'),
  own('pe6-g-c4', 'Volume cubes: Grey\'s Landing 2,800 km3 vs Pinatubo'),
  own('pe6-g-c3', 'Volume cubes: La Garita (Fish Canyon Tuff) 5,000 km3 vs Pinatubo'),
  own('pe6-g-c2', 'Volume cubes: Toba 5,300 km3 vs Pinatubo'),
  own('pe6-g-lead', 'Volume cubes: #1 5,900 vs #2 5,300 vs #3 5,000 outlines'),
  own('pe6-g-end', 'Volume cubes: #1 vs Pinatubo, push-out ends on the exact frame-0 crop (loop)'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe eruptions stills + graphics', agent: 'showrunner-planet-extremes' })));
