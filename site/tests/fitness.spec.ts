// The fitness journal, used the way a person uses it.
import { test, expect, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ viewport: { width: 1440, height: 900 } });

// The journal module uses Vite's glob imports, so tests read the same data files themselves.
const tracks = () => {
  const dir = join(import.meta.dirname, '..', 'src', 'data', 'fitness', 'tracks');
  return readdirSync(dir).map((f) => ({ slug: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
};

// ---------- The strip of days ----------

const DAY = 86_400_000;
// Where a day should be drawn, worked out here a different way from the page (by counting Mondays),
// so a slip in the page's arithmetic can't be repeated by the test that checks it.
const monday = (t: number) => t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
const squareOf = (date: string) => {
  const t = Date.parse(`${date}T00:00:00Z`);
  const year = new Date(t).getUTCFullYear();
  return { year, week: Math.round((monday(t) - monday(Date.UTC(year, 0, 1))) / (7 * DAY)), row: (new Date(t).getUTCDay() + 6) % 7 };
};
const notes = () =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'src', 'data', 'fitness', 'milestones.json'), 'utf8')).milestones as { text: string; date?: string; dates?: string[]; week?: string; month?: string }[];

/** The strip's own measures: its rows' top, a square's step and size, and where each year's weeks start. */
async function stripGeometry(page: Page) {
  return page.locator('svg.days').first().evaluate((svg: SVGSVGElement) => ({
    top: Number(svg.dataset.top),
    step: Number(svg.dataset.step),
    cell: Number(svg.dataset.cell),
    left: Object.fromEntries((JSON.parse(svg.dataset.years!) as number[][]).map(([year, left]) => [year, left])),
  }));
}

/** Scroll the strip until a point of the drawing is in the middle of the screen, and say where it is. */
async function onScreen(page: Page, x: number, y: number) {
  return page.evaluate(([x, y]) => {
    const svg = document.querySelector('svg.days') as SVGSVGElement;
    const strip = document.querySelector('.strip')!;
    const at = () => new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
    strip.scrollLeft += at().x - strip.getBoundingClientRect().width / 2;
    return { x: at().x, y: at().y };
  }, [x, y]);
}

