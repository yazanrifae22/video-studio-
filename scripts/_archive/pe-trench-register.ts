/** Plan n=4 (deepest ocean trenches): register original graphics + NASA EO sonar-map clips. Usage: npx tsx scripts/pe-trench-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';

const GFX = 'file:///E:/clips-viral/scripts/pe-trench-graphics.py';
const own = (id: string, title: string, description: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: GFX, title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: description + ' Font: Cairo Black/Bold, SIL Open Font License 1.1 (Copyright 2009 The Cairo Project Authors; data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920,
  extra: { kind: 'original-graphic' } });
const ETOPO = 'Shaded relief drawn by the studio from NOAA NCEI ETOPO 2022 15 arc-second Global Relief Model data (U.S. Government work, public domain; doi:10.25921/fd45-gt74), fetched by scripts/pe-trench-fetch.py; depth gauge uses the cited depth and Everest 8,849 m; no third-party imagery.';
const NASA_PAGE = 'https://science.nasa.gov/earth/earth-observatory/new-view-of-the-deepest-trench-77640/';
const nasa = (id: string, title: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: NASA_PAGE, title, creator: 'NASA Earth Observatory map by Jesse Allen, made with data from the University of New Hampshire Center for Coastal and Ocean Mapping/NOAA Joint Hydrographic Center',
  description: 'Portrait slow-push clip (scripts/pe-trench-still2clip.py) cut from https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/77000/77640/marianatrench_bathmetry_lrg.jpg (2010 multibeam sonar bathymetry of the Mariana Trench).',
  published_at: null, duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: 1080, height: 1920,
  extra: { kind: 'still-image' } });

console.log(JSON.stringify(ingest([
  own('pe4-hook', 'Heights to scale: Mount Everest (8,849 m) on the Challenger Deep floor (10,935 m)', 'Schematic cross-section, heights to scale (walls/mountain outline schematic); 2,086 m of water above the summit.'),
  own('pe4-hook-end', 'Heights to scale: Everest in the Challenger Deep (loop-end push-out to frame 0)', 'Same graphic rendered backwards in time so the last frame equals the hook frame 0.'),
  own('pe4-map-izu', 'Izu-Ogasawara Trench relief (NOAA ETOPO 2022 data) + depth gauge 9,801 m', ETOPO),
  own('pe4-map-philippine', 'Philippine Trench relief (NOAA ETOPO 2022 data) + depth gauge 10,045 m', ETOPO),
  own('pe4-map-kermadec', 'Kermadec Trench relief (NOAA ETOPO 2022 data) + depth gauge 10,047 m', ETOPO),
  own('pe4-map-tonga', 'Tonga Trench relief (NOAA ETOPO 2022 data) + depth gauge 10,816 m', ETOPO),
  nasa('pe4-nasa-bathy-wide', 'Mariana Trench sonar bathymetry (NASA EO 77640), wide push'),
  nasa('pe4-nasa-bathy-close', 'Mariana Trench sonar bathymetry (NASA EO 77640), close push'),
], { query: 'pe4 deepest trenches graphics + NASA EO map', agent: 'showrunner-planet-extremes' })));
