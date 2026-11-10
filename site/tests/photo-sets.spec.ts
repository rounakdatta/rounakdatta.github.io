// The photos page holds two sets, and the reader picks one: photos of Rounak, as polaroids in black
// and white until looked at, or photos by him, as prints.
import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const showing = (page: Page) => page.evaluate(() => document.documentElement.dataset.photos);
/**
 * Move the mouse and wait until the page has had the move. With the page's clock in the test's
 * hands, time must not move on before the page has seen where the pointer went: a loaded machine
 * hands moves to the page late, and a clock run in between would show it a pointer standing still.
 */
const moveSeen = async (page: Page, x: number, y: number) => {
  const seen = page.evaluate(
    ([x, y]) =>
      new Promise<void>((done) => {
        const at = (event: PointerEvent) => {
          if (Math.abs(event.clientX - x) > 1 || Math.abs(event.clientY - y) > 1) return;
          removeEventListener('pointermove', at);
          done();
        };
        addEventListener('pointermove', at);
      }),
    [x, y],
  );
  // The listener is in place before the move is made.
  await page.evaluate(() => 0);
  await page.mouse.move(x, y);
  await seen;
};

/** Put the open photo away with Escape, pressed again until taken: the viewer takes no keys while it opens. */
const putAway = (page: Page) =>
  expect(async () => {
    if (await page.locator('.pswp').count()) await page.keyboard.press('Escape');
    await expect(page.locator('.pswp')).toHaveCount(0, { timeout: 400 });
  }).toPass();
const leanOf = (page: Page, nth: number) =>
  page.locator('#panel-of-me .polaroid').nth(nth).evaluate((el) => parseFloat(getComputedStyle(el).rotate) || 0);

