import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';

/**
 * The server refused the session (expired, switched off, or no active role):
 * end it on the server, clear the staff sign-in cookies and go to sign-in.
 * Only for this site's own navigations: a request started by another site is
 * sent to sign-in without touching anything.
 */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(new URL('/login?reason=signed-out', request.url));
  if (request.headers.get('sec-fetch-site') === 'cross-site') return res;
  await auth.api.signOut({ headers: request.headers }).catch(() => undefined);
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith('dpa.') || c.name.startsWith('__Secure-dpa.')) {
      // A __Secure- cookie can only be cleared by a Secure Set-Cookie.
      res.cookies.set(c.name, '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax', secure: c.name.startsWith('__Secure-') });
    }
  }
  return res;
}
