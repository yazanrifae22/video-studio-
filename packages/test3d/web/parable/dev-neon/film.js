// dev: the Neon view on the hand-made fixtures (one fixture per second; shot.u runs 0..1 inside the second). Not a production film.
export default async function build(K) {
  const { FIXTURES } = await import('/kit/parable/fixtures.js');
  const { makeView } = await import('/kit/parable/view-neon.js');
  const view = await makeView(K, null), names = Object.keys(FIXTURES); window.VIEW = view;
  K.fixtureNames = names;
  return { frame(t) { const i = Math.max(0, Math.min(names.length - 1, Math.floor(t))), s = structuredClone(FIXTURES[names[i]]); s.shot.u = t - i; if (s.title && t - i > 0.5) s.title = null; view.draw(s, t); } };
}
