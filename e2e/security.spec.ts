import { expect, test } from '@playwright/test';
import { signInAs } from './helpers';

test('every page carries the security headers', async ({ request }) => {
  const res = await request.get('/login');
  const h = res.headers();
  expect(h['content-security-policy']).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(h['strict-transport-security']).toContain('max-age=63072000');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(h['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  expect(h['x-powered-by']).toBeUndefined();
});

test('addresses that look like files still get the checks and the policy', async ({ request }) => {
  const res = await request.get('/staff/anything.txt', { maxRedirects: 0 });
  expect(res.status()).toBe(307);
  expect(res.headers().location).toContain('/login');
  const missing = await request.get('/nothing-here.js');
  expect(missing.headers()['content-security-policy']).toContain("default-src 'self'");
});

test('switched-off endpoints stay switched off', async ({ request }) => {
  for (const path of ['/api/auth/send-verification-email', '/api/auth/change-password', '/api/auth/update-user']) {
    const res = await request.post(path, { data: { email: 'owner@example.com', newPassword: 'x'.repeat(12), currentPassword: 'y'.repeat(12) } });
    expect([403, 404], path).toContain(res.status());
  }
});

test('signed-out callers get nothing', async ({ request }) => {
  expect((await request.get('/api/live/pulse')).status()).toBe(401);
  const page = await request.get('/settings', { maxRedirects: 0 });
  expect(page.status()).toBe(307);
  expect(page.headers().location).toContain('/login');
});

test('a forged session cookie is treated as signed out', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'dpa.session_token', value: 'forged.value', url: baseURL! }]);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('public sign-up is switched off', async ({ request }) => {
  const res = await request.post('/api/auth/sign-up/email', { data: { email: 'intruder@example.com', password: 'a-long-password-here', name: 'Intruder' } });
  expect([403, 404]).toContain(res.status());
});

test('the health check says up without revealing anything else', async ({ request }) => {
  const body = await (await request.get('/api/health')).json();
  expect(Object.keys(body).sort()).toEqual(['database', 'ms', 'ok']);
});

test('the live pulse works for a signed-in person', async ({ page }) => {
  await signInAs(page, 'FRONT_DESK');
  const res = await page.request.get('/api/live/pulse');
  expect(res.status()).toBe(200);
  expect(await res.json()).toHaveProperty('pulse');
});
