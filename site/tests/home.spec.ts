// The home page's links, as Rounak wants them: each one opens in a new tab.
import { test, expect } from '@playwright/test';

test("every link in the home page's writing and its footer opens in a new tab, and says so", async ({ page }) => {
  await page.goto('/');
  const links = page.locator('main a[href], footer a[href]');
  const count = await links.count();
  expect(count).toBeGreaterThan(15);
  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const href = await link.getAttribute('href');
    await expect(link, href!).toHaveAttribute('target', '_blank');
    // No reach back into this page from the one it opens.
    await expect(link, href!).toHaveAttribute('rel', /noopener/);
    // A screen reader hears it before following it.
    await expect(link, href!).toHaveAccessibleDescription('Opens in a new tab');
  }
});

test('the site’s own navigation stays in the same tab', async ({ page }) => {
  await page.goto('/');
  for (const link of await page.locator('header a, .skip-link').all()) expect(await link.getAttribute('target')).toBeNull();
});

test('a link in the home page really opens a new tab, leaving the home page where it was', async ({ page, context }) => {
  await page.goto('/');
  const note = page.locator('main a[href^="/notes/"]').first();
  const [tab] = await Promise.all([context.waitForEvent('page'), note.click()]);
  await tab.waitForLoadState();
  expect(new URL(tab.url()).pathname).toMatch(/^\/notes\//);
  expect(new URL(page.url()).pathname).toBe('/');
});
