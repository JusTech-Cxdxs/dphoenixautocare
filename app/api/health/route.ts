import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Uptime check: the app is up and can reach the database. Says nothing else. */
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: 'up', ms: Date.now() - started }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, database: 'down' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
