import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const id = 'S73-26380';
const f: Found[] = [{ source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: Technicians attach telescoping rods to the parasol canopy, Bldg 10, Johnson Space Center`, creator: 'NASA',
  description: null, published_at: '1973-05-23', duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center: 'JSC', still_image: true, nasa_id: id } }];
console.log(JSON.stringify(ingest(f, { query: 'twiwm b3 skylab parasol stills 2', agent: 'tw-best3' })));
