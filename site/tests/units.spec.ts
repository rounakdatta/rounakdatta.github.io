// The pure parts of the site, tested without a browser: words, numbers, dates and shapes.
import { test, expect } from '@playwright/test';
import { excerptOf, readingMinutes, isPublished, proseOf } from '../src/lib/text';
import { totalsOf, km, sportOf, activities, type Activity } from '../src/lib/fitness';
import { fitRoute, type LatLng } from '../src/lib/routes';
import { shortDate, spokenDate, dateRange } from '../src/lib/dates';

test.describe('summaries', () => {
  test('a note that opens with an epigraph is summarised from its first real paragraph', () => {
    const note = '> Speed and efficiency are two different things. ~Rasheed Ogunlaru\n\nWe as engineers love streamlining our workflows.';
    expect(excerptOf(note)).toBe('We as engineers love streamlining our workflows.');
  });

  test('a long opening is cut at a sentence, never mid-word', () => {
    const text = `${'A sentence that goes on. '.repeat(12)}`;
    const cut = excerptOf(text, 100);
    expect(cut.length).toBeLessThanOrEqual(140);
    expect(cut.endsWith('.') || cut.endsWith('…')).toBe(true);
    expect(cut).not.toMatch(/\s\S{1,3}…$/);
  });

  test('pictures, headings and code are not prose', () => {
    expect(proseOf('## Heading\n\n![alt](x.jpg)\n\n```\ncode\n```\n\nThe words.')).toBe('The words.');
  });

  test('reading time counts words, and is never zero minutes', () => {
    expect(readingMinutes('word '.repeat(2300))).toBe(10);
    expect(readingMinutes('One line.')).toBe(1);
  });

  test('drafts are not published; everything else is', () => {
    expect(isPublished({ draft: true })).toBe(false);
    expect(isPublished({ draft: false })).toBe(true);
    expect(isPublished({})).toBe(true);
  });
});

test.describe('fitness numbers', () => {
  test('kilometres are never rounded up', () => {
    expect(km(9_999_999)).toBe('9,999');
    expect(km(999)).toBe('0');
    expect(km(10_000_000)).toBe('10,000');
  });

  test('the totals are the sum of the log, sport by sport', () => {
    const t = totalsOf(activities);
    const sum = (sport: string) => activities.filter((a) => sportOf(a.type) === sport).reduce((s, a) => s + a.distance, 0);
    expect(t.run).toBe(sum('run'));
    expect(t.ride).toBe(sum('ride'));
    expect(t.walk).toBe(sum('walk'));
    expect(t.all).toBe(activities.reduce((s, a) => s + a.distance, 0));
    // "On foot and by bike" leaves out swims and paddles.
    expect(t.footAndBike).toBe(sum('run') + sum('ride') + sum('walk'));
    // The page once claimed 2,181 km run while the log held 3,246: a typed-in number that went stale.
    expect(t.run).toBeGreaterThan(2_181_000);
  });

  test('days count dates, not activities: two rides on one day are one day', () => {
    const two: Activity[] = [
      { date: '2025-01-01', name: 'a', type: 'Ride', distance: 1000 },
      { date: '2025-01-01', name: 'b', type: 'Run', distance: 1000 },
    ];
    expect(totalsOf(two).days).toBe(1);
  });

  test('Strava kinds fold into the four people think in', () => {
    expect(['TrailRun', 'VirtualRun', 'Run'].map(sportOf)).toEqual(['run', 'run', 'run']);
    expect(['Ride', 'GravelRide', 'EBikeRide', 'VirtualRide'].map(sportOf)).toEqual(['ride', 'ride', 'ride', 'ride']);
    expect(['Walk', 'Hike'].map(sportOf)).toEqual(['walk', 'walk']);
    expect(sportOf('Kayaking')).toBe('other');
  });
});

