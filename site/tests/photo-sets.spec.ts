// The photos page holds two sets, and the reader picks one: photos of Rounak, as polaroids in black
// and white until looked at, or photos by him, as prints.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';

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

const leanOf = (page: Page, nth: number) =>
  page.locator('#panel-of-me .polaroid').nth(nth).evaluate((el) => parseFloat(getComputedStyle(el).rotate) || 0);
/** Once the polaroids have stopped moving: two frames on, so the last pointer move or tap has been
 * handled (Chrome hands them to the page with the next frame), then until nothing is moving. */
const settled = async (page: Page) => {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  await expect.poll(() => page.locator('#panel-of-me .wall').evaluate((wall) => wall.getAnimations({ subtree: true }).length)).toBe(0);
};
/** How a polaroid lies once it has settled: its lean, lift, size, shadow, stacking and focus ring, and its photo's colour. */
const lookOf = async (card: Locator) => {
  await settled(card.page());
  return card.evaluate((el) => {
    const s = getComputedStyle(el);
    return { rotate: s.rotate, translate: s.translate, scale: s.scale, shadow: s.boxShadow, z: s.zIndex, ring: getComputedStyle(el, '::after').outlineStyle, photo: getComputedStyle(el.querySelector('img')!).filter };
  });
};
/** Which polaroids are up, once they have settled. */
const upOf = async (page: Page) => {
  await settled(page);
  return page.locator('#panel-of-me .polaroid').evaluateAll((els) => els.flatMap((el, i) => (getComputedStyle(el).scale === '1.035' && getComputedStyle(el.querySelector('img')!).filter === 'none' ? [i] : [])));
};

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

