// The photos page, looked at and used the way a person does.
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/** The photos Rounak took hang as prints in the darkroom, the second of the page's two sets. */
const PRINTS = '/photos/#by-me';

/** Where the strip really is: its scroll, and the sub-pixel glide on top. */
const position = (page: Page) => () =>
  page.locator('.strip').first().evaluate((s) => s.scrollLeft - new DOMMatrix(getComputedStyle(s.firstElementChild!).transform).m41);

/** The shape most of an album's photos share, the way the page decides it. */
const usualShape = (shapes: number[]) => {
  const counts = new Map<number, number>();
  for (const shape of shapes.map((a) => Math.round(a * 100) / 100)) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
};

test('every photo hangs whole, in a frame the same size as every other in its album', async ({ page }) => {
  await page.goto(PRINTS);
  const strips = await page.locator('.strip').all();
  expect(strips.length).toBeGreaterThan(0);
  for (const strip of strips) {
    const frames = await strip.locator('ul[data-gallery]').first().locator('.photo-link').evaluateAll((links) =>
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
    // The print is cut to the album's usual photo, which sits with the same black border on all four sides.
    const shape = usualShape(frames.map(({ natural }) => natural));
    const usual = frames.filter(({ natural }) => Math.abs(natural - shape) < 0.01);
    expect(usual.length).toBeGreaterThan(3);
    for (const { shown } of usual) {
      const sides = [shown.left, shown.right, shown.top, shown.bottom];
      expect(Math.max(...sides) - Math.min(...sides)).toBeLessThan(1.5);
    }
    // Big enough to be looked at: most of the window's height.
    expect(frames[0].frame.height).toBeGreaterThan(0.6 * page.viewportSize()!.height);
  }
});

test.describe('held still to be looked at', () => {
  test.use({ reducedMotion: 'reduce' });

  test('each photo is a print on black: an even black border, and black wherever its shape leaves room', async ({ page }) => {
    const sharp = (await import('sharp')).default;
    await page.goto(PRINTS);
    let others = 0;
    for (const strip of await page.locator('.strip').all()) {
      const frames = strip.locator('.photo-link');
      // The album's usual photo fills its print up to the border; a photo of another shape sits on black.
      const shapes = await frames.evaluateAll((links) => links.map((a) => Number(getComputedStyle(a.closest('.frame')!).getPropertyValue('--a'))));
      const shape = usualShape(shapes);
      const usual = shapes.findIndex((a) => Math.abs(a - shape) < 0.01);
      const other = shapes.findIndex((a) => Math.abs(a - shape) > 0.2);
      if (other >= 0) others++;
      for (const k of [usual, other].filter((k) => k >= 0)) {
        const frame = frames.nth(k);
        // In the middle of the screen, clear of the fade at the strip's edges.
        await frame.evaluate((a) => a.scrollIntoView({ block: 'center', inline: 'center' }));
        await expect.poll(() => frame.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
        // Loaded is not yet painted: decode it, and let a frame go by.
        await frame.locator('img').evaluate((i: HTMLImageElement) => i.decode());
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        const box = (await frame.boundingBox())!;
        const { data, info } = await sharp(await page.screenshot({ clip: box })).raw().toBuffer({ resolveWithObject: true });
        // A small patch around a point: how bright it is at most, and how much it varies. Black
        // padding is dark and perfectly even; a photo, even a dark one, never is.
        const patch = (fx: number, fy: number) => {
          const cx = Math.floor(fx * (info.width - 1));
          const cy = Math.floor(fy * (info.height - 1));
          const values: number[] = [];
          for (let y = Math.max(0, cy - 3); y <= Math.min(info.height - 1, cy + 3); y++)
            for (let x = Math.max(0, cx - 3); x <= Math.min(info.width - 1, cx + 3); x++) {
              const i = (y * info.width + x) * info.channels;
              values.push(data[i] + data[i + 1] + data[i + 2]);
            }
          return { brightest: Math.max(...values), spread: Math.max(...values) - Math.min(...values) };
        };
        const black = (at: { brightest: number; spread: number }) => at.brightest < 60 && at.spread < 15;
        // The border: black at the very edge of the print, all round.
        for (const [x, y] of [[0.5, 0.01], [0.5, 0.99], [0.01, 0.5], [0.99, 0.5]]) expect(black(patch(x, y)), `print ${k}, edge at ${x},${y}`).toBe(true);
        // The photo itself in the middle.
        expect(black(patch(0.5, 0.5)), `print ${k}, middle`).toBe(false);
        // A wider photo leaves black above and below it, a narrower one either side, inside the same rectangle.
        const bands = shapes[k] > shape ? [[0.5, 0.12], [0.5, 0.88]] : [[0.12, 0.5], [0.88, 0.5]];
        if (k === other) for (const [x, y] of bands) expect(black(patch(x, y)), `print ${k}, band at ${x},${y}`).toBe(true);
      }
    }
    // Some album mixes shapes, so the bands above were really looked at.
    expect(others).toBeGreaterThan(0);
  });
});

test('the strip drifts slowly by itself, holds still while it is looked at, and carries on after', async ({ page }) => {
  await page.goto(PRINTS);
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
  await page.goto(PRINTS);
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
  await page.goto(PRINTS);
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
  await page.goto(PRINTS);
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
    await page.goto(PRINTS);
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
    await page.goto(PRINTS);
    for (const strip of await page.locator('.strip').all()) {
      const frame = (await strip.locator('.photo-link').first().boundingBox())!;
      expect(frame.width).toBeGreaterThan(390 * 0.75);
      expect(frame.height).toBeLessThan(844);
    }
    for (const nudge of await page.locator('.nudge').all()) await expect(nudge).toBeHidden();
  });
});

test.describe('on a phone on its side', () => {
  test.use({ viewport: { width: 640, height: 360 }, hasTouch: true, isMobile: true });

  test('a frame still fits on the screen', async ({ page }) => {
    await page.goto(PRINTS);
    for (const strip of await page.locator('.strip').all())
      expect((await strip.locator('.photo-link').first().boundingBox())!.height).toBeLessThan(360);
  });
});

test.describe('on a sharp screen, held still', () => {
  test.use({ deviceScaleFactor: 2, reducedMotion: 'reduce' });

  test('every album opens on a print with enough pixels to stay crisp at twice the density', async ({ page }) => {
    await page.goto(PRINTS);
    for (const strip of await page.locator('.strip').all()) {
      const img = strip.locator('img').first();
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
      const { drawn, delivered, own } = await img.evaluate(async (i: HTMLImageElement) => ({
        drawn: i.getBoundingClientRect().width,
        delivered: (await createImageBitmap(await (await fetch(i.currentSrc)).blob())).width,
        own: Number(i.getAttribute('width')),
      }));
      // Two pixels for every one it is drawn with, unless the photo itself has fewer.
      expect(delivered, `${await img.getAttribute('alt')}`).toBeGreaterThanOrEqual(Math.min(2 * drawn, own) * 0.98);
    }
  });
});
