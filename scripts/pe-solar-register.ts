/** rank-261028-942s (hottest planets): NASA/JPL PD stills (one asset per clip). Usage: npx tsx scripts/pe-solar-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const mk = (id: string, url: string, title: string, creator: string): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description: null, published_at: null,
  duration: null, view_count: null, license: 'Public Domain', license_url: null, download_url: null, width: null, height: null, extra: { kind: 'still-image' } });
const PJ = 'https://science.nasa.gov/photojournal/';
const V254 = [PJ + 'venus-3-d-perspective-view-of-maat-mons-2/', 'Venus - 3-D Perspective View of Maat Mons (PIA00254), Magellan radar 3-D, simulated colour', 'NASA/JPL'];
const V106 = [PJ + 'venus-3-d-perspective-view-of-maat-mons/', 'Venus - 3-D Perspective View of Maat Mons (PIA00106), Magellan radar 3-D, simulated colour', 'NASA/JPL'];
const JUP = [PJ + 'cassini-jupiter-portrait/', 'Cassini Jupiter Portrait (PIA04866), true-colour mosaic', 'NASA/JPL/Space Science Institute'];
const MAR = [PJ + 'curiositys-selfie-at-the-mary-anning-location-on-mars/', "Curiosity's Selfie at the 'Mary Anning' location on Mars (PIA24173)", 'NASA/JPL-Caltech/MSSS'];
const EAR = ['https://www.nasa.gov/image-article/blue-marble-view-from-apollo-17/', 'The Blue Marble: The View From Apollo 17 (AS17-148-22727), 7 Dec 1972', 'NASA'];
const MER = [PJ + 'rachmaninoff-in-concert-with-recently-named-craters-on-mercury/', 'Rachmaninoff in Concert with Recently Named Craters on Mercury (PIA12998), MESSENGER 29 Sep 2009', 'NASA/Johns Hopkins University Applied Physics Laboratory/Carnegie Institution of Washington'];
const c = (id: string, s: string[], note: string) => mk('pe8-' + id, s[0], s[1] + ' - ' + note, s[2]);
const found: Found[] = [
  c('hook_a', V254, 'hook shot 1, frame-0 crop (summit)'), c('hook_b', V106, 'hook shot 2'), c('v1', V106, '#1 shot, lava plains'), c('end', V254, 'loop end, pull-back to the exact frame-0 crop'),
  c('j1', JUP, '#5 shot 1 (Great Red Spot)'), c('j2', JUP, '#5 shot 2 (cloud bands)'),
  c('m1', MAR, '#4 shot 1 (rover)'), c('m2', MAR, '#4 shot 2 (rocks)'),
  c('e1', EAR, '#3 shot 1 (full globe)'), c('e2', EAR, '#3 shot 2 (Africa)'),
  c('me1', MER, '#2 shot 1 (Rachmaninoff basin)'), c('me2', MER, '#2 shot 2 (surface)'),
];
console.log(JSON.stringify(ingest(found, { query: 'pe hottest planets stills', agent: 'showrunner-planet-extremes' })));
