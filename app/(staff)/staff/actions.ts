'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authorize } from '@/lib/authz/server';
import { runAction, type ActionState } from '@/lib/actions';
import { writeAuditLog } from '@/lib/audit/log';
import { ROLE_INFO, ROLE_KEYS, type RoleKey } from '@/lib/authz/catalogue';
import { sendInvitation } from '@/lib/auth/invitations';
import { requireUser } from '@/lib/auth/session';
import { checkbox, email, formObject, phone, text } from '@/lib/validation';
import { UserError } from '@/lib/errors';
import { log } from '@/lib/log';

/**
 * Staff and logins. Owner only (staff.manage). Rules enforced here, not just in
 * the screen: the Owner cannot switch off or demote themselves, there is always
 * at least one active Owner, and switching a login off ends its sessions.
 */

const roleKey = z.enum(ROLE_KEYS, { error: 'Choose a role.' });
const id = z.string().trim().min(1).max(40);

const staffFields = {
  name: text('Name', 80),
  roleTitle: text('Job title', 60),
  phone,
  isTechnician: checkbox,
};

const createSchema = z
  .object({ ...staffFields, giveLogin: checkbox, email: z.string().optional(), role: z.string().optional() })
  .transform((v, ctx) => {
    if (!v.giveLogin) return { ...v, login: null };
    const e = email.safeParse(v.email ?? '');
    const r = roleKey.safeParse(v.role);
    if (!e.success) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Please enter a valid email address.' });
    if (!r.success) ctx.addIssue({ code: 'custom', path: ['role'], message: 'Choose a role.' });
    if (!e.success || !r.success) return z.NEVER;
    return { ...v, login: { email: e.data, role: r.data } };
  });

/** Serializable, retried once: two people changing Owner access at the same moment cannot both win. */
async function serializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (err) {
      if (attempt === 0 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') continue;
      throw err;
    }
  }
}

async function activeOwnerCount(tx: Prisma.TransactionClient, excludingUserId?: string): Promise<number> {
  return tx.user.count({ where: { active: true, roles: { some: { role: { key: 'OWNER' } } }, ...(excludingUserId ? { id: { not: excludingUserId } } : {}) } });
}

function emailTaken(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function invite(user: { id: string; email: string; name: string }): Promise<boolean> {
  try {
    const me = await requireUser();
    await sendInvitation(user, me.name);
    await writeAuditLog({ action: 'user.invited', entityType: 'User', entityId: user.id, summary: `Set-password link sent to ${user.email}` });
    return true;
  } catch (err) {
    log.error('invitation_failed', { userId: user.id, message: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

export async function createStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId = '';
  let inviteFailed = false;
  const result = await runAction(async () => {
    await authorize('staff.manage', undefined, 'staff.create');
    const v = createSchema.parse(formObject(fd));
    let user: { id: string; email: string; name: string } | null = null;
    try {
      const staff = await prisma.$transaction(async (tx) => {
        const role = v.login ? await tx.role.findUniqueOrThrow({ where: { key: v.login.role } }) : null;
        const created = await tx.staff.create({
          data: {
            name: v.name,
            roleTitle: v.roleTitle,
            phone: v.phone,
            isTechnician: v.isTechnician,
            ...(v.login && role ? { user: { create: { name: v.name, email: v.login.email, roles: { create: { roleId: role.id } } } } } : {}),
          },
          select: { id: true, user: { select: { id: true, email: true, name: true } } },
        });
        await writeAuditLog({ action: 'staff.created', entityType: 'Staff', entityId: created.id, summary: `Added ${v.name} (${v.roleTitle})${v.login ? ` with a ${ROLE_INFO[v.login.role].name} login` : ''}` }, tx);
        return created;
      });
      newId = staff.id;
      user = staff.user;
    } catch (err) {
      if (emailTaken(err)) throw new UserError('That email address already has a login.', { email: 'That email address already has a login.' });
      throw err;
    }
    if (user && !(await invite(user))) inviteFailed = true;
  }, 'staff.create');
  if (result?.ok && newId) {
    revalidatePath('/staff');
    // Saved either way; a failed invitation email is shown on the record, with "Send new link".
    redirect(`/staff/${newId}?saved=1${inviteFailed ? '&invite=failed' : ''}`);
  }
  return result;
}

const updateSchema = z.object({ id, ...staffFields });

export async function updateStaff(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await authorize('staff.manage', undefined, 'staff.update');
    const v = updateSchema.parse(formObject(fd));
    await prisma.$transaction(async (tx) => {
      const before = await tx.staff.findUniqueOrThrow({ where: { id: v.id }, select: { name: true, roleTitle: true, phone: true, isTechnician: true } });
      const after = { name: v.name, roleTitle: v.roleTitle, phone: v.phone, isTechnician: v.isTechnician };
      const s = await tx.staff.update({ where: { id: v.id }, data: after, select: { userId: true } });
      if (s.userId) await tx.user.update({ where: { id: s.userId }, data: { name: v.name } });
      const changes = Object.fromEntries(Object.entries(after).filter(([k, val]) => before[k as keyof typeof before] !== val).map(([k, val]) => [k, { from: before[k as keyof typeof before], to: val }]));
      await writeAuditLog({ action: 'staff.updated', entityType: 'Staff', entityId: v.id, summary: `Details updated for ${v.name}`, metadata: { changes } }, tx);
    });
    revalidatePath('/staff');
    revalidatePath(`/staff/${v.id}`);
    return { ok: true, message: 'Details saved.' };
  }, 'staff.update');
}

const activeSchema = z.object({ id, active: z.enum(['true', 'false']).transform((v) => v === 'true') });

export async function setStaffActive(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await authorize('staff.manage', undefined, 'staff.active');
    const v = activeSchema.parse(formObject(fd));
    await serializable(async (tx) => {
      const s = await tx.staff.findUniqueOrThrow({ where: { id: v.id }, select: { name: true, userId: true } });
      if (!v.active && s.userId === me.userId) throw new UserError('You cannot switch yourself off.');
      if (!v.active && s.userId && (await activeOwnerCount(tx, s.userId)) === 0 && (await tx.userRole.count({ where: { userId: s.userId, role: { key: 'OWNER' } } })) > 0) {
        throw new UserError('There must always be at least one active Owner.');
      }
      await tx.staff.update({ where: { id: v.id }, data: { active: v.active } });
      if (s.userId) {
        await tx.user.update({ where: { id: s.userId }, data: { active: v.active } });
        if (!v.active) await tx.session.deleteMany({ where: { userId: s.userId } });
      }
      await writeAuditLog({ action: v.active ? 'staff.reactivated' : 'staff.deactivated', entityType: 'Staff', entityId: v.id, summary: `${s.name} ${v.active ? 'switched back on' : 'switched off'}` }, tx);
    });
    revalidatePath('/staff');
    revalidatePath(`/staff/${v.id}`);
    return { ok: true, message: v.active ? 'Switched back on.' : 'Switched off. Any open sessions were ended.' };
  }, 'staff.active');
}

