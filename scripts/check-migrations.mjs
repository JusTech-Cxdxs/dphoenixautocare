#!/usr/bin/env node
/**
 * CI gate for database changes (rule: changes are additive once merged).
 *
 *  1. No destructive SQL in any migration: DROP TABLE / COLUMN / TYPE, RENAME,
 *     a column type change, TRUNCATE or DELETE.
 *  2. Migrations already on the base branch are never edited or removed
 *     (needs BASE_REF, e.g. origin/main; skipped when it does not exist yet).
 *  3. prisma/migrations produce exactly prisma/schema.prisma
 *     (needs SHADOW_DATABASE_URL, an empty scratch database).
 *
 * A reviewed exception goes in a line comment inside the migration:
 *   -- allow-destructive: <reason>
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'prisma', 'migrations');
const problems = [];

const DESTRUCTIVE = [
  /\bDROP\s+TABLE\b/i,
  /\bDROP\s+COLUMN\b/i,
  /\bDROP\s+TYPE\b/i,
  /\bRENAME\s+(?:COLUMN|TO)\b/i,
  /\bALTER\s+COLUMN\s+"?[\w]+"?\s+(?:SET\s+DATA\s+)?TYPE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
];

const migrations = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
for (const m of migrations) {
  const sql = readFileSync(join(dir, m, 'migration.sql'), 'utf8');
  if (/--\s*allow-destructive:\s*\S/.test(sql)) continue;
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  for (const re of DESTRUCTIVE) {
    const hit = code.match(re);
    if (hit) problems.push(`${m}: destructive statement "${hit[0]}". Make the change additive, or add a reviewed "-- allow-destructive: <reason>" line.`);
  }
}

const base = process.env.BASE_REF;
if (base) {
  let known = true;
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', base], { cwd: root, stdio: 'ignore' });
  } catch {
    known = false;
    console.log(`[check-migrations] base ${base} not found; skipping the edited-migration check`);
  }
  if (known) {
    const out = execFileSync('git', ['diff', '--name-status', `${base}...HEAD`, '--', 'prisma/migrations'], { cwd: root, encoding: 'utf8' });
    for (const line of out.split('\n').filter(Boolean)) {
      const [status, file] = line.split('\t');
      if (status && status !== 'A' && file?.endsWith('.sql')) problems.push(`${file}: a merged migration was ${status === 'D' ? 'removed' : 'edited'}. Add a new migration instead.`);
    }
  }
}

const shadow = process.env.SHADOW_DATABASE_URL;
if (shadow) {
  const prisma = join(root, 'node_modules', '.bin', 'prisma');
  try {
    execFileSync(prisma, ['migrate', 'diff', '--from-migrations', dir, '--to-schema-datamodel', join(root, 'prisma', 'schema.prisma'), '--shadow-database-url', shadow, '--exit-code'], { cwd: root, stdio: 'pipe', env: { ...process.env } });
  } catch (err) {
    const code = err && typeof err === 'object' && 'status' in err ? err.status : 1;
    if (code === 2) problems.push('prisma/schema.prisma has changes with no migration. Run: npm run db:migrate -- --name <what-changed>');
    else problems.push(`Could not compare migrations with the schema: ${String(err?.stderr ?? err).slice(0, 400)}`);
  }
} else {
  console.log('[check-migrations] SHADOW_DATABASE_URL not set; skipping the schema-drift check');
}

if (problems.length) {
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
console.log(`[check-migrations] ${migrations.length} migration(s) OK`);
