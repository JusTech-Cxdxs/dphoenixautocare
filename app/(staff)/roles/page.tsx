import type { Metadata } from 'next';
import { PageHeader, SectionCard } from '@/components/ui';
import { guardPage } from '@/lib/authz/server';
import { PERMISSIONS, PERMISSION_KEYS, ROLE_GRANTS, ROLE_INFO, ROLE_KEYS, ROLE_MODULE, isOwnerOnly } from '@/lib/authz/catalogue';
import { grantableFor } from '@/lib/authz/grants';
import { prisma } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { GrantsForm, type Cell } from './grants-form';

export const metadata: Metadata = { title: 'Roles and permissions' };

export default async function RolesPage() {
  await guardPage('roles.manage', 'roles');
  const [settings, roles] = await Promise.all([getSettings(), prisma.role.findMany({ select: { key: true, permissions: { select: { permission: true } }, _count: { select: { users: true } } } })]);
  const extra = new Map(roles.map((r) => [r.key, new Set(r.permissions.map((p) => p.permission))]));
  const people = new Map(roles.map((r) => [r.key, r._count.users]));

  const columns = ROLE_KEYS.map((k) => {
    const flag = ROLE_MODULE[k];
    return { key: k, name: ROLE_INFO[k].name, description: ROLE_INFO[k].description, off: flag ? !settings[flag] : false, people: people.get(k) ?? 0 };
  });
  const rows = PERMISSION_KEYS.map((p) => ({
    key: p,
    label: PERMISSIONS[p].label,
    group: PERMISSIONS[p].group,
    ownerOnly: isOwnerOnly(p),
    cells: ROLE_KEYS.map((r): Cell => {
      if (r === 'OWNER') return { state: 'default' };
      if (ROLE_GRANTS[r][p]) return { state: ROLE_GRANTS[r][p] === 'ASSIGNED' ? 'own' : 'default' };
      if (grantableFor(r).includes(p)) return { state: 'grantable', checked: extra.get(r)?.has(p) ?? false };
      return { state: 'never' };
    }),
  }));

  return (
    <div className="w-full p-4 sm:p-8">
      <PageHeader icon="key" title="Roles and permissions" description="What each role can do. A tick comes with the role; a box is an extra permission you can give. Owner-only permissions cannot be given to anyone else. Changes apply from each person's next click." />
      <SectionCard icon="shield" title="Permissions by role" flush>
        <GrantsForm columns={columns} rows={rows} />
      </SectionCard>
    </div>
  );
}
