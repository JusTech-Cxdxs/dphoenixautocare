import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { PEOPLE, RESET_PERSON, e2ePassword } from './people';

/**
 * Resets the e2e database exactly as a deploy builds it (migrations, then the
 * post-deploy SQL), then adds one login per role. Optional modules are switched
 * on so every role can sign in; tests that need them off switch them off.
 */
export default async function globalSetup() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error('Set E2E_DATABASE_URL to a throwaway database for end-to-end tests.');
  if (/supabase\.co|pooler\.supabase|prod/i.test(url)) throw new Error('E2E_DATABASE_URL looks like a real database. Refusing to reset it.');
  const root = process.cwd();
  const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };
  const prismaBin = join(root, 'node_modules', '.bin', 'prisma');
  execFileSync(prismaBin, ['migrate', 'reset', '--force', '--skip-seed', '--skip-generate'], { env, stdio: 'pipe' });
  for (const f of readdirSync(join(root, 'scripts', 'postdeploy')).filter((n) => n.endsWith('.sql')).sort()) {
    execFileSync(prismaBin, ['db', 'execute', '--file', join(root, 'scripts', 'postdeploy', f), '--schema', join(root, 'prisma', 'schema.prisma')], { env, stdio: 'pipe' });
  }
  rmSync(join(root, '.mail-outbox'), { recursive: true, force: true });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const hash = await hashPassword(e2ePassword());
    await prisma.setting.update({ where: { id: 1 }, data: { supervisorEnabled: true, technicianLoginsEnabled: true, securityGateEnabled: true } });
    for (const [key, p] of [...Object.entries(PEOPLE), ['FRONT_DESK', RESET_PERSON] as const]) {
      const role = await prisma.role.findUniqueOrThrow({ where: { key } });
      const user = await prisma.user.create({
        data: { email: p.email, name: p.name, emailVerified: true, roles: { create: { roleId: role.id } }, staff: { create: { name: p.name, roleTitle: p.title, isTechnician: key === 'TECHNICIAN' } } },
      });
      await prisma.account.create({ data: { userId: user.id, providerId: 'credential', accountId: user.id, password: hash } });
    }
  } finally {
    await prisma.$disconnect();
  }
}