test.describe('held still', () => {
  test.use({ reducedMotion: 'reduce' });

  test('hovering a day that has not happened yet tells you nothing about it', async ({ page }) => {
    const { lastUpdated } = await import('../src/lib/fitness');
    // The day after the last sync: always in the future. (On 31 December it is next year; nothing to test.)
    const next = new Date(lastUpdated.valueOf() + DAY);
    test.skip(next.getUTCFullYear() !== lastUpdated.getUTCFullYear(), 'the year has no days left');
    await page.goto('/fitness/');
    await page.locator('.strip').scrollIntoViewIfNeeded();
    const g = await stripGeometry(page);
    const at = (date: Date) => {
      const sq = squareOf(date.toISOString().slice(0, 10));
      return [g.left[sq.year] + sq.week * g.step + g.cell / 2, g.top + sq.row * g.step + g.cell / 2] as const;
    };
    const future = await onScreen(page, ...at(next));
    await page.mouse.move(future.x, future.y);
    await expect(page.locator('.moving .tooltip')).toBeHidden();
    // And the contrast that proves the hover landed: the last day synced shows its tooltip.
    const past = await onScreen(page, ...at(lastUpdated));
    await page.mouse.move(past.x, past.y);
    await expect(page.locator('.moving .tooltip')).toBeVisible();
  });

  test("every note's arrow comes in along its own week, and every day it names is ringed", async ({ page }) => {
    await page.goto('/fitness/');
    const g = await stripGeometry(page);
    const drawn = await page.locator('svg.days').first().evaluate((svg: SVGSVGElement) => {
      // In the drawing's own units, through any transform on the way, as it is actually painted.
      const inDrawing = (el: SVGGraphicsElement, x: number, y: number) => {
        const p = new DOMPoint(x, y).matrixTransform(el.getScreenCTM()!).matrixTransform(svg.getScreenCTM()!.inverse());
        return [p.x, p.y];
      };
      return [...svg.querySelectorAll<SVGGElement>('g.note[data-position]')].map((note) => ({
        text: [...note.querySelectorAll('text')].map((t) => t.textContent).join('\n'),
        rings: [...note.querySelectorAll<SVGPathElement>('.ring')].map((r) => {
          const b = r.getBBox();
          return inDrawing(r, b.x + b.width / 2, b.y + b.height / 2);
        }),
        // Where each arrow's line really ends.
        tips: [...note.querySelectorAll<SVGPathElement>('.shaft')].map((s) => {
          const p = s.getPointAtLength(s.getTotalLength());
          return inDrawing(s, p.x, p.y);
        }),
      }));
    });
    const gridBottom = g.top + 6 * g.step + g.cell;
    const centre = (date: string) => {
      const sq = squareOf(date);
      return { x: g.left[sq.year] + sq.week * g.step + g.cell / 2, y: g.top + sq.row * g.step + g.cell / 2 };
    };
    expect(drawn.length).toBe(notes().length);
    for (const note of notes()) {
      const mark = drawn.find((d) => d.text === note.text)!;
      expect(mark, note.text).toBeTruthy();
      const days = note.dates ?? (note.date ? [note.date] : []);
      // A ring round each day it names, centred on that day's square (it is drawn by hand, so
      // within a couple of units; the next square is 15 away).
      expect(mark.rings, note.text).toHaveLength(days.length);
      for (const day of days) {
        const c = centre(day);
        expect(mark.rings.some(([x, y]) => Math.abs(x - c.x) < 2.5 && Math.abs(y - c.y) < 2.5), `${note.text}: ${day} is ringed`).toBe(true);
      }
      // Every arrow ends in the middle of the column of one of its days, or of its week, just
      // outside the squares: so it can only be read as that week.
      const columns = [...new Set((note.week ? [note.week] : days).map((d) => centre(d).x))];
      expect(mark.tips, note.text).toHaveLength(note.month ? 0 : columns.length);
      for (const [x, y] of mark.tips) {
        expect(columns.some((cx) => Math.abs(x - cx) < 0.5), `${note.text}: arrow at x=${x}, its weeks at ${columns}`).toBe(true);
        expect(y < g.top ? g.top - y : y - gridBottom, `${note.text}: arrow ends just outside the squares`).toBeGreaterThan(0);
        expect(y < g.top ? g.top - y : y - gridBottom).toBeLessThan(6);
      }
    }
  });

  test('pointing at a ringed day names that day, and what was done on it', async ({ page }) => {
    const { activities } = await import('../src/lib/fitness');
    await page.goto('/fitness/');
    await page.locator('.strip').scrollIntoViewIfNeeded();
    const spoken = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const rings = page.locator('svg.days').first().locator('.ring');
    const days = notes().flatMap((n) => n.dates ?? (n.date ? [n.date] : []));
    expect(await rings.count()).toBe(days.length);
    for (let i = 0; i < days.length; i++) {
      const centre = await rings.nth(i).evaluate((r: SVGPathElement) => {
        const b = r.getBBox();
        const p = new DOMPoint(b.x + b.width / 2, b.y + b.height / 2).matrixTransform(r.getScreenCTM()!).matrixTransform(r.ownerSVGElement!.getScreenCTM()!.inverse());
        return [p.x, p.y] as const;
      });
      const point = await onScreen(page, ...centre);
      await page.mouse.move(point.x, point.y);
      const text = (await page.locator('.moving .tooltip').textContent())!;
      const day = days.find((d) => text.startsWith(spoken.format(new Date(`${d}T00:00:00Z`)).replace(',', '')));
      expect(day, `ring ${i} says "${text}"`).toBeTruthy();
      // The day's own distance, as the log has it: the ring is on the race, not beside it.
      const longest = Math.max(...activities.filter((a) => a.date === day).map((a) => a.distance));
      expect(text).toContain(`${Math.floor(longest / 100) / 10} km`);
    }
  });

  test('no note sits on another, or on the days', async ({ page }) => {
    await page.goto('/fitness/');
    await page.locator('.strip').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    const { boxes, grid } = await page.locator('svg.days').first().evaluate((svg: SVGSVGElement) => {
      const toScreen = (x: number, y: number) => new DOMPoint(x, y).matrixTransform(svg.getScreenCTM()!);
      const top = toScreen(0, Number(svg.dataset.top)).y;
      const bottom = toScreen(0, Number(svg.dataset.top) + 6 * Number(svg.dataset.step) + Number(svg.dataset.cell)).y;
      return {
        grid: { top, bottom },
        boxes: [...svg.querySelectorAll('g.note > g, g.year-note > text')].map((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent!.trim(), left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }),
      };
    });
    expect(boxes.length).toBeGreaterThan(10);
    for (const a of boxes) {
      expect(a.bottom <= grid.top || a.top >= grid.bottom, `"${a.text}" sits on the days`).toBe(true);
      for (const b of boxes) {
        if (a === b) continue;
        const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
        expect(apart, `"${a.text}" and "${b.text}" overlap`).toBe(true);
      }
    }
  });

  test('for someone who asked for less motion, the strip stays where it is and has no copy', async ({ page }) => {
    await page.goto('/fitness/');
    await page.locator('.strip').scrollIntoViewIfNeeded();
    await page.mouse.move(5, 5);
    const before = await page.locator('.strip').evaluate((s) => s.scrollLeft);
    await page.waitForTimeout(1500);
    expect(await page.locator('.strip').evaluate((s) => s.scrollLeft)).toBe(before);
    await expect(page.locator('svg.days')).toHaveCount(1);
  });
});

