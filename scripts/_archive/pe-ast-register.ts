/** rank-261028-hg6a (closest asteroid flybys): original scale-diagram sources. Usage: npx tsx scripts/pe-ast-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-ast-gfx.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic to-scale altitude diagram drawn with PIL from numbers only (JPL close-approach nominal distance minus 6,378 km; ISS altitude from NASA caption); no third-party imagery. Font: Cairo Black/Bold, SIL Open Font License 1.1 (data/brand/quiz-ar/fonts/OFL.txt).',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  own('pe10-g-hook_a', 'Scale diagram: #1 pass vs ISS ring (frame 0)'),
  own('pe10-g-hook_b', 'Altitude bars: five closest flybys, one scale, ISS line'),
  own('pe10-g-c5', 'Scale diagram: #5 pass ~1,350 km'),
  own('pe10-g-c4', 'Scale diagram: #4 pass ~1,110 km'),
  own('pe10-g-c3', 'Scale diagram: #3 pass ~400 km'),
  own('pe10-g-c2', 'Scale diagram: #2 pass ~370 km'),
  own('pe10-g-end', 'Scale diagram: #1 pass ~220 km (loop tail, ends on frame 0)'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe10 asteroid graphics', agent: 'showrunner-planet-extremes' })));
