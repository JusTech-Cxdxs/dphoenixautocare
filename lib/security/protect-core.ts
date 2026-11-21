/**
 * Pure pieces of abuse protection (lib/security/rate-limit.ts uses them).
 * No database and no Next.js, so tests run them directly.
 */

export type HeaderGetter = (name: string) => string | null | undefined;
export type ProxyEnv = { VERCEL?: string; TRUST_CLOUDFLARE?: string; TRUSTED_PROXY?: string };

const IP_RE = /^[0-9a-f:.]{2,45}$/i;

function firstHop(value: string | null | undefined): string | null {
  const v = (value ?? '').split(',')[0]?.trim() ?? '';
  return v && IP_RE.test(v) ? v.toLowerCase() : null;
}

/**
 * The client address we are willing to believe, in order:
 *  1. on Vercel, x-vercel-forwarded-for (set by Vercel's edge; a client cannot forge it);
 *  2. cf-connecting-ip only when TRUST_CLOUDFLARE=1 (the site accepts traffic only from Cloudflare);
 *  3. the first x-forwarded-for hop only when TRUSTED_PROXY=1 (behind our own proxy);
 *  4. otherwise 'unknown', never a header any client could set.
 */
export function trustedClientIp(get: HeaderGetter, env: ProxyEnv): string {
  if (env.VERCEL) {
    const v = firstHop(get('x-vercel-forwarded-for'));
    if (v) return v;
  }
  if (env.TRUST_CLOUDFLARE === '1') {
    const v = firstHop(get('cf-connecting-ip'));
    if (v) return v;
  }
  if (env.TRUSTED_PROXY === '1') {
    const v = firstHop(get('x-forwarded-for'));
    if (v) return v;
  }
  return 'unknown';
}

/**
 * The bucket an address is counted in. IPv4 counts per address; IPv6 per /64,
 * because one home or office line owns a whole /64 and could otherwise rotate
 * through billions of addresses.
 */
export function ipBucket(ip: string): string {
  if (!ip.includes(':')) return ip;
  const [head = '', tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const missing = Math.max(0, 8 - left.length - right.length);
  const full = ip.includes('::') ? [...left, ...Array(missing).fill('0'), ...right] : left;
  return `${full.slice(0, 4).map((h) => h.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

export type AuthGuardRule = {
  /** Every request per client address: [limit, windowMs]. Fails open if the database is down. */
  perIp: [number, number];
  /**
   * Per account (email in the body), counting only FAILED attempts, so nobody
   * can lock a person out by sending correct-looking traffic. Two buckets: from
   * one address (stops one guesser fast), and from anywhere (stops a spread-out
   * attack without letting a single address lock the account). Fails closed.
   */
  failuresPerAccountAndIp?: [number, number];
  failuresPerAccount?: [number, number];
  /** Requests per account from one address (reset and verification emails). */
  perAccountAndIp?: [number, number];
};

const FIFTEEN_MIN = 15 * 60_000;

/**
 * Sign-in, forgot and reset password. A whole office signs in from one address
 * at 8 AM, so the per-address limit is generous; the per-account limit stops
 * password guessing from many addresses at once.
 */
export const AUTH_GUARDS: Record<string, AuthGuardRule> = {
  '/sign-in/email': { perIp: [60, FIFTEEN_MIN], failuresPerAccountAndIp: [10, FIFTEEN_MIN], failuresPerAccount: [50, FIFTEEN_MIN] },
  '/request-password-reset': { perIp: [20, FIFTEEN_MIN], perAccountAndIp: [5, FIFTEEN_MIN] },
  '/reset-password': { perIp: [20, FIFTEEN_MIN] },
};

/** Only a real-looking email address is ever stored (a password typed into the email box must not be). */
export function loggableEmail(raw: string): string | null {
  return /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i.test(raw) ? raw : null;
}

/** Lower-case trimmed email from a request body, or ''. */
export function accountOf(body: unknown): string {
  const raw = (body as { email?: unknown } | null | undefined)?.email;
  return typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 160) : '';
}

/** One message for every refusal, so nothing reveals whether an account exists. */
export const GENERIC_SLOW_DOWN = 'Too many attempts. Please wait a few minutes, then try again.';

/** True only for a local test address: test-only switches are ignored anywhere else. */
export function isLocalAppUrl(url: string | undefined): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url ?? '');
}

/**
 * Test runs sign in hundreds of times from one address; AUTH_ATTEMPT_LIMIT_SCALE
 * multiplies the limits there. Ignored unless the app runs on localhost, so a
 * stray setting in production can never weaken the limits.
 */
export function limitScale(raw: string | undefined, appUrl?: string): number {
  if (!isLocalAppUrl(appUrl)) return 1;
  const n = Number(raw ?? '1');
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}
