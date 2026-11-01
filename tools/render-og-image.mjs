// Renders public/og.png (1200×630), the picture shown when the site is shared,
// from the live hero. Start the site first (npm run dev or npm run preview).
// Usage: npm run og    (BASE_URL overrides http://localhost:4173)
import { chromium } from '@playwright/test';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.goto(base);
await page.evaluate(() => document.fonts.ready);
// The header and hero, sized to the card
await page.addStyleTag({
  content: `.hero { min-height: calc(630px - var(--nav-h)) !important; }`,
});
await page.waitForTimeout(500);
await page.screenshot({ path: 'public/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
console.log('wrote public/og.png');
