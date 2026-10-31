// Page weight, measured the way a phone pays for it. The preview server does not gzip, so text
// weighs more here than it will on Pages: these limits are stricter than they look.
import { test, expect } from '@playwright/test';
import { builtPages, readWholePage } from './site';

const KB = 1024;
const MB = 1024 * KB;

/** First view is what loads before any scrolling; whole page is after reading to the end. */
const BUDGETS: [RegExp, { firstView: number; whole: number }][] = [
  [/^\/fitness\/$/, { firstView: 250 * KB, whole: 3 * MB }],
  [/^\/photos\//, { firstView: 400 * KB, whole: 3 * MB }],
  [/^\/notes\/.+/, { firstView: 300 * KB, whole: 3 * MB }],
  [/./, { firstView: 250 * KB, whole: 1 * MB }],
];

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

for (const [path] of builtPages()) {
  const budget = BUDGETS.find(([pattern]) => pattern.test(path))![1];

  test(`${path} stays within its weight budget on a phone`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    let bytes = 0;
    const offsite: string[] = [];
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
    cdp.on('Network.requestWillBeSent', (e) => {
      if (!e.request.url.startsWith('http://127.0.0.1') && !e.request.url.startsWith('data:')) offsite.push(e.request.url);
    });

    await page.goto(path, { waitUntil: 'networkidle' });
    const firstView = bytes;
    await readWholePage(page);
    const whole = bytes;

    const kb = (n: number) => `${Math.round(n / KB)} KB`;
    expect(firstView, `first view ${kb(firstView)}`).toBeLessThanOrEqual(budget.firstView);
    expect(whole, `whole page ${kb(whole)}`).toBeLessThanOrEqual(budget.whole);
    // Fonts, maps and scripts are all self-hosted: a third-party request is a regression, and a privacy leak.
    expect(offsite, 'requests to other sites').toEqual([]);
  });
}
