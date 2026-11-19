/** rank-261028-xgph (largest earthquakes since 1900) PD sources. Usage: npx tsx scripts/pe-eq-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
type P = Found['source_platform'];
const mk = (plat: P, id: string, url: string, title: string, creator: string, kind = 'still-image', license = 'Public Domain'): Found => ({
  source_platform: plat, external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license, license_url: null, download_url: null, width: null, height: null, extra: { kind } });
const K = (n: number) => `https://www.ngdc.noaa.gov/hazard/data/kml/photos/${n}.kml`;
const found: Found[] = [
  mk('nasa', 'pe3-chile-aerial-hook', K(25), 'Aerial view of Chilean coast after 1960 tsunami (NOAA NGDC image 512) - hook push', 'NOAA National Geophysical Data Center'),
  mk('nasa', 'pe3-chile-aerial-end', K(25), 'Aerial view of Chilean coast after 1960 tsunami (NOAA NGDC image 512) - loop end pull', 'NOAA National Geophysical Data Center'),
  mk('nasa', 'pe3-chile-aerial-hook2', K(25), 'Aerial view of Chilean coast after 1960 tsunami (NOAA NGDC image 512) - hook second crop (town)', 'NOAA National Geophysical Data Center'),
  mk('nasa', 'pe3-hilo-1960', K(25), 'Aftermath of 1960 Chilean tsunami in Hilo, Hawaii (NOAA NGDC image 513)', 'U.S. Navy (via NOAA NGDC)'),
  mk('nasa', 'pe3-midway-1952', K(35), 'Midway Island flooded by 1952 Kamchatka tsunami (NOAA NGDC image 507)', 'U.S. Navy (via NOAA NGDC)'),
  mk('wikimedia', 'pe3-ak-4thave', 'https://www.usgs.gov/media/images/collapse-fourth-avenue-near-c-street-anchorage-due-earthquake-0', 'Collapse of Fourth Avenue near C Street, Anchorage, 1964 (USGS)', 'U.S. Army Corps of Engineers (USGS Photographic Library)'),
  mk('wikimedia', 'pe3-ak-turnagain', 'https://www.usgs.gov/media/images/turnagain-heights-landslide-damage-anchorage', 'Turnagain Heights landslide damage, Anchorage, 1964 (USGS)', 'USGS Alaska Technical Data Unit'),
  mk('nasa', 'pe3-ak-school', K(2), 'School split by slumping ground, Anchorage, 1964 (NOAA NGDC image 5_111)', 'NOAA National Geophysical Data Center'),
  mk('wikimedia', 'pe3-sumatra-040', 'https://commons.wikimedia.org/wiki/File:US_Navy_050102-N-9593M-040_A_village_near_the_coast_of_Sumatra_lays_in_ruin_after_the_Tsunami_that_struck_South_East_Asia.jpg', 'Village near the coast of Sumatra in ruin, 2 Jan 2005 (US Navy 050102-N-9593M-040)', "U.S. Navy photo by Photographer's Mate 2nd Class Philip A. McDaniel"),
  mk('wikimedia', 'pe3-sumatra-031', 'https://commons.wikimedia.org/wiki/File:US_Navy_050102-N-9593M-031_A_village_near_the_coast_of_Sumatra_lays_in_ruin_after_the_Tsunami_that_struck_South_East_Asia.jpg', 'Village near the coast of Sumatra in ruin, 2 Jan 2005 (US Navy 050102-N-9593M-031)', "U.S. Navy photo by Photographer's Mate 2nd Class Philip A. McDaniel"),
  mk('nasa', 'pe3-dvids-110643', 'https://www.dvidshub.net/video/110643/operation-tomodachi-tsunami-damage-assesment', 'Operation Tomodachi tsunami damage assessment B-roll, north of Sendai, 22 Mar 2011 (DVIDS 110643)', 'Staff Sgt. Jeffry Howerton, 374th Airlift Wing (U.S. Air Force)', 'video'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe largest earthquakes stills', agent: 'showrunner-planet-extremes' })));
