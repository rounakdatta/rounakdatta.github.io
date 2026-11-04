// The photos page, looked at and used the way a person does.
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/** Where the strip really is: its scroll, and the sub-pixel glide on top. */
const position = (page: Page) => () =>
  page.locator('.strip').first().evaluate((s) => s.scrollLeft - new DOMMatrix(getComputedStyle(s.firstElementChild!).transform).m41);

test('every photo hangs whole, in a frame the same size as every other', async ({ page }) => {
  await page.goto('/photos/');
  const frames = await page.locator('.strip').first().locator('ul[data-gallery]').first().locator('.photo-link').evaluateAll((links) =>
    links.map((a) => {
      const frame = a.getBoundingClientRect();
      const img = a.querySelector('img')!;
      const shown = img.getBoundingClientRect();
      // The photo's own shape, from the picture's dimensions, not from anything the layout decided.
      const natural = Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
      return { frame: { width: frame.width, height: frame.height }, shown: { left: shown.left - frame.left, right: frame.right - shown.right, top: shown.top - frame.top, bottom: frame.bottom - shown.bottom, ratio: shown.width / shown.height }, natural };
    }),
  );
  expect(frames.length).toBeGreaterThan(3);
  for (const { frame, shown, natural } of frames) {
    // One size for all, so no photo reads as more important than the next.
    expect(Math.abs(frame.width - frames[0].frame.width)).toBeLessThan(1);
    expect(Math.abs(frame.height - frames[0].frame.height)).toBeLessThan(1);
    // Whole: nothing cropped, and nothing spilling out of its frame.
    expect(Math.abs(shown.ratio - natural) / natural).toBeLessThan(0.02);
    for (const side of [shown.left, shown.right, shown.top, shown.bottom]) expect(side).toBeGreaterThanOrEqual(-0.5);
  }
  // Big enough to look at properly on a laptop.
  expect(frames[0].frame.width).toBeGreaterThan(500);
});

test('the strip drifts slowly by itself, holds still while it is looked at, and carries on after', async ({ page }) => {
  await page.goto('/photos/');
  const strip = page.locator('.strip').first();
  await strip.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  const at = position(page);
  let start = await at();
  await expect.poll(at, { timeout: 8000 }).toBeGreaterThan(start + 10);
  // Slowly: well under a photo every few seconds.
  start = await at();
  await page.waitForTimeout(1000);
  expect((await at()) - start).toBeLessThan(40);

  const box = (await strip.boundingBox())!;
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(box.x + box.width / 2 + i, box.y + box.height / 2);
    start = await at();
    await page.waitForTimeout(250);
    // Within a pixel: the sub-pixel glide is dropped the moment it holds.
    expect(Math.abs((await at()) - start)).toBeLessThan(2);
  }
  await page.mouse.move(box.x + box.width / 2, box.y - 150);
  start = await at();
  await expect.poll(at, { timeout: 8000 }).toBeGreaterThan(start + 10);
  // The photos come round again: a copy follows, hidden from screen readers and from the keyboard.
  const copy = strip.locator('ul[data-gallery]').nth(1);
  await expect(copy).toHaveAttribute('aria-hidden', 'true');
  expect(await copy.locator('a').evaluateAll((links) => links.every((a) => a.getAttribute('tabindex') === '-1'))).toBe(true);
});

