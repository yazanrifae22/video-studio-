// dev: every fixture state for 2 s (shot.u runs 0..1 across the 2 s), drawn by the Macro view. Not a production film.
// npx tsx packages/test3d/src/dev-stills.ts packages/test3d/web/parable/dev-macro packages/test3d/web/parable/dev-macro/score.json --size 1920x1080 --times 1,3,5 --out DIR
import { FIXTURES } from '/kit/parable/fixtures.js';
import { makeView } from '/kit/parable/view-macro.js';

export const NAMES = Object.keys(FIXTURES);
export default async function build(K) {
  const view = await makeView(K, null);
  K.fixtureNames = NAMES;
  const only = new URLSearchParams(location.search).get('fx');
  return {
    frame(t) {
      const i = Math.max(0, Math.min(NAMES.length - 1, Math.floor(t / 2)));
      const base = FIXTURES[only ?? NAMES[i]], u = (t % 2) / 2;
      const s = structuredClone(base); s.t = t; s.shot = { ...s.shot, id: s.shot.id + '#' + i, u };
      view.draw(s, t);
    },
  };
}
