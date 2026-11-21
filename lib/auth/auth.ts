import 'server-only';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { after } from 'next/server';
import { prisma } from '@/lib/db';
import { appUrl, isProduction } from '@/lib/env';
import { sendEmail } from '@/lib/email/mailer';
import { passwordChangedEmail, passwordResetEmail, verifyEmailEmail } from '@/lib/email/auth-emails';
import { businessOf, getSettings } from '@/lib/settings';
import { guardAuthAttempt, recordFailedAttempt } from '@/lib/security/rate-limit';
import { accountOf, loggableEmail } from '@/lib/security/protect-core';
import { writeAuditLog } from '@/lib/audit/log';
import { activeRoles } from '@/lib/authz/catalogue';
import { PASSWORD_MAX, PASSWORD_MIN, passwordHint } from './password-rules';

/**
 * Staff sign-in (Better Auth, sessions in the database, HTTP-only cookies).
 * Adapted from EJO 100.
 *
 * - Nobody signs up from the internet: the Owner adds staff and the app sends
 *   a set-password invitation (lib/auth/invitations.ts).
 * - Email must be verified; choosing a password from an emailed link counts.
 * - Sign-in, reset and verification requests are rate-limited in the database
 *   (lib/security/rate-limit.ts), per address and per account.
 * - A switched-off account, or one whose only roles belong to switched-off
 *   modules, cannot start a session. That is checked AFTER the password, so it
 *   never reveals whether an account exists.
 * - Every sign-in and every failed attempt is in the audit log.
 * - No cookie cache: every request checks the session row, so switching an
 *   account off or resetting a password takes effect on the next click.
 */

export const RESET_LINK_SECONDS = 60 * 60;
export const STAFF_COOKIE_PREFIX = 'dpa';
export const ACCOUNT_OFF_MESSAGE = 'Your account is switched off. Please ask the Owner.';

async function sendTo(email: string, build: (b: ReturnType<typeof businessOf>) => { subject: string; html: string; text: string }) {
  const b = businessOf(await getSettings());
  const m = build(b);
  await sendEmail({ to: email, subject: m.subject, html: m.html, text: m.text });
}

