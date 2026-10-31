// Visual parity with the archived prototype: screenshots each home-page
// section on both sites with reduced motion (so scenes show their finished
// state) into tests/screenshots/parity/, for tools/compare-parity.py to diff.
// Run only when the reference is being served:  REFERENCE=1 npx playwright test parity
import { test, type Page } from '@playwright/test';

const referenceURL = process.env.REFERENCE_URL ?? 'http://localhost:4174/';
const sections = ['.site-header', '.hero', '.partners', '.about', '.cases', '.eff', '.growth', '.cta', '.site-footer'];

test.skip(!process.env.REFERENCE, 'Set REFERENCE=1 with the prototype served on port 4174');

async function settle(page: Page) {
  // Scroll through once so every on-view scene and lazy load starts
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(2500);
}

test('sections match the prototype', async ({ browser }, testInfo) => {
  const sites = { ref: referenceURL, new: testInfo.project.use.baseURL ?? '/' };
  for (const [name, url] of Object.entries(sites)) {
    const context = await browser.newContext({
      ...testInfo.project.use,
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(url);
    await settle(page);
    // Keep the sticky header from overlapping whichever section is captured
    await page.addStyleTag({ content: '.site-header { position: relative !important; }' });
    for (const selector of sections) {
      const target = page.locator(selector).first();
      if (!(await target.count())) continue;
      await target.screenshot({
        path: `tests/screenshots/parity/${testInfo.project.name}${selector.replace('.', '-')}-${name}.png`,
        animations: 'disabled',
      });
    }
    await context.close();
  }
});
