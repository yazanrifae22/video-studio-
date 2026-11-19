/** Register NASA stills for comp-261102-53wv (Apollo Lunar Roving Vehicle). Usage: npx tsx scripts/twiwm-53wv-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const rows: [string, string, string, string, string][] = [
  ['7021093', 'NASA/MSFC', 'MSFC', '1971-07-01', 'Front view of a folded configuration of Lunar Roving Vehicle No. 2'],
  ['7021092', 'NASA/MSFC', 'MSFC', '1971-07-01', 'Rear view of a folded configuration of Lunar Roving Vehicle No. 2'],
  ['6640863', 'NASA/MSFC', 'MSFC', '1966-06-01', 'Wernher von Braun test drives the Mobility Test Article at Marshall'],
  ['7025449', 'NASA/MSFC', 'MSFC', '1971-11-01', 'Astronauts await LRV qualification test unit deployment tests, MSFC building 4649'],
  ['as15-88-11901', 'NASA/JSC', 'JSC', '1971-08-01', 'Lunar Roving Vehicle against the lunar background, Apollo 15 EVA-3'],
  ['as17-147-22527', 'NASA/JSC', 'JSC', '1972-12-10', 'Eugene Cernan drives the Lunar Roving Vehicle during Apollo 17 first EVA'],
  ['as17-137-20979', 'NASA/JSC', 'JSC', '1972-12-12', 'Close-up of the Apollo 17 LRV with the makeshift fender repair'],
  ['as16-115-18559', 'NASA/JSC', 'JSC', '1972-04-23', 'John Young drives the LRV to its final parking place, Apollo 16 EVA-3'],
];
const found: Found[] = rows.map(([id, who, center, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: who,
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center, still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm 53wv lunar roving vehicle stills', agent: 'twiwm-sr-a2' })));
