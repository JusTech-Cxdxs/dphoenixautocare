import 'server-only';
import { createHash, randomInt } from 'node:crypto';
import { prisma } from '@/lib/db';
import { AUTH_GUARDS, GENERIC_SLOW_DOWN, accountOf, ipBucket, limitScale, trustedClientIp } from './protect-core';

/**
 * Shared rate limits: one Postgres upsert per hit on rate_limit_buckets, so
 * every server instance counts together (in-memory counters would not, on
 * Vercel). Keys are salted hashes: no address or email is stored.
 */

function salt(): string {
  return process.env.RATE_LIMIT_SALT || process.env.BETTER_AUTH_SECRET || 'dpa-dev-rate-limit-salt';
}

function hash(value: string): string {
  return createHash('sha256').update(`${salt()}|${value}`).digest('hex');
}

export function clientIp(h: Headers): string {
  return trustedClientIp((n) => h.get(n), { VERCEL: process.env.VERCEL, TRUST_CLOUDFLARE: process.env.TRUST_CLOUDFLARE, TRUSTED_PROXY: process.env.TRUSTED_PROXY });
}

/** Salted hash of the trusted client address (IPv6 per /64). */
export function clientKey(h: Headers): string {
  return hash(`ip:${ipBucket(clientIp(h))}`).slice(0, 40);
}

export function accountKey(email: string): string {
  return hash(`acct:${email.trim().toLowerCase()}`).slice(0, 40);
}

/** Buckets older than this are pruned (windows longer than a day are not supported). */
const PRUNE_AFTER_MS = 2 * 24 * 60 * 60_000;

function storedKey(key: string): string {
  const scope = key.split(':')[0]?.replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'k';
  return `${scope}:${hash(key).slice(0, 40)}`;
}

/** How many hits a bucket holds right now (0 when its window has passed). Throws on a database error. */
async function peek(key: string, windowMs: number): Promise<number> {
  const ms = Math.max(1000, Math.floor(windowMs));
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "rate_limit_buckets"
    WHERE "key" = ${storedKey(key)} AND "windowStart" >= now() - (${ms}::bigint * interval '1 millisecond')`;
  return Number(rows[0]?.count ?? 0);
}

/** true means allowed. Name the purpose first in the key, e.g. `approve-link:${clientKey(h)}`. */
export async function rateLimit(key: string, limit: number, windowMs: number, opts?: { failClosed?: boolean }): Promise<boolean> {
  const stored = storedKey(key);
  const ms = Math.max(1000, Math.floor(windowMs));
  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "rate_limit_buckets" ("key", "count", "windowStart")
      VALUES (${stored}, 1, now())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rate_limit_buckets"."windowStart" < now() - (${ms}::bigint * interval '1 millisecond')
                       THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
        "windowStart" = CASE WHEN "rate_limit_buckets"."windowStart" < now() - (${ms}::bigint * interval '1 millisecond')
                       THEN now() ELSE "rate_limit_buckets"."windowStart" END
      RETURNING "count"`;
    // About 1 call in 100 tidies up expired buckets (indexed on windowStart).
    if (randomInt(100) === 0) {
      void prisma.$executeRaw`DELETE FROM "rate_limit_buckets" WHERE "windowStart" < now() - (${PRUNE_AFTER_MS}::bigint * interval '1 millisecond')`.catch(() => undefined);
    }
    return Number(rows[0]?.count ?? 0) <= limit;
  } catch {
    return !opts?.failClosed;
  }
}

export type AuthGuardOutcome = { ok: true } | { ok: false; code: string; message: string };

const scale = () => limitScale(process.env.AUTH_ATTEMPT_LIMIT_SCALE, process.env.BETTER_AUTH_URL);

/** Checks before a guarded Better Auth endpoint runs. Failed sign-ins are counted afterwards (recordFailedSignIn). */
export async function guardAuthAttempt(path: string, body: unknown, h: Headers | null | undefined): Promise<AuthGuardOutcome> {
  const rule = AUTH_GUARDS[path];
  if (!rule) return { ok: true };
  const k = scale();
  const headers = h ?? new Headers();
  const ip = clientKey(headers);
  const slow = { ok: false as const, code: 'RATE_LIMITED', message: GENERIC_SLOW_DOWN };
  const [ipLimit, ipWindow] = rule.perIp;
  if (!(await rateLimit(`auth-ip:${path}:${ip}`, ipLimit * k, ipWindow))) return slow;
  const email = accountOf(body);
  if (!email) return { ok: true };
  const acct = accountKey(email);
  if (rule.perAccountAndIp) {
    const [limit, windowMs] = rule.perAccountAndIp;
    if (!(await rateLimit(`auth-acct-ip:${path}:${acct}:${ip}`, limit * k, windowMs, { failClosed: true }))) return slow;
  }
  try {
    if (rule.failuresPerAccountAndIp && (await peek(`auth-fail-ip:${path}:${acct}:${ip}`, rule.failuresPerAccountAndIp[1])) >= rule.failuresPerAccountAndIp[0] * k) return slow;
    if (rule.failuresPerAccount && (await peek(`auth-fail:${path}:${acct}`, rule.failuresPerAccount[1])) >= rule.failuresPerAccount[0] * k) return slow;
  } catch {
    return slow; // per-account checks fail closed
  }
  return { ok: true };
}

/** Counts one failed attempt for the account (from this address, and overall). */
export async function recordFailedAttempt(path: string, email: string, h: Headers | null | undefined): Promise<void> {
  const rule = AUTH_GUARDS[path];
  if (!rule || !email) return;
  const acct = accountKey(email);
  const ip = clientKey(h ?? new Headers());
  if (rule.failuresPerAccountAndIp) await rateLimit(`auth-fail-ip:${path}:${acct}:${ip}`, Number.MAX_SAFE_INTEGER, rule.failuresPerAccountAndIp[1]);
  if (rule.failuresPerAccount) await rateLimit(`auth-fail:${path}:${acct}`, Number.MAX_SAFE_INTEGER, rule.failuresPerAccount[1]);
}