test('the page opens on photos of me: polaroids, each a square window in a pale frame, leaning a little', async ({ page }) => {
  await page.goto('/photos/');
  expect(await showing(page)).toBe('of-me');
  await expect(page.locator('#tab-of-me')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-by-me')).toHaveAttribute('aria-selected', 'false');
  await expect(page.locator('#panel-by-me')).toBeHidden();

  const cards = await page.locator('#panel-of-me .polaroid').evaluateAll((els) =>
    els.map((el) => {
      const img = el.querySelector('img')!;
      const [r, g, b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)!.map(Number);
      return { side: img.offsetWidth, height: img.offsetHeight, card: (el as HTMLElement).offsetWidth, lean: parseFloat(getComputedStyle(el).rotate), frame: (r + g + b) / 3 };
    }),
  );
  expect(cards.length).toBeGreaterThan(5);
  for (const { side, height, card, lean, frame } of cards) {
    // A square cut from the photo, in a frame with a thin border at the sides, as a Polaroid has.
    expect(Math.abs(side - height)).toBeLessThan(1);
    expect(side / card).toBeGreaterThan(0.86);
    expect(side / card).toBeLessThan(0.92);
    // Never upright, never askew.
    expect(Math.abs(lean)).toBeGreaterThanOrEqual(0.5);
    expect(Math.abs(lean)).toBeLessThanOrEqual(2.5);
    expect(frame).toBeGreaterThan(220);
  }
  // Each its own way, not one lean repeated down the wall.
  expect(new Set(cards.map(({ lean }) => lean)).size).toBeGreaterThan(cards.length / 2);
});

test("the polaroids are captioned in the site's own monospace, and no font beyond the site's own is loaded for them", async ({ page }) => {
  await page.goto('/photos/');
  await page.waitForLoadState('networkidle');
  const families = (list: string) => list.split(',').map((f) => f.replace(/["']/g, '').trim());
  const [polaroid, mono, serif] = await page.evaluate(() => [
    getComputedStyle(document.querySelector('#panel-of-me .note')!).fontFamily,
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono'),
    getComputedStyle(document.body).fontFamily,
  ]);
  // Set like a label, in the monospace the site sets its code in, not a typeface of its own.
  expect(families(polaroid)).toEqual(families(mono));
  // Every font the page has loaded is the site's serif or its monospace (or the local stand-in
  // measured to match one while it arrives, named after it).
  const own = [families(serif)[0], families(mono)[0]];
  const loaded = await page.evaluate(() => [...document.fonts].filter((f) => f.status !== 'unloaded').map((f) => f.family.replace(/["']/g, '')));
  expect(loaded.length).toBeGreaterThan(0);
  expect(loaded.filter((family) => !own.some((name) => family.startsWith(name)))).toEqual([]);
});

test("under the polaroids, one quiet line credits where the idea came from, in a new tab", async ({ page }) => {
  await page.goto('/photos/');
  const credit = page.locator('#panel-of-me .credit');
  await expect(credit).toHaveText('inspired by @shraddhaha’s camera roll');
  const link = credit.locator('a');
  await expect(link).toHaveAttribute('href', 'https://shraddha-kulkarni.com/photos');
  await expect(link).toHaveAttribute('target', '_blank');
  // Below the wall, and smaller than any caption on it.
  const [creditTop, wallBottom] = [(await credit.boundingBox())!.y, await page.locator('#panel-of-me .wall').evaluate((w) => w.getBoundingClientRect().bottom + scrollY)];
  expect(creditTop + (await page.evaluate(() => scrollY))).toBeGreaterThan(wallBottom);
  const size = (el: string) => page.locator(el).first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(await size('#panel-of-me .credit')).toBeLessThan(await size('#panel-of-me .note'));
  // Only with the polaroids: it isn't the prints' to say.
  await page.locator('#tab-by-me').click();
  await expect(credit).toBeHidden();
});

test('the prints cost nothing until a hand comes near the choice, and are on their way once it does', async ({ page }) => {
  const fetched = new Set<string>();
  page.on('request', (request) => request.resourceType() === 'image' && fetched.add(new URL(request.url()).pathname));
  await page.goto('/photos/');
  await page.waitForLoadState('networkidle');
  const prints = await page.locator('#panel-by-me .frame img').evaluateAll((imgs) =>
    imgs.flatMap((img) => (img.getAttribute('srcset') ?? '').split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean)));
  expect(prints.length).toBeGreaterThan(10);
  expect(prints.filter((url) => fetched.has(url)), 'prints fetched before anyone asked').toEqual([]);

  await page.locator('.title h1').hover();
  await expect.poll(() => prints.filter((url) => fetched.has(url)).length).toBeGreaterThan(0);
  // Reaching for the choice is not making it.
  expect(await showing(page)).toBe('of-me');
});

test("resting on a photo doesn't fetch its full-size original before anyone opens it", async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));
  await page.goto('/photos/');
  await page.waitForLoadState('networkidle');
  const href = new URL((await page.locator('.polaroid a').first().getAttribute('href'))!, page.url()).pathname;
  await page.locator('.polaroid').first().hover();
  await page.waitForTimeout(800);
  expect(fetched).not.toContain(href);
});

test("an old album's address asks first for that album's prints, not the first album's", async ({ page }) => {
  await page.goto('/photos/#album-rajasthan-trip-2025');
  const asked = await page.locator('link[rel="preload"][as="image"]').evaluateAll((links) => links.map((l) => l.getAttribute('imagesrcset')));
  const album = page.locator('#album-rajasthan-trip-2025').locator('xpath=..').locator('.frame img');
  expect(asked[0]).toBe(await album.first().getAttribute('srcset'));
});

test("the first photos of the set the page opens on are asked for first, and only that set's", async ({ page }) => {
  for (const [address, first, other] of [
    ['/photos/', '#panel-of-me .polaroid img', '#panel-by-me .frame img'],
    ['/photos/#by-me', '#panel-by-me .frame img', '#panel-of-me .polaroid img'],
  ]) {
    await page.goto('about:blank');
    await page.goto(address);
    const asked = await page.locator('link[rel="preload"][as="image"]').evaluateAll((links) =>
      links.map((l) => ({ srcset: l.getAttribute('imagesrcset'), sizes: l.getAttribute('imagesizes'), priority: l.getAttribute('fetchpriority') })));
    const shown = page.locator(first).first();
    expect(asked.length, address).toBeGreaterThan(0);
    // The very photo the page shows first, at the size it will choose, and ahead of everything else.
    expect(asked[0]).toEqual({ srcset: await shown.getAttribute('srcset'), sizes: await shown.getAttribute('sizes'), priority: 'high' });
    const others = await page.locator(other).evaluateAll((imgs) => imgs.map((i) => i.getAttribute('srcset')));
    expect(asked.filter(({ srcset }) => others.includes(srcset)), address).toEqual([]);
  }
});

test('resting the pointer on "by me" hangs the prints in place of the polaroids; a pointer only passing over it, however slowly, does not', async ({ page }) => {
  // The page's own timers run on a clock the test moves, so a busy machine can't make a pass look like
  // a rest. Installed, a clock still runs in real time; it only stands still once paused.
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/photos/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const box = (await page.locator('#tab-by-me').boundingBox())!;
  const y = Math.round(box.y + box.height / 2);

  // Passing slowly across it, 6 px every 40 ms (150 px a second), on the way somewhere else.
  for (let x = Math.round(box.x - 30); x < box.x + box.width + 30; x += 6) {
    await moveSeen(page, x, y);
    await page.clock.runFor(40);
  }
  await moveSeen(page, Math.round(box.x + box.width + 300), Math.round(y + 200));
  await page.clock.runFor(1000);
  expect(await showing(page)).toBe('of-me');

  // Coming to rest on it: not yet after a moment, chosen after a little longer.
  await moveSeen(page, Math.round(box.x + box.width / 2), y);
  await page.clock.runFor(50);
  expect(await showing(page)).toBe('of-me');
  await page.clock.runFor(150);
  expect(await showing(page)).toBe('by-me');
  await expect(page.locator('#panel-by-me .strip').first()).toBeVisible();
  await expect(page.locator('#panel-of-me')).toBeHidden();
  await expect(page.locator('#tab-by-me')).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/\/photos\/#by-me$/);

  // And back into the day, which leaves the address as plain as it came.
  const of = (await page.locator('#tab-of-me').boundingBox())!;
  await moveSeen(page, Math.round(of.x + of.width / 2), Math.round(of.y + of.height / 2));
  await page.clock.runFor(200);
  expect(await showing(page)).toBe('of-me');
  await expect(page.locator('#panel-of-me .polaroid').first()).toBeVisible();
  await expect(page).toHaveURL(/\/photos\/$/);
});

test("a pointer the page moves under, with no hand moving it (as Safari reports after a scroll), chooses nothing", async ({ page }) => {
  await page.goto('/photos/');
  const tab = page.locator('#tab-by-me');
  const box = (await tab.boundingBox())!;
  // A pointer resting where it was when the page loaded, never moved: the first the page hears of
  // it is the word scrolling under it.
  await tab.dispatchEvent('pointermove', { pointerType: 'mouse', isPrimary: true, clientX: box.x + 10, clientY: box.y + 10, movementX: 0, movementY: 0 });
  await page.waitForTimeout(400);
  expect(await showing(page)).toBe('of-me');
  // The hand last put the pointer here, beside the word; then the word comes under it, and the
  // browser reports a move to the same place, now over the word.
  const [x, y] = [box.x + box.width + 40, box.y + box.height / 2];
  await page.mouse.move(x, y);
  for (let i = 0; i < 4; i++) {
    await tab.dispatchEvent('pointermove', { pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, movementX: 0, movementY: 0 });
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(300);
  expect(await showing(page)).toBe('of-me');
});

test('after the keyboard turns back to the polaroids, a pointer resting on "by me" can choose it again', async ({ page }) => {
  await page.goto('/photos/');
  const box = (await page.locator('#tab-by-me').boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(x, y, { steps: 4 });
  await expect.poll(() => showing(page)).toBe('by-me');
  await page.locator('#tab-by-me').focus();
  await page.keyboard.press('ArrowUp');
  expect(await showing(page)).toBe('of-me');
  // The pointer never left the word: it moves a little (less than the few pixels that would start
  // the moment afresh anyway), and rests again.
  await page.mouse.move(x + 4, y);
  await expect.poll(() => showing(page), { timeout: 2000 }).toBe('by-me');
});

test('the skip link takes a keyboard past the header and leaves the prints as they were', async ({ page }) => {
  await page.goto('/photos/#by-me');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#content$/);
  await page.waitForTimeout(300);
  expect(await showing(page)).toBe('by-me');
  await expect(page.locator('#panel-by-me')).toBeVisible();
  // And a reload on that place in the page is still among the prints.
  await page.reload();
  expect(await showing(page)).toBe('by-me');
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`read in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("both sets are in the reader's own light: choosing the prints doesn't change the page's colours", async ({ page }) => {
      await page.goto('/photos/');
      const colours = () => page.evaluate(() => [document.body, document.querySelector('.site-header a')!].map((el) => [getComputedStyle(el).backgroundColor, getComputedStyle(el).color].join()));
      const before = await colours();
      await page.locator('#tab-by-me').click();
      await expect(page.locator('#panel-by-me .strip').first()).toBeVisible();
      await page.waitForTimeout(900);
      expect(await colours()).toEqual(before);
    });
  });
}

test('the polaroids are black and white until looked at, and a photo opens in colour', async ({ page }) => {
  await page.goto('/photos/');
  const filterOf = (n: number) => page.locator('#panel-of-me .polaroid img').nth(n).evaluate((img) => getComputedStyle(img).filter);
  for (const n of [0, 1, 2]) expect(await filterOf(n)).toBe('grayscale(1)');
  // A pointer resting on one brings its colour, that one's only.
  await page.locator('#panel-of-me .polaroid').first().hover();
  await expect.poll(() => filterOf(0)).toBe('none');
  expect(await filterOf(1)).toBe('grayscale(1)');
  // So does the keyboard's focus, and leaving takes it away again.
  await page.mouse.move(2, 2);
  await expect.poll(() => filterOf(0)).toBe('grayscale(1)');
  await page.locator('#tab-of-me').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#panel-of-me .polaroid a').first()).toBeFocused();
  await expect.poll(() => filterOf(0)).toBe('none');
  // Opened, the photo is in colour, and so is its polaroid underneath, to take it back.
  await page.keyboard.press('Enter');
  await expect(page.locator('.pswp')).toBeVisible();
  const viewer = await page.locator('.pswp img').evaluateAll((imgs) => imgs.filter((i) => i.getBoundingClientRect().width > 0).map((i) => getComputedStyle(i).filter));
  expect(viewer.length).toBeGreaterThan(0);
  expect(viewer.every((f) => f === 'none')).toBe(true);
  expect(await filterOf(0)).toBe('none');
});

test('a keyboard moves along the choice with the arrow keys, and a screen reader hears which one is chosen', async ({ page }) => {
  await page.goto('/photos/');
  // One stop in the tab order for the whole choice: the chosen one.
  expect(await page.locator('[role="tab"][tabindex="0"]').evaluateAll((tabs) => tabs.map((t) => t.id))).toEqual(['tab-of-me']);
  await page.locator('#tab-of-me').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#tab-by-me')).toBeFocused();
  await expect(page.locator('#tab-by-me')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-of-me')).toHaveAttribute('aria-selected', 'false');
  expect(await showing(page)).toBe('by-me');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#tab-of-me')).toBeFocused();
  expect(await showing(page)).toBe('of-me');
  // Each set is named by its choice.
  await expect(page.getByRole('tabpanel', { name: 'of me' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Photos' })).toBeVisible();
});

test('pressed anywhere on it, a polaroid opens its whole photo, and put away it settles back to its lean', async ({ page }) => {
  await page.goto('/photos/');
  const card = page.locator('#panel-of-me .polaroid').nth(1);
  const lean = await leanOf(page, 1);
  expect(Math.abs(lean)).toBeGreaterThan(0.5);
  const link = card.locator('a');
  const shape = Number(await link.getAttribute('data-pswp-width')) / Number(await link.getAttribute('data-pswp-height'));
  const full = (await link.getAttribute('data-pswp-srcset'))!.split(',').map((part) => part.trim().split(/\s+/)[0]);

  // Pressed on the frame below the photo, where the caption is.
  const box = (await card.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 10);
  await expect(page.locator('.pswp')).toBeVisible();
  await putAway(page);
  await page.mouse.move(2, 2);
  await expect.poll(() => leanOf(page, 1)).toBeCloseTo(lean, 1);

  // Opened from the keyboard, so no hover lifts it first: the photo grows out of the window of its
  // polaroid, untilted, the same middle and the same size.
  const before = await card.locator('img').evaluate((img) => {
    const r = img.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2, (img as HTMLImageElement).offsetWidth];
  });
  await link.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pswp')).toBeVisible();
  const from = (await page.locator('.pswp').getAttribute('data-from'))!.split(' ').map(Number);
  expect(Math.abs(from[0] + from[2] / 2 - before[0])).toBeLessThan(2);
  expect(Math.abs(from[1] + from[2] / 2 - before[1])).toBeLessThan(2);
  expect(Math.abs(from[2] - before[2])).toBeLessThan(2);
  // Whole: the photo that opens has the photo's own shape, not the square cut from it.
  const opened = () =>
    page.locator('.pswp img').evaluateAll((imgs, urls) => {
      const img = imgs.find((i) => urls.some((u) => (i as HTMLImageElement).currentSrc.endsWith(u)) && i.getBoundingClientRect().width > 0);
      const r = img?.getBoundingClientRect();
      return r ? r.width / r.height : 0;
    }, full);
  await expect.poll(async () => Math.abs((await opened()) - shape)).toBeLessThan(0.02);
  // Its polaroid lies straight under it, ready to take it back.
  await expect.poll(() => leanOf(page, 1)).toBe(0);

  await putAway(page);
  await page.mouse.move(2, 2);
  await expect.poll(() => leanOf(page, 1)).toBeCloseTo(lean, 1);
});

test("a polaroid framed off-centre grows its photo out of exactly the part it shows", async ({ page }) => {
  await page.goto('/photos/');
  // The polaroids that say where their window sits, and one that doesn't.
  const framed = page.locator('#panel-of-me .polaroid img[style*="object-position: 100% 50%"]').first();
  await expect(framed).toHaveCount(1);
  const open = async (img: typeof framed) => {
    await img.evaluate((i) => i.scrollIntoView({ block: 'center' }));
    await img.locator('xpath=..').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.pswp')).toBeVisible();
    const [left, top, side, x, y, w] = (await page.locator('.pswp').getAttribute('data-from'))!.split(' ').map(Number);
    await putAway(page);
    return { left, top, side, x, y, w };
  };
  // Framed at its right edge: the whole photo is laid so its right edge is the window's.
  const right = await open(framed);
  expect(right.w).toBeGreaterThan(right.side + 10);
  expect(Math.abs(right.x + right.w - (right.left + right.side))).toBeLessThan(2);
  // Unframed: laid with the window in its middle.
  const middle = await open(page.locator('#panel-of-me .polaroid img:not([style])').first());
  expect(Math.abs(middle.x + middle.w / 2 - (middle.left + middle.side / 2))).toBeLessThan(2);
});

test('a photo still on its way develops out of dark film rather than popping in', async ({ page }) => {
  // Every polaroid is held back until the window has been looked at.
  let release = () => {};
  const looked = new Promise<void>((r) => (release = r));
  await page.route(/\.avif$/, async (route) => {
    await looked;
    await route.continue();
  });
  await page.goto('/photos/', { waitUntil: 'domcontentloaded' });
  const img = page.locator('#panel-of-me .polaroid img').first();
  await expect.poll(() => img.evaluate((i) => i.classList.contains('developing'))).toBe(true);
  expect(await img.evaluate((i) => getComputedStyle(i).opacity)).toBe('0');
  // What is on screen in the window meanwhile: dark film, not the white of the frame around it.
  const sharp = (await import('sharp')).default;
  const box = (await img.boundingBox())!;
  const shot = await page.screenshot({ clip: { x: box.x + box.width / 2 - 4, y: box.y + box.height / 2 - 4, width: 8, height: 8 } });
  const { channels } = await sharp(shot).stats();
  expect(Math.max(...channels.slice(0, 3).map((c) => c.mean))).toBeLessThan(80);
  expect(await img.evaluate((i) => i.classList.contains('developing')), 'still developing when looked at').toBe(true);
  release();
  await expect.poll(() => img.evaluate((i) => getComputedStyle(i).opacity), { timeout: 8000 }).toBe('1');
});

test("an old album's address lands among the prints, at that album", async ({ page }) => {
  await page.goto('/photos/nepal-2026/');
  await expect(page).toHaveURL(/\/photos\/#album-nepal-2026$/);
  expect(await showing(page)).toBe('by-me');
  await expect(page.locator('#album-nepal-2026')).toBeInViewport();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('a tap chooses, and the address keeps the choice: a reload opens on the prints, with no polaroids on the way in', async ({ page }) => {
    await page.goto('/photos/');
    await page.locator('#tab-by-me').tap();
    await expect.poll(() => showing(page)).toBe('by-me');
    await expect(page).toHaveURL(/#by-me$/);

    // What the page has decided by the time it has a body to paint: already the prints.
    await page.addInitScript(() => {
      // Watched from the document itself: when this runs, not even <html> has been parsed yet.
      new MutationObserver((_, observer) => {
        if (!document.body) return;
        (window as unknown as { atBody?: string }).atBody = document.documentElement.dataset.photos;
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    expect(await page.evaluate(() => (window as unknown as { atBody?: string }).atBody)).toBe('by-me');
    await expect(page.locator('#panel-of-me')).toBeHidden();
  });

  test('a photo put away after swiping to another goes back into its own polaroid, brought into view', async ({ page }) => {
    await page.goto('/photos/');
    await page.locator('#panel-of-me .polaroid').first().tap();
    await expect(page.locator('.pswp')).toBeVisible();
    // Back from the first comes round to the last, far down the page. The viewer takes no keys until
    // the photo has finished growing, so the key is pressed again until it has been taken, never twice.
    const counter = page.locator('.pswp__counter');
    const count = await page.locator('#panel-of-me .polaroid').count();
    await expect(async () => {
      if ((await counter.textContent()) === `1 / ${count}`) await page.keyboard.press('ArrowLeft');
      await expect(counter).toHaveText(`${count} / ${count}`, { timeout: 300 });
    }).toPass();
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await expect(page.locator('.pswp')).toHaveCount(0);
    await expect(page.locator('#panel-of-me .polaroid').last()).toBeInViewport({ ratio: 0.9 });
  });

  test('a finger starting a scroll on the title costs nothing; one pressing "by me" starts its prints on their way', async ({ page }) => {
    const fetched = new Set<string>();
    page.on('request', (request) => request.resourceType() === 'image' && fetched.add(new URL(request.url()).pathname));
    await page.goto('/photos/');
    await page.waitForLoadState('networkidle');
    const prints = await page.locator('#panel-by-me .frame img').evaluateAll((imgs) =>
      imgs.flatMap((img) => (img.getAttribute('srcset') ?? '').split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean)));
    const h1 = (await page.locator('.title h1').boundingBox())!;
    await page.touchscreen.tap(h1.x + 10, h1.y + h1.height / 2);
    // Nor a tap on the word already chosen.
    await page.locator('#tab-of-me').tap();
    await page.waitForTimeout(800);
    expect(prints.filter((url) => fetched.has(url)), 'prints fetched for a touch on the title').toEqual([]);
    // A finger landing on "by me", before it has lifted to choose.
    await page.locator('#tab-by-me').dispatchEvent('touchstart');
    await expect.poll(() => prints.filter((url) => fetched.has(url)).length).toBeGreaterThan(0);
    expect(await showing(page)).toBe('of-me');
  });

  test('opening a polaroid only partly on the screen leaves the page where it is under it', async ({ page }) => {
    await page.goto('/photos/');
    // The first polaroid whose bottom is below the screen's edge.
    const cut = await page.locator('#panel-of-me .polaroid').evaluateAll((els) => els.findIndex((el) => el.getBoundingClientRect().bottom > innerHeight && el.getBoundingClientRect().top < innerHeight));
    expect(cut).toBeGreaterThan(0);
    const card = page.locator('#panel-of-me .polaroid').nth(cut);
    const box = (await card.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 20);
    await expect(page.locator('.pswp')).toBeVisible();
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });

  test('two polaroids to a row, with captions small but still easy to read', async ({ page }) => {
    await page.goto('/photos/');
    const cards = await page.locator('#panel-of-me .polaroid').evaluateAll((els) =>
      els.map((el) => ({ top: (el as HTMLElement).offsetTop, size: parseFloat(getComputedStyle(el.querySelector('.note')!).fontSize) })));
    expect(cards[0].top).toBe(cards[1].top);
    expect(cards[2].top).toBeGreaterThan(cards[1].top);
    // A monospace with a tall x-height reads at 11px; Rounak found 16px of Garamond too big.
    for (const { size } of cards) expect(size).toBeGreaterThanOrEqual(11);
  });
});

test.describe('on a tablet held upright', () => {
  test.use({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

  test('each polaroid fetches the smallest size still sharp at twice the density, no bigger', async ({ page }) => {
    await page.goto('/photos/');
    const imgs = page.locator('#panel-of-me .polaroid img');
    await expect.poll(() => imgs.evaluateAll((all) => all.slice(0, 6).every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const wrong = await imgs.evaluateAll((all) =>
      all.slice(0, 6).flatMap((el) => {
        const img = el as HTMLImageElement;
        // Drawn as a square's cover crop: a wide photo is drawn wider than its window.
        const drawn = img.offsetWidth * Math.max(1, Number(img.getAttribute('width')) / Number(img.getAttribute('height')));
        const sizes = img.srcset.split(',').map((part) => { const [url, w] = part.trim().split(/\s+/); return { url, w: parseInt(w) }; }).sort((a, b) => a.w - b.w);
        const right = sizes.find(({ w }) => w >= drawn * devicePixelRatio - 1) ?? sizes.at(-1)!;
        return img.currentSrc.endsWith(right.url) ? [] : [`${img.alt.slice(0, 30)}: took ${img.currentSrc.split('/').pop()} for ${Math.round(drawn)}px, wanted ${right.w}w`];
      }));
    expect(wrong).toEqual([]);
  });
});

test.describe('on the narrowest phone', () => {
  test.use({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true });

  test('every line of a caption stays on its own polaroid', async ({ page }) => {
    await page.goto('/photos/');
    const spills = await page.locator('#panel-of-me .polaroid').evaluateAll((els) =>
      els.flatMap((el) => {
        const note = el.querySelector('.note')!;
        const range = document.createRange();
        range.selectNodeContents(note);
        const card = el.getBoundingClientRect();
        const words = range.getBoundingClientRect();
        const inside = words.left >= card.left && words.right <= card.right && words.bottom <= card.bottom;
        return inside && note.scrollWidth <= note.clientWidth + 1 ? [] : [note.textContent];
      }));
    expect(spills).toEqual([]);
  });
});

test.describe('for someone who asked for less motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('"Photos" simply changes places', async ({ page }) => {
    await page.goto('/photos/');
    const moves = await page.evaluate(
      () =>
        new Promise<string[]>((done) => {
          const out: string[] = [];
          const h1 = document.querySelector('.title h1')!;
          const start = performance.now();
          const tick = () => {
            out.push(getComputedStyle(h1).translate);
            if (performance.now() - start < 700) requestAnimationFrame(tick);
            else done(out);
          };
          document.getElementById('tab-by-me')!.click();
          requestAnimationFrame(tick);
        }),
    );
    // From the first frame "Photos" is where it ends up: it never travels.
    expect(new Set(moves).size).toBe(1);
    expect(moves[0]).not.toBe('none');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('there is no choosing: both sets show, one after the other, each under its own heading', async ({ page }) => {
    await page.goto('/photos/');
    await expect(page.locator('.sets')).toBeHidden();
    // Nothing to switch, so nothing announced as tabs.
    await expect(page.locator('[role="tablist"], [role="tab"], [role="tabpanel"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Of me' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'By me' })).toBeVisible();
    const of = (await page.locator('#panel-of-me').boundingBox())!;
    const by = (await page.locator('#panel-by-me').boundingBox())!;
    expect(by.y).toBeGreaterThanOrEqual(of.y + of.height - 1);
  });
});