const loginSchema = z.object({ id, email, role: roleKey });

export async function giveLogin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await authorize('staff.manage', undefined, 'staff.login');
    const v = loginSchema.parse(formObject(fd));
    let user: { id: string; email: string; name: string };
    try {
      user = await prisma.$transaction(async (tx) => {
        const s = await tx.staff.findUniqueOrThrow({ where: { id: v.id }, select: { name: true, userId: true, active: true } });
        if (s.userId) throw new UserError('This staff member already has a login.');
        if (!s.active) throw new UserError('Switch this staff member back on first.');
        const role = await tx.role.findUniqueOrThrow({ where: { key: v.role } });
        const u = await tx.user.create({ data: { name: s.name, email: v.email, roles: { create: { roleId: role.id } } }, select: { id: true, email: true, name: true } });
        await tx.staff.update({ where: { id: v.id }, data: { userId: u.id } });
        await writeAuditLog({ action: 'user.created', entityType: 'User', entityId: u.id, summary: `${ROLE_INFO[v.role].name} login given to ${s.name} (${v.email})` }, tx);
        return u;
      });
    } catch (err) {
      if (emailTaken(err)) throw new UserError('That email address already has a login.', { email: 'That email address already has a login.' });
      throw err;
    }
    const sent = await invite(user);
    revalidatePath(`/staff/${v.id}`);
    revalidatePath('/staff');
    return sent ? { ok: true, message: `Login created. A link to choose a password was sent to ${user.email}.` } : { ok: false, message: 'Login created, but the email could not be sent. Press "Send new link" to try again.' };
  }, 'staff.login');
}

const roleSchema = z.object({ id, role: roleKey });

export async function changeRole(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const me = await authorize('staff.manage', undefined, 'staff.role');
    const v = roleSchema.parse(formObject(fd));
    await serializable(async (tx) => {
      const s = await tx.staff.findUniqueOrThrow({ where: { id: v.id }, select: { name: true, userId: true } });
      if (!s.userId) throw new UserError('This staff member has no login yet.');
      if (s.userId === me.userId) throw new UserError('You cannot change your own role.');
      const current = await tx.userRole.findMany({ where: { userId: s.userId }, select: { role: { select: { key: true } } } });
      const wasOwner = current.some((r) => r.role.key === 'OWNER');
      if (wasOwner && v.role !== 'OWNER' && (await activeOwnerCount(tx, s.userId)) === 0) throw new UserError('There must always be at least one active Owner.');
      const role = await tx.role.findUniqueOrThrow({ where: { key: v.role } });
      await tx.userRole.deleteMany({ where: { userId: s.userId } });
      await tx.userRole.create({ data: { userId: s.userId, roleId: role.id, assignedById: me.userId } });
      await writeAuditLog({ action: 'user.role_changed', entityType: 'User', entityId: s.userId, summary: `${s.name} is now ${ROLE_INFO[v.role as RoleKey].name}`, metadata: { from: current.map((r) => r.role.key), to: v.role } }, tx);
    });
    revalidatePath(`/staff/${v.id}`);
    revalidatePath('/staff');
    return { ok: true, message: 'Role changed. It applies from their next click.' };
  }, 'staff.role');
}

export async function resendInvite(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    await authorize('staff.manage', undefined, 'staff.invite');
    const v = z.object({ id }).parse(formObject(fd));
    const s = await prisma.staff.findUniqueOrThrow({ where: { id: v.id }, select: { active: true, user: { select: { id: true, email: true, name: true, active: true } } } });
    if (!s.user) throw new UserError('This staff member has no login yet.');
    if (!s.active || !s.user.active) throw new UserError('Switch this staff member back on first.');
    if (!(await invite(s.user))) return { ok: false, message: 'The email could not be sent. Please check the email settings and try again.' };
    return { ok: true, message: `A new link was sent to ${s.user.email}. Earlier links no longer work.` };
  }, 'staff.invite');
}
