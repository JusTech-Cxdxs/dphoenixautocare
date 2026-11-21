'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { authorize } from '@/lib/authz/server';
import { runAction, type ActionState } from '@/lib/actions';
import { writeAuditLog } from '@/lib/audit/log';
import { grantableFor } from '@/lib/authz/grants';
import { ROLE_KEYS, type RoleKey } from '@/lib/authz/catalogue';

/**
 * Saves the Owner's extra grants. Only permissions a role does not already
 * have, and never Owner-only ones, can be granted (lib/authz/grants.ts); any
 * other ticked box in the request is ignored.
 */
export async function saveExtraGrants(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await authorize('roles.manage', undefined, 'roles.save');
    const wanted = new Set(fd.getAll('grant').map(String));
    const roles = await prisma.role.findMany({ where: { key: { in: ROLE_KEYS.filter((k) => k !== 'OWNER') } }, select: { id: true, key: true, permissions: { select: { permission: true } } } });
    const added: string[] = [];
    const removed: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const role of roles) {
        const allowed = grantableFor(role.key as RoleKey);
        const want: string[] = allowed.filter((p) => wanted.has(`${role.key}:${p}`));
        const have = role.permissions.map((p) => p.permission);
        const toAdd = want.filter((p) => !have.includes(p));
        // Anything not wanted goes, including stale rows for permissions no longer grantable.
        const toRemove = have.filter((p) => !want.includes(p));
        if (toRemove.length) await tx.rolePermission.deleteMany({ where: { roleId: role.id, permission: { in: toRemove } } });
        for (const p of toAdd) await tx.rolePermission.create({ data: { roleId: role.id, permission: p, grantedById: me.userId } });
        added.push(...toAdd.map((p) => `${role.key}:${p}`));
        removed.push(...toRemove.map((p) => `${role.key}:${p}`));
      }
      if (added.length || removed.length) {
        await writeAuditLog({ action: 'roles.grants_changed', entityType: 'Role', entityId: null, summary: `Extra permissions changed (${added.length} added, ${removed.length} removed)`, metadata: { added, removed } }, tx);
      }
    });
    revalidatePath('/roles');
    return { ok: true, message: added.length || removed.length ? 'Permissions saved. They apply from each person’s next click.' : 'Nothing changed.' };
  }, 'roles.save');
}
