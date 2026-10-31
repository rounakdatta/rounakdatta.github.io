// Dates the way people say them: "Sat 27 Dec", and the year only when it isn't this one.
// Pages are built ahead of time, so "this year" means the year of the build.

const BUILT = new Date();

const fmt = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options });
const dayMonth = fmt({ day: 'numeric', month: 'short' });
const dayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const weekdayDayMonth = fmt({ weekday: 'short', day: 'numeric', month: 'short' });
const weekdayDayMonthYear = fmt({ weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const longDate = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
const monthYear = fmt({ month: 'short', year: 'numeric' });

const sameYear = (d: Date, now = BUILT) => d.getUTCFullYear() === now.getUTCFullYear();

/** "27 Dec", or "27 Dec 2024" when it isn't this year. */
export const shortDate = (d: Date, now = BUILT) => (sameYear(d, now) ? dayMonth : dayMonthYear).format(d);

/** "Sat 27 Dec", or "Sat 27 Dec 2024" when it isn't this year. */
export const spokenDate = (d: Date, now = BUILT) =>
  (sameYear(d, now) ? weekdayDayMonth : weekdayDayMonthYear).format(d).replace(',', '');

/** "27 December 2025", for the top of a note, where the year always matters. */
export const fullDate = (d: Date) => longDate.format(d);

/** "Dec 2025". */
export const monthOfYear = (d: Date) => monthYear.format(d);

/** "12 Jul", for lists already grouped under a year heading. */
export const dayInYear = (d: Date) => dayMonth.format(d);

/** Machine-readable date for <time datetime>. */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** "25–30 Oct 2026", "30 Oct – 2 Nov 2026", "30 Dec 2025 – 2 Jan 2026": a span of days, said once. */
export function dateRange(from: Date, to: Date): string {
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const sameMonth = sameYear && from.getUTCMonth() === to.getUTCMonth();
  if (sameMonth) return `${from.getUTCDate()}–${dayMonthYear.format(to)}`;
  if (sameYear) return `${dayMonth.format(from)} – ${dayMonthYear.format(to)}`;
  return `${dayMonthYear.format(from)} – ${dayMonthYear.format(to)}`;
}
