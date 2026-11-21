import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { livePulse } from '@/lib/realtime/pulse';

export const dynamic = 'force-dynamic';
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

/**
 * "Has anything changed?" Open pages ask this when a realtime ping arrives,
 * or every 20 seconds without realtime. Returns an opaque signature only.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401, headers: NO_STORE });
    return NextResponse.json({ pulse: await livePulse() }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503, headers: NO_STORE });
  }
}
