/** rank-261028-g3s4 (iceberg top 5) still-clip sources. Usage: npx tsx scripts/pe-ice-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const EO = 'https://science.nasa.gov/earth/earth-observatory/';
const found: Found[] = [
  mk('pe2-b15-hook', EO + 'iceberg-nursery-868/', 'B-15 area, Ross Ice Shelf, 21 Sep 2000 (hook)', 'Brian Montgomery, NASA GSFC (MODIS Science Team data)'),
  mk('pe2-b15-end', EO + 'iceberg-nursery-868/', 'B-15 area, Ross Ice Shelf, 21 Sep 2000 (loop end)', 'Brian Montgomery, NASA GSFC (MODIS Science Team data)'),
  mk('pe2-b15a-oct27', EO + 'b-15a-iceberg-breaks-6009/', 'B-15A iceberg, 27 Oct 2005 (MODIS)', 'Jeff Schmaltz, MODIS Land Rapid Response Team, NASA GSFC'),
  mk('pe2-a23a-main', EO + 'antarctic-iceberg-sails-away-152142/', 'Iceberg A-23A (from Filchner shelf 1986), 28 Nov 2023 (MODIS)', 'NASA Earth Observatory image by Wanmei Liang (MODIS data)'),
  mk('pe2-a23a-track', EO + 'antarctic-iceberg-sails-away-152142/', 'Iceberg A-23A drift map, Weddell Sea', 'NASA Earth Observatory'),
  mk('pe2-c19-a', EO + 'giant-iceberg-drifts-out-to-sea-2987/', 'Iceberg C-19, 17 Nov 2002 (Terra MODIS)', 'Jacques Descloitres, MODIS Land Rapid Response Team, NASA GSFC'),
  mk('pe2-c19-b', EO + 'iceberg-c-19-in-the-ross-sea-antarctica-3251/', 'Iceberg C-19 in the Ross Sea (Terra MODIS)', 'Jacques Descloitres, MODIS Land Rapid Response Team, NASA GSFC'),
  mk('pe2-tir-a', EO + 'landsat-spots-birth-of-iceberg-a-68-90574/', 'Larsen C rift, Landsat 8 thermal, July 2017 (a)', 'NASA Earth Observatory image by Joshua Stevens (Landsat data, USGS)'),
  mk('pe2-tir-b', EO + 'landsat-spots-birth-of-iceberg-a-68-90574/', 'Larsen C rift, Landsat 8 thermal, July 2017 (b)', 'NASA Earth Observatory image by Joshua Stevens (Landsat data, USGS)'),
  mk('pe2-lar-mar08', 'https://svs.gsfc.nasa.gov/30923', 'Larsen C Ice Shelf, Landsat 8, 8 Mar 2017', "NASA's Goddard Space Flight Center (visualization: Amy Moran; Landsat 8 data, USGS)"),
  mk('pe2-lar-sep29', 'https://svs.gsfc.nasa.gov/30923', 'Larsen C Ice Shelf, Landsat 8, 29 Sep 2016', "NASA's Goddard Space Flight Center (visualization: Amy Moran; Landsat 8 data, USGS)"),
];
console.log(JSON.stringify(ingest(found, { query: 'pe iceberg stills', agent: 'showrunner-planet-extremes' })));
