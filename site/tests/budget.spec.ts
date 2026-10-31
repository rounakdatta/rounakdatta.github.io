// Page weight, measured the way a phone pays for it. The preview server does not gzip, so text
// weighs more here than it will on Pages: these limits are stricter than they look.
import { test, expect, devices } from '@playwright/test';
import { builtPages, readWholePage } from './site';

const KB = 1024;
const MB = 1024 * KB;

/** First view is what loads before any scrolling; whole page is after reading to the end. */
const BUDGETS: [RegExp, { firstView: number; whole: number }][] = [
  [/^\/fitness\/$/, { firstView: 250 * KB, whole: 3 * MB }],
  // A chapter is a photo page. On a phone Chrome starts fetching lazy photos about 1,250px before
  // they scroll in, so the first five or six thumbnails count as first view, each already the right
  // size (400px for a 195px slot at 2×). The trek's 13 photos made that 523 KB. The map is ~35 KB.
  [/^\/fitness\/.+/, { firstView: 600 * KB, whole: 2 * MB }],
  [/^\/photos\//, { firstView: 400 * KB, whole: 3 * MB }],
  // A note may open with a photo across the column: one AVIF of 150–170 KB, plus the fonts.
  [/^\/notes\/.+/, { firstView: 400 * KB, whole: 3 * MB }],
  [/./, { firstView: 250 * KB, whole: 1 * MB }],
];

// A phone in every respect, screen included: the project's desktop profile kept a 1920px screen
// behind the 390px window, and Chrome fetched a note's first photo at desktop size before
// fetching it again at phone size (874 KB where a phone pays 341 KB).
test.use({
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent: devices['Pixel 7'].userAgent,
});

for (const [path] of builtPages()) {
  const budget = BUDGETS.find(([pattern]) => pattern.test(path))![1];

  test(`${path} stays within its weight budget on a phone`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    let bytes = 0;
    const offsite: string[] = [];
    const urls = new Map<string, string>();
    const sizes = new Map<string, number>();
    cdp.on('Network.loadingFinished', (e) => {
      bytes += e.encodedDataLength;
      sizes.set(e.requestId, e.encodedDataLength);
    });
    cdp.on('Network.requestWillBeSent', (e) => {
      urls.set(e.requestId, e.request.url);
      if (!e.request.url.startsWith('http://127.0.0.1') && !e.request.url.startsWith('data:')) offsite.push(e.request.url);
    });

    await page.goto(path, { waitUntil: 'networkidle' });
    // What loads before a scroll depends on the connection Chrome believes it has (playwright.config.ts).
    // Check the premise, so a wrong browser fails here and not as a page that seems heavy.
    expect(await page.evaluate(() => (navigator as { connection?: { effectiveType?: string } }).connection?.effectiveType), 'the test browser should believe it is on 4G').toBe('4g');
    const firstView = bytes;
    // When a page is over, say what made it heavy rather than just by how much.
    const heaviest = [...sizes].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([id, n]) => `${Math.round(n / KB)} KB ${urls.get(id)?.split('/').pop()?.slice(0, 50)}`).join(', ');
    await readWholePage(page);
    const whole = bytes;

    const kb = (n: number) => `${Math.round(n / KB)} KB`;
    expect(firstView, `first view ${kb(firstView)}: ${heaviest}`).toBeLessThanOrEqual(budget.firstView);
    expect(whole, `whole page ${kb(whole)}`).toBeLessThanOrEqual(budget.whole);
    // Fonts, maps and scripts are all self-hosted: a third-party request is a regression, and a privacy leak.
    expect(offsite, 'requests to other sites').toEqual([]);
  });
}
