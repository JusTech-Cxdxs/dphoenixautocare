import { expect, test } from '@playwright/test';
import { latestMail, linkIn, signIn, signInAs } from './helpers';

test.describe.configure({ mode: 'serial' });

test('Owner adds a technician without a login', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/staff/new');
  await page.getByLabel('Full name').fill('Bay Two Technician');
  await page.getByLabel('Job title').fill('Technician');
  await page.getByLabel('This person is a technician').check();
  await page.getByRole('button', { name: 'Add staff member' }).click();
  await expect(page.getByText('Staff member added.')).toBeVisible();
  await expect(page.getByText('This person cannot sign in.')).toBeVisible();
});

test('a new login gets an invitation, chooses a password, and signs in; switching it off ends the session', async ({ page, browser }) => {
  const email = 'new.supervisor@example.com';
  const since = Date.now();
  await signInAs(page, 'OWNER');
  await page.goto('/staff/new');
  await page.getByLabel('Full name').fill('New Supervisor');
  await page.getByLabel('Job title').fill('Workshop Supervisor');
  await page.getByLabel('Give them a login').check();
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Role').selectOption('SUPERVISOR');
  await page.getByRole('button', { name: 'Add staff member' }).click();
  await expect(page.getByText('Staff member added.')).toBeVisible();
  const staffUrl = page.url();

  const invite = await latestMail(email, 'account is ready', since);
  const ctx = await browser.newContext();
  const them = await ctx.newPage();
  await them.goto(linkIn(invite));
  await expect(them.getByRole('heading', { name: 'Welcome! Choose your password' })).toBeVisible();
  await expect(them.getByRole('button', { name: 'Save my password' })).toBeEnabled();
  await them.getByLabel('New password').fill('red danfo past the toll gate');
  await them.getByLabel('Type it again').fill('red danfo past the toll gate');
  await them.getByRole('button', { name: 'Save my password' }).click();
  await expect(them.getByText('Your password is set')).toBeVisible();
  await signIn(them, email, 'red danfo past the toll gate');
  await expect(them).toHaveURL(/\/dashboard$/);

  // The same email cannot be used twice.
  await page.goto('/staff/new');
  await page.getByLabel('Full name').fill('Duplicate');
  await page.getByLabel('Job title').fill('Front Desk');
  await page.getByLabel('Give them a login').check();
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('button', { name: 'Add staff member' }).click();
  await expect(page.getByText('That email address already has a login.').first()).toBeVisible();
  // What was typed is kept after the error.
  await expect(page.getByLabel('Full name')).toHaveValue('Duplicate');

  // Switch them off: their open session ends at once and they cannot sign back in.
  await page.goto(staffUrl);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Switch off' }).click();
  await expect(page.getByText('Switched off. Any open sessions were ended.')).toBeVisible();
  await them.goto('/dashboard');
  await expect(them).toHaveURL(/\/login/);
  await signIn(them, email, 'red danfo past the toll gate');
  await expect(them.locator('form [role=alert]')).toContainText('switched off');
  await ctx.close();
});

test('the Owner cannot switch off or demote themselves', async ({ page }) => {
  await signInAs(page, 'OWNER');
  await page.goto('/staff');
  await page.locator('a', { hasText: 'MD/CEO' }).click();
  await expect(page.getByText('This is your own login.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Switch off' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Change role' })).toHaveCount(0);
});

test('Front Desk can see staff but cannot change them', async ({ page }) => {
  await signInAs(page, 'FRONT_DESK');
  await page.goto('/staff');
  await expect(page.getByRole('link', { name: 'Add staff member' })).toHaveCount(0);
  await page.getByRole('link', { name: /Bay Two Technician/ }).click();
  await expect(page.getByRole('button', { name: 'Save details' })).toHaveCount(0);
});
