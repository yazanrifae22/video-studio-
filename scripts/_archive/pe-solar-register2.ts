/** rank-261028-942s v3: Mariner 10 Mercury mosaics (NASA/JPL only credit) + re-timed Venus clips. Usage: npx tsx scripts/pe-solar-register2.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const PJ = 'https://science.nasa.gov/photojournal/';
const found: Found[] = [
  mk('pe9-mer1', PJ + 'photomosaic-of-mercury-inbound-view', 'Photomosaic of Mercury - Inbound View (PIA03103), Mariner 10 - #2 shot 1', 'NASA/JPL'),
  mk('pe9-mer2', PJ + 'photomosaic-of-mercury-outbound-view', 'Photomosaic of Mercury - Outbound View (PIA03104), Mariner 10 - #2 shot 2', 'NASA/JPL'),
  mk('pe9-v1b', PJ + 'venus-3-d-perspective-view-of-maat-mons/', 'Venus - 3-D Perspective View of Maat Mons (PIA00106), Magellan radar 3-D, simulated colour - #1 shot 4.3 s', 'NASA/JPL'),
  mk('pe9-endb', PJ + 'venus-3-d-perspective-view-of-maat-mons-2/', 'Venus - 3-D Perspective View of Maat Mons (PIA00254) - loop end 3.4 s, pull-back to frame-0 crop', 'NASA/JPL'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe hottest planets stills v3', agent: 'showrunner-planet-extremes' })));
