// What of a route can be shown without pointing at where someone lives.
//
// The first version cut a fixed 300 m along the path from each end. That trimmed point sits on
// the road exactly 300 m from the door, the same for every ride that starts there, and the
// number was in public code. Now every point within a radius of the start or the finish is
// dropped, wherever it falls on the route (a ride that passes home in the middle is split there,
// not drawn through it), and the radius is chosen at random when a chapter is first synced.

const metresBetween = ([a, b], [c, d]) => {
  const rad = Math.PI / 180;
  const x = (d - b) * rad * Math.cos(((a + c) / 2) * rad);
  const y = (c - a) * rad;
  return Math.hypot(x, y) * 6_371_000;
};

/** The route as segments, with everything within `radius` metres of its start or finish removed. */
export function trimNear(points, radius) {
  if (points.length < 2) return [];
  const start = points[0];
  const finish = points.at(-1);
  const segments = [];
  let current = [];
  for (const p of points) {
    if (metresBetween(p, start) < radius || metresBetween(p, finish) < radius) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else current.push(p);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/**
 * A radius between 1 and 1.6 km, the scale of Strava's own privacy zones, different for every
 * route and kept nowhere. (600 m to 1 km was tried first: two rides from the same door still
 * surfaced 45 m apart on the one road out.)
 */
export const privacyRadius = () => 1000 + Math.random() * 600;

const lengthOf = (segment) => segment.slice(1).reduce((sum, p, i) => sum + metresBetween(segment[i], p), 0);

/**
 * Trimming can leave crumbs: a few points where a route grazed the cut-off circle. Drawn small,
 * they read as stray dots of ink, so pieces under `metres` go too. The longest piece always
 * stays, so a short route is never left with nothing.
 */
export function dropSpecks(segments, metres = 1000) {
  if (segments.length < 2) return segments;
  const lengths = segments.map(lengthOf);
  const longest = lengths.indexOf(Math.max(...lengths));
  return segments.filter((_, i) => i === longest || lengths[i] >= metres);
}
