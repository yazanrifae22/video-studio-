/** Register NASA Apollo 13 stills for The Way It Was Made video 4. Usage: npx tsx scripts/twiwm-b4-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const rows: [string, string, string][] = [
  ['7010516', '1970-04-01', 'Apollo 13 onboard photo: severely damaged Service Module after jettison (MSFC Saturn Apollo Program record)'],
  ['AS13-59-8562', '1970-04-17', 'Apollo 13 Lunar Module photographed from the Command Module just after jettison'],
  ['AS13-62-8929', '1970-04-14', 'Interior view of the Apollo 13 Lunar Module with the "mail box" rigged to purge carbon dioxide'],
  ['AS13-59-8484', '1970-04-14', 'Astronaut James Lovell at his position in the Lunar Module (lifeboat)'],
  ['AS13-59-8501', '1970-04-17', 'Damaged Apollo 13 Service Module photographed after jettisoning'],
  ['S70-35368', '1970-04-16', 'Mission Control Center during the Apollo 13 emergency return'],
  ['S70-35013', '1970-04-15', 'Prototype of the "mail box" displayed in Mission Control'],
  ['S70-35644', '1970-04-17', 'Apollo 13 Command Module splashdown, South Pacific'],
];
const found: Found[] = rows.map(([id, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: 'NASA',
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center: 'JSC', still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm b4 apollo 13 mail box stills', agent: 'tw-best4' })));
