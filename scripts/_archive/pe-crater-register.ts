/** rank-261028-jdml (largest impact craters) still-clip + original graphic sources. Usage: npx tsx scripts/pe-crater-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const EO = 'https://science.nasa.gov/earth/earth-observatory/';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const VR = [EO + 'vredefort-crater-92689/', 'NASA Earth Observatory image by Lauren Dauphin, using Landsat data from the U.S. Geological Survey'];
const AC = [EO + 'acraman-impact-structure-south-australia-42813/', 'NASA Earth Observatory image created by Jesse Allen, using data obtained from the Goddard Level 1 and Atmospheric Archive and Distribution System (LAADS)'];
const PO = [EO + 'russias-crater-of-diamonds-148403/', 'NASA Earth Observatory images by Joshua Stevens, using data from NASA/METI/AIST/Japan Space Systems, and the U.S./Japan ASTER Science Team, and Blue Marble data from NASA Earth Observatory'];
const SU = [EO + 'sudbury-impact-structure-148844/', 'NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey and topographic data from the Shuttle Radar Topography Mission (SRTM)'];
const CH = [EO + 'relief-map-yucatan-peninsula-mexico-3267/', 'Image Courtesy SRTM Team NASA/JPL/NIMA'];
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-crater-scale.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic data graphic drawn with PIL from numbers only (Earth Impact Database diameters: Chicxulub 150 km, Vredefort 160 km); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1 (Copyright 2009 The Cairo Project Authors; data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  mk('pe5-v-hook1', VR[0], 'Vredefort impact structure, Landsat 8, 27 Jun 2018 (hook crop, ring of hills)', VR[1]),
  mk('pe5-v-hook2', VR[0], 'Vredefort impact structure, Landsat 8, 27 Jun 2018 (hook crop 2)', VR[1]),
  mk('pe5-v-1', VR[0], 'Vredefort impact structure, Landsat 8, 27 Jun 2018 (#1 wide)', VR[1]),
  mk('pe5-v-end', VR[0], 'Vredefort impact structure, Landsat 8, 27 Jun 2018 (loop end = frame 0 crop)', VR[1]),
  mk('pe5-a-1', AC[0], 'Lake Acraman region, South Australia, MODIS 18 Feb 2010 (wide)', AC[1]),
  mk('pe5-a-2', AC[0], 'Lake Acraman region, South Australia, MODIS 18 Feb 2010 (close)', AC[1]),
  mk('pe5-p-1', PO[0], 'Popigai crater region, ASTER 3D relief view (a)', PO[1]),
  mk('pe5-p-2', PO[0], 'Popigai crater region, ASTER 3D relief view (b)', PO[1]),
  mk('pe5-s-1', SU[0], 'Sudbury region, SRTM relief (colour-coded elevation), 2000', SU[1]),
  mk('pe5-s-2', SU[0], 'Sudbury region, Landsat 8, 11 Sep 2020', SU[1]),
  mk('pe5-c-1', CH[0], 'Relief map, Yucatan Peninsula, Mexico (SRTM shaded relief, PIA03379)', CH[1]),
  own('pe5-scale-chix', 'Size to scale: Chicxulub (150 km) vs Vredefort (160 km), EID diameters'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe impact craters stills', agent: 'showrunner-planet-extremes' })));
