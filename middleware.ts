import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';
import { contentSecurityPolicy, newNonce } from '@/lib/security/headers';

/**
 * Route protection by cookie presence (Better Auth's edge-safe pattern): it
 * decides where to send someone, while every page and action re-checks the
 * session on the server. It also gives every request an id (x-request-id) and
 * every page a Content-Security-Policy with a fresh nonce.
 */
const STAFF_COOKIE_PREFIX = 'dpa';
const AUTH_PAGES = ['/login', '/forgot-password', '/reset-password', '/verify-email'];
// /signed-out clears a session the server refused (switched-off account).
const ALWAYS_PUBLIC = ['/api/auth', '/api/health', '/signed-out'];

function pass(request: NextRequest, requestId: string): NextResponse {
  const csp = contentSecurityPolicy(newNonce(), process.env.NEXT_PUBLIC_SUPABASE_URL);
  const forwarded = new Headers(request.headers);
  forwarded.set('x-request-id', requestId);
  forwarded.set('content-security-policy', csp);
  const res = NextResponse.next({ request: { headers: forwarded } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('x-request-id', requestId);
  return res;
}

function redirectTo(request: NextRequest, path: string, requestId: string, params?: Record<string, string>): NextResponse {
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.headers.set('x-request-id', requestId);
  return res;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();

  if (ALWAYS_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return pass(request, requestId);

  const signedIn = Boolean(getSessionCookie(request, { cookiePrefix: STAFF_COOKIE_PREFIX }));
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAuthPage) {
    // Already signed in: straight to the dashboard (a reset or welcome link still opens).
    if (signedIn && (pathname === '/login' || pathname === '/forgot-password')) return redirectTo(request, '/dashboard', requestId);
    return pass(request, requestId);
  }
  if (!signedIn) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(JSON.stringify({ error: 'Not signed in' }), { status: 401, headers: { 'content-type': 'application/json', 'x-request-id': requestId } });
    }
    return redirectTo(request, '/login', requestId, pathname === '/' ? {} : { next: pathname });
  }
  return pass(request, requestId);
}

// Only real static assets skip the middleware; every page, whatever its address looks like, gets the checks and the CSP.
export const config = {
  matcher: ['/((?!_next/static/|_next/image|favicon\\.ico$|brand/).*)'],
};