test("resting on a print doesn't fetch its full-size original before anyone opens it", async ({ page }) => {
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));
  await page.goto('/photos/#by-me');
  await page.waitForLoadState('networkidle');
  const print = page.locator('#panel-by-me .photo-link').first();
  const href = new URL((await print.getAttribute('href'))!, page.url()).pathname;
  // Moved onto as a hand does: the strip drifts, so it is never still enough for a hover().
  const box = (await print.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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

test("the polaroids are black and white until looked at: a mouse resting on one, or the keyboard's focus", async ({ page }) => {
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
  await expect(page.locator('#panel-of-me .polaroid img').first()).toBeFocused();
  await expect.poll(() => filterOf(0)).toBe('none');
  // The focus is drawn round the whole polaroid.
  expect(await page.locator('#panel-of-me .polaroid').first().evaluate((el) => getComputedStyle(el, '::after').outlineStyle)).toBe('solid');
  // Moving on to the next, it goes back.
  await page.keyboard.press('Tab');
  await expect.poll(() => filterOf(0)).toBe('grayscale(1)');
  await expect.poll(() => filterOf(1)).toBe('none');
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

// A polaroid used to open its photo full-screen, growing out of the card. Rounak didn't want the
// enlargement: looked at, it comes up in colour, and that is all there is to it.
test('pressed any way at all, a polaroid opens nothing: no full-screen photo, no other page, nothing bigger fetched', async ({ page, context }) => {
  await page.goto('/photos/');
  await page.waitForLoadState('networkidle');
  const fetched: string[] = [];
  page.on('request', (request) => fetched.push(new URL(request.url()).pathname));
  const opened: string[] = [];
  context.on('page', (other) => opened.push(other.url()));
  const nothingOpened = async (how: string) => {
    await page.waitForTimeout(400);
    await expect(page.locator('.pswp'), how).toHaveCount(0);
    expect(page.url(), how).toMatch(/\/photos\/$/);
    expect(opened, how).toEqual([]);
  };
  const card = page.locator('#panel-of-me .polaroid').nth(1);
  const photo = card.locator('img');
  const box = (await card.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.width / 2);
  await nothingOpened('a click on the photo');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 10);
  await nothingOpened('a click on the caption');
  await photo.click({ modifiers: ['ControlOrMeta'] });
  await nothingOpened('a click for a new tab');
  await photo.click({ modifiers: ['Shift'] });
  await nothingOpened('a click for a new window');
  await photo.click({ button: 'middle' });
  await nothingOpened('a middle click');
  await photo.dblclick();
  await nothingOpened('a double click');
  await page.locator('#tab-of-me').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#panel-of-me .polaroid img').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await nothingOpened('Enter');
  await page.keyboard.press(' ');
  await nothingOpened('Space');
  // Not the viewer, and no photo bigger than the page draws it. (The keyboard on the choice warms
  // the prints' first sizes, as it should: those are drawn sizes too.)
  const drawn = await page.locator('img').evaluateAll((imgs) =>
    imgs.flatMap((img) => (img as HTMLImageElement).srcset.split(',').filter(Boolean).map((part) => new URL(part.trim().split(/\s+/)[0], location.href).pathname)));
  expect(fetched.filter((path) => /photoswipe/.test(path))).toEqual([]);
  expect(fetched.filter((path) => /\.(avif|webp|jpe?g|png)$/.test(path) && !drawn.includes(path))).toEqual([]);
});

test('with a mouse, a click adds nothing to what resting on a polaroid brings, and leaves nothing behind', async ({ page }) => {
  await page.goto('/photos/');
  const card = page.locator('#panel-of-me .polaroid').nth(1);
  const lean = await leanOf(page, 1);
  await card.hover();
  const resting = await lookOf(card);
  expect(resting).toMatchObject({ rotate: '0deg', scale: '1.035', photo: 'none' });
  await card.click();
  expect(await lookOf(card)).toEqual(resting);
  // Away again, it settles back into its lean, in black and white: the click kept nothing up.
  await page.mouse.move(2, 2);
  const away = await lookOf(card);
  expect(parseFloat(away.rotate)).toBeCloseTo(lean, 1);
  expect(away).toMatchObject({ photo: 'grayscale(1)', ring: 'none' });
  // Nor left it focused, to come up with the next key pressed for something else (here, scrolling on).
  await page.keyboard.press('ArrowDown');
  expect(await lookOf(card)).toEqual(away);
  // Nothing on it promises a bigger view.
  const cursors = await card.evaluate((el) => [el, el.querySelector('img')!, el.querySelector('.note')!].map((part) => getComputedStyle(part).cursor));
  expect(cursors).not.toContain('zoom-in');
});

test("a press on a photo takes the focus from whatever had it, and doesn't keep it", async ({ page }) => {
  await page.goto('/photos/');
  const cards = page.locator('#panel-of-me .polaroid');
  // Pressed after the choice above (which a press leaves focused), the arrow keys scroll the page on:
  // they don't switch to the prints, as they would with the choice still focused.
  await page.locator('#tab-of-me').click();
  await cards.nth(1).locator('img').click();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  expect(await showing(page)).toBe('of-me');
  // Pressed after the keyboard brought another up, that one goes back.
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator('#tab-of-me').focus();
  await page.keyboard.press('Tab');
  expect(await lookOf(cards.nth(0))).toMatchObject({ ring: 'solid', photo: 'none' });
  await cards.nth(2).locator('img').click();
  await page.mouse.move(2, 2);
  expect(await lookOf(cards.nth(0))).toMatchObject({ ring: 'none', photo: 'grayscale(1)' });
});

test('with the focus, a photo keeps its square corners', async ({ page }) => {
  await page.goto('/photos/');
  await page.locator('#tab-of-me').focus();
  await page.keyboard.press('Tab');
  const photo = page.locator('#panel-of-me .polaroid img').first();
  await expect(photo).toBeFocused();
  expect(await photo.evaluate((img) => getComputedStyle(img).borderRadius)).toBe('0px');
});

test('a caption is part of the print, as it was under the link: no text cursor, and a double click selects nothing', async ({ page }) => {
  await page.goto('/photos/');
  const note = page.locator('#panel-of-me .polaroid .note').first();
  expect(await note.evaluate((el) => getComputedStyle(el).cursor)).toBe('default');
  await note.dblclick();
  expect(await page.evaluate(() => getSelection()?.toString() ?? '')).toBe('');
});

test('every polaroid shows the part of its photo it was framed on', async ({ page }) => {
  // In of-me.md's order: where each photo says its window sits, or the middle.
  const data = readFileSync(join(import.meta.dirname, '..', 'src', 'content', 'photos', 'of-me.md'), 'utf8');
  const framed = data.split(/\n\s*- src:/).slice(1).map((entry) => entry.match(/focus:\s*"([^"]+)"/)?.[1] ?? '50% 50%');
  expect(framed.filter((at) => at !== '50% 50%').length).toBeGreaterThan(5);
  await page.goto('/photos/');
  const positions = await page.locator('#panel-of-me .polaroid img').evaluateAll((imgs) => imgs.map((img) => getComputedStyle(img).objectPosition));
  expect(positions).toEqual(framed);
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

  // A phone has no pointer to rest on a polaroid, and the tap that opened its photo was the only way to
  // see it in colour: so a tap brings it up instead.
  test('a tap brings a polaroid up just as a mouse resting on one does on a desktop, and as smoothly', async ({ page, browser }) => {
    /** From now on, note every property of the second polaroid (and its photo) that starts to move.
     * Only that one: another photo still arriving fades in on one page and not on the other. */
    const watch = async (target: Page) => {
      await settled(target);
      await target.evaluate(() => {
        const card = document.querySelectorAll('#panel-of-me .polaroid')[1];
        const moved = new Set<string>();
        (window as unknown as { moved: Set<string> }).moved = moved;
        document.addEventListener('transitionrun', (event) => card.contains(event.target as Node) && moved.add(event.propertyName));
      });
    };
    const moved = (target: Page) => target.evaluate(() => [...(window as unknown as { moved: Set<string> }).moved].sort());

    await page.goto('/photos/');
    const card = page.locator('#panel-of-me .polaroid').nth(1);
    await watch(page);
    await card.tap();
    const tapped = await lookOf(card);

    // A desktop in every respect: a context made here would otherwise take this phone's touch.
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false, baseURL: new URL(page.url()).origin });
    const other = await desktop.newPage();
    await other.goto('/photos/');
    const there = other.locator('#panel-of-me .polaroid').nth(1);
    await watch(other);
    await there.hover();
    const hovered = await lookOf(there);
    const hoverMoved = await moved(other);
    await desktop.close();

    expect(hovered).toMatchObject({ rotate: '0deg', translate: '0px -6px', scale: '1.035', z: '1', photo: 'none' });
    expect(tapped).toEqual(hovered);
    // Eased there the same way, not jumped.
    expect(hoverMoved).toEqual(expect.arrayContaining(['box-shadow', 'filter', 'rotate', 'scale', 'translate']));
    expect(await moved(page)).toEqual(hoverMoved);
  });

  test('one at a time: tapped again it goes back, and so it does for a tap on another, anywhere else, or Escape', async ({ page }) => {
    await page.goto('/photos/');
    const cards = page.locator('#panel-of-me .polaroid');
    await cards.nth(0).tap();
    expect(await upOf(page)).toEqual([0]);
    await cards.nth(0).tap();
    expect(await upOf(page)).toEqual([]);
    await cards.nth(0).tap();
    await cards.nth(1).tap();
    expect(await upOf(page)).toEqual([1]);
    // Anywhere else: the gap between two polaroids, and off the wall altogether.
    const [a, b] = [(await cards.nth(0).boundingBox())!, (await cards.nth(1).boundingBox())!];
    await page.touchscreen.tap((a.x + a.width + b.x) / 2, a.y + a.height / 2);
    expect(await upOf(page)).toEqual([]);
    await cards.nth(2).tap();
    expect(await upOf(page)).toEqual([2]);
    const title = (await page.locator('.title h1').boundingBox())!;
    await page.touchscreen.tap(title.x + 10, title.y + title.height / 2);
    expect(await upOf(page)).toEqual([]);
    await cards.nth(2).tap();
    await page.keyboard.press('Escape');
    expect(await upOf(page)).toEqual([]);
    // Never anything bigger.
    await expect(page.locator('.pswp')).toHaveCount(0);
    await expect(page).toHaveURL(/\/photos\/$/);
  });

  test('a finger scrolling over the polaroids brings none up, and leaves one already up as it is', async ({ page }) => {
    await page.goto('/photos/');
    const cards = page.locator('#panel-of-me .polaroid');
    await cards.nth(0).tap();
    expect(await upOf(page)).toEqual([0]);
    // A finger drawn up the screen from another polaroid, as the browser takes it: it scrolls.
    const box = (await cards.nth(3).boundingBox())!;
    const [x, y] = [Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2)];
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let k = 1; k <= 12; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - k * 25 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    expect(await upOf(page)).toEqual([0]);
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

  test('a polaroid only partly on the screen comes up where it is, and the page stays put under it', async ({ page }) => {
    await page.goto('/photos/');
    // The first polaroid whose bottom is below the screen's edge.
    const cut = await page.locator('#panel-of-me .polaroid').evaluateAll((els) => els.findIndex((el) => el.getBoundingClientRect().bottom > innerHeight && el.getBoundingClientRect().top < innerHeight));
    expect(cut).toBeGreaterThan(0);
    const card = page.locator('#panel-of-me .polaroid').nth(cut);
    const box = (await card.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + 20);
    expect(await upOf(page)).toEqual([cut]);
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

  test('a polaroid is no link to a bigger photo: pressed, it goes nowhere', async ({ page }) => {
    await page.goto('/photos/');
    await expect(page.locator('#panel-of-me .polaroid a')).toHaveCount(0);
    await page.locator('#panel-of-me .polaroid img').first().click();
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\/photos\/$/);
  });
});
