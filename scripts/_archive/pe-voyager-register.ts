/** rank-261028-k1wy (Voyager 1 about to reach 1 light-day): NASA still clips + original distance-ladder graphic. Usage: npx tsx scripts/pe-voyager-register.ts */
import { ingest } from '../packages/discovery/src/engine.ts';
import type { Found } from '../packages/discovery/src/providers.ts';
const still = (id: string, url: string, title: string, creator: string, description: string, w: number, h: number): Found => ({
  source_platform: 'nasa', external_id: id, original_url: url, title, creator, description,
  published_at: null, duration: null, view_count: null, license: 'NASA media usage guidelines (generally not copyrighted)', license_url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', download_url: null, width: w, height: h, extra: { kind: 'still-image' } });
const found: Found[] = [
  still('pe12-v1launch', 'https://www.jpl.nasa.gov/images/pia21747-voyager-1-launch/', 'Voyager 1 Launch (PIA21747), 5 Sep 1977 - slow push', 'NASA/JPL-Caltech/KSC',
    'Voyager 1 on its Titan/Centaur-6 launch vehicle at Kennedy Space Center, 5 Sept 1977 (photograph). Slow push-in made by the studio.', 1833, 2304),
  still('pe12-nep', 'https://www.jpl.nasa.gov/images/pia00049-neptune-great-dark-spot-scooter-dark-spot-2/', 'Neptune - Great Dark Spot, Scooter, Dark Spot 2 (PIA00049), Voyager 2 - slow push', 'NASA/JPL',
    'Neptune reconstructed from two Voyager 2 narrow-angle images (green and clear filters). Edge artefacts cropped, slow push by the studio.', 1000, 1000),
  still('pe12-p10jup', 'https://images.nasa.gov/details/ARC-1973-AC73-9341', 'Composite Pioneer 10 imagery of Jupiter (ARC-1973-AC73-9341) - slow pan', 'NASA Ames Research Center',
    'Composite of Pioneer 10 images of Jupiter as the spacecraft approached and left the planet, 1973. Grey border cropped, slow pan by the studio.', 3072, 2048),
  still('pe12-p11launch', 'https://images.nasa.gov/details/9139575', 'Launch of Pioneer G (Pioneer 11), 5 Apr 1973 (NASA image 9139575) - slow push', 'NASA',
    'Atlas-Centaur carrying Pioneer G (Pioneer 11) lifts off, 5 April 1973 (photograph). Slow push by the studio.', 3000, 2281),
  still('pe12-plu', 'https://www.jpl.nasa.gov/images/pia20202-new-horizons-very-best-view-of-pluto-movie/', 'New Horizons Very Best View of Pluto (PIA20202) - slow push', 'NASA/Johns Hopkins University Applied Physics Laboratory/Southwest Research Institute',
    'Frame composed of the sharpest views of Pluto from New Horizons, 14 July 2015 (LORRI, about 77-85 m/pixel). Cropped (movie-frame marker removed), slow push by the studio.', 1280, 720),
  { source_platform: 'own' as any, external_id: 'pe12-ladder', original_url: 'file:///E:/clips-viral/scripts/pe-voyager-gfx.py', title: 'Distance ladder: five farthest spacecraft from Earth, one scale, 1 light-day line',
    creator: 'Clips Viral Studio (original graphic, showrunner-planet-extremes)',
    description: 'Programmatic bar graphic drawn with PIL from numbers only (JPL Horizons geocentric range, 28 Oct 2026, billion km, one linear scale; NASA 1 light-day = 25.9 billion km); no third-party imagery. Font: Cairo Black, SIL Open Font License 1.1.',
    published_at: null, duration: null, view_count: null, license: 'Original work (studio-owned)', license_url: null, download_url: null, width: 1080, height: 1920, extra: { kind: 'original-graphic' } },
];
console.log(JSON.stringify(ingest(found, { query: 'pe12 voyager stills + graphics', agent: 'showrunner-planet-extremes' })));
