import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { log } from '@/lib/log';

/** A short reference people can read out on the phone: DPA-7K2Q9X. No 0/O or 1/I. */
export function newReference(): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(6);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `DPA-${out}`;
}

/** Stores an unexpected error and returns its reference. Never throws. */
export async function recordError(err: unknown, path: string | null, extra?: { userId?: string | null; requestId?: string | null; reference?: string }): Promise<string> {
  const reference = extra?.reference ?? newReference();
  const e = err instanceof Error ? err : new Error(String(err));
  log.error('unhandled_error', { reference, path, message: e.message });
  try {
    await prisma.errorEvent.create({
      data: { reference, path: path?.slice(0, 300) ?? null, message: e.message.slice(0, 2000), stack: e.stack?.slice(0, 8000) ?? null, userId: extra?.userId ?? null, requestId: extra?.requestId ?? null },
    });
  } catch {
    // The log line above still has it.
  }
  return reference;
}
