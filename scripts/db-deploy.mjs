#!/usr/bin/env node
/**
 * Applies database changes during a production deploy, in this order:
 *   1. `prisma migrate deploy`: the reviewed migrations in prisma/migrations.
 *   2. Every scripts/postdeploy/*.sql file, in name order: protections that must
 *      cover every table, including ones the migrations just created
 *      (row-level security default deny, append-only audit log).
 *
 * It runs only on Vercel production builds, so preview deployments never touch
 * the live database. Run it by hand with --force (npm run db:deploy); a hosted
 * database also needs --production.
 * A failure stops the build, and the previous deployment stays live.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const force = process.argv.includes('--force');
if (!force && process.env.VERCEL_ENV !== 'production') {
  console.log('[db-deploy] skipped: not a production deploy');
  process.exit(0);
}
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('[db-deploy] DATABASE_URL (and preferably DIRECT_URL) must be set');
  process.exit(1);
}

// Run by hand against a hosted (Supabase) database only with an explicit --production,
// so a developer whose .env points at production cannot migrate it by accident.
if (process.env.VERCEL_ENV !== 'production' && /supabase\.(co|com)/i.test(url) && !process.argv.includes('--production')) {
  console.error('[db-deploy] This looks like a hosted database. Add --production if you really mean to change it.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const prisma = join(root, 'node_modules', '.bin', 'prisma');
// The URL travels in the environment, never on the command line (process lists and logs).
// Both point at the direct (non-pooled) connection: DDL should not go through a transaction pooler.
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };

console.log('[db-deploy] prisma migrate deploy');
execFileSync(prisma, ['migrate', 'deploy'], { stdio: 'inherit', env, cwd: root });

const dir = join(root, 'scripts', 'postdeploy');
for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
  console.log(`[db-deploy] postdeploy ${f}`);
  execFileSync(prisma, ['db', 'execute', '--file', join(dir, f), '--schema', join(root, 'prisma', 'schema.prisma')], { stdio: 'inherit', env, cwd: root });
}
console.log('[db-deploy] done');
