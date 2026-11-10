// Checks that need a real browser at real sizes.
import { test, expect } from '@playwright/test';
import { builtPages, readWholePage, SCREENS } from './site';

// The photos page opens on its polaroids; its prints are only drawn once chosen, so they get their own visit.
const pages = [...builtPages().map(([path]) => path), '/photos/#by-me'];

// Grouped by page, not by check: CI splits the tests into parts in the order they are declared, and
// the slow check (a long page photographed screen by screen, a beat apart) for every page in one
// run made one part take three times as long as the rest.
for (const path of pages) {
  test.describe(path, () => {
    for (const screen of SCREENS) {
      test.describe(screen.name, () => {
        test.use({
          viewport: { width: screen.width, height: screen.height },
          // The screen behind the window too: the desktop profile otherwise keeps a 1920px one.
          screen: { width: screen.width, height: screen.height },
          isMobile: screen.isMobile,
          hasTouch: screen.isMobile,
          deviceScaleFactor: screen.deviceScaleFactor,
        });

        test('is never wider than the screen', async ({ page }) => {
          await page.goto(path);
          await readWholePage(page);
          // On a phone, content that sticks out widens the whole layout and lets the page slide sideways.
          const width = await page.evaluate(() => document.documentElement.scrollWidth);
          expect(width, `content is ${width}px on a ${screen.width}px screen`).toBeLessThanOrEqual(screen.width);
        });

        test('sends no image more than twice the size it is shown at', async ({ page }) => {
          await page.goto(path);
          await readWholePage(page);
          const oversized = await page.evaluate((dpr) =>
            [...document.images]
              .filter((img) => img.complete && img.naturalWidth > 0 && !/\.svg(\?|$)/.test(img.currentSrc))
              .map((img) => ({ src: img.currentSrc.split('/').pop(), natural: img.naturalWidth, shown: img.getBoundingClientRect().width }))
              .filter(({ natural, shown }) => shown > 0 && natural > shown * dpr * 2 + 16)
              .map(({ src, natural, shown }) => `${src}: ${natural}px wide, shown at ${Math.round(shown)}px`),
            screen.deviceScaleFactor);
          expect(oversized).toEqual([]);
        });
      });
    }

    test.describe('reduced motion', () => {
      test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
      // Every screen of a long note is photographed twice, a beat apart.
      test.setTimeout(180_000);

      test('holds still for someone who asked for less motion', async ({ page }) => {
        await page.goto(path);
        await readWholePage(page);
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        // Compare the same screen a beat apart: anything that moved, scrolled or faded shows up as a
        // difference. Every screen is photographed, then, after a beat, every screen again: each is
        // compared with itself at least 1.2 s later, for one wait a page rather than one a screen
        // (a long note took half a minute).
        const screens = Array.from({ length: Math.ceil(height / 900) }, (_, k) => k * 900);
        const look = async (y: number) => {
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.waitForTimeout(250);
          return page.screenshot();
        };
        const before: Buffer[] = [];
        for (const y of screens) before.push(await look(y));
        await page.waitForTimeout(1200);
        for (const [k, y] of screens.entries()) expect((await look(y)).equals(before[k]), `something moved at ${y}px down`).toBe(true);
        const running = await page.evaluate(() =>
          document.getAnimations().filter((a) => a.playState === 'running').length);
        expect(running, 'animations still running').toBe(0);
      });
    });
  });
}
