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
