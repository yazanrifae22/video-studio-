/** rank-261028-g3s4: register the ORIGINAL size-to-scale graphics (scripts/pe-ice-scale.py). Usage: npx tsx scripts/pe-ice-register-scale.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const URL = 'file:///E:/clips-viral/scripts/pe-ice-scale.py';
const mk = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: URL, title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)', description:
    'Programmatic data graphic drawn with PIL from numbers only (BYU SCP iceberg areas, World Bank Jamaica area); no third-party imagery, fonts are system Segoe UI.',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920,
  extra: { kind: 'original-graphic' } });
console.log(JSON.stringify(ingest([
  mk('pe2-scale-a24', 'Size to scale: iceberg A-24 (1986, 6,863 km2) vs Jamaica (10,991 km2)'),
  mk('pe2-scale-a20', 'Size to scale: iceberg A-20 (1986, 7,284 km2) vs Jamaica (10,991 km2)'),
], { query: 'pe iceberg original scale graphics', agent: 'showrunner-planet-extremes' })));
