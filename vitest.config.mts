import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/support/server-only.ts', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/support/global-setup.ts'],
    setupFiles: ['tests/support/env.ts'],
    // Database tests share one test database; run files one after another.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