/** Where the strip really is: its scroll, and the sub-pixel glide on top. */
const stripPosition = (page: Page) => () =>
  page.locator('.strip').evaluate((s) => s.scrollLeft - new DOMMatrix(getComputedStyle(s.firstElementChild!).transform).m41);

test('the strip drifts on by itself, holds still while it is looked at, and carries on after', async ({ page }) => {
  await page.goto('/fitness/');
  const strip = page.locator('.strip');
  await strip.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);
  const position = stripPosition(page);
  let start = await position();
  // Polled, not timed: on a busy machine frames come slowly, but they still come.
  await expect.poll(position, { timeout: 8000 }).toBeGreaterThan(start + 10);

  const box = (await strip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) {
    // A pointer that keeps moving is someone looking: measured between two of its moves.
    await page.mouse.move(box.x + box.width / 2 + i, box.y + box.height / 2);
    start = await position();
    await page.waitForTimeout(250);
    expect(Math.abs((await position()) - start)).toBeLessThan(1);
  }

  await page.mouse.move(box.x + box.width / 2, box.y - 200);
  start = await position();
  await expect.poll(position, { timeout: 8000 }).toBeGreaterThan(start + 10);
  // The years come round again: a copy follows the strip, hidden from screen readers.
  await expect(page.locator('svg.days')).toHaveCount(2);
  await expect(page.locator('svg.days').nth(1)).toHaveAttribute('aria-hidden', 'true');
});

test('a press that slips off the strip and lets go elsewhere leaves it free', async ({ page }) => {
  await page.goto('/fitness/');
  const strip = page.locator('.strip');
  await strip.scrollIntoViewIfNeeded();
  const box = (await strip.boundingBox())!;
  // Pressed on the strip, slid straight down off it, let go below.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 150, { steps: 6 });
  await page.mouse.up();
  // Back over it with no button held, it isn't dragged…
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 });
  await expect(strip).not.toHaveClass(/dragging/);
  // …and once the pointer goes, it drifts on.
  await page.mouse.move(5, 5);
  const position = stripPosition(page);
  const start = await position();
  await expect.poll(position, { timeout: 8000 }).toBeGreaterThan(start + 10);
});

test('reached by keyboard, the strip holds still to be read and scrolls with the arrow keys', async ({ page }) => {
  await page.goto('/fitness/');
  // The last card's Strava link comes just before the strip.
  await page.locator('.places .strava').last().focus();
  await page.keyboard.press('Tab');
  const strip = page.locator('.strip');
  await expect(strip).toBeFocused();
  const at = () => strip.evaluate((s) => s.scrollLeft);
  const start = await at();
  await page.waitForTimeout(1200);
  expect(await at()).toBe(start);
  await page.keyboard.press('ArrowRight');
  await expect.poll(at).toBeGreaterThan(start);
});

test('the two distances at the top are the sum of the log, not numbers typed in', async ({ page }) => {
  const { activities, totalsOf, km } = await import('../src/lib/fitness');
  const totals = totalsOf(activities);
  await page.goto('/fitness/');
  await expect(page.locator('.wide-arcs .figure')).toHaveText([km(totals.run), km(totals.ride)]);
});

