import type { Prisma } from '@prisma/client';

/** Audit log filters → a Prisma where clause. Pure, so it is unit-tested. */

export const KINDS = {
  activity: 'Business activity, sign-ins and refusals',
  business: 'Business activity only',
  signins: 'Sign-ins and failed sign-ins',
  denied: 'Access refused',
  data: 'Data journal (every database change)',
  all: 'Everything',
} as const;
export type Kind = keyof typeof KINDS;

export type AuditFilters = { kind: Kind; who: string | null; q: string | null; from: string | null; to: string | null; before: bigint | null };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date (2026-13-01 or 2026-02-30 is refused), or null. */
function validDate(v: string | null): string | null {
  if (!v || !DATE.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
}

export function parseFilters(sp: Record<string, string | string[] | undefined>): AuditFilters {
  const one = (k: string) => {
    const v = sp[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    return s ? s.slice(0, 120) : null;
  };
  const kind = one('kind');
  const before = one('before');
  return {
    kind: kind && Object.hasOwn(KINDS, kind) ? (kind as Kind) : 'activity',
    who: one('who'),
    q: one('q'),
    from: validDate(one('from')),
    to: validDate(one('to')),
    before: before && /^\d{1,18}$/.test(before) ? BigInt(before) : null,
  };
}

/** Midnight in Lagos (UTC+1, no daylight saving) for a YYYY-MM-DD date. */
export function lagosMidnight(date: string, addDays = 0): Date {
  const d = new Date(`${date}T00:00:00+01:00`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d;
}

export function whereFor(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  const notData: Prisma.AuditLogWhereInput = { NOT: { entityType: { startsWith: 'db:' } } };
  switch (f.kind) {
    case 'activity':
      and.push(notData);
      break;
    case 'business':
      and.push(notData, { source: { not: 'auth' } }, { action: { not: 'access.denied' } });
      break;
    case 'signins':
      and.push({ action: { in: ['user.signed_in', 'user.sign_in_failed'] } });
      break;
    case 'denied':
      and.push({ action: 'access.denied' });
      break;
    case 'data':
      and.push({ entityType: { startsWith: 'db:' } });
      break;
    case 'all':
      break;
  }
  if (f.who === 'system') and.push({ userId: null });
  else if (f.who) and.push({ userId: f.who });
  if (f.q) and.push({ OR: [{ summary: { contains: f.q, mode: 'insensitive' } }, { action: { contains: f.q, mode: 'insensitive' } }, { entityId: f.q }] });
  if (f.from) and.push({ createdAt: { gte: lagosMidnight(f.from) } });
  if (f.to) and.push({ createdAt: { lt: lagosMidnight(f.to, 1) } });
  if (f.before !== null) and.push({ id: { lt: f.before } });
  return and.length ? { AND: and } : {};
}
