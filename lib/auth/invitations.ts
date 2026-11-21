import 'server-only';
import { randomBytes } from 'node:crypto';
import { auth, keepOnlyNewestLink } from './auth';
import { appUrl } from '@/lib/env';
import { sendEmail } from '@/lib/email/mailer';
import { invitationEmail } from '@/lib/email/auth-emails';
import { businessOf, getSettings } from '@/lib/settings';

/** Invitation links last 72 hours (a reset link lasts one hour). */
export const INVITE_LINK_SECONDS = 72 * 60 * 60;

/**
 * Sends a set-password link to a new staff login. It is a Better Auth reset
 * token with a longer life: the reset page sets the password, creates the
 * password account and marks the email verified. Earlier links stop working.
 */
export async function sendInvitation(user: { id: string; email: string; name: string }, invitedBy: string): Promise<void> {
  const token = randomBytes(24).toString('base64url');
  // Through Better Auth's own adapter, so the token is stored hashed exactly as a reset link is.
  const ctx = await auth.$context;
  await ctx.internalAdapter.createVerificationValue({ identifier: `reset-password:${token}`, value: user.id, expiresAt: new Date(Date.now() + INVITE_LINK_SECONDS * 1000) });
  await keepOnlyNewestLink(user.id);
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}&welcome=1`;
  const m = invitationEmail(businessOf(await getSettings()), user.name, url, invitedBy);
  await sendEmail({ to: user.email, subject: m.subject, html: m.html, text: m.text });
}
