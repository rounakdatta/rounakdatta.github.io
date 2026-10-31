// The fitness journal, used the way a person uses it.
import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.use({ viewport: { width: 1440, height: 900 } });

test('hovering a day that has not happened yet tells you nothing about it', async ({ page }) => {
  const { lastUpdated } = await import('../src/lib/fitness');
  // The day after the last sync: always in the future. (On 31 December it is next year; nothing to test.)
  const next = new Date(lastUpdated.valueOf() + 86_400_000);
  test.skip(next.getUTCFullYear() !== lastUpdated.getUTCFullYear(), 'the year has no days left');
  await page.goto('/fitness/');
  const svg = page.locator(`.calendar[data-year="${next.getUTCFullYear()}"] svg.weeks`);
  await svg.scrollIntoViewIfNeeded();
  const box = (await svg.boundingBox())!;
  const geo = await svg.evaluate((s: SVGSVGElement) => ({ w: s.viewBox.baseVal.width, top: Number(s.dataset.top), left: Number(s.dataset.left), step: Number(s.dataset.step), offset: Number(s.dataset.offset) }));
  const k = box.width / geo.w;
  const dayOfYear = Math.round((next.valueOf() - Date.UTC(next.getUTCFullYear(), 0, 1)) / 86_400_000);
  const col = Math.floor((dayOfYear + geo.offset) / 7);
  const row = (next.getUTCDay() + 6) % 7;
  await page.mouse.move(box.x + (geo.left + col * geo.step + 6) * k, box.y + (geo.top + row * geo.step + 6) * k);
  await expect(page.locator('.journey .tooltip')).toBeHidden();
  // And the contrast that proves the hover landed: the day before shows its tooltip.
  await page.mouse.move(box.x + (geo.left + (row === 0 ? col - 1 : col) * geo.step + 6) * k, box.y + (geo.top + (row === 0 ? 6 : row - 1) * geo.step + 6) * k);
  await expect(page.locator('.journey .tooltip')).toBeVisible();
});

test('the totals at the top are the sum of the log, not a number typed in', async ({ page }) => {
  const { activities, totalsOf, km } = await import('../src/lib/fitness');
  await page.goto('/fitness/');
  await expect(page.locator('.total .figure')).toHaveText(`${km(totalsOf(activities).footAndBike)} km`);
});

test('every chapter in the grid opens its own page, and it has a map', async ({ page, request }) => {
  await page.goto('/fitness/');
  const hrefs = await page.locator('.shapes a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs.length).toBeGreaterThan(10);
  for (const href of hrefs.slice(0, 3)) {
    await page.goto(href!);
    await expect(page.locator('.plate img')).toBeVisible();
    await expect(page.locator('.plate svg path.line')).toHaveAttribute('d', /^M/);
  }
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

// The journal module uses Vite's glob imports, so tests read the same data files themselves.
const tracks = () => {
  const dir = join(import.meta.dirname, '..', 'src', 'data', 'fitness', 'tracks');
  return readdirSync(dir).map((f) => ({ slug: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
};

test('a trek walked over several days rings every one of them in the calendar', async ({ page }) => {
  const trek = tracks().find((t) => t.endDate && t.endDate !== t.date);
  test.skip(!trek, 'no chapter spans several days');
  const days = Math.round((Date.parse(trek.endDate) - Date.parse(trek.date)) / 86_400_000) + 1;
  await page.goto('/fitness/');
  expect(await page.locator(`.calendar svg.weeks a[href="/fitness/${trek.slug}/"]`).count()).toBe(days);
});

test('a day with no route still has its page: the numbers and the photos, and no empty map', async ({ page }) => {
  const indoor = tracks().find((t) => !t.route.length);
  test.skip(!indoor, 'every chapter has a route');
  await page.goto(`/fitness/${indoor.slug}/`);
  await expect(page.locator('.plate')).toHaveCount(0);
  await expect(page.locator('.profile')).toHaveCount(0);
  await expect(page.locator('.stats dt').first()).toBeVisible();
  await expect(page.locator('.stats')).not.toContainText('Distance');
});
