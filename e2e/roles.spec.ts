import { expect, test } from '@playwright/test';
import { decide, ROLE_KEYS, type RoleKey } from '../lib/authz/catalogue';
import { MENU_ITEMS } from '../lib/navigation';
import { signInAs } from './helpers';

/**
 * The role matrix: every role against every page, compared with the same
 * catalogue rule the server uses. A page a role may not open must be refused
 * on the server (pasted links included), and must not be in its menu.
 */
const EXTRA_PAGES = [
  { href: '/staff/new', permission: 'staff.manage' as const },
  { href: '/search', permission: 'staff.view' as const },
];

for (const role of ROLE_KEYS) {
  test(`${role}: menu and pages match the permission catalogue`, async ({ page }) => {
    await signInAs(page, role);
    const principal = { userId: 'x', roles: [role as RoleKey] };
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const item of [...MENU_ITEMS, ...EXTRA_PAGES]) {
      const allowed = decide(principal, item.permission).allowed;
      if ('name' in item) {
        await expect(nav.getByRole('link', { name: item.name as string }), `${role} menu ${item.href}`).toHaveCount(allowed ? 1 : 0);
      }
      await page.goto(item.href);
      if (allowed) await expect(page, `${role} ${item.href}`).toHaveURL(new RegExp(`${item.href}$`));
      else await expect(page, `${role} ${item.href}`).toHaveURL(/\/access-denied\?area=/);
    }
  });
}

test('refusals are written to the audit log', async ({ page }) => {
  await signInAs(page, 'TECHNICIAN');
  await page.goto('/settings');
  await expect(page).toHaveURL(/access-denied/);
  await page.context().clearCookies();
  await signInAs(page, 'OWNER');
  await page.goto('/audit-log?kind=denied');
  await expect(page.getByText('Refused: Change business details, money rules and optional modules').first()).toBeVisible();
});
