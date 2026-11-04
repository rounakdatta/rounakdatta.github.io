// The site's icon, wherever it shows: a browser tab, light or dark, and a phone's home screen.
import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

/** How much of the icon, drawn 64px wide on a tab bar of this colour, differs clearly from the bar. */
async function inkOn(page: Page, bar: string) {
  const href = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href');
  const shot = await page.evaluate(
    ([href, bar]) => {
      document.body.replaceChildren();
      document.body.style.cssText = `margin:0;background:${bar}`;
      const icon = Object.assign(new Image(64, 64), { src: href, id: 'icon' });
      document.body.append(icon);
      return icon.decode();
    },
    [href!, bar],
  ).then(() => page.locator('#icon').screenshot());
  const { data, info } = await sharp(shot).greyscale().raw().toBuffer({ resolveWithObject: true });
  const barGrey = (await sharp({ create: { width: 1, height: 1, channels: 3, background: bar } }).greyscale().raw().toBuffer())[0];
  return data.filter((v) => Math.abs(v - barGrey) > 96).length / (info.width * info.height);
}

test('the tab icon shows on a light tab bar and on a dark one', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  expect(await inkOn(page, '#dee1e6')).toBeGreaterThan(0.08);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  expect(await inkOn(page, '#202124')).toBeGreaterThan(0.08);
});

test('the home-screen icon has no see-through parts, which iOS would fill with black', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  const response = await page.request.get(href!);
  expect(response.ok()).toBe(true);
  const icon = sharp(await response.body());
  expect(await icon.metadata()).toMatchObject({ width: 180, height: 180 });
  expect((await icon.stats()).isOpaque).toBe(true);
});