/** Only the newest reset or invitation link works; earlier ones for this person stop working. */
export async function keepOnlyNewestLink(userId: string): Promise<void> {
  try {
    const rows = await prisma.verification.findMany({ where: { value: userId }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    if (rows.length > 1) await prisma.verification.deleteMany({ where: { id: { in: rows.slice(1).map((r) => r.id) } } });
  } catch {
    /* an older link staying valid until it expires is not worth failing the request */
  }
}

export const auth = betterAuth({
  appName: "D'Phoenix Autocare",
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: appUrl(),
  trustedOrigins: [appUrl()],

  // Endpoints this system never uses are switched off: people never edit their
  // own account record, email or deletion through the auth library, and
  // passwords change only through an emailed link (forgot password), which is
  // rate-limited and strength-checked. Confirmation emails are sent by Better
  // Auth itself when an unconfirmed person signs in, never on request.
  disabledPaths: ['/sign-up/email', '/update-user', '/change-email', '/delete-user', '/link-social', '/list-accounts', '/unlink-account', '/change-password', '/send-verification-email'],

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    resetPasswordTokenExpiresIn: RESET_LINK_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { active: true, accounts: { where: { providerId: 'credential' }, select: { id: true } } } });
      // A switched-off account gets no link (the answer on screen is the same, so nothing is revealed).
      if (!u?.active) {
        await prisma.verification.deleteMany({ where: { value: user.id } }).catch(() => undefined);
        return;
      }
      // Someone who has not chosen a password yet keeps their invitation link working too.
      if (u.accounts.length > 0) await keepOnlyNewestLink(user.id);
      await sendTo(user.email, (b) => passwordResetEmail(b, user.name, url));
      await writeAuditLog({ userId: user.id, source: 'auth', action: 'user.password_reset_requested', entityType: 'User', entityId: user.id, summary: 'Password reset link sent' });
    },
    onPasswordReset: async ({ user }) => {
      // Choosing a password from an emailed link proves the address.
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
      await writeAuditLog({ userId: user.id, source: 'auth', action: 'user.password_set', entityType: 'User', entityId: user.id, summary: 'Password set from an emailed link' });
      try {
        await sendTo(user.email, (b) => passwordChangedEmail(b, user.name, `${appUrl()}/login`));
      } catch (err) {
        console.error('Password changed notice failed', err);
      }
    },
  },

  emailVerification: {
    sendOnSignIn: true,
    // Confirming an email never signs anyone in by itself: they sign in with their password after.
    autoSignInAfterVerification: false,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // Land on the confirmation page (which also explains an expired link), whatever page started it.
      const link = new URL(url);
      link.searchParams.set('callbackURL', '/verify-email');
      await sendTo(user.email, (b) => verifyEmailEmail(b, user.name, link.toString()));
    },
  },

  // Link tokens are stored as SHA-256 hashes: a copy of the database never holds a working link.
  verification: { storeIdentifier: 'hashed' },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const [u, settings] = await Promise.all([
            prisma.user.findUnique({ where: { id: session.userId }, select: { active: true, roles: { select: { role: { select: { key: true } } } } } }),
            getSettings(),
          ]);
          const roles = activeRoles(u?.roles.map((r) => r.role.key) ?? [], settings);
          if (!u?.active || roles.length === 0) {
            throw new APIError('FORBIDDEN', { message: ACCOUNT_OFF_MESSAGE, code: 'ACCOUNT_OFF' });
          }
        },
        after: async (session, ctx) => {
          if (!ctx?.path?.startsWith('/sign-in') && !ctx?.path?.startsWith('/verify-email')) return;
          try {
            await prisma.$executeRaw`UPDATE "users" SET "lastLoginAt" = now() WHERE "id" = ${session.userId}`;
          } catch {
            /* never stops a sign-in */
          }
          await writeAuditLog({ userId: session.userId, source: 'auth', action: 'user.signed_in', entityType: 'User', entityId: session.userId, summary: 'Signed in' });
        },
      },
    },
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const guard = await guardAuthAttempt(ctx.path, ctx.body, ctx.headers);
      if (!guard.ok) throw new APIError('TOO_MANY_REQUESTS', { message: guard.message, code: guard.code });
      if (ctx.path === '/reset-password') {
        const pw = (ctx.body as { newPassword?: unknown } | undefined)?.newPassword;
        const hint = passwordHint(typeof pw === 'string' ? pw : '');
        if (!hint.ok) throw new APIError('BAD_REQUEST', { message: hint.message, code: 'WEAK_PASSWORD' });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-in/email') return;
      const r = ctx.context.returned;
      if (!isAPIError(r)) return;
      const typed = accountOf(ctx.body);
      if (!typed) return;
      const reason = String((r.body as { code?: unknown } | undefined)?.code ?? r.status ?? 'FAILED').slice(0, 60);
      // Wrong passwords count towards the per-account limit; refusals by the limit itself do not.
      if (reason !== 'RATE_LIMITED') await recordFailedAttempt('/sign-in/email', typed, ctx.headers).catch(() => undefined);
      const email = loggableEmail(typed);
      const u = email ? await prisma.user.findUnique({ where: { email }, select: { id: true } }).catch(() => null) : null;
      await writeAuditLog({
        userId: null,
        source: 'auth',
        action: 'user.sign_in_failed',
        entityType: 'User',
        entityId: u?.id ?? null,
        summary: `Failed sign-in for ${email ?? '(not an email address)'}`,
        metadata: { email, knownAccount: Boolean(u), reason },
      });
    }),
  },

  // Better Auth's own limiter is off on purpose: it counts in memory per server
  // (so it is not shared across Vercel instances) and allows only 3 sign-ins per
  // 10 seconds per address, which would block an office signing in at 8 AM.
  // Sign-in, reset and verification are limited in the database instead
  // (hooks.before → lib/security/rate-limit.ts), shared by every instance.
  rateLimit: { enabled: false },

  advanced: {
    cookiePrefix: STAFF_COOKIE_PREFIX,
    useSecureCookies: isProduction,
    ipAddress: { ipAddressHeaders: process.env.VERCEL ? ['x-vercel-forwarded-for'] : ['x-forwarded-for'] },
    // Emails are sent after the response, so "forgot password" answers in the
    // same time whether or not the address has an account.
    backgroundTasks: {
      handler: (task: Promise<unknown>) => {
        try {
          after(task);
        } catch {
          void task.catch(() => undefined);
        }
      },
    },
  },
});

