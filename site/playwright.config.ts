import { defineConfig, devices } from '@playwright/test';

// Locally there is no Playwright-downloaded browser; CHROME_PATH points at the
// system Chrome instead. CI installs Playwright's own Chromium and leaves it unset.
const executablePath = process.env.CHROME_PATH;

// Chrome starts fetching lazy images sooner on a connection it believes is slow (about 1,250px
// ahead on 4G, the whole page on 3G), and a fresh CI browser has no estimate at all. Forcing
// 4G makes every machine measure the same phone. Without it, the trek page "weighed" 684 KB on
// CI and 523 KB here: the same build, two different lazy-loading distances.
const args = ['--force-effective-connection-type=4G'];

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  // The dev box throttles sustained multi-core load, so locally the suite runs on one worker.
  workers: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:4329',
    launchOptions: executablePath
      ? { executablePath, args: [...args, '--no-sandbox', '--disable-dev-shm-usage'] }
      : { args },
  },
  // Tests run against the production build, served the way Pages serves it.
  webServer: {
    command: 'npx astro preview --port 4329 --host 127.0.0.1',
    url: 'http://127.0.0.1:4329/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
