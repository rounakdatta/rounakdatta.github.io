// The pure parts of the site, tested without a browser: words, numbers, dates and shapes.
import { test, expect } from '@playwright/test';
import { excerptOf, readingMinutes, isPublished, proseOf } from '../src/lib/text';
import { totalsOf, km, sportOf, activities, type Activity } from '../src/lib/fitness';
import { fitRoute, type LatLng } from '../src/lib/routes';
import { shortDate, spokenDate, dateRange } from '../src/lib/dates';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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

  test('crowded together, notes slide apart just enough, and a note on its own stays put', async () => {
    const { dodge } = await load();
    const notes = [{ want: 100, width: 80 }, { want: 110, width: 80 }, { want: 400, width: 80 }];
    const [a, b, c] = dodge(notes, 10);
    // The two that wanted nearly the same place end up exactly a note's width and a gap apart…
    expect(b - a).toBeCloseTo(90);
    // …around the middle of where they wanted to be, so neither is pushed further than it must be.
    expect((a + b) / 2).toBeCloseTo(105);
    // The contrast that proves it did something only where needed: the loner never moved.
    expect(c).toBe(400);
  });

  test('a day sits in the column of its week, weeks starting on Monday', async () => {
    const { placeOf } = await load();
    // 1 Jan 2022 was a Saturday: the first column, sixth row. Monday 3 Jan began the second column.
    expect(placeOf('2022-01-01')).toEqual({ year: 2022, week: 0, weekday: 5 });
    expect(placeOf('2022-01-03')).toEqual({ year: 2022, week: 1, weekday: 0 });
    expect(placeOf('2024-01-21')).toEqual({ year: 2024, week: 2, weekday: 6 });
    expect(placeOf('2024-01-28')).toEqual({ year: 2024, week: 3, weekday: 6 });
  });
});

test('a note pinned badly stops the build instead of drawing somewhere wrong', async () => {
  const { parseMilestones } = await import('../src/lib/calendar');
  const good = { text: 'Ladakh HM', position: 'above', date: '2024-09-08' };
  expect(parseMilestones([good])[0]).toMatchObject({ days: ['2024-09-08'], position: 'above' });
  // A side that isn't one, a day that doesn't exist, two pins at once, no pin at all.
  for (const bad of [
    { ...good, position: 'Below' },
    { ...good, date: '2023-02-30' },
    { ...good, week: '2024-09-02' },
    { text: 'Ladakh HM', position: 'above' },
    { text: 'Bought a bike', position: 'below', month: '2022-13' },
  ])
    expect(() => parseMilestones([bad]), JSON.stringify(bad)).toThrow(/milestones\.json/);
});

