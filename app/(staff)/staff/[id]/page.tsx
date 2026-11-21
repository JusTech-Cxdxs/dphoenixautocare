import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { AuthNotice } from '@/components/AuthNotice';
import { PageHeader, SectionCard, StatusChip } from '@/components/ui';
import { allows, getPrincipal, guardPage } from '@/lib/authz/server';
import { ROLE_INFO, ROLE_KEYS, type RoleKey } from '@/lib/authz/catalogue';
import { prisma } from '@/lib/db';
import { formatDateTime, formatPhone } from '@/lib/format';
import { getSettings } from '@/lib/settings';
import { ActiveToggle, ChangeRoleForm, EditStaffForm, GiveLoginForm, ResendInviteButton } from '../staff-forms';

export const metadata: Metadata = { title: 'Staff member' };

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--ejo-text-muted)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-[var(--ejo-text)]">{children}</dd>
    </div>
  );
}

export default async function StaffMemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; invite?: string }> }) {
  await guardPage('staff.view', 'staff.detail');
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [canManage, principal, settings] = await Promise.all([allows('staff.manage'), getPrincipal(), getSettings()]);
  const s = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true, name: true, roleTitle: true, phone: true, isTechnician: true, active: true, createdAt: true,
      user: { select: { id: true, email: true, active: true, lastLoginAt: true, roles: { select: { role: { select: { key: true } } } }, accounts: { where: { providerId: 'credential' }, select: { id: true } } } },
    },
  });
  if (!s) notFound();
  const roleKey = (s.user?.roles.map((r) => r.role.key).find((k) => (ROLE_KEYS as readonly string[]).includes(k)) ?? null) as RoleKey | null;
  const modules = { supervisorEnabled: settings.supervisorEnabled, technicianLoginsEnabled: settings.technicianLoginsEnabled, securityGateEnabled: settings.securityGateEnabled };
  const isMe = s.user?.id === principal.userId;
  const hasPassword = Boolean(s.user?.accounts.length);

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader
        icon="user"
        title={s.name}
        description={`${s.roleTitle}${s.phone ? ` · ${formatPhone(s.phone)}` : ''} · Added ${formatDateTime(s.createdAt)}`}
        back={{ href: '/staff', label: 'Back to staff' }}
        meta={
          <>
            <StatusChip tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Switched off'}</StatusChip>
            {s.isTechnician ? <StatusChip tone="brand">Technician</StatusChip> : null}
            <StatusChip tone={roleKey ? 'info' : 'neutral'}>{roleKey ? `${ROLE_INFO[roleKey].name} login` : 'No login'}</StatusChip>
          </>
        }
      />
      {sp.saved ? (
        <div className="mb-6">
          <AuthNotice kind={sp.invite === 'failed' ? 'error' : 'success'}>
            {sp.invite === 'failed' ? 'Staff member added, but the invitation email could not be sent. Use "Send new link" below.' : 'Staff member added.'}
          </AuthNotice>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard icon="user" title="Details">
          {canManage ? (
            <EditStaffForm id={s.id} values={{ name: s.name, roleTitle: s.roleTitle, phone: s.phone, isTechnician: s.isTechnician }} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <Item label="Job title">{s.roleTitle}</Item>
              <Item label="Phone">{s.phone ? formatPhone(s.phone) : 'Not given'}</Item>
            </dl>
          )}
        </SectionCard>

        <SectionCard icon="key" title="Login" description={s.user ? undefined : 'This person cannot sign in.'}>
          {s.user ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} size={44} active={s.user.active} />
                <dl className="grid flex-1 gap-3 sm:grid-cols-2">
                  <Item label="Email">{s.user.email}</Item>
                  <Item label="Role">{roleKey ? ROLE_INFO[roleKey].name : 'None'}</Item>
                  <Item label="Password">{hasPassword ? 'Chosen' : 'Not chosen yet (invitation sent)'}</Item>
                  <Item label="Last signed in">{s.user.lastLoginAt ? formatDateTime(s.user.lastLoginAt) : 'Never'}</Item>
                </dl>
              </div>
              {canManage && !isMe ? (
                <>
                  <ChangeRoleForm id={s.id} current={roleKey ?? 'FRONT_DESK'} modules={modules} />
                  <div className="border-t border-[var(--ejo-border)] pt-4">
                    <p className="mb-3 text-sm text-[var(--ejo-text-muted)]">Forgotten password or expired invitation? Send a fresh link. Earlier links stop working.</p>
                    <ResendInviteButton id={s.id} />
                  </div>
                </>
              ) : isMe ? (
                <p className="text-sm text-[var(--ejo-text-muted)]">This is your own login. Another Owner can change your role. To change your password, use &quot;Forgot password&quot; on the sign-in page.</p>
              ) : null}
            </div>
          ) : canManage && s.active ? (
            <GiveLoginForm id={s.id} modules={modules} />
          ) : canManage ? (
            <p className="text-sm text-[var(--ejo-text-muted)]">Switch this staff member back on before giving them a login.</p>
          ) : (
            <p className="text-sm text-[var(--ejo-text-muted)]">Only the Owner can give logins.</p>
          )}
        </SectionCard>

        {canManage && !isMe ? (
          <SectionCard icon={s.active ? 'lock' : 'check-circle'} tone={s.active ? 'error' : 'success'} title={s.active ? 'Switch off' : 'Switch back on'} description={s.active ? 'For someone who has left. Their history stays; they can no longer sign in or be assigned jobs.' : 'They can sign in and be assigned jobs again.'}>
            <ActiveToggle id={s.id} active={s.active} name={s.name} />
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
