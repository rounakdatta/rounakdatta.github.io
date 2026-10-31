// The activity calendar's geometry: which square each day gets, and how dark.
// Two layouts of the same days: weeks across a desktop, months down a phone.
import { sportOf, type Activity } from './fitness';

export interface Day {
  date: string;
  minutes: number;
  distance: number;
  /** "71 km ride · ORR Wrapped 2025", for the tooltip. */
  summary: string;
}

/** Shade by time spent moving, which is fair across sports: an hour of padel counts like an hour's ride. */
export function levelOf(minutes: number): 0 | 1 | 2 | 3 | 4 {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

const KIND: Record<string, string> = { run: 'run', ride: 'ride', walk: 'walk' };

/** Everything done on each date, folded into one square's worth of information. */
export function daysOf(activities: Activity[]): Map<string, Day> {
  const days = new Map<string, { minutes: number; distance: number; parts: string[] }>();
  for (const a of [...activities].sort((x, y) => x.date.localeCompare(y.date))) {
    const d = days.get(a.date) ?? { minutes: 0, distance: 0, parts: [] };
    d.minutes += (a.movingTime ?? 0) / 60;
    d.distance += a.distance;
    const sport = sportOf(a.type);
    const km = a.distance >= 1000 ? `${Math.floor(a.distance / 100) / 10} km ` : '';
    const kind = KIND[sport] ?? a.type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    d.parts.push(`${km}${kind}`);
    days.set(a.date, d);
  }
  return new Map([...days].map(([date, d]) => [date, { date, minutes: Math.round(d.minutes), distance: d.distance, summary: d.parts.join(', ') }]));
}

export interface Cell {
  date: string;
  /** -1 is a day before the journal began: not a rest day, just not recorded. */
  level: -1 | 0 | 1 | 2 | 3 | 4;
  /** Desktop: week column and weekday row (Monday first). */
  week: number;
  weekday: number;
  /** Phone: month row and day-of-month column. */
  month: number;
  day: number;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Every day of a year up to `today` (days still to come are not drawn: they are not empty).
 * Days before `from`, the first one recorded, are kept but marked: they are not rest days either.
 */
export function yearCells(year: number, days: Map<string, Day>, today: string, from = ''): Cell[] {
  const cells: Cell[] = [];
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const offset = (jan1.getUTCDay() + 6) % 7; // Monday = 0
  for (let d = new Date(jan1); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = iso(d);
    if (date > today) break;
    const dayOfYear = Math.round((d.valueOf() - jan1.valueOf()) / 86_400_000);
    cells.push({
      date,
      level: date < from ? -1 : levelOf(days.get(date)?.minutes ?? 0),
      week: Math.floor((dayOfYear + offset) / 7),
      weekday: (d.getUTCDay() + 6) % 7,
      month: d.getUTCMonth(),
      day: d.getUTCDate() - 1,
    });
  }
  return cells;
}

/** All the squares of one shade as a single SVG path: five paths a year instead of 365 elements. */
export function squaresPath(points: [number, number][], size: number): string {
  return points.map(([x, y]) => `M${x} ${y}h${size}v${size}h-${size}z`).join('');
}

/** Rough width of handwriting, for keeping notes from landing on each other. */
export const handWidth = (text: string, fontSize: number) => text.length * fontSize * 0.43;

export interface Placed<T> {
  item: T;
  tier: number;
}

/**
 * Stack labels into tiers so none overlaps another: each goes in the lowest tier where it fits.
 * `x` is a label's centre and `width` its width; ties resolve by position, so every build agrees.
 */
export function stackLabels<T>(items: T[], x: (t: T) => number, width: (t: T) => number, gap = 12): Placed<T>[] {
  const ends: number[] = [];
  return [...items]
    .sort((a, b) => x(a) - x(b))
    .map((item) => {
      const left = x(item) - width(item) / 2;
      let tier = 0;
      while (ends[tier] !== undefined && left < ends[tier] + gap) tier++;
      ends[tier] = x(item) + width(item) / 2;
      return { item, tier };
    });
}
