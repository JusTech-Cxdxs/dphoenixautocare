import 'server-only';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import nodemailer, { type Transporter } from 'nodemailer';
import { isLocalAppUrl } from '@/lib/security/protect-core';

/**
 * Outgoing email over SMTP (no paid email service). Settings come from
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.
 *
 * With no SMTP_HOST, on a development machine or a local test run
 * (MAIL_OUTBOX=1 with a localhost address), messages are written to
 * .mail-outbox/ as JSON so development and tests can open the links.
 * Anywhere else a missing SMTP_HOST is an error: nothing is dropped, and no
 * link is ever written to disk on a real server.
 */
export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

let transporter: Transporter | null = null;

function smtp(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
    // Fail fast so a slow mail server never holds a request open.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export function fromAddress(): string {
  return process.env.SMTP_FROM || "D'Phoenix Autocare <no-reply@example.com>";
}

export async function sendEmail(message: OutgoingEmail): Promise<{ id: string }> {
  const t = smtp();
  if (t) {
    const info = await t.sendMail({ from: fromAddress(), to: message.to, subject: message.subject, html: message.html, text: message.text });
    return { id: String(info.messageId ?? '') };
  }
  const localTest = process.env.MAIL_OUTBOX === '1' && isLocalAppUrl(process.env.BETTER_AUTH_URL);
  if (process.env.NODE_ENV === 'production' && !localTest) {
    throw new Error('Email is not set up: SMTP_HOST is missing.');
  }
  const dir = join(process.cwd(), '.mail-outbox');
  await mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await writeFile(join(dir, `${id}.json`), JSON.stringify({ ...message, from: fromAddress(), at: new Date().toISOString() }, null, 2));
  return { id };
}
