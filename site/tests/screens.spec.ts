// Checks that need a real browser at real sizes.
import { test, expect } from '@playwright/test';
import { builtPages, readWholePage, SCREENS } from './site';

const pages = builtPages().map(([path]) => path);

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test.use({
      viewport: { width: screen.width, height: screen.height },
      isMobile: screen.isMobile,
      hasTouch: screen.isMobile,
      deviceScaleFactor: screen.deviceScaleFactor,
    });

    for (const path of pages) {
      test(`${path} is never wider than the screen`, async ({ page }) => {
        await page.goto(path);
        await readWholePage(page);
        // On a phone, content that sticks out widens the whole layout and lets the page slide sideways.
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(width, `content is ${width}px on a ${screen.width}px screen`).toBeLessThanOrEqual(screen.width);
      });

      test(`${path} sends no image more than twice the size it is shown at`, async ({ page }) => {
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
    }
  });
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });

  for (const path of pages) {
    test(`${path} holds still for someone who asked for less motion`, async ({ page }) => {
      await page.goto(path);
      await readWholePage(page);
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      // Compare the same screen a beat apart: anything that moved, scrolled or faded shows up as a difference.
      for (let y = 0; y < height; y += 900) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(400);
        const before = await page.screenshot();
        await page.waitForTimeout(1200);
        const after = await page.screenshot();
        expect(before.equals(after), `something moved at ${y}px down`).toBe(true);
      }
      const running = await page.evaluate(() =>
        document.getAnimations().filter((a) => a.playState === 'running').length);
      expect(running, 'animations still running').toBe(0);
    });
  }
});
