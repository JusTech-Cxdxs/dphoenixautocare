/**
 * The customer's secure estimate-approval link, shared by both apps: the
 * staff portal makes the link, the customer website checks it. The token is
 * 32 random bytes in base64url (43 characters), shown once in the message
 * to the customer; only its SHA-256 (hex) is stored, so a copy of the
 * database never holds a usable link. Server only (node:crypto).
 */
import { createHash, randomBytes } from 'node:crypto';

/** How long a link works. */
export const APPROVAL_LINK_DAYS = 7;
export const APPROVAL_LINK_MS = APPROVAL_LINK_DAYS * 86_400_000;

/** Exactly what newApprovalToken makes: 43 base64url characters. */
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function isApprovalToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN.test(token);
}

/** The stored form of a token: its SHA-256, in hex. */
export function hashApprovalToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** A new token and its hash. Keep the hash; put the token only in the message. */
export function newApprovalToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashApprovalToken(token) };
}

/** The page on the customer website (no sign-in needed). */
export function approvalLinkUrl(websiteUrl: string, token: string): string {
  return `${websiteUrl.replace(/\/+$/, '')}/estimate/approve/${token}`;
}

/**
 * A stored phone number as WhatsApp wants it: digits only, Nigerian numbers
 * in 234… form (0803 123 4567, 803 123 4567, +234 803 123 4567 and
 * +234 0803 123 4567 all give 2348031234567). A number written with + and a
 * country code is kept as it is. Anything else (too short, a landline, text)
 * gives null, and no WhatsApp button is shown.
 */
export function whatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  if (!/^[+0-9][0-9 ()./-]*$/.test(raw)) return null;
  const digits = raw.replace(/\D/g, '');
  let national: string | null = null;
  if (digits.startsWith('2340') && digits.length === 14) national = digits.slice(4);
  else if (digits.startsWith('234') && digits.length === 13) national = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 11) national = digits.slice(1);
  else if (digits.length === 10 && !raw.startsWith('+')) national = digits;
  if (national !== null) return /^[789]\d{9}$/.test(national) ? `234${national}` : null;
  if (raw.startsWith('+') && digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0')) return digits;
  return null;
}

/** https://wa.me/<number>?text=<message>: opens WhatsApp for the colleague to send it. Null with no usable number. */
export function whatsAppShareUrl(phone: string | null | undefined, text: string): string | null {
  const n = whatsAppNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
