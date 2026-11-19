/** Register PD still images (USGS/NASA) as sources for the tsunami ranking (rank-261028-8f9e). Usage: npx tsx scripts/pe-register-stills.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';

const mk = (p: Partial<Found> & { external_id: string; original_url: string; title: string; creator: string; plat: Found['source_platform'] }): Found => ({
  source_platform: p.plat, external_id: p.external_id, original_url: p.original_url, title: p.title, creator: p.creator,
  description: p.description ?? null, published_at: null, duration: null, view_count: null, license: p.license ?? 'Public Domain',
  license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });

const found: Found[] = [
  mk({ plat: 'wikimedia', external_id: 'pe-still-lituya-overview', original_url: 'https://www.usgs.gov/media/images/lituya-bay-1958', title: 'Lituya Bay 1958 aerial overview (USGS)', creator: 'D.J. Miller, USGS' }),
  mk({ plat: 'wikimedia', external_id: 'pe-still-lituya-trimline', original_url: 'https://commons.wikimedia.org/wiki/File:Lituya_Bay_trimline.jpg', title: 'Lituya Bay trimline (USGS 1958)', creator: 'D.J. Miller, USGS' }),
  mk({ plat: 'wikimedia', external_id: 'pe-still-lituya-damage', original_url: 'https://commons.wikimedia.org/wiki/File:Lituya_Bay_damage_detail.jpg', title: 'Lituya Bay damage detail (USGS 1958)', creator: 'D.J. Miller, USGS' }),
  mk({ plat: 'nasa', external_id: 'pe-still-pia26420', original_url: 'https://photojournal.jpl.nasa.gov/catalog/PIA26420', title: 'SWOT water-height change, Dickson Fjord (PIA26420)', creator: 'NASA Earth Observatory / NASA JPL' }),
  mk({ plat: 'wikimedia', external_id: 'pe-still-tracy-trimline', original_url: 'https://www.usgs.gov/media/images/2025-tracy-arm-landslide-and-tsunami-trimline', title: '2025 Tracy Arm landslide and tsunami trimline (USGS)', creator: 'USGS Landslide Hazards Program' }),
  mk({ plat: 'wikimedia', external_id: 'pe-still-sth-before', original_url: 'https://commons.wikimedia.org/wiki/File:St_Helens_before_1980_eruption.jpg', title: 'Spirit Lake and Mount St. Helens before the 1980 eruption (USGS)', creator: 'USGS' }),
  mk({ plat: 'wikimedia', external_id: 'pe-still-sth-after', original_url: 'https://commons.wikimedia.org/wiki/File:MSH80_spirit_lake_pumice_plain_phreatic_explosions_05-29-80.jpg', title: 'MSH80 Spirit Lake pumice plain phreatic explosions 05-29-80 (USGS)', creator: 'Dan Dzurisin, USGS' }),
];
console.log(JSON.stringify(ingest(found, { query: 'pe tsunami stills', agent: 'showrunner-planet-extremes' })));
