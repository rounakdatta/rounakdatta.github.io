// Numbers about moving, computed from the Strava log rather than typed in by hand.
// (The page used to say 2,181 km run while the log itself added up to 3,246.)
import log from '../data/strava-activities.json' with { type: 'json' };

export interface Activity {
  id?: number;
  date: string; // YYYY-MM-DD, local to where it happened
  name: string;
  type: string;
  distance: number; // metres
  movingTime?: number; // seconds
  elevation?: number; // metres climbed
}

export const activities: Activity[] = log.activities;
export const lastUpdated = new Date(`${log.lastUpdated}T00:00:00Z`);

/** Strava has many kinds; people think in four. */
export type Sport = 'run' | 'ride' | 'walk' | 'other';

export function sportOf(type: string): Sport {
  if (/Run$/.test(type)) return 'run';
  if (/Ride$/.test(type) || type === 'Velomobile' || type === 'Handcycle') return 'ride';
  if (type === 'Walk' || type === 'Hike') return 'walk';
  return 'other';
}

export interface Totals {
  run: number;
  ride: number;
  walk: number;
  other: number;
  /** Running, riding, walking and hiking: what "on foot and by bike" means. */
  footAndBike: number;
  /** Every distance logged, swims and paddles included. */
  all: number;
  days: number;
  first?: string;
  last?: string;
}

export function totalsOf(list: Activity[]): Totals {
  const t: Totals = { run: 0, ride: 0, walk: 0, other: 0, footAndBike: 0, all: 0, days: 0 };
  const days = new Set<string>();
  for (const a of list) {
    const sport = sportOf(a.type);
    t[sport] += a.distance;
    if (sport !== 'other') t.footAndBike += a.distance;
    t.all += a.distance;
    days.add(a.date);
    if (!t.first || a.date < t.first) t.first = a.date;
    if (!t.last || a.date > t.last) t.last = a.date;
  }
  t.days = days.size;
  return t;
}

/** Kilometres, never rounded up: 9,999.9 km is "9,999 km", not "10,000 km". */
export function km(metres: number): string {
  return Math.floor(metres / 1000).toLocaleString('en-GB');
}

/** Whole kilometres for a single outing, cut not rounded: 18.77 km is "18". */
export const kmWhole = (metres: number) => String(Math.floor(metres / 1000));

/** One decimal, cut not rounded: 18.77 km is "18.7". */
export const kmTenths = (metres: number) => (Math.floor(metres / 100) / 10).toFixed(1);

/** Minutes and seconds a kilometre, rounded up: for pace, the lower number is the flattering one. */
export function paceOf(seconds: number, metres: number): string {
  const perKm = Math.ceil(seconds / (metres / 1000));
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, '0')}`;
}

/** The drawn icon for any Strava kind, including ones no chapter has used yet. */
export function sportIcon(type: string): 'Run' | 'Ride' | 'Hike' | 'Walk' | 'Workout' {
  if (type === 'Hike') return 'Hike';
  const sport = sportOf(type);
  return sport === 'run' ? 'Run' : sport === 'ride' ? 'Ride' : sport === 'walk' ? 'Walk' : 'Workout';
}
