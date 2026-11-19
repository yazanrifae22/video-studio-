/** Register NASA Skylab stills for The Way It Was Made video 3. Usage: npx tsx scripts/twiwm-b3-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const rows: [string, string, string, string][] = [
  ['s73-26401', 'JSC', '1973-05-23', '"Parasol" sunshade for Skylab 1 receives checkout in Bldg 10, Johnson Space Center'],
  ['sl2-04-248', 'JSC', '1973-05-25', 'Skylab 2 fly-around inspection: Orbital Workshop with missing micrometeoroid shield'],
  ['sl2-04-265', 'JSC', '1973-05-25', 'Skylab 2 fly-around inspection: Orbital Workshop, missing shield and partly deployed solar wing'],
  ['S73-26773', 'JSC', '1973-05-26', 'Deployment of the "parasol" solar shield (TV frame)'],
  ['S73-27403', 'JSC', '1973-06-05', 'Tools being considered for freeing the Skylab solar array wing (Marshall)'],
  ['sl2-100-799', 'JSC', '1973-06-07', 'Conrad and Kerwin on EVA to free the Skylab solar array wing, seen from inside the OWS'],
  ['sl2-07-667', 'JSC', '1973-06-22', 'Skylab 2 farewell fly-around: single solar wing and parasol shield'],
];
const found: Found[] = rows.map(([id, center, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: 'NASA',
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center, still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm b3 skylab parasol stills', agent: 'tw-best3' })));
