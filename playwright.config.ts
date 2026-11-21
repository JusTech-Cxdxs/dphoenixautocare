import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against a production build (`next start`) on its own
 * database (E2E_DATABASE_URL), reset and filled by e2e/global-setup.ts.
 * Emails go to .mail-outbox/ (MAIL_OUTBOX=1) so tests can open the links.
 *
 *   npm run build && npm run e2e
 *
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE points at a pre-installed browser when the
 * one Playwright downloads is not available.
 */
const PORT = Number(process.env.E2E_PORT || 3100);
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL, trace: 'off', screenshot: 'only-on-failure', launchOptions: { executablePath } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 }, launchOptions: { executablePath } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'phone', use: { ...devices['Pixel 7'], launchOptions: { executablePath } }, testMatch: /(mobile|auth)\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // The settings cache lives on disk; start clean because the database was just reset.
        command: `rm -rf .next/cache/fetch-cache && npx next start -p ${PORT}`,
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
          DIRECT_URL: process.env.E2E_DATABASE_URL ?? '',
          BETTER_AUTH_URL: baseURL,
          BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
          MAIL_OUTBOX: '1',
          AUTH_ATTEMPT_LIMIT_SCALE: '50',
        },
      },
});
