import 'server-only';
import { PrismaClient } from '@prisma/client';
import { installAuditJournal } from './audit/journal';

/**
 * The one shared Prisma client. Never create another: the audit journal is
 * installed here, so every write is recorded.
 *
 * Connection pool: on Vercel each server instance keeps a small pool and
 * Supabase's pooler (port 6543, pgbouncer=true) shares connections between
 * instances. Defaults suit a serverless function; DATABASE_URL can override.
 */
export function tunedDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const limit = Number(process.env.PRISMA_CONNECTION_LIMIT) || 5;
    const timeout = Number(process.env.PRISMA_POOL_TIMEOUT) || 20;
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', String(Math.max(1, Math.min(50, limit))));
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', String(Math.max(5, Math.min(60, timeout))));
    return u.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const url = tunedDatabaseUrl(process.env.DATABASE_URL);
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
  installAuditJournal(client);
  return client;
}

export const prisma = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