test('every chapter is a card on the one page, with its map and its photos', async ({ page }) => {
  await page.goto('/fitness/');
  const cards = page.locator('article.place');
  const ids = await cards.evaluateAll((all) => all.map((a) => a.id));
  expect(ids.length).toBe(tracks().length);
  for (const track of tracks().filter((t) => t.route.length).slice(0, 3)) {
    const card = page.locator(`#${track.slug}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('.plate img')).toBeVisible();
    await expect(card.locator('svg.route.wide path.line')).toHaveAttribute('d', /^M/);
  }
  // There are no pages per chapter any more: everything is here.
  expect(await page.locator('a[href^="/fitness/"]').count()).toBe(0);
});

test.describe('at rest', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the photos sit together in the middle of every map', async ({ page }) => {
    await page.goto('/fitness/');
    const offsets = await page.locator('.card').evaluateAll((cards) =>
      cards.flatMap((card) => {
        const box = card.getBoundingClientRect();
        const prints = [...card.querySelectorAll('.slot')].map((s) => s.getBoundingClientRect()).filter((r) => r.width);
        if (!prints.length) return [];
        const x = prints.reduce((t, r) => t + r.left + r.width / 2, 0) / prints.length;
        const y = prints.reduce((t, r) => t + r.top + r.height / 2, 0) / prints.length;
        return [[(x - box.left) / box.width - 0.5, (y - box.top) / box.height - 0.46]];
      }));
    expect(offsets.length).toBeGreaterThan(10);
    for (const [dx, dy] of offsets) {
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(dy)).toBeLessThanOrEqual(0.1);
    }
  });
});

test('a polaroid picked up comes to the middle of its map, and Escape puts it back', async ({ page }) => {
  await page.goto('/fitness/');
  const card = page.locator('.card').first();
  await card.scrollIntoViewIfNeeded();
  const polaroid = card.locator('.polaroid').first();
  await page.waitForTimeout(3500); // let the card finish arriving
  await polaroid.click();
  await expect(polaroid).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(700);
  const [c, p] = [await card.boundingBox(), await polaroid.boundingBox()];
  expect(Math.abs(p!.x + p!.width / 2 - (c!.x + c!.width / 2))).toBeLessThan(c!.width * 0.05);
  expect(p!.width).toBeGreaterThan(c!.width * 0.5);
  await page.keyboard.press('Escape');
  await expect(polaroid).toHaveAttribute('aria-pressed', 'false');
});

test('cards draw themselves once they are seen, not before', async ({ page }) => {
  await page.goto('/fitness/');
  const card = page.locator('.card').last();
  await expect(card).not.toHaveClass(/play/);
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/play/);
});

test('a photo opens the moment it is pressed and goes back the moment it is pressed again', async ({ page }) => {
  await page.goto('/fitness/');
  const card = page.locator('.card').filter({ has: page.locator('.slot:nth-child(3)') }).first();
  await card.scrollIntoViewIfNeeded();
  // Every photo has dropped in: no arrival left to wait for.
  await expect.poll(() => card.evaluate((c) => c.getAnimations({ subtree: true }).filter((a) => (a as CSSAnimation).animationName === 'drop').length), { timeout: 8000 }).toBe(0);
  const slot = card.locator('.slot').first();
  const polaroid = slot.locator('.polaroid');
  const rest = (await polaroid.boundingBox())!.width;
  // What is moving the photo right now, and after how long a wait.
  const moving = () =>
    slot.evaluate((el) => el.getAnimations().filter((a) => 'transitionProperty' in a).map((a) => Number(a.effect!.getTiming().delay)));

  await polaroid.click();
  const opening = await moving();
  expect(opening.length, 'it moves, rather than jumping').toBeGreaterThan(0);
  expect(opening.every((delay) => delay === 0), `opening waits ${opening}`).toBe(true);
  await expect.poll(async () => (await polaroid.boundingBox())!.width).toBeGreaterThan(rest * 2.2);

  await polaroid.click();
  const closing = await moving();
  expect(closing.length).toBeGreaterThan(0);
  expect(closing.every((delay) => delay === 0), `putting it back waits ${closing}`).toBe(true);
  // On its way down it stays above the photos it is landing among.
  const z = await card.locator('.slot').evaluateAll((all) => all.map((el) => Number(getComputedStyle(el).zIndex)));
  expect(z[0]).toBeGreaterThan(Math.max(...z.slice(1)));
  await expect.poll(async () => Math.abs((await polaroid.boundingBox())!.width - rest)).toBeLessThan(1.5);
});

test.describe('night', () => {
  test.use({ colorScheme: 'dark' });

  test('code stays readable at night', async ({ page }) => {
    await page.goto('/notes/godfs/');
    const ratios = await page.locator('pre.astro-code').first().evaluate((pre) => {
      const rgb = (c: string) => c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const bg = lum(rgb(getComputedStyle(pre).backgroundColor));
      return [...pre.querySelectorAll('span')].filter((s) => s.textContent!.trim()).map((s) => {
        const fg = lum(rgb(getComputedStyle(s).color));
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    });
    expect(ratios.length).toBeGreaterThan(5);
    const legible = ratios.filter((r) => r >= 4.5).length / ratios.length;
    expect(legible, 'share of code tokens with 4.5:1 contrast').toBeGreaterThan(0.9);
  });
});


test('a day with no route is still a card: its photos and its numbers, and no empty map', async ({ page }) => {
  const indoor = tracks().find((t) => !t.route.length);
  test.skip(!indoor, 'every chapter has a route');
  await page.goto('/fitness/');
  const card = page.locator(`#${indoor.slug} .card`);
  await expect(card.locator('picture.plate')).toHaveCount(0);
  await expect(card.locator('svg.route')).toHaveCount(0);
  await expect(card.locator('.polaroid').first()).toBeAttached();
  await expect(card.locator('.meta')).toContainText('min');
});
