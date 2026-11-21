import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

// Entrance animations are switched off (as for anyone who prefers reduced motion), so colours are checked at rest.
test.use({ reducedMotion: 'reduce' });

test('the phone menu opens, navigates and closes', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.getByRole('dialog', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(menu).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
});

test('phone screens have no serious accessibility problems', async ({ page }) => {
  const AxeBuilder = (await import('@axe-core/playwright')).default;
  await signInAs(page, 'OWNER');
  for (const path of ['/dashboard', '/staff', '/settings']) {
    await page.goto(path);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id), path).toEqual([]);
  }
});

test('pages fit a phone screen without sideways scrolling', async ({ page }) => {
  await signInAs(page, 'OWNER');
  for (const path of ['/dashboard', '/staff', '/settings', '/audit-log']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
