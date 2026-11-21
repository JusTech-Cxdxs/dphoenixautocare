import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

// Entrance animations are switched off (as for anyone who prefers reduced motion), so colours are checked at rest.
test.use({ reducedMotion: 'reduce' });

/** No serious or critical accessibility problems (WCAG 2.1 AA rules) on the main screens. */
async function check(page: import('@playwright/test').Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')}`)).toEqual([]);
}

test('sign-in pages', async ({ page }) => {
  for (const path of ['/login', '/forgot-password']) {
    await page.goto(path);
    await check(page);
  }
});

test('signed-in pages', async ({ page }) => {
  await signInAs(page, 'OWNER');
  for (const path of ['/dashboard', '/staff', '/staff/new', '/roles', '/settings', '/audit-log', '/search?q=owner']) {
    await page.goto(path);
    await check(page);
  }
  await page.goto('/staff');
  await page.locator('a', { hasText: 'MD/CEO' }).click();
  await check(page);
});

test('dark theme', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'dpa-theme', value: 'dark', url: baseURL! }]);
  await page.goto('/login');
  await check(page);
  await signInAs(page, 'OWNER');
  for (const path of ['/dashboard', '/staff', '/settings']) {
    await page.goto(path);
    await check(page);
  }
});
