/** Register NASA/JPL Curiosity (MSL) build stills for a TWIWM video. Usage: npx tsx scripts/_archive/twiwm-curio-register.ts */
import { ingest } from '../../packages/discovery/src/engine.ts';
import type { Found } from '../../packages/discovery/src/providers.ts';
const rows: [string, string, string][] = [
  ['PIA11428', '2008-11-19', 'Device for Lowering Mars Science Laboratory Rover to the Surface'],
  ['PIA11429', '2008-11-19', 'Mars Science Laboratory Rover Taking Shape'],
  ['PIA11427', '2008-11-19', 'Wheel for Mars Science Laboratory Rover'],
  ['PIA13236', '2010-07-07', 'New Wheels'],
  ['PIA13237', '2010-07-07', 'Wheel Installation'],
  ['PIA13384', '2010-09-13', 'NASA Next Mars Rover on a Test Drive'],
  ['PIA14256', '2011-06-13', 'Mars Rover Curiosity with Wheel on Ramp'],
  ['PIA14308', '2011-07-22', 'Testing for Mars Science Laboratory Descent'],
  ['PIA11808', '2008-11-19', 'Mars Science Laboratory Rover and Descent Stage'],
  ['PIA15087', '2011-11-23', 'Fish-eye View of NASA Curiosity Rover and its Powered Descent Vehicle'],
  ['PIA15021', '2011-11-10', 'Mars Science Laboratory Rover Closeout'],
];
const found: Found[] = rows.map(([id, date, title]) => ({
  source_platform: 'nasa', external_id: id.toLowerCase(), original_url: `https://images.nasa.gov/details/${id}`, title: `${id}: ${title}`, creator: 'NASA/JPL-Caltech',
  description: null, published_at: date, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)',
  license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`,
  width: null, height: null, extra: { kind: 'still-image', center: 'JPL', still_image: true, nasa_id: id } }));
console.log(JSON.stringify(ingest(found, { query: 'twiwm curiosity msl build stills', agent: 'twiwm-sr-c' })));
