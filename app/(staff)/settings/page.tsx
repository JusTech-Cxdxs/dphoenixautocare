import type { Metadata } from 'next';
import { NavCard, PageHeader } from '@/components/ui';
import { guardPage } from '@/lib/authz/server';
import { getSettings } from '@/lib/settings';
import { formatDateTime } from '@/lib/format';
import { SettingsForms } from './settings-forms';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await guardPage('settings.manage', 'settings');
  const s = await getSettings();
  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader icon="settings" title="Settings" description={`Business details, money rules and the optional modules, in one place. Each section saves on its own. Last changed ${formatDateTime(s.updatedAt)}.`} />
      <nav aria-label="Settings sections" className="mb-8 flex flex-wrap gap-2">
        {[
          ['#business', 'Business details'],
          ['#money', 'Money rules'],
          ['#modules', 'Optional modules'],
          ['#numbers', 'Document numbers'],
          ['#service', 'Service reminders'],
          ['#people', 'People and access'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full border border-[var(--ejo-border)] bg-[var(--ejo-bg)] px-4 py-2 text-sm font-medium text-[var(--ejo-text)] transition-colors hover:border-[var(--ejo-primary)]/60 hover:text-[var(--ejo-primary-text)]">
            {label}
          </a>
        ))}
      </nav>
      <SettingsForms
        values={{
          businessName: s.businessName,
          displayName: s.displayName,
          tagline: s.tagline,
          phone1: s.phones[0] ?? '',
          phone2: s.phones[1] ?? '',
          email: s.email,
          address: s.address,
          openingHours: s.openingHours,
          website: s.website,
          vatEnabled: s.vatEnabled,
          vatRatePercent: s.vatRatePercent,
          discountLimitPercent: s.discountLimitPercent,
          estimateNeedsOwner: s.estimateNeedsOwner,
          depositPercent: s.depositPercent,
          jobCardPrefix: s.jobCardPrefix,
          invoicePrefix: s.invoicePrefix,
          receiptPrefix: s.receiptPrefix,
          supervisorEnabled: s.supervisorEnabled,
          technicianLoginsEnabled: s.technicianLoginsEnabled,
          securityGateEnabled: s.securityGateEnabled,
          appointmentsEnabled: s.appointmentsEnabled,
          supportEnabled: s.supportEnabled,
          enyoEnabled: s.enyoEnabled,
          serviceIntervalKm: s.serviceIntervalKm,
          serviceIntervalMonths: s.serviceIntervalMonths,
          dueSoonKm: s.dueSoonKm,
          dueSoonDays: s.dueSoonDays,
        }}
      />
      <section id="people" className="mt-10 scroll-mt-6">
        <h2 className="text-lg font-semibold text-[var(--ejo-text)]">People and access</h2>
        <p className="mb-4 text-sm text-[var(--ejo-text-muted)]">Who can sign in and what each person may see and do.</p>
        <div className="ejo-stagger grid gap-4 md:grid-cols-3">
          <NavCard href="/staff" icon="users" title="Staff and logins" description="Add staff, give logins, change roles, switch people off." />
          <NavCard href="/roles" icon="key" title="Roles and permissions" description="What each role covers, and extra permissions." />
          <NavCard href="/audit-log" icon="history" title="Audit log" description="Every change, sign-in and refused attempt." />
        </div>
      </section>
    </div>
  );
}
