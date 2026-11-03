// Where the photos land on a map. They sit together in the middle of the map, like prints laid
// on it, never pushed out to its fading edges. Within that, each card picks the arrangement (and
// the small nudge from centre) that hides the least of its route.

export type Point = [number, number];

export interface Slot {
  /** Centre, as a fraction of the map's width and height. */
  x: number;
  y: number;
  /** Tilt, in degrees. */
  r: number;
}

/** Every point of an SVG path made of M and L commands. */
export function pointsOf(d: string): Point[][] {
  return d
    .split('M')
    .filter(Boolean)
    .map((stroke) => stroke.split('L').map((pair) => pair.trim().split(/\s+/).map(Number) as Point));
}

/** Points every `step` units along each stroke, so coverage counts length, not GPS sampling. */
export function along(strokes: Point[][], step: number): Point[] {
  const out: Point[] = [];
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.length; i++) {
      const [ax, ay] = stroke[i - 1];
      const [bx, by] = stroke[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
    if (stroke.length) out.push(stroke[stroke.length - 1]);
  }
  return out;
}

interface Box {
  width: number;
  height: number;
}

/** How much of the route a set of polaroids covers, from 0 to 1. Cards report it; tests read it. */
export function coverage(route: Point[], centres: Point[], size: Box): number {
  if (!route.length) return 0;
  const hidden = route.filter(([x, y]) => centres.some(([cx, cy]) => Math.abs(x - cx) < size.width / 2 && Math.abs(y - cy) < size.height / 2));
  return hidden.length / route.length;
}

// Groups of one to six, in print widths and heights from the group's centre: balanced, a little
// loose, never a grid. Each tilts its own way, as prints dropped by hand do.
const GROUPS: [number, number][][] = [
  [[0, 0]],
  [[-0.56, 0.05], [0.56, -0.05]],
  [[-0.62, -0.3], [0.6, -0.24], [0.02, 0.42]],
  [[-0.6, -0.46], [0.6, -0.42], [-0.56, 0.5], [0.62, 0.46]],
  [[-1.1, -0.38], [0, -0.52], [1.1, -0.36], [-0.56, 0.5], [0.58, 0.48]],
  [[-1.1, -0.46], [0.02, -0.56], [1.12, -0.44], [-1.08, 0.5], [0, 0.56], [1.1, 0.5]],
];
const TILTS = [-6, 4, -3, 5, -4, 3];

interface Options {
  /** The map, in the same units as the route (the map image's pixels). */
  frame: Box;
  /** One polaroid, frame included. */
  size: Box;
  /** Where the group sits when nothing pushes it: a touch above the middle, clear of the caption. */
  centre?: { x: number; y: number };
}

/**
 * Lay `count` polaroids on a map as one centred group. The group may be mirrored, turned, or nudged
 * a short way from centre; of those, the one hiding the least route wins, and among equals the one
 * nearest the centre. Every candidate is tried in a fixed order, so every build lays the same group.
 */
export function placePolaroids(route: Point[], count: number, { frame, size, centre = { x: 0.5, y: 0.46 } }: Options): Slot[] {
  const n = Math.min(count, GROUPS.length);
  if (n <= 0) return [];
  const base = GROUPS[n - 1];
  const shapes = [
    base,
    base.map(([x, y]) => [-x, y] as Point),
    base.map(([x, y]) => [x, -y] as Point),
    base.map(([x, y]) => [-x, -y] as Point),
  ];
  const nudges: Point[] = [];
  for (const dx of [0, -0.04, 0.04, -0.08, 0.08]) for (const dy of [0, -0.03, 0.03]) nudges.push([dx, dy]);

  const margin = Math.min(frame.width, frame.height) * 0.04;
  let best: Point[] | null = null;
  let bestCost = Infinity;
  for (const shape of shapes) {
    for (const [dx, dy] of nudges) {
      const cx = (centre.x + dx) * frame.width;
      const cy = (centre.y + dy) * frame.height;
      const centres = shape.map(([u, v]) => [cx + u * size.width, cy + v * size.height] as Point);
      const inside = centres.every(([x, y]) =>
        x - size.width / 2 >= margin && x + size.width / 2 <= frame.width - margin &&
        y - size.height / 2 >= margin && y + size.height / 2 <= frame.height - margin);
      if (!inside) continue;
      // Hiding route costs most; straying from the centre costs a little, so it only moves to help.
      const cost = coverage(route, centres, size) * 10 + Math.hypot(dx, dy) * 2;
      if (cost < bestCost - 1e-9) {
        bestCost = cost;
        best = centres;
      }
    }
  }
  if (!best) {
    const cx = centre.x * frame.width;
    const cy = centre.y * frame.height;
    best = base.map(([u, v]) => [cx + u * size.width, cy + v * size.height] as Point);
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return best.map(([x, y], k) => ({ x: round(x / frame.width), y: round(y / frame.height), r: TILTS[k % TILTS.length] }));
}

/** The original fixed pattern, as offsets in polaroid widths and heights from the map's centre. */
export const FIXED_PATTERN: [number, number][] = [
  [-0.85, -0.45], [0.55, -0.4], [-0.25, 0.05], [0.75, 0.15], [-0.75, 0.45], [0.45, 0.5], [0.15, -0.5],
];
