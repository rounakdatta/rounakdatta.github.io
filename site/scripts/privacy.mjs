// A route drawn as it was run or ridden, except where it would point at someone's door.
//
// The first version cut a fixed 300 m along the path from each end: that point sat on the road
// exactly 300 m from the door, the same for every ride that started there, and the number was in
// public code. The second dropped every point within a random radius of the start or the finish,
// wherever it fell, from every route. That cut races, trailheads and loops of a park to pieces
// (one 25 km run kept 7 km of its line), while protecting nothing: they start nowhere private.
//
// Now a route is cut only at an end that lies at one of the athlete's regular places, the few
// spots dozens of activities begin or end at (home, work), worked out afresh from the whole
// history on every sync and written nowhere. There it loses only the stretch until it first
// leaves a random radius, never anything in the middle. Everything else is drawn whole.

const metresBetween = ([a, b], [c, d]) => {
  const rad = Math.PI / 180;
  const x = (d - b) * rad * Math.cos(((a + c) / 2) * rad);
  const y = (c - a) * rad;
  return Math.hypot(x, y) * 6_371_000;
};

/**
 * The places an athlete keeps setting out from or coming back to: every spot with at least
 * `often` activity starts and finishes within `within` metres of it.
 */
export function regularPlaces(ends, { within = 250, often = 10 } = {}) {
  const places = [];
  for (const p of ends) {
    const near = places.find((q) => metresBetween(q.at, p) < within);
    if (near) near.count++;
    else places.push({ at: p, count: 1 });
  }
  return places.filter((q) => q.count >= often).map((q) => q.at);
}

/** Whether a point lies at one of those places. */
export const atRegularPlace = (point, places, within = 400) => places.some((q) => metresBetween(q, point) < within);

/**
 * A radius between 1 and 1.6 km, the scale of Strava's own privacy zones, different for every
 * route and kept nowhere. (600 m to 1 km was tried first: two rides from the same door still
 * surfaced 45 m apart on the one road out.)
 */
export const privacyRadius = () => 1000 + Math.random() * 600;

/**
 * The route without its first stretch, up to where it first leaves `radius` of its start (when
 * `start`), and without its last, from where it last comes within `radius` of its finish (when
 * `finish`). What lies between is kept whole, even if it passes close by again.
 */
export function trimEnds(points, radius, { start = true, finish = true } = {}) {
  let from = 0;
  let to = points.length;
  if (start) while (from < to && metresBetween(points[from], points[0]) < radius) from++;
  if (finish) while (to > from && metresBetween(points[to - 1], points[points.length - 1]) < radius) to--;
  return points.slice(from, to);
}

/**
 * Fewer points, the same line: Ramer–Douglas–Peucker in metres, so no point of the recording is
 * further than `tolerance` from what is drawn. A switchback keeps its corners; a straight road
 * needs only its ends.
 */
export function simplify(points, tolerance = 3) {
  if (points.length < 3) return points;
  const lat0 = (points[0][0] * Math.PI) / 180;
  // Metres east and north of the first point: flat enough for the length of any one route.
  const xy = points.map(([lat, lng]) => [((lng - points[0][1]) * Math.PI * 6_371_000 * Math.cos(lat0)) / 180, ((lat - points[0][0]) * Math.PI * 6_371_000) / 180]);
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = xy[a];
    const [bx, by] = xy[b];
    const dx = bx - ax;
    const dy = by - ay;
    const span = Math.hypot(dx, dy);
    let worst = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = xy[i];
      const off = span ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / span : Math.hypot(px - ax, py - ay);
      if (off > worst) {
        worst = off;
        at = i;
      }
    }
    if (worst > tolerance) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
