/** rank-261028-xkgv v4: original GOES X-ray flux plots (NOAA NCEI data). Usage: npx tsx scripts/pe-flare-goes-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const own = (id: string, title: string): Found => ({
  source_platform: 'own' as any, external_id: id, original_url: 'file:///E:/clips-viral/scripts/pe-flare-goes.py', title, creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
  description: 'Programmatic plot (PIL) of real GOES-12 X-ray sensor 1-min long-channel flux, NOAA NCEI GOES XRS archive (https://www.ncei.noaa.gov/data/goes-space-environment-monitor/access/avg/2003/11/goes12/csv/g12_xrs_1m_20031101_20031130.csv and .../2003/10/goes12/csv/g12_xrs_1m_20031001_20031031.csv). Drawn from numbers only; no third-party imagery. Font Cairo, SIL OFL 1.1.',
  published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } });
const found: Found[] = [
  own('pe9-g-goes_hook', 'GOES-12 X-ray flux 4 Nov 2003 (flat top, hook)'),
  own('pe9-g-goes_oct28', 'GOES-12 X-ray flux 28 Oct 2003 (peak X17.2)'),
  own('pe9-g-goes_end', 'GOES-12 X-ray flux 4 Nov 2003 (loop end)'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe9 goes plots v4', agent: 'showrunner-planet-extremes' })));