test.describe('the notes in the calendar, against the log', () => {
  // The notes are Rounak's words; the days they're pinned to were read off Strava. These hold them
  // there: a sync that shifted a day, or a typo in a date, fails here before it misleads anyone.
  const notes = () => (JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'data', 'fitness', 'milestones.json'), 'utf8')).milestones as { text: string; date?: string; dates?: string[] }[]);
  const daysOf = (n: { date?: string; dates?: string[] }) => n.dates ?? (n.date ? [n.date] : []);
  const note = (text: string) => notes().find((n) => n.text === text)!;
  const log = [...activities].sort((a, b) => a.date.localeCompare(b.date));
  const run = (a: Activity) => /Run$/.test(a.type);
  const ride = (a: Activity) => /Ride$/.test(a.type) && a.type !== 'EBikeRide';
  const firstDay = (f: (a: Activity) => boolean) => log.find(f)?.date;

  test('each first is the first such day in the log', () => {
    expect(note('Signed up\non Strava').date).toBe(log[0].date);
    // The very first run was a 5 km race (4.92 km on the watch).
    expect(note('First 5K run').date).toBe(firstDay(run));
    expect(log.find(run)!.distance).toBeGreaterThan(4_800);
    expect(note('First 10K run').date).toBe(firstDay((a) => run(a) && a.distance >= 10_000));
    expect(note('First Half Marathon').date).toBe(firstDay((a) => run(a) && a.distance >= 21_097));
    expect(note('First 50K ride').date).toBe(firstDay((a) => ride(a) && a.distance >= 50_000));
    expect(note('First 100K ride').date).toBe(firstDay((a) => ride(a) && a.distance >= 100_000));
  });

  test('every day a note names is a day something happened, and every race is as long as its name', () => {
    for (const n of notes()) {
      for (const day of daysOf(n)) {
        const longest = Math.max(0, ...log.filter((a) => a.date === day).map((a) => a.distance));
        expect(longest, `${n.text.replace('\n', ' ')} on ${day}`).toBeGreaterThan(0);
        // A half marathon is 21.1 km; a 30K trail measured a little short on the watch.
        if (/\bHM\b|Half Marathon/.test(n.text)) expect(longest, `${n.text} on ${day}`).toBeGreaterThan(21_000);
        if (/30K/.test(n.text)) expect(longest, `${n.text} on ${day}`).toBeGreaterThan(29_000);
      }
    }
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

test.describe('polaroids on a map card', () => {
  const frame = { width: 1200, height: 800 };
  const size = { width: 276, height: 240 };
  const centroid = (slots: { x: number; y: number }[]) => [
    slots.reduce((t, s) => t + s.x, 0) / slots.length,
    slots.reduce((t, s) => t + s.y, 0) / slots.length,
  ];

  test('the photos sit together in the middle of the map, however many there are', async () => {
    const { placePolaroids } = await import('../src/lib/polaroids');
    for (let count = 1; count <= 6; count++) {
      const [x, y] = centroid(placePolaroids([], count, { frame, size }));
      // Rounak: "it'll be a great idea if the images are always nicely centered".
      expect(Math.abs(x - 0.5), `${count} photos, across`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(y - 0.46), `${count} photos, down`).toBeLessThanOrEqual(0.02);
    }
  });

  test('they move off centre only as far as it takes to uncover the route', async () => {
    const { placePolaroids, along, coverage } = await import('../src/lib/polaroids');
    // A route running down the left of the middle.
    const line = along([[[480, 60], [500, 740]]], 6);
    const slots = placePolaroids(line, 3, { frame, size });
    const [x] = centroid(slots);
    const centred = placePolaroids([], 3, { frame, size });
    const at = (ss: typeof slots) => ss.map((s) => [s.x * frame.width, s.y * frame.height] as [number, number]);
    // The contrast that proves it did something: less of the line hidden than by the plain centred group…
    expect(coverage(line, at(slots), size)).toBeLessThan(coverage(line, at(centred), size));
    // …while still close to the middle.
    expect(Math.abs(x - 0.5)).toBeLessThanOrEqual(0.09);
  });

  test('every polaroid stays on the map, clear of its fading edge', async () => {
    const { placePolaroids, along } = await import('../src/lib/polaroids');
    const wobble = along([Array.from({ length: 60 }, (_, i) => [140 + i * 16, 380 + 90 * Math.sin(i / 6)] as [number, number])], 6);
    for (let count = 1; count <= 6; count++)
      for (const { x, y } of placePolaroids(wobble, count, { frame, size })) {
        expect(x * frame.width - size.width / 2).toBeGreaterThanOrEqual(0);
        expect(x * frame.width + size.width / 2).toBeLessThanOrEqual(frame.width);
        expect(y * frame.height - size.height / 2).toBeGreaterThanOrEqual(0);
        expect(y * frame.height + size.height / 2).toBeLessThanOrEqual(frame.height);
      }
  });

  test('two builds lay the same group', async () => {
    const { placePolaroids, along } = await import('../src/lib/polaroids');
    const line = along([[[100, 100], [1100, 700]]], 6);
    expect(placePolaroids(line, 5, { frame, size })).toEqual(placePolaroids(line, 5, { frame, size }));
  });
});
