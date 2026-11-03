// The activity calendar's geometry: which square each day gets, how dark, and the pencil notes on it.
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
  /** Week column and weekday row (Monday first). */
  week: number;
  weekday: number;
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

/** Where a day is drawn in its year: the week's column (weeks start on Monday) and the weekday's row. */
export function placeOf(date: string): { year: number; week: number; weekday: number } {
  const d = new Date(`${date}T00:00:00Z`);
  const jan1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const offset = (jan1.getUTCDay() + 6) % 7;
  const dayOfYear = Math.round((d.valueOf() - jan1.valueOf()) / 86_400_000);
  return { year: d.getUTCFullYear(), week: Math.floor((dayOfYear + offset) / 7), weekday: (d.getUTCDay() + 6) % 7 };
}

/**
 * A note in the calendar, pinned to as much of "when" as is known: the day, several days (a note
 * about two races), only the week, or only the month. Each day named is ringed in pencil.
 */
export interface Milestone {
  text: string;
  position: 'above' | 'below';
  /** The days it is about; empty when only the week or the month is known. */
  days: string[];
  /** Only the week is known: any day in it. */
  week?: string;
  /** Only the month is known: "2022-07". */
  month?: string;
}

const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** The notes as written in milestones.json. One pinned to the wrong day is worse than none, so a malformed one stops the build. */
export function parseMilestones(raw: unknown[]): Milestone[] {
  return (raw as { text: string; position: string; date?: string; dates?: string[]; week?: string; month?: string }[]).map((m) => {
    const days = m.dates ?? (m.date ? [m.date] : []);
    const pins = [days.length > 0, !!m.week, !!m.month].filter(Boolean).length;
    const ok =
      typeof m.text === 'string' && m.text.trim() !== '' &&
      (m.position === 'above' || m.position === 'below') &&
      pins === 1 && days.every(isDay) && (!m.week || isDay(m.week)) && (!m.month || /^\d{4}-(0[1-9]|1[0-2])$/.test(m.month));
    if (!ok) throw new Error(`milestones.json: "${m.text}" needs a position (above or below) and exactly one of date, dates, week or month, each a real one`);
    return { text: m.text, position: m.position as Milestone['position'], days, week: m.week, month: m.month };
  });
}

/** Rough width of handwriting, for keeping notes from landing on each other. */
export const handWidth = (text: string, fontSize: number) => text.length * fontSize * 0.43;

/**
 * Slide labels along a line as little as possible until none overlaps the next, each wanting to sit
 * at `want` and being `width` wide. Least squares, solved exactly (pool adjacent violators), with
 * ties kept in the order given, so every build lays the notes out the same way.
 */
export function dodge(items: { want: number; width: number }[], gap: number): number[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a].want - items[b].want || a - b);
  // Take out the room each label needs from the ones before it; then all that's left is keeping order.
  const room = order.map(() => 0);
  for (let k = 1; k < order.length; k++) room[k] = room[k - 1] + (items[order[k - 1]].width + items[order[k]].width) / 2 + gap;
  const blocks: { sum: number; n: number }[] = [];
  order.forEach((i, k) => {
    blocks.push({ sum: items[i].want - room[k], n: 1 });
    while (blocks.length > 1) {
      const [a, b] = blocks.slice(-2);
      if (a.sum / a.n <= b.sum / b.n) break;
      blocks.pop();
      a.sum += b.sum;
      a.n += b.n;
    }
  });
  const at: number[] = new Array(items.length);
  let k = 0;
  for (const b of blocks) for (let j = 0; j < b.n; j++, k++) at[order[k]] = b.sum / b.n + room[k];
  return at;
}

// ---------- Pencil marks ----------

const r = (v: number) => Math.round(v * 10) / 10;

/** A gentle, repeatable wobble from -1 to 1: the same note bends the same way on every build. */
export function wobble(text: string) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) / 4;
}

/**
 * An arrow's line from a note to its tip. Wherever the note had to slide to, the line comes in
 * straight along the column at the end, so the tip can only mean the one week.
 */
export function arrow(sx: number, sy: number, tx: number, ty: number, bow = 0) {
  const half = (ty - sy) / 2;
  return `M${r(sx)} ${r(sy)}C${r(sx + bow)} ${r(sy + half)} ${r(tx)} ${r(ty - half)} ${r(tx)} ${r(ty)}`;
}

/** The arrow's head: two short strokes back from the tip, toward the note. */
export function head(tx: number, ty: number, down: boolean) {
  const back = down ? -5.5 : 5.5;
  return `M${r(tx - 3.3)} ${r(ty + back)}L${r(tx)} ${r(ty)}L${r(tx + 3.3)} ${r(ty + back)}`;
}

/** A quick pencil loop round a day: once round and a little past, never quite closing on itself. */
export function ring(cx: number, cy: number, seed: number) {
  const rx = 10.5;
  const ry = 9.5;
  const a0 = -2.4 + seed * 0.4;
  const at = (a: number, k: number) => `${r(cx + rx * k * Math.cos(a))} ${r(cy + ry * k * Math.sin(a))}`;
  const turns: [number, number][] = [[a0 + 2.2, 1.02], [a0 + 4.4, 1.06], [a0 + 6.8, 1.14]];
  return `M${at(a0, 1)}${turns.map(([a, k]) => `A${r(rx * k)} ${r(ry * k)} 0 0 1 ${at(a, k)}`).join('')}`;
}

/** A curly brace from x1 to x2 along y, its point `2 × depth` away: below it when `down`, else above. */
export function brace(x1: number, x2: number, y: number, depth: number, down = true) {
  const d = down ? depth : -depth;
  const c = Math.min(depth, (x2 - x1) / 4);
  const mid = (x1 + x2) / 2;
  return `M${r(x1)} ${r(y)}q0 ${r(d)} ${r(c)} ${r(d)}H${r(mid - c)}q${r(c)} 0 ${r(c)} ${r(d)}q0 ${r(-d)} ${r(c)} ${r(-d)}H${r(x2 - c)}q${r(c)} 0 ${r(c)} ${r(-d)}`;
}
