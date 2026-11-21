import 'server-only';
import { headers } from 'next/headers';
import { after } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { currentAuditActor, redact } from './journal';
import { clientIp } from '@/lib/security/rate-limit';
import { announceChange } from '@/lib/realtime/ping';

export type AuditEntry = {
  /** dotted verb, e.g. "staff.created", "settings.updated", "user.signed_in" */
  action: string;
  entityType: string;
  entityId?: string | null;
  /** One readable line for the audit page and record timelines. */
  summary?: string;
  metadata?: Record<string, unknown>;
  /** Set when the actor is known but not signed in yet (sign-in hooks). */
  userId?: string | null;
  source?: string;
};

async function requestInfo(): Promise<{ ip: string | null; requestId: string | null }> {
  try {
    const h = await headers();
    const ip = clientIp(h);
    return { ip: ip === 'unknown' ? null : ip, requestId: h.get('x-request-id') };
  } catch {
    return { ip: null, requestId: null }; // outside a request (scripts, scheduled jobs)
  }
}

/**
 * A business audit entry. Pass `db` (a transaction client) to write it in the
 * same transaction as the change, so the change and its record stand or fall
 * together. Without `db` it never throws: an audit failure is logged and the
 * action carries on (the data journal has the low-level record anyway).
 */
export async function writeAuditLog(entry: AuditEntry, db?: Prisma.TransactionClient): Promise<void> {
  const actor = entry.userId !== undefined ? null : await currentAuditActor();
  const { ip, requestId } = await requestInfo();
  const data: Prisma.AuditLogUncheckedCreateInput = {
    userId: entry.userId ?? actor?.userId ?? null,
    source: entry.source ?? actor?.source ?? 'app',
    action: entry.action.slice(0, 80),
    entityType: entry.entityType.slice(0, 80),
    entityId: entry.entityId?.slice(0, 120) ?? null,
    summary: entry.summary?.slice(0, 300) ?? null,
    metadata: entry.metadata ? (redact(entry.metadata) as Prisma.InputJsonValue) : undefined,
    ipAddress: ip,
    requestId,
  };
  if (db) {
    await db.auditLog.create({ data });
  } else {
    try {
      await prisma.auditLog.create({ data });
    } catch (err) {
      console.error('Audit log: failed to write', entry.action, err);
      return;
    }
  }
  try {
    after(() => announceChange());
  } catch {
    // Not inside a request (a script): nobody is watching live.
  }
}
