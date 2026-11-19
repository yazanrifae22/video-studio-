/** rank-261028-urfr (space rocks that exploded over Earth): NASA still clips + original data-graphic sources. Usage: npx tsx scripts/pe-fireball-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const BM = 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry';
const loc = (id: string, title: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: BM, title, creator: 'NASA Earth Observatory, Blue Marble: Next Generation (Reto Stockli); locator marker and graticule added by Clips Viral Studio',
  description: 'World base map (equirectangular, topography and bathymetry) cropped and zoomed to the CNEOS fireball coordinates; marker and 10-degree graticule drawn by the studio.',
  published_at: null, duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: 5400, height: 2700, extra: { kind: 'still-image' } });
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-fireball-gfx.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic bar graphic drawn with PIL from numbers only (NASA/JPL CNEOS fireball API impact-e, kt TNT, one linear scale); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1.',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  { source_platform: 'nasa', external_id: 'pe11-misr', original_url: 'https://www.jpl.nasa.gov/images/pia22825-misr-images-fireball-over-bering-sea/', title: 'MISR Images Fireball Over Bering Sea (PIA22825), Terra, 18 Dec 2018 - slow push',
    creator: 'NASA/GSFC/LaRC/JPL-Caltech, MISR Team', description: 'View from MISR on Terra a few minutes after the 18 Dec 2018 Bering Sea fireball (23:55 UTC): shadow of the trail, orange cloud of heated air.',
    published_at: null, duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: 1830, height: 1830, extra: { kind: 'still-image' } },
  loc('pe11-loc5', 'Blue Marble locator: #5 southern Africa fireball 2009-11-21 (22.0 S 29.2 E)'),
  loc('pe11-loc4', 'Blue Marble locator: #4 western Pacific fireball 1994-02-01 (2.7 N 164.1 E)'),
  loc('pe11-loc3', 'Blue Marble locator: #3 Sulawesi, Indonesia fireball 2009-10-08 (4.2 S 120.6 E)'),
  loc('pe11-loc2', 'Blue Marble locator: #2 Bering Sea fireball 2018-12-18 (56.9 N 172.4 E)'),
  own('pe11-g-hookbars', 'Energy bars: five CNEOS fireballs, one scale (hook)'),
  own('pe11-g-bar5', 'Energy bars: #5 highlighted'), own('pe11-g-bar4', 'Energy bars: #4 highlighted'), own('pe11-g-bar3', 'Energy bars: #3 highlighted'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe11 fireball stills + graphics', agent: 'showrunner-planet-extremes' })));
