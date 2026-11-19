/** Register hi-res NASA stills for The Way It Was Made video 2 (Shuttle Carrier Aircraft). Usage: npx tsx scripts/twiwm-b2-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const rows: [string, string, string, string, string][] = [
  ['EC05-0166-37', 'NASA/Lori Losey', 'AFRC', '2005-08-19', 'Discovery hitched a ride on the 747 Shuttle Carrier Aircraft, Dryden to Kennedy'],
  ['EC05-0166-34', 'NASA/Tony Landis', 'AFRC', '2005-08-19', 'Shuttle Carrier Aircraft with Discovery lifts off from Edwards for the ferry flight'],
  ['EC05-0166-33', 'NASA/Tom Tschida', 'AFRC', '2005-08-19', 'Shuttle Carrier Aircraft with Discovery lifts off from Edwards (second view)'],
  ['ED05-0166-29', 'NASA/Carla Thomas', 'AFRC', '2005-08-18', 'Discovery raised so the 747 can be positioned under it for the ferry flight'],
  ['EC00-0311-9', 'NASA/Carla Thomas', 'AFRC', '2000-10-29', 'STS-92 Orbiter in the Mate-Demate Device at sunrise with the Shuttle Carrier Aircraft'],
  ['201204210001HQ', 'NASA/Bill Ingalls', 'HQ', '2012-04-21', 'Shuttle Enterprise mated on the 747 at Washington Dulles, weather delay'],
  ['201204170010HQ', 'NASA/Robert Markowitz', 'HQ', '2012-04-17', 'Space Shuttle Discovery DC Fly-Over atop the 747'],
];
const found: Found[] = rows.map(([id, who, center, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: who,
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~${id.endsWith('HQ') ? 'large' : 'orig'}.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center, still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm b2 shuttle carrier aircraft stills', agent: 'tw-best2' })));
