/** v6 fix-round replacement stills for rank-261028-8f9e. Usage: npx tsx scripts/pe-register-stills2.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (p: { id: string; url: string; title: string; creator: string; plat: Found['source_platform']; license: string }): Found => ({
  source_platform: p.plat, external_id: p.id, original_url: p.url, title: p.title, creator: p.creator, description: null, published_at: null,
  duration: null, view_count: null, license: p.license, license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const found: Found[] = [
  mk({ id: 'pe6-vajont-scar', plat: 'wikimedia', license: 'CC0 1.0', creator: 'Andre86 (Wikimedia Commons)', title: 'Frana Monte Toc Vajont 1 (landslide scar, 2011)', url: 'https://commons.wikimedia.org/wiki/File:Frana_Monte_Toc_Vajont_1.jpg' }),
  mk({ id: 'pe6-vajont-dam', plat: 'wikimedia', license: 'CC0 1.0', creator: 'Andre86 (Wikimedia Commons)', title: 'Vista Diga del Vajont (2011)', url: 'https://commons.wikimedia.org/wiki/File:Vista_Diga_del_Vajont.jpg' }),
  mk({ id: 'pe6-sth-before', plat: 'wikimedia', license: 'Public Domain', creator: 'USGS EROS Center', title: 'Mount St. Helens Before the 1980 Eruption (Spirit Lake foreground)', url: 'https://www.usgs.gov/media/images/mount-st-helens-1980-eruption' }),
  mk({ id: 'pe6-sth-after', plat: 'wikimedia', license: 'Public Domain', creator: 'Lyn Topinka, USGS', title: 'Spirit Lake and the devastated forest area surrounding Mount St. Helens, 4 Oct 1980', url: 'https://www.usgs.gov/media/images/spirit-lake-and-devastated-forest-area-surrounding-mount-st-he' }),
  mk({ id: 'pe6-swot-clean', plat: 'nasa', license: 'Public Domain', creator: 'NASA Earth Observatory (SWOT data)', title: 'SWOT water-height change, Dickson Fjord (PIA26420), cropped', url: 'https://science.nasa.gov/photojournal/swot-captures-planet-rumbling-greenland-tsunami' }),
];
console.log(JSON.stringify(ingest(found, { query: 'pe tsunami stills v6', agent: 'showrunner-planet-extremes' })));
