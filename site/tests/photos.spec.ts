// The photos page, looked at and used the way a person does.
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test('every print hangs on one line, in its own shape, and no two neighbours are the same size', async ({ page }) => {
  await page.goto('/photos/');
  const prints = await page.locator('.prints').first().locator('.photo-link').evaluateAll((links) =>
    links.map((a) => {
      const box = a.getBoundingClientRect();
      const img = a.querySelector('img')!;
      // The photo's own shape, from the picture's dimensions, not from anything the layout decided.
      return { bottom: box.bottom, width: box.width, height: box.height, natural: Number(img.getAttribute('width')) / Number(img.getAttribute('height')) };
    }),
  );
  expect(prints.length).toBeGreaterThan(3);
  for (const print of prints) {
    // One line: every print stands on the same bottom edge.
    expect(Math.abs(print.bottom - prints[0].bottom)).toBeLessThan(1);
    // Its own shape: nothing cropped to fit a tile.
    expect(Math.abs(print.width / print.height - print.natural) / print.natural).toBeLessThan(0.02);
  }
  for (let i = 1; i < prints.length; i++) expect(Math.abs(prints[i].height - prints[i - 1].height), `prints ${i} and ${i + 1}`).toBeGreaterThan(4);
});

test('a caption hangs under its print, no wider than it', async ({ page }) => {
  await page.goto('/photos/');
  const pairs = await page.locator('.prints').first().locator('li:has(.caption)').evaluateAll((items) =>
    items.map((li) => {
      const print = li.querySelector('.photo-link')!.getBoundingClientRect();
      const caption = li.querySelector('.caption')!.getBoundingClientRect();
      return { print, caption, text: li.querySelector('.caption')!.textContent };
    }),
  );
  expect(pairs.length).toBeGreaterThan(3);
  for (const { print, caption, text } of pairs) {
    expect(caption.top, text!).toBeGreaterThanOrEqual(print.bottom);
    expect(caption.width, text!).toBeLessThanOrEqual(print.width + 1);
  }
});

test('a print opens full-screen with its caption, and Escape puts it away', async ({ page }) => {
  await page.goto('/photos/');
  const first = page.locator('.prints').first().locator('li').first();
  const caption = await first.locator('.caption').textContent();
  await first.locator('.photo-link').click();
  await expect(page.locator('.pswp')).toBeVisible();
  await expect(page.locator('.pswp')).toContainText(caption!);
  // Focus moves into the viewer, so a keyboard can put it away at once.
  await expect(page.locator('.pswp')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pswp')).toHaveCount(0);
});

test('a mouse gets an arrow to go along the strip, and one to come back once it has gone', async ({ page }) => {
  await page.goto('/photos/');
  const wall = page.locator('.wall').first();
  const prints = wall.locator('.prints');
  await wall.hover();
  await expect(wall.locator('.nudge.on')).toBeVisible();
  // At the start there is nowhere to go back to.
  await expect(wall.locator('.nudge.back')).toBeHidden();
  await wall.locator('.nudge.on').click();
  await expect.poll(() => prints.evaluate((s) => s.scrollLeft)).toBeGreaterThan(200);
  await expect(wall.locator('.nudge.back')).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a finger needs no arrows: the strip scrolls by itself under it', async ({ page }) => {
    await page.goto('/photos/');
    const nudges = await page.locator('.nudge').all();
    expect(nudges.length).toBeGreaterThan(0);
    for (const nudge of nudges) await expect(nudge).toBeHidden();
  });
});
