// Playwright tests run against the production build, served by
// `astro preview` on port 4175 (started here if it isn't running).
// `npm test` builds first. Overrides:
//   BASE_URL       test another server instead (e.g. the dev server)
//   REFERENCE_URL  the archived prototype for the parity test (npm run reference)
// It uses the installed Google Chrome, so no browser download is needed.
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4175';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL, channel: 'chrome' },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npx astro preview --host 127.0.0.1 --port 4175',
        url: baseURL,
        reuseExistingServer: true,
      },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        baseURL,
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], channel: 'chrome', baseURL, viewport: { width: 390, height: 844 } },
    },
  ],
});