test.describe('route drawings', () => {
  const tall: LatLng[] = [[12.9, 77.6], [13.0, 77.61], [13.1, 77.6]];

  test('a route is scaled to fit its box without being stretched', () => {
    const { d } = fitRoute(tall, 200, 100, 10);
    const xs = [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[1]));
    const ys = [...d.matchAll(/([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));
    // Tall and thin stays tall and thin: it fills the height, and uses only a sliver of the width.
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(80, 0);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(20);
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(10);
    for (const x of xs) expect(x).toBeLessThanOrEqual(190);
  });

  test('north is up: the northernmost point is drawn highest', () => {
    const { start, end } = fitRoute(tall, 100, 100, 5);
    expect(end[1]).toBeLessThan(start[1]);
  });
});

test.describe('dates', () => {
  const now = new Date('2026-10-31T00:00:00Z');

  test('the year is left out when it is this year, and said when it is not', () => {
    expect(shortDate(new Date('2026-07-12T00:00:00Z'), now)).toBe('12 Jul');
    expect(shortDate(new Date('2025-07-12T00:00:00Z'), now)).toBe('12 Jul 2025');
    expect(spokenDate(new Date('2026-12-26T00:00:00Z'), now)).toBe('Sat 26 Dec');
  });
});

test.describe('the activity calendar', () => {
  // Imported lazily so the other unit tests don't depend on this module.
  const load = () => import('../src/lib/calendar');

  test('days still to come are not drawn: they are not empty, they have not happened', async () => {
    const { yearCells } = await load();
    const cells = yearCells(2026, new Map(), '2026-10-31');
    expect(cells.at(-1)!.date).toBe('2026-10-31');
    expect(cells).toHaveLength(304);
  });

  test('weeks start on Monday, and 1 January sits on its own weekday', async () => {
    const { yearCells } = await load();
    const [first] = yearCells(2026, new Map(), '2026-12-31'); // 1 Jan 2026 was a Thursday
    expect(first).toMatchObject({ date: '2026-01-01', week: 0, weekday: 3, month: 0, day: 0 });
  });

  test('shades follow time spent moving, so a long padel game and a long ride look alike', async () => {
    const { levelOf } = await load();
    expect([0, 10, 45, 90, 180].map(levelOf)).toEqual([0, 1, 2, 3, 4]);
  });

  test('a day with a ride and a run reads as both, in the order they happened', async () => {
    const { daysOf } = await load();
    const day = daysOf([
      { date: '2025-12-27', name: 'b', type: 'Run', distance: 5020, movingTime: 1800 },
      { date: '2025-12-27', name: 'a', type: 'Ride', distance: 71120, movingTime: 15540 },
    ]).get('2025-12-27')!;
    expect(day.minutes).toBe(289);
    expect(day.summary).toBe('5 km run, 71.1 km ride');
  });

  test('crowded together, no two notes are left sitting on each other', async () => {
    const { stackLabels } = await load();
    const notes = [100, 120, 140, 400].map((x) => ({ x, w: 80 }));
    const placed = stackLabels(notes, (n) => n.x, (n) => n.w);
    for (const a of placed)
      for (const b of placed)
        if (a !== b && a.tier === b.tier) expect(Math.abs(a.item.x - b.item.x)).toBeGreaterThanOrEqual(80);
    // The contrast that proves it did something: the crowded three needed three tiers, the loner one.
    expect(new Set(placed.filter((p) => p.item.x < 200).map((p) => p.tier)).size).toBe(3);
    expect(placed.find((p) => p.item.x === 400)!.tier).toBe(0);
  });
});

test('a spoken date has no comma after the weekday, with or without a year', () => {
  const now = new Date('2026-10-31T00:00:00Z');
  expect(spokenDate(new Date('2025-10-25T00:00:00Z'), now)).toBe('Sat 25 Oct 2025');
});

test('days before the journal began are marked, not drawn as rest', async () => {
  const { yearCells } = await import('../src/lib/calendar');
  const cells = yearCells(2022, new Map(), '2022-12-31', '2022-08-20');
  expect(cells.find((c) => c.date === '2022-08-19')!.level).toBe(-1);
  expect(cells.find((c) => c.date === '2022-08-20')!.level).toBe(0);
});

test.describe('numbers that never flatter', () => {
  test('a distance is cut to one decimal, never rounded up', async () => {
    const { kmTenths, kmWhole } = await import('../src/lib/fitness');
    expect(kmTenths(18_770)).toBe('18.7');
    expect(kmTenths(32_734)).toBe('32.7');
    expect(kmWhole(18_770)).toBe('18');
    expect(kmWhole(45_960)).toBe('45');
  });

  test("a run's pace rounds up, because a lower pace is the flattering one", async () => {
    const { paceOf } = await import('../src/lib/fitness');
    // 6:18.6 a kilometre is slower than 6:18, so it shows as 6:19.
    expect(paceOf(6 * 60 + 18.6, 1000)).toBe('6:19');
    expect(paceOf(5 * 60, 1000)).toBe('5:00');
  });
});

test.describe('route privacy', () => {
  // A ride that leaves home, comes back past it in the middle, and ends there.
  const home: [number, number] = [12.95, 77.7];
  const north = (km: number): [number, number] => [home[0] + km / 111, home[1]];
  const route = [0, 0.2, 0.5, 1, 2, 3, 2, 1, 0.3, 0.1, 0.4, 1, 2, 1, 0.5, 0.2, 0].map(north);

  test('every point near the start or the finish is dropped, wherever on the route it falls', async () => {
    const { trimNear } = await import('../scripts/privacy.mjs');
    const segments = trimNear(route, 800);
    const near = (p: [number, number]) => Math.abs(p[0] - home[0]) * 111 < 0.8;
    expect(segments.flat().some(near)).toBe(false);
    // The pass by home in the middle splits the route instead of drawing a line through home.
    expect(segments.length).toBe(2);
  });

  test('a route that never leaves the neighbourhood is not drawn at all', async () => {
    const { trimNear } = await import('../scripts/privacy.mjs');
    expect(trimNear([0, 0.1, 0.3, 0.1, 0].map(north), 800)).toEqual([]);
  });
});

test('a span of days is said once, whichever months and years it crosses', () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`);
  expect(dateRange(d('2026-10-25'), d('2026-10-30'))).toBe('25–30 Oct 2026');
  expect(dateRange(d('2026-10-30'), d('2026-11-02'))).toBe('30 Oct – 2 Nov 2026');
  expect(dateRange(d('2025-12-30'), d('2026-01-02'))).toBe('30 Dec 2025 – 2 Jan 2026');
});

test('crumbs left by trimming are dropped, but never the whole route', async () => {
  const { dropSpecks } = await import('../scripts/privacy.mjs');
  const east = (fromKm: number, toKm: number): [number, number][] =>
    Array.from({ length: 11 }, (_, i) => [12.95, 77.7 + (fromKm + ((toKm - fromKm) * i) / 10) / 108.6]);
  const ride = east(0, 15);
  const crumb = east(20, 20.05);
  const piece = east(30, 33);
  expect(dropSpecks([ride, crumb, piece])).toEqual([ride, piece]);
  // A route whose only piece is short keeps it.
  expect(dropSpecks([crumb])).toEqual([crumb]);
  expect(dropSpecks([crumb, east(40, 40.5)]).length).toBe(1);
});

test('a chapter spanning several days includes every outing of its kind on those days', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const data = join(import.meta.dirname, '..', 'src', 'data');
  const log: { id: number; date: string; type: string }[] = JSON.parse(readFileSync(join(data, 'strava-activities.json'), 'utf8')).activities;
  for (const file of readdirSync(join(data, 'fitness', 'tracks'))) {
    const track = JSON.parse(readFileSync(join(data, 'fitness', 'tracks', file), 'utf8'));
    if (!track.endDate || track.endDate === track.date) continue;
    // The trek once left out two short afternoon legs, because a list of "big days" hid anything under 3 km.
    const sameKind = log.filter((a) => a.date >= track.date && a.date <= track.endDate && a.type === track.type).map((a) => a.id);
    expect(new Set(track.ids), file).toEqual(new Set(sameKind));
  }
});

test.describe('compact route paths', () => {
  const pointsOf = (d: string) => d.split('M').filter(Boolean).map((s) => s.split('L').map((p) => p.trim().split(/\s+/).map(Number)));

  test('a straight stretch needs only its ends', async () => {
    const { compactPath } = await import('../src/lib/routes');
    const line = `M${Array.from({ length: 100 }, (_, i) => `${i * 10} ${i * 5}`).join('L')}`;
    expect(compactPath(line, 1)).toBe('M0 0L990 495');
  });

  test('the drawing does not move: every original point stays within the tolerance of the new line', async () => {
    const { compactPath } = await import('../src/lib/routes');
    const wiggle = `M${Array.from({ length: 400 }, (_, i) => `${i * 3} ${(200 + 80 * Math.sin(i / 9) + 0.6 * Math.sin(i * 1.7)).toFixed(1)}`).join('L')}`;
    const compact = compactPath(wiggle, 1.5);
    const [kept] = pointsOf(compact);
    const [original] = pointsOf(wiggle);
    // The contrast that proves it did something: far fewer points.
    expect(kept.length).toBeLessThan(original.length / 3);
    const near = ([px, py]: number[]) =>
      kept.slice(1).some(([bx, by], i) => {
        const [ax, ay] = kept[i];
        const dx = bx - ax, dy = by - ay;
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= 1.5 + 0.75; // tolerance, plus rounding
      });
    expect(original.every(near)).toBe(true);
  });

  test('every stroke of a route that is drawn in parts keeps its own start and end', async () => {
    const { compactPath } = await import('../src/lib/routes');
    const compact = compactPath('M0 0L5 0.2L10 0M50 50L55 50.1L60 50', 1);
    expect(compact).toBe('M0 0L10 0M50 50L60 50');
  });
});
