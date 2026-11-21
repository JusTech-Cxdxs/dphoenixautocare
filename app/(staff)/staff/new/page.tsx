import type { Metadata } from 'next';
import { PageHeader, SectionCard } from '@/components/ui';
import { guardPage } from '@/lib/authz/server';
import { getSettings } from '@/lib/settings';
import { NewStaffForm } from '../staff-forms';

export const metadata: Metadata = { title: 'Add staff member' };

export default async function NewStaffPage() {
  await guardPage('staff.manage', 'staff.new');
  const s = await getSettings();
  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader icon="user-plus" title="Add staff member" description="Their details, and a login if they will use the system. We email them a link to choose their own password." back={{ href: '/staff', label: 'Back to staff' }} />
      <SectionCard icon="user" title="Staff member" className="max-w-3xl">
        <NewStaffForm modules={{ supervisorEnabled: s.supervisorEnabled, technicianLoginsEnabled: s.technicianLoginsEnabled, securityGateEnabled: s.securityGateEnabled }} />
      </SectionCard>
    </div>
  );
}
