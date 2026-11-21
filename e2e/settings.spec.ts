import { expect, test } from '@playwright/test';
import { signIn, signInAs } from './helpers';
import { PEOPLE } from './people';

test.describe.configure({ mode: 'serial' });

test('a mistake keeps what was typed and saves nothing', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/settings');
  const money = page.getByRole('form', { name: 'Money rules' });
  await money.getByLabel('VAT rate (%)').fill('150');
  await money.getByRole('button', { name: 'Save money rules' }).click();
  await expect(money.getByText('VAT rate cannot be above 100.')).toBeVisible();
  await expect(money.getByLabel('VAT rate (%)')).toHaveValue('150');
  await page.reload();
  await expect(page.getByRole('form', { name: 'Money rules' }).getByLabel('VAT rate (%)')).toHaveValue('7.5');
});

test('an empty number box is refused, never saved as 0', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/settings');
  const money = page.getByRole('form', { name: 'Money rules' });
  await money.getByLabel('Discount limit (%)').fill('');
  await money.getByRole('button', { name: 'Save money rules' }).click();
  await expect(money.getByText('Discount limit is required.')).toBeVisible();
});

test('switching Technician logins off stops technicians signing in; on again lets them back', async ({ page, browser }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/settings');
  const modules = page.getByRole('form', { name: 'Optional modules' });
  await modules.getByText('Technician logins', { exact: true }).click();
  await modules.getByRole('button', { name: 'Save optional modules' }).click();
  await expect(modules.getByText('Optional modules saved.')).toBeVisible();

  const ctx = await browser.newContext();
  const tech = await ctx.newPage();
  await signIn(tech, PEOPLE.TECHNICIAN.email);
  await expect(tech.locator('form [role=alert]')).toContainText('switched off');

  await modules.getByText('Technician logins', { exact: true }).click();
  await modules.getByRole('button', { name: 'Save optional modules' }).click();
  await expect(modules.getByText('Optional modules saved.')).toBeVisible();
  await signIn(tech, PEOPLE.TECHNICIAN.email);
  await expect(tech).toHaveURL(/\/dashboard$/);
  await ctx.close();
});

test('deposit rule accepts a percentage for individual customers', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/settings');
  const money = page.getByRole('form', { name: 'Money rules' });
  await money.getByText('Require deposit before work').click();
  await money.getByLabel('Deposit (% of the approved estimate)').fill('40');
  await money.getByRole('button', { name: 'Save money rules' }).click();
  await expect(money.getByText('Money rules saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('form', { name: 'Money rules' }).getByLabel('Deposit (% of the approved estimate)')).toHaveValue('40');
});
