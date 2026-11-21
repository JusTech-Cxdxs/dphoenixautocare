import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { Avatar } from '@/components/Avatar';
import { LoadingLink } from '@/components/LoadingLink';
import { EmptyState, HeaderAction, PageHeader, SectionCard, StatTile, StatusChip, buttonCls, inputCls, labelCls } from '@/components/ui';
import { allows, getPrincipal, guardPage } from '@/lib/authz/server';
import { ROLE_INFO, ROLE_KEYS, type RoleKey } from '@/lib/authz/catalogue';
import { prisma } from '@/lib/db';
import { formatDateTime, formatPhone } from '@/lib/format';

export const metadata: Metadata = { title: 'Staff and logins' };

const STATUS = { all: 'Everyone', active: 'Active', off: 'Switched off', nologin: 'No login' } as const;
type Status = keyof typeof STATUS;

function roleOf(keys: string[]): RoleKey | null {
  return (ROLE_KEYS.find((r) => keys.includes(r)) as RoleKey | undefined) ?? null;
}

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; role?: string }> }) {
  await guardPage('staff.view', 'staff');
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80) || '';
  const status: Status = sp.status && Object.hasOwn(STATUS, sp.status) ? (sp.status as Status) : 'all';
  const role = sp.role && (ROLE_KEYS as readonly string[]).includes(sp.role) ? (sp.role as RoleKey) : null;
  const [canManage, principal] = await Promise.all([allows('staff.manage'), getPrincipal()]);

  const where: Prisma.StaffWhereInput = {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { roleTitle: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }, { user: { email: { contains: q, mode: 'insensitive' } } }] } : {}),
    ...(status === 'active' ? { active: true } : status === 'off' ? { active: false } : status === 'nologin' ? { userId: null } : {}),
    ...(role ? { user: { roles: { some: { role: { key: role } } } } } : {}),
  };
  const [staff, total, active, off, noLogin] = await Promise.all([
    prisma.staff.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 300,
      select: { id: true, name: true, roleTitle: true, phone: true, isTechnician: true, active: true, user: { select: { id: true, email: true, lastLoginAt: true, roles: { select: { role: { select: { key: true } } } } } } },
    }),
    prisma.staff.count(),
    prisma.staff.count({ where: { active: true } }),
    prisma.staff.count({ where: { active: false } }),
    prisma.staff.count({ where: { userId: null } }),
  ]);

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader
        plain
        icon="users"
        title="Staff and logins"
        description="Everyone who works in the workshop. Technicians are listed here so jobs can be assigned by name, with or without a login. Every change is in the audit log."
        actions={canManage ? <HeaderAction href="/staff/new" icon="user-plus">Add staff member</HeaderAction> : null}
      />

      <div className="ejo-stagger mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon="users" label="People" value={total} />
        <StatTile icon="check-circle" label="Active" value={active} tone="success" emphasis />
        <StatTile icon="lock" label="Switched off" value={off} tone="neutral" />
        <StatTile icon="user" label="Without a login" value={noLogin} tone="neutral" />
      </div>

      <form method="get" className="mb-6 grid gap-3 rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" aria-label="Filter staff">
        <div>
          <label htmlFor="q" className={labelCls}>Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, job title, phone or email…" className={inputCls} />
        </div>
        <div>
          <label htmlFor="status" className={labelCls}>Status</label>
          <select id="status" name="status" defaultValue={status} className={inputCls}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="role" className={labelCls}>Role</label>
          <select id="role" name="role" defaultValue={role ?? ''} className={inputCls}>
            <option value="">All roles</option>
            {ROLE_KEYS.map((k) => <option key={k} value={k}>{ROLE_INFO[k].name}</option>)}
          </select>
        </div>
        <button type="submit" className={buttonCls('secondary')}>Apply</button>
      </form>

      <p className="mb-3 text-sm text-[var(--ejo-text-muted)]">{staff.length === 1 ? '1 person' : `${staff.length} people`}</p>

      {staff.length === 0 ? (
        <SectionCard title="No one matches">
          <EmptyState icon="users" title={total === 0 ? 'No staff yet' : 'No one matches these filters'} action={canManage && total === 0 ? <HeaderAction href="/staff/new" icon="user-plus">Add the first staff member</HeaderAction> : null}>
            {total === 0 ? 'Add your front desk, technicians and supervisors here.' : 'Try a different search or show everyone.'}
          </EmptyState>
        </SectionCard>
      ) : (
        <div className="ejo-stagger grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {staff.map((s) => {
            const r = s.user ? roleOf(s.user.roles.map((x) => x.role.key)) : null;
            const you = s.user?.id === principal.userId;
            return (
              <LoadingLink key={s.id} href={`/staff/${s.id}`} className="ejo-lift group block rounded-[var(--ejo-radius-lg)] border border-[var(--ejo-border)] bg-[var(--ejo-surface)] p-4 hover:border-[var(--ejo-primary)]/50">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} size={48} active={s.active} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--ejo-text)]">
                      {s.name} {you ? <span className="text-xs font-normal text-[var(--ejo-text-muted)]">(you)</span> : null}
                    </p>
                    <p className="truncate text-sm text-[var(--ejo-text-muted)]">{s.user?.email ?? 'No login'}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusChip tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Switched off'}</StatusChip>
                      {s.isTechnician ? <StatusChip tone="brand">Technician</StatusChip> : null}
                      {r ? <StatusChip tone="info">{ROLE_INFO[r].name}</StatusChip> : null}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-[var(--ejo-border)] pt-3 text-xs text-[var(--ejo-text-muted)]">
                  {s.roleTitle}
                  {s.phone ? ` · ${formatPhone(s.phone)}` : ''}
                  {s.user ? ` · ${s.user.lastLoginAt ? `Last signed in ${formatDateTime(s.user.lastLoginAt)}` : 'Has not signed in yet'}` : ''}
                </div>
              </LoadingLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
