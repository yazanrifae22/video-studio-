/** rank-261028-g3s4: hook/end/nursery re-cut sources. */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const EO = 'https://science.nasa.gov/earth/earth-observatory/';
const b = 'Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC';
console.log(JSON.stringify(ingest([
  
  
  mk('pe2-nurs-hook', EO + 'iceberg-nursery-868/', 'B-15 area, Ross Ice Shelf, 21 Sep 2000 (hook shot 2)', 'Brian Montgomery, NASA GSFC (MODIS Science Team data)'),
], { query: 'pe iceberg stills 2', agent: 'showrunner-planet-extremes' })));
