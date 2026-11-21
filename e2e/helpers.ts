import { expect, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RoleKey } from '../lib/authz/catalogue';
import { PEOPLE, e2ePassword } from './people';

export async function signIn(page: Page, email: string, password = e2ePassword(), path = '/login') {
  await page.goto(path);
  // The button switches on once the page's script has loaded.
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Sign out from the header (desktop) or the account menu (phone). */
export async function signOut(page: Page) {
  const header = page.getByRole('button', { name: 'Sign out' });
  if (!(await header.first().isVisible())) await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('button', { name: /^Sign out$/ }).first().click();
}

export async function signInAs(page: Page, role: RoleKey) {
  await signIn(page, PEOPLE[role].email);
  await expect(page).toHaveURL(/\/dashboard$/);
}

type Mail = { to: string; subject: string; text: string; html: string; at: string };

/** The newest email to an address, waiting for it to arrive. */
export async function latestMail(to: string, subjectIncludes?: string, after = 0): Promise<Mail> {
  const dir = join(process.cwd(), '.mail-outbox');
  for (let i = 0; i < 40; i++) {
    if (existsSync(dir)) {
      const mails = readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Mail)
        .filter((m) => m.to === to && (!subjectIncludes || m.subject.includes(subjectIncludes)) && Date.parse(m.at) >= after)
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      if (mails[0]) return mails[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to}${subjectIncludes ? ` about "${subjectIncludes}"` : ''}`);
}

export function linkIn(mail: Mail): string {
  const m = mail.text.match(/https?:\/\/\S+/g)?.find((u) => /reset-password|verify-email/.test(u));
  if (!m) throw new Error(`No link in "${mail.subject}"`);
  return m;
}
