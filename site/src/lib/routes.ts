// Turning a GPS track into a drawing. Pure maths, so it is tested without a browser.

export type LatLng = [number, number];

/** Web Mercator, the projection every map tile uses, so a route drawn here matches a map of it. */
export function project([lat, lng]: LatLng): [number, number] {
  const x = (lng * Math.PI) / 180;
  const y = -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

export interface Fitted {
  /** SVG path data. */
  d: string;
  start: [number, number];
  end: [number, number];
  /** Length of the drawn path in the same units, for stroke-dash drawing animations. */
  length: number;
}

/**
 * Scale a route to fit a box, keeping its shape (no stretching) and centring it.
 * `pad` is the empty margin left on every side.
 */
export function fitRoute(route: LatLng[] | LatLng[][], width: number, height: number, pad: number): Fitted {
  const segments = (Array.isArray(route[0]?.[0]) ? route : [route]) as LatLng[][];
  const xy = segments.flat().map(project);
  const xs = xy.map((p) => p[0]);
  const ys = xy.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const k = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanY);
  const ox = (width - spanX * k) / 2;
  const oy = (height - spanY * k) / 2;
  const place = ([x, y]: [number, number]) => [(x - minX) * k + ox, (y - minY) * k + oy] as [number, number];
  const parts = segments.map((seg) => seg.map(project).map(place));

  let length = 0;
  for (const part of parts)
    for (let i = 1; i < part.length; i++) length += Math.hypot(part[i][0] - part[i - 1][0], part[i][1] - part[i - 1][1]);

  const r = (n: number) => Math.round(n * 10) / 10;
  const d = parts.map((part) => `M${part.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}`).join('');
  return { d, start: parts[0][0], end: parts.at(-1)!.at(-1)!, length: Math.ceil(length) };
}

type Point = [number, number];

/** Distance from p to the segment a–b. */
function offset([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Ramer–Douglas–Peucker: the fewest points that stay within `tolerance` of the original line. */
function simplify(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let worst = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const d = offset(points[i], points[first], points[last]);
      if (d > worst) [worst, index] = [d, i];
    }
    if (worst > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * An SVG route path ("M x y L x y … M …"), redrawn with only the points it needs and whole-number
 * coordinates. Each route tile on /fitness/ is about 200px wide but carried all ~600 of its points
 * to a tenth of a unit: 190 KB of the page's 324 KB. Every stroke keeps its first and last point.
 */
export function compactPath(d: string, tolerance: number): string {
  return d
    .split('M')
    .filter(Boolean)
    .map((stroke) => {
      const points = stroke.split('L').map((pair) => pair.trim().split(/\s+/).map(Number) as Point);
      const kept = simplify(points, tolerance).map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`);
      return `M${kept.filter((p, i) => i === 0 || p !== kept[i - 1] || i === kept.length - 1).join('L')}`;
    })
    .join('');
}
