import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings';
import { writeAuditLog } from '@/lib/audit/log';
import { activeRoles, decide, PERMISSIONS, type Decision, type PermissionKey, type Principal, type RecordContext, type RoleKey } from './catalogue';
import { ForbiddenError } from '@/lib/errors';

/**
 * Server-side enforcement of the catalogue. Every page, layout, server action
 * and route that reads or changes data calls one of these first.
 * (Not a 'use server' file: nothing here is callable from the browser.)
 */

export const getPrincipal = cache(async (): Promise<Principal> => {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  const roles = activeRoles(user.roleKeys, settings);
  const extraGrants: Partial<Record<RoleKey, string[]>> = {};
  for (const r of roles) extraGrants[r] = user.extraGrants[r] ?? [];
  return { userId: user.id, roles, extraGrants };
});

// Once per request: a page and its layout can both guard.
const logDenied = cache(async (userId: string, key: PermissionKey, where: string, reason: string) => {
  await writeAuditLog({ userId, action: 'access.denied', entityType: 'Access', entityId: where.slice(0, 120), summary: `Refused: ${PERMISSIONS[key].label}`, metadata: { permission: key, reason } });
});

export async function can(key: PermissionKey, record?: RecordContext): Promise<Decision> {
  return decide(await getPrincipal(), key, record);
}

/** Quiet yes/no for showing a button: the same rule the action enforces. */
export async function allows(key: PermissionKey, record?: RecordContext): Promise<boolean> {
  return (await can(key, record)).allowed;
}

/** Pages and layouts: refuse on the server, pasted links included. */
export async function guardPage(key: PermissionKey, where: string): Promise<Principal> {
  const p = await getPrincipal();
  const d = decide(p, key);
  if (!d.allowed) {
    await logDenied(p.userId, key, where, d.reason);
    redirect(`/access-denied?area=${encodeURIComponent(PERMISSIONS[key].label)}`);
  }
  return p;
}

/** Server actions and routes: throws ForbiddenError (shown as a plain message). */
export async function authorize(key: PermissionKey, record?: RecordContext, where = 'action'): Promise<Principal> {
  const p = await getPrincipal();
  const d = decide(p, key, record);
  if (!d.allowed) {
    await logDenied(p.userId, key, where, d.reason);
    throw new ForbiddenError();
  }
  return p;
}
