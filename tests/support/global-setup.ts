import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Database tests run against TEST_DATABASE_URL (a throwaway database, never
 * production): it is reset to the migrations, then the post-deploy SQL runs,
 * exactly as in a deploy. Without TEST_DATABASE_URL the database tests skip.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;
  if (/supabase\.co|pooler\.supabase|prod/i.test(url)) throw new Error('TEST_DATABASE_URL looks like a real database. Refusing to reset it.');
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url, PRISMA_HIDE_UPDATE_MESSAGE: '1' };
  const prisma = join(process.cwd(), 'node_modules', '.bin', 'prisma');
  execFileSync(prisma, ['migrate', 'reset', '--force', '--skip-seed', '--skip-generate'], { env, stdio: 'pipe' });
  const dir = join(process.cwd(), 'scripts', 'postdeploy');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    execFileSync(prisma, ['db', 'execute', '--file', join(dir, f), '--schema', join(process.cwd(), 'prisma', 'schema.prisma')], { env, stdio: 'pipe' });
  }
}