test('a photo open full-screen holds the strip still behind it, and the strip carries on once it is put away', async ({ page }) => {
  await page.goto('/photos/');
  const first = page.locator('.strip').first().locator('li').first();
  const caption = await first.locator('.caption').textContent();
  // As a hand does: the pointer arrives on the photo (which holds the strip), then clicks.
  const box = (await first.locator('.photo-link').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await first.locator('.photo-link').click();
  await expect(page.locator('.pswp')).toBeVisible();
  await expect(page.locator('.pswp')).toContainText(caption!);
  // Focus moves into the viewer, so a keyboard can put it away at once.
  await expect(page.locator('.pswp')).toBeFocused();
  // Long past the pointer's own hold: only the open photo is holding it now.
  await page.waitForTimeout(3300);
  const at = position(page);
  const start = await at();
  await page.waitForTimeout(1200);
  expect(Math.abs((await at()) - start)).toBeLessThan(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('.pswp')).toHaveCount(0);
  // Put away with a key, the strip mustn't think it's being read by keyboard and stay frozen.
  await page.mouse.move(2, 2);
  const after = await at();
  await expect.poll(at, { timeout: 8000 }).toBeGreaterThan(after + 10);
});

test('a mouse gets arrows that move exactly a photo at a time, either way, even where the album comes round', async ({ page }) => {
  await page.goto('/photos/');
  const gallery = page.locator('.gallery').first();
  const strip = gallery.locator('.strip');
  await gallery.hover();
  // Drifting, the strip comes round, so even at the start there is a way back.
  await expect(gallery.locator('.nudge.back')).toBeVisible();
  await expect(gallery.locator('.nudge.on')).toBeVisible();
  const geometry = () =>
    strip.evaluate((s) => {
      const [a, b] = s.querySelectorAll<HTMLElement>('ul[data-gallery]');
      const frames = s.querySelectorAll<HTMLElement>('.frame');
      return { length: b.getBoundingClientRect().left - a.getBoundingClientRect().left, step: frames[1].offsetLeft - frames[0].offsetLeft, start: parseFloat(getComputedStyle(s.firstElementChild!).paddingLeft) };
    });
  const { length, step, start } = await geometry();
  const at = position(page);
  // Where the strip is, as the album sees it: the same picture one album-length on is the same place.
  const along = async () => (((await at()) - start) % length + length) % length;
  const moved = async (click: () => Promise<void>) => {
    const before = await along();
    await click();
    await page.waitForTimeout(900);
    return ((await along()) - before + length * 1.5) % length - length / 2;
  };
  // Back from the very start, round to the end of the album.
  expect(Math.abs((await moved(() => gallery.locator('.nudge.back').click())) + step)).toBeLessThan(6);
  // On from just after the last photo reaches the left edge, across the point where the album comes round.
  await strip.evaluate((s, x) => (s.scrollLeft = x), start + length - step + 10);
  await page.waitForTimeout(100);
  expect(Math.abs((await moved(() => gallery.locator('.nudge.on').click())) - step)).toBeLessThan(6);
});

test('the copy that brings the album round costs nothing until it is near', async ({ page }) => {
  await page.goto('/photos/');
  const copy = page.locator('.strip').first().locator('ul[data-gallery]').nth(1);
  // No addresses yet: nothing is fetched for photos far off past the end.
  expect(await copy.locator('img').evaluateAll((imgs) => imgs.filter((img) => img.getAttribute('src') || img.getAttribute('srcset')).length)).toBe(0);
  // Brought near, they get them, and fill from what the originals already loaded.
  await page.locator('.strip').first().evaluate((s) => {
    const [, b] = s.querySelectorAll<HTMLElement>('ul[data-gallery]');
    s.scrollLeft = b.offsetLeft - s.clientWidth;
  });
  await expect.poll(() => copy.locator('img').first().getAttribute('src')).toBeTruthy();
});

test("the albums are all on this one page, and an album's old address leads to it there", async ({ page }) => {
  await page.goto('/photos/rajasthan-trip-2025/');
  await expect(page).toHaveURL(/\/photos\/#album-rajasthan-trip-2025$/);
  await expect(page.locator('#album-rajasthan-trip-2025')).toBeVisible();
});

test.describe('for someone who asked for less motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the strip stays where it is, and has no copy', async ({ page }) => {
    await page.goto('/photos/');
    await page.locator('.strip').first().scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    const before = await page.locator('.strip').first().evaluate((s) => s.scrollLeft);
    await page.waitForTimeout(1500);
    expect(await page.locator('.strip').first().evaluate((s) => s.scrollLeft)).toBe(before);
    await expect(page.locator('.strip').first().locator('ul[data-gallery]')).toHaveCount(1);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('one big frame at a time, the next coming in at the edge, and no arrows', async ({ page }) => {
    await page.goto('/photos/');
    const frame = (await page.locator('.strip').first().locator('.photo-link').first().boundingBox())!;
    expect(frame.width).toBeGreaterThan(390 * 0.75);
    expect(frame.height).toBeGreaterThan(frame.width);
    for (const nudge of await page.locator('.nudge').all()) await expect(nudge).toBeHidden();
  });
});

test.describe('on a phone on its side', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true });

  test('a frame still fits on the screen', async ({ page }) => {
    await page.goto('/photos/');
    const frame = (await page.locator('.strip').first().locator('.photo-link').first().boundingBox())!;
    expect(frame.height).toBeLessThan(360);
  });
});
