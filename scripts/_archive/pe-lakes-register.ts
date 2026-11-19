/** rank-261028-akrv (Great Lakes by volume): NASA images -> studio clip with volume-bar overlay. Usage: npx tsx scripts/pe-lakes-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const found: Found[] = [{
  source_platform: 'nasa', external_id: 'pe-best3-lakes', original_url: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e001118',
  title: 'Great Lakes by volume: five NASA images, to-scale volume bars (studio chart)',
  creator: 'NASA Earth Observatory / NASA GSFC (MODIS Aqua); NASA ISS crew photographs',
  description: 'Studio clip (data/pe-lakes/mklakes.py) from five NASA images: Superior GSFC_20171208_Archive_e001118 (MODIS Aqua, 20 Apr 2014); Michigan GSFC_20171208_Archive_e001923 (MODIS Aqua, 17 Dec 2010); Huron iss074e0642367 (ISS, Jessica Meir, 30 May 2026); Ontario iss036e035632 (ISS, Karen Nyberg, 24 Aug 2013); Erie iss059e090279 (ISS Expedition 59, 3 Jun 2019). Volume bars are a studio overlay (EPA Great Lakes volumes).',
  published_at: null, duration: null, view_count: null, license: 'Public Domain', license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: null, width: 1080, height: 1920,
  extra: { kind: 'still-image-animation' } }];
console.log(JSON.stringify(ingest(found, { query: 'pe-best3 lakes', agent: 'showrunner-planet-extremes' })));
