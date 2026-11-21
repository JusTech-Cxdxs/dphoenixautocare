import { expect, test } from '@playwright/test';
import { latestMail, linkIn, signIn, signInAs, signOut } from './helpers';
import { PEOPLE, RESET_PERSON } from './people';

test.describe('sign-in', () => {
  test('shows the branded sign-in page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByAltText("D'Phoenix Autocare logo").locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('EJO · JusTech').locator('visible=true').first()).toBeVisible();
  });

  test('refuses a wrong password with the same words as an unknown account', async ({ page }) => {
    await signIn(page, PEOPLE.OWNER.email, 'definitely not the password');
    const wrong = await page.locator('form [role=alert]').textContent();
    await signIn(page, 'nobody-here@example.com', 'definitely not the password');
    await expect(page.locator('form [role=alert]')).toHaveText(wrong!);
    expect(wrong).toContain('don’t match');
    await expect(page).toHaveURL(/\/login/);
  });

  test('signs in, keeps the session in an HTTP-only cookie, and signs out', async ({ page, context }) => {
    await signInAs(page, 'OWNER');
    const cookie = (await context.cookies()).find((c) => c.name.includes('session_token'));
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    await signOut(page);
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test('returns to the page you asked for after signing in', async ({ page }) => {
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/login\?next=%2Fstaff/);
    await signIn(page, PEOPLE.FRONT_DESK.email, undefined, page.url());
    await expect(page).toHaveURL(/\/staff$/);
  });

  test('never redirects to another site after sign-in', async ({ page }) => {
    for (const next of ['//evil.example.com', '/%09/evil.example.com', 'https://evil.example.com']) {
      await page.context().clearCookies();
      await signIn(page, PEOPLE.FRONT_DESK.email, undefined, `/login?next=${encodeURIComponent(next).replace('%2509', '%09')}`);
      await expect(page).toHaveURL(/localhost:\d+\/dashboard$/);
    }
  });
});

test.describe('forgot password', () => {
  test('emails a one-time link that sets a new password', async ({ page, browser }, info) => {
    test.skip(info.project.name === 'phone', 'covered on desktop');
    const email = RESET_PERSON.email;
    const since = Date.now();
    await page.goto('/forgot-password');
    await expect(page.getByRole('button', { name: 'Send me a link' })).toBeEnabled();
    await page.getByLabel('Work email').fill(email);
    await page.getByRole('button', { name: 'Send me a link' }).click();
    await expect(page.getByRole('status')).toContainText('If that email belongs to an account');
    const link = linkIn(await latestMail(email, 'Reset your', since));

    await page.goto(link);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const fresh = 'green bus to ikeja every monday';
    await expect(page.getByRole('button', { name: 'Save my password' })).toBeEnabled();
    await page.getByLabel('New password').fill(fresh);
    await page.getByLabel('Type it again').fill(fresh);
    await page.getByRole('button', { name: 'Save my password' }).click();
    await expect(page.getByText('Your password is set')).toBeVisible();
    await latestMail(email, 'password was changed', since);

    // The link works once.
    const again = await browser.newPage();
    await again.goto(link);
    await expect(again.getByText('This link has expired or was already used')).toBeVisible();
    await again.close();

    await signIn(page, email, fresh);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('answers the same for an address with no account', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('button', { name: 'Send me a link' })).toBeEnabled();
    await page.getByLabel('Work email').fill('nobody-at-all@example.com');
    await page.getByRole('button', { name: 'Send me a link' }).click();
    await expect(page.getByRole('status')).toContainText('If that email belongs to an account');
  });
});
