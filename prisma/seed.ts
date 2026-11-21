/**
 * Creates the Owner's login: the only account that must exist before anyone
 * can use the system. Roles and the settings row come from migrations.
 *
 *   OWNER_EMAIL     required
 *   OWNER_NAME      optional, defaults to "Owner" (no real names in code)
 *   OWNER_PASSWORD  optional. When set, the password is set directly
 *                   (development, tests, demo). When not set, the Owner
 *                   chooses a password with "Forgot password" on the sign-in
 *                   page, which emails a link and confirms the address.
 *
 * Safe to run again: an existing Owner is left as is, unless
 * RESET_OWNER_PASSWORD=1 and OWNER_PASSWORD are both set.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto';
import { installAuditJournal, setAuditActor } from '../lib/audit/journal';
import { PASSWORD_MIN } from '../lib/auth/password-rules';

const prisma = new PrismaClient();
installAuditJournal(prisma);
setAuditActor(null, 'seed');

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (!email) {
    console.log('[seed] OWNER_EMAIL is not set; nothing to do.');
    return;
  }
  const name = process.env.OWNER_NAME?.trim() || 'Owner';
  const password = process.env.OWNER_PASSWORD;
  if (password !== undefined && password.length < PASSWORD_MIN) throw new Error(`OWNER_PASSWORD must be at least ${PASSWORD_MIN} characters.`);

  const role = await prisma.role.findUniqueOrThrow({ where: { key: 'OWNER' } });
  const existing = await prisma.user.findUnique({ where: { email } });

  const user =
    existing ??
    (await prisma.user.create({
      data: {
        email,
        name,
        emailVerified: Boolean(password),
        roles: { create: { roleId: role.id } },
        staff: { create: { name, roleTitle: 'MD/CEO' } },
      },
    }));

  if (existing) {
    await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, create: { userId: user.id, roleId: role.id }, update: {} });
  }

  const setPassword = password && (!existing || process.env.RESET_OWNER_PASSWORD === '1');
  if (setPassword) {
    const hash = await hashPassword(password);
    const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } });
    if (account) await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
    else await prisma.account.create({ data: { userId: user.id, providerId: 'credential', accountId: user.id, password: hash } });
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  console.log(`[seed] Owner ${existing ? 'already exists' : 'created'}${setPassword ? ', password set' : ''}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
