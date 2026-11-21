import type { Metadata } from 'next';
import { EmptyState, Icon, NavCard, PageHeader, SectionCard, StatTile, StatusChip } from '@/components/ui';
import { LoadingLink } from '@/components/LoadingLink';
import { requireUser } from '@/lib/auth/session';
import { allows, guardPage } from '@/lib/authz/server';
import { prisma } from '@/lib/db';
import { actionLabel } from '@/lib/audit/labels';
import { daysAgo, lagosStartOfToday } from '@/lib/dates';
import { formatDateTime, lagosHour, TIME_ZONE } from '@/lib/format';
import { navigationFor } from '@/lib/navigation';
import { getPrincipal } from '@/lib/authz/server';
import { getSettings } from '@/lib/settings';

export const metadata: Metadata = { title: 'Dashboard' };

function greeting(): string {
  const h = lagosHour();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const DOORS: Record<string, string> = {
  '/staff': 'Everyone in the workshop, their logins and roles.',
  '/roles': 'What each role can do, and extra permissions.',
  '/audit-log': 'Every change, sign-in and refused attempt.',
  '/settings': 'Business details, money rules and modules.',
};

export default async function DashboardPage() {
  await guardPage('dashboard.view', 'dashboard');
  const [user, principal, settings, seesStaff, seesAudit] = await Promise.all([requireUser(), getPrincipal(), getSettings(), allows('staff.view'), allows('audit.view')]);
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE }).format(new Date());
  const since = daysAgo(7);

  const [staff, technicians, logins, signedInToday, failed, refused, recent] = await Promise.all([
    seesStaff ? prisma.staff.count({ where: { active: true } }) : null,
    seesStaff ? prisma.staff.count({ where: { active: true, isTechnician: true } }) : null,
    seesStaff ? prisma.user.count({ where: { active: true } }) : null,
    seesAudit ? prisma.auditLog.findMany({ where: { action: 'user.signed_in', createdAt: { gte: lagosStartOfToday() } }, distinct: ['userId'], select: { userId: true } }).then((r) => r.length) : null,
    seesAudit ? prisma.auditLog.count({ where: { action: 'user.sign_in_failed', createdAt: { gte: since } } }) : null,
    seesAudit ? prisma.auditLog.count({ where: { action: 'access.denied', createdAt: { gte: since } } }) : null,
    seesAudit
      ? prisma.auditLog.findMany({ where: { NOT: [{ entityType: { startsWith: 'db:' } }, { action: 'user.signed_in' }] }, orderBy: { id: 'desc' }, take: 8, select: { id: true, action: true, summary: true, createdAt: true, userId: true } })
      : [],
  ]);
  const names = new Map((await prisma.user.findMany({ where: { id: { in: recent.map((r) => r.userId).filter((x): x is string => Boolean(x)) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const attention = (failed ?? 0) + (refused ?? 0);
  const modules = [
    { label: 'Appointments', on: settings.appointmentsEnabled },
    { label: 'Customer support', on: settings.supportEnabled },
    { label: 'Supervisor checks', on: settings.supervisorEnabled },
    { label: 'Technician logins', on: settings.technicianLoginsEnabled },
    { label: 'Gate and security', on: settings.securityGateEnabled },
    { label: 'Enyo (AI)', on: settings.enyoEnabled },
  ];
  const doors = navigationFor(principal).filter((i) => DOORS[i.href]);

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader
        hero
        icon="dashboard"
        eyebrow={today}
        title="Dashboard"
        description={`${greeting()}, ${user.name.split(/\s+/)[0]}. Here is what is happening at ${settings.displayName}.`}
        meta={
          seesAudit && attention > 0 ? (
            <LoadingLink href="/audit-log?kind=denied" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ejo-warning)]/15 px-3 py-1 text-xs font-semibold text-[var(--ejo-warning-text)] ring-1 ring-inset ring-[var(--ejo-warning)]/30 hover:bg-[var(--ejo-warning)]/25">
              <Icon name="bolt" size={13} />
              {attention} security {attention === 1 ? 'event' : 'events'} this week
            </LoadingLink>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ejo-success)]/12 px-3 py-1 text-xs font-semibold text-[var(--ejo-success-text)] ring-1 ring-inset ring-[var(--ejo-success)]/25">
              <Icon name="check-circle" size={13} />
              All caught up
            </span>
          )
        }
      />

      {seesStaff ? (
        <div className="mb-6">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ejo-text-muted)]">
            <Icon name="users" size={13} />
            The team at a glance
          </h2>
          <div className="ejo-stagger grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatTile icon="users" label="Staff" value={staff} href="/staff" />
            <StatTile icon="wrench" label="Technicians" value={technicians} href="/staff" />
            <StatTile icon="key" label="Active logins" value={logins} href="/staff" />
            {seesAudit ? <StatTile icon="activity" label="Signed in today" value={signedInToday} href="/audit-log?kind=signins" /> : null}
            {seesAudit ? <StatTile icon="lock" label="Failed sign-ins (7 days)" value={failed} href="/audit-log?kind=signins" tone={failed ? 'warning' : 'brand'} emphasis={Boolean(failed)} /> : null}
            {seesAudit ? <StatTile icon="shield" label="Refused attempts (7 days)" value={refused} href="/audit-log?kind=denied" tone={refused ? 'warning' : 'brand'} emphasis={Boolean(refused)} /> : null}
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <SectionCard icon="wrench" title="Workshop today" description="Vehicles in the workshop, estimates waiting and payments received." className="xl:col-span-2">
          <EmptyState icon="car" title="No job cards yet">
            Vehicles checked in, estimates waiting and payments received will show here once job cards are added.
          </EmptyState>
        </SectionCard>
        <SectionCard icon="sliders" title="Optional modules" description="The Owner switches these on or off in Settings.">
          <ul className="divide-y divide-[var(--ejo-border)]">
            {modules.map((m) => (
              <li key={m.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-[var(--ejo-text)]">{m.label}</span>
                <StatusChip tone={m.on ? 'success' : 'neutral'}>{m.on ? 'On' : 'Off'}</StatusChip>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {seesAudit ? (
        <SectionCard
          icon="history"
          title="Recent activity"
          description="The latest changes and security events, newest first."
          className="mb-6"
          flush
          actions={
            <LoadingLink href="/audit-log" className="font-semibold text-[var(--ejo-primary-text)] hover:underline">
              Full audit log →
            </LoadingLink>
          }
        >
          {recent.length === 0 ? (
            <EmptyState compact icon="history" title="Nothing yet">
              Changes appear here as people use the system.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-[var(--ejo-border)]">
              {recent.map((r) => (
                <li key={r.id.toString()} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5">
                  <StatusChip tone={r.action === 'access.denied' || r.action.endsWith('failed') ? 'error' : 'brand'}>{actionLabel(r.action)}</StatusChip>
                  <span className="min-w-0 flex-1 truncate text-[var(--ejo-text)]">{r.summary ?? r.action}</span>
                  <span className="text-xs text-[var(--ejo-text-muted)]">
                    {r.userId ? names.get(r.userId) ?? 'Someone' : 'Sign-in page'} · {formatDateTime(r.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {doors.length ? (
        <div className="ejo-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {doors.map((d) => (
            <NavCard key={d.href} href={d.href} icon={d.icon} title={d.name} description={DOORS[d.href]} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
