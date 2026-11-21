import 'server-only';
import { prisma } from '@/lib/db';

/**
 * The cheap "has anything changed?" signal: the newest business audit entry.
 * Many open pages ask at once, so one answer is shared per server instance for
 * a few seconds (one indexed query per instance per PULSE_MEMO_MS at most).
 */
const PULSE_MEMO_MS = 3000;
let memo: { at: number; value: Promise<string> } | null = null;

async function compute(): Promise<string> {
  const latest = await prisma.auditLog.findFirst({
    where: { NOT: [{ entityType: { startsWith: 'db:' } }, { source: 'auth' }, { action: 'access.denied' }] },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  return latest ? latest.id.toString() : '0';
}

export function livePulse(): Promise<string> {
  const now = Date.now();
  if (memo && now - memo.at < PULSE_MEMO_MS) return memo.value;
  const value = compute();
  value.catch(() => {
    if (memo?.value === value) memo = null; // a failed lookup is never shared
  });
  memo = { at: now, value };
  return value;
}
