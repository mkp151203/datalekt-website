// Smoke tests for the whole site, on desktop and phone (see playwright.config.ts).
import { expect, test, type Page } from '@playwright/test';

const sections = ['.hero', '.partners', '.about', '.cases', '.eff', '.growth', '.cta'];

/** Collects console errors and failed requests while the page is used */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  return errors;
}

async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(80);
  }
}

test('home page loads every section without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (const selector of sections) await expect(page.locator(selector)).toHaveCount(1);
  await scrollThrough(page);
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('nav links land each section just below the sticky header', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone', 'The phone menu is covered by the mobile menu test');
  await page.goto('/');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  for (const id of ['product', 'use-cases', 'features', 'clients']) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator(`.nav-links a[href="/#${id}"]`).click();
    await page.waitForTimeout(150);
    const top = await page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top));
    expect(top, `#${id}`).toBe(76);
  }
});

test('mobile menu opens and links to a section', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone only');
  await page.goto('/');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await page.locator('.nav-mobile summary').click();
  await expect(page.locator('.nav-mobile-panel')).toBeVisible();
  await page.locator('.nav-mobile-panel a[href="/#features"]').click();
  await page.waitForTimeout(150);
  // Measured against the visible area: phone emulation keeps a taller layout
  // viewport behind a simulated address bar (visualViewport.offsetTop)
  const top = await page
    .locator('#features')
    .evaluate((el) => Math.round(el.getBoundingClientRect().top - (window.visualViewport?.offsetTop ?? 0)));
  expect(top).toBe(76);
});

test('use-case tabs switch scenes and move on when a scene ends', async ({ page }) => {
  await page.goto('/');
  const tabs = page.locator('.case-tab');
  await expect(tabs).toHaveCount(6);
  await page.locator('.case-stage').scrollIntoViewIfNeeded();

  // Choosing a tab shows its panel only
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#case-panel-2')).toBeVisible();
  await expect(page.locator('#case-panel-1')).toBeHidden();

  // Scene 2 loops in 12.5 s; then the switcher moves on to scene 3
  await page.locator('.case-stage').scrollIntoViewIfNeeded();
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true', { timeout: 20_000 });
  await expect(page.locator('#case-panel-3')).toBeVisible();
});

test('growth map draws the dots and one pin per city', async ({ page }) => {
  await page.goto('/');
  await page.locator('.growth-map').scrollIntoViewIfNeeded();
  await expect(page.locator('.growth-pin')).toHaveCount(6);
  await page.waitForTimeout(2500);
  const inked = await page.locator('.growth-dots').evaluate((canvas: HTMLCanvasElement) => {
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
  expect(inked).toBeGreaterThan(1000);
});

test('feature cards animate only while on screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.eff-card.is-live')).toHaveCount(0);
  await page.locator('.eff-auto').scrollIntoViewIfNeeded();
  await expect(page.locator('.eff-auto')).toHaveClass(/is-live/);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.eff-auto')).not.toHaveClass(/is-live/);
});

test('no sideways scrolling on any page', async ({ page }) => {
  for (const path of ['/', '/schedule-demo', '/privacy-policy']) {
    await page.goto(path);
    await scrollThrough(page);
    const scrolled = await page.evaluate(() => {
      window.scrollTo({ left: 300, top: window.scrollY, behavior: 'instant' });
      return window.scrollX;
    });
    expect(scrolled, path).toBe(0);
  }
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('scenes show their finished state', async ({ page }) => {
    await page.goto('/');
    await scrollThrough(page);
    await expect(page.locator('.eff-auto .auto-step.is-done')).toHaveCount(5);
    await expect(page.locator('.eff-simple .eff-vis')).toHaveClass(/is-tidy/);
    await page.locator('.growth-map').scrollIntoViewIfNeeded();
    await expect(page.locator('.growth-pin.is-in')).toHaveCount(6);
  });
});

test('demo form checks fields, then posts the request as JSON', async ({ page }) => {
  await page.goto('/schedule-demo');
  const form = page.locator('.demo-form');

  await form.locator('button[type="submit"]').click();
  await expect(page.locator('.demo-error:not(:empty)')).toHaveCount(7);
  await expect(page.locator('.demo-status')).toHaveText('Please fill in all required fields.');

  // Point the form at a mocked endpoint and capture what it sends
  let sent: unknown = null;
  await page.route('https://forms.test/demo', async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await form.evaluate((el) => (el.dataset.endpoint = 'https://forms.test/demo'));

  await page.fill('#demo-firstName', 'Ananya');
  await page.fill('#demo-lastName', 'Rao');
  await page.fill('#demo-email', 'ananya@example.com');
  await page.fill('#demo-phone', '+91 98190 43344');
  await page.fill('#demo-property', 'The Terrace');
  await page.fill('#demo-availability', '2030-01-15');
  await page.locator('input[name="takesReservations"][value="Yes"]').check();
  await form.locator('button[type="submit"]').click();

  await expect(page.locator('.demo-success')).toBeVisible();
  await expect(page.locator('.demo-success [data-name]')).toHaveText('Ananya');
  expect(sent).toEqual({
    firstName: 'Ananya',
    lastName: 'Rao',
    email: 'ananya@example.com',
    phone: '+91 98190 43344',
    property: 'The Terrace',
    availability: '2030-01-15',
    takesReservations: 'Yes',
  });
});

test('privacy policy, 404, sitemap and robots resolve', async ({ page, request }) => {
  await page.goto('/privacy-policy');
  await expect(page.locator('h1')).toHaveText('Privacy Policy');
  await expect(page.locator('.page-body h2')).toHaveCount(16);

  const missing = await page.goto('/no-such-page');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');

  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Sitemap:');
});
