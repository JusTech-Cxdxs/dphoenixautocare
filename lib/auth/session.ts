import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { auth } from './auth';
import { setAuditActorResolver } from '@/lib/audit/journal';
import { activeRoles } from '@/lib/authz/catalogue';
import { getSettings } from '@/lib/settings';

/**
 * The signed-in staff member, loaded once per request. A missing, expired or
 * switched-off account counts as signed out, and so does one whose roles all
 * belong to modules the Owner has switched off.
 */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  roleKeys: string[];
  extraGrants: Record<string, string[]>;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, active: true, roles: { select: { role: { select: { key: true, permissions: { select: { permission: true } } } } } } },
  });
  if (!u?.active) return null;
  if (activeRoles(u.roles.map((r) => r.role.key), await getSettings()).length === 0) return null;
  const extraGrants: Record<string, string[]> = {};
  for (const r of u.roles) extraGrants[r.role.key] = r.role.permissions.map((p) => p.permission);
  return { id: u.id, name: u.name, email: u.email, roleKeys: u.roles.map((r) => r.role.key), extraGrants };
});

/** Pages and actions that need someone signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  // /signed-out clears the cookie, then sends the person to the sign-in page.
  if (!u) redirect('/signed-out');
  return u;
}

// The data journal asks this when a write happens outside an explicit actor.
setAuditActorResolver(async () => {
  try {
    const u = await getCurrentUser();
    const h = await headers();
    return u ? { userId: u.id, source: 'app', requestId: h.get('x-request-id') } : null;
  } catch {
    return null; // outside a request
  }
});
