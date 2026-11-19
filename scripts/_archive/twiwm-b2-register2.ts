import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const rows: [string, string, string, string, string][] = [
  ['EC05-0166-25', 'NASA/Tom Tschida', 'AFRC', '2005-08-14', 'Sun sets on Discovery in the Mate-Demate Device after its landing at Dryden'],
  ['EC05-0166-40', 'NASA/Lori Losey', 'AFRC', '2005-08-19', 'Discovery atop the modified 747 over the Mojave Desert during the ferry flight'],
  ['ED05-0166-31', 'NASA/Carla Thomas', 'AFRC', '2005-08-19', 'Shuttle Carrier Aircraft with Discovery lifts off from Edwards (third view)'],
];
const found: Found[] = rows.map(([id, who, center, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: who,
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center, still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm b2 round1 stills', agent: 'tw-best2' })));
